"""
Mathematical Chroma-Key & Spill Suppression
Preserves dark chiaroscuro shadows, ambient occlusion, and metal rim highlights.
Calculates excess magenta bleed and restores true edge color.
"""

import sys
import os
import argparse
import numpy as np
from PIL import Image

def clean_magenta_mathematical(input_path, output_path=None, t_low=20.0, t_high=180.0):
    if not os.path.exists(input_path):
        print(f"Error: File not found -> {input_path}")
        return False

    if output_path is None:
        output_path = input_path

    print(f"Opening: {input_path}")
    img = Image.open(input_path).convert("RGB")
    arr = np.array(img, dtype=np.float32)
    r = arr[:, :, 0]
    g = arr[:, :, 1]
    b = arr[:, :, 2]

    print("Computing mathematical magenta bleed: min(R-G, B-G)...")
    magenta_bleed = np.maximum(0.0, np.minimum(r - g, b - g))

    # Dual-threshold smooth ramp:
    # bleed <= t_low  -> 100% opaque (preserves dark shadows and metal)
    # bleed >= t_high -> 100% transparent
    # in-between      -> smooth anti-aliased ramp
    print(f"Applying linear keying ramp (t_low={t_low}, t_high={t_high})...")
    alpha = np.where(
        magenta_bleed >= t_high,
        0.0,
        np.where(
            magenta_bleed <= t_low,
            255.0,
            255.0 * (t_high - magenta_bleed) / (t_high - t_low)
        )
    ).astype(np.uint8)

    # De-spill: Neutralize magenta color cast on edge transition pixels
    despill_mask = magenta_bleed > t_low
    new_r = np.where(despill_mask, np.clip(r - magenta_bleed, 0, 255), r).astype(np.uint8)
    new_g = g.astype(np.uint8)
    new_b = np.where(despill_mask, np.clip(b - magenta_bleed, 0, 255), b).astype(np.uint8)

    result_arr = np.dstack((new_r, new_g, new_b, alpha))
    result_img = Image.fromarray(result_arr, "RGBA")

    print(f"Saving cleaned frame to {output_path}...")
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    result_img.save(output_path, "PNG")

    opaque = int(np.sum(alpha == 255))
    semi = int(np.sum((alpha > 0) & (alpha < 255)))
    transparent = int(np.sum(alpha == 0))
    print(f"Keying complete: {opaque} opaque, {semi} edge pixels, {transparent} transparent pixels.")
    return True

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Mathematical chroma key with shadow preservation.")
    parser.add_argument("input", nargs="?", default="assets/map_border_frame_original.png", help="Input image")
    parser.add_argument("output", nargs="?", default="assets/map_border_frame.png", help="Output PNG")
    parser.add_argument("--low", type=float, default=20.0, help="Low bleed threshold (default 20.0)")
    parser.add_argument("--high", type=float, default=180.0, help="High bleed threshold (default 180.0)")

    args = parser.parse_args()
    clean_magenta_mathematical(args.input, args.output, t_low=args.low, t_high=args.high)
