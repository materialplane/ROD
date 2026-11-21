"""
slice_weapon_sheets_advanced.py
The canonical 5x5 image slicing & chroma-key pipeline for weapons & spell implements.

Extracts distinct weapon sprites from 5x5 sheets (2048x2048):
- 5x5 Grid per Sheet: 5 item rows x 5 craftsmanship tiers (Columns 1-5 = Tiers 1-5)
- 25 icons per sheet = 25 transparent PNG sprites
- Canonical DB items (36 total) are saved to client/public/images/icons/weapons/
- Extra non-database items (4 total: Sheet 6 rows 2-4 and Sheet 8 row 4) are discarded

Uses core_chroma_key for mathematical de-spill, luminance matching, and anti-aliasing.
Outputs to:
- client/public/images/icons/weapons/{tier_slug}/
- client/public/images/icons/weapons/{tier_slug}/{category}/
"""

import argparse
import os
import sys
from PIL import Image, ImageDraw, ImageFont
import numpy as np

# Ensure imageprompts/magenta-removal is on Python path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.append(CURRENT_DIR)

from core_chroma_key import key_magenta_sprite

# Canonical item keys across weapon sheets
SHEET_ITEM_MAPPING = {
    1: [
        {"row": 0, "id": "longsword", "name": "Longsword", "slot": "mainhand", "category": "martial_melee"},
        {"row": 1, "id": "greatsword", "name": "Greatsword", "slot": "twohand", "category": "martial_melee"},
        {"row": 2, "id": "shortsword", "name": "Shortsword", "slot": "mainhand", "category": "martial_melee"},
        {"row": 3, "id": "scimitar", "name": "Scimitar", "slot": "mainhand", "category": "martial_melee"},
        {"row": 4, "id": "rapier", "name": "Rapier", "slot": "mainhand", "category": "martial_melee"},
    ],
    2: [
        {"row": 0, "id": "battleaxe", "name": "Battleaxe", "slot": "mainhand", "category": "martial_melee"},
        {"row": 1, "id": "greataxe", "name": "Greataxe", "slot": "twohand", "category": "martial_melee"},
        {"row": 2, "id": "handaxe", "name": "Handaxe", "slot": "mainhand", "category": "simple_melee"},
        {"row": 3, "id": "maul", "name": "Maul", "slot": "twohand", "category": "martial_melee"},
        {"row": 4, "id": "greatclub", "name": "Greatclub", "slot": "twohand", "category": "simple_melee"},
    ],
    3: [
        {"row": 0, "id": "warhammer", "name": "Warhammer", "slot": "mainhand", "category": "martial_melee"},
        {"row": 1, "id": "light_hammer", "name": "Light Hammer", "slot": "mainhand", "category": "simple_melee"},
        {"row": 2, "id": "war_pick", "name": "War Pick", "slot": "mainhand", "category": "martial_melee"},
        {"row": 3, "id": "mace", "name": "Mace", "slot": "mainhand", "category": "simple_melee"},
        {"row": 4, "id": "morningstar", "name": "Morningstar", "slot": "mainhand", "category": "martial_melee"},
    ],
    4: [
        {"row": 0, "id": "dagger", "name": "Dagger", "slot": "mainhand", "category": "simple_melee"},
        {"row": 1, "id": "sickle", "name": "Sickle", "slot": "mainhand", "category": "simple_melee"},
        {"row": 2, "id": "club", "name": "Club", "slot": "mainhand", "category": "simple_melee"},
        {"row": 3, "id": "flail", "name": "Flail", "slot": "mainhand", "category": "martial_melee"},
        {"row": 4, "id": "quarterstaff", "name": "Quarterstaff", "slot": "twohand", "category": "simple_melee"},
    ],
    5: [
        {"row": 0, "id": "spear", "name": "Spear", "slot": "mainhand", "category": "simple_melee"},
        {"row": 1, "id": "pike", "name": "Pike", "slot": "twohand", "category": "martial_melee"},
        {"row": 2, "id": "halberd", "name": "Halberd", "slot": "twohand", "category": "martial_melee"},
        {"row": 3, "id": "glaive", "name": "Glaive", "slot": "twohand", "category": "martial_melee"},
        {"row": 4, "id": "javelin", "name": "Javelin", "slot": "mainhand", "category": "simple_melee"},
    ],
    6: [
        {"row": 0, "id": "lance", "name": "Lance", "slot": "twohand", "category": "martial_melee"},
        {"row": 1, "id": "trident", "name": "Trident", "slot": "mainhand", "category": "martial_melee"},
        {"row": 2, "id": "lucerne_hammer", "name": "Lucerne Hammer", "slot": "twohand", "category": "martial_melee", "extra": True},
        {"row": 3, "id": "bec_de_corbin", "name": "Bec de Corbin", "slot": "twohand", "category": "martial_melee", "extra": True},
        {"row": 4, "id": "war_scythe", "name": "War Scythe", "slot": "twohand", "category": "martial_melee", "extra": True},
    ],
    7: [
        {"row": 0, "id": "shortbow", "name": "Shortbow", "slot": "twohand", "category": "simple_ranged"},
        {"row": 1, "id": "longbow", "name": "Longbow", "slot": "twohand", "category": "martial_ranged"},
        {"row": 2, "id": "hand_crossbow", "name": "Hand Crossbow", "slot": "mainhand", "category": "martial_ranged"},
        {"row": 3, "id": "light_crossbow", "name": "Light Crossbow", "slot": "twohand", "category": "simple_ranged"},
        {"row": 4, "id": "heavy_crossbow", "name": "Heavy Crossbow", "slot": "twohand", "category": "martial_ranged"},
    ],
    8: [
        {"row": 0, "id": "swift_wand", "name": "Swift Wand", "slot": "mainhand", "category": "arcane_wand"},
        {"row": 1, "id": "war_wand", "name": "War Wand", "slot": "mainhand", "category": "arcane_wand"},
        {"row": 2, "id": "heavy_rod", "name": "Heavy Rod", "slot": "mainhand", "category": "arcane_wand"},
        {"row": 3, "id": "scepter", "name": "Scepter", "slot": "twohand", "category": "arcane_wand"},
        {"row": 4, "id": "archmage_scepter", "name": "Archmage Scepter", "slot": "twohand", "category": "arcane_wand", "extra": True},
    ],
    9: [
        {"row": 0, "id": "warsword", "name": "Warsword", "slot": "twohand", "category": "martial_melee"},
        {"row": 1, "id": "waraxe", "name": "Waraxe", "slot": "twohand", "category": "martial_melee"},
        {"row": 2, "id": "polehammer", "name": "Polehammer", "slot": "twohand", "category": "martial_melee"},
        {"row": 3, "id": "mattock", "name": "Mattock", "slot": "twohand", "category": "martial_melee"},
        {"row": 4, "id": "war_fork", "name": "War Fork", "slot": "twohand", "category": "martial_melee"},
    ],
    10: [
        {"row": 0, "id": "stiletto", "name": "Stiletto", "slot": "mainhand", "category": "simple_melee"},
        {"row": 1, "id": "sword", "name": "Sword", "slot": "mainhand", "category": "martial_melee"},
        {"row": 2, "id": "saber", "name": "Saber", "slot": "mainhand", "category": "martial_melee"},
        {"row": 3, "id": "estoc", "name": "Estoc", "slot": "mainhand", "category": "martial_melee"},
        {"row": 4, "id": "war_spear", "name": "War Spear", "slot": "twohand", "category": "simple_melee"},
    ],
    11: [
        {"row": 0, "id": "greatstaff", "name": "Greatstaff", "slot": "twohand", "category": "simple_melee"},
        {"row": 1, "id": "net", "name": "Net", "slot": "mainhand", "category": "martial_ranged", "extra": True},
        {"row": 2, "id": "practice_cudgel", "name": "Practice Cudgel", "slot": "mainhand", "category": "simple_melee", "extra": True},
        {"row": 3, "id": "throwing_knife", "name": "Throwing Knife", "slot": "mainhand", "category": "simple_melee", "extra": True},
        {"row": 4, "id": "wooden_stake", "name": "Wooden Stake", "slot": "mainhand", "category": "simple_melee", "extra": True},
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

def slice_single_5x5_sheet(
    src_path,
    sheet_num=1,
    out_dir="client/public/images/icons/weapons",
    cell_inset=0,
    border_pad=6,
    generate_preview=True,
    preview_path=None,
    discard_extras=True
):
    """
    Slices a single 5x5 weapon sheet and keys out the #FF00FF magenta background.
    If discard_extras is True, items marked with 'extra': True are not saved to out_dir.
    """
    if not os.path.exists(src_path):
        print(f"[-] Source image not found: {src_path}")
        return 0, 0

    if sheet_num not in SHEET_ITEM_MAPPING:
        print(f"[-] Invalid sheet number {sheet_num}. Expected 1-8.")
        return 0, 0

    os.makedirs(out_dir, exist_ok=True)
    img = Image.open(src_path).convert("RGB")
    w, h = img.size
    print(f"\n[+] Processing Weapon Sheet {sheet_num}: {src_path} ({w}x{h}) -> {out_dir}")

    row_defs = SHEET_ITEM_MAPPING[sheet_num]
    saved_count = 0
    discarded_count = 0

    # For composite preview
    preview_cells = []

    for r_idx in range(5):
        item_info = row_defs[r_idx]
        item_id = item_info["id"]
        item_name = item_info["name"]
        category = item_info.get("category", "melee")
        is_extra = item_info.get("extra", False)

        y1 = max(0, int(round(r_idx * h / 5.0)) + cell_inset)
        y2 = min(h, int(round((r_idx + 1) * h / 5.0)) - cell_inset)

        row_cells = []

        for c_idx in range(5):
            tier_num = c_idx + 1
            x1 = max(0, int(round(c_idx * w / 5.0)) + cell_inset)
            x2 = min(w, int(round((c_idx + 1) * w / 5.0)) - cell_inset)

            cell_img = img.crop((x1, y1, x2, y2))

            # Apply canonical mathematical chroma-keying with interior void removal
            keyed_sprite = key_magenta_sprite(
                cell_img,
                t_low=15.0,
                t_high=140.0,
                crop_bbox=True,
                border_pad=border_pad,
                include_interior_voids=True
            )

            tier_slug = TIER_SLUGS[c_idx]
            tier_desc = TIER_NAMES[c_idx]

            if is_extra and discard_extras:
                discarded_count += 1
                print(f"    [DISCARDED EXTRA] Row {r_idx+1} Col {c_idx+1}: {item_name} [{tier_desc}] (Non-database item)")
            else:
                # 1. Save to category subfolder: {out_dir}/{tier_slug}/{category}/{item_id}.png
                cat_dir = os.path.join(out_dir, tier_slug, category)
                os.makedirs(cat_dir, exist_ok=True)
                cat_file = os.path.join(cat_dir, f"{item_id}.png")
                keyed_sprite.save(cat_file, "PNG")

                # 2. Save directly to tier folder: {out_dir}/{tier_slug}/{item_id}.png
                tier_dir = os.path.join(out_dir, tier_slug)
                os.makedirs(tier_dir, exist_ok=True)
                flat_file = os.path.join(tier_dir, f"{item_id}.png")
                keyed_sprite.save(flat_file, "PNG")

                saved_count += 1
                print(f"    - Row {r_idx+1} Col {c_idx+1}: {item_name} [{tier_desc}] -> {tier_slug}/{item_id}.png ({keyed_sprite.size})")

            row_cells.append(keyed_sprite)

        preview_cells.append(row_cells)

    # Optional composite preview generation on dark neutral background
    if generate_preview and preview_path:
        create_composite_preview(preview_cells, row_defs, preview_path)

    return saved_count, discarded_count

def create_composite_preview(cells, row_defs, out_preview_path, cell_box_size=180):
    """
    Creates a dark-slate contact sheet grid displaying all 25 keyed weapon sprites.
    """
    cols = 5
    rows = 5
    header_h = 60
    sidebar_w = 140
    grid_w = cols * cell_box_size
    grid_h = rows * cell_box_size
    canvas_w = sidebar_w + grid_w + 30
    canvas_h = header_h + grid_h + 30

    # Dark background
    preview = Image.new("RGBA", (canvas_w, canvas_h), (24, 26, 32, 255))
    draw = ImageDraw.Draw(preview)

    # Header labels (Tiers)
    tier_labels = ["Tier 1: Common", "Tier 2: Sturdy", "Tier 3: Veteran", "Tier 4: Master", "Tier 5: Sovereign"]
    for c in range(cols):
        cx = sidebar_w + c * cell_box_size + (cell_box_size // 2)
        draw.text((cx, 25), tier_labels[c], fill=(220, 200, 150, 255), anchor="mm")

    # Rows
    for r in range(rows):
        item_info = row_defs[r]
        item_name = item_info["name"]
        is_extra = item_info.get("extra", False)
        prefix = "[EXTRA] " if is_extra else ""
        label_text = f"{prefix}{item_name}"

        ry = header_h + r * cell_box_size + (cell_box_size // 2)
        text_color = (180, 140, 140, 255) if is_extra else (200, 205, 215, 255)
        draw.text((sidebar_w - 15, ry), label_text, fill=text_color, anchor="rm")

        for c in range(cols):
            x = sidebar_w + c * cell_box_size
            y = header_h + r * cell_box_size

            # Draw cell box with dark border
            box_outline = (60, 40, 40, 255) if is_extra else (45, 50, 60, 255)
            draw.rectangle([x + 4, y + 4, x + cell_box_size - 4, y + cell_box_size - 4],
                           fill=(18, 20, 24, 255), outline=box_outline, width=1)

            sprite = cells[r][c]
            sw, sh = sprite.size

            # Scale to fit inside cell box maintaining aspect ratio
            max_inner = cell_box_size - 24
            scale = min(max_inner / max(1, sw), max_inner / max(1, sh))
            new_w = max(1, int(sw * scale))
            new_h = max(1, int(sh * scale))
            resized = sprite.resize((new_w, new_h), Image.Resampling.LANCZOS)

            # Center sprite in cell
            pos_x = x + (cell_box_size - new_w) // 2
            pos_y = y + (cell_box_size - new_h) // 2
            preview.paste(resized, (pos_x, pos_y), resized)

    os.makedirs(os.path.dirname(os.path.abspath(out_preview_path)), exist_ok=True)
    preview.save(out_preview_path, "PNG")
    print(f"[+] Sliced Preview saved to: {out_preview_path}")

def slice_all_sheets(out_dir="client/public/images/icons/weapons", discard_extras=True):
    total_saved = 0
    total_discarded = 0

    previews_dir = "assets/weapons/previews"
    os.makedirs(previews_dir, exist_ok=True)

    for sheet_num in sorted(SHEET_ITEM_MAPPING.keys()):
        # Look for png first, fallback to jpg
        src_path = f"assets/weapons/weapons_sheet_{sheet_num}.png"
        if not os.path.exists(src_path):
            src_path = f"assets/weapons/weapons_sheet_{sheet_num}.jpg"

        preview_path = os.path.join(previews_dir, f"sheet_{sheet_num}_preview.png")

        saved, discarded = slice_single_5x5_sheet(
            src_path=src_path,
            sheet_num=sheet_num,
            out_dir=out_dir,
            border_pad=6,
            generate_preview=True,
            preview_path=preview_path,
            discard_extras=discard_extras
        )
        total_saved += saved
        total_discarded += discarded

    print(f"\n=======================================================")
    print(f"ALL WEAPON SHEETS SLICING COMPLETE!")
    print(f"Canonical Database Sprites Saved: {total_saved} (Target: 180)")
    print(f"Non-Database Sprites Discarded:   {total_discarded} (Target: 20)")
    print(f"=======================================================\n")
    return total_saved, total_discarded

def main():
    parser = argparse.ArgumentParser(description="Slice 5x5 weapon sheets and chroma-key magenta.")
    parser.add_argument("--sheet", type=int, default=None, help="Specific sheet number (1-8)")
    parser.add_argument("--all", action="store_true", help="Slice all 8 sheets in sequence")
    parser.add_argument("--src", type=str, default=None, help="Source sheet image path")
    parser.add_argument("--out", type=str, default="client/public/images/icons/weapons", help="Output directory")
    parser.add_argument("--inset", type=int, default=0, help="Per-cell inset in pixels")
    parser.add_argument("--pad", type=int, default=6, help="Padding in pixels around bounding box")
    parser.add_argument("--preview", type=str, default=None, help="Optional output path for preview contact sheet")
    parser.add_argument("--no-discard", action="store_true", help="Do not discard extra non-database items")

    args = parser.parse_args()
    discard_extras = not args.no_discard

    if args.all or (args.sheet is None and args.src is None):
        slice_all_sheets(out_dir=args.out, discard_extras=discard_extras)
    else:
        sheet_num = args.sheet or 1
        src_path = args.src or f"assets/weapons/weapons_sheet_{sheet_num}.png"
        saved, discarded = slice_single_5x5_sheet(
            src_path=src_path,
            sheet_num=sheet_num,
            out_dir=args.out,
            cell_inset=args.inset,
            border_pad=args.pad,
            generate_preview=bool(args.preview),
            preview_path=args.preview,
            discard_extras=discard_extras
        )
        print(f"\n=======================================================")
        print(f"Sheet {sheet_num} Slicing Complete! Saved: {saved}, Discarded: {discarded}")
        print(f"=======================================================\n")

if __name__ == "__main__":
    main()
