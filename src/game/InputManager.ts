export interface InputVector {
  x: number;
  y: number;
}

const KEY_MAP: Record<string, "up" | "down" | "left" | "right"> = {
  arrowup: "up",
  w: "up",
  arrowdown: "down",
  s: "down",
  arrowleft: "left",
  a: "left",
  arrowright: "right",
  d: "right",
};

const JOYSTICK_RADIUS = 36;

/**
 * Combines keyboard (desktop) and a touch virtual joystick (mobile) into a
 * single normalized movement vector. Neither input method requires
 * precision or hover, per the mobile-UX requirements.
 */
export class InputManager {
  private keys = new Set<string>();
  private joystickVector: InputVector = { x: 0, y: 0 };
  private joystickPointerId: number | null = null;
  private baseCenter = { x: 0, y: 0 };

  constructor(private base: HTMLElement, private stick: HTMLElement) {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    this.base.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("pointercancel", this.onPointerUp);
  }

  getVector(): InputVector {
    if (this.joystickPointerId !== null) return this.joystickVector;

    let x = 0;
    let y = 0;
    for (const key of this.keys) {
      const dir = KEY_MAP[key];
      if (dir === "up") y -= 1;
      else if (dir === "down") y += 1;
      else if (dir === "left") x -= 1;
      else if (dir === "right") x += 1;
    }
    const len = Math.hypot(x, y);
    if (len > 0) {
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  destroy(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.base.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("pointercancel", this.onPointerUp);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.key.toLowerCase());
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.key.toLowerCase());
  };

  private onPointerDown = (e: PointerEvent): void => {
    if (this.joystickPointerId !== null) return;
    e.preventDefault();
    this.joystickPointerId = e.pointerId;
    const rect = this.base.getBoundingClientRect();
    this.baseCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    this.updateStick(e.clientX, e.clientY);
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (e.pointerId !== this.joystickPointerId) return;
    e.preventDefault();
    this.updateStick(e.clientX, e.clientY);
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.joystickPointerId) return;
    this.joystickPointerId = null;
    this.joystickVector = { x: 0, y: 0 };
    this.stick.style.transform = "translate(-50%, -50%)";
  };

  private updateStick(clientX: number, clientY: number): void {
    let dx = clientX - this.baseCenter.x;
    let dy = clientY - this.baseCenter.y;
    const dist = Math.hypot(dx, dy);
    if (dist > JOYSTICK_RADIUS) {
      dx = (dx / dist) * JOYSTICK_RADIUS;
      dy = (dy / dist) * JOYSTICK_RADIUS;
    }
    this.stick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    const nx = dx / JOYSTICK_RADIUS;
    const ny = dy / JOYSTICK_RADIUS;
    const mag = Math.min(1, Math.hypot(nx, ny));
    const angle = Math.atan2(ny, nx);
    this.joystickVector = { x: Math.cos(angle) * mag, y: Math.sin(angle) * mag };
  }
}
