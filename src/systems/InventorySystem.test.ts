import { describe, expect, it } from "vitest";
import { InventorySystem } from "./InventorySystem";

describe("InventorySystem", () => {
  it("adds a new fish entry", () => {
    const inv = InventorySystem.addFish([], "small_fish", 3);
    expect(inv).toEqual([{ fishId: "small_fish", quantity: 3 }]);
  });

  it("stacks quantity onto an existing entry", () => {
    let inv = InventorySystem.addFish([], "small_fish", 2);
    inv = InventorySystem.addFish(inv, "small_fish", 5);
    expect(InventorySystem.getQuantity(inv, "small_fish")).toBe(7);
  });

  it("removes quantity and drops the entry at zero", () => {
    let inv = InventorySystem.addFish([], "carp", 4);
    inv = InventorySystem.removeFish(inv, "carp", 4);
    expect(inv).toEqual([]);
  });

  it("partially removes without dropping the entry", () => {
    let inv = InventorySystem.addFish([], "carp", 4);
    inv = InventorySystem.removeFish(inv, "carp", 1);
    expect(InventorySystem.getQuantity(inv, "carp")).toBe(3);
  });

  it("does not mutate the input array", () => {
    const original = [{ fishId: "carp", quantity: 4 }];
    InventorySystem.addFish(original, "carp", 1);
    expect(original[0].quantity).toBe(4);
  });

  it("reports empty correctly", () => {
    expect(InventorySystem.isEmpty([])).toBe(true);
    expect(InventorySystem.isEmpty([{ fishId: "carp", quantity: 0 }])).toBe(true);
    expect(InventorySystem.isEmpty([{ fishId: "carp", quantity: 1 }])).toBe(false);
  });
});
