"""Export all 4 Overworld maps (8192x8192 tiled WebP) and slice/clean/export all Map Marker tokens to WebP."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageOps

ROOT = Path(r"C:\Users\drew0\Documents\ROD")
SHEETS_DIR = ROOT / "assets" / "tokens" / "markers" / "batch_sheets"
OUT_MARKERS_DIR = ROOT / "client" / "assets" / "tokens" / "markers"
CLIENT_MAPS_DIR = ROOT / "client" / "assets" / "maps"
DATA_DIR = ROOT / "data"
CLIENT_DATA_DIR = ROOT / "client" / "assets" / "data"

MAPS_CONFIG = [
    {
        "id": "map_01",
        "src": "map_01_crownlands_saltmarsh_4k.png",
        "name": "King's Reach",
        "regionLabel": "King's Reach",
        "spawn": {"x": 5808, "y": 6665},
    },
    {
        "id": "map_02",
        "src": "map_02_thornwall_weald_4k.png",
        "name": "Westmarch",
        "regionLabel": "Westmarch",
        "spawn": {"x": 4096, "y": 4096},
    },
    {
        "id": "map_03",
        "src": "map_03_isles_ironcrest_4k.png",
        "name": "Suncrest Isles",
        "regionLabel": "Suncrest Isles",
        "spawn": {"x": 4096, "y": 4096},
    },
    {
        "id": "map_04",
        "src": "map_04_frostbound_dreadwaste_4k.png",
        "name": "Northhold",
        "regionLabel": "Northhold",
        "spawn": {"x": 4096, "y": 4096},
    },
]

SHEET_FILES: dict[int | str, str] = {
    1: "rod_map_markers_sheet_1.jpg",
    2: "rod_map_markers_sheet_2.jpg",
    3: "rod_map_markers_sheet_3.jpg",
    4: "rod_map_markers_sheet_4.jpg",
    5: "rod_map_markers_sheet_5.jpg",
    6: "rod_map_markers_sheet_6.jpg",
    7: "rod_map_markers_sheet_7.jpg",
    "loc_a": "rod_location_markers_sheet_a.jpg",
    "loc_b": "rod_location_markers_sheet_b.jpg",
    "loc_c": "rod_location_markers_sheet_c.jpg",
    "loc_d": "rod_location_markers_sheet_d.jpg",
    "quest_a": "rod_quest_markers_sheet_a.jpg",
    "quest_b": "rod_quest_markers_sheet_b.jpg",
    "quest_c": "rod_quest_markers_sheet_c.jpg",
    "quest_d": "rod_quest_markers_sheet_d.jpg",
    "quest_e": "rod_quest_markers_sheet_e.jpg",
    "quest_f": "rod_quest_markers_sheet_f.jpg",
    "quest_g": "rod_quest_markers_sheet_g.jpg",
    "quest_h": "rod_quest_markers_sheet_h.jpg",
    "travel": "travel_markers.jpg",
}

# Core permanent locations (40 Hubs + 20 Zone Outposts + 8 Portals = 68), travel gates/ports,
# and portal dungeon doors; all 178 unique Quest Field Sites & Standby tokens load from
# data/generated-quest-markers.json below.
TOKEN_DEFS: list[dict] = [
    # --- EXISTING PERMANENT HUBS & PORTALS (Sheets 1–7 & Location Sheet D) ---
    {"sheet": "loc_d", "r": 2, "c": 2, "id": "loc_01_overgrown_garden_sanctuary", "name": "Highcrown", "cat": "permanent", "map": "map_01", "locNum": 1, "region": 1, "kind": "Royal Capital City", "ring": "steel", "preserveFrame": True},
    {"sheet": 1, "r": 0, "c": 1, "id": "loc_02_oakhaven", "name": "Oakhaven", "cat": "permanent", "map": "map_01", "locNum": 2, "region": 1, "kind": "Walled Town", "ring": "bronze"},
    {"sheet": 7, "r": 0, "c": 1, "id": "loc_04_millbrook_crossing", "name": "Millbrook Crossing", "cat": "permanent", "map": "map_01", "locNum": 4, "region": 1, "kind": "Dryland Frontier Village", "ring": "bronze"},
    {"sheet": 1, "r": 1, "c": 0, "id": "loc_05_the_ashen_gate", "name": "The Ashen Gate", "cat": "permanent", "map": "map_01", "locNum": 5, "region": 1, "kind": "Portal Dungeon #1", "ring": "obsidian", "isPortal": True, "portalNum": 1},
    {"sheet": 1, "r": 1, "c": 1, "id": "loc_06_saltwind_harbor", "name": "Saltwind Harbor", "cat": "permanent", "map": "map_01", "locNum": 6, "region": 2, "kind": "Port Town (Ship Port)", "ring": "bronze"},
    {"sheet": 1, "r": 2, "c": 0, "id": "loc_09_mirewatch_post", "name": "Mirewatch Post", "cat": "permanent", "map": "map_01", "locNum": 9, "region": 2, "kind": "Frontier Outpost", "ring": "bronze"},
    {"sheet": 1, "r": 2, "c": 1, "id": "loc_10_the_sunken_maw", "name": "The Sunken Maw", "cat": "permanent", "map": "map_01", "locNum": 10, "region": 2, "kind": "Portal Dungeon #2", "ring": "obsidian", "isPortal": True, "portalNum": 2},
    {"sheet": 2, "r": 0, "c": 0, "id": "loc_11_redmarch_bastion", "name": "Redmarch Bastion", "cat": "permanent", "map": "map_02", "locNum": 11, "region": 3, "kind": "Border Garrison Town", "ring": "steel"},
    {"sheet": 2, "r": 0, "c": 2, "id": "loc_13_hollowstone_keep", "name": "Hollowstone Keep", "cat": "permanent", "map": "map_02", "locNum": 13, "region": 3, "kind": "Rival House Stronghold", "ring": "steel"},
    {"sheet": 2, "r": 1, "c": 0, "id": "loc_15_the_iron_rift", "name": "The Iron Rift", "cat": "permanent", "map": "map_02", "locNum": 15, "region": 3, "kind": "Portal Dungeon #3", "ring": "obsidian", "isPortal": True, "portalNum": 3},
    {"sheet": 2, "r": 1, "c": 1, "id": "loc_16_briarstead", "name": "Briarstead", "cat": "permanent", "map": "map_02", "locNum": 16, "region": 4, "kind": "Forest Town", "ring": "bronze"},
    {"sheet": 2, "r": 2, "c": 1, "id": "loc_20_the_rotspire", "name": "The Rotspire", "cat": "permanent", "map": "map_02", "locNum": 20, "region": 4, "kind": "Portal Dungeon #4", "ring": "obsidian", "isPortal": True, "portalNum": 4},
    {"sheet": 3, "r": 0, "c": 0, "id": "loc_21_port_veridia", "name": "Port Veridia", "cat": "permanent", "map": "map_03", "locNum": 21, "region": 5, "kind": "Island Port Town (Ship Port)", "ring": "bronze"},
    {"sheet": 3, "r": 0, "c": 2, "id": "loc_23_dunespire_oasis", "name": "Dunespire Oasis", "cat": "permanent", "map": "map_03", "locNum": 23, "region": 5, "kind": "Frontier Oasis Outpost", "ring": "bronze"},
    {"sheet": 3, "r": 0, "c": 3, "id": "loc_24_gilded_auction_manor", "name": "The Gilded Auction Manor", "cat": "permanent", "map": "map_03", "locNum": 24, "region": 5, "kind": "Rival Slaver Estate", "ring": "steel"},
    {"sheet": 3, "r": 1, "c": 0, "id": "loc_25_the_scorched_chasm", "name": "The Scorched Chasm", "cat": "permanent", "map": "map_03", "locNum": 25, "region": 5, "kind": "Portal Dungeon #5", "ring": "obsidian", "isPortal": True, "portalNum": 5},
    {"sheet": 3, "r": 1, "c": 1, "id": "loc_26_highpass_refuge", "name": "Highpass Refuge", "cat": "permanent", "map": "map_03", "locNum": 26, "region": 6, "kind": "Alpine Cliff Town", "ring": "bronze"},
    {"sheet": 3, "r": 1, "c": 2, "id": "loc_27_anvilhall_forge", "name": "Anvilhall Forge", "cat": "permanent", "map": "map_03", "locNum": 27, "region": 6, "kind": "Mountain Keep & Master Forge", "ring": "steel"},
    {"sheet": 3, "r": 2, "c": 1, "id": "loc_30_storm_crowned_spire", "name": "The Storm-Crowned Spire", "cat": "permanent", "map": "map_03", "locNum": 30, "region": 6, "kind": "Portal Dungeon #6", "ring": "obsidian", "isPortal": True, "portalNum": 6},
    {"sheet": 4, "r": 0, "c": 0, "id": "loc_31_rimeport", "name": "Rimeport", "cat": "permanent", "map": "map_04", "locNum": 31, "region": 7, "kind": "Northern Port Town (Ship Port)", "ring": "bronze"},
    {"sheet": 4, "r": 0, "c": 3, "id": "loc_34_bleakwatch_citadel", "name": "Bleakwatch Citadel", "cat": "permanent", "map": "map_04", "locNum": 34, "region": 7, "kind": "Rival Warlord Fortress", "ring": "steel"},
    {"sheet": 4, "r": 1, "c": 0, "id": "loc_35_the_pale_abyss", "name": "The Pale Abyss", "cat": "permanent", "map": "map_04", "locNum": 35, "region": 7, "kind": "Portal Dungeon #7", "ring": "obsidian", "isPortal": True, "portalNum": 7},
    {"sheet": 4, "r": 1, "c": 1, "id": "loc_36_ashenford_war_camp", "name": "Ashenford War-Camp", "cat": "permanent", "map": "map_04", "locNum": 36, "region": 8, "kind": "Final War-Camp Hub", "ring": "bronze"},
    {"sheet": 4, "r": 2, "c": 0, "id": "loc_39_the_eclipse_gate", "name": "The Eclipse Gate", "cat": "permanent", "map": "map_04", "locNum": 39, "region": 8, "kind": "Portal Dungeon #8 (King Garrick)", "ring": "obsidian", "isPortal": True, "portalNum": 8},
    {"sheet": 4, "r": 2, "c": 1, "id": "loc_40_garricks_black_keep", "name": "Garrick's Black Keep", "cat": "permanent", "map": "map_04", "locNum": 40, "region": 8, "kind": "Final Stronghold", "ring": "steel"},

    # --- DUNGEON DOORS ---
    {"sheet": 4, "r": 3, "c": 0, "id": "door_open_archway", "name": "Open Stone Archway", "cat": "dungeon_door", "kind": "Portal Grid Door State", "ring": "iron"},
    {"sheet": 4, "r": 3, "c": 1, "id": "door_locked_iron_gate", "name": "Locked Iron Gate", "cat": "dungeon_door", "kind": "Portal Grid Door State", "ring": "iron"},
    {"sheet": 4, "r": 3, "c": 2, "id": "door_combat_sealed", "name": "Combat-Sealed Barrier Door", "cat": "dungeon_door", "kind": "Portal Grid Door State", "ring": "iron"},
    {"sheet": 4, "r": 3, "c": 3, "id": "door_boss_sanctum_seal", "name": "Portal Boss Sanctum Seal", "cat": "dungeon_door", "kind": "Portal Grid Door State", "ring": "obsidian"},

    # --- LOCATION SHEET A (15 New Map 1–3 Hubs + Brightened Hollowstone Keep — Batch 7) ---
    {"sheet": "loc_a", "r": 0, "c": 0, "id": "hub_crownlands_hill_fort", "name": "Crownlands Hill-Fort", "cat": "permanent", "map": "map_01", "region": 1, "kind": "Border Watch-Fort (Hub #5)", "ring": "steel", "allowedBiomeIds": ["m1_upland_foothills"]},
    {"sheet": "loc_a", "r": 0, "c": 1, "id": "hub_meadowbrook_hamlet", "name": "Meadowbrook Hamlet", "cat": "permanent", "map": "map_01", "region": 1, "kind": "Farming Village (Hub #3)", "ring": "bronze"},
    {"sheet": "loc_a", "r": 0, "c": 2, "id": "hub_brinecliff_watch_fort", "name": "Brinecliff Watch-Fort", "cat": "permanent", "map": "map_01", "region": 2, "kind": "Coastal Cliff Fort (Hub #7)", "ring": "steel"},
    {"sheet": "loc_a", "r": 0, "c": 3, "id": "hub_reedfen_village", "name": "Reedfen Village", "cat": "permanent", "map": "map_01", "region": 2, "kind": "Saltmarsh Village (Hub #8)", "ring": "bronze"},
    {"sheet": "loc_a", "r": 1, "c": 0, "id": "hub_tidewater_keep", "name": "Tidewater Keep", "cat": "permanent", "map": "map_01", "region": 2, "kind": "Coastal Sea-Wall Castle (Hub #10)", "ring": "steel"},
    {"sheet": "loc_a", "r": 1, "c": 1, "id": "hub_goldmoor_village", "name": "Goldmoor Village", "cat": "permanent", "map": "map_02", "region": 3, "kind": "Highland Frontier Village (Hub #12)", "ring": "bronze"},
    {"sheet": "loc_a", "r": 1, "c": 2, "id": "hub_slatepeak_mining_fort", "name": "Slatepeak Mining Fort", "cat": "permanent", "map": "map_02", "region": 3, "kind": "Mountain Quarry Fort (Hub #13)", "ring": "steel"},
    {"sheet": "loc_a", "r": 1, "c": 3, "id": "hub_thornwall_border_castle", "name": "Thornwall Border Castle", "cat": "permanent", "map": "map_02", "region": 3, "kind": "Border Castle (Hub #14)", "ring": "steel"},
    {"sheet": "loc_a", "r": 2, "c": 0, "id": "hub_timberfall_village", "name": "Timberfall Village", "cat": "permanent", "map": "map_02", "region": 4, "kind": "Forest Logging Village (Hub #17)", "ring": "bronze"},
    {"sheet": "loc_a", "r": 2, "c": 1, "id": "hub_mosswood_hamlet", "name": "Mosswood Hamlet", "cat": "permanent", "map": "map_02", "region": 4, "kind": "Woodland Hamlet (Hub #18)", "ring": "bronze"},
    {"sheet": "loc_a", "r": 2, "c": 2, "id": "hub_greenwarden_fort", "name": "Greenwarden Fort", "cat": "permanent", "map": "map_02", "region": 4, "kind": "Woodland Ranger Fort (Hub #19)", "ring": "steel"},
    {"sheet": "loc_a", "r": 2, "c": 3, "id": "hub_blightwatch_keep", "name": "Blightwatch Keep", "cat": "permanent", "map": "map_02", "region": 4, "kind": "Frontier Quarantine Keep (Hub #20)", "ring": "steel"},
    {"sheet": "loc_a", "r": 3, "c": 0, "id": "loc_13_hollowstone_keep", "name": "Hollowstone Keep", "cat": "permanent", "map": "map_02", "locNum": 13, "region": 3, "kind": "Rival House Stronghold", "ring": "steel"},
    {"sheet": "loc_a", "r": 3, "c": 1, "id": "hub_sunstone_caravan_post", "name": "Sunstone Caravan Post", "cat": "permanent", "map": "map_03", "region": 5, "kind": "Desert Trade Post (Hub #22)", "ring": "bronze"},
    {"sheet": "loc_a", "r": 3, "c": 2, "id": "hub_sandwall_citadel", "name": "Sandwall Citadel", "cat": "permanent", "map": "map_03", "region": 5, "kind": "Desert Garrison Citadel (Hub #24)", "ring": "steel"},
    {"sheet": "loc_a", "r": 3, "c": 3, "id": "hub_clearwater_lake_village", "name": "Clearwater Lake Village", "cat": "permanent", "map": "map_03", "region": 6, "kind": "Alpine Lake Village (Hub #27)", "ring": "bronze"},

    # --- LOCATION SHEET B (8 New Map 3–4 Hubs + Zone Outposts Z1–Z8) ---
    {"sheet": "loc_b", "r": 0, "c": 0, "id": "hub_cragwatch_fort", "name": "Cragwatch Fort", "cat": "permanent", "map": "map_03", "region": 6, "kind": "Granite Mountain Fort (Hub #29)", "ring": "steel"},
    {"sheet": "loc_b", "r": 0, "c": 1, "id": "hub_stormhold_citadel", "name": "Stormhold Citadel", "cat": "permanent", "map": "map_03", "region": 6, "kind": "Highland Storm Citadel (Hub #30)", "ring": "steel"},
    {"sheet": "loc_b", "r": 0, "c": 2, "id": "hub_frostmere_village", "name": "Frostmere Village", "cat": "permanent", "map": "map_04", "region": 7, "kind": "Frozen Lake Trapper Village (Hub #32)", "ring": "bronze"},
    {"sheet": "loc_b", "r": 0, "c": 3, "id": "hub_glacierwatch_fort", "name": "Glacierwatch Fort", "cat": "permanent", "map": "map_04", "region": 7, "kind": "Glacial Border Fort (Hub #33)", "ring": "steel"},
    {"sheet": "loc_b", "r": 1, "c": 0, "id": "hub_icecrest_holdfast", "name": "Icecrest Holdfast", "cat": "permanent", "map": "map_04", "region": 7, "kind": "Northern Clan Holdfast (Hub #34)", "ring": "steel"},
    {"sheet": "loc_b", "r": 1, "c": 1, "id": "hub_cinderwatch_bastion", "name": "Cinderwatch Bastion", "cat": "permanent", "map": "map_04", "region": 8, "kind": "Volcanic Forward Bastion (Hub #37)", "ring": "steel"},
    {"sheet": "loc_b", "r": 1, "c": 2, "id": "hub_ashvale_village", "name": "Ashvale Village", "cat": "permanent", "map": "map_04", "region": 8, "kind": "Ash-Basin Survivor Village (Hub #38)", "ring": "bronze"},
    {"sheet": "loc_b", "r": 1, "c": 3, "id": "hub_scorchwall_fort", "name": "Scorchwall Fort", "cat": "permanent", "map": "map_04", "region": 8, "kind": "Obsidian Coastal Fort (Hub #39)", "ring": "steel"},
    {"sheet": "loc_b", "r": 2, "c": 0, "id": "outpost_z01_meadowgate", "name": "Meadowgate Watch-Post", "cat": "permanent", "map": "map_01", "region": 1, "kind": "Meadow Palisade Fort", "ring": "bronze", "zoneNum": 1},
    {"sheet": "loc_b", "r": 2, "c": 1, "id": "outpost_z02_oakwood", "name": "Oakwood Ranger Camp", "cat": "permanent", "map": "map_01", "region": 1, "kind": "Woodland Palisade Fort", "ring": "bronze", "zoneNum": 2},
    {"sheet": "loc_b", "r": 2, "c": 2, "id": "outpost_z03_slate_ridge", "name": "Slate-Ridge Scout Outpost", "cat": "permanent", "map": "map_01", "region": 1, "kind": "Foothill Scout Bunker", "ring": "bronze", "zoneNum": 3},
    {"sheet": "loc_b", "r": 2, "c": 3, "id": "outpost_z04_brinefen", "name": "Brinefen Hunter Landing", "cat": "permanent", "map": "map_01", "region": 2, "kind": "Coastal Palisade Sea-Fort", "ring": "bronze", "zoneNum": 4},
    {"sheet": "loc_b", "r": 3, "c": 0, "id": "outpost_z05_bogwarden", "name": "Bogwarden Stilt-Post", "cat": "permanent", "map": "map_01", "region": 2, "kind": "Saltmarsh Palisade Fort", "ring": "bronze", "zoneNum": 5},
    {"sheet": "loc_b", "r": 3, "c": 1, "id": "outpost_z06_ochre_downs", "name": "Ochre-Downs Tracker Camp", "cat": "permanent", "map": "map_02", "region": 3, "kind": "Highland Palisade Fort", "ring": "bronze", "zoneNum": 6},
    {"sheet": "loc_b", "r": 3, "c": 2, "id": "outpost_z07_cragspire", "name": "Cragspire Quarry Post", "cat": "permanent", "map": "map_02", "region": 3, "kind": "Quarry Watch-Post", "ring": "bronze", "zoneNum": 7},
    {"sheet": "loc_b", "r": 3, "c": 3, "id": "outpost_z08_fernbrook", "name": "Fernbrook Ranger Station", "cat": "permanent", "map": "map_02", "region": 4, "kind": "Clearing Ranger Station", "ring": "bronze", "zoneNum": 8},

    # --- LOCATION SHEET C (Zone Outposts Z9–Z20 + 4 Continent Sea-Travel Port Towns) ---
    {"sheet": "loc_c", "r": 0, "c": 0, "id": "outpost_z09_canopy_watch", "name": "Canopy-Watch Tree-Post", "cat": "permanent", "map": "map_02", "region": 4, "kind": "Treetop Palisade Fort", "ring": "bronze", "zoneNum": 9},
    {"sheet": "loc_c", "r": 0, "c": 1, "id": "outpost_z10_mire_edge", "name": "Mire-Edge Quarantine Camp", "cat": "permanent", "map": "map_02", "region": 4, "kind": "Quarantine Perimeter Camp", "ring": "bronze", "zoneNum": 10},
    {"sheet": "loc_c", "r": 0, "c": 2, "id": "outpost_z11_dune_runner", "name": "Dune-Runner Nomad Post", "cat": "permanent", "map": "map_03", "region": 5, "kind": "Desert Palisade Fort", "ring": "bronze", "zoneNum": 11},
    {"sheet": "loc_c", "r": 0, "c": 3, "id": "outpost_z12_palm_spring", "name": "Palm-Spring Hunter Pavilion", "cat": "permanent", "map": "map_03", "region": 5, "kind": "Oasis Palisade Fort", "ring": "bronze", "zoneNum": 12},
    {"sheet": "loc_c", "r": 1, "c": 0, "id": "outpost_z13_mesa_watch", "name": "Mesa-Watch Ranger Outpost", "cat": "permanent", "map": "map_03", "region": 5, "kind": "Sandstone Mesa Post", "ring": "bronze", "zoneNum": 13},
    {"sheet": "loc_c", "r": 1, "c": 1, "id": "outpost_z14_pine_valley", "name": "Pine-Valley Wardens' Post", "cat": "permanent", "map": "map_03", "region": 6, "kind": "Alpine Hunter Lodge", "ring": "bronze", "zoneNum": 14},
    {"sheet": "loc_c", "r": 1, "c": 2, "id": "outpost_z15_highland_crag", "name": "Highland Crag-Watch Camp", "cat": "permanent", "map": "map_03", "region": 6, "kind": "Granite Ridge Bunker", "ring": "bronze", "zoneNum": 15},
    {"sheet": "loc_c", "r": 1, "c": 3, "id": "outpost_z16_snowdrift", "name": "Snowdrift Fur-Hunter Post", "cat": "permanent", "map": "map_04", "region": 7, "kind": "Frozen Taiga Outpost", "ring": "bronze", "zoneNum": 16},
    {"sheet": "loc_c", "r": 2, "c": 0, "id": "outpost_z17_glacier_edge", "name": "Glacier-Edge Demon-Watch", "cat": "permanent", "map": "map_04", "region": 7, "kind": "Glacial Demon-Watch", "ring": "bronze", "zoneNum": 17},
    {"sheet": "loc_c", "r": 2, "c": 1, "id": "outpost_z18_ashen_ridge", "name": "Ashen-Ridge Border Post", "cat": "permanent", "map": "map_04", "region": 8, "kind": "Ash-Border Bunkhouse", "ring": "bronze", "zoneNum": 18},
    {"sheet": "loc_c", "r": 2, "c": 2, "id": "outpost_z19_cinder_plain", "name": "Cinder-Plain Vanguard Camp", "cat": "permanent", "map": "map_04", "region": 8, "kind": "Vanguard Ash Stockade", "ring": "bronze", "zoneNum": 19},
    {"sheet": "loc_c", "r": 2, "c": 3, "id": "outpost_z20_black_crag", "name": "Black-Crag Slayer's Post", "cat": "permanent", "map": "map_04", "region": 8, "kind": "Basalt Slayer Outpost", "ring": "bronze", "zoneNum": 20},
    # --- LOCATION SHEET D (Highcrown Royal Capital 16x Sheet; extracted cleanly from r=2, c=2 on loc_01 above) ---
]

GEN_MARKERS_PATH = DATA_DIR / "generated-quest-markers.json"
if GEN_MARKERS_PATH.exists():
    TOKEN_DEFS.extend(json.loads(GEN_MARKERS_PATH.read_text(encoding="utf-8")))

# Unified 4x4 Upright Travel Tokens (replaces earlier Sheet 5 / Sheet 7 / loc_c / quest_h Travel assets and mirror hacks)
TOKEN_DEFS.extend(
    [
        # Row 1: Boat-Free Ferry Crossing Piers
        {"sheet": "travel", "r": 0, "c": 0, "id": "tr_ferry_crossing", "name": "Ferry Crossing", "cat": "travel", "map": "all", "kind": "Island Strait Ferry Crossing · Pier 1 (North Bank)", "ring": "iron", "preserveFrame": True},
        {"sheet": "travel", "r": 0, "c": 1, "id": "tr_ferry_crossing_south_bank", "name": "Ferry Crossing", "cat": "travel", "map": "all", "kind": "Island Strait Ferry Crossing · Pier 2 (South Bank)", "ring": "iron", "preserveFrame": True},
        {"sheet": "travel", "r": 0, "c": 2, "id": "tr_ferry_crossing_west_bank", "name": "Ferry Crossing", "cat": "travel", "map": "all", "kind": "Island Strait Ferry Crossing · Pier 3", "ring": "iron", "preserveFrame": True},
        {"sheet": "travel", "r": 0, "c": 3, "id": "tr_ferry_crossing_east_bank", "name": "Ferry Crossing", "cat": "travel", "map": "all", "kind": "Island Strait Ferry Crossing · Pier 4", "ring": "iron", "preserveFrame": True},
        # Row 2: Border Mountain Pass Gates
        {"sheet": "travel", "r": 1, "c": 0, "id": "tr_border_mountain_pass_gate", "name": "Border Mountain Pass Gate", "cat": "travel", "map": "all", "kind": "Internal Mountain Pass Gate · Style 1", "ring": "iron", "preserveFrame": True},
        {"sheet": "travel", "r": 1, "c": 1, "id": "tr_border_mountain_pass_gate_v2", "name": "Border Mountain Pass Gate", "cat": "travel", "map": "all", "kind": "Internal Mountain Pass Gate · Banner Arch", "ring": "iron", "preserveFrame": True},
        {"sheet": "travel", "r": 1, "c": 2, "id": "tr_border_mountain_pass_gate_v3", "name": "Border Mountain Pass Gate", "cat": "travel", "map": "all", "kind": "Internal Mountain Pass Gate · Watch Tower", "ring": "iron", "preserveFrame": True},
        {"sheet": "travel", "r": 1, "c": 3, "id": "tr_border_mountain_pass_gate_v4", "name": "Border Mountain Pass Gate", "cat": "travel", "map": "all", "kind": "Internal Mountain Pass Gate · Timber Gatehouse", "ring": "iron", "preserveFrame": True},
        # Row 3: North-Coast Sea-Travel Port Towns
        {"sheet": "travel", "r": 2, "c": 0, "id": "tr_port_map01_royal_trade", "name": "Royal Trade Port Town", "cat": "travel", "map": "map_01", "kind": "Map 1 Sea-Travel Port Town · North Coast", "ring": "bronze", "preserveFrame": True},
        {"sheet": "travel", "r": 2, "c": 1, "id": "tr_port_map02_highland_cove", "name": "Highland Cove Port Town", "cat": "travel", "map": "map_02", "kind": "Map 2 Sea-Travel Port Town · North Coast", "ring": "bronze", "preserveFrame": True},
        {"sheet": "travel", "r": 2, "c": 2, "id": "tr_port_map03_desert_harbor", "name": "Desert Harbor Port Town", "cat": "travel", "map": "map_03", "kind": "Map 3 Sea-Travel Port Town · North Coast", "ring": "bronze", "preserveFrame": True},
        {"sheet": "travel", "r": 2, "c": 3, "id": "tr_port_map04_arctic_seaport", "name": "Arctic Sea-Port Town", "cat": "travel", "map": "map_04", "kind": "Map 4 Sea-Travel Port Town · North Coast", "ring": "bronze", "preserveFrame": True},
        # Row 4: South-Coast Sea-Travel Port Towns
        {"sheet": "travel", "r": 3, "c": 0, "id": "tr_port_map01_royal_trade_south", "name": "Royal Trade Port Town", "cat": "travel", "map": "map_01", "kind": "Map 1 Sea-Travel Port Town · South Coast", "ring": "bronze", "preserveFrame": True},
        {"sheet": "travel", "r": 3, "c": 1, "id": "tr_port_map02_highland_cove_south", "name": "Highland Cove Port Town", "cat": "travel", "map": "map_02", "kind": "Map 2 Sea-Travel Port Town · South Coast", "ring": "bronze", "preserveFrame": True},
        {"sheet": "travel", "r": 3, "c": 2, "id": "tr_port_map03_desert_harbor_south", "name": "Desert Harbor Port Town", "cat": "travel", "map": "map_03", "kind": "Map 3 Sea-Travel Port Town · South Coast", "ring": "bronze", "preserveFrame": True},
        {"sheet": "travel", "r": 3, "c": 3, "id": "tr_port_map04_arctic_seaport_south", "name": "Arctic Sea-Port Town", "cat": "travel", "map": "map_04", "kind": "Map 4 Sea-Travel Port Town · South Coast", "ring": "bronze", "preserveFrame": True},
    ]
)


def export_all_overworld_maps() -> None:
    full_size = 8192
    tile_size = 512
    atlas_size = 1536
    cols = full_size // tile_size
    rows = full_size // tile_size

    for m in MAPS_CONFIG:
        out_dir = CLIENT_MAPS_DIR / m["id"]
        meta_path = out_dir / "meta.json"
        atlas_path = out_dir / "atlas.webp"
        src = ROOT / "assets" / "maps" / "overworld" / m["src"]

        if not atlas_path.exists() and src.exists():
            out_dir.mkdir(parents=True, exist_ok=True)
            with Image.open(src) as im:
                atlas_im = im.convert("RGB").resize((atlas_size, atlas_size), Image.Resampling.LANCZOS)
                atlas_im.save(atlas_path, "WEBP", quality=88, method=6)
            print(f"  Exported {atlas_size}x{atlas_size} World Atlas -> {atlas_path.relative_to(ROOT)} ({atlas_path.stat().st_size // 1024} KB)")

        existing_tiles = list(out_dir.glob("tile_*.webp")) if out_dir.exists() else []
        if meta_path.exists() and len(existing_tiles) == cols * rows:
            print(f"[SKIP] {m['id']} already tiled ({len(existing_tiles)} WebP tiles)")
            continue

        if not src.exists():
            print(f"[WARN] Missing source map: {src}")
            continue

        out_dir.mkdir(parents=True, exist_ok=True)
        print(f"Upscaling {m['src']} -> {full_size}x{full_size} and slicing {cols}x{rows} WebP tiles...")
        with Image.open(src) as im:
            im = im.convert("RGB")
            doubled = im.resize((full_size, full_size), Image.Resampling.LANCZOS)

        total_bytes = 0
        for r in range(rows):
            for c in range(cols):
                x0, y0 = c * tile_size, r * tile_size
                tile = doubled.crop((x0, y0, x0 + tile_size, y0 + tile_size))
                tpath = out_dir / f"tile_{c}_{r}.webp"
                tile.save(tpath, "WEBP", quality=85, method=4)
                total_bytes += tpath.stat().st_size

        meta = {
            "id": m["id"],
            "name": m["name"],
            "regionLabel": m["regionLabel"],
            "width": full_size,
            "height": full_size,
            "tileSize": tile_size,
            "cols": cols,
            "rows": rows,
            "spawn": m["spawn"],
        }
        meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")
        print(f"  Exported {cols * rows} WebP tiles -> {out_dir.relative_to(ROOT)} ({total_bytes // 1024} KB)")


def clean_and_extract_cell(
    sheet_rgb: np.ndarray,
    r: int,
    c: int,
    out_size: int = 256,
    preserve_frame: bool = False,
    grid_size: int = 4,
) -> Image.Image:
    """Slice one grid_size x grid_size cell, chroma-key #FF00FF magenta, and center onto transparent 256x256 RGBA."""
    h, w, _ = sheet_rgb.shape
    cw, ch = w / float(grid_size), h / float(grid_size)
    margin = max(8, int(round(min(cw, ch) * 0.015))) if preserve_frame else 0
    x0 = max(0, int(round(c * cw)) - margin)
    y0 = max(0, int(round(r * ch)) - margin)
    x1 = min(w, int(round((c + 1) * cw)) + margin)
    y1 = min(h, int(round((r + 1) * ch)) + margin)
    cell = sheet_rgb[y0:y1, x0:x1].astype(np.float32)

    cr, cg, cb = cell[:, :, 0], cell[:, :, 1], cell[:, :, 2]
    bleed = np.maximum(0.0, np.minimum(cr - cg, cb - cg))

    t_low, t_high = 18.0, 155.0
    alpha = np.where(
        bleed >= t_high,
        0.0,
        np.where(bleed <= t_low, 255.0, 255.0 * (t_high - bleed) / (t_high - t_low)),
    )

    despill = bleed > t_low
    new_r = np.where(despill, np.clip(cr - bleed, 0.0, 255.0), cr)
    new_g = cg
    new_b = np.where(despill, np.clip(cb - bleed, 0.0, 255.0), cb)

    yy, xx = np.ogrid[: cell.shape[0], : cell.shape[1]]
    if preserve_frame:
        # Center on true cell midpoint so corner lugs and outer bevel stay intact
        cx = (c + 0.5) * cw - x0
        cy = (r + 0.5) * ch - y0
        dy, dx = yy - cy, xx - cx
        dist = np.sqrt(dx ** 2 + dy ** 2)

        # Fit base circular ring radius along off-axis angles (away from 45° lugs & 0°/90° neighbor seams)
        sample_radii: list[float] = []
        scan_min = min(cw, ch) * 0.45
        scan_max = min(cw, ch) * 0.53
        for deg in (12, 16, 20, 70, 74, 78, 102, 106, 110, 160, 164, 168, 192, 196, 200, 250, 254, 258, 282, 286, 290, 340, 344, 348):
            th = np.deg2rad(deg)
            for rad in np.linspace(scan_min, scan_max, 96):
                px = int(round(cx + rad * np.cos(th)))
                py = int(round(cy + rad * np.sin(th)))
                if 0 <= px < cell.shape[1] and 0 <= py < cell.shape[0] and bleed[py, px] > 100.0:
                    sample_radii.append(float(rad))
                    break
        ring_r = float(np.median(sample_radii)) if sample_radii else min(cw, ch) * 0.5015

        # Only round out cardinal poles (|cos| or |sin| > 0.90) where tangent neighbors may kiss; keep diagonal corner lugs unclipped
        safe_dist = np.maximum(dist, 1e-6)
        cardinal_sector = np.maximum(np.abs(dx) / safe_dist, np.abs(dy) / safe_dist) > 0.90
        radial_clip = np.clip((ring_r + 1.0 - dist) / 2.0, 0.0, 1.0)
        lug_cap = np.clip((min(cw, ch) * 0.56 - dist) / 2.0, 0.0, 1.0)
        clip_mask = np.where(cardinal_sector, radial_clip, lug_cap)

        masked_alpha = np.clip(alpha * clip_mask, 0.0, 255.0)
        # Keep only main connected component touching center so neighbor specks never leak
        comp_mask = (masked_alpha > 48.0).astype(np.uint8)
        num_lbl, labels = cv2.connectedComponents(comp_mask)
        if num_lbl > 1:
            center_lbl = int(labels[int(round(cy)), int(round(cx))])
            if center_lbl > 0:
                masked_alpha = np.where(labels == center_lbl, masked_alpha, 0.0)
        final_alpha = masked_alpha.astype(np.uint8)
        fg_pts = dist[final_alpha > 128]
        radius = float(fg_pts.max()) if fg_pts.size else min(cw, ch) * 0.525
    else:
        fg_mask = (bleed < 42.0).astype(np.uint8) * 255
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        fg_clean = cv2.morphologyEx(fg_mask, cv2.MORPH_OPEN, kernel)
        fg_clean = cv2.morphologyEx(fg_clean, cv2.MORPH_CLOSE, kernel)

        contours, _ = cv2.findContours(fg_clean, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if contours:
            largest = max(contours, key=cv2.contourArea)
            (cx, cy), radius = cv2.minEnclosingCircle(largest)
            if radius < (cell.shape[1] * 0.30) or radius > (cell.shape[1] * 0.50):
                cx, cy = cell.shape[1] / 2.0, cell.shape[0] / 2.0
                radius = min(cell.shape[0], cell.shape[1]) * 0.455
        else:
            cx, cy = cell.shape[1] / 2.0, cell.shape[0] / 2.0
            radius = min(cell.shape[0], cell.shape[1]) * 0.455

        dist = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
        clip_mask = np.clip((radius + 1.0 - dist) / 2.0, 0.0, 1.0)
        final_alpha = np.clip(alpha * clip_mask, 0.0, 255.0).astype(np.uint8)

    rgba = np.dstack(
        (
            new_r.astype(np.uint8),
            new_g.astype(np.uint8),
            new_b.astype(np.uint8),
            final_alpha,
        )
    )

    pad = int(round(radius * 1.04))
    cx_i, cy_i = int(round(cx)), int(round(cy))
    sx0, sy0 = cx_i - pad, cy_i - pad
    sx1, sy1 = cx_i + pad, cy_i + pad

    canvas = np.zeros((pad * 2, pad * 2, 4), dtype=np.uint8)
    dx0 = max(0, -sx0)
    dy0 = max(0, -sy0)
    rx0 = max(0, sx0)
    ry0 = max(0, sy0)
    rx1 = min(cell.shape[1], sx1)
    ry1 = min(cell.shape[0], sy1)
    canvas[dy0 : dy0 + (ry1 - ry0), dx0 : dx0 + (rx1 - rx0)] = rgba[ry0:ry1, rx0:rx1]

    pil_img = Image.fromarray(canvas, "RGBA")
    return pil_img.resize((out_size, out_size), Image.Resampling.LANCZOS)


# Progression metadata for all core hubs, portals, and quest caves/ruins
PROGRESSION_INFO: dict[str, tuple[int, str, str]] = {
    # Map 1
    "loc_01_overgrown_garden_sanctuary": (1, "Lv 1 Start", "always_visible"),
    "loc_02_oakhaven": (2, "Lv 2–7 · Steps 1–2", "always_visible"),
    "hub_meadowbrook_hamlet": (3, "Lv 4–8 · Step 2", "always_visible"),
    "loc_04_millbrook_crossing": (4, "Lv 7–11 · Step 3", "always_visible"),
    "hub_crownlands_hill_fort": (5, "Lv 8–12 · Step 3", "always_visible"),
    "loc_05_the_ashen_gate": (6, "Lv 11–15 · Boss #1", "always_visible"),
    "loc_06_saltwind_harbor": (7, "Lv 12–15 · Step 4", "always_visible"),
    "hub_brinecliff_watch_fort": (8, "Lv 14–19 · Step 5", "always_visible"),
    "hub_reedfen_village": (9, "Lv 16–21 · Step 5", "always_visible"),
    "loc_09_mirewatch_post": (10, "Lv 18–23 · Step 6", "always_visible"),
    "hub_tidewater_keep": (11, "Lv 21–25 · Step 6", "always_visible"),
    "loc_10_the_sunken_maw": (12, "Lv 21–25 · Boss #2", "always_visible"),
    # Map 2
    "loc_11_redmarch_bastion": (13, "Lv 25–30 · Steps 7–9", "always_visible"),
    "hub_goldmoor_village": (14, "Lv 26–31 · Step 8", "always_visible"),
    "hub_slatepeak_mining_fort": (15, "Lv 28–33 · Step 8", "always_visible"),
    "hub_thornwall_border_castle": (16, "Lv 30–35 · Step 9", "always_visible"),
    "loc_13_hollowstone_keep": (17, "Lv 35–39 · Chain C2", "always_visible"),
    "loc_15_the_iron_rift": (18, "Lv 36–40 · Boss #3", "always_visible"),
    "loc_16_briarstead": (19, "Lv 37–42 · Steps 10–12", "always_visible"),
    "hub_timberfall_village": (20, "Lv 38–43 · Step 11", "always_visible"),
    "hub_mosswood_hamlet": (21, "Lv 40–45 · Step 11", "always_visible"),
    "hub_greenwarden_fort": (22, "Lv 42–47 · Step 12", "always_visible"),
    "hub_blightwatch_keep": (23, "Lv 45–50 · Step 12", "always_visible"),
    "loc_20_the_rotspire": (24, "Lv 46–50 · Boss #4", "always_visible"),
    # Map 3
    "loc_21_port_veridia": (25, "Lv 49–54 · Steps 13–14", "always_visible"),
    "hub_sunstone_caravan_post": (26, "Lv 51–56 · Step 14", "always_visible"),
    "loc_23_dunespire_oasis": (27, "Lv 53–58 · Step 15", "always_visible"),
    "hub_sandwall_citadel": (28, "Lv 55–59 · Step 15", "always_visible"),
    "loc_24_gilded_auction_manor": (29, "Lv 60–64 · Chain A3", "always_visible"),
    "loc_25_the_scorched_chasm": (30, "Lv 61–65 · Boss #5", "always_visible"),
    "loc_26_highpass_refuge": (31, "Lv 61–66 · Steps 16–17", "always_visible"),
    "hub_clearwater_lake_village": (32, "Lv 63–68 · Step 17", "always_visible"),
    "loc_27_anvilhall_forge": (33, "Lv 65–70 · Step 18", "always_visible"),
    "hub_cragwatch_fort": (34, "Lv 67–71 · Step 18", "always_visible"),
    "hub_stormhold_citadel": (35, "Lv 70–75 · Step 18", "always_visible"),
    "loc_30_storm_crowned_spire": (36, "Lv 71–75 · Boss #6", "always_visible"),
    # Map 4
    "loc_31_rimeport": (37, "Lv 73–78 · Steps 19–21", "always_visible"),
    "hub_frostmere_village": (38, "Lv 75–80 · Step 20", "always_visible"),
    "hub_glacierwatch_fort": (39, "Lv 77–82 · Step 20", "always_visible"),
    "hub_icecrest_holdfast": (40, "Lv 79–84 · Step 21", "always_visible"),
    "loc_34_bleakwatch_citadel": (41, "Lv 85–89 · Chain C3", "always_visible"),
    "loc_35_the_pale_abyss": (42, "Lv 86–90 · Boss #7", "always_visible"),
    "loc_36_ashenford_war_camp": (43, "Lv 86–92 · Steps 22–24", "always_visible"),
    "hub_cinderwatch_bastion": (44, "Lv 88–94 · Step 23", "always_visible"),
    "hub_ashvale_village": (45, "Lv 90–96 · Step 23", "always_visible"),
    "hub_scorchwall_fort": (46, "Lv 96–98 · Step 24", "always_visible"),
    "loc_40_garricks_black_keep": (47, "Lv 96–99 · Final Keep", "always_visible"),
    "loc_39_the_eclipse_gate": (48, "Lv 96–99 · Final Boss #8", "always_visible"),
    # Zone Outposts Z1–Z20 (always visible)
    "outpost_z01_meadowgate": (51, "Zone 1 · Lv 1–5", "always_visible"),
    "outpost_z02_oakwood": (52, "Zone 2 · Lv 6–10", "always_visible"),
    "outpost_z03_slate_ridge": (53, "Zone 3 · Lv 11–15", "always_visible"),
    "outpost_z04_brinefen": (54, "Zone 4 · Lv 16–20", "always_visible"),
    "outpost_z05_bogwarden": (55, "Zone 5 · Lv 21–25", "always_visible"),
    "outpost_z06_ochre_downs": (56, "Zone 6 · Lv 26–30", "always_visible"),
    "outpost_z07_cragspire": (57, "Zone 7 · Lv 31–35", "always_visible"),
    "outpost_z08_fernbrook": (58, "Zone 8 · Lv 36–40", "always_visible"),
    "outpost_z09_canopy_watch": (59, "Zone 9 · Lv 41–45", "always_visible"),
    "outpost_z10_mire_edge": (60, "Zone 10 · Lv 46–50", "always_visible"),
    "outpost_z11_dune_runner": (61, "Zone 11 · Lv 51–55", "always_visible"),
    "outpost_z12_palm_spring": (62, "Zone 12 · Lv 56–60", "always_visible"),
    "outpost_z13_mesa_watch": (63, "Zone 13 · Lv 61–65", "always_visible"),
    "outpost_z14_pine_valley": (64, "Zone 14 · Lv 66–70", "always_visible"),
    "outpost_z15_highland_crag": (65, "Zone 15 · Lv 71–75", "always_visible"),
    "outpost_z16_snowdrift": (66, "Zone 16 · Lv 76–80", "always_visible"),
    "outpost_z17_glacier_edge": (67, "Zone 17 · Lv 81–85", "always_visible"),
    "outpost_z18_ashen_ridge": (68, "Zone 18 · Lv 86–90", "always_visible"),
    "outpost_z19_cinder_plain": (69, "Zone 19 · Lv 91–95", "always_visible"),
    "outpost_z20_black_crag": (70, "Zone 20 · Lv 96–99", "always_visible"),
}

REGION_LEVELS = {
    1: "Lv 1–12",
    2: "Lv 13–24",
    3: "Lv 25–36",
    4: "Lv 37–48",
    5: "Lv 49–60",
    6: "Lv 61–72",
    7: "Lv 73–85",
    8: "Lv 86–99",
}


def export_markers(json_only: bool = False, only_sheets: set[str] | None = None) -> None:
    OUT_MARKERS_DIR.mkdir(parents=True, exist_ok=True)
    loaded_sheets: dict[int | str, np.ndarray] = {}

    if not json_only:
        for key, fname in SHEET_FILES.items():
            if only_sheets is not None and str(key) not in only_sheets:
                continue
            sheet_path = SHEETS_DIR / fname
            if not sheet_path.exists():
                stem = Path(fname).stem
                for alt_ext in (".jpg", ".png", ".webp"):
                    alt = SHEETS_DIR / f"{stem}{alt_ext}"
                    if alt.exists():
                        sheet_path = alt
                        break
            if not sheet_path.exists():
                print(f"[PENDING] Missing batch sheet {fname} — skipping its cells until downloaded.")
                continue
            loaded_sheets[key] = np.array(Image.open(sheet_path).convert("RGB"))
            print(f"Loaded sheet {key}: {sheet_path.name} ({loaded_sheets[key].shape[1]}x{loaded_sheets[key].shape[0]})")

    # Deduplicate by id (allows loc_a (3,0) Hollowstone Keep to overwrite Sheet 2 (0,2) once loc_a arrives)
    resolved_by_id: dict[str, dict] = {}
    for entry in TOKEN_DEFS:
        eid = entry["id"]
        sheet_key = entry["sheet"]
        if only_sheets is None and not json_only and sheet_key not in loaded_sheets and eid in resolved_by_id:
            continue
        resolved_by_id[eid] = entry

    active_entries = list(resolved_by_id.values())
    active_ids = set(resolved_by_id.keys())

    # Remove orphaned WebP files from retired/renamed tokens
    removed = 0
    for old_webp in OUT_MARKERS_DIR.glob("*.webp"):
        if old_webp.stem not in active_ids:
            old_webp.unlink()
            removed += 1
    if removed:
        print(f"Removed {removed} retired/orphaned WebP marker file(s) from {OUT_MARKERS_DIR.relative_to(ROOT)}")

    manifest: list[dict] = []
    exported_count = 0
    pending_count = 0
    for entry in active_entries:
        out_path = OUT_MARKERS_DIR / f"{entry['id']}.webp"
        sheet_key = entry["sheet"]
        if not json_only:
            if sheet_key in loaded_sheets:
                tok_img = clean_and_extract_cell(
                    loaded_sheets[sheet_key],
                    entry["r"],
                    entry["c"],
                    out_size=256,
                    preserve_frame=bool(entry.get("preserveFrame", False)),
                )
                if entry.get("flipX"):
                    tok_img = ImageOps.mirror(tok_img)
                if entry.get("flipY"):
                    tok_img = ImageOps.flip(tok_img)
                tok_img.save(out_path, "WEBP", quality=92, method=6)
                exported_count += 1
            elif entry.get("flipX") or entry.get("flipY"):
                base_id = re.sub(r"_flipped(?:_v|_hv)?$", "", entry["id"])
                base_out = OUT_MARKERS_DIR / f"{base_id}.webp"
                if base_out.exists():
                    with Image.open(base_out) as base_im:
                        tok_img = base_im.convert("RGBA")
                        if entry.get("flipX"):
                            tok_img = ImageOps.mirror(tok_img)
                        if entry.get("flipY"):
                            tok_img = ImageOps.flip(tok_img)
                        tok_img.save(out_path, "WEBP", quality=92, method=6)
                    exported_count += 1
                elif only_sheets is None:
                    pending_count += 1
            elif only_sheets is None:
                pending_count += 1
        manifest.append(
            {
                **entry,
                "ready": out_path.exists(),
                "assetPath": f"assets/tokens/markers/{entry['id']}.webp",
                "fileSizeBytes": out_path.stat().st_size if out_path.exists() else 0,
            }
        )

    print(
        f"Exported {exported_count} WebP tokens ({pending_count} pending) -> {OUT_MARKERS_DIR.relative_to(ROOT)}"
    )

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    CLIENT_DATA_DIR.mkdir(parents=True, exist_ok=True)

    manifest_path = DATA_DIR / "markers-manifest.json"
    manifest_text = json.dumps({"count": len(manifest), "markers": manifest}, indent=2)
    manifest_path.write_text(manifest_text, encoding="utf-8")
    (CLIENT_DATA_DIR / "markers-manifest.json").write_text(manifest_text, encoding="utf-8")

    # Seed or refresh world-locations.json while preserving any existing placed coordinates
    world_path = DATA_DIR / "world-locations.json"
    existing_by_id: dict[str, dict] = {}
    cloned_instances: list[dict] = []
    locked_maps: list[str] = []
    if world_path.exists():
        try:
            old_data = json.loads(world_path.read_text(encoding="utf-8"))
            if isinstance(old_data.get("lockedMaps"), list):
                locked_maps = [m for m in old_data["lockedMaps"] if isinstance(m, str)]
            for loc in old_data.get("locations", []):
                existing_by_id[loc["id"]] = loc
                if re.search(r"_inst_\d+$", str(loc.get("id", ""))):
                    cloned_instances.append(loc)
        except Exception:
            pass

    locations: list[dict] = []
    for idx, entry in enumerate(active_entries):
        if entry["cat"] in ("dungeon_door", "dungeon_prop", "hub_landmark", "bounty_field", "standby"):
            continue
        eid = entry["id"]
        prev = existing_by_id.get(eid, {})
        if eid in PROGRESSION_INFO:
            prog_order, lvl_range, visibility = PROGRESSION_INFO[eid]
        else:
            prog_order = (100 + entry["questNum"]) if entry.get("questNum") else (1000 + idx)
            hub_id = entry.get("hubId")
            if entry["cat"] == "quest_field" and hub_id in PROGRESSION_INFO:
                hub_lvl = PROGRESSION_INFO[hub_id][1].split("·")[0].strip()
                lvl_range = "Lv 1–4" if hub_lvl == "Lv 1 Start" else hub_lvl
            else:
                reg = entry.get("region")
                lvl_range = REGION_LEVELS.get(reg, "All Regions") if reg else "All Regions"
            visibility = "always_visible" if entry["cat"] == "travel" else "quest_active_only"

        locations.append(
            {
                "id": eid,
                "locNum": entry.get("locNum"),
                "zoneNum": entry.get("zoneNum"),
                "progOrder": prog_order,
                "levelRange": lvl_range,
                "visibility": visibility,
                "name": entry["name"],
                "category": entry["cat"],
                "mapId": prev.get("mapId") if prev.get("placed") else entry["map"],
                "region": entry.get("region"),
                "kind": entry["kind"],
                "isPortal": bool(entry.get("isPortal", False)),
                "portalNum": entry.get("portalNum"),
                "assetPath": f"assets/tokens/markers/{eid}.webp",
                **({"allowedBiomeIds": entry["allowedBiomeIds"]} if entry.get("allowedBiomeIds") else {}),
                **({"minOceanHexes": entry["minOceanHexes"]} if entry.get("minOceanHexes") is not None else {}),
                **({"minDownsHexes": entry["minDownsHexes"]} if entry.get("minDownsHexes") is not None else {}),
                **({"maxDownsHexes": entry["maxDownsHexes"]} if entry.get("maxDownsHexes") is not None else {}),
                **(
                    {
                        "questFormat": entry.get("questFormat", "wilderness_pin"),
                        "placeOnOverworld": bool(entry.get("placeOnOverworld", True)),
                        "targetHubId": entry.get("targetHubId"),
                        "targetHubName": entry.get("targetHubName"),
                        "pickedUpAtId": entry.get("hubId"),
                        "pickedUpAtName": entry.get("hubName"),
                    }
                    if entry["cat"] == "quest_field"
                    else {}
                ),
                "placed": bool(prev.get("placed", False)),
                "locked": bool(prev.get("locked", False)),
                "x": prev.get("x"),
                "y": prev.get("y"),
                "scale": prev.get("scale", 1.0),
                "triggerRadius": prev.get("triggerRadius", 88),
                **({"interiorAssetPath": prev["interiorAssetPath"]} if prev.get("interiorAssetPath") else {}),
                **({"tavernAssetPath": prev["tavernAssetPath"]} if prev.get("tavernAssetPath") else {}),
                **({"tavernName": prev["tavernName"]} if prev.get("tavernName") else {}),
                **({"linkedFerryId": prev["linkedFerryId"]} if "linkedFerryId" in prev else {}),
                **({"passExitX": prev["passExitX"]} if prev.get("passExitX") is not None else {}),
                **({"passExitY": prev["passExitY"]} if prev.get("passExitY") is not None else {}),
                **({"rotation": prev["rotation"]} if prev.get("rotation") else {}),
            }
        )

    by_tpl_id = {l["id"]: l for l in locations}
    seen_ids = set(by_tpl_id.keys())
    for clone in cloned_instances:
        if clone.get("id") not in seen_ids:
            base_id = re.sub(r"_inst_\d+$", "", str(clone.get("id", "")))
            if base_id in by_tpl_id:
                clone = {**clone, "name": by_tpl_id[base_id]["name"], "kind": by_tpl_id[base_id]["kind"]}
            locations.append(clone)
            seen_ids.add(clone["id"])

    world_payload = {
        "version": 2,
        "maps": [m["id"] for m in MAPS_CONFIG],
        "lockedMaps": locked_maps,
        "locations": locations,
    }
    world_text = json.dumps(world_payload, indent=2)
    world_path.write_text(world_text, encoding="utf-8")
    (CLIENT_DATA_DIR / "world-locations.json").write_text(world_text, encoding="utf-8")
    print(
        f"Saved world schema ({len(locations)} placeable markers) -> data/world-locations.json + client/assets/data/world-locations.json"
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--json-only", action="store_true", help="Only update JSON metadata/schemas without re-encoding images.")
    parser.add_argument("--atlas-only", action="store_true", help="Only export single-file World Atlas overview WebPs.")
    parser.add_argument("--sheet", nargs="+", default=None, help="Only load and export specific sheet key(s), e.g. --sheet loc_d.")
    args = parser.parse_args()
    only_sheets = {s.strip() for s in args.sheet} if args.sheet else None
    if args.atlas_only:
        export_all_overworld_maps()
    else:
        if not args.json_only and only_sheets is None:
            export_all_overworld_maps()
        export_markers(json_only=args.json_only, only_sheets=only_sheets)
