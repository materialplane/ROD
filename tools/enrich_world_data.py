"""Enrich data/world-locations.json and client/assets/data/world-locations.json using all 178 unique quests."""

from __future__ import annotations

import json
import re
from pathlib import Path

from player_location_lore import PLAYER_LORE_BY_ID

ROOT = Path(r"C:\Users\drew0\Documents\ROD")
WORLD_PATH = ROOT / "data" / "world-locations.json"
CLIENT_WORLD_PATH = ROOT / "client" / "assets" / "data" / "world-locations.json"
QUESTS_CATALOG_PATH = ROOT / "data" / "quests-catalog.json"

HUB_CUSTOM_DETAILS: dict[str, dict] = {
    "loc_01_overgrown_garden_sanctuary": {
        "name": "Highcrown",
        "kind": "Royal Capital City",
        "description": "Ethoria's besieged Royal Capital in the green Crownlands heartland—home to Highcrown Keep, the Great Coliseum where Koren fell, and the overgrown palace gardens above the dry aqueducts.",
        "services": ["Royal Capital Hub (Pick 4 of 6 Heroes)", "Free Capital Inn", "Great Coliseum", "Starter Gear (Step 1)", "Houses Highcrown Keep (#69)", "4 Local Quests"],
    },
    "loc_02_oakhaven": {
        "description": "Walled Crownlands heartland entry town with blacksmith anvil, armory, town tourney ring, mystic shop, and free inn.",
        "services": ["Free Inn", "Local Fighting Arena", "Armory (Gear Steps 1–2)", "Tier-1 Skills", "5 Local Quests"],
    },
    "hub_meadowbrook_hamlet": {
        "description": "Sunny meadow agricultural village flanked by split-rail sheep pastures and wheat barns.",
        "services": ["Free Inn", "Armory & Provisions (Gear Step 2)", "Tier-1 Skills", "4 Local Quests"],
    },
    "loc_04_millbrook_crossing": {
        "description": "Dry frontier dirt-crossroads settlement in the harder half of Region 1.",
        "services": ["Free Inn", "Armory (Gear Step 3)", "Remaining Tier-1 Skills", "5 Local Quests"],
    },
    "hub_crownlands_hill_fort": {
        "description": "Timber-and-stone eastern border watch-fort guarding the hills near The Ashen Gate.",
        "services": ["Free Rest Barracks", "Garrison Armory (Gear Step 3)", "4 Local Quests"],
    },
    "loc_05_the_ashen_gate": {
        "levelRange": "Lv 11–15 · Boss #1",
        "description": "Portal Dungeon #1 in Zone 3 (Lv 11–15) of the Crownlands. Charred basalt archway linking to Earth & Forge — requires the Ashen Forge Keystone catalyst from Saltwind Harbor's Cracked Lighthouse.",
        "services": ["Portal Dungeon #1 (Zone 3 · Lv 11–15)", "Requires: Ashen Forge Keystone", "Disappears When Cleared"],
        "bossInfo": {"plane": "Elemental Plane of Earth & Forge", "boss": "The Ashen Iron Golem (Construct)", "guardPips": 3, "weaknesses": "Bludgeoning, Frost, Radiant"},
    },
    "loc_06_saltwind_harbor": {
        "description": "Fortified coastal port city on the northern bay linking Ethoria by sea, featuring a dockside fighting pit.",
        "services": ["Free Inn", "Ship Port", "Dockside Fighting Arena", "Armory (Gear Step 4)", "Tier-2 Skills", "5 Local Quests"],
    },
    "hub_brinecliff_watch_fort": {
        "description": "Limestone sea-cliff patrol fort watching coastal reefs and smuggler coves.",
        "services": ["Free Rest Barracks", "Armory (Gear Step 5)", "Tier-2 Skills", "4 Local Quests"],
    },
    "hub_reedfen_village": {
        "description": "Saltmarsh reed-thatch fishing village anchored on solid marsh turf with drying nets and skiffs.",
        "services": ["Free Inn", "Provisions & Gear (Step 5)", "4 Local Quests"],
    },
    "loc_09_mirewatch_post": {
        "description": "Elevated swamp-edge timber outpost deep in the Saltmarsh wetlands.",
        "services": ["Free Inn", "Armory (Gear Step 6)", "Remaining Tier-2 Skills", "5 Local Quests"],
    },
    "hub_tidewater_keep": {
        "levelRange": "Lv 21–25 · Step 6",
        "description": "Coastal granite sea-wall castle guarding the treacherous approach to The Sunken Maw, with an inner courtyard sparring arena.",
        "services": ["Free Rest Barracks", "Local Fighting Arena", "Keep Armory (Gear Step 6)", "4 Local Quests"],
    },
    "loc_10_the_sunken_maw": {
        "levelRange": "Lv 21–25 · Boss #2",
        "description": "Portal Dungeon #2 in Zone 5 (Lv 21–25) of the Saltmarsh Coast. Standing tidal archway into deep abyssal waters — requires the Abyssal Brine-Pearl catalyst from Tidewater Keep's Shellback Shore Bluff.",
        "services": ["Portal Dungeon #2 (Zone 5 · Lv 21–25)", "Requires: Abyssal Brine-Pearl", "Disappears When Cleared"],
        "bossInfo": {"plane": "Elemental Plane of Water & Deep Trench", "boss": "The Abyssal Aboleth (Aberration)", "guardPips": 3, "weaknesses": "Lightning, Piercing, Fire"},
    },
    "loc_11_redmarch_bastion": {
        "description": "Fortified border garrison town guarding Thornwall Warfronts with Region 3 steel and a bailey gladiatorial ring.",
        "services": ["Free Inn", "Garrison Fighting Arena", "Armory (Gear Steps 7–9)", "Tier-3 Skills", "5 Local Quests"],
    },
    "hub_goldmoor_village": {
        "description": "Sunny golden-ochre highland farming settlement catching border skirmish spillover.",
        "services": ["Free Inn", "Armory (Gear Step 8)", "4 Local Quests"],
    },
    "hub_slatepeak_mining_fort": {
        "description": "Gray-slate quarry fortress overlooking Highland iron smelters and passes.",
        "services": ["Free Rest Barracks", "Smithy & Gear (Step 8)", "5 Local Quests"],
    },
    "hub_thornwall_border_castle": {
        "description": "Golden-hour border citadel holding the loyalist front line against House Hollowstone.",
        "services": ["Free Rest Barracks", "War Armory (Gear Step 9)", "4 Local Quests"],
    },
    "loc_13_hollowstone_keep": {
        "levelRange": "Lv 35–39 · Chain C2",
        "description": "Noble highland stronghold of Rival House Hollowstone contesting King Garrick's vacant throne, featuring an inner tourney duel yard.",
        "services": ["Rival Noble Stronghold", "Noble Tourney Arena", "Chain C Step 2 Boss Keep", "5 Liberation Quests"],
        "bossInfo": {"plane": "Ethoria Faction Warfront", "boss": "Lord Hollowstone & Tamed Ettin", "guardPips": 3, "weaknesses": "Fire, Lightning"},
    },
    "loc_15_the_iron_rift": {
        "levelRange": "Lv 36–40 · Boss #3",
        "description": "Portal Dungeon #3 in Zone 8 (Lv 36–40) of Thornwall Warfronts. Forged-iron archway into Blood-Iron Warlands — requires the Blood-Iron Keystone catalyst from Hollowstone Keep's Iron-Rift Giant Redoubt.",
        "services": ["Portal Dungeon #3 (Zone 8 · Lv 36–40)", "Requires: Blood-Iron Keystone", "Disappears When Cleared"],
        "bossInfo": {"plane": "Blood-Iron Warlands (Ysgard / Giant Steppes)", "boss": "The Fire Giant Warlord (Giant)", "guardPips": 4, "weaknesses": "Frost, Piercing, Bludgeoning"},
    },
    "loc_16_briarstead": {
        "description": "Timber-palisade forest town famous for apothecaries, hunters, woodland tourney ring, and Region 4 gear.",
        "services": ["Free Inn", "Woodland Fighting Arena", "Armory (Gear Steps 10–12)", "Tier-4 Skills", "5 Local Quests"],
    },
    "hub_timberfall_village": {
        "description": "Emerald forest sawyer settlement bordered by stacked pine timber and deep canopy trails.",
        "services": ["Free Inn", "Woodland Gear (Step 11)", "4 Local Quests"],
    },
    "hub_mosswood_hamlet": {
        "description": "Sun-dappled mossy glade hamlet tucked beside ancient standing stones and forest shrines.",
        "services": ["Free Inn", "Apothecary & Gear (Step 11)", "4 Local Quests"],
    },
    "hub_greenwarden_fort": {
        "description": "Oak-log ranger fortress holding the quarantine border before the darkened plague woods, with an inner sparring pit.",
        "services": ["Free Rest Barracks", "Local Fighting Arena", "Ranger Armory (Step 12)", "5 Local Quests"],
    },
    "hub_blightwatch_keep": {
        "levelRange": "Lv 45–50 · Step 12",
        "description": "Stone quarantine fortress guarding the shadowed fungal woods approaching The Rotspire.",
        "services": ["Free Rest Barracks", "Keep Armory (Step 12)", "4 Local Quests"],
    },
    "loc_20_the_rotspire": {
        "levelRange": "Lv 46–50 · Boss #4",
        "description": "Portal Dungeon #4 in Zone 10 (Lv 46–50) of the Plague Woods. Moss-bound stone archway into the Corrupted Feywild — requires the Spore-Heart Amber catalyst from Blightwatch Keep's Rotspire Approach Gate.",
        "services": ["Portal Dungeon #4 (Zone 10 · Lv 46–50)", "Requires: Spore-Heart Amber", "Disappears When Cleared"],
        "bossInfo": {"plane": "Corrupted Feywild & Spore-Mire", "boss": "The Elder Blight-Treant (Plant & Ooze)", "guardPips": 4, "weaknesses": "Fire, Slashing, Radiant"},
    },
    "loc_21_port_veridia": {
        "description": "Sun-bleached coastal spice-trade port city linking sea routes across the Sun-Scorched Isles, featuring a desert coastal fighting arena.",
        "services": ["Free Inn", "Ship Port", "Coastal Fighting Arena", "Armory (Gear Steps 13–14)", "Tier-5 Skills", "5 Local Quests"],
    },
    "hub_sunstone_caravan_post": {
        "description": "Desert trade caravan stop tucked beside wind-carved dunes and sandstone water cellars.",
        "services": ["Free Inn", "Desert Caravan Armory (Step 14)", "4 Local Quests"],
    },
    "loc_23_dunespire_oasis": {
        "description": "Sheltered desert oasis hub ringed by woven merchant tents around a clear palm spring.",
        "services": ["Free Inn", "Armory (Gear Step 15)", "Remaining Tier-5 Skills", "5 Local Quests"],
    },
    "hub_sandwall_citadel": {
        "description": "Sun-baked orange sandstone desert fortress holding the frontier approach against slavers and dragons, with a desert garrison arena.",
        "services": ["Free Rest Barracks", "Desert Fighting Arena", "Citadel Armory (Step 15)", "4 Local Quests"],
    },
    "loc_24_gilded_auction_manor": {
        "levelRange": "Lv 60–64 · Chain A3",
        "description": "Fortified sandstone estate and gladiator blood-pit of the Slaver Baron where Mera's mother is held captive (Chain A Climax).",
        "services": ["Rival Slaver Estate", "Slaver Fighting Pit", "Chain A Step 3 Climax", "4 Liberation Quests"],
        "bossInfo": {"plane": "Ethoria Slaver Stronghold", "boss": "Slaver Baron & Chimera War-Hound", "guardPips": 4, "weaknesses": "Frost, Piercing"},
    },
    "loc_25_the_scorched_chasm": {
        "levelRange": "Lv 61–65 · Boss #5",
        "description": "Portal Dungeon #5 in Zone 13 (Lv 61–65) of the Sun-Scorched Isles. Sandstone & brass archway to the City of Brass — requires the Brass Cinder-Seal catalyst from The Gilded Auction Manor's Scorched Chasm Scout Nest.",
        "services": ["Portal Dungeon #5 (Zone 13 · Lv 61–65)", "Requires: Brass Cinder-Seal", "Disappears When Cleared"],
        "bossInfo": {"plane": "Elemental Plane of Fire (City of Brass)", "boss": "The Efreeti Pasha (Elemental)", "guardPips": 4, "weaknesses": "Frost, Piercing, Bludgeoning"},
    },
    "loc_26_highpass_refuge": {
        "description": "Alpine cliff town terraced along sunny green mountain ridges with a cobbled duel ring, Region 6 gear, and skills.",
        "services": ["Free Inn", "Local Fighting Arena", "Armory (Gear Steps 16–17)", "Tier-6 Skills", "5 Local Quests"],
    },
    "hub_clearwater_lake_village": {
        "description": "Snow-free alpine lakeside fishing town resting beside crystal sapphire highland waters.",
        "services": ["Free Inn", "Lakeside Outfitters (Step 17)", "4 Local Quests"],
    },
    "loc_27_anvilhall_forge": {
        "description": "Legendary granite mountain smithy housing a guild trial-by-combat ring, Gear Step 18, and final Tier-6 master skills.",
        "services": ["Free Rest Hall", "Guild Trial Arena", "Armory (Gear Step 18)", "Remaining Tier-6 Skills", "5 Local Quests"],
    },
    "hub_cragwatch_fort": {
        "description": "Granite ridge garrison guarding high highland wyvern territories and mountain passes.",
        "services": ["Free Rest Barracks", "Garrison Armory (Step 18)", "4 Local Quests"],
    },
    "hub_stormhold_citadel": {
        "levelRange": "Lv 70–75 · Step 18",
        "description": "Monumental storm-lashed granite citadel standing below The Storm-Crowned Spire, hosting a highland champion arena.",
        "services": ["Free Rest Barracks", "Champion Fighting Arena", "Storm Citadel Armory (Step 18)", "4 Local Quests"],
    },
    "loc_30_storm_crowned_spire": {
        "levelRange": "Lv 71–75 · Boss #6",
        "description": "Portal Dungeon #6 in Zone 15 (Lv 71–75) of Ironcrest Highlands. Granite terrace archway into the Dragon Crags — requires the Storm-Crown Lodestone catalyst from Stormhold Citadel's Storm-Spire Giant Terrace.",
        "services": ["Portal Dungeon #6 (Zone 15 · Lv 71–75)", "Requires: Storm-Crown Lodestone", "Disappears When Cleared"],
        "bossInfo": {"plane": "Elemental Plane of Air & Dragon Crags", "boss": "The Ancient Storm Dragon (Blue Dragon)", "guardPips": 5, "weaknesses": "Frost, Piercing, Shadow"},
    },
    "loc_31_rimeport": {
        "description": "Ice-locked sea port city linking sea ships, an ice-harbor fighting pit, Tier-7 skills, and Region 7 gear.",
        "services": ["Free Inn", "Ship Port", "Harbor Fighting Arena", "Armory (Gear Steps 19–21)", "Tier-7 Skills", "5 Local Quests"],
    },
    "hub_frostmere_village": {
        "description": "Snowbound timber trapper village perched beside a frozen cobalt lake.",
        "services": ["Free Inn", "Winter Outfitters (Step 20)", "4 Local Quests"],
    },
    "hub_glacierwatch_fort": {
        "description": "Frost-draped granite and dark iron border fortress anchored beside towering glacial ice cliffs.",
        "services": ["Free Rest Barracks", "Glacier Armory (Step 20)", "4 Local Quests"],
    },
    "hub_icecrest_holdfast": {
        "description": "Fortified northern clan stone lodge and ringwall defying Marshal Bleakwatch's levies.",
        "services": ["Free Rest Hall", "Clan Armory (Step 21)", "4 Local Quests"],
    },
    "loc_34_bleakwatch_citadel": {
        "levelRange": "Lv 85–89 · Chain C3",
        "description": "Snow-swept warlord fortress and ice fighting pit of Marshal Bleakwatch, last rival throne-claimant (Chain C Climax).",
        "services": ["Rival Warlord Fortress", "Warlord Fighting Pit", "Chain C Step 3 Climax", "5 Liberation Quests"],
        "bossInfo": {"plane": "Ethoria Warlord Stronghold", "boss": "Marshal Bleakwatch & Ice Devil Enforcer", "guardPips": 4, "weaknesses": "Fire, Radiant"},
    },
    "loc_35_the_pale_abyss": {
        "levelRange": "Lv 86–90 · Boss #7",
        "description": "Portal Dungeon #7 in Zone 18 (Lv 86–90) of Frostbound Reach. Frost-rimmed basalt archway into the Nine Hells — requires the Pale-Abyss Ice-Seal catalyst from Bleakwatch Citadel's Pale-Abyss Vanguard Redoubt.",
        "services": ["Portal Dungeon #7 (Zone 18 · Lv 86–90)", "Requires: Pale-Abyss Ice-Seal", "Disappears When Cleared"],
        "bossInfo": {"plane": "The Nine Hells & The Abyss (Frozen Pit)", "boss": "The Pit Fiend General (Fiend)", "guardPips": 5, "weaknesses": "Radiant, Frost, Bludgeoning"},
    },
    "loc_36_ashenford_war_camp": {
        "description": "Final forward rebel base before Black Keep, stocking Gear Steps 22–24 and Tier-8 skills.",
        "services": ["Free Inn", "Armory (Gear Steps 22–24)", "Tier-8 Skills", "5 Local Quests"],
    },
    "hub_cinderwatch_bastion": {
        "description": "Volcanic basalt forward bastion holding ash-scree lines against Eclipse Cultists.",
        "services": ["Free Rest Barracks", "Bastion Armory (Step 23)", "4 Local Quests"],
    },
    "hub_ashvale_village": {
        "description": "Fortified ash-basin survivor town guarding routes toward the Dreadwaste War-Pit ruins.",
        "services": ["Free Inn", "Survivor Smithy (Step 23)", "5 Local Quests"],
    },
    "hub_scorchwall_fort": {
        "levelRange": "Lv 96–98 · Step 24",
        "description": "Obsidian coastal fort overlooking the haunted ash bay and Zone 20 approaches toward Black Keep.",
        "services": ["Free Rest Barracks", "Obsidian Armory (Step 24)", "4 Local Quests"],
    },
    "loc_40_garricks_black_keep": {
        "levelRange": "Lv 96–99 · Final Keep",
        "description": "King Garrick's towering volcanic basalt stronghold where all 6 heroes reunite for the final campaign siege.",
        "services": ["Final Stronghold", "Houses Portal #8 (The Eclipse Gate)", "5 Final Siege Quests"],
        "bossInfo": {"plane": "King Garrick's Seat", "boss": "Leads Directly Into King Garrick Finale", "guardPips": 5, "weaknesses": "Radiant, Piercing, Lightning"},
    },
    "loc_39_the_eclipse_gate": {
        "levelRange": "Lv 96–99 · Final Boss #8",
        "description": "Portal Dungeon #8 in Zone 20 (Lv 96–99) inside Black Keep. Final obsidian temple gate guarded by King Garrick — requires the Interlocking Wolf Pendant catalyst (stolen from Valen after Koren's death and entrusted to the Abyssal Eclipse Guard) from Unbind the Final Ward-Seal.",
        "services": ["Final Portal Dungeon #8 (Zone 20 · Lv 96–99)", "Requires: Interlocking Wolf Pendant", "Campaign Finale"],
        "bossInfo": {"plane": "The Shadowfell (Realm of Death)", "boss": "King Garrick, Sovereign of the Undead Eclipse (2 Phases)", "guardPips": 6, "weaknesses": "P1: Radiant/Piercing/Lightning · P2: Radiant/Fire/Bludgeoning"},
    },
}

PORTAL_CATALYSTS: dict[str, dict] = {
    "loc_05_the_ashen_gate": {
        "keyId": "cat_ashen_forge_keystone",
        "name": "Ashen Forge Keystone",
        "questId": "q025",
        "questNum": 25,
        "questTitle": "The Cracked Lighthouse",
        "hubName": "Saltwind Harbor",
        "markerId": "qf_r2_cracked_lighthouse",
        "zoneTier": "Zone 3 · Lv 11–15",
    },
    "loc_10_the_sunken_maw": {
        "keyId": "cat_abyssal_brine_pearl",
        "name": "Abyssal Brine-Pearl",
        "questId": "q044",
        "questNum": 44,
        "questTitle": "Outer Abyssal Watch",
        "hubName": "Tidewater Keep",
        "markerId": "qf_r2_q044_shellback_shore_bluff",
        "zoneTier": "Zone 5 · Lv 21–25",
    },
    "loc_15_the_iron_rift": {
        "keyId": "cat_blood_iron_keystone",
        "name": "Blood-Iron Keystone",
        "questId": "q067",
        "questNum": 67,
        "questTitle": "Shatter the Stone-Giant Picket",
        "hubName": "Hollowstone Keep",
        "markerId": "qf_r3_q067_giant_boulder_picket",
        "zoneTier": "Zone 8 · Lv 36–40",
    },
    "loc_20_the_rotspire": {
        "keyId": "cat_spore_heart_amber",
        "name": "Spore-Heart Amber",
        "questId": "q089",
        "questNum": 89,
        "questTitle": "Hold the Quarantine Gate",
        "hubName": "Blightwatch Keep",
        "markerId": "qf_r4_q089_rotspire_quarantine_gate",
        "zoneTier": "Zone 10 · Lv 46–50",
    },
    "loc_25_the_scorched_chasm": {
        "keyId": "cat_brass_cinder_seal",
        "name": "Brass Cinder-Seal",
        "questId": "q111",
        "questNum": 111,
        "questTitle": "Guard Against Efreeti Scouts",
        "hubName": "The Gilded Auction Manor",
        "markerId": "qf_scorched_scale_beast_nest",
        "zoneTier": "Zone 13 · Lv 61–65",
    },
    "loc_30_storm_crowned_spire": {
        "keyId": "cat_storm_crown_lodestone",
        "name": "Storm-Crown Lodestone",
        "questId": "q133",
        "questNum": 133,
        "questTitle": "Silence the Storm-Giant Warband",
        "hubName": "Stormhold Citadel",
        "markerId": "qf_r6_q133_storm_giant_terrace",
        "zoneTier": "Zone 15 · Lv 71–75",
    },
    "loc_35_the_pale_abyss": {
        "keyId": "cat_pale_abyss_ice_seal",
        "name": "Pale-Abyss Ice-Seal",
        "questId": "q155",
        "questNum": 155,
        "questTitle": "Gatekeepers of the Abyss",
        "hubName": "Bleakwatch Citadel",
        "markerId": "qf_r7_q155_abyss_bridgehead_bastion",
        "zoneTier": "Zone 18 · Lv 86–90",
    },
    "loc_39_the_eclipse_gate": {
        "keyId": "cat_interlocking_wolf_pendant",
        "name": "Interlocking Wolf Pendant",
        "questId": "q178",
        "questNum": 178,
        "questTitle": "Unbind the Final Ward-Seal",
        "hubName": "Garrick's Black Keep",
        "markerId": "qf_r8_q178_throne_seal_threshold",
        "zoneTier": "Zone 20 · Lv 96–99",
    },
}

OUTPOST_CUSTOM_DETAILS: dict[str, dict] = {
    "outpost_z01_meadowgate": {
        "kind": "Meadow Palisade Fort",
        "description": "Sunlit Crownlands oak-timber palisade hunting fort with a pointed gatehouse tower, split-rail hitching post, and lantern-lit horned skull arch where royal scouts post silver bounties on wandering wolves and pasture pests.",
        "services": ["Free Field Rest", "Hunt Quartermaster (Local Bounties)"],
    },
    "outpost_z02_oakwood": {
        "kind": "Woodland Palisade Fort",
        "description": "Sun-dappled oak-log palisade stockade fort fitted with a bark-shingled gatehouse, wolf-pelt drying frames, bow racks, and a stone fire-ring where Crownlands rangers coordinate patrols against aggressive woodland beasts.",
        "services": ["Free Field Rest", "Hunt Quartermaster (Local Bounties)"],
    },
    "outpost_z03_slate_ridge": {
        "kind": "Foothill Scout Bunker",
        "description": "Gray-slate hillside bunker with a low timber palisade, brass signal horn, and outdoor map table overlooking the upland foothill trails toward eastern raider ridges.",
        "services": ["Free Field Rest", "Hunt Quartermaster (Local Bounties)"],
    },
    "outpost_z04_brinefen": {
        "kind": "Coastal Palisade Sea-Fort",
        "description": "Salt-weathered coastal stone-and-driftwood palisade sea-fort stacked with wooden crab cages, harpoon racks, and watch lanterns where shoreline trackers post bounties on reef and tide-pool beasts.",
        "services": ["Free Field Rest", "Hunt Quartermaster (Local Bounties)"],
    },
    "outpost_z05_bogwarden": {
        "kind": "Saltmarsh Palisade Fort",
        "description": "Elevated cypress-timber saltmarsh palisade fort anchored on thick wooden pilings and solid marsh turf amidst cattail reeds, hung with netting and smoking iron smudge pots where mire wardens thin dangerous bog creatures.",
        "services": ["Free Field Rest", "Hunt Quartermaster (Local Bounties)"],
    },
    "outpost_z06_ochre_downs": {
        "kind": "Highland Palisade Fort",
        "description": "Earth-and-oak frontier palisade fort with corner watchtowers, an enclosed horse paddock, and crossbow target bales set across golden-ochre meadowlands where frontier trackers post bounties on prowling worgs and pasture predators.",
        "services": ["Free Field Rest", "Hunt Quartermaster (Local Bounties)"],
    },
    "outpost_z07_cragspire": {
        "kind": "Quarry Watch-Post",
        "description": "Gray-slate stone watch-outpost tucked beneath crag boulders beside a glowing tripod brazier, staffed by iron-route wardens paying silver to clear giants and ridge beasts.",
        "services": ["Free Field Rest", "Hunt Quartermaster (Local Bounties)"],
    },
    "outpost_z08_fernbrook": {
        "kind": "Clearing Ranger Station",
        "description": "Moss-roofed timber ranger station in a bright Weald clearing equipped with fletching benches and stacked lumber where border scouts monitor creatures emerging from the deeper woods.",
        "services": ["Free Field Rest", "Hunt Quartermaster (Local Bounties)"],
    },
    "outpost_z09_canopy_watch": {
        "kind": "Treetop Palisade Fort",
        "description": "Enclosed cedar palisade treetop fort wedged securely around ancient oaks with rope hoists, archer galleries, and brass signal horns keeping watch over dense forest canopy trails.",
        "services": ["Free Field Rest", "Hunt Quartermaster (Local Bounties)"],
    },
    "outpost_z10_mire_edge": {
        "kind": "Quarantine Perimeter Camp",
        "description": "Timber perimeter palisade lit by green lime-smoke braziers and apothecary racks where wardens hire brave hands to cull spore-touched blight horrors from the glade.",
        "services": ["Free Field Rest", "Hunt Quartermaster (Local Bounties)"],
    },
    "outpost_z11_dune_runner": {
        "kind": "Desert Palisade Fort",
        "description": "Sun-baked sandstone-and-cedar desert palisade fort fitted with spiked stockade ramparts, clay water amphorae, and spear stands where nomad outriders trade silver bounties for thinning sandstone dune beasts.",
        "services": ["Free Field Rest", "Hunt Quartermaster (Local Bounties)"],
    },
    "outpost_z12_palm_spring": {
        "kind": "Oasis Palisade Fort",
        "description": "Desert palm-oasis fortified sandstone-and-timber palisade outpost with corner watchtowers, mounted beast-skull trophies, and brass lanterns where caravan guards water mounts and post local oasis bounties.",
        "services": ["Free Field Rest", "Hunt Quartermaster (Local Bounties)"],
    },
    "outpost_z13_mesa_watch": {
        "kind": "Sandstone Mesa Post",
        "description": "Terracotta sandstone lookout shelter fitted with a brass spyglass tripod scanning outer desert canyon rims for wyverns and slaver outriders.",
        "services": ["Free Field Rest", "Hunt Quartermaster (Local Bounties)"],
    },
    "outpost_z14_pine_valley": {
        "kind": "Alpine Hunter Lodge",
        "description": "Steep slate-roofed timber lodge set across sunny green alpine meadows and pine stands with curing pelts and a stone fire-ring where valley wardens post alpine hunting contracts.",
        "services": ["Free Field Rest", "Hunt Quartermaster (Local Bounties)"],
    },
    "outpost_z15_highland_crag": {
        "kind": "Granite Ridge Bunker",
        "description": "Exposed gray-granite mountain bunker ringed with dragon-scale ward shields and pike racks standing vigil below the stormy high passes.",
        "services": ["Free Field Rest", "Hunt Quartermaster (Local Bounties)"],
    },
    "outpost_z16_snowdrift": {
        "kind": "Frozen Taiga Outpost",
        "description": "Fur-draped log trapper post beside wooden cargo sleds and glowing oil lamps sheltered inside frosted pines where northern scouts track frost-beasts.",
        "services": ["Free Field Rest", "Hunt Quartermaster (Local Bounties)"],
    },
    "outpost_z17_glacier_edge": {
        "kind": "Glacial Demon-Watch",
        "description": "Cobalt ice-cliff stone patrol redoubt fortified with silvered iron ward stakes and cold-flame braziers to keep abyssal fiends from spilling off the glaciers.",
        "services": ["Free Field Rest", "Hunt Quartermaster (Local Bounties)"],
    },
    "outpost_z18_ashen_ridge": {
        "kind": "Ash-Border Bunkhouse",
        "description": "Iron-shuttered gray stone bunker astride the volcanic ash-scree border ridge where vanguard scouts track ash-plain prowlers crossing the border ridge.",
        "services": ["Free Field Rest", "Hunt Quartermaster (Local Bounties)"],
    },
    "outpost_z19_cinder_plain": {
        "kind": "Vanguard Ash Stockade",
        "description": "Spiked iron-and-canvas stockade burning orange ember braziers across charred wasteland dunes where veteran slayers post high-paying Dreadwaste bounties.",
        "services": ["Free Field Rest", "Hunt Quartermaster (Local Bounties)"],
    },
    "outpost_z20_black_crag": {
        "kind": "Basalt Slayer Outpost",
        "description": "Final obsidian-basalt bastion outside Black Keep consecrated under silvered ward banners where elite hunters strike at Shadowfell abominations.",
        "services": ["Free Field Rest", "Hunt Quartermaster (Local Bounties)"],
    },
}


def classify_location(loc: dict) -> tuple[str, float]:
    """Return standardized (locationType, overworldScale) preserving 1.0x for Villages & Forts up to 2.0x for Highcrown."""
    lid = str(loc.get("id", ""))
    cat = str(loc.get("category", ""))
    kind = str(loc.get("kind", "")).lower()

    if lid == "loc_01_overgrown_garden_sanctuary":
        return ("Capital City", 2.0)
    if lid == "loc_40_garricks_black_keep":
        return ("Citadel", 1.7)
    if lid == "loc_39_the_eclipse_gate":
        return ("Portal", 1.7)
    if loc.get("isPortal") or "portal dungeon" in kind:
        return ("Portal", 1.45)

    if cat == "travel":
        if lid.startswith("tr_port_"):
            return ("Port Town", 1.25)
        if "ferry" in lid:
            return ("Ferry Crossing", 1.0)
        return ("Mountain Pass", 1.0)

    if cat == "quest_field":
        return ("Quest Site", 1.0)

    if lid.startswith("outpost_z"):
        return ("Zone Outpost", 1.0)

    if "garrison town" in kind or any(w in kind for w in ("port town", "walled town", "forest town", "cliff town", "war-camp")):
        return ("Port Town" if "port" in kind else "Town", 1.25)

    if any(w in kind for w in ("castle", "keep", "citadel", "stronghold", "fortress", "estate", "holdfast", "bastion")):
        return ("Keep / Castle", 1.45)

    if "fort" in kind:
        return ("Fort", 1.0)

    if "village" in kind or "hamlet" in kind:
        return ("Village", 1.0)

    if "outpost" in kind or "trade post" in kind:
        return ("Outpost", 1.0)

    return ("Settlement", 1.0)


FACTIONS: dict[str, dict[str, str]] = {
    "crown_loyalists": {
        "name": "Highcrown Loyalists",
        "allegiance": "Friendly",
        "primaryColor": "#d7a648",
        "secondaryColor": "#6e1f22",
        "bannerAssetPath": "assets/tokens/banners/banner_crown_loyalists.webp",
    },
    "free_towns": {
        "name": "Free Towns & Guilds",
        "allegiance": "Friendly",
        "primaryColor": "#53b09c",
        "secondaryColor": "#1b3d39",
        "bannerAssetPath": "assets/tokens/banners/banner_free_towns.webp",
    },
    "northern_clans": {
        "name": "Northern Clans",
        "allegiance": "Friendly",
        "primaryColor": "#72bdf0",
        "secondaryColor": "#1d3d5c",
        "bannerAssetPath": "assets/tokens/banners/banner_northern_clans.webp",
    },
    "house_hollowstone": {
        "name": "House Hollowstone",
        "allegiance": "Hostile Rival",
        "primaryColor": "#cf6d8f",
        "secondaryColor": "#451b2c",
        "bannerAssetPath": "assets/tokens/banners/banner_house_hollowstone.webp",
    },
    "slaver_syndicate": {
        "name": "Slaver Syndicate",
        "allegiance": "Hostile Cartel",
        "primaryColor": "#d99438",
        "secondaryColor": "#422a11",
        "bannerAssetPath": "assets/tokens/banners/banner_slaver_syndicate.webp",
    },
    "bleakwatch_warlord": {
        "name": "Bleakwatch Warlord",
        "allegiance": "Hostile Warlord",
        "primaryColor": "#9d8ee0",
        "secondaryColor": "#2b2347",
        "bannerAssetPath": "assets/tokens/banners/banner_bleakwatch_warlord.webp",
    },
    "king_garrick": {
        "name": "King Garrick",
        "allegiance": "Hostile Tyrant",
        "primaryColor": "#e05252",
        "secondaryColor": "#331012",
        "bannerAssetPath": "assets/tokens/banners/banner_king_garrick.webp",
    },
}

FACTION_BY_ID: dict[str, str] = {
    # Map 1 — Crownlands & Saltmarsh
    "loc_01_overgrown_garden_sanctuary": "crown_loyalists",
    "loc_02_oakhaven": "free_towns",
    "hub_meadowbrook_hamlet": "free_towns",
    "loc_04_millbrook_crossing": "free_towns",
    "hub_crownlands_hill_fort": "crown_loyalists",
    "loc_06_saltwind_harbor": "free_towns",
    "hub_brinecliff_watch_fort": "crown_loyalists",
    "hub_reedfen_village": "free_towns",
    "loc_09_mirewatch_post": "free_towns",
    "hub_tidewater_keep": "crown_loyalists",
    "tr_port_map01_royal_trade": "crown_loyalists",
    # Map 2 — Thornwall & Verdant Weald
    "loc_11_redmarch_bastion": "crown_loyalists",
    "hub_goldmoor_village": "free_towns",
    "hub_slatepeak_mining_fort": "free_towns",
    "hub_thornwall_border_castle": "crown_loyalists",
    "loc_13_hollowstone_keep": "house_hollowstone",
    "loc_16_briarstead": "free_towns",
    "hub_timberfall_village": "free_towns",
    "hub_mosswood_hamlet": "free_towns",
    "hub_greenwarden_fort": "crown_loyalists",
    "hub_blightwatch_keep": "crown_loyalists",
    "tr_port_map02_highland_cove": "free_towns",
    # Map 3 — Sun-Scorched Isles & Ironcrest Highlands
    "loc_21_port_veridia": "free_towns",
    "hub_sunstone_caravan_post": "free_towns",
    "loc_23_dunespire_oasis": "free_towns",
    "hub_sandwall_citadel": "free_towns",
    "loc_24_gilded_auction_manor": "slaver_syndicate",
    "loc_26_highpass_refuge": "free_towns",
    "hub_clearwater_lake_village": "free_towns",
    "loc_27_anvilhall_forge": "free_towns",
    "hub_cragwatch_fort": "free_towns",
    "hub_stormhold_citadel": "free_towns",
    "tr_port_map03_desert_harbor": "free_towns",
    # Map 4 — Frostbound Reach & Dreadwaste
    "loc_31_rimeport": "free_towns",
    "hub_frostmere_village": "northern_clans",
    "hub_glacierwatch_fort": "northern_clans",
    "hub_icecrest_holdfast": "northern_clans",
    "loc_34_bleakwatch_citadel": "bleakwatch_warlord",
    "loc_36_ashenford_war_camp": "crown_loyalists",
    "hub_cinderwatch_bastion": "crown_loyalists",
    "hub_ashvale_village": "free_towns",
    "hub_scorchwall_fort": "crown_loyalists",
    "loc_40_garricks_black_keep": "king_garrick",
    "tr_port_map04_arctic_seaport": "free_towns",
}


def assign_faction(loc: dict) -> str | None:
    lid = str(loc.get("id", ""))
    cat = str(loc.get("category", ""))
    if cat == "quest_field":
        return None
    if loc.get("isPortal") or "portal dungeon" in str(loc.get("kind", "")).lower():
        return None
    base_lid = re.sub(r"(?:_flipped|_south)$", "", lid)
    if base_lid in FACTION_BY_ID:
        return FACTION_BY_ID[base_lid]
    if lid in ("outpost_z16_snowdrift", "outpost_z17_glacier_edge"):
        return "northern_clans"
    if lid.startswith("outpost_z"):
        return "crown_loyalists"
    if cat == "travel":
        return None
    return "free_towns"


def main() -> None:
    if not WORLD_PATH.exists():
        raise FileNotFoundError(f"Missing {WORLD_PATH}")
    if not QUESTS_CATALOG_PATH.exists():
        raise FileNotFoundError(f"Missing {QUESTS_CATALOG_PATH}")

    data = json.loads(WORLD_PATH.read_text(encoding="utf-8"))
    catalog = json.loads(QUESTS_CATALOG_PATH.read_text(encoding="utf-8"))

    quests_by_hub: dict[str, list[dict]] = {}
    quest_by_marker: dict[str, dict] = {}
    for q in catalog["quests"]:
        quests_by_hub.setdefault(q["hubId"], []).append(q)
        quest_by_marker[q["markerId"]] = q

    by_id: dict[str, dict] = {loc["id"]: loc for loc in data["locations"]}

    for loc in data["locations"]:
        lid = loc["id"]
        if lid in HUB_CUSTOM_DETAILS:
            det = HUB_CUSTOM_DETAILS[lid]
            hub_quests = quests_by_hub.get(lid, [])
            if "name" in det:
                loc["name"] = det["name"]
            if "kind" in det:
                loc["kind"] = det["kind"]
            if "levelRange" in det:
                loc["levelRange"] = det["levelRange"]
            loc["description"] = det["description"]
            loc["services"] = det["services"]
            if "bossInfo" in det:
                loc["bossInfo"] = det["bossInfo"]
            if lid in PORTAL_CATALYSTS:
                loc["catalyst"] = PORTAL_CATALYSTS[lid]
            loc["quests"] = [
                {
                    "questId": q["questId"],
                    "questNum": q["questNum"],
                    "title": q["title"],
                    "category": q["category"],
                    "questFormat": q.get("questFormat", "wilderness_pin"),
                    "placeOnOverworld": bool(q.get("placeOnOverworld", True)),
                    "targetHubId": q.get("targetHubId"),
                    "targetHubName": q.get("targetHubName"),
                    "giver": q["giver"],
                    "miniBoss": q["miniBoss"],
                    "reward": q["reward"],
                    "description": q["description"],
                    "targetMarkerId": q["markerId"],
                    "markerName": q["markerName"],
                    **({"allowedBiomeIds": q["allowedBiomeIds"]} if q.get("allowedBiomeIds") else {}),
                }
                for q in hub_quests
            ]
            loc["linkedQuestMarkerIds"] = [q["markerId"] for q in hub_quests]
        elif lid in quest_by_marker:
            q = quest_by_marker[lid]
            hub_loc = by_id.get(q["hubId"], {})
            if hub_loc.get("levelRange"):
                hub_lvl = str(hub_loc["levelRange"]).split("·")[0].strip()
                loc["levelRange"] = "Lv 1–4" if hub_lvl == "Lv 1 Start" else hub_lvl
            loc["name"] = q["markerName"]
            loc["kind"] = f"Quest Q{q['questNum']:03d}: {q['title']} ({q['hubName']})"
            loc["description"] = q["description"]
            loc["pickedUpAtId"] = q["hubId"]
            loc["pickedUpAtName"] = q["hubName"]
            loc["questFormat"] = q.get("questFormat", "wilderness_pin")
            loc["placeOnOverworld"] = bool(q.get("placeOnOverworld", True))
            loc["targetHubId"] = q.get("targetHubId")
            loc["targetHubName"] = q.get("targetHubName")
            if q.get("allowedBiomeIds"):
                loc["allowedBiomeIds"] = list(q["allowedBiomeIds"])
            else:
                loc.pop("allowedBiomeIds", None)
            if q.get("minOceanHexes") is not None:
                loc["minOceanHexes"] = q["minOceanHexes"]
            else:
                loc.pop("minOceanHexes", None)
            if q.get("minDownsHexes") is not None:
                loc["minDownsHexes"] = q["minDownsHexes"]
            else:
                loc.pop("minDownsHexes", None)
            if q.get("maxDownsHexes") is not None:
                loc["maxDownsHexes"] = q["maxDownsHexes"]
            else:
                loc.pop("maxDownsHexes", None)
            if not loc["placeOnOverworld"]:
                loc["placed"] = False
                loc["x"] = None
                loc["y"] = None
            loc["services"] = [
                f"Quest Q{q['questNum']:03d}: {q['title']}",
                f"Picked up at: {q['hubName']} ({q['giver']})",
                (
                    f"Journal Token · Deliver to {q['targetHubName']}"
                    if loc["questFormat"] == "hub_courier" and q.get("targetHubName")
                    else (
                        f"Journal Token · Resolves Inside {q['hubName']}"
                        if loc["questFormat"] == "hub_interior"
                        else "Overworld Quest Site (Shows When Quest Active)"
                    )
                ),
                f"Mini-Boss: {q['miniBoss']}",
                f"Reward: {q['reward']}",
            ]
            loc["quests"] = [
                {
                    "questId": q["questId"],
                    "questNum": q["questNum"],
                    "sourceId": q["hubId"],
                    "sourceName": q["hubName"],
                    "title": q["title"],
                    "giver": q["giver"],
                    "miniBoss": q["miniBoss"],
                    "reward": q["reward"],
                    "description": q["description"],
                }
            ]
            loc["linkedQuestMarkerIds"] = [q["hubId"]]
        elif lid in OUTPOST_CUSTOM_DETAILS or lid.startswith("outpost_z"):
            odet = OUTPOST_CUSTOM_DETAILS.get(lid, {})
            if "kind" in odet:
                loc["kind"] = odet["kind"]
            loc["description"] = odet.get(
                "description",
                f"Frontier ranger watch-post guarding the {loc.get('levelRange', 'surrounding')} wilds, staffed by a local Hunt Quartermaster posting silver bounties.",
            )
            loc["services"] = odet.get(
                "services",
                ["Free Field Rest", "Hunt Quartermaster (Local Bounties)"],
            )
        elif lid.startswith("tr_port_"):
            loc["description"] = "Dedicated island-continent sea-travel port town linking ship voyages across Maps 1, 2, 3, and 4."
            loc["services"] = ["Inter-Continent Sea Travel Port", "Free Harbor Rest"]
        elif lid.startswith("tr_ferry_crossing"):
            loc["description"] = "Shoreline wooden ferry landing pier where regional ferrymen carry travelers across water straits."
            loc["services"] = ["Strait / Channel Ferry Crossing"]
        elif lid.startswith("tr_border_mountain_pass_gate"):
            loc["description"] = "Internal mountain-pass tollgate guarding cliff passes inside an island continent (continents connect by sea, not on foot)."
            loc["services"] = ["Internal Ridge / Pass Gate"]

        if isinstance(loc.get("kind"), str):
            loc["kind"] = re.sub(r"\s*\(Hub #\d+\)", "", loc["kind"]).strip()
        loc_type, loc_scale = classify_location(loc)
        loc["locationType"] = loc_type
        loc["scale"] = loc_scale
        loc["triggerRadius"] = round(88 * loc_scale)

        faction_id = assign_faction(loc)
        if faction_id and faction_id in FACTIONS:
            fmeta = FACTIONS[faction_id]
            loc["factionId"] = faction_id
            loc["factionName"] = fmeta["name"]
            loc["factionAllegiance"] = fmeta["allegiance"]
            loc["factionPrimaryColor"] = fmeta["primaryColor"]
            loc["factionSecondaryColor"] = fmeta["secondaryColor"]
            loc["bannerAssetPath"] = fmeta["bannerAssetPath"]
        else:
            for k in ("factionId", "factionName", "factionAllegiance", "factionPrimaryColor", "factionSecondaryColor", "bannerAssetPath"):
                loc.pop(k, None)

        lore_id = lid
        if lore_id not in PLAYER_LORE_BY_ID:
            if lore_id.startswith("tr_ferry_crossing"):
                lore_id = "tr_ferry_crossing"
            elif lore_id.startswith("tr_border_mountain_pass_gate"):
                lore_id = "tr_border_mountain_pass_gate"
            elif lore_id.startswith("tr_port_"):
                lore_id = re.sub(r"_south$", "", lore_id)
        plore = PLAYER_LORE_BY_ID.get(lore_id)
        if plore:
            loc["playerKind"] = plore["playerKind"]
            loc["playerDescription"] = plore["playerDescription"]
            loc["playerServices"] = list(plore["playerServices"])
            if plore.get("playerRegion"):
                loc["playerRegion"] = plore["playerRegion"]
            else:
                loc.pop("playerRegion", None)
        else:
            for k in ("playerKind", "playerRegion", "playerDescription", "playerServices"):
                loc.pop(k, None)

    formatted = json.dumps(data, indent=2, ensure_ascii=False)
    WORLD_PATH.write_text(formatted, encoding="utf-8")
    CLIENT_WORLD_PATH.write_text(formatted, encoding="utf-8")

    manifest_path = ROOT / "data" / "markers-manifest.json"
    client_manifest_path = ROOT / "client" / "assets" / "data" / "markers-manifest.json"
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        for m in manifest.get("markers", []):
            mid = m.get("id")
            if mid in HUB_CUSTOM_DETAILS or mid in OUTPOST_CUSTOM_DETAILS:
                det = HUB_CUSTOM_DETAILS.get(mid) or OUTPOST_CUSTOM_DETAILS[mid]
                if "name" in det:
                    m["name"] = det["name"]
                if "kind" in det:
                    m["kind"] = det["kind"]
            elif mid in quest_by_marker:
                q = quest_by_marker[mid]
                m["name"] = q["markerName"]
                m["kind"] = f"Quest Q{q['questNum']:03d}: {q['title']} ({q['hubName']})"
                m["questTitle"] = q["title"]
                m["hubName"] = q["hubName"]
        m_text = json.dumps(manifest, indent=2)
        manifest_path.write_text(m_text, encoding="utf-8")
        client_manifest_path.write_text(m_text, encoding="utf-8")

    print(f"Enriched {len(data['locations'])} entries (all 40 Hubs x 4-5 unique quests = {len(catalog['quests'])}) -> world-locations.json")


if __name__ == "__main__":
    main()
