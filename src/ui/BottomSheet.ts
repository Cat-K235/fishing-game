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

    // `content` renders BEFORE the header bar/title/close button below, on
    // purpose: a scrolled list inside it can't be pixel-clipped to its own
    // viewport in this environment (GeometryMask/stencil clipping was tried
    // and confirmed not to actually clip anything, likely a stencil-buffer
    // gap in whatever WebGL context ends up running the game — see
    // VerticalScroller), so scrolled-past content can bleed above where it
    // should stop. Rendering the header bar and title/close on top of
    // `content`, opaque, means that bleed is simply covered rather than
    // obscuring anything interactive.
    this.content = scene.add.container(0, 44);
    this.add(this.content);

    // Only tall enough to guard the title/close row itself (roughly y 12-29)
    // — NOT the full 44px `content` is offset by, since some panels (Shop's
    // tabs) place their own fixed sub-header right at the top of `content`,
    // which would otherwise get covered by this too.
    const headerBar = scene.add.graphics();
    headerBar.fillStyle(0x1c2030, 1);
    headerBar.fillRoundedRect(0, 0, this.sheetW, 32, { tl: 16, tr: 16, bl: 0, br: 0 });
    this.add(headerBar);

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

/**
 * Wires a tap (not a raw pointerdown) onto an interactive object: the
 * callback only fires on release if the pointer didn't move much since the
 * press. Firing on pointerdown instead — the old approach — meant pressing
 * down to START a scroll drag on top of a card's button fired that button's
 * action immediately, before any drag could ever be detected.
 */
export function onTap(target: Phaser.GameObjects.Rectangle, onTap: () => void): void {
  let downX = 0;
  let downY = 0;
  let pressed = false;
  target
    .setInteractive({ useHandCursor: true })
    .on("pointerdown", (pointer: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
      ev.stopPropagation();
      pressed = true;
      downX = pointer.x;
      downY = pointer.y;
    })
    .on("pointerup", (pointer: Phaser.Input.Pointer) => {
      // No stopPropagation here — nothing in this codebase listens for a
      // scene-level pointerup, and the scroller's release-reset relies on
      // this event reaching it unblocked.
      if (!pressed) return;
      pressed = false;
      if (Phaser.Math.Distance.Between(downX, downY, pointer.x, pointer.y) < 8) onTap();
    })
    .on("pointerupoutside", () => {
      pressed = false;
    });
}

export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  bg: number,
  tap: () => void
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const rect = scene.add.rectangle(0, 0, w, h, bg).setStrokeStyle(2, 0x000000, 0.5);
  const text = scene.add
    .text(0, 0, label, { ...TEXT_STYLE, fontSize: "11px", color: "#12141c", stroke: undefined, strokeThickness: 0 })
    .setOrigin(0.5);
  onTap(rect, tap);
  c.add([rect, text]);
  return c;
}

/**
 * A vertical scroll area: drag up/down to reveal content taller than its
 * viewport — since `content.y` is the single source of truth for scroll
 * position — the way any native mobile list scrolls, instead of the old
 * sideways card-paging carousel.
 *
 * Items scrolled out of the viewport are hidden by toggling each one's own
 * `visible` flag rather than clipping the container with a GeometryMask.
 * Stencil-based masking turned out not to actually clip anything in
 * practice here (confirmed via a headless run: the mask was assigned but
 * fully-scrolled content still rendered past its bounds, unclipped) — likely
 * a stencil-buffer support gap in whatever WebGL context is running the
 * game, which varies across devices/WebViews. Per-item visibility has no
 * such dependency, at the cost of a whole item popping away at the
 * viewport edge instead of a pixel-precise crop.
 */
export class VerticalScroller {
  // The container's own starting y (e.g. below a fixed header) is the
  // "scrolled to top" resting position, not literal y=0 — clamping against
  // 0 instead let the list slide up past its own header into whatever sits
  // above it (tabs, a title) rather than stopping level with it.
  private baseY: number;
  private minY: number;
  private contentH: number;
  private thumb: Phaser.GameObjects.Rectangle | null = null;
  private trackTopY = 0;
  private trackH = 0;

  /**
   * `itemH` is each direct child's own height, used only to decide when
   * it's fully clear of the viewport. `centered` should be true when each
   * child's own y is its vertical center (e.g. a grid cell built around
   * cx/cy) rather than its top edge (e.g. a card container whose contents
   * are laid out from (0,0)).
   */
  constructor(
    private content: Phaser.GameObjects.Container,
    viewportH: number,
    contentH: number,
    private itemH: number,
    private centered = false
  ) {
    this.baseY = content.y;
    this.contentH = Math.max(contentH, viewportH);
    this.minY = this.baseY + Math.min(0, viewportH - this.contentH);
  }

  get scrollable(): boolean {
    return this.minY < this.baseY;
  }

  private cull(viewportTop: number, viewportBottom: number): void {
    const halfOffset = this.centered ? this.itemH / 2 : 0;
    for (const child of this.content.list) {
      const c = child as Phaser.GameObjects.Container;
      const top = this.content.y + c.y - halfOffset;
      c.setVisible(top + this.itemH > viewportTop && top < viewportBottom);
    }
  }

  /**
   * Lets the area be dragged vertically, with a thin scrollbar for affordance.
   * `parent` is where the scrollbar gets added (so it's cleaned up along
   * with the rest of the panel's content) and its coordinate space is what
   * `hitX/hitY/hitW/hitH` (the viewport rect to scroll within) are given in.
   *
   * Tracks the pointer at the scene level instead of relying on a single
   * invisible hit-zone object: a card's own background or a cell's select
   * button sits on top of that zone and, being interactive, would swallow
   * the gesture before the zone ever saw it — dragging would only work in
   * the thin gaps between items. Scene-level pointer events fire regardless
   * of which specific object is topmost, so a drag started anywhere in the
   * viewport (even directly on a button) still scrolls the list.
   */
  enableDrag(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, hitX: number, hitY: number, hitW: number, hitH: number): void {
    if (!this.scrollable) return;

    this.trackTopY = hitY - hitH / 2;
    this.trackH = hitH;
    const trackX = hitX + hitW / 2 + 7;
    const thumbH = Math.max(24, (hitH * hitH) / this.contentH);
    parent.add(scene.add.rectangle(trackX, hitY, 3, hitH, 0x000000, 0.3));
    this.thumb = scene.add.rectangle(trackX, this.trackTopY + thumbH / 2, 3, thumbH, 0xf4f1de, 0.55);
    parent.add(this.thumb);

    const viewportTop = hitY - hitH / 2;
    const viewportBottom = hitY + hitH / 2;
    this.cull(viewportTop, viewportBottom);

    const updateThumb = () => {
      if (!this.thumb) return;
      const p = (this.baseY - this.content.y) / (this.baseY - this.minY);
      this.thumb.y = this.trackTopY + thumbH / 2 + p * (this.trackH - thumbH);
      this.cull(viewportTop, viewportBottom);
    };

    const bounds = new Phaser.Geom.Rectangle(hitX - hitW / 2, hitY - hitH / 2, hitW, hitH);
    const toLocal = (pointer: Phaser.Input.Pointer) => parent.getWorldTransformMatrix().applyInverse(pointer.x, pointer.y);

    // Deliberately NOT driven by a scene-level 'pointerdown' listener: a
    // button underneath calls stopPropagation() on its own pointerdown (so
    // pressing it doesn't also register as a cast on the game world), and
    // that suppresses the InputPlugin's generic pointerdown event for
    // EVERY listener, ours included. 'pointermove' isn't stopped by
    // anything in this codebase, so a gesture's start is instead detected
    // lazily — the first move sample where the pointer is down but wasn't
    // a moment ago — which works regardless of what got the initial press.
    let wasDown = false;
    let dragging = false;
    let moved = 0;
    let startContentY = 0;
    let startPointerY = 0;

    const onMove = (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown && !wasDown) {
        const local = toLocal(pointer);
        dragging = bounds.contains(local.x, local.y);
        moved = 0;
        startContentY = this.content.y;
        startPointerY = pointer.y;
      }
      wasDown = pointer.isDown;
      if (!dragging || !pointer.isDown) return;

      const delta = pointer.y - startPointerY;
      moved = Math.max(moved, Math.abs(delta));
      // Ignore the first few px so a clean tap on a button underneath
      // doesn't get nudged as an accidental micro-scroll.
      if (moved < 4) return;
      this.content.y = Phaser.Math.Clamp(startContentY + delta, this.minY, this.baseY);
      updateThumb();
    };
    // Belt-and-suspenders reset: on a touchscreen a release generates no
    // further 'pointermove' at all, so without this `wasDown`/`dragging`
    // would stay stuck true and the next gesture would open with a stale
    // jump. Neither event is stopped by anything in this codebase.
    const onUp = () => {
      wasDown = false;
      dragging = false;
    };
    const onWheel = (pointer: Phaser.Input.Pointer, _dx: number, dy: number) => {
      const local = toLocal(pointer);
      if (!bounds.contains(local.x, local.y)) return;
      this.content.y = Phaser.Math.Clamp(this.content.y - dy * 0.6, this.minY, this.baseY);
      updateThumb();
    };

    scene.input.on("pointermove", onMove);
    scene.input.on("pointerup", onUp);
    scene.input.on("pointerupoutside", onUp);
    scene.input.on("wheel", onWheel);

    // `content.removeAll(true)` (every re-render) destroys the scrollbar
    // thumb along with everything else — piggyback cleanup of these
    // scene-level listeners on that, since they'd otherwise outlive it and
    // pile up with stale closures on every re-render.
    this.thumb.once(Phaser.GameObjects.Events.DESTROY, () => {
      scene.input.off("pointermove", onMove);
      scene.input.off("pointerup", onUp);
      scene.input.off("pointerupoutside", onUp);
      scene.input.off("wheel", onWheel);
    });
  }
}
