"""
slice_alignment_tokens_advanced.py
Extracts 9 moral alignment heraldic shield crests from assets/tokens/alignments.jpg (2048x2048 3x3 grid):
- Row 1: Lawful Good, Neutral Good, Chaotic Good
- Row 2: Lawful Neutral, True Neutral, Chaotic Neutral
- Row 3: Lawful Evil, Neutral Evil, Chaotic Evil

Uses core_chroma_key for mathematical de-spill, luminance matching, and anti-aliasing.
Outputs to:
- client/public/images/tokens/alignments/
"""

import os
import sys
from PIL import Image

# Ensure imageprompts/magenta-removal is on sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from core_chroma_key import key_magenta_sprite

ALIGNMENTS = [
    # Row 1: Good
    {"id": "lawful_good", "name": "Lawful Good", "row": 0, "col": 0, "file": "lawful_good.png"},
    {"id": "neutral_good", "name": "Neutral Good", "row": 0, "col": 1, "file": "neutral_good.png"},
    {"id": "chaotic_good", "name": "Chaotic Good", "row": 0, "col": 2, "file": "chaotic_good.png"},

    # Row 2: Neutral
    {"id": "lawful_neutral", "name": "Lawful Neutral", "row": 1, "col": 0, "file": "lawful_neutral.png"},
    {"id": "true_neutral", "name": "True Neutral", "row": 1, "col": 1, "file": "true_neutral.png"},
    {"id": "chaotic_neutral", "name": "Chaotic Neutral", "row": 1, "col": 2, "file": "chaotic_neutral.png"},

    # Row 3: Evil
    {"id": "lawful_evil", "name": "Lawful Evil", "row": 2, "col": 0, "file": "lawful_evil.png"},
    {"id": "neutral_evil", "name": "Neutral Evil", "row": 2, "col": 1, "file": "neutral_evil.png"},
    {"id": "chaotic_evil", "name": "Chaotic Evil", "row": 2, "col": 2, "file": "chaotic_evil.png"},
]

def slice_alignment_tokens(
    src_path="assets/tokens/alignments.jpg",
    out_dir="client/public/images/tokens/alignments"
):
    if not os.path.exists(src_path):
        print(f"Error: Source image not found at {src_path}")
        return False

    os.makedirs(out_dir, exist_ok=True)

    img = Image.open(src_path).convert("RGB")
    w, h = img.size
    cell_w = w / 3.0
    cell_h = h / 3.0

    print(f"Loaded {src_path} ({w}x{h}). Slicing 9 moral alignment crests with core_chroma_key...")

    for idx, meta in enumerate(ALIGNMENTS):
        r_idx = meta["row"]
        c_idx = meta["col"]

        x1 = int(round(c_idx * cell_w))
        y1 = int(round(r_idx * cell_h))
        x2 = int(round((c_idx + 1) * cell_w))
        y2 = int(round((r_idx + 1) * cell_h))

        cell_img = img.crop((x1, y1, x2, y2))

        # Apply canonical chroma-key with mathematical de-spill & anti-aliased linear ramp
        final_img = key_magenta_sprite(cell_img, t_low=15.0, t_high=140.0, crop_bbox=True, border_pad=6)

        out_path = os.path.join(out_dir, meta["file"])
        final_img.save(out_path, "PNG")

        print(f"[{idx+1}/9] Saved {meta['name']} -> {meta['file']} ({final_img.size})")

    print(f"\nSuccessfully sliced and keyed all 9 alignment crests into '{out_dir}'!")
    return True

if __name__ == "__main__":
    slice_alignment_tokens()
