"""Slice, chroma-key, normalize, and export all 46 RPG Item/Runestone/UI sprite sheets to compressed 256x256 WebP icons.

Reads:
  - data/items-catalog.json (825 canonical items & target iconPaths)
  - imageprompts/batch/items_manifest.json (46 active 5x5, 4x4 & 4x2 sheets)
  - assets/items/batch_sheets/<sheet_id>.jpg (4K masters on #FF00FF)

Writes:
  - client/assets/icons/items/<item_id>.webp (all 825 catalog icons)
  - client/assets/icons/runestones/*.webp (24 tiered Runestones + empty-socket icon)
  - client/assets/icons/ui/*.webp (25 unified dark-slate UI slot & category glyphs)
  - client/assets/icons/emblems/*.webp (category filter & empty-slot emblems)
  - client/assets/icons/extras/*.webp (spare reserve weapons, keys, charts & attire emblems)
  - client/assets/icons/icons-manifest.json (complete runtime index of exported icons)
  - assets/items/slices/<subdir>/*.png (full-resolution lossless transparent archival slices)
"""

from __future__ import annotations

from concurrent.futures import ProcessPoolExecutor
import json
import os
import re
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(r"C:\Users\drew0\Documents\ROD")
BATCH_DIR = ROOT / "assets" / "items" / "batch_sheets"
SLICES_DIR = ROOT / "assets" / "items" / "slices"
CLIENT_ICONS_DIR = ROOT / "client" / "assets" / "icons"
ITEMS_CATALOG_PATH = ROOT / "data" / "items-catalog.json"
MANIFEST_PATH = ROOT / "imageprompts" / "batch" / "items_manifest.json"

TARGET_SIZE = 256
INNER_FIT = 232  # 12px uniform padding around longest edge inside 256x256
WEBP_QUALITY = 90

# Light Armor slots with AI-generated detached floating arm bracers to strip cleanly:
# Row 3 Col 1 (Steel-Riveted Leather), Row 3 Col 3 (Desert Spiked Leather), Row 4 Col 1 (Highpass Spiked Leather)
SINGLE_COMPONENT_CELLS: set[tuple[str, int]] = {
    ("items_armor_light_sheet1", 10),
    ("items_armor_light_sheet1", 12),
    ("items_armor_light_sheet1", 15),
}

# Armor Light Sheet 2 Row 4 Col 4 rendered inside an obsolete dark-gray UI square (superseded by items_ui_silhouettes)
SKIP_SLOTS: set[tuple[str, int]] = {
    ("items_armor_light_sheet2", 15),
}

WEAPON_SHEETS: list[tuple[str, list[str]]] = [
    ("Longsword", ["items_weapons_longswords"]),
    ("Greatsword", ["items_weapons_greatswords"]),
    ("Rapier", ["items_weapons_rapiers"]),
    ("Battleaxe", ["items_weapons_battleaxes"]),
    ("Mace", ["items_weapons_maces"]),
    ("Spear", ["items_weapons_spears_sheet1", "items_weapons_spears_sheet2"]),
    ("Longbow", ["items_weapons_longbows"]),
    ("Shortbow", ["items_weapons_shortbows"]),
    ("Dagger", ["items_weapons_daggers"]),
    ("Light Crossbow", ["items_weapons_light_crossbows"]),
    ("Quarterstaff", ["items_weapons_quarterstaves_sheet1", "items_weapons_quarterstaves_sheet2"]),
    ("Scimitar", ["items_weapons_scimitars"]),
    ("Sickle", ["items_weapons_sickles"]),
]

ACCESSORY_SHEETS: list[tuple[str, str]] = [
    ("cloak", "items_accessories_cloaks"),
    ("orb", "items_accessories_orbs"),
    ("horn", "items_accessories_horns"),
    ("quiver", "items_accessories_quivers"),
    ("crystal", "items_accessories_crystals"),
    ("tome", "items_accessories_tomes"),
]


def slugify(text: str) -> str:
    s = text.lower().strip()
    s = s.replace("'", "").replace("\u2019", "")
    s = re.sub(r"[^a-z0-9]+", "_", s)
    return s.strip("_")


def find_grid_spans(rgb_u8: np.ndarray, axis: int, count: int) -> list[tuple[int, int]]:
    """Detect optimal cell [start, end] spans along X (axis=1) or Y (axis=0).

    Handles both drawn grid divider bars (black or dark-purple) and un-gridded #FF00FF gutters
    by cutting through empty magenta valleys so slight Gemini grid jitter never clips edges.
    """
    cr = rgb_u8[:, :, 0].astype(np.int16)
    cg = rgb_u8[:, :, 1].astype(np.int16)
    cb = rgb_u8[:, :, 2].astype(np.int16)
    bleed = np.minimum(cr - cg, cb - cg)

    is_mag_bg = (bleed >= 40) & (cr > 130) & (cb > 130)
    is_grid_ink = (~is_mag_bg) & (bleed < 110)

    other_axis = 1 if axis == 0 else 0
    total_len = rgb_u8.shape[axis]
    fg_frac = 1.0 - np.mean(is_mag_bg, axis=other_axis)
    ink_frac = np.mean(is_grid_ink, axis=other_axis)

    # Trim outer dark frame borders if drawn edge-to-edge
    outer_start = 0
    while outer_start < 28 and ink_frac[outer_start] > 0.72:
        outer_start += 1
    outer_end = total_len
    while outer_end > total_len - 28 and ink_frac[outer_end - 1] > 0.72:
        outer_end -= 1
    if outer_start > 0:
        outer_start += 2
    if outer_end < total_len:
        outer_end -= 2

    cuts: list[tuple[int, int]] = []
    for k in range(1, count):
        nom = int(round(k * total_len / count))
        lo = max(outer_start + 16, nom - 42)
        hi = min(outer_end - 16, nom + 42)

        sub_ink = ink_frac[lo:hi]
        bar_idx = np.where(sub_ink > 0.72)[0]
        if len(bar_idx) > 0:
            # Skip drawn grid divider bar completely (+2px buffer each side)
            cuts.append((lo + int(bar_idx[0]) - 2, lo + int(bar_idx[-1]) + 3))
        else:
            # Cut cleanly down midpoint of empty neon-magenta valley
            sub_fg = fg_frac[lo:hi]
            min_v = float(sub_fg.min())
            near_min = np.where(sub_fg <= max(0.002, min_v + 0.002))[0]
            mid_idx = lo + int(near_min[len(near_min) // 2])
            cuts.append((mid_idx, mid_idx))

    spans: list[tuple[int, int]] = []
    prev = outer_start
    for a, b in cuts:
        spans.append((prev, a))
        prev = b
    spans.append((prev, outer_end))
    return spans


def extract_cell_rgba(cell_rgb_u8: np.ndarray, single_largest: bool = False) -> Image.Image:
    """Chroma-key #FF00FF exterior + enclosed pink holes with soft edge anti-aliasing & de-spill."""
    cr = cell_rgb_u8[:, :, 0].astype(np.float32)
    cg = cell_rgb_u8[:, :, 1].astype(np.float32)
    cb = cell_rgb_u8[:, :, 2].astype(np.float32)
    bleed = np.maximum(0.0, np.minimum(cr - cg, cb - cg))

    # 1. Exterior magenta connected to outer borders of the cell
    mag_cand = ((bleed >= 34.0) & (cr > 130.0) & (cb > 130.0)).astype(np.uint8)
    n_lbl, labels = cv2.connectedComponents(mag_cand, connectivity=8)
    ext_lut = np.zeros(n_lbl, dtype=bool)
    for edge in (labels[0, :], labels[-1, :], labels[:, 0], labels[:, -1]):
        ext_lut[np.unique(edge)] = True
    ext_lut[0] = False
    ext_bg = ext_lut[labels]

    # 2. Enclosed unmistakable neon-pink holes (crossbow stirrup loops, bowstrings, root cages, key loops)
    strict_pink = (
        (cr > 195.0)
        & (cb > 195.0)
        & (cg < 85.0)
        & (np.abs(cr - cb) < 55.0)
        & (bleed > 125.0)
    )
    bg_seed = (ext_bg | strict_pink).astype(np.uint8)

    # 3. 3px soft anti-aliased halo & magenta color de-spill along silhouette + interior hole edges
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    edge_zone = cv2.dilate(bg_seed, kernel, iterations=1)

    t_low, t_high = 14.0, 140.0
    soft_alpha = np.where(
        bleed >= t_high,
        0.0,
        np.where(bleed <= t_low, 255.0, 255.0 * (t_high - bleed) / (t_high - t_low)),
    )
    alpha = np.where(bg_seed > 0, 0.0, np.where(edge_zone > 0, soft_alpha, 255.0))

    despill = (edge_zone > 0) & (bleed > t_low)
    new_r = np.where(despill, np.clip(cr - bleed, 0.0, 255.0), cr)
    new_g = cg
    new_b = np.where(despill, np.clip(cb - bleed, 0.0, 255.0), cb)

    # 4. Component cleanup: remove tiny stray speckles (<220px) and optional detached floating pieces
    fg_mask = (alpha > 24.0).astype(np.uint8)
    fn_lbl, f_labels, stats, _ = cv2.connectedComponentsWithStats(fg_mask, connectivity=8)
    if fn_lbl > 1:
        areas = stats[1:, cv2.CC_STAT_AREA]
        if single_largest:
            keep = np.zeros(fn_lbl, dtype=bool)
            keep[int(np.argmax(areas)) + 1] = True
            alpha = np.where(keep[f_labels], alpha, 0.0)
        else:
            keep = np.zeros(fn_lbl, dtype=bool)
            keep[1:] = areas >= 220
            # Never erase everything if an ultra-thin glyph was small
            if not np.any(keep[1:]):
                keep[int(np.argmax(areas)) + 1] = True
            alpha = np.where(keep[f_labels], alpha, 0.0)

    rgba = np.dstack((
        new_r.astype(np.uint8),
        new_g.astype(np.uint8),
        new_b.astype(np.uint8),
        alpha.astype(np.uint8),
    ))
    return Image.fromarray(rgba, mode="RGBA")


def normalize_square(rgba_im: Image.Image, canvas_size: int = TARGET_SIZE, fit_size: int = INNER_FIT) -> Image.Image:
    """Tight-crop around opaque pixels and center inside a uniform square transparent canvas."""
    alpha_band = rgba_im.getchannel("A")
    bbox = alpha_band.point(lambda a: 255 if a > 8 else 0).getbbox()
    if not bbox:
        return Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    tight = rgba_im.crop(bbox)
    scale = min(fit_size / tight.width, fit_size / tight.height)
    nw = max(1, int(round(tight.width * scale)))
    nh = max(1, int(round(tight.height * scale)))
    resized = tight.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    px = (canvas_size - nw) // 2
    py = (canvas_size - nh) // 2
    canvas.paste(resized, (px, py))
    return canvas


def build_slot_assignments(cat_items: list[dict], manifest: list[dict]) -> dict[tuple[str, int], tuple[str, str, str]]:
    """Map every (sheet_id, slot_idx) -> (rel_webp_path, item_id, display_name)."""
    sh_by_id = {s["id"]: s for s in manifest}
    assignments: dict[tuple[str, int], tuple[str, str, str]] = {}

    def assign_catalog_item(sid: str, idx: int, it: dict) -> None:
        rel = it["iconPath"]
        if not rel.startswith("assets/"):
            raise ValueError(f"Unexpected iconPath on {it['id']}: {rel}")
        assignments[(sid, idx)] = (rel, it["id"], it["name"])

    def assign_subpath(sid: str, idx: int, rel_subpath: str, eid: str, label: str) -> None:
        assignments[(sid, idx)] = (f"assets/icons/{rel_subpath}", eid, label)

    # 1. Weapons (13 types x 24 = 312 + 11 emblems + 16 spare spears/staves)
    for wtype, sids in WEAPON_SHEETS:
        w_items = [x for x in cat_items if x["category"] == "weapon" and x["subType"] == wtype]
        assert len(w_items) == 24
        if len(sids) == 1:
            sid = sids[0]
            for i, it in enumerate(w_items):
                assign_catalog_item(sid, i, it)
            slot24 = sh_by_id[sid]["slots"][24]
            wslug = slugify(wtype)
            assign_subpath(sid, 24, f"emblems/emblem_weapon_{wslug}.webp", f"emblem_weapon_{wslug}", slot24["name"])
        else:
            s1, s2 = sids
            for i in range(16):
                assign_catalog_item(s1, i, w_items[i])
            for i in range(8):
                assign_catalog_item(s2, i, w_items[16 + i])
            for j in range(8, 16):
                sname = sh_by_id[s2]["slots"][j]["name"]
                eslug = f"extra_{slugify(wtype)}_{slugify(sname)}"
                assign_subpath(s2, j, f"extras/{eslug}.webp", eslug, sname)

    # 2. Armor & Helms (92 + 92)
    for cat_key, sheet_seq, pref in [
        (
            "armor",
            [
                ("items_armor_light_sheet1", 24, "emblems/emblem_armor_light.webp"),
                ("items_armor_light_sheet2", 12, None),
                ("items_armor_medium_sheet1", 24, "emblems/emblem_armor_medium.webp"),
                ("items_armor_medium_sheet2", 16, None),
                ("items_armor_heavy", 16, None),
            ],
            "armor",
        ),
        (
            "helm",
            [
                ("items_helms_light_sheet1", 24, "emblems/emblem_helm_light.webp"),
                ("items_helms_light_sheet2", 12, None),
                ("items_helms_medium_sheet1", 24, "emblems/emblem_helm_medium.webp"),
                ("items_helms_medium_sheet2", 16, None),
                ("items_helms_heavy", 16, None),
            ],
            "helm",
        ),
    ]:
        items_list = [x for x in cat_items if x["category"] == cat_key]
        assert len(items_list) == 92
        cursor = 0
        for sid, take_count, emblem_rel in sheet_seq:
            for i in range(take_count):
                assign_catalog_item(sid, i, items_list[cursor])
                cursor += 1
            if emblem_rel is not None and len(sh_by_id[sid]["slots"]) > take_count:
                sl = sh_by_id[sid]["slots"][take_count]
                eid = Path(emblem_rel).stem
                assign_subpath(sid, take_count, emblem_rel, eid, sl["name"])
            for j in range(take_count + (1 if emblem_rel else 0), len(sh_by_id[sid]["slots"])):
                if (sid, j) in SKIP_SLOTS:
                    continue
                sl = sh_by_id[sid]["slots"][j]
                eslug = f"extra_{pref}_{slugify(sl['name'])}"
                assign_subpath(sid, j, f"extras/{eslug}.webp", eslug, sl["name"])
        assert cursor == 92

    # 3. Shields (24 + 1 emblem)
    shd_items = [x for x in cat_items if x["category"] == "shield"]
    assert len(shd_items) == 24
    for i, it in enumerate(shd_items):
        assign_catalog_item("items_shields", i, it)
    assign_subpath("items_shields", 24, "emblems/emblem_shield.webp", "emblem_shield", sh_by_id["items_shields"]["slots"][24]["name"])

    # 4. Class Accessories (6 x 24 = 144 + 6 emblems)
    for acc_cat, sid in ACCESSORY_SHEETS:
        acc_items = [x for x in cat_items if x["category"] == acc_cat]
        assert len(acc_items) == 24
        for i, it in enumerate(acc_items):
            assign_catalog_item(sid, i, it)
        sl = sh_by_id[sid]["slots"][24]
        assign_subpath(sid, 24, f"emblems/emblem_{acc_cat}.webp", f"emblem_{acc_cat}", sl["name"])

    # 5. Consumables (14 + 2 potion emblems)
    cons_items = [x for x in cat_items if x["category"] == "consumable"]
    assert len(cons_items) == 14
    for i, it in enumerate(cons_items):
        assign_catalog_item("items_consumables_potions", i, it)
    assign_subpath("items_consumables_potions", 14, "emblems/emblem_potions_healing_mana.webp", "emblem_potions_healing_mana", sh_by_id["items_consumables_potions"]["slots"][14]["name"])
    assign_subpath("items_consumables_potions", 15, "emblems/emblem_potions_status_cures.webp", "emblem_potions_status_cures", sh_by_id["items_consumables_potions"]["slots"][15]["name"])

    # 6. Trade Goods (16 Ethoria + 8 x 15 Regional = 136 + 8 Regional Crests)
    tg_eth = [x for x in cat_items if x["category"] == "trade_good" and x.get("region") is None]
    assert len(tg_eth) == 16
    for i, it in enumerate(tg_eth):
        assign_catalog_item("items_trade_goods_ethoria_native_trade_goods", i, it)
    for reg in range(1, 9):
        sid = f"items_trade_goods_region_{reg}_trade_goods"
        tg_r = [x for x in cat_items if x["category"] == "trade_good" and x.get("region") == reg]
        assert len(tg_r) == 15
        for i, it in enumerate(tg_r):
            assign_catalog_item(sid, i, it)
        assign_subpath(sid, 15, f"emblems/emblem_trade_goods_r{reg}.webp", f"emblem_trade_goods_r{reg}", sh_by_id[sid]["slots"][15]["name"])

    # 7. Portal Catalysts & Dungeon Keys (11 catalog items + 5 extra keys/charts)
    key_items = {x["id"]: x for x in cat_items if x["category"] == "key_item"}
    portal_keys = sorted([x for x in key_items.values() if x["id"].startswith("key_portal_")], key=lambda x: x["id"])
    assert len(portal_keys) == 8
    for i, it in enumerate(portal_keys):
        assign_catalog_item("items_catalysts", i, it)

    assign_catalog_item("items_keys", 0, key_items["key_dungeon_iron_dungeon_key"])
    assign_catalog_item("items_keys", 1, key_items["key_dungeon_skeleton_lockpick"])
    assign_catalog_item("items_keys", 4, key_items["key_dungeon_rift_area_chart"])
    for extra_idx in (2, 3, 5, 6, 7):
        sl = sh_by_id["items_keys"]["slots"][extra_idx]
        eslug = f"extra_key_{slugify(sl['name'])}"
        assign_subpath("items_keys", extra_idx, f"extras/{eslug}.webp", eslug, sl["name"])

    # 8. Runestones (24 tiered stones + empty socket emblem)
    for i, sl in enumerate(sh_by_id["items_runestones"]["slots"]):
        if i == 24:
            assign_subpath("items_runestones", i, "runestones/rn_empty_socket.webp", "rn_empty_socket", sl["name"])
        else:
            rslug = f"rn_{i + 1:02d}_{slugify(sl['name'])}"
            assign_subpath("items_runestones", i, f"runestones/{rslug}.webp", rslug, sl["name"])

    # 9. Unified UI Silhouettes (25 glyphs)
    for i, sl in enumerate(sh_by_id["items_ui_silhouettes"]["slots"]):
        uslug = f"ui_{i + 1:02d}_{slugify(sl['name'])}"
        assign_subpath("items_ui_silhouettes", i, f"ui/{uslug}.webp", uslug, sl["name"])

    # Verify all 825 catalog iconPaths were assigned
    assigned_paths = {v[0] for v in assignments.values()}
    expected_paths = {it["iconPath"] for it in cat_items}
    missing = expected_paths - assigned_paths
    assert not missing, f"Unassigned catalog iconPaths: {sorted(missing)}"

    return assignments


def process_single_sheet(task: tuple[dict, dict[int, tuple[str, str, str]]]) -> tuple[str, str, list[dict], int]:
    """Process one 4K master sheet into cropped archival PNGs and 256x256 WebP icons."""
    sh, slot_map = task
    sid = sh["id"]
    sheet_path = BATCH_DIR / f"{sid}.jpg"
    if not sheet_path.exists():
        raise FileNotFoundError(f"Missing batch sheet: {sheet_path}")

    with Image.open(sheet_path) as raw_im:
        rgb_u8 = np.array(raw_im.convert("RGB"))

    cols, rows = map(int, sh["grid"].split("x"))
    x_spans = find_grid_spans(rgb_u8, axis=1, count=cols)
    y_spans = find_grid_spans(rgb_u8, axis=0, count=rows)

    entries: list[dict] = []
    sheet_bytes = 0
    for idx, sl in enumerate(sh["slots"]):
        if idx not in slot_map:
            continue
        rel_webp, item_id, label = slot_map[idx]
        r, c = idx // cols, idx % cols
        y0, y1 = y_spans[r]
        x0, x1 = x_spans[c]
        cell_rgb = rgb_u8[y0:y1, x0:x1]

        rgba = extract_cell_rgba(cell_rgb, single_largest=((sid, idx) in SINGLE_COMPONENT_CELLS))
        icon_256 = normalize_square(rgba, canvas_size=TARGET_SIZE, fit_size=INNER_FIT)

        sub_folder = Path(rel_webp).parts[2]  # items / runestones / ui / emblems / extras
        png_out = SLICES_DIR / sub_folder / f"{Path(rel_webp).stem}.png"
        png_out.parent.mkdir(parents=True, exist_ok=True)
        alpha_box = rgba.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
        (rgba.crop(alpha_box) if alpha_box else rgba).save(png_out, "PNG", compress_level=1)

        webp_out = ROOT / "client" / rel_webp
        webp_out.parent.mkdir(parents=True, exist_ok=True)
        icon_256.save(webp_out, "WEBP", quality=WEBP_QUALITY, method=4)

        w_bytes = webp_out.stat().st_size
        sheet_bytes += w_bytes
        entries.append({
            "id": item_id,
            "name": label,
            "folder": sub_folder,
            "iconPath": rel_webp,
            "sourceSheet": sid,
            "slot": sl["coord"],
            "bytes": w_bytes,
        })

    return sid, sh["grid"], entries, sheet_bytes


def main() -> int:
    cat_data = json.loads(ITEMS_CATALOG_PATH.read_text(encoding="utf-8"))
    cat_items = cat_data["items"]
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))

    assignments = build_slot_assignments(cat_items, manifest)

    # Pre-create output subdirectories cleanly before parallel workers start
    for sub in ("items", "runestones", "ui", "emblems", "extras"):
        (SLICES_DIR / sub).mkdir(parents=True, exist_ok=True)
        (CLIENT_ICONS_DIR / sub).mkdir(parents=True, exist_ok=True)

    tasks: list[tuple[dict, dict[int, tuple[str, str, str]]]] = []
    for sh in manifest:
        sid = sh["id"]
        slot_map = {idx: assignments[(sid, idx)] for idx in range(len(sh["slots"])) if (sid, idx) in assignments}
        tasks.append((sh, slot_map))

    total_webp_bytes = 0
    exported_count = 0
    by_folder: dict[str, int] = {}
    manifest_entries: list[dict] = []

    workers = min(8, max(2, (os.cpu_count() or 4) // 2))
    print(f"Processing {len(tasks)} item sheets across {workers} workers...", flush=True)
    with ProcessPoolExecutor(max_workers=workers) as pool:
        for sid, grid, entries, s_bytes in pool.map(process_single_sheet, tasks):
            total_webp_bytes += s_bytes
            exported_count += len(entries)
            for e in entries:
                by_folder[e["folder"]] = by_folder.get(e["folder"], 0) + 1
            manifest_entries.extend(entries)
            print(f"Processed {sid} ({grid}): {len(entries)} icons", flush=True)

    out_manifest = {
        "version": 1,
        "dimensions": f"{TARGET_SIZE}x{TARGET_SIZE}",
        "totalIcons": exported_count,
        "folderCounts": by_folder,
        "icons": manifest_entries,
    }
    manifest_file = CLIENT_ICONS_DIR / "icons-manifest.json"
    manifest_file.parent.mkdir(parents=True, exist_ok=True)
    manifest_file.write_text(json.dumps(out_manifest, indent=2, ensure_ascii=False), encoding="utf-8")

    # Sanity-check every catalog icon exists on disk
    missing_files = [it["iconPath"] for it in cat_items if not (ROOT / "client" / it["iconPath"]).exists()]
    assert not missing_files, f"Missing exported client WebP files: {missing_files[:10]}"

    mb = total_webp_bytes / (1024 * 1024)
    print(f"\nDone: Exported {exported_count} compressed {TARGET_SIZE}x{TARGET_SIZE} RGBA WebP icons ({mb:.2f} MB total) -> client/assets/icons/")
    print("Breakdown:", by_folder)
    print("Catalog iconPath verification: 825 / 825 present on disk.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
