"""
slice_objective_and_exit_tokens.py
Canonical slicing script for objective (chest) tokens and exit beacon tokens.
Uses mathematical chroma-key & de-spill from core_chroma_key.py.

Outputs:
- PNG masters: assets/tokens/objectives/ and assets/tokens/exits/
- WebP assets: client/public/images/tokens/objectives/ and client/public/images/tokens/exits/
"""

import os
import sys
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from core_chroma_key import key_magenta_sprite

CHESTS_SRC = "assets/myview/chests.jpg"
EXITS_SRC = "assets/myview/exit-markers.jpg"

OUT_OBJECTIVES_PUBLIC = "client/public/images/tokens/objectives"
OUT_EXITS_PUBLIC = "client/public/images/tokens/exits"
OUT_OBJECTIVES_ASSETS = "assets/tokens/objectives"
OUT_EXITS_ASSETS = "assets/tokens/exits"

# Discard tokens 9 and 14 (1-based), which correspond to 0-based indices 8 and 13
DISCARD_CHEST_INDICES = {8, 13}

def process_chests():
    if not os.path.exists(CHESTS_SRC):
        print(f"Error: {CHESTS_SRC} not found!")
        return []

    os.makedirs(OUT_OBJECTIVES_PUBLIC, exist_ok=True)
    os.makedirs(OUT_OBJECTIVES_ASSETS, exist_ok=True)

    img = Image.open(CHESTS_SRC).convert("RGB")
    w, h = img.size
    cell_w = w // 4
    cell_h = h // 4

    print(f"\n--- Slicing Chest Tokens from {CHESTS_SRC} ({w}x{h}) ---")
    saved_chests = []
    token_num = 1

    for idx in range(16):
        if idx in DISCARD_CHEST_INDICES:
            print(f"  [Skipped] Token {idx+1} (discarded per quality review)")
            continue

        r_idx = idx // 4
        c_idx = idx % 4

        x1 = c_idx * cell_w
        y1 = r_idx * cell_h
        cell_img = img.crop((x1, y1, x1 + cell_w, y1 + cell_h))

        keyed = key_magenta_sprite(cell_img, t_low=15.0, t_high=140.0, crop_bbox=True)

        base_name = f"chest_token_{token_num:02d}"
        png_path = os.path.join(OUT_OBJECTIVES_ASSETS, f"{base_name}.png")
        webp_path = os.path.join(OUT_OBJECTIVES_PUBLIC, f"{base_name}.webp")

        keyed.save(png_path, "PNG")
        keyed.save(webp_path, "WEBP", quality=92, method=6)

        saved_chests.append(base_name)
        print(f"  [{token_num:02d}/14] Saved {base_name}.webp & .png ({keyed.size}) [from sheet cell {idx+1}]")
        token_num += 1

    return saved_chests

def process_exits():
    if not os.path.exists(EXITS_SRC):
        print(f"Error: {EXITS_SRC} not found!")
        return []

    os.makedirs(OUT_EXITS_PUBLIC, exist_ok=True)
    os.makedirs(OUT_EXITS_ASSETS, exist_ok=True)

    img = Image.open(EXITS_SRC).convert("RGB")
    w, h = img.size
    cell_w = w // 4
    cell_h = h // 4

    print(f"\n--- Slicing Exit Beacon Tokens from {EXITS_SRC} ({w}x{h}) ---")
    saved_exits = []

    for idx in range(16):
        r_idx = idx // 4
        c_idx = idx % 4

        x1 = c_idx * cell_w
        y1 = r_idx * cell_h
        cell_img = img.crop((x1, y1, x1 + cell_w, y1 + cell_h))

        keyed = key_magenta_sprite(cell_img, t_low=15.0, t_high=140.0, crop_bbox=True)

        token_num = idx + 1
        base_name = f"exit_token_{token_num:02d}"
        png_path = os.path.join(OUT_EXITS_ASSETS, f"{base_name}.png")
        webp_path = os.path.join(OUT_EXITS_PUBLIC, f"{base_name}.webp")

        keyed.save(png_path, "PNG")
        keyed.save(webp_path, "WEBP", quality=92, method=6)

        saved_exits.append(base_name)
        print(f"  [{token_num:02d}/16] Saved {base_name}.webp & .png ({keyed.size})")

    return saved_exits

if __name__ == "__main__":
    c_list = process_chests()
    e_list = process_exits()
    print(f"\nSlicing Complete: {len(c_list)} chest tokens and {len(e_list)} exit tokens produced!")
