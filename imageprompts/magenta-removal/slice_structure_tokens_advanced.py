"""
slice_structure_tokens_advanced.py
Extracts 16 holding/settlement structure tokens from all 4 racial 4x4 grid sheets:
- assets/tokens/human-structures.jpg   -> client/public/images/tokens/structures/human/
- assets/tokens/dwarven-structures.jpg -> client/public/images/tokens/structures/dwarven/
- assets/tokens/elven-structures.jpg   -> client/public/images/tokens/structures/elven/
- assets/tokens/orc-structures.jpg     -> client/public/images/tokens/structures/orc/

Uses core_chroma_key for mathematical de-spill, luminance matching, and anti-aliasing.
"""

import os
from PIL import Image
from core_chroma_key import key_magenta_sprite

STRUCTURE_SHEETS = [
    {
        "race": "human",
        "prefix": "human_structure",
        "src": "assets/tokens/human-structures.jpg",
        "out_dir": "client/public/images/tokens/structures/human"
    },
    {
        "race": "dwarven",
        "prefix": "dwarven_structure",
        "src": "assets/tokens/dwarven-structures.jpg",
        "out_dir": "client/public/images/tokens/structures/dwarven"
    },
    {
        "race": "elven",
        "prefix": "elven_structure",
        "src": "assets/tokens/elven-structures.jpg",
        "out_dir": "client/public/images/tokens/structures/elven"
    },
    {
        "race": "orc",
        "prefix": "orc_structure",
        "src": "assets/tokens/orc-structures.jpg",
        "out_dir": "client/public/images/tokens/structures/orc"
    }
]

def slice_structure_tokens():
    for sheet in STRUCTURE_SHEETS:
        src_path = sheet["src"]
        if not os.path.exists(src_path):
            print(f"Skipping {src_path} (not found)")
            continue

        out_dir = sheet["out_dir"]
        os.makedirs(out_dir, exist_ok=True)

        img = Image.open(src_path).convert("RGB")
        w, h = img.size
        cell_w = w // 4
        cell_h = h // 4

        print(f"\nProcessing {sheet['race'].upper()} structures from {src_path}...")

        for idx in range(16):
            r_idx = idx // 4
            c_idx = idx % 4

            x1 = c_idx * cell_w
            y1 = r_idx * cell_h
            cell_img = img.crop((x1, y1, x1 + cell_w, y1 + cell_h))

            final_img = key_magenta_sprite(cell_img, t_low=15.0, t_high=140.0, crop_bbox=True)

            filename = f"{sheet['prefix']}_{idx+1:02d}.png"
            out_path = os.path.join(out_dir, filename)
            final_img.save(out_path, "PNG")

            print(f"  [{idx+1}/16] Saved {filename} ({final_img.size})")

    print("\nStructure tokens re-slicing complete!")

if __name__ == "__main__":
    slice_structure_tokens()
