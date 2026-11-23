"""Submit 4x4 card prompt sheets (weapon-abilities, magic-tiers, etc.) to Google Gemini Batch API (50% discount)."""

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
BATCH_DIR = Path(__file__).resolve().parent
DEFAULT_MODEL = "models/gemini-3-pro-image"

CARD_SETS = {
    "weapon_abilities": {
        "prompts_file": REPO_ROOT / "imageprompts" / "weapon-abilities.txt",
        "jsonl_file": BATCH_DIR / "weapon_abilities_batch.jsonl",
        "sheet_prefix": "rod_weapon_abilities_sheet",
        "display_prefix": "rod-weapon-abilities",
        "out_dir_rel": "assets/weapon_abilities/batch_sheets",
    },
    "magic_tiers": {
        "prompts_file": REPO_ROOT / "imageprompts" / "magic-tiers.txt",
        "jsonl_file": BATCH_DIR / "magic_tiers_batch.jsonl",
        "sheet_prefix": "rod_magic_tiers_sheet",
        "display_prefix": "rod-magic-tiers",
        "out_dir_rel": "assets/magic_tiers/batch_sheets",
    },
    "conditions": {
        "prompts_file": REPO_ROOT / "imageprompts" / "conditions.txt",
        "jsonl_file": BATCH_DIR / "conditions_batch.jsonl",
        "sheet_prefix": "rod_conditions_sheet",
        "display_prefix": "rod-conditions",
        "out_dir_rel": "assets/conditions/batch_sheets",
    },
}


def parse_sheet_selection(raw_args: list[str] | None) -> set[int] | None:
    """Parse --sheets arguments such as ['1-2'] or ['1']. Defaults to None (all sheets)."""
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


def parse_prompt_sheets(prompts_path: Path, sheet_prefix: str, selected: set[int] | None) -> list[tuple[str, str, int]]:
    """Parse SHEET XX OF YY blocks and validate 16 Row/Col prompts each."""
    if not prompts_path.exists():
        raise FileNotFoundError(f"Missing prompt sheets file: {prompts_path}")

    text = prompts_path.read_text(encoding="utf-8")
    pattern = re.compile(
        r"SHEET\s+(\d+)\s+OF\s+\d+\s+—\s+([^\n]+)\n=+.*?--- COPY-PASTE PROMPT START ---\n(.*?)\n--- COPY-PASTE PROMPT END ---",
        re.DOTALL,
    )
    matches = pattern.findall(text)
    if not matches:
        raise ValueError(f"No valid 4x4 sheet blocks found in {prompts_path}")

    sheets: list[tuple[str, str, int]] = []
    for num_str, summary, body in matches:
        num = int(num_str)
        if selected is not None and num not in selected:
            continue
        clean_body = body.strip()
        rows = [ln for ln in clean_body.splitlines() if re.match(r"^-\s*Row\s+[1-4]\s+Col\s+[1-4]\s*:", ln.strip())]
        if len(rows) != 16:
            raise ValueError(f"Sheet {num:02d} has {len(rows)} row descriptions (expected 16).")
        sheet_id = f"{sheet_prefix}_{num:02d}"
        print(f"  Parsed {sheet_id} ({len(rows)} cards): {summary.strip()}")
        sheets.append((sheet_id, clean_body, num))

    return sheets


def build_jsonl(sheets: list[tuple[str, str, int]], model: str, out_path: Path) -> None:
    """Write validated 4x4 sheet requests to Gemini Batch JSONL."""
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
    print(f"Wrote {len(lines)} batch request(s) ({len(lines) * 16} cards, model={model}, 1:1 4K) -> {out_path} ({kb:.1f} KB)")


def main() -> int:
    parser = argparse.ArgumentParser(description="Submit validated 4x4 card prompt sheets to Gemini Batch API (50% off).")
    parser.add_argument("--set", required=True, choices=sorted(CARD_SETS.keys()), help="Prompt sheet set to build/submit.")
    parser.add_argument("--dry-run", action="store_true", help="Build JSONL and verify rows without calling the API.")
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"Gemini image model (default: {DEFAULT_MODEL}).")
    parser.add_argument("--sheets", nargs="*", default=None, help="Optional sheet subset (e.g. --sheets 1 2).")
    args = parser.parse_args()

    cfg = CARD_SETS[args.set]
    load_dotenv(REPO_ROOT / ".env")
    selected = parse_sheet_selection(args.sheets)
    sheets = parse_prompt_sheets(cfg["prompts_file"], cfg["sheet_prefix"], selected)

    if not sheets:
        print("ERROR: No matching sheets found for selection.", file=sys.stderr)
        return 1

    jsonl_path: Path = cfg["jsonl_file"]
    if selected is not None:
        jsonl_path = jsonl_path.with_name(f"{jsonl_path.stem}_selected.jsonl")
    build_jsonl(sheets, args.model, jsonl_path)

    if args.dry_run:
        for ln in [r for r in sheets[0][1].splitlines() if r.startswith("- Row 1 ")][:2]:
            print("  Sample:", ln[:120] + ("..." if len(ln) > 120 else ""))
        print(f"Dry-run complete for '{args.set}' (skipped API submission).")
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
    span = "-".join(str(n) for n in nums)
    display_name = f"{cfg['display_prefix']}-{span}"
    print(f"Submitting Batch Job ({args.model}, 1:1 4K, 50% batch tier)...")
    job = client.batches.create(
        model=args.model,
        src=uploaded.name,
        config=types.CreateBatchJobConfig(display_name=display_name),
    )

    print("\n" + "=" * 64)
    print(f"BATCH JOB SUBMITTED ({args.set})!")
    print(f"Job Code : {job.name}")
    print(f"Job State: {job.state.name}")
    print(f"Model    : {args.model}")
    print(f"Sheets   : {len(sheets)} x 4x4 sheets ({len(sheets) * 16} cards)")
    print(f"Download : python imageprompts/batch/download_4x4_cards_batch.py --set {args.set} {job.name}")
    print("=" * 64)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
