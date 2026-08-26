import Phaser from "phaser";
import { BottomSheet, TEXT_STYLE, makeButton } from "./BottomSheet";
import { TEX } from "../game/Textures";
import type { Economy } from "../game/Economy";
import { WORLD_W } from "../game/Constants";
import { RARITY_COLORS } from "../game/FishData";

const COLS = 3;
const CELL_W = 108;
const CELL_H = 96;
const ROWS_PER_PAGE = 2;
const PAGE_SIZE = COLS * ROWS_PER_PAGE;

export class SellPanel extends BottomSheet {
  private selected = new Set<string>();
  private page = 0;

  constructor(scene: Phaser.Scene, private economy: Economy, private onSold: (coinsEarned: number) => void) {
    super(scene, "SELL FISH", 340);
  }

  protected onOpen(): void {
    this.selected.clear();
    this.page = 0;
    this.render();
  }

  private render(): void {
    this.content.removeAll(true);
    const scene = this.scene;
    const rows = this.economy.inventoryWithSpecies();

    if (rows.length === 0) {
      this.content.add(
        scene.add.text(WORLD_W / 2, 100, "No fish yet —\ngo catch some!", { ...TEXT_STYLE, fontSize: "13px", align: "center" }).setOrigin(0.5)
      );
      return;
    }

    const startX = (WORLD_W - (COLS * CELL_W)) / 2;
    const grid = scene.add.container(startX, 0);
    this.content.add(grid);

    const pageStart = this.page * PAGE_SIZE;
    const pageRows = rows.slice(pageStart, pageStart + PAGE_SIZE);

    pageRows.forEach((row, i) => {
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

    if (rows.length > PAGE_SIZE) {
      const maxPage = Math.ceil(rows.length / PAGE_SIZE) - 1;
      if (this.page > 0) this.content.add(makeButton(scene, 30, 200, 40, 24, "<", 0x8ecae6, () => this.changePage(-1)));
      if (this.page < maxPage) this.content.add(makeButton(scene, WORLD_W - 30, 200, 40, 24, ">", 0x8ecae6, () => this.changePage(1)));
    }

    this.content.add(
      makeButton(scene, WORLD_W / 2 - 90, 236, 160, 30, `SELL SELECTED (${this.selected.size})`, this.selected.size ? 0xffd93d : 0x3a3f4a, () => {
        if (this.selected.size === 0) return;
        const earned = this.economy.sell(Array.from(this.selected));
        this.selected.clear();
        this.onSold(earned);
        this.render();
      })
    );
    this.content.add(
      makeButton(scene, WORLD_W / 2 + 90, 236, 140, 30, "SELL ALL", 0x6bcb77, () => {
        const earned = this.economy.sell();
        this.selected.clear();
        this.onSold(earned);
        this.render();
      })
    );
  }

  private changePage(delta: number): void {
    this.page += delta;
    this.render();
  }
}
