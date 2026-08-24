import Phaser from "phaser";
import { FISH_SPECIES } from "./FishData";

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

export const PAL = {
  skyTop: 0x151831,
  skyMid: 0x4a3466,
  skyLow: 0xd97a3d,
  skyHorizon: 0xffcf7a,
  mountain: 0x2c2140,
  mountainHaze: 0x4a3f66,
  treeline: 0x16261f,
  waterDeep: 0x0c2b3a,
  waterMid: 0x184a5c,
  waterShallow: 0x2f7a82,
  shimmer: 0xbfe9e8,
  dockWood: 0x5b3a29,
  dockWoodDark: 0x3e2618,
  dockEdge: 0x2a1810,
};

export function generateSky(scene: Phaser.Scene, key: string, w: number, h: number): void {
  const ctx = createCtx(scene, key, w, h);
  const bands = 24;
  const bandH = Math.ceil(h / bands);
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    // top -> mid -> low -> horizon glow, warm amber near the bottom
    let a: number, b: number, localT: number;
    if (t < 0.4) {
      a = PAL.skyTop;
      b = PAL.skyMid;
      localT = t / 0.4;
    } else if (t < 0.78) {
      a = PAL.skyMid;
      b = PAL.skyLow;
      localT = (t - 0.4) / 0.38;
    } else {
      a = PAL.skyLow;
      b = PAL.skyHorizon;
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

export function generateMountains(scene: Phaser.Scene, key: string, w: number, h: number): void {
  const ctx = createCtx(scene, key, w, h);
  jaggedSilhouette(ctx, w, h, h - 4, h * 0.55, 7, PAL.mountainHaze, 0.55, 7);
  jaggedSilhouette(ctx, w, h, h + 6, h * 0.4, 9, PAL.mountain, 0.85, 21);
  refresh(scene, key);
}

export function generateTreeline(scene: Phaser.Scene, key: string, w: number, h: number): void {
  const ctx = createCtx(scene, key, w, h);
  // pine-cluster silhouette: repeated triangular spikes of varying height
  ctx.fillStyle = rgbToCss(hexToRgb(PAL.treeline), 1);
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

export function generateWaterTile(scene: Phaser.Scene, key: string, size = 32): void {
  const ctx = createCtx(scene, key, size, size);
  // Diagonal dithered banding to read as gentle waves when scrolled via tilePosition.
  for (let y = 0; y < size; y++) {
    const wave = Math.sin((y / size) * Math.PI * 2) * 0.15;
    const mix = Phaser.Math.Clamp(0.35 + wave, 0, 1);
    ditherRect(ctx, 0, y, size, 1, PAL.waterDeep, PAL.waterMid, mix, 1);
  }
  refresh(scene, key);
}

export function generateShimmerTile(scene: Phaser.Scene, key: string, size = 32): void {
  const ctx = createCtx(scene, key, size, size);
  ctx.clearRect(0, 0, size, size);
  let seed = 99;
  const next = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  ctx.fillStyle = rgbToCss(hexToRgb(PAL.shimmer), 0.55);
  for (let i = 0; i < 10; i++) {
    const x = Math.floor(next() * size);
    const y = Math.floor(next() * size);
    const len = 2 + Math.floor(next() * 4);
    ctx.fillRect(x, y, len, 1);
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

export function generateDockPlank(scene: Phaser.Scene, key: string, w = 40, h = 16): void {
  const ctx = createCtx(scene, key, w, h);
  ditherRect(ctx, 0, 0, w, h, PAL.dockWood, PAL.dockWoodDark, 0.25, 2);
  ctx.fillStyle = rgbToCss(hexToRgb(PAL.dockEdge));
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

    // tail fin
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

    // body
    ctx.fillStyle = rgbToCss(hexToRgb(colors.body));
    ctx.beginPath();
    ctx.ellipse(cx, cy, bodyW / 2, bodyH / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // belly highlight
    ctx.fillStyle = rgbToCss(hexToRgb(colors.belly), 0.85);
    ctx.beginPath();
    ctx.ellipse(cx, cy + bodyH * 0.18, bodyW / 2.4, bodyH / 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // dorsal fin
    ctx.fillStyle = rgbToCss(hexToRgb(colors.fin));
    ctx.beginPath();
    ctx.moveTo(cx - bodyW * 0.05, cy - bodyH / 2);
    ctx.lineTo(cx + bodyW * 0.12, cy - bodyH * 0.85);
    ctx.lineTo(cx + bodyW * 0.28, cy - bodyH / 2);
    ctx.closePath();
    ctx.fill();

    // eye
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

export const TEX = {
  sky: "tex-sky",
  mountains: "tex-mountains",
  treeline: "tex-treeline",
  water: "tex-water",
  shimmer: "tex-shimmer",
  lilyPad: (i: number) => `tex-lilypad-${i}`,
  dockPlank: "tex-dock-plank",
  bobber: "tex-bobber",
  ripple: "tex-ripple",
  particle: (name: string) => `tex-particle-${name}`,
  fish: (id: string) => `tex-fish-${id}`,
};

export function generateAllTextures(scene: Phaser.Scene, w: number, h: number): void {
  generateSky(scene, TEX.sky, w, Math.round(h * 0.34));
  generateMountains(scene, TEX.mountains, w, 60);
  generateTreeline(scene, TEX.treeline, w, 40);
  generateWaterTile(scene, TEX.water, 32);
  generateShimmerTile(scene, TEX.shimmer, 48);
  for (let i = 0; i < 3; i++) generateLilyPad(scene, TEX.lilyPad(i), i);
  generateDockPlank(scene, TEX.dockPlank, 40, 16);
  generateBobber(scene, TEX.bobber);
  generateRipple(scene, TEX.ripple);
  generateParticle(scene, TEX.particle("gold"), 0xffd93d, "star");
  generateParticle(scene, TEX.particle("teal"), 0x6bcb77, "diamond");
  generateParticle(scene, TEX.particle("white"), 0xffffff, "star");
  generateParticle(scene, TEX.particle("pink"), 0xff8fa3, "diamond");
  for (const fish of FISH_SPECIES) {
    generateFishTexture(scene, TEX.fish(fish.id), fish.bodyLength, fish.colors);
  }
}
