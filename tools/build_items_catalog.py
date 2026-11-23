"""
Build the complete canonical ROD items catalog (data/items-catalog.json and
client/assets/data/items-catalog.json) directly from the locked Markdown
design docs:
  - docs/04-world-and-realms.md  (Portal Catalysts & Dungeon Keys)
  - docs/06-gear-and-runestones.md (312 Weapons [13 D&D types × 24], 92 Body Armor [23 shared × 4],
      92 Helmets [23 shared × 4], 24 Global Shields [6 × 4], 144 Class Accessories [6 × 24],
      14 Town Potions, + Procedural Prefix/Suffix Runestone Tables)
  - docs/07-bestiary-and-bosses.md (136 unique Trade Goods)
Produces:
  - data/items-catalog.json & client/assets/data/items-catalog.json (825 fixed items)
  - data/runestone-affixes.json & client/assets/data/runestone-affixes.json (procedural Runestone tables)
"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
OUT_PATHS = [
    ROOT / "data" / "items-catalog.json",
    ROOT / "client" / "assets" / "data" / "items-catalog.json",
]
RUNE_OUT_PATHS = [
    ROOT / "data" / "runestone-affixes.json",
    ROOT / "client" / "assets" / "data" / "runestone-affixes.json",
]


def slugify(text: str) -> str:
    s = re.sub(r"[’'`]", "", text.lower())
    s = re.sub(r"[^a-z0-9]+", "_", s).strip("_")
    return s


def strip_md(text: str) -> str:
    return re.sub(r"\*+", "", text).replace("`", "").strip()


def parse_silver(text: str) -> int:
    m = re.search(r"([\d,]+)\s*s\b", text.replace(",", ""))
    return int(m.group(1)) if m else 0


WEAPON_META: dict[str, dict] = {
    "Longsword": {"handed": "1H", "damageType": "Slashing", "usableBy": ["valen"], "isCaster": False},
    "Greatsword": {"handed": "2H", "damageType": "Slashing", "usableBy": ["valen"], "isCaster": False},
    "Rapier": {"handed": "1H", "damageType": "Piercing", "usableBy": ["valen"], "isCaster": False},
    "Battleaxe": {"handed": "1H", "damageType": "Slashing", "usableBy": ["orin"], "isCaster": False},
    "Mace": {"handed": "1H", "damageType": "Bludgeoning", "usableBy": ["orin", "harlan"], "isCaster": False},
    "Spear": {"handed": "2H", "damageType": "Piercing", "usableBy": ["orin"], "isCaster": False},
    "Longbow": {"handed": "2H", "damageType": "Piercing", "usableBy": ["rowan"], "isCaster": False},
    "Shortbow": {"handed": "2H", "damageType": "Piercing", "usableBy": ["rowan"], "isCaster": False},
    "Dagger": {"handed": "1H", "damageType": "Piercing", "usableBy": ["ellowyn", "rowan", "harlan"], "isCaster": False},
    "Light Crossbow": {"handed": "2H", "damageType": "Piercing", "usableBy": ["ellowyn"], "isCaster": False},
    "Quarterstaff": {"handed": "2H", "damageType": "Bludgeoning / Caster", "usableBy": ["ellowyn", "mera", "harlan"], "isCaster": True, "casterStat": "both", "atkScale": 0.45},
    "Scimitar": {"handed": "1H", "damageType": "Slashing / Nature", "usableBy": ["mera"], "isCaster": True, "casterStat": "both", "atkScale": 0.75},
    "Sickle": {"handed": "1H", "damageType": "Slashing / Nature", "usableBy": ["mera"], "isCaster": True, "casterStat": "both", "atkScale": 0.75},
}

HERO_NAME_TO_ID: dict[str, str] = {
    "Valen": "valen",
    "Ellowyn": "ellowyn",
    "Orin": "orin",
    "Rowan": "rowan",
    "Mera": "mera",
    "Harlan": "harlan",
}

ALL_HERO_IDS: list[str] = ["valen", "ellowyn", "orin", "rowan", "mera", "harlan"]

ACCESSORY_META: dict[str, dict] = {
    "Cloak": {"category": "cloak", "prefix": "clk", "usableBy": ["valen"]},
    "Orb": {"category": "orb", "prefix": "orb", "usableBy": ["ellowyn"]},
    "Horn": {"category": "horn", "prefix": "hrn", "usableBy": ["orin"]},
    "Quiver": {"category": "quiver", "prefix": "qvr", "usableBy": ["rowan"]},
    "Crystal": {"category": "crystal", "prefix": "cry", "usableBy": ["mera"]},
    "Tome": {"category": "tome", "prefix": "tome", "usableBy": ["harlan"]},
}


def step_to_region(step: int) -> int:
    return (step - 1) // 3 + 1


def parse_docs_06() -> tuple[dict, list[dict]]:
    text = (DOCS / "06-gear-and-runestones.md").read_text(encoding="utf-8")
    lines = text.splitlines()

    weapon_curve: dict[int, dict] = {}
    armor_curve: dict[int, dict] = {}
    items: list[dict] = []

    section = ""
    current_steps: list[int] = []
    cur_region = 1

    for raw in lines:
        line = raw.strip()
        if line.startswith("## 2. Weapon Power"):
            section = "weapon_curve"
            continue
        elif line.startswith("## 3. Complete Weapon Catalog"):
            section = "weapon_catalog"
            continue
        elif line.startswith("### C. Combined Defense & Price Curve"):
            section = "armor_curve"
            continue
        elif line.startswith("### D. Complete Shared Armor"):
            section = "armor_shared"
            continue
        elif line.startswith("### E. Complete Global Shields"):
            section = "shields_shared"
            continue
        elif line.startswith("### F. Complete Class Accessories"):
            section = "accessories_catalog"
            continue
        elif line.startswith("#### Runestone Rarity Tiers"):
            section = "rune_tiers"
            continue
        elif line.startswith("### B. Weapon Prefixes"):
            section = "weapon_prefixes"
            continue
        elif line.startswith("### C. Body Armor Prefixes"):
            section = "armor_prefixes"
            continue
        elif line.startswith("### D. Universal Suffixes"):
            section = "rune_suffixes"
            continue
        elif line.startswith("## 6. Town Potions"):
            section = "consumables"
            continue

        # Capture Gear Tiers & Map-Half progression band from subheadings in catalogs
        if section in ("weapon_catalog", "accessories_catalog") and line.startswith("###"):
            gm = re.search(r"Gear\s+Tiers?\s+(\d+)\s*[–-]\s*(\d+)", strip_md(line))
            if gm:
                t_start = int(gm.group(1))
                t_end = int(gm.group(2))
                current_steps = list(range(t_start, t_end + 1))
                cur_region = step_to_region(t_start)
            continue

        if not line.startswith("|"):
            continue
        cells = [strip_md(c) for c in line.split("|")[1:-1]]
        if not cells or all(re.fullmatch(r"[:\-\s]+", c) for c in cells):
            continue

        if section == "weapon_curve" and cells[0].isdigit():
            st = int(cells[0])
            cm = re.search(r"\+(\d+)\s*\(2H\s*\+(\d+)\)", cells[5])
            p1h = parse_silver(cells[6])
            zm = re.search(r"Zone\s+(\d+)", cells[1])
            weapon_curve[st] = {
                "step": st,
                "zone": int(zm.group(1)) if zm else 1,
                "region": step_to_region(st),
                "atk1h": int(cells[3]),
                "atk2h": int(cells[4]),
                "cast1h": int(cm.group(1)) if cm else 5,
                "cast2h": int(cm.group(2)) if cm else 6,
                "price1h": p1h,
                "where": cells[7],
            }

        elif section == "armor_curve" and cells[0].isdigit():
            st = int(cells[0])
            hp, hm = [int(x.strip()) for x in cells[2].split("/")]
            mp_def, mm_def = [int(x.strip()) for x in cells[3].split("/")]
            lm_parts = cells[4].split("(")[0]
            lp, lm = [int(x.strip()) for x in lm_parts.split("/")]
            mp_bonus = int(re.search(r"\+(\d+)\s*MP", cells[4]).group(1))
            shield_def = int(re.search(r"\+(\d+)", cells[5]).group(1))
            armor_curve[st] = {
                "step": st,
                "heavy": (hp, hm),
                "medium": (mp_def, mm_def),
                "light": (lp, lm, mp_bonus),
                "shieldDef": shield_def,
                "combinedArmorPrice": int(cells[6].replace(",", "").replace("s", "")),
                "leftHandPrice": int(cells[7].replace(",", "").replace("s", "")),
            }

        elif section == "weapon_catalog" and len(cells) >= 4 and cells[0] in WEAPON_META:
            wtype = cells[0]
            meta = WEAPON_META[wtype]
            for idx, name in enumerate(cells[1:4]):
                step = current_steps[idx]
                wc = weapon_curve[step]
                price = wc["price1h"]
                if meta["handed"] == "2H":
                    price = round(price * 1.2)
                atk = wc["atk2h"] if meta["handed"] == "2H" else wc["atk1h"]
                mag_pow = 0
                heal_pow = 0
                if meta["isCaster"]:
                    base_c = wc["cast2h"] if meta["handed"] == "2H" else wc["cast1h"]
                    atk = max(3, round(wc["atk1h"] * meta.get("atkScale", 0.45)))
                    cstat = meta.get("casterStat")
                    if cstat in ("magic", "both"):
                        mag_pow = base_c
                    if cstat in ("heal", "both"):
                        heal_pow = base_c
                items.append({
                    "id": f"wpn_{step:02d}_{slugify(wtype)}_{slugify(name)}",
                    "name": name,
                    "category": "weapon",
                    "subType": wtype,
                    "slot": "right_hand",
                    "handed": meta["handed"],
                    "damageType": meta["damageType"],
                    "region": cur_region,
                    "step": step,
                    "shopType": "armory",
                    "priceSilver": price,
                    "sellSilver": round(price * 0.4),
                    "usableBy": meta["usableBy"],
                    "runestoneSockets": 1,
                    "stats": {
                        "attackPower": atk,
                        "magicPower": mag_pow,
                        "healPower": heal_pow,
                        "critBonusPct": 0,
                    },
                    "iconPath": f"assets/icons/items/wpn_{step:02d}_{slugify(wtype)}_{slugify(name)}.webp",
                })

        elif section == "armor_shared" and len(cells) >= 9 and cells[0] != "Armor Type":
            legacy_icon_steps = {
                "Padded Robes": [6, 8, 10, 12],
                "Silk Robes": [10, 12, 14, 16],
            }
            armor_type = cells[0]
            weight_key = cells[1].lower()
            steps = [int(x.strip()) for x in cells[2].split(",")]
            icon_steps = legacy_icon_steps.get(armor_type, steps)
            slot_label = cells[3]
            usable_by = [HERO_NAME_TO_ID[u.strip()] for u in cells[4].split(",") if u.strip() in HERO_NAME_TO_ID]
            for idx, name in enumerate(cells[5:9]):
                step = steps[idx]
                icon_step = icon_steps[idx]
                reg = step_to_region(step)
                ac = armor_curve[step]
                tot_p, tot_m = ac[weight_key][0], ac[weight_key][1]
                if slot_label == "Body":
                    body_p = max(1, round(tot_p * 0.65))
                    body_m = max(1, round(tot_m * 0.65))
                    body_price = max(15, round(ac["combinedArmorPrice"] * 0.65))
                    body_mp = round(ac["light"][2] * 0.65) if weight_key == "light" else 0
                    items.append({
                        "id": f"armor_{icon_step:02d}_{slugify(armor_type)}_{slugify(name)}",
                        "name": name,
                        "category": "armor",
                        "subType": armor_type,
                        "slot": "body",
                        "weight": weight_key.title(),
                        "region": reg,
                        "step": step,
                        "shopType": "armory",
                        "priceSilver": body_price,
                        "sellSilver": round(body_price * 0.4),
                        "usableBy": usable_by,
                        "runestoneSockets": 1,
                        "stats": {
                            "physDef": body_p,
                            "magDef": body_m,
                            "maxMp": body_mp,
                            **({"dodgePct": 4} if weight_key == "light" else {}),
                        },
                        "iconPath": f"assets/icons/items/armor_{icon_step:02d}_{slugify(armor_type)}_{slugify(name)}.webp",
                    })
                elif slot_label == "Helmet":
                    helm_p = max(1, tot_p - round(tot_p * 0.65))
                    helm_m = max(1, tot_m - round(tot_m * 0.65))
                    helm_price = max(10, ac["combinedArmorPrice"] - round(ac["combinedArmorPrice"] * 0.65))
                    helm_mp = (ac["light"][2] - round(ac["light"][2] * 0.65)) if weight_key == "light" else 0
                    bonus_desc = (
                        f"+{10 + (step * 15) // 24}% Stun & Pushback Resist"
                        if weight_key == "heavy"
                        else (f"+{2 + (step * 6) // 24}% Accuracy & Crit Chance" if weight_key == "medium" else f"+{helm_mp} Max MP")
                    )
                    items.append({
                        "id": f"helm_{icon_step:02d}_{slugify(armor_type)}_{slugify(name)}",
                        "name": name,
                        "category": "helm",
                        "subType": armor_type,
                        "slot": "head",
                        "weight": weight_key.title(),
                        "region": reg,
                        "step": step,
                        "shopType": "armory",
                        "priceSilver": helm_price,
                        "sellSilver": round(helm_price * 0.4),
                        "usableBy": usable_by,
                        "runestoneSockets": 0,
                        "stats": {
                            "physDef": helm_p,
                            "magDef": helm_m,
                            "maxMp": helm_mp,
                            "passiveBonus": bonus_desc,
                        },
                        "iconPath": f"assets/icons/items/helm_{icon_step:02d}_{slugify(armor_type)}_{slugify(name)}.webp",
                    })

        elif section == "shields_shared" and len(cells) >= 7 and cells[0] != "Shield Type":
            shield_type = cells[0]
            weight_key = cells[1].lower()
            steps = [int(x.strip()) for x in cells[2].split(",")]
            guard_bonus = 8 if weight_key == "light" else (12 if weight_key == "medium" else 16)
            for idx, name in enumerate(cells[3:7]):
                step = steps[idx]
                reg = step_to_region(step)
                ac = armor_curve[step]
                shd_price = ac["leftHandPrice"]
                items.append({
                    "id": f"shd_{step:02d}_{slugify(shield_type)}_{slugify(name)}",
                    "name": name,
                    "category": "shield",
                    "subType": shield_type,
                    "slot": "left_hand",
                    "weight": weight_key.title(),
                    "region": reg,
                    "step": step,
                    "shopType": "armory",
                    "priceSilver": shd_price,
                    "sellSilver": round(shd_price * 0.4),
                    "usableBy": ALL_HERO_IDS,
                    "runestoneSockets": 0,
                    "stats": {
                        "physDef": ac["shieldDef"],
                        "guardBonusPct": guard_bonus,
                        **({"dodgePct": 3} if weight_key == "light" else {}),
                    },
                    "iconPath": f"assets/icons/items/shd_{step:02d}_{slugify(shield_type)}_{slugify(name)}.webp",
                })

        elif section == "accessories_catalog" and len(cells) >= 4 and cells[0] in ACCESSORY_META:
            acc_label = cells[0]
            acc_meta = ACCESSORY_META[acc_label]
            for idx, name in enumerate(cells[1:4]):
                step = current_steps[idx]
                ac = armor_curve[step]
                acc_price = ac["leftHandPrice"]
                acc_stats: dict = {}
                if acc_label == "Cloak":
                    acc_stats = {"dodgePct": 5 + (step * 11) // 24, "critBonusPct": 4 + (step * 8) // 24}
                elif acc_label == "Orb":
                    acc_stats = {"magicPower": max(2, round(step * 2.0)), "spellCritPct": 4 + (step * 8) // 24, "maxMp": 4 + step * 2}
                elif acc_label == "Horn":
                    acc_stats = {"physDef": max(2, round(step * 1.4)), "gritBonus": 1 + step // 4, "guardBonusPct": 6 + (step * 14) // 24}
                elif acc_label == "Quiver":
                    acc_stats = {"piercePowerPct": 5 + (step * 10) // 24, "critDmgPct": 10 + (step * 15) // 24}
                elif acc_label == "Crystal":
                    acc_stats = {"magicPower": max(2, round(step * 1.9)), "maxMp": 4 + round(step * 2.0), "statusPotencyPct": 6 + (step * 14) // 24}
                elif acc_label == "Tome":
                    acc_stats = {"healPower": max(2, round(step * 2.2)), "maxMp": 5 + round(step * 2.2), "statusResistPct": 8 + step}
                item_id = f"{acc_meta['prefix']}_{step:02d}_{slugify(name)}"
                items.append({
                    "id": item_id,
                    "name": name,
                    "category": acc_meta["category"],
                    "subType": acc_label,
                    "slot": "accessory",
                    "region": cur_region,
                    "step": step,
                    "shopType": "armory",
                    "priceSilver": acc_price,
                    "sellSilver": round(acc_price * 0.4),
                    "usableBy": acc_meta["usableBy"],
                    "runestoneSockets": 0,
                    "stats": acc_stats,
                    "iconPath": f"assets/icons/items/{item_id}.webp",
                })

        elif section == "consumables" and len(cells) >= 4 and cells[0] != "Item":
            price = parse_silver(cells[3])
            shop = "armory" if any(k in cells[0] for k in ("Healing", "Reviving", "Phoenix")) else "apothecary"
            zm = re.search(r"Zones?\s*(\d+)\s*[–-]\s*(\d+)", cells[1])
            items.append({
                "id": f"cons_{slugify(cells[0])}",
                "name": cells[0],
                "category": "consumable",
                "subType": "Healing / MP Potion" if "HP" in cells[2] or "MP" in cells[2] else "Curative Potion",
                "zonesStocked": cells[1],
                "minZone": int(zm.group(1)) if zm else 1,
                "maxZone": int(zm.group(2)) if zm else 20,
                "shopType": "both",
                "priceSilver": price,
                "sellSilver": round(price * 0.4),
                "effect": cells[2],
                "preferredVendor": shop,
                "iconPath": f"assets/icons/items/cons_{slugify(cells[0])}.webp",
            })

    return {"weaponCurve": weapon_curve, "armorCurve": armor_curve}, items


def parse_trade_goods() -> list[dict]:
    text07 = (DOCS / "07-bestiary-and-bosses.md").read_text(encoding="utf-8")
    goods: list[dict] = []
    cur_region: int | str = 1
    in_natives = False

    for raw in text07.splitlines():
        line = raw.strip()
        pm = re.search(r"^###\s+Portal\s+#(\d+)\s+Realm:", line)
        if pm:
            cur_region = int(pm.group(1))
            in_natives = False
            continue
        if line.startswith("## 4. Ethoria Native Encounters"):
            in_natives = True
            cur_region = "ethoria_native"
            continue
        if not line.startswith("|"):
            continue
        cells = [strip_md(c) for c in line.split("|")[1:-1]]
        if not cells or not cells[0].isdigit():
            continue

        if not in_natives and len(cells) >= 8:
            mob_name = cells[1]
            mob_type = cells[2]
            silver_val = parse_silver(cells[6])
            trophy_name = cells[7]
            sell_val = max(2, round(silver_val * 0.67))
            goods.append({
                "id": f"tg_r{cur_region}_{slugify(mob_name)}_{slugify(trophy_name)}",
                "name": trophy_name,
                "category": "trade_good",
                "subType": f"Region {cur_region} Trade Good",
                "region": cur_region,
                "sourceMob": mob_name,
                "sourceType": mob_type,
                "shopType": "sell_only",
                "priceSilver": 0,
                "sellSilver": sell_val,
                "effect": f"Wilderness trade good recovered from {mob_name}. Sell to Armory or Mystic merchants for Silver.",
                "iconPath": f"assets/icons/items/tg_r{cur_region}_{slugify(mob_name)}_{slugify(trophy_name)}.webp",
            })
        elif in_natives and len(cells) >= 8:
            mob_name = cells[1]
            regions_str = cells[2]
            silver_nums = [parse_silver(part) for part in cells[6].split("/")]
            silver_val = silver_nums[0] if silver_nums and silver_nums[0] > 0 else 25
            good_name = cells[7]
            sell_val = max(3, round(silver_val * 0.67))
            # Derive numeric primary region (1..8) strictly matching Zone & sellSilver tier
            native_region = 1
            if "Z16" in regions_str or sell_val >= 500:
                native_region = 7
            elif "Z11" in regions_str or sell_val >= 170:
                native_region = 5
            elif "Z06" in regions_str or sell_val >= 32:
                native_region = 3
            goods.append({
                "id": f"tg_native_{slugify(mob_name)}_{slugify(good_name)}",
                "name": good_name,
                "category": "trade_good",
                "subType": "Ethoria Trade Good",
                "region": native_region,
                "regionsFound": regions_str,
                "sourceMob": mob_name,
                "shopType": "sell_only",
                "priceSilver": 0,
                "sellSilver": sell_val,
                "effect": f"Trade good recovered from {mob_name}. Sell to Armory or Mystic merchants for Silver.",
                "iconPath": f"assets/icons/items/tg_native_{slugify(mob_name)}_{slugify(good_name)}.webp",
            })

    # Preserve the 8 Ethorian humanoid trade goods whose icons live in client/assets/icons/items/
    # (tagged with exact primary numeric Region matching their Zone/sellSilver tier).
    humanoid_fallbacks = [
        ("Road Bandit", "Regions 1–2", 1, "Rusty Coin Purse", 3),
        ("Crossbow Poacher", "Regions 1–3", 1, "Fletched Bolt Case", 4),
        ("Smuggler Cutthroat", "Regions 2, 5", 2, "Contraband Seal", 20),
        ("Garrick Deserter", "Regions 1, 3", 1, "Torn Wolf Tabard", 6),
        ("Rival House Pikeman", "Regions 3, 7", 3, "Usurper Pennant", 59),
        ("Rival House Knight", "Regions 3, 7", 3, "Steel Crest Badge", 85),
        ("Gilded Slaver Enforcer", "Region 5", 5, "Brass Collar Key", 290),
        ("Eclipse Cultist", "Region 8", 8, "Obsidian Talisman", 1555),
    ]
    existing_ids = {g["id"] for g in goods}
    for mob_name, regions_str, reg_num, good_name, sell_val in humanoid_fallbacks:
        gid = f"tg_native_{slugify(mob_name)}_{slugify(good_name)}"
        if gid not in existing_ids:
            goods.append({
                "id": gid,
                "name": good_name,
                "category": "trade_good",
                "subType": "Ethoria Trade Good",
                "region": reg_num,
                "regionsFound": regions_str,
                "sourceMob": mob_name,
                "shopType": "sell_only",
                "priceSilver": 0,
                "sellSilver": sell_val,
                "effect": f"Trade good recovered from {mob_name}. Sell to Armory or Mystic merchants for Silver.",
                "iconPath": f"assets/icons/items/{gid}.webp",
            })
    return goods


def parse_key_items() -> list[dict]:
    text04 = (DOCS / "04-world-and-realms.md").read_text(encoding="utf-8")
    keys: list[dict] = []
    for raw in text04.splitlines():
        km = re.search(r"Portal\s+#(\d+):\s+([^*]+?)\*\*.*?\*\*Catalyst:\*\*\s*`([^`]+)`\s+from\s+`([^`]+)`", raw)
        if km:
            pnum = int(km.group(1))
            pname = km.group(2).strip()
            kname = km.group(3).strip()
            qref = km.group(4).strip()
            is_pendant = pnum == 8 and slugify(kname) == "interlocking_wolf_pendant"
            keys.append({
                "id": f"key_portal_{pnum}_{slugify(kname)}",
                "name": kname,
                "category": "key_item",
                "subType": "Portal Catalyst",
                "region": pnum,
                "portalName": pname,
                "sourceQuest": qref,
                "shopType": "quest_only",
                "priceSilver": 0,
                "sellSilver": 0,
                "effect": (
                    f"Valen and Koren's fused silver pendant seized by King Garrick in the coliseum and entrusted to the Abyssal Eclipse Guard. Required to unseal Portal #{pnum}: {pname}."
                    if is_pendant
                    else f"Keystone catalyst required to unseal Portal #{pnum}: {pname}."
                ),
                "iconPath": f"assets/icons/items/key_portal_{pnum}_{slugify(kname)}.webp",
            })

    # Core dungeon exploration key items from docs/09
    dungeon_keys = [
        ("Iron Dungeon Key", "Dungeon Key", "Unlocks a sealed iron gate inside a Procedural Dungeon or Portal chamber."),
        ("Skeleton Lockpick", "Dungeon Tool", "Opens a locked chest or postern gate cleanly during dungeon exploration."),
        ("Rift Area Chart", "Dungeon Map", "Reveals every room, secret branch, and Boss chamber on the current dungeon grid."),
    ]
    for dname, dsub, deff in dungeon_keys:
        keys.append({
            "id": f"key_dungeon_{slugify(dname)}",
            "name": dname,
            "category": "key_item",
            "subType": dsub,
            "shopType": "dungeon_find",
            "priceSilver": 0,
            "sellSilver": 0,
            "effect": deff,
            "iconPath": f"assets/icons/items/key_dungeon_{slugify(dname)}.webp",
        })
    return keys


def parse_runestone_affixes() -> dict:
    """Build procedural Prefix/Suffix Runestone generation tables from docs/06."""
    text = (DOCS / "06-gear-and-runestones.md").read_text(encoding="utf-8")
    section = ""
    tiers: list[dict] = []
    weapon_prefixes: list[dict] = []
    armor_prefixes: list[dict] = []
    suffixes: list[dict] = []

    for raw in text.splitlines():
        line = raw.strip()
        if line.startswith("#### Runestone Rarity Tiers"):
            section = "tiers"
            continue
        elif line.startswith("### B. Weapon Prefixes"):
            section = "weapon_prefixes"
            continue
        elif line.startswith("### C. Body Armor Prefixes"):
            section = "armor_prefixes"
            continue
        elif line.startswith("### D. Universal Suffixes"):
            section = "suffixes"
            continue
        elif line.startswith("## 6. Town Potions"):
            break

        if not line.startswith("|"):
            continue
        cells = [strip_md(c) for c in line.split("|")[1:-1]]
        if not cells or all(re.fullmatch(r"[:\-\s]+", c) for c in cells):
            continue

        if section == "tiers" and cells[0] not in ("Tier", "Rarity Tier") and len(cells) >= 4:
            tiers.append({
                "id": slugify(cells[0]),
                "tier": cells[0],
                "regions": cells[1],
                "zones": cells[1],
                "rollFormula": cells[2],
                "strengthScale": cells[3],
            })
        elif section == "weapon_prefixes" and cells[0] != "Prefix Name" and len(cells) >= 2:
            weapon_prefixes.append({
                "id": f"pfx_wpn_{slugify(cells[0])}",
                "name": cells[0],
                "socket": "weapon",
                "effect": cells[1],
            })
        elif section == "armor_prefixes" and cells[0] != "Prefix Name" and len(cells) >= 2:
            armor_prefixes.append({
                "id": f"pfx_arm_{slugify(cells[0])}",
                "name": cells[0],
                "socket": "armor",
                "effect": cells[1],
            })
        elif section == "suffixes" and cells[0] != "Suffix Name" and len(cells) >= 2:
            suffixes.append({
                "id": f"sfx_{slugify(cells[0])}",
                "name": cells[0],
                "effect": cells[1],
            })

    return {
        "version": 1,
        "socketRule": "1 permanent Runestone socket per Weapon and Body Armor; socketing overwrites and destroys the previous Runestone with zero extraction.",
        "rarityTiers": tiers,
        "weaponPrefixes": weapon_prefixes,
        "armorPrefixes": armor_prefixes,
        "universalSuffixes": suffixes,
    }


def main() -> None:
    _, gear_items = parse_docs_06()
    trade_goods = parse_trade_goods()
    key_items = parse_key_items()
    rune_tables = parse_runestone_affixes()

    all_items = gear_items + trade_goods + key_items

    # Verify strict ID and Name uniqueness across all categories
    seen_ids: set[str] = set()
    by_cat: dict[str, int] = {}
    name_dups: list[tuple[str, str]] = []
    seen_names: dict[str, str] = {}

    for it in all_items:
        assert it["id"] not in seen_ids, f"Duplicate ID: {it['id']}"
        seen_ids.add(it["id"])
        by_cat[it["category"]] = by_cat.get(it["category"], 0) + 1
        key = it["name"].lower()
        if key in seen_names:
            name_dups.append((seen_names[key], it["id"]))
        else:
            seen_names[key] = it["id"]

    payload = {
        "version": 1,
        "totalItems": len(all_items),
        "categoryCounts": by_cat,
        "items": all_items,
    }
    text = json.dumps(payload, indent=2, ensure_ascii=False)
    for out in OUT_PATHS:
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(text, encoding="utf-8")
        print("Wrote", out, f"({len(all_items)} items)")

    rune_text = json.dumps(rune_tables, indent=2, ensure_ascii=False)
    for out in RUNE_OUT_PATHS:
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(rune_text, encoding="utf-8")
        print(
            "Wrote",
            out,
            f"({len(rune_tables['weaponPrefixes'])} wpn prefixes, {len(rune_tables['armorPrefixes'])} arm prefixes, {len(rune_tables['universalSuffixes'])} suffixes)",
        )

    print("Category breakdown:", by_cat)
    print("Name overlaps:", len(name_dups), name_dups[:10])


if __name__ == "__main__":
    main()
