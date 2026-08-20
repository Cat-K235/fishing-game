import { World } from "./World";

/** Simple camera that follows a target and clamps to world bounds. */
export class Camera {
  x = 0;
  y = 0;

  constructor(readonly viewWidth: number, readonly viewHeight: number) {}

  follow(targetX: number, targetY: number): void {
    const rawX = targetX - this.viewWidth / 2;
    const rawY = targetY - this.viewHeight / 2;
    this.x = clamp(rawX, 0, Math.max(0, World.WIDTH - this.viewWidth));
    this.y = clamp(rawY, 0, Math.max(0, World.HEIGHT - this.viewHeight));
  }

  /** Rounded to whole pixels so pixel-art sprites never sub-pixel-shimmer. */
  worldToScreen(x: number, y: number): { x: number; y: number } {
    return { x: Math.round(x - this.x), y: Math.round(y - this.y) };
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}
