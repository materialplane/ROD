"""Slice & adaptively chroma-key R x C animated VFX sheets (supports #FF00FF, dark/shaded magenta, and solid gray/black/white tile boxes)."""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from core_chroma_key import key_magenta_sprite


def _is_magenta_hue(arr: np.ndarray) -> np.ndarray:
    """Detect pure/dark/shaded magenta hue (R & B strongly dominate G, balanced R/B so indigo/violet shadow effects stay safe)."""
    r = arr[:, :, 0]
    g = arr[:, :, 1]
    b = arr[:, :, 2]
    max_rb = np.maximum(r, b)
    return (
        (r > 22.0)
        & (b > 22.0)
        & ((r - g) > 16.0)
        & ((b - g) > 16.0)
        & (g < np.maximum(65.0, max_rb * 0.48))
        & (np.abs(r - b) <= np.maximum(28.0, max_rb * 0.30))
    )


def key_adaptive_vfx_cell(cell_rgb: Image.Image) -> tuple[Image.Image, str]:
    """Adaptively key a single VFX cell whether its backdrop is #FF00FF, dark/shaded magenta, or a solid gray/black/white tile."""
    arr = np.array(cell_rgb.convert("RGB"), dtype=np.float32)
    ch, cw = arr.shape[:2]

    # Fast check: bright standard #FF00FF backdrop covering >=35% of perimeter -> reuse canonical core_chroma_key
    perim_pts = np.concatenate([
        arr[:4, :, :].reshape(-1, 3),
        arr[-4:, :, :].reshape(-1, 3),
        arr[:, :4, :].reshape(-1, 3),
        arr[:, -4:, :].reshape(-1, 3),
    ])
    bright_mag_mask = (arr[:, :, 0] > 180) & (arr[:, :, 1] < 90) & (arr[:, :, 2] > 180)
    bright_mag_perim = ((perim_pts[:, 0] > 180) & (perim_pts[:, 1] < 90) & (perim_pts[:, 2] > 180)).mean()
    hue_mag_mask = _is_magenta_hue(arr)
    dark_mag_ratio = float((hue_mag_mask & (~bright_mag_mask)).mean())
    hue_mag_perim = _is_magenta_hue(perim_pts.reshape(1, -1, 3)).mean()

    # Check if there is an inner solid tile box surrounded by magenta (inset ring at ~10% from border)
    in_pad = max(14, min(60, min(ch, cw) // 10))
    inner_pts = np.concatenate([
        arr[in_pad:in_pad + 4, in_pad:-in_pad, :].reshape(-1, 3),
        arr[-in_pad - 4:-in_pad, in_pad:-in_pad, :].reshape(-1, 3),
        arr[in_pad:-in_pad, in_pad:in_pad + 4, :].reshape(-1, 3),
        arr[in_pad:-in_pad, -in_pad - 4:-in_pad, :].reshape(-1, 3),
    ])
    inner_bright_mag = ((inner_pts[:, 0] > 180) & (inner_pts[:, 1] < 70) & (inner_pts[:, 2] > 180)).mean()
    inner_non_bright = inner_pts[~((inner_pts[:, 0] > 180) & (inner_pts[:, 1] < 70) & (inner_pts[:, 2] > 180))]
    inner_bg_pool = inner_non_bright if len(inner_non_bright) >= len(inner_pts) * 0.25 else inner_pts
    med_inner_bg = np.median(inner_bg_pool, axis=0)
    inner_is_mag_hue = _is_magenta_hue(med_inner_bg.reshape(1, 1, 3))[0, 0]
    inner_chroma = float(med_inner_bg.max() - med_inner_bg.min())

    # Case 1: Clean bright #FF00FF everywhere (or bright magenta perimeter where sprite sparks touched inner ring)
    if bright_mag_perim >= 0.70 and dark_mag_ratio < 0.008 and (inner_bright_mag >= 0.55 or inner_is_mag_hue or inner_chroma > 32.0):
        return key_magenta_sprite(cell_rgb, t_low=15.0, t_high=140.0, crop_bbox=False, include_interior_voids=True), "magenta_ff"

    # Case 2: Shaded or dark hue-magenta backdrop (or mixed magenta where colored foreground touched inner ring)
    if hue_mag_perim >= 0.50 and (inner_is_mag_hue or inner_chroma > 32.0):
        # Remove all hue-magenta pixels cleanly using soft bleed ramp + vector de-spill
        r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
        bg_mask = hue_mag_mask.astype(np.uint8)
        kernel_rim = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
        rim = (cv2.dilate(bg_mask, kernel_rim, iterations=2) > 0) & (bg_mask == 0)

        mag_bleed = np.maximum(0.0, np.minimum(r - g, b - g))
        alpha = np.full((ch, cw), 255.0, dtype=np.float32)
        alpha[bg_mask == 1] = 0.0
        # Adaptive upper ramp scaled to median background brightness
        max_bg_bleed = float(np.median(mag_bleed[bg_mask == 1])) if (bg_mask == 1).any() else 120.0
        t_high = max(24.0, min(140.0, max_bg_bleed * 0.85))
        t_low = min(10.0, t_high * 0.25)
        alpha[rim] = np.clip(255.0 * (t_high - mag_bleed[rim]) / max(1.0, t_high - t_low), 0.0, 255.0)
        blurred = cv2.GaussianBlur(alpha, (3, 3), 0.5)
        alpha = np.where(bg_mask == 1, 0.0, np.where(rim, blurred, alpha))
        alpha = np.where(alpha < 10.0, 0.0, alpha).clip(0, 255).astype(np.uint8)

        new_r = np.where((alpha > 0) & (mag_bleed > 4.0), np.clip(r - mag_bleed * 0.85, 0, 255), r)
        new_b = np.where((alpha > 0) & (mag_bleed > 4.0), np.clip(b - mag_bleed * 0.85, 0, 255), b)
        out = np.dstack((new_r.astype(np.uint8), g.astype(np.uint8), new_b.astype(np.uint8), alpha))
        return Image.fromarray(out, "RGBA"), "magenta_hue"

    # Case 3: Solid non-magenta tile or full canvas (gray, slate, black, white inside/without magenta gutters)
    # Remove any outer magenta rim + dark tile-border line first via flood-fill, then flood-fill inner tile bg RGB.
    box_bg = med_inner_bg.astype(np.float32)
    dist_box = np.linalg.norm(arr - box_bg, axis=2)

    # Also detect thin box-border lines near cell edge (outer 14px) if distinct from both magenta & box_bg
    box_luma = float(box_bg.mean())
    tol_bg = 24.0 if box_luma < 35.0 or box_luma > 230.0 else 30.0

    # Any pixel that is either outer magenta-hue OR close to the tile background color is fillable from perimeter/inner rim
    is_outer_bg = hue_mag_mask | (dist_box <= tol_bg)

    # Shave thin outer dark frame lines when outer border is bright magenta and an inner box sits inside it
    seed_mask = is_outer_bg.copy()
    if bright_mag_perim > 0.05 or hue_mag_perim > 0.05:
        seed_mask[:6, :] = True
        seed_mask[-6:, :] = True
        seed_mask[:, :6] = True
        seed_mask[:, -6:] = True
    flood = np.zeros((ch + 2, cw + 2), dtype=np.uint8)
    flood[1:-1, 1:-1] = (~seed_mask).astype(np.uint8)
    for x in range(cw):
        if flood[1, x + 1] == 0:
            cv2.floodFill(flood, None, (x + 1, 1), 2)
        if flood[ch, x + 1] == 0:
            cv2.floodFill(flood, None, (x + 1, ch), 2)
    for y in range(ch):
        if flood[y + 1, 1] == 0:
            cv2.floodFill(flood, None, (1, y + 1), 2)
        if flood[y + 1, cw] == 0:
            cv2.floodFill(flood, None, (cw, y + 1), 2)
    # Seed from inner corners (past any tile divider frame line) using inner box color
    for sx, sy in (
        (in_pad, in_pad),
        (cw - 1 - in_pad, in_pad),
        (in_pad, ch - 1 - in_pad),
        (cw - 1 - in_pad, ch - 1 - in_pad),
        (cw // 2, in_pad),
        (cw // 2, ch - 1 - in_pad),
        (in_pad, ch // 2),
        (cw - 1 - in_pad, ch // 2),
    ):
        if dist_box[sy, sx] <= tol_bg and flood[sy + 1, sx + 1] == 0:
            cv2.floodFill(flood, None, (sx + 1, sy + 1), 2)

    bg_mask = (flood[1:-1, 1:-1] == 2).astype(np.uint8)
    # Clean stray isolated hue-magenta islands/edges inside rings
    bg_mask |= (hue_mag_mask & _near_bg(bg_mask)).astype(np.uint8)

    # Strip any isolated residual outer frame-corner ring artifacts within outer 10px not connected to center
    kernel_rim = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    rim = (cv2.dilate(bg_mask, kernel_rim, iterations=2) > 0) & (bg_mask == 0)

    alpha = np.full((ch, cw), 255.0, dtype=np.float32)
    alpha[bg_mask == 1] = 0.0
    t_low = tol_bg * 0.75
    t_high = tol_bg + 28.0
    alpha[rim] = np.clip(255.0 * (dist_box[rim] - t_low) / (t_high - t_low), 0.0, 255.0)
    # Erase any lingering bright-magenta bleed on rim too
    rim_mag_bleed = np.maximum(0.0, np.minimum(arr[:, :, 0] - arr[:, :, 1], arr[:, :, 2] - arr[:, :, 1]))
    alpha[rim & hue_mag_mask] = 0.0

    blurred = cv2.GaussianBlur(alpha, (3, 3), 0.5)
    alpha = np.where(bg_mask == 1, 0.0, np.where(rim, blurred, alpha))
    alpha = np.where(alpha < 10.0, 0.0, alpha).clip(0, 255).astype(np.uint8)

    # Gentle de-spill toward neutral/bright foreground on transition rim to reduce gray/black fringe
    out_rgb = arr.copy()
    despill = (alpha > 0) & (alpha < 235) & (dist_box < t_high + 10.0)
    if box_luma > 200.0:
        # Bright white halo removal on rim: clamp downward slightly only on outer soft edge
        factor = np.clip((alpha / 255.0), 0.45, 1.0)[..., None]
        out_rgb[despill] = np.clip((arr - (1.0 - factor) * box_bg * 0.35) / factor, 0, 255)[despill]
    else:
        # Remove magenta tint on outer border + lift dark gray contamination slightly
        mag_drop = np.where(rim_mag_bleed > 4.0, rim_mag_bleed, 0.0)
        out_rgb[:, :, 0] = np.clip(out_rgb[:, :, 0] - mag_drop * 0.85, 0, 255)
        out_rgb[:, :, 2] = np.clip(out_rgb[:, :, 2] - mag_drop * 0.85, 0, 255)

    out = np.dstack((out_rgb.astype(np.uint8), alpha))
    return Image.fromarray(out, "RGBA"), f"solid_tile_{int(box_bg[0])}_{int(box_bg[1])}_{int(box_bg[2])}"


def _near_bg(bg_mask: np.ndarray) -> np.ndarray:
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
    return cv2.dilate(bg_mask, k, iterations=1) > 0


def _strip_edge_grid_bars(alpha: np.ndarray) -> np.ndarray:
    """Erase straight grid/box divider bars trapped inside the outer 14% edge strip of a cell."""
    ch, cw = alpha.shape[:2]
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats((alpha > 14).astype(np.uint8), connectivity=8)
    for lbl in range(1, num_labels):
        x, y, bw, bh, _ = stats[lbl]
        is_vert_edge_bar = bh >= ch * 0.45 and bw <= cw * 0.14 and (x + bw <= cw * 0.16 or x >= cw * 0.84)
        is_horiz_edge_bar = bw >= cw * 0.45 and bh <= ch * 0.14 and (y + bh <= ch * 0.16 or y >= ch * 0.84)
        if is_vert_edge_bar or is_horiz_edge_bar:
            bar_mask = cv2.dilate((labels == lbl).astype(np.uint8), np.ones((5, 5), np.uint8), iterations=1) > 0
            alpha[bar_mask] = 0
    return alpha


def find_grid_cuts(arr: np.ndarray, total_len: int, parts: int, axis: int) -> list[int]:
    """Find cleanest empty-background seam near each nominal k * total_len / parts boundary."""
    is_mag = _is_magenta_hue(arr)
    # Fallback background mask via median border pixel if image isn't magenta-dominant
    if is_mag.mean() < 0.25:
        border_pts = np.concatenate([arr[:10, :, :].reshape(-1, 3), arr[-10:, :, :].reshape(-1, 3)])
        med_bg = np.median(border_pts, axis=0)
        nonbg = (~is_mag) & (np.linalg.norm(arr - med_bg, axis=2) > 26.0)
    else:
        nonbg = ~is_mag

    cuts = [0]
    counts = nonbg.sum(axis=1 - axis)
    search_rad = max(20, round((total_len / parts) * 0.16))

    for k in range(1, parts):
        nom = round(k * total_len / parts)
        lo = max(cuts[-1] + 20, nom - search_rad)
        hi = min(total_len - 20, nom + search_rad)
        window = counts[lo:hi]
        min_val = int(window.min())
        best_idxs = np.where(window == min_val)[0]
        splits = np.where(np.diff(best_idxs) > 1)[0] + 1
        runs = np.split(best_idxs, splits)
        widest = max(runs, key=len)
        seam = int(lo + round(float(widest.mean())))
        # Guard against drifting far from grid center when a whole tile box shares bg color
        if min_val > total_len * 0.02 and abs(seam - nom) > search_rad * 0.45:
            seam = nom
        cuts.append(seam)

    cuts.append(total_len)
    return cuts


def slice_vfx_sheet(
    sheet_path: Path,
    out_dir: Path,
    rows: int = 6,
    cols: int = 6,
    target_size: int = 512,
    max_fill: int = 460,
    archive_dir: Path | None = None,
    img_format: str = "png",
    prefix: str = "",
) -> dict[str, object]:
    """Slice an R x C sheet into centered 512x512 transparent frames and return extraction stats."""
    if not sheet_path.exists():
        raise FileNotFoundError(f"Missing VFX sheet: {sheet_path}")

    if archive_dir is not None and out_dir.exists():
        old_files = [p for p in out_dir.glob(f"{prefix}row*_f*.*") if p.is_file()]
        if old_files:
            archive_dir.mkdir(parents=True, exist_ok=True)
            for p in old_files:
                shutil.move(str(p), str(archive_dir / p.name))

    out_dir.mkdir(parents=True, exist_ok=True)

    with Image.open(sheet_path) as raw:
        rgb_img = raw.convert("RGB")
        w, h = rgb_img.size
        arr = np.array(rgb_img, dtype=np.float32)

    row_cuts = find_grid_cuts(arr, h, rows, axis=0)
    col_cuts = find_grid_cuts(arr, w, cols, axis=1)

    keyed_cells: list[tuple[int, int, Image.Image, tuple[int, int, int, int] | None]] = []
    max_span = 1
    modes_seen: dict[str, int] = {}
    empty_frames: list[str] = []
    border_clipped: list[str] = []

    for r in range(rows):
        y0, y1 = row_cuts[r], row_cuts[r + 1]
        for c in range(cols):
            x0, x1 = col_cuts[c], col_cuts[c + 1]
            cell_crop = rgb_img.crop((x0, y0, x1, y1))
            keyed, mode_tag = key_adaptive_vfx_cell(cell_crop)
            modes_seen[mode_tag] = modes_seen.get(mode_tag, 0) + 1

            alpha = np.array(keyed)[:, :, 3]
            # Strip thin outer 4px residue + straight grid-box divider bars along outer edges
            alpha[:4, :] = 0
            alpha[-4:, :] = 0
            alpha[:, :4] = 0
            alpha[:, -4:] = 0
            alpha = _strip_edge_grid_bars(alpha)
            # Keep only meaningful alpha area
            ys, xs = np.where(alpha > 14)
            if len(xs) < 12:
                empty_frames.append(f"r{r + 1}c{c + 1}")
                keyed_cells.append((r + 1, c + 1, keyed, None))
                continue

            # Replace cleaned alpha back onto keyed image
            k_arr = np.array(keyed)
            k_arr[:, :, 3] = alpha
            keyed = Image.fromarray(k_arr, "RGBA")

            bx0, by0, bx1, by1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
            if bx0 <= 5 or by0 <= 5 or bx1 >= (x1 - x0 - 5) or by1 >= (y1 - y0 - 5):
                border_clipped.append(f"r{r + 1}c{c + 1}")
            max_span = max(max_span, bx1 - bx0, by1 - by0)
            keyed_cells.append((r + 1, c + 1, keyed, (bx0, by0, bx1, by1)))

    scale = min(max_fill / max_span, target_size / (max(w / cols, h / rows)))

    ext = ".webp" if img_format.lower() == "webp" else ".png"
    for r_num, c_num, keyed, bbox in keyed_cells:
        canvas = Image.new("RGBA", (target_size, target_size), (0, 0, 0, 0))
        if bbox is not None:
            bx0, by0, bx1, by1 = bbox
            sprite = keyed.crop(bbox)
            nw = max(1, round((bx1 - bx0) * scale))
            nh = max(1, round((by1 - by0) * scale))
            resized = sprite.resize((nw, nh), Image.Resampling.LANCZOS)
            px = (target_size - nw) // 2
            py = (target_size - nh) // 2
            canvas.paste(resized, (px, py), resized)

        out_path = out_dir / f"{prefix}row{r_num}_f{c_num}{ext}"
        if ext == ".webp":
            canvas.save(out_path, format="WEBP", quality=92, method=4)
        else:
            canvas.save(out_path, format="PNG")

    return {
        "sheet": sheet_path.name,
        "modes": modes_seen,
        "empty": empty_frames,
        "clipped": border_clipped,
        "scale": round(scale, 3),
    }


ROW_META_DEFAULTS = {
    "Quick Diagonal Slash": ("#e5e7eb", 5, 650),
    "Heavy Greatblade Cleave": ("#f59e0b", 8, 800),
    "Twin X-Cross Slash": ("#f5b041", 7, 700),
    "Serrated Scarlet Cut": ("#ef4444", 7, 750),
    "Kinetic Blunt Smash": ("#d97706", 8, 750),
    "Shattering Armor Crush": ("#fb923c", 9, 850),
    "Needle Pierce Streak": ("#67e8f9", 5, 650),
    "Hunting Arrow Shot": ("#f59e0b", 5, 700),
    "Parallel Arrow Barrage": ("#38bdf8", 6, 800),
    "Ember Swirl Spark": ("#ff5722", 5, 800),
    "Roaring Fireball Burst": ("#f97316", 8, 850),
    "Forked Lightning Strike": ("#fde047", 7, 750),
    "Crystal Frost Starburst": ("#4dd0e1", 5, 800),
    "Glacial Ice Shards": ("#38bdf8", 6, 850),
    "Acid Splash Burst": ("#84cc16", 4, 800),
    "Toxic Spore Cluster": ("#7ac74f", 4, 850),
    "Umbral Indigo Lance": ("#6366f1", 7, 800),
    "Solar Radiant Sunburst": ("#fde047", 5, 850),
    "Herbal Healing Ribbon": ("#2ecc71", 0, 900),
    "Lush Blossom Nova": ("#10b981", 0, 950),
    "Phoenix Rebirth Wing": ("#fbbf24", 0, 950),
    "Arcane Hex Ward": ("#38d9c0", 0, 900),
    "Iron Bastion Chevrons": ("#94a3b8", 2, 850),
    "Sapphire Mana Surge": ("#3b82f6", 0, 900),
    "Thorny Vine Whip": ("#22c55e", 5, 800),
    "Purifying Cleanse Chime": ("#5eead4", 0, 850),
    "Golden Rally Crest": ("#eab308", 0, 900),
    "Dark Eclipse Starburst": ("#4f46e5", 8, 900),
    "Gale Wind & Spectral Fang": ("#67e8f9", 5, 750),
    "Boss Hazard & Stun Flash": ("#ef4444", 7, 800),
}


def _sheet_num(path: Path) -> int:
    import re
    m = re.search(r"vfx_sheet_(\d+)", path.stem)
    return int(m.group(1)) if m else 0


def _write_test_catalog(out_root: Path, reports: list[dict[str, object]]) -> None:
    manifest_path = Path(__file__).resolve().parents[1] / "batch" / "vfx_5sheets_manifest.json"
    if not manifest_path.exists():
        return
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    by_num = {int(s["num"]): s for s in manifest.get("sheets", [])}
    rep_by_num = {_sheet_num(Path(str(r["sheet"]))): r for r in reports}

    catalog_sheets = []
    for num in sorted(rep_by_num):
        rep = rep_by_num[num]
        modes = rep.get("modes", {})
        top_mode = max(modes.items(), key=lambda kv: kv[1])[0] if modes else "unknown"
        spec = by_num.get(num, {})
        rows_out = []
        for idx, row_entry in enumerate(spec.get("rows", []), 1):
            rname = row_entry[0]
            color, shake, dur = ROW_META_DEFAULTS.get(rname, ("#e6c67c", 4, 800))
            rows_out.append({
                "row": idx,
                "name": rname,
                "usage": row_entry[1] if len(row_entry) > 1 else "",
                "color": color,
                "shake": shake,
                "defaultDuration": dur,
            })
        catalog_sheets.append({
            "sheet": num,
            "folder": f"sheet_{num:02d}",
            "title": spec.get("title", f"Sheet {num:02d}"),
            "mode": top_mode,
            "empty": rep.get("empty", []),
            "clipped": rep.get("clipped", []),
            "rows": rows_out,
        })

    catalog_path = out_root / "vfx_test_catalog.json"
    catalog_path.write_text(json.dumps({"sheets": catalog_sheets}, indent=2), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Slice & adaptively chroma-key VFX sprite sheets into 512x512 frames.")
    parser.add_argument("--sheet", help="Single source VFX sprite sheet path.")
    parser.add_argument("--all-sheets", action="store_true", help="Slice all vfx_sheet_* sheets in assets/vfx/batch_sheets/.")
    parser.add_argument("--sheets", nargs="*", default=None, help="Optional sheet numbers (e.g. 2 4) with --all-sheets.")
    parser.add_argument("--out-dir", required=True, help="Destination folder.")
    parser.add_argument("--rows", type=int, default=6)
    parser.add_argument("--cols", type=int, default=6)
    parser.add_argument("--format", default="png", choices=["png", "webp"], help="Output format (png or webp).")
    parser.add_argument("--archive-dir", default=None, help="Optional archive folder for existing frames before replacing.")
    args = parser.parse_args()

    out_root = Path(args.out_dir)

    if args.all_sheets:
        batch_dir = Path(__file__).resolve().parents[2] / "assets" / "vfx" / "batch_sheets"
        candidates = [
            p for p in batch_dir.iterdir()
            if p.is_file() and _sheet_num(p) > 0 and p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
        ]
        sheets = sorted(candidates, key=_sheet_num)
        if args.sheets:
            wanted = {int(x) for x in args.sheets}
            sheets = [p for p in sheets if _sheet_num(p) in wanted]
        if not sheets:
            raise FileNotFoundError(f"No matching sheets found in {batch_dir}")
        audit_path = out_root / "slice_audit.json"
        existing_audit = {}
        if args.sheets and audit_path.exists():
            for entry in json.loads(audit_path.read_text(encoding="utf-8")):
                existing_audit[entry["sheet"]] = entry
        for s_path in sheets:
            num = _sheet_num(s_path)
            sub_dir = out_root / f"sheet_{num:02d}"
            rep = slice_vfx_sheet(
                sheet_path=s_path,
                out_dir=sub_dir,
                rows=args.rows,
                cols=args.cols,
                img_format=args.format,
            )
            existing_audit[rep["sheet"]] = rep
            top_mode = max(rep["modes"].items(), key=lambda kv: kv[1])[0]
            print(f"[{s_path.name}] mode={top_mode} | empty={len(rep['empty'])} | clipped={len(rep['clipped'])}")
        reports = [existing_audit[k] for k in sorted(existing_audit)]
        audit_path.write_text(json.dumps(reports, indent=2), encoding="utf-8")
        _write_test_catalog(out_root, reports)
        print(f"Finished {len(sheets)} sheet(s) -> {out_root} (audit: {audit_path})")
        return 0

    if not args.sheet:
        parser.error("Provide either --sheet or --all-sheets.")
    rep = slice_vfx_sheet(
        sheet_path=Path(args.sheet),
        out_dir=out_root,
        rows=args.rows,
        cols=args.cols,
        archive_dir=Path(args.archive_dir) if args.archive_dir else None,
        img_format=args.format,
    )
    print(json.dumps(rep, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
