import Phaser from "phaser";
import { BottomSheet, TEXT_STYLE, drawStatBar, makeButton, CardPager } from "./BottomSheet";
import { RODS, type RodDef } from "../game/RodData";
import { TEX } from "../game/Textures";
import type { Economy } from "../game/Economy";
import { WORLD_W } from "../game/Constants";

const CARD_W = 104;
const CARD_H = 176;
const GAP = 10;
const STEP = CARD_W + GAP;

export class ShopPanel extends BottomSheet {
  constructor(scene: Phaser.Scene, private economy: Economy, private onChange: () => void) {
    super(scene, "SHOP — RODS", 300);
  }

  protected onOpen(): void {
    const scene = this.scene;
    const list = scene.add.container(16, 4);
    this.content.add(list);

    RODS.forEach((rod, i) => this.buildCard(list, rod, i));

    const viewportW = WORLD_W - 32;
    const pager = new CardPager(list, STEP, viewportW, RODS.length);
    if (RODS.length * STEP > viewportW) {
      this.content.add(makeButton(scene, 20, 254, 46, 28, "<", 0x8ecae6, () => pager.prev()));
      this.content.add(makeButton(scene, WORLD_W - 66, 254, 46, 28, ">", 0x8ecae6, () => pager.next()));
    }
  }

  private buildCard(list: Phaser.GameObjects.Container, rod: RodDef, index: number): void {
    const scene = this.scene;
    const x = index * STEP;
    const card = scene.add.container(x, 0);
    list.add(card);

    const owned = this.economy.ownsRod(rod.id);
    const equipped = this.economy.equippedRodId === rod.id;
    const affordable = this.economy.coins >= rod.cost;
    const locked = !owned && !affordable;

    const bg = scene.add
      .rectangle(0, 0, CARD_W, CARD_H, locked ? 0x181a22 : 0x22273a)
      .setOrigin(0, 0)
      .setStrokeStyle(2, equipped ? 0x6bcb77 : 0x000000, equipped ? 1 : 0.5);
    card.add(bg);

    const icon = scene.add.image(CARD_W / 2, 34, TEX.rodIcon(rod.id)).setAlpha(locked ? 0.35 : 1);
    card.add(icon);

    const name = scene.add
      .text(CARD_W / 2, 60, rod.name, { ...TEXT_STYLE, fontSize: "11px", color: locked ? "#6b6f7a" : "#f4f1de" })
      .setOrigin(0.5, 0);
    card.add(name);

    const stats: [string, number, number][] = [
      ["SPD", (rod.castSpeedMult - 1) / 0.6, 0x8ecae6],
      ["CTL", (1 - rod.tensionForgiveness) / 0.6, 0x6bcb77],
      ["RARE", rod.rareBonusPct / 0.32, 0xffd93d],
    ];
    stats.forEach(([label, pct, color], i) => {
      const sy = 82 + i * 16;
      const lbl = scene.add.text(8, sy, label, { ...TEXT_STYLE, fontSize: "9px" });
      card.add(lbl);
      card.add(drawStatBar(scene, 36, sy + 5, CARD_W - 44, locked ? pct * 0.4 : pct, color));
    });

    const costText = equipped ? "" : owned ? "" : `${rod.cost}c`;
    if (costText) {
      card.add(scene.add.text(CARD_W / 2, 134, costText, { ...TEXT_STYLE, fontSize: "12px", color: "#ffd93d" }).setOrigin(0.5));
    }
    if (locked) {
      card.add(scene.add.text(CARD_W / 2, 150, `NEED ${rod.cost}c`, { ...TEXT_STYLE, fontSize: "9px", color: "#e63946" }).setOrigin(0.5));
    }

    const btnY = CARD_H - 20;
    if (equipped) {
      card.add(makeButton(scene, CARD_W / 2, btnY, CARD_W - 16, 26, "EQUIPPED", 0x6b6f7a, () => {}));
    } else if (owned) {
      card.add(
        makeButton(scene, CARD_W / 2, btnY, CARD_W - 16, 26, "EQUIP", 0x8ecae6, () => {
          this.economy.equipRod(rod.id);
          this.onChange();
          this.open();
        })
      );
    } else if (affordable) {
      card.add(
        makeButton(scene, CARD_W / 2, btnY, CARD_W - 16, 26, "BUY", 0xffd93d, () => {
          if (this.economy.buyRod(rod.id, rod.cost)) {
            this.economy.equipRod(rod.id);
            this.onChange();
            this.open();
          }
        })
      );
    } else {
      card.add(makeButton(scene, CARD_W / 2, btnY, CARD_W - 16, 26, "LOCKED", 0x3a3f4a, () => {}));
    }
  }
}
