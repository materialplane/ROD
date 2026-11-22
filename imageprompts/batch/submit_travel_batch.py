"""Parse standalone 4x4 Travel & Ferry circular token sheets (ferries.txt / travel-4dir.txt) and submit text-only to Gemini Batch API (50% off)."""

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
FERRIES_FILE = REPO_ROOT / "imageprompts" / "ferries.txt"
TRAVEL_4DIR_FILE = REPO_ROOT / "imageprompts" / "travel-4dir.txt"
OUTPUT_JSONL = Path(__file__).resolve().parent / "travel_tokens_batch.jsonl"
DEFAULT_MODEL = "models/gemini-3-pro-image"


def extract_block(path: Path, start_marker: str, end_marker: str) -> str:
    """Extract the prompt text between explicit START/END markers."""
    text = path.read_text(encoding="utf-8")
    pattern = re.compile(rf"{re.escape(start_marker)}\s*\n(.*?)\n{re.escape(end_marker)}", re.DOTALL)
    m = pattern.search(text)
    if not m:
        raise ValueError(f"Could not find {start_marker} .. {end_marker} in {path}")
    return m.group(1).strip()


def sanitize_slot_titles(body: str) -> str:
    """Strip human-only slot labels before [Ring]: and ROW section banners so no titles print onto art."""
    out_lines: list[str] = []
    for raw in body.splitlines():
        ln = raw.strip()
        if re.match(r"^ROW\s+\d+\s+[—-]", ln):
            continue
        cleaned = re.sub(
            r"^(-\s*\(\d,\d\))\s+.*?(\[(?:Bronze|Steel|Iron|Obsidian)\s+Ring\]\s*:)",
            r"\1 \2",
            ln,
        )
        out_lines.append(cleaned)
    return "\n".join(out_lines)


def build_requests(selected: list[str]) -> list[tuple[str, str]]:
    """Load selected 4x4 sheets and validate exact 16-slot structure."""
    sheets: list[tuple[str, str]] = []
    if "ferries" in selected:
        raw = extract_block(
            FERRIES_FILE,
            "--- FERRY CROSSING TOKENS 4x4 SHEET START ---",
            "--- FERRY CROSSING TOKENS 4x4 SHEET END ---",
        )
        token_rows = [ln for ln in raw.splitlines() if re.match(r"^-\s*\(\d,\d\)\s+", ln.strip())]
        if len(token_rows) != 16:
            raise ValueError(f"ferries.txt has {len(token_rows)} slots (expected 16).")
        sheets.append(("rod_travel_ferries_4x4", sanitize_slot_titles(raw)))

    if "travel4dir" in selected:
        raw = extract_block(
            TRAVEL_4DIR_FILE,
            "--- TRAVEL 4-DIRECTION SHEET START ---",
            "--- TRAVEL 4-DIRECTION SHEET END ---",
        )
        token_rows = [ln for ln in raw.splitlines() if re.match(r"^-\s*\(\d,\d\)\s+", ln.strip())]
        if len(token_rows) != 16:
            raise ValueError(f"travel-4dir.txt has {len(token_rows)} slots (expected 16).")
        sheets.append(("rod_travel_4dir_sheet", sanitize_slot_titles(raw)))

    return sheets


def write_jsonl(sheets: list[tuple[str, str]], model: str, out_path: Path) -> None:
    """Write validated standalone text-only 1:1 4K Batch JSONL."""
    lines: list[str] = []
    for custom_id, prompt_text in sheets:
        req_obj = {
            "customId": custom_id,
            "request": {
                "model": model,
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
        lines.append(json.dumps(req_obj, ensure_ascii=False))
    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate & submit ROD 4x4 travel token sheets to Gemini Batch API (50% off).")
    parser.add_argument("--sheets", nargs="+", choices=["ferries", "travel4dir"], default=["ferries"], help="Which travel sheet(s) to queue.")
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"Gemini model (default: {DEFAULT_MODEL}).")
    parser.add_argument("--dry-run", action="store_true", help="Build JSONL and validate without submitting.")
    args = parser.parse_args()

    load_dotenv(REPO_ROOT / ".env")
    sheets = build_requests(args.sheets)
    write_jsonl(sheets, args.model, OUTPUT_JSONL)
    for cid, text in sheets:
        print(f"Prepared {cid} (16 slots, standalone text-only, {len(text):,} chars) -> {OUTPUT_JSONL.name}")

    if args.dry_run:
        print("Dry-run complete (skipped Gemini Batch API upload/submission).")
        return 0

    if not os.getenv("GEMINI_API_KEY"):
        print("ERROR: GEMINI_API_KEY not found in .env", file=sys.stderr)
        return 1

    client = genai.Client()
    uploaded = client.files.upload(
        file=str(OUTPUT_JSONL),
        config=types.UploadFileConfig(mime_type="application/jsonl"),
    )
    print(f"Uploaded JSONL URI: {uploaded.name}")
    job = client.batches.create(
        model=args.model,
        src=uploaded.name,
        config=types.CreateBatchJobConfig(display_name="rod-travel-" + "-".join(args.sheets)),
    )
    print(f"Submitted Batch Job: {job.name} (State: {job.state.name})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
