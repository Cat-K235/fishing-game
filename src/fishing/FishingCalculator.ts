import type { RodDefinition } from "../types/game";
import { FISHING_CONFIG } from "./fishingConfig";

/** Pure, deterministic-given-inputs math for fishing timing and luck. */
export class FishingCalculator {
  /** Returns the [min, max] bite delay range in ms for a given rod. */
  static getBiteRangeMs(rod: RodDefinition): { min: number; max: number } {
    const divisor = 1 + (rod.speed - 1) * FISHING_CONFIG.speedFactor;
    const min = Math.max(
      FISHING_CONFIG.minBiteMsFloor,
      FISHING_CONFIG.baseBiteMs.min / divisor
    );
    const max = Math.max(
      min + 200,
      FISHING_CONFIG.baseBiteMs.max / divisor
    );
    return { min, max };
  }

  /** Rolls a concrete bite delay within the rod's effective range. */
  static rollBiteDelayMs(rod: RodDefinition, rng: () => number = Math.random): number {
    const { min, max } = FishingCalculator.getBiteRangeMs(rod);
    return min + rng() * (max - min);
  }

  /** Effective luck contributed by a rod; wooden rod (luck 1) is neutral. */
  static getEffectiveLuck(rod: RodDefinition): number {
    return Math.max(0, rod.luck - 1);
  }

  static getRarityLuckMultiplier(rarity: string, rod: RodDefinition): number {
    const boost = FISHING_CONFIG.rarityLuckBoost[rarity] ?? 0;
    return 1 + FishingCalculator.getEffectiveLuck(rod) * boost;
  }
}
