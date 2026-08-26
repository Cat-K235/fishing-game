import Phaser from "phaser";
import { BottomSheet, TEXT_STYLE, makeButton } from "./BottomSheet";
import { TEX } from "../game/Textures";
import type { Economy } from "../game/Economy";
import { WORLD_W } from "../game/Constants";
import { FISH_SPECIES, RARITY_COLORS } from "../game/FishData";
import { locationById } from "../game/LocationData";

const COLS = 3;
const CELL_W = 108;
const CELL_H = 104;
const ROWS_PER_PAGE = 2;
const PAGE_SIZE = COLS * ROWS_PER_PAGE;

export class FishdexPanel extends BottomSheet {
  private page = 0;

  constructor(scene: Phaser.Scene, private economy: Economy) {
    super(scene, "FISHDEX", 344);
  }

  protected onOpen(): void {
    this.page = 0;
    this.render();
  }

  private render(): void {
    this.content.removeAll(true);
    const scene = this.scene;

    const known = FISH_SPECIES.filter((f) => this.economy.discoveredFish[f.id]).length;
    this.content.add(
      scene.add.text(WORLD_W / 2, -18, `${known} / ${FISH_SPECIES.length} DISCOVERED`, { ...TEXT_STYLE, fontSize: "11px", color: "#9aa0b4" }).setOrigin(0.5)
    );

    const startX = (WORLD_W - COLS * CELL_W) / 2;
    const grid = scene.add.container(startX, 0);
    this.content.add(grid);

    const pageStart = this.page * PAGE_SIZE;
    const pageSpecies = FISH_SPECIES.slice(pageStart, pageStart + PAGE_SIZE);

    pageSpecies.forEach((species, i) => {
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

    if (FISH_SPECIES.length > PAGE_SIZE) {
      const maxPage = Math.ceil(FISH_SPECIES.length / PAGE_SIZE) - 1;
      if (this.page > 0) this.content.add(makeButton(scene, 30, 214, 40, 24, "<", 0x8ecae6, () => this.changePage(-1)));
      if (this.page < maxPage) this.content.add(makeButton(scene, WORLD_W - 30, 214, 40, 24, ">", 0x8ecae6, () => this.changePage(1)));
    }
  }

  private changePage(delta: number): void {
    this.page += delta;
    this.render();
  }
}
