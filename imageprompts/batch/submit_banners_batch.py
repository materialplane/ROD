"""Parse the 4x4 Ethorian Faction & Reserve Banner sheet from imageprompts/faction.banners.txt and submit to Google Gemini Batch API (50% discount)."""

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
BANNERS_FILE = REPO_ROOT / "imageprompts" / "faction.banners.txt"
OUTPUT_JSONL = Path(__file__).resolve().parent / "faction_banners_batch.jsonl"
DEFAULT_MODEL = "models/gemini-3-pro-image"


def sanitize_prompt_for_ai(body: str) -> str:
    """Strip human-only banner/section labels so the AI receives pure visual cloth & emblem descriptions."""
    out_lines: list[str] = []
    for raw in body.splitlines():
        line = raw.strip()
        # Strip 'ROW 1 (...):' -> 'ROW 1:'
        line = re.sub(r"^(ROW\s+\d+)\s*\([^)]+\)\s*:", r"\1:", line)
        # Strip '- Row 1 Col 1 (Highcrown Loyalists): desc' -> '- Row 1 Col 1: desc'
        line = re.sub(r"^(-\s*Row\s+\d+\s+Col\s+\d+)\s*\([^)]+\)\s*:", r"\1:", line)
        out_lines.append(line)
    return "\n".join(out_lines)


def parse_banner_sheet(prompts_path: Path) -> tuple[str, str]:
    """Parse SECTION A 4x4 banner sheet and validate all 16 distinct banner rows."""
    text = prompts_path.read_text(encoding="utf-8")
    marker = "SECTION A:"
    idx = text.find(marker)
    if idx == -1:
        raise ValueError(f"Could not find '{marker}' in {prompts_path}")

    # Start immediately after the '=====' border beneath SECTION A header
    after_header = text.find("=" * 10, idx)
    if after_header == -1:
        raise ValueError("Missing closing divider below SECTION A header.")
    body = text[after_header:].splitlines()[1:]
    clean_body = "\n".join(body).strip()

    rows = [ln for ln in clean_body.splitlines() if re.match(r"^-\s*Row\s+\d+\s+Col\s+\d+", ln.strip())]
    if len(rows) != 16:
        raise ValueError(f"Expected 16 banner slot lines in SECTION A, found {len(rows)}.")

    ai_prompt = sanitize_prompt_for_ai(clean_body)
    return ("rod_faction_banners_sheet_a", ai_prompt)


def main() -> int:
    parser = argparse.ArgumentParser(description="Build & submit ROD 4x4 Faction Banner sheet to Gemini Batch API.")
    parser.add_argument("--dry-run", action="store_true", help="Only build JSONL without submitting to Gemini Batch API.")
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"Gemini image model (default: {DEFAULT_MODEL}).")
    args = parser.parse_args()

    load_dotenv(REPO_ROOT / ".env")
    sheet_id, prompt_text = parse_banner_sheet(BANNERS_FILE)

    req_obj = {
        "customId": sheet_id,
        "request": {
            "model": args.model,
            "contents": [{"parts": [{"text": prompt_text}]}],
            "generationConfig": {
                "responseModalities": ["IMAGE"],
                "imageConfig": {
                    "aspectRatio": "1:1",
                    "imageSize": "4K",
                },
            },
        },
    }
    OUTPUT_JSONL.write_text(json.dumps(req_obj, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote 1 batch request (16 unique banners, model={args.model}, 1:1 4K) -> {OUTPUT_JSONL}")

    if args.dry_run:
        print("Dry-run complete (skipped API upload/submission).")
        return 0

    if not os.getenv("GEMINI_API_KEY"):
        print("ERROR: GEMINI_API_KEY not found in .env", file=sys.stderr)
        return 1

    client = genai.Client()
    print(f"Uploading {OUTPUT_JSONL.name} to Google Gemini Files API...")
    uploaded = client.files.upload(
        file=str(OUTPUT_JSONL),
        config=types.UploadFileConfig(mime_type="application/jsonl"),
    )
    print(f"Uploaded File URI: {uploaded.name}")

    print(f"Submitting Batch Job ({args.model}, 1:1 4K, 50% batch tier)...")
    job = client.batches.create(
        model=args.model,
        src=uploaded.name,
        config=types.CreateBatchJobConfig(display_name="rod-faction-banners-sheet-a"),
    )

    print("\n" + "=" * 64)
    print("BATCH JOB SUBMITTED!")
    print(f"Job Code : {job.name}")
    print(f"Job State: {job.state.name}")
    print(f"Model    : {args.model}")
    print("Sheets   : 1 x 4x4 sheet (16 unique faction & reserve banners)")
    print("=" * 64)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
