import { rarityIndex, type Rarity } from "./FishData";
import type { ReelTuning } from "./ReelMath";
import { DEFAULT_TUNING } from "./ReelMath";

export interface RodDef {
  id: string;
  name: string;
  cost: number;
  /** Multiplies cast arc speed — higher casts faster. */
  castSpeedMult: number;
  /** <1 slows tension buildup, making the rod more forgiving under a fighting fish. */
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

export function tuningForRod(rod: RodDef): ReelTuning {
  return {
    ...DEFAULT_TUNING,
    tensionGainRate: DEFAULT_TUNING.tensionGainRate * rod.tensionForgiveness,
    pullTensionFactor: DEFAULT_TUNING.pullTensionFactor * rod.tensionForgiveness,
  };
}
