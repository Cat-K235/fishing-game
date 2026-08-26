import Phaser from "phaser";
import { WORLD_W } from "../game/Constants";
import { TEXT_STYLE } from "./BottomSheet";

const HANDLE_W = 24;
const HANDLE_H = 56;
const BTN_W = 62;
const BTN_H = 42;
const GAP = 4;
// Sits below the tension gauge (which ends ~y452) and above the dock (y764).
const CENTER_Y = 600;

/**
 * A drawer of nav buttons tucked against the right edge — collapsed to a
 * small handle by default so it doesn't sit in the awkward-to-reach bottom
 * strip (which on a real device can also be covered by Telegram's own
 * Mini App chrome) or cover the game view.
 */
export class SideMenu extends Phaser.GameObjects.Container {
  private flyout: Phaser.GameObjects.Container;
  private handleText: Phaser.GameObjects.Text;
  private expanded = false;
  private flyoutW: number;

  constructor(scene: Phaser.Scene, items: [string, () => void][]) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(45);

    this.flyoutW = HANDLE_W + BTN_W + 8;
    const totalH = items.length * BTN_H + (items.length - 1) * GAP;
    const top = CENTER_Y - totalH / 2;

    this.flyout = scene.add.container(WORLD_W, 0);
    this.add(this.flyout);

    const bg = scene.add.rectangle(HANDLE_W + BTN_W / 2, CENTER_Y, BTN_W + 6, totalH + 10, 0x0c0e14, 0.78);
    this.flyout.add(bg);

    items.forEach(([label, cb], i) => {
      const y = top + i * (BTN_H + GAP) + BTN_H / 2;
      const btn = scene.add
        .rectangle(HANDLE_W + BTN_W / 2, y, BTN_W, BTN_H, 0x1c2030, 0.92)
        .setStrokeStyle(1, 0x000000, 0.5)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", (_p: unknown, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
          ev.stopPropagation();
          this.collapse();
          cb();
        });
      const text = scene.add.text(HANDLE_W + BTN_W / 2, y, label, { ...TEXT_STYLE, fontSize: "10px" }).setOrigin(0.5);
      this.flyout.add([btn, text]);
    });

    // The handle stays fixed at the same screen position whether the drawer
    // is open or closed, rendered above the flyout, so it's always in the
    // same reachable spot as a toggle.
    const handleBg = scene.add
      .rectangle(WORLD_W - HANDLE_W / 2, CENTER_Y, HANDLE_W, HANDLE_H, 0x0c0e14, 0.85)
      .setStrokeStyle(1, 0x000000, 0.5);
    this.handleText = scene.add
      .text(WORLD_W - HANDLE_W / 2, CENTER_Y, "☰", { fontSize: "14px", color: "#f4f1de" })
      .setOrigin(0.5);
    const handleHit = scene.add
      .rectangle(WORLD_W - HANDLE_W / 2, CENTER_Y, HANDLE_W, HANDLE_H, 0x000000, 0.001)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", (_p: unknown, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
        ev.stopPropagation();
        this.toggle();
      });
    this.add([handleBg, this.handleText, handleHit]);
  }

  toggle(): void {
    if (this.expanded) this.collapse();
    else this.expand();
  }

  expand(): void {
    if (this.expanded) return;
    this.expanded = true;
    this.handleText.setText("▶");
    this.scene.tweens.add({ targets: this.flyout, x: WORLD_W - this.flyoutW, duration: 220, ease: "Back.Out" });
  }

  collapse(): void {
    if (!this.expanded) return;
    this.expanded = false;
    this.handleText.setText("☰");
    this.scene.tweens.add({ targets: this.flyout, x: WORLD_W, duration: 200, ease: "Sine.In" });
  }
}
