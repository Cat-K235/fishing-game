import Phaser from "phaser";
import { BottomSheet, TEXT_STYLE, makeButton, VerticalScroller } from "./BottomSheet";
import { TEX } from "../game/Textures";
import type { Economy } from "../game/Economy";
import { RARITY_COLORS } from "../game/FishData";

const COLS = 3;
const CELL_W = 108;
const CELL_H = 96;
const FOOTER_H = 46;
const SHEET_H = 560;

export class SellPanel extends BottomSheet {
  private selected = new Set<string>();

  constructor(scene: Phaser.Scene, private economy: Economy, private onSold: (coinsEarned: number) => void) {
    super(scene, "SELL FISH", SHEET_H);
  }

  protected onOpen(): void {
    this.selected.clear();
    this.render();
  }

  private render(): void {
    this.content.removeAll(true);
    const scene = this.scene;
    const rows = this.economy.inventoryWithSpecies();

    if (rows.length === 0) {
      this.content.add(
        scene.add.text(this.sheetW / 2, 100, "No fish yet —\ngo catch some!", { ...TEXT_STYLE, fontSize: "13px", align: "center" }).setOrigin(0.5)
      );
      return;
    }

    const startX = (this.sheetW - COLS * CELL_W) / 2;
    const gridRows = Math.ceil(rows.length / COLS);
    const contentH = gridRows * CELL_H;

    const grid = scene.add.container(startX, 0);
    this.content.add(grid);

    rows.forEach((row, i) => {
      const col = i % COLS;
      const rowIdx = Math.floor(i / COLS);
      const cx = col * CELL_W + CELL_W / 2;
      const cy = rowIdx * CELL_H + CELL_H / 2;
      const isSelected = this.selected.has(row.entry.uid);

      const cell = scene.add.container(cx, cy);
      grid.add(cell);

      const rarityColor = RARITY_COLORS[row.species.rarity] ?? 0x9aa0b4;
      const bg = scene.add
        .rectangle(0, 0, CELL_W - 8, CELL_H - 8, isSelected ? 0x33405a : 0x1e2230)
        .setStrokeStyle(2, isSelected ? 0xffd93d : rarityColor, isSelected ? 1 : 0.6);
      cell.add(bg);

      const sprite = scene.add.sprite(0, -14, TEX.fish(row.species.id), 0).setScale(0.9);
      cell.add(sprite);

      const name = scene.add.text(0, 14, row.species.name, { ...TEXT_STYLE, fontSize: "9px" }).setOrigin(0.5);
      cell.add(name);
      const value = scene.add.text(0, 28, `${row.species.sellValue}c`, { ...TEXT_STYLE, fontSize: "10px", color: "#ffd93d" }).setOrigin(0.5);
      cell.add(value);

      bg.setInteractive({ useHandCursor: true }).on(
        "pointerdown",
        (_p: unknown, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
          ev.stopPropagation();
          if (isSelected) this.selected.delete(row.entry.uid);
          else this.selected.add(row.entry.uid);
          this.render();
        }
      );
    });

    const viewportH = this.sheetH - 44 - FOOTER_H - 16;
    this.clipContent(grid, 0, 0, this.sheetW, viewportH);
    const scroller = new VerticalScroller(grid, viewportH, contentH);
    scroller.enableDrag(scene, this.content, this.sheetW / 2, viewportH / 2, this.sheetW - 16, viewportH);

    const footerY = viewportH + 24;
    this.content.add(
      makeButton(scene, this.sheetW / 2 - 90, footerY, 160, 30, `SELL SELECTED (${this.selected.size})`, this.selected.size ? 0xffd93d : 0x3a3f4a, () => {
        if (this.selected.size === 0) return;
        const earned = this.economy.sell(Array.from(this.selected));
        this.selected.clear();
        this.onSold(earned);
        this.render();
      })
    );
    this.content.add(
      makeButton(scene, this.sheetW / 2 + 90, footerY, 140, 30, "SELL ALL", 0x6bcb77, () => {
        const earned = this.economy.sell();
        this.selected.clear();
        this.onSold(earned);
        this.render();
      })
    );
  }
}
