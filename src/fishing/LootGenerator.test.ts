import { describe, expect, it } from "vitest";
import { pickFish, validateLootTable } from "./LootGenerator";
import { getPond, POND_LIST } from "../data/ponds";
import { getRod } from "../data/rods";
import type { PondDefinition } from "../types/game";

describe("validateLootTable", () => {
  it("accepts the real Starter Pond table", () => {
    expect(validateLootTable(getPond("starter_pond"))).toEqual([]);
  });

  it("skips validation for comingSoon ponds with empty tables", () => {
    for (const pond of POND_LIST.filter((p) => p.comingSoon)) {
      expect(validateLootTable(pond)).toEqual([]);
    }
  });

  it("flags an empty loot table", () => {
    const pond: PondDefinition = {
      id: "broken",
      name: "Broken",
      recommendedRodLevel: 1,
      requiredRodLevel: 1,
      background: "#000",
      lootTable: [],
    };
    const errors = validateLootTable(pond);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("flags a negative weight", () => {
    const pond: PondDefinition = {
      id: "broken",
      name: "Broken",
      recommendedRodLevel: 1,
      requiredRodLevel: 1,
      background: "#000",
      lootTable: [{ fishId: "small_fish", weight: -1 }],
    };
    expect(validateLootTable(pond).length).toBeGreaterThan(0);
  });

  it("flags an unknown fish id", () => {
    const pond: PondDefinition = {
      id: "broken",
      name: "Broken",
      recommendedRodLevel: 1,
      requiredRodLevel: 1,
      background: "#000",
      lootTable: [{ fishId: "nonexistent", weight: 10 }],
    };
    expect(validateLootTable(pond).length).toBeGreaterThan(0);
  });
});

describe("pickFish", () => {
  const pond = getPond("starter_pond");
  const woodenRod = getRod("wooden_rod");

  it("is deterministic for a fixed rng value", () => {
    // roll=0 should always land on the first loot table entry.
    const fish = pickFish(pond, woodenRod, () => 0);
    expect(fish.id).toBe(pond.lootTable[0].fishId);
  });

  it("picks the last entry when rng rolls near 1", () => {
    const fish = pickFish(pond, woodenRod, () => 0.9999999);
    expect(fish.id).toBe(pond.lootTable[pond.lootTable.length - 1].fishId);
  });

  it("roughly matches configured weights over many trials at neutral luck", () => {
    const counts: Record<string, number> = {};
    const trials = 20000;
    for (let i = 0; i < trials; i++) {
      const fish = pickFish(pond, woodenRod, Math.random);
      counts[fish.id] = (counts[fish.id] ?? 0) + 1;
    }
    // Starter pond weights sum to 100, so weight == expected percentage.
    const totalWeight = pond.lootTable.reduce((s, e) => s + e.weight, 0);
    for (const entry of pond.lootTable) {
      const expected = (entry.weight / totalWeight) * trials;
      const actual = counts[entry.fishId] ?? 0;
      // Generous tolerance: within 40% relative error to avoid flakiness,
      // this is a sanity check on distribution shape, not exact statistics.
      expect(actual).toBeGreaterThan(expected * 0.6);
      expect(actual).toBeLessThan(expected * 1.4);
    }
  });

  it("increases the share of rare fish when luck is higher, without guaranteeing them", () => {
    const crystalRod = getRod("crystal_rod"); // luck 4, highest available
    const trials = 20000;
    let rareWithWooden = 0;
    let rareWithCrystal = 0;
    for (let i = 0; i < trials; i++) {
      if (pickFish(pond, woodenRod, Math.random).rarity === "very_rare") rareWithWooden++;
      if (pickFish(pond, crystalRod, Math.random).rarity === "very_rare") rareWithCrystal++;
    }
    expect(rareWithCrystal).toBeGreaterThan(rareWithWooden);
    // Still rare, not guaranteed.
    expect(rareWithCrystal).toBeLessThan(trials * 0.3);
  });

  it("throws for an invalid loot table instead of silently misbehaving", () => {
    const broken: PondDefinition = {
      id: "broken",
      name: "Broken",
      recommendedRodLevel: 1,
      requiredRodLevel: 1,
      background: "#000",
      lootTable: [],
    };
    expect(() => pickFish(broken, woodenRod)).toThrow();
  });
});
