import Phaser from "phaser";
import { WORLD_W, WORLD_H } from "../game/Constants";

export const TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: "Courier New, monospace",
  fontSize: "13px",
  color: "#f4f1de",
  stroke: "#12141c",
  strokeThickness: 3,
};

/**
 * A modal panel that slides up from the bottom over a dimming scrim.
 * Subclasses build their content into `content` inside `onOpen()`, which
 * runs (rebuilding from scratch) every time the sheet opens so it always
 * reflects current game state.
 */
export abstract class BottomSheet extends Phaser.GameObjects.Container {
  protected sheetH: number;
  protected content: Phaser.GameObjects.Container;
  private scrim: Phaser.GameObjects.Rectangle;
  private sheetOpen = false;
  private onCloseCb: (() => void) | null = null;

  constructor(scene: Phaser.Scene, title: string, sheetH: number) {
    super(scene, 0, WORLD_H);
    this.sheetH = sheetH;
    scene.add.existing(this);
    this.setDepth(90);

    this.scrim = scene.add
      .rectangle(WORLD_W / 2, -WORLD_H / 2, WORLD_W, WORLD_H, 0x000000, 0.55)
      .setInteractive()
      .on("pointerdown", (_p: unknown, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
        ev.stopPropagation();
        this.close();
      });
    this.add(this.scrim);

    const bg = scene.add.graphics();
    bg.fillStyle(0x1c2030, 0.97);
    bg.fillRoundedRect(0, 0, WORLD_W, sheetH, { tl: 16, tr: 16, bl: 0, br: 0 });
    bg.lineStyle(2, 0x000000, 0.5);
    bg.strokeRoundedRect(0, 0, WORLD_W, sheetH, { tl: 16, tr: 16, bl: 0, br: 0 });
    this.add(bg);

    const titleText = scene.add.text(16, 14, title, { ...TEXT_STYLE, fontSize: "15px", color: "#ffd93d" });
    this.add(titleText);

    const closeBtn = scene.add
      .text(WORLD_W - 30, 12, "X", { ...TEXT_STYLE, fontSize: "14px" })
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", (_p: unknown, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
        ev.stopPropagation();
        this.close();
      });
    this.add(closeBtn);

    this.content = scene.add.container(0, 44);
    this.add(this.content);

    this.setVisible(false);
  }

  protected abstract onOpen(): void;

  open(onClose?: () => void): void {
    this.onCloseCb = onClose ?? null;
    this.content.removeAll(true);
    this.onOpen();
    this.setVisible(true);
    this.sheetOpen = true;
    this.y = WORLD_H;
    this.scene.tweens.add({ targets: this, y: WORLD_H - this.sheetH, duration: 260, ease: "Back.Out" });
  }

  close(): void {
    if (!this.sheetOpen) return;
    this.sheetOpen = false;
    this.scene.tweens.add({
      targets: this,
      y: WORLD_H,
      duration: 200,
      ease: "Sine.In",
      onComplete: () => {
        this.setVisible(false);
        this.onCloseCb?.();
      },
    });
  }

  get isOpen(): boolean {
    return this.sheetOpen;
  }
}

/** Small horizontal stat bar (icon-less, just a filled gauge) for card stat rows. */
export function drawStatBar(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  pct: number,
  color: number
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics({ x, y });
  g.fillStyle(0x0f1118, 0.9);
  g.fillRect(0, 0, w, 5);
  g.fillStyle(color, 1);
  g.fillRect(0, 0, w * Phaser.Math.Clamp(pct, 0, 1), 5);
  g.lineStyle(1, 0x000000, 0.6);
  g.strokeRect(0, 0, w, 5);
  return g;
}

export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  bg: number,
  onTap: () => void
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const rect = scene.add.rectangle(0, 0, w, h, bg).setStrokeStyle(2, 0x000000, 0.5);
  const text = scene.add.text(0, 0, label, { ...TEXT_STYLE, fontSize: "11px", color: "#12141c" }).setOrigin(0.5);
  rect.setInteractive({ useHandCursor: true }).on("pointerdown", (_p: unknown, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
    ev.stopPropagation();
    onTap();
  });
  c.add([rect, text]);
  return c;
}

/** Simple left/right-paged horizontal card row: clamps content.x to card-width steps. */
export class CardPager {
  private index = 0;
  constructor(
    private content: Phaser.GameObjects.Container,
    private cardStep: number,
    private viewportW: number,
    private cardCount: number
  ) {}

  private maxIndex(): number {
    const visibleCount = Math.max(1, Math.floor(this.viewportW / this.cardStep));
    return Math.max(0, this.cardCount - visibleCount);
  }

  next(): void {
    this.index = Math.min(this.index + 1, this.maxIndex());
    this.apply();
  }

  prev(): void {
    this.index = Math.max(this.index - 1, 0);
    this.apply();
  }

  private apply(): void {
    this.content.x = -this.index * this.cardStep;
  }
}
