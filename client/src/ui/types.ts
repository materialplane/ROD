import type { BattleState } from "./battle/battleTypes";

export type HeroId = "valen" | "ellowyn" | "orin" | "rowan" | "mera" | "harlan";
export type ShopType = "weapon" | "armor" | "tailor" | "magic" | "arcanist" | "adventurer" | "trade_goods";
export type GearSlot = "right_hand" | "left_hand" | "body" | "head" | "accessory";
export type EquippedGearMap = Partial<Record<HeroId, Partial<Record<GearSlot, string>>>>;

export type HeroAttrKey = "force" | "finesse" | "grit" | "arcana" | "presence";
export type HeroAttrMap = Partial<Record<HeroAttrKey, number>>;

export interface RunestoneItem {
  id: string;
  name: string;
  tier: string;
  target: "weapon" | "armor";
  affix: string;
  iconPath: string;
  sellSilver?: number;
}

export interface HeroRunestoneSockets {
  weapon?: RunestoneItem | null;
  armor?: RunestoneItem | null;
}

export type HeroSocketsMap = Partial<Record<HeroId, HeroRunestoneSockets>>;

export type DisciplinePillar = "body" | "mind" | "spirit";

export interface DisciplineOption {
  id: string;
  name: string;
  pillar: DisciplinePillar;
  tag: string;
  effect: string;
  iconPath: string;
}

export interface DisciplineTier {
  level: number;
  silver: number;
  optionA: DisciplineOption;
  optionB: DisciplineOption;
}

export interface HeroDisciplinesEntry {
  heroId: HeroId;
  name: string;
  className: string;
  roleTag: string;
  tiers: DisciplineTier[];
}

/** Maps heroId -> { [tierLevelStr]: chosenOptionId } */
export type ChosenDisciplinesMap = Partial<Record<HeroId, Record<string, string>>>;

export interface BattleEnemyDef {
  id: string;
  name: string;
  slug?: string;
  cr?: string;
  level?: number;
  role?: string;
  hp: number;
  atk: number;
  mag?: number;
  pDef?: number;
  mDef?: number;
  xp?: number;
  silver?: number;
  weak?: string;
  resist?: string;
  guard?: number;
  isBoss?: boolean;
  portalNum?: number | null;
  zone?: string;
  homeBiome?: string;
  dropItemId?: string;
  gridW: number;
  gridH: number;
  spriteW?: number;
  spriteH?: number;
  sizePreset?: string;
  visualScale?: number;
  flipX?: boolean;
  iconPath: string;
  actions?: Array<{
    name: string;
    damageType?: string;
    target?: string;
    effect?: string;
    power?: number;
  }>;
}

export interface BattleStageZoneRect {
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  staggerPct?: number;
  backScale?: number;
  frontScale?: number;
  cols?: number;
  rows?: number;
  backRowScale?: number;
  frontRowScale?: number;
  flipRight?: boolean;
}

export interface BattleStageConfig {
  order: number;
  id: string;
  name: string;
  zones?: string;
  spawnNames?: string[];
  zoneSpawns?: Record<string, string[]>;
  imagePath: string;
  isPortal?: boolean;
  heroZone: BattleStageZoneRect;
  enemyGrid: BattleStageZoneRect;
}

export interface BattleConfigData {
  version?: number;
  heroZoneDefault: BattleStageZoneRect;
  enemyGridDefault: BattleStageZoneRect;
  stages: BattleStageConfig[];
  monsters: BattleEnemyDef[];
}

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
  sealedPortalIds?: string[];
  silver?: number;
  equippedByHero?: EquippedGearMap;
  bagCounts?: Record<string, number>;
  learnedSpellIds?: string[];
  tradeGoodCounts?: Record<string, number>;
  heroSpentAttrs?: Partial<Record<HeroId, HeroAttrMap>>;
  socketsByHero?: HeroSocketsMap;
  runestonesBag?: RunestoneItem[];
  heroHpPct?: Partial<Record<HeroId, number>>;
  heroMpPct?: Partial<Record<HeroId, number>>;
  chosenDisciplinesByHero?: ChosenDisciplinesMap;
  heroLevels?: Partial<Record<HeroId, number>>;
  heroXp?: Partial<Record<HeroId, number>>;
  partyXp?: number;
  activeBattle?: BattleState | null;
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
  zoneNum?: number;
  gearTiers?: number[];
  spellTier?: number;
  levelRange?: string;
  visibility?: string;
  name: string;
  category: string;
  locationType?: string;
  isPortal?: boolean;
  portalNum?: number | null;
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
  linkedFerryId?: string | null;
  passExitX?: number | null;
  passExitY?: number | null;
  rotation?: number;
  bossInfo?: {
    boss: string;
    plane: string;
    weaknesses?: string;
    guardPips?: number;
  };
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
  sourceType?: string;
  zonesStocked?: string;
  minZone?: number;
  maxZone?: number;
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
  markerId?: string;
  markerName?: string;
  assetPath?: string;
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
