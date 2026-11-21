"""
core_chroma_key.py
The canonical mathematical chroma-key & de-spill engine for ROD.
Preserves dark chiaroscuro shadows, metallic reflections, and edge anti-aliasing
without pink halos or jagged edges.

Algorithm:
1. Boundary Isolation: Connected flood-fill from perimeter borders isolates exterior background.
2. Outer Transition Isolation: Morphological dilation into the sprite perimeter isolates fringe pixels.
3. Mathematical Bleed: Calculates excess magenta bleed min(R - G, B - G).
4. Anti-Aliasing Linear Ramp: Smooth dual-threshold ramp (t_low to t_high).
5. Confined Edge Smoothing: Subtle Gaussian smoothing confined strictly to the transition zone
   (ensures exterior background remains 100% transparent with zero blur leakage).
6. Luminance-Preserving De-Spill: Subtracts bleed excess from R & B and neutralizes magenta HSV hue,
   preserving luminance value to match adjacent metal frame or shadow.
"""

import colorsys
import cv2
import numpy as np
from PIL import Image

def key_magenta_sprite(
    img_or_arr,
    t_low=15.0,
    t_high=140.0,
    crop_bbox=True,
    border_pad=0,
    include_interior_voids=False
):
    if isinstance(img_or_arr, Image.Image):
        arr = np.array(img_or_arr.convert("RGB"), dtype=np.float32)
    else:
        arr = img_or_arr.astype(np.float32)

    ch, cw = arr.shape[:2]
    r = arr[:, :, 0]
    g = arr[:, :, 1]
    b = arr[:, :, 2]

    # 1. Identify magenta pixels (RGB threshold and hue isolation)
    is_mag = (r > 130) & (b > 130) & (g < 140) & ((r - g) > 25) & ((b - g) > 25)

    if include_interior_voids:
        # Include both outer perimeter and enclosed interior apertures (e.g. sword basket hilts, rings)
        bg_mask = is_mag.astype(np.uint8)
    else:
        # Connected-component flood fill from perimeter borders only
        flood_mask = np.zeros((ch + 2, cw + 2), dtype=np.uint8)
        flood_mask[1:-1, 1:-1] = (~is_mag).astype(np.uint8)

        seed_points = []
        for x in range(cw):
            if is_mag[0, x]: seed_points.append((x, 0))
            if is_mag[ch - 1, x]: seed_points.append((x, ch - 1))
        for y in range(ch):
            if is_mag[y, 0]: seed_points.append((0, y))
            if is_mag[y, cw - 1]: seed_points.append((cw - 1, y))

        for sx, sy in seed_points:
            if flood_mask[sy + 1, sx + 1] == 0:
                cv2.floodFill(flood_mask, None, (sx + 1, sy + 1), 2)

        bg_mask = (flood_mask[1:-1, 1:-1] == 2).astype(np.uint8)

        # Clean stray isolated corners
        corner_mag = is_mag & ((np.arange(cw)[None, :] < 50) | (np.arange(cw)[None, :] > cw - 50)) & \
                              ((np.arange(ch)[:, None] < 50) | (np.arange(ch)[:, None] > ch - 50))
        bg_mask |= corner_mag.astype(np.uint8)

    # 2. Outer rim transition zone: dilate bg_mask slightly into sprite edge
    kernel_rim = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    rim_transition = cv2.dilate(bg_mask, kernel_rim, iterations=2) & (~bg_mask)

    # 3. Mathematical magenta bleed: min(r - g, b - g)
    magenta_bleed = np.maximum(0.0, np.minimum(r - g, b - g))

    # 4. Anti-aliasing alpha ramp
    alpha = np.full((ch, cw), 255.0, dtype=np.float32)
    alpha[bg_mask == 1] = 0.0

    trans_pixels = (rim_transition == 1)
    ramp_alpha = np.where(
        magenta_bleed[trans_pixels] >= t_high,
        0.0,
        np.where(
            magenta_bleed[trans_pixels] <= t_low,
            255.0,
            255.0 * (t_high - magenta_bleed[trans_pixels]) / (t_high - t_low)
        )
    )
    alpha[trans_pixels] = ramp_alpha

    # 5. Confined Gaussian smoothing on alpha edge (bg_mask strictly 0)
    blurred_alpha = cv2.GaussianBlur(alpha, (3, 3), 0.5)
    final_alpha = np.where(bg_mask == 1, 0.0, np.where(trans_pixels, blurred_alpha, alpha))
    final_alpha = np.where(final_alpha < 8.0, 0.0, final_alpha).clip(0, 255).astype(np.uint8)

    # 6. De-spill & color correction: subtract bleed excess across all visible pixels
    new_r = r.copy()
    new_g = g.copy()
    new_b = b.copy()

    despill_mask = (final_alpha > 0) & (magenta_bleed > 5.0)
    new_r[despill_mask] = np.clip(new_r[despill_mask] - magenta_bleed[despill_mask], 0, 255)
    new_b[despill_mask] = np.clip(new_b[despill_mask] - magenta_bleed[despill_mask], 0, 255)

    # Secondary HSV check to neutralize remaining magenta hue saturation
    hsv_check_zone = (trans_pixels) & (final_alpha > 0)
    hsv_indices = np.argwhere(hsv_check_zone)
    for y, x in hsv_indices:
        pr, pg, pb = new_r[y, x] / 255.0, new_g[y, x] / 255.0, new_b[y, x] / 255.0
        h, s, v = colorsys.rgb_to_hsv(pr, pg, pb)
        if 0.75 < h < 0.95 and s > 0.08:
            nr, ng, nb = colorsys.hsv_to_rgb(h, 0.0, v)
            new_r[y, x] = nr * 255.0
            new_g[y, x] = ng * 255.0
            new_b[y, x] = nb * 255.0

    out_arr = np.dstack((new_r.astype(np.uint8), new_g.astype(np.uint8), new_b.astype(np.uint8), final_alpha))
    out_img = Image.fromarray(out_arr, "RGBA")

    if crop_bbox:
        bbox = out_img.getbbox()
        if bbox:
            if border_pad > 0:
                x0 = max(0, bbox[0] - border_pad)
                y0 = max(0, bbox[1] - border_pad)
                x1 = min(cw, bbox[2] + border_pad)
                y1 = min(ch, bbox[3] + border_pad)
                out_img = out_img.crop((x0, y0, x1, y1))
            else:
                out_img = out_img.crop(bbox)

    return out_img
