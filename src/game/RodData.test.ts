import { describe, expect, it } from "vitest";
import { RODS, tuningForRod } from "./RodData";
import { stepReel, type ReelState } from "./ReelMath";

describe("tuningForRod", () => {
  it("never lets continuous holding (no resting) land a catch, on any rod", () => {
    // Regression test: rods used to reduce tension buildup while holding,
    // which for Iron+ flipped the balance so you could just hold the whole
    // fight with zero timing and still land it — the reeling minigame
    // stopped requiring any skill at all. A better rod is only allowed to
    // make RESTING more effective, never make pure holding safe.
    for (const rod of RODS) {
      const tuning = tuningForRod(rod);
      let state: ReelState = { progress: 22, tension: 0 };
      let outcome: "reeling" | "caught" | "snapped" | "escaped" = "reeling";
      for (let i = 0; i < 2000 && outcome === "reeling"; i++) {
        ({ state, outcome } = stepReel(state, 1 / 60, true, 0, 0, tuning));
      }
      expect(outcome, `${rod.name} let continuous holding reach "${outcome}" instead of snapping`).toBe("snapped");
    }
  });
});
