import type { Camera } from "./Camera";
import type { Player } from "./Player";
import { World, TILE, type ZoneId } from "./World";
import type { FishingStateName } from "../types/game";
import type { FloatingText } from "./FloatingText";

export const VIEW_WIDTH = TILE * 10; // 320
export const VIEW_HEIGHT = World.HEIGHT; // 224 — no vertical scroll

/** Just past the pier's dead-end tip, over open water — cast off the end. */
export const BOBBER_WORLD_POS = {
  x: World.dock.x - 12,
  y: World.groundY,
};

export interface RenderState {
  camera: Camera;
  player: Player;
  fishingState: FishingStateName;
  fishingElapsedMs: number;
  activeZone: ZoneId | null;
  floatingText: FloatingText;
  timeMs: number;
}

/** One "art pixel" = a 2x2 block of real canvas pixels: a 16x16 grid per 32px tile. */
const ART_PIXEL = TILE / 16;
/** Building sprites include a sign board + post above the roof, this tall. */
const SIGN_HEIGHT_PX = 22;

const SKY_TOP = "#7ec8e3";
const SKY_BOTTOM = "#bfe8f0";
const MOUNTAIN_FAR = "#9db3cf";
const MOUNTAIN_NEAR = "#7f97ba";
const GRASS = "#5fa85a";
const GRASS_DARK = "#4d9146";
const DIRT = "#8a5a34";
const DIRT_DARK = "#754a29";
const DIRT_PEBBLE = "#5c3d22";
const WATER = "#3a7bd5";
const WATER_DARK = "#2f63ad";
const WATER_HIGHLIGHT = "#bfe8f5";
const DOCK = "#a9773f";
const DOCK_DARK = "#8a5a34";
const DOCK_SEAM = "#6f4527";
const TREE_LIGHT = "#3a7f57";
const TREE_DARK = "#265c3f";
const TRUNK = "#6b4226";
const ROOF = "#3d3d3d";
const ROOF_DARK = "#2b2b2b";
const ROOF_RIDGE = "#545454";
const DOOR = "#241f1a";
const DOOR_FRAME = "#4a3626";
const WINDOW_GLASS = "#bcdcec";
const WINDOW_FRAME = "#4a3626";
const SIGN_BOARD = "#c9a06a";
const SIGN_BORDER = "#6f4527";
const SIGN_POST = "#5c4326";

/** Deterministic pseudo-random value in [0,1) from integer coordinates. */
function hash(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function makeCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

/** Fills one art-pixel cell in a sprite's local (art-pixel) coordinates. */
function px(ctx: CanvasRenderingContext2D, col: number, row: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(col * ART_PIXEL, row * ART_PIXEL, ART_PIXEL, ART_PIXEL);
}

/**
 * Side-scrolling pixel-art renderer. Ground, dock, trees, bushes, clouds,
 * and buildings are hand-authored once as chunky "art pixel" bitmaps (a
 * 16x16 grid per 32px tile — real pixel art, not smooth vector shapes) and
 * cached as offscreen canvases at construction time, then blitted with
 * drawImage every frame. That keeps per-frame cost tiny regardless of world
 * size — only water, distant mountains, and the player/bobber/UI are drawn
 * live (all cheap: a handful of fills, no per-pixel loops).
 */
export class Renderer {
  private grassTiles: HTMLCanvasElement[];
  private dirtTiles: HTMLCanvasElement[];
  private waterFrames: HTMLCanvasElement[];
  private dockTile: HTMLCanvasElement;
  private treeSprite: HTMLCanvasElement;
  private bushSprite: HTMLCanvasElement;
  private cloudSprite: HTMLCanvasElement;
  private shopSprite: HTMLCanvasElement;
  private sellSprite: HTMLCanvasElement;

  constructor(private ctx: CanvasRenderingContext2D) {
    ctx.imageSmoothingEnabled = false;
    this.grassTiles = [0, 1, 2, 3].map((seed) => this.buildGrassTile(seed));
    this.dirtTiles = [0, 1, 2, 3].map((seed) => this.buildDirtTile(seed));
    this.waterFrames = [0, 1, 2].map((frame) => this.buildWaterTile(frame));
    this.dockTile = this.buildDockTile();
    this.treeSprite = this.buildTreeSprite();
    this.bushSprite = this.buildBushSprite();
    this.cloudSprite = this.buildCloudSprite();
    this.shopSprite = this.buildBuildingSprite("#b5794a", "#9c6238", "FISH");
    this.sellSprite = this.buildBuildingSprite("#4a90b5", "#3a7494", "RODS");
  }

  render(state: RenderState): void {
    const { ctx } = this;
    ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    this.drawSky(state);
    this.drawGround(state);
    this.drawDockDetails(state);
    this.drawDecor(state);
    this.drawBuildings(state);
    this.drawZoneHint(state);
    this.drawBobber(state);
    this.drawPlayer(state);
    state.floatingText.draw(ctx, state.camera);
  }

  // ---------------------------------------------------------------- sky

  private drawSky(state: RenderState): void {
    const { ctx } = this;
    const gradient = ctx.createLinearGradient(0, 0, 0, World.groundY);
    gradient.addColorStop(0, SKY_TOP);
    gradient.addColorStop(1, SKY_BOTTOM);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, VIEW_WIDTH, World.groundY);

    this.drawMountainLayer(state, 0.15, MOUNTAIN_FAR, World.groundY - 6, 26, 11);
    this.drawMountainLayer(state, 0.3, MOUNTAIN_NEAR, World.groundY - 2, 34, 47);

    for (const cloud of World.clouds) {
      const screenX = Math.round(cloud.x - state.camera.x * 0.5);
      this.ctx.drawImage(this.cloudSprite, screenX, cloud.y);
    }
  }

  /** Blocky parallax mountain silhouette, stepped rather than a smooth curve. */
  private drawMountainLayer(
    state: RenderState,
    parallax: number,
    color: string,
    baseline: number,
    maxHeight: number,
    seed: number
  ): void {
    const { ctx } = this;
    const step = 24;
    const scrollOffset = state.camera.x * parallax;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, World.groundY);
    for (let sx = 0; sx <= VIEW_WIDTH; sx += step) {
      const idx = Math.floor((sx + scrollOffset) / step);
      const h = Math.round((hash(idx, seed) * maxHeight) / ART_PIXEL) * ART_PIXEL;
      ctx.lineTo(sx, baseline - h);
    }
    ctx.lineTo(VIEW_WIDTH, World.groundY);
    ctx.closePath();
    ctx.fill();
  }

  // -------------------------------------------------------------- ground

  private drawGround(state: RenderState): void {
    const { ctx } = this;
    const startTile = Math.floor(state.camera.x / TILE) - 1;
    const endTile = Math.ceil((state.camera.x + VIEW_WIDTH) / TILE) + 1;
    const waterFrame = this.waterFrames[Math.floor(state.timeMs / 350) % this.waterFrames.length];

    for (let t = startTile; t <= endTile; t++) {
      const worldX = t * TILE;
      if (worldX < 0 || worldX >= World.WIDTH) continue;
      const screen = state.camera.worldToScreen(worldX, World.groundY);
      const inPond = worldX >= World.pond.x && worldX < World.pond.x + World.pond.w;
      const onPier = worldX >= World.dock.x && worldX < World.dock.x + World.dock.w;
      const variant = ((t % 4) + 4) % 4;

      // Top row: the pier where it's attached to shore, open water for the
      // rest of the pond (a dead-end cove, not walkable), grass elsewhere.
      const topSprite = onPier ? this.dockTile : inPond ? waterFrame : this.grassTiles[variant];
      ctx.drawImage(topSprite, screen.x, screen.y);
      // Band below: animated water under the whole pond, dirt elsewhere.
      ctx.drawImage(inPond ? waterFrame : this.dirtTiles[variant], screen.x, screen.y + TILE);
    }
  }

  /** Support posts + a low fence along the pier, drawn live (occluded by the player). */
  private drawDockDetails(state: RenderState): void {
    const { ctx } = this;
    const startX = World.dock.x; // the dead-end tip, over water
    const endX = World.dock.x + World.dock.w; // the shore attachment

    ctx.fillStyle = DOCK_SEAM;
    for (let x = startX; x < endX; x += TILE) {
      const p = state.camera.worldToScreen(x + 12, World.groundY + TILE);
      ctx.fillRect(p.x - 2, p.y - 2, 4, 16);
    }

    const railY = World.groundY - 9;
    ctx.fillStyle = DOCK_DARK;
    const railStart = state.camera.worldToScreen(startX, railY);
    ctx.fillRect(railStart.x, railStart.y + 6, World.dock.w, 3);
    for (let x = startX; x <= endX; x += 16) {
      const p = state.camera.worldToScreen(x, railY);
      ctx.fillRect(p.x, p.y, 2, 9);
    }
  }

  // --------------------------------------------------------- tile bitmaps

  private buildGrassTile(seed: number): HTMLCanvasElement {
    const { canvas, ctx } = makeCanvas(TILE, TILE);
    for (let row = 0; row < 16; row++) {
      for (let col = 0; col < 16; col++) {
        px(ctx, col, row, hash(seed * 97 + col, row) > 0.8 ? GRASS_DARK : GRASS);
      }
    }
    // Jagged blade tufts poking above the tile break up the flat top edge.
    for (let col = 0; col < 16; col++) {
      if (hash(seed * 53 + col, 99) > 0.6) px(ctx, col, -1, GRASS_DARK);
    }
    return canvas;
  }

  private buildDirtTile(seed: number): HTMLCanvasElement {
    const { canvas, ctx } = makeCanvas(TILE, TILE);
    for (let row = 0; row < 16; row++) {
      for (let col = 0; col < 16; col++) {
        let color = hash(seed * 71 + col, row + 40) > 0.82 ? DIRT_DARK : DIRT;
        if (hash(seed * 31 + col, row + 80) > 0.93) color = DIRT_PEBBLE;
        px(ctx, col, row, color);
      }
    }
    return canvas;
  }

  private buildWaterTile(frame: number): HTMLCanvasElement {
    const { canvas, ctx } = makeCanvas(TILE, TILE);
    for (let row = 0; row < 16; row++) {
      for (let col = 0; col < 16; col++) {
        let color = hash(col, row + frame * 17) > 0.78 ? WATER_DARK : WATER;
        if (row === 0 && hash(col + frame * 7, 5) > 0.55) color = WATER_HIGHLIGHT;
        px(ctx, col, row, color);
      }
    }
    return canvas;
  }

  private buildDockTile(): HTMLCanvasElement {
    const { canvas, ctx } = makeCanvas(TILE, TILE);
    for (let row = 0; row < 16; row++) {
      for (let col = 0; col < 16; col++) {
        let color = row % 4 === 0 ? DOCK_DARK : DOCK;
        if (col === 0 || col === 15) color = DOCK_SEAM;
        px(ctx, col, row, color);
      }
    }
    return canvas;
  }

  private buildTreeSprite(): HTMLCanvasElement {
    const { canvas, ctx } = makeCanvas(TILE, TILE);
    const cx = 8;
    const cy = 6;
    const r = 6.5;
    for (let row = 0; row < 12; row++) {
      for (let col = 0; col < 16; col++) {
        const dx = col - cx + 0.5;
        const dy = row - cy + 0.5;
        if (dx * dx + dy * dy <= r * r) {
          px(ctx, col, row, hash(col, row) > 0.78 ? TREE_DARK : TREE_LIGHT);
        }
      }
    }
    for (let row = 11; row < 16; row++) {
      px(ctx, 7, row, TRUNK);
      px(ctx, 8, row, TRUNK);
    }
    return canvas;
  }

  private buildBushSprite(): HTMLCanvasElement {
    const { canvas, ctx } = makeCanvas(TILE, TILE * 0.5);
    const puffs = [
      { cx: 3, cy: 6, r: 3.5 },
      { cx: 8, cy: 4.5, r: 4.5 },
      { cx: 13, cy: 6, r: 3.5 },
    ];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 16; col++) {
        const inside = puffs.some((p) => (col - p.cx) ** 2 + (row - p.cy) ** 2 <= p.r * p.r);
        if (inside) px(ctx, col, row, hash(col, row) > 0.78 ? TREE_DARK : TREE_LIGHT);
      }
    }
    return canvas;
  }

  private buildCloudSprite(): HTMLCanvasElement {
    const { canvas, ctx } = makeCanvas(TILE * 1.5, TILE * 0.75);
    const puffs = [
      { cx: 6, cy: 8, r: 5 },
      { cx: 12, cy: 6, r: 6 },
      { cx: 18, cy: 8, r: 5 },
      { cx: 9, cy: 10, r: 4.5 },
      { cx: 15, cy: 10, r: 4.5 },
    ];
    for (let row = 0; row < 12; row++) {
      for (let col = 0; col < 24; col++) {
        const inside = puffs.some((p) => (col - p.cx) ** 2 + (row - p.cy) ** 2 <= p.r * p.r);
        if (inside) px(ctx, col, row, hash(col, row) > 0.85 ? "#eef7fb" : "#ffffff");
      }
    }
    return canvas;
  }

  private buildBuildingSprite(wall: string, wallDark: string, label: string): HTMLCanvasElement {
    const artCols = 32; // 2 tiles wide
    const boardRows = 7;
    const postRows = 4;
    const roofRows = 14;
    const wallRows = 18;
    const totalRows = boardRows + postRows + roofRows + wallRows;
    const { canvas, ctx } = makeCanvas(TILE * 2, totalRows * ART_PIXEL);
    const centerCol = artCols / 2;

    // Sign board.
    for (let row = 0; row < boardRows; row++) {
      for (let col = centerCol - 9; col < centerCol + 9; col++) {
        const edge = row === 0 || row === boardRows - 1 || col === centerCol - 9 || col === centerCol + 8;
        px(ctx, col, row, edge ? SIGN_BORDER : SIGN_BOARD);
      }
    }
    ctx.fillStyle = SIGN_BORDER;
    ctx.font = "bold 7px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, (centerCol * ART_PIXEL) + 1, (boardRows * ART_PIXEL) / 2 + 1);

    // Post connecting the sign to the roof peak.
    for (let row = boardRows; row < boardRows + postRows; row++) {
      px(ctx, centerCol - 1, row, SIGN_POST);
      px(ctx, centerCol, row, SIGN_POST);
    }

    // Stepped pixel-art roof — grows one art-pixel per row from the peak,
    // instead of a smooth diagonal line. Top row is a lighter ridge cap.
    const roofTop = boardRows + postRows;
    for (let row = 0; row < roofRows; row++) {
      const halfWidth = Math.round(((row + 1) / roofRows) * centerCol);
      for (let col = centerCol - halfWidth; col < centerCol + halfWidth; col++) {
        const color = row === 0 ? ROOF_RIDGE : hash(col, row) > 0.75 ? ROOF_DARK : ROOF;
        px(ctx, col, roofTop + row, color);
      }
    }

    // Walls with vertical plank seams every 4 art-pixels.
    const wallTop = roofTop + roofRows;
    for (let row = 0; row < wallRows; row++) {
      for (let col = 0; col < artCols; col++) {
        const color = col % 4 === 0 ? wallDark : hash(col + 200, row) > 0.85 ? wallDark : wall;
        px(ctx, col, wallTop + row, color);
      }
    }

    // Window (left side).
    const winCol0 = 5;
    const winCol1 = 12;
    const winRow0 = wallTop + 3;
    const winRow1 = wallTop + 9;
    for (let row = winRow0; row <= winRow1; row++) {
      for (let col = winCol0; col <= winCol1; col++) {
        const edge = row === winRow0 || row === winRow1 || col === winCol0 || col === winCol1;
        const mullion = col === Math.round((winCol0 + winCol1) / 2) || row === Math.round((winRow0 + winRow1) / 2);
        px(ctx, col, row, edge ? WINDOW_FRAME : mullion ? WINDOW_FRAME : WINDOW_GLASS);
      }
    }

    // Door (right of center).
    const doorCol0 = centerCol + 3;
    const doorCol1 = centerCol + 10;
    const doorRow0 = wallTop + wallRows - 10;
    for (let row = doorRow0; row < wallTop + wallRows; row++) {
      for (let col = doorCol0; col <= doorCol1; col++) {
        const edge = col === doorCol0 || col === doorCol1 || row === doorRow0;
        px(ctx, col, row, edge ? DOOR_FRAME : DOOR);
      }
    }
    px(ctx, doorCol1 - 1, doorRow0 + 5, "#c9a06a");

    return canvas;
  }

  // -------------------------------------------------------------- decor

  private drawDecor(state: RenderState): void {
    const { ctx } = this;
    for (const bush of World.bushes) {
      const p = state.camera.worldToScreen(bush.x, bush.y);
      ctx.drawImage(this.bushSprite, p.x, p.y);
    }
    for (const tree of World.trees) {
      const p = state.camera.worldToScreen(tree.x, tree.y);
      ctx.drawImage(this.treeSprite, p.x, p.y);
    }
    for (const rock of World.rocks) {
      const p = state.camera.worldToScreen(rock.x, rock.y);
      ctx.fillStyle = rock.color;
      ctx.fillRect(p.x, p.y, rock.w, rock.h);
    }
    for (const flower of World.flowers) {
      const p = state.camera.worldToScreen(flower.x, flower.y);
      ctx.fillStyle = flower.color;
      ctx.fillRect(p.x, p.y, flower.w, flower.h);
    }
  }

  private drawBuildings(state: RenderState): void {
    const shop = state.camera.worldToScreen(World.shopBuilding.x, World.shopBuilding.y - SIGN_HEIGHT_PX);
    this.ctx.drawImage(this.shopSprite, shop.x, shop.y);
    const sell = state.camera.worldToScreen(World.sellStand.x, World.sellStand.y - SIGN_HEIGHT_PX);
    this.ctx.drawImage(this.sellSprite, sell.x, sell.y);
  }

  // ----------------------------------------------------------------- ui

  private drawZoneHint(state: RenderState): void {
    if (!state.activeZone) return;
    const zone = World.zones.find((z) => z.id === state.activeZone);
    if (!zone) return;
    const { ctx } = this;
    // A thin "you are here" strip along the ground under the active zone,
    // rather than the full (tall) trigger rect, which would look odd on screen.
    const p = state.camera.worldToScreen(zone.x, World.groundY - 6);
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(p.x, p.y, zone.w, 10);
    ctx.setLineDash([]);
  }

  private drawBobber(state: RenderState): void {
    const active = ["WAITING", "BITING", "REELING"].includes(state.fishingState);
    if (!active) return;
    const { ctx } = this;
    const biting = state.fishingState === "BITING";
    const bob = Math.sin(state.timeMs / (biting ? 60 : 300)) * (biting ? 4 : 2);
    const pos = state.camera.worldToScreen(BOBBER_WORLD_POS.x, BOBBER_WORLD_POS.y + bob);

    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    const rippleT = (state.timeMs % 1200) / 1200;
    ctx.globalAlpha = 1 - rippleT;
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y + 2, 4 + rippleT * 10, 2 + rippleT * 4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#e63946";
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y, 4, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(pos.x - 4, pos.y - 1, 8, 1);

    if (biting) {
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff200";
      ctx.fillText("!", pos.x, pos.y - 10);
    }
  }

  private drawPlayer(state: RenderState): void {
    const { ctx } = this;
    const { player } = state;
    const bounce = player.anim === "walk" ? (player.animFrame === 0 ? 0 : -2) : 0;
    const feet = state.camera.worldToScreen(player.x, player.y + bounce);
    const facingRight = player.direction === "right";
    const noseX = facingRight ? feet.x + 5 : feet.x - 8;

    if (player.isFishing()) {
      ctx.strokeStyle = "#8a5a34";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(feet.x, feet.y - 22);
      const bobberScreen = state.camera.worldToScreen(BOBBER_WORLD_POS.x, BOBBER_WORLD_POS.y);
      ctx.lineTo(bobberScreen.x, bobberScreen.y);
      ctx.stroke();
    }

    // Legs — alternate stride while walking.
    const strideOffset = player.anim === "walk" && player.animFrame === 1 ? 3 : 0;
    ctx.fillStyle = "#3d2b1f";
    ctx.fillRect(feet.x - 6 - strideOffset, feet.y - 10, 5, 10);
    ctx.fillRect(feet.x + 1 + strideOffset, feet.y - 10, 5, 10);
    // Body
    ctx.fillStyle = "#e8763c";
    ctx.fillRect(feet.x - 7, feet.y - 20, 14, 11);
    // Head
    ctx.fillStyle = "#f3c78a";
    ctx.fillRect(feet.x - 6, feet.y - 30, 12, 11);
    // Facing indicator (nose/hair tuft)
    ctx.fillStyle = "#f3c78a";
    ctx.fillRect(noseX, feet.y - 27, 3, 3);
    // Hair
    ctx.fillStyle = "#3d2b1f";
    ctx.fillRect(feet.x - 6, feet.y - 31, 12, 3);
  }
}
