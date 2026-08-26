import Phaser from "phaser";
import { TEX } from "./Textures";

export type Expression = "neutral" | "smile" | "shocked" | "stars";

const IDLE_ANGLE = Phaser.Math.DegToRad(-55);
const WINDUP_ANGLE = Phaser.Math.DegToRad(-125);
const CAST_FORWARD_ANGLE = Phaser.Math.DegToRad(-10);
const RAISE_ANGLE = Phaser.Math.DegToRad(-95);
const ROD_TIP_LOCAL = new Phaser.Math.Vector2(54, -5);

/**
 * Chibi fisherman rig: legs + torso are static, armRod pivots at the
 * shoulder for cast/reel/catch poses, and the head texture swaps per
 * expression. Everything is procedurally drawn (see Textures.ts) — this
 * class only positions and animates the parts.
 */
export class Fisherman extends Phaser.GameObjects.Container {
  private legs: Phaser.GameObjects.Sprite;
  private torso: Phaser.GameObjects.Sprite;
  private head: Phaser.GameObjects.Sprite;
  private armRod: Phaser.GameObjects.Sprite;

  private breatheT = Math.random() * 10;
  private busy = false;
  private reelTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, rodId: string) {
    super(scene, x, y);
    scene.add.existing(this);

    this.legs = scene.add.sprite(0, 0, TEX.charLegs).setOrigin(0.5, 1);
    this.torso = scene.add.sprite(0, -13, TEX.charTorso).setOrigin(0.5, 1);
    this.armRod = scene.add.sprite(7, -30, TEX.charArmRod(rodId)).setOrigin(0.06, 0.5).setRotation(IDLE_ANGLE);
    this.head = scene.add.sprite(0, -33, TEX.charHead("neutral")).setOrigin(0.5, 1);

    this.add([this.legs, this.torso, this.armRod, this.head]);
  }

  setExpression(expr: Expression): void {
    this.head.setTexture(TEX.charHead(expr));
  }

  /** Swaps the held rod's appearance — purely cosmetic, doesn't touch gameplay stats. */
  setRod(rodId: string): void {
    this.armRod.setTexture(TEX.charArmRod(rodId));
  }

  /** World-space position of the rod tip, for anchoring the fishing line. */
  getRodTipWorld(out = new Phaser.Math.Vector2()): Phaser.Math.Vector2 {
    const m = this.armRod.getWorldTransformMatrix();
    m.transformPoint(ROD_TIP_LOCAL.x, ROD_TIP_LOCAL.y, out);
    return out;
  }

  /** Subtle breathing bob — call every frame while nothing bigger is animating. */
  updateIdle(dt: number): void {
    if (this.busy) return;
    this.breatheT += dt;
    this.torso.y = -13 + Math.sin(this.breatheT * 1.6) * 0.8;
    this.head.y = -33 + Math.sin(this.breatheT * 1.6) * 0.8;
    if (!this.reelTween) this.armRod.rotation = IDLE_ANGLE + Math.sin(this.breatheT * 1.6) * 0.02;
  }

  playCast(durationMs: number): void {
    this.busy = true;
    this.armRod.rotation = WINDUP_ANGLE;
    this.scene.tweens.add({
      targets: this.armRod,
      rotation: CAST_FORWARD_ANGLE,
      duration: durationMs * 0.55,
      ease: "Back.Out",
      onComplete: () => {
        this.scene.tweens.add({
          targets: this.armRod,
          rotation: IDLE_ANGLE,
          duration: 220,
          ease: "Sine.InOut",
          onComplete: () => {
            this.busy = false;
          },
        });
      },
    });
  }

  startReelLoop(): void {
    this.stopReelLoop();
    this.busy = true;
    const base = IDLE_ANGLE - 0.15;
    this.armRod.rotation = base;
    this.reelTween = this.scene.tweens.add({
      targets: this.armRod,
      rotation: base + 0.22,
      duration: 220,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });
  }

  stopReelLoop(): void {
    this.reelTween?.stop();
    this.reelTween = null;
    this.busy = false;
  }

  playSnapFlinch(): void {
    this.stopReelLoop();
    this.busy = true;
    this.armRod.rotation = IDLE_ANGLE - 0.5;
    this.scene.tweens.add({
      targets: this.armRod,
      rotation: IDLE_ANGLE,
      duration: 260,
      ease: "Elastic.Out",
      onComplete: () => {
        this.busy = false;
      },
    });
  }

  playCatch(expression: Expression): void {
    this.stopReelLoop();
    this.busy = true;
    this.setExpression(expression);

    this.scene.tweens.add({
      targets: this,
      y: this.y - 16,
      duration: 150,
      ease: "Back.Out",
      yoyo: true,
      hold: 500,
    });
    this.scene.tweens.add({
      targets: this.armRod,
      rotation: RAISE_ANGLE,
      duration: 200,
      ease: "Back.Out",
    });

    this.scene.time.delayedCall(900, () => {
      this.scene.tweens.add({
        targets: this.armRod,
        rotation: IDLE_ANGLE,
        duration: 240,
        ease: "Sine.InOut",
      });
      this.setExpression("neutral");
      this.busy = false;
    });
  }
}

export function expressionForRarity(rarity: string): Expression {
  if (rarity === "common") return "neutral";
  if (rarity === "uncommon") return "smile";
  if (rarity === "rare") return "shocked";
  return "stars"; // epic, legendary
}
