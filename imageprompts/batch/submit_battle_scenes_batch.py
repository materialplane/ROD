"""Parse 16:9 Battle Stage Biome & Portal backdrops from imageprompts/battle-scenes.txt and submit text-only to Gemini Batch API (50% off)."""

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
PROMPTS_FILE = REPO_ROOT / "imageprompts" / "battle-scenes.txt"
OUTPUT_JSONL = Path(__file__).resolve().parent / "battle_scenes_batch.jsonl"
DEFAULT_MODEL = "models/gemini-3-pro-image"


def parse_selection(raw_args: list[str] | None) -> set[int] | None:
    """Parse --biomes arguments such as ['1'], ['2-10'], or ['all']. Returns None for all."""
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


def parse_battle_scenes(prompts_path: Path, selected: set[int] | None) -> list[tuple[int, str, str]]:
    """Parse all BIOME NN OF 41 (<slug>) prompt blocks and validate prompt bodies."""
    if not prompts_path.exists():
        raise FileNotFoundError(f"Missing battle scenes file: {prompts_path}")

    text = prompts_path.read_text(encoding="utf-8")
    pattern = re.compile(
        r"BIOME\s+(\d+)\s+OF\s+\d+\s+\(([^)]+)\).*?---\s*COPY PROMPT START\s*\([^)]*(?:\([^)]*\)[^)]*)*\)\s*---\s*\n(.*?)\n---\s*COPY PROMPT END",
        re.DOTALL,
    )
    matches = pattern.findall(text)
    if len(matches) != 41:
        raise ValueError(f"Expected 41 biome blocks in {prompts_path}, found {len(matches)}")

    scenes: list[tuple[int, str, str]] = []
    for num_str, slug, body in matches:
        num = int(num_str)
        if selected is not None and num not in selected:
            continue
        clean_body = body.strip()
        if not clean_body:
            raise ValueError(f"Biome {num:02d} ({slug}) has an empty prompt.")
        scenes.append((num, slug.strip(), clean_body))

    return scenes


def encode_reference_jpeg(ref_path: Path, max_width: int = 2560, quality: int = 92) -> tuple[str, str]:
    """Encode an existing scene image as compact base64 JPEG for surgical image-to-image edits."""
    if not ref_path.exists():
        raise FileNotFoundError(f"Missing edit reference image: {ref_path}")
    with Image.open(ref_path) as raw:
        im = raw.convert("RGB")
        if im.width > max_width:
            target_h = round(im.height * (max_width / im.width))
            im = im.resize((max_width, target_h), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, format="JPEG", quality=quality)
    return "image/jpeg", base64.b64encode(buf.getvalue()).decode("ascii")


def build_jsonl(
    scenes: list[tuple[int, str, str]],
    model: str,
    out_path: Path,
    edit_ref: tuple[str, str] | None = None,
    edit_prompt: str | None = None,
) -> None:
    """Write validated 16:9 4K Gemini Batch JSONL requests (text-only by default, or image edit with --edit-ref)."""
    lines: list[str] = []
    for _, slug, prompt_text in scenes:
        parts: list[dict[str, object]] = [{"text": edit_prompt.strip() if edit_prompt else prompt_text}]
        if edit_ref is not None:
            ref_mime, ref_b64 = edit_ref
            parts.append({"inlineData": {"mimeType": ref_mime, "data": ref_b64}})
        req_obj = {
            "customId": slug,
            "request": {
                "model": model,
                "contents": [{"parts": parts}],
                "generationConfig": {
                    "responseModalities": ["IMAGE"],
                    "imageConfig": {
                        "aspectRatio": "16:9",
                        "imageSize": "4K",
                    },
                },
            },
        }
        lines.append(json.dumps(req_obj, ensure_ascii=False))

    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    kb = out_path.stat().st_size / 1024
    mode_desc = "image-edit" if edit_ref is not None else "text-only"
    print(f"Wrote {len(lines)} {mode_desc} batch request(s) (model={model}, 16:9 4K) -> {out_path} ({kb:.1f} KB)")


def main() -> int:
    parser = argparse.ArgumentParser(description="Build & submit ROD 16:9 Battle Scene Backdrops to Gemini Batch API (50% off).")
    parser.add_argument("--dry-run", action="store_true", help="Build JSONL and validate without uploading/submitting.")
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"Gemini image model (default: {DEFAULT_MODEL}).")
    parser.add_argument(
        "--biomes",
        nargs="*",
        default=None,
        help="Optional subset of biome numbers or ranges (e.g. --biomes 1 or --biomes 2-10). Defaults to all 41.",
    )
    parser.add_argument("--edit-ref", default=None, help="Optional source image path for surgical single-biome image editing.")
    parser.add_argument("--edit-prompt", default=None, help="Optional prompt override paired with --edit-ref.")
    args = parser.parse_args()

    load_dotenv(REPO_ROOT / ".env")
    selected = parse_selection(args.biomes)
    scenes = parse_battle_scenes(PROMPTS_FILE, selected)

    if not scenes:
        print("ERROR: No matching biomes found for selection.", file=sys.stderr)
        return 1

    edit_ref_data: tuple[str, str] | None = None
    if args.edit_ref:
        if len(scenes) != 1:
            print("ERROR: --edit-ref requires exactly 1 selected biome via --biomes.", file=sys.stderr)
            return 1
        edit_ref_data = encode_reference_jpeg(Path(args.edit_ref))

    jsonl_path = OUTPUT_JSONL.with_name("battle_scenes_batch_selected.jsonl") if selected is not None else OUTPUT_JSONL
    build_jsonl(scenes, args.model, jsonl_path, edit_ref=edit_ref_data, edit_prompt=args.edit_prompt)

    if args.dry_run:
        print(f"Sample first: [{scenes[0][0]:02d}] {scenes[0][1]}")
        print(f"Sample last : [{scenes[-1][0]:02d}] {scenes[-1][1]}")
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

    nums = [s[0] for s in scenes]
    span = f"all-{len(nums)}" if len(nums) == 41 else "-".join(str(n) for n in nums)
    mode_desc = "image-edit" if edit_ref_data is not None else "text-only"
    display_name = f"rod-battle-scenes-{span}{'-edit' if edit_ref_data is not None else ''}"
    print(f"Submitting Batch Job ({args.model}, 16:9 4K {mode_desc}, 50% batch tier)...")
    job = client.batches.create(
        model=args.model,
        src=uploaded.name,
        config=types.CreateBatchJobConfig(display_name=display_name),
    )

    print("\n" + "=" * 64)
    print("BATTLE SCENES BATCH JOB SUBMITTED!")
    print(f"Job Code : {job.name}")
    print(f"Job State: {job.state.name}")
    print(f"Model    : {args.model}")
    print(f"Biomes   : {len(scenes)} x 16:9 4K backdrops ({mode_desc})")
    print(f"Download : python imageprompts/batch/download_battle_scenes_batch.py {job.name}")
    print("=" * 64)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
