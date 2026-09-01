import Phaser from "phaser";
import { FISH_SPECIES } from "./FishData";
import { LOCATIONS, type LocationPalette, type ParticleStyle } from "./LocationData";
import { RODS, type RodDef } from "./RodData";
import { BAITS } from "./BaitData";

// All art in this game is generated procedurally onto canvas textures at
// boot time — there is no asset pipeline, no network fetch, so the app boots
// instantly and works fully offline. Everything below draws in "chunky
// pixel" blocks (2-3px) rather than smooth vector curves to read as pixel
// art once scaled into the scene.

const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

function hexToRgb(hex: number): [number, number, number] {
  return [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff];
}

function rgbToCss([r, g, b]: [number, number, number], a = 1): string {
  return `rgba(${r},${g},${b},${a})`;
}

/** Nudges a hex color's channels by `amt` (negative darkens, positive lightens), for deriving shade/highlight tones from a single palette color. */
function shade(hex: number, amt: number): number {
  const [r, g, b] = hexToRgb(hex);
  const c = (v: number) => Phaser.Math.Clamp(Math.round(v + amt), 0, 255);
  return (c(r) << 16) | (c(g) << 8) | c(b);
}

/** Ordered (Bayer) dithered fill between two colors across a rect, in `block`-px cells. */
function ditherRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  colorA: number,
  colorB: number,
  mix: number, // 0 = all colorA, 1 = all colorB
  block = 3
): void {
  for (let py = 0; py < h; py += block) {
    for (let px = 0; px < w; px += block) {
      const bx = Math.floor(px / block) % 4;
      const by = Math.floor(py / block) % 4;
      const threshold = (BAYER_4X4[by][bx] + 0.5) / 16;
      const useB = mix > threshold;
      ctx.fillStyle = rgbToCss(hexToRgb(useB ? colorB : colorA));
      ctx.fillRect(x + px, y + py, block, block);
    }
  }
}

const canvasTextures = new Map<string, Phaser.Textures.CanvasTexture>();

function createCtx(scene: Phaser.Scene, key: string, w: number, h: number): CanvasRenderingContext2D {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, w, h)!;
  canvasTextures.set(key, tex);
  return tex.getContext();
}

function refresh(_scene: Phaser.Scene, key: string): void {
  canvasTextures.get(key)?.refresh();
}

const DOCK_EDGE = 0x2a1810;

export function generateSky(scene: Phaser.Scene, key: string, w: number, h: number, pal: LocationPalette): void {
  const ctx = createCtx(scene, key, w, h);
  const bands = 48;
  const bandH = Math.ceil(h / bands);
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    let a: number, b: number, localT: number;
    if (t < 0.4) {
      a = pal.skyTop;
      b = pal.skyMid;
      localT = t / 0.4;
    } else if (t < 0.78) {
      a = pal.skyMid;
      b = pal.skyLow;
      localT = (t - 0.4) / 0.38;
    } else {
      a = pal.skyLow;
      b = pal.skyHorizon;
      localT = (t - 0.78) / 0.22;
    }
    // A fine 1px grain rather than chunky blocks — close enough to a smooth
    // gradient to read as "soft sky" while still carrying a little of the
    // dithered pixel-art texture the rest of the scene has.
    ditherRect(ctx, 0, i * bandH, w, bandH, a, b, localT, 1);
  }
  refresh(scene, key);
}

function jaggedSilhouette(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  baseY: number,
  amplitude: number,
  segments: number,
  color: number,
  alpha: number,
  seed: number
): void {
  ctx.fillStyle = rgbToCss(hexToRgb(color), alpha);
  ctx.beginPath();
  ctx.moveTo(0, h);
  const segW = w / segments;
  let rnd = seed;
  const next = () => {
    rnd = (rnd * 9301 + 49297) % 233280;
    return rnd / 233280;
  };
  for (let i = 0; i <= segments; i++) {
    const x = i * segW;
    const y = baseY - next() * amplitude;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
}

export function generateMountains(scene: Phaser.Scene, key: string, w: number, h: number, pal: LocationPalette): void {
  const ctx = createCtx(scene, key, w, h);
  jaggedSilhouette(ctx, w, h, h - 4, h * 0.55, 7, pal.mountainHaze, 0.55, 7);
  jaggedSilhouette(ctx, w, h, h + 6, h * 0.4, 9, pal.mountain, 0.85, 21);
  refresh(scene, key);
}

/** Deterministic per-cell hash in [0, 1) — same inputs always give the same output, so the tile still repeats seamlessly. */
function cellHash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  h = Math.imul(h ^ (h >>> 13), 3266489917);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

/** A flat, un-textured water fill — motion comes entirely from the separate per-scene shimmer rows/lines drawn on top, not from noise baked into the base tile. */
export function generateWaterTile(scene: Phaser.Scene, key: string, size: number, pal: LocationPalette): void {
  const ctx = createCtx(scene, key, size, size);
  ctx.fillStyle = rgbToCss(hexToRgb(pal.waterMid));
  ctx.fillRect(0, 0, size, size);
  refresh(scene, key);
}

/** Back layer of a 2-layer treeline: a continuous chain of rounded bumps (bushes/hedge), no gaps. */
/** Jagged pine-spike treeline silhouette — one layer, no round "just circles" canopies. */
export function generateTreeline(scene: Phaser.Scene, key: string, w: number, h: number, pal: LocationPalette): void {
  const ctx = createCtx(scene, key, w, h);
  ctx.fillStyle = rgbToCss(hexToRgb(pal.treeline), 1);
  const spikeW = 9;
  let x = -4;
  let seed = 5;
  const next = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  ctx.beginPath();
  ctx.moveTo(0, h);
  while (x < w + spikeW) {
    const peakH = h * (0.45 + next() * 0.5);
    ctx.lineTo(x, h - peakH * 0.15);
    ctx.lineTo(x + spikeW / 2, h - peakH);
    ctx.lineTo(x + spikeW, h - peakH * 0.15);
    x += spikeW * (0.7 + next() * 0.3);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
  refresh(scene, key);
}

/** Thin speckled transition strip between the background silhouette and the water. */
export function generateGrassEdge(scene: Phaser.Scene, key: string, w: number, h: number, pal: LocationPalette): void {
  const ctx = createCtx(scene, key, w, h);
  for (let x = 0; x < w; x += 2) {
    const n = cellHash(Math.floor(x / 2), 0, 13);
    ctx.fillStyle = rgbToCss(hexToRgb(n < 0.5 ? pal.mountainHaze : pal.treeline));
    ctx.fillRect(x, 0, 2, h);
  }
  refresh(scene, key);
}

/**
 * A small standalone specimen tree — shaded trunk, a couple of branch
 * stubs, and a layered 3-tone canopy (shadow/base/highlight blobs plus a
 * sparse leaf-fleck dither) — for scattering a few close, detailed trees in
 * front of the hazy background treeline. Distinct from that treeline: this
 * has real structure (trunk, shading) rather than reading as flat circles.
 */
export function generateTree(scene: Phaser.Scene, key: string, pal: LocationPalette, seed: number): void {
  const w = 32,
    h = 58;
  const ctx = createCtx(scene, key, w, h);
  let rnd = seed;
  const next = () => {
    rnd = (rnd * 9301 + 49297) % 233280;
    return rnd / 233280;
  };

  // Lightened hard, not just nudged, so the canopy reads as sunlit foliage
  // standing apart from the much darker background treeline it overlaps,
  // instead of blending into it as another dark shape.
  const canopyShadow = shade(pal.treeline, -4);
  const canopyBase = shade(pal.treeline, 62);
  const canopyHighlight = shade(pal.treeline, 108);
  const outline = "rgba(0,0,0,0.5)";

  const cx = w / 2;
  const trunkTopY = h - 20;

  // Trunk, with a lit face down one side, plus two angled branch stubs.
  ctx.fillStyle = rgbToCss(hexToRgb(pal.dockWoodDark));
  ctx.fillRect(cx - 2.5, trunkTopY, 5, h - trunkTopY);
  ctx.fillStyle = rgbToCss(hexToRgb(pal.dockWood));
  ctx.fillRect(cx - 2.5, trunkTopY, 2, h - trunkTopY);
  ctx.strokeStyle = rgbToCss(hexToRgb(pal.dockWoodDark));
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(cx, trunkTopY + 3);
  ctx.lineTo(cx - 8, trunkTopY - 8);
  ctx.moveTo(cx, trunkTopY + 6);
  ctx.lineTo(cx + 9, trunkTopY - 7);
  ctx.stroke();

  // Canopy: an outlined shadow silhouette first (the outline is what
  // separates it from a busy background), then base lobes, then highlight dabs.
  const shadowBlobs: [number, number, number, number][] = [
    [0, 16, 14, 13],
    [-7, 20, 8, 7],
    [7, 19, 8.5, 7.5],
  ];
  ctx.fillStyle = rgbToCss(hexToRgb(canopyShadow));
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.6;
  for (const [dx, dy, rx, ry] of shadowBlobs) {
    ctx.beginPath();
    ctx.ellipse(cx + dx, trunkTopY - dy + 16, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  const litBlobs: [number, number, number, number, number][] = [
    [0, 10, 11, 9, 1],
    [-7, 13, 6.5, 5.5, 1],
    [7, 12, 7, 6, 1],
    [-3, 4, 5.5, 4.8, 2],
    [5, 6, 5, 4.4, 2],
    [0, 0, 3.6, 3.2, 2],
  ];
  const tones = [canopyShadow, canopyBase, canopyHighlight];
  for (const [dx, dy, rx, ry, tone] of litBlobs) {
    ctx.fillStyle = rgbToCss(hexToRgb(tones[tone]));
    ctx.beginPath();
    ctx.ellipse(cx + dx, trunkTopY - dy + 16, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Sparse fleck texture so the canopy reads as leafy rather than flat-filled.
  for (let i = 0; i < 16; i++) {
    const angle = next() * Math.PI * 2;
    const r = next() * 12;
    const fx = cx + Math.cos(angle) * r;
    const fy = trunkTopY - 4 + Math.sin(angle) * r * 0.75;
    ctx.fillStyle = rgbToCss(hexToRgb(next() > 0.45 ? canopyHighlight : canopyShadow), 0.55);
    ctx.fillRect(fx, fy, 1.8, 1.8);
  }

  refresh(scene, key);
}

/** Flat squashed-oval lily pad with a clean outline, matching the reference art's flat-shape-plus-outline style. `flower` adds a small pink 4-petal dot. */
export function generateLilyPad(scene: Phaser.Scene, key: string, variant: number, flower: boolean): void {
  const w = 30,
    h = 14;
  const ctx = createCtx(scene, key, w, h);
  const green = [0x2f7a3f, 0x357a3a, 0x2a6f38][variant % 3];

  ctx.fillStyle = rgbToCss(hexToRgb(green));
  ctx.beginPath();
  ctx.ellipse(w / 2, h / 2, w / 2 - 2, h / 2 - 2, 0, 0.3, Math.PI * 2 - 0.3);
  ctx.lineTo(w / 2, h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.stroke();

  if (flower) {
    const fx = w / 2 + 2;
    const fy = h / 2 - 1;
    ctx.fillStyle = "#f2a6c8";
    for (const [dx, dy] of [
      [-2, 0],
      [2, 0],
      [0, -2],
      [0, 2],
    ]) {
      ctx.beginPath();
      ctx.arc(fx + dx, fy + dy, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#ffd93d";
    ctx.beginPath();
    ctx.arc(fx, fy, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  refresh(scene, key);
}

export function generateDockPlank(scene: Phaser.Scene, key: string, w: number, h: number, pal: LocationPalette): void {
  const ctx = createCtx(scene, key, w, h);
  ditherRect(ctx, 0, 0, w, h, pal.dockWood, pal.dockWoodDark, 0.25, 2);
  ctx.fillStyle = rgbToCss(hexToRgb(DOCK_EDGE));
  ctx.fillRect(0, 0, w, 2);
  for (let gx = 4; gx < w; gx += 9) {
    ctx.fillRect(gx, 3, 1, h - 5);
  }
  refresh(scene, key);
}

/** A short vertical support post hanging below the dock's front edge, like a piling. */
export function generateDockPost(scene: Phaser.Scene, key: string, pal: LocationPalette): void {
  const w = 10,
    h = 22;
  const ctx = createCtx(scene, key, w, h);
  ctx.fillStyle = rgbToCss(hexToRgb(DOCK_EDGE));
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = rgbToCss(hexToRgb(pal.dockWoodDark));
  ctx.fillRect(1, 0, w - 4, h - 2);
  refresh(scene, key);
}

export function generateBobber(scene: Phaser.Scene, key: string): void {
  const w = 12,
    h = 14;
  const ctx = createCtx(scene, key, w, h);
  ctx.fillStyle = "#f2f2f2";
  ctx.fillRect(2, 6, w - 4, h - 6);
  ctx.fillStyle = "#e63946";
  ctx.fillRect(2, 2, w - 4, 5);
  ctx.fillStyle = "#1c1c1c";
  ctx.fillRect(w / 2 - 1, 0, 2, 3);
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.lineWidth = 1;
  ctx.strokeRect(1.5, 1.5, w - 3, h - 3);
  refresh(scene, key);
}

export function generateRipple(scene: Phaser.Scene, key: string): void {
  const s = 40;
  const ctx = createCtx(scene, key, s, s);
  ctx.strokeStyle = "rgba(210,240,238,0.9)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s / 2 - 3, 0, Math.PI * 2);
  ctx.stroke();
  refresh(scene, key);
}

export function generateParticle(scene: Phaser.Scene, key: string, color: number, shape: "star" | "diamond"): void {
  const s = 8;
  const ctx = createCtx(scene, key, s, s);
  ctx.fillStyle = rgbToCss(hexToRgb(color));
  if (shape === "diamond") {
    ctx.beginPath();
    ctx.moveTo(s / 2, 0);
    ctx.lineTo(s, s / 2);
    ctx.lineTo(s / 2, s);
    ctx.lineTo(0, s / 2);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const outerA = (Math.PI / 2) * i;
      const innerA = outerA + Math.PI / 4;
      const ox = s / 2 + Math.cos(outerA) * (s / 2);
      const oy = s / 2 + Math.sin(outerA) * (s / 2);
      const ix = s / 2 + Math.cos(innerA) * (s / 4);
      const iy = s / 2 + Math.sin(innerA) * (s / 4);
      if (i === 0) ctx.moveTo(ox, oy);
      else ctx.lineTo(ox, oy);
      ctx.lineTo(ix, iy);
    }
    ctx.closePath();
    ctx.fill();
  }
  refresh(scene, key);
}

/** Small ambient-life particle, one per location's `particle` style. */
export function generateLocationParticle(scene: Phaser.Scene, key: string, style: ParticleStyle): void {
  // Mist needs real room to be a soft, fluffy puff — the shared 10px
  // canvas made it read as a hard little sparkle instead.
  const s = style === "mist" ? 26 : 10;
  const ctx = createCtx(scene, key, s, s);
  switch (style) {
    case "fireflies":
      ctx.fillStyle = "rgba(255,217,61,0.25)";
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffe98a";
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, 1.6, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "mist": {
      // Several low-alpha overlapping circles instead of one hard-edged
      // ellipse — the overlap builds up a soft, fluffy-looking falloff
      // toward the edges rather than a crisp boundary.
      const lumps: [number, number, number][] = [
        [s * 0.4, s * 0.55, s * 0.3],
        [s * 0.62, s * 0.45, s * 0.34],
        [s * 0.5, s * 0.3, s * 0.26],
        [s * 0.42, s * 0.68, s * 0.24],
      ];
      for (const [lx, ly, r] of lumps) {
        ctx.fillStyle = "rgba(225,235,230,0.16)";
        ctx.beginPath();
        ctx.arc(lx, ly, r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "gulls":
      ctx.strokeStyle = "rgba(255,255,255,0.95)";
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(0, s / 2 - 1);
      ctx.lineTo(s / 2, s / 2 + 2.5);
      ctx.lineTo(s, s / 2 - 1);
      ctx.stroke();
      break;
    case "motes":
      ctx.fillStyle = "rgba(94,242,200,0.3)";
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#bffce9";
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, 1.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "sparkle":
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(s / 2, 0);
      ctx.lineTo(s / 2 + 1.4, s / 2 - 1.4);
      ctx.lineTo(s, s / 2);
      ctx.lineTo(s / 2 + 1.4, s / 2 + 1.4);
      ctx.lineTo(s / 2, s);
      ctx.lineTo(s / 2 - 1.4, s / 2 + 1.4);
      ctx.lineTo(0, s / 2);
      ctx.lineTo(s / 2 - 1.4, s / 2 - 1.4);
      ctx.closePath();
      ctx.fill();
      break;
    case "bubbles":
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, s / 2 - 1.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.arc(s / 2 - 1.5, s / 2 - 1.5, 1, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "foam":
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillRect(1, s / 2 - 1, 2, 2);
      ctx.fillRect(s / 2 + 1, s / 2 - 3, 2, 2);
      ctx.fillRect(s / 2 - 1, s / 2 + 2, 2, 2);
      break;
    case "snow":
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(s / 2, 1);
      ctx.lineTo(s / 2, s - 1);
      ctx.moveTo(1, s / 2);
      ctx.lineTo(s - 1, s / 2);
      ctx.stroke();
      break;
  }
  refresh(scene, key);
}

// --------------------------------------------------- PER-SCENE SPECIALS
// One-off bespoke decorations that make each location feel distinct beyond
// its palette: a cloud/frog/dragonfly for the pond, cliffs/waterfall for
// the gorge, a sun/lighthouse/boat for the pier, a deep-sea creature and
// anglerfish for the abyss, and stars/crystals for the lake.

export function generateCloud(scene: Phaser.Scene, key: string): void {
  const w = 44,
    h = 20;
  const ctx = createCtx(scene, key, w, h);
  const lumps: [number, number, number][] = [
    [10, 13, 8],
    [20, 9, 10],
    [30, 12, 8],
    [16, 15, 7],
    [26, 15, 7],
  ];
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  for (const [cx, cy, r] of lumps) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(210,220,225,0.5)";
  ctx.fillRect(4, h - 6, w - 8, 4);
  refresh(scene, key);
}

/** Frog sitting on a lily pad — two frames, eyes open / blinking. */
export function generateFrog(scene: Phaser.Scene, key: string, blink: boolean): void {
  const w = 16,
    h = 12;
  const ctx = createCtx(scene, key, w, h);
  ctx.fillStyle = "#3f8f4f";
  ctx.beginPath();
  ctx.ellipse(w / 2, h - 4, 6, 4.5, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#2f6b3c";
  ctx.beginPath();
  ctx.arc(w / 2 - 3.5, h - 8, 2.6, 0, Math.PI * 2);
  ctx.arc(w / 2 + 3.5, h - 8, 2.6, 0, Math.PI * 2);
  ctx.fill();
  if (blink) {
    ctx.strokeStyle = "#12240f";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 4.5, h - 8);
    ctx.lineTo(w / 2 - 2.5, h - 8);
    ctx.moveTo(w / 2 + 2.5, h - 8);
    ctx.lineTo(w / 2 + 4.5, h - 8);
    ctx.stroke();
  } else {
    ctx.fillStyle = "#12240f";
    ctx.beginPath();
    ctx.arc(w / 2 - 3.5, h - 8, 1, 0, Math.PI * 2);
    ctx.arc(w / 2 + 3.5, h - 8, 1, 0, Math.PI * 2);
    ctx.fill();
  }
  refresh(scene, key);
}

export function generateDragonfly(scene: Phaser.Scene, key: string): void {
  const w = 14,
    h = 8;
  const ctx = createCtx(scene, key, w, h);
  ctx.fillStyle = "rgba(180,230,220,0.55)";
  ctx.beginPath();
  ctx.ellipse(w / 2 - 1, h / 2, 5, 2, 0.5, 0, Math.PI * 2);
  ctx.ellipse(w / 2 + 1, h / 2, 5, 2, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2f7a6b";
  ctx.fillRect(w / 2 - 1, h / 2 - 1, 2, 5);
  ctx.fillStyle = "#123a30";
  ctx.beginPath();
  ctx.arc(w / 2, h / 2 - 2, 1.4, 0, Math.PI * 2);
  ctx.fill();
  refresh(scene, key);
}

/** A tall jagged rock wall to frame a canyon — origin (0.5, 0) at the top; mirror with flipX for the opposite side. */
export function generateCliffWall(scene: Phaser.Scene, key: string, w: number, h: number, pal: LocationPalette): void {
  const ctx = createCtx(scene, key, w, h);
  let seed = 41;
  const next = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  ctx.fillStyle = rgbToCss(hexToRgb(pal.mountain));
  ctx.beginPath();
  ctx.moveTo(0, 0);
  let edge = w * 0.65;
  ctx.lineTo(edge, 0);
  for (let y = 0; y <= h; y += 26) {
    // Kept consistently substantial (never thinner than 40% of the wall's
    // own width) so it reads as a canyon wall squeezing the water, not a
    // thin strip along the edge.
    edge = Phaser.Math.Clamp(edge + (next() - 0.5) * w * 0.3, w * 0.4, w * 0.92);
    ctx.lineTo(edge, y);
  }
  ctx.lineTo(edge, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  // A few dithered highlight bands for rocky texture.
  for (let y = 10; y < h; y += 40) {
    ditherRect(ctx, 0, y, Math.max(4, edge * 0.4), 6, pal.mountain, pal.mountainHaze, 0.5, 3);
  }
  refresh(scene, key);
}

export function generateWaterfallStreak(scene: Phaser.Scene, key: string): void {
  const w = 12,
    h = 24;
  const ctx = createCtx(scene, key, w, h);
  for (let y = 0; y < h; y += 4) {
    ctx.fillStyle = "rgba(230,245,250,0.8)";
    ctx.fillRect(2, y, 3, 2);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillRect(6, y + 2, 2, 2);
  }
  refresh(scene, key);
}

export function generateSun(scene: Phaser.Scene, key: string): void {
  const s = 64;
  const ctx = createCtx(scene, key, s, s);
  const rings: [number, string][] = [
    [s / 2, "rgba(255,170,80,0.18)"],
    [s / 2.6, "rgba(255,190,100,0.35)"],
    [s / 3.6, "rgba(255,220,140,0.65)"],
    [s / 5, "#ffe9b8"],
  ];
  for (const [r, color] of rings) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, r, 0, Math.PI * 2);
    ctx.fill();
  }
  refresh(scene, key);
}

export function generateLighthouse(scene: Phaser.Scene, key: string): void {
  const w = 16,
    h = 34;
  const ctx = createCtx(scene, key, w, h);
  ctx.fillStyle = "rgba(30,20,35,0.75)";
  ctx.beginPath();
  ctx.moveTo(w / 2 - 5, h);
  ctx.lineTo(w / 2 - 3, 8);
  ctx.lineTo(w / 2 + 3, 8);
  ctx.lineTo(w / 2 + 5, h);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(w / 2 - 4, 4, 8, 5);
  ctx.beginPath();
  ctx.moveTo(w / 2 - 5, 4);
  ctx.lineTo(w / 2, 0);
  ctx.lineTo(w / 2 + 5, 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,217,61,0.8)";
  ctx.fillRect(w / 2 - 2, 5, 4, 2);
  refresh(scene, key);
}

export function generateBoatSilhouette(scene: Phaser.Scene, key: string): void {
  const w = 46,
    h = 26;
  const ctx = createCtx(scene, key, w, h);
  ctx.fillStyle = "rgba(20,20,30,0.6)";
  ctx.beginPath();
  ctx.moveTo(2, h - 6);
  ctx.quadraticCurveTo(w / 2, h + 2, w - 2, h - 6);
  ctx.lineTo(w - 6, h - 10);
  ctx.lineTo(6, h - 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(w / 2 - 1, 2, 2, h - 10);
  ctx.beginPath();
  ctx.moveTo(w / 2, 4);
  ctx.lineTo(w / 2 + 12, h - 11);
  ctx.lineTo(w / 2, h - 11);
  ctx.closePath();
  ctx.fill();
  refresh(scene, key);
}

export function generateRopeCoil(scene: Phaser.Scene, key: string): void {
  const s = 20;
  const ctx = createCtx(scene, key, s, s);
  ctx.strokeStyle = "#a8845a";
  ctx.lineWidth = 2;
  for (let r = 2; r < s / 2; r += 3.5) {
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, r, 0, Math.PI * 1.7);
    ctx.stroke();
  }
  refresh(scene, key);
}

export function generateCreatureSilhouette(scene: Phaser.Scene, key: string): void {
  const w = 140,
    h = 54;
  const ctx = createCtx(scene, key, w, h);
  ctx.fillStyle = "rgba(30,45,70,0.55)";
  ctx.beginPath();
  ctx.ellipse(w * 0.45, h / 2, w * 0.42, h * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(w * 0.85, h / 2);
  ctx.lineTo(w, h / 2 - 16);
  ctx.lineTo(w * 0.92, h / 2);
  ctx.lineTo(w, h / 2 + 16);
  ctx.closePath();
  ctx.fill();
  refresh(scene, key);
}

/** Anglerfish with a small glowing lure on a curved stalk. */
export function generateAnglerfish(scene: Phaser.Scene, key: string): void {
  const w = 30,
    h = 20;
  const ctx = createCtx(scene, key, w, h);
  ctx.fillStyle = "#241c2e";
  ctx.beginPath();
  ctx.ellipse(w * 0.45, h * 0.6, w * 0.32, h * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(w * 0.15, h * 0.6);
  ctx.lineTo(0, h * 0.4);
  ctx.lineTo(0, h * 0.8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#241c2e";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(w * 0.6, h * 0.35);
  ctx.quadraticCurveTo(w * 0.85, 0, w * 0.95, h * 0.15);
  ctx.stroke();
  ctx.fillStyle = "#ffe066";
  ctx.beginPath();
  ctx.arc(w * 0.95, h * 0.15, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,224,102,0.35)";
  ctx.beginPath();
  ctx.arc(w * 0.95, h * 0.15, 5.5, 0, Math.PI * 2);
  ctx.fill();
  refresh(scene, key);
}

export function generateCoral(scene: Phaser.Scene, key: string, variant: number): void {
  const w = 20,
    h = 26;
  const ctx = createCtx(scene, key, w, h);
  const color = variant % 2 === 0 ? 0x8a2f3f : 0x5a2f6b;
  ctx.fillStyle = rgbToCss(hexToRgb(color));
  const stalks = 3;
  for (let i = 0; i < stalks; i++) {
    const x = 3 + i * ((w - 6) / (stalks - 1));
    const stalkH = h * (0.5 + (i % 2) * 0.3);
    ctx.fillRect(x - 1.5, h - stalkH, 3, stalkH);
    ctx.fillRect(x - 3.5, h - stalkH, 3, stalkH * 0.4);
    ctx.fillRect(x + 1.5, h - stalkH * 0.7, 3, stalkH * 0.5);
  }
  refresh(scene, key);
}

export function generateStar(scene: Phaser.Scene, key: string): void {
  const s = 3;
  const ctx = createCtx(scene, key, s, s);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, s, s);
  refresh(scene, key);
}

export function generateCrystalFormation(scene: Phaser.Scene, key: string): void {
  const w = 22,
    h = 30;
  const ctx = createCtx(scene, key, w, h);
  const shapes: [number, number, number][] = [
    [w / 2, h * 0.55, 1],
    [w * 0.28, h * 0.75, 0.6],
    [w * 0.75, h * 0.7, 0.7],
  ];
  for (const [cx, cyBase, scale] of shapes) {
    const cy = cyBase;
    const rw = 5 * scale;
    const rh = 12 * scale;
    // A deep saturated blue body (not the same pale cyan as the water it
    // sits in front of — that made it invisible) with a dark outline and a
    // bright highlight facet, so it reads against any water tone.
    ctx.fillStyle = "rgba(45,110,190,0.92)";
    ctx.beginPath();
    ctx.moveTo(cx, cy - rh);
    ctx.lineTo(cx + rw, cy);
    ctx.lineTo(cx, cy + rh * 0.3);
    ctx.lineTo(cx - rw, cy);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(10,25,50,0.85)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.moveTo(cx, cy - rh);
    ctx.lineTo(cx + rw * 0.35, cy - rh * 0.2);
    ctx.lineTo(cx, cy);
    ctx.closePath();
    ctx.fill();
  }
  refresh(scene, key);
}

/** 2-frame fish spritesheet (tail sway) drawn side by side, registered as frames 0/1. */
export function generateFishTexture(scene: Phaser.Scene, key: string, length: number, colors: { body: number; belly: number; fin: number }): void {
  const h = Math.round(length * 0.55);
  const frameW = length;
  const w = frameW * 2;
  const ctx = createCtx(scene, key, w, h);

  const drawFrame = (ox: number, tailAngle: number) => {
    const cx = ox + frameW * 0.42;
    const cy = h / 2;
    const bodyW = frameW * 0.62;
    const bodyH = h * 0.62;

    ctx.save();
    ctx.translate(ox + frameW * 0.12, cy);
    ctx.rotate(tailAngle);
    ctx.fillStyle = rgbToCss(hexToRgb(colors.fin));
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-frameW * 0.24, -h * 0.32);
    ctx.lineTo(-frameW * 0.24, h * 0.32);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = rgbToCss(hexToRgb(colors.body));
    ctx.beginPath();
    ctx.ellipse(cx, cy, bodyW / 2, bodyH / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = rgbToCss(hexToRgb(colors.belly), 0.85);
    ctx.beginPath();
    ctx.ellipse(cx, cy + bodyH * 0.18, bodyW / 2.4, bodyH / 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = rgbToCss(hexToRgb(colors.fin));
    ctx.beginPath();
    ctx.moveTo(cx - bodyW * 0.05, cy - bodyH / 2);
    ctx.lineTo(cx + bodyW * 0.12, cy - bodyH * 0.85);
    ctx.lineTo(cx + bodyW * 0.28, cy - bodyH / 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#141414";
    ctx.beginPath();
    ctx.arc(cx + bodyW * 0.28, cy - bodyH * 0.06, Math.max(1, bodyW * 0.05), 0, Math.PI * 2);
    ctx.fill();
  };

  drawFrame(0, 0.35);
  drawFrame(frameW, -0.35);

  // The shapes above are smooth canvas curves — down- then up-sampling
  // through a small intermediate canvas collapses that into visible
  // square pixels (same colors, chunkier silhouette) without having to
  // redraw every fish as a hand-placed pixel grid. Bigger fish get a
  // larger block so the "pixel size" reads as roughly constant across
  // species rather than tiny fish going nearly abstract.
  const pixelFactor = Phaser.Math.Clamp(Math.round(length / 14), 2, 4);
  pixelateCanvas(ctx, w, h, pixelFactor);

  refresh(scene, key);
  const tex = scene.textures.get(key);
  tex.add(0, 0, 0, 0, frameW, h);
  tex.add(1, 0, frameW, 0, frameW, h);
}

/** Downsamples then nearest-neighbor upsamples a canvas in place, turning smooth art into chunky pixels. */
function pixelateCanvas(ctx: CanvasRenderingContext2D, w: number, h: number, factor: number): void {
  const smallW = Math.max(1, Math.round(w / factor));
  const smallH = Math.max(1, Math.round(h / factor));
  const small = document.createElement("canvas");
  small.width = smallW;
  small.height = smallH;
  const sctx = small.getContext("2d")!;
  sctx.drawImage(ctx.canvas, 0, 0, w, h, 0, 0, smallW, smallH);

  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(small, 0, 0, smallW, smallH, 0, 0, w, h);
}

// -------------------------------------------------------------- CHARACTER

const SKIN = 0xe8b48a;
const SHIRT = 0xd94f4f;
const PANTS = 0x3a4a63;
const BOOTS = 0x2a1810;
const HAT = 0x6b4a2e;

export function generateCharacterLegs(scene: Phaser.Scene, key: string): void {
  const w = 22,
    h = 16;
  const ctx = createCtx(scene, key, w, h);
  ctx.fillStyle = rgbToCss(hexToRgb(PANTS));
  ctx.fillRect(4, 0, 6, h - 5);
  ctx.fillRect(w - 10, 0, 6, h - 5);
  ctx.fillStyle = rgbToCss(hexToRgb(BOOTS));
  ctx.fillRect(3, h - 6, 8, 6);
  ctx.fillRect(w - 11, h - 6, 8, 6);
  refresh(scene, key);
}

export function generateCharacterTorso(scene: Phaser.Scene, key: string): void {
  const w = 26,
    h = 22;
  const ctx = createCtx(scene, key, w, h);
  ctx.fillStyle = rgbToCss(hexToRgb(SHIRT));
  ctx.beginPath();
  ctx.moveTo(4, h);
  ctx.lineTo(2, 6);
  ctx.quadraticCurveTo(w / 2, -2, w - 2, 6);
  ctx.lineTo(w - 4, h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fillRect(4, h - 6, w - 8, 4);
  refresh(scene, key);
}

/** Head with a swappable face expression: neutral / smile / shocked / stars. */
export function generateCharacterHead(scene: Phaser.Scene, key: string, expression: "neutral" | "smile" | "shocked" | "stars"): void {
  const w = 20,
    h = 20;
  const ctx = createCtx(scene, key, w, h);

  // hat brim + crown
  ctx.fillStyle = rgbToCss(hexToRgb(HAT));
  ctx.fillRect(1, 5, w - 2, 3);
  ctx.beginPath();
  ctx.ellipse(w / 2, 5, w / 2 - 3, 5, 0, Math.PI, 0);
  ctx.fill();

  // face
  ctx.fillStyle = rgbToCss(hexToRgb(SKIN));
  ctx.beginPath();
  ctx.ellipse(w / 2, h / 2 + 3, w / 2 - 3, h / 2 - 3, 0, 0, Math.PI * 2);
  ctx.fill();

  const eyeY = h / 2 + 1;
  const lx = w / 2 - 3.5;
  const rx = w / 2 + 3.5;

  ctx.fillStyle = "#1c1c1c";
  if (expression === "shocked") {
    ctx.beginPath();
    ctx.arc(lx, eyeY, 2, 0, Math.PI * 2);
    ctx.arc(rx, eyeY, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (expression === "stars") {
    ctx.fillStyle = "#ffd93d";
    for (const ex of [lx, rx]) {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        const r = i % 2 === 0 ? 2.2 : 1;
        const px = ex + Math.cos(a) * r;
        const py = eyeY + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }
  } else {
    ctx.fillRect(lx - 1, eyeY - 1, 2, 2);
    ctx.fillRect(rx - 1, eyeY - 1, 2, 2);
  }

  // mouth
  ctx.strokeStyle = "#1c1c1c";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  if (expression === "smile") {
    ctx.arc(w / 2, eyeY + 2.5, 3, 0.15 * Math.PI, 0.85 * Math.PI);
  } else if (expression === "shocked") {
    ctx.ellipse(w / 2, eyeY + 4, 1.6, 2.2, 0, 0, Math.PI * 2);
  } else if (expression === "stars") {
    ctx.arc(w / 2, eyeY + 3, 3.4, 0.1 * Math.PI, 0.9 * Math.PI);
  } else {
    ctx.moveTo(w / 2 - 2.5, eyeY + 4);
    ctx.lineTo(w / 2 + 2.5, eyeY + 4);
  }
  ctx.stroke();

  refresh(scene, key);
}

/**
 * Shared rod-shaft renderer so every tier reads as an actually different
 * rod — shaft thickness/color, a reel + handle nub at the base, guide
 * rings spaced along the shaft, and a tip sparkle for top-tier rods —
 * rather than only swapping one stroke color.
 */
function drawRodShaft(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, rod: RodDef): void {
  ctx.strokeStyle = rgbToCss(hexToRgb(rod.color));
  ctx.lineWidth = rod.thickness;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  if (rod.guides > 0) {
    ctx.strokeStyle = rgbToCss(hexToRgb(rod.accent));
    ctx.lineWidth = 1;
    for (let i = 1; i <= rod.guides; i++) {
      const t = i / (rod.guides + 1);
      const gx = Phaser.Math.Linear(x1, x2, t);
      const gy = Phaser.Math.Linear(y1, y2, t);
      ctx.beginPath();
      ctx.arc(gx, gy, Math.max(1.2, rod.thickness * 0.7), 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // reel + crank nub at the handle end
  ctx.fillStyle = rgbToCss(hexToRgb(rod.accent));
  ctx.beginPath();
  ctx.arc(x1, y1, rod.thickness * 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x1 - 1, y1 + rod.thickness, 2, rod.thickness);

  if (rod.glow) {
    ctx.fillStyle = rgbToCss(hexToRgb(rod.accent), 0.95);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.3;
      ctx.beginPath();
      ctx.arc(x2 + Math.cos(a) * 3, y2 + Math.sin(a) * 3, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Arm + rod as one rigid piece, pivoted at the shoulder (left edge, vertical middle). Look reflects the equipped rod. */
export function generateCharacterArmRod(scene: Phaser.Scene, key: string, rod: RodDef): void {
  const w = 60,
    h = 14;
  const ctx = createCtx(scene, key, w, h);
  ctx.fillStyle = rgbToCss(hexToRgb(SHIRT));
  ctx.fillRect(0, h / 2 - 3, 16, 6);
  ctx.fillStyle = rgbToCss(hexToRgb(SKIN));
  ctx.fillRect(14, h / 2 - 2.5, 8, 5);
  drawRodShaft(ctx, 19, h / 2 + 1, w - 2, h / 2 - 5, rod);
  ctx.fillStyle = "#2a1810";
  ctx.fillRect(16, h / 2 - 1, 4, 3);
  refresh(scene, key);
}

// -------------------------------------------------------------------- ICONS

export function generateRodIcon(scene: Phaser.Scene, key: string, rod: RodDef): void {
  const w = 48,
    h = 20;
  const ctx = createCtx(scene, key, w, h);
  drawRodShaft(ctx, 5, h - 3, w - 3, 3, rod);
  ctx.fillStyle = "#2a1810";
  ctx.fillRect(0, h - 7, 7, 6);
  refresh(scene, key);
}

/** Small wriggly bait-on-a-hook icon for shop cards, tinted per bait tier. */
export function generateBaitIcon(scene: Phaser.Scene, key: string, color: number): void {
  const w = 32,
    h = 24;
  const ctx = createCtx(scene, key, w, h);
  ctx.strokeStyle = "#8a8f9a";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(w / 2, 6, 4, Math.PI * 0.15, Math.PI * 1.6);
  ctx.stroke();
  ctx.strokeStyle = rgbToCss(hexToRgb(color));
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(w / 2, 9);
  ctx.quadraticCurveTo(w / 2 - 7, 14, w / 2 - 4, 21);
  ctx.quadraticCurveTo(w / 2, 24, w / 2 + 5, 19);
  ctx.stroke();
  refresh(scene, key);
}

export function generateCoinIcon(scene: Phaser.Scene, key: string): void {
  const s = 16;
  const ctx = createCtx(scene, key, s, s);
  ctx.fillStyle = "#c98a1a";
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s / 2 - 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffd93d";
  ctx.beginPath();
  ctx.arc(s / 2 - 1, s / 2 - 1, s / 2 - 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff2b0";
  ctx.beginPath();
  ctx.arc(s / 2 - 3, s / 2 - 3, 1.6, 0, Math.PI * 2);
  ctx.fill();
  refresh(scene, key);
}

export function generateLockIcon(scene: Phaser.Scene, key: string): void {
  const w = 16,
    h = 18;
  const ctx = createCtx(scene, key, w, h);
  ctx.strokeStyle = "#e6c94a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(w / 2, 6, 4.5, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = "#e6c94a";
  ctx.fillRect(1, 7, w - 2, h - 8);
  ctx.fillStyle = "#4a3a10";
  ctx.fillRect(w / 2 - 1.5, 10, 3, 5);
  refresh(scene, key);
}

export const TEX = {
  sky: (loc: string) => `tex-sky-${loc}`,
  mountains: (loc: string) => `tex-mountains-${loc}`,
  treeline: (loc: string) => `tex-treeline-${loc}`,
  grassEdge: (loc: string) => `tex-grassedge-${loc}`,
  tree: (loc: string, variant: number) => `tex-tree-${loc}-${variant}`,
  water: (loc: string) => `tex-water-${loc}`,
  ambient: (style: string) => `tex-ambient-${style}`,
  lilyPad: (i: number, flower: boolean) => `tex-lilypad-${i}-${flower ? "f" : "n"}`,
  dockPlank: (loc: string) => `tex-dock-plank-${loc}`,
  dockPost: (loc: string) => `tex-dock-post-${loc}`,
  bobber: "tex-bobber",
  ripple: "tex-ripple",
  particle: (name: string) => `tex-particle-${name}`,
  fish: (id: string) => `tex-fish-${id}`,
  charLegs: "tex-char-legs",
  charTorso: "tex-char-torso",
  charHead: (expr: string) => `tex-char-head-${expr}`,
  charArmRod: (rodId: string) => `tex-char-armrod-${rodId}`,
  rodIcon: (id: string) => `tex-rodicon-${id}`,
  baitIcon: (id: string) => `tex-baiticon-${id}`,
  coin: "tex-coin",
  lock: "tex-lock",
  cloud: "tex-cloud",
  frog: (frame: "open" | "blink") => `tex-frog-${frame}`,
  dragonfly: "tex-dragonfly",
  cliffWall: (loc: string) => `tex-cliffwall-${loc}`,
  waterfall: "tex-waterfall",
  sun: "tex-sun",
  lighthouse: "tex-lighthouse",
  boat: "tex-boat",
  ropeCoil: "tex-ropecoil",
  creature: "tex-creature",
  anglerfish: "tex-anglerfish",
  coral: (variant: number) => `tex-coral-${variant}`,
  star: "tex-star",
  crystalFormation: "tex-crystal-formation",
};

const BAIT_ICON_COLORS: Record<string, number> = {
  "plain-worm": 0xc9788a,
  "fat-grub": 0xd6c34a,
  "live-cricket": 0x6bcb77,
  "shiny-lure": 0x8ecae6,
  "golden-lure": 0xffd93d,
};

export function generateAllTextures(scene: Phaser.Scene, w: number, h: number): void {
  for (const loc of LOCATIONS) {
    generateSky(scene, TEX.sky(loc.id), w, Math.round(h * 0.34), loc.palette);
    generateMountains(scene, TEX.mountains(loc.id), w, 60, loc.palette);
    generateTreeline(scene, TEX.treeline(loc.id), w, 40, loc.palette);
    generateGrassEdge(scene, TEX.grassEdge(loc.id), w, 8, loc.palette);
    for (let i = 0; i < 3; i++) generateTree(scene, TEX.tree(loc.id, i), loc.palette, i * 37 + 5);
    generateWaterTile(scene, TEX.water(loc.id), 32, loc.palette);
    generateDockPlank(scene, TEX.dockPlank(loc.id), 40, 16, loc.palette);
    generateDockPost(scene, TEX.dockPost(loc.id), loc.palette);
  }
  const allParticleStyles = new Set(LOCATIONS.flatMap((l) => l.particles));
  for (const style of allParticleStyles) generateLocationParticle(scene, TEX.ambient(style), style);

  for (let i = 0; i < 3; i++) {
    generateLilyPad(scene, TEX.lilyPad(i, false), i, false);
    generateLilyPad(scene, TEX.lilyPad(i, true), i, true);
  }
  generateBobber(scene, TEX.bobber);
  generateRipple(scene, TEX.ripple);
  generateParticle(scene, TEX.particle("gold"), 0xffd93d, "star");
  generateParticle(scene, TEX.particle("teal"), 0x6bcb77, "diamond");
  generateParticle(scene, TEX.particle("white"), 0xffffff, "star");
  generateParticle(scene, TEX.particle("pink"), 0xff8fa3, "diamond");

  for (const fish of FISH_SPECIES) {
    generateFishTexture(scene, TEX.fish(fish.id), fish.bodyLength, fish.colors);
  }

  generateCharacterLegs(scene, TEX.charLegs);
  generateCharacterTorso(scene, TEX.charTorso);
  generateCharacterHead(scene, TEX.charHead("neutral"), "neutral");
  generateCharacterHead(scene, TEX.charHead("smile"), "smile");
  generateCharacterHead(scene, TEX.charHead("shocked"), "shocked");
  generateCharacterHead(scene, TEX.charHead("stars"), "stars");
  for (const rod of RODS) {
    generateCharacterArmRod(scene, TEX.charArmRod(rod.id), rod);
    generateRodIcon(scene, TEX.rodIcon(rod.id), rod);
  }
  for (const bait of BAITS) generateBaitIcon(scene, TEX.baitIcon(bait.id), BAIT_ICON_COLORS[bait.id] ?? 0xffffff);

  generateCoinIcon(scene, TEX.coin);
  generateLockIcon(scene, TEX.lock);

  // Per-scene specials.
  generateCloud(scene, TEX.cloud);
  generateFrog(scene, TEX.frog("open"), false);
  generateFrog(scene, TEX.frog("blink"), true);
  generateDragonfly(scene, TEX.dragonfly);

  const gorge = LOCATIONS.find((l) => l.special === "gorge");
  if (gorge) generateCliffWall(scene, TEX.cliffWall(gorge.id), 120, h, gorge.palette);
  generateWaterfallStreak(scene, TEX.waterfall);

  generateSun(scene, TEX.sun);
  generateLighthouse(scene, TEX.lighthouse);
  generateBoatSilhouette(scene, TEX.boat);
  generateRopeCoil(scene, TEX.ropeCoil);

  generateCreatureSilhouette(scene, TEX.creature);
  generateAnglerfish(scene, TEX.anglerfish);
  generateCoral(scene, TEX.coral(0), 0);
  generateCoral(scene, TEX.coral(1), 1);

  generateStar(scene, TEX.star);
  generateCrystalFormation(scene, TEX.crystalFormation);
}
