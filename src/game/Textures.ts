import Phaser from "phaser";
import { FISH_SPECIES } from "./FishData";
import { LOCATIONS, type LocationPalette, type ParticleStyle } from "./LocationData";
import { RODS } from "./RodData";

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
  const bands = 24;
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
    ditherRect(ctx, 0, i * bandH, w, bandH, a, b, localT, 3);
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

/**
 * A branch of foliage overhanging from a top corner of the screen — framing
 * the pond like you're looking out from under the treeline. Origin (0, 0),
 * meant for the top-left corner (mirror with flipX for the top-right).
 * Foliage is dithered rather than flat-filled to match the rest of the
 * scene's pixel-art texture instead of reading as smooth vector blobs.
 */
export function generateOverhangBranch(scene: Phaser.Scene, key: string, pal: LocationPalette): void {
  const w = 116,
    h = 150;
  const ctx = createCtx(scene, key, w, h);

  ctx.strokeStyle = rgbToCss(hexToRgb(pal.dockWoodDark));
  ctx.lineCap = "round";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.quadraticCurveTo(w * 0.34, 6, w * 0.6, h * 0.4);
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(w * 0.28, 4);
  ctx.quadraticCurveTo(w * 0.48, h * 0.16, w * 0.8, h * 0.56);
  ctx.stroke();

  const clumps: [number, number, number][] = [
    [0.04, 0.02, 0.34],
    [0.24, 0.1, 0.3],
    [0.42, 0.22, 0.28],
    [0.16, 0.26, 0.26],
    [0.56, 0.36, 0.24],
    [0.06, 0.4, 0.2],
    [0.68, 0.5, 0.18],
  ];

  let seed = 31;
  const next = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  for (const [nx, ny, nr] of clumps) {
    const cx = nx * w;
    const cy = ny * h;
    const r = nr * w;
    const mix = 0.3 + next() * 0.4;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ditherRect(ctx, cx - r, cy - r, r * 2, r * 2, pal.treeline, pal.mountainHaze, mix, 3);
    ctx.restore();

    ctx.strokeStyle = rgbToCss(hexToRgb(pal.treeline), 0.9);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 0.5, 0, Math.PI * 2);
    ctx.stroke();
  }

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

export function generateWaterTile(scene: Phaser.Scene, key: string, size: number, pal: LocationPalette): void {
  const ctx = createCtx(scene, key, size, size);
  // An ordered (Bayer) dither reads as an obvious repeating grid once the
  // cells are big enough to see — closer to a screen-door effect than
  // water. Comparing a soft wave against per-cell hashed noise instead
  // gives an irregular, hand-scattered speckle that still tiles cleanly
  // (the hash is a pure function of cell coordinates). The mix range is
  // also kept narrow so the two tones blend rather than one popping out.
  const block = 4;
  for (let y = 0; y < size; y += block) {
    for (let x = 0; x < size; x += block) {
      const cellX = x / block;
      const cellY = y / block;
      const wave = Math.sin((x / size) * Math.PI * 2.2 + (y / size) * Math.PI * 1.5) * 0.1;
      const mix = Phaser.Math.Clamp(0.32 + wave, 0.15, 0.5);
      const n = cellHash(cellX, cellY, 7);
      ctx.fillStyle = rgbToCss(hexToRgb(n < mix ? pal.waterMid : pal.waterDeep));
      ctx.fillRect(x, y, block, block);
    }
  }
  refresh(scene, key);
}

export function generateShimmerTile(scene: Phaser.Scene, key: string, size: number, pal: LocationPalette): void {
  const ctx = createCtx(scene, key, size, size);
  ctx.clearRect(0, 0, size, size);
  let seed = 99;
  const next = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  ctx.fillStyle = rgbToCss(hexToRgb(pal.shimmer), 0.55);
  for (let i = 0; i < 10; i++) {
    const x = Math.floor(next() * size);
    const y = Math.floor(next() * size);
    const len = 2 + Math.floor(next() * 4);
    ctx.fillRect(x, y, len, 2);
  }
  refresh(scene, key);
}

export function generateLilyPad(scene: Phaser.Scene, key: string, variant: number): void {
  const w = 26,
    h = 18;
  const ctx = createCtx(scene, key, w, h);
  const green = [0x2f7a4a, 0x3a8f52, 0x276b41][variant % 3];
  ctx.fillStyle = rgbToCss(hexToRgb(green));
  ctx.beginPath();
  ctx.ellipse(w / 2, h / 2, w / 2 - 1, h / 2 - 1, 0, 0.35, Math.PI * 2 - 0.35);
  ctx.lineTo(w / 2, h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgbToCss(hexToRgb(0x5fc27a), 0.7);
  ctx.beginPath();
  ctx.ellipse(w / 2 - 4, h / 2 - 3, 4, 2.4, -0.3, 0, Math.PI * 2);
  ctx.fill();
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
  const s = 10;
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
    case "mist":
      ctx.fillStyle = "rgba(220,230,225,0.28)";
      ctx.beginPath();
      ctx.ellipse(s / 2, s / 2, s / 2, s / 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "gulls":
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, s / 2);
      ctx.quadraticCurveTo(s / 2, 0, s, s / 2);
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

  refresh(scene, key);
  const tex = scene.textures.get(key);
  tex.add(0, 0, 0, 0, frameW, h);
  tex.add(1, 0, frameW, 0, frameW, h);
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

/** Arm + rod as one rigid piece, pivoted at the shoulder (left edge, vertical middle). */
export function generateCharacterArmRod(scene: Phaser.Scene, key: string): void {
  const w = 60,
    h = 14;
  const ctx = createCtx(scene, key, w, h);
  // arm (sleeve)
  ctx.fillStyle = rgbToCss(hexToRgb(SHIRT));
  ctx.fillRect(0, h / 2 - 3, 16, 6);
  ctx.fillStyle = rgbToCss(hexToRgb(SKIN));
  ctx.fillRect(14, h / 2 - 2.5, 8, 5);
  // rod
  ctx.strokeStyle = "#6b4a2e";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(18, h / 2);
  ctx.lineTo(w - 2, h / 2 - 5);
  ctx.stroke();
  ctx.fillStyle = "#4a3420";
  ctx.fillRect(16, h / 2 - 2, 5, 4);
  refresh(scene, key);
}

// -------------------------------------------------------------------- ICONS

export function generateRodIcon(scene: Phaser.Scene, key: string, accent: number): void {
  const w = 48,
    h = 20;
  const ctx = createCtx(scene, key, w, h);
  ctx.strokeStyle = "#6b4a2e";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(2, h - 2);
  ctx.lineTo(w - 4, 3);
  ctx.stroke();
  ctx.fillStyle = rgbToCss(hexToRgb(accent));
  ctx.beginPath();
  ctx.arc(w - 4, 3, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2a1810";
  ctx.fillRect(0, h - 6, 8, 6);
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
  overhangBranch: (loc: string) => `tex-overhang-${loc}`,
  water: (loc: string) => `tex-water-${loc}`,
  shimmer: (loc: string) => `tex-shimmer-${loc}`,
  ambient: (loc: string) => `tex-ambient-${loc}`,
  lilyPad: (i: number) => `tex-lilypad-${i}`,
  dockPlank: (loc: string) => `tex-dock-plank-${loc}`,
  bobber: "tex-bobber",
  ripple: "tex-ripple",
  particle: (name: string) => `tex-particle-${name}`,
  fish: (id: string) => `tex-fish-${id}`,
  charLegs: "tex-char-legs",
  charTorso: "tex-char-torso",
  charHead: (expr: string) => `tex-char-head-${expr}`,
  charArmRod: "tex-char-armrod",
  rodIcon: (id: string) => `tex-rodicon-${id}`,
  coin: "tex-coin",
  lock: "tex-lock",
};

const ROD_ICON_COLORS: Record<string, number> = {
  twig: 0x8a6a4a,
  iron: 0xaeb4bb,
  carbon: 0x3a3f4a,
  deep: 0x2f6e8a,
  mythic: 0xb98cf2,
};

export function generateAllTextures(scene: Phaser.Scene, w: number, h: number): void {
  for (const loc of LOCATIONS) {
    generateSky(scene, TEX.sky(loc.id), w, Math.round(h * 0.34), loc.palette);
    generateMountains(scene, TEX.mountains(loc.id), w, 60, loc.palette);
    generateTreeline(scene, TEX.treeline(loc.id), w, 40, loc.palette);
    generateOverhangBranch(scene, TEX.overhangBranch(loc.id), loc.palette);
    generateWaterTile(scene, TEX.water(loc.id), 32, loc.palette);
    generateShimmerTile(scene, TEX.shimmer(loc.id), 48, loc.palette);
    generateDockPlank(scene, TEX.dockPlank(loc.id), 40, 16, loc.palette);
    generateLocationParticle(scene, TEX.ambient(loc.id), loc.particle);
  }

  for (let i = 0; i < 3; i++) generateLilyPad(scene, TEX.lilyPad(i), i);
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
  generateCharacterArmRod(scene, TEX.charArmRod);

  for (const rod of RODS) generateRodIcon(scene, TEX.rodIcon(rod.id), ROD_ICON_COLORS[rod.id] ?? 0xffffff);
  generateCoinIcon(scene, TEX.coin);
  generateLockIcon(scene, TEX.lock);
}
