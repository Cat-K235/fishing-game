import { LOCATIONS } from "./LocationData";

export interface QuestProgress {
  totalCasts: number;
  totalCatches: number;
  totalSold: number;
  bestRarityIndex: number;
  ownedRodCount: number;
  unlockedLocationCount: number;
}

export interface QuestDef {
  id: string;
  description: string;
  reward: number;
  target: number;
  progress: (p: QuestProgress) => number;
}

export const QUESTS: QuestDef[] = [
  { id: "first-cast", description: "Cast your line", reward: 10, target: 1, progress: (p) => p.totalCasts },
  { id: "first-catch", description: "Land your first fish", reward: 20, target: 1, progress: (p) => p.totalCatches },
  { id: "catch-10", description: "Catch 10 fish", reward: 100, target: 10, progress: (p) => p.totalCatches },
  { id: "catch-25", description: "Catch 25 fish", reward: 250, target: 25, progress: (p) => p.totalCatches },
  { id: "rarity-uncommon", description: "Hook an Uncommon fish or better", reward: 40, target: 1, progress: (p) => (p.bestRarityIndex >= 1 ? 1 : 0) },
  { id: "rarity-rare", description: "Hook a Rare fish or better", reward: 100, target: 1, progress: (p) => (p.bestRarityIndex >= 2 ? 1 : 0) },
  { id: "rarity-epic", description: "Hook an Epic fish", reward: 250, target: 1, progress: (p) => (p.bestRarityIndex >= 3 ? 1 : 0) },
  { id: "rarity-legendary", description: "Hook a Legendary fish", reward: 600, target: 1, progress: (p) => (p.bestRarityIndex >= 4 ? 1 : 0) },
  { id: "sell-10", description: "Sell 10 fish", reward: 80, target: 10, progress: (p) => p.totalSold },
  { id: "own-2-rods", description: "Own 2 rods", reward: 150, target: 2, progress: (p) => p.ownedRodCount },
  { id: "explore-3", description: "Unlock 3 locations", reward: 200, target: 3, progress: (p) => p.unlockedLocationCount },
  { id: "explore-all", description: "Unlock every location", reward: 500, target: LOCATIONS.length, progress: (p) => p.unlockedLocationCount },
];

export function isQuestComplete(quest: QuestDef, p: QuestProgress): boolean {
  return quest.progress(p) >= quest.target;
}
