"""Slice available 4x4 Spell Card sheets, archive lossless PNGs, export 512x512 WebPs, and wire iconPath into spells catalogs."""

from __future__ import annotations

import json
import re
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(r"C:\Users\drew0\Documents\ROD")
SHEETS_TXT = ROOT / "imageprompts" / "spell-cards.txt"
BATCH_DIR = ROOT / "assets" / "spells" / "batch_sheets"
SLICES_DIR = ROOT / "assets" / "spells" / "slices"
CLIENT_SPELLS_DIR = ROOT / "client" / "assets" / "icons" / "spells"
DATA_CATALOG = ROOT / "data" / "spells-catalog.json"
CLIENT_CATALOG = ROOT / "client" / "assets" / "data" / "spells-catalog.json"

TARGET_SIZE = 512
SAFETY_INSET = 10


def parse_manifest(sheets_txt: Path) -> list[tuple[int, dict[tuple[int, int], tuple[str, str, str]]]]:
    """Parse SHEET XX OF YY slot manifests from imageprompts/spell-cards.txt."""
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
                sid, name, elem = m.group(3), m.group(4), m.group(5)
                slots[(r, c)] = (sid, name, elem)
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


def center_square_crop(im: Image.Image, x0: int, y0: int, x1: int, y1: int) -> Image.Image:
    """Trim dark seam margins symmetrically and return an exact square crop."""
    ix0, ix1 = x0 + SAFETY_INSET, x1 - SAFETY_INSET
    iy0, iy1 = y0 + SAFETY_INSET, y1 - SAFETY_INSET
    cw = max(16, ix1 - ix0)
    ch = max(16, iy1 - iy0)
    side = min(cw, ch)
    cx = ix0 + (cw - side) // 2
    cy = iy0 + (ch - side) // 2
    return im.crop((cx, cy, cx + side, cy + side))


def find_sheet_file(sheet_num: int) -> Path | None:
    stem = f"rod_spell_cards_sheet_{sheet_num:02d}"
    for ext in (".png", ".jpg", ".jpeg", ".webp"):
        cand = BATCH_DIR / f"{stem}{ext}"
        if cand.exists():
            return cand
    return None


def main() -> int:
    SLICES_DIR.mkdir(parents=True, exist_ok=True)
    CLIENT_SPELLS_DIR.mkdir(parents=True, exist_ok=True)

    manifest = parse_manifest(SHEETS_TXT)
    exported_by_id: dict[str, str] = {}
    reserve_entries: list[dict] = []
    total_webp_bytes = 0
    sliced_sheets = 0

    for sheet_num, slots in manifest:
        sheet_path = find_sheet_file(sheet_num)
        if not sheet_path:
            print(f"Skipping Sheet {sheet_num:02d}/{len(manifest):02d} (not generated/downloaded yet)")
            continue

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
                    sid, name, elem = slots[(r, c)]

                    tile = center_square_crop(im, x0, y0, x1, y1)
                    png_out = SLICES_DIR / f"{sid}.png"
                    tile.save(png_out, "PNG")

                    webp_out = CLIENT_SPELLS_DIR / f"{sid}.webp"
                    resized = tile.resize((TARGET_SIZE, TARGET_SIZE), Image.Resampling.LANCZOS)
                    resized.save(webp_out, "WEBP", quality=90, method=6)
                    total_webp_bytes += webp_out.stat().st_size

                    rel_path = f"assets/icons/spells/{sid}.webp"
                    exported_by_id[sid] = rel_path
                    if sid.startswith("ability_res_"):
                        reserve_entries.append({"id": sid, "name": name, "type": elem, "iconPath": rel_path})

        sliced_sheets += 1
        print(f"Sliced Sheet {sheet_num:02d}/{len(manifest):02d} ({sheet_path.name}) -> 16 cards")

    # Include any previously exported spell cards in case sheets were sliced incrementally
    for webp in sorted(CLIENT_SPELLS_DIR.glob("*.webp")):
        exported_by_id.setdefault(webp.stem, f"assets/icons/spells/{webp.name}")

    manifest_out = CLIENT_SPELLS_DIR / "spells-cards-manifest.json"
    manifest_out.write_text(
        json.dumps(
            {
                "version": 1,
                "count": len(exported_by_id),
                "dimensions": f"{TARGET_SIZE}x{TARGET_SIZE}",
                "cards": exported_by_id,
                "reserves": reserve_entries,
            },
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    # Wire real card iconPath onto spells present in spells-catalog.json
    cat = json.loads(DATA_CATALOG.read_text(encoding="utf-8"))
    wired = 0
    for sp in cat.get("spells", []):
        sid = sp["id"]
        if sid in exported_by_id:
            sp["iconPath"] = exported_by_id[sid]
            wired += 1

    encoded = json.dumps(cat, indent=2, ensure_ascii=False)
    DATA_CATALOG.write_text(encoded, encoding="utf-8")
    CLIENT_CATALOG.write_text(encoded, encoding="utf-8")

    total_kb = total_webp_bytes / 1024
    print(f"\nDone: Sliced {sliced_sheets} sheet(s) -> {len(exported_by_id)} total WebP cards ({total_kb:.1f} KB exported now)")
    print(f"Wired iconPath onto {wired}/72 spells in data/spells-catalog.json & client/assets/data/spells-catalog.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
