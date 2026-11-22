"""Parse 16:9 Hub Interior, Sanctuary & Bard Tavern scenes and submit to Google Gemini Batch API (50% discount)."""

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
INTERIORS_FILE = REPO_ROOT / "imageprompts" / "location-interiors.txt"
TAVERNS_FILE = REPO_ROOT / "imageprompts" / "bard-tavern.txt"
OUTPOSTS_FILE = REPO_ROOT / "imageprompts" / "monster-hunter.txt"
OUT_DIR = REPO_ROOT / "assets" / "maps" / "interiors"
TAVERNS_OUT_DIR = REPO_ROOT / "assets" / "maps" / "taverns"
DEFAULT_REF = REPO_ROOT / "assets" / "ui" / "menu_background_16x9_4k_v2.png"
OUTPUT_JSONL = Path(__file__).resolve().parent / "interiors_batch.jsonl"
TAVERNS_JSONL = Path(__file__).resolve().parent / "taverns_batch.jsonl"
OUTPOSTS_JSONL = Path(__file__).resolve().parent / "outposts_batch.jsonl"
DEFAULT_MODEL = "models/gemini-3-pro-image"


def parse_scene_selection(raw_args: list[str] | None) -> set[int] | None:
    """Parse --scenes arguments such as ['2'], ['3-10'], or ['all']. Returns None for all scenes."""
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


def encode_reference_jpeg(ref_path: Path, max_width: int = 2560, quality: int = 92) -> tuple[str, str]:
    """Encode a style-reference image to compact base64 JPEG for self-contained batch requests."""
    if not ref_path.exists():
        raise FileNotFoundError(f"Missing style reference image: {ref_path}")
    with Image.open(ref_path) as raw:
        im = raw.convert("RGB")
        if im.width > max_width:
            target_h = round(im.height * (max_width / im.width))
            im = im.resize((max_width, target_h), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, format="JPEG", quality=quality)
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    return "image/jpeg", b64


def parse_interior_scenes(
    prompts_path: Path,
    selected: set[int] | None,
    skip_existing: bool,
    out_dir: Path = OUT_DIR,
    id_suffix: str = "",
) -> list[tuple[int, str, str, str]]:
    """Parse numbered [NN] ID: <id> | <title> blocks and validate prompt text."""
    if not prompts_path.exists():
        raise FileNotFoundError(f"Missing interiors prompt file: {prompts_path}")

    text = prompts_path.read_text(encoding="utf-8")
    pattern = re.compile(
        r"^\[(\d+)\]\s+ID:\s+(\S+)\s+\|\s+([^\n]+)\n(?:# SAVE AS:[^\n]*\n)?-+\n--- COPY-PASTE PROMPT START ---\n(.*?)\n--- COPY-PASTE PROMPT END ---",
        re.MULTILINE | re.DOTALL,
    )
    matches = pattern.findall(text)
    if not matches:
        raise ValueError(f"No valid scene blocks found in {prompts_path}")

    existing_stems: set[str] = set()
    if skip_existing and out_dir.exists():
        existing_stems = {p.stem for p in out_dir.iterdir() if p.is_file() and p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}}

    scenes: list[tuple[int, str, str, str]] = []
    for num_str, raw_scene_id, label, body in matches:
        num = int(num_str)
        scene_id = f"{raw_scene_id}{id_suffix}"
        if selected is not None and num not in selected:
            continue
        if skip_existing and scene_id in existing_stems:
            print(f"  Skipping [{num:02d}] {scene_id} (already archived in {out_dir.relative_to(REPO_ROOT)})")
            continue
        clean_body = body.strip()
        if not clean_body:
            raise ValueError(f"Scene [{num:02d}] {scene_id} has an empty prompt.")
        scenes.append((num, scene_id, label.strip(), clean_body))

    return scenes


def build_jsonl(
    scenes: list[tuple[int, str, str, str]],
    model: str,
    ref_mime: str,
    ref_b64: str,
    out_path: Path,
) -> None:
    """Write validated 16:9 4K Pro interior requests with inline style reference to JSONL."""
    lines: list[str] = []
    for _, scene_id, _, prompt_text in scenes:
        req_obj = {
            "customId": scene_id,
            "request": {
                "model": model,
                "contents": [
                    {
                        "parts": [
                            {"text": prompt_text},
                            {"inlineData": {"mimeType": ref_mime, "data": ref_b64}},
                        ]
                    }
                ],
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
    mb = out_path.stat().st_size / (1024 * 1024)
    print(f"Wrote {len(lines)} batch request(s) (model={model}, 16:9 4K + style ref) -> {out_path} ({mb:.1f} MB)")


def main() -> int:
    parser = argparse.ArgumentParser(description="Build & submit ROD 16:9 Hub Interior, Bard Tavern, or Outpost scenes to Gemini Batch API (50% off).")
    parser.add_argument("--target", choices=("hubs", "taverns", "outposts"), default="hubs", help="Which 16:9 prompt bank to submit (default: hubs).")
    parser.add_argument("--dry-run", action="store_true", help="Only build JSONL and inspect counts without uploading/submitting.")
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"Gemini image model (default: {DEFAULT_MODEL}).")
    parser.add_argument("--reference", type=Path, default=DEFAULT_REF, help="Style reference image path.")
    parser.add_argument("--all", action="store_true", help="Include all scenes even if already archived locally.")
    parser.add_argument(
        "--scenes",
        nargs="*",
        default=None,
        help="Optional subset of scene numbers or ranges (e.g. --scenes 2-10 39). Defaults to remaining un-archived scenes.",
    )
    args = parser.parse_args()

    target_configs = {
        "hubs": (INTERIORS_FILE, OUT_DIR, OUTPUT_JSONL, "", "rod-location-interiors", "INTERIORS"),
        "taverns": (TAVERNS_FILE, TAVERNS_OUT_DIR, TAVERNS_JSONL, "_tavern", "rod-bard-taverns", "TAVERNS"),
        "outposts": (OUTPOSTS_FILE, OUT_DIR, OUTPOSTS_JSONL, "", "rod-outpost-interiors", "OUTPOST INTERIORS"),
    }
    prompts_file, out_dir, base_jsonl, id_suffix, name_prefix, banner_label = target_configs[args.target]

    load_dotenv(REPO_ROOT / ".env")
    selected = parse_scene_selection(args.scenes)
    skip_existing = not args.all and selected is None
    scenes = parse_interior_scenes(
        prompts_file,
        selected,
        skip_existing=skip_existing,
        out_dir=out_dir,
        id_suffix=id_suffix,
    )

    if not scenes:
        print("No scenes selected or remaining to submit.")
        return 0

    for num, sid, label, _ in scenes:
        print(f"  Queued [{num:02d}] {sid} | {label}")

    ref_mime, ref_b64 = encode_reference_jpeg(args.reference)
    selected_name = f"{base_jsonl.stem}_selected.jsonl"
    jsonl_path = base_jsonl.with_name(selected_name) if selected is not None else base_jsonl
    build_jsonl(scenes, args.model, ref_mime, ref_b64, jsonl_path)

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

    display_name = f"{name_prefix}-{len(scenes)}"
    print(f"Submitting Batch Job ({args.model}, 16:9 4K, 50% batch tier)...")
    job = client.batches.create(
        model=args.model,
        src=uploaded.name,
        config=types.CreateBatchJobConfig(display_name=display_name),
    )

    print("\n" + "=" * 64)
    print(f"{banner_label} BATCH JOB SUBMITTED!")
    print(f"Job Code : {job.name}")
    print(f"Job State: {job.state.name}")
    print(f"Model    : {args.model}")
    print(f"Scenes   : {len(scenes)} x 16:9 4K scenes")
    print("=" * 64)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
