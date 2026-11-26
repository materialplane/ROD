"""Inspect status and download completed Card-Delve Stage 1 / Stage 2 batch images into organized assets folders."""

from __future__ import annotations

import base64
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parents[2]
UI_DIR = REPO_ROOT / "assets" / "ui" / "dungeons"
CHAMBERS_DIR = REPO_ROOT / "assets" / "maps" / "dungeons" / "aqueduct_cards"
STONE_ROOMS_DIR = REPO_ROOT / "assets" / "maps" / "dungeons" / "base_stone_brick"
BATTLE_SCENES_DIR = REPO_ROOT / "assets" / "maps" / "battle_scenes"

EXT_BY_MIME = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
}


def target_dir_for_slug(slug: str) -> Path:
    if slug.startswith("aqueduct_"):
        return CHAMBERS_DIR
    if slug.startswith("room_"):
        return STONE_ROOMS_DIR
    if "_room_" in slug:
        biome = slug.split("_room_", 1)[0]
        return REPO_ROOT / "assets" / "maps" / "dungeons" / f"base_{biome}"
    if slug.startswith("dungeon_"):
        return BATTLE_SCENES_DIR
    if "_cards_" in slug:
        biome = slug.split("_cards_", 1)[0]
        return UI_DIR / f"base_{biome}"
    return UI_DIR


def save_image_bytes(raw_bytes: bytes, mime_type: str, slug: str) -> Path:
    out_dir = target_dir_for_slug(slug)
    out_dir.mkdir(parents=True, exist_ok=True)
    ext = EXT_BY_MIME.get(mime_type, ".png")
    out_path = out_dir / f"{slug}{ext}"
    out_path.write_bytes(raw_bytes)
    try:
        with Image.open(out_path) as im:
            rel = out_path.relative_to(REPO_ROOT).as_posix()
            print(f"  Saved {rel} ({im.width}x{im.height}, {len(raw_bytes):,} bytes)")
    except Exception:
        print(f"  Saved {out_path} ({len(raw_bytes):,} bytes)")
    return out_path


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python imageprompts/batch/download_card_delve_batch.py <batches/...>", file=sys.stderr)
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
        print("Job is not finished yet.")
        return 0

    saved_paths: list[Path] = []
    dest_file = getattr(getattr(job, "dest", None), "file_name", None)
    if dest_file:
        print(f"Downloading output file {dest_file} ...")
        raw_jsonl = client.files.download(file=dest_file).decode("utf-8")
        for idx, line in enumerate(raw_jsonl.splitlines(), start=1):
            if not line.strip():
                continue
            item = json.loads(line)
            slug = item.get("customId") or item.get("key") or f"item_{idx:02d}"
            if "error" in item and item["error"]:
                print(f"  [ERROR] {slug}: {item['error']}")
                continue
            candidates = item.get("response", {}).get("candidates", [])
            if not candidates:
                print(f"  [WARN] {slug}: No candidates in response.")
                continue
            finish_reason = candidates[0].get("finishReason", "")
            parts = candidates[0].get("content", {}).get("parts", [])
            saved_this = False
            for part in parts:
                inline = part.get("inlineData") or part.get("inline_data")
                if inline and inline.get("data"):
                    mime = inline.get("mimeType") or inline.get("mime_type") or "image/png"
                    raw_img = base64.b64decode(inline["data"])
                    saved_paths.append(save_image_bytes(raw_img, mime, slug))
                    saved_this = True
                    break
            if not saved_this:
                print(f"  [WARN] {slug}: No image data (finishReason={finish_reason}).")

    print(f"\nDownloaded {len(saved_paths)} asset(s) successfully.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
