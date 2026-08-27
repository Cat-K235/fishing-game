import Phaser from "phaser";
import { BottomSheet, TEXT_STYLE, drawStatBar, makeButton, CardPager } from "./BottomSheet";
import { RODS, type RodDef } from "../game/RodData";
import { BAITS, type BaitDef } from "../game/BaitData";
import { TEX } from "../game/Textures";
import type { Economy } from "../game/Economy";
import { WORLD_W } from "../game/Constants";

const CARD_W = 104;
const CARD_H = 176;
const GAP = 10;
const STEP = CARD_W + GAP;

type Tab = "bait" | "rods";

export class ShopPanel extends BottomSheet {
  private tab: Tab = "bait";

  constructor(scene: Phaser.Scene, private economy: Economy, private onChange: () => void) {
    super(scene, "SHOP", 300);
  }

  protected onOpen(): void {
    this.render();
  }

  private render(): void {
    this.content.removeAll(true);
    const scene = this.scene;

    const tabBtn = (label: string, tab: Tab, x: number) =>
      makeButton(scene, x, 0, 96, 24, label, this.tab === tab ? 0xffd93d : 0x3a3f4a, () => {
        this.tab = tab;
        this.render();
      });
    this.content.add(tabBtn("BAIT", "bait", WORLD_W / 2 - 54));
    this.content.add(tabBtn("RODS", "rods", WORLD_W / 2 + 54));

    const list = scene.add.container(16, 30);
    this.content.add(list);

    const count = this.tab === "bait" ? BAITS.length : RODS.length;
    if (this.tab === "bait") BAITS.forEach((b, i) => this.buildBaitCard(list, b, i));
    else RODS.forEach((r, i) => this.buildRodCard(list, r, i));

    const viewportW = WORLD_W - 32;
    const pager = new CardPager(list, STEP, viewportW, count);
    pager.enableDrag(scene, this.content, 16 + viewportW / 2, 30 + CARD_H / 2, viewportW, CARD_H);
    if (count * STEP > viewportW) {
      this.content.add(makeButton(scene, 20, 216, 46, 28, "<", 0x8ecae6, () => pager.prev()));
      this.content.add(makeButton(scene, WORLD_W - 66, 216, 46, 28, ">", 0x8ecae6, () => pager.next()));
    }
  }

  private buildBaitCard(list: Phaser.GameObjects.Container, bait: BaitDef, index: number): void {
    const scene = this.scene;
    const x = index * STEP;
    const card = scene.add.container(x, 0);
    list.add(card);

    const owned = this.economy.ownsBait(bait.id);
    const equipped = this.economy.equippedBaitId === bait.id;
    const affordable = this.economy.coins >= bait.cost;
    const locked = !owned && !affordable;

    const bg = scene.add
      .rectangle(0, 0, CARD_W, CARD_H, locked ? 0x181a22 : 0x22273a)
      .setOrigin(0, 0)
      .setStrokeStyle(2, equipped ? 0x6bcb77 : 0x000000, equipped ? 1 : 0.5);
    card.add(bg);

    const icon = scene.add.image(CARD_W / 2, 34, TEX.baitIcon(bait.id)).setAlpha(locked ? 0.35 : 1);
    card.add(icon);

    const name = scene.add
      .text(CARD_W / 2, 60, bait.name, { ...TEXT_STYLE, fontSize: "11px", color: locked ? "#6b6f7a" : "#f4f1de" })
      .setOrigin(0.5, 0);
    card.add(name);

    const rarePct = bait.rareBonusPct / 0.4;
    card.add(scene.add.text(8, 86, "RARE", { ...TEXT_STYLE, fontSize: "9px" }));
    card.add(drawStatBar(scene, 36, 91, CARD_W - 44, locked ? rarePct * 0.4 : rarePct, 0xffd93d));
    card.add(
      scene.add
        .text(CARD_W / 2, 106, `UP TO ${bait.maxRarity.toUpperCase()}`, { ...TEXT_STYLE, fontSize: "8px", color: "#9aa0b4" })
        .setOrigin(0.5, 0)
    );

    const costText = equipped || owned ? "" : `${bait.cost}c`;
    if (costText) {
      card.add(scene.add.text(CARD_W / 2, 134, costText, { ...TEXT_STYLE, fontSize: "12px", color: "#ffd93d" }).setOrigin(0.5));
    }
    if (locked) {
      card.add(scene.add.text(CARD_W / 2, 150, `NEED ${bait.cost}c`, { ...TEXT_STYLE, fontSize: "9px", color: "#e63946" }).setOrigin(0.5));
    }

    const btnY = CARD_H - 20;
    if (equipped) {
      card.add(makeButton(scene, CARD_W / 2, btnY, CARD_W - 16, 26, "EQUIPPED", 0x6b6f7a, () => {}));
    } else if (owned) {
      card.add(
        makeButton(scene, CARD_W / 2, btnY, CARD_W - 16, 26, "EQUIP", 0x8ecae6, () => {
          this.economy.equipBait(bait.id);
          this.onChange();
          this.render();
        })
      );
    } else if (affordable) {
      card.add(
        makeButton(scene, CARD_W / 2, btnY, CARD_W - 16, 26, "BUY", 0xffd93d, () => {
          if (this.economy.buyBait(bait.id, bait.cost)) {
            this.economy.equipBait(bait.id);
            this.onChange();
            this.render();
          }
        })
      );
    } else {
      card.add(makeButton(scene, CARD_W / 2, btnY, CARD_W - 16, 26, "LOCKED", 0x3a3f4a, () => {}));
    }
  }

  private buildRodCard(list: Phaser.GameObjects.Container, rod: RodDef, index: number): void {
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
    ];
    stats.forEach(([label, pct, color], i) => {
      const sy = 82 + i * 16;
      card.add(scene.add.text(8, sy, label, { ...TEXT_STYLE, fontSize: "9px" }));
      card.add(drawStatBar(scene, 36, sy + 5, CARD_W - 44, locked ? pct * 0.4 : pct, color));
    });

    const costText = equipped || owned ? "" : `${rod.cost}c`;
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
          this.render();
        })
      );
    } else if (affordable) {
      card.add(
        makeButton(scene, CARD_W / 2, btnY, CARD_W - 16, 26, "BUY", 0xffd93d, () => {
          if (this.economy.buyRod(rod.id, rod.cost)) {
            this.economy.equipRod(rod.id);
            this.onChange();
            this.render();
          }
        })
      );
    } else {
      card.add(makeButton(scene, CARD_W / 2, btnY, CARD_W - 16, 26, "LOCKED", 0x3a3f4a, () => {}));
    }
  }
}
