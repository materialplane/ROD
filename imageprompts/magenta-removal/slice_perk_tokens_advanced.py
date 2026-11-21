"""
slice_perk_tokens_advanced.py
Extracts the perk medallion icons from assets/perk-progression/perks_sheet_1.png through perks_sheet_8.png:
- Sheets 1 to 7: 16 perks each (Perks 1 to 112).
- Sheet 8: 6 Level 20 Capstone perks (Perks 113 to 118) + 4 Discrete Level 1 Fighting Styles (Perks 119 to 122), discarding 6 filler cells.

Uses core_chroma_key for mathematical de-spill, luminance matching, and anti-aliasing.
Outputs to:
- client/public/images/icons/perks/{perk_id}.png
"""

import os
import sys
from PIL import Image

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from core_chroma_key import key_magenta_sprite

SHEET_CELL_IDS = {
    1: [
        "f_fight_style", "f_second_wind", "b_rage", "r_sneak_1",
        "p_lay_on_hands", "m_martial_arts", "w_arcane_recovery", "f_action_surge",
        "w_arcane_surge", "b_reckless_attack", "b_danger_sense", "r_cunning_action",
        "p_divine_smite", "m_ki_focus", "rng_deft_explorer", "r_steady_aim"
    ],
    2: [
        "r_sneak_2", "b_primal_knowledge", "m_deflect_attacks", "p_divine_sense",
        "s_font_of_magic", "gen_asi_4", "feat_gwm", "feat_sharpshooter",
        "feat_war_caster", "feat_sentinel", "f_extra_attack_1", "w_arcane_burst",
        "b_fast_movement", "r_uncanny_dodge", "r_sneak_3", "m_stunning_strike"
    ],
    3: [
        "brd_font_inspiration", "f_bonus_asi_6", "w_spell_piercing", "b_rage_dmg_3",
        "r_expertise_6", "p_aura_protection", "rng_roving", "m_empowered_strikes",
        "r_evasion", "r_sneak_4", "b_feral_instinct", "s_sorcery_incarnate",
        "gen_asi_8", "feat_ham", "feat_skulker", "feat_spell_sniper"
    ],
    4: [
        "f_indomitable_1", "w_arcane_siphon", "b_brutal_strike_1", "r_sneak_5",
        "m_acrobatic_mov", "p_abjure_foes", "f_tactical_master", "b_primal_know_2",
        "r_bonus_asi_10", "p_aura_courage", "m_heightened_focus", "brd_magical_secrets_1",
        "f_extra_attack_2", "w_arcane_arcing", "r_reliable_talent", "r_sneak_6"
    ],
    5: [
        "b_relentless_rage", "p_radiant_strikes", "rng_tireless", "gen_asi_12",
        "feat_alert", "feat_tough", "feat_mage_slayer", "feat_resilient",
        "f_indomitable_2", "w_arcane_singularity", "b_brutal_strike_2", "r_sneak_7",
        "m_deflect_energy", "rng_vanish", "f_bonus_asi_14", "w_arcane_resilience"
    ],
    6: [
        "b_rage_dmg_4", "r_blindsense", "p_restoring_touch", "m_diamond_body",
        "w_elemental_mastery", "b_persistent_rage", "r_slippery_mind", "r_sneak_8",
        "m_timeless_body", "rng_feral_senses", "gen_asi_16", "feat_tough_16",
        "feat_mobile", "feat_elemental_adept", "f_action_surge_2", "w_overchannel"
    ],
    7: [
        "b_brutal_strike_3", "r_sneak_9", "m_superior_focus", "p_aura_expansion",
        "f_tactical_adv", "b_indomitable_might", "r_elusive", "m_empty_body",
        "w_spell_mastery", "boon_combat", "boon_unfettered", "boon_fortitude",
        "boon_recall", "f_extra_attack_3", "w_archmage_transcendence", "b_primal_champion"
    ],
    8: [
        "r_stroke_of_luck", "p_divine_champion", "m_body_and_mind", "w_signature_spells",
        "clr_greater_divine_interv", "brd_superior_insp",
        "f_style_archery", "f_style_defense", "f_style_dueling", "f_style_great_weapon"
    ]
}

def slice_all_perk_sheets(
    src_dirs=["assets", "assets/perk-progression"],
    out_dir="client/public/images/icons/perks"
):
    os.makedirs(out_dir, exist_ok=True)
    total_sliced = 0

    for sheet_idx in range(1, 9):
        sheet_filename = f"perks_sheet_{sheet_idx}.png"
        sheet_path = None
        for d in src_dirs:
            p = os.path.join(d, sheet_filename)
            if os.path.exists(p):
                sheet_path = p
                break

        if not sheet_path:
            print(f"Warning: Sheet {sheet_filename} not found in {src_dirs}! Skipping...")
            continue

        img = Image.open(sheet_path).convert("RGB")
        w, h = img.size
        cell_w = w / 4.0
        cell_h = h / 4.0
        print(f"\n--- Slicing Sheet {sheet_idx}/8: {sheet_path} ({w}x{h}) ---")

        cell_ids = SHEET_CELL_IDS.get(sheet_idx, [])
        for cell_idx in range(16):
            if cell_idx >= len(cell_ids):
                print(f"  [Cell {cell_idx+1}/16] (Empty filler cell on Sheet {sheet_idx}) -> Skipped")
                continue

            perk_id = cell_ids[cell_idx]
            r_idx = cell_idx // 4
            c_idx = cell_idx % 4

            x1 = int(round(c_idx * cell_w))
            y1 = int(round(r_idx * cell_h))
            x2 = int(round((c_idx + 1) * cell_w))
            y2 = int(round((r_idx + 1) * cell_h))

            cell_img = img.crop((x1, y1, x2, y2))

            final_img = key_magenta_sprite(
                cell_img,
                t_low=15.0,
                t_high=140.0,
                crop_bbox=True,
                border_pad=6,
                include_interior_voids=False
            )

            out_filename = f"{perk_id}.png"
            out_path = os.path.join(out_dir, out_filename)
            final_img.save(out_path, "PNG")
            total_sliced += 1

            print(f"  + Sliced {perk_id} -> {out_filename} ({final_img.size})")

    print(f"\n============================================================")
    print(f"SUCCESS! Sliced and keyed {total_sliced} perk medallions into '{out_dir}'!")
    print(f"============================================================\n")
    return True

if __name__ == "__main__":
    slice_all_perk_sheets()
