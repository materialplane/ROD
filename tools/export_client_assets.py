import json
import shutil
import subprocess
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(r"C:\Users\drew0\Documents\ROD")
CLIENT_ASSETS = ROOT / "client" / "assets"
SCRATCH_VALEN = ROOT / "admin" / "vfx-test" / "heroes" / "valen_hp1.png"
VFX_HERO_TOKENS_DIR = ROOT / "admin" / "vfx-test" / "heroes"
HERO_AVATAR_SOURCES = {
    "valen": "valen_duelist_portrait_1a.png",
    "ellowyn": "ellowyn_mystic_portrait_1a.png",
    "orin": "orin_bulwark_portrait_1a.png",
    "rowan": "rowan_archer_portrait_1a.png",
    "mera": "mera_druid_portrait_1a.jpg",
    "harlan": "harlan_herbalist_portrait_1a.png",
}


def _import_chroma_key():
    chroma_dir = str(ROOT / "imageprompts" / "magenta-removal")
    if chroma_dir not in sys.path:
        sys.path.insert(0, chroma_dir)
    from core_chroma_key import key_magenta_sprite
    return key_magenta_sprite


def composite_mera_druid_tokens():
    """Slice Mera's Druid 2x2 health sheet behind her keyed Druid frame into 512x512 hp1-hp4 PNGs."""
    import cv2
    import numpy as np

    key_magenta_sprite = _import_chroma_key()
    frame_path = ROOT / "assets" / "tokens" / "heroes" / "mera_druid_frame.jpg"
    sheet_path = ROOT / "assets" / "tokens" / "heroes" / "mera_druid_portrait_1b_2x2.jpg"
    if not frame_path.exists() or not sheet_path.exists():
        raise FileNotFoundError("Missing mera_druid_frame.jpg or mera_druid_portrait_1b_2x2.jpg")

    with Image.open(frame_path) as raw_frame:
        frame_rgb = raw_frame.convert("RGB")
        ext_rgba = key_magenta_sprite(frame_rgb, t_low=15.0, t_high=140.0, crop_bbox=False, include_interior_voids=False)
        frame_rgba = key_magenta_sprite(frame_rgb, t_low=15.0, t_high=140.0, crop_bbox=False, include_interior_voids=True)

    ext_a = np.array(ext_rgba)[:, :, 3]
    both_a = np.array(frame_rgba)[:, :, 3]
    interior_holes = ((ext_a > 200) & (both_a < 20)).astype(np.uint8)
    _, labels, stats, centroids = cv2.connectedComponentsWithStats(interior_holes)
    best_lbl = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    cx, cy = centroids[best_lbl]
    _, _, hw, hh, _ = stats[best_lbl]

    # Dilate only the main center window slightly into the solid wood/iron bezel so outer vine gaps stay transparent
    center_hole = (labels == best_lbl).astype(np.uint8)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (121, 121))
    window_mask = (cv2.dilate(center_hole, kernel, iterations=1) > 0)

    target_dim = int(round(max(hw, hh) * 1.07))
    paste_x = int(round(cx - target_dim / 2.0))
    paste_y = int(round(cy - target_dim / 2.0))

    archive_dir = VFX_HERO_TOKENS_DIR / "_archive_infiltrator"
    archive_dir.mkdir(parents=True, exist_ok=True)

    with Image.open(sheet_path) as raw_sheet:
        sheet = raw_sheet.convert("RGBA")
        sw, sh = sheet.size
        qw, qh = sw // 2, sh // 2
        quadrants = [
            ("mera_hp1.png", (0, 0, qw, qh)),
            ("mera_hp2.png", (qw, 0, sw, qh)),
            ("mera_hp3.png", (0, qh, qw, sh)),
            ("mera_hp4.png", (qw, qh, sw, sh)),
        ]
        for out_name, box in quadrants:
            dst = VFX_HERO_TOKENS_DIR / out_name
            arch = archive_dir / out_name
            if dst.exists() and not arch.exists():
                shutil.copy2(dst, arch)

            tile = sheet.crop(box).resize((target_dim, target_dim), Image.Resampling.LANCZOS)
            canvas = Image.new("RGBA", frame_rgba.size, (0, 0, 0, 0))
            canvas.paste(tile, (paste_x, paste_y))
            arr = np.array(canvas)
            arr[:, :, 3] = np.where(window_mask, arr[:, :, 3], 0)
            masked_portrait = Image.fromarray(arr, "RGBA")

            composed = Image.alpha_composite(masked_portrait, frame_rgba)
            composed_512 = composed.resize((512, 512), Image.Resampling.LANCZOS)
            composed_512.save(dst, "PNG")
            print(f"Composited {dst.relative_to(ROOT)} (512x512 RGBA)")


def export_hero_fullbody():
    """Chroma-key and mirror-flip (face right) all 6 9:16 full-body hero Paperdoll portraits to WebP."""
    key_magenta_sprite = _import_chroma_key()
    src_dir = ROOT / "assets" / "tokens" / "heroes"
    out_dir = CLIENT_ASSETS / "portraits" / "heroes"
    out_dir.mkdir(parents=True, exist_ok=True)

    scale = 1280.0 / 5504.0
    exported = 0
    for hero_id in HERO_AVATAR_SOURCES:
        src = src_dir / f"{hero_id}_fullbody_raw.jpg"
        if not src.exists():
            raise FileNotFoundError(f"Missing full-body hero image: {src}")
        with Image.open(src) as raw:
            keyed = key_magenta_sprite(
                raw.convert("RGB"),
                t_low=15.0,
                t_high=140.0,
                crop_bbox=True,
                border_pad=16,
                include_interior_voids=True,
            )
        flipped = keyed.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        new_w = max(1, int(round(flipped.width * scale)))
        new_h = max(1, int(round(flipped.height * scale)))
        resized = flipped.resize((new_w, new_h), Image.Resampling.LANCZOS)
        dst = out_dir / f"{hero_id}_fullbody.webp"
        resized.save(dst, "WEBP", quality=92, method=6)
        exported += 1
        print(f"  Exported {dst.name:22s} ({new_w}x{new_h}, {dst.stat().st_size // 1024:3d} KB)")
    print(f"Exported {exported} mirror-flipped (facing right) full-body Paperdoll WebPs -> {out_dir.relative_to(ROOT)}")


def export_menu_background():
    src = ROOT / "assets" / "ui" / "menu_background_16x9_4k_v2.png"
    dst = CLIENT_ASSETS / "ui" / "menu_background.webp"
    dst.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(src) as im:
        im = im.convert("RGB")
        # 2560x1440 gives crisp QHD/1080p downscale at tiny WebP filesize
        resized = im.resize((2560, 1440), Image.Resampling.LANCZOS)
        resized.save(dst, "WEBP", quality=88, method=6)
    print(f"Exported {dst.relative_to(ROOT)} ({dst.stat().st_size // 1024} KB)")


def export_hero_tokens():
    out_dir = CLIENT_ASSETS / "tokens" / "heroes"
    out_dir.mkdir(parents=True, exist_ok=True)
    exported = 0
    for src in sorted(VFX_HERO_TOKENS_DIR.glob("*.png")):
        dst = out_dir / f"{src.stem}.webp"
        with Image.open(src) as im:
            im = im.convert("RGBA")
            tok = im.resize((512, 512), Image.Resampling.LANCZOS)
            tok.save(dst, "WEBP", quality=95, method=6)
        exported += 1

    # Preserve legacy single-path valen_hp1.webp used by Admin Suite preview
    legacy_dst = CLIENT_ASSETS / "tokens" / "valen_hp1.webp"
    legacy_dst.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(SCRATCH_VALEN) as im:
        im = im.convert("RGBA")
        im.resize((512, 512), Image.Resampling.LANCZOS).save(legacy_dst, "WEBP", quality=95, method=6)
    print(f"Exported {exported} crisp 512x512 WebP hero tokens -> {out_dir.relative_to(ROOT)}")


def export_hero_avatars():
    """Export the 6 frameless 1:1 hero bust portraits to crisp 512x512 WebP avatars."""
    src_dir = ROOT / "assets" / "tokens" / "heroes"
    out_dir = CLIENT_ASSETS / "portraits" / "heroes"
    out_dir.mkdir(parents=True, exist_ok=True)
    exported = 0
    for hero_id, filename in HERO_AVATAR_SOURCES.items():
        src = src_dir / filename
        dst = out_dir / f"{hero_id}_avatar.webp"
        with Image.open(src) as im:
            im = im.convert("RGB")
            avatar = im.resize((512, 512), Image.Resampling.LANCZOS)
            avatar.save(dst, "WEBP", quality=90, method=6)
        exported += 1
    print(f"Exported {exported} compressed 512x512 WebP 1:1 hero avatars -> {out_dir.relative_to(ROOT)}")


def export_map_01_tiles():
    src = ROOT / "assets" / "maps" / "overworld" / "map_01_crownlands_saltmarsh_4k.png"
    out_dir = CLIENT_ASSETS / "maps" / "map_01"
    out_dir.mkdir(parents=True, exist_ok=True)

    full_size = 8192
    tile_size = 512
    cols = full_size // tile_size
    rows = full_size // tile_size

    print(f"Upscaling {src.name} to {full_size}x{full_size} and slicing {cols}x{rows} WebP tiles...")
    with Image.open(src) as im:
        im = im.convert("RGB")
        doubled = im.resize((full_size, full_size), Image.Resampling.LANCZOS)

    total_bytes = 0
    for r in range(rows):
        for c in range(cols):
            x0, y0 = c * tile_size, r * tile_size
            tile = doubled.crop((x0, y0, x0 + tile_size, y0 + tile_size))
            tpath = out_dir / f"tile_{c}_{r}.webp"
            tile.save(tpath, "WEBP", quality=85, method=4)
            total_bytes += tpath.stat().st_size

    meta = {
        "id": "map_01",
        "name": "The Crownlands & Saltmarsh",
        "regionLabel": "Region 1 · The Crownlands",
        "width": full_size,
        "height": full_size,
        "tileSize": tile_size,
        "cols": cols,
        "rows": rows,
        "spawn": {"x": 5808, "y": 6665},
    }
    (out_dir / "meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(f"Exported {cols * rows} WebP tiles to {out_dir.relative_to(ROOT)} (total {total_bytes // 1024} KB)")


def export_audio():
    """Export client-ready .ogg music & SFX into client/assets/audio/ while leaving .wav masters untouched in assets/music/."""
    src_root = ROOT / "assets" / "sfx"
    music_src_root = ROOT / "assets" / "music" / "backstory" / "season-1"
    out_root = CLIENT_ASSETS / "audio"
    sub_map = {
        "Action": out_root / "music" / "action",
        "Exploration": out_root / "music" / "exploration",
        "Menu": out_root / "music" / "menu",
    }
    taverns_out = out_root / "music" / "taverns"
    sfx_out = out_root / "sfx"
    sfx_out.mkdir(parents=True, exist_ok=True)
    taverns_out.mkdir(parents=True, exist_ok=True)
    for target in sub_map.values():
        target.mkdir(parents=True, exist_ok=True)

    copied = 0
    for src in sorted(src_root.rglob("*")):
        if not src.is_file():
            continue
        ext = src.suffix.lower()
        # Only copy web-compressed audio from assets/sfx/; never bundle raw .wav masters into client/
        if ext not in {".ogg", ".mp3"}:
            continue
        rel = src.relative_to(src_root)
        if len(rel.parts) == 2 and rel.parts[0] in sub_map:
            dst = sub_map[rel.parts[0]] / rel.name
        else:
            dst = sfx_out / rel.name
        if not dst.exists() or dst.stat().st_size != src.stat().st_size:
            shutil.copy2(src, dst)
        copied += 1

    encoded = 0
    ffmpeg_bin = shutil.which("ffmpeg")
    if music_src_root.exists():
        for src in sorted(music_src_root.iterdir()):
            if not src.is_file():
                continue
            ext = src.suffix.lower()
            if ext in {".ogg", ".mp3"}:
                dst = taverns_out / src.name
                if not dst.exists() or dst.stat().st_size != src.stat().st_size:
                    shutil.copy2(src, dst)
                encoded += 1
            elif ext == ".wav":
                dst = taverns_out / f"{src.stem}.ogg"
                if dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime and dst.stat().st_size > 0:
                    encoded += 1
                    continue
                if not ffmpeg_bin:
                    raise RuntimeError(f"ffmpeg not found in PATH; cannot encode {src.name} to .ogg")
                subprocess.run(
                    [ffmpeg_bin, "-y", "-loglevel", "error", "-i", str(src), "-vn", "-c:a", "libvorbis", "-q:a", "6", str(dst)],
                    check=True,
                )
                encoded += 1

    print(f"Exported {copied} SFX/menu/action/exploration files + {encoded} Season 1 tavern .ogg tracks -> {out_root.relative_to(ROOT)}")


if __name__ == "__main__":
    if "--menu-only" in sys.argv:
        export_menu_background()
    elif "--mera-tokens" in sys.argv:
        composite_mera_druid_tokens()
        export_hero_tokens()
        export_hero_avatars()
    elif "--fullbody-only" in sys.argv:
        export_hero_fullbody()
    elif "--avatars-only" in sys.argv:
        export_hero_avatars()
    elif "--tokens-only" in sys.argv:
        export_hero_tokens()
    elif "--audio-only" in sys.argv:
        export_audio()
    else:
        export_menu_background()
        composite_mera_druid_tokens()
        export_hero_tokens()
        export_hero_avatars()
        export_hero_fullbody()
        export_map_01_tiles()
        export_audio()
