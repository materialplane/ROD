"""Build & submit Mera (Druid) hero art steps to Google Gemini Batch API (50% off)."""

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
AVATAR_PROMPTS_FILE = REPO_ROOT / "imageprompts" / "class-avatar-tokens.txt"
FULLBODY_PROMPTS_FILE = REPO_ROOT / "imageprompts" / "hero-portraits.txt"
HEROES_DIR = REPO_ROOT / "assets" / "tokens" / "heroes"
DEFAULT_MODEL = "models/gemini-3-pro-image"


def encode_reference_jpeg(ref_path: Path, max_dim: int = 1536, quality: int = 92) -> tuple[str, str]:
    """Load a reference image, resize if huge, and base64-encode as JPEG."""
    if not ref_path.exists():
        raise FileNotFoundError(f"Missing reference image: {ref_path}")
    with Image.open(ref_path) as raw:
        im = raw.convert("RGB")
        if max(im.width, im.height) > max_dim:
            scale = max_dim / max(im.width, im.height)
            im = im.resize((round(im.width * scale), round(im.height * scale)), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, format="JPEG", quality=quality)
    return "image/jpeg", base64.b64encode(buf.getvalue()).decode("ascii")


def find_mera_step1a_ref() -> Path:
    """Locate the generated Mera Druid Step 1A portrait regardless of jpg/png extension."""
    for ext in (".png", ".jpg", ".jpeg", ".webp"):
        candidate = HEROES_DIR / f"mera_druid_portrait_1a{ext}"
        if candidate.exists():
            return candidate
    raise FileNotFoundError(f"Missing Mera Druid Step 1A portrait in {HEROES_DIR}")


def parse_class_avatar_prompts() -> tuple[str, str, str]:
    """Extract Mera Frame, Portrait Step 1A, and Portrait Step 1B prompts from class-avatar-tokens.txt."""
    text = AVATAR_PROMPTS_FILE.read_text(encoding="utf-8")
    frame_m = re.search(
        r"--- MERA FRAME \(1:1, Text-Only, Empty Center\) ---\n(.*?)\n\n--- MERA PORTRAIT STEP 1A",
        text,
        re.DOTALL,
    )
    p1a_m = re.search(
        r"--- MERA PORTRAIT STEP 1A \(1:1, Frameless Single Anchor\) ---\n(.*?)\n\n--- MERA PORTRAIT STEP 1B",
        text,
        re.DOTALL,
    )
    p1b_m = re.search(
        r"--- MERA PORTRAIT STEP 1B: 2x2 MASTER HEALTH SHEET \(1:1, Attach Mera Portrait Step 1A\) ---\n(.*?)(?=\n\n=+|\Z)",
        text,
        re.DOTALL,
    )
    if not (frame_m and p1a_m and p1b_m):
        raise ValueError(f"Failed to parse Mera Druid prompts from {AVATAR_PROMPTS_FILE}")
    return frame_m.group(1).strip(), p1a_m.group(1).strip(), p1b_m.group(1).strip()


def parse_fullbody_prompt() -> str:
    """Extract Hero 5 (Mera — Druid) full-body prompt from hero-portraits.txt."""
    text = FULLBODY_PROMPTS_FILE.read_text(encoding="utf-8")
    m = re.search(
        r"HERO\s+5\s+OF\s+6:\s+MERA[^\n]*\n.*?--- HERO 5 PROMPT START ---\n(.*?)\n--- HERO 5 PROMPT END ---",
        text,
        re.DOTALL,
    )
    if not m:
        raise ValueError(f"Failed to parse Hero 5 prompt from {FULLBODY_PROMPTS_FILE}")
    return m.group(1).strip()


def make_request(
    custom_id: str,
    prompt_text: str,
    model: str,
    aspect_ratio: str = "1:1",
    ref_path: Path | None = None,
) -> dict:
    """Create a single Gemini Batch API request entry."""
    parts: list[dict] = [{"text": prompt_text}]
    if ref_path is not None:
        mime, b64 = encode_reference_jpeg(ref_path)
        parts.append({"inlineData": {"mimeType": mime, "data": b64}})
    return {
        "customId": custom_id,
        "request": {
            "model": model,
            "contents": [{"parts": parts}],
            "generationConfig": {
                "responseModalities": ["IMAGE"],
                "imageConfig": {
                    "aspectRatio": aspect_ratio,
                    "imageSize": "4K",
                },
            },
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Submit Mera (Druid) Batch API requests (50% off).")
    parser.add_argument(
        "--step",
        choices=("step1", "step1b", "fullbody", "chain_post1a"),
        default="step1",
        help="step1 = Frame + Step 1A; step1b = 2x2 Health Sheet; fullbody = 9:16; chain_post1a = 2x2 + 9:16.",
    )
    parser.add_argument("--dry-run", action="store_true", help="Build JSONL without uploading or submitting.")
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"Gemini image model (default: {DEFAULT_MODEL}).")
    args = parser.parse_args()

    load_dotenv(REPO_ROOT / ".env")
    frame_prompt, p1a_prompt, p1b_prompt = parse_class_avatar_prompts()

    requests: list[dict] = []
    if args.step == "step1":
        requests.append(make_request("mera_druid_frame", frame_prompt, args.model, "1:1"))
        requests.append(make_request("mera_druid_portrait_1a", p1a_prompt, args.model, "1:1"))
    elif args.step == "step1b":
        ref = find_mera_step1a_ref()
        requests.append(make_request("mera_druid_portrait_1b_2x2", p1b_prompt, args.model, "1:1", ref))
    elif args.step == "fullbody":
        ref = find_mera_step1a_ref()
        requests.append(make_request("mera_fullbody_raw", parse_fullbody_prompt(), args.model, "9:16", ref))
    elif args.step == "chain_post1a":
        ref = find_mera_step1a_ref()
        requests.append(make_request("mera_druid_portrait_1b_2x2", p1b_prompt, args.model, "1:1", ref))
        requests.append(make_request("mera_fullbody_raw", parse_fullbody_prompt(), args.model, "9:16", ref))

    jsonl_path = Path(__file__).resolve().parent / f"mera_druid_{args.step}_batch.jsonl"
    jsonl_path.write_text("\n".join(json.dumps(r, ensure_ascii=False) for r in requests) + "\n", encoding="utf-8")
    mb = jsonl_path.stat().st_size / (1024 * 1024)
    print(f"Wrote {len(requests)} request(s) ({[r['customId'] for r in requests]}) -> {jsonl_path.name} ({mb:.2f} MB)")

    if args.dry_run:
        print("Dry-run complete (skipped API upload/submission).")
        return 0

    if not os.getenv("GEMINI_API_KEY"):
        print("ERROR: GEMINI_API_KEY missing from .env", file=sys.stderr)
        return 1

    client = genai.Client()
    print(f"Uploading {jsonl_path.name} to Google Gemini Files API...")
    uploaded = client.files.upload(
        file=str(jsonl_path),
        config=types.UploadFileConfig(mime_type="application/jsonl"),
    )
    print(f"Uploaded File URI: {uploaded.name}")

    print(f"Submitting Batch Job ({args.model}, 50% batch tier)...")
    job = client.batches.create(
        model=args.model,
        src=uploaded.name,
        config=types.CreateBatchJobConfig(display_name=f"rod-mera-druid-{args.step}"),
    )

    print("\n" + "=" * 64)
    print("BATCH JOB SUBMITTED!")
    print(f"Job Code : {job.name}")
    print(f"Job State: {job.state.name}")
    print(f"Model    : {args.model}")
    print(f"Step     : {args.step} ({len(requests)} image(s))")
    print(f"Download : python imageprompts/batch/download_mera_druid_batch.py {job.name}")
    print("=" * 64)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
