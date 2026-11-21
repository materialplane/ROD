// Fetches canonical JSON catalogs and resolves Hub vendors, town NPCs, stocked Gear Steps, and shop inventories.
import { SPELLS_CATALOG } from "./spellsData.js";
import { applyShopCatFilter, buildTownNpcsForHub, itemBelongsToShop } from "./shopTypes.js";

export const HERO_ROSTER = [
  { id: "valen", name: "Valen", className: "Duelist", avatar: "/assets/portraits/heroes/valen_avatar.webp" },
  { id: "ellowyn", name: "Ellowyn", className: "Mystic", avatar: "/assets/portraits/heroes/ellowyn_avatar.webp" },
  { id: "orin", name: "Orin", className: "Bulwark", avatar: "/assets/portraits/heroes/orin_avatar.webp" },
  { id: "rowan", name: "Rowan", className: "Archer", avatar: "/assets/portraits/heroes/rowan_avatar.webp" },
  { id: "mera", name: "Mera", className: "Druid", avatar: "/assets/portraits/heroes/mera_avatar.webp" },
  { id: "harlan", name: "Harlan", className: "Herbalist", avatar: "/assets/portraits/heroes/harlan_avatar.webp" },
];

export async function loadStudioData() {
  const [worldRes, npcsRes, itemsRes, spellsRes, runesRes, iconsRes] = await Promise.all([
    fetch("/data/world-locations.json"),
    fetch("/data/npcs-catalog.json"),
    fetch("/data/items-catalog.json"),
    fetch("/data/spells-catalog.json"),
    fetch("/data/runestone-affixes.json"),
    fetch("/assets/icons/icons-manifest.json"),
  ]);

  const [world, npcsData, itemsData, spellsData, runesData, iconsManifest] = await Promise.all([
    worldRes.json(),
    npcsRes.json(),
    itemsRes.json(),
    spellsRes.ok ? spellsRes.json() : Promise.resolve(null),
    runesRes.json(),
    iconsRes.json(),
  ]);

  const npcsByLoc = Object.fromEntries((npcsData.locations ?? []).map((g) => [g.locationId, g.npcs ?? []]));
  const rawHubs = (world.locations ?? []).filter((l) => l.interiorAssetPath && !l.id.endsWith("::tavern"));
  const highcrown = rawHubs.find((l) => l.id === "loc_01_overgrown_garden_sanctuary");

  // Match LocationInteriorModal's synthetic Keep (#69) right after Highcrown
  const keepLoc = {
    id: "loc_69_highcrown_keep",
    name: "Highcrown Keep",
    region: 1,
    mapId: "map_01",
    playerKind: "Royal Keep",
    playerRegion: highcrown?.playerRegion ?? "The Crownlands",
    factionName: highcrown?.factionName ?? "Highcrown Loyalists",
    factionPrimaryColor: highcrown?.factionPrimaryColor,
    factionSecondaryColor: highcrown?.factionSecondaryColor,
    bannerAssetPath: highcrown?.bannerAssetPath,
    interiorAssetPath: "assets/maps/interiors/loc_69_highcrown_keep.webp",
    playerServices: ["Royal Keep", "Free Inn", "Armory & Provisions"],
    services: ["Starter Gear (Step 1)"],
  };

  const hubs = [];
  for (const h of rawHubs) {
    hubs.push(enrichHub(h, npcsByLoc[h.id] ?? []));
    if (h.id === "loc_01_overgrown_garden_sanctuary") {
      hubs.push(enrichHub(keepLoc, npcsByLoc[keepLoc.id] ?? []));
    }
  }

  hubs.sort((a, b) => {
    const rank = (x) => (x.id === "loc_01_overgrown_garden_sanctuary" ? 0 : x.id === "loc_69_highcrown_keep" ? 1 : 2);
    const ra = rank(a), rb = rank(b);
    if (ra !== rb) return ra - rb;
    if (a.region !== b.region) return a.region - b.region;
    return (a.steps[0] ?? 99) - (b.steps[0] ?? 99) || a.name.localeCompare(b.name);
  });

  return {
    hubs,
    items: itemsData.items ?? [],
    spells: spellsData?.spells?.length ? spellsData.spells : SPELLS_CATALOG,
    runes: runesData,
    icons: iconsManifest.icons ?? [],
  };
}

function parseStepNums(textBlob) {
  const clean = textBlob.replace(/Chain\s+[A-Z]\s+Step\s+\d+/gi, "");
  const steps = new Set();
  const rangeRe = /Steps?\s*(\d+)\s*[–-]\s*(\d+)/gi;
  for (const m of clean.matchAll(rangeRe)) {
    const a = Number(m[1]), b = Number(m[2]);
    for (let s = a; s <= b; s++) steps.add(s);
  }
  if (steps.size === 0) {
    for (const m of clean.matchAll(/Step\s*(\d+)/gi)) {
      steps.add(Number(m[1]));
    }
  }
  return [...steps].sort((a, b) => a - b);
}

function enrichHub(loc, npcs) {
  let armoryNpc = null;
  let mysticNpc = null;
  for (const npc of npcs) {
    const blob = `${npc.roleTitle ?? ""} ${(npc.servicesOffered ?? []).join(" ")}`.toLowerCase();
    if (!armoryNpc && (blob.includes("armorer") || blob.includes("gear merchant") || blob.includes("provisions") || npc.id.includes("quartermaster"))) {
      if (blob.includes("weapons, helmets") || blob.includes("starter gear") || blob.includes("armorer")) armoryNpc = npc;
    }
    if (!mysticNpc && (blob.includes("apothecary") || blob.includes("caster outfitter") || blob.includes("mystic"))) {
      mysticNpc = npc;
    }
  }
  const blob = [
    ...(loc.services ?? []),
    armoryNpc?.roleTitle ?? "",
    ...(armoryNpc?.servicesOffered ?? []),
  ].join(" | ");

  const steps = parseStepNums(blob);
  const enriched = {
    ...loc,
    region: loc.region || Math.ceil((steps[0] || 1) / 3),
    steps: steps.length ? steps : [Math.max(1, ((loc.region || 1) - 1) * 3 + 1)],
    armoryNpc,
    mysticNpc,
    hasMystic: Boolean(mysticNpc),
    postLiberation: /post-liberation/i.test(blob),
  };
  enriched.townNpcs = buildTownNpcsForHub(enriched, npcs);
  return enriched;
}

export function potionAvailableInRegion(potion, region) {
  const m = String(potion.regionsStocked ?? "").match(/(\d+)\s*[–-]\s*(\d+)/);
  if (!m) return true;
  return region >= Number(m[1]) && region <= Number(m[2]);
}

export function getShopStock(data, hub, shopType, catFilter, activeHeroId = null) {
  const stepSet = new Set(hub.steps);

  if (shopType === "trade_goods") {
    return data.items
      .filter((it) => it.category === "trade_good" && (!it.region || Math.abs(it.region - hub.region) <= 1))
      .slice(0, 14);
  }

  if (shopType === "runestones") {
    return data.icons
      .filter((ic) => ic.folder === "runestones")
      .map((ic) => ({
        id: ic.id,
        name: ic.name,
        category: "runestone",
        subType: ic.id === "rn_empty_socket" ? "Socket" : "Carved Runestone",
        priceSilver: 0,
        sellSilver: 0,
        usableBy: HERO_ROSTER.map((h) => h.id),
        iconPath: ic.iconPath,
        effect: "Socket directly into any Weapon or Body Armor outside combat (overwrites existing Runestone).",
      }));
  }

  const usableFilter = (it) => !activeHeroId || !it.usableBy || it.usableBy.includes(activeHeroId);

  if (shopType === "magic") {
    const spells = (data.spells ?? []).filter((sp) => sp.region === hub.region && usableFilter(sp));
    return applyShopCatFilter(spells, "magic", catFilter);
  }

  const pool = data.items.filter((it) => {
    if (!itemBelongsToShop(it, shopType)) return false;
    if (!usableFilter(it)) return false;
    if (it.category === "consumable") return potionAvailableInRegion(it, hub.region);
    return stepSet.has(it.step);
  });

  return applyShopCatFilter(pool, shopType, catFilter);
}
