import type { GameApi } from "../services/GameApi";
import type { AudioManager } from "../audio/AudioManager";
import type { Notifications } from "./Notifications";
import { getFish } from "../data/fish";

/**
 * Inventory + sell panel. Doubles as the "sell interface" opened from the
 * sell-stand zone, per the design spec — it doesn't need a separate screen.
 */
export class InventoryUI {
  private selected = new Set<string>();

  constructor(
    private root: HTMLElement,
    private api: GameApi,
    private audio: AudioManager,
    private notifications: Notifications,
    private onCoinsEarned: (amount: number) => void,
    private onClose: () => void
  ) {
    this.api.events.on("stateChanged", () => {
      if (!this.root.classList.contains("hidden")) this.render();
    });
  }

  open(): void {
    this.selected.clear();
    this.root.classList.remove("hidden");
    this.render();
  }

  close(): void {
    this.root.classList.add("hidden");
    this.root.innerHTML = "";
  }

  private render(): void {
    const inventory = this.api.getState().inventory;
    const rows = inventory
      .filter((e) => e.quantity > 0)
      .map((entry) => {
        const fish = getFish(entry.fishId);
        const total = fish.value * entry.quantity;
        const checked = this.selected.has(entry.fishId) ? "checked" : "";
        return `
          <div class="inventory-row" data-fish="${fish.id}">
            <label class="inventory-checkbox">
              <input type="checkbox" data-select="${fish.id}" ${checked} />
              <span class="fish-icon">${fish.sprite}</span>
            </label>
            <div class="inventory-info">
              <div class="fish-name">${fish.name} <span class="fish-level">Lv.${fish.level}</span></div>
              <div class="fish-sub">x${entry.quantity} &middot; 🪙${fish.value} ea</div>
            </div>
            <div class="fish-total">🪙${total}</div>
            <button class="mini-btn" data-sell-one="${fish.id}">Sell</button>
          </div>
        `;
      })
      .join("");

    this.root.innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <span>🎒 Inventory</span>
          <button class="panel-close" id="inv-close">✕</button>
        </div>
        <div class="panel-body">
          ${rows || `<div class="empty-state">No fish yet. Go cast a line!</div>`}
        </div>
        <div class="panel-footer">
          <button class="action-btn secondary" id="sell-selected-btn">Sell Selected</button>
          <button class="action-btn" id="sell-all-btn">Sell All</button>
        </div>
      </div>
    `;

    this.root.querySelector("#inv-close")?.addEventListener("click", () => {
      this.audio.play("click");
      this.close();
      this.onClose();
    });

    this.root.querySelectorAll<HTMLInputElement>("[data-select]").forEach((input) => {
      input.addEventListener("change", () => {
        const id = input.dataset.select!;
        if (input.checked) this.selected.add(id);
        else this.selected.delete(id);
      });
    });

    this.root.querySelectorAll<HTMLButtonElement>("[data-sell-one]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const fishId = btn.dataset.sellOne!;
        const qty = inventory.find((e) => e.fishId === fishId)?.quantity ?? 0;
        this.sell(() => this.api.sellFish(fishId, qty));
      });
    });

    this.root.querySelector("#sell-all-btn")?.addEventListener("click", () => {
      this.sell(() => this.api.sellAll());
    });

    this.root.querySelector("#sell-selected-btn")?.addEventListener("click", () => {
      if (this.selected.size === 0) {
        this.notifications.show("Select fish to sell first", "info");
        return;
      }
      const ids = [...this.selected];
      this.sell(() => {
        let coinsEarned = 0;
        for (const id of ids) {
          const qty = inventory.find((e) => e.fishId === id)?.quantity ?? 0;
          coinsEarned += this.api.sellFish(id, qty).coinsEarned;
        }
        return { coinsEarned };
      });
      this.selected.clear();
    });
  }

  private sell(action: () => { coinsEarned: number }): void {
    const result = action();
    if (result.coinsEarned <= 0) return;
    this.audio.play("coin");
    this.notifications.show(`+${result.coinsEarned} Coins`, "coin");
    this.onCoinsEarned(result.coinsEarned);
  }
}
