"""Submit the 4x4 Dungeon Props variation sheet (1:1 4K) to Gemini Batch API (50% off)."""

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
PROPS_FILE = REPO_ROOT / "imageprompts" / "dungeon-props.txt"
OUTPUT_JSONL = Path(__file__).resolve().parent / "dungeon_props_4x4_batch.jsonl"
DEFAULT_MODEL = "models/gemini-3-pro-image"


def parse_props_4x4() -> tuple[str, str, str]:
    text = PROPS_FILE.read_text(encoding="utf-8")
    m = re.search(
        r"---\s*DUNGEON PROPS 4x4 SHEET START\s*---\s*\n(.*?)\n---\s*DUNGEON PROPS 4x4 SHEET END",
        text,
        re.DOTALL,
    )
    if not m:
        raise ValueError(f"Missing 4x4 props block in {PROPS_FILE}")
    return ("dungeon_props_4x4_v2", m.group(1).strip(), "1:1")


def build_jsonl(entry: tuple[str, str, str], model: str, out_path: Path) -> None:
    slug, prompt_text, aspect = entry
    if not prompt_text:
        raise ValueError(f"Empty prompt body for {slug}")
    req_obj = {
        "customId": slug,
        "request": {
            "model": model,
            "contents": [{"parts": [{"text": prompt_text}]}],
            "generationConfig": {
                "responseModalities": ["IMAGE"],
                "imageConfig": {
                    "aspectRatio": aspect,
                    "imageSize": "4K",
                },
            },
        },
    }
    out_path.write_text(json.dumps(req_obj, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote 1 text-only 4K batch request -> {out_path} ({out_path.stat().st_size / 1024:.1f} KB)")


def main() -> int:
    parser = argparse.ArgumentParser(description="Submit 4x4 Dungeon Props Sheet to Gemini Batch API (50% off).")
    parser.add_argument("--dry-run", action="store_true", help="Validate and write JSONL without submitting.")
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"Model ID (default: {DEFAULT_MODEL}).")
    args = parser.parse_args()

    load_dotenv(REPO_ROOT / ".env")
    entry = parse_props_4x4()
    build_jsonl(entry, args.model, OUTPUT_JSONL)
    print(f"  - {entry[0]} [{entry[2]}] ({len(entry[1])} chars)")

    if args.dry_run:
        print("Dry-run complete (skipped API upload/submission).")
        return 0

    if not os.getenv("GEMINI_API_KEY"):
        print("ERROR: GEMINI_API_KEY missing in .env", file=sys.stderr)
        return 1

    client = genai.Client()
    print(f"Uploading {OUTPUT_JSONL.name} to Google Gemini Files API...")
    uploaded = client.files.upload(
        file=str(OUTPUT_JSONL),
        config=types.UploadFileConfig(mime_type="application/jsonl"),
    )
    print(f"Uploaded File URI: {uploaded.name}")

    job = client.batches.create(
        model=args.model,
        src=uploaded.name,
        config=types.CreateBatchJobConfig(display_name="rod-dungeon-props-4x4"),
    )

    print("\n" + "=" * 64)
    print("4x4 DUNGEON PROPS BATCH JOB SUBMITTED (50% BATCH TIER)!")
    print(f"Job Code : {job.name}")
    print(f"Job State: {job.state.name}")
    print(f"Model    : {args.model}")
    print(f"Download : python imageprompts/batch/download_dungeon_props_4x4_batch.py {job.name}")
    print("=" * 64)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
