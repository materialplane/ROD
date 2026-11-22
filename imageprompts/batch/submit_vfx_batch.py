"""Parse VFX sprite sheets from imageprompts/combat-vfx-overlays.txt and submit to Gemini Batch API (50% off)."""

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
PROMPTS_FILE = REPO_ROOT / "imageprompts" / "combat-vfx-overlays.txt"
OUTPUT_JSONL = Path(__file__).resolve().parent / "vfx_batch.jsonl"
DEFAULT_MODEL = "models/gemini-3-pro-image"

SHEET_SPECS = {n: (f"vfx_sheet_{n:02d}_6x6", "1:1") for n in range(1, 41)}


def parse_selection(raw_args: list[str] | None) -> set[int] | None:
    """Parse --sheets arguments such as ['4', '5'] or ['3-5']. Returns None for all."""
    if not raw_args:
        return None
    selected: set[int] = set()
    for token in raw_args:
        tok = token.strip().lower()
        if tok == "all":
            return None
        if "-" in tok:
            a_str, b_str = tok.split("-", 1)
            a, b = int(a_str), int(b_str)
            for n in range(min(a, b), max(a, b) + 1):
                selected.add(n)
        else:
            selected.add(int(tok))
    return selected


def parse_vfx_sheets(prompts_path: Path, selected: set[int] | None) -> list[tuple[int, str, str, str]]:
    """Parse SHEET N PROMPT START..END blocks with their target slug and aspect ratio."""
    if not prompts_path.exists():
        raise FileNotFoundError(f"Missing VFX prompts file: {prompts_path}")

    text = prompts_path.read_text(encoding="utf-8")
    pattern = re.compile(
        r"---\s*SHEET\s+(\d+)\s+PROMPT\s+START[^\n]*---\s*\n(.*?)\n---\s*SHEET\s+\1\s+PROMPT\s+END\s*---",
        re.DOTALL,
    )
    matches = pattern.findall(text)
    if not matches:
        raise ValueError(f"No SHEET prompt blocks found in {prompts_path}")

    sheets: list[tuple[int, str, str, str]] = []
    for num_str, body in matches:
        num = int(num_str)
        if selected is not None and num not in selected:
            continue
        if num not in SHEET_SPECS:
            raise ValueError(f"Missing aspect ratio/slug mapping for SHEET {num}")
        slug, aspect = SHEET_SPECS[num]
        clean_body = body.strip()
        if not clean_body:
            raise ValueError(f"SHEET {num} ({slug}) has an empty prompt.")
        sheets.append((num, slug, aspect, clean_body))

    return sheets


def build_jsonl(sheets: list[tuple[int, str, str, str]], model: str, out_path: Path) -> None:
    """Write validated 4K text-only Gemini Batch JSONL requests with per-sheet aspect ratios."""
    lines: list[str] = []
    for _, slug, aspect, prompt_text in sheets:
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
    kb = out_path.stat().st_size / 1024
    print(f"Wrote {len(lines)} VFX batch request(s) (model={model}, 4K) -> {out_path} ({kb:.1f} KB)")


def main() -> int:
    parser = argparse.ArgumentParser(description="Build & submit ROD VFX Sprite Sheets to Gemini Batch API (50% off).")
    parser.add_argument("--dry-run", action="store_true", help="Build JSONL and validate without uploading/submitting.")
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"Gemini image model (default: {DEFAULT_MODEL}).")
    parser.add_argument(
        "--sheets",
        nargs="*",
        default=None,
        help="Optional sheet numbers (e.g. --sheets 4 5). Defaults to all sheets.",
    )
    args = parser.parse_args()

    load_dotenv(REPO_ROOT / ".env")
    selected = parse_selection(args.sheets)
    sheets = parse_vfx_sheets(PROMPTS_FILE, selected)

    if not sheets:
        print("ERROR: No matching sheets found for selection.", file=sys.stderr)
        return 1

    jsonl_path = OUTPUT_JSONL.with_name("vfx_batch_selected.jsonl") if selected is not None else OUTPUT_JSONL
    build_jsonl(sheets, args.model, jsonl_path)

    if args.dry_run:
        for num, slug, aspect, _ in sheets:
            print(f"  [Sheet {num}] {slug} ({aspect} 4K)")
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

    span = "-".join(str(s[0]) for s in sheets)
    display_name = f"rod-vfx-sheets-{span}"
    print(f"Submitting Batch Job ({args.model}, 4K, 50% batch tier)...")
    job = client.batches.create(
        model=args.model,
        src=uploaded.name,
        config=types.CreateBatchJobConfig(display_name=display_name),
    )

    print("\n" + "=" * 64)
    print("VFX SHEETS BATCH JOB SUBMITTED!")
    print(f"Job Code : {job.name}")
    print(f"Job State: {job.state.name}")
    print(f"Model    : {args.model}")
    print(f"Sheets   : {', '.join(f'Sheet {n} ({a})' for n, _, a, _ in sheets)}")
    print(f"Download : python imageprompts/batch/download_vfx_batch.py {job.name}")
    print("=" * 64)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
