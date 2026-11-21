"""
process_celestial_tokens_advanced.py
Extracts and keys out the #FF00FF magenta background from:
1. assets/tokens/lunette.jpg -> client/public/images/tokens/celestial/celestial_lunette.png
2. assets/tokens/lunar-cycle.jpg -> client/public/images/tokens/celestial/celestial_wheel.png (and v3)
Uses core_chroma_key for mathematical de-spill, luminance matching, anti-aliasing, and 1:1 squaring.
"""

import os
from PIL import Image
from core_chroma_key import key_magenta_sprite

def process_celestial_tokens():
    out_dir = "client/public/images/tokens/celestial"
    os.makedirs(out_dir, exist_ok=True)

    # 1. Lunette
    lunette_src = "assets/tokens/lunette.jpg"
    if os.path.exists(lunette_src):
        print(f"Processing {lunette_src}...")
        img = Image.open(lunette_src).convert("RGB")
        out_img = key_magenta_sprite(img, t_low=15.0, t_high=140.0, crop_bbox=True)
        lunette_out = os.path.join(out_dir, "celestial_lunette.png")
        out_img.save(lunette_out, "PNG")
        print(f"Saved {lunette_out} ({out_img.size})")

    # 2. Celestial Wheel (lunar-cycle.jpg)
    wheel_src = "assets/tokens/lunar-cycle.jpg"
    if os.path.exists(wheel_src):
        print(f"Processing {wheel_src}...")
        img = Image.open(wheel_src).convert("RGB")
        out_img = key_magenta_sprite(img, t_low=15.0, t_high=140.0, crop_bbox=True)

        # Center on 1:1 square canvas for wobble-free rotation
        cw, ch = out_img.size
        dim = max(cw, ch)
        if dim % 2 != 0:
            dim += 1
        sq = Image.new("RGBA", (dim, dim), (0, 0, 0, 0))
        paste_x = (dim - cw) // 2
        paste_y = (dim - ch) // 2
        sq.paste(out_img, (paste_x, paste_y), out_img)

        wheel_out = os.path.join(out_dir, "celestial_wheel.png")
        sq.save(wheel_out, "PNG")
        wheel_v3_out = os.path.join(out_dir, "celestial_wheel_v3.png")
        sq.save(wheel_v3_out, "PNG")
        print(f"Saved {wheel_out} and v3 ({sq.size})")

    print("\nCelestial tokens re-slicing complete!")

if __name__ == "__main__":
    process_celestial_tokens()
