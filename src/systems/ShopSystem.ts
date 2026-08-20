import type { PlayerState, RodDefinition, RodUiStatus } from "../types/game";

/** Determines shop UI state for a rod; pure and stateless. */
export class ShopSystem {
  static getRodStatus(rod: RodDefinition, state: PlayerState): RodUiStatus {
    if (state.equippedRodId === rod.id) return "equipped";
    if (state.ownedRodIds.includes(rod.id)) return "owned";
    if (state.coins >= rod.cost) return "available";
    return "locked";
  }

  static canEquip(rod: RodDefinition, state: PlayerState): boolean {
    return state.ownedRodIds.includes(rod.id) && state.equippedRodId !== rod.id;
  }
}
