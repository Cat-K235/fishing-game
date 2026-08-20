import type { RodDefinition } from "../types/game";

// Rod stats are placeholders per the design spec and intentionally easy to
// rebalance from a single location.
export const RODS: Record<string, RodDefinition> = {
  wooden_rod: {
    id: "wooden_rod",
    name: "Wooden Rod",
    cost: 0,
    level: 1,
    speed: 1,
    luck: 1,
    description: "A basic rod. Everyone starts here.",
  },
  iron_rod: {
    id: "iron_rod",
    name: "Iron Rod",
    cost: 100,
    level: 2,
    speed: 2,
    luck: 2,
    description: "Sturdier and faster than wood.",
  },
  golden_rod: {
    id: "golden_rod",
    name: "Golden Rod",
    cost: 500,
    level: 3,
    speed: 3,
    luck: 3,
    description: "Favored by lucky anglers.",
  },
  crystal_rod: {
    id: "crystal_rod",
    name: "Crystal Rod",
    cost: 2000,
    level: 4,
    speed: 4,
    luck: 4,
    description: "The finest rod money can buy.",
  },
};

export const ROD_LIST: RodDefinition[] = Object.values(RODS);

export function getRod(id: string): RodDefinition {
  const rod = RODS[id];
  if (!rod) throw new Error(`Unknown rod id: ${id}`);
  return rod;
}

export const DEFAULT_ROD_ID = "wooden_rod";
