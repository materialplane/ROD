"""Download completed 4x4 Dungeon Props sheet from Gemini Batch API, chroma-key #FF00FF, and slice into 16 256x256 .webp sprites."""

from __future__ import annotations

import base64
import json
import os
import sys
from pathlib import Path

import cv2
import numpy as np
from dotenv import load_dotenv
from google import genai
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parents[2]
RAW_PROPS_DIR = REPO_ROOT / "assets" / "tokens" / "dungeon_props" / "batch_sheets"
CLIENT_PROPS_DIR = REPO_ROOT / "client" / "assets" / "tokens" / "dungeon_props"

EXT_BY_MIME = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp"}

PROP_SLOTS_4X4 = [
    # Row 1: Closed Chests
    (0, 0, "prop_chest_closed_01_oak"),
    (0, 1, "prop_chest_closed_02_bronze"),
    (0, 2, "prop_chest_closed_03_bandit"),
    (0, 3, "prop_chest_closed_04_sea"),
    # Row 2: Matching Open Chests
    (1, 0, "prop_chest_open_01_oak"),
    (1, 1, "prop_chest_open_02_bronze"),
    (1, 2, "prop_chest_open_03_bandit"),
    (1, 3, "prop_chest_open_04_sea"),
    # Row 3: Ascending Stairs Up (Exit)
    (2, 0, "prop_stairs_up_01_stone"),
    (2, 1, "prop_stairs_up_02_mine"),
    (2, 2, "prop_stairs_up_03_temple"),
    (2, 3, "prop_stairs_up_04_wood"),
    # Row 4: Descending Stairs Down (Deeper Floor)
    (3, 0, "prop_stairs_down_01_stone"),
    (3, 1, "prop_stairs_down_02_mine"),
    (3, 2, "prop_stairs_down_03_crypt"),
    (3, 3, "prop_stairs_down_04_trapdoor"),
]


def find_grid_cuts(is_mag: np.ndarray, total_len: int, axis: int) -> list[int]:
    mag_pct = is_mag.mean(axis=axis)
    cuts = [0]
    for q in (1, 2, 3):
        center = int(round(total_len * q / 4.0))
        lo = max(1, center - int(total_len * 0.14))
        hi = min(total_len - 1, center + int(total_len * 0.14))
        best = lo + int(np.argmax(mag_pct[lo:hi]))
        cuts.append(best)
    cuts.append(total_len)
    return cuts


def slice_and_key_props_4x4(sheet_path: Path) -> None:
    CLIENT_PROPS_DIR.mkdir(parents=True, exist_ok=True)
    with Image.open(sheet_path) as im:
        sheet_rgb = np.array(im.convert("RGB"))
    h, w, _ = sheet_rgb.shape
    sr, sg, sb = sheet_rgb[:, :, 0].astype(np.float32), sheet_rgb[:, :, 1].astype(np.float32), sheet_rgb[:, :, 2].astype(np.float32)
    s_bleed = np.maximum(0.0, np.minimum(sr - sg, sb - sg))
    sheet_mag = (s_bleed >= 34.0) & (sr > 130.0) & (sb > 130.0)
    ys = find_grid_cuts(sheet_mag, h, axis=1)
    xs = find_grid_cuts(sheet_mag, w, axis=0)
    print(f"  Detected grid cuts ys={ys}, xs={xs}")

    for r, c, stem in PROP_SLOTS_4X4:
        x0, x1 = xs[c], xs[c + 1]
        y0, y1 = ys[r], ys[r + 1]
        cell = sheet_rgb[y0:y1, x0:x1].astype(np.float32)

        cr, cg, cb = cell[:, :, 0], cell[:, :, 1], cell[:, :, 2]
        bleed = np.maximum(0.0, np.minimum(cr - cg, cb - cg))
        mag_cand = ((bleed >= 34.0) & (cr > 130.0) & (cb > 130.0)).astype(np.uint8)
        _, labels = cv2.connectedComponents(mag_cand, connectivity=8)

        border_labels = set()
        border_labels.update(labels[0, :].tolist())
        border_labels.update(labels[-1, :].tolist())
        border_labels.update(labels[:, 0].tolist())
        border_labels.update(labels[:, -1].tolist())
        border_labels.discard(0)

        ext_bg = np.isin(labels, list(border_labels)).astype(np.uint8)
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
        edge_zone = cv2.dilate(ext_bg, kernel, iterations=1)

        t_low, t_high = 14.0, 145.0
        soft_alpha = np.where(
            bleed >= t_high,
            0.0,
            np.where(bleed <= t_low, 255.0, 255.0 * (t_high - bleed) / (t_high - t_low)),
        )
        alpha = np.where(ext_bg > 0, 0.0, np.where(edge_zone > 0, soft_alpha, 255.0))
        despill = (edge_zone > 0) & (bleed > t_low)
        new_r = np.where(despill, np.clip(cr - bleed, 0.0, 255.0), cr)
        new_b = np.where(despill, np.clip(cb - bleed, 0.0, 255.0), cb)

        # Drop isolated tiny speckles only (< 48px) while preserving genuine prop details
        fg_comp = (alpha > 32.0).astype(np.uint8)
        fn_lbl, f_labels, stats, _ = cv2.connectedComponentsWithStats(fg_comp, connectivity=8)
        if fn_lbl > 1:
            valid_lbls = [lbl for lbl in range(1, fn_lbl) if int(stats[lbl, cv2.CC_STAT_AREA]) >= 48]
            if valid_lbls:
                alpha = np.where(np.isin(f_labels, valid_lbls), alpha, 0.0)

        rgba = np.dstack((new_r.astype(np.uint8), cg.astype(np.uint8), new_b.astype(np.uint8), alpha.astype(np.uint8)))
        pil_cell = Image.fromarray(rgba, mode="RGBA")
        # Crop tight non-transparent bbox and center inside padded square canvas so chest proportions stay crisp
        bbox = pil_cell.getbbox()
        if bbox:
            cropped = pil_cell.crop(bbox)
            side = max(cropped.width, cropped.height, 1)
            pad = max(16, int(round(side * 0.06)))
            sq = Image.new("RGBA", (side + pad * 2, side + pad * 2), (0, 0, 0, 0))
            sq.paste(cropped, ((sq.width - cropped.width) // 2, (sq.height - cropped.height) // 2))
            pil_rgba = sq.resize((256, 256), Image.Resampling.LANCZOS)
        else:
            pil_rgba = pil_cell.resize((256, 256), Image.Resampling.LANCZOS)
        out_webp = CLIENT_PROPS_DIR / f"{stem}.webp"
        pil_rgba.save(out_webp, "WEBP", quality=90, method=6)
        print(f"  Exported WebP -> {out_webp.relative_to(REPO_ROOT)} (256x256, {out_webp.stat().st_size // 1024} KB)")


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python imageprompts/batch/download_dungeon_props_4x4_batch.py <batches/...>", file=sys.stderr)
        return 1

    job_name = sys.argv[1].strip()
    load_dotenv(REPO_ROOT / ".env")
    if not os.getenv("GEMINI_API_KEY"):
        print("ERROR: GEMINI_API_KEY missing in .env", file=sys.stderr)
        return 1

    client = genai.Client()
    job = client.batches.get(name=job_name)
    state = getattr(job.state, "name", str(job.state))
    print(f"Batch Job : {job.name}")
    print(f"State     : {state}")

    if state != "JOB_STATE_SUCCEEDED":
        if getattr(job, "error", None):
            print(f"Error     : {job.error}")
        return 0

    dest_file = getattr(getattr(job, "dest", None), "file_name", None)
    if not dest_file:
        print("ERROR: No output file found on completed job.", file=sys.stderr)
        return 1

    print(f"Downloading {dest_file} ...")
    raw_jsonl = client.files.download(file=dest_file).decode("utf-8")

    for idx, line in enumerate(raw_jsonl.splitlines(), start=1):
        if not line.strip():
            continue
        item = json.loads(line)
        slug = item.get("customId") or item.get("key") or f"item_{idx}"
        if item.get("error"):
            print(f"  [ERROR] {slug}: {item['error']}")
            continue

        candidates = item.get("response", {}).get("candidates", [])
        parts = candidates[0].get("content", {}).get("parts", []) if candidates else []
        raw_img = None
        mime = "image/jpeg"
        for p in parts:
            inline = p.get("inlineData") or p.get("inline_data")
            if inline and inline.get("data"):
                mime = inline.get("mimeType") or inline.get("mime_type") or "image/jpeg"
                raw_img = base64.b64decode(inline["data"])
                break

        if raw_img is None:
            print(f"  [WARN] {slug}: No image payload.")
            continue

        ext = EXT_BY_MIME.get(mime, ".jpg")
        RAW_PROPS_DIR.mkdir(parents=True, exist_ok=True)
        raw_path = RAW_PROPS_DIR / f"{slug}{ext}"
        raw_path.write_bytes(raw_img)
        print(f"Saved raw 4x4 props sheet -> {raw_path.relative_to(REPO_ROOT)}")
        slice_and_key_props_4x4(raw_path)

    print("\nAll 16 Dungeon Prop variations exported to runtime WebP!")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
