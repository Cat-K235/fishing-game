import type { FishingStateName } from "../types/game";
import { FISHING_CONFIG } from "./fishingConfig";

export interface FishingStateMachineCallbacks {
  onStateChange?: (state: FishingStateName, prev: FishingStateName) => void;
  /** Called once when entering WAITING; return the bite delay in ms. */
  rollBiteDelayMs: () => number;
  /** Called once when entering BITING; the fish was already determined. */
  onBite?: () => void;
  /** Called when the bite window expires without the player reeling. */
  onFishEscaped?: () => void;
  /** Called when entering RESULT; the caught fish should be revealed here. */
  onCaught?: () => void;
}

const CAST_DURATION_MS = FISHING_CONFIG.castDurationMs;
const BITE_WINDOW_MS = FISHING_CONFIG.biteWindowMs;
const REEL_DURATION_MS = FISHING_CONFIG.reelDurationMs;
const RESULT_DURATION_MS = FISHING_CONFIG.resultDurationMs;

/**
 * Explicit finite state machine for a single fishing attempt.
 * IDLE -> CASTING -> WAITING -> BITING -> REELING -> CAUGHT -> RESULT -> IDLE
 * BITING can also time out back to IDLE if the player doesn't react.
 */
export class FishingStateMachine {
  private state: FishingStateName = "IDLE";
  private timer = 0;
  private callbacks: FishingStateMachineCallbacks;

  constructor(callbacks: FishingStateMachineCallbacks) {
    this.callbacks = callbacks;
  }

  getState(): FishingStateName {
    return this.state;
  }

  isActive(): boolean {
    return this.state !== "IDLE";
  }

  /** Begin a new fishing attempt. No-op if one is already in progress. */
  start(): boolean {
    if (this.state !== "IDLE") return false;
    this.transition("CASTING");
    this.timer = CAST_DURATION_MS;
    return true;
  }

  /** Player input during the BITING window. No-op in any other state. */
  reel(): boolean {
    if (this.state !== "BITING") return false;
    this.transition("REELING");
    this.timer = REEL_DURATION_MS;
    return true;
  }

  /** Dismiss the result screen and return to IDLE. Can be called early. */
  acknowledge(): void {
    if (this.state === "RESULT" || this.state === "CAUGHT") {
      this.transition("IDLE");
      this.timer = 0;
    }
  }

  /** Advance timers by dt (ms). Call every frame. */
  update(dt: number): void {
    if (this.timer <= 0) return;
    this.timer -= dt;
    if (this.timer > 0) return;

    switch (this.state) {
      case "CASTING":
        this.transition("WAITING");
        this.timer = this.callbacks.rollBiteDelayMs();
        break;
      case "WAITING":
        this.transition("BITING");
        this.timer = BITE_WINDOW_MS;
        this.callbacks.onBite?.();
        break;
      case "BITING":
        // Player didn't react in time — fish escapes.
        this.transition("IDLE");
        this.timer = 0;
        this.callbacks.onFishEscaped?.();
        break;
      case "REELING":
        this.transition("CAUGHT");
        this.callbacks.onCaught?.();
        this.transition("RESULT");
        this.timer = RESULT_DURATION_MS;
        break;
      case "RESULT":
        this.transition("IDLE");
        this.timer = 0;
        break;
    }
  }

  private transition(next: FishingStateName): void {
    const prev = this.state;
    this.state = next;
    this.callbacks.onStateChange?.(next, prev);
  }
}
