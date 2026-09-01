import Phaser from "phaser";
import { BottomSheet, TEXT_STYLE, VerticalScroller } from "./BottomSheet";
import { TEX } from "../game/Textures";
import type { Economy } from "../game/Economy";
import { FISH_SPECIES, RARITY_COLORS } from "../game/FishData";
import { locationById } from "../game/LocationData";

const COLS = 3;
const CELL_W = 108;
const CELL_H = 104;
const HEADER_H = 24;
const SHEET_H = 560;

export class FishdexPanel extends BottomSheet {
  constructor(scene: Phaser.Scene, private economy: Economy) {
    super(scene, "FISHDEX", SHEET_H);
  }

  protected onOpen(): void {
    this.render();
  }

  private render(): void {
    this.content.removeAll(true);
    const scene = this.scene;

    const startX = (this.sheetW - COLS * CELL_W) / 2;
    const rows = Math.ceil(FISH_SPECIES.length / COLS);
    const contentH = rows * CELL_H;

    const grid = scene.add.container(startX, HEADER_H);
    this.content.add(grid);

    FISH_SPECIES.forEach((species, i) => {
      const col = i % COLS;
      const rowIdx = Math.floor(i / COLS);
      const cx = col * CELL_W + CELL_W / 2;
      const cy = rowIdx * CELL_H + CELL_H / 2;
      const count = this.economy.discoveredFish[species.id] ?? 0;
      const discovered = count > 0;

      const cell = scene.add.container(cx, cy);
      grid.add(cell);

      const rarityColor = RARITY_COLORS[species.rarity];
      const bg = scene.add
        .rectangle(0, 0, CELL_W - 8, CELL_H - 8, 0x1e2230)
        .setStrokeStyle(2, discovered ? rarityColor : 0x000000, discovered ? 0.8 : 0.5);
      cell.add(bg);

      const sprite = scene.add.sprite(0, -18, TEX.fish(species.id), 0).setScale(0.9);
      if (!discovered) sprite.setTint(0x000000).setAlpha(0.4);
      cell.add(sprite);

      const name = scene.add.text(0, 12, discovered ? species.name : "???", { ...TEXT_STYLE, fontSize: "9px" }).setOrigin(0.5);
      cell.add(name);

      const loc = locationById(species.locationId);
      const sub = discovered ? `${species.rarity.toUpperCase()} · x${count}` : loc.name;
      cell.add(scene.add.text(0, 26, sub, { ...TEXT_STYLE, fontSize: "8px", color: "#9aa0b4" }).setOrigin(0.5));
    });

    const viewportH = this.sheetH - 44 - HEADER_H - 16;
    const scroller = new VerticalScroller(grid, viewportH, contentH, CELL_H, true);
    scroller.enableDrag(scene, this.content, this.sheetW / 2, HEADER_H + viewportH / 2, this.sheetW - 16, viewportH);

    // Header text is added last, on top of an opaque cover, so a
    // scrolled-past cell can't visually bleed over it — see the note on
    // BottomSheet's own header bar for why this can't just be clipped away.
    const headerCover = scene.add.graphics();
    headerCover.fillStyle(0x1c2030, 1);
    headerCover.fillRect(0, -12, this.sheetW, HEADER_H + 12);
    this.content.add(headerCover);

    const known = FISH_SPECIES.filter((f) => this.economy.discoveredFish[f.id]).length;
    this.content.add(
      scene.add.text(this.sheetW / 2, 0, `${known} / ${FISH_SPECIES.length} DISCOVERED`, { ...TEXT_STYLE, fontSize: "11px", color: "#9aa0b4" }).setOrigin(0.5)
    );
  }
}
