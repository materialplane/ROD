"""Download completed Dungeon Starter 7-pack from Gemini Batch API and export WebPs + chroma-keyed 2x2 prop slices."""

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
RAW_ROOMS_DIR = REPO_ROOT / "assets" / "maps" / "dungeons" / "aqueduct"
RAW_STAGE_DIR = REPO_ROOT / "assets" / "maps" / "battle_scenes"
RAW_PROPS_DIR = REPO_ROOT / "assets" / "tokens" / "dungeon_props" / "batch_sheets"

CLIENT_ROOMS_DIR = REPO_ROOT / "client" / "assets" / "maps" / "dungeons" / "aqueduct"
CLIENT_STAGE_DIR = REPO_ROOT / "client" / "assets" / "maps" / "battle_scenes"
CLIENT_PROPS_DIR = REPO_ROOT / "client" / "assets" / "tokens" / "dungeon_props"

EXT_BY_MIME = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp"}
PROP_SLOTS = [
    (0, 0, "prop_chest_closed"),
    (0, 1, "prop_chest_open"),
    (1, 0, "prop_exit_stairs"),
    (1, 1, "prop_boss_sigil"),
]


def export_16x9_webp(src_path: Path, dst_path: Path) -> None:
    dst_path.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(src_path) as im:
        rgb = im.convert("RGB")
        resized = rgb.resize((2560, 1440), Image.Resampling.LANCZOS)
        resized.save(dst_path, "WEBP", quality=88, method=6)
    print(f"  Exported WebP -> {dst_path.relative_to(REPO_ROOT)} (2560x1440, {dst_path.stat().st_size // 1024} KB)")


def slice_and_key_props_2x2(sheet_path: Path) -> None:
    CLIENT_PROPS_DIR.mkdir(parents=True, exist_ok=True)
    with Image.open(sheet_path) as im:
        sheet_rgb = np.array(im.convert("RGB"))
    h, w, _ = sheet_rgb.shape
    cw, ch = w / 2.0, h / 2.0

    for r, c, stem in PROP_SLOTS:
        x0, y0 = int(round(c * cw)), int(round(r * ch))
        x1, y1 = int(round((c + 1) * cw)), int(round((r + 1) * ch))
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

        fg_comp = (alpha > 32.0).astype(np.uint8)
        fn_lbl, f_labels, stats, _ = cv2.connectedComponentsWithStats(fg_comp, connectivity=8)
        if fn_lbl > 1:
            areas = stats[1:, cv2.CC_STAT_AREA]
            best_lbl = int(np.argmax(areas)) + 1
            alpha = np.where(f_labels == best_lbl, alpha, 0.0)

        rgba = np.dstack((new_r.astype(np.uint8), cg.astype(np.uint8), new_b.astype(np.uint8), alpha.astype(np.uint8)))
        pil_rgba = Image.fromarray(rgba, mode="RGBA").resize((256, 256), Image.Resampling.LANCZOS)
        out_webp = CLIENT_PROPS_DIR / f"{stem}.webp"
        pil_rgba.save(out_webp, "WEBP", quality=90, method=6)
        print(f"  Exported Prop WebP -> {out_webp.relative_to(REPO_ROOT)} (256x256, {out_webp.stat().st_size // 1024} KB)")


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python imageprompts/batch/download_dungeon_starter_batch.py <batches/...>", file=sys.stderr)
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
        if slug == "dungeon_props_2x2":
            RAW_PROPS_DIR.mkdir(parents=True, exist_ok=True)
            raw_path = RAW_PROPS_DIR / f"{slug}{ext}"
            raw_path.write_bytes(raw_img)
            print(f"Saved raw props sheet -> {raw_path.relative_to(REPO_ROOT)}")
            slice_and_key_props_2x2(raw_path)
        elif slug == "dungeon_01_stone_aqueduct":
            RAW_STAGE_DIR.mkdir(parents=True, exist_ok=True)
            raw_path = RAW_STAGE_DIR / f"{slug}{ext}"
            raw_path.write_bytes(raw_img)
            print(f"Saved raw battle stage -> {raw_path.relative_to(REPO_ROOT)}")
            export_16x9_webp(raw_path, CLIENT_STAGE_DIR / f"{slug}.webp")
        else:
            RAW_ROOMS_DIR.mkdir(parents=True, exist_ok=True)
            raw_path = RAW_ROOMS_DIR / f"{slug}{ext}"
            raw_path.write_bytes(raw_img)
            print(f"Saved raw room master -> {raw_path.relative_to(REPO_ROOT)}")
            export_16x9_webp(raw_path, CLIENT_ROOMS_DIR / f"{slug}.webp")

    print("\nAll Dungeon Starter assets downloaded & converted to runtime WebP!")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
