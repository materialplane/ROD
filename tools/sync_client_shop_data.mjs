// Syncs canonical Spells Catalog and assigns all 205 unique Shopkeepers (including dual Quest+Shop NPCs
// and 8 unused Reserve portraits) cleanly into data/ and client/assets/data/ JSON files.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { SPELLS_CATALOG } from "../admin/shops/src/spellsData.js";
import { shopIdsForTown } from "../admin/shops/src/shopTypes.js";

const RESERVE_BY_HUB = {
  loc_01_overgrown_garden_sanctuary: [
    {
      id: "npc_res_guild_appraiser",
      name: "Lysander Sterling",
      roleTitle: "Royal Trade Appraiser",
      category: "merchant_trade",
      shopType: "trade_goods",
      servicesOffered: ["Trade Goods Exchange (Buy Monster Trophies)"],
      portraitPath: "assets/portraits/npcs/npc_res_guild_appraiser.webp",
    },
  ],
  loc_02_oakhaven: [
    {
      id: "npc_res_heartland_caravan_master",
      name: "Aldous Wheeler",
      roleTitle: "Heartland Adventurer Outfitter",
      category: "merchant_adventurer",
      shopType: "adventurer",
      servicesOffered: ["Adventurer Shop (Cloaks, War-Horns & Quivers)"],
      portraitPath: "assets/portraits/npcs/npc_res_heartland_caravan_master.webp",
    },
  ],
  loc_06_saltwind_harbor: [
    {
      id: "npc_res_saltwind_dockhand",
      name: "Finnegan O'Mara",
      roleTitle: "Harbor Trade Appraiser",
      category: "merchant_trade",
      shopType: "trade_goods",
      servicesOffered: ["Trade Goods Exchange (Buy Monster Trophies)"],
      portraitPath: "assets/portraits/npcs/npc_res_saltwind_dockhand.webp",
    },
  ],
  loc_16_briarstead: [
    {
      id: "npc_res_thornwall_scout",
      name: "Talia Ashridge",
      roleTitle: "Weald Pathfinder Outfitter",
      category: "merchant_adventurer",
      shopType: "adventurer",
      servicesOffered: ["Adventurer Shop (Cloaks, War-Horns & Quivers)"],
      portraitPath: "assets/portraits/npcs/npc_res_thornwall_scout.webp",
    },
  ],
  loc_21_port_veridia: [
    {
      id: "npc_res_sunscorch_guide",
      name: "Samira al-Sahir",
      roleTitle: "Sunscorch Trail Outfitter",
      category: "merchant_adventurer",
      shopType: "adventurer",
      servicesOffered: ["Adventurer Shop (Cloaks, War-Horns & Quivers)"],
      portraitPath: "assets/portraits/npcs/npc_res_sunscorch_guide.webp",
    },
  ],
  loc_31_rimeport: [
    {
      id: "npc_res_frostmere_skald",
      name: "Torvald Frost-Voice",
      roleTitle: "Northern Goods Outfitter",
      category: "merchant_adventurer",
      shopType: "adventurer",
      servicesOffered: ["Adventurer Shop (Cloaks, War-Horns & Quivers)"],
      portraitPath: "assets/portraits/npcs/npc_res_frostmere_skald.webp",
    },
  ],
  hub_thornwall_border_castle: [
    {
      id: "npc_res_ironcrest_smith",
      name: "Brom Hammerfall",
      roleTitle: "Thornwall Armorer",
      category: "merchant_armor",
      shopType: "armor",
      servicesOffered: ["Armor Shop (Metal Armor, Helms & Shields)"],
      portraitPath: "assets/portraits/npcs/npc_res_ironcrest_smith.webp",
    },
    {
      id: "npc_res_field_surgeon",
      name: "Sibyl Bellamy",
      roleTitle: "Frontier Arcanist",
      category: "merchant_arcanist",
      shopType: "arcanist",
      servicesOffered: ["Arcanist (Potions, Orbs, Crystals & Tomes)"],
      portraitPath: "assets/portraits/npcs/npc_res_field_surgeon.webp",
    },
  ],
};

const ROLE_LABELS = {
  weapon: "Weapon Shop",
  armor: "Armor Shop",
  tailor: "Tailor",
  magic: "Magic Shop",
  arcanist: "Arcanist",
  adventurer: "Adventurer Shop",
  trade_goods: "Trade Goods Buyer",
};

const MATCHERS = {
  weapon: /armorer|smith|forgemaster|quartermaster/i,
  armor: /coliseum armorer|constable|captain|guard|marshal|watch|warden/i,
  tailor: /shepherd|tanner|weaver|beekeeper|clothier|steward|tailor/i,
  magic: /apothecary|scholar|runekeeper|pyromancer|archivist|chronicler|mystic/i,
  arcanist: /herbalist|alchemist|medic|healer|surgeon|apothecary/i,
  adventurer: /trapper|scout|tracker|huntmaster|pathfinder|guide|explorer|navigator|driver/i,
  trade_goods: /grain merchant|coastal merchant|desert merchant|trade guild|appraiser|warehouse|quartermaster|merchant|shipping/i,
};

const NON_MERCHANT_RE = /(innkeeper|chamberlain|rest steward|vanguard medic|arena|pit-master|promoter|champion-master|defender|harbor master|ship captain|boss|overseer)/i;

// 1. Write canonical spells-catalog.json (preserving exported 1:1 spell cards whenever present)
const wiredSpells = SPELLS_CATALOG.map((sp) => {
  const cardRel = `assets/icons/spells/${sp.id}.webp`;
  return existsSync(`client/${cardRel}`) ? { ...sp, iconPath: cardRel } : sp;
});
const spellsJson = JSON.stringify({
  version: 2,
  source: "docs/05-cast-and-skills.md (Classic FF Magic Shop Spell Catalog)",
  totalSpells: wiredSpells.length,
  spells: wiredSpells,
}, null, 2);
writeFileSync("data/spells-catalog.json", spellsJson, "utf8");
writeFileSync("client/assets/data/spells-catalog.json", spellsJson, "utf8");

// 2. Sync explicit shopType onto unique NPCs across all 41 hubs in npcs-catalog.json
const world = JSON.parse(readFileSync("data/world-locations.json", "utf8"));
const npcsDoc = JSON.parse(readFileSync("data/npcs-catalog.json", "utf8"));
const hubsById = Object.fromEntries(
  world.locations
    .filter((l) => l.interiorAssetPath && !l.id.endsWith("::tavern"))
    .map((l) => [l.id, l])
);
hubsById["loc_69_highcrown_keep"] = { id: "loc_69_highcrown_keep", name: "Highcrown Keep", playerKind: "Royal Keep", region: 1 };

const seenShopPortraits = new Map();
let totalShopNpcs = 0;

for (const group of npcsDoc.locations) {
  const hub = hubsById[group.locationId];
  if (!hub) continue;

  // Strip any previously appended reserve entries so script is idempotent
  const existing = (group.npcs || [])
    .filter((n) => !n.id.startsWith("npc_res_"))
    .map((n) => {
      const copy = { ...n };
      delete copy.shopType;
      delete copy.shopLabel;
      return copy;
    });

  const hasMys = existing.some((x) => /(apothecary|caster outfitter|mystic)/i.test(x.roleTitle || ""));
  const needed = shopIdsForTown({ ...hub, hasMystic: hasMys });
  const addedReserves = RESERVE_BY_HUB[hub.id] || [];
  for (const res of addedReserves) existing.push({ ...res });

  const eligibleIndices = existing
    .map((npc, idx) => ({ npc, idx }))
    .filter(({ npc }) => !NON_MERCHANT_RE.test(`${npc.roleTitle || ""} ${npc.name || ""}`));

  const takenIdx = new Set();
  for (const sid of needed) {
    let pick = eligibleIndices.find(({ npc, idx }) => !takenIdx.has(idx) && npc.shopType === sid);
    if (!pick) {
      pick = eligibleIndices.find(({ npc, idx }) =>
        !takenIdx.has(idx) && MATCHERS[sid].test(`${npc.roleTitle || ""} ${npc.name || ""} ${(npc.servicesOffered || []).join(" ")}`)
      );
    }
    if (!pick) pick = eligibleIndices.find(({ idx }) => !takenIdx.has(idx));
    if (!pick) throw new Error(`Missing NPC slot in ${hub.name} for ${sid}`);

    takenIdx.add(pick.idx);
    pick.npc.shopType = sid;
    pick.npc.shopLabel = ROLE_LABELS[sid];
    totalShopNpcs++;

    if (!existsSync(`client/${pick.npc.portraitPath}`)) {
      throw new Error(`Missing portrait on disk: client/${pick.npc.portraitPath}`);
    }
    if (seenShopPortraits.has(pick.npc.portraitPath)) {
      throw new Error(`Duplicate portrait ${pick.npc.portraitPath}: ${seenShopPortraits.get(pick.npc.portraitPath)} vs ${hub.name}`);
    }
    seenShopPortraits.set(pick.npc.portraitPath, `${hub.name} :: ${pick.npc.name}`);
  }

  group.npcs = existing;
  group.npcCount = existing.length;
}

const npcsJson = JSON.stringify(npcsDoc, null, 2);
writeFileSync("data/npcs-catalog.json", npcsJson, "utf8");
writeFileSync("client/assets/data/npcs-catalog.json", npcsJson, "utf8");

// Ensure client items-catalog.json mirrors root data/items-catalog.json cleanly
writeFileSync("client/assets/data/items-catalog.json", readFileSync("data/items-catalog.json", "utf8"), "utf8");

console.log(`Synced ${SPELLS_CATALOG.length} spells and ${totalShopNpcs} unique shopkeepers (${seenShopPortraits.size} unique portraits, 0 duplicates).`);
