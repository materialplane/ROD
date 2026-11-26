"""Build & submit the 3 Base Stone-Brick Dungeon Battlegrounds (pure text-only, Pro 3 4K 16:9) to Gemini Batch API (50% off)."""

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
PROMPTS_FILE = REPO_ROOT / "imageprompts" / "dungeon-battle-scenes.txt"
JSONL_PATH = Path(__file__).resolve().parent / "base_stone_battlegrounds_batch.jsonl"
DEFAULT_MODEL = "models/gemini-3-pro-image"

TARGETS = [
    ("dungeon_02_stone_hearth_arena", 1),
    ("dungeon_03_basalt_vault_arena", 2),
    ("dungeon_04_moss_cistern_arena", 3),
]


def extract_battleground_prompts(prompts_path: Path) -> list[tuple[str, str]]:
    """Extract the 3 Base Stone-Brick Battleground prompts (blocks[1..3]) from dungeon-battle-scenes.txt."""
    text = prompts_path.read_text(encoding="utf-8")
    blocks = [
        m.group(1).strip()
        for m in re.finditer(
            r"---\s*COPY PROMPT START[^\n]*---\s*\r?\n([\s\S]*?)\r?\n---\s*COPY PROMPT END[^\n]*---",
            text,
        )
    ]
    if len(blocks) < 4:
        raise ValueError(f"Expected 4 battleground prompt blocks in {prompts_path}, found {len(blocks)}")

    out: list[tuple[str, str]] = []
    for slug, idx in TARGETS:
        body = blocks[idx]
        if not body.startswith("16:9 ") or "BATTLESCENE MANDATE:" not in body:
            raise ValueError(f"Invalid battleground prompt for {slug}: missing 16:9 or BATTLESCENE MANDATE")
        out.append((slug, body))
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description="Submit the 3 Base Stone-Brick Battlegrounds to Gemini Batch API (50% off).")
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"Gemini model ID (default: {DEFAULT_MODEL}).")
    parser.add_argument("--dry-run", action="store_true", help="Write JSONL and validate without calling API.")
    args = parser.parse_args()

    load_dotenv(REPO_ROOT / ".env")
    items = extract_battleground_prompts(PROMPTS_FILE)

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
    print(f"Wrote {len(lines)} pure text-only 16:9 4K battleground requests -> {JSONL_PATH}")
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
        config=types.CreateBatchJobConfig(display_name="rod-base-stone-battlegrounds-3x16x9-4k"),
    )

    print("\n" + "=" * 64)
    print("3x BASE STONE-BRICK BATTLEGROUNDS BATCH JOB SUBMITTED!")
    print(f"Job Code : {job.name}")
    print(f"Job State: {job.state.name}")
    print(f"Model    : {args.model}")
    print("Tier     : 50% Batch Discount (16:9, 4K, 0 reference images)")
    print(f"Download : python imageprompts/batch/download_battle_scenes_batch.py {job.name}")
    print("=" * 64)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
