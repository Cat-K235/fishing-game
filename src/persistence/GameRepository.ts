import type { PlayerState } from "../types/game";

/**
 * Abstraction over where save data lives. The current implementation
 * (LocalRepository) uses localStorage for the prototype. A future
 * ServerRepository can implement the exact same interface backed by an API
 * call, and nothing else in the codebase needs to change.
 */
export interface GameRepository {
  load(): PlayerState | null;
  save(state: PlayerState): void;
  clear(): void;
}
