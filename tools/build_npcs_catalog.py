"""Generate the complete, deterministic Ethoria NPC roster across all locations.

Outputs:
- data/npcs-catalog.json
- client/assets/data/npcs-catalog.json
- npc-list.txt (clean, plain-text master list for human review)
"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(r"C:\Users\drew0\Documents\ROD")
WORLD_PATH = ROOT / "data" / "world-locations.json"
OUT_DATA = ROOT / "data" / "npcs-catalog.json"
OUT_CLIENT = ROOT / "client" / "assets" / "data" / "npcs-catalog.json"
OUT_TXT = ROOT / "npc-list.txt"

BANNED_FIRST_NAMES = {"valen", "ellowyn", "orin", "rowan", "mera", "harlan", "koren", "garrick"}

# Grounded medieval human name pools grouped by cultural tone / region
FIRST_NAMES_MALE = [
    "Aldric", "Bramwell", "Cedric", "Duncan", "Edmund", "Fletcher", "Gideon", "Hadrian",
    "Ivor", "Jasper", "Kendrick", "Leopold", "Malcolm", "Nolan", "Oswald", "Percival",
    "Quentin", "Roderick", "Sebastian", "Tobias", "Ulric", "Victor", "Willem", "Xander",
    "Yorick", "Zachary", "Alistair", "Barnaby", "Caspar", "Dorian", "Evander", "Godwin",
    "Henrik", "Ignatius", "Jonas", "Kieran", "Lucian", "Matthias", "Nigel", "Octavian",
    "Piers", "Randall", "Silas", "Thaddeus", "Vance", "Walter", "Ambrose", "Bertram",
    "Conrad", "Desmond", "Eamon", "Fabian", "Gerard", "Hugh", "Isidore", "Jorah",
    "Keegan", "Lambert", "Martin", "Norbert", "Otis", "Patrick", "Redmond", "Simeon",
    "Tristan", "Vernon", "Warren", "Alaric", "Benedict", "Clement", "Darius", "Elias",
    "Fergus", "Gilbert", "Hector", "Inigo", "Julian", "Killian", "Lazarus", "Marcus",
    "Nathaniel", "Orson", "Phineas", "Quincy", "Roland", "Stephen", "Theobald", "Uriah",
    "Viggo", "Winston", "Anders", "Bjorn", "Caleb", "Derrick", "Eirik", "Favian",
    "Gunnar", "Halvor", "Ivan", "Joren", "Knut", "Leif", "Magnus", "Nikolai",
    "Olaf", "Peder", "Ragnar", "Sigurd", "Torsten", "Uffe", "Valdemar", "Wulfric",
    "Adelard", "Baird", "Corvin", "Draven", "Edric", "Fendrel", "Garran", "Hakon",
]

FIRST_NAMES_FEMALE = [
    "Adeline", "Beatrice", "Clara", "Delilah", "Eleanor", "Fiona", "Gwendolyn", "Helena",
    "Isolde", "Josephine", "Katrina", "Lavinia", "Miriam", "Nadia", "Ophelia", "Phillipa",
    "Rosalind", "Sabina", "Tabitha", "Ursula", "Vivienne", "Winifred", "Yvette", "Zelda",
    "Agatha", "Bridget", "Cecily", "Dorothea", "Estelle", "Freya", "Genevieve", "Harriet",
    "Ingrid", "Johanna", "Katherine", "Lydia", "Marjorie", "Nora", "Ottilie", "Prudence",
    "Rhiannon", "Sylvia", "Tamsin", "Una", "Veronica", "Willa", "Astrid", "Brenda",
    "Cordelia", "Edith", "Flora", "Greta", "Hilda", "Irma", "Judith", "Karin",
    "Linnea", "Maeve", "Naomi", "Olga", "Petra", "Ragna", "Signe", "Thyra",
    "Ulrika", "Valdis", "Wanda", "Amina", "Bess", "Cora", "Dahlia", "Eliza",
    "Frances", "Grace", "Hannah", "Ida", "Joan", "Kate", "Leah", "Martha",
    "Nell", "Olive", "Phoebe", "Rachel", "Sarah", "Tessa", "Vera", "Wilma",
]

SURNAMES = [
    "Ashworth", "Blackwood", "Carter", "Dunstan", "Elliot", "Fairfax", "Goodwin", "Hawthorne",
    "Ironwood", "Jennings", "Kemp", "Lancaster", "Mercer", "Northwood", "Oakley", "Pendleton",
    "Quickwater", "Redmayne", "Stonebridge", "Thatcher", "Underhill", "Vane", "Whitaker", "York",
    "Alder", "Barrow", "Chandler", "Draper", "Everett", "Fowler", "Granger", "Hollis",
    "Ironside", "Joss", "Kestrel", "Larkin", "Marrow", "Neville", "Osborne", "Parr",
    "Quarry", "Rowley", "Sawyer", "Tanner", "Upton", "Voss", "Wainwright", "Yeoman",
    "Baxter", "Cooper", "Dyer", "Fenwick", "Glover", "Hayward", "Inman", "Judd",
    "Kidd", "Locke", "Miller", "Naylor", "Oakhurst", "Porter", "Read", "Shepherd",
    "Turner", "Unwin", "Ward", "Webster", "Baker", "Brewer", "Chapman", "Decker",
    "Farrier", "Gale", "Hall", "Irwin", "Jarvis", "Keene", "Lowe", "Mason",
    "Needham", "Orr", "Page", "Reeves", "Slater", "Trask", "Usher", "Vickers",
    "Wells", "Bram", "Croft", "Dale", "Eaton", "Ford", "Giles", "Holt",
    "Kerr", "Lane", "Marsh", "Nash", "Pike", "Quinn", "Rhodes", "Shaw",
    "Todd", "Vaughan", "Wade", "Briggs", "Cobb", "Dunn", "Finch", "Gunn",
    "Hale", "Kaye", "Moss", "Noyes", "Poole", "Rye", "Stroud", "Webb",
]

FEMALE_ROLE_HINTS = (
    "apothecary", "herbalist", "healer", "medic", "alchemist", "bard", "archivist",
    "chronicler", "scholar", "innkeeper", "grocer", "chaplain", "warden", "keeper",
    "clerk", "steward", "shepherd", "merchant",
)

MAP_TITLES = {
    "map_01": "MAP 1 — THE CROWNLANDS & SALTMARSH COAST (Regions 1–2 | Lv 1–25)",
    "map_02": "MAP 2 — THORNWALL WARFRONTS & VERDANT WEALD (Regions 3–4 | Lv 25–50)",
    "map_03": "MAP 3 — SUN-SCORCHED ISLES & IRONCREST HIGHLANDS (Regions 5–6 | Lv 49–75)",
    "map_04": "MAP 4 — FROSTBOUND REACH & THE DREADWASTE (Regions 7–8 | Lv 73–99)",
    "all": "WORLD TRANSIT — BORDER CROSSINGS",
}

PORTAL_BOSSES = {
    "loc_05_the_ashen_gate": ("The Ashen Iron Golem", "Portal Boss #1 (Construct · Zone 3 · Lv 11–15)"),
    "loc_10_the_sunken_maw": ("The Abyssal Aboleth", "Portal Boss #2 (Aberration · Zone 5 · Lv 21–25)"),
    "loc_15_the_iron_rift": ("The Fire Giant Warlord", "Portal Boss #3 (Giant · Zone 8 · Lv 36–40)"),
    "loc_20_the_rotspire": ("The Elder Blight-Treant", "Portal Boss #4 (Plant · Zone 10 · Lv 46–50)"),
    "loc_25_the_scorched_chasm": ("The Efreeti Pasha", "Portal Boss #5 (Elemental · Zone 13 · Lv 61–65)"),
    "loc_30_storm_crowned_spire": ("The Ancient Storm Dragon", "Portal Boss #6 (Dragon · Zone 15 · Lv 71–75)"),
    "loc_35_the_pale_abyss": ("The Pit Fiend General", "Portal Boss #7 (Fiend · Zone 18 · Lv 86–90)"),
    "loc_39_the_eclipse_gate": ("King Garrick, Sovereign of the Undead Eclipse", "Final Portal Boss #8 (Undead · Zone 20 · Lv 96–99)"),
}

ARENA_NAMES = {
    "loc_01_overgrown_garden_sanctuary": "Coliseum Pit-Master",
    "loc_02_oakhaven": "Town Arena Master",
    "loc_06_saltwind_harbor": "Dockside Arena Promoter",
    "hub_tidewater_keep": "Sparring Courtyard Master",
    "loc_11_redmarch_bastion": "Garrison Arena Master",
    "loc_13_hollowstone_keep": "Tourney Yard Herald",
    "loc_16_briarstead": "Woodland Ring Promoter",
    "hub_greenwarden_fort": "Ranger Ring Master",
    "loc_21_port_veridia": "Coastal Ring Promoter",
    "loc_24_gilded_auction_manor": "Gladiator Pit-Master",
    "hub_sandwall_citadel": "Desert Arena Champion-Master",
    "loc_26_highpass_refuge": "Highpass Sparring Master",
    "loc_27_anvilhall_forge": "Forge Trial Master",
    "hub_stormhold_citadel": "Storm Citadel Arena Master",
    "loc_31_rimeport": "Harbor Arena Promoter",
    "loc_34_bleakwatch_citadel": "Warlord Pit-Master",
}

SEA_DESTINATIONS = {
    "loc_06_saltwind_harbor": "Harbor Sea Travel (Map 2 / Map 3 / Map 4 Ports)",
    "loc_21_port_veridia": "Harbor Sea Travel (Map 1 / Map 2 / Map 4 Ports)",
    "loc_31_rimeport": "Harbor Sea Travel (Map 1 / Map 2 / Map 3 Ports)",
    "tr_port_map01_royal_trade": "Inter-Continent Sea Travel (Highland Cove, Desert Harbor, Arctic Sea-Port)",
    "tr_port_map02_highland_cove": "Inter-Continent Sea Travel (Royal Trade Port, Desert Harbor, Arctic Sea-Port)",
    "tr_port_map03_desert_harbor": "Inter-Continent Sea Travel (Royal Trade Port, Highland Cove, Arctic Sea-Port)",
    "tr_port_map04_arctic_seaport": "Inter-Continent Sea Travel (Royal Trade Port, Highland Cove, Desert Harbor)",
}


class NameAllocator:
    """Allocate deterministic, strictly unique human Ethorian names without repeating cast names."""

    def __init__(self) -> None:
        self.used_full: set[str] = set()
        self.m_idx = 0
        self.f_idx = 0
        self.s_idx = 0

    def next_name(self, prefer_female: bool = False, seed_offset: int = 0) -> str:
        while True:
            if prefer_female:
                fn = FIRST_NAMES_FEMALE[(self.f_idx + seed_offset) % len(FIRST_NAMES_FEMALE)]
                self.f_idx += 1
            else:
                fn = FIRST_NAMES_MALE[(self.m_idx + seed_offset) % len(FIRST_NAMES_MALE)]
                self.m_idx += 1
            sn = SURNAMES[(self.s_idx + seed_offset * 3) % len(SURNAMES)]
            self.s_idx += 1
            if fn.lower() in BANNED_FIRST_NAMES:
                continue
            full = f"{fn} {sn}"
            if full not in self.used_full:
                self.used_full.add(full)
                return full


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")


def parse_gear_step(services: list[str], lid: str) -> str | None:
    if lid == "loc_13_hollowstone_keep":
        return "Gear Tier 9 (Unlocked Post-Liberation)"
    if lid == "loc_24_gilded_auction_manor":
        return "Gear Tier 15 (Unlocked Post-Liberation)"
    if lid == "loc_34_bleakwatch_citadel":
        return "Gear Tier 22 (Unlocked Post-Liberation)"
    if lid == "loc_40_garricks_black_keep":
        return "Gear Tier 24 (Outer Bailey Vanguard)"
    for s in services:
        if "Chain " in s:
            continue
        m = re.search(r"(?:Gear\s+Tiers?|Steps?|Gear\s+Step)\s*([0-9]+(?:\s*[–\-]\s*[0-9]+)?)", s, re.IGNORECASE)
        if m:
            span = m.group(1).replace(" ", "")
            prefix = "Gear Tiers" if ("–" in span or "-" in span) else "Gear Tier"
            return f"{prefix} {span}"
        if "Starter Gear" in s:
            return "Gear Tier 1"
    return None


def parse_skill_tier(services: list[str], lid: str) -> str | None:
    if lid == "hub_thornwall_border_castle":
        return "Tier-3 Spells"
    if lid == "hub_greenwarden_fort":
        return "Tier-4 Spells"
    if lid == "hub_icecrest_holdfast":
        return "Tier-7 Spells"
    if lid == "hub_scorchwall_fort":
        return "Tier-8 Spells"
    for s in services:
        if "Tier-" in s and ("Spell" in s or "Skill" in s):
            return s
    return None


def map_order_key(loc: dict) -> tuple[int, int, str]:
    mid = loc.get("mapId", "map_01")
    m_rank = {"map_01": 1, "map_02": 2, "map_03": 3, "map_04": 4, "all": 5}.get(mid, 9)
    cat_rank = 0
    lid = loc["id"]
    if lid.startswith("loc_"):
        cat_rank = 1
    elif lid.startswith("hub_"):
        cat_rank = 2
    elif lid.startswith("outpost_"):
        cat_rank = 3
    elif lid.startswith("tr_port"):
        cat_rank = 4
    elif lid.startswith("tr_"):
        cat_rank = 5
    if loc.get("isPortal"):
        cat_rank = 6
    num = loc.get("locNum") or loc.get("zoneNum") or 999
    return (m_rank, cat_rank, f"{num:03d}_{loc['name']}")


def build_npcs() -> tuple[list[dict], list[dict]]:
    world = json.loads(WORLD_PATH.read_text(encoding="utf-8"))
    locs = [l for l in world["locations"] if l.get("category") != "quest_field"]
    locs.sort(key=map_order_key)

    alloc = NameAllocator()
    location_entries: list[dict] = []
    flat_npcs: list[dict] = []

    for loc in locs:
        lid = loc["id"]
        lname = loc["name"]
        ltype = loc.get("locationType") or loc.get("kind") or "Location"
        services: list[str] = loc.get("services") or []
        quests: list[dict] = loc.get("quests") or []
        faction_name = loc.get("factionName") or "None (Unaligned)"

        npcs: list[dict] = []

        # 1. Dimensional Portals -> Boss Encounter only (no town NPCs)
        if loc.get("isPortal"):
            boss_name, boss_role = PORTAL_BOSSES.get(lid, (loc.get("bossInfo", {}).get("boss", "Portal Boss"), "Portal Boss"))
            npcs.append({
                "id": f"npc_{slugify(lid)}_boss",
                "name": boss_name,
                "roleTitle": boss_role,
                "category": "boss",
                "servicesOffered": ["Dimensional Portal Boss Encounter"],
                "questsOffered": [],
            })

        # 2. Ferry Crossings & Border Pass
        elif lid.startswith("tr_ferry_"):
            ferry_name = alloc.next_name(prefer_female=False)
            npcs.append({
                "id": f"npc_{slugify(lid)}_ferryman",
                "name": ferry_name,
                "roleTitle": "Strait Ferryman",
                "category": "transit",
                "servicesOffered": ["Free Strait Ferry Crossing"],
                "questsOffered": [],
            })
        elif lid.startswith("tr_border_mountain_pass_gate"):
            warden_name = alloc.next_name(prefer_female=False)
            npcs.append({
                "id": f"npc_{slugify(lid)}_warden",
                "name": warden_name,
                "roleTitle": "Pass Gate Watchman",
                "category": "transit",
                "servicesOffered": ["Mountain Pass Gate Passage"],
                "questsOffered": [],
            })

        # 3. Inter-Continent Port Towns
        elif lid.startswith("tr_port_"):
            cap_name = alloc.next_name(prefer_female=False)
            dock_name = alloc.next_name(prefer_female=True)
            npcs.append({
                "id": f"npc_{slugify(lid)}_captain",
                "name": f"Capt. {cap_name}",
                "roleTitle": "Sea-Vessel Captain",
                "category": "service",
                "servicesOffered": [SEA_DESTINATIONS.get(lid, "Inter-Continent Sea Travel")],
                "questsOffered": [],
            })
            npcs.append({
                "id": f"npc_{slugify(lid)}_harbor_keeper",
                "name": dock_name,
                "roleTitle": "Harbor Rest Warden",
                "category": "service",
                "servicesOffered": ["Free Harbor Rest (0s)", "Field Supplies & Buy Trade Goods"],
                "questsOffered": [],
            })

        # 4. Zone Outposts (Z01–Z20)
        elif lid.startswith("outpost_z"):
            qm_name = alloc.next_name(prefer_female=(loc.get("zoneNum", 1) % 3 == 0))
            camp_name = alloc.next_name(prefer_female=(loc.get("zoneNum", 1) % 2 == 0))
            znum = loc.get("zoneNum") or "?"
            npcs.append({
                "id": f"npc_{slugify(lid)}_quartermaster",
                "name": qm_name,
                "roleTitle": f"Zone {znum} Hunt Quartermaster",
                "category": "hunt_quartermaster",
                "servicesOffered": [f"Repeatable Zone {znum} Monster Hunts (XP, Silver & Consumables)"],
                "questsOffered": [],
            })
            npcs.append({
                "id": f"npc_{slugify(lid)}_rest_tender",
                "name": camp_name,
                "roleTitle": "Outpost Camp Warden",
                "category": "service",
                "servicesOffered": ["Free Field Rest (0s)"],
                "questsOffered": [],
            })

        # 5. All 40 Permanent Hubs (Cities, Towns, Villages, Keeps, Hostile Strongholds)
        else:
            is_hostile = lid in (
                "loc_13_hollowstone_keep",
                "loc_24_gilded_auction_manor",
                "loc_34_bleakwatch_citadel",
                "loc_40_garricks_black_keep",
            )

            # Group multiple quests sharing the exact same giver string cleanly
            quests_by_giver: dict[str, list[str]] = {}
            for q in quests:
                quests_by_giver.setdefault(q["giver"], []).append(q["title"])

            # Pre-find any smith / armorer / quartermaster / steward among quest givers so we don't duplicate
            armorer_merged = False
            rest_merged = False

            # Service NPCs first (Inn / Rest, Armory, Mystic Tomes, Arena, Ship Port)
            has_free_inn = any("Free Inn" in s or "Free Capital Inn" in s for s in services)
            has_rest_hall = any("Free Rest" in s for s in services)
            if has_free_inn or has_rest_hall or is_hostile:
                if is_hostile:
                    rest_title = (
                        "Outer Bailey Vanguard Medic"
                        if lid == "loc_40_garricks_black_keep"
                        else "Liberated Garrison Steward (Unlocked Post-Liberation)"
                    )
                    rest_srv = (
                        ["Free Vanguard Rest (0s)", "Field Supplies"]
                        if lid == "loc_40_garricks_black_keep"
                        else ["Free Full Party Rest (0s Post-Liberation)"]
                    )
                else:
                    rest_title = "Royal Innkeeper" if lid == "loc_01_overgrown_garden_sanctuary" else ("Innkeeper" if has_free_inn else "Barracks Rest Steward")
                    rest_srv = ["Free Full Party Rest (0s)"]
                inn_name = alloc.next_name(prefer_female=True)
                npcs.append({
                    "id": f"npc_{slugify(lid)}_innkeeper",
                    "name": inn_name,
                    "roleTitle": rest_title,
                    "category": "service",
                    "servicesOffered": rest_srv,
                    "questsOffered": quests_by_giver.pop("Tavern Rumor", []),
                })
                rest_merged = True

            gear_step = parse_gear_step(services, lid)
            if gear_step:
                # Check if hub already has a quest-giving Blacksmith / Armorer / Smith we can unify cleanly
                matching_smith_role = next(
                    (
                        g for g in quests_by_giver
                        if any(k in g for k in ("Blacksmith", "Armorer", "Master Smith", "Master Forgemaster", "Highpass Smith"))
                        and g != "Coliseum Armorer"
                    ),
                    None,
                )
                if matching_smith_role:
                    smith_quests = quests_by_giver.pop(matching_smith_role)
                    role_label = f"{matching_smith_role} & Gear Merchant ({gear_step})"
                else:
                    smith_quests = []
                    role_label = f"Master Armorer & Provisions ({gear_step})"
                npcs.append({
                    "id": f"npc_{slugify(lid)}_armorer",
                    "name": alloc.next_name(prefer_female=False),
                    "roleTitle": role_label,
                    "category": "service",
                    "servicesOffered": [f"Weapons, Helmets, Body Armor, Shields & Accessories ({gear_step})", "Potions", "Buy Trade Goods"],
                    "questsOffered": smith_quests,
                })
                armorer_merged = True

            skill_tier = parse_skill_tier(services, lid)
            if skill_tier or lid == "loc_01_overgrown_garden_sanctuary":
                tier_tag = "Tier 1" if lid == "loc_01_overgrown_garden_sanctuary" else skill_tier.replace(" Skills", "")
                tome_label = (
                    "Sanctuary Apothecary & Caster Outfitter (Tier 1)"
                    if lid == "loc_01_overgrown_garden_sanctuary"
                    else f"Apothecary & Caster Outfitter ({tier_tag})"
                )
                # Unify local apothecary/archivist/scholar if one fits
                matching_mystic = next(
                    (g for g in quests_by_giver if any(k in g for k in ("Apothecary", "Village Alchemist", "Forest Archivist", "Oasis Scholar"))),
                    None,
                )
                m_quests = quests_by_giver.pop(matching_mystic) if matching_mystic else []
                m_role = f"{matching_mystic} & {tome_label}" if matching_mystic else tome_label
                npcs.append({
                    "id": f"npc_{slugify(lid)}_mystic",
                    "name": alloc.next_name(prefer_female=True),
                    "roleTitle": m_role,
                    "category": "service",
                    "servicesOffered": [tome_label, "Potions & Caster Accessories", "Buy Trade Goods"],
                    "questsOffered": m_quests,
                })

            if lid in ARENA_NAMES:
                npcs.append({
                    "id": f"npc_{slugify(lid)}_arena",
                    "name": alloc.next_name(prefer_female=False),
                    "roleTitle": ARENA_NAMES[lid],
                    "category": "service",
                    "servicesOffered": ["Local Arena & Coliseum Matches"],
                    "questsOffered": [],
                })

            if lid in SEA_DESTINATIONS:
                dock_quests = quests_by_giver.pop("Harbor Dockmaster", []) + quests_by_giver.pop("Rimeport Harbor Master", []) + quests_by_giver.pop("Veridia Harbormaster", [])
                npcs.append({
                    "id": f"npc_{slugify(lid)}_harbor",
                    "name": f"Capt. {alloc.next_name(prefer_female=False)}",
                    "roleTitle": "Harbor Master & Ship Captain",
                    "category": "service",
                    "servicesOffered": [SEA_DESTINATIONS[lid]],
                    "questsOffered": dock_quests,
                })

            # Contested / Hostile Stronghold Bosses + Post-Liberation Notes
            if lid == "loc_13_hollowstone_keep":
                npcs.append({
                    "id": "npc_hollowstone_boss",
                    "name": "Lord Cedric Hollowstone",
                    "roleTitle": "Rival Noble Commander (Chain C2 Boss + Tamed Ettin)",
                    "category": "boss",
                    "servicesOffered": ["Liberation Boss Encounter (Unlocks Gear Tier 9 Garrison & Free Rest When Beaten)"],
                    "questsOffered": [],
                })
            elif lid == "loc_24_gilded_auction_manor":
                npcs.append({
                    "id": "npc_gilded_manor_boss",
                    "name": "Cartel Master Cassian Vex",
                    "roleTitle": "Slaver Syndicate Overseer (Chain A3 Boss)",
                    "category": "boss",
                    "servicesOffered": ["Liberation Boss Encounter (Unlocks Gear Tier 15 Trade Armory & Free Rest When Beaten)"],
                    "questsOffered": [],
                })
            elif lid == "loc_34_bleakwatch_citadel":
                npcs.append({
                    "id": "npc_bleakwatch_boss",
                    "name": "Marshal Vaelen Bleakwatch",
                    "roleTitle": "Warlord Pretender (Chain C3 Boss)",
                    "category": "boss",
                    "servicesOffered": ["Liberation Boss Encounter (Unlocks Gear Tier 22 Clan Armory & Free Rest When Beaten)"],
                    "questsOffered": [],
                })
            elif lid == "loc_40_garricks_black_keep":
                npcs.append({
                    "id": "npc_garrick_throne_note",
                    "name": "King Garrick's Eclipse Guard",
                    "roleTitle": "Obsidian Inner Bailey Garrison (Leads to Portal #8 Throne Hall)",
                    "category": "boss",
                    "servicesOffered": ["Final Siege Assault -> Portal #8 (The Eclipse Gate)"],
                    "questsOffered": [],
                })

            # Remaining Quest Giver NPCs (preserving exact 1-to-1 quest linkage across all 178 quests)
            for giver_raw, q_titles in quests_by_giver.items():
                # Party companion / special object leads
                if giver_raw == "Orin / Capital Guard":
                    name = "Commander Orin (or Capital Watch Sgt. Marcus Locke)"
                    role = giver_raw
                elif giver_raw == "Orin / Home-Front Vanguard":
                    name = "Commander Orin (Home-Front Vanguard Lead)"
                    role = giver_raw
                elif giver_raw == "Ellowyn / Arcane Lead":
                    name = "Queen Ellowyn (Arcane Vanguard)"
                    role = giver_raw
                elif giver_raw in ("Valen", "Rowan", "Mera & Harlan"):
                    name = f"{giver_raw} (Party Hero Lead)"
                    role = "Companion Siege Objective"
                elif giver_raw == "Manifest Lead":
                    name = alloc.next_name(prefer_female=False)
                    role = "Port Shipping Clerk (Manifest Lead)"
                elif giver_raw == "Koren's Transfer Order":
                    name = alloc.next_name(prefer_female=False)
                    role = "Ashvale Garrison Scribe (Koren's Transfer Order)"
                elif giver_raw == "Inscribed Stone Tablet":
                    name = alloc.next_name(prefer_female=False)
                    role = "Scorchwall Crypt Scholar (Inscribed Stone Tablet)"
                elif giver_raw == "Tavern Rumor":
                    name = alloc.next_name(prefer_female=False)
                    role = "Crossroads Tavern Patron (Tavern Rumor)"
                else:
                    prefer_f = any(h in giver_raw.lower() for h in FEMALE_ROLE_HINTS)
                    name = alloc.next_name(prefer_female=prefer_f)
                    role = giver_raw

                extra_srv = []
                if giver_raw == "Coliseum Armorer":
                    extra_srv.append("Coliseum Arena Repairs & Gear")
                npcs.append({
                    "id": f"npc_{slugify(lid)}_{slugify(giver_raw)}",
                    "name": name,
                    "roleTitle": role,
                    "category": "quest_giver",
                    "servicesOffered": extra_srv or ["Local Hub Quest"],
                    "questsOffered": q_titles,
                })

            _ = (is_hostile, armorer_merged, rest_merged)

        entry = {
            "locationId": lid,
            "locNum": loc.get("locNum"),
            "zoneNum": loc.get("zoneNum"),
            "locationName": lname,
            "locationType": ltype,
            "mapId": loc.get("mapId"),
            "region": loc.get("region"),
            "factionName": faction_name,
            "npcCount": len(npcs),
            "npcs": npcs,
        }
        location_entries.append(entry)
        for npc in npcs:
            flat_npcs.append({**npc, "locationId": lid, "locationName": lname, "mapId": loc.get("mapId")})

    # #69 Highcrown Keep (Home-Front Interior inside Highcrown)
    keep_entry = {
        "locationId": "loc_69_highcrown_keep",
        "locNum": 69,
        "zoneNum": 1,
        "locationName": "Highcrown Keep (Home-Front Interior)",
        "locationType": "Royal Keep",
        "mapId": "map_01",
        "region": 1,
        "factionName": "Highcrown Loyalists",
        "npcCount": 3,
        "npcs": [
            {
                "id": "npc_keep_69_defenders",
                "name": "The 2 Remaining Party Heroes",
                "roleTitle": "Home-Front Keep Defenders (Swappable via Party Split / Story Milestones)",
                "category": "story_homefront",
                "servicesOffered": ["Home-Front Council Updates (at 2 / 4 / 6 / 7 Closed Portals)"],
                "questsOffered": [],
            },
            {
                "id": "npc_keep_69_chamberlain",
                "name": alloc.next_name(prefer_female=False),
                "roleTitle": "Highcrown Keep Chamberlain",
                "category": "service",
                "servicesOffered": ["Free Royal Keep Rest (0s)", "Archive Access & Dispatch Ledger"],
                "questsOffered": [],
            },
            {
                "id": "npc_keep_69_quartermaster",
                "name": alloc.next_name(prefer_female=True),
                "roleTitle": "Keep Palace Quartermaster",
                "category": "service",
                "servicesOffered": ["Starter Gear Replacements (Gear Tier 1)", "Potions"],
                "questsOffered": [],
            },
        ],
    }
    location_entries.insert(1, keep_entry)
    for npc in keep_entry["npcs"]:
        flat_npcs.append({**npc, "locationId": "loc_69_highcrown_keep", "locationName": keep_entry["locationName"], "mapId": "map_01"})

    return location_entries, flat_npcs


def write_human_list(location_entries: list[dict], total_npcs: int) -> None:
    lines: list[str] = []
    lines.append("REALMS OF DUST (ROD) — COMPLETE LOCATION & NPC ROSTER")
    lines.append("=====================================================")
    lines.append(f"Total Mapped Locations: {len(location_entries)} (40 Hubs + #69 Highcrown Keep + 20 Zone Outposts + 4 Port Towns + 5 Crossings + 8 Portals)")
    lines.append(f"Total Named NPCs / Encounters: {total_npcs}")
    lines.append("Notes:")
    lines.append("  - All Ethorians are strictly human. All Inns and Field Rest tenders are always Free (0s).")
    lines.append("  - Carved Runestones are socketed directly in the Equipment menu (zero Runesmith or extraction NPCs).")
    lines.append("")

    current_map = None
    for entry in location_entries:
        mid = entry["mapId"] or "all"
        if mid != current_map:
            current_map = mid
            lines.append("==============================================================================")
            lines.append(MAP_TITLES.get(mid, mid.upper()))
            lines.append("==============================================================================")
            lines.append("")

        num_tag = f"#{entry['locNum']} " if entry.get("locNum") else ""
        zone_tag = f" | Zone {entry['zoneNum']}" if entry.get("zoneNum") else ""
        lines.append(f"--- {num_tag}{entry['locationName']} ({entry['locationType']} | {entry['factionName']}{zone_tag}) ---")
        for npc in entry["npcs"]:
            lines.append(f"  * {npc['name']} — {npc['roleTitle']}")
            if npc["servicesOffered"]:
                lines.append(f"      Services: {', '.join(npc['servicesOffered'])}")
            if npc["questsOffered"]:
                lines.append(f"      Quests: {'; '.join(npc['questsOffered'])}")
        lines.append("")

    OUT_TXT.write_text("\n".join(lines), encoding="utf-8")


def apply_portrait_paths(location_entries: list[dict]) -> int:
    """Attach portraitPath from exported NPC WebP manifest & Hero Step 1A avatars when available."""
    hero_companions = {
        "npc_loc_40_garricks_black_keep_valen": "assets/portraits/heroes/valen_avatar.webp",
        "npc_loc_40_garricks_black_keep_ellowyn_arcane_lead": "assets/portraits/heroes/ellowyn_avatar.webp",
        "npc_loc_40_garricks_black_keep_orin_home_front_vanguard": "assets/portraits/heroes/orin_avatar.webp",
        "npc_loc_40_garricks_black_keep_rowan": "assets/portraits/heroes/rowan_avatar.webp",
        "npc_loc_40_garricks_black_keep_mera_harlan": "assets/portraits/heroes/mera_avatar.webp",
    }
    manifest_path = ROOT / "client" / "assets" / "portraits" / "npcs" / "npcs-portraits-manifest.json"
    portrait_map: dict[str, str] = {}
    if manifest_path.exists():
        portrait_map = json.loads(manifest_path.read_text(encoding="utf-8")).get("portraits", {})

    wired = 0
    for loc in location_entries:
        for npc in loc["npcs"]:
            nid = npc["id"]
            if nid in portrait_map:
                npc["portraitPath"] = portrait_map[nid]
                if nid == "npc_loc_01_overgrown_garden_sanctuary_orin_capital_guard":
                    npc["primaryHeroPortraitPath"] = "assets/portraits/heroes/orin_avatar.webp"
                wired += 1
            elif nid in hero_companions:
                npc["portraitPath"] = hero_companions[nid]
                wired += 1
    return wired


def main() -> int:
    location_entries, flat_npcs = build_npcs()
    wired = apply_portrait_paths(location_entries)
    payload = {
        "version": 1,
        "locationCount": len(location_entries),
        "totalNpcs": len(flat_npcs),
        "locations": location_entries,
    }
    encoded = json.dumps(payload, indent=2, ensure_ascii=False)
    OUT_DATA.write_text(encoded, encoding="utf-8")
    OUT_CLIENT.parent.mkdir(parents=True, exist_ok=True)
    OUT_CLIENT.write_text(encoded, encoding="utf-8")
    write_human_list(location_entries, len(flat_npcs))

    # Sanity check: all 178 quests accounted for across Hub NPCs
    assigned_quests = sum(len(n["questsOffered"]) for e in location_entries for n in e["npcs"])
    print(f"Built NPC roster: {len(location_entries)} locations, {len(flat_npcs)} NPCs, {wired} portraits, {assigned_quests} quest assignments -> data/npcs-catalog.json, client/assets/data/npcs-catalog.json, npc-list.txt")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
