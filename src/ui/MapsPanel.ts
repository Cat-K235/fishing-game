import Phaser from "phaser";
import { BottomSheet, TEXT_STYLE, makeButton, VerticalScroller } from "./BottomSheet";
import { LOCATIONS, recommendedBaitFor } from "../game/LocationData";
import { TEX } from "../game/Textures";
import type { Economy } from "../game/Economy";

const CARD_W = 118;
const CARD_H = 180;
const GAP = 10;
const COLS = 2;
const SHEET_H = 560;

export class MapsPanel extends BottomSheet {
  constructor(
    scene: Phaser.Scene,
    private economy: Economy,
    private onUnlock: () => void,
    private onTravel: (locationId: string) => void
  ) {
    super(scene, "MAPS", SHEET_H);
  }

  protected onOpen(): void {
    const scene = this.scene;
    const gridW = COLS * CARD_W + (COLS - 1) * GAP;
    const startX = (this.sheetW - gridW) / 2;
    const rows = Math.ceil(LOCATIONS.length / COLS);
    const contentH = rows * (CARD_H + GAP) - GAP;

    const list = scene.add.container(startX, 0);
    this.content.add(list);
    LOCATIONS.forEach((_loc, i) => this.buildCard(list, i));

    const viewportH = this.sheetH - 44 - 16;
    const scroller = new VerticalScroller(list, viewportH, contentH, CARD_H);
    scroller.enableDrag(scene, this.content, this.sheetW / 2, viewportH / 2, this.sheetW - 16, viewportH);
  }

  private buildCard(list: Phaser.GameObjects.Container, index: number): void {
    const scene = this.scene;
    const loc = LOCATIONS[index];
    const col = index % COLS;
    const row = Math.floor(index / COLS);
    const card = scene.add.container(col * (CARD_W + GAP), row * (CARD_H + GAP));
    list.add(card);

    const unlocked = this.economy.isLocationUnlocked(loc.id);
    const current = this.economy.currentLocationId === loc.id;
    const affordable = this.economy.coins >= loc.unlockCost;

    const bg = scene.add
      .rectangle(0, 0, CARD_W, CARD_H, unlocked ? 0x22273a : 0x14151d)
      .setOrigin(0, 0)
      .setStrokeStyle(2, current ? 0x6bcb77 : 0x000000, current ? 1 : 0.5);
    card.add(bg);

    // palette swatch preview
    const swatch = scene.add.graphics();
    swatch.fillStyle(loc.palette.skyLow, unlocked ? 1 : 0.35);
    swatch.fillRect(4, 4, CARD_W - 8, 20);
    swatch.fillStyle(loc.palette.waterMid, unlocked ? 1 : 0.35);
    swatch.fillRect(4, 24, CARD_W - 8, 20);
    card.add(swatch);

    if (!unlocked) {
      card.add(scene.add.image(CARD_W / 2, 14, TEX.lock).setScale(1.1));
    }

    const name = scene.add
      .text(CARD_W / 2, 50, loc.name, { ...TEXT_STYLE, fontSize: "11px", color: unlocked ? "#f4f1de" : "#6b6f7a", align: "center", wordWrap: { width: CARD_W - 12 } })
      .setOrigin(0.5, 0);
    card.add(name);

    const tierText = scene.add
      .text(CARD_W / 2, 84, `${loc.minRarity.toUpperCase()}\n– ${loc.maxRarity.toUpperCase()}`, {
        ...TEXT_STYLE,
        fontSize: "9px",
        color: "#9aa0b4",
        align: "center",
      })
      .setOrigin(0.5, 0);
    card.add(tierText);

    const rec = recommendedBaitFor(loc);
    card.add(
      scene.add
        .text(CARD_W / 2, 118, `REC: ${rec.name}`, { ...TEXT_STYLE, fontSize: "8px", color: "#8ecae6" })
        .setOrigin(0.5, 0)
    );

    const btnY = CARD_H - 20;
    if (!unlocked) {
      card.add(
        scene.add.text(CARD_W / 2, btnY - 22, `${loc.unlockCost}c`, { ...TEXT_STYLE, fontSize: "11px", color: "#ffd93d" }).setOrigin(0.5)
      );
      card.add(
        makeButton(scene, CARD_W / 2, btnY, CARD_W - 16, 26, affordable ? "UNLOCK" : "LOCKED", affordable ? 0xffd93d : 0x3a3f4a, () => {
          if (!affordable) return;
          if (this.economy.unlockLocation(loc.id, loc.unlockCost)) {
            this.onUnlock();
            this.open();
          }
        })
      );
    } else if (current) {
      card.add(makeButton(scene, CARD_W / 2, btnY, CARD_W - 16, 26, "HERE", 0x6b6f7a, () => {}));
    } else {
      card.add(
        makeButton(scene, CARD_W / 2, btnY, CARD_W - 16, 26, "GO", 0x6bcb77, () => {
          this.economy.travelTo(loc.id);
          this.onTravel(loc.id);
          this.close();
        })
      );
    }
  }
}
