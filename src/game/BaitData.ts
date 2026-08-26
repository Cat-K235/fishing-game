import { rarityIndex, type Rarity } from "./FishData";
import type { ReelTuning } from "./ReelMath";
import { DEFAULT_TUNING } from "./ReelMath";

export interface BaitDef {
  id: string;
  name: string;
  cost: number;
  /** Multiplies cast arc speed — higher casts faster. */
  castSpeedMult: number;
  /** <1 makes resting more effective (tension drains faster, less progress bleeds back to the fish). */
  tensionForgiveness: number;
  /** 0..~0.35 — skews the catch roll toward rarer fish. */
  rareBonusPct: number;
  /** Highest rarity this bait is capable of hooking at all. */
  maxRarity: Rarity;
}

export const BAITS: BaitDef[] = [
  { id: "plain-worm", name: "Plain Worm", cost: 0, castSpeedMult: 1, tensionForgiveness: 1, rareBonusPct: 0, maxRarity: "uncommon" },
  { id: "fat-grub", name: "Fat Grub", cost: 500, castSpeedMult: 1.12, tensionForgiveness: 0.85, rareBonusPct: 0.06, maxRarity: "rare" },
  { id: "live-cricket", name: "Live Cricket", cost: 2000, castSpeedMult: 1.25, tensionForgiveness: 0.7, rareBonusPct: 0.12, maxRarity: "epic" },
  { id: "shiny-lure", name: "Shiny Lure", cost: 8000, castSpeedMult: 1.4, tensionForgiveness: 0.55, rareBonusPct: 0.2, maxRarity: "legendary" },
  { id: "golden-lure", name: "Golden Lure", cost: 25000, castSpeedMult: 1.6, tensionForgiveness: 0.4, rareBonusPct: 0.32, maxRarity: "legendary" },
];

export function baitById(id: string): BaitDef {
  return BAITS.find((b) => b.id === id) ?? BAITS[0];
}

export function baitMaxRarityIndex(bait: BaitDef): number {
  return rarityIndex(bait.maxRarity);
}

// Tension buildup while holding (tensionGainRate, pullTensionFactor) is
// deliberately the SAME for every bait: holding the whole time — never
// resting — must always eventually snap the line, on any gear, or the
// core hold/release rhythm stops mattering. Better bait instead pays off
// during the rest half: tension drains faster and less progress bleeds
// back to the fish, so correct hold/release timing gets more forgiving
// without the mechanic itself becoming optional.
export function tuningForBait(bait: BaitDef): ReelTuning {
  return {
    ...DEFAULT_TUNING,
    tensionDecayRate: DEFAULT_TUNING.tensionDecayRate / bait.tensionForgiveness,
    restRecoverRate: DEFAULT_TUNING.restRecoverRate * bait.tensionForgiveness,
  };
}
