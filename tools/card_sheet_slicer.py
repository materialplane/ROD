"""Shared 4x4 fantasy card sheet parser and slicer for Spell and Discipline cards."""

from __future__ import annotations

import re
from pathlib import Path

import numpy as np
from PIL import Image

DEFAULT_TARGET_SIZE = 512
DEFAULT_SAFETY_INSET = 10


def parse_manifest(sheets_txt: Path) -> list[tuple[int, dict[tuple[int, int], tuple[str, str, str]]]]:
    """Parse SHEET XX OF YY slot manifests from an imageprompts sheet text file."""
    text = sheets_txt.read_text(encoding="utf-8")
    sheet_blocks = re.split(r"={10,}\s*\nSHEET\s+(\d+)\s+OF\s+\d+[^\n]*\n={10,}", text)
    results: list[tuple[int, dict[tuple[int, int], tuple[str, str, str]]]] = []

    for i in range(1, len(sheet_blocks), 2):
        num = int(sheet_blocks[i])
        body = sheet_blocks[i + 1]
        slots: dict[tuple[int, int], tuple[str, str, str]] = {}
        for line in body.splitlines():
            m = re.match(r"^#\s*R(\d)C(\d)\s*->\s*([^\s|]+)\s*\|\s*([^|]+?)\s*\|\s*(.+?)\s*$", line.strip())
            if m:
                r, c = int(m.group(1)), int(m.group(2))
                sid, name, detail = m.group(3), m.group(4), m.group(5)
                slots[(r, c)] = (sid, name, detail)
        if len(slots) != 16:
            raise ValueError(f"Sheet {num:02d} manifest has {len(slots)} slots (expected 16).")
        results.append((num, slots))

    return results


def find_cell_spans(profile_1d: np.ndarray, total_len: int) -> list[tuple[int, int]]:
    """Locate 4 flush cell spans per axis, cleanly skipping dark grid divider seams if present."""
    start_edge = 0
    while start_edge < 32 and profile_1d[start_edge] < 16.0:
        start_edge += 1
    end_edge = total_len
    while end_edge > total_len - 32 and profile_1d[end_edge - 1] < 16.0:
        end_edge -= 1

    dividers: list[tuple[int, int]] = []
    for k in (1, 2, 3):
        nom = (total_len * k) // 4
        lo, hi = nom - 30, nom + 30
        seg = profile_1d[lo:hi]
        dark_indices = np.where(seg < 18.0)[0]
        if len(dark_indices) > 0:
            d0 = lo + int(dark_indices[0])
            d1 = lo + int(dark_indices[-1]) + 1
            dividers.append((d0, d1))
        else:
            grad = np.abs(np.diff(profile_1d[nom - 20 : nom + 21]))
            seam = nom - 20 + int(np.argmax(grad)) + 1
            dividers.append((seam, seam))

    return [
        (start_edge, dividers[0][0]),
        (dividers[0][1], dividers[1][0]),
        (dividers[1][1], dividers[2][0]),
        (dividers[2][1], end_edge),
    ]


def center_square_crop(
    im: Image.Image,
    x0: int,
    y0: int,
    x1: int,
    y1: int,
    safety_inset: int = DEFAULT_SAFETY_INSET,
) -> Image.Image:
    """Trim dark seam margins symmetrically and return an exact square crop."""
    ix0, ix1 = x0 + safety_inset, x1 - safety_inset
    iy0, iy1 = y0 + safety_inset, y1 - safety_inset
    cw = max(16, ix1 - ix0)
    ch = max(16, iy1 - iy0)
    side = min(cw, ch)
    cx = ix0 + (cw - side) // 2
    cy = iy0 + (ch - side) // 2
    return im.crop((cx, cy, cx + side, cy + side))


def find_sheet_file(batch_dir: Path, sheet_prefix: str, sheet_num: int) -> Path | None:
    """Find an existing batch sheet file matching sheet_prefix + zero-padded number."""
    stem = f"{sheet_prefix}{sheet_num:02d}"
    for ext in (".png", ".jpg", ".jpeg", ".webp"):
        cand = batch_dir / f"{stem}{ext}"
        if cand.exists():
            return cand
    return None


def slice_4x4_sheets(
    sheets_txt: Path,
    batch_dir: Path,
    sheet_prefix: str,
    slices_dir: Path,
    client_dir: Path,
    rel_prefix: str,
    target_size: int = DEFAULT_TARGET_SIZE,
    safety_inset: int = DEFAULT_SAFETY_INSET,
) -> tuple[int, dict[str, str], list[dict[str, str]], int]:
    """Slice all available 4x4 card sheets into lossless PNGs and 512x512 client WebPs."""
    slices_dir.mkdir(parents=True, exist_ok=True)
    client_dir.mkdir(parents=True, exist_ok=True)

    manifest = parse_manifest(sheets_txt)
    exported_by_id: dict[str, str] = {}
    slot_entries: list[dict[str, str]] = []
    total_webp_bytes = 0
    sliced_sheets = 0

    for sheet_num, slots in manifest:
        sheet_path = find_sheet_file(batch_dir, sheet_prefix, sheet_num)
        if not sheet_path:
            print(f"Skipping Sheet {sheet_num:02d}/{len(manifest):02d} (not generated/downloaded yet)")
            continue

        with Image.open(sheet_path) as raw_im:
            im = raw_im.convert("RGB")
            arr = np.asarray(im, dtype=np.float32)
            col_spans = find_cell_spans(arr.mean(axis=(0, 2)), im.width)
            row_spans = find_cell_spans(arr.mean(axis=(1, 2)), im.height)

            for r in range(1, 5):
                y0, y1 = row_spans[r - 1]
                for c in range(1, 5):
                    x0, x1 = col_spans[c - 1]
                    sid, name, detail = slots[(r, c)]

                    tile = center_square_crop(im, x0, y0, x1, y1, safety_inset=safety_inset)
                    png_out = slices_dir / f"{sid}.png"
                    tile.save(png_out, "PNG")

                    webp_out = client_dir / f"{sid}.webp"
                    resized = tile.resize((target_size, target_size), Image.Resampling.LANCZOS)
                    resized.save(webp_out, "WEBP", quality=90, method=6)
                    total_webp_bytes += webp_out.stat().st_size

                    rel_path = f"{rel_prefix}/{sid}.webp"
                    exported_by_id[sid] = rel_path
                    slot_entries.append({"id": sid, "name": name, "detail": detail, "iconPath": rel_path})

        sliced_sheets += 1
        print(f"Sliced Sheet {sheet_num:02d}/{len(manifest):02d} ({sheet_path.name}) -> 16 cards")

    for webp in sorted(client_dir.glob("*.webp")):
        exported_by_id.setdefault(webp.stem, f"{rel_prefix}/{webp.name}")

    return sliced_sheets, exported_by_id, slot_entries, total_webp_bytes
