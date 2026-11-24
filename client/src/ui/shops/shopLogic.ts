import type { WeaponModeSpec } from "../battle/battleTypes";
import { getHeroById, HEROES } from "../heroes";
import type {
  DisciplineTier,
  EquippedGearMap,
  GearRulesCatalog,
  GearSlot,
  HeroId,
  ItemEntry,
  ShopType,
  SpellEntry,
  WorldLocation,
} from "../types";

export const METAL_ARMOR_TYPES = new Set<string>();
export const ROBE_TYPES = new Set<string>();
export const TAILOR_ARMOR_TYPES = new Set<string>();
export const ACCESSORY_CATEGORIES = new Set<string>();

export const STAT_LABELS: Record<string, string> = {};

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

export const WEAPON_ATTACK_MODES: Record<string, [string, string]> = {};
export const WEAPON_SKILL_ICON_MAP: Record<string, [string, string]> = {};
export const WEAPON_MODE_SPECS: Record<string, [WeaponModeSpec, WeaponModeSpec]> = {};

let fallbackSkillIcons: [string, string] = ["wpn_skill_longsword_quick_slash", "wpn_skill_longsword_heavy_cleave"];
let zoneRegionCutoffs: number[] = [3, 5, 8, 10, 13, 15, 18, 20];
let zoneMaxLevels: number[] = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 99];
let stepToDefaultZoneTable: number[] = [1, 2, 2, 3, 4, 5, 6, 7, 8, 9, 9, 10, 11, 12, 13, 14, 14, 15, 16, 16, 17, 18, 19, 20];
let regionStartingZones: number[] = [1, 4, 6, 9, 11, 14, 16, 19];
let tierColorRules: Array<{ maxStep: number; color: string }> = [];
let defaultTierColor = "#7d653c";

export let MAX_SPELLS_PER_REGION = 2;

export interface ShopMetaSpec {
  id: ShopType;
  label: string;
  quote: string;
  pills: Array<[string, string]>;
}

export const SHOP_META: Record<string, ShopMetaSpec> = {};

/** Populate weapon attack modes, armor/tailor classifications, shop metadata, and progression tiers from data/gear-rules-catalog.json. */
export function applyGearRulesCatalog(catalog: GearRulesCatalog | null | undefined): void {
  if (!catalog) return;

  METAL_ARMOR_TYPES.clear();
  for (const t of catalog.metalArmorTypes ?? []) METAL_ARMOR_TYPES.add(t);

  ROBE_TYPES.clear();
  for (const t of catalog.robeTypes ?? []) ROBE_TYPES.add(t);

  TAILOR_ARMOR_TYPES.clear();
  for (const t of catalog.robeTypes ?? []) TAILOR_ARMOR_TYPES.add(t);
  for (const t of catalog.tailorVestmentTypes ?? []) TAILOR_ARMOR_TYPES.add(t);

  ACCESSORY_CATEGORIES.clear();
  for (const c of catalog.accessoryCategories ?? []) ACCESSORY_CATEGORIES.add(c);

  for (const k of Object.keys(STAT_LABELS)) delete STAT_LABELS[k];
  Object.assign(STAT_LABELS, catalog.statLabels ?? {});

  if (catalog.slotLabels) Object.assign(SLOT_LABELS, catalog.slotLabels);
  if (Array.isArray(catalog.fallbackSkillIcons) && catalog.fallbackSkillIcons.length >= 2) {
    fallbackSkillIcons = [catalog.fallbackSkillIcons[0], catalog.fallbackSkillIcons[1]];
  }

  for (const k of Object.keys(WEAPON_ATTACK_MODES)) delete WEAPON_ATTACK_MODES[k];
  for (const k of Object.keys(WEAPON_SKILL_ICON_MAP)) delete WEAPON_SKILL_ICON_MAP[k];
  for (const k of Object.keys(WEAPON_MODE_SPECS)) delete WEAPON_MODE_SPECS[k];
  for (const [subType, pair] of Object.entries(catalog.weaponModes ?? {})) {
    if (!Array.isArray(pair) || pair.length < 2) continue;
    WEAPON_MODE_SPECS[subType] = pair as [WeaponModeSpec, WeaponModeSpec];
    WEAPON_ATTACK_MODES[subType] = [pair[0].name, pair[1].name];
    if (subType !== "Unarmed") {
      WEAPON_SKILL_ICON_MAP[subType] = [pair[0].id, pair[1].id];
    }
  }

  for (const k of Object.keys(SHOP_META)) delete SHOP_META[k];
  if (catalog.shopMeta) {
    for (const [k, meta] of Object.entries(catalog.shopMeta)) {
      SHOP_META[k] = meta;
    }
  }

  if (typeof catalog.maxSpellsPerRegion === "number") {
    MAX_SPELLS_PER_REGION = catalog.maxSpellsPerRegion;
  }
  if (Array.isArray(catalog.tierColors)) tierColorRules = catalog.tierColors;
  if (catalog.defaultTierColor) defaultTierColor = catalog.defaultTierColor;
  if (Array.isArray(catalog.zoneRegionCutoffs) && catalog.zoneRegionCutoffs.length > 0) {
    zoneRegionCutoffs = catalog.zoneRegionCutoffs;
  }
  if (Array.isArray(catalog.zoneMaxLevels) && catalog.zoneMaxLevels.length > 0) {
    zoneMaxLevels = catalog.zoneMaxLevels;
  }
  if (Array.isArray(catalog.stepToDefaultZone) && catalog.stepToDefaultZone.length > 0) {
    stepToDefaultZoneTable = catalog.stepToDefaultZone;
  }
  if (Array.isArray(catalog.regionStartingZones) && catalog.regionStartingZones.length > 0) {
    regionStartingZones = catalog.regionStartingZones;
  }
}

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
  const id = pair ? pair[slot] : fallbackSkillIcons[slot];
  return `assets/icons/weapon_abilities/${id}.webp`;
}

export function getWeaponAttackSpecs(
  subType: string | undefined,
  damageType?: string
): [WeaponAttackDisplayInfo, WeaponAttackDisplayInfo] {
  const key = subType && WEAPON_MODE_SPECS[subType] ? subType : "Unarmed";
  const specs = WEAPON_MODE_SPECS[key] ?? [
    { id: "unarmed_quick_strike", name: "Quick Strike", tag: "Unarmed", power: 0.85, critBonus: 0, cooldownTurns: 0, effect: "" },
    { id: "unarmed_heavy_blow", name: "Heavy Blow", tag: "Unarmed", power: 1.1, critBonus: 0.05, cooldownTurns: 1, effect: "" },
  ];
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
  for (let i = 0; i < zoneRegionCutoffs.length; i += 1) {
    if (zoneNum <= zoneRegionCutoffs[i]) return i + 1;
  }
  return zoneRegionCutoffs.length;
}

/** Return the highest hero level covered by Zone 1..20 (from gear-rules-catalog.json). */
export function zoneMaxHeroLevel(zoneNum: number): number {
  const safe = Math.max(1, Math.min(zoneMaxLevels.length, Math.floor(zoneNum)));
  return zoneMaxLevels[safe - 1] ?? (safe >= 20 ? 99 : safe * 5);
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
  return stepToDefaultZoneTable[Math.max(0, Math.min(stepToDefaultZoneTable.length - 1, step - 1))] ?? 1;
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
    zoneNum = regionStartingZones[Math.max(0, Math.min(regionStartingZones.length - 1, Number(loc.region) - 1))] ?? 1;
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
  const zoneNum = regionStartingZones[Math.max(0, Math.min(regionStartingZones.length - 1, region - 1))] ?? 1;
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
  if (ACCESSORY_CATEGORIES.has(entry.category)) return "accessory";
  return null;
}

export function canDualWieldItem(
  heroId: HeroId,
  entry: ShopCatalogEntry | ItemEntry | null | undefined
): boolean {
  const hero = getHeroById(heroId);
  return Boolean(
    hero.canDualWield &&
      entry &&
      entry.category === "weapon" &&
      "handed" in entry &&
      entry.handed === "1H" &&
      (!entry.usableBy || entry.usableBy.includes(heroId))
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
  if (!step) return defaultTierColor;
  for (const rule of tierColorRules) {
    if (step <= rule.maxStep) return rule.color;
  }
  return defaultTierColor;
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

  const heroFocus = getHeroById(heroId).focusAttributes?.[0];
  const priority =
    heroFocus === "arcana"
      ? ["magicPower", "healPower", "attackPower", "physDef", "magDef", "spellCritPct", "dodgePct"]
      : heroFocus === "presence"
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

  const eq: EquippedGearMap = {};
  for (const hero of HEROES) {
    eq[hero.id] = {
      right_hand: firstMatch("weapon", hero.starterWeaponSubType, hero.id),
      ...(hero.starterShield ? { left_hand: firstMatch("shield") } : {}),
      body: firstMatch("armor", undefined, hero.id),
      head: firstMatch("helm", undefined, hero.id),
      accessory: firstMatch(hero.starterAccessoryCategory || "cloak"),
    };
  }
  return eq;
}
