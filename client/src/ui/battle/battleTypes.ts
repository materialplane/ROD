import type {
  BattleEnemyDef,
  BattleStageConfig,
  DisciplinePillar,
  HeroId,
  WorldLocation,
} from "../types";

export type StatusAilmentKind =
  | "burn"
  | "bleed"
  | "chill"
  | "shock"
  | "poison"
  | "curse"
  | "stun"
  | "def_down"
  | "atk_down"
  | "blind"
  | "ward"
  | "regen"
  | "reflect"
  | "immunity"
  | "haste"
  | "undying";

export interface StatusEffectState {
  kind: StatusAilmentKind;
  turns: number;
  potency: number;
}

export interface BattleStatusUiMeta {
  kind: StatusAilmentKind;
  glyph: string;
  label: string;
  isBuff: boolean;
  pillCls: string;
  desc: string;
}

export interface VfxSpec {
  folder: string;
  row: number;
  color: string;
  shake: boolean;
  frames: number;
}

export interface WeaponModeSpec {
  id: string;
  name: string;
  tag: string;
  power: number;
  critBonus: number;
  execCritBonus?: number;
  armorIgnore?: number;
  delayPct: number;
  targetDelayPush?: number;
  guardChip?: number;
  debuff?: StatusAilmentKind;
  restoreMp?: number;
  effect: string;
}

export interface MagicThemeSpec {
  label: string;
  accentColor: string;
  tierNames: string[];
}

export type ActionTargetScope = "enemy" | "all_enemies" | "ally" | "dead_ally" | "all_allies" | "self";

export interface BattleActionSpec {
  id: string;
  kind: "attack" | "spell" | "item" | "guard" | "flee";
  name: string;
  categoryLabel: string;
  badge: string;
  badgeKind: "weapon" | "mp" | "qty" | "guard";
  iconPath: string;
  mpCost: number;
  targetScope: ActionTargetScope;
  damageType: string;
  power: number;
  critBonus: number;
  execCritBonus?: number;
  armorIgnore?: number;
  delayPct: number;
  targetDelayPush?: number;
  guardChip?: number;
  inflictStatus?: StatusAilmentKind;
  inflictTurns?: number;
  inflictChance?: number;
  grantStatus?: { kind: StatusAilmentKind; turns: number };
  grantMomentum?: boolean;
  stripEnemyBuffs?: boolean;
  restoreMp?: number;
  healPower?: number;
  cleanse?: boolean;
  revive?: boolean;
  itemId?: string;
  qty?: number;
  regionTier?: number;
  vfxKey: string;
  effectText: string;
  disabledReason?: string;
}

export interface BattleHeroDisciplineBadge {
  tier: number;
  id: string;
  name: string;
  pillar: DisciplinePillar;
  tag: string;
  effect: string;
  iconPath: string;
}

export interface HeroDisciplineModifiers {
  critPct: number;
  spellCritPct: number;
  atkPct: number;
  magPct: number;
  healPct: number;
  pDefPct: number;
  mDefPct: number;
  maxHpPct: number;
  maxMpPct: number;
  dodgePct: number;
  guardMitigationPct: number;
  mpCostReductionPct: number;
  armorPiercePct: number;
  speedBonus: number;
  lifestealPct: number;
  hpRegenPct: number;
  ailmentPowerPct: number;
  statusResistPct: number;
}

export interface BattleHeroUnit {
  heroId: HeroId;
  name: string;
  className: string;
  level: number;
  slotIdx: number;
  maxHp: number;
  curHp: number;
  maxMp: number;
  curMp: number;
  hasMp: boolean;
  atk: number;
  mag: number;
  heal: number;
  pDef: number;
  mDef: number;
  speed: number;
  critPct: number;
  dodgePct: number;
  armorPiercePct: number;
  statusResistPct: number;
  weaponName: string;
  weaponSubType: string;
  weaponDamageType: string;
  guarding: boolean;
  momentum: boolean;
  timelinePos: number;
  statuses: StatusEffectState[];
  disciplines: BattleHeroDisciplineBadge[];
  mods: HeroDisciplineModifiers;
  avatarPath: string;
}

export interface BattleEnemyUnit {
  instanceId: string;
  mobId: string;
  name: string;
  level: number;
  role: string;
  maxHp: number;
  curHp: number;
  atk: number;
  mag: number;
  pDef: number;
  mDef: number;
  speed: number;
  xpReward: number;
  silverReward: number;
  weakTypes: string[];
  resistTypes: string[];
  revealedWeaknesses: string[];
  guardMax: number;
  guardCur: number;
  staggeredTurns: number;
  telegraphedMove: string | null;
  isBoss: boolean;
  portalNum: number | null;
  r0: number;
  c0: number;
  gw: number;
  gh: number;
  visualScale: number;
  flipX: boolean;
  iconPath: string;
  timelinePos: number;
  statuses: StatusEffectState[];
  rawDef: BattleEnemyDef;
}

export interface PackedEnemyPlacement {
  unit: BattleEnemyUnit;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  zIndex: number;
  depthScale: number;
  overflow: boolean;
}

export interface TurnTimelineEntry {
  kind: "hero" | "enemy";
  id: string;
  name: string;
  iconPath: string;
  isActive: boolean;
  isTelegraphed?: boolean;
}

export interface BattleState {
  stage: BattleStageConfig;
  biomeName: string;
  zoneName: string;
  zoneCode: number;
  isBossBattle: boolean;
  portalLoc: WorldLocation | null;
  heroes: BattleHeroUnit[];
  enemies: BattleEnemyUnit[];
  consumedPotions: Record<string, number>;
  activeActor: { kind: "hero"; heroId: HeroId } | { kind: "enemy"; instanceId: string };
  phase: "player_turn" | "animating" | "victory" | "defeat" | "fled";
  bannerText: string;
  totalXpEarned: number;
  totalSilverEarned: number;
  droppedTradeGoods: Record<string, number>;
  turnCounter: number;
}
