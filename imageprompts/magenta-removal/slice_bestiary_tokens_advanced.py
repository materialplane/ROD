"""
slice_bestiary_tokens_advanced.py
Canonical token slicing and chroma-keying template for ROD sheets.
Slices all 7 4x4 sheets (112 tokens total across 28 adversary types) from assets/bestiary/:
  - Sheet 1: Angry Farmer, Bitter Woodcutter, Desperate Miner, Rebellious Serf
  - Sheet 2: Starving Fisherman, Grim Gravedigger, Hostile Poacher, Frenzied Scavenger
  - Sheet 3: Wild Hermit, Drunken Drifter, Woodland Bandit, Mountain Bandit
  - Sheet 4: Swamp Bandit, Corrupt Guard, Noble Outcast, Tribal Warrior
  - Sheet 5: Cultist, Kobold, Merfolk, Giant Crab
  - Sheet 6: Mastiff, Jackal, Hyena, Giant Rat
  - Sheet 7: Giant Weasel, Flying Snake, Poisonous Snake, Goblin

Uses core_chroma_key for mathematical bleed detection, luminance-preserving de-spill, and anti-aliasing.
Outputs to: client/public/images/tokens/avatars/bestiary/
"""

import os
import sys
from PIL import Image

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.append(SCRIPT_DIR)

from core_chroma_key import key_magenta_sprite

SHEET_CONFIGS = [
    {
        "file": "bestiary_sheet_1_looters_part1.png",
        "rows": ["angry_farmer", "bitter_woodcutter", "desperate_miner", "rebellious_serf"]
    },
    {
        "file": "bestiary_sheet_2_looters_part2.png",
        "rows": ["starving_fisherman", "grim_gravedigger", "hostile_poacher", "frenzied_scavenger"]
    },
    {
        "file": "bestiary_sheet_3_hermits_bandits.png",
        "rows": ["wild_hermit", "drunken_drifter", "woodland_bandit", "mountain_bandit"]
    },
    {
        "file": "bestiary_sheet_4_mire_deserters.png",
        "rows": ["swamp_bandit", "corrupt_guard", "noble_outcast", "tribal_warrior"]
    },
    {
        "file": "bestiary_sheet_5_cults_warrens_shores.png",
        "rows": ["cultist", "kobold", "merfolk", "giant_crab"]
    },
    {
        "file": "bestiary_sheet_6_canines_vermin.png",
        "rows": ["mastiff", "jackal", "hyena", "giant_rat"]
    },
    {
        "file": "bestiary_sheet_7_predators_goblins.png",
        "rows": ["giant_weasel", "flying_snake", "poisonous_snake", "goblin"]
    }
]

def slice_bestiary_tokens(
    src_dir="assets/bestiary",
    out_dir="client/public/images/tokens/avatars/bestiary"
):
    os.makedirs(out_dir, exist_ok=True)
    total_saved = 0

    print("================================================================================")
    print("SLICING & CHROMA-KEYING ADVERSARY BESTIARY TOKENS (112 TOKENS)")
    print("================================================================================")

    for sheet_idx, sheet in enumerate(SHEET_CONFIGS, 1):
        sheet_path = os.path.join(src_dir, sheet["file"])
        if not os.path.exists(sheet_path):
            print(f"[!] Sheet not found: {sheet_path}, skipping...")
            continue

        img = Image.open(sheet_path).convert("RGB")
        w, h = img.size
        cell_w = w // 4
        cell_h = h // 4

        print(f"\nProcessing Sheet {sheet_idx}/7: {sheet['file']} ({w}x{h}, cells {cell_w}x{cell_h})")

        for r_idx, creature_id in enumerate(sheet["rows"]):
            for c_idx in range(4):
                x1 = c_idx * cell_w
                y1 = r_idx * cell_h
                cell_img = img.crop((x1, y1, x1 + cell_w, y1 + cell_h))

                # Canonical chroma key with dual-threshold alpha ramp and luminance-preserving despill
                keyed_token = key_magenta_sprite(
                    cell_img,
                    t_low=15.0,
                    t_high=140.0,
                    crop_bbox=True,
                    border_pad=2
                )

                # Dedicated creature subfolder
                creature_dir = os.path.join(out_dir, creature_id)
                os.makedirs(creature_dir, exist_ok=True)

                # Save numbered variation (01 - 04)
                var_filename = f"{creature_id}_{c_idx+1:02d}.png"
                var_path = os.path.join(creature_dir, var_filename)
                keyed_token.save(var_path, "PNG")
                total_saved += 1

                # Also save primary creature alias for col 0
                if c_idx == 0:
                    primary_path = os.path.join(creature_dir, f"{creature_id}.png")
                    keyed_token.save(primary_path, "PNG")

                print(f"  -> [{creature_id}] Sliced var {c_idx+1}/4 ({keyed_token.size[0]}x{keyed_token.size[1]}px) -> {var_filename}")

    print("\n================================================================================")
    print(f"SUCCESS: Sliced and keyed {total_saved} tokens into {out_dir}!")
    print("================================================================================")
    return total_saved

if __name__ == "__main__":
    slice_bestiary_tokens()
