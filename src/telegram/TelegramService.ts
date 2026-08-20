// Minimal typing for the subset of the Telegram Mini Apps WebApp API used
// here. The real script is loaded via a <script> tag in index.html (per the
// spec's instruction not to depend on a wrapper package); this file is the
// ONLY place in the codebase allowed to touch window.Telegram.
interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
}

interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  close: () => void;
  colorScheme: "light" | "dark";
  themeParams: TelegramThemeParams;
  viewportHeight: number;
  viewportStableHeight: number;
  isExpanded: boolean;
  initData: string;
  initDataUnsafe: Record<string, unknown>;
  platform: string;
  BackButton: {
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  onEvent: (event: string, cb: () => void) => void;
  offEvent: (event: string, cb: () => void) => void;
  HapticFeedback?: {
    impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
    notificationOccurred: (type: "error" | "success" | "warning") => void;
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp };
  }
}

/**
 * Thin wrapper around window.Telegram.WebApp. Feature-detects so the game
 * runs fine in a plain desktop browser during development.
 *
 * SECURITY NOTE: `initDataUnsafe` is exposed here only for convenience during
 * local development/display purposes (e.g. showing a username). It must
 * NEVER be trusted to authenticate a player. When a backend exists, send the
 * raw `initData` string (see getInitData()) to the server and validate it
 * there per Telegram's documented HMAC verification — that validation does
 * not exist yet in this prototype because there is no backend yet.
 */
export class TelegramService {
  private webApp: TelegramWebApp | null;

  constructor() {
    this.webApp = window.Telegram?.WebApp ?? null;
  }

  get isAvailable(): boolean {
    return this.webApp !== null;
  }

  init(): void {
    if (!this.webApp) {
      console.info("[TelegramService] Not running inside Telegram — using browser fallback.");
      return;
    }
    this.webApp.ready();
    this.webApp.expand();
    this.applyThemeVariables();
    this.webApp.onEvent("themeChanged", () => this.applyThemeVariables());
    this.webApp.onEvent("viewportChanged", () => this.applyViewportVariable());
    this.applyViewportVariable();
  }

  /** Raw initData string for future server-side validation. Never parsed here. */
  getInitData(): string {
    return this.webApp?.initData ?? "";
  }

  getColorScheme(): "light" | "dark" {
    return this.webApp?.colorScheme ?? "light";
  }

  showBackButton(onClick: () => void): void {
    if (!this.webApp) return;
    this.webApp.BackButton.show();
    this.webApp.BackButton.onClick(onClick);
  }

  hideBackButton(): void {
    this.webApp?.BackButton.hide();
  }

  haptic(style: "light" | "medium" | "heavy" = "light"): void {
    this.webApp?.HapticFeedback?.impactOccurred(style);
  }

  hapticNotification(type: "error" | "success" | "warning"): void {
    this.webApp?.HapticFeedback?.notificationOccurred(type);
  }

  private applyThemeVariables(): void {
    if (!this.webApp) return;
    const root = document.documentElement.style;
    const theme = this.webApp.themeParams;
    const map: Record<string, string | undefined> = {
      "--tg-bg-color": theme.bg_color,
      "--tg-text-color": theme.text_color,
      "--tg-hint-color": theme.hint_color,
      "--tg-link-color": theme.link_color,
      "--tg-button-color": theme.button_color,
      "--tg-button-text-color": theme.button_text_color,
      "--tg-secondary-bg-color": theme.secondary_bg_color,
    };
    for (const [key, value] of Object.entries(map)) {
      if (value) root.setProperty(key, value);
    }
    document.documentElement.dataset.theme = this.webApp.colorScheme;
  }

  private applyViewportVariable(): void {
    if (!this.webApp) return;
    document.documentElement.style.setProperty(
      "--tg-viewport-height",
      `${this.webApp.viewportStableHeight || this.webApp.viewportHeight}px`
    );
  }
}
