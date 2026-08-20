import { describe, expect, it } from "vitest";
import { FishingCalculator } from "./FishingCalculator";
import { getRod } from "../data/rods";
import { FISHING_CONFIG } from "./fishingConfig";

describe("FishingCalculator.getBiteRangeMs", () => {
  it("matches the base config range at speed 1 (wooden rod)", () => {
    const range = FishingCalculator.getBiteRangeMs(getRod("wooden_rod"));
    expect(range.min).toBeCloseTo(FISHING_CONFIG.baseBiteMs.min, 0);
    expect(range.max).toBeCloseTo(FISHING_CONFIG.baseBiteMs.max, 0);
  });

  it("shrinks the range as rod speed increases", () => {
    const wooden = FishingCalculator.getBiteRangeMs(getRod("wooden_rod"));
    const iron = FishingCalculator.getBiteRangeMs(getRod("iron_rod"));
    const crystal = FishingCalculator.getBiteRangeMs(getRod("crystal_rod"));
    expect(iron.max).toBeLessThan(wooden.max);
    expect(crystal.max).toBeLessThan(iron.max);
  });

  it("never drops the minimum below the configured floor", () => {
    const crystal = FishingCalculator.getBiteRangeMs(getRod("crystal_rod"));
    expect(crystal.min).toBeGreaterThanOrEqual(FISHING_CONFIG.minBiteMsFloor);
  });
});

describe("FishingCalculator.rollBiteDelayMs", () => {
  it("stays within the rod's effective range", () => {
    const rod = getRod("golden_rod");
    const range = FishingCalculator.getBiteRangeMs(rod);
    for (let i = 0; i < 200; i++) {
      const delay = FishingCalculator.rollBiteDelayMs(rod, Math.random);
      expect(delay).toBeGreaterThanOrEqual(range.min);
      expect(delay).toBeLessThanOrEqual(range.max);
    }
  });
});

describe("FishingCalculator luck", () => {
  it("treats the wooden rod as the neutral baseline (0 effective luck)", () => {
    expect(FishingCalculator.getEffectiveLuck(getRod("wooden_rod"))).toBe(0);
  });

  it("gives no rarity multiplier boost for common fish regardless of luck", () => {
    expect(FishingCalculator.getRarityLuckMultiplier("common", getRod("crystal_rod"))).toBe(1);
  });

  it("boosts rare/very_rare multipliers more than uncommon at the same luck", () => {
    const rod = getRod("crystal_rod");
    const uncommon = FishingCalculator.getRarityLuckMultiplier("uncommon", rod);
    const rare = FishingCalculator.getRarityLuckMultiplier("rare", rod);
    const veryRare = FishingCalculator.getRarityLuckMultiplier("very_rare", rod);
    expect(rare).toBeGreaterThan(uncommon);
    expect(veryRare).toBeGreaterThan(rare);
  });
});
