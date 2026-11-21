"""
slice_avatar_tokens_advanced.py
Extracts circular avatar tokens from:
- 8 racial sheets in assets/face_tokens_*.png (128 tokens)
- 2 unarmored sheets in assets/face_tokens_unarmored_*.png (32 tokens)
- assets/tokens/player-avatars.jpg (16 tokens)
Outputs to client/public/images/tokens/avatars/

Uses core_chroma_key for mathematical de-spill, luminance matching, and anti-aliasing.
"""

import os
from PIL import Image
from core_chroma_key import key_magenta_sprite

AVATAR_SHEETS = [
    {"src": "assets/face_tokens_human_male.png", "prefix": "avatar_human_m", "sub": "human"},
    {"src": "assets/face_tokens_human_female.png", "prefix": "avatar_human_f", "sub": "human"},
    {"src": "assets/face_tokens_orc_male.png", "prefix": "avatar_orc_m", "sub": "orc"},
    {"src": "assets/face_tokens_orc_female.png", "prefix": "avatar_orc_f", "sub": "orc"},
    {"src": "assets/face_tokens_dwarf_male.png", "prefix": "avatar_dwarven_m", "sub": "dwarf"},
    {"src": "assets/face_tokens_dwarf_female.png", "prefix": "avatar_dwarven_f", "sub": "dwarf"},
    {"src": "assets/face_tokens_elf_male.png", "prefix": "avatar_elven_m", "sub": "elf"},
    {"src": "assets/face_tokens_elf_female.png", "prefix": "avatar_elven_f", "sub": "elf"},
    {"src": "assets/tokens/player-avatars.jpg", "prefix": "player_avatar", "sub": "player"},
]

UNARMORED_SHEETS = [
    {
        "src": "assets/face_tokens_unarmored_male.png",
        "rows": [
            {"sub": "human", "prefix": "avatar_human_m_unarmored"},
            {"sub": "dwarf", "prefix": "avatar_dwarven_m_unarmored"},
            {"sub": "elf", "prefix": "avatar_elven_m_unarmored"},
            {"sub": "orc", "prefix": "avatar_orc_m_unarmored"},
        ]
    },
    {
        "src": "assets/face_tokens_unarmored_female.png",
        "rows": [
            {"sub": "human", "prefix": "avatar_human_f_unarmored"},
            {"sub": "dwarf", "prefix": "avatar_dwarven_f_unarmored"},
            {"sub": "elf", "prefix": "avatar_elven_f_unarmored"},
            {"sub": "orc", "prefix": "avatar_orc_f_unarmored"},
        ]
    }
]

def slice_avatar_tokens(out_dir="client/public/images/tokens/avatars"):
    os.makedirs(out_dir, exist_ok=True)
    total_saved = 0

    # 1. Standard Racial Sheets
    for sheet in AVATAR_SHEETS:
        src_path = sheet["src"]
        if not os.path.exists(src_path):
            print(f"Skipping {src_path} (not found)")
            continue

        prefix = sheet["prefix"]
        img = Image.open(src_path).convert("RGB")
        w, h = img.size
        cell_w = w // 4
        cell_h = h // 4

        print(f"\nProcessing {prefix} avatars from {src_path} ({w}x{h})...")

        for idx in range(16):
            r_idx = idx // 4
            c_idx = idx % 4

            x1 = c_idx * cell_w
            y1 = r_idx * cell_h
            cell_img = img.crop((x1, y1, x1 + cell_w, y1 + cell_h))

            final_img = key_magenta_sprite(cell_img, t_low=15.0, t_high=140.0, crop_bbox=True)

            filename = f"{prefix}_{idx+1:02d}.png"
            sub_dir = os.path.join(out_dir, sheet.get("sub", ""))
            os.makedirs(sub_dir, exist_ok=True)
            out_path = os.path.join(sub_dir, filename)
            final_img.save(out_path, "PNG")
            total_saved += 1

            print(f"  [{idx+1}/16] Saved {filename} ({final_img.size})")

    # 2. Multi-Racial Unarmored Sheets
    for sheet in UNARMORED_SHEETS:
        src_path = sheet["src"]
        if not os.path.exists(src_path):
            print(f"Skipping {src_path} (not found)")
            continue

        img = Image.open(src_path).convert("RGB")
        w, h = img.size
        cell_w = w // 4
        cell_h = h // 4

        print(f"\nProcessing Unarmored Sheet: {src_path} ({w}x{h})...")

        for r_idx in range(4):
            row_cfg = sheet["rows"][r_idx]
            sub_dir = os.path.join(out_dir, row_cfg["sub"])
            os.makedirs(sub_dir, exist_ok=True)
            prefix = row_cfg["prefix"]

            for c_idx in range(4):
                x1 = c_idx * cell_w
                y1 = r_idx * cell_h
                cell_img = img.crop((x1, y1, x1 + cell_w, y1 + cell_h))

                final_img = key_magenta_sprite(cell_img, t_low=15.0, t_high=140.0, crop_bbox=True)

                filename = f"{prefix}_{c_idx+1:02d}.png"
                out_path = os.path.join(sub_dir, filename)
                final_img.save(out_path, "PNG")
                total_saved += 1

                print(f"  [{prefix}] Saved {filename} ({final_img.size})")

    print(f"\nAvatar tokens slicing complete! Total saved: {total_saved}")

if __name__ == "__main__":
    slice_avatar_tokens()
