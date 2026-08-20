import { describe, expect, it } from "vitest";
import { ShopSystem } from "./ShopSystem";
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

describe("ShopSystem.getRodStatus", () => {
  it("is 'equipped' for the currently equipped rod", () => {
    const state = baseState();
    expect(ShopSystem.getRodStatus(getRod("wooden_rod"), state)).toBe("equipped");
  });

  it("is 'owned' when owned but not equipped", () => {
    const state = baseState({ ownedRodIds: ["wooden_rod", "iron_rod"] });
    expect(ShopSystem.getRodStatus(getRod("iron_rod"), state)).toBe("owned");
  });

  it("is 'available' when affordable but not owned", () => {
    const state = baseState({ coins: 200 });
    expect(ShopSystem.getRodStatus(getRod("iron_rod"), state)).toBe("available");
  });

  it("is 'locked' when not affordable and not owned", () => {
    const state = baseState({ coins: 10 });
    expect(ShopSystem.getRodStatus(getRod("iron_rod"), state)).toBe("locked");
  });
});

describe("ShopSystem.canEquip", () => {
  it("is false for the already-equipped rod", () => {
    expect(ShopSystem.canEquip(getRod("wooden_rod"), baseState())).toBe(false);
  });

  it("is false for an unowned rod", () => {
    expect(ShopSystem.canEquip(getRod("iron_rod"), baseState())).toBe(false);
  });

  it("is true for an owned, non-equipped rod", () => {
    const state = baseState({ ownedRodIds: ["wooden_rod", "iron_rod"] });
    expect(ShopSystem.canEquip(getRod("iron_rod"), state)).toBe(true);
  });
});
