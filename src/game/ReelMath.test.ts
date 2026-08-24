import { describe, expect, it } from "vitest";
import { stepReel, type ReelState } from "./ReelMath";

const start: ReelState = { progress: 50, tension: 50 };

describe("stepReel", () => {
  it("gains progress and tension while holding", () => {
    const { state, outcome } = stepReel(start, 0.5, true, 0, 0.5);
    expect(state.progress).toBeGreaterThan(start.progress);
    expect(state.tension).toBeGreaterThan(start.tension);
    expect(outcome).toBe("reeling");
  });

  it("loses progress and cools tension while resting", () => {
    const { state } = stepReel(start, 0.5, false, 0, 0.5);
    expect(state.progress).toBeLessThan(start.progress);
    expect(state.tension).toBeLessThan(start.tension);
  });

  it("snaps the line once tension hits 100", () => {
    const { state, outcome } = stepReel({ progress: 50, tension: 99 }, 1, true, 1, 1);
    expect(state.tension).toBe(100);
    expect(outcome).toBe("snapped");
  });

  it("lands the catch once progress hits 100", () => {
    const { state, outcome } = stepReel({ progress: 99, tension: 10 }, 1, true, 0, 0);
    expect(state.progress).toBe(100);
    expect(outcome).toBe("caught");
  });

  it("lets the fish escape once progress bottoms out", () => {
    const { state, outcome } = stepReel({ progress: 1, tension: 10 }, 1, false, 1, 1);
    expect(state.progress).toBe(0);
    expect(outcome).toBe("escaped");
  });

  it("clamps progress and tension to [0, 100]", () => {
    const { state } = stepReel({ progress: 0, tension: 0 }, 5, false, 1, 1);
    expect(state.progress).toBe(0);
    expect(state.tension).toBe(0);
  });
});
