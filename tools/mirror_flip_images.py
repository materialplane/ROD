"""Mirror-flip one or more images horizontally (or vertically) while protecting originals by default."""

from __future__ import annotations

import argparse
import glob
import sys
from pathlib import Path
from PIL import Image, ImageOps

SUPPORTED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"}


def collect_inputs(raw_inputs: list[str], recursive: bool) -> list[Path]:
    """Expand file paths, directories, and glob patterns into a deduplicated sorted list of image files."""
    found: dict[Path, None] = {}
    for item in raw_inputs:
        path = Path(item)
        if any(ch in item for ch in ("*", "?", "[")):
            for match in sorted(glob.glob(item, recursive=recursive)):
                p = Path(match).resolve()
                if p.is_file() and p.suffix.lower() in SUPPORTED_EXTENSIONS:
                    found[p] = None
            continue

        if path.is_dir():
            iterator = path.rglob("*") if recursive else path.iterdir()
            for child in sorted(iterator):
                if child.is_file() and child.suffix.lower() in SUPPORTED_EXTENSIONS:
                    found[child.resolve()] = None
            continue

        if path.is_file():
            if path.suffix.lower() not in SUPPORTED_EXTENSIONS:
                raise ValueError(f"Unsupported image extension '{path.suffix}' for {path}")
            found[path.resolve()] = None
            continue

        raise FileNotFoundError(f"Input path not found: {item}")

    return list(found.keys())


def resolve_output_path(
    src: Path,
    *,
    output: Path | None,
    out_dir: Path | None,
    in_place: bool,
    suffix: str,
    target_format: str | None,
    base_dir: Path | None,
) -> Path:
    """Compute the destination path for a single flipped image."""
    out_ext = f".{target_format.lower()}" if target_format else src.suffix

    if in_place:
        return src.with_suffix(out_ext)

    if output is not None:
        return output.with_suffix(out_ext) if target_format and output.suffix.lower() != out_ext else output

    if out_dir is not None:
        if base_dir is not None:
            try:
                rel = src.relative_to(base_dir)
                return (out_dir / rel).with_suffix(out_ext)
            except ValueError:
                pass
        return out_dir / f"{src.stem}{out_ext}"

    return src.with_name(f"{src.stem}{suffix}{out_ext}")


def flip_image_file(
    src: Path,
    dst: Path,
    *,
    vertical: bool,
    both: bool,
    quality: int,
    lossless: bool,
    overwrite: bool,
    dry_run: bool,
) -> tuple[int, int]:
    """Load, orient, mirror-flip, and save a single image, returning (width, height)."""
    if dst.exists() and dst.resolve() != src.resolve() and not overwrite and not dry_run:
        raise FileExistsError(f"Destination already exists (pass --overwrite to replace): {dst}")

    with Image.open(src) as raw:
        oriented = ImageOps.exif_transpose(raw)
        if both:
            flipped = oriented.transpose(Image.Transpose.FLIP_LEFT_RIGHT).transpose(
                Image.Transpose.FLIP_TOP_BOTTOM
            )
        elif vertical:
            flipped = oriented.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
        else:
            flipped = oriented.transpose(Image.Transpose.FLIP_LEFT_RIGHT)

        width, height = flipped.size
        if dry_run:
            return width, height

        dst.parent.mkdir(parents=True, exist_ok=True)
        ext = dst.suffix.lower()

        if ext in {".jpg", ".jpeg"}:
            if flipped.mode not in {"RGB", "L"}:
                flipped = flipped.convert("RGB")
            flipped.save(dst, "JPEG", quality=quality)
        elif ext == ".webp":
            if flipped.mode == "P":
                flipped = flipped.convert("RGBA" if "transparency" in flipped.info else "RGB")
            flipped.save(dst, "WEBP", quality=quality, lossless=lossless, method=6)
        elif ext == ".png":
            flipped.save(dst, "PNG")
        else:
            flipped.save(dst)

    return width, height


def parse_args(argv: list[str]) -> argparse.Namespace:
    """Parse CLI arguments for mirror-flipping images."""
    parser = argparse.ArgumentParser(
        description="Mirror-flip images horizontally (default) or vertically without touching originals by default."
    )
    parser.add_argument(
        "inputs",
        nargs="+",
        help="Image file(s), folder(s), or glob pattern(s) to mirror-flip.",
    )
    axis_group = parser.add_mutually_exclusive_group()
    axis_group.add_argument(
        "--vertical",
        action="store_true",
        help="Flip top-to-bottom instead of left-to-right.",
    )
    axis_group.add_argument(
        "--both",
        action="store_true",
        help="Flip both horizontally and vertically (180-degree mirror).",
    )
    dest_group = parser.add_mutually_exclusive_group()
    dest_group.add_argument(
        "-o",
        "--output",
        type=Path,
        default=None,
        help="Exact output file path (valid only when flipping a single input image).",
    )
    dest_group.add_argument(
        "--out-dir",
        type=Path,
        default=None,
        help="Directory to write flipped images into while keeping original filenames.",
    )
    dest_group.add_argument(
        "--in-place",
        action="store_true",
        help="Overwrite the source file(s) directly instead of writing *_flipped files.",
    )
    parser.add_argument(
        "--suffix",
        default="_flipped",
        help="Filename suffix used when neither --out-dir, --output, nor --in-place is set (default: _flipped).",
    )
    parser.add_argument(
        "--format",
        choices=("png", "jpg", "jpeg", "webp"),
        default=None,
        help="Optional target output format (defaults to keeping each input file's extension).",
    )
    parser.add_argument(
        "--quality",
        type=int,
        default=95,
        help="Quality for JPEG/WebP output (1-100, default: 95).",
    )
    parser.add_argument(
        "--lossless",
        action="store_true",
        help="Use lossless compression when saving WebP output.",
    )
    parser.add_argument(
        "-r",
        "--recursive",
        action="store_true",
        help="Recurse into subdirectories when an input is a folder or ** glob.",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Allow replacing existing destination files (when not using --in-place).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print planned operations without writing any files.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(sys.argv[1:] if argv is None else argv)

    if args.output is not None and len(args.inputs) != 1:
        print("Error: --output can only be used with a single input file.", file=sys.stderr)
        return 1

    files = collect_inputs(args.inputs, recursive=args.recursive)
    if not files:
        print("No supported image files matched the given input(s).", file=sys.stderr)
        return 1

    if args.output is not None and len(files) != 1:
        print("Error: --output requires the input to match exactly 1 image file.", file=sys.stderr)
        return 1

    base_dir: Path | None = None
    if args.out_dir is not None and len(args.inputs) == 1 and Path(args.inputs[0]).is_dir():
        base_dir = Path(args.inputs[0]).resolve()

    mode_label = "horizontal + vertical" if args.both else ("vertical" if args.vertical else "horizontal")
    prefix = "[DRY RUN] " if args.dry_run else ""
    print(f"{prefix}Mirror-flipping {len(files)} image(s) ({mode_label})...")

    for src in files:
        dst = resolve_output_path(
            src,
            output=args.output,
            out_dir=args.out_dir,
            in_place=args.in_place,
            suffix=args.suffix,
            target_format=args.format,
            base_dir=base_dir,
        )
        width, height = flip_image_file(
            src,
            dst,
            vertical=args.vertical,
            both=args.both,
            quality=args.quality,
            lossless=args.lossless,
            overwrite=args.overwrite,
            dry_run=args.dry_run,
        )
        size_note = "planned" if args.dry_run else f"{dst.stat().st_size // 1024} KB"
        print(f"  {src.name} -> {dst} ({width}x{height}, {size_note})")

    print(f"{prefix}Done! Processed {len(files)} image(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
