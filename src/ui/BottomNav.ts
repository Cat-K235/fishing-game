import Phaser from "phaser";
import { WORLD_W, WORLD_H } from "../game/Constants";
import { TEXT_STYLE } from "./BottomSheet";

const NAV_H = 30;

export class BottomNav extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, onShop: () => void, onSell: () => void, onMaps: () => void) {
    super(scene, 0, WORLD_H - NAV_H);
    scene.add.existing(this);
    this.setDepth(45);

    const bg = scene.add.rectangle(WORLD_W / 2, NAV_H / 2, WORLD_W, NAV_H, 0x0c0e14, 0.72);
    this.add(bg);

    const items: [string, () => void][] = [
      ["SHOP", onShop],
      ["SELL", onSell],
      ["MAPS", onMaps],
    ];
    const segW = WORLD_W / items.length;
    items.forEach(([label, cb], i) => {
      const cx = segW * i + segW / 2;
      const hit = scene.add
        .rectangle(cx, NAV_H / 2, segW, NAV_H, 0x000000, 0.001)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", (_p: unknown, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
          ev.stopPropagation();
          cb();
        });
      const text = scene.add.text(cx, NAV_H / 2, label, { ...TEXT_STYLE, fontSize: "11px" }).setOrigin(0.5);
      this.add([hit, text]);
    });
  }
}
