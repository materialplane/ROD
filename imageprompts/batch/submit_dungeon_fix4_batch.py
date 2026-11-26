"""Submit Room 4 & Room 5 (16:9 4K) + Stairs Up 2x2 & Stairs Down 2x2 (1:1 4K) to Gemini Batch API (50% off)."""

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
OUTPUT_JSONL = Path(__file__).resolve().parent / "dungeon_fix4_batch.jsonl"
DEFAULT_MODEL = "models/gemini-3-pro-image"


def collect_entries() -> list[tuple[str, str, str]]:
    rtxt = ROOMS_FILE.read_text(encoding="utf-8")
    rooms = re.findall(
        r"ROOM\s+\d+\s+OF\s+\d+\s+\(([^)]+)\).*?---\s*COPY PROMPT START\s*---\s*\n(.*?)\n---\s*COPY PROMPT END",
        rtxt,
        re.DOTALL,
    )
    by_slug = {slug.strip(): body.strip() for slug, body in rooms}
    for req in ("aq_room_04_treasury_vault", "aq_room_05_boss_sanctum"):
        if req not in by_slug:
            raise ValueError(f"Missing {req} in {ROOMS_FILE}")

    ptxt = PROPS_FILE.read_text(encoding="utf-8")
    m_up = re.search(r"---\s*STAIRS UP 2x2 SHEET START\s*---\s*\n(.*?)\n---\s*STAIRS UP 2x2 SHEET END", ptxt, re.DOTALL)
    m_dn = re.search(r"---\s*STAIRS DOWN 2x2 SHEET START\s*---\s*\n(.*?)\n---\s*STAIRS DOWN 2x2 SHEET END", ptxt, re.DOTALL)
    if not m_up or not m_dn:
        raise ValueError(f"Missing Stairs 2x2 blocks in {PROPS_FILE}")

    return [
        ("aq_room_04_treasury_vault", by_slug["aq_room_04_treasury_vault"], "16:9"),
        ("aq_room_05_boss_sanctum", by_slug["aq_room_05_boss_sanctum"], "16:9"),
        ("stairs_up_2x2", m_up.group(1).strip(), "1:1"),
        ("stairs_down_2x2", m_dn.group(1).strip(), "1:1"),
    ]


def build_jsonl(entries: list[tuple[str, str, str]], model: str, out_path: Path) -> None:
    lines: list[str] = []
    for slug, prompt_text, aspect in entries:
        if not prompt_text:
            raise ValueError(f"Empty prompt for {slug}")
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
    parser = argparse.ArgumentParser(description="Submit Room 4 + Room 5 + 2x2 Stairs Up/Down to Gemini Batch API (50% off).")
    parser.add_argument("--dry-run", action="store_true", help="Validate and write JSONL without uploading.")
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"Model ID (default: {DEFAULT_MODEL}).")
    args = parser.parse_args()

    load_dotenv(REPO_ROOT / ".env")
    entries = collect_entries()
    build_jsonl(entries, args.model, OUTPUT_JSONL)
    for slug, body, aspect in entries:
        print(f"  - {slug:28s} [{aspect}] ({len(body)} chars)")

    if args.dry_run:
        print("Dry-run complete.")
        return 0

    if not os.getenv("GEMINI_API_KEY"):
        print("ERROR: GEMINI_API_KEY missing in .env", file=sys.stderr)
        return 1

    client = genai.Client()
    uploaded = client.files.upload(
        file=str(OUTPUT_JSONL),
        config=types.UploadFileConfig(mime_type="application/jsonl"),
    )
    print(f"Uploaded File URI: {uploaded.name}")

    job = client.batches.create(
        model=args.model,
        src=uploaded.name,
        config=types.CreateBatchJobConfig(display_name="rod-dungeon-fix4"),
    )

    print("\n" + "=" * 64)
    print("DUNGEON FIX-4 BATCH SUBMITTED (50% BATCH TIER)!")
    print(f"Job Code : {job.name}")
    print(f"Job State: {job.state.name}")
    print(f"Download : python imageprompts/batch/download_dungeon_fix4_batch.py {job.name}")
    print("=" * 64)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
