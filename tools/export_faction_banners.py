"""Chroma-key and slice the 4x4 Runeterra Faction Banner sheet into crisp transparent WebP assets."""

from __future__ import annotations

import json
from pathlib import Path
import cv2
import numpy as np
from PIL import Image

ROOT = Path(r"C:\Users\drew0\Documents\ROD")
SRC_SHEET = ROOT / "assets" / "tokens" / "banners" / "batch_sheets" / "rod_faction_banners_sheet_a.jpg"
PNG_ARCHIVE_DIR = ROOT / "assets" / "tokens" / "banners" / "slices"
CLIENT_BANNERS_DIR = ROOT / "client" / "assets" / "tokens" / "banners"

BANNER_SLOTS = [
    (0, 0, "banner_crown_loyalists", "Highcrown Loyalists"),
    (0, 1, "banner_free_towns", "Free Towns & Guilds"),
    (0, 2, "banner_northern_clans", "Northern Clans"),
    (0, 3, "banner_house_hollowstone", "House Hollowstone"),
    (1, 0, "banner_slaver_syndicate", "Slaver Syndicate"),
    (1, 1, "banner_bleakwatch_warlord", "Bleakwatch Warlord"),
    (1, 2, "banner_king_garrick", "King Garrick"),
    (1, 3, "banner_reserve_silver_dawn", "Reserve: Silver Dawn Order"),
    (2, 0, "banner_reserve_verdant_wardens", "Reserve: Verdant Wardens"),
    (2, 1, "banner_reserve_suncoast_maritime", "Reserve: Sun-Coast Maritime League"),
    (2, 2, "banner_reserve_ironcrest_smiths", "Reserve: Ironcrest Smiths & Quarry Guild"),
    (2, 3, "banner_reserve_sunscorch_clans", "Reserve: Sunscorch Caravan Clans"),
    (3, 0, "banner_reserve_redmarch_vanguard", "Reserve: Redmarch Vanguard"),
    (3, 1, "banner_reserve_saltwind_corsairs", "Reserve: Saltwind Corsairs"),
    (3, 2, "banner_reserve_archivist_circle", "Reserve: Highcrown Archivist Circle"),
    (3, 3, "banner_reserve_coliseum_champions", "Reserve: Coliseum Pit Champions"),
]


def extract_banner_cell(sheet_rgb: np.ndarray, r: int, c: int, target_height: int = 256) -> Image.Image:
    """Extract one banner from a 4x4 sheet using border-flood chroma-key so interior violet cloth stays opaque."""
    h, w, _ = sheet_rgb.shape
    cw, ch = w / 4.0, h / 4.0
    x0 = int(round(c * cw))
    y0 = int(round(r * ch))
    x1 = int(round((c + 1) * cw))
    y1 = int(round((r + 1) * ch))
    cell = sheet_rgb[y0:y1, x0:x1].astype(np.float32)

    cr, cg, cb = cell[:, :, 0], cell[:, :, 1], cell[:, :, 2]
    bleed = np.maximum(0.0, np.minimum(cr - cg, cb - cg))

    # Identify exterior magenta background strictly connected to cell outer perimeter
    mag_cand = ((bleed >= 34.0) & (cr > 130.0) & (cb > 130.0)).astype(np.uint8)
    num_lbl, labels = cv2.connectedComponents(mag_cand, connectivity=8)

    border_labels = set()
    border_labels.update(labels[0, :].tolist())
    border_labels.update(labels[-1, :].tolist())
    border_labels.update(labels[:, 0].tolist())
    border_labels.update(labels[:, -1].tolist())
    border_labels.discard(0)

    ext_bg = np.isin(labels, list(border_labels)).astype(np.uint8)

    # Expand 4px inward into anti-aliased edge zone to soften fringe and remove magenta spill
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    edge_zone = cv2.dilate(ext_bg, kernel, iterations=1)

    t_low, t_high = 14.0, 145.0
    soft_alpha = np.where(
        bleed >= t_high,
        0.0,
        np.where(bleed <= t_low, 255.0, 255.0 * (t_high - bleed) / (t_high - t_low)),
    )

    # Interior pixels stay 100% solid opaque; only the exterior + 3px halo uses alpha ramp + de-spill
    alpha = np.where(ext_bg > 0, 0.0, np.where(edge_zone > 0, soft_alpha, 255.0))
    despill = (edge_zone > 0) & (bleed > t_low)
    new_r = np.where(despill, np.clip(cr - bleed, 0.0, 255.0), cr)
    new_g = cg
    new_b = np.where(despill, np.clip(cb - bleed, 0.0, 255.0), cb)

    # Keep only the main banner component so stray specks are removed
    fg_comp = (alpha > 32.0).astype(np.uint8)
    fn_lbl, f_labels, stats, _ = cv2.connectedComponentsWithStats(fg_comp, connectivity=8)
    if fn_lbl > 1:
        areas = stats[1:, cv2.CC_STAT_AREA]
        best_lbl = int(np.argmax(areas)) + 1
        alpha = np.where(f_labels == best_lbl, alpha, 0.0)

    rgba = np.dstack(
        (
            new_r.astype(np.uint8),
            new_g.astype(np.uint8),
            new_b.astype(np.uint8),
            alpha.astype(np.uint8),
        )
    )
    pil = Image.fromarray(rgba, mode="RGBA")
    bbox = pil.getbbox()
    if bbox:
        # 2px transparent pad avoids edge clipping
        pad = 2
        bw = max(1, bbox[2] - bbox[0])
        bh = max(1, bbox[3] - bbox[1])
        cropped = pil.crop(bbox)
        padded = Image.new("RGBA", (bw + pad * 2, bh + pad * 2), (0, 0, 0, 0))
        padded.paste(cropped, (pad, pad))
        pil = padded

    # Scale cleanly preserving aspect ratio to target_height
    pw, ph = pil.size
    if ph > 0:
        tw = max(1, int(round(pw * (target_height / ph))))
        pil = pil.resize((tw, target_height), Image.Resampling.LANCZOS)
    return pil


def main() -> int:
    if not SRC_SHEET.exists():
        raise FileNotFoundError(f"Missing banner sheet: {SRC_SHEET}")

    PNG_ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
    CLIENT_BANNERS_DIR.mkdir(parents=True, exist_ok=True)

    sheet_rgb = np.array(Image.open(SRC_SHEET).convert("RGB"))
    manifest = []

    for r, c, slug, label in BANNER_SLOTS:
        img = extract_banner_cell(sheet_rgb, r, c, target_height=256)
        png_path = PNG_ARCHIVE_DIR / f"{slug}.png"
        webp_path = CLIENT_BANNERS_DIR / f"{slug}.webp"
        img.save(png_path, "PNG")
        img.save(webp_path, "WEBP", quality=94, method=6)
        manifest.append(
            {
                "slug": slug,
                "label": label,
                "row": r,
                "col": c,
                "width": img.size[0],
                "height": img.size[1],
                "assetPath": f"assets/tokens/banners/{slug}.webp",
            }
        )
        print(f"  Exported {slug}.webp ({img.size[0]}x{img.size[1]}) — {label}")

    manifest_path = CLIENT_BANNERS_DIR / "banners-manifest.json"
    manifest_path.write_text(json.dumps({"count": len(manifest), "banners": manifest}, indent=2), encoding="utf-8")
    print(f"Done: exported {len(manifest)} banners -> {CLIENT_BANNERS_DIR.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
