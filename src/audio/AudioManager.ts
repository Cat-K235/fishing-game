export type SoundKey =
  | "cast"
  | "bite"
  | "reel"
  | "catch"
  | "coin"
  | "purchase"
  | "click"
  | "escape";

interface Tone {
  freq: number;
  durationMs: number;
  type: OscillatorType;
  /** Optional second tone for a simple two-note blip. */
  freq2?: number;
}

// Short synthesized blips stand in for real sound assets. Swapping these for
// real .mp3/.ogg files later only requires changing `play()`.
const TONES: Record<SoundKey, Tone> = {
  cast: { freq: 320, durationMs: 120, type: "triangle" },
  bite: { freq: 880, durationMs: 90, type: "square", freq2: 1100 },
  reel: { freq: 420, durationMs: 140, type: "sawtooth" },
  catch: { freq: 660, durationMs: 220, type: "triangle", freq2: 990 },
  coin: { freq: 1046, durationMs: 90, type: "square", freq2: 1568 },
  purchase: { freq: 523, durationMs: 180, type: "triangle", freq2: 784 },
  click: { freq: 240, durationMs: 40, type: "square" },
  escape: { freq: 200, durationMs: 200, type: "sawtooth" },
};

const MUTE_KEY = "fishing-game-muted";

/** Lightweight sound manager. Sound is never required to understand gameplay. */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private muted: boolean;

  constructor() {
    this.muted = localStorage.getItem(MUTE_KEY) === "1";
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  }

  toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  play(key: SoundKey): void {
    if (this.muted) return;
    const tone = TONES[key];
    if (!tone) return;
    try {
      const ctx = this.ensureContext();
      this.playTone(ctx, tone.freq, tone.durationMs, tone.type);
      if (tone.freq2) {
        window.setTimeout(
          () => this.playTone(ctx, tone.freq2!, tone.durationMs * 0.8, tone.type),
          tone.durationMs * 0.5
        );
      }
    } catch (err) {
      console.warn("[AudioManager] Playback failed", err);
    }
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private playTone(ctx: AudioContext, freq: number, durationMs: number, type: OscillatorType): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = 0.08;
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationMs / 1000);
  }
}
