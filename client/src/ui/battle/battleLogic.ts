import { getHeroById } from "../heroes";
import { computeHeroVitals, getHeroAttributes, getHeroLevel } from "../party/partyLogic";
import { canDualWieldItem, getWeaponAbilityIconPath, WEAPON_MODE_SPECS } from "../shops/shopLogic";
import type {
  BattleConfigData,
  BattleEnemyDef,
  BattleStageConfig,
  ChosenDisciplinesMap,
  EquippedGearMap,
  HeroAttrMap,
  HeroDisciplinesEntry,
  HeroId,
  HeroSocketsMap,
  ItemEntry,
  SpellEntry,
  WorldLocation,
} from "../types";
import type {
  BattleActionSpec,
  BattleEnemyUnit,
  BattleHeroDisciplineBadge,
  BattleHeroUnit,
  BattleState,
  BattleStatusUiMeta,
  HeroDisciplineModifiers,
  MagicThemeSpec,
  PackedEnemyPlacement,
  StatusAilmentKind,
  StatusEffectState,
  TurnTimelineEntry,
  VfxSpec,
  WeaponModeSpec,
} from "./battleTypes";
import { buildFullDisciplineProfile, getPartyCombatAuras, grantWardShield } from "./combatEffects";

export const BATTLE_STATE_ICONS = {
  enemy_guard: {
    iconPath: "assets/icons/conditions/cond_enemy_guard.webp",
    label: "Enemy Guard",
    tone: "state" as const,
    desc: "Active Guard shield points. Break all Guard points with Weaknesses or Guard-chip skills to Stagger.",
  },
  staggered: {
    iconPath: "assets/icons/conditions/cond_staggered.webp",
    label: "Staggered",
    tone: "warn" as const,
    desc: "Guard broken! Takes 1.5x damage and loses its turn.",
  },
  boss_charging: {
    iconPath: "assets/icons/conditions/cond_boss_charging.webp",
    label: "Charging Attack",
    tone: "debuff" as const,
    desc: "Gathering power for a heavy telegraphed attack next turn. Break Guard or Stagger to interrupt.",
  },
  hero_guard: {
    iconPath: "assets/icons/conditions/cond_hero_guard.webp",
    label: "Guarding",
    tone: "buff" as const,
    desc: "Braced behind defense, halving incoming damage and empowering the next strike.",
  },
  momentum: {
    iconPath: "assets/icons/conditions/cond_momentum.webp",
    label: "Momentum",
    tone: "buff" as const,
    desc: "Next attack or spell deals +25% bonus damage.",
  },
  resolve_battered: {
    iconPath: "assets/icons/conditions/cond_resolve_battered.webp",
    label: "Battered Resolve",
    tone: "warn" as const,
    desc: "Under 50% HP: Tier 1 Wounded Resolve passive is active.",
  },
  resolve_critical: {
    iconPath: "assets/icons/conditions/cond_resolve_critical.webp",
    label: "Critical Resolve",
    tone: "debuff" as const,
    desc: "Under 25% HP: Tier 2 Last-Stand Resolve passive is active.",
  },
  ko_fallen: {
    iconPath: "assets/icons/conditions/cond_ko_fallen.webp",
    label: "Fallen",
    tone: "debuff" as const,
    desc: "Knocked out at 0 HP. Revive with healing draught or spell.",
  },
};

export const STATUS_UI_META: Record<StatusAilmentKind, BattleStatusUiMeta> = {
  burn: {
    kind: "burn",
    glyph: "🔥",
    iconPath: "assets/icons/conditions/cond_burn.webp",
    label: "Burn",
    isBuff: false,
    pillCls: "border-[#c95b38] bg-[#2c150e] text-[#ffab85]",
    desc: "Takes Fire damage each turn and receives 25% less healing.",
  },
  bleed: {
    kind: "bleed",
    glyph: "🩸",
    iconPath: "assets/icons/conditions/cond_bleed.webp",
    label: "Bleed",
    isBuff: false,
    pillCls: "border-[#b83e4c] bg-[#2a1016] text-[#ffa1ad]",
    desc: "Loses HP each turn from bleeding wounds.",
  },
  poison: {
    kind: "poison",
    glyph: "☠",
    iconPath: "assets/icons/conditions/cond_poison.webp",
    label: "Poison",
    isBuff: false,
    pillCls: "border-[#6fa838] bg-[#16260f] text-[#b4f285]",
    desc: "Takes Poison damage each turn and deals 15% less physical damage.",
  },
  chill: {
    kind: "chill",
    glyph: "❄",
    iconPath: "assets/icons/conditions/cond_chill.webp",
    label: "Chill",
    isBuff: false,
    pillCls: "border-[#4b9ed4] bg-[#102233] text-[#9edbff]",
    desc: "Outgoing damage reduced by 15%; takes +15% Frost & Lightning damage.",
  },
  shock: {
    kind: "shock",
    glyph: "⚡",
    iconPath: "assets/icons/conditions/cond_shock.webp",
    label: "Shock",
    isBuff: false,
    pillCls: "border-[#d4b038] bg-[#29220e] text-[#ffe885]",
    desc: "Next hit taken deals +20% bonus burst damage.",
  },
  curse: {
    kind: "curse",
    glyph: "🌑",
    iconPath: "assets/icons/conditions/cond_curse.webp",
    label: "Curse",
    isBuff: false,
    pillCls: "border-[#835cc9] bg-[#1f1533] text-[#cbb6ff]",
    desc: "Outgoing damage and healing reduced by 20%.",
  },
  stun: {
    kind: "stun",
    glyph: "💫",
    iconPath: "assets/icons/conditions/cond_stun.webp",
    label: "Stun",
    isBuff: false,
    pillCls: "border-[#d48b38] bg-[#2e1e0e] text-[#ffd48a]",
    desc: "Skips next turn.",
  },
  def_down: {
    kind: "def_down",
    glyph: "💔",
    iconPath: "assets/icons/conditions/cond_def_down.webp",
    label: "Armor Break",
    isBuff: false,
    pillCls: "border-[#c25b68] bg-[#2b141a] text-[#ffb0bc]",
    desc: "Defense reduced by 25%.",
  },
  atk_down: {
    kind: "atk_down",
    glyph: "⬇",
    iconPath: "assets/icons/conditions/cond_atk_down.webp",
    label: "Weakened",
    isBuff: false,
    pillCls: "border-[#946eb8] bg-[#1f162b] text-[#d9c0ff]",
    desc: "Outgoing attack damage lowered by 22%.",
  },
  blind: {
    kind: "blind",
    glyph: "👁",
    iconPath: "assets/icons/conditions/cond_blind.webp",
    label: "Blinded",
    isBuff: false,
    pillCls: "border-[#7c879e] bg-[#1a1f2b] text-[#cbd5e8]",
    desc: "Attacks have a 22% chance to miss.",
  },
  ward: {
    kind: "ward",
    glyph: "🛡",
    iconPath: "assets/icons/conditions/cond_ward.webp",
    label: "Ward",
    isBuff: true,
    pillCls: "border-[#4aa3c8] bg-[#102633] text-[#9de6ff]",
    desc: "Reduces incoming damage by 25%.",
  },
  regen: {
    kind: "regen",
    glyph: "✨",
    iconPath: "assets/icons/conditions/cond_regen.webp",
    label: "Regen",
    isBuff: true,
    pillCls: "border-[#4ab87d] bg-[#11291d] text-[#92f5bf]",
    desc: "Restores 10% Max HP at the start of every turn.",
  },
  reflect: {
    kind: "reflect",
    glyph: "🪞",
    iconPath: "assets/icons/conditions/cond_reflect.webp",
    label: "Reflect",
    isBuff: true,
    pillCls: "border-[#7a82d9] bg-[#181b33] text-[#c2c9ff]",
    desc: "Reflects 25% of incoming damage back at attackers.",
  },
  immunity: {
    kind: "immunity",
    glyph: "🌿",
    iconPath: "assets/icons/conditions/cond_immunity.webp",
    label: "Ward Purity",
    isBuff: true,
    pillCls: "border-[#54b898] bg-[#122923] text-[#9df5dc]",
    desc: "Blocks incoming negative ailments.",
  },
  haste: {
    kind: "haste",
    glyph: "⚔",
    iconPath: "assets/icons/conditions/cond_haste.webp",
    label: "Empowered",
    isBuff: true,
    pillCls: "border-[#d4a644] bg-[#2b2110] text-[#ffe199]",
    desc: "+20% Attack and Magic Power.",
  },
  undying: {
    kind: "undying",
    glyph: "🕊",
    iconPath: "assets/icons/conditions/cond_undying.webp",
    label: "Undying",
    isBuff: true,
    pillCls: "border-[#e0c46c] bg-[#2e2712] text-[#fff0ad]",
    desc: "Prevents Knock Out once, surviving at 20% HP.",
  },
};

export function upsertStatusEffect(
  list: StatusEffectState[],
  kind: StatusAilmentKind,
  turns: number,
  potency = 1
): StatusEffectState[] {
  const isNegative = !STATUS_UI_META[kind].isBuff;
  if (isNegative && list.some((s) => s.kind === "immunity")) {
    return list;
  }
  const rest = list.filter((s) => s.kind !== kind);
  return [...rest, { kind, turns: Math.max(1, turns), potency }];
}

export interface EnemyResolvedMove {
  name: string;
  damageType: string;
  target: "1 Ally" | "All Allies";
  power: number;
  inflictStatus?: StatusAilmentKind;
  inflictTurns?: number;
  inflictChance?: number;
}

export function pickEnemyCombatMove(enemy: BattleEnemyUnit, forceTelegraphName?: string | null): EnemyResolvedMove {
  const rawList = enemy.rawDef.actions ?? [];
  if (rawList.length > 0) {
    const picked = forceTelegraphName
      ? rawList.find((a) => a.name === forceTelegraphName) ?? rawList[0]
      : rawList[Math.floor(Math.random() * rawList.length)];
    return {
      name: picked.name,
      damageType: picked.damageType ?? "Slashing",
      target: (picked.target ?? "").toLowerCase().includes("all") ? "All Allies" : "1 Ally",
      power: picked.power ?? 1.0,
    };
  }

  const hay = `${enemy.name} ${enemy.role} ${enemy.weakTypes.join(" ")} ${enemy.resistTypes.join(" ")}`.toLowerCase();
  const isBoss = enemy.isBoss;
  const moves: EnemyResolvedMove[] = [];

  if (/fire|flame|efreet|ember|magma|cinder|hell|pyro|salamander/.test(hay)) {
    moves.push(
      { name: "Sear Claw", damageType: "Fire", target: "1 Ally", power: 1.0, inflictStatus: "burn", inflictTurns: 2, inflictChance: 0.45 },
      { name: "Cinder Wave", damageType: "Fire", target: isBoss ? "All Allies" : "1 Ally", power: 1.15, inflictStatus: "burn", inflictTurns: 2, inflictChance: 0.55 }
    );
  } else if (/frost|ice|winter|yeti|snow|glaci|cold|white dragon/.test(hay)) {
    moves.push(
      { name: "Rime Slash", damageType: "Frost", target: "1 Ally", power: 1.0, inflictStatus: "chill", inflictTurns: 2, inflictChance: 0.5 },
      { name: "Glacial Gale", damageType: "Frost", target: isBoss ? "All Allies" : "1 Ally", power: 1.1, inflictStatus: "chill", inflictTurns: 2, inflictChance: 0.55 }
    );
  } else if (/poison|venom|spider|ooze|otyugh|cobra|viper|scorp|mire|rot|spore/.test(hay)) {
    moves.push(
      { name: "Venom Strike", damageType: "Poison", target: "1 Ally", power: 0.96, inflictStatus: "poison", inflictTurns: 3, inflictChance: 0.55 },
      { name: "Corrosive Bile", damageType: "Poison", target: "1 Ally", power: 1.08, inflictStatus: "def_down", inflictTurns: 2, inflictChance: 0.5 }
    );
  } else if (/blue dragon|storm|lightning|thunder|will-o|djinn|air/.test(hay)) {
    moves.push(
      { name: "Tempest Arc", damageType: "Lightning", target: isBoss ? "All Allies" : "1 Ally", power: 1.08, inflictStatus: "shock", inflictTurns: 2, inflictChance: 0.5 },
      { name: "Thunder Strike", damageType: "Lightning", target: "1 Ally", power: 1.05, inflictStatus: "shock", inflictTurns: 2, inflictChance: 0.45 }
    );
  } else if (/shadow|garrick|fiend|pit |aboleth|wraith|specter|lich|vampire|cult|ghoul|necro|mind/.test(hay)) {
    moves.push(
      { name: "Dread Hex", damageType: "Shadow", target: "1 Ally", power: 1.02, inflictStatus: "curse", inflictTurns: 2, inflictChance: 0.5 },
      { name: "Abyssal Pulse", damageType: "Shadow", target: isBoss ? "All Allies" : "1 Ally", power: 1.15, inflictStatus: "curse", inflictTurns: 2, inflictChance: 0.4 }
    );
  } else if (/giant|ogre|golem|elemental|troll|brute|minotaur/.test(hay)) {
    moves.push(
      { name: "Crushing Slam", damageType: "Bludgeoning", target: "1 Ally", power: 1.1, inflictStatus: "stun", inflictTurns: 1, inflictChance: 0.25 },
      { name: "Armor Shatter", damageType: "Bludgeoning", target: "1 Ally", power: 1.02, inflictStatus: "def_down", inflictTurns: 2, inflictChance: 0.45 }
    );
  } else {
    moves.push(
      { name: "Fierce Strike", damageType: "Slashing", target: "1 Ally", power: 1.0 },
      { name: "Rending Slash", damageType: "Piercing", target: "1 Ally", power: 1.05, inflictStatus: "bleed", inflictTurns: 2, inflictChance: 0.38 }
    );
  }

  if (forceTelegraphName) {
    return {
      name: forceTelegraphName,
      damageType: moves[0]?.damageType ?? "Shadow",
      target: "All Allies",
      power: 1.45,
      inflictStatus: moves[0]?.inflictStatus,
      inflictTurns: moves[0]?.inflictTurns ?? 2,
      inflictChance: 0.7,
    };
  }
  return moves[Math.floor(Math.random() * moves.length)];
}

export const VFX_MAP: Record<string, VfxSpec> = {
  slashing_fast: { folder: "sheet_01", row: 1, color: "#e5e7eb", shake: true, frames: 6 },
  slashing_heavy: { folder: "sheet_01", row: 2, color: "#f59e0b", shake: true, frames: 6 },
  slashing_twin: { folder: "sheet_01", row: 3, color: "#f5b041", shake: true, frames: 6 },
  slashing_bleed: { folder: "sheet_01", row: 4, color: "#ef4444", shake: true, frames: 6 },
  bludgeoning_fast: { folder: "sheet_01", row: 5, color: "#d97706", shake: true, frames: 6 },
  bludgeoning_heavy: { folder: "sheet_01", row: 6, color: "#fb923c", shake: true, frames: 6 },
  piercing_melee: { folder: "sheet_02", row: 1, color: "#67e8f9", shake: true, frames: 6 },
  arrow_single: { folder: "sheet_02", row: 2, color: "#f59e0b", shake: true, frames: 6 },
  arrow_volley: { folder: "sheet_02", row: 3, color: "#38bdf8", shake: true, frames: 6 },
  fire_single: { folder: "sheet_02", row: 4, color: "#ff5722", shake: true, frames: 6 },
  fire_aoe: { folder: "sheet_02", row: 5, color: "#f97316", shake: true, frames: 6 },
  lightning: { folder: "sheet_02", row: 6, color: "#fde047", shake: true, frames: 6 },
  frost_single: { folder: "sheet_03", row: 1, color: "#4dd0e1", shake: true, frames: 6 },
  frost_aoe: { folder: "sheet_03", row: 2, color: "#38bdf8", shake: true, frames: 6 },
  poison_acid: { folder: "sheet_03", row: 3, color: "#84cc16", shake: false, frames: 6 },
  poison_spore: { folder: "sheet_03", row: 4, color: "#7ac74f", shake: false, frames: 6 },
  shadow_single: { folder: "sheet_03", row: 5, color: "#6366f1", shake: true, frames: 6 },
  radiant: { folder: "sheet_03", row: 6, color: "#fde047", shake: true, frames: 6 },
  heal_single: { folder: "sheet_04", row: 1, color: "#2ecc71", shake: false, frames: 6 },
  heal_aoe: { folder: "sheet_04", row: 2, color: "#10b981", shake: false, frames: 6 },
  revive: { folder: "sheet_04", row: 3, color: "#fbbf24", shake: false, frames: 6 },
  ward: { folder: "sheet_04", row: 4, color: "#38d9c0", shake: false, frames: 6 },
  guard: { folder: "sheet_04", row: 5, color: "#94a3b8", shake: false, frames: 6 },
  mana: { folder: "sheet_04", row: 6, color: "#3b82f6", shake: false, frames: 6 },
  nature_vine: { folder: "sheet_05", row: 1, color: "#22c55e", shake: true, frames: 6 },
  cleanse: { folder: "sheet_05", row: 2, color: "#5eead4", shake: false, frames: 6 },
  buff: { folder: "sheet_05", row: 3, color: "#eab308", shake: false, frames: 6 },
  shadow_aoe: { folder: "sheet_05", row: 4, color: "#4f46e5", shake: true, frames: 6 },
  wind: { folder: "sheet_05", row: 5, color: "#67e8f9", shake: true, frames: 6 },
};

export const HERO_MAGIC_THEMES: Record<string, MagicThemeSpec> = {
  ellowyn: {
    label: "Arcane Seal",
    accentColor: "#4f85c9",
    tierNames: [
      "Initiate Sparks",
      "Stormfire Adept",
      "Sovereign Ward",
      "High Conduit",
      "Halo & Tempest",
      "Solar & Void",
      "Queen's Verdict",
      "Astral Cataclysm",
    ],
  },
  mera: {
    label: "Druidic Totem",
    accentColor: "#479e6a",
    tierNames: [
      "Briar Awakening",
      "Spore & Gale",
      "Stone & Brambles",
      "Earth & Talon",
      "Grove Tempest",
      "Sunbeam Stag",
      "Elder Fang",
      "Primal Heart",
    ],
  },
  harlan: {
    label: "Sage Remedies",
    accentColor: "#9e8a43",
    tierNames: [
      "Field Satchel",
      "Woodland Remedies",
      "Combat Tinctures",
      "Purge & Acid",
      "Mist & Elixir",
      "Master Conduit",
      "Phoenix Panacea",
      "Grand Opus",
    ],
  },
};

export function pickVfxKey(damageType = "", target = "", name = "", isHeavy = false): string {
  const dt = damageType.toLowerCase();
  const tg = target.toLowerCase();
  const nm = name.toLowerCase();

  if (nm.includes("reviv") || nm.includes("phoenix") || nm.includes("undying")) return "revive";
  if (nm.includes("cleanse") || nm.includes("antidote") || nm.includes("smelling") || nm.includes("panacea")) return "cleanse";
  if (nm.includes("mana") || dt === "arcane") return "mana";
  if (nm.includes("ward") || nm.includes("aegis") || nm.includes("veil") || nm.includes("sanctuary")) return "ward";
  if (
    dt.includes("restor") ||
    nm.includes("heal") ||
    nm.includes("mend") ||
    nm.includes("balm") ||
    nm.includes("poultice") ||
    nm.includes("salve") ||
    nm.includes("elixir") ||
    nm.includes("bloom") ||
    nm.includes("rain") ||
    nm.includes("potion") ||
    nm.includes("draught")
  ) {
    return tg.includes("all") ? "heal_aoe" : "heal_single";
  }
  if (dt.includes("nature")) {
    return nm.includes("thorn") || nm.includes("briar") || nm.includes("vine") || nm.includes("snare")
      ? "nature_vine"
      : "buff";
  }
  if (dt.includes("fire")) {
    return tg.includes("all") || tg.includes("splash") || nm.includes("meteor") || nm.includes("fireball") || nm.includes("wall")
      ? "fire_aoe"
      : "fire_single";
  }
  if (dt.includes("frost")) {
    return tg.includes("all") || nm.includes("blizzard") || nm.includes("prison") ? "frost_aoe" : "frost_single";
  }
  if (dt.includes("lightning")) return "lightning";
  if (dt.includes("poison")) {
    return nm.includes("spore") || nm.includes("cloud") || nm.includes("mist") ? "poison_spore" : "poison_acid";
  }
  if (dt.includes("shadow")) {
    return tg.includes("all") || nm.includes("eclipse") || nm.includes("void") ? "shadow_aoe" : "shadow_single";
  }
  if (dt.includes("radiant")) return "radiant";
  if (dt.includes("bludge")) return isHeavy ? "bludgeoning_heavy" : "bludgeoning_fast";
  if (dt.includes("pierc")) {
    if (nm.includes("arrow") || nm.includes("bolt") || nm.includes("crank") || nm.includes("volley") || nm.includes("snap")) {
      return isHeavy || nm.includes("volley") ? "arrow_volley" : "arrow_single";
    }
    return "piercing_melee";
  }
  if (dt.includes("slash")) return isHeavy ? "slashing_heavy" : nm.includes("whirl") || nm.includes("twin") ? "slashing_twin" : "slashing_fast";
  return "slashing_fast";
}

export function buildHeroDisciplineModifiers(
  heroEntry: HeroDisciplinesEntry | undefined,
  chosenByTier: Record<string, string> | undefined
): { badges: BattleHeroDisciplineBadge[]; mods: HeroDisciplineModifiers } {
  const { badges, mods } = buildFullDisciplineProfile(heroEntry, chosenByTier);
  return { badges, mods };
}

const BIOME_TO_STAGE_ID: Record<string, string> = {
  "Crownland Meadows": "biome_01_crownland_meadows",
  "Oakleaf Groves": "biome_02_oakleaf_groves",
  "Crown Sea": "biome_03_coastal_shore_crown_sea",
  "Upland Foothills": "biome_04_upland_foothills",
  "Sunlit Downs": "biome_05_sunlit_downs",
  "Graystone Foothills": "biome_06_graystone_foothills",
  "Sandstone Ridges": "biome_07_sandstone_ridges",
  "Saltmarsh Wetlands": "biome_08_saltmarsh_wetlands",
  "Saltmarsh Waterways": "biome_09_saltmarsh_waterways_shore",
  "Thornwall Slate Crags": "biome_10_thornwall_slate_crags",
  "Ochre Grasslands": "biome_11_ochre_grasslands",
  "Verdant Canopy Woods": "biome_12_verdant_canopy_woods",
  "Weald Clearings": "biome_13_weald_clearings",
  "Borderland Channel": "biome_14_borderland_channel_shore",
  "Blighted Mire-Glade": "biome_15_blighted_mire_glade",
  "Highland Foothills": "biome_16_highland_foothills",
  "Alpine Foothills": "biome_23_ironcrest_foothills",
  "Sandy Cove Beaches": "biome_17_sandy_cove_beaches",
  "Veridian Coast Beaches": "biome_17_sandy_cove_beaches",
  "Sun-Scorched Dunes": "biome_18_sun_scorched_dunes",
  "Sandstone Mesas": "biome_19_sandstone_mesas",
  "Oasis & Alpine Lakes": "biome_20_oasis_alpine_lakes_shore",
  "Palm Oasis Verge": "biome_21_palm_oasis_verge",
  "Granite Highland Ridge": "biome_22_granite_highland_ridge",
  "Ironcrest Foothills": "biome_23_ironcrest_foothills",
  "Highland Oak Woods": "biome_24_highland_oak_woods",
  "Evergreen Pine Forest": "biome_25_evergreen_pine_forest",
  "Ironcrest Alpine Meadow": "biome_26_ironcrest_alpine_meadow",
  "Frostbound Foothills": "biome_27_frostbound_foothills",
  "Frostpine Taiga": "biome_28_frostpine_taiga",
  "Glacial Snowfields": "biome_29_glacial_snowfields",
  "Ashen Border Scree": "biome_30_ashen_border_scree",
  "Dreadwaste Basalt Crags": "biome_30_ashen_border_scree",
  "Frost-Shore Beaches": "biome_31_frost_shore_beaches",
  "Frozen Glacial Lakes": "biome_32_frozen_glacial_lakes",
  "Charred Ash Plains": "biome_33_charred_ash_plains",
  "Black Lava Mountain": "biome_33_charred_ash_plains",
  "Frostbound Ocean": "biome_34_coastal_shore_frostbound_ocean",
};

const PORTAL_STAGE_MAP: Array<{ keys: string[]; portalNum: number; stageId: string }> = [
  { keys: ["ashen gate", "portal_1", "loc_05"], portalNum: 1, stageId: "biome_35_portal_1_ashen_gate" },
  { keys: ["sunken maw", "portal_2", "loc_10"], portalNum: 2, stageId: "biome_36_portal_2_sunken_maw" },
  { keys: ["iron rift", "portal_3", "loc_15"], portalNum: 3, stageId: "biome_37_portal_3_iron_rift" },
  { keys: ["rotspire", "portal_4", "loc_20"], portalNum: 4, stageId: "biome_38_portal_4_rotspire" },
  { keys: ["scorched chasm", "portal_5", "loc_25"], portalNum: 5, stageId: "biome_39_portal_5_scorched_chasm" },
  { keys: ["storm-crowned", "storm crowned", "storm_crowned", "portal_6", "loc_30"], portalNum: 6, stageId: "biome_40_portal_6_storm_crowned_spire" },
  { keys: ["pale abyss", "portal_7", "loc_35"], portalNum: 7, stageId: "biome_41_portal_7_pale_abyss" },
  { keys: ["eclipse gate", "garrick", "demon", "citadel", "black keep", "portal_8", "loc_39", "loc_40"], portalNum: 8, stageId: "biome_33_charred_ash_plains" },
];

export function resolveBattleStage(
  config: BattleConfigData,
  opts: {
    mapId: string;
    biomeName: string;
    nearWaterKind: "ocean" | "inland_water" | null;
    portalLoc?: WorldLocation | null;
  }
): { stage: BattleStageConfig; portalNum: number | null } {
  const byId = new Map(config.stages.map((s) => [s.id, s]));

  if (opts.portalLoc) {
    if (typeof opts.portalLoc.portalNum === "number" && opts.portalLoc.portalNum >= 1 && opts.portalLoc.portalNum <= 8) {
      const byNum = PORTAL_STAGE_MAP.find((p) => p.portalNum === opts.portalLoc!.portalNum);
      if (byNum) {
        return { stage: byId.get(byNum.stageId) ?? config.stages[0], portalNum: byNum.portalNum };
      }
    }
    const hay = `${opts.portalLoc.id} ${opts.portalLoc.name}`.toLowerCase();
    for (const p of PORTAL_STAGE_MAP) {
      if (p.keys.some((k) => hay.includes(k))) {
        return {
          stage: byId.get(p.stageId) ?? config.stages[0],
          portalNum: p.portalNum,
        };
      }
    }
    return { stage: byId.get("biome_35_portal_1_ashen_gate") ?? config.stages[0], portalNum: 1 };
  }

  // 4-Hex Ocean / Inland Water coastal buffer staging (~45% chance on shoreline tiles)
  if (opts.nearWaterKind === "ocean" && Math.random() < 0.45) {
    const coastalStageId =
      opts.mapId === "map_01"
        ? "biome_03_coastal_shore_crown_sea"
        : opts.mapId === "map_02" || opts.mapId === "map_03"
          ? "biome_17_sandy_cove_beaches"
          : "biome_34_coastal_shore_frostbound_ocean";
    const st = byId.get(coastalStageId);
    if (st) return { stage: st, portalNum: null };
  } else if (opts.nearWaterKind === "inland_water" && Math.random() < 0.42) {
    const inlandId =
      opts.mapId === "map_01"
        ? "biome_09_saltmarsh_waterways_shore"
        : opts.mapId === "map_02"
          ? "biome_14_borderland_channel_shore"
          : opts.mapId === "map_03"
            ? "biome_20_oasis_alpine_lakes_shore"
            : "biome_32_frozen_glacial_lakes";
    const st = byId.get(inlandId);
    if (st) return { stage: st, portalNum: null };
  }

  const directId = BIOME_TO_STAGE_ID[opts.biomeName];
  if (directId && byId.has(directId)) {
    return { stage: byId.get(directId)!, portalNum: null };
  }
  const byName = config.stages.find((s) => s.name.toLowerCase() === opts.biomeName.toLowerCase());
  return { stage: byName ?? config.stages[0], portalNum: null };
}

function parseDamageTypeList(raw?: string): string[] {
  if (!raw || raw.toLowerCase() === "none") return [];
  return raw
    .split(/[,/]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function packEncounterIntoGrid(
  enemies: BattleEnemyUnit[],
  stage: BattleStageConfig
): PackedEnemyPlacement[] {
  const eg = stage.enemyGrid;
  const cols = Math.max(2, eg.cols ?? 4);
  const rows = Math.max(2, eg.rows ?? 3);
  const grid = Array.from({ length: rows }, () => Array(cols).fill(false));
  const placements: PackedEnemyPlacement[] = [];

  const fitsAt = (r0: number, c0: number, gw: number, gh: number) => {
    if (r0 < 0 || c0 < 0 || r0 + gh > rows || c0 + gw > cols) return false;
    for (let r = r0; r < r0 + gh; r++) {
      for (let c = c0; c < c0 + gw; c++) {
        if (grid[r][c]) return false;
      }
    }
    return true;
  };
  const occupy = (r0: number, c0: number, gw: number, gh: number) => {
    for (let r = r0; r < r0 + gh; r++) {
      for (let c = c0; c < c0 + gw; c++) grid[r][c] = true;
    }
  };

  const ordered = [...enemies];
  const unplaced: BattleEnemyUnit[] = [];
  for (const unit of ordered) {
    const gw = Math.min(cols, Math.max(1, unit.gw));
    const gh = Math.min(rows, Math.max(1, unit.gh));
    if (unit.r0 >= 0 && unit.c0 >= 0 && fitsAt(unit.r0, unit.c0, gw, gh)) {
      occupy(unit.r0, unit.c0, gw, gh);
      placements.push(buildPlacement(unit, unit.r0, unit.c0, gw, gh, cols, rows, eg, false));
    } else {
      unplaced.push(unit);
    }
  }

  unplaced.sort((a, b) => b.gw * b.gh - a.gw * a.gh);
  const staggeredSmallSlots: Array<[number, number]> =
    cols >= 4 && rows >= 3
      ? [
          [1, 0],
          [0, 1],
          [2, 1],
          [1, 2],
          [2, 2],
          [0, 2],
          [1, 3],
          [0, 3],
          [2, 3],
          [0, 0],
          [2, 0],
          [1, 1],
        ]
      : [];

  for (const unit of unplaced) {
    const gw = Math.min(cols, Math.max(1, unit.gw));
    const gh = Math.min(rows, Math.max(1, unit.gh));
    let placed = false;
    if (gw === 1 && gh === 1 && staggeredSmallSlots.length > 0) {
      for (const [r0, c0] of staggeredSmallSlots) {
        if (fitsAt(r0, c0, 1, 1)) {
          occupy(r0, c0, 1, 1);
          unit.r0 = r0;
          unit.c0 = c0;
          placements.push(buildPlacement(unit, r0, c0, 1, 1, cols, rows, eg, false));
          placed = true;
          break;
        }
      }
    }
    for (let c0 = 0; c0 <= cols - gw && !placed; c0++) {
      for (let r0 = 0; r0 <= rows - gh && !placed; r0++) {
        if (fitsAt(r0, c0, gw, gh)) {
          occupy(r0, c0, gw, gh);
          unit.r0 = r0;
          unit.c0 = c0;
          placements.push(buildPlacement(unit, r0, c0, gw, gh, cols, rows, eg, false));
          placed = true;
        }
      }
    }
    if (!placed) {
      placements.push(buildPlacement(unit, 0, 0, gw, gh, cols, rows, eg, true));
    }
  }

  return placements;
}

function buildPlacement(
  unit: BattleEnemyUnit,
  r0: number,
  c0: number,
  gw: number,
  gh: number,
  cols: number,
  rows: number,
  eg: BattleStageConfig["enemyGrid"],
  overflow: boolean
): PackedEnemyPlacement {
  const cellW = 100 / cols;
  const cellH = 100 / rows;
  const backScale = eg.backRowScale ?? 0.84;
  const frontScale = eg.frontRowScale ?? 1.0;
  const rowCenter = r0 + gh / 2;
  const tDepth = rows <= 1 ? 1 : (rowCenter - 0.5) / Math.max(1, rows - 1);
  const depthScale = backScale + (frontScale - backScale) * Math.max(0, Math.min(1, tDepth));
  return {
    unit,
    xPct: c0 * cellW,
    yPct: r0 * cellH,
    wPct: gw * cellW,
    hPct: gh * cellH,
    zIndex: Math.round((r0 + gh) * 10 + c0),
    depthScale,
    overflow,
  };
}

let seqCounter = 1;

const ZONE_LEVEL_BENCHMARKS: ReadonlyArray<readonly [number, number, number]> = [
  [1, 28, 4.2],
  [3, 43, 5.5],
  [8, 96, 9.3],
  [13, 155, 13.5],
  [18, 320, 26.2],
  [23, 476, 34.0],
  [28, 674, 41.5],
  [33, 1077, 52.3],
  [38, 1313, 73.5],
  [43, 1891, 85.5],
  [48, 2341, 96.7],
  [53, 2760, 110.3],
  [58, 3622, 125.7],
  [63, 4369, 160.2],
  [68, 5388, 180.5],
  [73, 5880, 199.8],
  [78, 6928, 222.3],
  [83, 7783, 277.7],
  [88, 9116, 304.2],
  [93, 10171, 334.5],
  [98, 11756, 374.7],
  [99, 12100, 384.0],
];

function sampleZoneBenchmark(level: number): { hp: number; off: number } {
  const lv = Math.max(1, Math.min(99, level));
  for (let i = 0; i < ZONE_LEVEL_BENCHMARKS.length - 1; i++) {
    const [l0, h0, o0] = ZONE_LEVEL_BENCHMARKS[i];
    const [l1, h1, o1] = ZONE_LEVEL_BENCHMARKS[i + 1];
    if (lv <= l1) {
      const t = (lv - l0) / Math.max(1, l1 - l0);
      return {
        hp: h0 + (h1 - h0) * t,
        off: o0 + (o1 - o0) * t,
      };
    }
  }
  return { hp: 12100, off: 384 };
}

function computeHeroBattleSpeed(
  heroId: HeroId,
  finesse: number,
  heroEq: Partial<Record<string, string>>,
  itemsById: Record<string, ItemEntry>
): number {
  const armor = heroEq.body ? itemsById[heroEq.body] : undefined;
  const offhand = heroEq.left_hand ? itemsById[heroEq.left_hand] : undefined;
  let base =
    heroId === "rowan" || heroId === "valen"
      ? 17
      : heroId === "ellowyn" || heroId === "harlan" || heroId === "mera"
        ? 15
        : 13;
  if (armor?.weight === "Light") base += 2;
  else if (armor?.weight === "Heavy") base -= 2;
  if (offhand?.category === "shield") base -= 1;
  return base + Math.round(Math.max(0, finesse - 1) * 0.45);
}

function computeEnemyBattleSpeed(def: BattleEnemyDef, lv: number, isBoss: boolean): number {
  const role = (def.role ?? "").toLowerCase();
  let base = 15;
  if (role.includes("skirmish") || role.includes("beast")) base = 19;
  else if (role.includes("caster") || role.includes("hybrid")) base = 16;
  else if (role.includes("fighter")) base = 15;
  else if (role.includes("heavy")) base = 12;
  if (isBoss) base = 20;
  return base + Math.round(Math.max(0, lv - 1) * 0.42);
}

function instantiateEnemyUnit(
  def: BattleEnemyDef,
  zoneMin: number,
  zoneMax: number,
  packOpts?: { packCount: number; isBossFight: boolean }
): BattleEnemyUnit {
  const zoneMid = Math.round((zoneMin + zoneMax) / 2);
  const rawLv = Math.max(1, def.level ?? zoneMid);
  const inNativeZone = !def.isBoss && rawLv >= zoneMin && rawLv <= zoneMax;
  const lv = def.isBoss
    ? Math.max(zoneMid, rawLv)
    : inNativeZone
      ? rawLv
      : Math.max(zoneMin, Math.min(zoneMax, zoneMid + Math.floor(Math.random() * 3) - 1));

  let scaledHp = def.hp;
  let scaledAtk = def.atk;
  let scaledMag = def.mag ?? 0;
  let scaledGuard = Math.max(0, def.guard ?? (def.isBoss ? 4 : 0));

  if (!def.isBoss && !inNativeZone) {
    const rawBench = sampleZoneBenchmark(rawLv);
    const tgtBench = sampleZoneBenchmark(lv);
    const hpMul = tgtBench.hp / Math.max(1, rawBench.hp);
    const offMul = tgtBench.off / Math.max(1, rawBench.off);
    scaledHp = Math.max(24, Math.round(def.hp * hpMul));
    scaledAtk = def.atk > 0 ? Math.max(2, Math.round(def.atk * offMul)) : 0;
    scaledMag = (def.mag ?? 0) > 0 ? Math.max(2, Math.round((def.mag ?? 0) * offMul)) : 0;
    scaledGuard = lv <= 10 ? 0 : lv <= 30 ? Math.min(1, scaledGuard) : Math.min(2, scaledGuard);
  }

  const nPack = Math.max(1, packOpts?.packCount ?? 1);
  const isBossFight = Boolean(packOpts?.isBossFight || def.isBoss);
  const hpPackScale = isBossFight
    ? 1.0
    : nPack === 1
      ? 1.35
      : nPack === 2
        ? 1.05
        : nPack === 3
          ? 0.92
          : nPack === 4
            ? 0.8
            : 0.72;
  const dmgPackScale = isBossFight
    ? 1.15
    : nPack <= 2
      ? 1.0
      : nPack === 3
        ? 0.88
        : nPack === 4
          ? 0.78
          : 0.7;
  const lootScale = isBossFight ? 1.0 : nPack === 1 ? 1.85 : nPack === 2 ? 1.15 : 2.45 / nPack;

  // Smooth early Lv 1-6 enemy HP lift & Portal #1-#2 durability so packs take real multi-round exchanges
  const earlyLift = !def.isBoss && lv <= 6 ? 1 + ((7 - lv) / 6) * 0.42 : 1.0;
  const bossBoost = def.isBoss && def.portalNum === 1 ? 1.4 : def.isBoss && def.portalNum === 2 ? 1.2 : 1.0;

  const maxHp = def.isBoss
    ? Math.max(250, Math.round(def.hp * bossBoost))
    : Math.max(28, Math.round(scaledHp * earlyLift * hpPackScale));
  const rawXp = def.isBoss
    ? (def.xp ?? Math.max(400, Math.round(120 + lv * 140 + lv * lv * 6.2)))
    : Math.max(4, Math.round((3 + lv * 0.9 + lv * lv * 0.19) * lootScale));
  const earlySilverLift = lv <= 15 ? ((16 - lv) / 15) * 2.5 : 0;
  const rawSilver = def.isBoss
    ? (def.silver ?? Math.max(300, Math.round(50 + lv * 80 + lv * lv * 11.5)))
    : Math.max(2, Math.round((0.7 + earlySilverLift + lv * 0.22 + lv * lv * lv * 0.0014) * lootScale));
  const pDef = def.pDef && inNativeZone ? def.pDef : Math.round(2 + lv * 0.85);
  const mDef = def.mDef && inNativeZone ? def.mDef : Math.round(2 + lv * 0.8);

  return {
    instanceId: `foe_${seqCounter++}_${def.id}`,
    mobId: def.id,
    name: def.name,
    level: lv,
    role: def.role ?? "Enemy",
    maxHp,
    curHp: maxHp,
    atk: scaledAtk > 0 ? Math.max(2, Math.round(scaledAtk)) : (scaledMag > 0 ? 0 : 4),
    mag: Math.max(0, Math.round(scaledMag)),
    pDef,
    mDef,
    xpReward: rawXp,
    silverReward: rawSilver,
    weakTypes: parseDamageTypeList(def.weak),
    resistTypes: parseDamageTypeList(def.resist),
    revealedWeaknesses: [],
    guardMax: scaledGuard,
    guardCur: scaledGuard,
    staggeredTurns: 0,
    telegraphedMove: null,
    isBoss: Boolean(def.isBoss),
    portalNum: def.portalNum ?? null,
    r0: -1,
    c0: -1,
    gw: Math.max(1, def.gridW ?? 1),
    gh: Math.max(1, def.gridH ?? 1),
    visualScale: def.visualScale ?? 1.0,
    flipX: Boolean(def.flipX),
    iconPath: def.iconPath,
    actedThisRound: false,
    speed: computeEnemyBattleSpeed(def, lv, Boolean(def.isBoss)),
    packDamageMul: dmgPackScale,
    staggerImmuneUntilAction: false,
    statuses: [],
    rawDef: def,
  };
}

function pickProceduralEncounterDefs(
  config: BattleConfigData,
  stage: BattleStageConfig,
  zoneCode: number,
  zoneMin: number,
  zoneMax: number
): BattleEnemyDef[] {
  const byName = new Map(config.monsters.filter((m) => !m.isBoss).map((m) => [m.name.toLowerCase(), m]));
  const curatedNames = stage.zoneSpawns?.[String(zoneCode)] ?? [];
  let pool = curatedNames.map((n) => byName.get(n.toLowerCase())).filter((m): m is BattleEnemyDef => Boolean(m));

  const spawnNames = new Set((stage.spawnNames ?? []).map((n) => n.toLowerCase()));
  if (pool.length === 0 && spawnNames.size > 0) {
    pool = config.monsters.filter(
      (m) =>
        !m.isBoss &&
        spawnNames.has(m.name.toLowerCase()) &&
        typeof m.level === "number" &&
        m.level >= zoneMin &&
        m.level <= zoneMax
    );
  }
  if (pool.length === 0 && spawnNames.size > 0) {
    pool = config.monsters.filter((m) => !m.isBoss && spawnNames.has(m.name.toLowerCase()));
  }
  if (pool.length === 0) {
    pool = config.monsters.filter(
      (m) =>
        !m.isBoss &&
        typeof m.level === "number" &&
        m.level >= Math.max(1, zoneMin - 4) &&
        m.level <= zoneMax + 4
    );
  }
  if (pool.length === 0) {
    pool = config.monsters.filter((m) => !m.isBoss);
  }

  let smallPool = pool.filter((m) => (m.gridW ?? 1) === 1 && (m.gridH ?? 1) === 1);
  if (smallPool.length === 0 && spawnNames.size > 0) {
    smallPool = config.monsters.filter(
      (m) => !m.isBoss && spawnNames.has(m.name.toLowerCase()) && (m.gridW ?? 1) === 1 && (m.gridH ?? 1) === 1
    );
  }
  if (smallPool.length === 0) {
    smallPool = config.monsters.filter(
      (m) =>
        !m.isBoss &&
        (m.gridW ?? 1) === 1 &&
        (m.gridH ?? 1) === 1 &&
        typeof m.level === "number" &&
        m.level >= Math.max(1, zoneMin - 5) &&
        m.level <= zoneMax + 5
    );
  }
  if (smallPool.length === 0) {
    smallPool = config.monsters.filter((m) => !m.isBoss && (m.gridW ?? 1) === 1 && (m.gridH ?? 1) === 1);
  }

  const cols = Math.max(2, stage.enemyGrid.cols ?? 4);
  const rows = Math.max(2, stage.enemyGrid.rows ?? 3);
  const grid = Array.from({ length: rows }, () => Array(cols).fill(false));
  const placeDef = (def: BattleEnemyDef): boolean => {
    const gw = Math.min(cols, Math.max(1, def.gridW ?? 1));
    const gh = Math.min(rows, Math.max(1, def.gridH ?? 1));
    for (let c0 = 0; c0 <= cols - gw; c0++) {
      for (let r0 = 0; r0 <= rows - gh; r0++) {
        let fits = true;
        for (let r = r0; r < r0 + gh && fits; r++) {
          for (let c = c0; c < c0 + gw && fits; c++) {
            if (grid[r][c]) fits = false;
          }
        }
        if (fits) {
          for (let r = r0; r < r0 + gh; r++) {
            for (let c = c0; c < c0 + gw; c++) grid[r][c] = true;
          }
          return true;
        }
      }
    }
    return false;
  };

  const randOf = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  const midZoneLv = Math.round((zoneMin + zoneMax) / 2);
  const medPool = pool.filter((m) => (m.gridW ?? 1) === 2 || (m.gridH ?? 1) === 2);

  const chosenDefs: BattleEnemyDef[] = [];
  const lead = randOf(pool);
  const lw = lead.gridW ?? 1;
  const lh = lead.gridH ?? 1;

  if (lw >= 3 || lh >= 3) {
    if (placeDef(lead)) chosenDefs.push(lead);
    if (smallPool.length > 0 && Math.random() < 0.78) {
      const escorts = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < escorts; i++) {
        const s = randOf(smallPool);
        if (placeDef(s)) chosenDefs.push(s);
      }
    }
  } else if (lw === 2 || lh === 2) {
    if (placeDef(lead)) chosenDefs.push(lead);
    if (medPool.length > 0 && Math.random() < 0.4) {
      const s2 = randOf(medPool);
      if (placeDef(s2)) chosenDefs.push(s2);
      if (smallPool.length > 0) {
        const extra = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < extra; i++) {
          const s = randOf(smallPool);
          if (placeDef(s)) chosenDefs.push(s);
        }
      }
    } else if (smallPool.length > 0) {
      const escorts = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < escorts; i++) {
        const s = randOf(smallPool);
        if (placeDef(s)) chosenDefs.push(s);
      }
    }
  } else {
    const roll = Math.random();
    const target =
      midZoneLv <= 4
        ? roll < 0.3
          ? 3
          : roll < 0.8
            ? 4
            : 5
        : roll < 0.25
          ? 3
          : roll < 0.75
            ? 4
            : 5;
    const activeSmallPool = smallPool.length >= 2 ? smallPool : pool;
    for (let i = 0; i < target; i++) {
      const pick = activeSmallPool.length > 0 ? randOf(activeSmallPool) : lead;
      if (placeDef(pick)) chosenDefs.push(pick);
    }
  }

  return chosenDefs.length > 0 ? chosenDefs : [lead];
}

export function createBattleState(params: {
  config: BattleConfigData;
  partyOrder: HeroId[];
  level: number;
  heroLevels?: Partial<Record<HeroId, number>>;
  heroSpentAttrs: Partial<Record<HeroId, HeroAttrMap>>;
  equippedByHero: EquippedGearMap;
  itemsById: Record<string, ItemEntry>;
  socketsByHero: HeroSocketsMap;
  heroHpPct: Partial<Record<HeroId, number>>;
  heroMpPct: Partial<Record<HeroId, number>>;
  disciplinesByHero: Partial<Record<HeroId, HeroDisciplinesEntry>>;
  chosenDisciplinesByHero: ChosenDisciplinesMap;
  mapId: string;
  biomeName: string;
  zoneName: string;
  zoneCode: number;
  zoneMin: number;
  zoneMax: number;
  nearWaterKind: "ocean" | "inland_water" | null;
  portalLoc?: WorldLocation | null;
}): BattleState {
  const { stage, portalNum } = resolveBattleStage(params.config, {
    mapId: params.mapId,
    biomeName: params.biomeName,
    nearWaterKind: params.nearWaterKind,
    portalLoc: params.portalLoc,
  });

  // Build Hero combat units using each Hero's individual Level
  const heroes: BattleHeroUnit[] = params.partyOrder.map((hid, slotIdx) => {
    const heroDef = getHeroById(hid);
    const heroLv = getHeroLevel(params.heroLevels, hid, params.level);
    const vitals = computeHeroVitals(
      hid,
      heroLv,
      params.heroSpentAttrs,
      params.equippedByHero,
      params.itemsById,
      params.socketsByHero,
      params.heroHpPct,
      params.heroMpPct
    );
    const attrs = getHeroAttributes(hid, heroLv, params.heroSpentAttrs);
    const wpnId = params.equippedByHero[hid]?.right_hand;
    const wpn = wpnId ? params.itemsById[wpnId] : undefined;
    const rawLeftId = params.equippedByHero[hid]?.left_hand;
    const rawLeft = rawLeftId ? params.itemsById[rawLeftId] : undefined;
    const offhandWpn = canDualWieldItem(hid, rawLeft) ? rawLeft : undefined;
    const hasShield = rawLeft?.category === "shield";
    const rightWpnAtk = Number(wpn?.stats?.attackPower ?? 0);
    const leftWpnAtk = Number(offhandWpn?.stats?.attackPower ?? 0);
    const stones = [params.socketsByHero[hid]?.weapon, params.socketsByHero[hid]?.armor];
    const { badges, mods, passives } = buildFullDisciplineProfile(
      params.disciplinesByHero[hid],
      params.chosenDisciplinesByHero[hid],
      stones
    );

    const effectivePDefPct = mods.pDefPct + (hasShield ? passives.shieldPDefPct : 0);
    const effectiveDodge = vitals.dodge + mods.dodgePct + (hasShield ? passives.shieldDodgePct : 0);
    const effectiveCrit =
      vitals.crit + mods.critPct + (wpn?.subType === "Spear" ? passives.spearCritPct : 0);
    const effectiveStatusResist =
      Math.round(attrs.grit * 0.5) + mods.statusResistPct + (hasShield ? passives.shieldStunResistPct : 0);

    const maxHp = Math.max(30, Math.round(vitals.maxHp * (1 + mods.maxHpPct / 100)));
    const curHp = Math.max(1, Math.min(maxHp, Math.round((maxHp * (params.heroHpPct[hid] ?? 100)) / 100)));
    const maxMp = vitals.hasMp ? Math.max(10, Math.round(vitals.maxMp * (1 + mods.maxMpPct / 100))) : 0;
    const curMp = vitals.hasMp ? Math.max(0, Math.min(maxMp, Math.round((maxMp * (params.heroMpPct[hid] ?? 100)) / 100))) : 0;

    const unit: BattleHeroUnit = {
      heroId: hid,
      name: heroDef.name,
      className: heroDef.className,
      level: heroLv,
      slotIdx,
      speed: computeHeroBattleSpeed(hid, attrs.finesse, params.equippedByHero[hid] ?? {}, params.itemsById),
      maxHp,
      curHp,
      maxMp,
      curMp,
      hasMp: vitals.hasMp,
      atk: Math.round(vitals.atk * (1 + mods.atkPct / 100)),
      mag: Math.round(vitals.mag * (1 + mods.magPct / 100)),
      heal: Math.round(vitals.heal * (1 + mods.healPct / 100)),
      pDef: Math.round(vitals.pDef * (1 + effectivePDefPct / 100)),
      mDef: Math.round(vitals.mDef * (1 + mods.mDefPct / 100)),
      critPct: Math.min(75, effectiveCrit),
      dodgePct: Math.min(45, effectiveDodge),
      armorPiercePct: mods.armorPiercePct,
      statusResistPct: Math.min(65, effectiveStatusResist),
      weaponName: wpn?.name ?? "Unarmed",
      weaponSubType: wpn?.subType ?? "Unarmed",
      weaponDamageType: wpn?.damageType ?? "Bludgeoning",
      hasShield,
      offhandWeaponName: offhandWpn?.name,
      offhandWeaponSubType: offhandWpn?.subType,
      offhandWeaponDamageType: offhandWpn?.damageType,
      offhandAtk: offhandWpn ? Math.max(1, Math.round((vitals.atk - rightWpnAtk + leftWpnAtk) * (1 + mods.atkPct / 100))) : 0,
      shieldHp: 0,
      guarding: false,
      momentum: false,
      actedThisRound: false,
      bonusTurnUsedThisRound: false,
      bonusTurnUsedThisBattle: false,
      cadenceStacks: 0,
      battleWrathStacks: 0,
      skillCooldowns: {},
      statuses: [],
      disciplines: badges,
      mods,
      passives,
      avatarPath: heroDef.avatarPath,
    };
    if (passives.startWardShieldPct > 0) {
      grantWardShield(unit, passives.startWardShieldPct);
    }
    return unit;
  });

  // Pick enemies matched cleanly to Portal Boss or procedural biome/zone encounter
  let chosenDefs: BattleEnemyDef[] = [];

  if (portalNum !== null) {
    const boss =
      params.config.monsters.find((m) => m.isBoss && m.portalNum === portalNum) ??
      params.config.monsters.find((m) => m.isBoss);
    if (boss) chosenDefs = [boss];
  } else {
    chosenDefs = pickProceduralEncounterDefs(params.config, stage, params.zoneCode, params.zoneMin, params.zoneMax);
  }

  const enemies = chosenDefs.map((d) =>
    instantiateEnemyUnit(d, params.zoneMin, params.zoneMax, {
      packCount: chosenDefs.length,
      isBossFight: portalNum !== null,
    })
  );
  packEncounterIntoGrid(enemies, stage);

  // Orin Lv10 Rallying Horn: opening party Empowered buff at start of battle
  const rallyTurns = Math.max(0, ...heroes.map((h) => h.passives.partyStartEmpowerTurns));
  if (rallyTurns > 0) {
    for (const h of heroes) {
      h.statuses = upsertStatusEffect(h.statuses, "haste", rallyTurns);
    }
  }

  // Build Speed-Interleaved Round 1 Turn Order
  const battleId = `b_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const state: BattleState = {
    battleId,
    stage,
    biomeName: params.biomeName,
    zoneName: params.zoneName,
    zoneCode: params.zoneCode,
    isBossBattle: portalNum !== null,
    portalLoc: params.portalLoc ?? null,
    heroes,
    enemies,
    consumedPotions: {},
    activeActor: { kind: "hero", heroId: heroes[0]?.heroId ?? "valen" },
    roundQueue: [],
    phase: "player_turn",
    bannerText: `${heroes[0]?.name ?? "Party"}'s turn — choose an action`,
    totalXpEarned: 0,
    totalSilverEarned: 0,
    droppedTradeGoods: {},
    turnCounter: 1,
    combatLog: [
      `[R1] Encounter started in ${params.zoneName} (${params.biomeName})${portalNum !== null ? ` · Portal Boss #${portalNum}` : ""}`,
    ],
  };

  state.roundQueue = buildRoundQueue(state, true);
  advanceToNextTurnInRound(state);
  if (state.activeActor.kind === "hero") {
    const firstHero = heroes.find((h) => h.heroId === (state.activeActor as { heroId: HeroId }).heroId);
    state.phase = "player_turn";
    if (firstHero) state.bannerText = `${firstHero.name}'s turn — choose an action`;
  } else {
    const firstEnemy = enemies.find((e) => e.instanceId === (state.activeActor as { instanceId: string }).instanceId);
    state.phase = "animating";
    if (firstEnemy) state.bannerText = `${firstEnemy.name} moves quickly!`;
  }
  return state;
}

export function appendBattleLog(state: BattleState, message: string): void {
  if (!state.combatLog) state.combatLog = [];
  state.combatLog.push(`[R${Math.max(1, state.turnCounter)}] ${message}`);
  if (state.combatLog.length > 350) {
    state.combatLog.splice(0, state.combatLog.length - 350);
  }
}

export function flushCombatLog(
  state: BattleState,
  outcome: string,
  itemsById: Record<string, ItemEntry>
): void {
  if (typeof window === "undefined" || !window.location?.protocol?.startsWith("http")) return;
  try {
    const battleId = state.battleId || `b_${state.zoneCode}_${state.enemies.map((e) => e.mobId).join("_")}`;
    state.battleId = battleId;
    const party = state.heroes.map(
      (h) => `${h.name} Lv${h.level} (${h.curHp}/${h.maxHp} HP, ${h.weaponName})`
    );
    const enemies = state.enemies.map(
      (e) => `${e.name} Lv${e.level} (${e.curHp}/${e.maxHp} HP, +${e.silverReward}s/+${e.xpReward}XP)`
    );
    const tradeGoods = Object.entries(state.droppedTradeGoods).map(([gid, qty]) => {
      const it = itemsById[gid];
      return it ? `${it.name} x${qty} (${it.sellSilver ?? 0}s ea)` : `${gid} x${qty}`;
    });
    void fetch("/api/combat-log/write", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        battleId,
        zoneName: state.zoneName,
        biomeName: state.biomeName,
        isBossBattle: state.isBossBattle,
        outcome,
        party,
        enemies,
        totalXpEarned: state.totalXpEarned,
        totalSilverEarned: state.totalSilverEarned,
        tradeGoods,
        lines: state.combatLog ?? [],
      }),
    }).catch(() => {
      // Ignore outside local dev server (e.g. standalone Electron build)
    });
  } catch {
    // Never disrupt combat UI
  }
}

export function finishHeroTurnCooldowns(hero: BattleHeroUnit, usedAction?: BattleActionSpec): void {
  if (!hero.skillCooldowns) hero.skillCooldowns = {};
  for (const [id, rem] of Object.entries(hero.skillCooldowns)) {
    if (rem <= 1) delete hero.skillCooldowns[id];
    else hero.skillCooldowns[id] = rem - 1;
  }
  if (usedAction?.cooldownTurns && usedAction.cooldownTurns > 0) {
    hero.skillCooldowns[usedAction.id] = usedAction.cooldownTurns;
  }
}

function effectiveActorInitiative(
  baseSpeed: number,
  statuses: StatusEffectState[],
  jitter = 0
): number {
  const haste = statuses.some((s) => s.kind === "haste") ? 1.22 : 1.0;
  const chill = statuses.some((s) => s.kind === "chill") ? 0.82 : 1.0;
  return baseSpeed * haste * chill + jitter;
}

export function buildRoundQueue(
  state: BattleState,
  isOpeningRound = false
): Array<{ kind: "hero"; heroId: HeroId } | { kind: "enemy"; instanceId: string }> {
  const entries: Array<{
    actor: { kind: "hero"; heroId: HeroId } | { kind: "enemy"; instanceId: string };
    score: number;
  }> = [];

  for (const h of state.heroes) {
    if (h.curHp <= 0 || h.actedThisRound) continue;
    const spd = h.speed ?? 15;
    // Slight opening slot edge for #1 leader so party feels responsive while fast enemies still weave in Round 1
    const leaderNudge = isOpeningRound && h.slotIdx === 0 ? 1.5 : 0;
    entries.push({
      actor: { kind: "hero", heroId: h.heroId },
      score: effectiveActorInitiative(spd, h.statuses, Math.random() * 4 + leaderNudge),
    });
  }

  for (const e of state.enemies) {
    if (e.curHp <= 0 || e.actedThisRound) continue;
    const spd = e.speed ?? computeEnemyBattleSpeed(e.rawDef, e.level, e.isBoss);
    entries.push({
      actor: { kind: "enemy", instanceId: e.instanceId },
      score: effectiveActorInitiative(spd, e.statuses, Math.random() * 4),
    });
  }

  entries.sort((a, b) => b.score - a.score);
  return entries.map((x) => x.actor);
}

export function advanceToNextTurnInRound(state: BattleState): void {
  const livingHeroes = state.heroes.filter((h) => h.curHp > 0);
  const livingEnemies = state.enemies.filter((e) => e.curHp > 0);
  if (livingHeroes.length === 0) {
    state.phase = "defeat";
    state.bannerText = "All companions have fallen...";
    return;
  }
  if (livingEnemies.length === 0) {
    state.phase = "victory";
    state.bannerText = "Victory! All enemies defeated.";
    return;
  }

  // Immediate Bonus Turn takes priority before returning to round queue
  const bonusHero = livingHeroes.find((h) => h.bonusTurnUsedThisRound && !h.actedThisRound);
  if (bonusHero) {
    state.activeActor = { kind: "hero", heroId: bonusHero.heroId };
    return;
  }

  if (!state.roundQueue || state.roundQueue.length === 0) {
    state.roundQueue = buildRoundQueue(state, false);
  }

  while (state.roundQueue.length > 0) {
    const next = state.roundQueue.shift()!;
    if (next.kind === "hero") {
      const h = livingHeroes.find((x) => x.heroId === next.heroId && !x.actedThisRound);
      if (h) {
        state.activeActor = { kind: "hero", heroId: h.heroId };
        return;
      }
    } else {
      const e = livingEnemies.find((x) => x.instanceId === next.instanceId && !x.actedThisRound);
      if (e) {
        state.activeActor = { kind: "enemy", instanceId: e.instanceId };
        return;
      }
    }
  }

  // Catch any unacted living unit missed by an old snapshot queue before rolling next round
  const strayHero = livingHeroes.find((h) => !h.actedThisRound);
  if (strayHero) {
    state.activeActor = { kind: "hero", heroId: strayHero.heroId };
    return;
  }
  const strayEnemy = livingEnemies.find((e) => !e.actedThisRound);
  if (strayEnemy) {
    state.activeActor = { kind: "enemy", instanceId: strayEnemy.instanceId };
    return;
  }

  state.turnCounter += 1;
  if (state.galeCanopyDodgeTurns && state.galeCanopyDodgeTurns > 0) {
    state.galeCanopyDodgeTurns -= 1;
  }
  const poisonFoeCount = Math.min(3, livingEnemies.filter((e) => e.statuses.some((s) => s.kind === "poison")).length);
  for (const h of state.heroes) {
    h.actedThisRound = false;
    h.bonusTurnUsedThisRound = false;
    h.riposteUsedThisRound = false;
    h.interceptUsedThisRound = false;
    h.dodgeHealUsedThisRound = false;
    h.coveringVolleyUsedThisRound = false;
    h.guardDodgeBonusPct = 0;
    h.guardShieldWall = false;
    if (h.curHp > 0 && h.passives.cadenceAtkPerRoundPct > 0) {
      h.cadenceStacks = Math.min(5, (h.cadenceStacks ?? 0) + 1);
    }
    if (h.adaptiveTurns && h.adaptiveTurns > 0) {
      h.adaptiveTurns -= 1;
      if (h.adaptiveTurns === 0) {
        h.adaptiveElement = undefined;
        h.adaptiveReductionPct = 0;
      }
    }
    if (h.mossWardTurns && h.mossWardTurns > 0) {
      h.mossWardTurns -= 1;
    }
    if (h.curHp > 0 && h.hasMp && poisonFoeCount > 0 && h.passives.blightSiphonMpPerPoison > 0) {
      h.curMp = Math.min(h.maxMp, h.curMp + poisonFoeCount * h.passives.blightSiphonMpPerPoison);
    }
  }
  for (const e of state.enemies) {
    e.actedThisRound = false;
    e.struckThisRoundByOrin = false;
    if (e.armorBrokenByOrinTurns && e.armorBrokenByOrinTurns > 0) e.armorBrokenByOrinTurns -= 1;
    if (e.rotCloudDoubleTurns && e.rotCloudDoubleTurns > 0) e.rotCloudDoubleTurns -= 1;
  }

  state.roundQueue = buildRoundQueue(state, false);
  const firstNext = state.roundQueue.shift();
  state.activeActor = firstNext ?? { kind: "hero", heroId: livingHeroes[0].heroId };
}

export function previewRoundOrder(state: BattleState, count = 10): TurnTimelineEntry[] {
  const livingHeroes = state.heroes.filter((h) => h.curHp > 0);
  const livingEnemies = state.enemies.filter((e) => e.curHp > 0);
  if (livingHeroes.length === 0 || livingEnemies.length === 0) return [];

  const out: TurnTimelineEntry[] = [];
  const activeId = state.activeActor.kind === "hero" ? state.activeActor.heroId : state.activeActor.instanceId;

  const pushEntry = (entry: TurnTimelineEntry) => {
    if (out.length < count) out.push(entry);
  };

  const seenCurrent = new Set<string>();
  const pushCurrentActor = (actor: { kind: "hero"; heroId: HeroId } | { kind: "enemy"; instanceId: string }) => {
    if (actor.kind === "hero") {
      if (seenCurrent.has(`h:${actor.heroId}`)) return;
      const h = livingHeroes.find((x) => x.heroId === actor.heroId && !x.actedThisRound);
      if (!h) return;
      seenCurrent.add(`h:${h.heroId}`);
      pushEntry({
        kind: "hero",
        id: h.heroId,
        name: h.name,
        iconPath: h.avatarPath,
        isActive: state.activeActor.kind === "hero" && h.heroId === activeId,
      });
    } else {
      if (seenCurrent.has(`e:${actor.instanceId}`)) return;
      const e = livingEnemies.find((x) => x.instanceId === actor.instanceId && !x.actedThisRound);
      if (!e) return;
      seenCurrent.add(`e:${e.instanceId}`);
      pushEntry({
        kind: "enemy",
        id: e.instanceId,
        name: e.name,
        iconPath: e.iconPath,
        isActive: state.activeActor.kind === "enemy" && e.instanceId === activeId,
        isTelegraphed: Boolean(e.telegraphedMove),
      });
    }
  };

  pushCurrentActor(state.activeActor);
  for (const q of state.roundQueue ?? []) {
    pushCurrentActor(q);
  }
  for (const h of livingHeroes) {
    if (!h.actedThisRound) pushCurrentActor({ kind: "hero", heroId: h.heroId });
  }
  for (const e of livingEnemies) {
    if (!e.actedThisRound) pushCurrentActor({ kind: "enemy", instanceId: e.instanceId });
  }

  if (out.length > 0 && out.length < count) {
    pushEntry({
      kind: "round_break",
      id: `round_${state.turnCounter + 1}`,
      name: `Round ${state.turnCounter + 1}`,
      iconPath: "",
      isActive: false,
    });
  }

  const nextRoundSorted: Array<{ init: number; entry: TurnTimelineEntry }> = [];
  for (const h of livingHeroes) {
    nextRoundSorted.push({
      init: effectiveActorInitiative(h.speed ?? 15, h.statuses, -h.slotIdx * 0.05),
      entry: {
        kind: "hero",
        id: `${h.heroId}_next`,
        name: h.name,
        iconPath: h.avatarPath,
        isActive: false,
      },
    });
  }
  for (const e of livingEnemies) {
    nextRoundSorted.push({
      init: effectiveActorInitiative(e.speed ?? computeEnemyBattleSpeed(e.rawDef, e.level, e.isBoss), e.statuses, 0),
      entry: {
        kind: "enemy",
        id: `${e.instanceId}_next`,
        name: e.name,
        iconPath: e.iconPath,
        isActive: false,
        isTelegraphed: Boolean(e.telegraphedMove),
      },
    });
  }
  nextRoundSorted.sort((a, b) => b.init - a.init);
  for (const item of nextRoundSorted) {
    if (out.length >= count) break;
    pushEntry(item.entry);
  }

  return out;
}

export function buildDualWieldFollowupAction(hero: BattleHeroUnit): BattleActionSpec | null {
  if (!hero.offhandWeaponSubType || !hero.offhandAtk || hero.offhandAtk <= 0) return null;
  const dmgType = hero.offhandWeaponDamageType ?? hero.weaponDamageType;
  return {
    id: "dual_wield_offhand",
    kind: "attack",
    name: hero.offhandWeaponName ?? "Off-Hand Strike",
    categoryLabel: "Dual Wield Follow-Up",
    badge: "Off-Hand",
    badgeKind: "weapon",
    iconPath: getWeaponAbilityIconPath(hero.offhandWeaponSubType, 0),
    mpCost: 0,
    targetScope: "enemy",
    damageType: dmgType,
    power: 0.5,
    critBonus: 0,
    vfxKey: pickVfxKey(dmgType, "enemy", hero.offhandWeaponName ?? "Quick Slash", false),
    effectText: "Automatic 50% power off-hand blade follow-up hit.",
  };
}

export function buildHeroWeaponActions(hero: BattleHeroUnit): BattleActionSpec[] {
  const modes = WEAPON_MODE_SPECS[hero.weaponSubType] ?? WEAPON_MODE_SPECS.Unarmed;
  return modes.map((m, idx) => {
    const cdRem = hero.skillCooldowns?.[m.id] ?? 0;
    return {
      id: m.id,
      kind: "attack",
      name: m.name,
      categoryLabel: `${hero.weaponSubType} · ${m.cooldownTurns > 0 ? "1-Turn Cooldown" : "No Cooldown"}`,
      badge: cdRem > 0 ? `${cdRem}T CD` : m.cooldownTurns > 0 ? "1T CD" : m.tag,
      badgeKind: "weapon",
      iconPath: getWeaponAbilityIconPath(hero.weaponSubType, idx as 0 | 1),
      mpCost: 0,
      targetScope: "enemy",
      damageType: hero.weaponDamageType,
      power: m.power,
      critBonus: m.critBonus,
      execCritBonus: m.execCritBonus,
      armorIgnore: m.armorIgnore,
      cooldownTurns: m.cooldownTurns,
      splashPct: m.splashPct,
      guardChip: m.guardChip,
      inflictStatus: m.debuff,
      restoreMp: m.restoreMp,
      vfxKey: pickVfxKey(hero.weaponDamageType, "enemy", m.name, idx === 1),
      effectText: m.effect,
      disabledReason: cdRem > 0 ? `Recharging (${cdRem}T cooldown)` : undefined,
    };
  });
}

function parseSpellTimedEffects(sp: SpellEntry): {
  inflictStatus?: StatusAilmentKind;
  inflictTurns?: number;
  inflictChance?: number;
  grantStatus?: { kind: StatusAilmentKind; turns: number };
  splashPct?: number;
  guardChip?: number;
  armorIgnore?: number;
  grantMomentum?: boolean;
  grantBonusTurn?: boolean;
  stripEnemyBuffs?: boolean;
  restoreMp?: number;
  secondAlly?: boolean;
  siphonHpPct?: number;
  siphonMpPct?: number;
  siphonPartyHpPct?: number;
  empowerNextSpell?: boolean;
  specialTag?: string;
} {
  const eff = (sp.effect ?? "").toLowerCase();
  const turnsMatch = eff.match(/(\d+)\s*[–-]?\s*turn/);
  const turns = turnsMatch ? Math.max(1, Math.min(4, Number(turnsMatch[1]))) : 2;
  const tg = (sp.target ?? "").toLowerCase();
  const isAlly = tg.includes("ally") || tg.includes("allies");
  const isTwoAllies = isAlly && tg.includes("2 allies");
  const splashPct = !isAlly && tg.includes("splash") ? 0.5 : undefined;

  let inflictStatus: StatusAilmentKind | undefined;
  let inflictChance = 0.72;
  let grantStatus: { kind: StatusAilmentKind; turns: number } | undefined;

  if (!isAlly) {
    if (eff.includes("stun")) {
      inflictStatus = "stun";
      inflictChance = eff.includes("strong") ? 0.65 : 0.45;
    } else if (eff.includes("burn")) {
      inflictStatus = "burn";
      inflictChance = eff.includes("light burn") ? 0.45 : eff.includes("severe") ? 0.9 : 0.75;
    } else if (eff.includes("bleed")) {
      inflictStatus = "bleed";
      inflictChance = eff.includes("light") ? 0.5 : 0.85;
    } else if (eff.includes("poison")) {
      inflictStatus = "poison";
      inflictChance = 0.85;
    } else if (eff.includes("chill")) {
      inflictStatus = "chill";
      inflictChance = 0.85;
    } else if (eff.includes("shock")) {
      inflictStatus = "shock";
      inflictChance = 0.85;
    } else if (eff.includes("curse")) {
      inflictStatus = "curse";
      inflictChance = 0.85;
    } else if (eff.includes("accuracy")) {
      inflictStatus = "blind";
      inflictChance = 0.8;
    } else if ((eff.includes("def") || eff.includes("defense")) && (eff.includes("melt") || eff.includes("-") || eff.includes("cutting"))) {
      inflictStatus = "def_down";
      inflictChance = 0.85;
    } else if (eff.includes("attack") && (eff.includes("cuts") || eff.includes("-") || eff.includes("lower"))) {
      inflictStatus = "atk_down";
      inflictChance = 0.85;
    }
  } else {
    if (eff.includes("undying") || eff.includes("lethal")) {
      grantStatus = { kind: "undying", turns: 2 };
    } else if (eff.includes("reflect")) {
      grantStatus = { kind: "reflect", turns };
    } else if (eff.includes("status immunity") || eff.includes("bleed/poison immunity")) {
      grantStatus = { kind: "immunity", turns };
    } else if (eff.includes("regeneration")) {
      grantStatus = { kind: "regen", turns: turnsMatch ? turns : 3 };
    } else if (eff.includes("ward") || eff.includes("barrier") || eff.includes("defense") || eff.includes("barkskin")) {
      grantStatus = { kind: "ward", turns };
    } else if (eff.includes("crit") || eff.includes("force & finesse") || eff.includes("magic power")) {
      grantStatus = { kind: "haste", turns };
    }
  }

  const guardChip =
    eff.includes("breaking 2 guard") || eff.includes("heavy guard break")
      ? 2
      : eff.includes("guard point") || eff.includes("breaking 1 guard") || eff.includes("chipping 1 guard") || eff.includes("chip 1 guard")
        ? 1
        : undefined;
  const armorIgnore = eff.includes("50% magic defense") ? 0.5 : eff.includes("40% magic defense") ? 0.4 : eff.includes("25%") ? 0.25 : undefined;
  const grantMomentum = eff.includes("momentum") ? true : undefined;
  const grantBonusTurn = eff.includes("bonus turn") ? true : undefined;
  const stripEnemyBuffs = eff.includes("strips enemy buffs") || eff.includes("strips positive") ? true : undefined;
  const mpMatch = sp.effect?.match(/\+?(\d+)\s*MP/i);
  const restoreMp = (eff.includes("restores") && mpMatch) ? Number(mpMatch[1]) : eff.includes("restores ally mp") ? 25 : undefined;
  const siphonHpPct = sp.id === "spell_8_ellowyn_24" ? 0.15 : undefined;
  const siphonMpPct = sp.id === "spell_8_ellowyn_24" ? 0.15 : undefined;
  const siphonPartyHpPct = sp.id === "spell_8_harlan_71" ? 0.2 : undefined;
  const empowerNextSpell = sp.id === "spell_4_ellowyn_12" ? true : undefined;

  let specialTag: string | undefined;
  if (eff.includes("undead")) specialTag = "undead_bonus";
  else if (eff.includes("shocked or chilled")) specialTag = "shock_chill_bonus";
  else if (eff.includes("per active ailment")) specialTag = "ailment_burst";
  else if (eff.includes("doubles tick damage") || eff.includes("rot-cloud")) specialTag = "double_dot";

  return {
    inflictStatus,
    inflictTurns: turns,
    inflictChance,
    grantStatus,
    splashPct,
    guardChip,
    armorIgnore,
    grantMomentum,
    grantBonusTurn,
    stripEnemyBuffs,
    restoreMp,
    secondAlly: isTwoAllies || undefined,
    siphonHpPct,
    siphonMpPct,
    siphonPartyHpPct,
    empowerNextSpell,
    specialTag,
  };
}

export function getAdjacentEnemies(primary: BattleEnemyUnit, livingEnemies: BattleEnemyUnit[]): BattleEnemyUnit[] {
  const primaryIdx = livingEnemies.findIndex((e) => e.instanceId === primary.instanceId);
  return livingEnemies.filter((other, idx) => {
    if (other.instanceId === primary.instanceId || other.curHp <= 0) return false;
    if (primary.r0 >= 0 && primary.c0 >= 0 && other.r0 >= 0 && other.c0 >= 0) {
      const cGap = Math.max(0, other.c0 - (primary.c0 + primary.gw), primary.c0 - (other.c0 + other.gw));
      const rGap = Math.max(0, other.r0 - (primary.r0 + primary.gh), primary.r0 - (other.r0 + other.gh));
      return cGap === 0 && rGap === 0;
    }
    return primaryIdx >= 0 && Math.abs(idx - primaryIdx) === 1;
  });
}

export function buildHeroSpellTierBuckets(
  hero: BattleHeroUnit,
  spells: SpellEntry[],
  learnedSpellIds: string[],
  allHeroes?: BattleHeroUnit[]
): Map<number, BattleActionSpec[]> {
  const learnedSet = new Set(learnedSpellIds);
  const buckets = new Map<number, BattleActionSpec[]>();
  if (!hero.hasMp) return buckets;

  const mpDiscount = 1 - Math.min(0.3, hero.mods.mpCostReductionPct / 100);
  const heroSpells = spells.filter((sp) => (sp.usableBy ?? []).includes(hero.heroId) && learnedSet.has(sp.id));
  const anyAllyCritLow = Boolean(allHeroes?.some((h) => h.curHp > 0 && h.curHp / Math.max(1, h.maxHp) < 0.3));

  for (const sp of heroSpells) {
    const tier = Math.max(1, Math.min(8, sp.region || 1));
    const tg = (sp.target ?? "").toLowerCase();
    const isAlly = tg.includes("ally") || tg.includes("allies");
    const isAll = tg.includes("all") || tg.includes("party");
    const isRevive = sp.name.toLowerCase().includes("reviv") || sp.effect.toLowerCase().includes("reviv");
    const isCleanse = sp.effect.toLowerCase().includes("cleanse") || sp.effect.toLowerCase().includes("cure") || sp.effect.toLowerCase().includes("removes 1") || sp.effect.toLowerCase().includes("clears");
    const isHeal =
      isAlly &&
      (sp.damageType.toLowerCase().includes("restor") ||
        sp.effect.toLowerCase().includes("heal") ||
        sp.effect.toLowerCase().includes("restore hp") ||
        sp.effect.toLowerCase().includes("restores burst hp") ||
        sp.effect.toLowerCase().includes("restores light hp") ||
        sp.effect.toLowerCase().includes("restores solid hp") ||
        sp.effect.toLowerCase().includes("restores healthy hp"));
    const isFirstOffSpellDiscount = !isAlly && !hero.firstStrikeUsed && (hero.passives?.firstSpellHalfMpPct ?? 0) > 0;
    const isEmergencyHealHalf = isHeal && anyAllyCritLow && (hero.passives?.emergencyHealHalfMp30Pct ?? 0) > 0;
    const rawMp = sp.mpCost * mpDiscount + (!isAlly ? hero.passives?.extraSpellMpCost ?? 0 : 0);
    const mpCost = Math.max(1, Math.round(rawMp * (isFirstOffSpellDiscount || isEmergencyHealHalf ? 0.5 : 1)));
    const parsedFx = parseSpellTimedEffects(sp);
    const list = buckets.get(tier) ?? [];
    const extraCritBonus = sp.id === "spell_7_mera_45" ? 0.35 : 0;

    list.push({
      id: sp.id,
      kind: "spell",
      name: sp.name,
      categoryLabel: `${sp.subType} · Tier ${tier}`,
      badge: `${mpCost} MP`,
      badgeKind: "mp",
      iconPath: sp.iconPath,
      mpCost,
      targetScope: isRevive ? "dead_ally" : isAlly ? (isAll ? "all_allies" : "ally") : isAll ? "all_enemies" : "enemy",
      damageType: sp.damageType,
      power: 1.2 + tier * 0.14,
      critBonus: hero.mods.spellCritPct / 100 + extraCritBonus,
      healPower: isHeal ? 1.1 + tier * 0.18 : undefined,
      cleanse: isCleanse,
      revive: isRevive,
      inflictStatus: parsedFx.inflictStatus,
      inflictTurns: parsedFx.inflictTurns,
      inflictChance: parsedFx.inflictChance,
      grantStatus: parsedFx.grantStatus,
      splashPct: parsedFx.splashPct,
      guardChip: parsedFx.guardChip,
      armorIgnore: parsedFx.armorIgnore,
      grantMomentum: parsedFx.grantMomentum,
      grantBonusTurn: parsedFx.grantBonusTurn,
      stripEnemyBuffs: parsedFx.stripEnemyBuffs,
      restoreMp: parsedFx.restoreMp,
      secondAlly: parsedFx.secondAlly,
      siphonHpPct: parsedFx.siphonHpPct,
      siphonMpPct: parsedFx.siphonMpPct,
      siphonPartyHpPct: parsedFx.siphonPartyHpPct,
      empowerNextSpell: parsedFx.empowerNextSpell,
      specialTag: parsedFx.specialTag,
      regionTier: tier,
      vfxKey: pickVfxKey(sp.damageType, sp.target, sp.name, isAll || tier >= 5),
      effectText: sp.effect,
      disabledReason: hero.curMp < mpCost ? `Need ${mpCost} MP` : undefined,
    });
    buckets.set(tier, list);
  }
  return buckets;
}

export function buildCombatPotionActions(
  bagCounts: Record<string, number>,
  consumedPotions: Record<string, number>,
  itemsById: Record<string, ItemEntry>
): BattleActionSpec[] {
  const out: BattleActionSpec[] = [];
  for (const [itemId, totalQty] of Object.entries(bagCounts)) {
    const remaining = totalQty - (consumedPotions[itemId] ?? 0);
    if (remaining <= 0) continue;
    const item = itemsById[itemId];
    if (!item || item.category !== "consumable") continue;
    const eff = (item.effect ?? "").toLowerCase();
    const nm = item.name.toLowerCase();
    const isRevive = eff.includes("reviv") || nm.includes("phoenix") || nm.includes("salts");
    const isMp = (eff.includes("mp") || nm.includes("mana")) && !eff.includes("hp");
    const isCleanse = eff.includes("cure") || eff.includes("cleanse") || nm.includes("antidote") || nm.includes("panacea");
    const isAll = eff.includes("all allies") || eff.includes("entire party");
    const pctNum = Number((item.effect ?? "").match(/(\d+)\s*%/)?.[1] ?? 0);
    const flatNum = Number((item.effect ?? "").match(/\+?(\d+)\s*(?:HP|MP)/i)?.[1] ?? 0);
    const healPower = Math.max(0.4, pctNum > 0 ? pctNum / 100 : flatNum > 0 ? flatNum : 0.45);

    out.push({
      id: `item_${item.id}`,
      kind: "item",
      itemId: item.id,
      qty: remaining,
      name: item.name,
      categoryLabel: `Potion · ${remaining} in Bag`,
      badge: `×${remaining}`,
      badgeKind: "qty",
      iconPath: item.iconPath,
      mpCost: 0,
      targetScope: isRevive ? "dead_ally" : isAll ? "all_allies" : "ally",
      damageType: isMp ? "Arcane" : "Restoration",
      power: healPower,
      critBonus: 0,
      healPower: isMp ? undefined : healPower,
      restoreMp: isMp ? (pctNum > 0 ? pctNum : Math.max(20, flatNum)) : undefined,
      cleanse: isCleanse,
      revive: isRevive,
      vfxKey: isRevive ? "revive" : isMp ? "mana" : isCleanse ? "cleanse" : isAll ? "heal_aoe" : "heal_single",
      effectText: item.effect || "Restorative consumable.",
    });
  }
  return out;
}

export function getHeroResolveState(hero: BattleHeroUnit): { tier: 0 | 1 | 2; atkMul: number; magMul: number; healMul: number; mpSavePct: number } {
  const pct = (hero.curHp / Math.max(1, hero.maxHp)) * 100;
  if (pct <= 25) {
    return { tier: 2, atkMul: 1.25, magMul: 1.25, healMul: 1.35, mpSavePct: hero.heroId === "ellowyn" ? 0.35 : 0.15 };
  }
  if (pct <= 50) {
    return { tier: 1, atkMul: 1.12, magMul: 1.12, healMul: 1.18, mpSavePct: hero.heroId === "ellowyn" ? 0.2 : 0 };
  }
  return { tier: 0, atkMul: 1.0, magMul: 1.0, healMul: 1.0, mpSavePct: 0 };
}

/** Compute incoming enemy strike damage against a hero's P.Def / M.Def using shared RPG scaling. */
export function computeEnemyStrikeDamage(params: {
  atk: number;
  mag: number;
  isMagicMove: boolean;
  movePower: number;
  offenseMul?: number;
  packDamageMul?: number;
  defVal: number;
  guarding?: boolean;
  guardMitigationPct?: number;
  hasWard?: boolean;
  hasChillBonus?: boolean;
  variance?: number;
}): number {
  const baseOffense = Math.max(
    4,
    (params.isMagicMove ? Math.max(params.atk, params.mag) : params.atk) *
      params.movePower *
      (params.offenseMul ?? 1) *
      (params.packDamageMul ?? 1)
  );
  const rawStrike = baseOffense * 2.45;
  const mitigation = 1 / (1 + Math.max(0, params.defVal) / Math.max(4, baseOffense * 0.68));
  let dmg = Math.max(2, Math.round(rawStrike * mitigation));
  if (params.guarding) {
    const mit = 0.5 - Math.min(0.2, (params.guardMitigationPct ?? 0) / 100);
    dmg = Math.max(1, Math.round(dmg * mit));
  }
  if (params.hasWard) {
    dmg = Math.max(1, Math.round(dmg * 0.75));
  }
  if (params.hasChillBonus) {
    dmg = Math.max(1, Math.round(dmg * 1.15));
  }
  const roll = params.variance ?? 0.92 + Math.random() * 0.16;
  return Math.max(1, Math.round(dmg * roll));
}

export function computeDamageOnEnemy(
  hero: BattleHeroUnit,
  action: BattleActionSpec,
  enemy: BattleEnemyUnit,
  atkOverride?: number,
  battleCtx?: { allHeroes?: BattleHeroUnit[]; livingEnemiesCount?: number; isModeB?: boolean }
): { damage: number; isCrit: boolean; isWeak: boolean; isResist: boolean; brokeGuard: boolean; triggeredStagger: boolean; detonateDotDmg: number } {
  const p = hero.passives;
  const auras = battleCtx?.allHeroes ? getPartyCombatAuras(battleCtx.allHeroes) : null;
  const isMagic = action.kind === "spell";
  const resolve = getHeroResolveState(hero);
  const momentumMul = hero.momentum ? 1.25 : 1.0;
  const hasteMul = hero.statuses.some((s) => s.kind === "haste") ? 1.2 : 1.0;
  const cursedMul = hero.statuses.some((s) => s.kind === "curse") ? 0.8 : 1.0;
  const weakMul = hero.statuses.some((s) => s.kind === "atk_down") ? 0.78 : 1.0;
  const chillMul = hero.statuses.some((s) => s.kind === "chill") ? 0.85 : 1.0;
  const poisonMul = !isMagic && hero.statuses.some((s) => s.kind === "poison") ? 0.85 : 1.0;

  // Dynamic Discipline & Runestone Combat Modifiers
  let atkBonusPct = (hero.cadenceStacks ?? 0) * (p?.cadenceAtkPerRoundPct ?? 0) + (hero.battleWrathStacks ?? 0) * (p?.battleWrathPerHitPct ?? 0);
  if (p?.runestoneBatteredPowerPct > 0 && hero.curHp / Math.max(1, hero.maxHp) < 0.5) {
    atkBonusPct += p.runestoneBatteredPowerPct;
  }
  if (!isMagic) {
    if (!hero.firstStrikeUsed && p?.firstHitBonusPct > 0) atkBonusPct += p.firstHitBonusPct;
    if (hero.weaponSubType === "Light Crossbow" && p?.crossbowBonusPct > 0) atkBonusPct += p.crossbowBonusPct;
    if ((hero.weaponSubType === "Scimitar" || hero.weaponSubType === "Sickle") && p?.scimitarSicklePct > 0) atkBonusPct += p.scimitarSicklePct;
    if (hero.weaponSubType === "Greatsword" && (enemy.staggeredTurns > 0 || enemy.statuses.some((s) => s.kind === "stun")) && p?.greatswordStaggeredBonusPct > 0) {
      atkBonusPct += p.greatswordStaggeredBonusPct;
    }
    if ((battleCtx?.livingEnemiesCount ?? 2) === 1 && p?.soloEnemyBonusPct > 0) atkBonusPct += p.soloEnemyBonusPct;
    if (enemy.guardCur > 0 && p?.vsGuardedBonusPct > 0) atkBonusPct += p.vsGuardedBonusPct;
    if ((enemy.isBoss || enemy.role.toLowerCase().includes("heavy") || enemy.role.toLowerCase().includes("tank")) && p?.antiBossArmorPct > 0) {
      atkBonusPct += p.antiBossArmorPct;
    }
    if (enemy.markedByRegalCommand) atkBonusPct += 10;
    if (enemy.struckThisRoundByOrin && battleCtx?.allHeroes?.some((h) => h.curHp > 0 && h.passives.crushingFollowThroughPct > 0)) {
      atkBonusPct += 8;
    }
  } else {
    if (!hero.firstStrikeUsed && p?.firstSpellHalfMpPct > 0) atkBonusPct += p.firstSpellHalfMpPct;
    if (hero.weaponSubType === "Quarterstaff" && p?.staffSpellPct > 0) atkBonusPct += p.staffSpellPct;
    if (hero.nextSpellEmpower) atkBonusPct += 35;
    if (hero.guardNatureEmpower && p?.guardNatureSpellPct > 0) atkBonusPct += p.guardNatureSpellPct;
  }

  // Situational Enemy-Target & Aura Damage Multipliers
  const eHpRatio = enemy.curHp / Math.max(1, enemy.maxHp);
  if (eHpRatio < 0.35 && p?.vsLowHp35BonusPct > 0) atkBonusPct += p.vsLowHp35BonusPct;
  if ((eHpRatio < 0.4 || enemy.staggeredTurns > 0) && p?.vsLowHp40ExecPct > 0) atkBonusPct += p.vsLowHp40ExecPct;
  if ((enemy.armorBrokenByOrinTurns ?? 0) > 0) atkBonusPct += 15;
  if (p?.vsCasterRangedBonusPct > 0 && /caster|skirmish|assassin|fly|bird|dragon|eagle|hawk|harpy/i.test(`${enemy.role} ${enemy.name}`)) {
    atkBonusPct += p.vsCasterRangedBonusPct;
  }
  if (p?.vsBeastMonsterBonusPct > 0 && /wolf|boar|bear|spider|shark|dragon|beast|hydra|owlbear|manticore|worg|bulette/i.test(enemy.name)) {
    atkBonusPct += p.vsBeastMonsterBonusPct;
  }
  if (enemy.statuses.some((s) => s.kind === "shock") && auras && auras.shockBonusPct > 0 && !isMagic) {
    atkBonusPct += auras.shockBonusPct;
  }
  if (enemy.statuses.some((s) => s.kind === "bleed") && hero.mods.ailmentPowerPct > 0 && !isMagic) {
    atkBonusPct += hero.mods.ailmentPowerPct;
  }
  if (p?.runestoneBonusElemPct > 0 && !isMagic) {
    atkBonusPct += p.runestoneBonusElemPct;
  }
  const isUndeadOrHorror = /skeleton|zombie|wight|wraith|ghoul|ghast|lich|vampire|specter|shadow|mummy|demon|devil|fiend|aboleth|garrick/i.test(enemy.name);
  if (p?.runestoneHallowedUndeadPct > 0 && isUndeadOrHorror) atkBonusPct += p.runestoneHallowedUndeadPct;
  if (action.specialTag === "undead_bonus" && isUndeadOrHorror) atkBonusPct += 35;
  if (action.specialTag === "shock_chill_bonus" && enemy.statuses.some((s) => s.kind === "shock" || s.kind === "chill")) {
    atkBonusPct += 40;
  }
  if (action.specialTag === "ailment_burst") {
    atkBonusPct += Math.min(75, enemy.statuses.filter((s) => s.kind !== "ward").length * 25);
  }

  const usedAtk = atkOverride ?? hero.atk;
  const statMul = 1 + atkBonusPct / 100;
  const baseStat = (isMagic ? (5 + hero.mag * 1.05) * resolve.magMul : (4 + usedAtk * 1.05) * resolve.atkMul) * hasteMul * statMul;

  const hasBleedOrShock = enemy.statuses.some((s) => s.kind === "bleed" || s.kind === "shock");
  let extraPen = (eHpRatio < 0.35 ? p?.vsLowHp35PenPct ?? 0 : 0) + (hasBleedOrShock && auras ? auras.bleedShockPenPct : 0);
  if (isMagic && p?.magicPiercePct > 0) extraPen += p.magicPiercePct;

  const defStat = isMagic
    ? enemy.mDef * (1 - Math.min(0.65, (action.armorIgnore ?? 0) + extraPen / 100))
    : enemy.pDef * (1 - Math.min(0.65, (action.armorIgnore ?? 0) + (hero.armorPiercePct + extraPen) / 100));
  const causticDefMod =
    enemy.statuses.some((s) => s.kind === "poison") &&
    battleCtx?.allHeroes?.some((h) => h.curHp > 0 && h.heroId === "harlan" && h.passives.spotterExposeDef)
      ? 0.9
      : 1.0;
  const defMod = (enemy.statuses.some((s) => s.kind === "def_down") ? 0.75 : 1.0) * causticDefMod;
  const effDef = defStat * defMod;

  const lowHp = eHpRatio < 0.5;
  let bonusCritPct = 0;
  if (!hero.firstStrikeUsed && p?.firstShotCritPct > 0) bonusCritPct += p.firstShotCritPct;
  if (hero.curHp / Math.max(1, hero.maxHp) > 0.75 && p?.highlandHp75CritPct > 0) bonusCritPct += p.highlandHp75CritPct;
  if (!battleCtx?.isModeB && p?.lightModeCritPct > 0) bonusCritPct += p.lightModeCritPct;
  if (eHpRatio < 0.35 && p?.vsLowHp35CritPct > 0) bonusCritPct += p.vsLowHp35CritPct;
  if (auras) bonusCritPct += auras.packCritPct + (hasBleedOrShock ? auras.bleedShockCritPct : 0);

  const critChance = Math.min(
    0.88,
    (hero.critPct + bonusCritPct) / 100 + (action.critBonus || 0) + (lowHp ? action.execCritBonus || 0 : 0)
  );
  const isCrit = Math.random() < critChance;

  const dtCombined = `${action.damageType} ${!isMagic && p?.runestoneBonusElemType ? p.runestoneBonusElemType : ""}`.toLowerCase();
  const isWeak = enemy.weakTypes.some((w) => dtCombined.includes(w.toLowerCase()));
  const rawResist = !isWeak && enemy.resistTypes.some((r) => action.damageType.toLowerCase().includes(r.toLowerCase()));
  const poisonBypass = dtCombined.includes("poison") && (p?.universalPoisonPenPct ?? 0) > 0;
  const isResist = rawResist && !poisonBypass;

  let elemMul = isWeak ? 1.5 : isResist ? 0.5 : (rawResist && poisonBypass ? 0.75 : 1.0);
  if (enemy.staggeredTurns > 0) elemMul *= 1.5;
  if (enemy.statuses.some((s) => s.kind === "chill") && (dtCombined.includes("frost") || dtCombined.includes("lightning"))) {
    elemMul *= 1.15;
  }
  if (enemy.statuses.some((s) => s.kind === "shock")) {
    elemMul *= 1.2;
    enemy.statuses = enemy.statuses.filter((s) => s.kind !== "shock");
  }

  let raw = Math.max(baseStat * 0.45, baseStat * 1.42 - effDef * 0.5) * action.power * elemMul * momentumMul * cursedMul * weakMul * chillMul * poisonMul;
  const critMult = 1.55 + ((p?.critDamagePct ?? 0) + (hero.hasShield ? p?.shieldCritDamagePct ?? 0 : 0)) / 100;
  if (isCrit) raw *= critMult;
  raw *= 0.94 + Math.random() * 0.12;
  const damage = Math.max(1, Math.round(raw));

  // Detonate remaining Burn/Bleed/Poison on hit for Detonating Runestone
  let detonateDotDmg = 0;
  if (p?.runestoneDetonateDotPct > 0) {
    for (const st of enemy.statuses) {
      if (st.kind === "burn" || st.kind === "bleed" || st.kind === "poison") {
        const tickEst = Math.max(3, Math.round(enemy.maxHp * (st.kind === "burn" ? 0.06 : 0.05)));
        detonateDotDmg += Math.max(1, Math.round((tickEst * st.turns * p.runestoneDetonateDotPct) / 100));
      }
    }
  }

  // Guard / Weakness Break check
  let brokeGuard = false;
  let triggeredStagger = false;
  let extraChip = p?.extraGuardChip ?? 0;
  if (enemy.guardCur > 0 && p?.extraGuardVsGuarded > 0) extraChip += p.extraGuardVsGuarded;
  if (battleCtx?.isModeB && p?.extraGuardModeB > 0) extraChip += p.extraGuardModeB;
  if (dtCombined.includes("poison") && p?.extraGuardAcidPoison > 0) extraChip += p.extraGuardAcidPoison;
  if (isWeak && p?.extraGuardOnWeakness > 0) extraChip += p.extraGuardOnWeakness;
  if (isMagic && hero.nextSpellEmpower) extraChip += 1;

  const chip = (isWeak ? 1 : 0) + (action.guardChip ?? 0) + extraChip;
  if (chip > 0 && enemy.guardCur > 0 && !enemy.staggerImmuneUntilAction) {
    enemy.guardCur = Math.max(0, enemy.guardCur - chip);
    brokeGuard = true;
    if (enemy.guardCur === 0) {
      enemy.staggeredTurns = 1;
      enemy.telegraphedMove = null;
      triggeredStagger = true;
      if (p?.commandingBreachPct > 0) enemy.armorBrokenByOrinTurns = 2;
    }
  }
  if (isWeak) {
    const matchedWeak = enemy.weakTypes.find((w) => dtCombined.includes(w.toLowerCase()));
    if (matchedWeak && !enemy.revealedWeaknesses.includes(matchedWeak)) {
      enemy.revealedWeaknesses.push(matchedWeak);
    }
  }

  return { damage, isCrit, isWeak, isResist, brokeGuard, triggeredStagger, detonateDotDmg };
}

export function levelToRegionNum(level: number): number {
  const lv = Math.max(1, level);
  if (lv <= 15) return 1;
  if (lv <= 25) return 2;
  if (lv <= 40) return 3;
  if (lv <= 50) return 4;
  if (lv <= 60) return 5;
  if (lv <= 75) return 6;
  if (lv <= 90) return 7;
  return 8;
}

export function applyLootAndDropsForDefeatedEnemy(
  state: BattleState,
  enemy: BattleEnemyUnit,
  itemsCatalog: ItemEntry[]
): void {
  state.totalXpEarned += enemy.xpReward;
  state.totalSilverEarned += enemy.silverReward;

  // Roll matching Trade Good drops strictly inside the defeated enemy's Region price tier
  const tradeGoods = itemsCatalog.filter((it) => it.category === "trade_good");
  if (tradeGoods.length === 0) return;

  const nPack = Math.max(1, state.enemies.length);
  const packLootMul = enemy.isBoss || nPack <= 2 ? 1.0 : 2.45 / nPack;
  const dropChance = enemy.isBoss ? 1.0 : Math.min(0.6, 0.55 * packLootMul);
  if (Math.random() <= dropChance) {
    const regionNum = levelToRegionNum(enemy.level);
    const regionalPool = tradeGoods.filter((tg) => (tg.region ?? 1) === regionNum);
    const activePool = regionalPool.length > 0 ? regionalPool : tradeGoods;

    const explicitDrop = enemy.rawDef.dropItemId
      ? activePool.find((tg) => tg.id === enemy.rawDef.dropItemId)
      : undefined;
    const mobLow = enemy.name.toLowerCase();
    const exactSource = activePool.find(
      (tg) => (tg as unknown as { sourceMob?: string }).sourceMob?.toLowerCase() === mobLow
    );
    const chosen =
      explicitDrop ??
      exactSource ??
      activePool[Math.floor(Math.random() * activePool.length)];
    if (chosen) {
      state.droppedTradeGoods[chosen.id] = (state.droppedTradeGoods[chosen.id] ?? 0) + 1;
    }
  }
}

export function applyTurnStartAilments(
  statuses: StatusEffectState[],
  maxHp: number,
  statusResistPct: number,
  opts?: { poisonDotBonusPct?: number; dotResistPct?: number; doublePoisonBurn?: boolean; universalPoisonPenPct?: number; onExpireHealPct?: number }
): {
  remaining: StatusEffectState[];
  dotDamage: number;
  regenHeal: number;
  stunned: boolean;
  expiredHeal: number;
  label: string | null;
} {
  let dotDamage = 0;
  let regenHeal = 0;
  let stunned = false;
  let expiredHeal = 0;
  let label: string | null = null;
  const remaining: StatusEffectState[] = [];
  const dotMit = 1 - Math.min(0.6, (opts?.dotResistPct ?? 0) / 100);
  const dblMul = opts?.doublePoisonBurn ? 2 : 1;

  for (const st of statuses) {
    if (st.kind === "burn") {
      dotDamage += Math.max(3, Math.round(maxHp * 0.06 * dotMit * dblMul));
      label = label ?? "Burn";
    } else if (st.kind === "bleed") {
      dotDamage += Math.max(3, Math.round(maxHp * 0.05 * dotMit));
      label = label ?? "Bleed";
    } else if (st.kind === "poison") {
      const poisonScale = (1 + (opts?.poisonDotBonusPct ?? 0) / 100) * dblMul;
      dotDamage += Math.max(3, Math.round(maxHp * 0.05 * dotMit * poisonScale));
      label = label ?? "Poison";
    } else if (st.kind === "regen") {
      regenHeal += Math.max(4, Math.round(maxHp * 0.1));
    } else if (st.kind === "stun") {
      if (Math.random() * 100 >= statusResistPct) {
        stunned = true;
        label = "Stunned!";
      }
    }
    if (st.turns > 1) {
      remaining.push({ ...st, turns: st.turns - 1 });
    } else if (!STATUS_UI_META[st.kind].isBuff && (opts?.onExpireHealPct ?? 0) > 0) {
      expiredHeal += Math.max(2, Math.round((maxHp * (opts?.onExpireHealPct ?? 0)) / 100));
    }
  }
  return { remaining, dotDamage, regenHeal, stunned, expiredHeal, label };
}
