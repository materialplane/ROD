"""Inspect status and download completed 4x4 card sheets from Google Gemini Batch API."""

from __future__ import annotations

import argparse
import base64
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parents[2]

OUT_DIRS = {
    "weapon_abilities": REPO_ROOT / "assets" / "weapon_abilities" / "batch_sheets",
    "magic_tiers": REPO_ROOT / "assets" / "magic_tiers" / "batch_sheets",
}

DEFAULT_STEMS = {
    "weapon_abilities": "rod_weapon_abilities_sheet",
    "magic_tiers": "rod_magic_tiers_sheet",
}

EXT_BY_MIME = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
}


def save_image_bytes(out_dir: Path, raw_bytes: bytes, mime_type: str, stem: str) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    ext = EXT_BY_MIME.get(mime_type, ".png")
    out_path = out_dir / f"{stem}{ext}"
    out_path.write_bytes(raw_bytes)
    try:
        with Image.open(out_path) as im:
            print(f"  Saved {out_path} ({im.width}x{im.height}, {len(raw_bytes):,} bytes)")
    except Exception:
        print(f"  Saved {out_path} ({len(raw_bytes):,} bytes)")
    return out_path


def main() -> int:
    parser = argparse.ArgumentParser(description="Inspect and download completed 4x4 card sheets from Gemini Batch API.")
    parser.add_argument("--set", required=True, choices=sorted(OUT_DIRS.keys()), help="Target card set.")
    parser.add_argument("job_name", help="Batch job ID (e.g. batches/...).")
    args = parser.parse_args()

    out_dir = OUT_DIRS[args.set]
    default_stem = DEFAULT_STEMS[args.set]

    load_dotenv(REPO_ROOT / ".env")
    if not os.getenv("GEMINI_API_KEY"):
        print("ERROR: GEMINI_API_KEY missing from .env", file=sys.stderr)
        return 1

    client = genai.Client()
    job = client.batches.get(name=args.job_name.strip())
    state = getattr(job.state, "name", str(job.state))
    print(f"Batch Job : {job.name}")
    print(f"State     : {state}")

    if state != "JOB_STATE_SUCCEEDED":
        if getattr(job, "error", None):
            print(f"Error     : {job.error}")
        print("Job is not finished yet. Run again once it reaches JOB_STATE_SUCCEEDED.")
        return 0

    saved_paths: list[Path] = []
    dest_file = getattr(getattr(job, "dest", None), "file_name", None)
    if dest_file:
        print(f"Downloading output file {dest_file} ...")
        raw_jsonl = client.files.download(file=dest_file).decode("utf-8")
        for idx, line in enumerate(raw_jsonl.splitlines(), start=1):
            if not line.strip():
                continue
            item = json.loads(line)
            stem = item.get("customId") or item.get("key") or f"{default_stem}_{idx:02d}"
            if "error" in item and item["error"]:
                print(f"  [ERROR] {stem}: {item['error']}")
                continue
            candidates = item.get("response", {}).get("candidates", [])
            if not candidates:
                print(f"  [WARN] {stem}: No candidates in response.")
                continue
            parts = candidates[0].get("content", {}).get("parts", [])
            for part in parts:
                inline = part.get("inlineData") or part.get("inline_data")
                if inline and inline.get("data"):
                    mime = inline.get("mimeType") or inline.get("mime_type") or "image/png"
                    raw_img = base64.b64decode(inline["data"])
                    saved_paths.append(save_image_bytes(out_dir, raw_img, mime, stem))
                    break

    inlined = getattr(getattr(job, "dest", None), "inlined_responses", None)
    if not saved_paths and inlined:
        print(f"Extracting {len(inlined)} inlined response(s) ...")
        for idx, resp_wrap in enumerate(inlined, start=1):
            resp = getattr(resp_wrap, "response", None)
            if not resp or not getattr(resp, "candidates", None):
                continue
            for part in resp.candidates[0].content.parts:
                inline = getattr(part, "inline_data", None)
                if inline and getattr(inline, "data", None):
                    mime = getattr(inline, "mime_type", "image/png")
                    raw_img = inline.data if isinstance(inline.data, bytes) else base64.b64decode(inline.data)
                    saved_paths.append(save_image_bytes(out_dir, raw_img, mime, f"{default_stem}_{idx:02d}"))
                    break

    print(f"\nDownloaded {len(saved_paths)} sheet(s) to {out_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
