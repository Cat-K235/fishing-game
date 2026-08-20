import type { FishDefinition, PondDefinition, RodDefinition } from "../types/game";
import { getFish } from "../data/fish";
import { FishingCalculator } from "./FishingCalculator";

export interface LootValidationError {
  pondId: string;
  reason: string;
}

/** Validates that a pond's loot table can actually be rolled against. */
export function validateLootTable(pond: PondDefinition): LootValidationError[] {
  const errors: LootValidationError[] = [];
  if (pond.comingSoon) return errors;

  if (pond.lootTable.length === 0) {
    errors.push({ pondId: pond.id, reason: "Loot table is empty." });
    return errors;
  }
  let sum = 0;
  for (const entry of pond.lootTable) {
    if (entry.weight < 0) {
      errors.push({
        pondId: pond.id,
        reason: `Negative weight for ${entry.fishId}.`,
      });
    }
    try {
      getFish(entry.fishId);
    } catch {
      errors.push({ pondId: pond.id, reason: `Unknown fish id ${entry.fishId}.` });
    }
    sum += entry.weight;
  }
  if (sum <= 0) {
    errors.push({ pondId: pond.id, reason: "Total weight must be > 0." });
  }
  return errors;
}

/**
 * Weighted-random fish selection for a pond, modified by the equipped rod's
 * luck. See FishingCalculator for the luck formula. This is the only place
 * in the codebase that should perform the actual RNG roll for a catch.
 */
export function pickFish(
  pond: PondDefinition,
  rod: RodDefinition,
  rng: () => number = Math.random
): FishDefinition {
  const errors = validateLootTable(pond);
  if (errors.length > 0) {
    throw new Error(
      `Invalid loot table for ${pond.id}: ${errors.map((e) => e.reason).join(", ")}`
    );
  }

  const weighted = pond.lootTable.map((entry) => {
    const fish = getFish(entry.fishId);
    const multiplier = FishingCalculator.getRarityLuckMultiplier(fish.rarity, rod);
    return { fish, effectiveWeight: entry.weight * multiplier };
  });

  const total = weighted.reduce((sum, w) => sum + w.effectiveWeight, 0);
  let roll = rng() * total;
  for (const w of weighted) {
    roll -= w.effectiveWeight;
    if (roll <= 0) return w.fish;
  }
  // Floating point fallback: return the last entry.
  return weighted[weighted.length - 1].fish;
}
