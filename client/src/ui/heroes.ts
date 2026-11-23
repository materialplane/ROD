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
  { key: "finesse", label: "Finesse", shortLabel: "FIN", hint: "Speed & Crit" },
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
      "Raised as Highcrown's proud royal heir, Valen was stripped of his title and thrown into the arena dungeons after a fatal duel exposed the truth of his blood. Freed when King Garrick abandoned the capital to unleash the Portals, he steps out seeking atonement—carrying only the scarred blade-craft the sands forced him to learn.",
    classStyle:
      "A versatile frontline fighter who wields longswords, 2H greatswords, or rapiers—paired with light or medium armor, cloaks, and any shield when fighting one-handed. Built for sharp single-target pressure and fast follow-up strikes, getting fiercer as he takes hits.",
    gearSummary: "Longswords, Greatswords, Rapiers · Global Shields · Light or Medium Armor · Cloaks",
    roleSummary: "Versatile physical fighter built around crisp single-target pressure and fast follow-up turns.",
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
      "Locked beneath Highcrown once her secret rebellion unraveled, Ellowyn no longer has to hide behind the silence of a captive queen. With the Portals torn open across Ethoria, she steps forward with arcane craft kept hidden for decades—fighting to protect her son and save the kingdom.",
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
      "Once refusing Highcrown's marriage-forbidden Lead Commander post for love, Orin only swore the rank's vow—never to love again—after his wife died giving birth to Rowan. Now the veteran stands watch beside his boy to defend Ethoria.",
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
      "Commander Orin's sharp-eyed son, raised far from castle intrigue on Ethoria's rugged borderlands. Hardened by frontier patrols rather than court walls, he refuses to stand aside while the kingdom fractures—or let his father march into the wilds alone.",
    classStyle:
      "A sharp-eyed hunter comfortable with longbows, shortbows, or backup daggers (paired with shields if needed), wearing light or reinforced medium leather with arrow quivers. Picks off priority threats with high critical precision and slows dangerous enemies before they act.",
    gearSummary: "Longbows, Shortbows, Daggers · Global Shields · Light or Medium Leather · Quivers",
    roleSummary: "Long-range marksman focused on high-precision critical shots and slowing dangerous enemies.",
    focusAttributes: ["finesse", "force"],
    focusLabel: "Finesse & Force",
    startingAttributes: { ...BASE_STARTING_ATTRIBUTES },
    wounded50: "Below 50% HP: Shots strike harder and pierce part of enemy armor.",
    wounded25: "Below 25% HP: Critical rate spikes and he acts faster in the turn order.",
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
      "Purchased out of childhood servitude and freed by Queen Ellowyn, Mera repaid that mercy with fierce loyalty—tending Highcrown's palace gardens while quietly keeping old Druid grove-lore alive under Garrick's ban. Stepping beyond the gates, she wields earth, thorn, and storm magic while searching Ethoria for the mother sold away from her years ago.",
    classStyle:
      "A wild-magic Druid wielding quarterstaves, scimitars, or sickles—able to carry a shield alongside one-handed blades—clad in leather, widowsilk robes, or bone armor with nature crystals. Calls down earth, thorn, lightning, and mending spells as she levels.",
    gearSummary: "Quarterstaves, Scimitars, Sickles · Global Shields · Leather, Widowsilk & Bone · Crystals",
    roleSummary: "Wild nature spellcaster who entangles and bleeds foes while sustaining companions with regeneration.",
    focusAttributes: ["arcana", "finesse"],
    focusLabel: "Arcana & Finesse",
    startingAttributes: { ...BASE_STARTING_ATTRIBUTES },
    wounded50: "Below 50% HP: Nature spells hit and heal harder, and she dodges incoming blows more often.",
    wounded25: "Below 25% HP: Spell power surges sharply and she acts faster in the turn order.",
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
      "After losing his wife and daughter to a merciless plague in his youth, Harlan spent decades tending battered fighters in the torch-lit infirmary beneath Highcrown's arena. Carrying pouches of remedies and bitter toxins, the elderly apothecary steps into the open world so others will not lose who they love.",
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
