import type { PondDefinition } from "../types/game";

// Loot table weights are relative, not percentages that must sum to 100 —
// LootGenerator normalizes them. For the Starter Pond we picked values that
// happen to equal the example percentages from the design spec:
// common 65 (small_fish 35 + bluegill 30), uncommon 25 (carp),
// rare 8 (golden_fish), very_rare 2 (ancient_fish).
export const PONDS: Record<string, PondDefinition> = {
  starter_pond: {
    id: "starter_pond",
    name: "Starter Pond",
    recommendedRodLevel: 1,
    requiredRodLevel: 1,
    background: "#3a7bd5",
    lootTable: [
      { fishId: "small_fish", weight: 35 },
      { fishId: "bluegill", weight: 30 },
      { fishId: "carp", weight: 25 },
      { fishId: "golden_fish", weight: 8 },
      { fishId: "ancient_fish", weight: 2 },
    ],
  },
  forest_lake: {
    id: "forest_lake",
    name: "Forest Lake",
    recommendedRodLevel: 2,
    requiredRodLevel: 2,
    background: "#2f6f4f",
    comingSoon: true,
    lootTable: [],
  },
  mountain_lake: {
    id: "mountain_lake",
    name: "Mountain Lake",
    recommendedRodLevel: 3,
    requiredRodLevel: 3,
    background: "#5b7a99",
    comingSoon: true,
    lootTable: [],
  },
  deep_ocean: {
    id: "deep_ocean",
    name: "Deep Ocean",
    recommendedRodLevel: 4,
    requiredRodLevel: 4,
    background: "#0b3d66",
    comingSoon: true,
    lootTable: [],
  },
  ancient_lake: {
    id: "ancient_lake",
    name: "Ancient Lake",
    recommendedRodLevel: 5,
    requiredRodLevel: 5,
    background: "#4a2f6f",
    comingSoon: true,
    lootTable: [],
  },
};

export const POND_LIST: PondDefinition[] = Object.values(PONDS);

export function getPond(id: string): PondDefinition {
  const pond = PONDS[id];
  if (!pond) throw new Error(`Unknown pond id: ${id}`);
  return pond;
}

export const DEFAULT_POND_ID = "starter_pond";
