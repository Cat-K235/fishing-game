import { describe, expect, it, vi } from "vitest";
import { FishingStateMachine } from "./FishingStateMachine";
import { FISHING_CONFIG } from "./fishingConfig";

describe("FishingStateMachine", () => {
  it("starts IDLE and cannot reel or be started twice while active", () => {
    const machine = new FishingStateMachine({ rollBiteDelayMs: () => 100 });
    expect(machine.getState()).toBe("IDLE");
    expect(machine.reel()).toBe(false);

    expect(machine.start()).toBe(true);
    expect(machine.getState()).toBe("CASTING");
    expect(machine.start()).toBe(false); // already active
  });

  it("walks the full happy path: CASTING -> WAITING -> BITING -> REELING -> CAUGHT -> RESULT -> IDLE", () => {
    const events: string[] = [];
    let caught = false;
    const machine = new FishingStateMachine({
      rollBiteDelayMs: () => 500,
      onStateChange: (s) => events.push(s),
      onBite: () => events.push("BITE_EVENT"),
      onCaught: () => (caught = true),
    });

    machine.start();
    expect(events).toEqual(["CASTING"]);

    machine.update(FISHING_CONFIG.castDurationMs);
    expect(machine.getState()).toBe("WAITING");

    machine.update(500);
    expect(machine.getState()).toBe("BITING");
    expect(events).toContain("BITE_EVENT");

    expect(machine.reel()).toBe(true);
    expect(machine.getState()).toBe("REELING");

    machine.update(FISHING_CONFIG.reelDurationMs);
    expect(caught).toBe(true);
    expect(machine.getState()).toBe("RESULT");

    machine.update(FISHING_CONFIG.resultDurationMs);
    expect(machine.getState()).toBe("IDLE");
  });

  it("lets the fish escape if the player doesn't reel in time", () => {
    const onFishEscaped = vi.fn();
    const machine = new FishingStateMachine({
      rollBiteDelayMs: () => 100,
      onFishEscaped,
    });

    machine.start();
    machine.update(FISHING_CONFIG.castDurationMs); // -> WAITING
    machine.update(100); // -> BITING
    expect(machine.getState()).toBe("BITING");

    machine.update(FISHING_CONFIG.biteWindowMs); // bite window expires
    expect(machine.getState()).toBe("IDLE");
    expect(onFishEscaped).toHaveBeenCalledOnce();
  });

  it("ignores reel() outside the BITING state", () => {
    const machine = new FishingStateMachine({ rollBiteDelayMs: () => 100 });
    machine.start();
    expect(machine.reel()).toBe(false); // still CASTING
  });

  it("can acknowledge early to skip the rest of the RESULT display", () => {
    const machine = new FishingStateMachine({ rollBiteDelayMs: () => 10 });
    machine.start();
    machine.update(FISHING_CONFIG.castDurationMs);
    machine.update(10);
    machine.reel();
    machine.update(FISHING_CONFIG.reelDurationMs);
    expect(machine.getState()).toBe("RESULT");
    machine.acknowledge();
    expect(machine.getState()).toBe("IDLE");
  });
});
