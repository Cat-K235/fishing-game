import Phaser from "phaser";
import {
  WORLD_W,
  WORLD_H,
  HORIZON_Y,
  WATER_TOP,
  WATER_BOTTOM,
  DOCK_TOP,
  DOCK_CENTER_X,
  PLAYER_Y,
  CAST_MIN_Y,
  CAST_MAX_Y,
  CAST_MARGIN_X,
  depthToY,
} from "../game/Constants";
import { TEX } from "../game/Textures";
import { FISH_SPECIES, pickWeightedFish, type FishSpecies } from "../game/FishData";
import { stepReel, type ReelState } from "../game/ReelMath";
import { AudioSynth } from "../game/AudioSynth";
import { TelegramService } from "../telegram/TelegramService";

type FishingState = "idle" | "casting" | "waiting" | "reeling" | "result";

interface AmbientFish {
  sprite: Phaser.GameObjects.Sprite;
  species: FishSpecies;
  x: number;
  y: number;
  baseY: number;
  dir: 1 | -1;
  speed: number;
  swayT: number;
}

const BEST_KEY = "pixelfish.best";
const MUTED_KEY = "pixelfish.muted";

interface BestCatch {
  name: string;
  value: number;
  rarity: string;
}

export class GameScene extends Phaser.Scene {
  private telegram = new TelegramService();
  private audio = new AudioSynth();

  private world!: Phaser.GameObjects.Container;
  private swayT = 0;

  private waterTile!: Phaser.GameObjects.TileSprite;
  private shimmerTile!: Phaser.GameObjects.TileSprite;
  private lilyLayer!: Phaser.GameObjects.Container;

  private ambientFish: AmbientFish[] = [];

  private line!: Phaser.GameObjects.Graphics;
  private bobber!: Phaser.GameObjects.Sprite;
  private bobberX = DOCK_CENTER_X;
  private bobberY = PLAYER_Y;

  private rippleGroup!: Phaser.GameObjects.Group;

  private flashRect!: Phaser.GameObjects.Rectangle;

  private state: FishingState = "idle";
  private castFrom = { x: DOCK_CENTER_X, y: PLAYER_Y };
  private castTo = { x: DOCK_CENTER_X, y: CAST_MIN_Y };
  private castElapsed = 0;
  private castDuration = 0.42;

  private waitTimer = 0;
  private currentFish: FishSpecies | null = null;
  private reelState: ReelState = { progress: 0, tension: 0 };
  private reelGrace = 0;
  private fightT = 0;
  private fightSwaySeed = 0;
  private reelTickAccum = 0;

  private hudScore!: Phaser.GameObjects.Text;
  private hudPrompt!: Phaser.GameObjects.Text;
  private catchCard!: Phaser.GameObjects.Container;
  private muteBtn!: Phaser.GameObjects.Text;
  private tensionGfx!: Phaser.GameObjects.Graphics;
  private tensionVisible = false;

  private best: BestCatch | null = null;

  constructor() {
    super("game");
  }

  create(): void {
    this.telegram.init();
    this.audio.setMuted(localStorage.getItem(MUTED_KEY) === "1");
    this.best = this.loadBest();

    this.buildWorld();
    this.buildHud();
    this.wireInput();

    this.cameras.main.setBackgroundColor(0x0b1a2a);
  }

  // ---------------------------------------------------------------- WORLD

  private buildWorld(): void {
    this.world = this.add.container(0, 0);

    const sky = this.add.image(0, 0, TEX.sky).setOrigin(0, 0);
    sky.setDisplaySize(WORLD_W, HORIZON_Y);

    const mountains = this.add.image(0, HORIZON_Y - 55, TEX.mountains).setOrigin(0, 0).setAlpha(0.9);
    mountains.setDisplaySize(WORLD_W, 60);

    const treeline = this.add.image(0, HORIZON_Y - 34, TEX.treeline).setOrigin(0, 0);
    treeline.setDisplaySize(WORLD_W, 40);

    this.waterTile = this.add
      .tileSprite(0, WATER_TOP, WORLD_W, WATER_BOTTOM - WATER_TOP, TEX.water)
      .setOrigin(0, 0);
    this.shimmerTile = this.add
      .tileSprite(0, WATER_TOP, WORLD_W, WATER_BOTTOM - WATER_TOP, TEX.shimmer)
      .setOrigin(0, 0)
      .setAlpha(0.35);

    this.world.add([sky, mountains, treeline, this.waterTile, this.shimmerTile]);

    this.spawnAmbientFish();
    for (const f of this.ambientFish) this.world.add(f.sprite);

    this.lilyLayer = this.add.container(0, 0);
    this.world.add(this.lilyLayer);
    this.spawnLilyPads();

    // dock, drawn in front of everything else in the world
    const dockH = WORLD_H - DOCK_TOP;
    const plankW = 40;
    for (let x = -plankW / 2; x < WORLD_W + plankW; x += plankW) {
      const plank = this.add.image(x, DOCK_TOP, TEX.dockPlank).setOrigin(0, 0);
      plank.setDisplaySize(plankW + 1, dockH);
      this.world.add(plank);
    }

    this.line = this.add.graphics();
    this.world.add(this.line);

    this.bobber = this.add.sprite(this.bobberX, this.bobberY, TEX.bobber).setVisible(false);
    this.world.add(this.bobber);

    this.rippleGroup = this.add.group();

    this.flashRect = this.add
      .rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 0xffffff, 0)
      .setDepth(50);
  }

  private spawnLilyPads(): void {
    const count = 6;
    for (let i = 0; i < count; i++) {
      const variant = i % 3;
      const x = 20 + Math.random() * (WORLD_W - 40);
      const y = WATER_BOTTOM - 30 - Math.random() * 70;
      const pad = this.add.image(x, y, TEX.lilyPad(variant));
      pad.setScale(0.9 + Math.random() * 0.5);
      pad.setData("baseX", x);
      pad.setData("baseY", y);
      pad.setData("seed", Math.random() * 1000);
      this.lilyLayer.add(pad);
    }
  }

  private spawnAmbientFish(): void {
    const count = 6;
    for (let i = 0; i < count; i++) {
      const species = FISH_SPECIES[Phaser.Math.Between(0, Math.min(2, FISH_SPECIES.length - 1))];
      const baseY = depthToY(species.depth) + Phaser.Math.Between(-20, 20);
      const x = Phaser.Math.Between(20, WORLD_W - 20);
      const sprite = this.add.sprite(x, baseY, TEX.fish(species.id), 0);
      sprite.setAlpha(0.85);
      const dir: 1 | -1 = Math.random() > 0.5 ? 1 : -1;
      sprite.setFlipX(dir === -1);
      this.ambientFish.push({
        sprite,
        species,
        x,
        y: baseY,
        baseY,
        dir,
        speed: 10 + Math.random() * 14,
        swayT: Math.random() * 10,
      });
    }
  }

  // ------------------------------------------------------------------ HUD

  private buildHud(): void {
    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "Courier New, monospace",
      fontSize: "14px",
      color: "#f4f1de",
      stroke: "#12141c",
      strokeThickness: 3,
    };

    this.hudScore = this.add.text(12, 10, this.scoreLabel(), textStyle).setDepth(40);

    this.muteBtn = this.add
      .text(WORLD_W - 34, 10, this.audio.isMuted() ? "\u{1F507}" : "\u{1F50A}", {
        fontSize: "18px",
      })
      .setDepth(40)
      .setInteractive({ useHandCursor: true });
    this.muteBtn.on("pointerdown", (_p: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      const muted = this.audio.toggleMuted();
      localStorage.setItem(MUTED_KEY, muted ? "1" : "0");
      this.muteBtn.setText(muted ? "\u{1F507}" : "\u{1F50A}");
    });

    this.hudPrompt = this.add
      .text(WORLD_W / 2, DOCK_TOP - 26, "TAP THE WATER TO CAST", {
        ...textStyle,
        fontSize: "13px",
      })
      .setOrigin(0.5)
      .setDepth(40);

    this.tensionGfx = this.add.graphics().setDepth(40);

    this.catchCard = this.add.container(WORLD_W / 2, WORLD_H / 2 - 40).setDepth(60).setAlpha(0);
    const cardBg = this.add.rectangle(0, 0, 220, 96, 0x1c2030, 0.92).setStrokeStyle(3, 0xffd93d);
    const cardTitle = this.add
      .text(0, -32, "CAUGHT!", { ...textStyle, fontSize: "12px", color: "#ffd93d" })
      .setOrigin(0.5);
    const cardName = this.add.text(0, -8, "", { ...textStyle, fontSize: "16px" }).setOrigin(0.5).setName("name");
    const cardMeta = this.add
      .text(0, 18, "", { ...textStyle, fontSize: "12px", color: "#9aa0b4" })
      .setOrigin(0.5)
      .setName("meta");
    this.catchCard.add([cardBg, cardTitle, cardName, cardMeta]);
  }

  private scoreLabel(): string {
    const best = this.best;
    return best ? `BEST: ${best.name.toUpperCase()} (${best.value})` : "BEST: —";
  }

  private loadBest(): BestCatch | null {
    try {
      const raw = localStorage.getItem(BEST_KEY);
      return raw ? (JSON.parse(raw) as BestCatch) : null;
    } catch {
      return null;
    }
  }

  private saveBest(fish: FishSpecies): void {
    if (this.best && this.best.value >= fish.scoreValue) return;
    this.best = { name: fish.name, value: fish.scoreValue, rarity: fish.rarity };
    localStorage.setItem(BEST_KEY, JSON.stringify(this.best));
    this.hudScore.setText(this.scoreLabel());
  }

  // ---------------------------------------------------------------- INPUT

  private wireInput(): void {
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.state === "idle") this.startCast(pointer.x, pointer.y);
    });
  }

  // ----------------------------------------------------------------- CAST

  private startCast(px: number, py: number): void {
    this.state = "casting";
    this.castElapsed = 0;
    this.castFrom = { x: DOCK_CENTER_X, y: PLAYER_Y };
    const tx = Phaser.Math.Clamp(px, CAST_MARGIN_X, WORLD_W - CAST_MARGIN_X);
    const ty = Phaser.Math.Clamp(py, CAST_MIN_Y, CAST_MAX_Y);
    this.castTo = { x: tx, y: ty };
    this.castDuration = 0.32 + (Math.abs(ty - this.castFrom.y) / (CAST_MAX_Y - CAST_MIN_Y)) * 0.28;

    this.currentFish = pickWeightedFish();

    this.bobber.setVisible(true);
    this.bobber.setScale(1);
    this.hudPrompt.setText("");
    this.telegram.haptic("light");
  }

  private updateCasting(dt: number): void {
    this.castElapsed += dt;
    const t = Phaser.Math.Clamp(this.castElapsed / this.castDuration, 0, 1);
    const arcHeight = 90;
    const x = Phaser.Math.Linear(this.castFrom.x, this.castTo.x, t);
    const y = Phaser.Math.Linear(this.castFrom.y, this.castTo.y, t) - Math.sin(t * Math.PI) * arcHeight;
    this.bobberX = x;
    this.bobberY = y;
    // stretch along the arc while airborne, squash on landing
    const stretch = 1 + Math.sin(t * Math.PI) * 0.35;
    this.bobber.setScale(1 / stretch, stretch);

    if (t >= 1) this.land();
  }

  private land(): void {
    this.bobberX = this.castTo.x;
    this.bobberY = this.castTo.y;
    this.bobber.setScale(1.3, 0.6);
    this.tweens.add({ targets: this.bobber, scaleX: 1, scaleY: 1, duration: 220, ease: "Elastic.Out" });

    this.spawnRipple(this.bobberX, this.bobberY, 0);
    this.spawnRipple(this.bobberX, this.bobberY, 120);
    this.audio.plop();

    const fish = this.currentFish!;
    this.waitTimer = Phaser.Math.FloatBetween(fish.biteDelay[0], fish.biteDelay[1]);
    this.state = "waiting";
    this.hudPrompt.setText("...");
  }

  private spawnRipple(x: number, y: number, delayMs: number): void {
    this.time.delayedCall(delayMs, () => {
      const ring = this.add.image(x, y, TEX.ripple).setAlpha(0.9).setScale(0.3);
      this.world.add(ring);
      this.rippleGroup.add(ring);
      this.tweens.add({
        targets: ring,
        scale: 2.1,
        alpha: 0,
        duration: 650,
        ease: "Sine.Out",
        onComplete: () => ring.destroy(),
      });
    });
  }

  // -------------------------------------------------------------- WAITING

  private updateWaiting(dt: number): void {
    this.bobberY = this.castTo.y + Math.sin(this.time.now / 400) * 2;
    this.bobberX = this.castTo.x;

    this.waitTimer -= dt;
    if (this.waitTimer <= 0) this.onBite();
  }

  private onBite(): void {
    this.state = "reeling";
    this.reelState = { progress: 22, tension: 0 };
    this.reelGrace = 0.35;
    this.fightT = 0;
    this.fightSwaySeed = Math.random() * 100;
    this.reelTickAccum = 0;
    this.tensionVisible = true;

    this.bobberY = this.castTo.y + 12;
    this.bobber.setScale(0.8, 1.3);
    this.tweens.add({ targets: this.bobber, scaleX: 1, scaleY: 1, duration: 160, ease: "Back.Out" });

    this.cameras.main.shake(120, 0.006);
    this.audio.bitePing();
    this.telegram.haptic("medium");
    this.hudPrompt.setText("HOLD TO REEL!");
  }

  // -------------------------------------------------------------- REELING

  private updateReeling(dt: number): void {
    const fish = this.currentFish!;
    this.fightT += dt;
    const pull =
      Math.sin(this.fightT * fish.fightSpeed * Math.PI * 2 + this.fightSwaySeed) * 0.8 +
      Math.sin(this.fightT * fish.fightSpeed * 5.3 + this.fightSwaySeed) * 0.2;

    this.bobberX = this.castTo.x + pull * 10;
    this.bobberY = this.castTo.y + 10 + Math.sin(this.time.now / 90) * 1.5;

    const holding = this.input.activePointer.isDown;

    if (this.reelGrace > 0) {
      this.reelGrace -= dt;
    } else {
      const { state, outcome } = stepReel(this.reelState, dt, holding, pull, fish.fightStrength);
      this.reelState = state;

      if (holding) {
        this.reelTickAccum += dt;
        if (this.reelTickAccum > 0.15) {
          this.reelTickAccum = 0;
          this.audio.reelTick();
        }
      }

      if (outcome === "caught") return this.startCatchSequence(fish);
      if (outcome === "snapped") return this.startSnapSequence();
      if (outcome === "escaped") return this.startEscapeSequence();
    }

    this.drawTensionBar();
    if (this.reelState.tension > 78) {
      this.world.x = (Math.random() - 0.5) * 3;
      this.world.y = (Math.random() - 0.5) * 3;
    }
  }

  private drawTensionBar(): void {
    const x = WORLD_W - 30;
    const y = WATER_TOP + 24;
    const w = 16;
    const h = 160;
    const g = this.tensionGfx;
    g.clear();
    if (!this.tensionVisible) return;

    g.fillStyle(0x12141c, 0.85);
    g.fillRect(x, y, w, h);
    g.lineStyle(2, 0x000000, 0.6);
    g.strokeRect(x, y, w, h);

    const fillH = (this.reelState.tension / 100) * (h - 4);
    const color = this.reelState.tension > 78 ? 0xe63946 : this.reelState.tension > 45 ? 0xffd93d : 0x6bcb77;
    g.fillStyle(color, 1);
    g.fillRect(x + 2, y + h - 2 - fillH, w - 4, fillH);

    // progress notch on the side
    const px = x - 10;
    g.fillStyle(0x12141c, 0.85);
    g.fillRect(px, y, 6, h);
    const progH = (this.reelState.progress / 100) * (h - 4);
    g.fillStyle(0x8ecae6, 1);
    g.fillRect(px + 1, y + h - 2 - progH, 4, progH);
  }

  // --------------------------------------------------------- RESOLUTIONS

  private startCatchSequence(fish: FishSpecies): void {
    this.state = "result";
    this.tensionVisible = false;
    this.tensionGfx.clear();
    this.world.x = 0;
    this.world.y = 0;
    this.hudPrompt.setText("");

    const startX = this.bobberX;
    const startY = this.bobberY;
    const endX = DOCK_CENTER_X + Phaser.Math.Between(-30, 30);
    const endY = PLAYER_Y;

    this.bobber.setVisible(false);
    const fishSprite = this.add.sprite(startX, startY, TEX.fish(fish.id), 0).setScale(1.6);
    this.world.add(fishSprite);

    const duration = 480;
    const startTime = this.time.now;
    const arcHeight = 70;

    const flightTimer = this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        const t = Phaser.Math.Clamp((this.time.now - startTime) / duration, 0, 1);
        fishSprite.x = Phaser.Math.Linear(startX, endX, t);
        fishSprite.y = Phaser.Math.Linear(startY, endY, t) - Math.sin(t * Math.PI) * arcHeight;
        fishSprite.rotation = Phaser.Math.Linear(0, Math.PI * 2, t);
        if (t >= 1) {
          flightTimer.remove(false);
          this.onFishLanded(fish, fishSprite);
        }
      },
    });
  }

  private onFishLanded(fish: FishSpecies, sprite: Phaser.GameObjects.Sprite): void {
    sprite.rotation = 0;
    sprite.setScale(2.1, 1.1);
    this.tweens.add({ targets: sprite, scaleX: 1.6, scaleY: 1.6, duration: 260, ease: "Elastic.Out" });

    this.flashRect.setAlpha(0.55);
    this.tweens.add({ targets: this.flashRect, alpha: 0, duration: 180 });

    this.burstParticles(sprite.x, sprite.y);
    this.audio.catchJingle();
    this.telegram.hapticNotification("success");
    this.saveBest(fish);

    const nameText = this.catchCard.getByName("name") as Phaser.GameObjects.Text;
    const metaText = this.catchCard.getByName("meta") as Phaser.GameObjects.Text;
    nameText.setText(fish.name);
    metaText.setText(`${fish.rarity.toUpperCase()}  +${fish.scoreValue}`);
    this.tweens.add({ targets: this.catchCard, alpha: 1, duration: 150, yoyo: false });

    this.time.delayedCall(1300, () => {
      this.tweens.add({ targets: this.catchCard, alpha: 0, duration: 200 });
    });

    this.time.delayedCall(1700, () => {
      sprite.destroy();
      this.resetToIdle();
    });
  }

  private startSnapSequence(): void {
    this.state = "result";
    this.tensionVisible = false;
    this.tensionGfx.clear();
    this.world.x = 0;
    this.world.y = 0;
    this.hudPrompt.setText("LINE SNAPPED!");

    const snapBackX = DOCK_CENTER_X;
    const snapBackY = PLAYER_Y;
    this.tweens.add({
      targets: this.bobber,
      x: snapBackX,
      y: snapBackY,
      scaleX: 0.6,
      scaleY: 1.5,
      duration: 260,
      ease: "Back.In",
      onUpdate: () => {
        this.bobberX = this.bobber.x;
        this.bobberY = this.bobber.y;
      },
      onComplete: () => {
        this.bobber.setVisible(false);
        this.bobber.setScale(1);
      },
    });

    this.cameras.main.shake(180, 0.012);
    this.audio.snap();
    this.telegram.hapticNotification("error");

    this.time.delayedCall(900, () => this.resetToIdle());
  }

  private startEscapeSequence(): void {
    this.state = "result";
    this.tensionVisible = false;
    this.tensionGfx.clear();
    this.world.x = 0;
    this.world.y = 0;
    this.hudPrompt.setText("IT GOT AWAY...");

    this.spawnRipple(this.bobberX, this.bobberY, 0);
    this.bobber.setVisible(false);
    this.telegram.haptic("light");

    this.time.delayedCall(750, () => this.resetToIdle());
  }

  private burstParticles(x: number, y: number): void {
    const keys = [TEX.particle("gold"), TEX.particle("teal"), TEX.particle("white"), TEX.particle("pink")];
    for (let i = 0; i < 22; i++) {
      const key = keys[Phaser.Math.Between(0, keys.length - 1)];
      const p = this.add.image(x, y, key).setDepth(55);
      const angle = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 50;
      const tx = x + Math.cos(angle) * dist;
      const ty = y + Math.sin(angle) * dist - 20;
      this.tweens.add({
        targets: p,
        x: tx,
        y: ty + 40,
        alpha: 0,
        rotation: Math.random() * 6,
        duration: 550 + Math.random() * 300,
        ease: "Cubic.Out",
        onComplete: () => p.destroy(),
      });
    }
  }

  private resetToIdle(): void {
    this.state = "idle";
    this.currentFish = null;
    this.hudPrompt.setText("TAP THE WATER TO CAST");
    this.bobber.setVisible(false);
    this.line.clear();
  }

  // ----------------------------------------------------------------- LOOP

  update(time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 0.05);
    this.swayT += dt;

    if (this.state !== "reeling" || this.reelState.tension <= 78) {
      this.world.x = Math.sin(this.swayT * 0.6) * 1.6;
      this.world.y = Math.cos(this.swayT * 0.45) * 1.1;
    }

    this.waterTile.tilePositionX += dt * 9;
    this.shimmerTile.tilePositionX -= dt * 4;
    this.shimmerTile.setAlpha(0.28 + Math.sin(time / 700) * 0.12);

    this.updateAmbientFish(dt);
    this.updateLilyPads(time);

    switch (this.state) {
      case "casting":
        this.updateCasting(dt);
        break;
      case "waiting":
        this.updateWaiting(dt);
        break;
      case "reeling":
        this.updateReeling(dt);
        break;
      default:
        break;
    }

    if (this.state !== "idle" && this.bobber.visible) {
      this.bobber.setPosition(this.bobberX, this.bobberY);
      this.drawLine();
    }
  }

  private drawLine(): void {
    this.line.clear();
    this.line.lineStyle(1.5, 0xe8e4d8, 0.8);
    this.line.beginPath();
    this.line.moveTo(DOCK_CENTER_X, PLAYER_Y);
    this.line.lineTo(this.bobberX, this.bobberY);
    this.line.strokePath();
  }

  private updateAmbientFish(dt: number): void {
    for (const f of this.ambientFish) {
      f.swayT += dt;
      f.x += f.dir * f.speed * dt;
      if (f.x < -20) {
        f.x = -20;
        f.dir = 1;
        f.sprite.setFlipX(false);
      } else if (f.x > WORLD_W + 20) {
        f.x = WORLD_W + 20;
        f.dir = -1;
        f.sprite.setFlipX(true);
      }
      f.y = f.baseY + Math.sin(f.swayT * 0.8) * 6;
      f.sprite.setPosition(f.x, f.y);
      f.sprite.setFrame(Math.floor(f.swayT * 3) % 2 === 0 ? 0 : 1);
    }
  }

  private updateLilyPads(time: number): void {
    for (const pad of this.lilyLayer.list as Phaser.GameObjects.Image[]) {
      const seed = pad.getData("seed") as number;
      const bx = pad.getData("baseX") as number;
      const by = pad.getData("baseY") as number;
      pad.x = bx + Math.sin(time / 1800 + seed) * 3;
      pad.y = by + Math.cos(time / 2200 + seed) * 2;
    }
  }
}
