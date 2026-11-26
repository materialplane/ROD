"""Build & submit Card-Driven Dungeon Delve assets (Stage 1 or Reference-Locked Stage 2) to Gemini Batch API (50% off)."""

from __future__ import annotations

import argparse
import base64
import io
import json
import os
import re
import sys
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parents[2]
PROMPTS_FILE = REPO_ROOT / "imageprompts" / "dungeon-card-delve-aqueduct.txt"
DEFAULT_MODEL = "models/gemini-3-pro-image"

# Ordered manifest matching the 11 --- COPY-PASTE PROMPT START --- blocks in dungeon-card-delve-aqueduct.txt
MANIFEST = [
    (1, "board_3slot_stone_bronze", "16:9"),
    (1, "cards_base_01_anchor_9x16", "9:16"),
    (1, "cards_backs_9x16", "9:16"),
    (1, "aqueduct_01_entry_stairs", "16:9"),
    (1, "aqueduct_02_cistern_halls", "16:9"),
    (1, "aqueduct_03_waterworks_sluice", "16:9"),
    (1, "aqueduct_04_grate_sealed", "16:9"),
    (2, "cards_base_02_loot_respite_9x16", "9:16"),
    (2, "cards_base_03_rooms_threats_9x16", "9:16"),
    (2, "cards_aqueduct_01_rooms_threats_9x16", "9:16"),
    (2, "cards_aqueduct_02_vault_boss_9x16", "9:16"),
]


def parse_prompt_blocks(prompts_path: Path) -> list[tuple[int, str, str, str]]:
    """Extract all 11 Stage 1 and Stage 2 prompt blocks cleanly from dungeon-card-delve-aqueduct.txt."""
    if not prompts_path.exists():
        raise FileNotFoundError(f"Missing prompts file: {prompts_path}")

    text = prompts_path.read_text(encoding="utf-8")
    blocks = re.findall(
        r"---\s*COPY-PASTE PROMPT START\s*---\s*\n(.*?)\n---\s*COPY-PASTE PROMPT END\s*---",
        text,
        re.DOTALL,
    )
    if len(blocks) != len(MANIFEST):
        raise ValueError(f"Expected {len(MANIFEST)} prompt blocks in {prompts_path}, found {len(blocks)}")

    out: list[tuple[int, str, str, str]] = []
    for (stage, slug, ratio), body in zip(MANIFEST, blocks):
        clean = body.strip()
        if not clean:
            raise ValueError(f"Empty prompt body for {slug}")
        out.append((stage, slug, ratio, clean))
    return out


def encode_reference_image(ref_path: Path, max_dim: int = 2560, quality: int = 92) -> tuple[str, str]:
    """Encode approved Anchor Sheet image as compact base64 JPEG for Stage 2 style lock."""
    if not ref_path.exists():
        raise FileNotFoundError(f"Reference image not found: {ref_path}")
    with Image.open(ref_path) as raw:
        im = raw.convert("RGB")
        if max(im.width, im.height) > max_dim:
            scale = max_dim / max(im.width, im.height)
            im = im.resize((round(im.width * scale), round(im.height * scale)), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, format="JPEG", quality=quality)
    return "image/jpeg", base64.b64encode(buf.getvalue()).decode("ascii")


def main() -> int:
    parser = argparse.ArgumentParser(description="Submit Dry Aqueducts Card-Delve Stage 1 or Stage 2 batch.")
    parser.add_argument("--stage", type=int, choices=[1, 2], default=2, help="Stage 1 (7 base+rooms) or Stage 2 (4 follow-up card sheets).")
    parser.add_argument("--include-base1", action="store_true", help="Include Base Sheet 01 re-roll alongside Stage 2 sheets under the locked reference image.")
    parser.add_argument("--only", nargs="*", default=None, help="Optional subset of exact sheet slugs to submit.")
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"Gemini model ID (default: {DEFAULT_MODEL}).")
    parser.add_argument("--ref", default=None, help="Approved Pro 3 reference card sheet path (required for --stage 2).")
    parser.add_argument("--dry-run", action="store_true", help="Write JSONL and validate without submitting API batch.")
    args = parser.parse_args()

    load_dotenv(REPO_ROOT / ".env")
    all_blocks = parse_prompt_blocks(PROMPTS_FILE)
    items = [entry for entry in all_blocks if entry[0] == args.stage]
    if args.stage == 2 and args.include_base1:
        base1 = [entry for entry in all_blocks if entry[1] == "cards_base_01_anchor_9x16"]
        items = base1 + items
    if args.only:
        only_set = set(args.only)
        items = [entry for entry in all_blocks if entry[1] in only_set]

    ref_data: tuple[str, str] | None = None
    if args.stage == 2:
        if not args.ref:
            print("ERROR: --stage 2 requires --ref <approved_anchor_sheet_path>", file=sys.stderr)
            return 1
        ref_data = encode_reference_image(Path(args.ref))

    jsonl_path = Path(__file__).resolve().parent / f"card_delve_aqueduct_stage{args.stage}_batch.jsonl"
    lines: list[str] = []
    for _, slug, ratio, prompt_text in items:
        parts: list[dict[str, object]] = [{"text": prompt_text}]
        if ref_data is not None:
            mime, b64 = ref_data
            parts.append({"inlineData": {"mimeType": mime, "data": b64}})
        req_obj = {
            "customId": slug,
            "request": {
                "model": args.model,
                "contents": [{"parts": parts}],
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
    print(f"Wrote {len(lines)} Stage {args.stage} request(s) (model={args.model}, 4K) -> {jsonl_path}")
    for _, slug, ratio, prompt_text in items:
        print(f"  - {slug} ({ratio}, {len(prompt_text)} chars)")

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

    display_name = f"rod-card-delve-aqueduct-stage{args.stage}"
    print(f"Submitting Batch Job ({args.model}, Stage {args.stage}, 50% batch tier)...")
    job = client.batches.create(
        model=args.model,
        src=uploaded.name,
        config=types.CreateBatchJobConfig(display_name=display_name),
    )

    print("\n" + "=" * 64)
    print(f"CARD DELVE STAGE {args.stage} BATCH JOB SUBMITTED!")
    print(f"Job Code : {job.name}")
    print(f"Job State: {job.state.name}")
    print(f"Model    : {args.model}")
    print(f"Items    : {len(items)}")
    print(f"Download : python imageprompts/batch/download_card_delve_batch.py {job.name}")
    print("=" * 64)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
