import type { PlayerState, PondDefinition, RodDefinition } from "../types/game";

/** Governs which ponds a player can access. Data-driven and easy to extend. */
export class ProgressionSystem {
  static isPondUnlocked(pond: PondDefinition, state: PlayerState): boolean {
    return state.unlockedPondIds.includes(pond.id);
  }

  static meetsRodRequirement(pond: PondDefinition, rod: RodDefinition): boolean {
    return rod.level >= pond.requiredRodLevel;
  }
}
