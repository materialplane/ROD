"""Slice available 4x4 Spell Card sheets, archive lossless PNGs, export 512x512 WebPs, and wire iconPath into spells catalogs."""

from __future__ import annotations

import json
from pathlib import Path

try:
    from card_sheet_slicer import DEFAULT_SAFETY_INSET, DEFAULT_TARGET_SIZE, slice_4x4_sheets
except ImportError:
    from tools.card_sheet_slicer import DEFAULT_SAFETY_INSET, DEFAULT_TARGET_SIZE, slice_4x4_sheets

ROOT = Path(r"C:\Users\drew0\Documents\ROD")
SHEETS_TXT = ROOT / "imageprompts" / "spell-cards.txt"
BATCH_DIR = ROOT / "assets" / "spells" / "batch_sheets"
SLICES_DIR = ROOT / "assets" / "spells" / "slices"
CLIENT_SPELLS_DIR = ROOT / "client" / "assets" / "icons" / "spells"
DATA_CATALOG = ROOT / "data" / "spells-catalog.json"
CLIENT_CATALOG = ROOT / "client" / "assets" / "data" / "spells-catalog.json"


def main() -> int:
    sliced_sheets, exported_by_id, slot_entries, total_webp_bytes = slice_4x4_sheets(
        sheets_txt=SHEETS_TXT,
        batch_dir=BATCH_DIR,
        sheet_prefix="rod_spell_cards_sheet_",
        slices_dir=SLICES_DIR,
        client_dir=CLIENT_SPELLS_DIR,
        rel_prefix="assets/icons/spells",
        target_size=DEFAULT_TARGET_SIZE,
        safety_inset=DEFAULT_SAFETY_INSET,
    )

    reserve_entries = [
        {"id": e["id"], "name": e["name"], "type": e["detail"], "iconPath": e["iconPath"]}
        for e in slot_entries
        if e["id"].startswith("ability_res_")
    ]

    manifest_out = CLIENT_SPELLS_DIR / "spells-cards-manifest.json"
    manifest_out.write_text(
        json.dumps(
            {
                "version": 1,
                "count": len(exported_by_id),
                "dimensions": f"{DEFAULT_TARGET_SIZE}x{DEFAULT_TARGET_SIZE}",
                "cards": exported_by_id,
                "reserves": reserve_entries,
            },
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

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
