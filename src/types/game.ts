// Core domain types shared across the game. Kept framework-agnostic so the
// same definitions can be reused by a future server implementation.

export type Rarity = "common" | "uncommon" | "rare" | "very_rare";

export interface FishDefinition {
  id: string;
  name: string;
  level: number;
  value: number;
  rarity: Rarity;
  /** Emoji/sprite key used by the renderer and UI as a placeholder icon. */
  sprite: string;
  description: string;
}

/** Relative weight of a fish within a specific pond's loot table. */
export interface LootTableEntry {
  fishId: string;
  weight: number;
}

export interface PondDefinition {
  id: string;
  name: string;
  recommendedRodLevel: number;
  lootTable: LootTableEntry[];
  background: string;
  /** Rod level required to be able to unlock/fish this pond. */
  requiredRodLevel: number;
  /** If true, the pond exists in data but has no playable map yet. */
  comingSoon?: boolean;
}

export interface RodDefinition {
  id: string;
  name: string;
  cost: number;
  level: number;
  /** Higher speed reduces average bite time. */
  speed: number;
  /** Higher luck increases odds of rarer catches. */
  luck: number;
  description: string;
}

export interface InventoryEntry {
  fishId: string;
  quantity: number;
}

/** The full authoritative state of a player's save. */
export interface PlayerState {
  coins: number;
  inventory: InventoryEntry[];
  ownedRodIds: string[];
  equippedRodId: string;
  unlockedPondIds: string[];
  currentPondId: string;
  stats: {
    totalFishCaught: number;
    totalCoinsEarned: number;
  };
}

export interface SaveData {
  version: number;
  state: PlayerState;
}

export type RodUiStatus = "locked" | "available" | "owned" | "equipped";

export type FishingStateName =
  | "IDLE"
  | "CASTING"
  | "WAITING"
  | "BITING"
  | "REELING"
  | "CAUGHT"
  | "RESULT";

export interface CatchResult {
  fish: FishDefinition;
}
