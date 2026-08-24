import { fishById, type FishSpecies } from "./FishData";
import { LOCATIONS } from "./LocationData";

export interface InventoryFish {
  uid: string;
  speciesId: string;
  caughtAt: number;
}

const KEYS = {
  coins: "pixelfish.coins",
  inventory: "pixelfish.inventory",
  ownedRods: "pixelfish.ownedRods",
  equippedRod: "pixelfish.equippedRod",
  unlockedLocations: "pixelfish.unlockedLocations",
  currentLocation: "pixelfish.currentLocation",
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export class Economy {
  coins: number;
  inventory: InventoryFish[];
  ownedRodIds: string[];
  equippedRodId: string;
  unlockedLocationIds: string[];
  currentLocationId: string;

  constructor() {
    this.coins = readJson(KEYS.coins, 0);
    this.inventory = readJson(KEYS.inventory, []);
    this.ownedRodIds = readJson(KEYS.ownedRods, ["twig"]);
    this.equippedRodId = readJson(KEYS.equippedRod, "twig");
    this.unlockedLocationIds = readJson(KEYS.unlockedLocations, [LOCATIONS[0].id]);
    this.currentLocationId = readJson(KEYS.currentLocation, LOCATIONS[0].id);
  }

  private saveCoins(): void {
    writeJson(KEYS.coins, this.coins);
  }

  private saveInventory(): void {
    writeJson(KEYS.inventory, this.inventory);
  }

  addCoins(amount: number): void {
    this.coins += amount;
    this.saveCoins();
  }

  spendCoins(amount: number): boolean {
    if (this.coins < amount) return false;
    this.coins -= amount;
    this.saveCoins();
    return true;
  }

  addFish(speciesId: string): InventoryFish {
    const entry: InventoryFish = { uid: `${speciesId}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`, speciesId, caughtAt: Date.now() };
    this.inventory.push(entry);
    this.saveInventory();
    return entry;
  }

  /** Sells the given inventory entries (or the whole inventory if omitted) and returns the coins earned. */
  sell(uids?: string[]): number {
    const toSell = uids ? this.inventory.filter((f) => uids.includes(f.uid)) : this.inventory.slice();
    const earned = toSell.reduce((sum, f) => sum + (fishById(f.speciesId)?.sellValue ?? 0), 0);
    const sellSet = new Set(toSell.map((f) => f.uid));
    this.inventory = this.inventory.filter((f) => !sellSet.has(f.uid));
    this.saveInventory();
    this.addCoins(earned);
    return earned;
  }

  inventoryWithSpecies(): { entry: InventoryFish; species: FishSpecies }[] {
    return this.inventory
      .map((entry) => {
        const species = fishById(entry.speciesId);
        return species ? { entry, species } : null;
      })
      .filter((x): x is { entry: InventoryFish; species: FishSpecies } => x !== null);
  }

  ownsRod(rodId: string): boolean {
    return this.ownedRodIds.includes(rodId);
  }

  buyRod(rodId: string, cost: number): boolean {
    if (this.ownsRod(rodId)) return true;
    if (!this.spendCoins(cost)) return false;
    this.ownedRodIds.push(rodId);
    writeJson(KEYS.ownedRods, this.ownedRodIds);
    return true;
  }

  equipRod(rodId: string): void {
    this.equippedRodId = rodId;
    writeJson(KEYS.equippedRod, rodId);
  }

  isLocationUnlocked(locationId: string): boolean {
    return this.unlockedLocationIds.includes(locationId);
  }

  unlockLocation(locationId: string, cost: number): boolean {
    if (this.isLocationUnlocked(locationId)) return true;
    if (!this.spendCoins(cost)) return false;
    this.unlockedLocationIds.push(locationId);
    writeJson(KEYS.unlockedLocations, this.unlockedLocationIds);
    return true;
  }

  travelTo(locationId: string): void {
    this.currentLocationId = locationId;
    writeJson(KEYS.currentLocation, locationId);
  }
}
