"""
slice_damage_type_tokens_advanced.py
Extracts the 13 canonical D&D damage type icons from assets/damage-types.jpg (2048x2048 4x4 grid):
- Row 0: Bludgeoning, Piercing, Slashing, Force
- Row 1: Fire, Cold, Lightning, Thunder
- Row 2: Acid, Poison, Necrotic, Radiant
- Row 3: Psychic (Col 0), discarding cells (3,1), (3,2), (3,3) as filler.

Uses core_chroma_key for mathematical de-spill, luminance matching, and anti-aliasing.
Outputs to:
- client/public/images/icons/damage_types/
"""

import os
import sys
from PIL import Image

# Ensure imageprompts/magenta-removal is on sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from core_chroma_key import key_magenta_sprite

DAMAGE_TYPES = [
    # Row 0: Physical & Kinetic
    {"id": "bludgeoning", "name": "Bludgeoning", "row": 0, "col": 0, "file": "bludgeoning.png"},
    {"id": "piercing", "name": "Piercing", "row": 0, "col": 1, "file": "piercing.png"},
    {"id": "slashing", "name": "Slashing", "row": 0, "col": 2, "file": "slashing.png"},
    {"id": "force", "name": "Force", "row": 0, "col": 3, "file": "force.png"},

    # Row 1: Primordial Elements
    {"id": "fire", "name": "Fire", "row": 1, "col": 0, "file": "fire.png"},
    {"id": "cold", "name": "Cold", "row": 1, "col": 1, "file": "cold.png"},
    {"id": "lightning", "name": "Lightning", "row": 1, "col": 2, "file": "lightning.png"},
    {"id": "thunder", "name": "Thunder", "row": 1, "col": 3, "file": "thunder.png"},

    # Row 2: Alchemy, Toxins & Moral Planes
    {"id": "acid", "name": "Acid", "row": 2, "col": 0, "file": "acid.png"},
    {"id": "poison", "name": "Poison", "row": 2, "col": 1, "file": "poison.png"},
    {"id": "necrotic", "name": "Necrotic", "row": 2, "col": 2, "file": "necrotic.png"},
    {"id": "radiant", "name": "Radiant", "row": 2, "col": 3, "file": "radiant.png"},

    # Row 3: Esoteric & Mental
    {"id": "psychic", "name": "Psychic", "row": 3, "col": 0, "file": "psychic.png"},
]

def slice_damage_type_tokens(
    src_path="assets/damage-types.jpg",
    out_dir="client/public/images/icons/damage_types"
):
    if not os.path.exists(src_path):
        print(f"Error: Source image not found at {src_path}")
        return False

    os.makedirs(out_dir, exist_ok=True)

    img = Image.open(src_path).convert("RGB")
    w, h = img.size
    cell_w = w / 4.0
    cell_h = h / 4.0

    print(f"Loaded {src_path} ({w}x{h}). Slicing 13 canonical damage type icons...")

    for idx, meta in enumerate(DAMAGE_TYPES):
        r_idx = meta["row"]
        c_idx = meta["col"]

        x1 = int(round(c_idx * cell_w))
        y1 = int(round(r_idx * cell_h))
        x2 = int(round((c_idx + 1) * cell_w))
        y2 = int(round((r_idx + 1) * cell_h))

        cell_img = img.crop((x1, y1, x2, y2))

        # Apply canonical chroma-key with mathematical de-spill & anti-aliased linear ramp
        # include_interior_voids=False ensures internal purple/magenta effects (like Psychic) are preserved
        final_img = key_magenta_sprite(
            cell_img,
            t_low=15.0,
            t_high=140.0,
            crop_bbox=True,
            border_pad=6,
            include_interior_voids=False
        )

        out_path = os.path.join(out_dir, meta["file"])
        final_img.save(out_path, "PNG")

        print(f"[{idx+1}/13] Sliced {meta['name']} -> {meta['file']} ({final_img.size})")

    print(f"\nSuccessfully sliced and keyed all 13 canonical damage type icons into '{out_dir}'!")
    return True

if __name__ == "__main__":
    slice_damage_type_tokens()
