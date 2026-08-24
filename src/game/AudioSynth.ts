// Tiny procedural sound effects via the Web Audio API. No asset files, no
// network fetch — keeps the game truly offline-capable and boot-instant.
export class AudioSynth {
  private ctx: AudioContext | null = null;
  private muted = false;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  toggleMuted(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  private tone(freq: number, start: number, dur: number, type: OscillatorType, gainPeak: number, ctx: AudioContext, dest: AudioNode): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
    gain.gain.setValueAtTime(0, ctx.currentTime + start);
    gain.gain.linearRampToValueAtTime(gainPeak, ctx.currentTime + start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(ctx.currentTime + start);
    osc.stop(ctx.currentTime + start + dur + 0.02);
  }

  /** Soft low plop for the cast landing in the water. */
  plop(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(340, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.18);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.9, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
  }

  /** Urgent ping when a fish bites. */
  bitePing(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const master = ctx.createGain();
    master.gain.value = 0.3;
    master.connect(ctx.destination);
    this.tone(880, 0, 0.09, "square", 0.5, ctx, master);
    this.tone(1180, 0.09, 0.1, "square", 0.4, ctx, master);
  }

  /** Quick tick while reeling — called sparingly, not every frame. */
  reelTick(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const master = ctx.createGain();
    master.gain.value = 0.12;
    master.connect(ctx.destination);
    this.tone(220, 0, 0.04, "triangle", 0.6, ctx, master);
  }

  /** Cartoon spring-back when the line snaps. */
  snap(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(120, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(60, ctx.currentTime + 0.08);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.6, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(ctx.currentTime + 0.14);
  }

  /** Bright chime when coins are earned from a sale. */
  coinChime(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const master = ctx.createGain();
    master.gain.value = 0.28;
    master.connect(ctx.destination);
    this.tone(1046.5, 0, 0.1, "square", 0.5, ctx, master);
    this.tone(1568, 0.05, 0.12, "square", 0.4, ctx, master);
  }

  /** Upbeat jingle on a landed catch. */
  catchJingle(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const master = ctx.createGain();
    master.gain.value = 0.3;
    master.connect(ctx.destination);
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => this.tone(freq, i * 0.07, 0.16, "square", 0.4, ctx, master));
  }
}
