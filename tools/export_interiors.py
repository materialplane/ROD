"""Export 41 Hub Interiors & 18 Settlement Taverns to compressed 2560x1440 WebPs and wire world-locations.json."""

from __future__ import annotations

import json
import re
import shutil
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(r"C:\Users\drew0\Documents\ROD")
SRC_DIR = ROOT / "assets" / "maps" / "interiors"
DST_DIR = ROOT / "client" / "assets" / "maps" / "interiors"
TAVERNS_SRC_DIR = ROOT / "assets" / "maps" / "taverns"
TAVERNS_DST_DIR = ROOT / "client" / "assets" / "maps" / "taverns"
TAVERNS_PROMPTS_FILE = ROOT / "imageprompts" / "bard-tavern.txt"
DATA_DIR = ROOT / "data"
CLIENT_DATA_DIR = ROOT / "client" / "assets" / "data"
WORLD_DATA = DATA_DIR / "world-locations.json"
CLIENT_WORLD_DATA = CLIENT_DATA_DIR / "world-locations.json"

TARGET_WIDTH = 2560
TARGET_HEIGHT = 1440
WEBP_QUALITY = 88


def parse_tavern_names() -> dict[str, str]:
    """Read '[NN] ID: <loc_id> | <Town> — <Tavern Name>' from imageprompts/bard-tavern.txt."""
    if not TAVERNS_PROMPTS_FILE.exists():
        return {}
    names: dict[str, str] = {}
    text = TAVERNS_PROMPTS_FILE.read_text(encoding="utf-8")
    for m in re.finditer(r"^\[\d+\]\s+ID:\s+(\S+)\s+\|\s+(.+?)\s+—\s+(.+?)(?:\s+\(Bard:[^)]+\))?$", text, re.M):
        names[m.group(1).strip()] = m.group(3).strip()
    return names


def export_interior_webps() -> dict[str, str]:
    """Convert all 4K interior masters in assets/maps/interiors/ to compressed 2560x1440 WebPs."""
    if not SRC_DIR.exists():
        raise FileNotFoundError(f"Missing interior masters directory: {SRC_DIR}")

    DST_DIR.mkdir(parents=True, exist_ok=True)
    exported: dict[str, str] = {}
    total_bytes = 0

    src_files = sorted(
        p for p in SRC_DIR.iterdir()
        if p.is_file() and p.suffix.lower() in {".jpg", ".jpeg", ".png"} and not p.name.startswith("_rejected")
    )
    if len(src_files) != 41:
        raise ValueError(f"Expected 41 interior masters in {SRC_DIR}, found {len(src_files)}.")

    for src in src_files:
        dst = DST_DIR / f"{src.stem}.webp"
        with Image.open(src) as im:
            rgb = im.convert("RGB")
            resized = rgb.resize((TARGET_WIDTH, TARGET_HEIGHT), Image.Resampling.LANCZOS)
            resized.save(dst, "WEBP", quality=WEBP_QUALITY, method=6)
        size = dst.stat().st_size
        total_bytes += size
        rel_asset = f"assets/maps/interiors/{dst.name}"
        exported[src.stem] = rel_asset
        print(f"  Exported {dst.name:46s} ({TARGET_WIDTH}x{TARGET_HEIGHT}, {size // 1024:3d} KB)")

    print(f"\nExported {len(exported)} interior WebPs -> {DST_DIR.relative_to(ROOT)} ({total_bytes / (1024 * 1024):.2f} MB total)")
    return exported


def export_tavern_webps() -> dict[str, tuple[str, str]]:
    """Convert all 18 approved 4K settlement tavern masters in assets/maps/taverns/ to 2560x1440 WebPs."""
    if not TAVERNS_SRC_DIR.exists():
        raise FileNotFoundError(f"Missing tavern masters directory: {TAVERNS_SRC_DIR}")

    TAVERNS_DST_DIR.mkdir(parents=True, exist_ok=True)
    tavern_names = parse_tavern_names()
    exported: dict[str, tuple[str, str]] = {}
    total_bytes = 0

    src_files = sorted(
        p for p in TAVERNS_SRC_DIR.iterdir()
        if p.is_file() and p.suffix.lower() in {".jpg", ".jpeg", ".png"} and not p.name.startswith("_rejected")
    )
    if len(src_files) != 18:
        raise ValueError(f"Expected 18 approved tavern masters in {TAVERNS_SRC_DIR}, found {len(src_files)}.")

    for src in src_files:
        if not src.stem.endswith("_tavern"):
            raise ValueError(f"Unexpected tavern filename format: {src.name}")
        loc_id = src.stem[: -len("_tavern")]
        dst = TAVERNS_DST_DIR / f"{src.stem}.webp"
        with Image.open(src) as im:
            rgb = im.convert("RGB")
            resized = rgb.resize((TARGET_WIDTH, TARGET_HEIGHT), Image.Resampling.LANCZOS)
            resized.save(dst, "WEBP", quality=WEBP_QUALITY, method=6)
        size = dst.stat().st_size
        total_bytes += size
        rel_asset = f"assets/maps/taverns/{dst.name}"
        t_name = tavern_names.get(loc_id, f"{loc_id} Tavern")
        exported[loc_id] = (rel_asset, t_name)
        print(f"  Exported {dst.name:46s} ({TARGET_WIDTH}x{TARGET_HEIGHT}, {size // 1024:3d} KB) | {t_name}")

    print(f"\nExported {len(exported)} tavern WebPs -> {TAVERNS_DST_DIR.relative_to(ROOT)} ({total_bytes / (1024 * 1024):.2f} MB total)")
    return exported


def wire_world_locations(
    exported_interiors: dict[str, str] | None = None,
    exported_taverns: dict[str, tuple[str, str]] | None = None,
) -> int:
    """Attach interiorAssetPath, tavernAssetPath, and tavernName into world-locations.json & client mirror."""
    world = json.loads(WORLD_DATA.read_text(encoding="utf-8"))
    wired_interiors = 0
    wired_taverns = 0
    for loc in world.get("locations", []):
        lid = loc.get("id")
        if exported_interiors and lid in exported_interiors:
            loc["interiorAssetPath"] = exported_interiors[lid]
            wired_interiors += 1
        if exported_taverns and lid in exported_taverns:
            t_path, t_name = exported_taverns[lid]
            loc["tavernAssetPath"] = t_path
            loc["tavernName"] = t_name
            wired_taverns += 1

    formatted = json.dumps(world, indent=2, ensure_ascii=False)
    WORLD_DATA.write_text(formatted, encoding="utf-8")
    CLIENT_WORLD_DATA.parent.mkdir(parents=True, exist_ok=True)
    CLIENT_WORLD_DATA.write_text(formatted, encoding="utf-8")
    print(
        f"Wired {wired_interiors} interiorAssetPath and {wired_taverns} tavernAssetPath entries "
        "in data/ & client/assets/data/world-locations.json"
    )

    for catalog_name in ("npcs-catalog.json", "quests-catalog.json"):
        src_cat = DATA_DIR / catalog_name
        dst_cat = CLIENT_DATA_DIR / catalog_name
        if src_cat.exists():
            shutil.copy2(src_cat, dst_cat)
            print(f"Synced {catalog_name} -> {dst_cat.relative_to(ROOT)}")

    return wired_interiors + wired_taverns


if __name__ == "__main__":
    taverns_only = "--taverns-only" in sys.argv
    interiors_only = "--interiors-only" in sys.argv
    exported_int = None if taverns_only else export_interior_webps()
    exported_tav = None if interiors_only else export_tavern_webps()
    wire_world_locations(exported_int, exported_tav)
