// Canonical 6 Shop Types + Trade Goods Buyer NPC, Zero-Duplicate Unique NPC Assignment across 41 Hubs.

export const METAL_ARMOR_TYPES = new Set([
  "Breastplate", "Half Plate", "Scale Mail", "Ring Mail", "Chain Mail", "Splint", "Plate", "Scale Plate",
]);

export const SHOP_META = {
  weapon: {
    id: "weapon",
    label: "Weapon Shop",
    badge: "Weapon Shop",
    quote: "Blades, bows, staves, and steel—everything built for battle.",
    pills: [["all", "All Weapons"], ["1h", "1-Handed"], ["2h", "2-Handed"]],
  },
  armor: {
    id: "armor",
    label: "Armor Shop",
    badge: "Armor Shop",
    quote: "Forged mail, heavy plates, and shields to turn the hardest blows.",
    pills: [["all", "Metal & Shields"], ["armor", "Metal Armor"], ["helm", "Metal Helms"], ["shield", "Shields"]],
  },
  tailor: {
    id: "tailor",
    label: "Tailor",
    badge: "Tailor",
    quote: "Stitched hides, leathers, and woven robes—flexible protection with no metal.",
    pills: [["all", "All Cloth & Leather"], ["robes", "Robes"], ["leather", "Leather & Hide"], ["bone_scale", "Bone & Dragonscale"]],
  },
  magic: {
    id: "magic",
    label: "Magic Shop",
    badge: "Magic Shop",
    quote: "Studied incantations and spell scrolls ready for your casters to master.",
    pills: [],
  },
  arcanist: {
    id: "arcanist",
    label: "Arcanist",
    badge: "Arcanist",
    quote: "Every restorative draught alongside true orbs, crystals, and arcane tomes.",
    pills: [["all", "Potions & Magic Items"], ["consumable", "All Potions"], ["orb", "Orbs"], ["crystal", "Crystals"], ["tome", "Tomes"]],
  },
  adventurer: {
    id: "adventurer",
    label: "Adventurer Shop",
    badge: "Adventurer Shop",
    quote: "Travel cloaks, war-horns, archer quivers, and road kit for the wilds.",
    pills: [["all", "All Field Gear"], ["cloak", "Cloaks"], ["horn", "War-Horns"], ["quiver", "Quivers"]],
  },
  trade_goods: {
    id: "trade_goods",
    label: "Trade Goods Buyer",
    badge: "Trade Goods",
    quote: "Drop any trade goods on the counter and I will weigh them out in Silver.",
    pills: [],
  },
};

// Region-matched unique Reserve NPCs (each portrait used strictly ONCE across all 41 hubs)
const UNIQUE_RESERVE_FOR_HUB = {
  loc_01_overgrown_garden_sanctuary: [
    { name: "Lysander Sterling", roleTitle: "Royal Trade Appraiser", shopPref: "trade_goods", portraitPath: "assets/portraits/npcs/npc_res_guild_appraiser.webp" },
  ],
  loc_02_oakhaven: [
    { name: "Aldous Wheeler", roleTitle: "Heartland Outfitter", shopPref: "adventurer", portraitPath: "assets/portraits/npcs/npc_res_heartland_caravan_master.webp" },
  ],
  loc_06_saltwind_harbor: [
    { name: "Finnegan O'Mara", roleTitle: "Harbor Trade Bosun", shopPref: "trade_goods", portraitPath: "assets/portraits/npcs/npc_res_saltwind_dockhand.webp" },
  ],
  loc_16_briarstead: [
    { name: "Talia Ashridge", roleTitle: "Weald Pathfinder Outfitter", shopPref: "adventurer", portraitPath: "assets/portraits/npcs/npc_res_thornwall_scout.webp" },
  ],
  loc_21_port_veridia: [
    { name: "Samira al-Sahir", roleTitle: "Sunscorch Trail Outfitter", shopPref: "adventurer", portraitPath: "assets/portraits/npcs/npc_res_sunscorch_guide.webp" },
  ],
  loc_31_rimeport: [
    { name: "Torvald Frost-Voice", roleTitle: "Northern Goods Outfitter", shopPref: "adventurer", portraitPath: "assets/portraits/npcs/npc_res_frostmere_skald.webp" },
  ],
  hub_thornwall_border_castle: [
    { name: "Brom Hammerfall", roleTitle: "Thornwall Armorer", shopPref: "armor", portraitPath: "assets/portraits/npcs/npc_res_ironcrest_smith.webp" },
    { name: "Sibyl Bellamy", roleTitle: "Frontier Arcanist", shopPref: "arcanist", portraitPath: "assets/portraits/npcs/npc_res_field_surgeon.webp" },
  ],
};

const NON_MERCHANT_RE = /(innkeeper|chamberlain|rest steward|vanguard medic|arena|pit-master|promoter|champion-master|defender|harbor master|ship captain|boss|overseer)/i;

export function shopIdsForTown(hub) {
  if (hub.id === "loc_69_highcrown_keep") return ["weapon"];
  const kind = `${hub.playerKind || hub.kind || ""} ${hub.name}`.toLowerCase();

  // Cities, Coastal Ports, Bastions & Regional Capitals carry all 7 counters
  if (/capital|walled|harbor|redmarch|border castle|refuge|smithy|war-camp/.test(kind)) {
    return ["weapon", "armor", "tailor", "magic", "arcanist", "adventurer", "trade_goods"];
  }
  // Arcane-backed Border Keeps & Holdfasts
  if (/greenwarden|icecrest|scorchwall|brinecliff/.test(kind)) {
    return ["weapon", "armor", "arcanist", "magic", "trade_goods"];
  }
  // Martial Forts, Citadels & Liberated Keeps
  if (/fort|keep|citadel|manor|cinderwatch/.test(kind)) {
    return ["weapon", "armor", "adventurer", "trade_goods"];
  }
  // Villages, Hamlets & Oasis Hubs
  if (hub.hasMystic || /shrine|oasis|crossing/.test(kind)) {
    return /millbrook|dunespire/.test(kind)
      ? ["weapon", "tailor", "magic", "arcanist", "adventurer", "trade_goods"]
      : ["tailor", "magic", "arcanist", "adventurer", "trade_goods"];
  }
  return ["weapon", "tailor", "adventurer", "trade_goods"];
}

export function buildTownNpcsForHub(hub, rawNpcs) {
  const fixedServiceNpcs = [];
  const shopPool = [];

  for (const r of rawNpcs ?? []) {
    const blob = `${r.roleTitle || ""} ${r.name || ""}`;
    if (NON_MERCHANT_RE.test(blob)) {
      fixedServiceNpcs.push(r);
    } else {
      shopPool.push({
        ...r,
        name: r.id === "npc_loc_01_overgrown_garden_sanctuary_orin_capital_guard" ? "Sgt. Marcus Locke" : r.name,
      });
    }
  }
  for (const res of UNIQUE_RESERVE_FOR_HUB[hub.id] ?? []) {
    shopPool.push({ ...res, id: `res_${hub.id}_${res.shopPref}` });
  }

  const takeMatch = (re, prefId) => {
    let idx = shopPool.findIndex((n) => n.shopPref === prefId);
    if (idx < 0) idx = shopPool.findIndex((n) => re.test(`${n.roleTitle || ""} ${n.name || ""} ${(n.servicesOffered || []).join(" ")}`));
    if (idx < 0 && shopPool.length > 0) idx = 0;
    return idx >= 0 ? shopPool.splice(idx, 1)[0] : null;
  };

  const shopOrder = shopIdsForTown(hub);
  const matchers = {
    weapon: /armorer|smith|forgemaster|quartermaster/i,
    armor: /coliseum armorer|constable|captain|guard|marshal|watch|warden/i,
    tailor: /shepherd|tanner|weaver|beekeeper|clothier|steward|tailor/i,
    magic: /apothecary|scholar|runekeeper|pyromancer|archivist|chronicler|mystic/i,
    arcanist: /herbalist|alchemist|medic|healer|surgeon|apothecary/i,
    adventurer: /trapper|scout|tracker|huntmaster|pathfinder|guide|explorer|navigator|driver/i,
    trade_goods: /grain merchant|coastal merchant|desert merchant|trade guild|appraiser|warehouse|quartermaster|merchant|shipping/i,
  };

  const npcs = [];
  for (const sid of shopOrder) {
    const picked = takeMatch(matchers[sid], sid);
    if (!picked) continue;
    const meta = SHOP_META[sid];
    const hasQuest = Boolean(picked.questsOffered?.length);
    npcs.push({
      id: `shop_${hub.id}_${sid}`,
      shopType: sid,
      isShop: true,
      hasQuest,
      questTitle: picked.questsOffered?.[0] ?? null,
      name: picked.name,
      roleLabel: hasQuest ? `${meta.label} · Quest: ${picked.questsOffered[0]}` : meta.label,
      badge: meta.badge,
      portraitPath: picked.portraitPath,
      quote: meta.quote,
    });
  }

  // Remaining townsfolk + non-merchant service NPCs (Innkeeper / Arena / Harbor / Keep Defenders)
  for (const r of [...shopPool, ...fixedServiceNpcs]) {
    const role = String(r.roleTitle || "Town Resident").replace(/\([^)]*\)/g, "").trim();
    const isInn = /innkeeper|chamberlain|rest/i.test(role);
    npcs.push({
      id: r.id,
      shopType: "npc_service",
      isShop: false,
      hasQuest: Boolean(r.questsOffered?.length),
      questTitle: r.questsOffered?.[0] ?? null,
      name: r.name,
      roleLabel: role,
      badge: isInn ? "Free Inn (0s)" : /arena|pit-master|promoter|champion-master/i.test(role) ? "Arena" : /harbor|ship captain/i.test(role) ? "Ship Port" : r.questsOffered?.length ? "Quest" : "Resident",
      portraitPath: r.portraitPath ?? "assets/portraits/heroes/valen_avatar.webp",
      quote: isInn ? `Warm hearths and beds wait free of charge for your party inside ${hub.name}.` : `Speaking with ${r.name} inside ${hub.name}.`,
    });
  }
  return npcs;
}

export function itemBelongsToShop(item, shopType) {
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

export function applyShopCatFilter(items, shopType, catFilter) {
  if (catFilter === "all") return items;
  if (shopType === "weapon") return items.filter((x) => (catFilter === "1h" ? x.handed === "1H" : x.handed === "2H"));
  if (shopType === "tailor") {
    if (catFilter === "robes") return items.filter((x) => /Robe/i.test(x.subType));
    if (catFilter === "leather") return items.filter((x) => /Leather|Hide/i.test(x.subType));
    return items.filter((x) => /Bone|Dragonscale/i.test(x.subType));
  }
  if (shopType === "magic") return items.filter((x) => x.usableBy?.includes(catFilter));
  return items.filter((x) => x.category === catFilter);
}
