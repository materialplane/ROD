"""Parse 4x4 Overworld Location & Quest Marker sheets from imageprompts/location-markers.txt & quest-markers.txt and submit to Google Gemini Batch API (50% discount)."""

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
LOCATION_FILE = REPO_ROOT / "imageprompts" / "location-markers.txt"
QUEST_FILE = REPO_ROOT / "imageprompts" / "quest-markers.txt"
OUTPUT_JSONL = Path(__file__).resolve().parent / "map_markers_batch.jsonl"
DEFAULT_MODEL = "models/gemini-3-pro-image"


def sanitize_prompt_for_ai(body: str) -> str:
    """Strip human-only slot titles from marker prompts so the AI only receives pure visual descriptions."""
    out_lines: list[str] = []
    for ln in body.splitlines():
        # Convert '- (1,1) SOME TITLE [Steel Ring]: desc' -> '- (1,1) [Steel Ring]: desc'
        cleaned = re.sub(
            r"^(-\s*\(\d,\d\))\s+.*?(\[(?:Bronze|Steel|Iron|Obsidian)\s+Ring\]\s*:)",
            r"\1 \2",
            ln.strip(),
        )
        out_lines.append(cleaned)
    return "\n".join(out_lines)


def parse_sheet_blocks(
    prompts_path: Path,
    prefix: str,
    selected_letters: set[str] | None = None,
) -> list[tuple[str, str]]:
    """Parse SECTION B 4x4 sheets (e.g., LOCATION SHEET A, QUEST SHEET A) and validate 16 tokens each."""
    text = prompts_path.read_text(encoding="utf-8")
    pattern = re.compile(
        rf"={{10,}}\s*\n({re.escape(prefix)}\s+SHEET\s+([A-Z0-9]+)\s*\([^)]+\):[^\n]*)\n={{10,}}\s*\n(.*?)(?=\n={{10,}}\s*\n{re.escape(prefix)}\s+SHEET|\Z)",
        re.DOTALL,
    )
    matches = pattern.findall(text)
    if not matches:
        raise ValueError(f"No '{prefix} SHEET ...' sections found in {prompts_path}")

    sheets: list[tuple[str, str]] = []
    for header_line, letter, body in matches:
        tag = letter.upper()
        if selected_letters is not None and tag not in selected_letters:
            continue
        clean_body = body.strip()
        if "4x4" not in clean_body.lower() or "16 " not in clean_body:
            raise ValueError(f"{prefix} Sheet {tag} failed 4x4 (16 tokens) validation check.")
        token_rows = [ln for ln in clean_body.splitlines() if re.match(r"^-\s*\(\d,\d\)\s+", ln.strip())]
        if len(token_rows) != 16:
            raise ValueError(f"{prefix} Sheet {tag} has {len(token_rows)} token rows (expected exactly 16).")
        ai_prompt = sanitize_prompt_for_ai(clean_body)
        sheet_id = f"rod_{prefix.lower()}_markers_sheet_{tag.lower()}"
        print(f"  Parsed {sheet_id}: {header_line} ({len(token_rows)} tokens, titles stripped)")
        sheets.append((sheet_id, ai_prompt))

    return sheets


def build_jsonl(sheets: list[tuple[str, str]], model: str, out_path: Path) -> None:
    """Write validated 4x4 sheet batch requests to JSONL."""
    lines: list[str] = []
    for sheet_id, prompt_text in sheets:
        req_obj = {
            "customId": sheet_id,
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
    print(f"Wrote {len(lines)} batch requests ({len(lines) * 16} total tokens, model={model}) -> {out_path}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Build & submit ROD 4x4 Location & Quest Marker sheets to Gemini Batch API.")
    parser.add_argument("--dry-run", action="store_true", help="Only build JSONL without submitting to Gemini Batch API.")
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"Gemini image model (default: {DEFAULT_MODEL}).")
    parser.add_argument("--location-sheets", nargs="*", default=None, help="Location sheet IDs to include (e.g. A B C).")
    parser.add_argument("--quest-sheets", nargs="*", default=None, help="Quest sheet IDs to include (e.g. A).")
    args = parser.parse_args()

    load_dotenv(REPO_ROOT / ".env")
    sheets: list[tuple[str, str]] = []

    loc_sel = {s.upper() for s in args.location_sheets} if args.location_sheets is not None else None
    quest_sel = {s.upper() for s in args.quest_sheets} if args.quest_sheets is not None else None

    if args.location_sheets is None and args.quest_sheets is None:
        sheets.extend(parse_sheet_blocks(LOCATION_FILE, "LOCATION", None))
        sheets.extend(parse_sheet_blocks(QUEST_FILE, "QUEST", None))
    else:
        if loc_sel:
            sheets.extend(parse_sheet_blocks(LOCATION_FILE, "LOCATION", loc_sel))
        if quest_sel:
            sheets.extend(parse_sheet_blocks(QUEST_FILE, "QUEST", quest_sel))

    if not sheets:
        print("ERROR: No matching sheets selected.", file=sys.stderr)
        return 1

    is_subset = args.location_sheets is not None or args.quest_sheets is not None
    jsonl_path = OUTPUT_JSONL.with_name("map_markers_batch_selected.jsonl") if is_subset else OUTPUT_JSONL
    build_jsonl(sheets, args.model, jsonl_path)

    if args.dry_run:
        print("Dry-run complete (skipped API upload/submission).")
        return 0

    if not os.getenv("GEMINI_API_KEY"):
        print("ERROR: GEMINI_API_KEY not found in .env", file=sys.stderr)
        return 1

    client = genai.Client()
    print(f"Uploading {jsonl_path.name} to Google Gemini Files API...")
    uploaded = client.files.upload(
        file=str(jsonl_path),
        config=types.UploadFileConfig(mime_type="application/jsonl"),
    )
    print(f"Uploaded File URI: {uploaded.name}")

    label = "rod-markers-" + "-".join(s[0].split("_")[-1] for s in sheets)
    print(f"Submitting Batch Job ({args.model}, 1:1 4K, 50% batch tier)...")
    job = client.batches.create(
        model=args.model,
        src=uploaded.name,
        config=types.CreateBatchJobConfig(display_name=label),
    )

    print("\n" + "=" * 64)
    print("BATCH JOB SUBMITTED!")
    print(f"Job Code : {job.name}")
    print(f"Job State: {job.state.name}")
    print(f"Model    : {args.model}")
    print(f"Sheets   : {len(sheets)} x 4x4 sheets ({len(sheets) * 16} tokens)")
    print("=" * 64)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
