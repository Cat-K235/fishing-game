import { rarityIndex, type Rarity } from "./FishData";
import type { ReelTuning } from "./ReelMath";
import { DEFAULT_TUNING } from "./ReelMath";

export interface RodDef {
  id: string;
  name: string;
  cost: number;
  /** Multiplies cast arc speed — higher casts faster. */
  castSpeedMult: number;
  /** <1 makes resting more effective (tension drains faster, less progress bleeds back to the fish). */
  tensionForgiveness: number;
  /** 0..~0.35 — skews the catch roll toward rarer fish. */
  rareBonusPct: number;
  /** Highest rarity this rod is capable of hooking at all. */
  maxRarity: Rarity;
}

export const RODS: RodDef[] = [
  { id: "twig", name: "Twig Rod", cost: 0, castSpeedMult: 1, tensionForgiveness: 1, rareBonusPct: 0, maxRarity: "uncommon" },
  { id: "iron", name: "Iron Rod", cost: 500, castSpeedMult: 1.12, tensionForgiveness: 0.85, rareBonusPct: 0.06, maxRarity: "rare" },
  { id: "carbon", name: "Carbon Rod", cost: 2000, castSpeedMult: 1.25, tensionForgiveness: 0.7, rareBonusPct: 0.12, maxRarity: "epic" },
  { id: "deep", name: "Deep Rod", cost: 8000, castSpeedMult: 1.4, tensionForgiveness: 0.55, rareBonusPct: 0.2, maxRarity: "legendary" },
  { id: "mythic", name: "Mythic Rod", cost: 25000, castSpeedMult: 1.6, tensionForgiveness: 0.4, rareBonusPct: 0.32, maxRarity: "legendary" },
];

export function rodById(id: string): RodDef {
  return RODS.find((r) => r.id === id) ?? RODS[0];
}

export function rodMaxRarityIndex(rod: RodDef): number {
  return rarityIndex(rod.maxRarity);
}

// Tension buildup while holding (tensionGainRate, pullTensionFactor) is
// deliberately the SAME for every rod: holding the whole time — never
// resting — must always eventually snap the line, on any rod, or the
// core hold/release rhythm stops mattering (a better rod would let you
// just hold through the whole fight with zero timing at all). Instead a
// better rod pays off during the rest half: tension drains faster and
// less progress bleeds back to the fish, so correct hold/release timing
// gets more forgiving without the mechanic itself becoming optional.
export function tuningForRod(rod: RodDef): ReelTuning {
  return {
    ...DEFAULT_TUNING,
    tensionDecayRate: DEFAULT_TUNING.tensionDecayRate / rod.tensionForgiveness,
    restRecoverRate: DEFAULT_TUNING.restRecoverRate * rod.tensionForgiveness,
  };
}
