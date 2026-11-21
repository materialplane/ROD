"""Parse 9:16 Full-Body Hero Paperdoll prompts from imageprompts/hero-portraits.txt and submit all 6 with Step 1A reference portraits to Gemini Batch API (50% off)."""

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
HERO_FILE = REPO_ROOT / "imageprompts" / "hero-portraits.txt"
OUTPUT_JSONL = Path(__file__).resolve().parent / "heroes_fullbody_batch.jsonl"
DEFAULT_MODEL = "models/gemini-3-pro-image"

HERO_IDS = {
    1: "valen_fullbody",
    2: "ellowyn_fullbody",
    3: "orin_fullbody",
    4: "rowan_fullbody",
    5: "mera_fullbody",
    6: "harlan_fullbody",
}


def encode_reference_jpeg(ref_path: Path, max_dim: int = 1536, quality: int = 92) -> tuple[str, str]:
    if not ref_path.exists():
        raise FileNotFoundError(f"Missing hero Step 1A reference image: {ref_path}")
    with Image.open(ref_path) as raw:
        im = raw.convert("RGB")
        if max(im.width, im.height) > max_dim:
            scale = max_dim / max(im.width, im.height)
            im = im.resize((round(im.width * scale), round(im.height * scale)), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, format="JPEG", quality=quality)
    return "image/jpeg", base64.b64encode(buf.getvalue()).decode("ascii")


def parse_heroes(prompts_path: Path, selected: set[int] | None = None) -> list[tuple[int, str, str, Path, str]]:
    if not prompts_path.exists():
        raise FileNotFoundError(f"Missing hero prompts file: {prompts_path}")

    text = prompts_path.read_text(encoding="utf-8")
    pattern = re.compile(
        r"HERO\s+(\d+)\s+OF\s+\d+:\s+([^\n]+)\nReference Image to Attach:\s+([^\n]+)\n=+.*?--- HERO \d+ PROMPT START ---\n(.*?)\n--- HERO \d+ PROMPT END ---",
        re.DOTALL,
    )
    matches = pattern.findall(text)
    if not matches:
        raise ValueError(f"No valid hero prompt blocks found in {prompts_path}")

    items: list[tuple[int, str, str, Path, str]] = []
    for num_str, title, rel_ref, body in matches:
        num = int(num_str)
        if selected is not None and num not in selected:
            continue
        custom_id = HERO_IDS.get(num, f"hero_{num:02d}_fullbody")
        ref_path = REPO_ROOT / rel_ref.strip()
        if not ref_path.exists():
            raise FileNotFoundError(f"Hero {num} reference portrait missing: {ref_path}")
        items.append((num, custom_id, title.strip(), ref_path, body.strip()))
        print(f"  Parsed Hero {num} ({custom_id}): {title.strip()} [ref={ref_path.name}]")

    return items


def build_jsonl(items: list[tuple[int, str, str, Path, str]], model: str, out_path: Path) -> None:
    lines: list[str] = []
    for _, custom_id, _, ref_path, prompt_text in items:
        mime, b64 = encode_reference_jpeg(ref_path)
        req_obj = {
            "customId": custom_id,
            "request": {
                "model": model,
                "contents": [
                    {
                        "parts": [
                            {"text": prompt_text},
                            {"inlineData": {"mimeType": mime, "data": b64}},
                        ]
                    }
                ],
                "generationConfig": {
                    "responseModalities": ["IMAGE"],
                    "imageConfig": {
                        "aspectRatio": "9:16",
                        "imageSize": "4K",
                    },
                },
            },
        }
        lines.append(json.dumps(req_obj, ensure_ascii=False))

    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    mb = out_path.stat().st_size / (1024 * 1024)
    print(f"Wrote {len(lines)} batch request(s) (model={model}, 9:16 4K + Step 1A refs) -> {out_path} ({mb:.2f} MB)")


def main() -> int:
    parser = argparse.ArgumentParser(description="Build & submit all 6 9:16 Full-Body Hero portraits to Gemini Batch API (50% off).")
    parser.add_argument("--dry-run", action="store_true", help="Only build JSONL and inspect counts without uploading/submitting.")
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"Gemini image model (default: {DEFAULT_MODEL}).")
    parser.add_argument("--heroes", nargs="*", type=int, default=None, help="Optional subset of hero numbers (1-6).")
    args = parser.parse_args()

    load_dotenv(REPO_ROOT / ".env")
    selected = set(args.heroes) if args.heroes else None
    items = parse_heroes(HERO_FILE, selected)
    if not items:
        print("ERROR: No matching heroes found.", file=sys.stderr)
        return 1

    jsonl_path = OUTPUT_JSONL.with_name("heroes_fullbody_batch_selected.jsonl") if selected else OUTPUT_JSONL
    build_jsonl(items, args.model, jsonl_path)

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

    print(f"Submitting Batch Job ({args.model}, 9:16 4K, 50% batch tier)...")
    job = client.batches.create(
        model=args.model,
        src=uploaded.name,
        config=types.CreateBatchJobConfig(display_name=f"rod-heroes-fullbody-{len(items)}"),
    )

    print("\n" + "=" * 64)
    print("BATCH JOB SUBMITTED!")
    print(f"Job Code : {job.name}")
    print(f"Job State: {job.state.name}")
    print(f"Model    : {args.model}")
    print(f"Heroes   : {len(items)} x 9:16 4K Full-Body Paperdoll portraits")
    print(f"Download : python imageprompts/batch/download_heroes_fullbody_batch.py {job.name}")
    print("=" * 64)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
