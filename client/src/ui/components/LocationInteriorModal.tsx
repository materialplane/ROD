import React, { useEffect, useMemo, useState } from "react";
import { assetUrl } from "../api";
import { audioEngine } from "../audio";
import { HEROES, getHeroById } from "../heroes";
import type {
  ActiveOutpostHunt,
  ActiveQuestProgress,
  BattleConfigData,
  ChosenDisciplinesMap,
  DisciplineOption,
  EquippedGearMap,
  HeroDisciplinesEntry,
  HeroId,
  ItemEntry,
  NpcEntry,
  NpcLocationGroup,
  QuestEntry,
  ShopType,
  SpellEntry,
  TravelCatalog,
  WorldLocation,
} from "../types";
import { ShopCounterPanel, type BuyConfirmChoice } from "../shops/ShopCounterPanel";
import { TradeGoodsCounter } from "../shops/TradeGoodsCounter";
import { formatOutpostRewardLine, getGlobalActiveQuestLimit, pluralizeMonsterName } from "../quests/outpostHunts";
import { buildQuartermasterHuntDialogue, resolveOutpostHuntLore } from "../quests/outpostHuntLore";
import {
  formatQuestRewardLine,
  getHubQuestStage,
  getQuestStoryChainInfo,
  makeHuntTrackKey,
  makeQuestTrackKey,
  resolveQuestNpcStatusDialogue,
  resolveQuestObjectiveMeta,
} from "../quests/questUtils";
import { NpcQuestOfferBar, QuestCardThumb, QuestReferenceCard, type QuestReferenceStatus } from "./QuestCardThumb";
import { TavernView } from "./TavernView";

export const HIGHCROWN_ID = "loc_01_overgrown_garden_sanctuary";
export const HIGHCROWN_KEEP_ID = "loc_69_highcrown_keep";
export const TAVERN_SUFFIX = "::tavern";

export function isTavernLocationId(locId: string | null | undefined): locId is string {
  return Boolean(locId && locId.endsWith(TAVERN_SUFFIX));
}

export function getTavernParentId(locId: string): string {
  return locId.slice(0, -TAVERN_SUFFIX.length);
}

/** Fallback parent mapping when entering an internal sub-location directly. */
export const INTERNAL_LOCATION_PARENTS: Record<string, string> = {
  [HIGHCROWN_KEEP_ID]: HIGHCROWN_ID,
};

interface LocationInteriorModalProps {
  location: WorldLocation | null;
  parentLocation?: WorldLocation | null;
  worldLocations?: WorldLocation[];
  travelCatalog?: TravelCatalog | null;
  sealedPortalIds?: string[];
  npcsByLocation: Record<string, NpcLocationGroup>;
  questsByKey: Record<string, QuestEntry>;
  partyOrder: HeroId[];
  partyLevel: number;
  heroLevels?: Partial<Record<HeroId, number>>;
  acceptedQuestIds: string[];
  completedQuestIds?: string[];
  questProgressById?: Record<string, ActiveQuestProgress>;
  trackedQuestKeys?: string[];
  activeOutpostHunts?: ActiveOutpostHunt[];
  outpostOffer?: ActiveOutpostHunt | null;
  battleConfig?: BattleConfigData | null;
  silver: number;
  items: ItemEntry[];
  itemsById: Record<string, ItemEntry>;
  spells: SpellEntry[];
  equippedByHero: EquippedGearMap;
  learnedSpellIds: string[];
  tradeGoodCounts: Record<string, number>;
  bagCounts?: Record<string, number>;
  disciplinesByHero?: Partial<Record<HeroId, HeroDisciplinesEntry>>;
  chosenDisciplinesByHero?: ChosenDisciplinesMap;
  onSelectDiscipline?: (heroId: HeroId, tierLevel: number, opt: DisciplineOption, silverCost: number) => void;
  onBuyShopEntry: (choice: BuyConfirmChoice) => void;
  onSellAllTradeGoods: () => void;
  onAcceptQuest: (quest: QuestEntry) => void;
  onCompleteQuest?: (quest: QuestEntry) => void;
  onEnterDungeon?: (quest: QuestEntry) => void;
  onToggleTrackQuest?: (trackKey: string) => void;
  onOpenJournal?: (focusTrackKey?: string) => void;
  onAcceptOutpostHunt?: (hunt: ActiveOutpostHunt) => void;
  onCompleteOutpostHunt?: (outpostId: string) => void;
  onAbandonOutpostHunt?: (outpostId: string) => void;
  onFreeRest: (hubName: string) => void;
  onSailToPort?: (destPort: WorldLocation) => void;
  onEnterPortal?: (portalLoc: WorldLocation) => void;
  onOpenParty: () => void;
  onEnterLocationById: (locationId: string) => void;
  onReturnToParent?: () => void;
  onClose: () => void;
}

interface ResolvedNpc {
  id: string;
  displayName: string;
  displayRole: string;
  portraitPath: string;
  category: string;
  shopType?: ShopType;
  shopLabel?: string;
  services: string[];
  quest: QuestEntry | null;
  dialogue: string;
}

interface ServicePanelSpec {
  id: "rest" | "tavern" | "armory" | "mystic" | "arena" | "port" | "keep" | "return_parent";
  title: string;
  subtitle: string;
  accent: "emerald" | "amber" | "violet" | "crimson" | "cyan" | "gold";
  summary: string;
  highlights: string[];
}

/** Strip internal step/tier/chain tags from NPC roles so players only see grounded medieval titles. */
export function sanitizeRoleTitle(raw: string): string {
  const clean = raw
    .replace(/\(\s*(?:Remaining\s+)?Tier[-\s]*\d+(?:\s+Skills)?\s*\)/gi, "")
    .replace(/\(\s*Steps?\s*\d+(?:\s*[–-]\s*\d+)?(?:\s*\([^)]*\))?\s*\)/gi, "")
    .replace(/\(\s*Unlocked Post-Liberation\s*\)/gi, "")
    .replace(/\(\s*Chain\s+[A-Z]\d+[^)]*\)/gi, "")
    .replace(/\(\s*Outer Bailey Vanguard\s*\)/gi, "")
    .replace(/\(\s*Leads to Portal[^)]*\)/gi, "")
    .replace(/\(\s*Manifest Lead\s*\)/gi, "")
    .replace(/\(\s*Koren's Transfer Order\s*\)/gi, "")
    .replace(/\(\s*Inscribed Stone Tablet\s*\)/gi, "")
    .replace(/\bSanctuary\s+Apothecary\s*&\s*Caster\s+Outfitter\b/gi, "Sanctuary Apothecary & Outfitter")
    .replace(/\bApothecary\s*&\s*Caster\s+Outfitter\b/gi, "Apothecary & Outfitter")
    .replace(/\bZone\s+\d+\s+Hunt\s+Quartermaster\b/gi, "Hunt Quartermaster")
    .replace(/\bLocal Hub Quest\b/gi, "Town Request")
    .replace(/\s+\(\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return clean || "Resident";
}

function sanitizeServiceLabel(raw: string): string {
  return raw
    .replace(/\(\s*Step[s]?\s*\d+(?:\s*[–-]\s*\d+)?\s*\)/gi, "")
    .replace(/\(\s*(?:Remaining\s+)?Tier[-\s]*\d+(?:\s+Skills)?\s*\)/gi, "")
    .replace(/\bFree Full Party Rest\s*\(0s\)/gi, "Rest at the Inn")
    .replace(/\bFree Royal Keep Rest\s*\(0s\)/gi, "Keep Quarters")
    .replace(/\bStarter Gear Replacements\b/gi, "Provisions & Travel Gear")
    .replace(/\bSanctuary\s+Apothecary\s*&\s*Caster\s+Outfitter\b/gi, "Potions & Caster Accessories")
    .replace(/\bApothecary\s*&\s*Caster\s+Outfitter\b/gi, "Apothecary & Caster Goods")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function formatRewardLine(raw: string): string {
  return formatQuestRewardLine(raw);
}

function buildDefenderDialogue(heroId: HeroId, partnerName: string, partyOrder: HeroId[]): string {
  const leaderName = getHeroById(partyOrder[0]).name;
  switch (heroId) {
    case "valen":
      return `Good to see you back inside Highcrown Keep, ${leaderName}. ${partnerName} and I have the inner gates locked down tight—catch your breath by the fire before heading back out.`;
    case "ellowyn":
      return `The Keep wards are holding steady, ${leaderName}. ${partnerName} keeps the yard secure while I sift through the old royal archives for whatever Garrick concealed before fleeing.`;
    case "orin":
      return `Glad to see all four of you back behind stone walls, ${leaderName}. ${partnerName} and I have drilled every loyal guard in the Keep—nothing touches this seat on our watch.`;
    case "rowan":
      return `Northern approaches have stayed quiet since dusk, ${leaderName}. ${partnerName} holds the council floor while my scouts keep clear sightlines past the outer ridge.`;
    case "mera":
      return `Even the old oaks and wind-currents beyond Highcrown's walls carry warning when anything unnatural draws near, ${leaderName}. Rest by the hearth—${partnerName} and I have the Keep wrapped in thorns and steel.`;
    case "harlan":
      return `You look ready for dry boots and a warm table, ${leaderName}. ${partnerName} and I have stocked the Keep infirmary and held the inner hall since you rode out.`;
  }
}

function buildNpcDialogue(npc: NpcEntry, role: string, locName: string, quest: QuestEntry | null, hasOrinInParty: boolean): string {
  if (npc.id === "npc_loc_01_overgrown_garden_sanctuary_orin_capital_guard" && !hasOrinInParty && quest) {
    return `${quest.description} I can spare guards at the upper stair, but we need proven hands below before those hounds spread.`;
  }
  if (quest) {
    return quest.description;
  }

  const r = role.toLowerCase();
  if (r.includes("captain") || r.includes("vessel")) {
    return `Our hull is provisioned and the crew stands ready along ${locName}'s quay. Check the Sea Voyages manifest whenever your party is prepared to sail across Ethoria's waters.`;
  }
  if (r.includes("inn") || r.includes("rest")) {
    return locName.toLowerCase().includes("port")
      ? `Step off the salt pier and catch your breath at ${locName}. Fresh supplies, warm bunks, and fair Trade Goods appraisal wait beside the docks.`
      : `Step away from the road and warm yourselves by the hearth. Any ally passing through ${locName} is welcome to rest beneath this roof.`;
  }
  if (r.includes("chamberlain")) {
    return `Welcome back within the Council Hall of Highcrown Keep. Dispatches are current, quiet quarters await upstairs, and your fellow defenders stand ready at your call.`;
  }
  if (r.includes("quartermaster")) {
    return `Field rations, bandages, and spare steel are stacked and counted for patrols riding out of ${locName}. Speak whenever your satchels run light.`;
  }
  if (r.includes("armorer") || r.includes("smith") || r.includes("forgemaster") || r.includes("provisions")) {
    return `Sharp edges and sound armor keep four companions alive longer than luck ever will. Bring any trade goods you haul back from the wilds for fair Silver trade.`;
  }
  if (r.includes("mystic") || r.includes("outfitter") || r.includes("apothecary") || r.includes("scholar")) {
    return `Fresh potions, curative brews, and well-crafted caster accessories turn grim fights around faster than brute strength alone. Look over our shelves whenever your packs run light.`;
  }
  if (r.includes("arena") || r.includes("pit-master")) {
    return `Think your four companions hold together under pressure? Step into the ${locName} fighting grounds to test your steel and claim local purses.`;
  }
  if (r.includes("steward")) {
    return `${locName} stands calmer now that loyal watchmen walk these arches again. Rest as long as your company needs and take whatever comfort the garrison holds.`;
  }
  return `Keep close watch once you step back past ${locName}'s walls—between bandits on the roads and wild monsters prowling the outlands, every mile earns its toll.`;
}

export function buildKeepMeta(highcrown: WorldLocation | null): WorldLocation {
  return {
    id: HIGHCROWN_KEEP_ID,
    name: "Highcrown Keep",
    zoneNum: 1,
    gearTiers: [1],
    spellTier: 1,
    levelRange: "Lv 1–5",
    category: "permanent",
    locationType: "Royal Keep",
    playerKind: "Royal Seat",
    playerRegion: highcrown?.playerRegion ?? "The Crownlands",
    playerDescription:
      "The vaulted Council Hall of Highcrown where your two remaining companions hold the royal garrison steady while you march across Ethoria.",
    playerServices: ["Royal Keep", "Inn", "Armory & Provisions"],
    factionId: highcrown?.factionId ?? "crown_loyalists",
    factionName: highcrown?.factionName ?? "Highcrown Loyalists",
    factionPrimaryColor: highcrown?.factionPrimaryColor,
    factionSecondaryColor: highcrown?.factionSecondaryColor,
    bannerAssetPath: highcrown?.bannerAssetPath,
    mapId: "map_01",
    kind: "Royal Keep",
    assetPath: highcrown?.assetPath ?? "assets/tokens/markers/loc_01_overgrown_garden_sanctuary.webp",
    interiorAssetPath: "assets/maps/interiors/loc_69_highcrown_keep.webp",
    placed: false,
    x: null,
    y: null,
  };
}

export function buildTavernMeta(parent: WorldLocation): WorldLocation {
  const title = parent.tavernName ?? `${parent.name} Tavern`;
  return {
    id: `${parent.id}${TAVERN_SUFFIX}`,
    name: title,
    category: "tavern",
    locationType: "Tavern",
    playerKind: `${parent.name} Tavern`,
    playerRegion: parent.playerRegion,
    playerDescription: `Step inside ${title} in ${parent.name} for warm hearth fire, free full-party rest, and live continent ballads sung by Ethoria's traveling minstrels.`,
    playerServices: ["Inn", "Tavern Ballads"],
    factionId: parent.factionId,
    factionName: parent.factionName,
    factionPrimaryColor: parent.factionPrimaryColor,
    factionSecondaryColor: parent.factionSecondaryColor,
    bannerAssetPath: parent.bannerAssetPath,
    mapId: parent.mapId,
    kind: "Tavern",
    assetPath: parent.assetPath,
    interiorAssetPath: parent.tavernAssetPath,
    placed: false,
    x: null,
    y: null,
  };
}

function buildHubServices(loc: WorldLocation, parentLocation?: WorldLocation | null): ServicePanelSpec[] {
  const tags = (loc.playerServices ?? []).map((s) => s.toLowerCase());
  const out: ServicePanelSpec[] = [];
  const insideTavern = isTavernLocationId(loc.id);

  if (tags.some((t) => t.includes("inn") || t.includes("rest") || t.includes("barracks") || t.includes("camp"))) {
    const isBarracks = tags.some((t) => t.includes("barracks"));
    out.push({
      id: "rest",
      title: isBarracks ? "Rest at Barracks" : insideTavern ? "Rest by Hearth" : "Rest at the Inn",
      subtitle: "Restore full party HP, MP & clear ailments",
      accent: "emerald",
      summary: `Warm quarters and hearth-fires inside ${loc.name} are always ready whenever your company needs to recover.`,
      highlights: ["Full HP & MP recovery for all 4 heroes", "Removes road fatigue and status ailments", "Saves campaign progress automatically"],
    });
  }
  if (!insideTavern && loc.tavernAssetPath) {
    out.push({
      id: "tavern",
      title: "Enter Tavern",
      subtitle: loc.tavernName ?? `Step inside ${loc.name}'s local tavern`,
      accent: "gold",
      summary: `Step inside ${loc.tavernName ?? `${loc.name}'s tavern`} to warm up by the hearth, speak with the innkeeper, and listen to regional minstrel ballads.`,
      highlights: ["Free full party rest at the hearth", "Continent-unique Season 1 bard ballads", "Meet the local innkeeper & traveling bards"],
    });
  }
  if (tags.some((t) => t.includes("armory") || t.includes("provisions"))) {
    out.push({
      id: "armory",
      title: "Armory & Provisions",
      subtitle: "Weapons, helmets, body armor, shields, accessories & potions",
      accent: "amber",
      summary: `${loc.name}'s smiths and quartermasters outfit regional patrols with forged weapons, helmets, body armor, shields, class accessories, and potions.`,
      highlights: ["Equipment comparison for all 4 heroes", "Buy Healing & Cure Potions", "Sell Trade Goods for Silver"],
    });
  }
  if (tags.some((t) => t.includes("mystic") || t.includes("herbal"))) {
    out.push({
      id: "mystic",
      title: "Apothecary & Caster Goods",
      subtitle: "Healing, Mana, Revival & Cure Potions",
      accent: "violet",
      summary: `${loc.name}'s apothecaries and archivists stock healing, mana, revival, and status-cure potions alongside region-appropriate caster accessories.`,
      highlights: ["Stock Healing, Mana & Revival Potions", "Buy Poison, Burn, Chill & Panacea Cures", "Sell Trade Goods for Silver"],
    });
  }
  if (tags.some((t) => t.includes("arena"))) {
    out.push({
      id: "arena",
      title: "Fighting Arena",
      subtitle: "Regional bouts & Silver purses",
      accent: "crimson",
      summary: `Challenge ${loc.name}'s seasoned fighters in sanctioned arena bouts to sharpen your party and win Silver prizes.`,
      highlights: ["4-hero turn-based exhibition bouts", "Test elemental & weapon weaknesses safely", "Earn Silver rewards from ranked matches"],
    });
  }
  if (tags.some((t) => t.includes("ship") || t.includes("sea") || t.includes("voyage"))) {
    out.push({
      id: "port",
      title: "Ship Port",
      subtitle: "Sea lanes across Ethoria's coastlines",
      accent: "cyan",
      summary: `Charter seafaring merchant vessels linking ${loc.name} to distant coastal harbors once regional Portals fall.`,
      highlights: ["Direct sea travel between charted continent harbors", "Unlocks deep-sea lanes when local Portals are sealed", "Auto-saves cleanly upon safe harbor arrival"],
    });
  }
  if (loc.id === HIGHCROWN_ID) {
    out.push({
      id: "keep",
      title: "Enter Highcrown Keep",
      subtitle: "Visit your 2 Keep Defenders inside",
      accent: "gold",
      summary: "Step inside Highcrown Keep's vaulted Council Hall to check in with the two companions holding the capital.",
      highlights: ["Speak with your 2 Keep Defenders", "Meet Chamberlain Eirik Dale & Quartermaster Freya"],
    });
  }
  if (parentLocation) {
    out.push({
      id: "return_parent",
      title: `← Return to ${parentLocation.name}`,
      subtitle: `Step back out into ${parentLocation.name}`,
      accent: "gold",
      summary: `Step back through the main archway into ${parentLocation.name}.`,
      highlights: [`Return directly to ${parentLocation.name}`],
    });
  }

  return out;
}

export const CornerFiligree: React.FC<{ size?: "sm" | "md" }> = ({ size = "md" }) => {
  const dim = size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3";
  return (
    <>
      <span className={`absolute -top-[1px] -left-[1px] ${dim} border-t-2 border-l-2 border-[#e0ba6c] pointer-events-none`} />
      <span className={`absolute -top-[1px] -right-[1px] ${dim} border-t-2 border-r-2 border-[#e0ba6c] pointer-events-none`} />
      <span className={`absolute -bottom-[1px] -left-[1px] ${dim} border-b-2 border-l-2 border-[#e0ba6c] pointer-events-none`} />
      <span className={`absolute -bottom-[1px] -right-[1px] ${dim} border-b-2 border-r-2 border-[#e0ba6c] pointer-events-none`} />
    </>
  );
};

function inferNpcServiceId(role: string): Exclude<ServicePanelSpec["id"], "keep" | "tavern" | "return_parent"> | null {
  const r = role.toLowerCase();
  if (r.includes("inn") || r.includes("rest") || r.includes("steward") || r.includes("chamberlain")) return "rest";
  if (r.includes("armorer") || r.includes("smith") || r.includes("forgemaster") || r.includes("quartermaster")) return "armory";
  if (r.includes("mystic") || r.includes("tome") || r.includes("archive") || r.includes("apothecary") || r.includes("scholar")) return "mystic";
  if (r.includes("arena") || r.includes("pit-master")) return "arena";
  if (r.includes("captain") || r.includes("vessel") || r.includes("shipping") || r.includes("sailor") || r.includes("ferry") || r.includes("dock")) return "port";
  return null;
}

export const LocationInteriorModal: React.FC<LocationInteriorModalProps> = ({
  location,
  parentLocation = null,
  worldLocations = [],
  travelCatalog = null,
  sealedPortalIds = [],
  npcsByLocation,
  questsByKey,
  partyOrder,
  partyLevel,
  heroLevels,
  acceptedQuestIds,
  completedQuestIds = [],
  questProgressById = {},
  trackedQuestKeys = [],
  activeOutpostHunts = [],
  outpostOffer = null,
  battleConfig = null,
  silver,
  items,
  itemsById,
  spells,
  equippedByHero,
  learnedSpellIds,
  tradeGoodCounts,
  bagCounts = {},
  disciplinesByHero,
  chosenDisciplinesByHero,
  onSelectDiscipline,
  onBuyShopEntry,
  onSellAllTradeGoods,
  onAcceptQuest,
  onCompleteQuest,
  onEnterDungeon,
  onToggleTrackQuest,
  onOpenJournal,
  onAcceptOutpostHunt,
  onCompleteOutpostHunt,
  onAbandonOutpostHunt,
  onFreeRest,
  onSailToPort,
  onEnterPortal,
  onOpenParty,
  onEnterLocationById,
  onReturnToParent,
  onClose,
}) => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [activeService, setActiveService] = useState<ServicePanelSpec | null>(null);
  const [openShopNpcId, setOpenShopNpcId] = useState<string | null>(null);
  const [harborShopMode, setHarborShopMode] = useState<"trade_goods" | "arcanist" | null>(null);
  const [showLore, setShowLore] = useState(false);

  const isTavern = isTavernLocationId(location?.id);
  const isOutpostLocation = Boolean(location?.id.startsWith("outpost_"));

  const resolvedNpcs = useMemo<ResolvedNpc[]>(() => {
    if (!location || isTavern) return [];
    const basePortId = location.id.replace(/_south$/, "");
    const group = npcsByLocation[location.id] ?? npcsByLocation[basePortId];
    const hasOrin = partyOrder.includes("orin");
    const keepDefenders = HEROES.filter((h) => !partyOrder.includes(h.id));
    const list: ResolvedNpc[] = [];

    for (const npc of group?.npcs ?? []) {
      if (npc.id === "npc_keep_69_defenders") {
        keepDefenders.forEach((hero, dIdx) => {
          const partner = keepDefenders[(dIdx + 1) % Math.max(1, keepDefenders.length)];
          list.push({
            id: `keep_defender_${hero.id}`,
            displayName: hero.fullName,
            displayRole: `Holding Highcrown Keep · ${hero.className}`,
            portraitPath: hero.avatarPath,
            category: "story_homefront",
            services: ["Home-Front Keep Council"],
            quest: null,
            dialogue: buildDefenderDialogue(hero.id, partner ? partner.name : "our garrison", partyOrder),
          });
        });
        continue;
      }

      let displayName = npc.name;
      let displayRole = sanitizeRoleTitle(npc.roleTitle);
      let portraitPath = npc.portraitPath ?? "assets/portraits/heroes/valen_avatar.webp";

      if (npc.id === "npc_loc_01_overgrown_garden_sanctuary_orin_capital_guard") {
        if (hasOrin) {
          displayName = "Sgt. Marcus Locke";
          displayRole = "Capital Watch Sergeant";
        } else {
          displayName = "Commander Orin";
          displayRole = "Highcrown Vanguard Lead";
          portraitPath = getHeroById("orin").avatarPath;
        }
      }

      const firstQuestTitle = npc.questsOffered?.[0];
      const matchedQuest = firstQuestTitle
        ? questsByKey[`${location.id}::${firstQuestTitle}`] ?? questsByKey[firstQuestTitle] ?? null
        : null;

      const services = (npc.servicesOffered ?? [])
        .map(sanitizeServiceLabel)
        .filter((s) => s && !/^Local Hub Quest$/i.test(s));

      list.push({
        id: npc.id,
        displayName,
        displayRole,
        portraitPath,
        category: npc.category,
        shopType: npc.shopType,
        shopLabel: npc.shopLabel,
        services,
        quest: matchedQuest,
        dialogue: buildNpcDialogue(npc, displayRole, location.name, matchedQuest, hasOrin),
      });
    }

    return list;
  }, [location, isTavern, npcsByLocation, questsByKey, partyOrder]);

  const hubServices = useMemo(() => (location ? buildHubServices(location, parentLocation) : []), [location, parentLocation]);

  useEffect(() => {
    setSelectedIdx(0);
    setActiveService(null);
    setOpenShopNpcId(null);
    setHarborShopMode(null);
    setShowLore(false);
  }, [location?.id]);

  const stepNpc = (delta: number) => {
    if (resolvedNpcs.length === 0) return;
    audioEngine.playUiClick(0.24);
    setActiveService(null);
    setOpenShopNpcId(null);
    setHarborShopMode(null);
    setShowLore(false);
    setSelectedIdx((i) => (i + delta + resolvedNpcs.length) % resolvedNpcs.length);
  };

  useEffect(() => {
    if (!location || isTavern) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (resolvedNpcs.length === 0) return;
      if (e.code === "ArrowDown" || e.code === "ArrowRight") {
        e.preventDefault();
        stepNpc(1);
      } else if (e.code === "ArrowUp" || e.code === "ArrowLeft") {
        e.preventDefault();
        stepNpc(-1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [location, isTavern, resolvedNpcs.length]);

  const isClosedFerry = Boolean(location?.id.startsWith("tr_ferry_crossing"));
  const isClosedPass = Boolean(location?.id.startsWith("tr_border_mountain_pass_gate"));
  const isSeaPort = Boolean(location?.id.startsWith("tr_port_map"));
  const seaGate = isSeaPort && location ? travelCatalog?.outboundSeaPortalGates?.[location.mapId] : undefined;
  const seaOpen = !seaGate || sealedPortalIds.includes(seaGate.portalId);
  const isClosedSeaPort = Boolean(isSeaPort && !seaOpen);
  const isPortalLoc = Boolean(location && (location.isPortal || location.category === "portal"));
  const isPortalSealed = Boolean(isPortalLoc && location && sealedPortalIds.includes(location.id));

  const resolvedInteriorPath = (() => {
    if (!location) return null;
    if (isPortalLoc) {
      return isPortalSealed
        ? `assets/maps/portals/${location.id}_sealed.webp`
        : `assets/maps/portals/${location.id}.webp`;
    }
    if (isClosedFerry) {
      const mapToken = /^map_0[1-4]$/.test(location.mapId) ? location.mapId.replace("_", "") : "map01";
      return `assets/maps/interiors/tr_ferry_${mapToken}_closed.webp`;
    }
    if (isClosedPass) {
      return "assets/maps/interiors/tr_pass_map04_closed.webp";
    }
    if (isSeaPort && location.interiorAssetPath) {
      return seaOpen ? location.interiorAssetPath.replace(/\.webp$/, "_open.webp") : location.interiorAssetPath;
    }
    return location.interiorAssetPath ?? null;
  })();

  if (!location || !resolvedInteriorPath) return null;

  const acceptedSet = new Set(acceptedQuestIds);
  const completedSet = new Set(completedQuestIds);

  const resolvePortalQuestMeta = (portal: WorldLocation | undefined | null) => {
    const c = portal?.catalyst;
    if (!c?.questId) return null;
    const entry =
      questsByKey[c.questId] ??
      (c.questTitle ? questsByKey[c.questTitle] : undefined) ??
      null;
    const done = completedSet.has(c.questId);
    const active = acceptedSet.has(c.questId);
    const status: QuestReferenceStatus = done ? "completed" : active ? "active" : "required";
    return {
      questId: c.questId,
      questTitle: c.questTitle || entry?.title || "Catalyst Quest",
      hubName: c.hubName || entry?.hubName || "Ethoria",
      catalystName: c.name,
      giver: entry?.giver ?? null,
      category: entry?.category ?? null,
      reward: entry?.reward ? formatRewardLine(entry.reward) : null,
      description: entry?.description ?? null,
      fallbackPath: entry?.assetPath,
      done,
      active,
      status,
    };
  };

  if (isPortalLoc || isClosedFerry || isClosedPass || isClosedSeaPort) {
    const gate = isPortalLoc
      ? undefined
      : isClosedFerry
        ? travelCatalog?.ferryPortalGates?.[location.mapId]
        : isClosedPass
          ? travelCatalog?.mountainPassPortalGates?.[location.mapId]
          : seaGate;

    const gatePortalLoc = isPortalLoc
      ? location
      : gate
        ? worldLocations.find((w) => w.id === gate.portalId)
        : undefined;
    const questMeta = resolvePortalQuestMeta(gatePortalLoc);

    const cat = isPortalLoc ? location.catalyst : gatePortalLoc?.catalyst;
    const catalystName = cat?.name ?? "Regional Portal Catalyst";
    const catalystItem = items.find(
      (it) =>
        it.category === "key_item" &&
        (it.name.toLowerCase() === catalystName.toLowerCase() ||
          (cat?.keyId && it.id.toLowerCase().includes(cat.keyId.replace(/^cat_/, ""))))
    );
    const hasCatalystItem = Boolean(catalystItem && (bagCounts[catalystItem.id] ?? 0) > 0);
    const hasCatalystQuest = Boolean(cat?.questId && completedSet.has(cat.questId));
    const hasCatalyst = hasCatalystItem || hasCatalystQuest;

    const portalMarkerImg = isPortalLoc
      ? isPortalSealed
        ? location.assetPath.replace(/\.webp$/, "_closed.webp")
        : location.assetPath
      : gatePortalLoc?.assetPath ?? location.assetPath;

    const reopenedNotes: string[] = [];
    if (isPortalLoc) {
      if (travelCatalog?.ferryPortalGates?.[location.mapId]?.portalId === location.id) {
        reopenedNotes.push("Inland Ferry Crossings reopened across this continent");
      }
      if (travelCatalog?.outboundSeaPortalGates?.[location.mapId]?.portalId === location.id) {
        reopenedNotes.push("Sea-Port Harbor ships cleared for outbound voyages");
      }
      if (travelCatalog?.mountainPassPortalGates?.[location.mapId]?.portalId === location.id) {
        reopenedNotes.push("Border Mountain Passes unbarred into the Dreadwaste");
      }
    }

    const portalDisplayName = gate?.portalName ?? gatePortalLoc?.name ?? "the nearby Portal";
    const headerBadge = isPortalLoc
      ? {
          label: isPortalSealed ? "Sealed Monument" : "Active Rift",
          cls: isPortalSealed
            ? "border-[#4aa376] bg-[#132c20]/90 text-[#97f0be]"
            : "border-[#b84b4b] bg-[#2c1115]/90 text-[#fca5a5]",
        }
      : {
          label: isClosedFerry
            ? "Ferry Crossing Closed"
            : isClosedPass
              ? "Mountain Pass Barred"
              : "Harbor Closed",
          cls: "border-[#c48332] bg-[#2a1b0b]/90 text-[#ffd58c]",
        };

    const showCompletedSeal = isPortalLoc ? isPortalSealed || hasCatalyst : Boolean(questMeta?.done);
    const showcaseCardId =
      isPortalLoc && isPortalSealed
        ? questMeta?.questId ?? "quest_complete_royal_seal"
        : questMeta?.questId ?? "quest_portal_catalyst_seal";
    const showcaseFallback = questMeta?.fallbackPath ?? portalMarkerImg;

    const frameGradient =
      isPortalLoc && isPortalSealed
        ? "bg-gradient-to-b from-[#a7f3d0] via-[#4aa376] to-[#163827]"
        : hasCatalyst && isPortalLoc
          ? "bg-gradient-to-b from-[#fde68a] via-[#4eb987] to-[#1b4a34]"
          : "bg-gradient-to-b from-[#ffe7ad] via-[#c79948] to-[#563d18]";

    const cornerMedallionSrc = isPortalLoc
      ? catalystItem?.iconPath ?? portalMarkerImg
      : gatePortalLoc?.assetPath;

    const panelEyebrow = isPortalLoc
      ? isPortalSealed
        ? `Portal Sealed · ${sealedPortalIds.length} of 8 Realms Reclaimed`
        : hasCatalyst
          ? `${location.bossInfo?.plane ?? "Dimensional Realm Threshold"} · Ready to Unseal`
          : `Complete Quest First · ${questMeta?.hubName ?? "Ethoria"}`
      : questMeta?.done
        ? `Catalyst Earned · Portal Blocking Route`
        : `Required Quest · ${questMeta?.hubName ?? "Ethoria"}`;

    const panelTitle = isPortalLoc
      ? isPortalSealed
        ? `${location.bossInfo?.boss ?? "Guardian"} Defeated`
        : hasCatalyst
          ? `${location.name} Threshold`
          : questMeta?.questTitle ?? `${location.name} Threshold`
      : !questMeta?.done && questMeta?.questTitle
        ? questMeta.questTitle
        : isClosedFerry
          ? `Destroy ${portalDisplayName} to Sail`
          : isClosedPass
            ? `Destroy ${portalDisplayName} to Unbar Gates`
            : `Destroy ${portalDisplayName} to Reopen Harbor`;

    const panelBody = isPortalLoc
      ? location.playerDescription ?? location.description
      : isClosedFerry
        ? `Empty moorings creak along the timber pier—no boatman dares cross these waters while ${portalDisplayName} still threatens the realm.`
        : isClosedPass
          ? `Massive iron-bound fortress doors seal the mountain road while ${portalDisplayName} holds sway over the north.`
          : `Empty timber piers stretch into quiet waters—no ocean captain dares weigh anchor while ${portalDisplayName} still churns off the coast.`;

    const statusPill = isPortalLoc
      ? isPortalSealed
        ? { label: "★ Rift Sealed", cls: "border-[#4aa376] bg-[#132c20] text-[#97f0be]" }
        : hasCatalyst
          ? { label: `✓ ${catalystName} Ready`, cls: "border-[#4eb987] bg-[#143124] text-[#b4f5d2]" }
          : questMeta?.active
            ? { label: "In Journal", cls: "border-[#3c785b] bg-[#142920] text-[#91e3b8]" }
            : { label: "Quest Needed First", cls: "border-[#c48332] bg-[#2c1c0b] text-[#ffd48a]" }
      : questMeta?.done
        ? { label: "★ Catalyst Quest Done", cls: "border-[#96783b] bg-[#2a2214] text-[#f5d88f]" }
        : questMeta?.active
          ? { label: "In Journal", cls: "border-[#3c785b] bg-[#142920] text-[#91e3b8]" }
          : { label: "Quest Needed First", cls: "border-[#c48332] bg-[#2c1c0b] text-[#ffd48a]" };

    const harborShopNpc = isClosedSeaPort
      ? resolvedNpcs.find((n) => n.services.some((s) => /field supplies|trade goods/i.test(s))) ?? resolvedNpcs[0] ?? null
      : null;

    return (
      <div
        className="fixed inset-0 z-[25] bg-[#05060a] flex flex-col justify-between overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label={location.name}
      >
        <img
          src={assetUrl(resolvedInteriorPath)}
          alt={location.name}
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: [
              "linear-gradient(180deg, rgba(5,7,12,0.74) 0%, rgba(5,7,12,0.12) 15%, rgba(5,7,12,0.04) 44%, rgba(6,8,14,0.72) 70%, rgba(4,6,10,0.95) 100%)",
              "linear-gradient(90deg, rgba(5,7,12,0.52) 0%, rgba(5,7,12,0.14) 30%, rgba(5,7,12,0) 56%)",
            ].join(", "),
          }}
        />

        {/* Top Canopy Header Matching Town Interiors */}
        <header className="relative z-[2] w-full max-w-[1680px] mx-auto px-5 md:px-8 pt-4 md:pt-5 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0 drop-shadow-[0_3px_12px_rgba(0,0,0,0.9)]">
            {location.bannerAssetPath ? (
              <img
                src={assetUrl(location.bannerAssetPath)}
                alt=""
                className="w-[38px] h-[52px] object-contain shrink-0 drop-shadow-[0_6px_14px_rgba(0,0,0,0.9)]"
                draggable={false}
              />
            ) : (
              <img
                src={assetUrl(isPortalLoc ? portalMarkerImg : location.assetPath)}
                alt=""
                className="w-[46px] h-[46px] object-contain shrink-0 drop-shadow-[0_6px_14px_rgba(0,0,0,0.9)]"
                draggable={false}
              />
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-display m-0 text-[22px] md:text-[28px] font-bold tracking-[0.04em] text-[#fae4b0] leading-none truncate">
                  {location.name}
                </h1>
                <span
                  className={[
                    "px-2.5 py-0.5 rounded-sm border text-[11px] font-bold tracking-wider uppercase shrink-0",
                    headerBadge.cls,
                  ].join(" ")}
                >
                  {headerBadge.label}
                </span>
              </div>
              <div className="text-[11.5px] uppercase tracking-[0.14em] text-[#c7d3e6] mt-1 truncate">
                {location.playerKind ?? headerBadge.label}
                {location.playerRegion ? ` · ${location.playerRegion}` : ""}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {isClosedSeaPort && (
              <div className="px-3 py-1.5 rounded border border-[#7d653c]/90 bg-[#0e121b]/90 text-[#ffe49e] text-[12px] font-bold shadow-lg">
                Silver: {silver.toLocaleString()}s
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                audioEngine.playUiClick();
                onOpenParty();
              }}
              className="flex items-center gap-2.5 rounded border border-[#4a5266]/90 hover:border-[#c8a35a] bg-[#0e121b]/88 hover:bg-[#171d2b]/95 backdrop-blur-sm px-3 py-1.5 cursor-pointer transition-colors shadow-lg"
              title="Open Party & Equipment (P)"
            >
              <div className="flex items-center -space-x-1.5">
                {partyOrder.map((hid) => {
                  const hero = getHeroById(hid);
                  return (
                    <img
                      key={hid}
                      src={assetUrl(hero.avatarPath)}
                      alt={hero.name}
                      draggable={false}
                      className="w-[26px] h-[26px] rounded-full object-cover border border-[#8e7445]"
                    />
                  );
                })}
              </div>
              <div className="text-left">
                <div className="text-[11px] font-bold text-[#f2dba6] leading-tight">Party · Lv {partyLevel}</div>
                <div className="text-[10px] text-[#9aa8be] leading-tight">Open (P)</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                audioEngine.playSfx("ui_close", 0.28);
                onClose();
              }}
              className="px-4 py-2 rounded border border-[#7c653e] hover:border-[#e5c174] bg-[#10141e]/90 hover:bg-[#1b2232] text-[#efe0bc] hover:text-[#fff4d2] text-[12px] font-semibold tracking-wider uppercase cursor-pointer transition-colors shadow-lg backdrop-blur-sm"
            >
              Step Back (Esc)
            </button>
          </div>
        </header>

        {/* Bottom Heroic Showcase Band Matching Town Interiors */}
        <div className="relative z-[2] w-full max-w-[1260px] mx-auto px-5 md:px-8 pb-5 md:pb-6">
          <div className="ledger-panel relative w-full rounded-[4px] flex flex-col">
            <CornerFiligree />

            {isClosedSeaPort && harborShopMode && harborShopNpc ? (
              <div className="p-3 md:p-3.5 flex flex-col items-stretch h-[78vh] min-h-[500px] max-h-[740px]">
                {harborShopMode === "trade_goods" ? (
                  <TradeGoodsCounter
                    npc={{
                      id: harborShopNpc.id,
                      name: harborShopNpc.displayName,
                      roleTitle: harborShopNpc.displayRole,
                      category: harborShopNpc.category,
                      portraitPath: harborShopNpc.portraitPath,
                    }}
                    tradeGoodCounts={tradeGoodCounts}
                    itemsById={itemsById}
                    onSellAll={onSellAllTradeGoods}
                    onReturnDialogue={() => setHarborShopMode(null)}
                  />
                ) : (
                  <ShopCounterPanel
                    hub={
                      location.region == null && location.zoneNum == null
                        ? {
                            ...location,
                            zoneNum: location.mapId === "map_02" ? 6 : location.mapId === "map_03" ? 11 : location.mapId === "map_04" ? 16 : 3,
                            spellTier: location.mapId === "map_02" ? 3 : location.mapId === "map_03" ? 5 : location.mapId === "map_04" ? 7 : 1,
                            region: location.mapId === "map_02" ? 3 : location.mapId === "map_03" ? 5 : location.mapId === "map_04" ? 7 : 1,
                          }
                        : location
                    }
                    npc={{
                      id: harborShopNpc.id,
                      name: harborShopNpc.displayName,
                      roleTitle: harborShopNpc.displayRole,
                      category: harborShopNpc.category,
                      portraitPath: harborShopNpc.portraitPath,
                      shopType: "arcanist",
                      shopLabel: "Harbor Field Supplies",
                    }}
                    shopType="arcanist"
                    townShopTypes={["arcanist", "trade_goods"]}
                    partyOrder={partyOrder}
                    partyLevel={partyLevel}
                    heroLevels={heroLevels}
                    silver={silver}
                    items={items}
                    itemsById={itemsById}
                    spells={spells}
                    equippedByHero={equippedByHero}
                    learnedSpellIds={learnedSpellIds}
                    disciplinesByHero={disciplinesByHero}
                    chosenDisciplinesByHero={chosenDisciplinesByHero}
                    onSelectDiscipline={onSelectDiscipline}
                    onBuy={onBuyShopEntry}
                    onReturnDialogue={() => setHarborShopMode(null)}
                  />
                )}
              </div>
            ) : (
              <div className="px-5 pt-4 pb-3.5 md:px-6 md:pt-4 md:pb-4 xl:px-7 xl:pt-5 xl:pb-4 flex flex-col md:flex-row items-center md:items-end gap-5 md:gap-7">
                {/* Heroic Rising Quest Card Monument Matching Town NPC Portrait Frame */}
                <div className="relative shrink-0 md:-mt-16 xl:-mt-20">
                  <div className={["rounded-[4px] p-[3px] shadow-[0_24px_60px_rgba(0,0,0,0.92)]", frameGradient].join(" ")}>
                    <div className="w-[180px] h-[180px] md:w-[224px] md:h-[224px] lg:w-[252px] lg:h-[252px] xl:w-[280px] xl:h-[280px] 2xl:w-[300px] 2xl:h-[300px] rounded-sm overflow-hidden bg-[#0b0e14] relative">
                      <QuestCardThumb
                        cardId={showcaseCardId}
                        fallbackPath={showcaseFallback}
                        badgeCardId={showCompletedSeal ? "quest_complete_royal_seal" : undefined}
                        badgeClassName="w-[44px] h-[44px] bottom-2.5 right-2.5 border-2"
                        alt={panelTitle}
                        className="w-full h-full border-0 bg-[#0b0e14]"
                        imgClassName="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  {cornerMedallionSrc && !(isPortalLoc && isPortalSealed) && (
                    <div
                      className="absolute -bottom-2.5 -left-2.5 w-[54px] h-[54px] rounded-md border-2 border-[#d7b267] bg-[#0b0f17]/95 p-1 shadow-[0_8px_20px_rgba(0,0,0,0.9)] flex items-center justify-center"
                      title={isPortalLoc ? catalystName : portalDisplayName}
                    >
                      <img
                        src={assetUrl(cornerMedallionSrc)}
                        alt=""
                        draggable={false}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                </div>

                {/* Quest & Unlock Details Showcase (Compact Editorial Height So Quest Card Towers Above Rim) */}
                <div className="min-w-0 flex-1 flex flex-col justify-between gap-3 w-full">
                  <div>
                    <div className="border-b border-[#2c3446] pb-2 mb-2 flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div
                          className={[
                            "text-[11.5px] md:text-[12px] uppercase tracking-[0.16em] font-semibold",
                            isPortalSealed ? "text-[#84f2b8]" : "text-[#d9b468]",
                          ].join(" ")}
                        >
                          {panelEyebrow}
                        </div>
                        <h2 className="font-display m-0 text-[24px] md:text-[27px] lg:text-[31px] font-bold text-[#fae2aa] leading-tight mt-0.5">
                          {panelTitle}
                        </h2>
                      </div>
                      <span
                        className={[
                          "px-2.5 py-1 rounded border text-[11px] font-bold uppercase tracking-wider shrink-0 mt-0.5",
                          statusPill.cls,
                        ].join(" ")}
                      >
                        {statusPill.label}
                      </span>
                    </div>

                    <p className="m-0 text-[14.5px] md:text-[15px] lg:text-[16px] leading-[1.58] text-[#eff3fa] border-l-2 border-[#c8a256] pl-4">
                      {panelBody}
                      {questMeta && !isPortalSealed && (!isPortalLoc || !hasCatalyst)
                        ? ` Speak with ${questMeta.giver ?? "town scouts"} at ${questMeta.hubName} to earn the ${questMeta.catalystName}${questMeta.reward ? ` (${questMeta.reward})` : ""}.`
                        : isPortalLoc && hasCatalyst && !isPortalSealed && location.bossInfo
                          ? ` Guardian: ${location.bossInfo.boss} · Weaknesses: ${location.bossInfo.weaknesses}.`
                          : ""}
                    </p>

                    {isPortalLoc && isPortalSealed && reopenedNotes.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2 pl-4">
                        {reopenedNotes.map((note) => (
                          <span
                            key={note}
                            className="px-2.5 py-1 rounded border border-[#6e5a35] bg-[#1e180f] text-[11.5px] font-semibold text-[#f3dfb1]"
                          >
                            ★ {note}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bottom Step Strip & Action Buttons */}
                  <div className="border-t border-[#2c3446] pt-2.5 flex flex-wrap items-center justify-between gap-3">
                    {isPortalLoc ? (
                      <div className="min-w-0 flex items-center gap-3">
                        <img
                          src={assetUrl(
                            isPortalSealed
                              ? "assets/icons/quests/quest_complete_royal_seal.webp"
                              : catalystItem?.iconPath ?? "assets/icons/quests/quest_portal_catalyst_seal.webp"
                          )}
                          alt=""
                          draggable={false}
                          className="w-[38px] h-[38px] rounded border border-[#5a492e] bg-[#0b0e14] object-contain p-0.5 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#d9b468]">
                            {isPortalSealed ? "Rift Permanently Closed" : `Required Catalyst · ${catalystName}`}
                          </div>
                          <div className="text-[12.5px] text-[#cbd7ea]">
                            {isPortalSealed
                              ? "This Dimensional Rift will trouble Ethoria no longer."
                              : hasCatalyst
                                ? `Catalyst forged — ready to unseal ${location.name}`
                                : `Complete “${questMeta?.questTitle ?? "Catalyst Quest"}” at ${questMeta?.hubName ?? "town"} to unseal`}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="min-w-0 flex flex-wrap items-center gap-2.5">
                        {questMeta && (
                          <div className="px-3 py-1.5 rounded border border-[#4f422b] bg-[#131722]/90 text-[12px] text-[#e7edf7]">
                            <strong className={questMeta.done ? "text-[#9ef0c1]" : "text-[#ffd48a]"}>
                              {questMeta.done ? "✓ Quest Done:" : "Quest:"}
                            </strong>{" "}
                            {questMeta.questTitle} <span className="text-[#9cb0cb]">({questMeta.hubName})</span>
                          </div>
                        )}
                        <span className="text-[#8a9ab5] font-bold">→</span>
                        <div className="px-3 py-1.5 rounded border border-[#5d472c] bg-[#16110c]/92 flex items-center gap-2 text-[12px] text-[#fae2aa]">
                          {gatePortalLoc && (
                            <img
                              src={assetUrl(gatePortalLoc.assetPath)}
                              alt={portalDisplayName}
                              draggable={false}
                              className="w-[22px] h-[22px] object-contain shrink-0"
                            />
                          )}
                          <span>
                            <strong className="text-[#f0b45a]">Portal:</strong> Destroy {portalDisplayName}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-end gap-2.5 shrink-0">
                      {isClosedSeaPort && (
                        <>
                          <button
                            type="button"
                            onClick={() => onFreeRest(location.name)}
                            className="px-4 py-2.5 rounded border border-[#4eb987] bg-[#153526] hover:bg-[#1e4b36] text-[#b4f5d2] text-[12.5px] font-bold uppercase tracking-wider cursor-pointer transition-colors"
                          >
                            Rest at Harbor (0s)
                          </button>
                          {harborShopNpc && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  audioEngine.playUiClick();
                                  setHarborShopMode("arcanist");
                                }}
                                className="px-4 py-2.5 rounded border border-[#d7b267] bg-[#2a2112] hover:bg-[#3c2f18] text-[#fae4b0] text-[12.5px] font-bold uppercase tracking-wider cursor-pointer transition-colors"
                              >
                                Field Supplies
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  audioEngine.playUiClick();
                                  setHarborShopMode("trade_goods");
                                }}
                                className="px-4 py-2.5 rounded border border-[#b89248] bg-[#211a0f] hover:bg-[#332716] text-[#f4d799] text-[12.5px] font-bold uppercase tracking-wider cursor-pointer transition-colors"
                              >
                                Sell Trade Goods
                              </button>
                            </>
                          )}
                        </>
                      )}

                      {isPortalLoc && !isPortalSealed && (
                        <button
                          type="button"
                          disabled={!hasCatalyst || !onEnterPortal}
                          onClick={() => {
                            if (!hasCatalyst || !onEnterPortal) return;
                            audioEngine.playDoorOpen();
                            onEnterPortal(location);
                          }}
                          className="px-5 py-2.5 rounded border border-[#e6c170] bg-[#a37625] hover:bg-[#be8c30] disabled:opacity-45 disabled:bg-[#231e15] disabled:border-[#554730] disabled:cursor-not-allowed text-[#fff6dc] text-[13px] font-bold uppercase tracking-wider cursor-pointer transition-colors shadow-lg"
                        >
                          {hasCatalyst ? "Unseal & Enter" : "Catalyst Required"}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          audioEngine.playSfx("ui_close", 0.28);
                          onClose();
                        }}
                        className="px-5 py-2.5 rounded border border-[#e6c170] bg-[#c99b44]/30 hover:bg-[#c99b44]/50 text-[#fff4d4] text-[13px] font-bold uppercase tracking-wider cursor-pointer transition-colors"
                      >
                        {isPortalSealed ? "Return to Map" : "Step Back"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isTavern && parentLocation) {
    return (
      <TavernView
        tavern={location}
        parentTown={parentLocation}
        worldLocations={worldLocations}
        travelCatalog={travelCatalog}
        npcsByLocation={npcsByLocation}
        questsByKey={questsByKey}
        partyOrder={partyOrder}
        partyLevel={partyLevel}
        acceptedQuestIds={acceptedQuestIds}
        completedQuestIds={completedQuestIds}
        questProgressById={questProgressById}
        trackedQuestKeys={trackedQuestKeys}
        activeOutpostHuntCount={activeOutpostHunts.length}
        onAcceptQuest={onAcceptQuest}
        onToggleTrackQuest={onToggleTrackQuest}
        onOpenJournal={onOpenJournal}
        onOpenParty={onOpenParty}
        onReturnToTown={() => {
          if (onReturnToParent) {
            onReturnToParent();
          } else {
            onEnterLocationById(parentLocation.id);
          }
        }}
        onClose={onClose}
      />
    );
  }

  const safeIdx = Math.min(selectedIdx, Math.max(0, resolvedNpcs.length - 1));
  const selectedNpc = resolvedNpcs[safeIdx] ?? null;
  const questCompleted = Boolean(selectedNpc?.quest && completedSet.has(selectedNpc.quest.questId));
  const questAccepted = Boolean(selectedNpc?.quest && acceptedSet.has(selectedNpc.quest.questId));
  const journalLimit = getGlobalActiveQuestLimit();
  const journalCount = acceptedQuestIds.length + activeOutpostHunts.length;
  const selectedQuestStage = selectedNpc?.quest
    ? getHubQuestStage(selectedNpc.quest.questId, questProgressById, completedSet)
    : "active";
  const selectedQuestChain = selectedNpc?.quest
    ? getQuestStoryChainInfo(selectedNpc.quest.questId, travelCatalog, questsByKey, completedSet)
    : null;
  const selectedQuestObjective = selectedNpc?.quest
    ? resolveQuestObjectiveMeta(selectedNpc.quest, selectedQuestStage, worldLocations)
    : null;

  const activeOutpostHunt = isOutpostLocation
    ? activeOutpostHunts.find((h) => h.outpostId === location.id) ?? null
    : null;
  const displayedOutpostHunt = activeOutpostHunt ?? outpostOffer;
  const isQuartermasterSelected = Boolean(
    isOutpostLocation && selectedNpc && selectedNpc.id.endsWith("_quartermaster")
  );
  const huntReadyToClaim = Boolean(
    activeOutpostHunt && activeOutpostHunt.killsProgress >= activeOutpostHunt.killsRequired
  );
  const outpostLore = displayedOutpostHunt
    ? resolveOutpostHuntLore(
        displayedOutpostHunt.mobId,
        displayedOutpostHunt.mobName,
        location.name,
        displayedOutpostHunt.zoneNum,
        displayedOutpostHunt.biomeHints
      )
    : null;
  const displayedNpcDialogue =
    isQuartermasterSelected && displayedOutpostHunt
      ? buildQuartermasterHuntDialogue(displayedOutpostHunt, Boolean(activeOutpostHunt), huntReadyToClaim)
      : resolveQuestNpcStatusDialogue(
          selectedNpc?.dialogue ?? "",
          selectedNpc?.quest ?? null,
          questAccepted,
          questCompleted,
          selectedQuestStage,
          selectedQuestChain,
          selectedQuestObjective
        );
  void battleConfig;

  const stewardSvcId = selectedNpc && !selectedNpc.quest ? inferNpcServiceId(selectedNpc.displayRole) : null;
  const matchedStewardService = stewardSvcId ? hubServices.find((s) => s.id === stewardSvcId) ?? null : null;
  const visibleService = activeService ?? matchedStewardService;

  const focusServiceNpc = (svc: ServicePanelSpec) => {
    if (svc.id === "keep") {
      onEnterLocationById(HIGHCROWN_KEEP_ID);
      return;
    }
    if (svc.id === "tavern") {
      onEnterLocationById(`${location.id}${TAVERN_SUFFIX}`);
      return;
    }
    if (svc.id === "return_parent") {
      if (onReturnToParent) {
        onReturnToParent();
      } else if (parentLocation) {
        onEnterLocationById(parentLocation.id);
      }
      return;
    }
    audioEngine.playUiClick();
    setShowLore(false);
    if (svc.id === "rest") {
      onFreeRest(location.name);
      const innIdx = resolvedNpcs.findIndex((n) => {
        const r = n.displayRole.toLowerCase();
        return r.includes("inn") || r.includes("steward") || r.includes("chamberlain") || r.includes("rest");
      });
      if (innIdx >= 0) setSelectedIdx(innIdx);
      setActiveService(svc);
      return;
    }

    const roleKeywordMap: Record<Exclude<ServicePanelSpec["id"], "keep" | "tavern" | "return_parent" | "rest">, string[]> = {
      armory: ["armorer", "smith", "forgemaster", "quartermaster"],
      mystic: ["mystic", "tome", "archive", "apothecary", "scholar"],
      arena: ["arena", "pit-master"],
      port: ["captain", "vessel", "shipping", "sailor", "ferry", "dock"],
    };
    const keys = roleKeywordMap[svc.id];
    const matchIdx = resolvedNpcs.findIndex((n) => keys.some((k) => n.displayRole.toLowerCase().includes(k)));
    if (matchIdx >= 0) setSelectedIdx(matchIdx);
    setActiveService((cur) => (cur?.id === svc.id ? null : svc));
  };

  return (
    <div
      className="fixed inset-0 z-[25] bg-[#05060a] flex flex-col justify-between overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={location.name}
    >
      {/* Full-Screen Tack-Sharp 16:9 Painted Room Scene */}
      <img
        src={assetUrl(resolvedInteriorPath)}
        alt={location.name}
        draggable={false}
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
      />

      {/* Natural Theatrical Room Shading: Open Illuminated Architecture Above, Rich Stage Shadow Across Floor & Left Edge */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: [
            "linear-gradient(180deg, rgba(5,7,12,0.74) 0%, rgba(5,7,12,0.12) 15%, rgba(5,7,12,0.04) 44%, rgba(6,8,14,0.68) 70%, rgba(4,6,10,0.93) 100%)",
            "linear-gradient(90deg, rgba(5,7,12,0.78) 0%, rgba(5,7,12,0.34) 24%, rgba(5,7,12,0) 48%)",
          ].join(", "),
        }}
      />

      {/* TOP CANOPY HEADER: Floating Lightly Across Ceiling (Zero Box Frame Blocking Beams/Windows) */}
      <header className="relative z-[2] w-full max-w-[1680px] mx-auto px-5 md:px-8 pt-4 md:pt-5 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3.5 min-w-0 drop-shadow-[0_3px_12px_rgba(0,0,0,0.9)]">
          {location.bannerAssetPath ? (
            <img
              src={assetUrl(location.bannerAssetPath)}
              alt=""
              className="w-[38px] h-[52px] object-contain shrink-0 drop-shadow-[0_6px_14px_rgba(0,0,0,0.9)]"
              draggable={false}
            />
          ) : (
            <img
              src={assetUrl(location.assetPath)}
              alt=""
              className="w-[42px] h-[42px] object-contain shrink-0 drop-shadow-[0_6px_14px_rgba(0,0,0,0.9)]"
              draggable={false}
            />
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display m-0 text-[22px] md:text-[28px] font-bold tracking-[0.04em] text-[#fae4b0] leading-none truncate">
                {location.name}
              </h1>
              {location.factionName && (
                <span
                  style={{
                    borderColor: location.factionPrimaryColor ?? "#8c7445",
                    backgroundColor: location.factionSecondaryColor ?? "#1d2230",
                    color: location.factionPrimaryColor ?? "#f4cf83",
                  }}
                  className="px-2.5 py-0.5 rounded-sm border text-[11px] font-semibold tracking-wide shrink-0 shadow"
                >
                  {location.factionName}
                </span>
              )}
            </div>
            <div className="text-[11.5px] uppercase tracking-[0.14em] text-[#c7d3e6] mt-1 truncate">
              {location.playerKind ?? location.kind}
              {location.playerRegion ? ` · ${location.playerRegion}` : ""}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="px-3 py-1.5 rounded border border-[#7d653c]/90 bg-[#0e121b]/90 text-[#ffe49e] text-[12px] font-bold shadow-lg">
            Silver: {silver.toLocaleString()}s
          </div>
          <button
            type="button"
            onClick={() => {
              audioEngine.playUiClick();
              onOpenParty();
            }}
            className="flex items-center gap-2.5 rounded border border-[#4a5266]/90 hover:border-[#c8a35a] bg-[#0e121b]/88 hover:bg-[#171d2b]/95 backdrop-blur-sm px-3 py-1.5 cursor-pointer transition-colors shadow-lg"
            title="Open Party & Equipment (P)"
          >
            <div className="flex items-center -space-x-1.5">
              {partyOrder.map((hid) => {
                const hero = getHeroById(hid);
                return (
                  <img
                    key={hid}
                    src={assetUrl(hero.avatarPath)}
                    alt={hero.name}
                    draggable={false}
                    className="w-[28px] h-[28px] rounded-full object-cover border border-[#8e7445]"
                  />
                );
              })}
            </div>
            <div className="text-left">
              <div className="text-[11px] font-bold text-[#f2dba6] leading-tight">Party · Lv {partyLevel}</div>
              <div className="text-[10px] text-[#9aa8be] leading-tight">Open (P)</div>
            </div>
          </button>

          {onOpenJournal && (
            <button
              type="button"
              onClick={() => {
                audioEngine.playUiClick();
                onOpenJournal();
              }}
              className="hidden sm:flex flex-col items-start rounded border border-[#4a5266]/90 hover:border-[#c8a35a] bg-[#0e121b]/88 hover:bg-[#171d2b]/95 backdrop-blur-sm px-3 py-1.5 cursor-pointer transition-colors shadow-lg"
              title="Open Quest Journal (J)"
            >
              <span className="text-[11px] font-bold text-[#f2dba6] leading-tight">
                Journal · {journalCount}/{journalLimit}
              </span>
              <span className="text-[10px] text-[#9aa8be] leading-tight">Open (J)</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              audioEngine.playUiClick();
              setActiveService(null);
              setShowLore((cur) => !cur);
            }}
            className={[
              "px-3.5 py-2 rounded border text-[12px] font-semibold tracking-wider uppercase cursor-pointer transition-colors shadow-lg backdrop-blur-sm",
              showLore
                ? "border-[#e2be73] bg-[#2a2214] text-[#fff1c9]"
                : "border-[#4a5266]/90 hover:border-[#c8a35a] bg-[#0e121b]/88 hover:bg-[#171d2b]/95 text-[#ccd6e8] hover:text-[#f8e4b6]",
            ].join(" ")}
          >
            About Town
          </button>

          {!isTavern && location.tavernAssetPath && (
            <button
              type="button"
              onClick={() => onEnterLocationById(`${location.id}${TAVERN_SUFFIX}`)}
              className="px-4 py-2 rounded border border-[#d7b267]/90 bg-[#251e11]/92 hover:bg-[#382d19] text-[#fae4b0] hover:text-[#fff6dc] text-[12px] font-semibold tracking-wider uppercase cursor-pointer transition-colors shadow-lg"
            >
              Enter Tavern
            </button>
          )}
          {location.id === HIGHCROWN_ID && (
            <button
              type="button"
              onClick={() => onEnterLocationById(HIGHCROWN_KEEP_ID)}
              className="px-4 py-2 rounded border border-[#d7b267]/90 bg-[#251e11]/92 hover:bg-[#382d19] text-[#fae4b0] hover:text-[#fff6dc] text-[12px] font-semibold tracking-wider uppercase cursor-pointer transition-colors shadow-lg"
            >
              Enter Keep
            </button>
          )}
          {parentLocation && (
            <button
              type="button"
              onClick={() => {
                if (onReturnToParent) {
                  onReturnToParent();
                } else {
                  onEnterLocationById(parentLocation.id);
                }
              }}
              className="px-4 py-2 rounded border border-[#d7b267]/90 bg-[#251e11]/92 hover:bg-[#382d19] text-[#fae4b0] hover:text-[#fff6dc] text-[12px] font-semibold tracking-wider uppercase cursor-pointer transition-colors shadow-lg"
            >
              ← Back to {parentLocation.name}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              audioEngine.playSfx("ui_close", 0.28);
              onClose();
            }}
            className="px-4 py-2 rounded border border-[#7c653e] hover:border-[#e5c174] bg-[#10141e]/90 hover:bg-[#1b2232] text-[#efe0bc] hover:text-[#fff4d2] text-[12px] font-semibold tracking-wider uppercase cursor-pointer transition-colors shadow-lg backdrop-blur-sm"
          >
            {parentLocation ? "Leave to Map (Esc)" : "Leave (Esc)"}
          </button>
        </div>
      </header>

      {/* LOWER STAGE: Anchored Naturally Along the Room Floor — Left Resident List & Heroic Focal Conversation */}
      <div className="relative z-[2] flex-1 min-h-0 w-full max-w-[1680px] mx-auto px-5 md:px-8 pb-5 md:pb-6 flex flex-col lg:flex-row lg:items-end gap-5 xl:gap-7">
        {/* LEFT WING: Clean Vertical Resident Cards Resting Along Lower-Left Edge */}
        <aside className="w-full lg:w-[300px] xl:w-[324px] 2xl:w-[356px] max-h-[34vh] lg:max-h-full flex flex-col justify-end gap-2 shrink-0 min-h-0">
          <div className="flex items-center justify-between px-1 shrink-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#e2be73]">
              People Here
            </span>
            <span className="text-[11px] text-[#aebbd0]">{resolvedNpcs.length} Present</span>
          </div>

          <div className="flex flex-col gap-1.5 overflow-y-auto pr-1 min-h-0">
            {resolvedNpcs.map((npc, idx) => {
              const isSelected = !showLore && idx === safeIdx;
              const hasQuest = Boolean(npc.quest);
              const qCompleted = Boolean(npc.quest && completedSet.has(npc.quest.questId));
              const qAccepted = Boolean(npc.quest && acceptedSet.has(npc.quest.questId));
              const qStage = npc.quest ? getHubQuestStage(npc.quest.questId, questProgressById, completedSet) : "active";
              const qReady = qAccepted && qStage === "ready_to_turn_in";
              const qChainLocked = Boolean(
                npc.quest &&
                  !qAccepted &&
                  !qCompleted &&
                  getQuestStoryChainInfo(npc.quest.questId, travelCatalog, questsByKey, completedSet)?.isLockedByChain
              );
              const done = qCompleted || qAccepted;
              return (
                <button
                  key={npc.id}
                  type="button"
                  onClick={() => {
                    audioEngine.playUiClick(0.32);
                    setActiveService(null);
                    setOpenShopNpcId(null);
                    setHarborShopMode(null);
                    setShowLore(false);
                    setSelectedIdx(idx);
                  }}
                  className={[
                    "w-full rounded border p-2 flex items-center gap-3 text-left cursor-pointer transition-all shrink-0 backdrop-blur-sm",
                    isSelected
                      ? "bg-[#251d11]/94 border-[#ebca7e] shadow-[0_0_20px_rgba(226,190,115,0.28)]"
                      : "bg-[#0d111a]/86 border-[#2f3749]/90 hover:border-[#947945] hover:bg-[#161c2a]/92",
                  ].join(" ")}
                >
                  <img
                    src={assetUrl(npc.portraitPath)}
                    alt={npc.displayName}
                    draggable={false}
                    className={[
                      "w-[54px] h-[54px] rounded-sm object-cover shrink-0 border",
                      isSelected ? "border-[#f3d489]" : "border-[#465064]",
                    ].join(" ")}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={[
                          "font-display text-[14.5px] font-bold leading-tight truncate",
                          isSelected ? "text-[#fff2cc]" : "text-[#ede3cf]",
                        ].join(" ")}
                      >
                        {npc.displayName}
                      </span>
                      {hasQuest && (
                        <span
                          className={[
                            "px-1.5 py-0.5 rounded-sm border text-[10px] font-bold uppercase shrink-0",
                            qCompleted || qReady
                              ? "bg-[#2a2214] border-[#e6c170] text-[#ffeaa8]"
                              : done
                                ? "bg-[#162a21] border-[#3c7358] text-[#8be0b2]"
                                : qChainLocked
                                  ? "bg-[#1a1822] border-[#61564a] text-[#cbb692]"
                                  : "bg-[#8c6422]/45 border-[#e3b963] text-[#ffe29e]",
                          ].join(" ")}
                          title={
                            qCompleted
                              ? "Completed"
                              : qReady
                                ? "Ready to Turn In"
                                : done
                                  ? "In Journal"
                                  : qChainLocked
                                    ? "Story Chain Prerequisite Required"
                                    : "Quest Available"
                          }
                        >
                          {qCompleted || qReady ? "★" : done ? "✓" : qChainLocked ? "Locked" : "!"}
                        </span>
                      )}
                      {!hasQuest && isOutpostLocation && npc.id.endsWith("_quartermaster") && (
                        <span
                          className={[
                            "px-1.5 py-0.5 rounded-sm border text-[10px] font-bold uppercase shrink-0",
                            huntReadyToClaim
                              ? "bg-[#2a2214] border-[#e6c170] text-[#fff1b8]"
                              : activeOutpostHunt
                                ? "bg-[#162a21] border-[#3c7358] text-[#8be0b2]"
                                : "bg-[#8c6422]/45 border-[#e3b963] text-[#ffe29e]",
                          ].join(" ")}
                        >
                          {huntReadyToClaim
                            ? "★"
                            : activeOutpostHunt
                              ? `${activeOutpostHunt.killsProgress}/${activeOutpostHunt.killsRequired}`
                              : "!"}
                        </span>
                      )}
                    </div>
                    <div
                      className={[
                        "text-[11.5px] leading-snug mt-0.5 line-clamp-2",
                        npc.shopType
                          ? "text-[#f2d084] font-semibold"
                          : hasQuest || (isOutpostLocation && npc.id.endsWith("_quartermaster") && outpostLore)
                            ? "text-[#edd08b]"
                            : "text-[#9caac0]",
                      ].join(" ")}
                    >
                      {npc.shopLabel
                        ? `${npc.shopLabel}${npc.quest ? ` · ${npc.quest.title}` : ""}`
                        : npc.quest
                          ? npc.quest.title
                          : isOutpostLocation && npc.id.endsWith("_quartermaster") && outpostLore
                            ? outpostLore.contractTitle
                            : npc.displayRole}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* RIGHT/CENTER FOCAL MONUMENT: The Person You Are Talking To + Grounded Interaction Options */}
        <main className="min-w-0 flex-1 flex flex-col justify-end">
          <div className="ledger-panel relative w-full rounded-[4px] flex flex-col">
            <CornerFiligree />

            {/* Speaker / Active Shop / Town Lore Showcase Band */}
            <div
              className={
                !showLore && selectedNpc && ((openShopNpcId === selectedNpc.id && selectedNpc.shopType) || harborShopMode)
                  ? "p-3 md:p-3.5 flex flex-col items-stretch h-[78vh] min-h-[500px] max-h-[740px]"
                  : "px-5 pt-4 pb-3.5 md:px-6 md:pt-4 md:pb-4 xl:px-7 xl:pt-5 xl:pb-4 flex flex-col md:flex-row items-center md:items-end gap-5 md:gap-7"
              }
            >
              {!showLore && selectedNpc && ((openShopNpcId === selectedNpc.id && selectedNpc.shopType) || harborShopMode) ? (
                (harborShopMode ?? selectedNpc.shopType) === "trade_goods" ? (
                  <TradeGoodsCounter
                    npc={{
                      id: selectedNpc.id,
                      name: selectedNpc.displayName,
                      roleTitle: selectedNpc.displayRole,
                      category: selectedNpc.category,
                      portraitPath: selectedNpc.portraitPath,
                    }}
                    tradeGoodCounts={tradeGoodCounts}
                    itemsById={itemsById}
                    onSellAll={onSellAllTradeGoods}
                    onReturnDialogue={() => {
                      setOpenShopNpcId(null);
                      setHarborShopMode(null);
                    }}
                  />
                ) : (
                  <ShopCounterPanel
                    hub={
                      harborShopMode === "arcanist" && location.region == null && location.zoneNum == null
                        ? {
                            ...location,
                            zoneNum: location.mapId === "map_02" ? 6 : location.mapId === "map_03" ? 11 : location.mapId === "map_04" ? 16 : 3,
                            spellTier: location.mapId === "map_02" ? 3 : location.mapId === "map_03" ? 5 : location.mapId === "map_04" ? 7 : 1,
                            region: location.mapId === "map_02" ? 3 : location.mapId === "map_03" ? 5 : location.mapId === "map_04" ? 7 : 1,
                          }
                        : location
                    }
                    npc={{
                      id: selectedNpc.id,
                      name: selectedNpc.displayName,
                      roleTitle: selectedNpc.displayRole,
                      category: selectedNpc.category,
                      portraitPath: selectedNpc.portraitPath,
                      shopType: harborShopMode ?? selectedNpc.shopType,
                      shopLabel: harborShopMode === "arcanist" ? "Harbor Field Supplies" : selectedNpc.shopLabel,
                    }}
                    shopType={(harborShopMode ?? selectedNpc.shopType)!}
                    townShopTypes={resolvedNpcs
                      .map((n) => n.shopType)
                      .filter((s): s is ShopType => Boolean(s))}
                    partyOrder={partyOrder}
                    partyLevel={partyLevel}
                    heroLevels={heroLevels}
                    silver={silver}
                    items={items}
                    itemsById={itemsById}
                    spells={spells}
                    equippedByHero={equippedByHero}
                    learnedSpellIds={learnedSpellIds}
                    disciplinesByHero={disciplinesByHero}
                    chosenDisciplinesByHero={chosenDisciplinesByHero}
                    onSelectDiscipline={onSelectDiscipline}
                    onBuy={onBuyShopEntry}
                    onReturnDialogue={() => {
                      setOpenShopNpcId(null);
                      setHarborShopMode(null);
                    }}
                  />
                )
              ) : showLore ? (
                <>
                  {/* Overlapping Crest / Emblem Rising Above Top Rim */}
                  <div className="shrink-0 md:-mt-12 xl:-mt-16 flex items-center justify-center rounded-[4px] border border-[#7c653b] bg-[#0d1119]/96 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.88)]">
                    {location.bannerAssetPath ? (
                      <img
                        src={assetUrl(location.bannerAssetPath)}
                        alt={location.factionName ?? location.name}
                        draggable={false}
                        className="w-[120px] h-[160px] lg:w-[144px] lg:h-[192px] object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.85)]"
                      />
                    ) : (
                      <img
                        src={assetUrl(location.assetPath)}
                        alt={location.name}
                        draggable={false}
                        className="w-[140px] h-[140px] lg:w-[168px] lg:h-[168px] object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.85)]"
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 flex flex-col gap-3.5 self-stretch justify-between">
                    <div className="border-b border-[#2c3446] pb-2.5 flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <div className="text-[11.5px] uppercase tracking-[0.16em] text-[#d7b267] font-semibold">
                          {location.playerKind ?? location.kind} · {location.playerRegion ?? "Ethoria"}
                        </div>
                        <h2 className="font-display m-0 text-[24px] lg:text-[28px] font-bold text-[#fae2aa] leading-tight mt-0.5">
                          About {location.name}
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          audioEngine.playUiClick();
                          setShowLore(false);
                        }}
                        className="px-3.5 py-1.5 rounded border border-[#735c34] hover:border-[#e2be73] bg-[#1b1710] hover:bg-[#2a2215] text-[#f5dfb0] text-[12px] font-semibold uppercase tracking-wider cursor-pointer"
                      >
                        Back to {selectedNpc?.displayName ?? "Conversation"}
                      </button>
                    </div>

                    <p className="m-0 text-[15px] lg:text-[16.5px] leading-[1.68] text-[#e7ecf6] border-l-2 border-[#c8a256] pl-4">
                      {location.playerDescription ?? location.description ?? `${location.name} welcomes allied travelers off Ethoria's roads.`}
                    </p>
                  </div>
                </>
              ) : selectedNpc ? (
                <>
                  {/* Heroic Speaker Portrait Anchored Flush Below and Rising Proud Above the Rim */}
                  <div className="shrink-0 md:-mt-16 xl:-mt-20">
                    <div className="rounded-[4px] p-[3px] bg-gradient-to-b from-[#ffe7ad] via-[#c79948] to-[#563d18] shadow-[0_24px_60px_rgba(0,0,0,0.92)]">
                      <img
                        src={assetUrl(selectedNpc.portraitPath)}
                        alt={selectedNpc.displayName}
                        draggable={false}
                        className="w-[180px] h-[180px] md:w-[224px] md:h-[224px] lg:w-[252px] lg:h-[252px] xl:w-[280px] xl:h-[280px] 2xl:w-[300px] 2xl:h-[300px] rounded-sm object-cover block"
                      />
                    </div>
                  </div>

                  {/* Conversation Content: Name, Dialogue, Contract Offer or Active Service (Zero Scrollbar Clipping) */}
                  <div className="min-w-0 flex-1 flex flex-col justify-between gap-3">
                    {activeService ? (
                      <>
                        <div className="border-b border-[#2c3446] pb-2 flex flex-wrap items-end justify-between gap-3">
                          <div>
                            <div className="text-[11.5px] md:text-[12px] uppercase tracking-[0.16em] font-semibold text-[#d9b468]">
                              {selectedNpc.displayRole} · {selectedNpc.displayName}
                            </div>
                            <h2 className="font-display m-0 text-[22px] md:text-[26px] lg:text-[29px] font-bold text-[#fae2aa] leading-tight mt-0.5">
                              {activeService.title}
                            </h2>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {activeService.id === "rest" && (
                              <button
                                type="button"
                                onClick={() => onFreeRest(location.name)}
                                className="px-4 py-2 rounded border border-[#4eb987] bg-[#153526] hover:bg-[#1d4834] text-[#b4f5d2] text-[12.5px] font-bold cursor-pointer transition-colors"
                              >
                                Rest Party
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                audioEngine.playUiClick();
                                setActiveService(null);
                              }}
                              className="px-3.5 py-2 rounded border border-[#5f5034] hover:border-[#d7b267] bg-[#19150f] text-[#e8d5a8] hover:text-white text-[11.5px] font-semibold uppercase tracking-wider cursor-pointer"
                            >
                              Return to Dialogue
                            </button>
                          </div>
                        </div>

                        {activeService.id === "port" ? (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            {(travelCatalog?.seaPortRoutes ?? [])
                              .filter((r) => r.mapId !== location.mapId)
                              .map((route) => {
                                const routes = travelCatalog?.seaPortRoutes ?? [];
                                const destLoc =
                                  worldLocations.find((w) => w.id === route.id && w.placed && w.x !== null && w.y !== null) ??
                                  worldLocations.find((w) => w.id === `${route.id}_south` && w.placed && w.x !== null && w.y !== null);
                                const curOrder = routes.find((x) => x.mapId === location.mapId)?.order ?? 1;
                                const isOutbound = route.order > curOrder;
                                const gate = isOutbound
                                  ? routes
                                      .filter((r) => r.order >= curOrder && r.order < route.order)
                                      .sort((a, b) => a.order - b.order)
                                      .map((r) => travelCatalog?.outboundSeaPortalGates?.[r.mapId])
                                      .find((g) => g && !sealedPortalIds.includes(g.portalId))
                                  : undefined;
                                const gatePortalLoc = gate
                                  ? worldLocations.find((w) => w.id === gate.portalId)
                                  : undefined;
                                const gateQuestMeta = resolvePortalQuestMeta(gatePortalLoc);
                                const portalSealed = !gate;
                                const canSail = Boolean(destLoc && portalSealed && onSailToPort);

                              return (
                                <div
                                  key={route.id}
                                  className="rounded border border-[#324056] bg-[#0e131d]/95 p-3 flex flex-col justify-between gap-2"
                                >
                                  <div>
                                    <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#6ce0e8]">
                                      {route.realm}
                                    </div>
                                    <div className="text-[13.5px] font-bold text-[#fae2aa] mt-0.5 leading-snug">
                                      {route.title}
                                    </div>
                                  </div>
                                  {canSail && destLoc ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        audioEngine.playDoorOpen();
                                        onSailToPort!(destLoc);
                                      }}
                                      className="px-3 py-1.5 rounded border border-[#5ac4d6] bg-[#163a47] hover:bg-[#1e5062] text-[#d6f8ff] text-[11.5px] font-bold uppercase tracking-wider cursor-pointer"
                                    >
                                      Set Sail (Free)
                                    </button>
                                  ) : !portalSealed && gate && gateQuestMeta ? (
                                    <QuestReferenceCard
                                      variant="compact"
                                      cardId={gateQuestMeta.questId}
                                      fallbackPath={gateQuestMeta.fallbackPath}
                                      eyebrow={
                                        gateQuestMeta.done
                                          ? `Catalyst Ready · Defeat ${gate.portalName}`
                                          : `Complete Quest · ${gateQuestMeta.hubName}`
                                      }
                                      title={gateQuestMeta.questTitle}
                                      subtitle={
                                        gateQuestMeta.done
                                          ? `Defeat ${gate.portalName} to open this voyage`
                                          : `Grants ${gateQuestMeta.catalystName} → ${gate.portalName}`
                                      }
                                      status={gateQuestMeta.status}
                                    />
                                  ) : (
                                    <div className="text-[11px] font-semibold text-[#9aa8be]">
                                      {!portalSealed && gate
                                        ? `Seas Closed · Defeat ${gate.portalName}`
                                        : "Harbor Route Uncharted"}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <>
                            <p className="m-0 text-[15px] md:text-[15.5px] lg:text-[16.5px] leading-[1.62] text-[#e7edf7] border-l-2 border-[#c8a256] pl-4">
                              {activeService.summary}
                            </p>

                            <ul className="m-0 pl-4 list-disc marker:text-[#d7b267] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1.5 text-[13px] text-[#f3dfb1]">
                              {activeService.highlights.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <div>
                          <div className="border-b border-[#2c3446] pb-2 mb-2.5">
                            <div className="text-[11.5px] md:text-[12px] uppercase tracking-[0.16em] font-semibold text-[#d9b468]">
                              {selectedNpc.displayRole}
                            </div>
                            <h2 className="font-display m-0 text-[24px] md:text-[27px] lg:text-[31px] font-bold text-[#fae2aa] leading-tight mt-0.5">
                              {selectedNpc.displayName}
                            </h2>
                          </div>

                          <p className="m-0 text-[15px] md:text-[15.5px] lg:text-[17px] leading-[1.62] text-[#eff3fa] border-l-2 border-[#c8a256] pl-4">
                            “{displayedNpcDialogue}”
                          </p>
                        </div>

                        {isQuartermasterSelected && displayedOutpostHunt && outpostLore ? (
                          <div className="border-t border-[#2c3446] pt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="min-w-0 flex items-center gap-3">
                              <div className="flex items-center gap-1.5 shrink-0">
                                <QuestCardThumb
                                  cardId={displayedOutpostHunt.isElite ? "quest_outpost_elite_contract" : "quest_outpost_hunt_board"}
                                  fallbackPath={displayedOutpostHunt.mobIconPath}
                                  badgeCardId={huntReadyToClaim ? "quest_complete_royal_seal" : undefined}
                                  className="w-[60px] h-[60px] rounded border border-[#967741] bg-[#090c12] shrink-0 shadow-[0_0_16px_rgba(226,184,96,0.2)]"
                                />
                                <img
                                  src={assetUrl(displayedOutpostHunt.mobIconPath)}
                                  alt={displayedOutpostHunt.mobName}
                                  draggable={false}
                                  className="w-[60px] h-[60px] rounded border border-[#4a576f] bg-[#0b0e15] object-contain p-1 shrink-0"
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#d9b468]">
                                    {activeOutpostHunt
                                      ? huntReadyToClaim
                                        ? "Hunt Complete · Ready to Claim"
                                        : `Active Outpost Hunt (${activeOutpostHunt.killsProgress}/${activeOutpostHunt.killsRequired})`
                                      : "Outpost Hunt Contract"}
                                  </span>
                                  {displayedOutpostHunt.isElite && (
                                    <span className="px-1.5 py-0.5 rounded border border-[#8e6732] bg-[#2a1f10] text-[10px] font-semibold text-[#f8d78e]">
                                      Elite Beast
                                    </span>
                                  )}
                                </div>
                                <div className="text-[16px] lg:text-[18px] font-bold text-[#fbe3a6] mt-0.5 leading-snug">
                                  {outpostLore.contractTitle}
                                </div>
                                <div className="text-[12px] text-[#cfdcf0] mt-0.5 truncate">
                                  <span className="font-semibold text-[#f3dfb1]">
                                    Slay {displayedOutpostHunt.killsRequired}{" "}
                                    {pluralizeMonsterName(displayedOutpostHunt.mobName, displayedOutpostHunt.killsRequired)}
                                  </span>
                                  {" · "}
                                  <span className="text-[#9fc0e6]">
                                    {location.playerRegion || outpostLore.regionName} (Zone {displayedOutpostHunt.zoneNum}
                                    {location.levelRange ? ` · ${location.levelRange}` : ""})
                                  </span>
                                </div>
                                <div className="text-[12.5px] text-[#b8c8df] mt-0.5">
                                  <span className="text-[#e3c27a] font-semibold">Reward:</span>{" "}
                                  {formatOutpostRewardLine(displayedOutpostHunt)}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              {!activeOutpostHunt ? (
                                <>
                                  {journalCount >= journalLimit && onOpenJournal && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        audioEngine.playUiClick(0.32);
                                        onOpenJournal();
                                      }}
                                      className="px-3.5 py-2.5 rounded border border-[#c88c42] bg-[#281b0e] hover:bg-[#382612] text-[#ffd996] text-[12px] font-bold uppercase tracking-wider cursor-pointer transition-colors"
                                    >
                                      Open Journal
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    disabled={journalCount >= journalLimit}
                                    onClick={() => onAcceptOutpostHunt?.(displayedOutpostHunt)}
                                    className={[
                                      "px-5 py-2.5 rounded border text-[13px] font-bold uppercase tracking-wider transition-colors",
                                      journalCount >= journalLimit
                                        ? "border-[#4c4640] bg-[#18181f] text-[#8d96a8] cursor-not-allowed opacity-75"
                                        : "border-[#e6c170] bg-[#c99b44]/35 hover:bg-[#c99b44]/55 text-[#fff4d4] cursor-pointer shadow-[0_0_20px_rgba(226,190,115,0.22)]",
                                    ].join(" ")}
                                  >
                                    {journalCount >= journalLimit ? `Journal Full (${journalCount}/${journalLimit})` : "Accept Hunt"}
                                  </button>
                                </>
                              ) : huntReadyToClaim ? (
                                <button
                                  type="button"
                                  onClick={() => onCompleteOutpostHunt?.(location.id)}
                                  className="px-5 py-2.5 rounded border border-[#f2cf78] bg-[#b88628]/45 hover:bg-[#b88628]/65 text-[#fff6da] text-[13px] font-bold uppercase tracking-wider cursor-pointer transition-colors shadow-[0_0_22px_rgba(242,207,120,0.3)]"
                                >
                                  ★ Claim Reward
                                </button>
                              ) : (
                                <>
                                  <div className="px-3.5 py-2 rounded border border-[#3c785b] bg-[#142920] text-[#91e3b8] text-[12.5px] font-bold">
                                    {activeOutpostHunt.killsProgress} / {activeOutpostHunt.killsRequired} Slain
                                  </div>
                                  {onToggleTrackQuest && (
                                    <button
                                      type="button"
                                      onClick={() => onToggleTrackQuest(makeHuntTrackKey(location.id))}
                                      className={[
                                        "px-3.5 py-2 rounded border text-[12px] font-bold uppercase tracking-wider cursor-pointer transition-colors",
                                        trackedQuestKeys.includes(makeHuntTrackKey(location.id))
                                          ? "border-[#e6c170] bg-[#2e2412] text-[#ffe9a8] hover:bg-[#3d3017]"
                                          : "border-[#465169] bg-[#161c28] hover:border-[#b99653] text-[#ccd7ea] hover:text-[#fff2cc]",
                                      ].join(" ")}
                                    >
                                      {trackedQuestKeys.includes(makeHuntTrackKey(location.id)) ? "◆ Pinned" : "Pin to HUD"}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => onAbandonOutpostHunt?.(location.id)}
                                    className="px-3.5 py-2 rounded border border-[#5e3b44] bg-[#211317] hover:border-[#d46974] text-[#f2b5bc] text-[12px] font-semibold uppercase tracking-wider cursor-pointer transition-colors"
                                  >
                                    Abandon
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ) : selectedNpc.quest && selectedQuestObjective ? (
                          <NpcQuestOfferBar
                            quest={selectedNpc.quest}
                            stage={selectedQuestStage}
                            isAccepted={questAccepted}
                            isCompleted={questCompleted}
                            isPinned={trackedQuestKeys.includes(makeQuestTrackKey(selectedNpc.quest.questId))}
                            journalCount={journalCount}
                            journalLimit={journalLimit}
                            chainInfo={selectedQuestChain}
                            objectiveMeta={selectedQuestObjective}
                            onAcceptQuest={onAcceptQuest}
                            onToggleTrackQuest={onToggleTrackQuest}
                            onOpenJournal={onOpenJournal}
                            extraAction={
                              <div className="flex flex-wrap items-center gap-2">
                                {questAccepted && !questCompleted && selectedNpc.quest.questId === "q001" && (
                                  selectedQuestStage === "ready_to_turn_in" && onCompleteQuest ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        audioEngine.playUiClick();
                                        onCompleteQuest(selectedNpc.quest!);
                                      }}
                                      className="px-4 py-2 rounded border border-[#f2cf7c] bg-[#4a3813] hover:bg-[#5f491a] text-[#fff4d4] text-[12.5px] font-bold uppercase tracking-wider cursor-pointer transition-colors shadow-[0_0_18px_rgba(242,207,124,0.28)]"
                                    >
                                      Complete &amp; Claim Reward
                                    </button>
                                  ) : onEnterDungeon ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        audioEngine.playDoorOpen();
                                        onEnterDungeon(selectedNpc.quest!);
                                      }}
                                      className="px-4 py-2 rounded border border-[#72e3a8] bg-[#143325] hover:bg-[#1c4633] text-[#d5fce7] text-[12.5px] font-bold uppercase tracking-wider cursor-pointer transition-colors shadow-[0_0_18px_rgba(114,227,168,0.22)]"
                                    >
                                      Enter Dry Aqueduct
                                    </button>
                                  ) : null
                                )}
                                {selectedNpc.shopType && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      audioEngine.playUiClick();
                                      setOpenShopNpcId(selectedNpc.id);
                                    }}
                                    className="px-4 py-2 rounded border border-[#d7b267] bg-[#2a2112] hover:bg-[#3c2f18] text-[#fae4b0] text-[12.5px] font-bold uppercase tracking-wider cursor-pointer transition-colors"
                                  >
                                    Open {selectedNpc.shopLabel ?? "Shop"}
                                  </button>
                                )}
                              </div>
                            }
                          />
                        ) : selectedNpc.shopType ? (
                          <div className="border-t border-[#2c3446] pt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-[14.5px] font-bold text-[#f3dfb1]">{selectedNpc.shopLabel ?? "Merchant Shop"}</div>
                              <div className="text-[12.5px] text-[#adbed6] mt-0.5">
                                {selectedNpc.shopType === "trade_goods"
                                  ? "Appraise & sell recovered trade goods for Silver"
                                  : `Browse ${selectedNpc.displayName}'s stocked inventory`}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                audioEngine.playUiClick();
                                setOpenShopNpcId(selectedNpc.id);
                              }}
                              className="px-5 py-2.5 rounded border border-[#e6c170] bg-[#c99b44]/35 hover:bg-[#c99b44]/55 text-[#fff4d4] text-[13px] font-bold uppercase tracking-wider shrink-0 cursor-pointer transition-colors shadow-[0_0_20px_rgba(226,190,115,0.22)]"
                            >
                              {selectedNpc.shopType === "trade_goods" ? "Sell Trade Goods" : `Open ${selectedNpc.shopLabel ?? "Shop"}`}
                            </button>
                          </div>
                        ) : visibleService ? (
                          <div className="border-t border-[#2c3446] pt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-[14.5px] font-bold text-[#f3dfb1]">{visibleService.title}</div>
                              <div className="text-[12.5px] text-[#adbed6] mt-0.5">{visibleService.subtitle}</div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              {visibleService.id === "rest" ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onFreeRest(location.name);
                                    setActiveService(visibleService);
                                  }}
                                  className="px-5 py-2.5 rounded border border-[#4eb987] bg-[#153526] hover:bg-[#1e4b36] text-[#b4f5d2] text-[13px] font-bold shrink-0 cursor-pointer transition-colors"
                                >
                                  Rest Party
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => focusServiceNpc(visibleService)}
                                  className="px-4 py-2 rounded border border-[#8e7445] bg-[#1f1a11] hover:bg-[#2d2518] text-[#fae2a8] text-[12.5px] font-semibold shrink-0 cursor-pointer transition-colors"
                                >
                                  Inspect {visibleService.title}
                                </button>
                              )}
                              {selectedNpc.services.some((s) => /field supplies/i.test(s)) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    audioEngine.playUiClick();
                                    setHarborShopMode("arcanist");
                                  }}
                                  className="px-4 py-2.5 rounded border border-[#d7b267] bg-[#2a2112] hover:bg-[#3c2f18] text-[#fae4b0] text-[12.5px] font-bold uppercase tracking-wider shrink-0 cursor-pointer transition-colors"
                                >
                                  Field Supplies
                                </button>
                              )}
                              {selectedNpc.services.some((s) => /trade goods/i.test(s)) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    audioEngine.playUiClick();
                                    setHarborShopMode("trade_goods");
                                  }}
                                  className="px-4 py-2.5 rounded border border-[#b89248] bg-[#211a0f] hover:bg-[#332716] text-[#f4d799] text-[12.5px] font-bold uppercase tracking-wider shrink-0 cursor-pointer transition-colors"
                                >
                                  Sell Trade Goods
                                </button>
                              )}
                            </div>
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
