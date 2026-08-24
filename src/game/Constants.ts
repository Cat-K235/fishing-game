// Design-resolution layout shared by texture generation and gameplay.
// Portrait Telegram Mini App viewport target: 390x844.
export const WORLD_W = 390;
export const WORLD_H = 844;

export const SKY_TOP = 0;
export const HORIZON_Y = 268; // where sky meets water
export const MOUNTAIN_BASE_Y = 232; // distant mountain silhouette sits just above horizon
export const TREELINE_BASE_Y = 264; // closer treeline overlaps the horizon slightly

export const WATER_TOP = HORIZON_Y;
export const WATER_BOTTOM = 792;

export const DOCK_TOP = 764; // dock overlaps the near water so the player "stands" at the edge
export const DOCK_BOTTOM = WORLD_H;

export const DOCK_CENTER_X = WORLD_W / 2;
export const PLAYER_Y = DOCK_TOP + 14;

export const CAST_MIN_Y = WATER_TOP + 30;
export const CAST_MAX_Y = WATER_BOTTOM - 40;
export const CAST_MARGIN_X = 28;

export function depthToY(depth: number): number {
  return CAST_MIN_Y + depth * (CAST_MAX_Y - CAST_MIN_Y);
}
