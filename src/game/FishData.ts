export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export const RARITY_ORDER: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary"];

export function rarityIndex(rarity: Rarity): number {
  return RARITY_ORDER.indexOf(rarity);
}

export const RARITY_COLORS: Record<Rarity, number> = {
  common: 0x9aa0b4,
  uncommon: 0x6bcb77,
  rare: 0x8ecae6,
  epic: 0xb98cf2,
  legendary: 0xffd93d,
};

export interface FishSpecies {
  id: string;
  name: string;
  rarity: Rarity;
  locationId: string;
  /** Relative cast weight within its location — higher bites more often. */
  weight: number;
  /** 0..1, how hard it fights (feeds ReelMath's fightStrength). */
  fightStrength: number;
  /** How fast it changes fight direction, in fights/sec. */
  fightSpeed: number;
  /** Water depth band it swims at, 0 (surface) .. 1 (deep). */
  depth: number;
  /** Seconds before it bites once a line is out, [min, max]. */
  biteDelay: [number, number];
  bodyLength: number; // px at 1x, base sprite size
  colors: { body: number; belly: number; fin: number };
  /** Coins earned when sold from the inventory. */
  sellValue: number;
}

export const FISH_SPECIES: FishSpecies[] = [
  // ---- Mossy Pond (common..rare) ----
  {
    id: "silverling",
    name: "Silverling",
    rarity: "common",
    locationId: "mossy-pond",
    weight: 40,
    fightStrength: 0.25,
    fightSpeed: 1.4,
    depth: 0.25,
    biteDelay: [1, 2.6],
    bodyLength: 20,
    colors: { body: 0x9fb4c7, belly: 0xe4ecf2, fin: 0x6d8299 },
    sellValue: 8,
  },
  {
    id: "amberperch",
    name: "Amber Perch",
    rarity: "common",
    locationId: "mossy-pond",
    weight: 30,
    fightStrength: 0.35,
    fightSpeed: 1.7,
    depth: 0.4,
    biteDelay: [1.2, 3],
    bodyLength: 24,
    colors: { body: 0xe0973a, belly: 0xf6d59a, fin: 0xa8631d },
    sellValue: 14,
  },
  {
    id: "duskcarp",
    name: "Dusk Carp",
    rarity: "uncommon",
    locationId: "mossy-pond",
    weight: 18,
    fightStrength: 0.5,
    fightSpeed: 1.1,
    depth: 0.6,
    biteDelay: [1.6, 3.6],
    bodyLength: 30,
    colors: { body: 0x5c4a8a, belly: 0x9b8bc7, fin: 0x3a2d63 },
    sellValue: 32,
  },
  {
    id: "tealkoi",
    name: "Teal Koi",
    rarity: "rare",
    locationId: "mossy-pond",
    weight: 8,
    fightStrength: 0.68,
    fightSpeed: 2.1,
    depth: 0.5,
    biteDelay: [2, 4.2],
    bodyLength: 32,
    colors: { body: 0x2fbfa8, belly: 0xd8f5ee, fin: 0xff8fa3 },
    sellValue: 95,
  },
  {
    id: "mudskipper",
    name: "Mudskipper",
    rarity: "common",
    locationId: "mossy-pond",
    weight: 24,
    fightStrength: 0.3,
    fightSpeed: 2.2,
    depth: 0.15,
    biteDelay: [0.9, 2.2],
    bodyLength: 18,
    colors: { body: 0x7a8a4f, belly: 0xd4dba0, fin: 0x54622f },
    sellValue: 10,
  },
  {
    id: "copper-bream",
    name: "Copper Bream",
    rarity: "uncommon",
    locationId: "mossy-pond",
    weight: 14,
    fightStrength: 0.48,
    fightSpeed: 1.5,
    depth: 0.45,
    biteDelay: [1.5, 3.4],
    bodyLength: 26,
    colors: { body: 0xb5651d, belly: 0xe8b98a, fin: 0x7a3d0f },
    sellValue: 28,
  },

  // ---- River Gorge (common..epic) ----
  {
    id: "stonejaw-trout",
    name: "Stonejaw Trout",
    rarity: "common",
    locationId: "river-gorge",
    weight: 36,
    fightStrength: 0.3,
    fightSpeed: 1.6,
    depth: 0.3,
    biteDelay: [1, 2.4],
    bodyLength: 22,
    colors: { body: 0x7a8f6a, belly: 0xd7e0c9, fin: 0x4d5e40 },
    sellValue: 12,
  },
  {
    id: "rapid-minnow",
    name: "Rapid Minnow",
    rarity: "common",
    locationId: "river-gorge",
    weight: 28,
    fightStrength: 0.4,
    fightSpeed: 2.4,
    depth: 0.2,
    biteDelay: [0.8, 2],
    bodyLength: 16,
    colors: { body: 0xb7c6d6, belly: 0xf0f5fa, fin: 0x7d93a8 },
    sellValue: 16,
  },
  {
    id: "canyon-bass",
    name: "Canyon Bass",
    rarity: "uncommon",
    locationId: "river-gorge",
    weight: 16,
    fightStrength: 0.55,
    fightSpeed: 1.3,
    depth: 0.55,
    biteDelay: [1.5, 3.4],
    bodyLength: 28,
    colors: { body: 0x8a5a3a, belly: 0xdcb98f, fin: 0x5c3a22 },
    sellValue: 40,
  },
  {
    id: "whitewater-pike",
    name: "Whitewater Pike",
    rarity: "rare",
    locationId: "river-gorge",
    weight: 7,
    fightStrength: 0.75,
    fightSpeed: 2.4,
    depth: 0.45,
    biteDelay: [2, 4],
    bodyLength: 36,
    colors: { body: 0x3c6e71, belly: 0xc9e6e4, fin: 0x284b4d },
    sellValue: 120,
  },
  {
    id: "gorge-serpent-eel",
    name: "Gorge Serpent Eel",
    rarity: "epic",
    locationId: "river-gorge",
    weight: 2.5,
    fightStrength: 0.88,
    fightSpeed: 1.5,
    depth: 0.75,
    biteDelay: [2.6, 5],
    bodyLength: 44,
    colors: { body: 0x4a2f6b, belly: 0xb79ce0, fin: 0xffb703 },
    sellValue: 320,
  },
  {
    id: "boulder-trout",
    name: "Boulder Trout",
    rarity: "common",
    locationId: "river-gorge",
    weight: 30,
    fightStrength: 0.34,
    fightSpeed: 1.2,
    depth: 0.4,
    biteDelay: [1, 2.6],
    bodyLength: 24,
    colors: { body: 0x6a7a6a, belly: 0xc9d4c4, fin: 0x445044 },
    sellValue: 14,
  },
  {
    id: "fern-pike",
    name: "Fern Pike",
    rarity: "rare",
    locationId: "river-gorge",
    weight: 8,
    fightStrength: 0.72,
    fightSpeed: 1.9,
    depth: 0.5,
    biteDelay: [1.9, 3.9],
    bodyLength: 34,
    colors: { body: 0x3f7a4a, belly: 0xc7e8c0, fin: 0x24502c },
    sellValue: 115,
  },

  // ---- Ocean Pier (uncommon..epic) ----
  {
    id: "pier-mackerel",
    name: "Pier Mackerel",
    rarity: "uncommon",
    locationId: "ocean-pier",
    weight: 26,
    fightStrength: 0.42,
    fightSpeed: 1.8,
    depth: 0.35,
    biteDelay: [1.2, 2.8],
    bodyLength: 24,
    colors: { body: 0x3d6ea5, belly: 0xdfeefb, fin: 0x24466f },
    sellValue: 38,
  },
  {
    id: "tideherring",
    name: "Tideherring",
    rarity: "uncommon",
    locationId: "ocean-pier",
    weight: 22,
    fightStrength: 0.4,
    fightSpeed: 2,
    depth: 0.25,
    biteDelay: [1, 2.6],
    bodyLength: 20,
    colors: { body: 0xa8c9d6, belly: 0xf1fbff, fin: 0x6f9baa },
    sellValue: 34,
  },
  {
    id: "reef-snapper",
    name: "Reef Snapper",
    rarity: "rare",
    locationId: "ocean-pier",
    weight: 9,
    fightStrength: 0.7,
    fightSpeed: 1.6,
    depth: 0.6,
    biteDelay: [1.8, 3.8],
    bodyLength: 32,
    colors: { body: 0xe0603e, belly: 0xffd2b8, fin: 0x9c3b21 },
    sellValue: 130,
  },
  {
    id: "storm-marlin",
    name: "Storm Marlin",
    rarity: "epic",
    locationId: "ocean-pier",
    weight: 3,
    fightStrength: 0.9,
    fightSpeed: 2.6,
    depth: 0.5,
    biteDelay: [2.4, 4.6],
    bodyLength: 46,
    colors: { body: 0x1d3a5f, belly: 0xa8d0f0, fin: 0x0c1f38 },
    sellValue: 340,
  },
  {
    id: "silverfin-tuna",
    name: "Silverfin Tuna",
    rarity: "uncommon",
    locationId: "ocean-pier",
    weight: 18,
    fightStrength: 0.5,
    fightSpeed: 2.2,
    depth: 0.45,
    biteDelay: [1.3, 3],
    bodyLength: 28,
    colors: { body: 0x6a7f96, belly: 0xe8f0fa, fin: 0x3d4f66 },
    sellValue: 42,
  },
  {
    id: "coral-grouper",
    name: "Coral Grouper",
    rarity: "rare",
    locationId: "ocean-pier",
    weight: 8,
    fightStrength: 0.65,
    fightSpeed: 1.2,
    depth: 0.7,
    biteDelay: [1.8, 3.8],
    bodyLength: 34,
    colors: { body: 0xd6693f, belly: 0xffe0c0, fin: 0x7a3418 },
    sellValue: 135,
  },

  // ---- Deep Abyss (rare..legendary) ----
  {
    id: "abyssal-anglerfish",
    name: "Abyssal Anglerfish",
    rarity: "rare",
    locationId: "deep-abyss",
    weight: 14,
    fightStrength: 0.6,
    fightSpeed: 1,
    depth: 0.8,
    biteDelay: [1.6, 3.6],
    bodyLength: 30,
    colors: { body: 0x2a1f38, belly: 0x6b5a8a, fin: 0x8fe3ff },
    sellValue: 150,
  },
  {
    id: "void-ray",
    name: "Void Ray",
    rarity: "epic",
    locationId: "deep-abyss",
    weight: 6,
    fightStrength: 0.82,
    fightSpeed: 1.3,
    depth: 0.7,
    biteDelay: [2.2, 4.4],
    bodyLength: 40,
    colors: { body: 0x241b3a, belly: 0x4a3a6b, fin: 0xb98cf2 },
    sellValue: 380,
  },
  {
    id: "leviathan-wraith",
    name: "Leviathan Wraith",
    rarity: "legendary",
    locationId: "deep-abyss",
    weight: 1.2,
    fightStrength: 1,
    fightSpeed: 1.2,
    depth: 0.85,
    biteDelay: [3, 5.5],
    bodyLength: 54,
    colors: { body: 0x0f1a2e, belly: 0x2f5c8a, fin: 0x5ef2c8 },
    sellValue: 900,
  },
  {
    id: "ghost-eel",
    name: "Ghost Eel",
    rarity: "rare",
    locationId: "deep-abyss",
    weight: 12,
    fightStrength: 0.58,
    fightSpeed: 1.4,
    depth: 0.75,
    biteDelay: [1.7, 3.7],
    bodyLength: 38,
    colors: { body: 0x3a4a52, belly: 0x9ab4b8, fin: 0xd8f0f2 },
    sellValue: 160,
  },
  {
    id: "obsidian-ray",
    name: "Obsidian Ray",
    rarity: "epic",
    locationId: "deep-abyss",
    weight: 5,
    fightStrength: 0.85,
    fightSpeed: 1,
    depth: 0.85,
    biteDelay: [2.3, 4.5],
    bodyLength: 44,
    colors: { body: 0x100e18, belly: 0x2a2438, fin: 0x8fe3ff },
    sellValue: 400,
  },

  // ---- Crystal Lake (epic..legendary) ----
  {
    id: "prism-trout",
    name: "Prism Trout",
    rarity: "epic",
    locationId: "crystal-lake",
    weight: 7,
    fightStrength: 0.8,
    fightSpeed: 1.9,
    depth: 0.35,
    biteDelay: [1.8, 3.6],
    bodyLength: 30,
    colors: { body: 0x8ee0e8, belly: 0xffffff, fin: 0xff9fd6 },
    sellValue: 300,
  },
  {
    id: "moongar",
    name: "Moon Gar",
    rarity: "legendary",
    locationId: "crystal-lake",
    weight: 2,
    fightStrength: 0.95,
    fightSpeed: 1.6,
    depth: 0.6,
    biteDelay: [2.5, 5],
    bodyLength: 42,
    colors: { body: 0xb98cf2, belly: 0xf0e2ff, fin: 0xffd93d },
    sellValue: 750,
  },
  {
    id: "celestine-carp",
    name: "Celestine Carp",
    rarity: "legendary",
    locationId: "crystal-lake",
    weight: 1.5,
    fightStrength: 0.9,
    fightSpeed: 1.1,
    depth: 0.45,
    biteDelay: [2.8, 5.2],
    bodyLength: 48,
    colors: { body: 0xfff0a8, belly: 0xffffff, fin: 0x8ee0e8 },
    sellValue: 820,
  },
  {
    id: "aurora-betta",
    name: "Aurora Betta",
    rarity: "epic",
    locationId: "crystal-lake",
    weight: 6,
    fightStrength: 0.78,
    fightSpeed: 2.3,
    depth: 0.3,
    biteDelay: [1.9, 3.8],
    bodyLength: 28,
    colors: { body: 0xff8fd6, belly: 0xffe0f5, fin: 0x8ee0e8 },
    sellValue: 320,
  },
  {
    id: "starlight-sturgeon",
    name: "Starlight Sturgeon",
    rarity: "legendary",
    locationId: "crystal-lake",
    weight: 1.2,
    fightStrength: 0.92,
    fightSpeed: 1,
    depth: 0.7,
    biteDelay: [3, 5.5],
    bodyLength: 52,
    colors: { body: 0xd8d0f0, belly: 0xffffff, fin: 0xffd93d },
    sellValue: 880,
  },
];

export function fishById(id: string): FishSpecies | undefined {
  return FISH_SPECIES.find((f) => f.id === id);
}

/** Every species at a location whose rarity falls within [minRarityIndex, maxRarityIndex]. */
export function getLocationPool(locationId: string, minRarityIndex: number, maxRarityIndex: number): FishSpecies[] {
  return FISH_SPECIES.filter((f) => {
    if (f.locationId !== locationId) return false;
    const idx = rarityIndex(f.rarity);
    return idx >= minRarityIndex && idx <= maxRarityIndex;
  });
}

/**
 * Weighted pick from a pool. `rareBonusPct` (0..~0.35, from the equipped bait)
 * multiplies each species' weight by (1 + rareBonusPct * rarityIndex), skewing
 * the roll toward rarer fish without changing which species are reachable.
 */
export function pickWeightedFish(pool: FishSpecies[], rareBonusPct = 0, rng: () => number = Math.random): FishSpecies | null {
  if (pool.length === 0) return null;
  const weights = pool.map((f) => f.weight * (1 + rareBonusPct * rarityIndex(f.rarity)));
  const total = weights.reduce((sum, w) => sum + w, 0);
  let roll = rng() * total;
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}
