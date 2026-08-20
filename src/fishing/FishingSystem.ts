import type { GameApi } from "../services/GameApi";
import type { CatchResult, FishingStateName } from "../types/game";
import { FishingStateMachine } from "./FishingStateMachine";
import { FishingCalculator } from "./FishingCalculator";

export interface FishingSystemCallbacks {
  onStateChange?: (state: FishingStateName, prev: FishingStateName) => void;
  onBite?: () => void;
  onFishEscaped?: () => void;
  onCatch?: (result: CatchResult) => void;
}

/**
 * Glues the pure FishingStateMachine to the game's rod/pond data and the
 * GameApi (which owns the actual RNG roll + inventory mutation). This class
 * intentionally knows nothing about rendering, input, or the shop.
 */
export class FishingSystem {
  private machine: FishingStateMachine;
  private lastResult: CatchResult | null = null;

  constructor(private api: GameApi, callbacks: FishingSystemCallbacks) {
    this.machine = new FishingStateMachine({
      onStateChange: callbacks.onStateChange,
      onBite: callbacks.onBite,
      onFishEscaped: callbacks.onFishEscaped,
      rollBiteDelayMs: () => FishingCalculator.rollBiteDelayMs(this.api.getEquippedRod()),
      onCaught: () => {
        this.lastResult = this.api.catchFish(this.api.getCurrentPond().id);
        callbacks.onCatch?.(this.lastResult);
      },
    });
  }

  cast(): boolean {
    return this.machine.start();
  }

  reel(): boolean {
    return this.machine.reel();
  }

  acknowledge(): void {
    this.machine.acknowledge();
  }

  update(dtMs: number): void {
    this.machine.update(dtMs);
  }

  getState(): FishingStateName {
    return this.machine.getState();
  }

  getLastResult(): CatchResult | null {
    return this.lastResult;
  }
}
