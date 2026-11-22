"""Inspect & download completed Travel token Batch API outputs into assets/travel/ and assets/tokens/markers/batch_sheets/."""

from __future__ import annotations

import base64
import json
import os
import shutil
import sys
from pathlib import Path

from dotenv import load_dotenv
from google import genai

REPO_ROOT = Path(__file__).resolve().parents[2]
FERRY_OUT = REPO_ROOT / "assets" / "travel" / "ferries-sheet"
MARKERS_OUT = REPO_ROOT / "assets" / "tokens" / "markers" / "batch_sheets"

EXT_BY_MIME = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
}


def save_output(custom_id: str, raw_bytes: bytes, mime: str) -> Path:
    ext = EXT_BY_MIME.get(mime, ".jpg")
    if custom_id in {"rod_travel_ferries_2x2", "rod_travel_ferries_4x4"}:
        dest_dir = FERRY_OUT.parent
        dest_dir.mkdir(parents=True, exist_ok=True)
        archive_dir = dest_dir / "_archive_v1"
        for old in dest_dir.glob("ferries-sheet.*"):
            archive_dir.mkdir(parents=True, exist_ok=True)
            shutil.move(str(old), str(archive_dir / old.name))
        out_path = dest_dir / f"ferries-sheet{ext}"
    else:
        MARKERS_OUT.mkdir(parents=True, exist_ok=True)
        out_path = MARKERS_OUT / f"{custom_id}{ext}"
    out_path.write_bytes(raw_bytes)
    return out_path


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python imageprompts/batch/download_travel_batch.py <batches/...>", file=sys.stderr)
        return 1

    load_dotenv(REPO_ROOT / ".env")
    if not os.getenv("GEMINI_API_KEY"):
        print("ERROR: GEMINI_API_KEY missing from .env", file=sys.stderr)
        return 1

    client = genai.Client()
    job = client.batches.get(name=sys.argv[1].strip())
    state = getattr(job.state, "name", str(job.state))
    print(f"Batch Job : {job.name}\nState     : {state}")
    if state != "JOB_STATE_SUCCEEDED":
        if getattr(job, "error", None):
            print(f"Error     : {job.error}")
        return 0

    saved: list[Path] = []
    dest_file = getattr(getattr(job, "dest", None), "file_name", None)
    if dest_file:
        raw_jsonl = client.files.download(file=dest_file).decode("utf-8")
        for idx, line in enumerate(raw_jsonl.splitlines(), start=1):
            if not line.strip():
                continue
            item = json.loads(line)
            stem = item.get("customId") or item.get("key") or f"rod_travel_{idx}"
            if item.get("error"):
                print(f"  [ERROR] {stem}: {item['error']}")
                continue
            parts = item.get("response", {}).get("candidates", [{}])[0].get("content", {}).get("parts", [])
            for part in parts:
                inline = part.get("inlineData") or part.get("inline_data")
                if inline and inline.get("data"):
                    mime = inline.get("mimeType") or inline.get("mime_type") or "image/jpeg"
                    raw_img = base64.b64decode(inline["data"])
                    saved.append(save_output(stem, raw_img, mime))
                    break

    inlined = getattr(getattr(job, "dest", None), "inlined_responses", None)
    if not saved and inlined:
        for idx, resp in enumerate(inlined, start=1):
            meta = getattr(resp, "metadata", None) or {}
            stem = meta.get("customId") or f"rod_travel_{idx}"
            for part in resp.response.candidates[0].content.parts:
                inline = getattr(part, "inline_data", None)
                if inline and getattr(inline, "data", None):
                    mime = getattr(inline, "mime_type", None) or "image/jpeg"
                    data = inline.data if isinstance(inline.data, (bytes, bytearray)) else base64.b64decode(inline.data)
                    saved.append(save_output(stem, bytes(data), mime))
                    break

    for p in saved:
        print(f"  Saved {p.relative_to(REPO_ROOT)} ({p.stat().st_size:,} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
