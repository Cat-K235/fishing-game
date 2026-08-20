import type { InventoryEntry } from "../types/game";

/**
 * Pure helpers for manipulating an inventory entry list. Entries store only
 * an item id + quantity — never duplicated item definitions — so fish data
 * stays the single source of truth.
 */
export class InventorySystem {
  static addFish(inventory: InventoryEntry[], fishId: string, quantity = 1): InventoryEntry[] {
    const next = inventory.map((e) => ({ ...e }));
    const existing = next.find((e) => e.fishId === fishId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      next.push({ fishId, quantity });
    }
    return next;
  }

  static removeFish(inventory: InventoryEntry[], fishId: string, quantity: number): InventoryEntry[] {
    const next: InventoryEntry[] = [];
    for (const entry of inventory) {
      if (entry.fishId !== fishId) {
        next.push(entry);
        continue;
      }
      const remaining = entry.quantity - quantity;
      if (remaining > 0) next.push({ fishId, quantity: remaining });
    }
    return next;
  }

  static getQuantity(inventory: InventoryEntry[], fishId: string): number {
    return inventory.find((e) => e.fishId === fishId)?.quantity ?? 0;
  }

  static isEmpty(inventory: InventoryEntry[]): boolean {
    return inventory.length === 0 || inventory.every((e) => e.quantity <= 0);
  }
}
