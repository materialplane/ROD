"""
slice_armor_sheets_advanced.py
The canonical 5x5 image slicing & chroma-key pipeline for armor and shields.

Extracts 400 distinct cultural armor & shield sprites from 16 5x5 sheets (2048x2048):
- 4 Races: Human, Elven, Dwarven, Orcish (4 sheets each = 16 sheets total)
- 5x5 Grid per Sheet: 5 item rows x 5 craftsmanship tiers (Columns 1-5 = Tiers 1-5)
- 25 icons per sheet x 16 sheets = 400 transparent PNG sprites

Uses core_chroma_key for mathematical de-spill, luminance matching, and anti-aliasing.
Outputs to:
- client/public/images/icons/armor/{race}/
"""

import argparse
import os
import sys
from PIL import Image

# Ensure imageprompts/magenta-removal is on Python path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.append(CURRENT_DIR)

from core_chroma_key import key_magenta_sprite

# Canonical item keys across the 4 sheets
SHEET_ITEM_MAPPING = {
    1: [
        {"row": 0, "id": "linen_robe", "name": "Linen Robe", "slot": "torso", "category": "robe"},
        {"row": 1, "id": "woolen_robe", "name": "Woolen Robe", "slot": "torso", "category": "robe"},
        {"row": 2, "id": "silk_robe", "name": "Silk Robe", "slot": "torso", "category": "robe"},
        {"row": 3, "id": "velvet_robe", "name": "Velvet Robe", "slot": "torso", "category": "robe"},
        {"row": 4, "id": "padded_armor", "name": "Padded Armor", "slot": "torso", "category": "light_armor"},
    ],
    2: [
        {"row": 0, "id": "leather_armor", "name": "Leather Armor", "slot": "torso", "category": "light_armor"},
        {"row": 1, "id": "studded_leather", "name": "Studded Leather", "slot": "torso", "category": "light_armor"},
        {"row": 2, "id": "hide_armor", "name": "Hide Armor", "slot": "torso", "category": "medium_armor"},
        {"row": 3, "id": "chain_shirt", "name": "Chain Shirt", "slot": "torso", "category": "medium_armor"},
        {"row": 4, "id": "scale_mail", "name": "Scale Mail", "slot": "torso", "category": "medium_armor"},
    ],
    3: [
        {"row": 0, "id": "breastplate", "name": "Breastplate", "slot": "torso", "category": "medium_armor"},
        {"row": 1, "id": "half_plate", "name": "Half Plate", "slot": "torso", "category": "medium_armor"},
        {"row": 2, "id": "ring_mail", "name": "Ring Mail", "slot": "torso", "category": "heavy_armor"},
        {"row": 3, "id": "chain_mail", "name": "Chain Mail", "slot": "torso", "category": "heavy_armor"},
        {"row": 4, "id": "splint_armor", "name": "Splint Armor", "slot": "torso", "category": "heavy_armor"},
    ],
    4: [
        {"row": 0, "id": "plate_armor", "name": "Plate Armor", "slot": "torso", "category": "heavy_armor"},
        {"row": 1, "id": "buckler_shield", "name": "Small Round Buckler", "slot": "offhand", "category": "shield"},
        {"row": 2, "id": "round_shield", "name": "Medium Round Shield", "slot": "offhand", "category": "shield"},
        {"row": 3, "id": "heater_shield", "name": "Heater Shield", "slot": "offhand", "category": "shield"},
        {"row": 4, "id": "kite_shield", "name": "Kite Shield", "slot": "offhand", "category": "shield"},
    ]
}

TIER_NAMES = [
    "Tier 1 (Common / Crude)",
    "Tier 2 (Sturdy / Standard)",
    "Tier 3 (Veteran / Reinforced)",
    "Tier 4 (Artisan / Masterwork)",
    "Tier 5 (Sovereign / Apex)"
]

TIER_SLUGS = [
    "common",
    "uncommon",
    "rare",
    "very_rare",
    "legendary"
]

RACE_CONFIGS = {
    "human": {
        "folder": "human",
        "sheets": [
            {"sheet_num": 1, "src": "assets/armor/human-armor1.jpg"},
            {"sheet_num": 2, "src": "assets/armor/human-armor2.jpg"},
            {"sheet_num": 3, "src": "assets/armor/human-armor3.jpg"},
            {"sheet_num": 4, "src": "assets/armor/human-armor4.jpg"},
        ]
    },
    "elven": {
        "folder": "elven",
        "sheets": [
            {"sheet_num": 1, "src": "assets/armor/elven-armor1.jpg"},
            {"sheet_num": 2, "src": "assets/armor/elven-armor2.jpg"},
            {"sheet_num": 3, "src": "assets/armor/elven-armor3.jpg"},
            {"sheet_num": 4, "src": "assets/armor/elven-armor4.jpg"},
        ]
    },
    "dwarven": {
        "folder": "dwarven",
        "sheets": [
            {"sheet_num": 1, "src": "assets/armor/dwarven-armor1.jpg"},
            {"sheet_num": 2, "src": "assets/armor/dwarven-armor2.jpg"},
            {"sheet_num": 3, "src": "assets/armor/dwarven-armor3.jpg"},
            {"sheet_num": 4, "src": "assets/armor/dwarven-armor4.jpg"},
        ]
    },
    "orc": {
        "folder": "orc",
        "sheets": [
            {"sheet_num": 1, "src": "assets/armor/orc-armor1.jpg", "alt_src": "assets/armor/orcish-armor1.jpg"},
            {"sheet_num": 2, "src": "assets/armor/orc-armor2.jpg", "alt_src": "assets/armor/orcish-armor2.jpg"},
            {"sheet_num": 3, "src": "assets/armor/orc-armor3.jpg", "alt_src": "assets/armor/orcish-armor3.jpg"},
            {"sheet_num": 4, "src": "assets/armor/orc-armor4.jpg", "alt_src": "assets/armor/orcish-armor4.jpg"},
        ]
    }
}

def slice_single_5x5_sheet(src_path, sheet_num, out_dir, race_name="generic", cell_inset=8):
    """
    Slices a 5x5 grid image into 25 keyed transparent sprites.
    cell_inset: Insets the crop inside each cell by N pixels to eliminate AI grid borders/seams.
    """
    if not os.path.exists(src_path):
        print(f"[-] Source image not found: {src_path}")
        return 0

    if sheet_num not in SHEET_ITEM_MAPPING:
        print(f"[-] Invalid sheet number {sheet_num}. Expected 1 to 4.")
        return 0

    os.makedirs(out_dir, exist_ok=True)
    img = Image.open(src_path).convert("RGB")
    w, h = img.size
    print(f"\n[+] Processing Sheet {sheet_num} ({race_name.upper()}): {src_path} ({w}x{h}) -> {out_dir}")

    row_defs = SHEET_ITEM_MAPPING[sheet_num]
    saved_count = 0

    for r_idx in range(5):
        item_info = row_defs[r_idx]
        item_id = item_info["id"]
        item_name = item_info["name"]

        y1 = max(0, int(round(r_idx * h / 5.0)) + cell_inset)
        y2 = min(h, int(round((r_idx + 1) * h / 5.0)) - cell_inset)

        for c_idx in range(5):
            tier_num = c_idx + 1
            x1 = max(0, int(round(c_idx * w / 5.0)) + cell_inset)
            x2 = min(w, int(round((c_idx + 1) * w / 5.0)) - cell_inset)

            cell_img = img.crop((x1, y1, x2, y2))

            # Apply canonical mathematical chroma-keying with border padding
            keyed_sprite = key_magenta_sprite(
                cell_img,
                t_low=15.0,
                t_high=140.0,
                crop_bbox=True,
                border_pad=6
            )

            # Target structured path: {race}/{tier_slug}/{category}/{item_id}.png
            category = item_info.get("category", "armor")
            tier_slug = TIER_SLUGS[c_idx]
            tier_dir = os.path.join(out_dir, tier_slug, category)
            os.makedirs(tier_dir, exist_ok=True)

            filename = f"{item_id}.png"
            out_file = os.path.join(tier_dir, filename)
            keyed_sprite.save(out_file, "PNG")
            saved_count += 1

            tier_desc = TIER_NAMES[c_idx]
            print(f"    - Row {r_idx+1} Col {c_idx+1}: {item_name} [{tier_desc}] -> {tier_slug}/{category}/{filename} ({keyed_sprite.size})")

    return saved_count

def slice_all_armor(target_race=None, base_out="client/public/images/icons/armor", cell_inset=8):
    """
    Iterates through all configured racial sheets and extracts all 5x5 grids.
    """
    total_saved = 0
    races_to_process = [target_race] if target_race else list(RACE_CONFIGS.keys())

    print(f"=== Slicing 5x5 Armor Sheets for: {', '.join(races_to_process).upper()} (Splice Inset: {cell_inset}px) ===")
    print(f"Output Base Directory: {base_out}\n")

    for race_key in races_to_process:
        if race_key not in RACE_CONFIGS:
            print(f"[-] Unknown race key: {race_key}")
            continue

        cfg = RACE_CONFIGS[race_key]
        race_out_dir = os.path.join(base_out, cfg["folder"])

        for sheet in cfg["sheets"]:
            src_path = sheet["src"]
            if not os.path.exists(src_path) and "alt_src" in sheet and os.path.exists(sheet["alt_src"]):
                src_path = sheet["alt_src"]

            s_num = sheet["sheet_num"]
            count = slice_single_5x5_sheet(
                src_path=src_path,
                sheet_num=s_num,
                out_dir=race_out_dir,
                race_name=race_key,
                cell_inset=cell_inset
            )
            total_saved += count

    print(f"\n=======================================================")
    print(f"All 5x5 Armor Slicing Complete! Total Sprites Saved: {total_saved}")
    print(f"=======================================================\n")
    return total_saved

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Canonical 5x5 Armor & Shield Slicing Pipeline")
    parser.add_argument("--race", type=str, choices=["human", "elven", "dwarven", "orc", "all"], default="all",
                        help="Filter by race (human, elven, dwarven, orc, or all)")
    parser.add_argument("--sheet", type=str, default=None,
                        help="Path to an individual 5x5 sheet image (e.g. assets/armor/human-armor1.jpg)")
    parser.add_argument("--sheet-num", type=int, default=1, choices=[1, 2, 3, 4],
                        help="Sheet number (1-4) when slicing an individual sheet")
    parser.add_argument("--inset", type=int, default=8,
                        help="Splice cut margin inset in pixels (cuts through dark grid lines)")
    parser.add_argument("--out-dir", type=str, default="client/public/images/icons/armor",
                        help="Base output directory")

    args = parser.parse_args()

    if args.sheet:
        # Slicing a specific single file
        dest = args.out_dir
        if args.race != "all":
            dest = os.path.join(args.out_dir, args.race)
        slice_single_5x5_sheet(args.sheet, args.sheet_num, dest, race_name=args.race, cell_inset=args.inset)
    else:
        race_target = None if args.race == "all" else args.race
        slice_all_armor(target_race=race_target, base_out=args.out_dir, cell_inset=args.inset)
