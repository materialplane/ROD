"""Slice all 22 4x4 NPC Portrait sheets (352 portraits), archive lossless PNGs, export 512x512 WebPs, and wire portraitPath into npcs-catalog.json."""

from __future__ import annotations

import json
import re
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(r"C:\Users\drew0\Documents\ROD")
SHEETS_TXT = ROOT / "imageprompts" / "npc-sheets.txt"
BATCH_DIR = ROOT / "assets" / "tokens" / "npcs" / "batch_sheets"
SLICES_DIR = ROOT / "assets" / "tokens" / "npcs" / "slices"
CLIENT_PORTRAITS_DIR = ROOT / "client" / "assets" / "portraits" / "npcs"
DATA_CATALOG = ROOT / "data" / "npcs-catalog.json"
CLIENT_CATALOG = ROOT / "client" / "assets" / "data" / "npcs-catalog.json"

TARGET_SIZE = 512
SAFETY_INSET = 10

HERO_COMPANION_AVATARS = {
    "npc_loc_40_garricks_black_keep_valen": "assets/portraits/heroes/valen_avatar.webp",
    "npc_loc_40_garricks_black_keep_ellowyn_arcane_lead": "assets/portraits/heroes/ellowyn_avatar.webp",
    "npc_loc_40_garricks_black_keep_orin_home_front_vanguard": "assets/portraits/heroes/orin_avatar.webp",
    "npc_loc_40_garricks_black_keep_rowan": "assets/portraits/heroes/rowan_avatar.webp",
    "npc_loc_40_garricks_black_keep_mera_harlan": "assets/portraits/heroes/mera_avatar.webp",
}


def parse_manifest(sheets_txt: Path) -> list[tuple[int, dict[tuple[int, int], tuple[str, str]]]]:
    """Parse SHEET XX manifests from imageprompts/npc-sheets.txt."""
    text = sheets_txt.read_text(encoding="utf-8")
    sheet_blocks = re.split(r"={10,}\s*\nSHEET\s+(\d+)\s+OF\s+\d+[^\n]*\n={10,}", text)
    results: list[tuple[int, dict[tuple[int, int], tuple[str, str]]]] = []

    for i in range(1, len(sheet_blocks), 2):
        num = int(sheet_blocks[i])
        body = sheet_blocks[i + 1]
        slots: dict[tuple[int, int], tuple[str, str]] = {}
        for line in body.splitlines():
            m = re.match(r"^#\s*R(\d)C(\d)\s*->\s*([^\s(]+)\s*\((.+)\)\s*$", line.strip())
            if m:
                r, c = int(m.group(1)), int(m.group(2))
                nid, title = m.group(3), m.group(4)
                slots[(r, c)] = (nid, title)
        if len(slots) != 16:
            raise ValueError(f"Sheet {num:02d} manifest has {len(slots)} slots (expected 16).")
        results.append((num, slots))

    if len(results) != 22:
        raise ValueError(f"Expected 22 sheets in manifest, parsed {len(results)}.")
    return results


def find_cell_spans(profile_1d: np.ndarray, total_len: int) -> list[tuple[int, int]]:
    """
    Find clean [start, end] pixel spans for 4 cells along X or Y axis,
    stripping dark black divider lines (if present) or locating flush vignette boundaries.
    """
    # Trim any black outer image frame
    start_edge = 0
    while start_edge < 32 and profile_1d[start_edge] < 14.0:
        start_edge += 1
    end_edge = total_len
    while end_edge > total_len - 32 and profile_1d[end_edge - 1] < 14.0:
        end_edge -= 1

    # Internal dividers near 1/4, 2/4, 3/4
    dividers: list[tuple[int, int]] = []
    for k in (1, 2, 3):
        nom = (total_len * k) // 4
        lo, hi = nom - 30, nom + 30
        seg = profile_1d[lo:hi]
        black_indices = np.where(seg < 14.0)[0]
        if len(black_indices) > 0:
            # Contiguous dark gutter strip around seam
            d0 = lo + int(black_indices[0])
            d1 = lo + int(black_indices[-1]) + 1
            dividers.append((d0, d1))
        else:
            # Flush seam: find local maximum gradient jump near quarter mark
            grad = np.abs(np.diff(profile_1d[nom - 20 : nom + 21]))
            seam = nom - 20 + int(np.argmax(grad)) + 1
            dividers.append((seam, seam))

    raw_spans = [
        (start_edge, dividers[0][0]),
        (dividers[0][1], dividers[1][0]),
        (dividers[1][1], dividers[2][0]),
        (dividers[2][1], end_edge),
    ]
    return raw_spans


def center_square_crop(im: Image.Image, x0: int, y0: int, x1: int, y1: int) -> Image.Image:
    """Apply small safety inset to eliminate border/seam artifacts and return a square crop."""
    ix0, ix1 = x0 + SAFETY_INSET, x1 - SAFETY_INSET
    iy0, iy1 = y0 + SAFETY_INSET, y1 - SAFETY_INSET
    cw = max(16, ix1 - ix0)
    ch = max(16, iy1 - iy0)
    side = min(cw, ch)
    cx = ix0 + (cw - side) // 2
    cy = iy0 + (ch - side) // 2
    return im.crop((cx, cy, cx + side, cy + side))


def main() -> int:
    SLICES_DIR.mkdir(parents=True, exist_ok=True)
    CLIENT_PORTRAITS_DIR.mkdir(parents=True, exist_ok=True)

    manifest = parse_manifest(SHEETS_TXT)
    exported_by_id: dict[str, str] = {}
    reserve_entries: list[dict] = []
    total_webp_bytes = 0
    slice_dims_sample: set[tuple[int, int]] = set()

    for sheet_num, slots in manifest:
        sheet_path = BATCH_DIR / f"rod_npc_sheet_{sheet_num:02d}.jpg"
        if not sheet_path.exists():
            raise FileNotFoundError(f"Missing downloaded sheet: {sheet_path}")

        with Image.open(sheet_path) as raw_im:
            im = raw_im.convert("RGB")
            arr = np.asarray(im, dtype=np.float32)
            col_profile = arr.mean(axis=(0, 2))
            row_profile = arr.mean(axis=(1, 2))

            col_spans = find_cell_spans(col_profile, im.width)
            row_spans = find_cell_spans(row_profile, im.height)

            for r in range(1, 5):
                y0, y1 = row_spans[r - 1]
                for c in range(1, 5):
                    x0, x1 = col_spans[c - 1]
                    nid, title = slots[(r, c)]

                    tile = center_square_crop(im, x0, y0, x1, y1)
                    slice_dims_sample.add(tile.size)

                    # Save full-res lossless PNG archive slice
                    png_out = SLICES_DIR / f"{nid}.png"
                    tile.save(png_out, "PNG")

                    # Export 512x512 compressed WebP portrait for Game Client
                    webp_out = CLIENT_PORTRAITS_DIR / f"{nid}.webp"
                    resized = tile.resize((TARGET_SIZE, TARGET_SIZE), Image.Resampling.LANCZOS)
                    resized.save(webp_out, "WEBP", quality=90, method=6)
                    w_bytes = webp_out.stat().st_size
                    total_webp_bytes += w_bytes

                    rel_path = f"assets/portraits/npcs/{nid}.webp"
                    exported_by_id[nid] = rel_path
                    if nid.startswith("npc_res_"):
                        reserve_entries.append({"id": nid, "title": title, "portraitPath": rel_path})

        print(f"Sliced Sheet {sheet_num:02d}/22 ({sheet_path.name}) -> 16 portraits")

    # Save manifest JSON inside client portraits folder
    manifest_payload = {
        "version": 1,
        "count": len(exported_by_id),
        "dimensions": f"{TARGET_SIZE}x{TARGET_SIZE}",
        "portraits": exported_by_id,
        "reserves": reserve_entries,
    }
    manifest_out = CLIENT_PORTRAITS_DIR / "npcs-portraits-manifest.json"
    manifest_out.write_text(json.dumps(manifest_payload, indent=2, ensure_ascii=False), encoding="utf-8")

    # Wire portraitPath into data/npcs-catalog.json and client/assets/data/npcs-catalog.json
    cat = json.loads(DATA_CATALOG.read_text(encoding="utf-8"))
    wired = 0
    for loc in cat["locations"]:
        for npc in loc["npcs"]:
            nid = npc["id"]
            if nid in exported_by_id:
                npc["portraitPath"] = exported_by_id[nid]
                if nid == "npc_loc_01_overgrown_garden_sanctuary_orin_capital_guard":
                    npc["primaryHeroPortraitPath"] = "assets/portraits/heroes/orin_avatar.webp"
                wired += 1
            elif nid in HERO_COMPANION_AVATARS:
                npc["portraitPath"] = HERO_COMPANION_AVATARS[nid]
                wired += 1

    # Also update portraitPath inside flat npcs list if present
    if isinstance(cat.get("npcs"), list):
        for npc in cat["npcs"]:
            nid = npc["id"]
            if nid in exported_by_id:
                npc["portraitPath"] = exported_by_id[nid]
            elif nid in HERO_COMPANION_AVATARS:
                npc["portraitPath"] = HERO_COMPANION_AVATARS[nid]

    encoded = json.dumps(cat, indent=2, ensure_ascii=False)
    DATA_CATALOG.write_text(encoded, encoding="utf-8")
    CLIENT_CATALOG.write_text(encoded, encoding="utf-8")

    total_mb = total_webp_bytes / (1024 * 1024)
    print(f"\nDone: Exported {len(exported_by_id)} WebP NPC portraits ({total_mb:.2f} MB total) -> client/assets/portraits/npcs/")
    print(f"Lossless PNG slices archived -> assets/tokens/npcs/slices/ (raw crop sizes: min={min(slice_dims_sample)}, max={max(slice_dims_sample)})")
    print(f"Wired portraitPath onto {wired} NPC entries in data/npcs-catalog.json & client/assets/data/npcs-catalog.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
