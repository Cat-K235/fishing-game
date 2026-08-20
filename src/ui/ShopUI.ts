import type { GameApi } from "../services/GameApi";
import type { AudioManager } from "../audio/AudioManager";
import type { Notifications } from "./Notifications";
import { ROD_LIST } from "../data/rods";
import { ShopSystem } from "../systems/ShopSystem";
import type { RodUiStatus } from "../types/game";

const STATUS_LABEL: Record<RodUiStatus, string> = {
  locked: "Locked",
  available: "Available",
  owned: "Owned",
  equipped: "Equipped",
};

/** Rod shop panel: view stats, buy, equip. */
export class ShopUI {
  constructor(
    private root: HTMLElement,
    private api: GameApi,
    private audio: AudioManager,
    private notifications: Notifications,
    private onPurchase: (rodName: string) => void,
    private onClose: () => void
  ) {
    this.api.events.on("stateChanged", () => {
      if (!this.root.classList.contains("hidden")) this.render();
    });
  }

  open(): void {
    this.root.classList.remove("hidden");
    this.render();
  }

  close(): void {
    this.root.classList.add("hidden");
    this.root.innerHTML = "";
  }

  private render(): void {
    const state = this.api.getState();
    const cards = ROD_LIST.map((rod) => {
      const status = ShopSystem.getRodStatus(rod, state);
      const canBuy = status === "available";
      const canEquip = status === "owned";
      return `
        <div class="rod-card status-${status}">
          <div class="rod-card-header">
            <span class="rod-name">${rod.name}</span>
            <span class="rod-status-badge">${STATUS_LABEL[status]}</span>
          </div>
          <div class="rod-stats">
            <span>Lv.${rod.level}</span>
            <span>⚡ Speed ${rod.speed}</span>
            <span>🍀 Luck ${rod.luck}</span>
          </div>
          <div class="rod-desc">${rod.description}</div>
          <div class="rod-actions">
            ${
              status === "equipped"
                ? `<span class="equipped-label">✓ Equipped</span>`
                : canEquip
                ? `<button class="action-btn secondary" data-equip="${rod.id}">Equip</button>`
                : `<button class="action-btn" data-buy="${rod.id}" ${canBuy ? "" : "disabled"}>
                     ${rod.cost === 0 ? "Free" : `🪙 ${rod.cost.toLocaleString()}`}
                   </button>`
            }
          </div>
        </div>
      `;
    }).join("");

    this.root.innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <span>🛒 Rod Shop</span>
          <button class="panel-close" id="shop-close">✕</button>
        </div>
        <div class="panel-body">${cards}</div>
      </div>
    `;

    this.root.querySelector("#shop-close")?.addEventListener("click", () => {
      this.audio.play("click");
      this.close();
      this.onClose();
    });

    this.root.querySelectorAll<HTMLButtonElement>("[data-buy]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rodId = btn.dataset.buy!;
        const rod = ROD_LIST.find((r) => r.id === rodId)!;
        const result = this.api.buyRod(rodId);
        if (result.ok) {
          this.audio.play("purchase");
          this.notifications.show(`Purchased ${rod.name}!`, "success");
          this.onPurchase(rod.name);
        } else if (result.reason === "insufficient_coins") {
          this.notifications.show("Not enough coins", "info");
        }
      });
    });

    this.root.querySelectorAll<HTMLButtonElement>("[data-equip]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rodId = btn.dataset.equip!;
        const rod = ROD_LIST.find((r) => r.id === rodId)!;
        if (this.api.equipRod(rodId)) {
          this.audio.play("click");
          this.notifications.show(`Equipped ${rod.name}`, "success");
        }
      });
    });
  }
}
