"""Parse 1:1 4K 6x6 Combat VFX sheets from imageprompts/combat-vfx-overlays.txt and submit to Google Gemini Batch API (50% off)."""

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
VFX_SHEETS_FILE = REPO_ROOT / "imageprompts" / "combat-vfx-overlays.txt"
OUTPUT_JSONL = Path(__file__).resolve().parent / "vfx_6x6_batch.jsonl"
DEFAULT_MODEL = "models/gemini-3-pro-image"


def parse_sheet_selection(raw_args: list[str] | None) -> set[int] | None:
    """Parse --sheets arguments such as ['2-40'] or ['2', '5']. Defaults to None (all sheets)."""
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


def parse_vfx_6x6_sheets(prompts_path: Path, selected: set[int] | None) -> list[tuple[str, str, int]]:
    """Parse SHEET NN OF 40 blocks and verify 6 animated rows (36 keyframes) per sheet."""
    if not prompts_path.exists():
        raise FileNotFoundError(f"Missing VFX prompts file: {prompts_path}")

    text = prompts_path.read_text(encoding="utf-8")
    pattern = re.compile(
        r"SHEET\s+(\d+)\s+OF\s+40\s+\(([^)]+)\).*?---\s*SHEET\s+\d+\s+PROMPT\s+START[^\n]*---\n(.*?)\n---\s*SHEET\s+\d+\s+PROMPT\s+END\s*---",
        re.DOTALL,
    )
    matches = pattern.findall(text)
    if len(matches) != 40:
        raise ValueError(f"Expected 40 VFX sheets in {prompts_path}, found {len(matches)}")

    sheets: list[tuple[str, str, int]] = []
    for num_str, raw_slug, body in matches:
        num = int(num_str)
        if selected is not None and num not in selected:
            continue
        clean_body = body.strip()
        rows = [ln for ln in clean_body.splitlines() if re.match(r"^(?:ROW\s+[1-6]\s+—|Row\s+[1-6],\s+Col\s+1\b)", ln.strip())]
        cols = [ln for ln in clean_body.splitlines() if re.match(r"^(?:-\s*Col\s+[1-6]\b|Row\s+[1-6],\s+Col\s+[1-6]\b)", ln.strip())]
        if len(rows) != 6 or len(cols) != 36:
            raise ValueError(f"Sheet {num:02d} has {len(rows)} rows and {len(cols)} cols (expected 6 rows, 36 cols).")
        sheet_id = raw_slug.strip()
        sheets.append((sheet_id, clean_body, num))

    return sheets


def build_jsonl(sheets: list[tuple[str, str, int]], model: str, out_path: Path) -> None:
    """Write validated 1:1 4K 6x6 VFX sheet requests to Gemini Batch JSONL."""
    lines: list[str] = []
    for sheet_id, prompt_text, _ in sheets:
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
    kb = out_path.stat().st_size / 1024
    print(f"Wrote {len(lines)} batch request(s) ({len(lines) * 6} VFX effects / {len(lines) * 36} frames, model={model}, 1:1 4K) -> {out_path} ({kb:.1f} KB)")


def main() -> int:
    parser = argparse.ArgumentParser(description="Build & submit ROD 1:1 4K 6x6 VFX sheets to Gemini Batch API (50% off).")
    parser.add_argument("--dry-run", action="store_true", help="Only build JSONL and inspect counts without uploading/submitting.")
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"Gemini image model (default: {DEFAULT_MODEL}).")
    parser.add_argument(
        "--sheets",
        nargs="*",
        default=None,
        help="Optional sheet subset (e.g. --sheets 2-40 or --sheets all). Defaults to all 40.",
    )
    args = parser.parse_args()

    load_dotenv(REPO_ROOT / ".env")
    selected = parse_sheet_selection(args.sheets)
    sheets = parse_vfx_6x6_sheets(VFX_SHEETS_FILE, selected)

    if not sheets:
        print("ERROR: No matching sheets found for selection.", file=sys.stderr)
        return 1

    jsonl_path = OUTPUT_JSONL.with_name("vfx_6x6_batch_selected.jsonl") if selected is not None else OUTPUT_JSONL
    build_jsonl(sheets, args.model, jsonl_path)

    if args.dry_run:
        print(f"Sample first: [{sheets[0][2]:02d}] {sheets[0][0]}")
        print(f"Sample last : [{sheets[-1][2]:02d}] {sheets[-1][0]}")
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

    nums = [s[2] for s in sheets]
    span = f"all-{len(nums)}" if len(nums) == 40 else (f"{nums[0]}-{nums[-1]}" if nums == list(range(nums[0], nums[-1] + 1)) else "-".join(str(n) for n in nums))
    display_name = f"rod-vfx-6x6-{span}"
    print(f"Submitting Batch Job ({args.model}, 1:1 4K, 50% batch tier)...")
    job = client.batches.create(
        model=args.model,
        src=uploaded.name,
        config=types.CreateBatchJobConfig(display_name=display_name),
    )

    print("\n" + "=" * 64)
    print("VFX 6x6 BATCH JOB SUBMITTED!")
    print(f"Job Code : {job.name}")
    print(f"Job State: {job.state.name}")
    print(f"Model    : {args.model}")
    print(f"Sheets   : {len(sheets)} x 6x6 sheets ({len(sheets) * 6} effects / {len(sheets) * 36} frames)")
    print(f"Download : python imageprompts/batch/download_vfx_6x6_batch.py {job.name}")
    print("=" * 64)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
