import type { CatchResult, PlayerState, PondDefinition, RodDefinition } from "../types/game";
import type { SellResult, PurchaseResult } from "../systems/EconomySystem";
import type { EventBus } from "../utils/EventBus";

export interface GameApiEvents {
  stateChanged: PlayerState;
  fishCaught: CatchResult;
  purchaseMade: { rodId: string; success: boolean };
  [key: string]: unknown;
}

/**
 * The contract the rest of the app talks to for anything that touches coins,
 * inventory, rod ownership, or RNG. The client NEVER mutates PlayerState
 * directly — it always goes through here.
 *
 * Today this is implemented by LocalGameApi, which runs everything
 * client-side and is therefore not cheat-proof. When a backend exists, a
 * ServerGameApi implementing this same interface (methods becoming async,
 * requests authenticated via Telegram `initData`) can replace it with no
 * changes needed anywhere else in the codebase. That server implementation
 * does not exist yet — see telegram/TelegramService.ts for the initData
 * plumbing that is already in place for it.
 */
export interface GameApi {
  readonly events: EventBus<GameApiEvents>;
  getState(): PlayerState;
  /** Rolls a catch for the given pond using the currently equipped rod. */
  catchFish(pondId: string): CatchResult;
  sellFish(fishId: string, quantity: number): SellResult;
  sellAll(): SellResult;
  buyRod(rodId: string): PurchaseResult;
  equipRod(rodId: string): boolean;
  getEquippedRod(): RodDefinition;
  getCurrentPond(): PondDefinition;
}
