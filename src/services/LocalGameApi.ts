import type { GameApi, GameApiEvents } from "./GameApi";
import type { CatchResult, PlayerState } from "../types/game";
import type { GameRepository } from "../persistence/GameRepository";
import { EconomySystem, type SellResult, type PurchaseResult } from "../systems/EconomySystem";
import { InventorySystem } from "../systems/InventorySystem";
import { getRod, DEFAULT_ROD_ID } from "../data/rods";
import { getPond, DEFAULT_POND_ID } from "../data/ponds";
import { pickFish } from "../fishing/LootGenerator";
import { EventBus } from "../utils/EventBus";

function createNewPlayerState(): PlayerState {
  return {
    coins: 0,
    inventory: [],
    ownedRodIds: [DEFAULT_ROD_ID],
    equippedRodId: DEFAULT_ROD_ID,
    unlockedPondIds: [DEFAULT_POND_ID],
    currentPondId: DEFAULT_POND_ID,
    stats: { totalFishCaught: 0, totalCoinsEarned: 0 },
  };
}

/**
 * Local, client-side implementation of GameApi. Everything here runs
 * synchronously in the browser and persists through a GameRepository
 * (localStorage today). This is a mock of what a server would eventually
 * enforce — see the warning in GameApi.ts.
 */
export class LocalGameApi implements GameApi {
  private state: PlayerState;
  readonly events = new EventBus<GameApiEvents>();

  constructor(private repository: GameRepository) {
    this.state = repository.load() ?? createNewPlayerState();
  }

  getState(): PlayerState {
    return this.state;
  }

  getEquippedRod() {
    return getRod(this.state.equippedRodId);
  }

  getCurrentPond() {
    return getPond(this.state.currentPondId);
  }

  catchFish(pondId: string): CatchResult {
    const pond = getPond(pondId);
    const rod = this.getEquippedRod();
    const fish = pickFish(pond, rod);

    this.state = {
      ...this.state,
      inventory: InventorySystem.addFish(this.state.inventory, fish.id, 1),
      stats: {
        ...this.state.stats,
        totalFishCaught: this.state.stats.totalFishCaught + 1,
      },
    };
    this.persistAndEmit();
    const result: CatchResult = { fish };
    this.events.emit("fishCaught", result);
    return result;
  }

  sellFish(fishId: string, quantity: number): SellResult {
    const result = EconomySystem.sellFish(this.state.inventory, fishId, quantity);
    this.applySale(result);
    return result;
  }

  sellAll(): SellResult {
    const result = EconomySystem.sellAll(this.state.inventory);
    this.applySale(result);
    return result;
  }

  buyRod(rodId: string): PurchaseResult {
    const rod = getRod(rodId);
    const result = EconomySystem.purchaseRod(this.state, rod);
    if (result.ok) {
      this.state = { ...this.state, coins: result.coins, ownedRodIds: result.ownedRodIds };
      this.persistAndEmit();
    }
    this.events.emit("purchaseMade", { rodId, success: result.ok });
    return result;
  }

  equipRod(rodId: string): boolean {
    if (!this.state.ownedRodIds.includes(rodId)) return false;
    this.state = { ...this.state, equippedRodId: rodId };
    this.persistAndEmit();
    return true;
  }

  private applySale(result: SellResult): void {
    if (result.coinsEarned <= 0 && result.inventory.length === this.state.inventory.length) return;
    this.state = {
      ...this.state,
      inventory: result.inventory,
      coins: this.state.coins + result.coinsEarned,
      stats: {
        ...this.state.stats,
        totalCoinsEarned: this.state.stats.totalCoinsEarned + result.coinsEarned,
      },
    };
    this.persistAndEmit();
  }

  private persistAndEmit(): void {
    this.repository.save(this.state);
    this.events.emit("stateChanged", this.state);
  }
}
