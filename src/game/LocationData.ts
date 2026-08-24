import { rarityIndex, type Rarity } from "./FishData";
import { RODS, rodMaxRarityIndex, type RodDef } from "./RodData";

export type ParticleStyle = "fireflies" | "mist" | "gulls" | "motes" | "sparkle";

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

export interface LocationDef {
  id: string;
  name: string;
  unlockCost: number;
  minRarity: Rarity;
  maxRarity: Rarity;
  palette: LocationPalette;
  particle: ParticleStyle;
}

export const LOCATIONS: LocationDef[] = [
  {
    id: "mossy-pond",
    name: "Mossy Pond",
    unlockCost: 0,
    minRarity: "common",
    maxRarity: "rare",
    palette: {
      skyTop: 0x151831,
      skyMid: 0x4a3466,
      skyLow: 0xd97a3d,
      skyHorizon: 0xffcf7a,
      mountain: 0x2c2140,
      mountainHaze: 0x4a3f66,
      treeline: 0x16261f,
      waterDeep: 0x0c2b3a,
      waterMid: 0x184a5c,
      shimmer: 0xbfe9e8,
      dockWood: 0x5b3a29,
      dockWoodDark: 0x3e2618,
    },
    particle: "fireflies",
  },
  {
    id: "river-gorge",
    name: "River Gorge",
    unlockCost: 1000,
    minRarity: "common",
    maxRarity: "epic",
    palette: {
      skyTop: 0x1c2333,
      skyMid: 0x3c4a52,
      skyLow: 0x7c9482,
      skyHorizon: 0xc9d9a8,
      mountain: 0x2f3a33,
      mountainHaze: 0x4c5c50,
      treeline: 0x18241c,
      waterDeep: 0x113028,
      waterMid: 0x1e4a3c,
      shimmer: 0xcdeecb,
      dockWood: 0x4a3624,
      dockWoodDark: 0x2e2013,
    },
    particle: "mist",
  },
  {
    id: "ocean-pier",
    name: "Ocean Pier",
    unlockCost: 5000,
    minRarity: "uncommon",
    maxRarity: "epic",
    palette: {
      skyTop: 0x1a3a5c,
      skyMid: 0x3a70a0,
      skyLow: 0x8bc6e8,
      skyHorizon: 0xfdf3d0,
      mountain: 0x2c4f70,
      mountainHaze: 0x4d7495,
      treeline: 0x203a4a,
      waterDeep: 0x0b3350,
      waterMid: 0x1a5a80,
      shimmer: 0xdff6ff,
      dockWood: 0x6b5642,
      dockWoodDark: 0x40311f,
    },
    particle: "gulls",
  },
  {
    id: "deep-abyss",
    name: "Deep Abyss",
    unlockCost: 15000,
    minRarity: "rare",
    maxRarity: "legendary",
    palette: {
      skyTop: 0x05070f,
      skyMid: 0x0d1428,
      skyLow: 0x1a1030,
      skyHorizon: 0x2e1a40,
      mountain: 0x0a0d1c,
      mountainHaze: 0x161a2e,
      treeline: 0x05070c,
      waterDeep: 0x02040c,
      waterMid: 0x061428,
      shimmer: 0x5ef2c8,
      dockWood: 0x30271e,
      dockWoodDark: 0x1a1410,
    },
    particle: "motes",
  },
  {
    id: "crystal-lake",
    name: "Crystal Lake",
    unlockCost: 50000,
    minRarity: "epic",
    maxRarity: "legendary",
    palette: {
      skyTop: 0x1c1440,
      skyMid: 0x4a3a8a,
      skyLow: 0x8ee0e8,
      skyHorizon: 0xffe8f5,
      mountain: 0x2e2560,
      mountainHaze: 0x5a4a9a,
      treeline: 0x1a2a3a,
      waterDeep: 0x0c2a4a,
      waterMid: 0x1a5a7a,
      shimmer: 0xffffff,
      dockWood: 0x5a4a5c,
      dockWoodDark: 0x352a38,
    },
    particle: "sparkle",
  },
];

export function locationById(id: string): LocationDef {
  return LOCATIONS.find((l) => l.id === id) ?? LOCATIONS[0];
}

export function locationRarityBounds(loc: LocationDef): { min: number; max: number } {
  return { min: rarityIndex(loc.minRarity), max: rarityIndex(loc.maxRarity) };
}

/** min(rod ceiling, location ceiling) — a high-tier rod on a low-tier scene still caps at the scene's max. */
export function effectiveMaxRarityIndex(loc: LocationDef, rod: RodDef): number {
  return Math.min(rodMaxRarityIndex(rod), locationRarityBounds(loc).max);
}

/** Cheapest rod able to reach this location's top tier — shown on the Maps card as a recommendation. */
export function recommendedRodFor(loc: LocationDef): RodDef {
  const maxIdx = locationRarityBounds(loc).max;
  return RODS.find((r) => rodMaxRarityIndex(r) >= maxIdx) ?? RODS[RODS.length - 1];
}
