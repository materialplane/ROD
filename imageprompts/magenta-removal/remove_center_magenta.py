"""
Targeted Center-Only Magenta Removal with Edge De-Spill & Fringe Trimming
Strictly clears the central magenta opening using flood-fill from (width/2, height/2),
dilates the cutout by 3-4px to eliminate edge bleed, and de-spills any residual pink
reflection on the inner metal rim.
"""

import sys
import os
import argparse
import numpy as np
import cv2
from PIL import Image

def remove_center_magenta(input_path, output_path=None, tolerance=60, trim_px=3):
    if not os.path.exists(input_path):
        print(f"Error: File not found -> {input_path}")
        return False

    if output_path is None:
        output_path = input_path

    print(f"Opening: {input_path}")
    img = Image.open(input_path).convert("RGB")
    arr = np.array(img)
    h, w = arr.shape[:2]

    # Center seed point
    cx, cy = w // 2, h // 2
    print(f"Sampling center seed at ({cx}, {cy}): RGB={arr[cy, cx]}")

    # Prepare flood mask (+2 size required by OpenCV)
    flood_mask = np.zeros((h + 2, w + 2), dtype=np.uint8)

    # Flood fill strictly from center with fixed range comparison
    img_copy = arr.copy()
    flags = 4 | (255 << 8) | cv2.FLOODFILL_MASK_ONLY | cv2.FLOODFILL_FIXED_RANGE
    cv2.floodFill(
        img_copy,
        flood_mask,
        (cx, cy),
        newVal=(0, 255, 0),
        loDiff=(tolerance, tolerance, tolerance),
        upDiff=(tolerance, tolerance, tolerance),
        flags=flags
    )

    # Extract central filled mask (1 where magenta center was filled)
    center_mask = (flood_mask[1:-1, 1:-1] == 255).astype(np.uint8)
    print(f"Base center region: {np.sum(center_mask)} pixels")

    # 1. Morphological dilation to expand cutout by trim_px and eat the pink bleed fringe
    kernel_size = trim_px * 2 + 1
    trim_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))
    dilated_center = cv2.dilate(center_mask, trim_kernel, iterations=1)
    print(f"Cutout trimmed outward by {trim_px}px to eliminate pink fringe.")

    # 2. Smooth 1px anti-aliasing on the final cutout edge
    blurred = cv2.GaussianBlur(dilated_center.astype(np.float32), (5, 5), 0.7)
    alpha = ((1.0 - blurred) * 255.0).clip(0, 255).astype(np.uint8)

    # 3. Aggressive Color De-spill on the inner rim of the frame
    # Identify the inner rim (next 8 pixels into the solid frame)
    rim_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13))
    inner_rim_zone = (cv2.dilate(dilated_center, rim_kernel, iterations=1) == 1) & (alpha > 0)

    r = arr[:, :, 0].copy()
    g = arr[:, :, 1].copy()
    b = arr[:, :, 2].copy()

    # Calculate magenta bleed in the inner rim
    diff_r = r.astype(int) - g.astype(int)
    diff_b = b.astype(int) - g.astype(int)
    bleed = np.maximum(0, np.minimum(diff_r, diff_b))

    # Where bleed > 5, subtract excess magenta light to restore true dark metal/shadow tone
    despill_mask = inner_rim_zone & (bleed > 5)
    despilled_count = int(np.sum(despill_mask))
    print(f"De-spilled {despilled_count} pixels along the inner metal rim to neutralize magenta reflection.")

    r[despill_mask] = np.clip(r[despill_mask] - bleed[despill_mask], 0, 255)
    b[despill_mask] = np.clip(b[despill_mask] - bleed[despill_mask], 0, 255)

    res_arr = np.dstack((r, g, b, alpha))
    res_img = Image.fromarray(res_arr, "RGBA")

    print(f"Saving frame to {output_path}...")
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    res_img.save(output_path, "PNG")

    opaque_pixels = int(np.sum(alpha == 255))
    transparent_pixels = int(np.sum(alpha == 0))
    print(f"Success: {opaque_pixels} opaque frame pixels (100% solid), {transparent_pixels} transparent center pixels.")
    return True

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Targeted center-only magenta removal with edge de-spill.")
    parser.add_argument("input", nargs="?", default="assets/map_border_frame_original.png", help="Input image")
    parser.add_argument("output", nargs="?", default="assets/map_border_frame.png", help="Output PNG")
    parser.add_argument("--tolerance", type=int, default=60, help="Flood fill tolerance")
    parser.add_argument("--trim", type=int, default=3, help="Edge trim pixels (default 3)")

    args = parser.parse_args()
    remove_center_magenta(args.input, args.output, tolerance=args.tolerance, trim_px=args.trim)
