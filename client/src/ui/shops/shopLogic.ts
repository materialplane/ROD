import type { EquippedGearMap, GearSlot, HeroId, ItemEntry, ShopType, SpellEntry, WorldLocation } from "../types";

export const METAL_ARMOR_TYPES = new Set([
  "Breastplate",
  "Half Plate",
  "Scale Mail",
  "Ring Mail",
  "Chain Mail",
  "Splint",
  "Plate",
  "Scale Plate",
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
  speedMod: "Speed",
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

export function getWeaponAbilityIconPath(subType: string | undefined, slot: 0 | 1): string {
  if (!subType || subType === "Unarmed") {
    return "assets/icons/ui/ui_01_weapon_slot_glyph.webp";
  }
  const pair = WEAPON_SKILL_ICON_MAP[subType];
  const id = pair ? pair[slot] : slot === 0 ? "wpn_skill_longsword_quick_slash" : "wpn_skill_longsword_heavy_cleave";
  return `assets/icons/weapon_abilities/${id}.webp`;
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
    quote: "Forged mail, heavy plates, and shields to turn the hardest blows.",
    pills: [["all", "Metal & Shields"], ["armor", "Metal Armor"], ["helm", "Metal Helms"], ["shield", "Shields"]],
  },
  tailor: {
    id: "tailor",
    label: "Tailor",
    quote: "Stitched hides, leathers, and woven robes—flexible protection with no metal.",
    pills: [["all", "All Cloth & Leather"], ["robes", "Robes"], ["leather", "Leather & Hide"], ["bone_scale", "Bone & Dragonscale"]],
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

export function parseHubSteps(loc: WorldLocation): { region: number; steps: number[] } {
  const blob = [...(loc.services ?? []), loc.levelRange ?? ""].join(" | ");
  const clean = blob.replace(/Chain\s+[A-Z]\s+Step\s+\d+/gi, "");
  const steps = new Set<number>();
  for (const m of clean.matchAll(/Steps?\s*(\d+)\s*[–-]\s*(\d+)/gi)) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    for (let s = a; s <= b; s++) steps.add(s);
  }
  if (steps.size === 0) {
    for (const m of clean.matchAll(/Step\s*(\d+)/gi)) {
      steps.add(Number(m[1]));
    }
  }
  const sorted = [...steps].sort((a, b) => a - b);
  const inferredReg = sorted.length > 0 ? Math.ceil(sorted[0] / 3) : 1;
  const lvRegMatch = String(loc.playerRegion ?? loc.region ?? "").match(/\b(\d+)\b/);
  const regNum = loc.region ?? (lvRegMatch ? Number(lvRegMatch[1]) : inferredReg);
  return {
    region: Math.max(1, Math.min(8, regNum || inferredReg)),
    steps: sorted.length > 0 ? sorted : [Math.max(1, (inferredReg - 1) * 3 + 1)],
  };
}

export function potionAvailableInRegion(potion: ItemEntry, region: number): boolean {
  const m = String(potion.regionsStocked ?? "").match(/(\d+)\s*[–-]\s*(\d+)/);
  if (!m) return true;
  return region >= Number(m[1]) && region <= Number(m[2]);
}

export function itemBelongsToShop(item: ItemEntry, shopType: ShopType): boolean {
  if (shopType === "weapon") return item.category === "weapon";
  if (shopType === "armor") {
    return item.category === "shield" || ((item.category === "armor" || item.category === "helm") && METAL_ARMOR_TYPES.has(item.subType));
  }
  if (shopType === "tailor") {
    return (item.category === "armor" || item.category === "helm") && !METAL_ARMOR_TYPES.has(item.subType);
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
  heroId: HeroId | null
): ShopCatalogEntry[] {
  const { region, steps } = parseHubSteps(hub);
  const stepSet = new Set(steps);
  const canHero = (entry: { usableBy?: HeroId[] }) => !heroId || !entry.usableBy || entry.usableBy.includes(heroId);

  if (shopType === "magic") {
    return spells
      .filter((sp) => sp.region === region && canHero(sp))
      .map((sp) => ({ ...sp, isSpell: true }));
  }

  const pool = items.filter((it) => {
    if (!itemBelongsToShop(it, shopType)) return false;
    if (!canHero(it)) return false;
    if (it.category === "consumable") return potionAvailableInRegion(it, region);
    return it.step !== undefined && stepSet.has(it.step);
  });

  if (catFilter === "all") return pool;
  if (shopType === "weapon") return pool.filter((x) => (catFilter === "1h" ? x.handed === "1H" : x.handed === "2H"));
  if (shopType === "tailor") {
    if (catFilter === "robes") return pool.filter((x) => /Robe/i.test(x.subType));
    if (catFilter === "leather") return pool.filter((x) => /Leather|Hide/i.test(x.subType));
    return pool.filter((x) => /Bone|Dragonscale/i.test(x.subType));
  }
  return pool.filter((x) => x.category === catFilter);
}

export function itemSlotFor(entry: ShopCatalogEntry | null): GearSlot | null {
  if (!entry || entry.category === "spell") return null;
  if ("slot" in entry && entry.slot) return entry.slot;
  if (["cloak", "orb", "horn", "quiver", "crystal", "tome"].includes(entry.category)) return "accessory";
  return null;
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
  heroId: HeroId
): HeroDeltaResult {
  const slot = itemSlotFor(entry);
  const slotLabel = slot ? SLOT_LABELS[slot] : entry?.subType ?? "Utility";
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
      ? ["magicPower", "healPower", "attackPower", "physDef", "magDef", "spellCritPct", "speedMod"]
      : heroId === "harlan"
        ? ["healPower", "magicPower", "attackPower", "physDef", "magDef", "statusResistPct", "speedMod"]
        : ["attackPower", "physDef", "magDef", "piercePowerPct", "critBonusPct", "speedMod"];

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
