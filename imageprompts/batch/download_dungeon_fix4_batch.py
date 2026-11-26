"""Download completed Room 4/5 + Stairs Up/Down 2x2 sheets from Gemini Batch API and export clean runtime WebPs."""

from __future__ import annotations

import base64
import json
import os
import shutil
import sys
from pathlib import Path

import cv2
import numpy as np
from dotenv import load_dotenv
from google import genai
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parents[2]
RAW_ROOMS_DIR = REPO_ROOT / "assets" / "maps" / "dungeons" / "aqueduct"
CLIENT_ROOMS_DIR = REPO_ROOT / "client" / "assets" / "maps" / "dungeons" / "aqueduct"
RAW_PROPS_DIR = REPO_ROOT / "assets" / "tokens" / "dungeon_props" / "batch_sheets"
CLIENT_PROPS_DIR = REPO_ROOT / "client" / "assets" / "tokens" / "dungeon_props"

EXT_BY_MIME = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp"}

STAIRS_SLOTS = {
    "stairs_up_2x2": [
        (0, 0, "prop_stairs_up_01_stone"),
        (0, 1, "prop_stairs_up_02_mine"),
        (1, 0, "prop_stairs_up_03_temple"),
        (1, 1, "prop_stairs_up_04_wood"),
    ],
    "stairs_down_2x2": [
        (0, 0, "prop_stairs_down_01_stone"),
        (0, 1, "prop_stairs_down_02_mine"),
        (1, 0, "prop_stairs_down_03_crypt"),
        (1, 1, "prop_stairs_down_04_trapdoor"),
    ],
}


def find_2x2_cuts(is_mag: np.ndarray, total_len: int, axis: int) -> list[int]:
    mag_pct = is_mag.mean(axis=axis)
    center = int(round(total_len / 2.0))
    lo = max(1, center - int(total_len * 0.16))
    hi = min(total_len - 1, center + int(total_len * 0.16))
    mid = lo + int(np.argmax(mag_pct[lo:hi]))
    return [0, mid, total_len]


def slice_and_key_2x2(sheet_path: Path, slots: list[tuple[int, int, str]]) -> None:
    CLIENT_PROPS_DIR.mkdir(parents=True, exist_ok=True)
    with Image.open(sheet_path) as im:
        sheet_rgb = np.array(im.convert("RGB"))
    h, w, _ = sheet_rgb.shape
    sr, sg, sb = sheet_rgb[:, :, 0].astype(np.float32), sheet_rgb[:, :, 1].astype(np.float32), sheet_rgb[:, :, 2].astype(np.float32)
    s_bleed = np.maximum(0.0, np.minimum(sr - sg, sb - sg))
    sheet_mag = (s_bleed >= 34.0) & (sr > 130.0) & (sb > 130.0)
    ys = find_2x2_cuts(sheet_mag, h, axis=1)
    xs = find_2x2_cuts(sheet_mag, w, axis=0)
    print(f"  {sheet_path.name} cuts ys={ys}, xs={xs}")

    for r, c, stem in slots:
        cell = sheet_rgb[ys[r]:ys[r + 1], xs[c]:xs[c + 1]].astype(np.float32)
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

        fg_comp = (alpha > 32.0).astype(np.uint8)
        fn_lbl, f_labels, stats, _ = cv2.connectedComponentsWithStats(fg_comp, connectivity=8)
        if fn_lbl > 1:
            valid_lbls = [lbl for lbl in range(1, fn_lbl) if int(stats[lbl, cv2.CC_STAT_AREA]) >= 48]
            if valid_lbls:
                alpha = np.where(np.isin(f_labels, valid_lbls), alpha, 0.0)

        rgba = np.dstack((new_r.astype(np.uint8), cg.astype(np.uint8), new_b.astype(np.uint8), alpha.astype(np.uint8)))
        pil_cell = Image.fromarray(rgba, mode="RGBA")
        bbox = pil_cell.getbbox()
        if bbox:
            cropped = pil_cell.crop(bbox)
            side = max(cropped.width, cropped.height, 1)
            pad = max(14, int(round(side * 0.05)))
            sq = Image.new("RGBA", (side + pad * 2, side + pad * 2), (0, 0, 0, 0))
            sq.paste(cropped, ((sq.width - cropped.width) // 2, (sq.height - cropped.height) // 2))
            pil_rgba = sq.resize((256, 256), Image.Resampling.LANCZOS)
        else:
            pil_rgba = pil_cell.resize((256, 256), Image.Resampling.LANCZOS)

        out_webp = CLIENT_PROPS_DIR / f"{stem}.webp"
        pil_rgba.save(out_webp, "WEBP", quality=90, method=6)
        cov = (np.array(pil_rgba)[:, :, 3] > 32).mean() * 100.0
        print(f"  Exported Prop WebP -> {out_webp.relative_to(REPO_ROOT)} (256x256, fill={cov:.1f}%, {out_webp.stat().st_size // 1024} KB)")


def export_16x9_webp(src_path: Path, dst_path: Path) -> None:
    dst_path.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(src_path) as im:
        rgb = im.convert("RGB")
        resized = rgb.resize((2560, 1440), Image.Resampling.LANCZOS)
        resized.save(dst_path, "WEBP", quality=88, method=6)
    print(f"  Exported Room WebP -> {dst_path.relative_to(REPO_ROOT)} (2560x1440, {dst_path.stat().st_size // 1024} KB)")


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python imageprompts/batch/download_dungeon_fix4_batch.py <batches/...>", file=sys.stderr)
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
        if slug in STAIRS_SLOTS:
            RAW_PROPS_DIR.mkdir(parents=True, exist_ok=True)
            raw_path = RAW_PROPS_DIR / f"{slug}{ext}"
            raw_path.write_bytes(raw_img)
            print(f"Saved stairs sheet -> {raw_path.relative_to(REPO_ROOT)}")
            slice_and_key_2x2(raw_path, STAIRS_SLOTS[slug])
        else:
            RAW_ROOMS_DIR.mkdir(parents=True, exist_ok=True)
            raw_path = RAW_ROOMS_DIR / f"{slug}{ext}"
            if raw_path.exists():
                v_idx = 1
                while (RAW_ROOMS_DIR / f"_rejected_v{v_idx}_{slug}{ext}").exists():
                    v_idx += 1
                arch = RAW_ROOMS_DIR / f"_rejected_v{v_idx}_{slug}{ext}"
                shutil.copy2(raw_path, arch)
                print(f"Archived prior master -> {arch.relative_to(REPO_ROOT)}")
            raw_path.write_bytes(raw_img)
            print(f"Saved room master -> {raw_path.relative_to(REPO_ROOT)}")
            export_16x9_webp(raw_path, CLIENT_ROOMS_DIR / f"{slug}.webp")

    print("\nFix-4 Dungeon batch complete!")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
