/** requestAnimationFrame driver with delta time and tab-visibility pausing. */
export class GameLoop {
  private rafId: number | null = null;
  private lastTime = 0;
  private running = false;

  constructor(private onTick: (dtMs: number) => void) {
    document.addEventListener("visibilitychange", this.onVisibilityChange);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  destroy(): void {
    this.stop();
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
  }

  private tick = (now: number): void => {
    if (!this.running) return;
    // Clamped both ways: tab-switch/backgrounding shouldn't cause a huge
    // simulation jump, and the first frame's rAF timestamp can occasionally
    // land slightly before the performance.now() captured in start(),
    // which would otherwise produce a negative delta.
    const dt = Math.max(0, Math.min(50, now - this.lastTime));
    this.lastTime = now;
    this.onTick(dt);
    this.rafId = requestAnimationFrame(this.tick);
  };

  private onVisibilityChange = (): void => {
    if (document.hidden) this.stop();
    else this.start();
  };
}
