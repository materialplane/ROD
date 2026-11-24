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
    inflictStatus?: string;
    inflictTurns?: number;
    inflictChance?: number;
    telegraphed?: boolean;
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
  portalNum?: number;
  bossId?: string;
  heroZone: BattleStageZoneRect;
  enemyGrid: BattleStageZoneRect;
}

export interface BattleCombatConfig {
  biomeStageMap: Record<string, string>;
  portalStageMap: Array<{ keys: string[]; portalNum: number; stageId: string; bossId?: string }>;
  coastalChance: number;
  coastalStageByMap: Record<string, string>;
  inlandChance: number;
  inlandStageByMap: Record<string, string>;
  regionLevelCutoffs: number[];
  levelBenchmarks: Array<[number, number, number]>;
  packLootScale: { single: number; pair: number; groupTotal: number };
  packHpScale: { single: number; pair: number; three: number; four: number; fivePlus: number };
  earlyHpLift: { maxLevel: number; maxMultiplier: number };
  bossHpBoost: Record<string, number>;
  rewardCurve: {
    xp: { minVal: number; base: number; lin: number; quad: number };
    silver: { minVal: number; base: number; earlyMaxLv: number; earlyLift: number; earlyPower?: number; lin: number; cubic: number };
    bossXpFallback: { minVal: number; base: number; lin: number; quad: number };
    bossSilverFallback: { minVal: number; base: number; lin: number; quad: number };
  };
  speedConfig: {
    heroBase: Record<string, number>;
    lightArmorBonus: number;
    heavyArmorPenalty: number;
    shieldPenalty: number;
    heroFinesseScale: number;
    enemyRoleBase: Record<string, number>;
    enemyDefault: number;
    bossBase: number;
    enemyLevelScale: number;
  };
}

export interface BattleConfigData {
  version?: number;
  heroZoneDefault: BattleStageZoneRect;
  enemyGridDefault: BattleStageZoneRect;
  combatConfig?: BattleCombatConfig;
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
  completedQuestIds?: string[];
  activeOutpostHunts?: ActiveOutpostHunt[];
  outpostOffers?: Record<string, ActiveOutpostHunt>;
  completedOutpostHunts?: number;
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

export interface ActiveOutpostHunt {
  huntId: string;
  outpostId: string;
  outpostName: string;
  zoneNum: number;
  mobId: string;
  mobName: string;
  mobIconPath: string;
  isElite?: boolean;
  biomeHints: string[];
  killsRequired: number;
  killsProgress: number;
  rewardSilver: number;
  rewardXp: number;
  rewardConsumableId?: string;
  rewardConsumableQty?: number;
}

export interface OutpostZoneConfig {
  silver: number;
  xp: number;
  regionKey: string;
}

export interface OutpostRegionProfile {
  key: string;
  titlePrefix: string;
  settingPhrase: string;
  roadPhrase: string;
}

export interface MobHuntLoreEntry {
  threatSummary: string;
  byRegion?: Record<string, string>;
}

export interface OutpostHuntsCatalog {
  version: number;
  globalActiveQuestLimit: number;
  killsByCellSize: Record<string, number>;
  eliteRewardMultiplier: number;
  irregularPlurals: Record<string, string>;
  zones: Record<string, OutpostZoneConfig>;
  regionProfiles: Record<string, OutpostRegionProfile>;
  loreByMobId: Record<string, MobHuntLoreEntry>;
}

export interface SeaPortRoute {
  id: string;
  title: string;
  realm: string;
  mapId: string;
  order: number;
}

export interface TravelPortalGate {
  portalId: string;
  portalName: string;
  portalNum?: number;
}

export interface TravelStoryChainEntry {
  id: string;
  cardId: string;
  title: string;
  route: string;
  questIds: string[];
}

export interface TravelCatalog {
  version: number;
  seaPortRoutes: SeaPortRoute[];
  outboundSeaPortalGates: Record<string, TravelPortalGate>;
  ferryPortalGates?: Record<string, TravelPortalGate>;
  mountainPassPortalGates?: Record<string, TravelPortalGate>;
  realms?: Array<{ id: string; name: string }>;
  regionNames?: Record<string, string>;
  storyChains?: TravelStoryChainEntry[];
}

export interface HeroAttributeMeta {
  key: HeroAttrKey;
  label: string;
  shortLabel: string;
  hint: string;
}

export interface HeroCatalogEntry {
  id: HeroId;
  name: string;
  fullName: string;
  className: string;
  shortTag: string;
  worldBio: string;
  classStyle: string;
  gearSummary: string;
  roleSummary: string;
  focusAttributes: HeroAttrKey[];
  focusLabel: string;
  startingAttributes: Record<HeroAttrKey, number>;
  wounded50: string;
  wounded25: string;
  baseHp: number;
  baseMp: number;
  usesMp?: boolean;
  canDualWield?: boolean;
  starterWeaponSubType?: string;
  starterShield?: boolean;
  starterAccessoryCategory?: string;
  avatarPath: string;
  tokenPath: string;
}

export interface HeroProgressionCatalog {
  startingSilver?: number;
  maxLevel: number;
  xpCurve: { linear: number; quadratic: number };
  pointsPerLevel: number;
  milestoneLevelInterval: number;
  milestoneBonusPoints: number;
  hpPerLevel: number;
  mpPerLevel: number;
  gritHpPerPoint: number;
  arcanaMpPerPoint: number;
  forceAtkPerPoint: number;
  arcanaMagPerPoint: number;
  presenceHealPerPoint: number;
  gritPdefPerPoint: number;
  presenceMdefPerPoint: number;
  finesseDodgePerPoint: number;
  finesseCritPerPoint: number;
  baseCritPct: number;
  dodgeCapPct: number;
  critCapPct: number;
  dualWieldOffhandScale: number;
  runestoneAttrScaling: {
    forceAtk: number;
    finesseDodge: number;
    finesseCrit: number;
    gritHp: number;
    gritPdef: number;
    arcanaMag: number;
    presenceMdef: number;
    presenceHeal: number;
  };
  runestoneEmptyIcon: string;
  ledgerTabs: Array<{ id: string; label: string; icon: string }>;
  slotConfig: Array<{ key: GearSlot; label: string; fallbackIcon: string }>;
}

export interface HeroOpeningCutsceneCatalog {
  addressForms: Record<string, Record<string, string>>;
  openingCall: Record<string, string>;
  keepFirstPledge: Record<string, string>;
  splitPairReactions: Record<string, Record<string, string>>;
  companionFallback: Record<string, string>;
  keepSecondPledge: Record<string, string>;
  closingCall: Record<string, string>;
}

export interface HeroesCatalog {
  version: number;
  defaultPartyOrder: HeroId[];
  attributeMeta: HeroAttributeMeta[];
  baseStartingAttributes: Record<HeroAttrKey, number>;
  progression: HeroProgressionCatalog;
  heroes: HeroCatalogEntry[];
  openingCutscene?: HeroOpeningCutsceneCatalog;
}

export interface GearWeaponModeEntry {
  id: string;
  name: string;
  tag: string;
  power: number;
  critBonus: number;
  cooldownTurns: number;
  guardChip?: number;
  armorIgnore?: number;
  splashPct?: number;
  execCritBonus?: number;
  debuff?: "poison" | "def_down" | "atk_down" | "blind";
  restoreMp?: number;
  effect: string;
}

export interface GearShopMetaEntry {
  id: ShopType;
  label: string;
  quote: string;
  pills: Array<[string, string]>;
}

export interface GearRulesCatalog {
  version: number;
  metalArmorTypes: string[];
  robeTypes: string[];
  tailorVestmentTypes: string[];
  accessoryCategories: string[];
  statLabels: Record<string, string>;
  slotLabels: Record<GearSlot, string>;
  fallbackSkillIcons: [string, string];
  weaponModes: Record<string, [GearWeaponModeEntry, GearWeaponModeEntry]>;
  shopMeta: Record<ShopType, GearShopMetaEntry>;
  maxSpellsPerRegion: number;
  tierColors: Array<{ maxStep: number; color: string }>;
  defaultTierColor: string;
  zoneRegionCutoffs: number[];
  zoneMaxLevels: number[];
  stepToDefaultZone: number[];
  regionStartingZones: number[];
}

export interface RunestoneRarityTier {
  id: string;
  tier: string;
  tierOrder: number;
  scale: number;
  regions?: string;
  zones?: string;
  rollFormula?: string;
  strengthScale?: string;
}

export interface RunestoneAffixesCatalog {
  version: number;
  socketRule?: string;
  rarityTiers: RunestoneRarityTier[];
  weaponPrefixes?: Array<{ id: string; name: string; socket: string; effect: string }>;
  armorPrefixes?: Array<{ id: string; name: string; socket: string; effect: string }>;
  universalSuffixes?: Array<{ id: string; name: string; effect: string }>;
}

export interface AudioTavernTrackEntry {
  relPath: string;
  chapterNum: number;
  chapterLabel: string;
  title: string;
  shortTitle: string;
  speaker: string;
  overview: string;
  worldHistory: string;
}

export interface AudioCatalog {
  version: number;
  headroom: { music: number; sfx: number; movementLoopGain: number };
  menuMusic: {
    titleStart: string;
    titleLoop: string;
    cutscene: string;
    worldMap: string;
    town: string;
    inn: string;
  };
  explorationPlaylist: string[];
  combatPlaylist: string[];
  bossTrack: string;
  tavernMapContextByMapId: Record<string, string>;
  tavernPlaylists: Record<string, string[]>;
  movementTracks: Record<"walk" | "boat", string>;
  sfxPools: Record<string, string[]>;
  defaultSfxGain: Record<string, number>;
  sfxKeywordRules: Array<{ keywords: string[]; key: string }>;
  tavernTracks: Record<string, AudioTavernTrackEntry>;
}

export interface VfxEffectsCatalog {
  schemaVersion?: number;
  battleStateIcons?: Record<string, { iconPath: string; label: string; tone: "state" | "warn" | "debuff" | "buff"; desc: string }>;
  statusUiMeta?: Record<string, { kind: string; glyph: string; iconPath: string; label: string; isBuff: boolean; pillCls: string; desc: string }>;
  vfxMap?: Record<string, { folder: string; row: number; color: string; shake: boolean; frames: number }>;
  heroMagicThemes?: Record<string, { label: string; themeClass?: string; accentColor: string; tierNames: string[] }>;
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
