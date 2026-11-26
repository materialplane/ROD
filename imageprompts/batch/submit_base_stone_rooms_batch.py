"""Build & submit the 8 Base Stone-Brick Dungeon 16:9 room prompts (pure text-only, Pro 3 4K) to Gemini Batch API (50% off)."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types

REPO_ROOT = Path(__file__).resolve().parents[2]
PROMPTS_FILE = REPO_ROOT / "imageprompts" / "base-stone-brick-deck.txt"
JSONL_PATH = Path(__file__).resolve().parent / "base_stone_rooms_batch.jsonl"
DEFAULT_MODEL = "models/gemini-3-pro-image"


def extract_room_prompts(prompts_path: Path) -> list[tuple[str, str]]:
    """Extract the 8 16:9 Stone-Brick Room prompts (blocks[5..12]) from base-stone-brick-deck.txt."""
    text = prompts_path.read_text(encoding="utf-8")
    blocks = [
        m.group(1).strip()
        for m in re.finditer(
            r"---\s*COPY-PASTE PROMPT START\s*---\s*\r?\n([\s\S]*?)\r?\n---\s*COPY-PASTE PROMPT END\s*---",
            text,
        )
    ]
    if len(blocks) < 13:
        raise ValueError(f"Expected at least 13 prompt blocks in {prompts_path}, found {len(blocks)}")

    rooms: list[tuple[str, str]] = []
    for idx in range(1, 9):
        body = blocks[4 + idx]
        if not body.startswith("16:9 "):
            raise ValueError(f"Room block R{idx} does not start with 16:9: {body[:60]!r}")
        rooms.append((f"room_{idx:02d}", body))
    return rooms


def main() -> int:
    parser = argparse.ArgumentParser(description="Submit the 8 Base Stone-Brick 16:9 Rooms to Gemini Batch API (50% off).")
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"Gemini model ID (default: {DEFAULT_MODEL}).")
    parser.add_argument("--dry-run", action="store_true", help="Write JSONL and validate without calling API.")
    args = parser.parse_args()

    load_dotenv(REPO_ROOT / ".env")
    items = extract_room_prompts(PROMPTS_FILE)

    lines: list[str] = []
    for slug, prompt_text in items:
        req_obj = {
            "customId": slug,
            "request": {
                "model": args.model,
                "contents": [{"parts": [{"text": prompt_text}]}],
                "generationConfig": {
                    "responseModalities": ["IMAGE"],
                    "imageConfig": {
                        "aspectRatio": "16:9",
                        "imageSize": "4K",
                    },
                },
            },
        }
        lines.append(json.dumps(req_obj, ensure_ascii=False))

    JSONL_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {len(lines)} pure text-only 16:9 4K room requests -> {JSONL_PATH}")
    for slug, prompt_text in items:
        print(f"  - {slug}: {len(prompt_text)} chars")

    if args.dry_run:
        print("Dry-run complete (skipped API submission).")
        return 0

    if not os.getenv("GEMINI_API_KEY"):
        print("ERROR: GEMINI_API_KEY missing in .env", file=sys.stderr)
        return 1

    client = genai.Client()
    print(f"Uploading {JSONL_PATH.name} to Google Gemini Files API...")
    uploaded = client.files.upload(
        file=str(JSONL_PATH),
        config=types.UploadFileConfig(mime_type="application/jsonl"),
    )
    print(f"Uploaded File URI: {uploaded.name}")

    job = client.batches.create(
        model=args.model,
        src=uploaded.name,
        config=types.CreateBatchJobConfig(display_name="rod-base-stone-rooms-8x16x9-4k"),
    )

    print("\n" + "=" * 64)
    print("BASE STONE-BRICK 8x ROOMS BATCH JOB SUBMITTED!")
    print(f"Job Code : {job.name}")
    print(f"Job State: {job.state.name}")
    print(f"Model    : {args.model}")
    print(f"Items    : {len(items)} (16:9, 4K, 50% batch discount, 0 ref images)")
    print(f"Download : python imageprompts/batch/download_card_delve_batch.py {job.name}")
    print("=" * 64)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
