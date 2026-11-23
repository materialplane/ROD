import { getHeroById, HEROES } from "../heroes";
import { itemSlotFor } from "../shops/shopLogic";
import type {
  EquippedGearMap,
  GearSlot,
  HeroAttrKey,
  HeroAttrMap,
  HeroId,
  HeroSocketsMap,
  ItemEntry,
  RunestoneItem,
} from "../types";

export const RUNESTONE_EMPTY_ICON = "assets/icons/ui/ui_17_runestone_glyph.webp";

export function xpRequiredForNextLevel(level: number): number {
  const safe = Math.max(1, Math.min(99, Math.floor(level)));
  if (safe >= 99) return 0;
  return 100 * safe + 12 * safe * safe;
}

export function getHeroLevel(
  heroLevels: Partial<Record<HeroId, number>> | undefined,
  heroId: HeroId,
  fallbackLevel = 1
): number {
  const raw = heroLevels?.[heroId];
  return typeof raw === "number" && Number.isFinite(raw) ? Math.max(1, Math.min(99, Math.floor(raw))) : Math.max(1, Math.min(99, Math.floor(fallbackLevel)));
}

export function getHeroXp(
  heroXp: Partial<Record<HeroId, number>> | undefined,
  heroId: HeroId
): number {
  const raw = heroXp?.[heroId];
  return typeof raw === "number" && Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
}

export function getAveragePartyLevel(
  heroLevels: Partial<Record<HeroId, number>> | undefined,
  partyOrder: HeroId[],
  fallbackLevel = 1
): number {
  if (!partyOrder || partyOrder.length === 0) return fallbackLevel;
  const sum = partyOrder.reduce((acc, hid) => acc + getHeroLevel(heroLevels, hid, fallbackLevel), 0);
  return Math.max(1, Math.round(sum / partyOrder.length));
}

export function normalizeHeroLevelsMap(
  rawLevels: Partial<Record<HeroId, number>> | undefined,
  fallbackLevel = 1
): Partial<Record<HeroId, number>> {
  const out: Partial<Record<HeroId, number>> = {};
  for (const h of HEROES) {
    out[h.id] = getHeroLevel(rawLevels, h.id, fallbackLevel);
  }
  return out;
}

export function normalizeHeroXpMap(
  rawXp: Partial<Record<HeroId, number>> | undefined,
  fallbackXp = 0
): Partial<Record<HeroId, number>> {
  const out: Partial<Record<HeroId, number>> = {};
  for (const h of HEROES) {
    const val = rawXp?.[h.id];
    out[h.id] = typeof val === "number" && Number.isFinite(val) ? Math.max(0, Math.floor(val)) : Math.max(0, Math.floor(fallbackXp));
  }
  return out;
}

export function applyHeroXpGain(
  level: number,
  currentXp: number,
  gainedXp: number
): { level: number; xp: number; leveledUp: boolean } {
  let lv = Math.max(1, Math.min(99, Math.floor(level)));
  let xp = Math.max(0, Math.floor(currentXp) + Math.max(0, Math.floor(gainedXp)));
  const startLv = lv;
  while (lv < 99) {
    const req = xpRequiredForNextLevel(lv);
    if (req <= 0 || xp < req) break;
    xp -= req;
    lv += 1;
  }
  if (lv >= 99) xp = 0;
  return { level: lv, xp, leveledUp: lv > startLv };
}

export const applyPartyXpGain = applyHeroXpGain;

export const LEDGER_TABS = [
  { id: "party", label: "Party & Stats", icon: "assets/icons/ui/ui_21_party_hero_glyph.webp" },
  { id: "gear", label: "Gear & Runestones", icon: "assets/icons/ui/ui_04_body_armor_slot_glyph.webp" },
  { id: "skills", label: "Weapons & Spells", icon: "assets/icons/ui/ui_09_spells_magic_glyph.webp" },
  { id: "bag", label: "Inventory Bag", icon: "assets/icons/ui/ui_22_all_pack_bag_glyph.webp" },
  { id: "journal", label: "Quest Journal", icon: "assets/icons/ui/ui_06_quest_scroll_glyph.webp" },
  { id: "atlas", label: "World Map", icon: "assets/icons/ui/ui_25_world_atlas_glyph.webp" },
] as const;

export type LedgerTabId = (typeof LEDGER_TABS)[number]["id"];

export interface SlotSpec {
  key: GearSlot;
  label: string;
  fallbackIcon: string;
}

export const SLOT_CONFIG: SlotSpec[] = [
  { key: "right_hand", label: "Right Hand", fallbackIcon: "assets/icons/ui/ui_01_weapon_slot_glyph.webp" },
  { key: "left_hand", label: "Left Hand", fallbackIcon: "assets/icons/ui/ui_02_shield_slot_glyph.webp" },
  { key: "body", label: "Body Armor", fallbackIcon: "assets/icons/ui/ui_04_body_armor_slot_glyph.webp" },
  { key: "head", label: "Helmet", fallbackIcon: "assets/icons/ui/ui_03_helmet_slot_glyph.webp" },
  { key: "accessory", label: "Class Accessory", fallbackIcon: "assets/icons/ui/ui_05_accessory_slot_glyph.webp" },
];

/** Earned spendable stat points through level N (+2/lvl, +1 extra every 5th lvl < 100; Lv 99 = 215). */
export function earnedPointsForLevel(level: number): number {
  const safeLvl = Math.max(1, Math.floor(level));
  if (safeLvl <= 1) return 0;
  let total = (safeLvl - 1) * 2;
  for (let l = 5; l <= safeLvl; l += 5) {
    if (l < 100) total += 1;
  }
  return total;
}

export interface ComputedHeroAttributes {
  force: number;
  finesse: number;
  grit: number;
  arcana: number;
  presence: number;
  spent: Record<HeroAttrKey, number>;
  totalSpent: number;
  unspent: number;
  budget: number;
}

export function getHeroAttributes(
  heroId: HeroId,
  level: number,
  spentByHero: Partial<Record<HeroId, HeroAttrMap>>
): ComputedHeroAttributes {
  const hero = getHeroById(heroId);
  const rawSpent = spentByHero[heroId] ?? {};
  const spent: Record<HeroAttrKey, number> = {
    force: Math.max(0, Math.floor(rawSpent.force ?? 0)),
    finesse: Math.max(0, Math.floor(rawSpent.finesse ?? 0)),
    grit: Math.max(0, Math.floor(rawSpent.grit ?? 0)),
    arcana: Math.max(0, Math.floor(rawSpent.arcana ?? 0)),
    presence: Math.max(0, Math.floor(rawSpent.presence ?? 0)),
  };
  const totalSpent = spent.force + spent.finesse + spent.grit + spent.arcana + spent.presence;
  const budget = earnedPointsForLevel(level);
  const unspent = Math.max(0, budget - totalSpent);

  return {
    force: (hero.startingAttributes.force ?? 1) + spent.force,
    finesse: (hero.startingAttributes.finesse ?? 1) + spent.finesse,
    grit: (hero.startingAttributes.grit ?? 1) + spent.grit,
    arcana: (hero.startingAttributes.arcana ?? 1) + spent.arcana,
    presence: (hero.startingAttributes.presence ?? 1) + spent.presence,
    spent,
    totalSpent,
    unspent,
    budget,
  };
}

export interface ParsedStoneBonus {
  maxHp: number;
  maxMp: number;
  atk: number;
  mag: number;
  heal: number;
  pDef: number;
  mDef: number;
  speed: number;
  crit: number;
}

/** Extracts flat numeric bonuses written in a Carved Runestone affix description. */
export function parseRunestoneStatBonuses(affix: string | undefined): ParsedStoneBonus {
  const out: ParsedStoneBonus = { maxHp: 0, maxMp: 0, atk: 0, mag: 0, heal: 0, pDef: 0, mDef: 0, speed: 0, crit: 0 };
  if (!affix) return out;
  const pull = (re: RegExp): number => {
    const m = affix.match(re);
    return m ? Number(m[1]) : 0;
  };
  out.maxHp += pull(/([+-]?\d+)\s+Max\s+HP/i);
  out.maxMp += pull(/([+-]?\d+)\s+Max\s+MP/i);
  out.speed += pull(/([+-]?\d+)\s+(?:Turn\s+)?Speed/i);
  out.crit += pull(/([+-]?\d+)%\s+Crit(?:\s+Chance)?/i);
  out.pDef += pull(/([+-]?\d+)\s+Phys(?:ical)?\s+Def/i);
  out.mDef += pull(/([+-]?\d+)\s+Mag(?:ic)?\s+Def/i);
  out.atk += pull(/([+-]?\d+)\s+Attack(?:\s+Power)?/i);
  out.mag += pull(/([+-]?\d+)\s+(?:Spell|Magic)(?:\s+Power)?/i);
  return out;
}

export interface ComputedHeroVitals {
  maxHp: number;
  curHp: number;
  hpRatio: number;
  hpTokenState: 1 | 2 | 3 | 4;
  maxMp: number;
  curMp: number;
  hasMp: boolean;
  atk: number;
  mag: number;
  heal: number;
  pDef: number;
  mDef: number;
  speed: number;
  crit: number;
}

export function computeHeroVitals(
  heroId: HeroId,
  level: number,
  spentByHero: Partial<Record<HeroId, HeroAttrMap>>,
  equippedByHero: EquippedGearMap,
  itemsById: Record<string, ItemEntry>,
  socketsByHero?: HeroSocketsMap,
  heroHpPct?: Partial<Record<HeroId, number>>,
  heroMpPct?: Partial<Record<HeroId, number>>
): ComputedHeroVitals {
  const hero = getHeroById(heroId);
  const attrs = getHeroAttributes(heroId, level, spentByHero);
  const eq = equippedByHero[heroId] ?? {};

  let bonusHp = 0;
  let bonusMp = 0;
  let atk = 0;
  let mag = 0;
  let heal = 0;
  let pDef = 0;
  let mDef = 0;
  let speed = 0;
  let crit = 0;

  for (const slot of ["right_hand", "left_hand", "body", "head", "accessory"] as GearSlot[]) {
    const itemId = eq[slot];
    const it = itemId ? itemsById[itemId] : undefined;
    if (!it?.stats) continue;
    bonusHp += Number(it.stats.maxHp ?? 0);
    bonusMp += Number(it.stats.maxMp ?? 0);
    atk += Number(it.stats.attackPower ?? 0);
    mag += Number(it.stats.magicPower ?? 0);
    heal += Number(it.stats.healPower ?? 0);
    pDef += Number(it.stats.physDef ?? 0);
    mDef += Number(it.stats.magDef ?? 0);
    speed += Number(it.stats.speedMod ?? 0);
    crit += Number(it.stats.critBonusPct ?? 0);
  }

  const sockets = socketsByHero?.[heroId];
  for (const stone of [sockets?.weapon, sockets?.armor]) {
    if (!stone) continue;
    const sb = parseRunestoneStatBonuses(stone.affix);
    bonusHp += sb.maxHp;
    bonusMp += sb.maxMp;
    atk += sb.atk;
    mag += sb.mag;
    heal += sb.heal;
    pDef += sb.pDef;
    mDef += sb.mDef;
    speed += sb.speed;
    crit += sb.crit;
  }

  const safeLevel = Math.max(1, Math.floor(level));
  const maxHp = Math.round(hero.baseHp + (safeLevel - 1) * 18 + (attrs.grit - 1) * 12 + bonusHp);
  const hasMp = hero.baseMp > 0 || heroId === "ellowyn" || heroId === "mera" || heroId === "harlan";
  const maxMp = hasMp ? Math.round(hero.baseMp + (safeLevel - 1) * 3 + (attrs.arcana - 1) * 4 + bonusMp) : 0;

  const pct = Math.max(1, Math.min(100, Number(heroHpPct?.[heroId] ?? 100)));
  const curHp = Math.max(1, Math.min(maxHp, Math.round((maxHp * pct) / 100)));
  const hpRatio = Math.round((curHp / Math.max(1, maxHp)) * 100);
  const hpTokenState: 1 | 2 | 3 | 4 = hpRatio > 75 ? 1 : hpRatio > 50 ? 2 : hpRatio > 25 ? 3 : 4;
  const mpPctVal = Math.max(0, Math.min(100, Number(heroMpPct?.[heroId] ?? 100)));
  const curMp = hasMp ? Math.max(0, Math.min(maxMp, Math.round((maxMp * mpPctVal) / 100))) : 0;

  return {
    maxHp,
    curHp,
    hpRatio,
    hpTokenState,
    maxMp,
    curMp,
    hasMp,
    atk: atk + Math.round((attrs.force - 1) * 1.5),
    mag: mag + Math.round((attrs.arcana - 1) * 1.6),
    heal: heal + Math.round((attrs.presence - 1) * 1.5),
    pDef: pDef + (attrs.grit - 1),
    mDef: mDef + (attrs.presence - 1),
    speed: 10 + speed + (attrs.finesse - 1),
    crit: Math.min(45, 5 + crit + Math.round((attrs.finesse - 1) * 0.4)),
  };
}

export function summarizeItemStats(it: ItemEntry | null | undefined): string {
  if (!it) return "";
  if (!it.stats) return it.effect || it.subType || "";
  const parts: string[] = [];
  if (it.stats.attackPower) parts.push(`Attack +${it.stats.attackPower}`);
  if (it.stats.magicPower) parts.push(`Spell +${it.stats.magicPower}`);
  if (it.stats.healPower) parts.push(`Heal +${it.stats.healPower}`);
  if (it.stats.physDef) parts.push(`Phys Def +${it.stats.physDef}`);
  if (it.stats.magDef) parts.push(`Magic Def +${it.stats.magDef}`);
  if (it.stats.maxHp) parts.push(`Max HP +${it.stats.maxHp}`);
  if (it.stats.maxMp) parts.push(`Max MP +${it.stats.maxMp}`);
  const speedMod = Number(it.stats.speedMod ?? 0);
  if (speedMod) parts.push(`Speed ${speedMod > 0 ? "+" : ""}${speedMod}`);
  if (it.stats.critBonusPct) parts.push(`Crit +${it.stats.critBonusPct}%`);
  return parts.join(" · ") || it.effect || it.subType || "";
}

/** Exact signature so consumables sharing identical category, subType, effect & stats stack cleanly without a 99 cap. */
export function consumableSignature(it: Pick<ItemEntry, "category" | "subType" | "effect" | "stats">): string {
  const statsSig = it.stats
    ? JSON.stringify(Object.entries(it.stats).sort(([a], [b]) => a.localeCompare(b)))
    : "";
  return `${it.category}|${it.subType || ""}|${it.effect || ""}|${statsSig}`;
}

export type BagFilterGroup = "all" | "potions" | "runestones" | "gear" | "trade_goods" | "keys";
export type BagSortMode = "category" | "step_desc" | "value_desc" | "name_asc" | "usable";

export interface MergedBagEntry {
  kind: "item" | "runestone";
  id: string;
  sourceIds: string[];
  name: string;
  group: Exclude<BagFilterGroup, "all">;
  subType: string;
  tierNum: number;
  silver: number;
  count: number;
  iconPath: string;
  item?: ItemEntry;
  runestone?: RunestoneItem;
}

const RUNESTONE_TIER_ORDER: Record<string, number> = {
  Lesser: 1,
  Refined: 2,
  Greater: 3,
  Mythic: 4,
};

export function mergeBagEntries(
  bagCounts: Record<string, number>,
  tradeGoodCounts: Record<string, number>,
  itemsById: Record<string, ItemEntry>,
  runestonesBag: RunestoneItem[]
): MergedBagEntry[] {
  const entries: MergedBagEntry[] = [];
  const mergedConsumables = new Map<string, MergedBagEntry>();

  const combinedCounts: Record<string, number> = { ...bagCounts };
  for (const [id, cnt] of Object.entries(tradeGoodCounts)) {
    if (cnt > 0) {
      combinedCounts[id] = (combinedCounts[id] ?? 0) + cnt;
    }
  }

  for (const [id, cnt] of Object.entries(combinedCounts)) {
    if (!cnt || cnt <= 0) continue;
    const it = itemsById[id];
    if (!it) continue;

    let group: Exclude<BagFilterGroup, "all"> = "gear";
    if (it.category === "consumable") group = "potions";
    else if (it.category === "trade_good") group = "trade_goods";
    else if (it.category === "key_item") group = "keys";

    const sellValue = Number(it.sellSilver ?? Math.round((it.priceSilver ?? 10) * 0.4));

    if (group === "potions") {
      const sig = consumableSignature(it);
      const existing = mergedConsumables.get(sig);
      if (existing) {
        existing.count += cnt;
        existing.sourceIds.push(id);
        continue;
      }
      const created: MergedBagEntry = {
        kind: "item",
        id: it.id,
        sourceIds: [id],
        name: it.name,
        group,
        subType: it.subType || "Potion",
        tierNum: Number(it.step ?? it.region ?? 1),
        silver: sellValue,
        count: cnt,
        iconPath: it.iconPath,
        item: it,
      };
      mergedConsumables.set(sig, created);
      entries.push(created);
      continue;
    }

    entries.push({
      kind: "item",
      id: it.id,
      sourceIds: [id],
      name: it.name,
      group,
      subType: it.subType || it.category,
      tierNum: Number(it.step ?? it.region ?? 1),
      silver: sellValue,
      count: cnt,
      iconPath: it.iconPath,
      item: it,
    });
  }

  for (const rn of runestonesBag) {
    entries.push({
      kind: "runestone",
      id: rn.id,
      sourceIds: [rn.id],
      name: rn.name,
      group: "runestones",
      subType: `${rn.tier} (${rn.target === "weapon" ? "Weapon" : "Body Armor"})`,
      tierNum: RUNESTONE_TIER_ORDER[rn.tier] ?? 1,
      silver: Number(rn.sellSilver ?? 0),
      count: 1,
      iconPath: rn.iconPath || RUNESTONE_EMPTY_ICON,
      runestone: rn,
    });
  }

  return entries;
}

/** Pure equip transition handling 2-Handed weapons <-> Left Hand shield swapping cleanly. */
export function resolveEquipFromBag(
  heroId: HeroId,
  item: ItemEntry,
  equippedByHero: EquippedGearMap,
  bagCounts: Record<string, number>,
  itemsById: Record<string, ItemEntry>
): { equippedByHero: EquippedGearMap; bagCounts: Record<string, number>; changed: boolean } {
  const slot = itemSlotFor(item);
  if (!slot || !(bagCounts[item.id] > 0)) {
    return { equippedByHero, bagCounts, changed: false };
  }

  const nextEq = { ...(equippedByHero[heroId] ?? {}) };
  const nextBag = { ...bagCounts };

  if (slot === "right_hand" && item.handed === "2H" && nextEq.left_hand) {
    nextBag[nextEq.left_hand] = (nextBag[nextEq.left_hand] ?? 0) + 1;
    delete nextEq.left_hand;
  }

  if (slot === "left_hand" && nextEq.right_hand && itemsById[nextEq.right_hand]?.handed === "2H") {
    nextBag[nextEq.right_hand] = (nextBag[nextEq.right_hand] ?? 0) + 1;
    delete nextEq.right_hand;
  }

  const prevId = nextEq[slot];
  if (prevId) {
    nextBag[prevId] = (nextBag[prevId] ?? 0) + 1;
  }

  nextEq[slot] = item.id;
  const rem = Math.max(0, (nextBag[item.id] ?? 1) - 1);
  if (rem === 0) delete nextBag[item.id];
  else nextBag[item.id] = rem;

  return {
    equippedByHero: { ...equippedByHero, [heroId]: nextEq },
    bagCounts: nextBag,
    changed: true,
  };
}

/** Pure unequip transition returning item from hero's slot back to the bag. */
export function resolveUnequipSlot(
  heroId: HeroId,
  slot: GearSlot,
  equippedByHero: EquippedGearMap,
  bagCounts: Record<string, number>
): { equippedByHero: EquippedGearMap; bagCounts: Record<string, number>; removedItemId?: string } {
  const heroEq = equippedByHero[heroId] ?? {};
  const curId = heroEq[slot];
  if (!curId) {
    return { equippedByHero, bagCounts };
  }
  const nextEq = { ...heroEq };
  delete nextEq[slot];
  const nextBag = { ...bagCounts, [curId]: (bagCounts[curId] ?? 0) + 1 };
  return {
    equippedByHero: { ...equippedByHero, [heroId]: nextEq },
    bagCounts: nextBag,
    removedItemId: curId,
  };
}
