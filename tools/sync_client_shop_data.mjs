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
      servicesOffered: ["Trade Goods Exchange (Buy Trade Goods)"],
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
      servicesOffered: ["Trade Goods Exchange (Buy Trade Goods)"],
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
      servicesOffered: ["Armor Shop (Armor, Helms & Shields)"],
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
  weapon: /(?!coliseum armorer)\b(armorer|blacksmith|smith|forgemaster|quartermaster)\b/i,
  armor: /coliseum armorer|constable|captain|guard|marshal|watch|warden/i,
  tailor: /shepherd|tanner|weaver|beekeeper|clothier|steward|tailor/i,
  magic: /caster outfitter|mystic|scholar|runekeeper|pyromancer|archivist|chronicler/i,
  arcanist: /apothecary|herbalist|alchemist|medic|healer|surgeon/i,
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
    .filter(
      (l) =>
        l.interiorAssetPath &&
        !l.id.endsWith("::tavern") &&
        !l.id.startsWith("outpost_") &&
        !l.id.startsWith("tr_port_")
    )
    .map((l) => [l.id, l])
);
hubsById["loc_69_highcrown_keep"] = { id: "loc_69_highcrown_keep", name: "Highcrown Keep", playerKind: "Royal Keep", region: 1 };

const seenShopPortraits = new Map();
let totalShopNpcs = 0;

for (const group of npcsDoc.locations) {
  const hub = hubsById[group.locationId];
  if (!hub) continue;

  const tierList = Array.isArray(hub.gearTiers) && hub.gearTiers.length > 0 ? hub.gearTiers : [];
  const tierLabel = tierList.length > 1 ? `Gear Tiers ${tierList[0]}–${tierList[tierList.length - 1]}` : tierList.length === 1 ? `Gear Tier ${tierList[0]}` : null;
  const spTierLabel = hub.spellTier ? `Tier-${hub.spellTier} Spells` : null;

  // Strip any previously appended reserve entries so script is idempotent
  const existing = (group.npcs || [])
    .filter((n) => !n.id.startsWith("npc_res_"))
    .map((n) => {
      const copy = { ...n };
      delete copy.shopType;
      delete copy.shopLabel;
      if (tierLabel && typeof copy.roleTitle === "string" && /(?:Gear\s+)?(?:Steps?|Tiers?)\s*\d+/i.test(copy.roleTitle)) {
        copy.roleTitle = copy.roleTitle.replace(/\(\s*(?:Gear\s+)?(?:Steps?|Tiers?)\s*\d+(?:\s*[–-]\s*\d+)?([^)]*)\)/gi, `(${tierLabel}$1)`);
      }
      if (tierLabel && Array.isArray(copy.servicesOffered)) {
        copy.servicesOffered = copy.servicesOffered.map((s) =>
          s.replace(/\(\s*(?:Gear\s+)?(?:Steps?|Tiers?)\s*\d+(?:\s*[–-]\s*\d+)?([^)]*)\)/gi, `(${tierLabel}$1)`)
        );
      }
      if (spTierLabel && typeof copy.roleTitle === "string" && /Caster Outfitter/i.test(copy.roleTitle)) {
        copy.roleTitle = copy.roleTitle.replace(/\(\s*(?:Remaining\s+)?Tier[-\s]*\d+\s*\)/gi, `(${spTierLabel})`);
      }
      if (spTierLabel && Array.isArray(copy.servicesOffered)) {
        copy.servicesOffered = copy.servicesOffered.map((s) =>
          /Caster Outfitter/i.test(s) ? s.replace(/\(\s*(?:Remaining\s+)?Tier[-\s]*\d+\s*\)/gi, `(${spTierLabel})`) : s
        );
      }
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
  const pickedBySid = new Map();
  const priorityOrder = ["weapon", "armor", "arcanist", "magic", "tailor", "adventurer", "trade_goods"];
  for (const sid of priorityOrder) {
    if (!needed.includes(sid)) continue;
    let pick = eligibleIndices.find(({ npc, idx }) => !takenIdx.has(idx) && npc.shopType === sid);
    if (!pick) {
      pick = eligibleIndices.find(({ npc, idx }) =>
        !takenIdx.has(idx) && MATCHERS[sid].test(`${npc.roleTitle || ""} ${npc.name || ""} ${(npc.servicesOffered || []).join(" ")}`)
      );
    }
    if (pick) {
      takenIdx.add(pick.idx);
      pickedBySid.set(sid, pick);
    }
  }
  for (const sid of needed) {
    if (pickedBySid.has(sid)) continue;
    const pick = eligibleIndices.find(({ idx }) => !takenIdx.has(idx));
    if (!pick) throw new Error(`Missing NPC slot in ${hub.name} for ${sid}`);
    takenIdx.add(pick.idx);
    pickedBySid.set(sid, pick);
  }
  for (const sid of needed) {
    const pick = pickedBySid.get(sid);
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
