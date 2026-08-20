import type { Game } from "../game/Game";
import type { ZoneId } from "../game/World";
import type { FishingStateName } from "../types/game";
import type { AudioManager } from "../audio/AudioManager";

const STATUS_LABEL: Partial<Record<FishingStateName, string>> = {
  CASTING: "Casting...",
  WAITING: "Waiting for a bite...",
  REELING: "Reeling in...",
};

/**
 * Contextual "🎣 CAST / 🏪 ROD SHOP / 💰 SELL FISH" button that appears when
 * the player walks into a zone, plus the big REEL! button during a bite.
 * Lives above the bottom nav so it never covers much of the game world.
 */
export class FishingHUD {
  constructor(
    private game: Game,
    private zoneHintEl: HTMLElement,
    private fishingHudEl: HTMLElement,
    private audio: AudioManager,
    private onOpenShop: () => void,
    private onOpenSell: () => void
  ) {
    game.events.on("zoneChanged", () => this.render());
    game.events.on("fishingStateChanged", () => this.render());
    this.render();
  }

  private render(): void {
    const fishingState = this.game.getFishingState();
    this.renderFishingStatus(fishingState);
    this.renderZoneHint(fishingState, this.game.getActiveZone());
  }

  private renderZoneHint(fishingState: FishingStateName, zone: ZoneId | null): void {
    if (fishingState !== "IDLE" || !zone) {
      this.zoneHintEl.classList.add("hidden");
      this.zoneHintEl.innerHTML = "";
      return;
    }
    this.zoneHintEl.classList.remove("hidden");
    if (zone === "fishing") {
      this.zoneHintEl.innerHTML = `<button class="action-btn cast-btn" id="cast-btn">🎣 CAST</button>`;
      this.zoneHintEl.querySelector("#cast-btn")?.addEventListener("click", () => {
        this.audio.play("click");
        this.game.cast();
      });
    } else if (zone === "shop") {
      this.zoneHintEl.innerHTML = `<button class="action-btn shop-btn" id="shop-btn">🏪 ROD SHOP</button>`;
      this.zoneHintEl.querySelector("#shop-btn")?.addEventListener("click", () => {
        this.audio.play("click");
        this.onOpenShop();
      });
    } else if (zone === "sell") {
      this.zoneHintEl.innerHTML = `<button class="action-btn sell-btn" id="sell-btn">💰 SELL FISH</button>`;
      this.zoneHintEl.querySelector("#sell-btn")?.addEventListener("click", () => {
        this.audio.play("click");
        this.onOpenSell();
      });
    }
  }

  private renderFishingStatus(state: FishingStateName): void {
    if (state === "BITING") {
      this.fishingHudEl.innerHTML = `<button class="action-btn reel-btn" id="reel-btn">🎣 REEL!</button>`;
      this.fishingHudEl.querySelector("#reel-btn")?.addEventListener("click", () => {
        this.game.reel();
      });
      return;
    }
    const label = STATUS_LABEL[state];
    if (label) {
      this.fishingHudEl.innerHTML = `<div class="fishing-status">${label}</div>`;
      return;
    }
    this.fishingHudEl.innerHTML = "";
  }
}
