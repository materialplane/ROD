import { getHeroById } from "../heroes";
import { computeHeroVitals, getHeroAttributes, getHeroLevel } from "../party/partyLogic";
import { getWeaponAbilityIconPath } from "../shops/shopLogic";
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

export const STATUS_UI_META: Record<StatusAilmentKind, BattleStatusUiMeta> = {
  burn: {
    kind: "burn",
    glyph: "🔥",
    label: "Burn",
    isBuff: false,
    pillCls: "border-[#c95b38] bg-[#2c150e] text-[#ffab85]",
    desc: "Takes Fire damage each turn and receives 25% less healing.",
  },
  bleed: {
    kind: "bleed",
    glyph: "🩸",
    label: "Bleed",
    isBuff: false,
    pillCls: "border-[#b83e4c] bg-[#2a1016] text-[#ffa1ad]",
    desc: "Loses HP each turn from bleeding wounds.",
  },
  poison: {
    kind: "poison",
    glyph: "☠",
    label: "Poison",
    isBuff: false,
    pillCls: "border-[#6fa838] bg-[#16260f] text-[#b4f285]",
    desc: "Takes Poison damage each turn and deals 15% less physical damage.",
  },
  chill: {
    kind: "chill",
    glyph: "❄",
    label: "Chill",
    isBuff: false,
    pillCls: "border-[#4b9ed4] bg-[#102233] text-[#9edbff]",
    desc: "Slowed turn speed on the timeline.",
  },
  shock: {
    kind: "shock",
    glyph: "⚡",
    label: "Shock",
    isBuff: false,
    pillCls: "border-[#d4b038] bg-[#29220e] text-[#ffe885]",
    desc: "Next hit taken deals +20% bonus burst damage.",
  },
  curse: {
    kind: "curse",
    glyph: "🌑",
    label: "Curse",
    isBuff: false,
    pillCls: "border-[#835cc9] bg-[#1f1533] text-[#cbb6ff]",
    desc: "Outgoing damage and healing reduced by 20%.",
  },
  stun: {
    kind: "stun",
    glyph: "💫",
    label: "Stun",
    isBuff: false,
    pillCls: "border-[#d48b38] bg-[#2e1e0e] text-[#ffd48a]",
    desc: "Skips next turn.",
  },
  def_down: {
    kind: "def_down",
    glyph: "💔",
    label: "Armor Break",
    isBuff: false,
    pillCls: "border-[#c25b68] bg-[#2b141a] text-[#ffb0bc]",
    desc: "Defense reduced by 25%.",
  },
  atk_down: {
    kind: "atk_down",
    glyph: "⬇",
    label: "Weakened",
    isBuff: false,
    pillCls: "border-[#946eb8] bg-[#1f162b] text-[#d9c0ff]",
    desc: "Outgoing attack damage lowered by 22%.",
  },
  blind: {
    kind: "blind",
    glyph: "👁",
    label: "Blinded",
    isBuff: false,
    pillCls: "border-[#7c879e] bg-[#1a1f2b] text-[#cbd5e8]",
    desc: "Attacks have a 22% chance to miss.",
  },
  ward: {
    kind: "ward",
    glyph: "🛡",
    label: "Ward",
    isBuff: true,
    pillCls: "border-[#4aa3c8] bg-[#102633] text-[#9de6ff]",
    desc: "Reduces incoming damage by 25%.",
  },
  regen: {
    kind: "regen",
    glyph: "✨",
    label: "Regen",
    isBuff: true,
    pillCls: "border-[#4ab87d] bg-[#11291d] text-[#92f5bf]",
    desc: "Restores 10% Max HP at the start of every turn.",
  },
  reflect: {
    kind: "reflect",
    glyph: "🪞",
    label: "Reflect",
    isBuff: true,
    pillCls: "border-[#7a82d9] bg-[#181b33] text-[#c2c9ff]",
    desc: "Reflects 25% of incoming damage back at attackers.",
  },
  immunity: {
    kind: "immunity",
    glyph: "🌿",
    label: "Ward Purity",
    isBuff: true,
    pillCls: "border-[#54b898] bg-[#122923] text-[#9df5dc]",
    desc: "Blocks incoming negative ailments.",
  },
  haste: {
    kind: "haste",
    glyph: "⚔",
    label: "Empowered",
    isBuff: true,
    pillCls: "border-[#d4a644] bg-[#2b2110] text-[#ffe199]",
    desc: "+20% Attack, Magic Power, and Turn Speed.",
  },
  undying: {
    kind: "undying",
    glyph: "🕊",
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

export const WEAPON_MODE_SPECS: Record<string, [WeaponModeSpec, WeaponModeSpec]> = {
  Longsword: [
    {
      id: "wpn_skill_longsword_quick_slash",
      name: "Quick Slash",
      tag: "Fast",
      power: 1.0,
      critBonus: 0,
      delayPct: 0.78,
      effect: "Fast slash with high accuracy; keeps your next turn sooner.",
    },
    {
      id: "wpn_skill_longsword_heavy_cleave",
      name: "Heavy Cleave",
      tag: "Heavy",
      power: 1.4,
      critBonus: 0.15,
      delayPct: 1.12,
      guardChip: 1,
      effect: "Heavy slash dealing high damage (+15% Crit) and chipping 1 Guard point.",
    },
  ],
  Greatsword: [
    {
      id: "wpn_skill_greatsword_wide_sweep",
      name: "Wide Sweep",
      tag: "Push",
      power: 1.05,
      critBonus: 0,
      delayPct: 0.92,
      targetDelayPush: 18,
      effect: "Wide arc that deals solid damage and pushes the target back on the timeline.",
    },
    {
      id: "wpn_skill_greatsword_overhead_rend",
      name: "Overhead Rend",
      tag: "Heavy",
      power: 1.45,
      critBonus: 0.08,
      delayPct: 1.18,
      guardChip: 1,
      effect: "Heavy chop dealing massive damage and breaking 1 Guard point.",
    },
  ],
  Rapier: [
    {
      id: "wpn_skill_rapier_needle_thrust",
      name: "Needle Thrust",
      tag: "Fast",
      power: 1.0,
      critBonus: 0.05,
      delayPct: 0.72,
      effect: "Ultra-fast lunge; keeps your next turn early.",
    },
    {
      id: "wpn_skill_rapier_heart_pierce",
      name: "Heart Pierce",
      tag: "Crit",
      power: 1.38,
      critBonus: 0.2,
      armorIgnore: 0.25,
      delayPct: 1.05,
      effect: "Focused thrust (+20% Crit) ignoring 25% of enemy Physical Defense.",
    },
  ],
  Battleaxe: [
    {
      id: "wpn_skill_battleaxe_chopping_hack",
      name: "Chopping Hack",
      tag: "Fast",
      power: 1.02,
      critBonus: 0,
      delayPct: 0.88,
      effect: "Dependable chop dealing steady Slashing damage.",
    },
    {
      id: "wpn_skill_battleaxe_execution_chop",
      name: "Execution Chop",
      tag: "Execute",
      power: 1.44,
      critBonus: 0.05,
      execCritBonus: 0.25,
      delayPct: 1.16,
      effect: "Heavy chop gaining +25% Crit and bonus execution damage vs. enemies below 50% HP.",
    },
  ],
  Mace: [
    {
      id: "wpn_skill_mace_heavy_bash",
      name: "Heavy Bash",
      tag: "Guard",
      power: 1.02,
      critBonus: 0,
      delayPct: 0.85,
      guardChip: 1,
      effect: "Fast blunt bash that chips 1 Guard point off guarded enemies.",
    },
    {
      id: "wpn_skill_mace_armor_crush",
      name: "Armor Crush",
      tag: "Break",
      power: 1.36,
      critBonus: 0,
      delayPct: 1.1,
      debuff: "def_down",
      effect: "Heavy smash that cracks enemy armor (-25% Defense for 2 turns).",
    },
  ],
  Spear: [
    {
      id: "wpn_skill_spear_long_thrust",
      name: "Long Thrust",
      tag: "Aim",
      power: 1.04,
      critBonus: 0.12,
      delayPct: 0.82,
      effect: "Long-reach thrust granting +12% Crit Chance.",
    },
    {
      id: "wpn_skill_spear_brace_sweep",
      name: "Brace Sweep",
      tag: "Delay",
      power: 1.34,
      critBonus: 0,
      delayPct: 1.06,
      targetDelayPush: 24,
      effect: "Sweeping polearm hit that pushes the target back on the turn bar.",
    },
  ],
  Longbow: [
    {
      id: "wpn_skill_longbow_snap_arrow",
      name: "Snap Arrow",
      tag: "Fast",
      power: 1.0,
      critBonus: 0,
      delayPct: 0.78,
      effect: "Quick long-range shot with fast recovery.",
    },
    {
      id: "wpn_skill_longbow_aimed_piercer",
      name: "Aimed Piercer",
      tag: "Sniper",
      power: 1.42,
      critBonus: 0.25,
      armorIgnore: 0.25,
      delayPct: 1.15,
      effect: "Aimed shot (+25% Crit) ignoring 25% of enemy Physical Defense.",
    },
  ],
  Shortbow: [
    {
      id: "wpn_skill_shortbow_quick_volley",
      name: "Quick Volley",
      tag: "Fast",
      power: 0.98,
      critBonus: 0.05,
      delayPct: 0.72,
      effect: "Fastest bow shot; keeps your next turn early.",
    },
    {
      id: "wpn_skill_shortbow_wing_clip",
      name: "Wing Clip",
      tag: "Delay",
      power: 1.3,
      critBonus: 0,
      delayPct: 1.02,
      targetDelayPush: 24,
      effect: "Pinning shot that pushes the enemy's next turn back on the turn bar.",
    },
  ],
  Dagger: [
    {
      id: "wpn_skill_dagger_quick_jab",
      name: "Quick Jab",
      tag: "Fast",
      power: 0.96,
      critBonus: 0.06,
      delayPct: 0.68,
      effect: "Rapid stab with high accuracy and fast recovery.",
    },
    {
      id: "wpn_skill_dagger_vital_gouge",
      name: "Vital Gouge",
      tag: "Bleed",
      power: 1.35,
      critBonus: 0.15,
      delayPct: 1.0,
      debuff: "poison",
      effect: "Deep stab (+15% Crit) inflicting lingering Poison pressure.",
    },
  ],
  "Light Crossbow": [
    {
      id: "wpn_skill_crossbow_bolt_snap",
      name: "Bolt Snap",
      tag: "Pierce",
      power: 1.02,
      critBonus: 0.05,
      armorIgnore: 0.15,
      delayPct: 0.84,
      effect: "Steady bolt shot ignoring 15% of enemy Physical Defense.",
    },
    {
      id: "wpn_skill_crossbow_siege_crank",
      name: "Siege Crank",
      tag: "Break",
      power: 1.38,
      critBonus: 0.08,
      delayPct: 1.14,
      guardChip: 1,
      effect: "Heavy cranked bolt dealing high damage and chipping 1 Guard point.",
    },
  ],
  Quarterstaff: [
    {
      id: "wpn_skill_staff_sweep",
      name: "Staff Sweep",
      tag: "MP+",
      power: 1.0,
      critBonus: 0,
      delayPct: 0.82,
      restoreMp: 6,
      effect: "Quick two-handed strike restoring 6 MP on hit.",
    },
    {
      id: "wpn_skill_staff_crushing_vault",
      name: "Crushing Vault",
      tag: "Break",
      power: 1.36,
      critBonus: 0,
      delayPct: 1.08,
      guardChip: 1,
      effect: "Heavy overhead slam chipping 1 Guard point.",
    },
  ],
  Scimitar: [
    {
      id: "wpn_skill_scimitar_crescent_cut",
      name: "Crescent Cut",
      tag: "Fast",
      power: 1.02,
      critBonus: 0.05,
      delayPct: 0.76,
      effect: "Smooth curved slash with high accuracy and fast recovery.",
    },
    {
      id: "wpn_skill_scimitar_whirling_slash",
      name: "Whirling Slash",
      tag: "Haste",
      power: 1.36,
      critBonus: 0.15,
      delayPct: 0.88,
      effect: "Spinning slash (+15% Crit) keeping your next turn early.",
    },
  ],
  Sickle: [
    {
      id: "wpn_skill_sickle_reaping_hook",
      name: "Reaping Hook",
      tag: "Bleed",
      power: 1.0,
      critBonus: 0.05,
      delayPct: 0.78,
      debuff: "poison",
      effect: "Fast hooked slice inflicting lingering Poison.",
    },
    {
      id: "wpn_skill_sickle_thorn_slash",
      name: "Thorn Slash",
      tag: "Weaken",
      power: 1.32,
      critBonus: 0,
      delayPct: 1.04,
      debuff: "atk_down",
      effect: "Barbed cut that lowers the enemy's Attack for 2 turns.",
    },
  ],
  Unarmed: [
    {
      id: "unarmed_quick_strike",
      name: "Quick Strike",
      tag: "Unarmed",
      power: 0.85,
      critBonus: 0,
      delayPct: 0.78,
      effect: "Quick bare-handed strike with no weapon equipped.",
    },
    {
      id: "unarmed_heavy_blow",
      name: "Heavy Blow",
      tag: "Unarmed",
      power: 1.1,
      critBonus: 0.05,
      delayPct: 1.05,
      effect: "Forceful bare-handed blow while fighting unarmed.",
    },
  ],
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
  const mods: HeroDisciplineModifiers = {
    critPct: 0,
    spellCritPct: 0,
    atkPct: 0,
    magPct: 0,
    healPct: 0,
    pDefPct: 0,
    mDefPct: 0,
    maxHpPct: 0,
    maxMpPct: 0,
    dodgePct: 0,
    guardMitigationPct: 0,
    mpCostReductionPct: 0,
    armorPiercePct: 0,
    speedBonus: 0,
    lifestealPct: 0,
    hpRegenPct: 0,
    ailmentPowerPct: 0,
    statusResistPct: 0,
  };
  const badges: BattleHeroDisciplineBadge[] = [];
  if (!heroEntry || !chosenByTier) return { badges, mods };

  for (const tier of heroEntry.tiers) {
    const pickedId = chosenByTier[String(tier.level)];
    if (!pickedId) continue;
    const opt = [tier.optionA, tier.optionB].find((o) => o.id === pickedId);
    if (!opt) continue;
    badges.push({
      tier: tier.level,
      id: opt.id,
      name: opt.name,
      pillar: opt.pillar,
      tag: opt.tag,
      effect: opt.effect,
      iconPath: opt.iconPath,
    });

    const eff = opt.effect.toLowerCase();
    const numMatch = opt.effect.match(/(\d+)\s*%/);
    const pct = numMatch ? Number(numMatch[1]) : 10;

    if (eff.includes("spell crit")) mods.spellCritPct += pct;
    else if (eff.includes("crit")) mods.critPct += pct;
    if (eff.includes("physical defense") || eff.includes("armor")) mods.pDefPct += Math.min(25, pct);
    if (eff.includes("magic defense") || eff.includes("ward")) mods.mDefPct += Math.min(25, pct);
    if (eff.includes("max hp") || eff.includes("maximum hp")) mods.maxHpPct += Math.min(25, pct);
    if (eff.includes("max mp")) mods.maxMpPct += Math.min(25, pct);
    if (eff.includes("dodge") || eff.includes("evasion")) mods.dodgePct += Math.min(18, pct);
    if (eff.includes("mp cost")) mods.mpCostReductionPct += Math.min(20, pct);
    if (eff.includes("ignore") || eff.includes("pierce")) mods.armorPiercePct += Math.min(25, pct);
    if (eff.includes("lifesteal") || eff.includes("drain")) mods.lifestealPct += Math.min(15, pct);
    if (eff.includes("regen")) mods.hpRegenPct += Math.min(8, pct);
    if (eff.includes("resist")) mods.statusResistPct += Math.min(25, pct);
    if (eff.includes("heal") || eff.includes("remed")) mods.healPct += Math.min(25, pct);
    if (eff.includes("spell") || eff.includes("magic") || eff.includes("elemental")) mods.magPct += Math.min(20, pct);
    if (eff.includes("attack") || eff.includes("weapon") || eff.includes("damage")) mods.atkPct += Math.min(18, pct);
    if (eff.includes("guard")) mods.guardMitigationPct += 8;
    if (eff.includes("speed") || eff.includes("turn")) mods.speedBonus += 3;

    // Guarantee each Discipline pillar gives a steady Baseline boost matching its Discipline identity
    if (opt.pillar === "body") {
      mods.maxHpPct += 3;
      mods.pDefPct += 3;
    } else if (opt.pillar === "mind") {
      mods.atkPct += 3;
      mods.critPct += 2;
    } else {
      mods.magPct += 3;
      mods.mDefPct += 3;
    }
  }

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
  { keys: ["ashen gate", "portal_1", "loc_09"], portalNum: 1, stageId: "biome_35_portal_1_ashen_gate" },
  { keys: ["sunken maw", "portal_2", "loc_10"], portalNum: 2, stageId: "biome_36_portal_2_sunken_maw" },
  { keys: ["iron rift", "portal_3", "loc_19"], portalNum: 3, stageId: "biome_37_portal_3_iron_rift" },
  { keys: ["rotspire", "portal_4", "loc_20"], portalNum: 4, stageId: "biome_38_portal_4_rotspire" },
  { keys: ["scorched chasm", "portal_5", "loc_29"], portalNum: 5, stageId: "biome_39_portal_5_scorched_chasm" },
  { keys: ["storm-crowned", "storm crowned", "spire", "portal_6", "loc_30"], portalNum: 6, stageId: "biome_40_portal_6_storm_crowned_spire" },
  { keys: ["pale abyss", "portal_7", "loc_39"], portalNum: 7, stageId: "biome_41_portal_7_pale_abyss" },
  { keys: ["garrick", "demon", "citadel", "black keep", "portal_8", "loc_40"], portalNum: 8, stageId: "biome_33_charred_ash_plains" },
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

  // 4-Hex Ocean / Inland Water coastal buffer staging (~45% chance on generic shoreline tiles)
  if (opts.nearWaterKind === "ocean" && Math.random() < 0.45) {
    const coastalStageId =
      opts.mapId === "map_01"
        ? "biome_03_coastal_shore_crown_sea"
        : opts.mapId === "map_02"
          ? "biome_17_sandy_cove_beaches"
          : opts.mapId === "map_03"
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
          : "biome_20_oasis_alpine_lakes_shore";
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
  for (const unit of unplaced) {
    const gw = Math.min(cols, Math.max(1, unit.gw));
    const gh = Math.min(rows, Math.max(1, unit.gh));
    let placed = false;
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

function instantiateEnemyUnit(def: BattleEnemyDef, zoneLevel: number): BattleEnemyUnit {
  const lv = def.isBoss ? Math.max(zoneLevel, def.level ?? zoneLevel) : Math.max(1, Math.round((def.level ?? zoneLevel) * 0.4 + zoneLevel * 0.6));
  const roleLow = (def.role ?? "").toLowerCase();
  const speedBase = roleLow.includes("skirmish") || roleLow.includes("assassin") ? 22 : roleLow.includes("tank") || roleLow.includes("brute") ? 12 : 16;
  const maxHp = def.isBoss ? Math.max(250, def.hp) : Math.max(24, Math.round(def.hp * (0.85 + lv / Math.max(4, (def.level ?? lv) + 2) * 0.25)));
  const xpReward = def.xp ?? Math.max(18, Math.round((def.isBoss ? 3.5 : 1) * (16 + lv * 7.2 + lv * lv * 0.42)));
  const silverReward = def.silver ?? Math.max(8, Math.round((def.isBoss ? 4.0 : 1) * (7 + lv * 3.1)));
  const pDef = def.pDef ?? Math.round(2 + lv * 0.85);
  const mDef = def.mDef ?? Math.round(2 + lv * 0.8);

  return {
    instanceId: `foe_${seqCounter++}_${def.id}`,
    mobId: def.id,
    name: def.name,
    level: lv,
    role: def.role ?? "Enemy",
    maxHp,
    curHp: maxHp,
    atk: Math.max(6, Math.round(def.atk)),
    mag: Math.max(0, Math.round(def.mag ?? 0)),
    pDef,
    mDef,
    speed: speedBase + Math.floor(lv * 0.7),
    xpReward,
    silverReward,
    weakTypes: parseDamageTypeList(def.weak),
    resistTypes: parseDamageTypeList(def.resist),
    revealedWeaknesses: [],
    guardMax: Math.max(0, def.guard ?? (def.isBoss ? 4 : 0)),
    guardCur: Math.max(0, def.guard ?? (def.isBoss ? 4 : 0)),
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
    timelinePos: Math.random() * 25 + 15,
    statuses: [],
    rawDef: def,
  };
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
    const { badges, mods } = buildHeroDisciplineModifiers(
      params.disciplinesByHero[hid],
      params.chosenDisciplinesByHero[hid]
    );

    const maxHp = Math.max(30, Math.round(vitals.maxHp * (1 + mods.maxHpPct / 100)));
    const curHp = Math.max(1, Math.min(maxHp, Math.round((maxHp * (params.heroHpPct[hid] ?? 100)) / 100)));
    const maxMp = vitals.hasMp ? Math.max(10, Math.round(vitals.maxMp * (1 + mods.maxMpPct / 100))) : 0;
    const curMp = vitals.hasMp ? Math.max(0, Math.min(maxMp, Math.round((maxMp * (params.heroMpPct[hid] ?? 100)) / 100))) : 0;

    return {
      heroId: hid,
      name: heroDef.name,
      className: heroDef.className,
      level: heroLv,
      slotIdx,
      maxHp,
      curHp,
      maxMp,
      curMp,
      hasMp: vitals.hasMp,
      atk: Math.round(vitals.atk * (1 + mods.atkPct / 100)),
      mag: Math.round(vitals.mag * (1 + mods.magPct / 100)),
      heal: Math.round(vitals.heal * (1 + mods.healPct / 100)),
      pDef: Math.round(vitals.pDef * (1 + mods.pDefPct / 100)),
      mDef: Math.round(vitals.mDef * (1 + mods.mDefPct / 100)),
      speed: vitals.speed + mods.speedBonus,
      critPct: Math.min(75, vitals.crit + mods.critPct),
      dodgePct: Math.min(40, Math.round(attrs.finesse * 0.3) + mods.dodgePct),
      armorPiercePct: mods.armorPiercePct,
      statusResistPct: Math.min(65, Math.round(attrs.grit * 0.5) + mods.statusResistPct),
      weaponName: wpn?.name ?? "Unarmed",
      weaponSubType: wpn?.subType ?? "Unarmed",
      weaponDamageType: wpn?.damageType ?? "Bludgeoning",
      guarding: false,
      momentum: false,
      timelinePos: Math.random() * 14 + slotIdx * 4,
      statuses: [],
      disciplines: badges,
      mods,
      avatarPath: heroDef.avatarPath,
    };
  });

  // Pick enemies matched cleanly to Portal Boss or Zone level & stage pool
  const midZoneLv = Math.round((params.zoneMin + params.zoneMax) / 2);
  let chosenDefs: BattleEnemyDef[] = [];

  if (portalNum !== null) {
    const boss =
      params.config.monsters.find((m) => m.isBoss && m.portalNum === portalNum) ??
      params.config.monsters.find((m) => m.isBoss);
    if (boss) chosenDefs = [boss];
  } else {
    const spawnNames = new Set((stage.spawnNames ?? []).map((n) => n.toLowerCase()));
    let pool = params.config.monsters.filter((m) => !m.isBoss && spawnNames.has(m.name.toLowerCase()));
    if (pool.length === 0) {
      pool = params.config.monsters.filter(
        (m) =>
          !m.isBoss &&
          typeof m.level === "number" &&
          m.level >= Math.max(1, params.zoneMin - 4) &&
          m.level <= params.zoneMax + 4
      );
    }
    if (pool.length === 0) {
      pool = params.config.monsters.filter((m) => !m.isBoss);
    }

    // Fill enemy grid nicely up to 1–3 foes (never exceeding 4×3 grid capacity)
    const countTarget = midZoneLv <= 4 ? 2 : 2 + Math.floor(Math.random() * 2); // 2 or 3 foes
    let usedCells = 0;
    const maxCells = (stage.enemyGrid.cols ?? 4) * (stage.enemyGrid.rows ?? 3);
    for (let i = 0; i < countTarget; i++) {
      const def = pool[Math.floor(Math.random() * pool.length)];
      const area = Math.max(1, def.gridW ?? 1) * Math.max(1, def.gridH ?? 1);
      if (chosenDefs.length > 0 && usedCells + area > maxCells) break;
      chosenDefs.push(def);
      usedCells += area;
    }
  }

  const enemies = chosenDefs.map((d) => instantiateEnemyUnit(d, midZoneLv));
  packEncounterIntoGrid(enemies, stage);

  // Advance timeline until the fastest first unit takes the floor
  const state: BattleState = {
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
    phase: "player_turn",
    bannerText: `${heroes[0]?.name ?? "Party"}'s turn — choose an action`,
    totalXpEarned: 0,
    totalSilverEarned: 0,
    droppedTradeGoods: {},
    turnCounter: 1,
  };

  advanceTimelineToNextLivingUnit(state);
  return state;
}

export function getEffectiveSpeed(speed: number, statuses: StatusEffectState[]): number {
  let mul = 1.0;
  if (statuses.some((s) => s.kind === "chill")) mul *= 0.72;
  if (statuses.some((s) => s.kind === "haste")) mul *= 1.2;
  return Math.max(4, speed * mul);
}

export function advanceTimelineToNextLivingUnit(state: BattleState): void {
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

  let bestKind: "hero" | "enemy" = "hero";
  let bestId: string = livingHeroes[0].heroId;
  let minPos = Number.POSITIVE_INFINITY;

  for (const h of livingHeroes) {
    if (h.timelinePos < minPos) {
      minPos = h.timelinePos;
      bestKind = "hero";
      bestId = h.heroId;
    }
  }
  for (const e of livingEnemies) {
    if (e.timelinePos < minPos) {
      minPos = e.timelinePos;
      bestKind = "enemy";
      bestId = e.instanceId;
    }
  }

  // Pull timeline so active actor sits at 0
  if (Number.isFinite(minPos) && minPos > 0) {
    for (const h of livingHeroes) h.timelinePos = Math.max(0, h.timelinePos - minPos);
    for (const e of livingEnemies) e.timelinePos = Math.max(0, e.timelinePos - minPos);
  }

  state.activeActor =
    bestKind === "hero" ? { kind: "hero", heroId: bestId as HeroId } : { kind: "enemy", instanceId: bestId };
}

export function previewTurnTimeline(state: BattleState, count = 8): TurnTimelineEntry[] {
  const livingHeroes = state.heroes.filter((h) => h.curHp > 0);
  const livingEnemies = state.enemies.filter((e) => e.curHp > 0);
  if (livingHeroes.length === 0 || livingEnemies.length === 0) return [];

  const sim = [
    ...livingHeroes.map((h) => ({
      kind: "hero" as const,
      id: h.heroId as string,
      name: h.name,
      iconPath: h.avatarPath,
      pos: h.timelinePos,
      spd: getEffectiveSpeed(h.speed, h.statuses),
      telegraphed: false,
    })),
    ...livingEnemies.map((e) => ({
      kind: "enemy" as const,
      id: e.instanceId,
      name: e.name,
      iconPath: e.iconPath,
      pos: e.timelinePos,
      spd: getEffectiveSpeed(e.speed, e.statuses),
      telegraphed: Boolean(e.telegraphedMove),
    })),
  ];

  const out: TurnTimelineEntry[] = [];
  const activeId = state.activeActor.kind === "hero" ? state.activeActor.heroId : state.activeActor.instanceId;

  for (let i = 0; i < count; i++) {
    sim.sort((a, b) => a.pos - b.pos);
    const next = sim[0];
    if (!next) break;
    out.push({
      kind: next.kind,
      id: next.id,
      name: next.name,
      iconPath: next.iconPath,
      isActive: i === 0 && next.id === activeId,
      isTelegraphed: next.telegraphed,
    });
    const adv = next.pos;
    for (const u of sim) u.pos = Math.max(0, u.pos - adv);
    next.pos += 100 / Math.max(4, next.spd);
  }

  return out;
}

export function buildHeroWeaponActions(hero: BattleHeroUnit): BattleActionSpec[] {
  const modes = WEAPON_MODE_SPECS[hero.weaponSubType] ?? WEAPON_MODE_SPECS.Unarmed;
  return modes.map((m, idx) => ({
    id: m.id,
    kind: "attack",
    name: m.name,
    categoryLabel: `${hero.weaponSubType} · ${m.tag}`,
    badge: m.tag,
    badgeKind: "weapon",
    iconPath: getWeaponAbilityIconPath(hero.weaponSubType, idx as 0 | 1),
    mpCost: 0,
    targetScope: "enemy",
    damageType: hero.weaponDamageType,
    power: m.power,
    critBonus: m.critBonus,
    execCritBonus: m.execCritBonus,
    armorIgnore: m.armorIgnore,
    delayPct: m.delayPct,
    targetDelayPush: m.targetDelayPush,
    guardChip: m.guardChip,
    inflictStatus: m.debuff,
    restoreMp: m.restoreMp,
    vfxKey: pickVfxKey(hero.weaponDamageType, "enemy", m.name, idx === 1),
    effectText: m.effect,
  }));
}

function parseSpellTimedEffects(sp: SpellEntry): {
  inflictStatus?: StatusAilmentKind;
  inflictTurns?: number;
  inflictChance?: number;
  grantStatus?: { kind: StatusAilmentKind; turns: number };
  targetDelayPush?: number;
  guardChip?: number;
  armorIgnore?: number;
  grantMomentum?: boolean;
  stripEnemyBuffs?: boolean;
  restoreMp?: number;
} {
  const eff = (sp.effect ?? "").toLowerCase();
  const turnsMatch = eff.match(/(\d+)\s*[–-]?\s*turn/);
  const turns = turnsMatch ? Math.max(1, Math.min(4, Number(turnsMatch[1]))) : 2;
  const tg = (sp.target ?? "").toLowerCase();
  const isAlly = tg.includes("ally") || tg.includes("allies");

  let inflictStatus: StatusAilmentKind | undefined;
  let inflictChance = 0.72;
  let grantStatus: { kind: StatusAilmentKind; turns: number } | undefined;

  if (!isAlly) {
    if (eff.includes("burn")) {
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
    } else if (eff.includes("stun")) {
      inflictStatus = "stun";
      inflictChance = eff.includes("strong") ? 0.65 : 0.45;
    } else if (eff.includes("accuracy")) {
      inflictStatus = "blind";
      inflictChance = 0.8;
    } else if (eff.includes("def") && (eff.includes("melt") || eff.includes("-"))) {
      inflictStatus = "def_down";
      inflictChance = 0.85;
    } else if (eff.includes("attack") && (eff.includes("cuts") || eff.includes("-"))) {
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
    } else if (eff.includes("speed") || eff.includes("force & finesse") || eff.includes("magic power")) {
      grantStatus = { kind: "haste", turns };
    }
  }

  const targetDelayPush = eff.includes("delay") || eff.includes("pushing") ? 20 : undefined;
  const guardChip = eff.includes("breaking 2 guard") ? 2 : eff.includes("guard point") ? 1 : undefined;
  const armorIgnore = eff.includes("50% magic defense") ? 0.5 : eff.includes("40% magic defense") ? 0.4 : eff.includes("25%") ? 0.25 : undefined;
  const grantMomentum = eff.includes("momentum") ? true : undefined;
  const stripEnemyBuffs = eff.includes("strips enemy buffs") ? true : undefined;
  const mpMatch = sp.effect?.match(/\+?(\d+)\s*MP/i);
  const restoreMp = eff.includes("restores") && mpMatch ? Number(mpMatch[1]) : undefined;

  return {
    inflictStatus,
    inflictTurns: turns,
    inflictChance,
    grantStatus,
    targetDelayPush,
    guardChip,
    armorIgnore,
    grantMomentum,
    stripEnemyBuffs,
    restoreMp,
  };
}

export function buildHeroSpellTierBuckets(
  hero: BattleHeroUnit,
  spells: SpellEntry[],
  learnedSpellIds: string[]
): Map<number, BattleActionSpec[]> {
  const learnedSet = new Set(learnedSpellIds);
  const buckets = new Map<number, BattleActionSpec[]>();
  if (!hero.hasMp) return buckets;

  const mpDiscount = 1 - Math.min(0.25, hero.mods.mpCostReductionPct / 100);
  const heroSpells = spells.filter((sp) => (sp.usableBy ?? []).includes(hero.heroId) && learnedSet.has(sp.id));

  for (const sp of heroSpells) {
    const tier = Math.max(1, Math.min(8, sp.region || 1));
    const tg = (sp.target ?? "").toLowerCase();
    const isAlly = tg.includes("ally") || tg.includes("allies");
    const isAll = tg.includes("all") || tg.includes("party");
    const isRevive = sp.name.toLowerCase().includes("reviv") || sp.effect.toLowerCase().includes("reviv");
    const isCleanse = sp.effect.toLowerCase().includes("cleanse") || sp.effect.toLowerCase().includes("cure") || sp.effect.toLowerCase().includes("removes 1");
    const isHeal =
      isAlly &&
      (sp.damageType.toLowerCase().includes("restor") ||
        sp.effect.toLowerCase().includes("heal") ||
        sp.effect.toLowerCase().includes("restore hp") ||
        sp.effect.toLowerCase().includes("restores burst hp") ||
        sp.effect.toLowerCase().includes("restores light hp") ||
        sp.effect.toLowerCase().includes("restores solid hp"));
    const mpCost = Math.max(1, Math.round(sp.mpCost * mpDiscount));
    const parsedFx = parseSpellTimedEffects(sp);
    const list = buckets.get(tier) ?? [];

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
      critBonus: hero.mods.spellCritPct / 100,
      delayPct: isAll ? 1.12 : 0.96,
      healPower: isHeal ? 1.1 + tier * 0.18 : undefined,
      cleanse: isCleanse,
      revive: isRevive,
      inflictStatus: parsedFx.inflictStatus,
      inflictTurns: parsedFx.inflictTurns,
      inflictChance: parsedFx.inflictChance,
      grantStatus: parsedFx.grantStatus,
      targetDelayPush: parsedFx.targetDelayPush,
      guardChip: parsedFx.guardChip,
      armorIgnore: parsedFx.armorIgnore,
      grantMomentum: parsedFx.grantMomentum,
      stripEnemyBuffs: parsedFx.stripEnemyBuffs,
      restoreMp: parsedFx.restoreMp,
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
      delayPct: 0.78,
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

export function computeDamageOnEnemy(
  hero: BattleHeroUnit,
  action: BattleActionSpec,
  enemy: BattleEnemyUnit
): { damage: number; isCrit: boolean; isWeak: boolean; isResist: boolean; brokeGuard: boolean; triggeredStagger: boolean } {
  const isMagic = action.kind === "spell";
  const resolve = getHeroResolveState(hero);
  const momentumMul = hero.momentum ? 1.25 : 1.0;
  const hasteMul = hero.statuses.some((s) => s.kind === "haste") ? 1.2 : 1.0;
  const cursedMul = hero.statuses.some((s) => s.kind === "curse") ? 0.8 : 1.0;
  const weakMul = hero.statuses.some((s) => s.kind === "atk_down") ? 0.78 : 1.0;
  const poisonMul = !isMagic && hero.statuses.some((s) => s.kind === "poison") ? 0.85 : 1.0;

  const baseStat = (isMagic ? (14 + hero.mag) * resolve.magMul : (12 + hero.atk) * resolve.atkMul) * hasteMul;
  const defStat = isMagic ? enemy.mDef : enemy.pDef * (1 - Math.min(0.6, (action.armorIgnore ?? 0) + hero.armorPiercePct / 100));
  const defMod = enemy.statuses.some((s) => s.kind === "def_down") ? 0.75 : 1.0;
  const effDef = defStat * defMod;

  const lowHp = enemy.curHp / Math.max(1, enemy.maxHp) < 0.5;
  const critChance = Math.min(
    0.85,
    (hero.critPct / 100) + (action.critBonus || 0) + (lowHp ? action.execCritBonus || 0 : 0)
  );
  const isCrit = Math.random() < critChance;

  const dtLower = action.damageType.toLowerCase();
  const isWeak = enemy.weakTypes.some((w) => dtLower.includes(w.toLowerCase()));
  const isResist = !isWeak && enemy.resistTypes.some((r) => dtLower.includes(r.toLowerCase()));

  let elemMul = isWeak ? 1.5 : isResist ? 0.5 : 1.0;
  if (enemy.staggeredTurns > 0) elemMul *= 1.5;
  if (enemy.statuses.some((s) => s.kind === "shock")) {
    elemMul *= 1.2;
    enemy.statuses = enemy.statuses.filter((s) => s.kind !== "shock");
  }

  let raw = Math.max(baseStat * 0.45, baseStat * 1.45 - effDef * 0.55) * action.power * elemMul * momentumMul * cursedMul * weakMul * poisonMul;
  if (isCrit) raw *= 1.55;
  raw *= 0.94 + Math.random() * 0.12;
  const damage = Math.max(1, Math.round(raw));

  // Guard / Weakness Break check
  let brokeGuard = false;
  let triggeredStagger = false;
  const chip = (isWeak ? 1 : 0) + (action.guardChip ?? 0);
  if (chip > 0 && enemy.guardCur > 0) {
    enemy.guardCur = Math.max(0, enemy.guardCur - chip);
    brokeGuard = true;
    if (enemy.guardCur === 0) {
      enemy.staggeredTurns = 1;
      enemy.telegraphedMove = null;
      triggeredStagger = true;
    }
  }
  if (isWeak) {
    const matchedWeak = enemy.weakTypes.find((w) => dtLower.includes(w.toLowerCase()));
    if (matchedWeak && !enemy.revealedWeaknesses.includes(matchedWeak)) {
      enemy.revealedWeaknesses.push(matchedWeak);
    }
  }

  return { damage, isCrit, isWeak, isResist, brokeGuard, triggeredStagger };
}

export function applyLootAndDropsForDefeatedEnemy(
  state: BattleState,
  enemy: BattleEnemyUnit,
  itemsCatalog: ItemEntry[]
): void {
  state.totalXpEarned += enemy.xpReward;
  state.totalSilverEarned += enemy.silverReward;

  // Roll matching Trade Good drops cleanly by monster slug or region
  const tradeGoods = itemsCatalog.filter((it) => it.category === "trade_good");
  if (tradeGoods.length === 0) return;

  const slug = (enemy.rawDef.slug ?? enemy.name).toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const exactMatch = tradeGoods.find((tg) => tg.id.toLowerCase().includes(slug));
  const dropChance = enemy.isBoss ? 1.0 : 0.42;
  if (Math.random() <= dropChance) {
    const regionNum = Math.max(1, Math.min(8, Math.ceil(enemy.level / 12.5)));
    const regionalPool = tradeGoods.filter((tg) => (tg.region ?? 1) === regionNum);
    const chosen =
      exactMatch ??
      (regionalPool.length > 0
        ? regionalPool[Math.floor(Math.random() * regionalPool.length)]
        : tradeGoods[Math.floor(Math.random() * tradeGoods.length)]);
    if (chosen) {
      state.droppedTradeGoods[chosen.id] = (state.droppedTradeGoods[chosen.id] ?? 0) + 1;
    }
  }
}

export function applyTurnStartAilments(
  statuses: StatusEffectState[],
  maxHp: number,
  statusResistPct: number
): {
  remaining: StatusEffectState[];
  dotDamage: number;
  regenHeal: number;
  stunned: boolean;
  label: string | null;
} {
  let dotDamage = 0;
  let regenHeal = 0;
  let stunned = false;
  let label: string | null = null;
  const remaining: StatusEffectState[] = [];

  for (const st of statuses) {
    if (st.kind === "burn") {
      dotDamage += Math.max(3, Math.round(maxHp * 0.06));
      label = label ?? "Burn";
    } else if (st.kind === "bleed") {
      dotDamage += Math.max(3, Math.round(maxHp * 0.05));
      label = label ?? "Bleed";
    } else if (st.kind === "poison") {
      dotDamage += Math.max(3, Math.round(maxHp * 0.05));
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
    }
  }
  return { remaining, dotDamage, regenHeal, stunned, label };
}

export function getTimeAdvanceForDelay(speed: number, delayPct: number): number {
  return (100 / Math.max(4, speed)) * Math.max(0.5, delayPct);
}
