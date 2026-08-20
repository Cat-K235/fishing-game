import { describe, expect, it } from "vitest";
import { EconomySystem } from "./EconomySystem";
import { InventorySystem } from "./InventorySystem";
import { getRod } from "../data/rods";
import type { PlayerState } from "../types/game";

function baseState(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    coins: 0,
    inventory: [],
    ownedRodIds: ["wooden_rod"],
    equippedRodId: "wooden_rod",
    unlockedPondIds: ["starter_pond"],
    currentPondId: "starter_pond",
    stats: { totalFishCaught: 0, totalCoinsEarned: 0 },
    ...overrides,
  };
}

describe("EconomySystem.sellFish", () => {
  it("pays out value * quantity and removes the fish", () => {
    const inv = InventorySystem.addFish([], "small_fish", 3); // value 5 each
    const result = EconomySystem.sellFish(inv, "small_fish", 3);
    expect(result.coinsEarned).toBe(15);
    expect(result.inventory).toEqual([]);
  });

  it("clamps to owned quantity — can't sell more than you have", () => {
    const inv = InventorySystem.addFish([], "small_fish", 2);
    const result = EconomySystem.sellFish(inv, "small_fish", 999);
    expect(result.coinsEarned).toBe(10);
    expect(result.inventory).toEqual([]);
  });

  it("earns nothing for a fish not owned", () => {
    const result = EconomySystem.sellFish([], "small_fish", 1);
    expect(result.coinsEarned).toBe(0);
  });
});

describe("EconomySystem.sellAll", () => {
  it("sums the value of every entry and clears inventory", () => {
    let inv = InventorySystem.addFish([], "small_fish", 2); // 5 * 2 = 10
    inv = InventorySystem.addFish(inv, "carp", 1); // 15
    const result = EconomySystem.sellAll(inv);
    expect(result.coinsEarned).toBe(25);
    expect(result.inventory).toEqual([]);
  });
});

describe("EconomySystem.purchaseRod", () => {
  it("rejects a purchase without enough coins", () => {
    const state = baseState({ coins: 50 });
    const result = EconomySystem.purchaseRod(state, getRod("iron_rod")); // costs 100
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("insufficient_coins");
    expect(result.coins).toBe(50);
    expect(result.ownedRodIds).toEqual(["wooden_rod"]);
  });

  it("rejects buying a rod already owned", () => {
    const state = baseState({ coins: 9999, ownedRodIds: ["wooden_rod", "iron_rod"] });
    const result = EconomySystem.purchaseRod(state, getRod("iron_rod"));
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("already_owned");
  });

  it("deducts coins and grants ownership atomically on success", () => {
    const state = baseState({ coins: 150 });
    const result = EconomySystem.purchaseRod(state, getRod("iron_rod"));
    expect(result.ok).toBe(true);
    expect(result.coins).toBe(50);
    expect(result.ownedRodIds).toEqual(["wooden_rod", "iron_rod"]);
  });

  it("never mutates the original state object", () => {
    const state = baseState({ coins: 150 });
    EconomySystem.purchaseRod(state, getRod("iron_rod"));
    expect(state.coins).toBe(150);
    expect(state.ownedRodIds).toEqual(["wooden_rod"]);
  });
});
