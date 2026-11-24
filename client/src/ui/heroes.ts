import type {
  HeroAttrKey,
  HeroAttributeMeta,
  HeroCatalogEntry,
  HeroId,
  HeroOpeningCutsceneCatalog,
  HeroProgressionCatalog,
  HeroesCatalog,
} from "./types";

export type AttributeKey = HeroAttrKey;
export type AttributeMeta = HeroAttributeMeta;
export type HeroDefinition = HeroCatalogEntry;

export const ATTRIBUTE_META: AttributeMeta[] = [];
export const BASE_STARTING_ATTRIBUTES: Record<AttributeKey, number> = {
  force: 1,
  finesse: 1,
  grit: 1,
  arcana: 1,
  presence: 1,
};

export const HEROES: HeroDefinition[] = [];
export const DEFAULT_PARTY_ORDER: HeroId[] = [];

const HERO_MAP = new Map<HeroId, HeroDefinition>();

let currentProgression: HeroProgressionCatalog = {
  startingSilver: 1000,
  maxLevel: 99,
  xpCurve: { linear: 100, quadratic: 12 },
  pointsPerLevel: 2,
  milestoneLevelInterval: 5,
  milestoneBonusPoints: 1,
  hpPerLevel: 17.5,
  mpPerLevel: 3,
  gritHpPerPoint: 12,
  arcanaMpPerPoint: 4,
  forceAtkPerPoint: 1.5,
  arcanaMagPerPoint: 1.6,
  presenceHealPerPoint: 1.5,
  gritPdefPerPoint: 1,
  presenceMdefPerPoint: 1,
  finesseDodgePerPoint: 0.3,
  finesseCritPerPoint: 0.4,
  baseCritPct: 5,
  dodgeCapPct: 45,
  critCapPct: 45,
  dualWieldOffhandScale: 0.5,
  runestoneAttrScaling: {
    forceAtk: 1.5,
    finesseDodge: 0.3,
    finesseCrit: 0.4,
    gritHp: 12,
    gritPdef: 1,
    arcanaMag: 1.6,
    presenceMdef: 1,
    presenceHeal: 1.5,
  },
  runestoneEmptyIcon: "assets/icons/ui/ui_17_runestone_glyph.webp",
  ledgerTabs: [],
  slotConfig: [],
};

let currentOpeningCutscene: HeroOpeningCutsceneCatalog | null = null;

/** Populate runtime hero definitions, attribute metadata, and leveling curves from data/heroes-catalog.json. */
export function applyHeroesCatalog(catalog: HeroesCatalog | null | undefined): void {
  if (!catalog) return;
  if (Array.isArray(catalog.attributeMeta)) {
    ATTRIBUTE_META.splice(0, ATTRIBUTE_META.length, ...catalog.attributeMeta);
  }
  if (catalog.baseStartingAttributes) {
    Object.assign(BASE_STARTING_ATTRIBUTES, catalog.baseStartingAttributes);
  }
  if (Array.isArray(catalog.heroes)) {
    HEROES.splice(0, HEROES.length, ...catalog.heroes);
    HERO_MAP.clear();
    for (const h of HEROES) {
      HERO_MAP.set(h.id, h);
    }
  }
  if (Array.isArray(catalog.defaultPartyOrder)) {
    DEFAULT_PARTY_ORDER.splice(0, DEFAULT_PARTY_ORDER.length, ...catalog.defaultPartyOrder);
  }
  if (catalog.progression) {
    currentProgression = catalog.progression;
  }
  if (catalog.openingCutscene) {
    currentOpeningCutscene = catalog.openingCutscene;
  }
}

export function getHeroProgression(): HeroProgressionCatalog {
  return currentProgression;
}

export function getHeroOpeningCutscene(): HeroOpeningCutsceneCatalog | null {
  return currentOpeningCutscene;
}

export function isHeroesCatalogLoaded(): boolean {
  return HEROES.length > 0 && DEFAULT_PARTY_ORDER.length > 0;
}

const FALLBACK_HERO: HeroDefinition = {
  id: "valen",
  name: "Valen",
  fullName: "Prince Valen",
  className: "Duelist",
  shortTag: "",
  worldBio: "",
  classStyle: "",
  gearSummary: "",
  roleSummary: "",
  focusAttributes: ["force", "finesse"],
  focusLabel: "Force & Finesse",
  startingAttributes: { force: 1, finesse: 1, grit: 1, arcana: 1, presence: 1 },
  wounded50: "",
  wounded25: "",
  baseHp: 80,
  baseMp: 0,
  usesMp: false,
  canDualWield: true,
  avatarPath: "assets/portraits/heroes/valen_avatar.webp",
  tokenPath: "assets/tokens/heroes/valen_hp1.webp",
};

export function getHeroById(id: string | undefined | null): HeroDefinition {
  if (id && HERO_MAP.has(id as HeroId)) {
    return HERO_MAP.get(id as HeroId)!;
  }
  return HEROES[0] ?? FALLBACK_HERO;
}

export function normalizePartyOrder(rawOrder?: unknown, fallbackLeaderId?: string): HeroId[] {
  const seen = new Set<HeroId>();
  const out: HeroId[] = [];
  if (Array.isArray(rawOrder)) {
    for (const item of rawOrder) {
      if (typeof item === "string" && HERO_MAP.has(item as HeroId) && !seen.has(item as HeroId)) {
        seen.add(item as HeroId);
        out.push(item as HeroId);
        if (out.length === 4) return out;
      }
    }
  }
  if (fallbackLeaderId && HERO_MAP.has(fallbackLeaderId as HeroId) && !seen.has(fallbackLeaderId as HeroId)) {
    seen.add(fallbackLeaderId as HeroId);
    out.unshift(fallbackLeaderId as HeroId);
  }
  for (const h of DEFAULT_PARTY_ORDER) {
    if (out.length === 4) break;
    if (!seen.has(h)) {
      seen.add(h);
      out.push(h);
    }
  }
  for (const h of HEROES) {
    if (out.length === 4) break;
    if (!seen.has(h.id)) {
      seen.add(h.id);
      out.push(h.id);
    }
  }
  return out.slice(0, 4);
}
