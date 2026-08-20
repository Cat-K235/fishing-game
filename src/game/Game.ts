import { Camera } from "./Camera";
import { Player } from "./Player";
import { World, type ZoneId } from "./World";
import { InputManager } from "./InputManager";
import { Renderer, VIEW_WIDTH, VIEW_HEIGHT } from "./Renderer";
import { FloatingText } from "./FloatingText";
import { GameLoop } from "./GameLoop";
import { FishingSystem } from "../fishing/FishingSystem";
import type { GameApi } from "../services/GameApi";
import type { AudioManager } from "../audio/AudioManager";
import type { CatchResult, FishingStateName } from "../types/game";
import { EventBus } from "../utils/EventBus";

export interface GameEvents {
  zoneChanged: ZoneId | null;
  fishingStateChanged: { state: FishingStateName; prev: FishingStateName };
  fishBite: void;
  fishCaught: CatchResult;
  fishEscaped: void;
  [key: string]: unknown;
}

/**
 * Top-level orchestrator for the canvas world: camera, player, input,
 * rendering, and the fishing state machine. Deliberately knows nothing about
 * the shop or inventory UI — those talk to GameApi directly and listen to
 * this class's events for fishing feedback.
 */
export class Game {
  readonly events = new EventBus<GameEvents>();

  private camera = new Camera(VIEW_WIDTH, VIEW_HEIGHT);
  private player = new Player(World.playerStart.x);
  private renderer: Renderer;
  private input: InputManager;
  private loop: GameLoop;
  private floatingText = new FloatingText();
  private fishing: FishingSystem;

  private activeZone: ZoneId | null = null;
  private fishingState: FishingStateName = "IDLE";
  private timeMs = 0;

  constructor(
    canvas: HTMLCanvasElement,
    joystickBase: HTMLElement,
    joystickStick: HTMLElement,
    api: GameApi,
    private audio: AudioManager
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    this.renderer = new Renderer(ctx);
    this.input = new InputManager(joystickBase, joystickStick);

    this.fishing = new FishingSystem(api, {
      onStateChange: (state, prev) => {
        this.fishingState = state;
        this.player.setFishing(state !== "IDLE" && state !== "RESULT");
        if (state === "CASTING") this.audio.play("cast");
        if (state === "REELING") this.audio.play("reel");
        this.events.emit("fishingStateChanged", { state, prev });
      },
      onBite: () => {
        this.audio.play("bite");
        this.events.emit("fishBite", undefined);
      },
      onFishEscaped: () => {
        this.audio.play("escape");
        this.floatingText.spawn(this.player.x, this.player.y - 40, "Got away...", "#cccccc");
        this.events.emit("fishEscaped", undefined);
      },
      onCatch: (result) => {
        this.audio.play("catch");
        this.floatingText.spawn(
          this.player.x,
          this.player.y - 40,
          `${result.fish.sprite} ${result.fish.name}!`,
          "#ffe066"
        );
        this.events.emit("fishCaught", result);
      },
    });

    this.loop = new GameLoop((dt) => this.update(dt));
  }

  start(): void {
    this.loop.start();
  }

  destroy(): void {
    this.loop.destroy();
    this.input.destroy();
  }

  /** Player-initiated cast. Only works while standing in the fishing zone. */
  cast(): boolean {
    if (this.activeZone !== "fishing") return false;
    return this.fishing.cast();
  }

  reel(): boolean {
    return this.fishing.reel();
  }

  acknowledgeCatch(): void {
    this.fishing.acknowledge();
  }

  getFishingState(): FishingStateName {
    return this.fishingState;
  }

  getActiveZone(): ZoneId | null {
    return this.activeZone;
  }

  private update(dtMs: number): void {
    this.timeMs += dtMs;
    const vector = this.input.getVector();
    this.player.update(dtMs, vector);
    this.camera.follow(this.player.x, this.player.y);

    const zone = World.getZoneAt(this.player.x, this.player.y);
    const zoneId = zone?.id ?? null;
    if (zoneId !== this.activeZone) {
      this.activeZone = zoneId;
      this.events.emit("zoneChanged", zoneId);
    }

    this.fishing.update(dtMs);
    this.floatingText.update(dtMs);

    this.renderer.render({
      camera: this.camera,
      player: this.player,
      fishingState: this.fishingState,
      fishingElapsedMs: 0,
      activeZone: this.activeZone,
      floatingText: this.floatingText,
      timeMs: this.timeMs,
    });
  }

  /** Used by SellUI to drop a "+N Coins" popup above the player after a sale. */
  spawnCoinPopup(amount: number): void {
    this.floatingText.spawn(this.player.x, this.player.y - 40, `+${amount} Coins`, "#ffd93d");
  }

  spawnPurchasePopup(rodName: string): void {
    this.floatingText.spawn(this.player.x, this.player.y - 40, `Bought ${rodName}!`, "#8ecae6");
  }
}
