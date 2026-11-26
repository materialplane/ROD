"""Submit Room 5 (aq_room_05_boss_sanctum, 16:9 4K) anchored to Room 2 style/scale reference via Gemini Batch API (50% off)."""

from __future__ import annotations

import argparse
import base64
import io
import json
import os
import re
import sys
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parents[2]
ROOMS_FILE = REPO_ROOT / "imageprompts" / "dungeon-rooms-aqueduct.txt"
REF_IMAGE = REPO_ROOT / "assets" / "maps" / "dungeons" / "aqueduct" / "aq_room_02_aqueduct_crossroads.jpg"
OUTPUT_JSONL = Path(__file__).resolve().parent / "room5_anchored_batch.jsonl"
DEFAULT_MODEL = "models/gemini-3-pro-image"


def parse_room5() -> str:
    txt = ROOMS_FILE.read_text(encoding="utf-8")
    rooms = re.findall(
        r"ROOM\s+\d+\s+OF\s+\d+\s+\(([^)]+)\).*?---\s*COPY PROMPT START\s*---\s*\n(.*?)\n---\s*COPY PROMPT END",
        txt,
        re.DOTALL,
    )
    by_slug = {slug.strip(): body.strip() for slug, body in rooms}
    if "aq_room_05_boss_sanctum" not in by_slug:
        raise ValueError(f"Missing aq_room_05_boss_sanctum in {ROOMS_FILE}")
    return by_slug["aq_room_05_boss_sanctum"]


def encode_ref_jpeg(ref_path: Path, max_width: int = 1920, quality: int = 90) -> str:
    if not ref_path.exists():
        raise FileNotFoundError(f"Reference image missing: {ref_path}")
    with Image.open(ref_path) as raw:
        im = raw.convert("RGB")
        if im.width > max_width:
            th = round(im.height * (max_width / im.width))
            im = im.resize((max_width, th), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, format="JPEG", quality=quality)
    return base64.b64encode(buf.getvalue()).decode("ascii")


def main() -> int:
    parser = argparse.ArgumentParser(description="Submit Room 5 re-roll anchored to Room 2 to Gemini Batch API (50% off).")
    parser.add_argument("--dry-run", action="store_true", help="Build JSONL without uploading.")
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"Model ID (default: {DEFAULT_MODEL}).")
    args = parser.parse_args()

    load_dotenv(REPO_ROOT / ".env")
    prompt_text = parse_room5()
    ref_b64 = encode_ref_jpeg(REF_IMAGE)

    req_obj = {
        "customId": "aq_room_05_boss_sanctum",
        "request": {
            "model": args.model,
            "contents": [
                {
                    "parts": [
                        {"text": prompt_text},
                        {"inlineData": {"mimeType": "image/jpeg", "data": ref_b64}},
                    ]
                }
            ],
            "generationConfig": {
                "responseModalities": ["IMAGE"],
                "imageConfig": {
                    "aspectRatio": "16:9",
                    "imageSize": "4K",
                },
            },
        },
    }
    OUTPUT_JSONL.write_text(json.dumps(req_obj, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote 1 style-anchored 4K batch request -> {OUTPUT_JSONL.name} ({OUTPUT_JSONL.stat().st_size // 1024} KB)")
    print(f"  Prompt chars: {len(prompt_text)} | Ref: {REF_IMAGE.name}")

    if args.dry_run:
        print("Dry-run complete.")
        return 0

    if not os.getenv("GEMINI_API_KEY"):
        print("ERROR: GEMINI_API_KEY missing in .env", file=sys.stderr)
        return 1

    client = genai.Client()
    uploaded = client.files.upload(
        file=str(OUTPUT_JSONL),
        config=types.UploadFileConfig(mime_type="application/jsonl"),
    )
    print(f"Uploaded File URI: {uploaded.name}")

    job = client.batches.create(
        model=args.model,
        src=uploaded.name,
        config=types.CreateBatchJobConfig(display_name="rod-room5-style-anchored"),
    )

    print("\n" + "=" * 64)
    print("ROOM 5 ANCHORED BATCH SUBMITTED (50% BATCH TIER)!")
    print(f"Job Code : {job.name}")
    print(f"Job State: {job.state.name}")
    print(f"Download : python imageprompts/batch/download_dungeon_fix4_batch.py {job.name}")
    print("=" * 64)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
