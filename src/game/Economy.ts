import { fishById, rarityIndex, type FishSpecies } from "./FishData";
import { LOCATIONS } from "./LocationData";
import { RODS } from "./RodData";
import { BAITS, UNLIMITED_BAIT_ID } from "./BaitData";

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
  baitCounts: "pixelfish.baitCounts",
  equippedBait: "pixelfish.equippedBait",
  unlockedLocations: "pixelfish.unlockedLocations",
  currentLocation: "pixelfish.currentLocation",
  discoveredFish: "pixelfish.discoveredFish",
  totalCasts: "pixelfish.totalCasts",
  totalCatches: "pixelfish.totalCatches",
  totalSold: "pixelfish.totalSold",
  bestRarityIndex: "pixelfish.bestRarityIndex",
  claimedQuests: "pixelfish.claimedQuests",
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
  /** baitId -> units in stock. Unlisted or UNLIMITED_BAIT_ID means "unlimited" — see baitCount(). */
  baitCounts: Record<string, number>;
  equippedBaitId: string;
  unlockedLocationIds: string[];
  currentLocationId: string;

  /** speciesId -> number of times caught. Presence in this map means "discovered". */
  discoveredFish: Record<string, number>;
  totalCasts: number;
  totalCatches: number;
  totalSold: number;
  /** Highest rarity index ever landed — -1 until the first catch. */
  bestRarityIndex: number;
  claimedQuestIds: string[];

  constructor() {
    this.coins = readJson(KEYS.coins, 0);
    this.inventory = readJson(KEYS.inventory, []);
    this.ownedRodIds = readJson(KEYS.ownedRods, ["twig"]);
    this.equippedRodId = readJson(KEYS.equippedRod, "twig");
    this.baitCounts = readJson(KEYS.baitCounts, {});
    this.equippedBaitId = readJson(KEYS.equippedBait, UNLIMITED_BAIT_ID);
    this.unlockedLocationIds = readJson(KEYS.unlockedLocations, [LOCATIONS[0].id]);
    this.currentLocationId = readJson(KEYS.currentLocation, LOCATIONS[0].id);

    this.discoveredFish = readJson(KEYS.discoveredFish, {});
    this.totalCasts = readJson(KEYS.totalCasts, 0);
    this.totalCatches = readJson(KEYS.totalCatches, 0);
    this.totalSold = readJson(KEYS.totalSold, 0);
    this.bestRarityIndex = readJson(KEYS.bestRarityIndex, -1);
    this.claimedQuestIds = readJson(KEYS.claimedQuests, []);
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

  /** Adds a catch to the inventory and records it toward the Fishdex/quest stats. */
  addFish(speciesId: string): InventoryFish {
    const entry: InventoryFish = { uid: `${speciesId}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`, speciesId, caughtAt: Date.now() };
    this.inventory.push(entry);
    this.saveInventory();

    this.discoveredFish[speciesId] = (this.discoveredFish[speciesId] ?? 0) + 1;
    writeJson(KEYS.discoveredFish, this.discoveredFish);

    this.totalCatches += 1;
    writeJson(KEYS.totalCatches, this.totalCatches);

    const species = fishById(speciesId);
    if (species) {
      const idx = rarityIndex(species.rarity);
      if (idx > this.bestRarityIndex) {
        this.bestRarityIndex = idx;
        writeJson(KEYS.bestRarityIndex, this.bestRarityIndex);
      }
    }

    return entry;
  }

  recordCast(): void {
    this.totalCasts += 1;
    writeJson(KEYS.totalCasts, this.totalCasts);
  }

  /** Sells the given inventory entries (or the whole inventory if omitted) and returns the coins earned. */
  sell(uids?: string[]): number {
    const toSell = uids ? this.inventory.filter((f) => uids.includes(f.uid)) : this.inventory.slice();
    const earned = toSell.reduce((sum, f) => sum + (fishById(f.speciesId)?.sellValue ?? 0), 0);
    const sellSet = new Set(toSell.map((f) => f.uid));
    this.inventory = this.inventory.filter((f) => !sellSet.has(f.uid));
    this.saveInventory();
    this.addCoins(earned);

    this.totalSold += toSell.length;
    writeJson(KEYS.totalSold, this.totalSold);

    return earned;
  }

  isQuestClaimed(id: string): boolean {
    return this.claimedQuestIds.includes(id);
  }

  claimQuest(id: string, reward: number): void {
    if (this.isQuestClaimed(id)) return;
    this.claimedQuestIds.push(id);
    writeJson(KEYS.claimedQuests, this.claimedQuestIds);
    this.addCoins(reward);
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

  /** Grants a rod for free (a found/dropped rod, not a purchase) — no-op if already owned. */
  grantRod(rodId: string): void {
    if (this.ownsRod(rodId)) return;
    this.ownedRodIds.push(rodId);
    writeJson(KEYS.ownedRods, this.ownedRodIds);
  }

  /** Units of `baitId` in stock. The unlimited bait always reports Infinity — never actually stored/decremented. */
  baitCount(baitId: string): number {
    if (baitId === UNLIMITED_BAIT_ID) return Infinity;
    return this.baitCounts[baitId] ?? 0;
  }

  /** Buys one pack (see BAIT_PACK_SIZE) of `baitId` for `cost` coins, adding to its stock. */
  buyBaitPack(baitId: string, cost: number, packSize: number): boolean {
    if (!this.spendCoins(cost)) return false;
    this.baitCounts[baitId] = (this.baitCounts[baitId] ?? 0) + packSize;
    writeJson(KEYS.baitCounts, this.baitCounts);
    return true;
  }

  /** Uses up one unit of `baitId` — a no-op for the unlimited bait. */
  consumeBait(baitId: string): void {
    if (baitId === UNLIMITED_BAIT_ID) return;
    this.baitCounts[baitId] = Math.max(0, (this.baitCounts[baitId] ?? 0) - 1);
    writeJson(KEYS.baitCounts, this.baitCounts);
  }

  equipBait(baitId: string): void {
    this.equippedBaitId = baitId;
    writeJson(KEYS.equippedBait, baitId);
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

  /** Owns every rod and bait, equips the best of each, and unlocks every location. Used to comp a specific tester account. */
  unlockEverything(): void {
    this.ownedRodIds = RODS.map((r) => r.id);
    writeJson(KEYS.ownedRods, this.ownedRodIds);
    this.equippedRodId = RODS[RODS.length - 1].id;
    writeJson(KEYS.equippedRod, this.equippedRodId);

    for (const bait of BAITS) this.baitCounts[bait.id] = 999;
    writeJson(KEYS.baitCounts, this.baitCounts);
    this.equippedBaitId = BAITS[BAITS.length - 1].id;
    writeJson(KEYS.equippedBait, this.equippedBaitId);

    this.unlockedLocationIds = LOCATIONS.map((l) => l.id);
    writeJson(KEYS.unlockedLocations, this.unlockedLocationIds);
  }
}
