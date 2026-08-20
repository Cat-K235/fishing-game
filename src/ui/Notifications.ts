export type ToastType = "info" | "success" | "coin";

/** DOM toast notifications, e.g. "+150 Coins" or "Purchased Iron Rod!". */
export class Notifications {
  constructor(private root: HTMLElement) {}

  show(message: string, type: ToastType = "info"): void {
    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.textContent = message;
    this.root.appendChild(el);
    requestAnimationFrame(() => el.classList.add("toast-visible"));
    window.setTimeout(() => {
      el.classList.remove("toast-visible");
      window.setTimeout(() => el.remove(), 250);
    }, 1800);
  }
}
