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

/**
 * A horizontal card row: arrow-button paging by a fixed step, and — since
 * `content.x` is the single source of truth for scroll position — a real
 * drag-to-scroll you can freely mix with the buttons, the way any native
 * mobile scroll view works instead of a step-locked carousel.
 */
export class CardPager {
  private minX: number;

  constructor(private content: Phaser.GameObjects.Container, private cardStep: number, viewportW: number, cardCount: number) {
    this.minX = Math.min(0, viewportW - cardCount * cardStep);
  }

  next(): void {
    this.content.x = Phaser.Math.Clamp(this.content.x - this.cardStep, this.minX, 0);
  }

  prev(): void {
    this.content.x = Phaser.Math.Clamp(this.content.x + this.cardStep, this.minX, 0);
  }

  /** Lets the row be dragged horizontally, like any native mobile scroll view. `parent` is where the invisible drag zone gets added (so it's cleaned up along with the rest of the panel's content). */
  enableDrag(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, hitX: number, hitY: number, hitW: number, hitH: number): void {
    if (this.minX >= 0) return; // everything already fits — nothing to scroll
    const zone = scene.add.rectangle(hitX, hitY, hitW, hitH, 0x000000, 0.001);
    // Bottom of the stack regardless of call order, so it never swallows
    // taps meant for the card buttons rendered on top of it.
    parent.addAt(zone, 0);
    zone.setInteractive({ draggable: true, useHandCursor: true });

    let startContentX = 0;
    let startPointerX = 0;
    zone.on("dragstart", (pointer: Phaser.Input.Pointer) => {
      startContentX = this.content.x;
      startPointerX = pointer.x;
    });
    zone.on("drag", (pointer: Phaser.Input.Pointer) => {
      this.content.x = Phaser.Math.Clamp(startContentX + (pointer.x - startPointerX), this.minX, 0);
    });
  }
}
