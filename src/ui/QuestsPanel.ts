import Phaser from "phaser";
import { BottomSheet, TEXT_STYLE, drawStatBar, makeButton, VerticalScroller } from "./BottomSheet";
import type { Economy } from "../game/Economy";
import { QUESTS, isQuestComplete, type QuestProgress } from "../game/QuestData";

const ROW_H = 54;
const HEADER_H = 24;
const SHEET_H = 560;

export class QuestsPanel extends BottomSheet {
  constructor(scene: Phaser.Scene, private economy: Economy, private onClaim: (reward: number) => void) {
    super(scene, "QUESTS", SHEET_H);
  }

  protected onOpen(): void {
    this.render();
  }

  private progress(): QuestProgress {
    return {
      totalCasts: this.economy.totalCasts,
      totalCatches: this.economy.totalCatches,
      totalSold: this.economy.totalSold,
      bestRarityIndex: this.economy.bestRarityIndex,
      ownedRodCount: this.economy.ownedRodIds.length,
      unlockedLocationCount: this.economy.unlockedLocationIds.length,
    };
  }

  private render(): void {
    this.content.removeAll(true);
    const scene = this.scene;
    const p = this.progress();

    const list = scene.add.container(16, HEADER_H);
    this.content.add(list);
    const barW = this.sheetW - 32 - 78;

    QUESTS.forEach((quest, i) => {
      const y = i * ROW_H;
      const claimed = this.economy.isQuestClaimed(quest.id);
      const complete = isQuestComplete(quest, p);
      const current = Math.min(quest.progress(p), quest.target);

      const row = scene.add.container(0, y);
      list.add(row);

      const desc = scene.add.text(0, 0, quest.description, { ...TEXT_STYLE, fontSize: "11px", color: claimed ? "#6b6f7a" : "#f4f1de" });
      row.add(desc);

      row.add(drawStatBar(scene, 0, 18, barW, current / quest.target, claimed ? 0x3a3f4a : complete ? 0x6bcb77 : 0x8ecae6));
      row.add(
        scene.add.text(0, 26, `${current}/${quest.target}  ·  +${quest.reward}c`, { ...TEXT_STYLE, fontSize: "9px", color: "#9aa0b4" })
      );

      if (claimed) {
        row.add(makeButton(scene, barW + 40, 14, 68, 26, "DONE", 0x3a3f4a, () => {}));
      } else if (complete) {
        row.add(
          makeButton(scene, barW + 40, 14, 68, 26, "CLAIM", 0xffd93d, () => {
            this.economy.claimQuest(quest.id, quest.reward);
            this.onClaim(quest.reward);
            this.render();
          })
        );
      } else {
        row.add(makeButton(scene, barW + 40, 14, 68, 26, "LOCKED", 0x22273a, () => {}));
      }
    });

    const contentH = QUESTS.length * ROW_H;
    const viewportH = this.sheetH - 44 - HEADER_H - 16;
    const scroller = new VerticalScroller(list, viewportH, contentH, ROW_H);
    scroller.enableDrag(scene, this.content, this.sheetW / 2, HEADER_H + viewportH / 2, this.sheetW - 16, viewportH);

    // Header text is added last, on top of an opaque cover, so a
    // scrolled-past row can't visually bleed over it — see the note on
    // BottomSheet's own header bar for why this can't just be clipped away.
    const headerCover = scene.add.graphics();
    headerCover.fillStyle(0x1c2030, 1);
    headerCover.fillRect(0, -12, this.sheetW, HEADER_H + 12);
    this.content.add(headerCover);

    const claimedCount = QUESTS.filter((q) => this.economy.isQuestClaimed(q.id)).length;
    this.content.add(
      scene.add.text(this.sheetW / 2, 0, `${claimedCount} / ${QUESTS.length} CLAIMED`, { ...TEXT_STYLE, fontSize: "11px", color: "#9aa0b4" }).setOrigin(0.5)
    );
  }
}
