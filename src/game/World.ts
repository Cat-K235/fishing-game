export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DecorRect extends Rect {
  color: string;
  shape?: "rect" | "circle";
}

export type ZoneId = "fishing" | "shop" | "sell";

export interface Zone extends Rect {
  id: ZoneId;
  label: string;
}

/** Every sprite, tile, and layout measurement is a multiple of this. */
export const TILE = 32;

const PLAYER_RADIUS = 10;

/**
 * Static description of the Starter Village as a side-scrolling strip
 * (classic-platformer perspective): a single ground line the player walks
 * left/right along. There is no jump and no vertical movement — everything
 * sits on `groundY`. All coordinates are on a 32px grid to match the sprite
 * size.
 *
 * Layout, left to right: the pond is a dead-end cove at the world's left
 * edge with a pier jutting out from its right (shore) side — a real fishing
 * dock, not a bridge, so it only needs to attach to one shore. The player
 * spawns just past it and walks right through the shop and sell stand,
 * meaning the main path never has to cross open water.
 */
export class World {
  static readonly WIDTH = TILE * 24; // 768
  static readonly HEIGHT = TILE * 7; // 224
  /** The y coordinate of the ground surface; the player always stands here. */
  static readonly groundY = TILE * 5; // 160

  static readonly pond: Rect = { x: 0, y: World.groundY, w: TILE * 7, h: World.HEIGHT - World.groundY };
  /** A dead-end pier attached to the pond's right (shore) edge, jutting out over the water. */
  static readonly dock: Rect = {
    x: World.pond.x + World.pond.w - TILE * 3,
    y: World.groundY,
    w: TILE * 3,
    h: TILE,
  };

  static readonly shopBuilding: Rect = { x: TILE * 13, y: World.groundY - TILE * 2, w: TILE * 2, h: TILE * 2 };
  static readonly sellStand: Rect = { x: TILE * 19, y: World.groundY - TILE * 2, w: TILE * 2, h: TILE * 2 };

  static readonly trees: DecorRect[] = [
    { x: TILE * 9.5, y: World.groundY - TILE, w: TILE, h: TILE, color: "#2f6f4f" },
    { x: TILE * 11, y: World.groundY - TILE, w: TILE, h: TILE, color: "#2f6f4f" },
    { x: TILE * 16, y: World.groundY - TILE, w: TILE, h: TILE, color: "#2f6f4f" },
    { x: TILE * 23, y: World.groundY - TILE, w: TILE, h: TILE, color: "#2f6f4f" },
  ];

  static readonly rocks: DecorRect[] = [
    { x: World.dock.x + World.dock.w + 8, y: World.groundY - 8, w: 16, h: 8, color: "#8a8a8a", shape: "circle" },
    { x: TILE * 10.5, y: World.groundY - 6, w: 14, h: 7, color: "#8a8a8a", shape: "circle" },
    { x: TILE * 22, y: World.groundY - 8, w: 16, h: 8, color: "#8a8a8a", shape: "circle" },
  ];

  static readonly flowers: DecorRect[] = [
    { x: TILE * 12, y: World.groundY - 8, w: 5, h: 5, color: "#ff6b9d", shape: "circle" },
    { x: TILE * 12.5, y: World.groundY - 6, w: 5, h: 5, color: "#ffd93d", shape: "circle" },
    { x: TILE * 17, y: World.groundY - 8, w: 5, h: 5, color: "#ff6b9d", shape: "circle" },
    { x: TILE * 17.5, y: World.groundY - 6, w: 5, h: 5, color: "#ffd93d", shape: "circle" },
  ];

  static readonly clouds: Rect[] = [
    { x: TILE * 2, y: 20, w: TILE * 1.5, h: TILE / 2 },
    { x: TILE * 9, y: 34, w: TILE * 1.75, h: TILE / 2 },
    { x: TILE * 15, y: 18, w: TILE * 1.5, h: TILE / 2 },
    { x: TILE * 21, y: 30, w: TILE * 1.75, h: TILE / 2 },
  ];

  /** Small bushes flanking each building's base, purely decorative. */
  static readonly bushes: DecorRect[] = [
    { x: World.shopBuilding.x - 16, y: World.groundY - 14, w: 20, h: 14, color: "#3a7f57" },
    { x: World.shopBuilding.x + World.shopBuilding.w - 4, y: World.groundY - 14, w: 20, h: 14, color: "#3a7f57" },
    { x: World.sellStand.x - 16, y: World.groundY - 14, w: 20, h: 14, color: "#3a7f57" },
    { x: World.sellStand.x + World.sellStand.w - 4, y: World.groundY - 14, w: 20, h: 14, color: "#3a7f57" },
  ];

  /**
   * Trigger zones the player walks into, sized to snugly fit the thing
   * they're triggering rather than padded far beyond it. This is safe now
   * that real collision (see canWalk) keeps the player from ever standing
   * somewhere a zone couldn't reach — the padding these used to need just
   * to guarantee reachability isn't necessary anymore.
   */
  static readonly zones: Zone[] = [
    { id: "fishing", label: "🎣 CAST", x: World.dock.x - 4, y: World.groundY - 20, w: World.dock.w + 8, h: 40 },
    {
      id: "shop",
      label: "🏪 ROD SHOP",
      x: World.shopBuilding.x - 20,
      y: World.groundY - 20,
      w: World.shopBuilding.w + 40,
      h: 40,
    },
    {
      id: "sell",
      label: "💰 SELL FISH",
      x: World.sellStand.x - 20,
      y: World.groundY - 20,
      w: World.sellStand.w + 40,
      h: 40,
    },
  ];

  static readonly playerStart = { x: World.dock.x + World.dock.w + TILE, y: World.groundY };

  /**
   * Real collision: world bounds, open water beyond the pier, and the two
   * building footprints are all solid. The player can still stand right at
   * a building's edge (that's how the shop/sell zones get triggered) —
   * only the interior of each obstacle blocks movement.
   */
  static canWalk(x: number): boolean {
    if (x - PLAYER_RADIUS < 0 || x + PLAYER_RADIUS > World.WIDTH) return false;

    // Open water: the part of the pond the pier doesn't cover.
    if (x < World.dock.x && x + PLAYER_RADIUS > World.pond.x) return false;

    for (const building of [World.shopBuilding, World.sellStand]) {
      if (x + PLAYER_RADIUS > building.x && x - PLAYER_RADIUS < building.x + building.w) return false;
    }

    return true;
  }

  static getZoneAt(x: number, y: number): Zone | null {
    for (const zone of World.zones) {
      if (x >= zone.x && x <= zone.x + zone.w && y >= zone.y && y <= zone.y + zone.h) {
        return zone;
      }
    }
    return null;
  }
}
