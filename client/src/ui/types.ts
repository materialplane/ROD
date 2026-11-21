export type HeroId = "valen" | "ellowyn" | "orin" | "rowan" | "mera" | "harlan";
export type ShopType = "weapon" | "armor" | "tailor" | "magic" | "arcanist" | "adventurer" | "trade_goods";
export type GearSlot = "right_hand" | "left_hand" | "body" | "head" | "accessory";
export type EquippedGearMap = Partial<Record<HeroId, Partial<Record<GearSlot, string>>>>;

export interface SaveSlotData {
  slotId: string;
  label: string;
  mapId: string;
  regionLabel: string;
  heroId: string;
  heroName: string;
  partyOrder?: HeroId[];
  discoveredLocations?: string[];
  acceptedQuestIds?: string[];
  silver?: number;
  equippedByHero?: EquippedGearMap;
  bagCounts?: Record<string, number>;
  learnedSpellIds?: string[];
  tradeGoodCounts?: Record<string, number>;
  level: number;
  x: number;
  y: number;
  playtimeSeconds: number;
  savedAt: string;
}

export interface MapMeta {
  id: string;
  name: string;
  regionLabel: string;
  width: number;
  height: number;
  tileSize: number;
  cols: number;
  rows: number;
  spawn: { x: number; y: number };
}

export interface WorldLocation {
  id: string;
  locNum?: number | null;
  progOrder?: number;
  levelRange?: string;
  visibility?: string;
  name: string;
  category: string;
  locationType?: string;
  region?: number;
  playerKind?: string;
  playerRegion?: string;
  playerDescription?: string;
  playerServices?: string[];
  factionId?: string;
  factionName?: string;
  factionAllegiance?: string;
  factionPrimaryColor?: string;
  factionSecondaryColor?: string;
  bannerAssetPath?: string;
  mapId: string;
  kind: string;
  description?: string;
  catalyst?: {
    keyId: string;
    name: string;
    questId: string;
    questNum: number;
    questTitle: string;
    hubName: string;
    markerId?: string;
    zoneTier?: string;
  };
  services?: string[];
  quests?: Array<{ title: string; giver: string; category: string }>;
  assetPath: string;
  interiorAssetPath?: string;
  tavernAssetPath?: string;
  tavernName?: string;
  placed: boolean;
  x: number | null;
  y: number | null;
  scale?: number;
  triggerRadius?: number;
}

export interface NpcEntry {
  id: string;
  name: string;
  roleTitle: string;
  category: string;
  shopType?: ShopType;
  shopLabel?: string;
  servicesOffered?: string[];
  questsOffered?: string[];
  portraitPath?: string;
}

export interface ItemEntry {
  id: string;
  name: string;
  category: string;
  subType: string;
  slot?: GearSlot;
  handed?: "1H" | "2H";
  weight?: string;
  damageType?: string;
  region?: number;
  step?: number;
  priceSilver: number;
  sellSilver: number;
  usableBy?: HeroId[];
  runestoneSockets?: number;
  stats?: Record<string, number | string>;
  effect?: string;
  sourceMob?: string;
  regionsStocked?: string;
  iconPath: string;
}

export interface SpellEntry {
  id: string;
  name: string;
  category: "spell";
  subType: string;
  usableBy: HeroId[];
  region: number;
  step: number;
  mpCost: number;
  damageType: string;
  target: string;
  priceSilver: number;
  sellSilver: number;
  effect: string;
  iconPath: string;
}

export interface NpcLocationGroup {
  locationId: string;
  locNum?: number | null;
  zoneNum?: number | null;
  locationName: string;
  locationType: string;
  mapId: string;
  region?: number | null;
  factionName?: string;
  npcCount: number;
  npcs: NpcEntry[];
}

export interface QuestEntry {
  questId: string;
  questNum: number;
  hubId: string;
  hubName: string;
  mapId: string;
  region: number;
  levelRange?: string;
  category: string;
  questFormat?: string;
  targetHubId?: string;
  targetHubName?: string;
  title: string;
  giver: string;
  miniBoss?: string;
  reward: string;
  description: string;
  markerName?: string;
}

export interface AudioSettings {
  master: number;
  music: number;
  sfx: number;
  muteOnUnfocus: boolean;
}

export interface RodApi {
  listSaves: () => Promise<SaveSlotData[]>;
  getLatestSave: () => Promise<SaveSlotData | null>;
  writeSave: (data: SaveSlotData) => Promise<SaveSlotData>;
  readSave: (slotId: string) => Promise<SaveSlotData | null>;
  clearSaves: () => Promise<void>;
  quitGame: () => Promise<void>;
}

declare global {
  interface Window {
    rodApi?: RodApi;
  }
}
