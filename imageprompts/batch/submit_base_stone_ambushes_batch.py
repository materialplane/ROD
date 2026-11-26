"""Build & submit Sheet 5 (4x Ambush 9:16 2x2 sheet, pure text-only, Pro 3 4K) to Gemini Batch API (50% off)."""

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
JSONL_PATH = Path(__file__).resolve().parent / "base_stone_ambushes_batch.jsonl"
DEFAULT_MODEL = "models/gemini-3-pro-image"


def extract_sheet5_prompt(prompts_path: Path) -> str:
    """Extract Sheet 5 (Ambush 2x2 grid, blocks[13]) from base-stone-brick-deck.txt."""
    text = prompts_path.read_text(encoding="utf-8")
    blocks = [
        m.group(1).strip()
        for m in re.finditer(
            r"---\s*COPY-PASTE PROMPT START\s*---\s*\r?\n([\s\S]*?)\r?\n---\s*COPY-PASTE PROMPT END\s*---",
            text,
        )
    ]
    if len(blocks) < 14:
        raise ValueError(f"Expected 14 prompt blocks in {prompts_path}, found {len(blocks)}")
    prompt_text = blocks[13]
    if not prompt_text.startswith("9:16 ") or 'Title: "Ambush"' not in prompt_text:
        raise ValueError("Block 13 does not appear to be the verified 9:16 Ambush 2x2 sheet prompt.")
    return prompt_text


def main() -> int:
    parser = argparse.ArgumentParser(description="Submit Sheet 5 Ambush 2x2 card sheet to Gemini Batch API (50% off).")
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"Gemini model ID (default: {DEFAULT_MODEL}).")
    parser.add_argument("--dry-run", action="store_true", help="Write JSONL and validate without calling API.")
    args = parser.parse_args()

    load_dotenv(REPO_ROOT / ".env")
    prompt_text = extract_sheet5_prompt(PROMPTS_FILE)

    req_obj = {
        "customId": "base_cards_05_ambushes_9x16",
        "request": {
            "model": args.model,
            "contents": [{"parts": [{"text": prompt_text}]}],
            "generationConfig": {
                "responseModalities": ["IMAGE"],
                "imageConfig": {
                    "aspectRatio": "9:16",
                    "imageSize": "4K",
                },
            },
        },
    }

    JSONL_PATH.write_text(json.dumps(req_obj, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote 1 pure text-only 9:16 4K request ({len(prompt_text)} chars) -> {JSONL_PATH}")

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
        config=types.CreateBatchJobConfig(display_name="rod-base-stone-ambushes-sheet5-4k"),
    )

    print("\n" + "=" * 64)
    print("SHEET 5 (AMBUSH 2x2) BATCH JOB SUBMITTED!")
    print(f"Job Code : {job.name}")
    print(f"Job State: {job.state.name}")
    print(f"Model    : {args.model}")
    print("Tier     : 50% Batch Discount (9:16, 4K, 0 reference images)")
    print(f"Download : python imageprompts/batch/download_card_delve_batch.py {job.name}")
    print("=" * 64)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
