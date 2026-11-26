"""Slice 2x2 delve card sheets, strip black gutters & rounded corners cleanly, and export client WebPs."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

REPO_ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = REPO_ROOT / "assets" / "ui" / "dungeons"
SLICES_DIR = SRC_DIR / "slices"
CLIENT_CARDS_DIR = REPO_ROOT / "client" / "assets" / "ui" / "dungeons" / "cards"
CLIENT_BACKS_DIR = REPO_ROOT / "client" / "assets" / "ui" / "dungeons" / "backs"
ROOMS_SRC_DIR = REPO_ROOT / "assets" / "maps" / "dungeons" / "base_stone_brick"
CLIENT_ROOMS_DIR = REPO_ROOT / "client" / "assets" / "maps" / "dungeons" / "base_stone_brick"
BATTLEGROUNDS_SRC_DIR = REPO_ROOT / "assets" / "maps" / "battle_scenes"
CLIENT_BATTLEGROUNDS_DIR = REPO_ROOT / "client" / "assets" / "maps" / "battle_scenes"
BASE_BATTLEGROUND_IDS = (
    "dungeon_02_stone_hearth_arena",
    "dungeon_03_basalt_vault_arena",
    "dungeon_04_moss_cistern_arena",
)

CARD_TARGET_HEIGHT = 1440  # Proportional HiDPI height (zero aspect distortion, sharp card text)
ROOM_TARGET_SIZE = (2560, 1440)  # Matches hub interiors 16:9 runtime WebP scale
ROOM_WEBP_QUALITY = 88

SHEET_MANIFESTS: dict[str, dict[str, object]] = {
    "base_cards_00_backs_9x16": {
        "kind": "back",
        "slots": {
            (1, 1): "back_sigil_01",
            (1, 2): "back_sigil_02",
            (2, 1): "back_sigil_03",
            (2, 2): "back_sigil_04",
        },
    },
    "base_cards_01_doors_stairs_9x16": {
        "kind": "card",
        "slots": {
            (1, 1): "base_03",
            (1, 2): "base_asc_stairs",
            (2, 1): "base_14",
            (2, 2): "base_stone_door",
        },
    },
    "base_cards_02_chests_9x16": {
        "kind": "card",
        "slots": {
            (1, 1): "base_01",
            (1, 2): "base_chest_bronze",
            (2, 1): "base_chest_crimson",
            (2, 2): "base_chest_gold",
        },
    },
    "base_cards_03_springs_shrines_9x16": {
        "kind": "card",
        "slots": {
            (1, 1): "base_04",
            (1, 2): "base_07",
            (2, 1): "base_shrine_phys_resist",
            (2, 2): "base_shrine_magic_resist",
        },
    },
    "base_cards_04_traps_9x16": {
        "kind": "card",
        "slots": {
            (1, 1): "base_12",
            (1, 2): "base_20",
            (2, 1): "base_trap_spikes",
            (2, 2): "base_trap_frost_rune",
        },
    },
    "base_cards_05_ambushes_9x16": {
        "kind": "card",
        "slots": {
            (1, 1): "base_ambush_01",
            (1, 2): "base_ambush_02",
            (2, 1): "base_ambush_03",
            (2, 2): "base_ambush_04",
        },
    },
}


def find_sheet_file(stem: str) -> Path | None:
    """Locate sheet master image under assets/ui/dungeons/."""
    for ext in (".png", ".jpg", ".jpeg", ".webp"):
        cand = SRC_DIR / f"{stem}{ext}"
        if cand.exists():
            return cand
    return None


def find_center_seams(arr: np.ndarray) -> tuple[int, int]:
    """Find darkest horizontal & vertical gutter centers near the 2x2 midlines."""
    h, w, _ = arr.shape
    mx = arr.max(axis=2)

    x_lo, x_hi = max(0, w // 2 - 120), min(w, w // 2 + 120)
    y_lo, y_hi = max(0, h // 2 - 180), min(h, h // 2 + 180)

    x_prof = mx[:, x_lo:x_hi].mean(axis=0)
    y_prof = mx[y_lo:y_hi, :].mean(axis=1)

    sx = x_lo + int(np.argmin(x_prof))
    sy = y_lo + int(np.argmin(y_prof))
    return sx, sy


def strip_exterior_black_corners(tile: Image.Image, corner_radius_frac: float = 0.030) -> Image.Image:
    """Trim tightly onto the solid basalt bezel on all 4 sides and apply smooth rounded-corner alpha."""
    rgb = np.asarray(tile.convert("RGB"), dtype=np.uint8)
    h, w, _ = rgb.shape
    mx = rgb.max(axis=2)

    # Measure middle 70% along each edge (strictly away from the 4 corners) so straight sides
    # crop cleanly into the solid outer basalt bezel with zero black gutter or jagged wobble.
    mid_rows = mx[:, int(w * 0.15) : int(w * 0.85)].mean(axis=1)
    mid_cols = mx[int(h * 0.15) : int(h * 0.85), :].mean(axis=0)

    r_hits = np.where(mid_rows >= 28.0)[0]
    c_hits = np.where(mid_cols >= 28.0)[0]
    y0 = min(int(r_hits[0]) + 4, h // 4) if len(r_hits) else 0
    y1 = max(int(r_hits[-1]) - 3, (h * 3) // 4) if len(r_hits) else h
    x0 = min(int(c_hits[0]) + 4, w // 4) if len(c_hits) else 0
    x1 = max(int(c_hits[-1]) - 3, (w * 3) // 4) if len(c_hits) else w

    cropped = Image.fromarray(rgb[y0:y1, x0:x1], mode="RGB").convert("RGBA")
    cw, ch = cropped.size

    # Apply a 4x supersampled anti-aliased rounded-rectangle mask strictly at the 4 corners
    # so zero black corner triangles remain and all 4 straight edges stay 100% opaque (alpha=255).
    radius = max(12, round(cw * corner_radius_frac))
    ss = 4
    mask_hi = Image.new("L", (cw * ss, ch * ss), 0)
    draw = ImageDraw.Draw(mask_hi)
    draw.rounded_rectangle((0, 0, cw * ss - 1, ch * ss - 1), radius=radius * ss, fill=255)
    mask = mask_hi.resize((cw, ch), Image.Resampling.LANCZOS)
    cropped.putalpha(mask)
    return cropped


def fit_to_card_canvas(card_rgba: Image.Image, target_height: int = CARD_TARGET_HEIGHT) -> Image.Image:
    """Resize trimmed card proportionally to preserve exact natural aspect ratio and sharp text."""
    cw, ch = card_rgba.size
    if ch == target_height:
        return card_rgba
    nw = max(1, round(cw * (target_height / ch)))
    return card_rgba.resize((nw, target_height), Image.Resampling.LANCZOS)


def process_sheet(stem: str, config: dict[str, object]) -> int:
    """Slice one 2x2 sheet and export RGBA PNG masters + runtime WebPs."""
    sheet_path = find_sheet_file(stem)
    if not sheet_path:
        print(f"Skipping {stem} (not generated yet)")
        return 0

    SLICES_DIR.mkdir(parents=True, exist_ok=True)
    out_dir = CLIENT_BACKS_DIR if config["kind"] == "back" else CLIENT_CARDS_DIR
    out_dir.mkdir(parents=True, exist_ok=True)

    with Image.open(sheet_path) as raw:
        im = raw.convert("RGB")
        w, h = im.size
        skip_client: set[str] = config.get("skip_client", set())  # type: ignore[assignment]

        single_id = config.get("single")
        if isinstance(single_id, str):
            work_items = [("single", im, single_id)]
            seam_note = "single 9:16"
        else:
            sx, sy = find_center_seams(np.asarray(im))
            boxes = {
                (1, 1): (0, 0, sx, sy),
                (1, 2): (sx, 0, w, sy),
                (2, 1): (0, sy, sx, h),
                (2, 2): (sx, sy, w, h),
            }
            slots: dict[tuple[int, int], str] = config["slots"]  # type: ignore[assignment]
            work_items = [(rc, im.crop(boxes[rc]), cid) for rc, cid in slots.items()]
            seam_note = f"seam=({sx},{sy})"

        exported = 0
        for label, tile, card_id in work_items:
            clean_rgba = strip_exterior_black_corners(tile)

            png_out = SLICES_DIR / f"{card_id}.png"
            clean_rgba.save(png_out, "PNG")

            if card_id in skip_client:
                print(f"  {label} -> {card_id}.png (master slice only; skipped in client)")
                continue

            runtime_im = fit_to_card_canvas(clean_rgba)
            webp_out = out_dir / f"{card_id}.webp"
            runtime_im.save(webp_out, "WEBP", quality=95, method=6)

            a = np.asarray(runtime_im)[:, :, 3]
            corner_alphas = [int(a[0, 0]), int(a[0, -1]), int(a[-1, 0]), int(a[-1, -1])]
            print(
                f"  {label} -> {card_id}.webp | trim={clean_rgba.size} | webp={webp_out.stat().st_size}B | corners_alpha={corner_alphas}"
            )
            exported += 1

    print(f"Processed {sheet_path.name} ({w}x{h}, {seam_note}) -> {exported} RGBA assets")
    return exported


def export_base_rooms() -> int:
    """Convert generated 16:9 4K Stone-Brick Room masters (.png/.jpg/.webp) to 2560x1440 client WebPs."""
    if not ROOMS_SRC_DIR.exists():
        return 0
    CLIENT_ROOMS_DIR.mkdir(parents=True, exist_ok=True)
    exported = 0
    srcs = sorted(
        p
        for p in ROOMS_SRC_DIR.iterdir()
        if p.is_file() and p.stem.startswith("room_") and p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}
    )
    for src in srcs:
        dst = CLIENT_ROOMS_DIR / f"{src.stem}.webp"
        with Image.open(src) as im:
            resized = im.convert("RGB").resize(ROOM_TARGET_SIZE, Image.Resampling.LANCZOS)
            resized.save(dst, "WEBP", quality=ROOM_WEBP_QUALITY, method=6)
        print(f"  room -> {dst.name} ({ROOM_TARGET_SIZE[0]}x{ROOM_TARGET_SIZE[1]}, {dst.stat().st_size // 1024} KB)")
        exported += 1
    return exported


def export_base_battlegrounds() -> int:
    """Convert generated 16:9 4K Stone-Brick Battleground masters (.png/.jpg/.webp) to 2560x1440 client WebPs."""
    if not BATTLEGROUNDS_SRC_DIR.exists():
        return 0
    CLIENT_BATTLEGROUNDS_DIR.mkdir(parents=True, exist_ok=True)
    exported = 0
    for bg_id in BASE_BATTLEGROUND_IDS:
        src = next(
            (
                BATTLEGROUNDS_SRC_DIR / f"{bg_id}{ext}"
                for ext in (".png", ".jpg", ".jpeg", ".webp")
                if (BATTLEGROUNDS_SRC_DIR / f"{bg_id}{ext}").exists()
            ),
            None,
        )
        if not src:
            print(f"  Skipping {bg_id} (master missing)")
            continue
        dst = CLIENT_BATTLEGROUNDS_DIR / f"{bg_id}.webp"
        with Image.open(src) as im:
            resized = im.convert("RGB").resize(ROOM_TARGET_SIZE, Image.Resampling.LANCZOS)
            resized.save(dst, "WEBP", quality=ROOM_WEBP_QUALITY, method=6)
        print(f"  battleground -> {dst.name} ({ROOM_TARGET_SIZE[0]}x{ROOM_TARGET_SIZE[1]}, {dst.stat().st_size // 1024} KB)")
        exported += 1
    return exported


def export_biome_deck(deck_id: str) -> int:
    """Slice 5x 2x2 sheets + export 8x scenes + 3x battlegrounds for any Base Deck and wire proposed-decks & battle-config."""
    proposed_path = REPO_ROOT / "data" / "proposed-decks.json"
    catalog = json.loads(proposed_path.read_text(encoding="utf-8"))
    deck = next((dk for dk in catalog.get("decks", []) if dk.get("id") == deck_id), None)
    if not deck:
        raise ValueError(f"Deck '{deck_id}' not found in {proposed_path}")

    rooms = deck.get("roomPool16x9", [])
    cards = deck.get("cards", [])
    bgs = deck.get("battlegrounds", [])
    if len(rooms) != 8 or len(cards) != 20 or len(bgs) != 3:
        raise ValueError(f"Deck {deck_id} missing expected counts (cards={len(cards)}, rooms={len(rooms)}, bgs={len(bgs)})")

    biome_slug = rooms[0]["id"].rsplit("_room_", 1)[0]
    sheets_dir = SRC_DIR / f"base_{biome_slug}"
    SLICES_DIR.mkdir(parents=True, exist_ok=True)
    CLIENT_CARDS_DIR.mkdir(parents=True, exist_ok=True)
    rooms_src = REPO_ROOT / "assets" / "maps" / "dungeons" / f"base_{biome_slug}"
    rooms_dst = REPO_ROOT / "client" / "assets" / "maps" / "dungeons" / f"base_{biome_slug}"
    rooms_dst.mkdir(parents=True, exist_ok=True)
    CLIENT_BATTLEGROUNDS_DIR.mkdir(parents=True, exist_ok=True)

    exported = 0
    ref_assets = []
    # 1. Slice 5x 2x2 card sheets (4 cards per sheet: slots (1,1),(1,2),(2,1),(2,2))
    sheet_files = sorted(
        p for p in sheets_dir.iterdir()
        if p.is_file() and f"{biome_slug}_cards_" in p.stem and p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}
    ) if sheets_dir.exists() else []
    grid_rc = [(1, 1), (1, 2), (2, 1), (2, 2)]

    for s_idx in range(1, 6):
        prefix = f"{biome_slug}_cards_{s_idx:02d}_"
        sheet_path = next((p for p in sheet_files if p.stem.startswith(prefix)), None)
        sheet_cards = cards[(s_idx - 1) * 4 : s_idx * 4]
        if not sheet_path:
            print(f"  Skipping Sheet {s_idx:02d} (missing {prefix}*)")
            continue

        ref_assets.append({
            "id": f"ref_{biome_slug}_sheet_{s_idx}",
            "label": sheet_cards[0].get("sheetGroup", f"Sheet {s_idx}") + " (2x2)",
            "path": f"/repo-assets/ui/dungeons/base_{biome_slug}/{sheet_path.name}",
            "note": f"Pro 3 4K — {', '.join(c['title'] for c in sheet_cards)}",
        })

        with Image.open(sheet_path) as raw:
            im = raw.convert("RGB")
            w, h = im.size
            sx, sy = find_center_seams(np.asarray(im))
            boxes = {(1, 1): (0, 0, sx, sy), (1, 2): (sx, 0, w, sy), (2, 1): (0, sy, sx, h), (2, 2): (sx, sy, w, h)}
            for rc, card in zip(grid_rc, sheet_cards):
                clean_rgba = strip_exterior_black_corners(im.crop(boxes[rc]))
                cid = card["id"]
                (SLICES_DIR / f"{cid}.png").write_bytes(b"")  # ensure path writable
                clean_rgba.save(SLICES_DIR / f"{cid}.png", "PNG")
                runtime_im = fit_to_card_canvas(clean_rgba)
                webp_out = CLIENT_CARDS_DIR / f"{cid}.webp"
                runtime_im.save(webp_out, "WEBP", quality=95, method=6)
                card["renderedCardPath"] = f"/assets/ui/dungeons/cards/{cid}.webp"
                exported += 1
        print(f"  Sliced & Exported {sheet_path.name} -> 4 card WebPs ({sheet_cards[0]['id']}..{sheet_cards[-1]['id']})")

    # 2. Export 8x 16:9 Scenes -> 2560x1440 WebP
    for rm in rooms:
        rid = rm["id"]
        src = next((rooms_src / f"{rid}{ext}" for ext in (".png", ".jpg", ".jpeg", ".webp") if (rooms_src / f"{rid}{ext}").exists()), None)
        if not src:
            print(f"  Skipping scene {rid} (master missing)")
            continue
        dst = rooms_dst / f"{rid}.webp"
        with Image.open(src) as im:
            im.convert("RGB").resize(ROOM_TARGET_SIZE, Image.Resampling.LANCZOS).save(dst, "WEBP", quality=ROOM_WEBP_QUALITY, method=6)
        rm["sampleRefPath"] = f"/assets/maps/dungeons/base_{biome_slug}/{rid}.webp"
        exported += 1
        print(f"  scene -> {dst.name} ({dst.stat().st_size // 1024} KB)")

    # 3. Export 3x 16:9 Battlegrounds -> 2560x1440 WebP + battle-config.json
    new_stages = []
    for bg in bgs:
        bg_id = bg["id"]
        src = next((BATTLEGROUNDS_SRC_DIR / f"{bg_id}{ext}" for ext in (".png", ".jpg", ".jpeg", ".webp") if (BATTLEGROUNDS_SRC_DIR / f"{bg_id}{ext}").exists()), None)
        if not src:
            print(f"  Skipping battleground {bg_id} (master missing)")
            continue
        dst = CLIENT_BATTLEGROUNDS_DIR / f"{bg_id}.webp"
        with Image.open(src) as im:
            im.convert("RGB").resize(ROOM_TARGET_SIZE, Image.Resampling.LANCZOS).save(dst, "WEBP", quality=ROOM_WEBP_QUALITY, method=6)
        bg["sampleRefPath"] = f"/assets/maps/battle_scenes/{bg_id}.webp"
        new_stages.append((bg_id, bg.get("roomTitle", bg_id), f"assets/maps/battle_scenes/{bg_id}.webp"))
        exported += 1
        print(f"  battleground -> {dst.name} ({dst.stat().st_size // 1024} KB)")

    if ref_assets:
        deck["referenceAssets"] = ref_assets
    deck["status"] = "Generated & Exported — Ready to Review"
    catalog["updatedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    proposed_path.write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    # Merge new stages into data/battle-config.json & client/assets/data/battle-config.json cleanly
    if new_stages:
        for cfg_path in (REPO_ROOT / "data" / "battle-config.json", REPO_ROOT / "client" / "assets" / "data" / "battle-config.json"):
            if not cfg_path.exists():
                continue
            cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
            stages = cfg.get("stages", [])
            by_id = {s.get("id"): s for s in stages if isinstance(s, dict)}
            hz_def = dict(cfg.get("heroZoneDefault", {"xPct": 60.0, "yPct": 23.0, "wPct": 35.0, "hPct": 54.0, "staggerPct": 0.0, "backScale": 0.90, "frontScale": 1.0}))
            eg_def = dict(cfg.get("enemyGridDefault", {"xPct": 4.0, "yPct": 22.0, "wPct": 42.0, "hPct": 56.0, "cols": 4, "rows": 3, "backRowScale": 0.84, "frontRowScale": 1.0, "flipRight": False}))
            for bg_id, bg_title, rel_img in new_stages:
                clean_name = bg_title.split("· ", 1)[-1] if "· " in bg_title else bg_title
                if bg_id in by_id:
                    by_id[bg_id]["imagePath"] = rel_img
                else:
                    stages.append({
                        "order": len(stages) + 1,
                        "id": bg_id,
                        "name": clean_name,
                        "zones": deck.get("name", biome_slug.title()),
                        "spawnNames": [],
                        "imagePath": rel_img,
                        "isPortal": False,
                        "heroZone": dict(hz_def),
                        "enemyGrid": dict(eg_def),
                    })
            cfg["stages"] = stages
            cfg_path.write_text(json.dumps(cfg, indent=2) + "\n", encoding="utf-8")

    return exported


def main() -> int:
    parser = argparse.ArgumentParser(description="Slice 2x2 delve card sheets with black corner removal.")
    parser.add_argument("--deck", type=str, default="", help="Deck ID to slice/export & wire (e.g. base_cavern_dungeon).")
    parser.add_argument("--only", nargs="*", default=None, help="Optional subset of sheet stems to slice.")
    parser.add_argument("--rooms-only", action="store_true", help="Export only 16:9 Stone-Brick Rooms to client WebPs.")
    parser.add_argument(
        "--battlegrounds-only",
        action="store_true",
        help="Export only 16:9 Stone-Brick Battlegrounds to client WebPs.",
    )
    args = parser.parse_args()

    if args.deck:
        count = export_biome_deck(args.deck.strip())
        print(f"Done. Exported {count} runtime WebP asset(s) for {args.deck}.")
        return 0

    if args.rooms_only:
        count = export_base_rooms()
        print(f"Done. Exported {count} 16:9 room WebP(s).")
        return 0

    if args.battlegrounds_only:
        count = export_base_battlegrounds()
        print(f"Done. Exported {count} 16:9 battleground WebP(s).")
        return 0

    total = 0
    for stem, config in SHEET_MANIFESTS.items():
        if args.only and stem not in args.only:
            continue
        total += process_sheet(stem, config)

    if not args.only:
        total += export_base_rooms()
        total += export_base_battlegrounds()

    print(f"Done. Exported {total} transparent RGBA delve / room asset(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
