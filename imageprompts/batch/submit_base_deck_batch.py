"""Submit a verified Biome Base Deck (5x 9:16 2x2 sheets + 8x 16:9 scenes + 3x 16:9 battlegrounds) to Gemini Batch API (50% off)."""

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
PROPOSED_JSON = REPO_ROOT / "data" / "proposed-decks.json"
DECK_PROMPTS_DIR = REPO_ROOT / "imageprompts" / "decks"
DEFAULT_MODEL = "models/gemini-3-pro-image"

PROMPT_RX = re.compile(
    r"---\s*COPY-PASTE PROMPT START\s*---\s*\r?\n([\s\S]*?)\r?\n---\s*COPY-PASTE PROMPT END\s*---"
)


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", text.strip().lower()).strip("_")


def load_deck_requests(deck_id: str, part: str = "all") -> list[tuple[str, str, str]]:
    """Return list of (custom_id, aspect_ratio, prompt_text) for the chosen deck."""
    catalog = json.loads(PROPOSED_JSON.read_text(encoding="utf-8"))
    deck = next((dk for dk in catalog.get("decks", []) if dk.get("id") == deck_id), None)
    if not deck:
        raise ValueError(f"Deck '{deck_id}' not found in {PROPOSED_JSON}")

    prompts_path = DECK_PROMPTS_DIR / f"{deck_id}.txt"
    if not prompts_path.exists():
        raise FileNotFoundError(f"Prompts file not found: {prompts_path}")

    raw = prompts_path.read_text(encoding="utf-8")
    blocks = [m.group(1).strip() for m in PROMPT_RX.finditer(raw)]
    if len(blocks) != 16:
        raise ValueError(f"Expected 16 prompt blocks in {prompts_path.name}, found {len(blocks)}")

    rooms = deck.get("roomPool16x9", [])
    bgs = deck.get("battlegrounds", [])
    if len(rooms) != 8 or len(bgs) != 3:
        raise ValueError(f"Expected 8 rooms and 3 battlegrounds for {deck_id}, found {len(rooms)} rooms, {len(bgs)} bgs")

    # Derive biome prefix cleanly from room_01 id (e.g. 'cavern_room_01' -> 'cavern')
    biome_slug = rooms[0]["id"].rsplit("_room_", 1)[0]
    sheet_names = {int(m.group(1)): slugify(m.group(2)) for m in re.finditer(r"SHEET\s+(\d+)\s+[—-]\s+([^\(\r\n]+)", raw)}

    items: list[tuple[str, str, str]] = []

    if part in ("all", "cards"):
        for idx in range(5):
            body = blocks[idx]
            if not body.startswith("9:16 "):
                raise ValueError(f"Card Sheet {idx + 1} does not start with '9:16 ': {body[:60]!r}")
            s_slug = sheet_names.get(idx + 1, f"sheet_{idx + 1}")
            items.append((f"{biome_slug}_cards_{idx + 1:02d}_{s_slug}_9x16", "9:16", body))

    if part in ("all", "scenes", "16x9"):
        for r_idx, rm in enumerate(rooms):
            body = blocks[5 + r_idx]
            if not body.startswith("16:9 "):
                raise ValueError(f"Scene R{r_idx + 1} does not start with '16:9 ': {body[:60]!r}")
            items.append((rm["id"], "16:9", body))

    if part in ("all", "battlegrounds", "16x9"):
        for b_idx, bg in enumerate(bgs):
            body = blocks[13 + b_idx]
            if not body.startswith("16:9 ") or "BATTLESCENE MANDATE:" not in body:
                raise ValueError(f"Battleground BG{b_idx + 1} missing 16:9 or BATTLESCENE MANDATE")
            items.append((bg["id"], "16:9", body))

    return items


def main() -> int:
    parser = argparse.ArgumentParser(description="Submit a Biome Base Deck (cards + scenes + battlegrounds) to Gemini Batch API (50% off).")
    parser.add_argument("--deck", required=True, help="Deck ID in data/proposed-decks.json (e.g. base_cavern_dungeon).")
    parser.add_argument("--part", choices=["all", "cards", "scenes", "battlegrounds", "16x9"], default="all", help="Which subset of deck assets to queue.")
    parser.add_argument("--sheet", type=int, nargs="+", choices=[1, 2, 3, 4, 5], default=None, help="Optional 1-based card sheet number(s) to queue alone (e.g. --sheet 4).")
    parser.add_argument("--id", nargs="+", default=None, help="Optional specific scene/battleground custom ID(s) to queue alone (e.g. --id dungeon_12_marsh_cypress_arena).")
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"Gemini model ID (default: {DEFAULT_MODEL}).")
    parser.add_argument("--dry-run", action="store_true", help="Write JSONL and validate without calling Gemini API.")
    args = parser.parse_args()

    load_dotenv(REPO_ROOT / ".env")
    part = "cards" if args.sheet else args.part
    items = load_deck_requests(args.deck, part=part)
    if args.sheet:
        want_prefixes = tuple(f"_cards_{n:02d}_" for n in args.sheet)
        items = [it for it in items if any(pref in it[0] for pref in want_prefixes)]
    if args.id:
        want_ids = set(args.id)
        items = [it for it in items if it[0] in want_ids]
        missing = sorted(want_ids - {it[0] for it in items})
        if missing:
            raise ValueError(f"Requested --id not found in {args.deck} ({part}): {missing}")

    if args.id and len(args.id) == 1:
        suffix = f"_{args.id[0]}"
    elif args.id:
        suffix = f"_{len(args.id)}items"
    elif args.sheet:
        suffix = f"_sheet{'_'.join(str(n) for n in args.sheet)}"
    elif args.part == "all":
        suffix = ""
    else:
        suffix = f"_{args.part}"
    jsonl_path = Path(__file__).resolve().parent / f"{args.deck}{suffix}_batch.jsonl"

    lines: list[str] = []
    for custom_id, ratio, prompt_text in items:
        req_obj = {
            "customId": custom_id,
            "request": {
                "model": args.model,
                "contents": [{"parts": [{"text": prompt_text}]}],
                "generationConfig": {
                    "responseModalities": ["IMAGE"],
                    "imageConfig": {
                        "aspectRatio": ratio,
                        "imageSize": "4K",
                    },
                },
            },
        }
        lines.append(json.dumps(req_obj, ensure_ascii=False))

    jsonl_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {len(lines)} pure text-only Pro 4K requests -> {jsonl_path.name}")
    for custom_id, ratio, prompt_text in items:
        print(f"  - {custom_id:40s} [{ratio}] ({len(prompt_text)} chars)")

    if args.dry_run:
        print("Dry-run complete (skipped API submission).")
        return 0

    if not os.getenv("GEMINI_API_KEY"):
        print("ERROR: GEMINI_API_KEY missing in .env", file=sys.stderr)
        return 1

    client = genai.Client()
    print(f"Uploading {jsonl_path.name} to Google Gemini Files API...")
    uploaded = client.files.upload(
        file=str(jsonl_path),
        config=types.UploadFileConfig(mime_type="application/jsonl"),
    )
    print(f"Uploaded File URI: {uploaded.name}")

    display = f"rod-{args.deck.replace('_', '-')}{suffix.replace('_', '-')}-4k"
    job = client.batches.create(
        model=args.model,
        src=uploaded.name,
        config=types.CreateBatchJobConfig(display_name=display),
    )

    print("\n" + "=" * 64)
    print(f"BASE DECK ({args.deck}) BATCH JOB SUBMITTED!")
    print(f"Job Code : {job.name}")
    print(f"Job State: {job.state.name}")
    print(f"Model    : {args.model}")
    print(f"Count    : {len(lines)} images (50% Batch Discount, Pro 4K)")
    print(f"Download : python imageprompts/batch/download_card_delve_batch.py {job.name}")
    print("=" * 64)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
