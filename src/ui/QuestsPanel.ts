import Phaser from "phaser";
import { BottomSheet, TEXT_STYLE, drawStatBar, makeButton } from "./BottomSheet";
import type { Economy } from "../game/Economy";
import { WORLD_W } from "../game/Constants";
import { QUESTS, isQuestComplete, type QuestProgress } from "../game/QuestData";

const ROW_H = 54;
const ROWS_PER_PAGE = 5;

export class QuestsPanel extends BottomSheet {
  private page = 0;

  constructor(scene: Phaser.Scene, private economy: Economy, private onClaim: (reward: number) => void) {
    super(scene, "QUESTS", 340);
  }

  protected onOpen(): void {
    this.page = 0;
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

    const claimedCount = QUESTS.filter((q) => this.economy.isQuestClaimed(q.id)).length;
    this.content.add(
      scene.add.text(WORLD_W / 2, -18, `${claimedCount} / ${QUESTS.length} CLAIMED`, { ...TEXT_STYLE, fontSize: "11px", color: "#9aa0b4" }).setOrigin(0.5)
    );

    const pageStart = this.page * ROWS_PER_PAGE;
    const pageQuests = QUESTS.slice(pageStart, pageStart + ROWS_PER_PAGE);

    pageQuests.forEach((quest, i) => {
      const y = i * ROW_H + 6;
      const claimed = this.economy.isQuestClaimed(quest.id);
      const complete = isQuestComplete(quest, p);
      const current = Math.min(quest.progress(p), quest.target);

      const row = scene.add.container(16, y);
      this.content.add(row);

      const desc = scene.add.text(0, 0, quest.description, { ...TEXT_STYLE, fontSize: "11px", color: claimed ? "#6b6f7a" : "#f4f1de" });
      row.add(desc);

      const barW = WORLD_W - 32 - 78;
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

    if (QUESTS.length > ROWS_PER_PAGE) {
      const maxPage = Math.ceil(QUESTS.length / ROWS_PER_PAGE) - 1;
      const pagerY = ROWS_PER_PAGE * ROW_H + 14;
      if (this.page > 0) this.content.add(makeButton(scene, WORLD_W / 2 - 50, pagerY, 40, 24, "<", 0x8ecae6, () => this.changePage(-1)));
      if (this.page < maxPage) this.content.add(makeButton(scene, WORLD_W / 2 + 50, pagerY, 40, 24, ">", 0x8ecae6, () => this.changePage(1)));
    }
  }

  private changePage(delta: number): void {
    this.page += delta;
    this.render();
  }
}
