import { describe, expect, it } from "vitest";
import { QUESTS, isQuestComplete, type QuestProgress } from "./QuestData";

const zero: QuestProgress = {
  totalCasts: 0,
  totalCatches: 0,
  totalSold: 0,
  bestRarityIndex: -1,
  ownedRodCount: 1,
  unlockedLocationCount: 1,
};

describe("isQuestComplete", () => {
  it("is false for every quest at a fresh save", () => {
    for (const q of QUESTS) expect(isQuestComplete(q, zero)).toBe(false);
  });

  it("completes a count-based quest once its target is met", () => {
    const q = QUESTS.find((x) => x.id === "catch-10")!;
    expect(isQuestComplete(q, { ...zero, totalCatches: 9 })).toBe(false);
    expect(isQuestComplete(q, { ...zero, totalCatches: 10 })).toBe(true);
  });

  it("completes a rarity-threshold quest at or above the target rarity", () => {
    const q = QUESTS.find((x) => x.id === "rarity-epic")!;
    expect(isQuestComplete(q, { ...zero, bestRarityIndex: 2 })).toBe(false);
    expect(isQuestComplete(q, { ...zero, bestRarityIndex: 3 })).toBe(true);
    expect(isQuestComplete(q, { ...zero, bestRarityIndex: 4 })).toBe(true);
  });
});
