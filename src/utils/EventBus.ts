/** Minimal typed pub-sub so systems stay decoupled from each other and the UI. */
export class EventBus<Events extends Record<string, unknown>> {
  private listeners: { [K in keyof Events]?: Array<(payload: Events[K]) => void> } = {};

  on<K extends keyof Events>(event: K, handler: (payload: Events[K]) => void): () => void {
    const list = (this.listeners[event] ??= []);
    list.push(handler);
    return () => this.off(event, handler);
  }

  off<K extends keyof Events>(event: K, handler: (payload: Events[K]) => void): void {
    const list = this.listeners[event];
    if (!list) return;
    const idx = list.indexOf(handler);
    if (idx >= 0) list.splice(idx, 1);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    const list = this.listeners[event];
    if (!list) return;
    // Copy in case a handler unsubscribes during iteration.
    for (const handler of [...list]) handler(payload);
  }
}
