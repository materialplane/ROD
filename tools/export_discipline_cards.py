"""Slice 4x4 Hero Discipline Card sheets, archive lossless PNGs, export 512x512 WebPs, and wire iconPath into catalogs."""

from __future__ import annotations

import json
from pathlib import Path

try:
    from card_sheet_slicer import DEFAULT_SAFETY_INSET, DEFAULT_TARGET_SIZE, slice_4x4_sheets
except ImportError:
    from tools.card_sheet_slicer import DEFAULT_SAFETY_INSET, DEFAULT_TARGET_SIZE, slice_4x4_sheets

ROOT = Path(r"C:\Users\drew0\Documents\ROD")
SHEETS_TXT = ROOT / "imageprompts" / "disciplines.txt"
BATCH_DIR = ROOT / "assets" / "disciplines" / "batch_sheets"
SLICES_DIR = ROOT / "assets" / "disciplines" / "slices"
CLIENT_DISCIPLINES_DIR = ROOT / "client" / "assets" / "icons" / "disciplines"
DATA_CATALOG = ROOT / "data" / "disciplines-catalog.json"
CLIENT_CATALOG = ROOT / "client" / "assets" / "data" / "disciplines-catalog.json"


def main() -> int:
    sliced_sheets, exported_by_id, slot_entries, total_webp_bytes = slice_4x4_sheets(
        sheets_txt=SHEETS_TXT,
        batch_dir=BATCH_DIR,
        sheet_prefix="rod_discipline_cards_sheet_",
        slices_dir=SLICES_DIR,
        client_dir=CLIENT_DISCIPLINES_DIR,
        rel_prefix="assets/icons/disciplines",
        target_size=DEFAULT_TARGET_SIZE,
        safety_inset=DEFAULT_SAFETY_INSET,
    )

    pillars = [e for e in slot_entries if e["id"].startswith("disc_pillar_")]
    reserves = [e for e in slot_entries if e["id"].startswith("disc_res_")]

    manifest_out = CLIENT_DISCIPLINES_DIR / "disciplines-cards-manifest.json"
    manifest_out.write_text(
        json.dumps(
            {
                "version": 1,
                "count": len(exported_by_id),
                "dimensions": f"{DEFAULT_TARGET_SIZE}x{DEFAULT_TARGET_SIZE}",
                "cards": exported_by_id,
                "pillars": pillars,
                "reserves": reserves,
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )

    cat = json.loads(DATA_CATALOG.read_text(encoding="utf-8"))
    wired = 0
    total = 0
    for hero in cat.get("heroes", []):
        for tier in hero.get("tiers", []):
            for key in ("optionA", "optionB"):
                opt = tier.get(key)
                if not opt:
                    continue
                total += 1
                sid = opt["id"]
                if sid in exported_by_id:
                    opt["iconPath"] = exported_by_id[sid]
                    wired += 1

    encoded = json.dumps(cat, indent=2, ensure_ascii=False) + "\n"
    DATA_CATALOG.write_text(encoded, encoding="utf-8")
    CLIENT_CATALOG.parent.mkdir(parents=True, exist_ok=True)
    CLIENT_CATALOG.write_text(encoded, encoding="utf-8")

    total_kb = total_webp_bytes / 1024
    print(f"\nDone: Sliced {sliced_sheets} sheet(s) -> {len(exported_by_id)} total WebP cards ({total_kb:.1f} KB exported now)")
    print(f"Wired iconPath onto {wired}/{total} hero disciplines in data/disciplines-catalog.json & client/assets/data/disciplines-catalog.json")
    print(f"Included {len(pillars)} pillar emblems & {len(reserves)} reserve cards in disciplines-cards-manifest.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
