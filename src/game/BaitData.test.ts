import { describe, expect, it } from "vitest";
import { BAITS, tuningForBait } from "./BaitData";
import { stepReel, type ReelState } from "./ReelMath";

describe("tuningForBait", () => {
  it("never lets continuous holding (no resting) land a catch, on any bait", () => {
    // Regression test: bait tiers used to reduce tension buildup while
    // holding, which for the second tier and up flipped the balance so you
    // could just hold the whole fight with zero timing and still land it —
    // the reeling minigame stopped requiring any skill at all. Better bait
    // is only allowed to make RESTING more effective, never make pure
    // holding safe.
    for (const bait of BAITS) {
      const tuning = tuningForBait(bait);
      let state: ReelState = { progress: 22, tension: 0 };
      let outcome: "reeling" | "caught" | "snapped" | "escaped" = "reeling";
      for (let i = 0; i < 2000 && outcome === "reeling"; i++) {
        ({ state, outcome } = stepReel(state, 1 / 60, true, 0, 0, tuning));
      }
      expect(outcome, `${bait.name} let continuous holding reach "${outcome}" instead of snapping`).toBe("snapped");
    }
  });
});
