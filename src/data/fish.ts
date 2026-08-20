import type { FishDefinition } from "../types/game";

// Fish are pure configuration. Nothing here knows about ponds, rods, or RNG —
// that logic lives in fishing/. Adding a new fish is just adding a row here
// and referencing its id from a pond's loot table.
export const FISH: Record<string, FishDefinition> = {
  small_fish: {
    id: "small_fish",
    name: "Small Fish",
    level: 1,
    value: 5,
    rarity: "common",
    sprite: "🐟",
    description: "A tiny fish. Everyone's first catch.",
  },
  bluegill: {
    id: "bluegill",
    name: "Bluegill",
    level: 1,
    value: 8,
    rarity: "common",
    sprite: "🐠",
    description: "Common in calm, shallow water.",
  },
  carp: {
    id: "carp",
    name: "Carp",
    level: 1,
    value: 15,
    rarity: "uncommon",
    sprite: "🐡",
    description: "A sturdy fish with a decent price.",
  },
  golden_fish: {
    id: "golden_fish",
    name: "Golden Fish",
    level: 2,
    value: 50,
    rarity: "rare",
    sprite: "🐟",
    description: "Its scales shimmer like coins. A lucky catch.",
  },
  ancient_fish: {
    id: "ancient_fish",
    name: "Ancient Fish",
    level: 3,
    value: 150,
    rarity: "very_rare",
    sprite: "🐋",
    description: "Nobody knows how old it really is. Extremely rare.",
  },
};

export const FISH_LIST: FishDefinition[] = Object.values(FISH);

export function getFish(id: string): FishDefinition {
  const fish = FISH[id];
  if (!fish) throw new Error(`Unknown fish id: ${id}`);
  return fish;
}
