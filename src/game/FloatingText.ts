import type { Camera } from "./Camera";

interface Particle {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

const LIFETIME_MS = 1100;
const RISE_PX = 26;

/** Small floating "+15", "Caught!" style text popups drawn in world space. */
export class FloatingText {
  private particles: Particle[] = [];

  spawn(x: number, y: number, text: string, color = "#ffffff"): void {
    this.particles.push({ x, y, text, color, life: LIFETIME_MS, maxLife: LIFETIME_MS });
  }

  update(dtMs: number): void {
    for (const p of this.particles) p.life -= dtMs;
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D, camera: Camera): void {
    ctx.save();
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    for (const p of this.particles) {
      const t = 1 - p.life / p.maxLife;
      const screen = camera.worldToScreen(p.x, p.y - t * RISE_PX);
      ctx.globalAlpha = Math.min(1, p.life / (p.maxLife * 0.4));
      ctx.fillStyle = "#00000080";
      ctx.fillText(p.text, screen.x + 1, screen.y + 1);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, screen.x, screen.y);
    }
    ctx.restore();
  }
}
