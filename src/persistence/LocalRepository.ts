import type { GameRepository } from "./GameRepository";
import type { PlayerState, SaveData } from "../types/game";

const STORAGE_KEY = "fishing-game-save";
const SAVE_VERSION = 1;

/**
 * localStorage-backed save. This is explicitly NOT authoritative in the
 * production design (see services/GameApi.ts) — it exists so the prototype
 * is playable without a backend. A ServerRepository can later implement
 * GameRepository against a real API with the same call sites.
 */
export class LocalRepository implements GameRepository {
  load(): PlayerState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as SaveData;
      if (!parsed || typeof parsed !== "object" || parsed.version !== SAVE_VERSION) {
        return null;
      }
      if (!isValidPlayerState(parsed.state)) return null;
      return parsed.state;
    } catch (err) {
      console.warn("[LocalRepository] Failed to load save, ignoring.", err);
      return null;
    }
  }

  save(state: PlayerState): void {
    try {
      const data: SaveData = { version: SAVE_VERSION, state };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.warn("[LocalRepository] Failed to save.", err);
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore — nothing useful to do if storage is unavailable.
    }
  }
}

function isValidPlayerState(state: unknown): state is PlayerState {
  if (!state || typeof state !== "object") return false;
  const s = state as PlayerState;
  return (
    typeof s.coins === "number" &&
    Array.isArray(s.inventory) &&
    Array.isArray(s.ownedRodIds) &&
    typeof s.equippedRodId === "string" &&
    Array.isArray(s.unlockedPondIds) &&
    typeof s.currentPondId === "string"
  );
}
