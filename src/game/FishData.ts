export type Rarity = "common" | "uncommon" | "rare" | "legendary";

export interface FishSpecies {
  id: string;
  name: string;
  rarity: Rarity;
  /** Relative cast weight — higher bites more often. */
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
  scoreValue: number;
}

export const FISH_SPECIES: FishSpecies[] = [
  {
    id: "silverling",
    name: "Silverling",
    rarity: "common",
    weight: 46,
    fightStrength: 0.25,
    fightSpeed: 1.4,
    depth: 0.25,
    biteDelay: [1, 2.6],
    bodyLength: 20,
    colors: { body: 0x9fb4c7, belly: 0xe4ecf2, fin: 0x6d8299 },
    scoreValue: 10,
  },
  {
    id: "amberperch",
    name: "Amber Perch",
    rarity: "common",
    weight: 30,
    fightStrength: 0.35,
    fightSpeed: 1.7,
    depth: 0.4,
    biteDelay: [1.2, 3],
    bodyLength: 24,
    colors: { body: 0xe0973a, belly: 0xf6d59a, fin: 0xa8631d },
    scoreValue: 15,
  },
  {
    id: "duskcarp",
    name: "Dusk Carp",
    rarity: "uncommon",
    weight: 15,
    fightStrength: 0.55,
    fightSpeed: 1.1,
    depth: 0.6,
    biteDelay: [1.6, 3.6],
    bodyLength: 30,
    colors: { body: 0x5c4a8a, belly: 0x9b8bc7, fin: 0x3a2d63 },
    scoreValue: 30,
  },
  {
    id: "tealkoi",
    name: "Teal Koi",
    rarity: "rare",
    weight: 7,
    fightStrength: 0.72,
    fightSpeed: 2.1,
    depth: 0.5,
    biteDelay: [2, 4.2],
    bodyLength: 32,
    colors: { body: 0x2fbfa8, belly: 0xd8f5ee, fin: 0xff8fa3 },
    scoreValue: 60,
  },
  {
    id: "moongar",
    name: "Moon Gar",
    rarity: "legendary",
    weight: 2,
    fightStrength: 0.95,
    fightSpeed: 1.6,
    depth: 0.8,
    biteDelay: [2.5, 5],
    bodyLength: 42,
    colors: { body: 0xb98cf2, belly: 0xf0e2ff, fin: 0xffd93d },
    scoreValue: 150,
  },
];

export function pickWeightedFish(rng: () => number = Math.random): FishSpecies {
  const total = FISH_SPECIES.reduce((sum, f) => sum + f.weight, 0);
  let roll = rng() * total;
  for (const fish of FISH_SPECIES) {
    roll -= fish.weight;
    if (roll <= 0) return fish;
  }
  return FISH_SPECIES[0];
}
