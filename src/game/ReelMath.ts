// Pure, side-effect-free reel/tension math so the core feel of the minigame
// can be tuned and unit-tested without spinning up Phaser.

export interface ReelState {
  /** 0 (fish at the bobber, escaped) .. 100 (fish landed on the dock). */
  progress: number;
  /** 0 (slack line) .. 100 (line snaps). */
  tension: number;
}

export interface ReelTuning {
  reelRate: number; // progress/sec gained while holding
  restRecoverRate: number; // progress/sec lost to fish while resting
  tensionGainRate: number; // tension/sec gained while holding
  tensionDecayRate: number; // tension/sec lost while resting
  pullTensionFactor: number; // extra tension/sec from fish pull while holding
  pullEscapeFactor: number; // extra progress/sec lost from fish pull while resting
}

export const DEFAULT_TUNING: ReelTuning = {
  reelRate: 26,
  restRecoverRate: 10,
  tensionGainRate: 34,
  tensionDecayRate: 46,
  pullTensionFactor: 18,
  pullEscapeFactor: 14,
};

export type ReelOutcome = "reeling" | "caught" | "snapped" | "escaped";

/** Advances the reel minigame by `dt` seconds. Mutates nothing; returns the next state + outcome. */
export function stepReel(
  state: ReelState,
  dt: number,
  holding: boolean,
  fishPull: number, // -1..1, current fight direction/strength from the fish AI
  fightStrength: number, // 0..1, how hard this fish fights overall
  tuning: ReelTuning = DEFAULT_TUNING
): { state: ReelState; outcome: ReelOutcome } {
  const pullMagnitude = Math.abs(fishPull) * fightStrength;

  let { progress, tension } = state;

  if (holding) {
    progress += tuning.reelRate * dt;
    tension += (tuning.tensionGainRate + pullMagnitude * tuning.pullTensionFactor) * dt;
  } else {
    progress -= (tuning.restRecoverRate + pullMagnitude * tuning.pullEscapeFactor) * dt;
    tension -= tuning.tensionDecayRate * dt;
  }

  progress = clamp(progress, 0, 100);
  tension = clamp(tension, 0, 100);

  const next: ReelState = { progress, tension };

  if (tension >= 100) return { state: next, outcome: "snapped" };
  if (progress >= 100) return { state: next, outcome: "caught" };
  if (progress <= 0) return { state: next, outcome: "escaped" };
  return { state: next, outcome: "reeling" };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
