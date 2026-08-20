import type { Game } from "../game/Game";
import type { CatchResult } from "../types/game";

const RARITY_LABEL: Record<string, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  very_rare: "Very Rare",
};

/** Full-screen-ish "you caught a fish!" reveal card. */
export class CatchResultUI {
  constructor(private root: HTMLElement, private game: Game) {
    game.events.on("fishCaught", (result) => this.show(result));
    game.events.on("fishingStateChanged", ({ state }) => {
      if (state === "IDLE") this.hide();
    });
  }

  private show(result: CatchResult): void {
    const { fish } = result;
    this.root.innerHTML = `
      <div class="catch-card rarity-${fish.rarity}">
        <div class="catch-title">Caught!</div>
        <div class="catch-sprite">${fish.sprite}</div>
        <div class="catch-name">${fish.name}</div>
        <div class="catch-meta">
          <span>Lv.${fish.level}</span>
          <span>${RARITY_LABEL[fish.rarity] ?? fish.rarity}</span>
          <span>🪙${fish.value}</span>
        </div>
        <button class="action-btn catch-ok-btn" id="catch-ok-btn">OK</button>
      </div>
    `;
    this.root.classList.remove("hidden");
    this.root.querySelector("#catch-ok-btn")?.addEventListener("click", () => {
      this.game.acknowledgeCatch();
      this.hide();
    });
  }

  private hide(): void {
    this.root.classList.add("hidden");
    this.root.innerHTML = "";
  }
}
