import Phaser from "phaser";
import { WORLD_W, WORLD_H } from "../game/Constants";

export const TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: "Verdana, Geneva, sans-serif",
  fontSize: "13px",
  color: "#f4f1de",
  stroke: "#12141c",
  strokeThickness: 1.5,
};

/** Panel width — inset from the screen edges so it reads as a centered card, not an edge-to-edge sheet. */
const PANEL_W = WORLD_W - 32;
const PANEL_X = 16;

/**
 * A modal panel that pops in centered on screen over a dimming scrim.
 * Subclasses build their content into `content` inside `onOpen()`, which
 * runs (rebuilding from scratch) every time the sheet opens so it always
 * reflects current game state.
 */
export abstract class BottomSheet extends Phaser.GameObjects.Container {
  protected sheetH: number;
  protected sheetW = PANEL_W;
  protected content: Phaser.GameObjects.Container;
  private scrim: Phaser.GameObjects.Rectangle;
  private sheetOpen = false;
  private onCloseCb: (() => void) | null = null;

  constructor(scene: Phaser.Scene, title: string, sheetH: number) {
    super(scene, PANEL_X, (WORLD_H - sheetH) / 2);
    this.sheetH = sheetH;
    scene.add.existing(this);
    this.setDepth(90);

    // Kept as its own top-level object (not a child of `this`) so the
    // full-screen dim doesn't get scaled/faded along with the panel's
    // center pop-in/out animation.
    this.scrim = scene.add
      .rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 0x000000, 0.6)
      .setDepth(89)
      .setVisible(false)
      .setInteractive()
      .on("pointerdown", (_p: unknown, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
        ev.stopPropagation();
        this.close();
      });

    const bg = scene.add.graphics();
    bg.fillStyle(0x1c2030, 0.97);
    bg.fillRoundedRect(0, 0, this.sheetW, sheetH, 16);
    bg.lineStyle(2, 0x000000, 0.5);
    bg.strokeRoundedRect(0, 0, this.sheetW, sheetH, 16);
    // Interactive with a no-op handler purely so a tap on empty panel space
    // (a gap between cards, an empty inventory) is absorbed here instead of
    // falling through to the full-screen scrim underneath and closing the
    // panel — or worse, past that too and registering as a cast on the game
    // world once the panel closes.
    bg.setInteractive(new Phaser.Geom.Rectangle(0, 0, this.sheetW, sheetH), Phaser.Geom.Rectangle.Contains).on(
      "pointerdown",
      (_p: unknown, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
        ev.stopPropagation();
      }
    );
    this.add(bg);

    const titleText = scene.add.text(16, 14, title, { ...TEXT_STYLE, fontSize: "15px", color: "#ffd93d" });
    this.add(titleText);

    const closeBtn = scene.add
      .text(this.sheetW - 30, 12, "X", { ...TEXT_STYLE, fontSize: "14px" })
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", (_p: unknown, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
        ev.stopPropagation();
        this.close();
      });
    this.add(closeBtn);

    this.content = scene.add.container(0, 44);
    this.add(this.content);

    this.setVisible(false);
    this.setScale(0.9);
    this.setAlpha(0);
  }

  protected abstract onOpen(): void;

  open(onClose?: () => void): void {
    this.onCloseCb = onClose ?? null;
    this.content.removeAll(true);
    this.onOpen();
    this.setVisible(true);
    this.sheetOpen = true;
    this.setScale(0.9);
    this.setAlpha(0);
    this.scene.tweens.add({ targets: this, scale: 1, alpha: 1, duration: 220, ease: "Back.Out" });

    this.scrim.setVisible(true).setAlpha(0);
    this.scene.tweens.add({ targets: this.scrim, alpha: 1, duration: 180 });
  }

  close(): void {
    if (!this.sheetOpen) return;
    this.sheetOpen = false;
    this.scene.tweens.add({
      targets: this,
      scale: 0.9,
      alpha: 0,
      duration: 160,
      ease: "Sine.In",
      onComplete: () => {
        this.setVisible(false);
        this.onCloseCb?.();
      },
    });
    this.scene.tweens.add({
      targets: this.scrim,
      alpha: 0,
      duration: 160,
      onComplete: () => this.scrim.setVisible(false),
    });
  }

  get isOpen(): boolean {
    return this.sheetOpen;
  }

  /**
   * Clips `target` (a child of `this.content`, directly or indirectly) to a
   * rectangle in `content`-local coordinates, so a scrollable list doesn't
   * render past the panel's edge. The mask graphics is added to `content`
   * itself so it gets torn down automatically on the next `content.removeAll`
   * (every re-render), rather than accumulating a fresh mask each time.
   */
  protected clipContent(target: Phaser.GameObjects.Container, x: number, y: number, w: number, h: number): void {
    const g = this.scene.add.graphics();
    g.fillStyle(0xffffff);
    g.fillRect(x, y, w, h);
    g.setVisible(false);
    this.content.add(g);
    target.setMask(g.createGeometryMask());
  }

  destroy(fromScene?: boolean): void {
    this.scrim.destroy();
    super.destroy(fromScene);
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
  const text = scene.add
    .text(0, 0, label, { ...TEXT_STYLE, fontSize: "11px", color: "#12141c", stroke: undefined, strokeThickness: 0 })
    .setOrigin(0.5);
  rect.setInteractive({ useHandCursor: true }).on("pointerdown", (_p: unknown, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
    ev.stopPropagation();
    onTap();
  });
  c.add([rect, text]);
  return c;
}

/**
 * A vertical scroll area: drag up/down to reveal content taller than its
 * viewport — since `content.y` is the single source of truth for scroll
 * position — the way any native mobile list scrolls, instead of the old
 * sideways card-paging carousel.
 */
export class VerticalScroller {
  private minY: number;
  private contentH: number;
  private thumb: Phaser.GameObjects.Rectangle | null = null;
  private trackTopY = 0;
  private trackH = 0;

  constructor(private content: Phaser.GameObjects.Container, viewportH: number, contentH: number) {
    this.contentH = Math.max(contentH, viewportH);
    this.minY = Math.min(0, viewportH - this.contentH);
  }

  get scrollable(): boolean {
    return this.minY < 0;
  }

  /** Lets the area be dragged vertically, with a thin scrollbar for affordance. `parent` is where the invisible drag zone and scrollbar get added (so they're cleaned up along with the rest of the panel's content). */
  enableDrag(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, hitX: number, hitY: number, hitW: number, hitH: number): void {
    if (!this.scrollable) return;
    const zone = scene.add.rectangle(hitX, hitY, hitW, hitH, 0x000000, 0.001);
    // Bottom of the stack regardless of call order, so it never swallows
    // taps meant for buttons rendered on top of it.
    parent.addAt(zone, 0);
    zone.setInteractive({ draggable: true, useHandCursor: true });

    this.trackTopY = hitY - hitH / 2;
    this.trackH = hitH;
    const trackX = hitX + hitW / 2 + 7;
    const thumbH = Math.max(24, (hitH * hitH) / this.contentH);
    parent.add(scene.add.rectangle(trackX, hitY, 3, hitH, 0x000000, 0.3));
    this.thumb = scene.add.rectangle(trackX, this.trackTopY + thumbH / 2, 3, thumbH, 0xf4f1de, 0.55);
    parent.add(this.thumb);

    const updateThumb = () => {
      if (!this.thumb) return;
      const p = this.minY === 0 ? 0 : this.content.y / this.minY;
      this.thumb.y = this.trackTopY + thumbH / 2 + p * (this.trackH - thumbH);
    };

    let startContentY = 0;
    let startPointerY = 0;
    zone.on("dragstart", (pointer: Phaser.Input.Pointer) => {
      startContentY = this.content.y;
      startPointerY = pointer.y;
    });
    zone.on("drag", (pointer: Phaser.Input.Pointer) => {
      this.content.y = Phaser.Math.Clamp(startContentY + (pointer.y - startPointerY), this.minY, 0);
      updateThumb();
    });
    zone.on("wheel", (_pointer: Phaser.Input.Pointer, _dx: number, dy: number) => {
      this.content.y = Phaser.Math.Clamp(this.content.y - dy * 0.6, this.minY, 0);
      updateThumb();
    });
  }
}
