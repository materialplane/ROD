import type { WeaponModeSpec } from "../battle/battleTypes";
import type { DisciplineTier, EquippedGearMap, GearSlot, HeroId, ItemEntry, ShopType, SpellEntry, WorldLocation } from "../types";

export const METAL_ARMOR_TYPES = new Set([
  "Breastplate",
  "Half Plate",
  "Scale Mail",
  "Ring Mail",
  "Chain Mail",
  "Splint",
  "Plate",
]);

export const ROBE_TYPES = new Set([
  "Simple Robes",
  "Fine Robes",
  "Padded Robes",
  "Silk Robes",
  "Widowsilk Robes",
]);

export const TAILOR_ARMOR_TYPES = new Set([
  ...ROBE_TYPES,
  "Padded Bone",
  "Reinforced Bone",
  "Scale Plate",
  "Dragonscale",
]);

export const STAT_LABELS: Record<string, string> = {
  attackPower: "Attack",
  magicPower: "Spell Power Mod",
  healPower: "Heal Power Mod",
  physDef: "Phys Def",
  magDef: "Magic Def",
  critBonusPct: "Crit %",
  spellCritPct: "Spell Crit %",
  critDmgPct: "Crit Damage %",
  piercePowerPct: "Armor Pierce %",
  dodgePct: "Dodge %",
  guardBonusPct: "Guard %",
  gritBonus: "Grit",
  maxHp: "Max HP",
  maxMp: "Max MP",
  statusPotencyPct: "Ailment Power %",
  statusResistPct: "Ailment Resist %",
};

export function cleanDamageTypeLabel(raw?: string): string {
  return raw ? raw.replace(/\s*\/\s*(Caster|Nature)\b/gi, "").trim() : "";
}

export const SLOT_LABELS: Record<GearSlot, string> = {
  right_hand: "Right Hand",
  left_hand: "Left Hand",
  body: "Body Armor",
  head: "Helmet",
  accessory: "Class Accessory",
};

export const WEAPON_ATTACK_MODES: Record<string, [string, string]> = {
  Longsword: ["Quick Slash", "Heavy Cleave"],
  Greatsword: ["Wide Sweep", "Overhead Rend"],
  Rapier: ["Needle Thrust", "Heart Pierce"],
  Battleaxe: ["Chopping Hack", "Execution Chop"],
  Mace: ["Heavy Bash", "Armor Crush"],
  Spear: ["Long Thrust", "Brace Sweep"],
  Longbow: ["Snap Arrow", "Aimed Piercer"],
  Shortbow: ["Quick Volley", "Wing Clip"],
  Dagger: ["Quick Jab", "Vital Gouge"],
  "Light Crossbow": ["Bolt Snap", "Siege Crank"],
  Quarterstaff: ["Staff Sweep", "Crushing Vault"],
  Scimitar: ["Crescent Cut", "Whirling Slash"],
  Sickle: ["Reaping Hook", "Thorn Slash"],
  Unarmed: ["Quick Strike", "Heavy Blow"],
};

export const WEAPON_SKILL_ICON_MAP: Record<string, [string, string]> = {
  Longsword: ["wpn_skill_longsword_quick_slash", "wpn_skill_longsword_heavy_cleave"],
  Greatsword: ["wpn_skill_greatsword_wide_sweep", "wpn_skill_greatsword_overhead_rend"],
  Rapier: ["wpn_skill_rapier_needle_thrust", "wpn_skill_rapier_heart_pierce"],
  Battleaxe: ["wpn_skill_battleaxe_chopping_hack", "wpn_skill_battleaxe_execution_chop"],
  Mace: ["wpn_skill_mace_heavy_bash", "wpn_skill_mace_armor_crush"],
  Spear: ["wpn_skill_spear_long_thrust", "wpn_skill_spear_brace_sweep"],
  Longbow: ["wpn_skill_longbow_snap_arrow", "wpn_skill_longbow_aimed_piercer"],
  Shortbow: ["wpn_skill_shortbow_quick_volley", "wpn_skill_shortbow_wing_clip"],
  Dagger: ["wpn_skill_dagger_quick_jab", "wpn_skill_dagger_vital_gouge"],
  "Light Crossbow": ["wpn_skill_crossbow_bolt_snap", "wpn_skill_crossbow_siege_crank"],
  Quarterstaff: ["wpn_skill_staff_sweep", "wpn_skill_staff_crushing_vault"],
  Scimitar: ["wpn_skill_scimitar_crescent_cut", "wpn_skill_scimitar_whirling_slash"],
  Sickle: ["wpn_skill_sickle_reaping_hook", "wpn_skill_sickle_thorn_slash"],
};

export const WEAPON_MODE_SPECS: Record<string, [WeaponModeSpec, WeaponModeSpec]> = {
  Longsword: [
    {
      id: "wpn_skill_longsword_quick_slash",
      name: "Quick Slash",
      tag: "Ready",
      power: 1.0,
      critBonus: 0,
      cooldownTurns: 0,
      effect: "Reliable slashing strike usable every turn with crisp accuracy.",
    },
    {
      id: "wpn_skill_longsword_heavy_cleave",
      name: "Heavy Cleave",
      tag: "Heavy",
      power: 1.4,
      critBonus: 0.15,
      cooldownTurns: 1,
      guardChip: 1,
      effect: "Heavy slash dealing high damage (+15% Crit) and chipping 1 Guard point. 1-Turn Cooldown.",
    },
  ],
  Greatsword: [
    {
      id: "wpn_skill_greatsword_wide_sweep",
      name: "Wide Sweep",
      tag: "Cleave",
      power: 0.95,
      critBonus: 0,
      cooldownTurns: 0,
      splashPct: 0.5,
      effect: "Broad arc dealing 95% damage to your target and 50% splash damage to neighboring enemies.",
    },
    {
      id: "wpn_skill_greatsword_overhead_rend",
      name: "Overhead Rend",
      tag: "Heavy",
      power: 1.45,
      critBonus: 0.08,
      cooldownTurns: 1,
      guardChip: 1,
      effect: "Massive overhead chop dealing heavy damage (+8% Crit) and chipping 1 Guard point. 1-Turn Cooldown.",
    },
  ],
  Rapier: [
    {
      id: "wpn_skill_rapier_needle_thrust",
      name: "Needle Thrust",
      tag: "Crit",
      power: 1.0,
      critBonus: 0.08,
      cooldownTurns: 0,
      effect: "Precision lunge (+8% Crit) usable every turn.",
    },
    {
      id: "wpn_skill_rapier_heart_pierce",
      name: "Heart Pierce",
      tag: "Pierce",
      power: 1.38,
      critBonus: 0.2,
      armorIgnore: 0.25,
      cooldownTurns: 1,
      effect: "Focused thrust (+20% Crit) ignoring 25% of enemy Physical Defense. 1-Turn Cooldown.",
    },
  ],
  Battleaxe: [
    {
      id: "wpn_skill_battleaxe_chopping_hack",
      name: "Chopping Hack",
      tag: "Ready",
      power: 1.02,
      critBonus: 0,
      cooldownTurns: 0,
      effect: "Dependable axe chop usable every turn for steady Slashing damage.",
    },
    {
      id: "wpn_skill_battleaxe_execution_chop",
      name: "Execution Chop",
      tag: "Execute",
      power: 1.44,
      critBonus: 0.05,
      execCritBonus: 0.25,
      cooldownTurns: 1,
      effect: "Heavy chop gaining +25% Crit and bonus execution damage vs. enemies below 50% HP. 1-Turn Cooldown.",
    },
  ],
  Mace: [
    {
      id: "wpn_skill_mace_heavy_bash",
      name: "Heavy Bash",
      tag: "Guard",
      power: 1.02,
      critBonus: 0,
      cooldownTurns: 0,
      guardChip: 1,
      effect: "Dependable blunt bash that chips 1 Guard point off guarded enemies.",
    },
    {
      id: "wpn_skill_mace_armor_crush",
      name: "Armor Crush",
      tag: "Break",
      power: 1.36,
      critBonus: 0,
      cooldownTurns: 1,
      debuff: "def_down",
      effect: "Heavy smash that cracks enemy armor (-25% Defense for 2 turns). 1-Turn Cooldown.",
    },
  ],
  Spear: [
    {
      id: "wpn_skill_spear_long_thrust",
      name: "Long Thrust",
      tag: "Aim",
      power: 1.04,
      critBonus: 0.12,
      cooldownTurns: 0,
      effect: "Long-reach thrust granting +12% Crit Chance every turn.",
    },
    {
      id: "wpn_skill_spear_brace_sweep",
      name: "Brace Sweep",
      tag: "Break",
      power: 1.34,
      critBonus: 0,
      cooldownTurns: 1,
      guardChip: 1,
      debuff: "atk_down",
      effect: "Heavy sweeping strike chipping 1 Guard and lowering enemy Attack for 2 turns. 1-Turn Cooldown.",
    },
  ],
  Longbow: [
    {
      id: "wpn_skill_longbow_snap_arrow",
      name: "Snap Arrow",
      tag: "Ready",
      power: 1.0,
      critBonus: 0,
      cooldownTurns: 0,
      effect: "Crisp long-range shot usable every turn with reliable accuracy.",
    },
    {
      id: "wpn_skill_longbow_aimed_piercer",
      name: "Aimed Piercer",
      tag: "Sniper",
      power: 1.42,
      critBonus: 0.25,
      armorIgnore: 0.25,
      cooldownTurns: 1,
      effect: "Aimed shot (+25% Crit) ignoring 25% of enemy Physical Defense. 1-Turn Cooldown.",
    },
  ],
  Shortbow: [
    {
      id: "wpn_skill_shortbow_quick_volley",
      name: "Quick Volley",
      tag: "Crit",
      power: 0.98,
      critBonus: 0.08,
      cooldownTurns: 0,
      effect: "Reliable bow shot (+8% Crit) usable every turn.",
    },
    {
      id: "wpn_skill_shortbow_wing_clip",
      name: "Wing Clip",
      tag: "Blind",
      power: 1.3,
      critBonus: 0,
      cooldownTurns: 1,
      debuff: "blind",
      effect: "Pinning shot dealing solid damage and blinding the enemy for 2 turns. 1-Turn Cooldown.",
    },
  ],
  Dagger: [
    {
      id: "wpn_skill_dagger_quick_jab",
      name: "Quick Jab",
      tag: "Crit",
      power: 0.96,
      critBonus: 0.1,
      cooldownTurns: 0,
      effect: "Sharp dagger strike granting +10% Crit Chance every turn.",
    },
    {
      id: "wpn_skill_dagger_vital_gouge",
      name: "Vital Gouge",
      tag: "Poison",
      power: 1.35,
      critBonus: 0.15,
      cooldownTurns: 1,
      debuff: "poison",
      effect: "Deep stab (+15% Crit) inflicting lingering Poison pressure. 1-Turn Cooldown.",
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
      cooldownTurns: 0,
      effect: "Steady bolt shot ignoring 15% of enemy Physical Defense every turn.",
    },
    {
      id: "wpn_skill_crossbow_siege_crank",
      name: "Siege Crank",
      tag: "Break",
      power: 1.38,
      critBonus: 0.08,
      cooldownTurns: 1,
      guardChip: 1,
      effect: "Heavy cranked bolt dealing high damage and chipping 1 Guard point. 1-Turn Cooldown.",
    },
  ],
  Quarterstaff: [
    {
      id: "wpn_skill_staff_sweep",
      name: "Staff Sweep",
      tag: "MP+",
      power: 1.0,
      critBonus: 0,
      cooldownTurns: 0,
      restoreMp: 6,
      effect: "Two-handed staff strike restoring 6 MP on hit every turn.",
    },
    {
      id: "wpn_skill_staff_crushing_vault",
      name: "Crushing Vault",
      tag: "Break",
      power: 1.36,
      critBonus: 0,
      cooldownTurns: 1,
      guardChip: 1,
      effect: "Heavy overhead slam dealing strong damage and chipping 1 Guard point. 1-Turn Cooldown.",
    },
  ],
  Scimitar: [
    {
      id: "wpn_skill_scimitar_crescent_cut",
      name: "Crescent Cut",
      tag: "Crit",
      power: 1.02,
      critBonus: 0.05,
      cooldownTurns: 0,
      effect: "Smooth curved slash (+5% Crit) usable every turn.",
    },
    {
      id: "wpn_skill_scimitar_whirling_slash",
      name: "Whirling Slash",
      tag: "Heavy",
      power: 1.38,
      critBonus: 0.18,
      cooldownTurns: 1,
      effect: "Heavy spinning slash dealing high damage with +18% Crit Chance. 1-Turn Cooldown.",
    },
  ],
  Sickle: [
    {
      id: "wpn_skill_sickle_reaping_hook",
      name: "Reaping Hook",
      tag: "Poison",
      power: 1.0,
      critBonus: 0.05,
      cooldownTurns: 0,
      debuff: "poison",
      effect: "Hooked slice inflicting lingering Poison every turn.",
    },
    {
      id: "wpn_skill_sickle_thorn_slash",
      name: "Thorn Slash",
      tag: "Weaken",
      power: 1.32,
      critBonus: 0,
      cooldownTurns: 1,
      debuff: "atk_down",
      effect: "Barbed cut that lowers the enemy's Attack for 2 turns. 1-Turn Cooldown.",
    },
  ],
  Unarmed: [
    {
      id: "unarmed_quick_strike",
      name: "Quick Strike",
      tag: "Unarmed",
      power: 0.85,
      critBonus: 0,
      cooldownTurns: 0,
      effect: "Bare-handed strike with no weapon equipped.",
    },
    {
      id: "unarmed_heavy_blow",
      name: "Heavy Blow",
      tag: "Unarmed",
      power: 1.1,
      critBonus: 0.05,
      cooldownTurns: 1,
      effect: "Forceful bare-handed blow while fighting unarmed. 1-Turn Cooldown.",
    },
  ],
};

export interface WeaponAttackDisplayInfo {
  slot: 0 | 1;
  spec: WeaponModeSpec;
  iconPath: string;
  damageTypeLabel: string;
  powerPct: number;
  cooldownLabel: string;
}

export function getWeaponAbilityIconPath(subType: string | undefined, slot: 0 | 1): string {
  if (!subType || subType === "Unarmed") {
    return "assets/icons/ui/ui_01_weapon_slot_glyph.webp";
  }
  const pair = WEAPON_SKILL_ICON_MAP[subType];
  const id = pair ? pair[slot] : slot === 0 ? "wpn_skill_longsword_quick_slash" : "wpn_skill_longsword_heavy_cleave";
  return `assets/icons/weapon_abilities/${id}.webp`;
}

export function getWeaponAttackSpecs(
  subType: string | undefined,
  damageType?: string
): [WeaponAttackDisplayInfo, WeaponAttackDisplayInfo] {
  const key = subType && WEAPON_MODE_SPECS[subType] ? subType : "Unarmed";
  const specs = WEAPON_MODE_SPECS[key];
  const damageTypeLabel = cleanDamageTypeLabel(damageType) || "Physical";
  const fmt = (slot: 0 | 1): WeaponAttackDisplayInfo => {
    const spec = specs[slot];
    return {
      slot,
      spec,
      iconPath: getWeaponAbilityIconPath(key === "Unarmed" ? undefined : key, slot),
      damageTypeLabel,
      powerPct: Math.round(spec.power * 100),
      cooldownLabel: spec.cooldownTurns > 0 ? `${spec.cooldownTurns}-Turn Cooldown` : "No Cooldown",
    };
  };
  return [fmt(0), fmt(1)];
}

export interface ShopMetaSpec {
  id: ShopType;
  label: string;
  quote: string;
  pills: Array<[string, string]>;
}

export const SHOP_META: Record<ShopType, ShopMetaSpec> = {
  weapon: {
    id: "weapon",
    label: "Weapon Shop",
    quote: "Blades, bows, staves, and steel—everything built for battle.",
    pills: [["all", "All Weapons"], ["1h", "1-Handed"], ["2h", "2-Handed"]],
  },
  armor: {
    id: "armor",
    label: "Armor Shop",
    quote: "Leather, hide, mail, plate, and shields built to hold the line.",
    pills: [["all", "All Armor & Shields"], ["armor", "Body Armor"], ["helm", "Helmets"], ["shield", "Shields"]],
  },
  tailor: {
    id: "tailor",
    label: "Tailor",
    quote: "Woven robes, stitched bone, and hardened scale vestments—crafted without metal or battle leather.",
    pills: [["all", "All Tailored Gear"], ["robes", "Robes"], ["vestments", "Bone & Scale"], ["armor", "Body Armor"], ["helm", "Helmets"]],
  },
  magic: {
    id: "magic",
    label: "Magic Shop",
    quote: "Studied incantations and spell scrolls ready for your casters to master.",
    pills: [],
  },
  arcanist: {
    id: "arcanist",
    label: "Arcanist",
    quote: "Every restorative draught alongside true orbs, crystals, arcane tomes, and discipline training.",
    pills: [
      ["all", "Potions & Magic Items"],
      ["consumable", "All Potions"],
      ["orb", "Orbs"],
      ["crystal", "Crystals"],
      ["tome", "Tomes"],
      ["disciplines", "Disciplines (Lv 1–90)"],
    ],
  },
  adventurer: {
    id: "adventurer",
    label: "Adventurer Shop",
    quote: "Travel cloaks, war-horns, archer quivers, and road kit for the wilds.",
    pills: [["all", "All Field Gear"], ["cloak", "Cloaks"], ["horn", "War-Horns"], ["quiver", "Quivers"]],
  },
  trade_goods: {
    id: "trade_goods",
    label: "Trade Goods Buyer",
    quote: "Drop any trade goods on the counter and I will weigh them out in Silver.",
    pills: [],
  },
};

export const MAX_SPELLS_PER_REGION = 2;

export function countRegionSpellsForHero(
  learnedSpellIds: string[],
  spells: SpellEntry[],
  heroId: HeroId,
  region: number
): number {
  const learnedSet = new Set(learnedSpellIds);
  return spells.filter(
    (sp) => sp.region === region && (sp.usableBy ?? []).includes(heroId) && learnedSet.has(sp.id)
  ).length;
}

export type ShopCatalogEntry = (ItemEntry | SpellEntry) & { isSpell?: boolean };

export function zoneToProgressionTier(zoneNum: number): number {
  if (zoneNum <= 3) return 1;
  if (zoneNum <= 5) return 2;
  if (zoneNum <= 8) return 3;
  if (zoneNum <= 10) return 4;
  if (zoneNum <= 13) return 5;
  if (zoneNum <= 15) return 6;
  if (zoneNum <= 18) return 7;
  return 8;
}

/** Return the highest hero level covered by Zone 1..20 (Zone 1 = Lv 5, Zone 2 = Lv 10, ..., Zone 20 = Lv 99). */
export function zoneMaxHeroLevel(zoneNum: number): number {
  const safe = Math.max(1, Math.min(20, Math.floor(zoneNum)));
  return safe >= 20 ? 99 : safe * 5;
}

/** Filter Arcanist Discipline milestones to those taught in the current hub's Zone level band. */
export function getDisciplinesForZone(
  tiers: DisciplineTier[],
  zoneNum: number
): { maxLevel: number; visibleTiers: DisciplineTier[]; nextTierLevel: number | null } {
  const maxLevel = zoneMaxHeroLevel(zoneNum);
  const visibleTiers = tiers.filter((t) => t.level <= maxLevel);
  const nextTier = tiers.find((t) => t.level > maxLevel);
  return {
    maxLevel,
    visibleTiers,
    nextTierLevel: nextTier ? nextTier.level : null,
  };
}

export function stepToDefaultZone(step: number): number {
  const table = [1, 2, 2, 3, 4, 5, 6, 7, 8, 9, 9, 10, 11, 12, 13, 14, 14, 15, 16, 16, 17, 18, 19, 20];
  return table[Math.max(0, Math.min(23, step - 1))];
}

export function parseHubSteps(loc: WorldLocation): { region: number; zoneNum: number; steps: number[] } {
  const steps = new Set<number>();
  if (Array.isArray(loc.gearTiers) && loc.gearTiers.length > 0) {
    for (const gt of loc.gearTiers) {
      if (Number.isFinite(gt) && gt >= 1) steps.add(Number(gt));
    }
  } else {
    const blob = [...(loc.services ?? []), loc.levelRange ?? ""].join(" | ");
    const clean = blob.replace(/Chain\s+[A-Z]\s+Step\s+\d+/gi, "");
    for (const m of clean.matchAll(/(?:Gear\s+Tiers?|Steps?)\s*(\d+)\s*[–-]\s*(\d+)/gi)) {
      const a = Number(m[1]);
      const b = Number(m[2]);
      for (let s = a; s <= b; s++) steps.add(s);
    }
    if (steps.size === 0) {
      for (const m of clean.matchAll(/(?:Gear\s+Tier|Step)\s*(\d+)/gi)) {
        steps.add(Number(m[1]));
      }
    }
  }

  const sorted = [...steps].sort((a, b) => a - b);
  let zoneNum = Number(loc.zoneNum ?? 0);
  if (!zoneNum && loc.levelRange) {
    const zm = String(loc.levelRange).match(/Zone\s*(\d+)/i);
    if (zm) {
      zoneNum = Number(zm[1]);
    } else {
      const lm = String(loc.levelRange).match(/Lv\s*(\d+)/i);
      if (lm) zoneNum = Math.max(1, Math.min(20, Math.ceil(Number(lm[1]) / 5)));
    }
  }
  if (!zoneNum && sorted.length > 0) {
    zoneNum = stepToDefaultZone(sorted[0]);
  }
  if (!zoneNum && loc.region) {
    const regZones = [1, 4, 6, 9, 11, 14, 16, 19];
    zoneNum = regZones[Math.max(0, Math.min(7, Number(loc.region) - 1))];
  }
  zoneNum = Math.max(1, Math.min(20, zoneNum || 1));

  const spellTier = loc.spellTier ?? zoneToProgressionTier(zoneNum);
  const resolvedSteps =
    sorted.length > 0
      ? sorted
      : [Math.max(1, (Math.max(1, Math.min(8, spellTier)) - 1) * 3 + 1)];

  return {
    region: Math.max(1, Math.min(8, spellTier)),
    zoneNum,
    steps: resolvedSteps,
  };
}

export function potionAvailableInZone(potion: ItemEntry, zoneNum: number): boolean {
  if (typeof potion.minZone === "number" && typeof potion.maxZone === "number") {
    return zoneNum >= potion.minZone && zoneNum <= potion.maxZone;
  }
  const stocked = String(potion.zonesStocked ?? potion.regionsStocked ?? "");
  const zm = stocked.match(/Zones?\s*(\d+)\s*[–-]\s*(\d+)/i);
  if (zm) {
    return zoneNum >= Number(zm[1]) && zoneNum <= Number(zm[2]);
  }
  const rm = stocked.match(/(\d+)\s*[–-]\s*(\d+)/);
  if (rm) {
    const band = zoneToProgressionTier(zoneNum);
    return band >= Number(rm[1]) && band <= Number(rm[2]);
  }
  return true;
}

export function potionAvailableInRegion(potion: ItemEntry, region: number): boolean {
  const regZones = [1, 4, 6, 9, 11, 14, 16, 19];
  const zoneNum = regZones[Math.max(0, Math.min(7, region - 1))];
  return potionAvailableInZone(potion, zoneNum);
}

export function itemBelongsToShop(
  item: ItemEntry,
  shopType: ShopType,
  townShopTypes?: ShopType[]
): boolean {
  if (shopType === "weapon") return item.category === "weapon";
  if (shopType === "armor") {
    const hasTailor = !townShopTypes || townShopTypes.includes("tailor");
    if (item.category === "shield") return true;
    if (item.category !== "armor" && item.category !== "helm") return false;
    return hasTailor ? !TAILOR_ARMOR_TYPES.has(item.subType) : true;
  }
  if (shopType === "tailor") {
    const hasArmor = !townShopTypes || townShopTypes.includes("armor");
    if (!hasArmor && item.category === "shield") return true;
    if (item.category !== "armor" && item.category !== "helm") return false;
    return hasArmor ? TAILOR_ARMOR_TYPES.has(item.subType) : true;
  }
  if (shopType === "arcanist") {
    return item.category === "consumable" || ["orb", "crystal", "tome"].includes(item.category);
  }
  if (shopType === "adventurer") {
    return ["cloak", "horn", "quiver"].includes(item.category);
  }
  return false;
}

export function getStockForHero(
  items: ItemEntry[],
  spells: SpellEntry[],
  hub: WorldLocation,
  shopType: ShopType,
  catFilter: string,
  heroId: HeroId | null,
  townShopTypes?: ShopType[]
): ShopCatalogEntry[] {
  const { region, zoneNum, steps } = parseHubSteps(hub);
  const stepSet = new Set(steps);
  const canHero = (entry: { usableBy?: HeroId[] }) => !heroId || !entry.usableBy || entry.usableBy.includes(heroId);

  if (shopType === "magic") {
    return spells
      .filter((sp) => sp.region === region && canHero(sp))
      .map((sp) => ({ ...sp, isSpell: true }));
  }

  const pool = items.filter((it) => {
    if (!itemBelongsToShop(it, shopType, townShopTypes)) return false;
    if (!canHero(it)) return false;
    if (it.category === "consumable") return potionAvailableInZone(it, zoneNum);
    return it.step !== undefined && stepSet.has(it.step);
  });

  if (catFilter === "all") return pool;
  if (shopType === "weapon") return pool.filter((x) => (catFilter === "1h" ? x.handed === "1H" : x.handed === "2H"));
  if (shopType === "tailor") {
    if (catFilter === "robes") return pool.filter((x) => ROBE_TYPES.has(x.subType));
    if (catFilter === "vestments") return pool.filter((x) => TAILOR_ARMOR_TYPES.has(x.subType) && !ROBE_TYPES.has(x.subType));
    return pool.filter((x) => x.category === catFilter);
  }
  return pool.filter((x) => x.category === catFilter);
}

export function itemSlotFor(entry: ShopCatalogEntry | null): GearSlot | null {
  if (!entry || entry.category === "spell") return null;
  if ("slot" in entry && entry.slot) return entry.slot;
  if (["cloak", "orb", "horn", "quiver", "crystal", "tome"].includes(entry.category)) return "accessory";
  return null;
}

export function canDualWieldItem(
  heroId: HeroId,
  entry: ShopCatalogEntry | ItemEntry | null | undefined
): boolean {
  return Boolean(
    heroId === "valen" &&
      entry &&
      entry.category === "weapon" &&
      "handed" in entry &&
      entry.handed === "1H" &&
      (!entry.usableBy || entry.usableBy.includes("valen"))
  );
}

export function itemSlotForHero(
  entry: ShopCatalogEntry | null,
  heroId: HeroId,
  preferredSlot?: GearSlot
): GearSlot | null {
  if (preferredSlot === "left_hand" && canDualWieldItem(heroId, entry)) {
    return "left_hand";
  }
  return itemSlotFor(entry);
}

export interface StatDeltaRow {
  key: string;
  label: string;
  curVal: number;
  newVal: number;
  diff: number;
}

export function tierAccentColor(step?: number): string {
  if (!step) return "#7d653c";
  if (step <= 6) return "#6b8e6b";
  if (step <= 12) return "#4e86b8";
  if (step <= 18) return "#9d68c4";
  return "#e0a943";
}

export function itemOwnStatRows(entry: ShopCatalogEntry | null): StatDeltaRow[] {
  if (!entry || entry.category === "spell" || !("stats" in entry) || !entry.stats) return [];
  const rows: StatDeltaRow[] = [];
  for (const [k, label] of Object.entries(STAT_LABELS)) {
    const val = Number(entry.stats[k] ?? 0);
    if (val !== 0) rows.push({ key: k, label, curVal: 0, newVal: val, diff: val });
  }
  return rows;
}

export interface HeroDeltaResult {
  usable: boolean;
  headline: string;
  primaryDiff: number;
  slot: GearSlot | null;
  slotLabel: string;
  rows: StatDeltaRow[];
  comparedItem: ItemEntry | null;
  unequipsShieldFor2H: boolean;
  leftHandBlockedBy2H: boolean;
}

export function computeHeroDelta(
  entry: ShopCatalogEntry | null,
  equippedByHero: EquippedGearMap,
  itemsById: Record<string, ItemEntry>,
  heroId: HeroId,
  preferredSlot?: GearSlot
): HeroDeltaResult {
  const slot = itemSlotForHero(entry, heroId, preferredSlot);
  const isDualWieldTarget = slot === "left_hand" && entry?.category === "weapon";
  const slotLabel = isDualWieldTarget
    ? "Left Hand (Dual Wield)"
    : slot
      ? SLOT_LABELS[slot]
      : entry?.subType ?? "Utility";
  if (!entry || (entry.usableBy && !entry.usableBy.includes(heroId))) {
    return { usable: false, headline: "Cannot Use", slot, slotLabel, rows: [], comparedItem: null, primaryDiff: 0, unequipsShieldFor2H: false, leftHandBlockedBy2H: false };
  }
  if (!slot || entry.category === "spell" || !("stats" in entry) || !entry.stats) {
    return { usable: true, headline: entry.category === "spell" ? "Can Learn" : "Usable", slot, slotLabel, rows: [], comparedItem: null, primaryDiff: 0, unequipsShieldFor2H: false, leftHandBlockedBy2H: false };
  }

  const heroIdsMap = equippedByHero[heroId] ?? {};
  const curId = heroIdsMap[slot];
  const cur = curId ? itemsById[curId] ?? null : null;
  const curStats = cur?.stats ?? {};
  const newStats = entry.stats ?? {};
  const keys = [...new Set([...Object.keys(curStats), ...Object.keys(newStats)])].filter((k) => STAT_LABELS[k]);

  const rows: StatDeltaRow[] = [];
  for (const k of keys) {
    const nv = Number(newStats[k] ?? 0);
    const cv = Number(curStats[k] ?? 0);
    const diff = nv - cv;
    if (nv === 0 && cv === 0) continue;
    rows.push({ key: k, label: STAT_LABELS[k], curVal: cv, newVal: nv, diff });
  }

  const priority =
    heroId === "ellowyn" || heroId === "mera"
      ? ["magicPower", "healPower", "attackPower", "physDef", "magDef", "spellCritPct", "dodgePct"]
      : heroId === "harlan"
        ? ["healPower", "magicPower", "attackPower", "physDef", "magDef", "statusResistPct", "dodgePct"]
        : ["attackPower", "physDef", "magDef", "piercePowerPct", "critBonusPct", "dodgePct"];

  let primaryDiff: { label: string; diff: number } | null = null;
  for (const pk of priority) {
    const hit = rows.find((r) => r.key === pk);
    if (hit) {
      primaryDiff = { label: hit.label, diff: hit.diff };
      break;
    }
  }
  if (!primaryDiff && rows.length > 0) primaryDiff = { label: rows[0].label, diff: rows[0].diff };

  let headline = "Same";
  if (cur?.id === entry.id) headline = "Equipped";
  else if (primaryDiff) {
    const sign = primaryDiff.diff > 0 ? "+" : "";
    headline = primaryDiff.diff === 0 ? "Same" : `${sign}${primaryDiff.diff} ${primaryDiff.label}`;
  }

  const leftItem = heroIdsMap.left_hand ? itemsById[heroIdsMap.left_hand] : null;
  const rightItem = heroIdsMap.right_hand ? itemsById[heroIdsMap.right_hand] : null;

  return {
    usable: true,
    headline,
    primaryDiff: primaryDiff?.diff ?? 0,
    slot,
    slotLabel,
    rows,
    comparedItem: cur,
    unequipsShieldFor2H: slot === "right_hand" && "handed" in entry && entry.handed === "2H" && Boolean(leftItem),
    leftHandBlockedBy2H: slot === "left_hand" && rightItem?.handed === "2H",
  };
}

export function buildStarterEquipment(items: ItemEntry[]): EquippedGearMap {
  const firstMatch = (cat: string, sub?: string, heroId?: HeroId) =>
    items.find((x) => x.category === cat && (!sub || x.subType === sub) && (!heroId || x.usableBy?.includes(heroId)))?.id;

  const arm = (hid: HeroId) => firstMatch("armor", undefined, hid);
  const hlm = (hid: HeroId) => firstMatch("helm", undefined, hid);

  return {
    valen: { right_hand: firstMatch("weapon", "Longsword", "valen"), left_hand: firstMatch("shield"), body: arm("valen"), head: hlm("valen"), accessory: firstMatch("cloak") },
    ellowyn: { right_hand: firstMatch("weapon", "Quarterstaff", "ellowyn"), body: arm("ellowyn"), head: hlm("ellowyn"), accessory: firstMatch("orb") },
    orin: { right_hand: firstMatch("weapon", "Battleaxe", "orin"), left_hand: firstMatch("shield"), body: arm("orin"), head: hlm("orin"), accessory: firstMatch("horn") },
    rowan: { right_hand: firstMatch("weapon", "Longbow", "rowan"), body: arm("rowan"), head: hlm("rowan"), accessory: firstMatch("quiver") },
    mera: { right_hand: firstMatch("weapon", "Scimitar", "mera"), left_hand: firstMatch("shield"), body: arm("mera"), head: hlm("mera"), accessory: firstMatch("crystal") },
    harlan: { right_hand: firstMatch("weapon", "Mace", "harlan"), left_hand: firstMatch("shield"), body: arm("harlan"), head: hlm("harlan"), accessory: firstMatch("tome") },
  };
}
