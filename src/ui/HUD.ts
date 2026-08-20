import type { GameApi } from "../services/GameApi";
import type { AudioManager } from "../audio/AudioManager";

export type NavTab = "fish" | "inventory" | "shop";

/** Top coin bar + bottom tab navigation. Pure DOM, no framework. */
export class HUD {
  private onTabChange: (tab: NavTab) => void;
  private activeTab: NavTab = "fish";

  constructor(
    private topEl: HTMLElement,
    private bottomEl: HTMLElement,
    private api: GameApi,
    private audio: AudioManager,
    onTabChange: (tab: NavTab) => void
  ) {
    this.onTabChange = onTabChange;
    this.renderTop();
    this.renderBottom();
    this.api.events.on("stateChanged", () => this.updateCoins());
  }

  private renderTop(): void {
    this.topEl.innerHTML = `
      <div class="coin-display" id="coin-display">🪙 0</div>
      <button class="mute-btn" id="mute-btn" aria-label="Toggle sound"></button>
    `;
    this.updateCoins();
    const muteBtn = this.topEl.querySelector<HTMLButtonElement>("#mute-btn")!;
    const syncMuteLabel = () => {
      muteBtn.textContent = this.audio.isMuted() ? "🔇" : "🔊";
    };
    syncMuteLabel();
    muteBtn.addEventListener("click", () => {
      this.audio.toggleMuted();
      syncMuteLabel();
      this.audio.play("click");
    });
  }

  private updateCoins(): void {
    const el = this.topEl.querySelector("#coin-display");
    if (el) el.textContent = `🪙 ${this.api.getState().coins.toLocaleString()}`;
  }

  private renderBottom(): void {
    this.bottomEl.innerHTML = `
      <button class="nav-btn active" data-tab="fish">🎣<span>Fish</span></button>
      <button class="nav-btn" data-tab="inventory">🎒<span>Inventory</span></button>
      <button class="nav-btn" data-tab="shop">🛒<span>Shop</span></button>
    `;
    this.bottomEl.querySelectorAll<HTMLButtonElement>(".nav-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tab = btn.dataset.tab as NavTab;
        this.audio.play("click");
        this.setActiveTab(tab);
        this.onTabChange(tab);
      });
    });
  }

  setActiveTab(tab: NavTab): void {
    this.activeTab = tab;
    this.bottomEl.querySelectorAll<HTMLButtonElement>(".nav-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tab);
    });
  }

  getActiveTab(): NavTab {
    return this.activeTab;
  }
}
