"""
slice_banner_tokens_advanced.py
Extracts player company banners and realm heraldry banners:
- assets/tokens/company-banners.jpg   -> client/public/images/tokens/banners/company/ (16 banners)
- assets/tokens/heraldry_banners.jpg  -> client/public/images/tokens/banners/{human, dwarven, elven, orc}/ (4x4 banners)

Uses core_chroma_key for mathematical de-spill, luminance matching, and anti-aliasing.
"""

import os
from PIL import Image
from core_chroma_key import key_magenta_sprite

def slice_company_banners(
    src_path="assets/tokens/company-banners.jpg",
    out_dir="client/public/images/tokens/banners/company"
):
    if not os.path.exists(src_path):
        print(f"Skipping {src_path} (not found)")
        return

    os.makedirs(out_dir, exist_ok=True)
    img = Image.open(src_path).convert("RGB")
    w, h = img.size
    cell_w = w // 4
    cell_h = h // 4

    print(f"\nProcessing company banners from {src_path}...")

    for idx in range(16):
        r_idx = idx // 4
        c_idx = idx % 4

        x1 = c_idx * cell_w
        y1 = r_idx * cell_h
        cell_img = img.crop((x1, y1, x1 + cell_w, y1 + cell_h))

        final_img = key_magenta_sprite(cell_img, t_low=15.0, t_high=140.0, crop_bbox=True)

        filename = f"company_banner_{idx+1:02d}.png"
        out_path = os.path.join(out_dir, filename)
        final_img.save(out_path, "PNG")

        print(f"  [{idx+1}/16] Saved {filename} ({final_img.size})")

def slice_heraldry_banners(
    src_path="assets/tokens/heraldry_banners.jpg",
    out_base="client/public/images/tokens/banners"
):
    if not os.path.exists(src_path):
        print(f"Skipping {src_path} (not found)")
        return

    races = [
        ("human", "human_banner"),
        ("dwarven", "dwarven_banner"),
        ("elven", "elven_banner"),
        ("orc", "orc_banner")
    ]

    img = Image.open(src_path).convert("RGB")
    w, h = img.size
    cell_w = w // 4
    cell_h = h // 4

    print(f"\nProcessing realm heraldry banners from {src_path}...")

    for r_idx, (race_dir, prefix) in enumerate(races):
        target_dir = os.path.join(out_base, race_dir)
        os.makedirs(target_dir, exist_ok=True)

        for c_idx in range(4):
            x1 = c_idx * cell_w
            y1 = r_idx * cell_h
            cell_img = img.crop((x1, y1, x1 + cell_w, y1 + cell_h))

            final_img = key_magenta_sprite(cell_img, t_low=15.0, t_high=140.0, crop_bbox=True)

            idx_num = c_idx + 1
            filename = f"{prefix}_{idx_num:02d}.png"
            out_path = os.path.join(target_dir, filename)
            final_img.save(out_path, "PNG")

            print(f"  [{r_idx*4 + idx_num}/16] Saved {race_dir}/{filename} ({final_img.size})")

def slice_all_banners():
    slice_company_banners()
    slice_heraldry_banners()
    print("\nBanner tokens re-slicing complete!")

if __name__ == "__main__":
    slice_all_banners()
