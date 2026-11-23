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
  cooldownTurns: number;
  splashPct?: number;
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
  cooldownTurns?: number;
  splashPct?: number;
  guardChip?: number;
  inflictStatus?: StatusAilmentKind;
  inflictTurns?: number;
  inflictChance?: number;
  grantStatus?: { kind: StatusAilmentKind; turns: number };
  grantMomentum?: boolean;
  grantBonusTurn?: boolean;
  stripEnemyBuffs?: boolean;
  restoreMp?: number;
  healPower?: number;
  cleanse?: boolean;
  revive?: boolean;
  secondAlly?: boolean;
  siphonHpPct?: number;
  siphonMpPct?: number;
  siphonPartyHpPct?: number;
  empowerNextSpell?: boolean;
  specialTag?: string;
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
  lifestealPct: number;
  hpRegenPct: number;
  ailmentPowerPct: number;
  statusResistPct: number;
}

export interface HeroCombatPassives {
  meleeDamageTakenReductionPct: number;
  aboveHalfHpMitigationPct: number;
  critTakenReductionPct: number;
  dotResistPct: number;
  plagueShadowResistPct: number;
  counterDamageHalvePct: number;
  stunCurseResistPct: number;
  accuracyBonusPct: number;
  critDamagePct: number;
  magicPiercePct: number;
  universalPoisonPenPct: number;
  poisonDotBonusPct: number;
  potionBonusPct: number;
  extraGuardChip: number;
  extraGuardVsGuarded: number;
  extraGuardModeB: number;
  extraGuardAcidPoison: number;
  extraGuardOnWeakness: number;
  extraGuardPct: number;
  extraSpellMpCost: number;
  wardExtraTurn: number;
  regenExtraTurn: number;
  startWardShieldPct: number;
  unbreakableWardPct: number;
  overflowShieldMaxPct: number;
  sacredResilience: boolean;
  guardHealPct: number;
  guardMpGain: number;
  guardDefTurn: boolean;
  guardClearsBurnOrBleed: boolean;
  guardDodgePct: number;
  guardSlamEnemy: boolean;
  guardNatureSpellPct: number;
  guardShieldWallLowestPct: number;
  guardTauntBarricade: boolean;
  wardOrGuardMpPct: number;
  riposteEachRound: boolean;
  cleaveSecondEnemyPct: number;
  seizeOpeningOnce: boolean;
  soloEnemyBonusPct: number;
  firstHitBonusPct: number;
  firstShotCritPct: number;
  firstSpellHalfMpPct: number;
  antiBossArmorPct: number;
  vsGuardedBonusPct: number;
  vsLowHp35BonusPct: number;
  vsLowHp35CritPct: number;
  vsLowHp35PenPct: number;
  vsLowHp40ExecPct: number;
  vsCasterRangedBonusPct: number;
  vsBeastMonsterBonusPct: number;
  greatswordStaggeredBonusPct: number;
  shieldAccuracyPct: number;
  shieldCritDamagePct: number;
  shieldPDefPct: number;
  shieldDodgePct: number;
  shieldStunResistPct: number;
  spearCritPct: number;
  crossbowBonusPct: number;
  crossbowBlinds: boolean;
  staffSpellPct: number;
  scimitarSicklePct: number;
  bowSeverBuffChance: number;
  bowTwinShotChance: number;
  bowArrowStormR3: boolean;
  critInflictsBleedTurns: number;
  critBouncePct: number;
  critGainMomentum: boolean;
  lightModeCritPct: number;
  lightModeBleed: boolean;
  lightModeBlinds: boolean;
  modeBBlindsAndStrips: boolean;
  modeBStunChance: number;
  coatedEdgePoisonChance: number;
  radiantStripBuffChance: number;
  frostStunOrWeaken: boolean;
  singleSpellEchoRadiantPct: number;
  multiSpellMpRefundPct: number;
  galeWindPartyDodgePct: number;
  creepingBriarsSpreadChance: number;
  corrosiveThornsDefDown: boolean;
  purifyingDewCleanses: boolean;
  mossWardTurns: number;
  triageHalfHpHealPct: number;
  protectiveSalveWardPct: number;
  smellingSaltCleanseBuff: boolean;
  toxicRuptureOnPoisoned: boolean;
  vaporShatterPoisonSplashPct: number;
  quickeningBalmBonusPct: number;
  quickeningBalmWardPct: number;
  masterPanaceaResistBuff: boolean;
  emergencyHealHalfMp30Pct: number;
  lifebloomSurgeOnce: boolean;
  nerveLockStumbleChance: number;
  blightSiphonMpPerPoison: number;
  dodgeHealsPct: number;
  dodgeGrantsMomentum: boolean;
  rangedDodgePct: number;
  highlandHp75CritPct: number;
  cadenceAtkPerRoundPct: number;
  battleWrathPerHitPct: number;
  bluntingEnemyAtkDown: boolean;
  interceptLowestAllyPct: number;
  vowInterceptAbove25Pct: boolean;
  martyrInterceptPct: number;
  regalCommandMark: boolean;
  critiqueExposeDef: boolean;
  spotterExposeDef: boolean;
  crushingFollowThroughPct: number;
  commandingBreachPct: number;
  royalChallengeR1: boolean;
  coveringVolleyOnceRound: boolean;
  partyStartEmpowerTurns: number;
  partyMDefAuraPct: number;
  partyAoeDamageReductionPct: number;
  partyPackCritPct: number;
  partyPackAccPct: number;
  partyShockBonusPct: number;
  partyBleedShockCritPct: number;
  partyBleedShockPenPct: number;
  partyWardRootResistPct: number;
  runestoneBonusElemType: string | null;
  runestoneBonusElemPct: number;
  runestoneSplash35Burn: boolean;
  runestoneChillOnHit: boolean;
  runestoneArcChainShock: boolean;
  runestonePoisonWeakenPct: number;
  runestoneHallowedUndeadPct: number;
  runestoneHallowedCritStrip: boolean;
  runestoneDetonateDotPct: number;
  runestoneSiphonMpPerHit: number;
  runestoneEchoAttackChance: number;
  runestoneRetaliateMeleePct: number;
  runestoneRetaliateBatteredGuard: boolean;
  runestoneBatteredPowerPct: number;
  runestoneSanctifiedHealPct: number;
  runestoneAdaptiveMaxPct: number;
  postBattleHealPct: number;
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
  critPct: number;
  dodgePct: number;
  armorPiercePct: number;
  statusResistPct: number;
  weaponName: string;
  weaponSubType: string;
  weaponDamageType: string;
  hasShield?: boolean;
  offhandWeaponName?: string;
  offhandWeaponSubType?: string;
  offhandWeaponDamageType?: string;
  offhandAtk?: number;
  shieldHp: number;
  guarding: boolean;
  momentum: boolean;
  actedThisRound: boolean;
  bonusTurnUsedThisRound?: boolean;
  bonusTurnUsedThisBattle?: boolean;
  firstStrikeUsed?: boolean;
  nextSpellEmpower?: boolean;
  guardNatureEmpower?: boolean;
  guardDodgeBonusPct?: number;
  guardShieldWall?: boolean;
  riposteUsedThisRound?: boolean;
  interceptUsedThisRound?: boolean;
  dodgeHealUsedThisRound?: boolean;
  coveringVolleyUsedThisRound?: boolean;
  seizeOpeningUsed?: boolean;
  unbreakableUsed?: boolean;
  sacredResilienceUsed?: boolean;
  lifebloomUsed?: boolean;
  cadenceStacks?: number;
  battleWrathStacks?: number;
  mossWardTurns?: number;
  adaptiveElement?: string;
  adaptiveReductionPct?: number;
  adaptiveTurns?: number;
  skillCooldowns: Record<string, number>;
  statuses: StatusEffectState[];
  disciplines: BattleHeroDisciplineBadge[];
  mods: HeroDisciplineModifiers;
  passives: HeroCombatPassives;
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
  actedThisRound: boolean;
  struckThisRoundByOrin?: boolean;
  markedByRegalCommand?: boolean;
  armorBrokenByOrinTurns?: number;
  rotCloudDoubleTurns?: number;
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
  kind: "hero" | "enemy" | "round_break";
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
  galeCanopyDodgeTurns?: number;
  turnCounter: number;
}
