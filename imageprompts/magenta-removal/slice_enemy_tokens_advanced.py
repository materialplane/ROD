"""
slice_enemy_tokens_advanced.py
Extracts 16 biome-specific outlaw encampment tokens from assets/tokens/enemy_camp_1.jpg (2048x2048 4x4 grid):
- Rows 1 & 2: 8 Biome-Specific Looter Camps (Foothills, Forests, Tropical, Deserts, Marshes, Plains, Lake, River)
- Rows 3 & 4: 8 Biome-Specific Poacher Camps (Foothills, Forests, Tropical, Deserts, Marshes, Plains, Lake, River)

Uses core_chroma_key for mathematical de-spill, luminance matching, and anti-aliasing.
Outputs to:
- client/public/images/tokens/spawns/
- client/public/images/tokens/enemy_camps/
"""

import os
from PIL import Image
from core_chroma_key import key_magenta_sprite

BIOMES = [
    "foothills",
    "forests",
    "tropical",
    "deserts",
    "marshes",
    "plains",
    "lake",
    "river"
]

ENEMY_SPAWN_TOKENS = [
    # Rows 1 & 2: 8 Looter Camps across 8 Biomes
    {"id": f"looter_camp_{b}", "num_id": f"looter_camp_{i+1:02d}", "name": f"Looter Camp ({b.capitalize()})", "category": "looters", "biome": b, "file": f"looter_camp_{b}.png"}
    for i, b in enumerate(BIOMES)
] + [
    # Rows 3 & 4: 8 Poacher Camps across 8 Biomes
    {"id": f"poacher_camp_{b}", "num_id": f"poacher_camp_{i+1:02d}", "name": f"Poacher Camp ({b.capitalize()})", "category": "poachers", "biome": b, "file": f"poacher_camp_{b}.png"}
    for i, b in enumerate(BIOMES)
]

def slice_enemy_tokens(
    src_path=None,
    base_out="client/public/images/tokens/enemy_camps"
):
    if src_path is None:
        if os.path.exists("assets/tokens/enemy_camp_1.jpg"):
            src_path = "assets/tokens/enemy_camp_1.jpg"
        elif os.path.exists("assets/tokens/enemy-spawns.jpg"):
            src_path = "assets/tokens/enemy-spawns.jpg"
        else:
            src_path = "assets/tokens/enemy_camp_1.jpg"

    if not os.path.exists(src_path):
        print(f"Error: Source image not found at {src_path}")
        return False

    looter_dir = os.path.join(base_out, "looters")
    poacher_dir = os.path.join(base_out, "poachers")
    os.makedirs(looter_dir, exist_ok=True)
    os.makedirs(poacher_dir, exist_ok=True)

    img = Image.open(src_path).convert("RGB")
    w, h = img.size
    cell_w = w // 4
    cell_h = h // 4

    print(f"Loaded {src_path} ({w}x{h}). Slicing 16 biome tokens with core_chroma_key...")

    for idx, meta in enumerate(ENEMY_SPAWN_TOKENS):
        r_idx = idx // 4
        c_idx = idx % 4

        x1 = c_idx * cell_w
        y1 = r_idx * cell_h
        cell_img = img.crop((x1, y1, x1 + cell_w, y1 + cell_h))

        final_img = key_magenta_sprite(cell_img, t_low=15.0, t_high=140.0, crop_bbox=True)

        target_dir = looter_dir if meta["category"] == "looters" else poacher_dir
        final_img.save(os.path.join(target_dir, meta["file"]), "PNG")

        # Global category defaults
        if meta["biome"] == "plains":
            target_dir = looter_dir if meta["category"] == "looters" else poacher_dir
            final_img.save(os.path.join(target_dir, f"camp_{meta['category']}_default.png"), "PNG")

        print(f"[{idx+1}/16] Saved {meta['name']} -> {meta['file']} & {meta['num_id']}.png ({final_img.size})")

    print(f"\nSuccessfully sliced and keyed all 16 biome outlaw tokens into {out_dirs}!")
    return True

if __name__ == "__main__":
    slice_enemy_tokens()
