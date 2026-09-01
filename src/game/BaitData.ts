import { rarityIndex, type Rarity } from "./FishData";

// Bait decides what's willing to bite — how good your odds are at rarer
// fish, and the ceiling on what you can hook at all. It does not touch
// how the reel minigame plays; that's the rod's job (see RodData.ts).
export interface BaitDef {
  id: string;
  name: string;
  cost: number;
  /** 0..~0.35 — skews the catch roll toward rarer fish. */
  rareBonusPct: number;
  /** Highest rarity this bait is capable of hooking at all. */
  maxRarity: Rarity;
}

// Plain Worm is the one exception to the ammo system below: free and
// unlimited, so a player who's burned through every other bait always has
// something to cast with rather than getting soft-locked.
export const UNLIMITED_BAIT_ID = "plain-worm";

/** Every paid bait is bought in packs, not one at a time — `cost` is the price for one pack. */
export const BAIT_PACK_SIZE = 5;

export const BAITS: BaitDef[] = [
  { id: "plain-worm", name: "Plain Worm", cost: 0, rareBonusPct: 0, maxRarity: "uncommon" },
  { id: "fat-grub", name: "Fat Grub", cost: 500, rareBonusPct: 0.08, maxRarity: "rare" },
  { id: "live-cricket", name: "Live Cricket", cost: 2000, rareBonusPct: 0.16, maxRarity: "epic" },
  { id: "shiny-lure", name: "Shiny Lure", cost: 8000, rareBonusPct: 0.26, maxRarity: "legendary" },
  { id: "golden-lure", name: "Golden Lure", cost: 25000, rareBonusPct: 0.4, maxRarity: "legendary" },
];

export function baitById(id: string): BaitDef {
  return BAITS.find((b) => b.id === id) ?? BAITS[0];
}

export function baitMaxRarityIndex(bait: BaitDef): number {
  return rarityIndex(bait.maxRarity);
}
