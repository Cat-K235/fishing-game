import { World } from "./World";
import type { InputVector } from "./InputManager";

export type Direction = "left" | "right";
export type PlayerAnim = "idle" | "walk" | "fish";

const WALK_SPEED = 90; // logical px/sec
const ANIM_FRAME_MS = 150;

/**
 * Side-scrolling player: walks left/right along World.groundY only. No
 * jump, no vertical movement — matches the classic-platformer perspective
 * without adding gravity/physics the fishing loop doesn't need.
 */
export class Player {
  x: number;
  readonly y: number = World.groundY;
  direction: Direction = "right";
  anim: PlayerAnim = "idle";
  animFrame = 0;
  private animTimer = 0;

  constructor(x: number) {
    this.x = x;
  }

  setFishing(active: boolean): void {
    this.anim = active ? "fish" : "idle";
  }

  isFishing(): boolean {
    return this.anim === "fish";
  }

  update(dtMs: number, input: InputVector): void {
    const moving = !this.isFishing() && input.x !== 0;

    if (!this.isFishing()) {
      this.anim = moving ? "walk" : "idle";
    }

    if (moving) {
      this.direction = input.x > 0 ? "right" : "left";
      const dx = (input.x * WALK_SPEED * dtMs) / 1000;
      const nextX = this.x + dx;
      if (World.canWalk(nextX)) this.x = nextX;

      this.animTimer += dtMs;
      if (this.animTimer >= ANIM_FRAME_MS) {
        this.animTimer = 0;
        this.animFrame = (this.animFrame + 1) % 2;
      }
    } else {
      this.animTimer = 0;
      this.animFrame = 0;
    }
  }
}
