// Rods are cosmetic only — what you catch and how forgiving reeling is
// comes entirely from the equipped bait (see BaitData.ts). Rods just change
// what the character is holding, and give something to collect that isn't
// tied to raw power.
export interface RodDef {
  id: string;
  name: string;
  cost: number;
  /** Accent color used for the shop icon and the character's held rod. */
  color: number;
}

export const RODS: RodDef[] = [
  { id: "twig", name: "Twig Rod", cost: 0, color: 0x8a6a4a },
  { id: "iron", name: "Iron Rod", cost: 400, color: 0xaeb4bb },
  { id: "carbon", name: "Carbon Rod", cost: 1200, color: 0x3a3f4a },
  { id: "deep", name: "Deep Rod", cost: 3000, color: 0x2f6e8a },
  { id: "mythic", name: "Mythic Rod", cost: 8000, color: 0xb98cf2 },
];

export function rodById(id: string): RodDef {
  return RODS.find((r) => r.id === id) ?? RODS[0];
}
