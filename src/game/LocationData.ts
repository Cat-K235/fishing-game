import { rarityIndex, type Rarity } from "./FishData";
import { BAITS, baitMaxRarityIndex, type BaitDef } from "./BaitData";

export type ParticleStyle = "fireflies" | "mist" | "gulls" | "motes" | "sparkle" | "bubbles" | "foam" | "snow";

export interface LocationPalette {
  skyTop: number;
  skyMid: number;
  skyLow: number;
  skyHorizon: number;
  mountain: number;
  mountainHaze: number;
  treeline: number;
  waterDeep: number;
  waterMid: number;
  shimmer: number;
  dockWood: number;
  dockWoodDark: number;
}

export interface LocationDecor {
  /** Lily pads floating near the dock — only makes sense on still, shallow water. */
  lilyPads: boolean;
  /** Foreground pines framing the left/right edges — only makes sense somewhere enclosed by forest. */
  edgeTrees: boolean;
}

/** Discriminates the bespoke one-off ambient cast (frog, waterfall, aurora, etc.) each location gets. */
export type SceneSpecial = "pond" | "gorge" | "pier" | "abyss" | "crystal";

export interface LocationDef {
  id: string;
  name: string;
  unlockCost: number;
  minRarity: Rarity;
  maxRarity: Rarity;
  palette: LocationPalette;
  particles: ParticleStyle[];
  decor: LocationDecor;
  special: SceneSpecial;
}

export const LOCATIONS: LocationDef[] = [
  {
    id: "mossy-pond",
    name: "Mossy Pond",
    unlockCost: 0,
    minRarity: "common",
    maxRarity: "rare",
    palette: {
      skyTop: 0xbdeecb,
      skyMid: 0xd6f0b8,
      skyLow: 0xf1eda6,
      skyHorizon: 0xfff6c6,
      mountain: 0x2c2140,
      mountainHaze: 0x4a3f66,
      treeline: 0x1c3a24,
      waterDeep: 0x234a1f,
      waterMid: 0x2d5a27,
      shimmer: 0x4a8c3f,
      dockWood: 0x8a5232,
      dockWoodDark: 0x5c3620,
    },
    particles: ["bubbles"],
    decor: { lilyPads: true, edgeTrees: true },
    special: "pond",
  },
  {
    id: "river-gorge",
    name: "River Gorge",
    unlockCost: 1000,
    minRarity: "common",
    maxRarity: "epic",
    palette: {
      skyTop: 0x3a4650,
      skyMid: 0x5a6b78,
      skyLow: 0x8a99a3,
      skyHorizon: 0xc5d0d6,
      mountain: 0x2f3a33,
      mountainHaze: 0x4c5c50,
      treeline: 0x18241c,
      waterDeep: 0x1c3a3a,
      waterMid: 0x2a5252,
      shimmer: 0xa8d8ea,
      dockWood: 0x4a3624,
      dockWoodDark: 0x2e2013,
    },
    particles: ["mist", "foam"],
    decor: { lilyPads: false, edgeTrees: false },
    special: "gorge",
  },
  {
    id: "ocean-pier",
    name: "Ocean Pier",
    unlockCost: 5000,
    minRarity: "uncommon",
    maxRarity: "epic",
    palette: {
      skyTop: 0x4a2c6d,
      skyMid: 0xa4468a,
      skyLow: 0xe6714a,
      skyHorizon: 0xff9a4d,
      mountain: 0x2c4f70,
      mountainHaze: 0x4d7495,
      treeline: 0x203a4a,
      waterDeep: 0x0f2540,
      waterMid: 0x1a3a5c,
      shimmer: 0x6bb8e0,
      dockWood: 0x6b5642,
      dockWoodDark: 0x40311f,
    },
    particles: ["gulls"],
    decor: { lilyPads: false, edgeTrees: false },
    special: "pier",
  },
  {
    id: "deep-abyss",
    name: "Deep Abyss",
    unlockCost: 15000,
    minRarity: "rare",
    maxRarity: "legendary",
    palette: {
      skyTop: 0x050a1a,
      skyMid: 0x050a1a,
      skyLow: 0x050a1a,
      skyHorizon: 0x050a1a,
      mountain: 0x0a0d1c,
      mountainHaze: 0x161a2e,
      treeline: 0x05070c,
      waterDeep: 0x040c1a,
      waterMid: 0x061428,
      shimmer: 0x5ef2c8,
      dockWood: 0x30271e,
      dockWoodDark: 0x1a1410,
    },
    particles: ["motes"],
    decor: { lilyPads: false, edgeTrees: false },
    special: "abyss",
  },
  {
    id: "crystal-lake",
    name: "Crystal Lake",
    unlockCost: 50000,
    minRarity: "epic",
    maxRarity: "legendary",
    palette: {
      skyTop: 0x150a30,
      skyMid: 0x241454,
      skyLow: 0x3a1f6e,
      skyHorizon: 0x4a2a7a,
      mountain: 0x2e2560,
      mountainHaze: 0x5a4a9a,
      treeline: 0x1a2a3a,
      waterDeep: 0x2a6a72,
      waterMid: 0xb8fff5,
      shimmer: 0xffffff,
      dockWood: 0x5a4a5c,
      dockWoodDark: 0x352a38,
    },
    particles: ["snow"],
    decor: { lilyPads: false, edgeTrees: false },
    special: "crystal",
  },
];

export function locationById(id: string): LocationDef {
  return LOCATIONS.find((l) => l.id === id) ?? LOCATIONS[0];
}

export function locationRarityBounds(loc: LocationDef): { min: number; max: number } {
  return { min: rarityIndex(loc.minRarity), max: rarityIndex(loc.maxRarity) };
}

/** min(bait ceiling, location ceiling) — good bait on a low-tier scene still caps at the scene's max. */
export function effectiveMaxRarityIndex(loc: LocationDef, bait: BaitDef): number {
  return Math.min(baitMaxRarityIndex(bait), locationRarityBounds(loc).max);
}

/** Cheapest bait able to reach this location's top tier — shown on the Maps card as a recommendation. */
export function recommendedBaitFor(loc: LocationDef): BaitDef {
  const maxIdx = locationRarityBounds(loc).max;
  return BAITS.find((b) => baitMaxRarityIndex(b) >= maxIdx) ?? BAITS[BAITS.length - 1];
}
