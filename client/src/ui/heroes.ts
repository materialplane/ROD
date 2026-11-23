import type { HeroId } from "./types";

export type AttributeKey = "force" | "finesse" | "grit" | "arcana" | "presence";

export interface AttributeMeta {
  key: AttributeKey;
  label: string;
  shortLabel: string;
  hint: string;
}

export const ATTRIBUTE_META: AttributeMeta[] = [
  { key: "force", label: "Force", shortLabel: "FOR", hint: "Melee Power" },
  { key: "finesse", label: "Finesse", shortLabel: "FIN", hint: "Dodge & Crit" },
  { key: "grit", label: "Grit", shortLabel: "GRT", hint: "HP & Defense" },
  { key: "arcana", label: "Arcana", shortLabel: "ARC", hint: "Magic & MP" },
  { key: "presence", label: "Presence", shortLabel: "PRE", hint: "Heal & Ward" },
];

const BASE_STARTING_ATTRIBUTES: Record<AttributeKey, number> = {
  force: 1,
  finesse: 1,
  grit: 1,
  arcana: 1,
  presence: 1,
};

export interface HeroDefinition {
  id: HeroId;
  name: string;
  fullName: string;
  className: string;
  shortTag: string;
  worldBio: string;
  classStyle: string;
  gearSummary: string;
  roleSummary: string;
  focusAttributes: AttributeKey[];
  focusLabel: string;
  startingAttributes: Record<AttributeKey, number>;
  wounded50: string;
  wounded25: string;
  baseHp: number;
  baseMp: number;
  avatarPath: string;
  tokenPath: string;
}

export const HEROES: HeroDefinition[] = [
  {
    id: "valen",
    name: "Valen",
    fullName: "Prince Valen",
    className: "Duelist",
    shortTag: "Swords & Rapiers · Striker",
    worldBio:
      "Raised as Garrick's ruthless heir, Valen cut down his arena trainer Koren in a spiteful duel—only to watch two halves of a silver wolf pendant lock in the sand and realize he had killed his own father, who chose death over striking his son. Stripped of crown and armor and thrown into Koren's old cell, the broken prince steps into a bleeding Ethoria drowning in grief and unpayable guilt.",
    classStyle:
      "A versatile frontline fighter who wields longswords, 2H greatswords, or rapiers—paired with light or medium armor, cloaks, shields, or dual one-handed blades. Built for relentless single-target pressure and twin off-hand follow-ups, getting fiercer as he takes hits.",
    gearSummary: "Longswords, Greatswords, Rapiers · Global Shields · Light or Medium Armor · Cloaks",
    roleSummary: "Versatile frontline swordsman built around sharp single-target pressure and Dual Wield follow-up strikes.",
    focusAttributes: ["force", "finesse"],
    focusLabel: "Force & Finesse",
    startingAttributes: { ...BASE_STARTING_ATTRIBUTES },
    wounded50: "Below 50% HP: Strikes deal more damage and land more critical hits.",
    wounded25: "Below 25% HP: Damage surges further and he automatically counters once per turn.",
    baseHp: 47,
    baseMp: 0,
    avatarPath: "assets/portraits/heroes/valen_avatar.webp",
    tokenPath: "assets/tokens/heroes/valen_hp1.webp",
  },
  {
    id: "ellowyn",
    name: "Ellowyn",
    fullName: "Queen Ellowyn",
    className: "Sorceress",
    shortTag: "Arcane · Spells & Wards",
    worldBio:
      "Enduring years in a loveless marriage to a tyrant, Ellowyn lost Koren—the only love she ever knew—the day he let their oblivious son run him through on the sands. Stripped of her silver crown and locked beneath Highcrown as Valen fell, the grieving Queen unleashes forbidden arcane magic kept hidden through decades of misery, marching into a torn Ethoria to keep her broken son alive.",
    classStyle:
      "A ranged spellcaster wielding quarterstaves, daggers, or light crossbows, alongside robes or dragonscale armor, crystal orbs, and shields when holding a dagger. Channels arcane spells learned as she levels to punish dangerous enemies while shielding companions with protective wards.",
    gearSummary: "Quarterstaves, Daggers, Light Crossbows · Global Shields · Robes & Dragonscale · Orbs",
    roleSummary: "Offensive spellcaster who unlocks arcane attack spells and protective party wards as she levels.",
    focusAttributes: ["arcana", "presence"],
    focusLabel: "Arcana & Presence",
    startingAttributes: { ...BASE_STARTING_ATTRIBUTES },
    wounded50: "Below 50% HP: Attack spells hit harder and protective wards absorb more damage.",
    wounded25: "Below 25% HP: Spell power surges sharply and MP costs drop.",
    baseHp: 47,
    baseMp: 19,
    avatarPath: "assets/portraits/heroes/ellowyn_avatar.webp",
    tokenPath: "assets/tokens/heroes/ellowyn_hp1.webp",
  },
  {
    id: "orin",
    name: "Orin",
    fullName: "Commander Orin",
    className: "Knight",
    shortTag: "Heavy Arms · Protector",
    worldBio:
      "Orin swore Highcrown's marriage-forbidden Commander vow only after his wife died giving birth to Rowan. Worse, Koren was his close friend—Orin spotted Valen's matching wolf pendant and Ellowyn's secret years before the duel, yet held his tongue. Haunted by crushing grief that speaking to Valen sooner could have spared Koren's life, the weary veteran marches beside his own boy into a broken realm.",
    classStyle:
      "A sturdy frontline defender free to wield 2H spears for reach, or pair battleaxes and maces with a shield—clad in hide, scale, or heavy plate alongside war-horns. Built to absorb heavy blows, crack enemy guard, and steady the party.",
    gearSummary: "Battleaxes, Maces, 2H Spears · Global Shields · Medium or Heavy Armor · Horns",
    roleSummary: "Sturdy armored defender who draws enemy focus, cracks enemy guard, and steadies the party.",
    focusAttributes: ["grit", "force"],
    focusLabel: "Grit & Force",
    startingAttributes: { ...BASE_STARTING_ATTRIBUTES },
    wounded50: "Below 50% HP: Takes less damage from all hits and holds enemy attention longer.",
    wounded25: "Below 25% HP: Takes even less damage and steps in to shield allies from heavy blows.",
    baseHp: 47,
    baseMp: 0,
    avatarPath: "assets/portraits/heroes/orin_avatar.webp",
    tokenPath: "assets/tokens/heroes/orin_hp1.webp",
  },
  {
    id: "rowan",
    name: "Rowan",
    fullName: "Rowan",
    className: "Ranger",
    shortTag: "Bows · Precision Hunter",
    worldBio:
      "Left motherless at birth, Rowan grew up on cold, bloodied border patrols under a silent father scarred by loss rather than behind castle walls. As Garrick's Portals bleed Ethoria dry and remorse over his friend Koren's death hollows Orin from within, the quiet marksman rides out into the dark wilds refusing to let his father fall alone.",
    classStyle:
      "A sharp-eyed hunter comfortable with longbows, shortbows, or backup daggers (paired with shields if needed), wearing light or reinforced medium leather with arrow quivers. Picks off priority threats with high critical precision and weakens dangerous enemies.",
    gearSummary: "Longbows, Shortbows, Daggers · Global Shields · Light or Medium Leather · Quivers",
    roleSummary: "Long-range marksman focused on high-precision critical shots and debilitating debuffs.",
    focusAttributes: ["finesse", "force"],
    focusLabel: "Finesse & Force",
    startingAttributes: { ...BASE_STARTING_ATTRIBUTES },
    wounded50: "Below 50% HP: Shots strike harder and pierce part of enemy armor.",
    wounded25: "Below 25% HP: Critical rate and precision damage surge sharply.",
    baseHp: 47,
    baseMp: 0,
    avatarPath: "assets/portraits/heroes/rowan_avatar.webp",
    tokenPath: "assets/tokens/heroes/rowan_hp1.webp",
  },
  {
    id: "mera",
    name: "Mera",
    fullName: "Mera",
    className: "Druid",
    shortTag: "Nature Magic · Thorns, Earth & Wind",
    worldBio:
      "Purchased from childhood slavery by Queen Ellowyn after her mother was sold away, Mera served as Ellowyn's loyal handmaid—and secretly wove the iron chisel and letter into Koren's bandages so the lovers could meet. Burdened by how that lifeline ended in Koren's blood and her Queen's ruin, she unleashes banned Druid nature magic across a grieving Ethoria while searching for her stolen mother.",
    classStyle:
      "A wild-magic Druid wielding quarterstaves, scimitars, or sickles—able to carry a shield alongside one-handed blades—clad in leather, widowsilk robes, or bone armor with nature crystals. Calls down earth, thorn, lightning, and mending spells as she levels.",
    gearSummary: "Quarterstaves, Scimitars, Sickles · Global Shields · Leather, Widowsilk & Bone · Crystals",
    roleSummary: "Wild nature spellcaster who entangles and bleeds foes while sustaining companions with regeneration.",
    focusAttributes: ["arcana", "finesse"],
    focusLabel: "Arcana & Finesse",
    startingAttributes: { ...BASE_STARTING_ATTRIBUTES },
    wounded50: "Below 50% HP: Nature spells hit and heal harder, and she dodges incoming blows more often.",
    wounded25: "Below 25% HP: Spell power and critical spell surge rise sharply.",
    baseHp: 47,
    baseMp: 19,
    avatarPath: "assets/portraits/heroes/mera_avatar.webp",
    tokenPath: "assets/tokens/heroes/mera_hp1.webp",
  },
  {
    id: "harlan",
    name: "Harlan",
    fullName: "Harlan",
    className: "Sage",
    shortTag: "Herbal Magic · Healer & Remedies",
    worldBio:
      "After losing his wife and daughter to a merciless plague in his youth, Harlan buried himself in Highcrown's dark undercroft—tending Koren's mangled arena wounds time and again as one of the gladiator's closest friends. Losing Koren on the sands reopened decades of sorrow; carrying healing herbs and bitter toxins into a dying Ethoria, the old apothecary vows no ally will fall unmended.",
    classStyle:
      "A supportive healer and alchemist carrying quarterstaves, maces, or daggers (plus shields with one-handed weapons) in robes or bone armor alongside field tomes. Unlocks restorative herbs, cleanses, and corrosive poison spells naturally as he levels.",
    gearSummary: "Quarterstaves, Maces, Daggers · Global Shields · Robes & Bone Armor · Tomes",
    roleSummary: "Party healer and poison caster who learns restorative spells and toxins as he levels.",
    focusAttributes: ["presence", "arcana"],
    focusLabel: "Presence & Arcana",
    startingAttributes: { ...BASE_STARTING_ATTRIBUTES },
    wounded50: "Below 50% HP: Healing spells restore more HP and leave a brief healing salve on allies.",
    wounded25: "Below 25% HP: Healing surges further and his poisons bite through resistant enemies.",
    baseHp: 47,
    baseMp: 19,
    avatarPath: "assets/portraits/heroes/harlan_avatar.webp",
    tokenPath: "assets/tokens/heroes/harlan_hp1.webp",
  },
];

export const DEFAULT_PARTY_ORDER: HeroId[] = ["valen", "ellowyn", "orin", "harlan"];

const HERO_MAP = new Map<HeroId, HeroDefinition>(HEROES.map((h) => [h.id, h]));

export function getHeroById(id: string | undefined | null): HeroDefinition {
  if (id && HERO_MAP.has(id as HeroId)) {
    return HERO_MAP.get(id as HeroId)!;
  }
  return HEROES[0];
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
