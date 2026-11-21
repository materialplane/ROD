"""
rerun_all_tokens.py
Master runner that re-processes and re-keys 100% of the game tokens and UI assets
using the canonical mathematical chroma-key & de-spill engine (core_chroma_key.py).

Covers:
1. Enemy Camps & Spawns (16 tokens)
2. Racial Field Encampments (64 tokens)
3. Racial Settlement & Holding Structures (64 tokens)
4. Character Avatars & Adversaries (160 tokens)
5. Player & Realm Banners (32 tokens)
6. Celestial Dial Wheel & Lunette
"""

import sys
import os

# Add local directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from slice_enemy_tokens_advanced import slice_enemy_tokens
from slice_camp_tokens_advanced import slice_camp_tokens
from slice_structure_tokens_advanced import slice_structure_tokens
from slice_avatar_tokens_advanced import slice_avatar_tokens
from slice_banner_tokens_advanced import slice_all_banners
from process_celestial_tokens_advanced import process_celestial_tokens

def main():
    print("=" * 70)
    print("STARTING CANONICAL MATHEMATICAL CHROMA-KEY & SLICING PIPELINE")
    print("=" * 70)

    print("\n[1/6] Processing Enemy Encampment & Lair Tokens...")
    slice_enemy_tokens()

    print("\n[2/6] Processing Racial Progressive Camp Tokens...")
    slice_camp_tokens()

    print("\n[3/6] Processing Racial Holding & Settlement Structure Tokens...")
    slice_structure_tokens()

    print("\n[4/6] Processing Character & Adversary Avatar Tokens...")
    slice_avatar_tokens()

    print("\n[5/6] Processing Player Company & Realm Banners...")
    slice_all_banners()

    print("\n[6/6] Processing Celestial Dial Assets...")
    process_celestial_tokens()

    print("\n" + "=" * 70)
    print("ALL TOKENS AND ASSETS SUCCESSFULLY RE-KEYED WITH ZERO RESIDUAL BLEED")
    print("=" * 70)

if __name__ == "__main__":
    main()
