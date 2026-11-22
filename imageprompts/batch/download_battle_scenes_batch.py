"""Inspect status and download completed 16:9 Battle Stage Backdrops from Google Gemini Batch API."""

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
OUT_DIR = REPO_ROOT / "assets" / "maps" / "battle_scenes"

EXT_BY_MIME = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
}


def save_image_bytes(raw_bytes: bytes, mime_type: str, stem: str) -> Path:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    ext = EXT_BY_MIME.get(mime_type, ".jpg")
    out_path = OUT_DIR / f"{stem}{ext}"
    out_path.write_bytes(raw_bytes)
    try:
        with Image.open(out_path) as im:
            print(f"  Saved battle_scenes/{out_path.name} ({im.width}x{im.height}, {len(raw_bytes):,} bytes)")
    except Exception:
        print(f"  Saved battle_scenes/{out_path.name} ({len(raw_bytes):,} bytes)")
    return out_path


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python imageprompts/batch/download_battle_scenes_batch.py <batches/...>", file=sys.stderr)
        return 1

    job_name = sys.argv[1].strip()
    load_dotenv(REPO_ROOT / ".env")
    if not os.getenv("GEMINI_API_KEY"):
        print("ERROR: GEMINI_API_KEY missing from .env", file=sys.stderr)
        return 1

    client = genai.Client()
    job = client.batches.get(name=job_name)
    state = getattr(job.state, "name", str(job.state))
    print(f"Batch Job : {job.name}")
    print(f"State     : {state}")

    if state != "JOB_STATE_SUCCEEDED":
        if getattr(job, "error", None):
            print(f"Error     : {job.error}")
        print("Job is not finished yet. Run again once it reaches JOB_STATE_SUCCEEDED.")
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
            stem = item.get("customId") or item.get("key") or f"biome_{idx:02d}"
            if "error" in item and item["error"]:
                print(f"  [ERROR] {stem}: {item['error']}")
                continue
            candidates = item.get("response", {}).get("candidates", [])
            if not candidates:
                print(f"  [WARN] {stem}: No candidates in response.")
                continue
            finish_reason = candidates[0].get("finishReason", "")
            parts = candidates[0].get("content", {}).get("parts", [])
            saved_this = False
            for part in parts:
                inline = part.get("inlineData") or part.get("inline_data")
                if inline and inline.get("data"):
                    mime = inline.get("mimeType") or inline.get("mime_type") or "image/jpeg"
                    raw_img = base64.b64decode(inline["data"])
                    saved_paths.append(save_image_bytes(raw_img, mime, stem))
                    saved_this = True
                    break
            if not saved_this:
                print(f"  [WARN] {stem}: No image data (finishReason={finish_reason}).")

    print(f"\nDownloaded {len(saved_paths)} battle scene(s) into {OUT_DIR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
