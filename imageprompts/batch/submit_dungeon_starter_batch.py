"""Parse Theme #1 5-room kit, 2x2 props sheet, and battle stage and submit text-only to Gemini Batch API (50% off)."""

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
ROOMS_FILE = REPO_ROOT / "imageprompts" / "dungeon-rooms-aqueduct.txt"
PROPS_FILE = REPO_ROOT / "imageprompts" / "dungeon-props.txt"
STAGE_FILE = REPO_ROOT / "imageprompts" / "dungeon-battle-scenes.txt"
OUTPUT_JSONL = Path(__file__).resolve().parent / "dungeon_starter_batch.jsonl"
DEFAULT_MODEL = "models/gemini-3-pro-image"


def parse_rooms() -> list[tuple[str, str, str]]:
    text = ROOMS_FILE.read_text(encoding="utf-8")
    pattern = re.compile(
        r"ROOM\s+\d+\s+OF\s+\d+\s+\(([^)]+)\).*?---\s*COPY PROMPT START\s*---\s*\n(.*?)\n---\s*COPY PROMPT END",
        re.DOTALL,
    )
    matches = pattern.findall(text)
    if len(matches) != 5:
        raise ValueError(f"Expected 5 rooms in {ROOMS_FILE}, found {len(matches)}")
    return [(slug.strip(), body.strip(), "16:9") for slug, body in matches]


def parse_stage() -> list[tuple[str, str, str]]:
    text = STAGE_FILE.read_text(encoding="utf-8")
    pattern = re.compile(
        r"DUNGEON STAGE\s+\d+\s+\(([^)]+)\).*?---\s*COPY PROMPT START\s*---\s*\n(.*?)\n---\s*COPY PROMPT END",
        re.DOTALL,
    )
    matches = pattern.findall(text)
    if len(matches) != 1:
        raise ValueError(f"Expected 1 dungeon battle stage in {STAGE_FILE}, found {len(matches)}")
    return [(slug.strip(), body.strip(), "16:9") for slug, body in matches]


def parse_props() -> list[tuple[str, str, str]]:
    text = PROPS_FILE.read_text(encoding="utf-8")
    m = re.search(r"---\s*DUNGEON PROPS 2x2 SHEET START\s*---\s*\n(.*?)\n---\s*DUNGEON PROPS 2x2 SHEET END", text, re.DOTALL)
    if not m:
        raise ValueError(f"Missing 2x2 props block in {PROPS_FILE}")
    return [("dungeon_props_2x2", m.group(1).strip(), "1:1")]


def build_jsonl(entries: list[tuple[str, str, str]], model: str, out_path: Path) -> None:
    lines: list[str] = []
    for slug, prompt_text, aspect in entries:
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
        lines.append(json.dumps(req_obj, ensure_ascii=False))
    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {len(lines)} text-only 4K batch request(s) -> {out_path} ({out_path.stat().st_size / 1024:.1f} KB)")


def main() -> int:
    parser = argparse.ArgumentParser(description="Submit ROD Dungeon Starter Pack (5 rooms + 2x2 props + 1 stage) to Gemini Batch API (50% off).")
    parser.add_argument("--dry-run", action="store_true", help="Validate and write JSONL without uploading.")
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"Model ID (default: {DEFAULT_MODEL}).")
    args = parser.parse_args()

    load_dotenv(REPO_ROOT / ".env")
    entries = parse_rooms() + parse_props() + parse_stage()
    build_jsonl(entries, args.model, OUTPUT_JSONL)

    for slug, body, aspect in entries:
        print(f"  - {slug:32s} [{aspect}] ({len(body)} chars)")

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
        config=types.CreateBatchJobConfig(display_name="rod-dungeon-starter-7pack"),
    )

    print("\n" + "=" * 64)
    print("DUNGEON STARTER BATCH JOB SUBMITTED (50% BATCH TIER)!")
    print(f"Job Code : {job.name}")
    print(f"Job State: {job.state.name}")
    print(f"Model    : {args.model}")
    print(f"Items    : 5 Rooms (16:9 4K) + 1 2x2 Props Sheet (1:1 4K) + 1 Stage (16:9 4K)")
    print(f"Download : python imageprompts/batch/download_dungeon_starter_batch.py {job.name}")
    print("=" * 64)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
