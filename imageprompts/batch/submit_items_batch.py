"""Parse all 43 5x5 & 4x4 RPG Item sheets from imageprompts/items/ and submit to Google Gemini Batch API (50% discount)."""

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
ITEMS_DIR = REPO_ROOT / "imageprompts" / "items"
OUTPUT_JSONL = Path(__file__).resolve().parent / "items_batch.jsonl"
SELECTED_JSONL = Path(__file__).resolve().parent / "items_batch_selected.jsonl"
MANIFEST_JSON = Path(__file__).resolve().parent / "items_manifest.json"
DEFAULT_MODEL = "models/gemini-3-pro-image"

START_RE = re.compile(r"^---\s*(.+?START.*?)\s*---\s*$")
END_RE = re.compile(r"^---\s*(.+?END.*?)\s*---\s*$")
ROW_COL_RE = re.compile(r"^(Row\s+\d+,\s*Col\s+\d+)\s*\(([^)]+)\):\s*(.+)$")


def strip_emdash_title_echo(name: str, desc: str) -> str:
    """Remove leading 'Item Title — ' or 'Item Title (Sub) — ' echo before visual description."""
    head, sep, tail = desc.partition(" — ")
    if not sep:
        return desc
    # Only strip when the prefix before ' — ' is clearly the repeating item label
    head_clean = re.sub(r"\s*\([^)]+\)\s*$", "", head).strip()
    first_word = name.split()[0].lower() if name.split() else ""
    if (
        len(head) <= len(name) + 25
        and (head_clean.lower() == name.lower() or (first_word and head_clean.lower().startswith(first_word)))
    ):
        tail_s = tail.strip()
        return (tail_s[0].upper() + tail_s[1:]) if tail_s else desc
    return desc


def sanitize_prompt_for_ai(body: str) -> tuple[str, list[dict[str, str]]]:
    """Strip human item names from Row/Col prefixes & title echoes while collecting slot metadata."""
    out_lines: list[str] = []
    slots: list[dict[str, str]] = []
    for raw in body.splitlines():
        line = raw.strip()
        m = ROW_COL_RE.match(line)
        if m:
            coord, item_name, desc = m.group(1), m.group(2).strip(), m.group(3).strip()
            clean_desc = strip_emdash_title_echo(item_name, desc)
            out_lines.append(f"{coord}: {clean_desc}")
            slots.append({"coord": coord, "name": item_name})
        else:
            out_lines.append(line)
    return "\n".join(out_lines), slots


def make_sheet_id(rel_path: Path, block_idx: int, total_blocks: int) -> str:
    """Generate a clean, deterministic batch customId / filename stem for each item sheet."""
    parts = list(rel_path.with_suffix("").parts)
    # Collapse redundant doubled names like shields/shields -> shields
    if len(parts) == 2 and parts[0] == parts[1]:
        base = f"items_{parts[0]}"
    else:
        base = "items_" + "_".join(parts)
    if total_blocks > 1:
        return f"{base}_sheet{block_idx}"
    return base


def collect_item_sheets(
    categories: set[str] | None = None,
    sheet_ids: set[str] | None = None,
) -> list[dict]:
    """Parse and validate every START..END item sheet prompt under imageprompts/items/."""
    sheets: list[dict] = []
    for path in sorted(ITEMS_DIR.rglob("*.txt")):
        rel = path.relative_to(ITEMS_DIR)
        category = rel.parts[0].lower()
        if categories is not None and category not in categories:
            continue

        lines = path.read_text(encoding="utf-8").splitlines()
        raw_blocks: list[tuple[str, str]] = []
        cur_header: str | None = None
        buf: list[str] = []

        for ln in lines:
            if cur_header is None:
                m_start = START_RE.match(ln.strip())
                if m_start:
                    cur_header = m_start.group(1)
                    buf = []
            else:
                if END_RE.match(ln.strip()):
                    raw_blocks.append((cur_header, "\n".join(buf).strip()))
                    cur_header = None
                    buf = []
                else:
                    buf.append(ln)

        if cur_header is not None:
            raise ValueError(f"Unclosed prompt block '{cur_header}' in {rel}")

        total_blocks = len(raw_blocks)
        for idx, (hdr, body) in enumerate(raw_blocks, start=1):
            custom_id = make_sheet_id(rel, idx, total_blocks)
            if sheet_ids is not None and custom_id not in sheet_ids:
                continue

            if "5x5" in hdr:
                grid = "5x5"
                expected = 25
            elif "4x4" in hdr:
                grid = "4x4"
                expected = 16
            elif "4x2" in hdr:
                grid = "4x2"
                expected = 8
            else:
                raise ValueError(f"Unknown grid size in header '{hdr}' ({rel})")

            aspect_ratio = "16:9" if grid == "4x2" else "1:1"

            ai_prompt, slots = sanitize_prompt_for_ai(body)
            if len(slots) != expected:
                raise ValueError(f"{custom_id} ({rel}) has {len(slots)} slots, expected {expected} ({grid}).")

            sheets.append(
                {
                    "id": custom_id,
                    "source": str(rel).replace("\\", "/"),
                    "category": category,
                    "grid": grid,
                    "aspectRatio": aspect_ratio,
                    "slotCount": len(slots),
                    "slots": slots,
                    "prompt": ai_prompt,
                }
            )
    return sheets


def build_jsonl(sheets: list[dict], model: str, out_path: Path) -> None:
    """Write validated 4K batch requests to JSONL."""
    lines: list[str] = []
    for sh in sheets:
        req_obj = {
            "customId": sh["id"],
            "request": {
                "model": model,
                "contents": [{"parts": [{"text": sh["prompt"]}]}],
                "generationConfig": {
                    "responseModalities": ["IMAGE"],
                    "imageConfig": {
                        "aspectRatio": sh.get("aspectRatio", "1:1"),
                        "imageSize": "4K",
                    },
                },
            },
        }
        lines.append(json.dumps(req_obj, ensure_ascii=False))
    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Build & submit ROD 5x5 & 4x4 item icon sheets to Gemini Batch API.")
    parser.add_argument("--dry-run", action="store_true", help="Write JSONL/manifest only without uploading or submitting.")
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"Gemini image model (default: {DEFAULT_MODEL}).")
    parser.add_argument("--category", nargs="*", default=None, help="Filter category folders (e.g. weapons armor helms).")
    parser.add_argument("--sheets", nargs="*", default=None, help="Filter specific sheet customIds.")
    args = parser.parse_args()

    load_dotenv(REPO_ROOT / ".env")
    cat_filter = {c.lower() for c in args.category} if args.category else None
    sheet_filter = set(args.sheets) if args.sheets else None

    sheets = collect_item_sheets(categories=cat_filter, sheet_ids=sheet_filter)
    if not sheets:
        print("ERROR: No matching item sheets found.", file=sys.stderr)
        return 1

    # Always write full/selected manifest cleanly when running unscoped or scoped
    manifest_payload = [
        {
            "id": sh["id"],
            "source": sh["source"],
            "category": sh["category"],
            "grid": sh["grid"],
            "aspectRatio": sh.get("aspectRatio", "1:1"),
            "slotCount": sh["slotCount"],
            "slots": sh["slots"],
        }
        for sh in sheets
    ]
    if not cat_filter and not sheet_filter:
        MANIFEST_JSON.write_text(json.dumps(manifest_payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    out_jsonl = SELECTED_JSONL if (cat_filter or sheet_filter) else OUTPUT_JSONL
    build_jsonl(sheets, args.model, out_jsonl)

    n5 = sum(1 for s in sheets if s["grid"] == "5x5")
    n4 = sum(1 for s in sheets if s["grid"] == "4x4")
    n42 = sum(1 for s in sheets if s["grid"] == "4x2")
    total_slots = sum(s["slotCount"] for s in sheets)
    for sh in sheets:
        print(f"  Queued [{sh['grid']} {sh.get('aspectRatio','1:1')}] {sh['id']} ({sh['slotCount']} slots <- {sh['source']})")
    print(f"Wrote {len(sheets)} batch request(s) ({n5} x 5x5, {n4} x 4x4, {n42} x 4x2, {total_slots} total slots, model={args.model}, 4K) -> {out_jsonl}")

    if args.dry_run:
        print("Dry-run complete (skipped API upload/submission).")
        return 0

    if not os.getenv("GEMINI_API_KEY"):
        print("ERROR: GEMINI_API_KEY missing from .env", file=sys.stderr)
        return 1

    client = genai.Client()
    print(f"Uploading {out_jsonl.name} to Google Gemini Files API...")
    uploaded = client.files.upload(
        file=str(out_jsonl),
        config=types.UploadFileConfig(mime_type="application/jsonl"),
    )
    print(f"Uploaded File URI: {uploaded.name}")

    display_name = f"rod-items-{len(sheets)}-sheets"
    print(f"Submitting Batch Job ({args.model}, 4K, 50% batch tier)...")
    job = client.batches.create(
        model=args.model,
        src=uploaded.name,
        config=types.CreateBatchJobConfig(display_name=display_name),
    )

    print("\n" + "=" * 64)
    print("ITEMS BATCH JOB SUBMITTED!")
    print(f"Job Code : {job.name}")
    print(f"Job State: {job.state.name}")
    print(f"Model    : {args.model}")
    print(f"Sheets   : {len(sheets)} ({n5} x 5x5 + {n4} x 4x4 + {n42} x 4x2 = {total_slots} total 4K slots)")
    print("=" * 64)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
