"""Slice all 128 Enemies (#FF00FF -> RGBA PNG + WebP), convert 41 Battle Scenes -> 1920x1080 WebP, and generate data/battle-config.json."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(r"C:\Users\drew0\Documents\ROD")
MAGENTA_DIR = ROOT / "imageprompts" / "magenta-removal"
if str(MAGENTA_DIR) not in sys.path:
    sys.path.insert(0, str(MAGENTA_DIR))

from core_chroma_key import key_magenta_sprite  # noqa: E402

MONSTER_SHEETS_DIR = ROOT / "assets" / "enemies" / "batch_sheets"
MONSTER_SLICES_DIR = ROOT / "assets" / "enemies" / "slices"
CLIENT_ENEMIES_DIR = ROOT / "client" / "assets" / "enemies"

SCENES_SRC_DIR = ROOT / "assets" / "maps" / "battle_scenes"
CLIENT_SCENES_DIR = ROOT / "client" / "assets" / "maps" / "battle_scenes"

MONSTER_PROMPTS_FILE = ROOT / "imageprompts" / "monster-prompts.txt"
MONSTERS_TXT = ROOT / "monsters.txt"
BATTLE_SCENES_TXT = ROOT / "imageprompts" / "battle-scenes.txt"

OUT_CONFIG = ROOT / "data" / "battle-config.json"
CLIENT_OUT_CONFIG = ROOT / "client" / "assets" / "data" / "battle-config.json"

SCENE_W = 1920
SCENE_H = 1080
MAX_ENEMY_SIDE = 680

DEFAULT_HERO_ZONE = {
    "xPct": 60.0,
    "yPct": 23.0,
    "wPct": 35.0,
    "hPct": 54.0,
    "staggerPct": 0.0,
    "backScale": 0.90,
    "frontScale": 1.0,
}

DEFAULT_ENEMY_GRID = {
    "xPct": 4.0,
    "yPct": 22.0,
    "wPct": 42.0,
    "hPct": 56.0,
    "cols": 4,
    "rows": 3,
    "backRowScale": 0.84,
    "frontRowScale": 1.0,
    "flipRight": False,
}


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", name.strip().lower()).strip("_")


def parse_monster_prompts() -> list[dict]:
    text = MONSTER_PROMPTS_FILE.read_text(encoding="utf-8")
    parts = re.split(r"={10,}\s*\r?\nSHEET\s+(\d+)\s+OF\s+\d+[^\r\n]*\r?\n={10,}", text)
    entries: list[dict] = []
    for i in range(1, len(parts), 2):
        sheet_num = int(parts[i])
        slots = re.findall(r"^#\s*R(\d)C(\d)\s*->\s*([^(\r\n]+?)\s*\(([^)\r\n]+)\)", parts[i + 1], re.M)
        if len(slots) != 16:
            raise ValueError(f"Monster Sheet {sheet_num:02d} has {len(slots)} manifest slots (expected 16).")
        for r_str, c_str, nm, pose in slots:
            clean_name = nm.strip()
            entries.append(
                {
                    "sheet": sheet_num,
                    "row": int(r_str) - 1,
                    "col": int(c_str) - 1,
                    "name": clean_name,
                    "slug": slugify(clean_name),
                    "pose": pose.strip(),
                }
            )
    return entries


def parse_monsters_stats() -> dict[str, dict]:
    lines = MONSTERS_TXT.read_text(encoding="utf-8").splitlines()
    stats: dict[str, dict] = {}
    current_section = ""
    current_biome = ""
    cur: dict | None = None

    for raw in lines:
        line = raw.rstrip()
        m_sec = re.match(r"^(Map\s+\d+\s+-\s+Zone\s+\d+\s+\([^)]+\)|Portal Bosses.*)$", line.strip())
        if m_sec:
            current_section = m_sec.group(1)
            continue

        m_bio = re.match(r"^\s{2}([^:]+):\s*$", line)
        if m_bio:
            current_biome = m_bio.group(1).strip()
            continue

        m_mob = re.match(r"^\s{4}(.+?)\s+\(CR\s+([^)]+)\)\s+\|\s+Lv\s+(\d+)(\s+Boss)?\s+\|\s+Role:\s+(.+?)\s*$", line)
        if m_mob:
            name = m_mob.group(1).strip()
            is_boss = bool(m_mob.group(4)) or ("Portal Boss" in m_mob.group(5))
            portal_num = None
            pm = re.search(r"Portal\s+(\d+)", current_biome)
            if pm:
                portal_num = int(pm.group(1))
            cur = {
                "name": name,
                "cr": m_mob.group(2).strip(),
                "level": int(m_mob.group(3)),
                "isBoss": is_boss,
                "portalNum": portal_num,
                "role": m_mob.group(5).strip(),
                "zone": current_section,
                "homeBiome": current_biome,
                "hp": 50,
                "atk": 6,
                "mag": 0,
                "guard": 0,
                "weak": "None",
                "resist": "None",
            }
            stats[name.lower()] = cur
            continue

        if cur and line.strip().startswith("Stats:"):
            hp_m = re.search(r"HP\s+(\d+)", line)
            atk_m = re.search(r"ATK\s+(\d+)", line)
            mag_m = re.search(r"MAG\s+(\d+)", line)
            grd_m = re.search(r"Guard\s+(\d+)", line)
            if hp_m:
                cur["hp"] = int(hp_m.group(1))
            if atk_m:
                cur["atk"] = int(atk_m.group(1))
            if mag_m:
                cur["mag"] = int(mag_m.group(1))
            if grd_m:
                cur["guard"] = int(grd_m.group(1))
        elif cur and line.strip().startswith("Affinities:"):
            wm = re.search(r"Weak:\s*([^|]+)", line)
            rm = re.search(r"Resist:\s*([^|]+)", line)
            if wm:
                cur["weak"] = wm.group(1).strip()
            if rm:
                cur["resist"] = rm.group(1).strip()

    # Final Story Boss (#8 King Garrick)
    stats.setdefault(
        "king garrick",
        {
            "name": "King Garrick",
            "cr": "24",
            "level": 99,
            "isBoss": True,
            "portalNum": 8,
            "role": "Final Boss",
            "zone": "The Eclipse Gate",
            "homeBiome": "The Eclipse Gate",
            "hp": 72000,
            "atk": 410,
            "mag": 320,
            "guard": 5,
            "weak": "Radiant",
            "resist": "Shadow, Fire",
        },
    )

    # Seed fallback stats for Sheets 09-12 quest monsters & named bosses using quest-level & baseline curve
    quests_file = ROOT / "data" / "quests-catalog.json"
    if quests_file.exists():
        try:
            q_list = json.loads(quests_file.read_text(encoding="utf-8")).get("quests", [])
        except Exception:
            q_list = []

        # Reference curve interpolated from existing monsters.txt entries
        ref_curve = sorted(
            (m["level"], m["hp"], m["atk"], m["mag"])
            for m in stats.values()
            if "Boss" not in m.get("role", "")
        )

        def interp_base(lv: int) -> tuple[int, int]:
            if not ref_curve:
                return max(40, lv * 28), max(6, lv * 3)
            below = [r for r in ref_curve if r[0] <= lv]
            above = [r for r in ref_curve if r[0] >= lv]
            lo = below[-1] if below else ref_curve[0]
            hi = above[0] if above else ref_curve[-1]
            if hi[0] == lo[0]:
                return lo[1], max(lo[2], lo[3])
            t = (lv - lo[0]) / (hi[0] - lo[0])
            hp = round(lo[1] + t * (hi[1] - lo[1]))
            off = round(max(lo[2], lo[3]) + t * (max(hi[2], hi[3]) - max(lo[2], lo[3])))
            return hp, off

        quest_meta = {
            "animated armor": (5, "Heavy", False, "Lightning", "Poison", "1"),
            "animated flying sword": (5, "Skirmisher", False, "Lightning", "Poison", "1/4"),
            "dust mephit": (9, "Caster", False, "Wind", "Earth", "1/2"),
            "ankheg": (10, "Beast", False, "Fire", "Acid", "2"),
            "rust monster": (12, "Beast", False, "None", "Steel", "1/2"),
            "grick": (13, "Skirmisher", False, "Fire", "Physical", "2"),
            "giant boar": (8, "Beast", False, "None", "None", "2"),
            "cockatrice": (28, "Beast", False, "Fire", "Poison", "1/2"),
            "gorgon": (31, "Heavy", False, "Lightning", "Poison", "5"),
            "hippogriff": (32, "Beast", False, "Lightning", "None", "1"),
            "griffon": (33, "Beast", False, "Lightning", "None", "2"),
            "steam mephit": (14, "Caster", False, "Cold", "Fire", "1/4"),
            "blood hawk": (63, "Skirmisher", False, "Wind", "None", "1/8"),
            "giant eagle": (64, "Beast", False, "Lightning", "Wind", "1"),
            "polar bear": (77, "Beast", False, "Fire", "Cold", "2"),
            "saber-toothed tiger": (68, "Beast", False, "Fire", "None", "2"),
            "water weird": (17, "Caster", False, "Lightning", "Water", "3"),
            "sea hag": (18, "Caster", False, "Radiant", "Cold", "2"),
            "giant octopus": (19, "Beast", False, "Lightning", "Water", "1"),
            "gibbering mouther": (21, "Hybrid", False, "Radiant", "None", "2"),
            "violet fungus": (39, "Skirmisher", False, "Fire", "Poison", "1/4"),
            "black pudding": (40, "Heavy", False, "Radiant", "Acid", "4"),
            "blink dog": (39, "Skirmisher", False, "Shadow", "None", "1/4"),
            "awakened tree": (40, "Heavy", False, "Fire", "Physical", "2"),
            "ettercap": (41, "Skirmisher", False, "Fire", "Poison", "2"),
            "phase spider": (42, "Skirmisher", False, "Radiant", "Shadow", "3"),
            "corrupted dryad": (43, "Caster", False, "Fire", "Poison", "3"),
            "awakened blight": (43, "Hybrid", False, "Fire", "Shadow", "2"),
            "gelatinous cube": (42, "Heavy", False, "Fire", "Acid", "2"),
            "gray ooze": (42, "Skirmisher", False, "Lightning", "Acid", "1/2"),
            "ochre jelly": (45, "Heavy", False, "Cold", "Acid", "2"),
            "shambling mound": (45, "Heavy", False, "Cold", "Lightning", "5"),
            "magma mephit": (52, "Caster", False, "Cold", "Fire", "1/2"),
            "giant scorpion": (52, "Beast", False, "Cold", "Poison", "3"),
            "fire snake": (54, "Skirmisher", False, "Cold", "Fire", "1"),
            "magmin": (54, "Skirmisher", False, "Cold", "Fire", "1/2"),
            "azer": (56, "Heavy", False, "Cold", "Fire", "2"),
            "storm mephit": (63, "Caster", False, "Earth", "Lightning", "1"),
            "air elemental": (64, "Hybrid", False, "Earth", "Wind", "5"),
            "blue dragon wyrmling": (66, "Beast", False, "Cold", "Lightning", "3"),
            "spined devil": (75, "Skirmisher", False, "Radiant", "Fire", "2"),
            "nightmare": (44, "Beast", False, "Cold", "Fire", "3"),
            "ice mephit": (77, "Caster", False, "Fire", "Cold", "1/2"),
            "will-o'-wisp": (89, "Caster", False, "Radiant", "Lightning", "2"),
            "specter": (91, "Skirmisher", False, "Radiant", "Shadow", "1"),
            "crimson vampire spawn captain": (93, "Hybrid", True, "Radiant", "Shadow", "8"),
            "arena lich": (94, "Caster", True, "Radiant", "Shadow", "14"),
            "elder vampire lord": (97, "Hybrid", True, "Radiant", "Shadow", "16"),
            "garrick houndmaster": (4, "Skirmisher", True, "None", "None", "1"),
            "crossbow poacher": (3, "Skirmisher", False, "None", "None", "1/2"),
            "garrick deserter sergeant": (9, "Heavy", True, "None", "None", "2"),
            "arena bounty-captain": (10, "Hybrid", True, "None", "None", "3"),
            "bramblewatch ringleader": (13, "Skirmisher", True, "None", "None", "3"),
            "hollowstone pikeman commander": (29, "Heavy", True, "None", "Physical", "5"),
            "rival house deserter captain": (29, "Fighter", True, "None", "None", "5"),
            "rival house knight-captain": (33, "Heavy", True, "Lightning", "Physical", "6"),
            "lord hollowstone": (34, "Hybrid", True, "Shadow", "Physical", "7"),
            "gilded slaver quartermaster": (52, "Fighter", True, "None", "None", "7"),
            "gilded corsair commodore": (53, "Skirmisher", True, "Lightning", "Water", "8"),
            "gilded slaver enforcers": (54, "Skirmisher", False, "None", "None", "4"),
            "slaver baron": (62, "Heavy", True, "None", "Fire", "10"),
            "slaver captain": (62, "Heavy", True, "None", "None", "8"),
            "marshal bleakwatch": (87, "Heavy", True, "Fire", "Cold", "13"),
            "abyssal eclipse guard": (98, "Heavy", True, "Radiant", "Shadow", "17"),
        }

        for nm_key, (lv, role, is_boss, weak, resist, cr_s) in quest_meta.items():
            if nm_key in stats:
                continue
            hp, off = interp_base(lv)
            role_mult = {"Heavy": 1.32, "Beast": 1.05, "Hybrid": 1.12, "Caster": 0.78, "Fighter": 1.0, "Skirmisher": 0.90}.get(role, 1.0)
            if is_boss:
                role_mult *= 1.55
            hp_val = max(30, round(hp * role_mult))
            atk_val = round(off * (0.65 if role == "Caster" else 1.08 if is_boss else 1.0))
            mag_val = round(off * (1.12 if role == "Caster" else 0.92 if role == "Hybrid" else 0.0))
            grd_val = (1 if lv >= 20 else 0) + (1 if role == "Heavy" or lv >= 50 else 0) + (1 if is_boss and lv >= 45 else 0)

            zone_txt = "Quest Encounter"
            for q in q_list:
                if nm_key in json.dumps(q).lower():
                    zone_txt = f"Map {q.get('mapId', 1)} - {q.get('hubName', 'Quest Site')}"
                    break

            display_name = " ".join(
                w if w in {"of", "and"} else (w.capitalize() if "-" not in w else "-".join(p.capitalize() for p in w.split("-")))
                for w in nm_key.split()
            )
            stats[nm_key] = {
                "name": display_name,
                "cr": cr_s,
                "level": lv,
                "isBoss": is_boss,
                "portalNum": None,
                "role": f"{role} Boss" if is_boss else role,
                "zone": zone_txt,
                "homeBiome": zone_txt,
                "hp": hp_val,
                "atk": atk_val,
                "mag": mag_val,
                "guard": grd_val,
                "weak": weak,
                "resist": resist,
            }
    return stats


def parse_cr_num(cr_str: str) -> float:
    if "/" in cr_str:
        a, b = cr_str.split("/", 1)
        return float(a) / max(1.0, float(b))
    try:
        return float(cr_str)
    except ValueError:
        return 1.0


COLOSSAL_3X3_MOBS = {
    "frost giant", "cloud giant", "storm giant", "fire giant",
    "roc", "purple worm", "dragon turtle", "aboleth", "pit fiend", "balor",
    "adult black dragon", "adult green dragon", "adult silver dragon",
    "adult red dragon", "adult blue dragon", "ancient black dragon",
}

LARGE_2X2_MOBS = {
    "ogre", "ettin", "troll", "oni", "hill giant", "stone giant",
    "shield guardian", "clay golem", "stone golem", "iron golem",
    "earth elemental", "fire elemental", "water elemental", "air elemental", "efreeti",
    "manticore", "chuul", "giant crocodile", "giant octopus", "giant scorpion",
    "bulette", "chimera", "wyvern", "hydra", "otyugh", "remorhaz", "behir", "sphinx of lore",
    "gorgon", "awakened tree", "shambling mound", "nightmare", "polar bear", "saber-toothed tiger",
    "young black dragon", "young white dragon", "young copper dragon",
    "young green dragon", "young silver dragon", "young blue dragon", "young red dragon",
    "hezrou", "glabrezu", "bone devil", "horned devil", "ice devil", "nalfeshnee", "marilith",
}

LOW_ANIMAL_1X1_SCALE = {
    "wolf": 0.76,
    "giant crab": 0.74,
    "worg": 0.82,
    "dire wolf": 0.84,
    "winter wolf": 0.84,
    "hell hound": 0.80,
    "giant spider": 0.80,
    "giant constrictor snake": 0.86,
    "basilisk": 0.82,
    "black dragon wyrmling": 0.82,
    "red dragon wyrmling": 0.84,
    "blue dragon wyrmling": 0.84,
    "animated flying sword": 0.84,
    "ankheg": 0.88,
    "rust monster": 0.82,
    "grick": 0.84,
    "cockatrice": 0.78,
    "blood hawk": 0.80,
    "violet fungus": 0.82,
    "blink dog": 0.82,
    "phase spider": 0.86,
    "gray ooze": 0.82,
    "fire snake": 0.80,
    "magmin": 0.84,
    "will-o'-wisp": 0.76,
}

BULKY_1X1_SCALE = {
    "brown bear": 1.02,
    "owlbear": 1.02,
    "minotaur": 1.02,
    "wereboar": 1.00,
    "giant boar": 1.02,
    "gargoyle": 0.98,
    "flesh golem": 1.02,
    "salamander": 1.00,
    "king garrick": 1.04,
    "animated armor": 1.00,
    "water weird": 1.00,
    "black pudding": 1.02,
    "gelatinous cube": 1.02,
    "ochre jelly": 1.00,
    "griffon": 1.02,
    "hippogriff": 1.00,
    "giant eagle": 1.02,
    "slaver baron": 1.02,
    "marshal bleakwatch": 1.02,
    "abyssal eclipse guard": 1.04,
    "elder vampire lord": 1.02,
}


def suggest_footprint(name: str, role: str, cr: float, is_boss: bool, w: int, h: int) -> tuple[int, int, str, float]:
    """Common-sense size classification: Standard human/animal (1x1), Truly Large beast/brute (2x2), Colossal titan/adult dragon (3x3)."""
    low = name.strip().lower()
    if low in COLOSSAL_3X3_MOBS:
        return 3, 3, "Colossal (3×3)", 1.02
    if low in LARGE_2X2_MOBS:
        return 2, 2, "Large (2×2)", 1.00
    if low in LOW_ANIMAL_1X1_SCALE:
        return 1, 1, "Standard (1×1)", LOW_ANIMAL_1X1_SCALE[low]
    if low in BULKY_1X1_SCALE:
        return 1, 1, "Standard (1×1)", BULKY_1X1_SCALE[low]
    return 1, 1, "Standard (1×1)", 0.94


def find_magenta_cuts(rgb: np.ndarray, axis: int) -> list[tuple[int, int]]:
    """Find best 4 equal cell spans avoiding cutting across pixels near nominal 1/4, 2/4, 3/4."""
    length = rgb.shape[1] if axis == 1 else rgb.shape[0]
    r = rgb[:, :, 0].astype(np.int16)
    g = rgb[:, :, 1].astype(np.int16)
    b = rgb[:, :, 2].astype(np.int16)
    is_mag = (r > 130) & (b > 130) & (g < 140) & ((r - g) > 25) & ((b - g) > 25)
    # Fraction of magenta along each column (axis=1) or row (axis=0)
    line_score = is_mag.mean(axis=0 if axis == 1 else 1)

    cuts = [0]
    for k in (1, 2, 3):
        nom = (length * k) // 4
        lo = max(1, nom - 28)
        hi = min(length - 1, nom + 28)
        seg = line_score[lo:hi]
        best = lo + int(np.argmax(seg))
        cuts.append(best)
    cuts.append(length)
    return [(cuts[i], cuts[i + 1]) for i in range(4)]


def export_battle_scenes() -> list[dict]:
    CLIENT_SCENES_DIR.mkdir(parents=True, exist_ok=True)
    bs_text = BATTLE_SCENES_TXT.read_text(encoding="utf-8")
    parsed = re.findall(
        r"BIOME\s+(\d+)\s+OF\s+41\s+\(([^)]+)\)\s+—\s+([^\n]+)\n=+\n(?:#[^\n]*\n)*?#\s*Zones / Section:\s*([^\n]+)\n#\s*Monsters Spawning Here:\s*([^\n]+)",
        bs_text,
    )
    meta_by_id = {}
    for num_s, sid, title, zones, mobs in parsed:
        meta_by_id[sid.strip()] = {
            "order": int(num_s),
            "id": sid.strip(),
            "name": title.strip().title() if title.isupper() else title.strip(),
            "zones": zones.strip(),
            "spawnNames": [m.strip() for m in mobs.split(",") if m.strip()],
        }

    src_files = sorted(p for p in SCENES_SRC_DIR.iterdir() if p.is_file() and p.suffix.lower() in {".jpg", ".jpeg", ".png"})
    stages: list[dict] = []
    total_kb = 0
    for src in src_files:
        dst = CLIENT_SCENES_DIR / f"{src.stem}.webp"
        with Image.open(src) as im:
            rgb = im.convert("RGB").resize((SCENE_W, SCENE_H), Image.Resampling.LANCZOS)
            rgb.save(dst, "WEBP", quality=86, method=6)
        kb = dst.stat().st_size // 1024
        total_kb += kb

        info = meta_by_id.get(
            src.stem,
            {
                "order": len(stages) + 1,
                "id": src.stem,
                "name": src.stem.replace("_", " ").title(),
                "zones": "",
                "spawnNames": [],
            },
        )
        stages.append(
            {
                **info,
                "imagePath": f"assets/maps/battle_scenes/{dst.name}",
                "isPortal": "portal_" in src.stem,
                "heroZone": dict(DEFAULT_HERO_ZONE),
                "enemyGrid": dict(DEFAULT_ENEMY_GRID),
            }
        )

    stages.sort(key=lambda s: s["order"])
    print(f"Exported {len(stages)} Battle Scenes ({SCENE_W}x{SCENE_H} WebP, {total_kb / 1024:.2f} MB) -> {CLIENT_SCENES_DIR.relative_to(ROOT)}")
    return stages


PORTAL_BOSS_REWARDS = {
    1: (1200, 650),
    2: (4200, 2400),
    3: (9500, 6500),
    4: (16500, 14000),
    5: (26000, 27000),
    6: (38000, 48000),
    7: (52000, 80000),
    8: (75000, 120000),
}


def slice_and_export_monsters(stats_map: dict[str, dict], sheet_filter: set[int] | None = None) -> list[dict]:
    MONSTER_SLICES_DIR.mkdir(parents=True, exist_ok=True)
    CLIENT_ENEMIES_DIR.mkdir(parents=True, exist_ok=True)

    manifest = parse_monster_prompts()
    by_sheet: dict[int, list[dict]] = {}
    for entry in manifest:
        if sheet_filter and entry["sheet"] not in sheet_filter:
            continue
        by_sheet.setdefault(entry["sheet"], []).append(entry)

    monsters_out: list[dict] = []
    total_kb = 0

    for sheet_num in sorted(by_sheet.keys()):
        sheet_path = MONSTER_SHEETS_DIR / f"rod_monster_sheet_{sheet_num:02d}.jpg"
        if not sheet_path.exists():
            raise FileNotFoundError(f"Missing monster sheet: {sheet_path}")

        with Image.open(sheet_path) as im:
            rgb_im = im.convert("RGB")
            arr = np.array(rgb_im)
            x_spans = find_magenta_cuts(arr, axis=1)
            y_spans = find_magenta_cuts(arr, axis=0)

            for item in by_sheet[sheet_num]:
                x0, x1 = x_spans[item["col"]]
                y0, y1 = y_spans[item["row"]]
                cell_crop = rgb_im.crop((x0, y0, x1, y1))
                keyed = key_magenta_sprite(
                    cell_crop,
                    t_low=15.0,
                    t_high=140.0,
                    crop_bbox=True,
                    border_pad=4,
                    smart_interior_voids=True,
                    despill_edge_only=True,
                )

                slice_png = MONSTER_SLICES_DIR / f"{item['slug']}.png"
                keyed.save(slice_png, "PNG")

                orig_w, orig_h = keyed.size
                scale = min(1.0, MAX_ENEMY_SIDE / max(1, orig_w, orig_h))
                out_w = max(1, round(orig_w * scale))
                out_h = max(1, round(orig_h * scale))
                webp_im = keyed.resize((out_w, out_h), Image.Resampling.LANCZOS) if scale < 1.0 else keyed

                dst_webp = CLIENT_ENEMIES_DIR / f"{item['slug']}.webp"
                webp_im.save(dst_webp, "WEBP", quality=90, method=6)
                total_kb += dst_webp.stat().st_size // 1024

                st = stats_map.get(item["name"].lower(), {})
                cr_str = st.get("cr", "1")
                cr_num = parse_cr_num(cr_str)
                is_boss = bool(st.get("isBoss", False))
                portal_num = st.get("portalNum")
                boss_rewards = PORTAL_BOSS_REWARDS.get(int(portal_num)) if is_boss and portal_num else None
                role = st.get("role", "Skirmisher")
                gw, gh, size_label, vscale = suggest_footprint(item["name"], role, cr_num, is_boss, orig_w, orig_h)

                mob_entry = {
                    "id": f"mob_{item['slug']}",
                    "slug": item["slug"],
                    "name": item["name"],
                    "pose": item["pose"],
                    "sheet": sheet_num,
                    "role": role,
                    "level": int(st.get("level", 1)),
                    "cr": cr_str,
                    "hp": int(st.get("hp", 50)),
                    "atk": int(st.get("atk", 6)),
                    "mag": int(st.get("mag", 0)),
                    "guard": int(st.get("guard", 0)),
                    "weak": st.get("weak", "None"),
                    "resist": st.get("resist", "None"),
                    "zone": st.get("zone", ""),
                    "homeBiome": st.get("homeBiome", ""),
                    "isBoss": is_boss,
                    "portalNum": portal_num,
                    "iconPath": f"assets/enemies/{dst_webp.name}",
                    "spriteW": orig_w,
                    "spriteH": orig_h,
                    "gridW": gw,
                    "gridH": gh,
                    "sizePreset": size_label,
                    "visualScale": vscale,
                }
                if boss_rewards:
                    mob_entry["xp"], mob_entry["silver"] = boss_rewards
                monsters_out.append(mob_entry)
        print(f"  Sliced & Exported Monster Sheet {sheet_num:02d} (16 enemies)")

    print(f"Exported {len(monsters_out)} Enemy WebPs ({total_kb / 1024:.2f} MB) -> {CLIENT_ENEMIES_DIR.relative_to(ROOT)}")
    return monsters_out


def main() -> int:
    parser = argparse.ArgumentParser(description="Export ROD Battle Scenes & Monster sprites and build battle-config.json.")
    parser.add_argument("--reset-layout", action="store_true", help="Reset stage container positions and monster footprints to defaults.")
    parser.add_argument("--monsters-only", action="store_true", help="Re-slice and export monster sprites only, preserving battle-config tuning and stages.")
    parser.add_argument("--sheets", type=str, default="", help="Comma-separated sheet numbers to slice/export (e.g. 9,10,11,12).")
    args = parser.parse_args()

    sheet_filter = None
    if args.sheets.strip():
        sheet_filter = {int(s.strip()) for s in args.sheets.split(",") if s.strip()}

    stats_map = parse_monsters_stats()

    prev = {}
    if OUT_CONFIG.exists() and not args.reset_layout:
        try:
            prev = json.loads(OUT_CONFIG.read_text(encoding="utf-8"))
        except Exception:
            prev = {}

    if args.monsters_only and prev.get("monsters"):
        monsters = slice_and_export_monsters(stats_map, sheet_filter=sheet_filter)
        new_by_id = {m["id"]: m for m in monsters}
        seen_ids = set()
        merged = []
        for existing in prev["monsters"]:
            if not isinstance(existing, dict) or not existing.get("id"):
                continue
            eid = existing["id"]
            seen_ids.add(eid)
            if eid in new_by_id:
                existing["spriteW"] = new_by_id[eid]["spriteW"]
                existing["spriteH"] = new_by_id[eid]["spriteH"]
            merged.append(existing)
        for m in monsters:
            if m["id"] not in seen_ids:
                merged.append(m)
        prev["monsters"] = merged
        text = json.dumps(prev, indent=2) + "\n"
        OUT_CONFIG.parent.mkdir(parents=True, exist_ok=True)
        CLIENT_OUT_CONFIG.parent.mkdir(parents=True, exist_ok=True)
        OUT_CONFIG.write_text(text, encoding="utf-8")
        CLIENT_OUT_CONFIG.write_text(text, encoding="utf-8")
        print(f"Merged {len(monsters)} monster sprites into config ({len(merged)} total) -> {OUT_CONFIG}")
        return 0

    stages = export_battle_scenes()
    monsters = slice_and_export_monsters(stats_map, sheet_filter=sheet_filter)

    prev_stages = {s["id"]: s for s in prev.get("stages", []) if isinstance(s, dict) and s.get("id")}
    prev_mobs = {m["id"]: m for m in prev.get("monsters", []) if isinstance(m, dict) and m.get("id")}

    for st in stages:
        old = prev_stages.get(st["id"])
        if old:
            if isinstance(old.get("heroZone"), dict):
                st["heroZone"] = old["heroZone"]
            if isinstance(old.get("enemyGrid"), dict):
                st["enemyGrid"] = old["enemyGrid"]
            if isinstance(old.get("zoneSpawns"), dict):
                st["zoneSpawns"] = old["zoneSpawns"]
            for k in ("bossId", "portalNum"):
                if k in old:
                    st[k] = old[k]

    for mob in monsters:
        old = prev_mobs.get(mob["id"])
        if old:
            for k in ("actions", "pDef", "mDef", "gridW", "gridH", "sizePreset", "visualScale", "dropItemId", "xp", "silver"):
                if k in old:
                    mob[k] = old[k]

    payload = {
        "version": 1,
        "heroZoneDefault": DEFAULT_HERO_ZONE,
        "enemyGridDefault": DEFAULT_ENEMY_GRID,
        "stages": stages,
        "monsters": monsters,
    }
    if isinstance(prev.get("combatConfig"), dict):
        payload["combatConfig"] = prev["combatConfig"]

    OUT_CONFIG.parent.mkdir(parents=True, exist_ok=True)
    CLIENT_OUT_CONFIG.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(payload, indent=2) + "\n"
    OUT_CONFIG.write_text(text, encoding="utf-8")
    CLIENT_OUT_CONFIG.write_text(text, encoding="utf-8")
    print(f"Saved battle config ({len(stages)} stages, {len(monsters)} monsters) -> {OUT_CONFIG}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
