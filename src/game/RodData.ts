import type { ReelTuning } from "./ReelMath";
import { DEFAULT_TUNING } from "./ReelMath";

// The rod is the reel-minigame skill-assist axis — cast speed and how
// forgiving resting is. It has no say in what bites; that's bait's job
// (see BaitData.ts). Visual fields drive both the shop icon and the
// character's held rod so each tier actually looks distinct, not just
// recolored.
export interface RodDef {
  id: string;
  name: string;
  cost: number;
  /** Multiplies cast arc speed — higher casts faster. */
  castSpeedMult: number;
  /** <1 makes resting more effective (tension drains faster, less progress bleeds back to the fish). */
  tensionForgiveness: number;
  /** Main rod-shaft color. */
  color: number;
  /** Reel/wrap/guide accent color. */
  accent: number;
  /** Line thickness the rod is drawn with. */
  thickness: number;
  /** How many guide rings along the shaft. */
  guides: number;
  /** Top-tier rods get a small sparkle at the tip. */
  glow?: boolean;
}

export const RODS: RodDef[] = [
  { id: "twig", name: "Twig Rod", cost: 0, castSpeedMult: 1, tensionForgiveness: 1, color: 0x8a6a4a, accent: 0x5c4530, thickness: 1.5, guides: 0 },
  { id: "iron", name: "Iron Rod", cost: 600, castSpeedMult: 1.12, tensionForgiveness: 0.85, color: 0x9aa0aa, accent: 0x4a5058, thickness: 2, guides: 2 },
  { id: "carbon", name: "Carbon Rod", cost: 2500, castSpeedMult: 1.25, tensionForgiveness: 0.7, color: 0x2a2e38, accent: 0x5a8fd6, thickness: 2.2, guides: 3 },
  { id: "deep", name: "Deep Rod", cost: 9000, castSpeedMult: 1.4, tensionForgiveness: 0.55, color: 0x1d5a72, accent: 0x5ef2c8, thickness: 2.4, guides: 3 },
  { id: "mythic", name: "Mythic Rod", cost: 28000, castSpeedMult: 1.6, tensionForgiveness: 0.4, color: 0x6b3fa0, accent: 0xffd93d, thickness: 2.6, guides: 4, glow: true },
];

export function rodById(id: string): RodDef {
  return RODS.find((r) => r.id === id) ?? RODS[0];
}

// Tension buildup while holding (tensionGainRate, pullTensionFactor) is
// deliberately the SAME for every rod: holding the whole time — never
// resting — must always eventually snap the line, on any gear, or the
// core hold/release rhythm stops mattering. A better rod instead pays off
// during the rest half: tension drains faster and less progress bleeds
// back to the fish, so correct hold/release timing gets more forgiving
// without the mechanic itself becoming optional.
export function tuningForRod(rod: RodDef): ReelTuning {
  return {
    ...DEFAULT_TUNING,
    tensionDecayRate: DEFAULT_TUNING.tensionDecayRate / rod.tensionForgiveness,
    restRecoverRate: DEFAULT_TUNING.restRecoverRate * rod.tensionForgiveness,
  };
}
