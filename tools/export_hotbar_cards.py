"""Slice 4x4 Weapon Ability and Magic Tier Card sheets into lossless PNGs, 512x512 client WebPs, and manifests."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

try:
    from card_sheet_slicer import DEFAULT_SAFETY_INSET, DEFAULT_TARGET_SIZE, slice_4x4_sheets
except ImportError:
    from tools.card_sheet_slicer import DEFAULT_SAFETY_INSET, DEFAULT_TARGET_SIZE, slice_4x4_sheets

ROOT = Path(r"C:\Users\drew0\Documents\ROD")

SETS = {
    "weapon_abilities": {
        "sheets_txt": ROOT / "imageprompts" / "weapon-abilities.txt",
        "batch_dir": ROOT / "assets" / "weapon_abilities" / "batch_sheets",
        "sheet_prefix": "rod_weapon_abilities_sheet_",
        "slices_dir": ROOT / "assets" / "weapon_abilities" / "slices",
        "client_dir": ROOT / "client" / "assets" / "icons" / "weapon_abilities",
        "rel_prefix": "assets/icons/weapon_abilities",
        "manifest_name": "weapon-abilities-manifest.json",
    },
    "magic_tiers": {
        "sheets_txt": ROOT / "imageprompts" / "magic-tiers.txt",
        "batch_dir": ROOT / "assets" / "magic_tiers" / "batch_sheets",
        "sheet_prefix": "rod_magic_tiers_sheet_",
        "slices_dir": ROOT / "assets" / "magic_tiers" / "slices",
        "client_dir": ROOT / "client" / "assets" / "icons" / "magic_tiers",
        "rel_prefix": "assets/icons/magic_tiers",
        "manifest_name": "magic-tiers-manifest.json",
    },
}


def export_set(key: str) -> None:
    cfg = SETS[key]
    sliced_sheets, exported_by_id, slot_entries, total_webp_bytes = slice_4x4_sheets(
        sheets_txt=cfg["sheets_txt"],
        batch_dir=cfg["batch_dir"],
        sheet_prefix=cfg["sheet_prefix"],
        slices_dir=cfg["slices_dir"],
        client_dir=cfg["client_dir"],
        rel_prefix=cfg["rel_prefix"],
        target_size=DEFAULT_TARGET_SIZE,
        safety_inset=DEFAULT_SAFETY_INSET,
    )

    manifest_out = cfg["client_dir"] / cfg["manifest_name"]
    manifest_out.write_text(
        json.dumps(
            {
                "version": 1,
                "count": len(exported_by_id),
                "dimensions": f"{DEFAULT_TARGET_SIZE}x{DEFAULT_TARGET_SIZE}",
                "cards": exported_by_id,
                "slots": slot_entries,
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )

    total_kb = total_webp_bytes / 1024
    print(f"Done [{key}]: Sliced {sliced_sheets} sheet(s) -> {len(exported_by_id)} WebPs ({total_kb:.1f} KB) + {manifest_out.name}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Export Weapon Ability and Magic Tier 4x4 card sheets into client WebPs.")
    parser.add_argument("--set", choices=[*SETS.keys(), "all"], default="all")
    args = parser.parse_args()

    keys = list(SETS.keys()) if args.set == "all" else [args.set]
    for k in keys:
        export_set(k)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
