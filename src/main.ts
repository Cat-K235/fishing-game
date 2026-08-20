import "./styles/main.css";
import { TelegramService } from "./telegram/TelegramService";
import { AudioManager } from "./audio/AudioManager";
import { LocalRepository } from "./persistence/LocalRepository";
import { LocalGameApi } from "./services/LocalGameApi";
import { Game } from "./game/Game";
import { VIEW_WIDTH, VIEW_HEIGHT } from "./game/Renderer";
import { HUD, type NavTab } from "./ui/HUD";
import { FishingHUD } from "./ui/FishingHUD";
import { CatchResultUI } from "./ui/CatchResultUI";
import { InventoryUI } from "./ui/InventoryUI";
import { ShopUI } from "./ui/ShopUI";
import { Notifications } from "./ui/Notifications";

function required<T extends Element>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id} in index.html`);
  return el as unknown as T;
}

function main(): void {
  const telegram = new TelegramService();
  telegram.init();

  const audio = new AudioManager();
  const repository = new LocalRepository();
  const api = new LocalGameApi(repository);

  const canvas = required<HTMLCanvasElement>("game-canvas");
  canvas.width = VIEW_WIDTH;
  canvas.height = VIEW_HEIGHT;

  const joystickBase = required<HTMLElement>("joystick-base");
  const joystickStick = required<HTMLElement>("joystick-stick");
  const game = new Game(canvas, joystickBase, joystickStick, api, audio);

  const toastRoot = required<HTMLElement>("toast-root");
  const notifications = new Notifications(toastRoot);

  const inventoryPanel = required<HTMLElement>("inventory-panel");
  const shopPanel = required<HTMLElement>("shop-panel");

  const inventoryUI = new InventoryUI(
    inventoryPanel,
    api,
    audio,
    notifications,
    (amount) => game.spawnCoinPopup(amount),
    () => hud.setActiveTab("fish")
  );

  const shopUI = new ShopUI(
    shopPanel,
    api,
    audio,
    notifications,
    (rodName) => game.spawnPurchasePopup(rodName),
    () => hud.setActiveTab("fish")
  );

  function closeAllPanels(): void {
    inventoryUI.close();
    shopUI.close();
  }

  function openTab(tab: NavTab): void {
    closeAllPanels();
    if (tab === "inventory") inventoryUI.open();
    else if (tab === "shop") shopUI.open();
    hud.setActiveTab(tab);
  }

  const hud = new HUD(
    required<HTMLElement>("hud-top"),
    required<HTMLElement>("bottom-nav"),
    api,
    audio,
    (tab) => openTab(tab)
  );

  new FishingHUD(
    game,
    required<HTMLElement>("zone-hint"),
    required<HTMLElement>("fishing-hud"),
    audio,
    () => openTab("shop"),
    () => openTab("inventory")
  );

  new CatchResultUI(required<HTMLElement>("catch-overlay-root"), game);

  fitCanvasToContainer(canvas);
  window.addEventListener("resize", () => fitCanvasToContainer(canvas));

  game.start();
}

/** Scales the fixed-resolution canvas to fit its container while keeping the pixel-art aspect ratio crisp. */
function fitCanvasToContainer(canvas: HTMLCanvasElement): void {
  const container = canvas.parentElement;
  if (!container) return;
  const { clientWidth, clientHeight } = container;
  const scale = Math.min(clientWidth / VIEW_WIDTH, clientHeight / VIEW_HEIGHT);
  canvas.style.width = `${Math.floor(VIEW_WIDTH * scale)}px`;
  canvas.style.height = `${Math.floor(VIEW_HEIGHT * scale)}px`;
}

main();
