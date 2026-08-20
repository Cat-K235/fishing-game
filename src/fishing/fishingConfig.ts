// Central tuning knobs for fishing timing and the luck formula. Nothing
// outside FishingCalculator should hardcode these numbers.
export const FISHING_CONFIG = {
  /** Base bite delay range in milliseconds at rod speed 1. */
  baseBiteMs: { min: 2000, max: 6000 },
  /** Bite window shrinks with speed but never drops below this floor. */
  minBiteMsFloor: 800,
  /**
   * Each point of speed above 1 shrinks the bite delay by this fraction.
   * effectiveDelay = baseDelay / (1 + (speed - 1) * speedFactor)
   */
  speedFactor: 0.22,
  /** Cast animation duration before the bobber lands, in ms. */
  castDurationMs: 550,
  /** How long the player has to react once a fish bites, in ms. */
  biteWindowMs: 1400,
  /** Reel animation duration before the catch is revealed, in ms. */
  reelDurationMs: 500,
  /** How long the result screen stays up before auto-returning to IDLE. */
  resultDurationMs: 1800,
  /**
   * Rarity boost factors used by the luck formula. Higher rarities get a
   * bigger multiplier per point of effective luck, so luck matters more for
   * rare fish without ever guaranteeing them.
   * effectiveWeight = baseWeight * (1 + effectiveLuck * rarityBoost[rarity])
   * effectiveLuck = rod.luck - 1 (wooden rod is the neutral baseline).
   */
  rarityLuckBoost: {
    common: 0,
    uncommon: 0.08,
    rare: 0.35,
    very_rare: 0.6,
  } as Record<string, number>,
};
