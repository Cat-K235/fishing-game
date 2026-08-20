import type { InventoryEntry, PlayerState, RodDefinition } from "../types/game";
import { getFish } from "../data/fish";
import { InventorySystem } from "./InventorySystem";

export interface SellResult {
  inventory: InventoryEntry[];
  coinsEarned: number;
}

export interface PurchaseResult {
  ok: boolean;
  reason?: string;
  ownedRodIds: string[];
  coins: number;
}

/**
 * Single source of truth for every coin-affecting calculation. Nothing else
 * in the codebase should compute a sell price or validate a purchase.
 */
export class EconomySystem {
  static fishValue(fishId: string): number {
    return getFish(fishId).value;
  }

  static sellFish(inventory: InventoryEntry[], fishId: string, quantity: number): SellResult {
    const owned = InventorySystem.getQuantity(inventory, fishId);
    const sellQty = Math.min(owned, quantity);
    if (sellQty <= 0) {
      return { inventory, coinsEarned: 0 };
    }
    const coinsEarned = EconomySystem.fishValue(fishId) * sellQty;
    const nextInventory = InventorySystem.removeFish(inventory, fishId, sellQty);
    return { inventory: nextInventory, coinsEarned };
  }

  static sellAll(inventory: InventoryEntry[]): SellResult {
    let coinsEarned = 0;
    for (const entry of inventory) {
      coinsEarned += EconomySystem.fishValue(entry.fishId) * entry.quantity;
    }
    return { inventory: [], coinsEarned };
  }

  static sellMany(inventory: InventoryEntry[], fishIds: string[]): SellResult {
    let working = inventory;
    let coinsEarned = 0;
    for (const fishId of fishIds) {
      const qty = InventorySystem.getQuantity(working, fishId);
      const result = EconomySystem.sellFish(working, fishId, qty);
      working = result.inventory;
      coinsEarned += result.coinsEarned;
    }
    return { inventory: working, coinsEarned };
  }

  /** Validates + applies a rod purchase atomically. Never partially applies. */
  static purchaseRod(state: PlayerState, rod: RodDefinition): PurchaseResult {
    if (state.ownedRodIds.includes(rod.id)) {
      return { ok: false, reason: "already_owned", ownedRodIds: state.ownedRodIds, coins: state.coins };
    }
    if (state.coins < rod.cost) {
      return { ok: false, reason: "insufficient_coins", ownedRodIds: state.ownedRodIds, coins: state.coins };
    }
    return {
      ok: true,
      ownedRodIds: [...state.ownedRodIds, rod.id],
      coins: state.coins - rod.cost,
    };
  }
}
