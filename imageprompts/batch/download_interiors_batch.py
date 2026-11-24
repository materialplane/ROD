"""Inspect status and download completed 16:9 Hub Interior or Bard Tavern scenes from Google Gemini Batch API."""

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
OUT_DIR = REPO_ROOT / "assets" / "maps" / "interiors"
TAVERNS_OUT_DIR = REPO_ROOT / "assets" / "maps" / "taverns"
PORTALS_OUT_DIR = REPO_ROOT / "assets" / "maps" / "portals"
PORTAL_STEM_PREFIXES = (
    "loc_05_the_ashen_gate",
    "loc_10_the_sunken_maw",
    "loc_15_the_iron_rift",
    "loc_20_the_rotspire",
    "loc_25_the_scorched_chasm",
    "loc_30_storm_crowned_spire",
    "loc_35_the_pale_abyss",
    "loc_39_the_eclipse_gate",
)

EXT_BY_MIME = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
}


def resolve_out_dir(stem: str, target: str) -> Path:
    if target == "portals" or stem.startswith(PORTAL_STEM_PREFIXES):
        return PORTALS_OUT_DIR
    if target == "taverns" or stem.endswith("_tavern"):
        return TAVERNS_OUT_DIR
    return OUT_DIR


def save_image_bytes(raw_bytes: bytes, mime_type: str, stem: str, target: str = "auto") -> Path:
    """Write returned image bytes to the appropriate 16:9 scenes archive folder."""
    dest_dir = resolve_out_dir(stem, target)
    dest_dir.mkdir(parents=True, exist_ok=True)
    ext = EXT_BY_MIME.get(mime_type, ".jpg")
    out_path = dest_dir / f"{stem}{ext}"
    out_path.write_bytes(raw_bytes)
    try:
        with Image.open(out_path) as im:
            print(f"  Saved {dest_dir.name}/{out_path.name} ({im.width}x{im.height}, {len(raw_bytes):,} bytes)")
    except Exception:
        print(f"  Saved {dest_dir.name}/{out_path.name} ({len(raw_bytes):,} bytes)")
    return out_path


def main() -> int:
    parser = argparse.ArgumentParser(description="Download completed 16:9 Hub Interior or Bard Tavern scenes from Gemini Batch API.")
    parser.add_argument("job_name", help="Batch job ID (e.g. batches/...)")
    parser.add_argument("--target", choices=("auto", "hubs", "taverns", "portals"), default="auto", help="Destination folder override (auto detects *_tavern and portal IDs).")
    args = parser.parse_args()

    job_name = args.job_name.strip()
    load_dotenv(REPO_ROOT / ".env")
    if not os.getenv("GEMINI_API_KEY"):
        print("ERROR: GEMINI_API_KEY missing from .env", file=sys.stderr)
        return 1

    client = genai.Client()
    job = client.batches.get(name=job_name)
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
            stem = item.get("customId") or item.get("key") or f"interior_{idx:02d}"
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
                    mime = inline.get("mimeType") or inline.get("mime_type") or "image/jpeg"
                    raw_img = base64.b64decode(inline["data"])
                    saved_paths.append(save_image_bytes(raw_img, mime, stem, args.target))
                    break

    inlined = getattr(getattr(job, "dest", None), "inlined_responses", None)
    if not saved_paths and inlined:
        print(f"Extracting {len(inlined)} inlined responses...")
        for idx, resp in enumerate(inlined, start=1):
            meta = getattr(resp, "metadata", None) or {}
            stem = meta.get("customId") or meta.get("filename") or f"interior_{idx:02d}"
            parts = resp.response.candidates[0].content.parts
            for part in parts:
                inline = getattr(part, "inline_data", None)
                if inline and getattr(inline, "data", None):
                    mime = getattr(inline, "mime_type", None) or "image/jpeg"
                    data = inline.data if isinstance(inline.data, (bytes, bytearray)) else base64.b64decode(inline.data)
                    saved_paths.append(save_image_bytes(bytes(data), mime, stem, args.target))
                    break

    final_dir = saved_paths[0].parent if saved_paths else (PORTALS_OUT_DIR if args.target == "portals" else TAVERNS_OUT_DIR if args.target == "taverns" else OUT_DIR)
    print(f"\nDone: {len(saved_paths)} scene(s) saved to {final_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
