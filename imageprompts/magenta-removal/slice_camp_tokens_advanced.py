"""
slice_camp_tokens_advanced.py
Extracts 16 progressive mercenary encampment tokens from all 4 racial 4x4 grid sheets:
- assets/tokens/camp-stations.jpg    -> client/public/images/tokens/camps/human/ (and /camps/)
- assets/tokens/dwarven-stations.jpg -> client/public/images/tokens/camps/dwarf/
- assets/tokens/elf_stations.jpg     -> client/public/images/tokens/camps/elf/
- assets/tokens/orc-stations.jpg     -> client/public/images/tokens/camps/orc/

Uses core_chroma_key for mathematical de-spill, luminance matching, and anti-aliasing.
"""

import os
from PIL import Image
from core_chroma_key import key_magenta_sprite

RACE_SHEETS = [
    {
        "race": "human",
        "src": "assets/tokens/camp-stations.jpg",
        "out_dirs": ["client/public/images/tokens/camps/human"]
    },
    {
        "race": "dwarf",
        "src": "assets/tokens/dwarven-stations.jpg",
        "out_dirs": ["client/public/images/tokens/camps/dwarf"]
    },
    {
        "race": "elf",
        "src": "assets/tokens/elf_stations.jpg",
        "out_dirs": ["client/public/images/tokens/camps/elf"]
    },
    {
        "race": "orc",
        "src": "assets/tokens/orc-stations.jpg",
        "out_dirs": ["client/public/images/tokens/camps/orc"]
    }
]

def slice_camp_tokens():
    for sheet in RACE_SHEETS:
        src_path = sheet["src"]
        if not os.path.exists(src_path):
            print(f"Skipping {src_path} (not found)")
            continue

        for out_dir in sheet["out_dirs"]:
            os.makedirs(out_dir, exist_ok=True)

        img = Image.open(src_path).convert("RGB")
        w, h = img.size
        cell_w = w // 4
        cell_h = h // 4

        print(f"\nProcessing {sheet['race'].upper()} camps from {src_path}...")

        for idx in range(16):
            r_idx = idx // 4
            c_idx = idx % 4

            x1 = c_idx * cell_w
            y1 = r_idx * cell_h
            cell_img = img.crop((x1, y1, x1 + cell_w, y1 + cell_h))

            final_img = key_magenta_sprite(cell_img, t_low=15.0, t_high=140.0, crop_bbox=True)

            filename = f"camp_stage_{idx+1:02d}.png"
            for out_dir in sheet["out_dirs"]:
                out_path = os.path.join(out_dir, filename)
                final_img.save(out_path, "PNG")

            print(f"  [{idx+1}/16] Saved {filename} ({final_img.size})")

    print("\nCamp tokens re-slicing complete!")

if __name__ == "__main__":
    slice_camp_tokens()
