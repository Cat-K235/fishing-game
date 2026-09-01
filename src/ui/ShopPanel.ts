import Phaser from "phaser";
import { BottomSheet, TEXT_STYLE, drawStatBar, makeButton, VerticalScroller } from "./BottomSheet";
import { RODS, type RodDef } from "../game/RodData";
import { BAITS, BAIT_PACK_SIZE, UNLIMITED_BAIT_ID, type BaitDef } from "../game/BaitData";
import { TEX } from "../game/Textures";
import type { Economy } from "../game/Economy";

const CARD_W = 104;
const CARD_H = 176;
const GAP = 10;
const COLS = 2;
const TABS_H = 34;
const SHEET_H = 560;

type Tab = "bait" | "rods";

export class ShopPanel extends BottomSheet {
  private tab: Tab = "bait";

  constructor(scene: Phaser.Scene, private economy: Economy, private onChange: () => void) {
    super(scene, "SHOP", SHEET_H);
  }

  protected onOpen(): void {
    this.render();
  }

  /** Opens straight to the BAIT tab regardless of whatever tab was last active — used by the HUD bait indicator. */
  openToBait(): void {
    this.tab = "bait";
    this.open();
  }

  private render(): void {
    this.content.removeAll(true);
    const scene = this.scene;

    const items = this.tab === "bait" ? BAITS : RODS;
    const gridW = COLS * CARD_W + (COLS - 1) * GAP;
    const startX = (this.sheetW - gridW) / 2;
    const rows = Math.ceil(items.length / COLS);
    const contentH = rows * (CARD_H + GAP) - GAP;

    const list = scene.add.container(startX, TABS_H);
    this.content.add(list);
    if (this.tab === "bait") BAITS.forEach((b, i) => this.buildBaitCard(list, b, i));
    else RODS.forEach((r, i) => this.buildRodCard(list, r, i));

    const viewportH = this.sheetH - 44 - TABS_H - 16;
    const scroller = new VerticalScroller(list, viewportH, contentH, CARD_H);
    scroller.enableDrag(scene, this.content, this.sheetW / 2, TABS_H + viewportH / 2, this.sheetW - 16, viewportH);

    // Tabs are added last (on top of the list, over an opaque cover) so a
    // scrolled-past card can't visually bleed over them — see the note on
    // BottomSheet's own header bar for why this can't just be clipped away.
    const tabsCover = scene.add.graphics();
    tabsCover.fillStyle(0x1c2030, 1);
    tabsCover.fillRect(0, -12, this.sheetW, TABS_H + 12);
    this.content.add(tabsCover);

    const tabBtn = (label: string, tab: Tab, x: number) =>
      makeButton(scene, x, 0, 96, 24, label, this.tab === tab ? 0xffd93d : 0x3a3f4a, () => {
        this.tab = tab;
        this.render();
      });
    this.content.add(tabBtn("BAIT", "bait", this.sheetW / 2 - 54));
    this.content.add(tabBtn("RODS", "rods", this.sheetW / 2 + 54));
  }

  private buildBaitCard(list: Phaser.GameObjects.Container, bait: BaitDef, index: number): void {
    const scene = this.scene;
    const col = index % COLS;
    const row = Math.floor(index / COLS);
    const card = scene.add.container(col * (CARD_W + GAP), row * (CARD_H + GAP));
    list.add(card);

    const unlimited = bait.id === UNLIMITED_BAIT_ID;
    const count = this.economy.baitCount(bait.id);
    const active = this.economy.equippedBaitId === bait.id;
    const affordable = this.economy.coins >= bait.cost;
    const outOfStock = !unlimited && count <= 0;

    const bg = scene.add
      .rectangle(0, 0, CARD_W, CARD_H, 0x22273a)
      .setOrigin(0, 0)
      .setStrokeStyle(2, active ? 0x6bcb77 : 0x000000, active ? 1 : 0.5);
    card.add(bg);

    const icon = scene.add.image(CARD_W / 2, 30, TEX.baitIcon(bait.id)).setAlpha(outOfStock ? 0.4 : 1);
    card.add(icon);

    const name = scene.add
      .text(CARD_W / 2, 52, bait.name, { ...TEXT_STYLE, fontSize: "11px", color: outOfStock ? "#6b6f7a" : "#f4f1de" })
      .setOrigin(0.5, 0);
    card.add(name);

    const rarePct = bait.rareBonusPct / 0.4;
    card.add(scene.add.text(8, 72, "RARE", { ...TEXT_STYLE, fontSize: "9px" }));
    card.add(drawStatBar(scene, 36, 77, CARD_W - 44, rarePct, 0xffd93d));
    card.add(
      scene.add
        .text(CARD_W / 2, 88, `UP TO ${bait.maxRarity.toUpperCase()}`, { ...TEXT_STYLE, fontSize: "8px", color: "#9aa0b4" })
        .setOrigin(0.5, 0)
    );

    const stockLabel = unlimited ? "UNLIMITED" : `OWNED: ${count}`;
    card.add(
      scene.add
        .text(CARD_W / 2, 102, stockLabel, { ...TEXT_STYLE, fontSize: "9px", color: outOfStock ? "#e63946" : "#9aa0b4" })
        .setOrigin(0.5, 0)
    );

    if (!unlimited) {
      card.add(
        makeButton(
          scene,
          CARD_W / 2,
          124,
          CARD_W - 16,
          22,
          `BUY ${BAIT_PACK_SIZE} · ${bait.cost}c`,
          affordable ? 0xffd93d : 0x3a3f4a,
          () => {
            if (this.economy.buyBaitPack(bait.id, bait.cost, BAIT_PACK_SIZE)) {
              this.onChange();
              this.render();
            }
          }
        )
      );
    }

    const selectY = CARD_H - 20;
    if (active) {
      card.add(makeButton(scene, CARD_W / 2, selectY, CARD_W - 16, 26, "ACTIVE", 0x6bcb77, () => {}));
    } else if (outOfStock) {
      card.add(makeButton(scene, CARD_W / 2, selectY, CARD_W - 16, 26, "OUT OF STOCK", 0x3a3f4a, () => {}));
    } else {
      card.add(
        makeButton(scene, CARD_W / 2, selectY, CARD_W - 16, 26, "SELECT", 0x8ecae6, () => {
          this.economy.equipBait(bait.id);
          this.onChange();
          this.render();
        })
      );
    }
  }

  private buildRodCard(list: Phaser.GameObjects.Container, rod: RodDef, index: number): void {
    const scene = this.scene;
    const col = index % COLS;
    const row = Math.floor(index / COLS);
    const card = scene.add.container(col * (CARD_W + GAP), row * (CARD_H + GAP));
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
