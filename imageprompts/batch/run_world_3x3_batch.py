"""Recreate the 3x3 16:9 4K overland world stitch cleanly via Google Gemini Batch API (50% discount) in 4 diagonal waves."""

from __future__ import annotations

import argparse
import base64
import io
import json
import os
import re
import shutil
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import cv2
import numpy as np
from dotenv import load_dotenv
from google import genai
from google.genai import types
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parents[2]
REALM_PROMPTS_PATH = REPO_ROOT / "imageprompts" / "realm-maps.txt"
WORK_DIR = REPO_ROOT / "assets" / "maps" / "overworld" / "map_01_3x3"
SEED_TILE_SRC = REPO_ROOT / "assets" / "maps" / "overworld" / "tests" / "test_ref_map1_to_16x9_seed_v2_4k.png"
BATCH_DIR = Path(__file__).resolve().parent
DEFAULT_MODEL = "models/gemini-3-pro-image"

W, H = 5504, 3072
OX = 1651  # 30% horizontal overlap
OY = 922   # 30% vertical overlap
KX = W - OX  # 3853
KY = H - OY  # 2150

TERMINAL_FAIL_STATES = {
    "JOB_STATE_FAILED",
    "JOB_STATE_CANCELLED",
    "JOB_STATE_CANCELLING",
    "JOB_STATE_EXPIRED",
}


def parse_prompts(path: Path, map_code: str = "MAP01") -> dict[str, str]:
    text = path.read_text(encoding="utf-8")
    blocks = re.findall(
        r"^\[(" + re.escape(map_code) + r"_R\dC\d)\][^\n]*\n--- COPY-PASTE PROMPT START ---\s*\n(.*?)\n--- COPY-PASTE PROMPT END ---",
        text,
        re.M | re.S,
    )
    out = {k.split("_", 1)[1].lower(): v.strip() for k, v in blocks}
    for req in ("r0c0", "r0c1", "r0c2", "r1c0", "r1c1", "r1c2", "r2c0", "r2c1", "r2c2"):
        if req not in out or not out[req]:
            raise ValueError(f"Missing [{map_code}_{req.upper()}] in {path}")
    return out


def encode_jpeg_b64(img_arr: np.ndarray, quality: int = 94) -> str:
    buf = io.BytesIO()
    Image.fromarray(img_arr).save(buf, format="JPEG", quality=quality)
    return base64.b64encode(buf.getvalue()).decode("ascii")


def make_top_template(bot_img: np.ndarray, out_path: Path) -> np.ndarray:
    tpl = np.full((H, W, 3), 255, dtype=np.uint8)
    tpl[KY:, :] = bot_img[:OY, :]
    Image.fromarray(tpl).save(out_path)
    return tpl


def make_left_template(left_img: np.ndarray, out_path: Path) -> np.ndarray:
    tpl = np.full((H, W, 3), 255, dtype=np.uint8)
    tpl[:, :OX] = left_img[:, KX:]
    Image.fromarray(tpl).save(out_path)
    return tpl


def make_l_template(left_img: np.ndarray, bot_img: np.ndarray, out_path: Path) -> np.ndarray:
    tpl = np.full((H, W, 3), 255, dtype=np.uint8)
    left_strip = left_img[:, KX:]
    bot_strip = bot_img[:OY, :]
    tpl[KY:, :] = bot_strip
    tpl[:, :OX] = left_strip

    fade = 240
    x0 = OX - fade
    ax = (0.5 * (1.0 + np.cos(np.pi * np.linspace(0.0, 1.0, fade))))[None, :, None]
    lc = left_strip[KY:, x0:OX].astype(np.float32)
    bc = bot_strip[:, x0:OX].astype(np.float32)
    tpl[KY:, x0:OX] = np.clip(lc * ax + bc * (1.0 - ax), 0, 255).astype(np.uint8)
    Image.fromarray(tpl).save(out_path)
    return tpl


def measure_shift(ref_patch: np.ndarray, target_region: np.ndarray, exp_x: int, exp_y: int) -> tuple[float, int, int]:
    res = cv2.matchTemplate(target_region, ref_patch, cv2.TM_CCOEFF_NORMED)
    _, max_val, _, max_loc = cv2.minMaxLoc(res)
    return float(max_val), int(max_loc[0] - exp_x), int(max_loc[1] - exp_y)


def align_and_match_tile(
    raw_img: np.ndarray,
    left_img: np.ndarray | None,
    bot_img: np.ndarray | None,
    tag: str,
) -> np.ndarray:
    img = raw_img
    shifts_x: list[int] = []
    shifts_y: list[int] = []

    if left_img is not None:
        left_strip = left_img[:, KX:]
        h_top = KY - 100 if bot_img is not None else H - 250
        corr_l, dx_l, dy_l = measure_shift(
            left_strip[200:h_top, 200:OX - 200],
            img[:, :OX],
            200,
            200,
        )
        print(f"  [{tag}] left overlap corr={corr_l:.4f}, shift dx={dx_l}, dy={dy_l}", flush=True)
        if corr_l > 0.55 and abs(dx_l) <= 45 and abs(dy_l) <= 45:
            shifts_x.append(dx_l)
            shifts_y.append(dy_l)

    if bot_img is not None:
        bot_strip = bot_img[:OY, :]
        x_start = OX + 200 if left_img is not None else 350
        corr_b, dx_b, dy_b = measure_shift(
            bot_strip[160:OY - 160, x_start:W - 300],
            img[KY:, :],
            x_start,
            160,
        )
        print(f"  [{tag}] bot  overlap corr={corr_b:.4f}, shift dx={dx_b}, dy={dy_b}", flush=True)
        if corr_b > 0.55 and abs(dx_b) <= 45 and abs(dy_b) <= 45:
            shifts_x.append(dx_b)
            shifts_y.append(dy_b)

    if shifts_x:
        dx = round(sum(shifts_x) / len(shifts_x))
        dy = round(sum(shifts_y) / len(shifts_y))
        if dx != 0 or dy != 0:
            mat = np.float32([[1, 0, -dx], [0, 1, -dy]])
            img = cv2.warpAffine(img, mat, (W, H), borderMode=cv2.BORDER_REPLICATE)

    # Color-match exposure & balance using available overlap pixels
    src_samples: list[np.ndarray] = []
    ref_samples: list[np.ndarray] = []
    if left_img is not None:
        src_samples.append(img[150:H - 150, 150:OX - 150].reshape(-1, 3))
        ref_samples.append(left_img[150:H - 150, KX + 150:W - 150].reshape(-1, 3))
    if bot_img is not None:
        src_samples.append(img[KY + 120:H - 120, 200:W - 200].reshape(-1, 3))
        ref_samples.append(bot_img[120:OY - 120, 200:W - 200].reshape(-1, 3))

    if src_samples:
        src_all = np.vstack(src_samples).astype(np.float32)
        ref_all = np.vstack(ref_samples).astype(np.float32)
        s_mean = src_all.mean(axis=0)
        r_mean = ref_all.mean(axis=0)
        s_std = np.maximum(1.0, src_all.std(axis=0))
        r_std = np.maximum(1.0, ref_all.std(axis=0))
        gain = np.clip(r_std / s_std, 0.90, 1.12)
        matched = (img.astype(np.float32) - s_mean) * gain + r_mean
        img = np.clip(matched, 0, 255).astype(np.uint8)

    return img


def has_white_seam_gutter(arr: np.ndarray, has_left: bool, has_bot: bool) -> str | None:
    """Detect artificial near-white panel border strips left by outpainting near overlap cuts."""
    if has_left:
        band = arr[:, OX - 25 : OX + 70, :]
        # Count rows per column that look like a blank white/gray gutter (>220 min RGB; sand min RGB is ~130)
        white_frac = (band.min(axis=2) > 220).mean(axis=0)
        if white_frac.max() > 0.25:
            bad_x = int(OX - 25 + white_frac.argmax())
            return f"vertical white seam line near x={bad_x} ({white_frac.max()*100:.0f}% height)"
    if has_bot:
        band = arr[KY - 70 : KY + 25, :, :]
        white_frac = (band.min(axis=2) > 220).mean(axis=1)
        if white_frac.max() > 0.25:
            bad_y = int(KY - 70 + white_frac.argmax())
            return f"horizontal white seam line near y={bad_y} ({white_frac.max()*100:.0f}% width)"
    return None


def run_live_wave(
    client: genai.Client,
    wave_num: int,
    jobs_spec: list[tuple[str, str, np.ndarray]],
    model: str,
    work_dir: Path,
) -> dict[str, np.ndarray]:
    """Run one diagonal wave directly through instant live generate_content calls."""
    live_model = model.removeprefix("models/")

    def _one(tile_id: str, prompt_text: str, tpl_img: np.ndarray) -> tuple[str, np.ndarray]:
        pil_tpl = Image.fromarray(tpl_img)
        has_left = tile_id in ("r0c1", "r0c2", "r1c1", "r1c2", "r2c1", "r2c2")
        has_bot = tile_id in ("r1c0", "r1c1", "r1c2", "r2c0", "r2c1", "r2c2")
        seam_guard = (
            "SEAM SAFETY MANDATE: Connect directly onto the painted terrain pixels at every edge with "
            "ZERO white gap, ZERO white border line, ZERO collage divider strip, and ZERO un-painted white edge anywhere.\n\n"
        )
        full_prompt = seam_guard + prompt_text
        last_err: Exception | None = None
        for attempt in range(1, 5):
            try:
                resp = client.models.generate_content(
                    model=live_model,
                    contents=[full_prompt, pil_tpl],
                    config=types.GenerateContentConfig(
                        image_config=types.ImageConfig(aspect_ratio="16:9", image_size="4K"),
                        response_modalities=["IMAGE"],
                    ),
                )
                for part in resp.candidates[0].content.parts:
                    inline = getattr(part, "inline_data", None)
                    if inline and inline.data:
                        raw_bytes = inline.data
                        arr = np.array(Image.open(io.BytesIO(raw_bytes)).convert("RGB"))
                        if arr.shape[:2] != (H, W):
                            arr = np.array(Image.fromarray(arr).resize((W, H), Image.Resampling.LANCZOS))
                        gutter = has_white_seam_gutter(arr, has_left, has_bot)
                        if gutter:
                            raise RuntimeError(f"Detected {gutter}")
                        (work_dir / f"raw_{tile_id}.jpg").write_bytes(raw_bytes)
                        return tile_id, arr
                raise RuntimeError(f"Empty image response for {tile_id}")
            except Exception as exc:
                last_err = exc
                print(f"  [Wave {wave_num} | {tile_id}] Retry {attempt}/4: {exc}", flush=True)
                time.sleep(2 * attempt)
        raise RuntimeError(f"Live wave {wave_num} failed for {tile_id}: {last_err}")

    print(f"\n[Wave {wave_num}] Running {len(jobs_spec)} tile(s) LIVE via {live_model}...", flush=True)
    results: dict[str, np.ndarray] = {}
    with ThreadPoolExecutor(max_workers=len(jobs_spec)) as pool:
        futs = [pool.submit(_one, tid, ptxt, tpl) for (tid, ptxt, tpl) in jobs_spec]
        for fut in as_completed(futs):
            tid, arr = fut.result()
            results[tid] = arr
            print(f"  Completed live {tid}: {arr.shape[1]}x{arr.shape[0]}", flush=True)
    return results


def submit_and_wait_wave(
    client: genai.Client | None,
    wave_num: int,
    jobs_spec: list[tuple[str, str, np.ndarray]],
    model: str,
    dry_run: bool,
    work_dir: Path,
    map_slug: str,
    live: bool = False,
) -> dict[str, np.ndarray]:
    if live:
        if dry_run:
            print(f"\n[Wave {wave_num}] Dry-run LIVE wave validated ({len(jobs_spec)} tiles).", flush=True)
            return {}
        assert client is not None
        return run_live_wave(client, wave_num, jobs_spec, model, work_dir)
    jsonl_path = BATCH_DIR / f"{map_slug}_3x3_wave{wave_num}.jsonl"
    lines: list[str] = []
    for tile_id, prompt_text, tpl_img in jobs_spec:
        b64 = encode_jpeg_b64(tpl_img, quality=94)
        req_obj = {
            "customId": tile_id,
            "request": {
                "model": model,
                "contents": [
                    {
                        "parts": [
                            {"text": prompt_text},
                            {"inlineData": {"mimeType": "image/jpeg", "data": b64}},
                        ]
                    }
                ],
                "generationConfig": {
                    "responseModalities": ["IMAGE"],
                    "imageConfig": {
                        "aspectRatio": "16:9",
                        "imageSize": "4K",
                    },
                },
            },
        }
        lines.append(json.dumps(req_obj, ensure_ascii=False))

    jsonl_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    mb = jsonl_path.stat().st_size / (1024 * 1024)
    print(f"\n[Wave {wave_num}] Built {len(lines)} request(s) -> {jsonl_path.name} ({mb:.1f} MB)", flush=True)

    if dry_run:
        return {}

    uploaded = client.files.upload(
        file=str(jsonl_path),
        config=types.UploadFileConfig(mime_type="application/jsonl"),
    )
    job = client.batches.create(
        model=model,
        src=uploaded.name,
        config=types.CreateBatchJobConfig(display_name=f"rod-{map_slug}-3x3-w{wave_num}"),
    )
    print(f"[Wave {wave_num}] Batch submitted: {job.name}", flush=True)

    while True:
        cur = client.batches.get(name=job.name)
        st = getattr(cur.state, "name", str(cur.state))
        if st == "JOB_STATE_SUCCEEDED":
            print(f"[Wave {wave_num}] JOB_STATE_SUCCEEDED!", flush=True)
            break
        if st in TERMINAL_FAIL_STATES:
            raise RuntimeError(f"Wave {wave_num} failed ({st}): {getattr(cur, 'error', None)}")
        print(f"[Wave {wave_num}] State: {st} (waiting 15s)...", flush=True)
        time.sleep(15)

    results: dict[str, np.ndarray] = {}
    dest_file = getattr(getattr(cur, "dest", None), "file_name", None)
    if dest_file:
        raw_jsonl = client.files.download(file=dest_file).decode("utf-8")
        for line in raw_jsonl.splitlines():
            if not line.strip():
                continue
            item = json.loads(line)
            tid = item.get("customId") or item.get("key")
            if item.get("error"):
                raise RuntimeError(f"Batch item {tid} error: {item['error']}")
            parts = item["response"]["candidates"][0]["content"]["parts"]
            for part in parts:
                inline = part.get("inlineData") or part.get("inline_data")
                if inline and inline.get("data"):
                    raw_bytes = base64.b64decode(inline["data"])
                    (work_dir / f"raw_{tid}.jpg").write_bytes(raw_bytes)
                    arr = np.array(Image.open(io.BytesIO(raw_bytes)).convert("RGB"))
                    if arr.shape[:2] != (H, W):
                        arr = np.array(Image.fromarray(arr).resize((W, H), Image.Resampling.LANCZOS))
                    results[tid] = arr
                    print(f"  Downloaded {tid}: {arr.shape[1]}x{arr.shape[0]}", flush=True)
                    break

    if len(results) != len(jobs_spec):
        raise RuntimeError(f"Wave {wave_num} missing results: got {list(results.keys())}")
    return results


def blend_horiz_append(left_canvas: np.ndarray, right_panel: np.ndarray, kx_offset: int) -> np.ndarray:
    bx = 1200
    x0_rel = (OX - bx) // 2
    x_abs0 = kx_offset + x0_rel
    x_abs1 = x_abs0 + bx
    total_w = kx_offset + right_panel.shape[1]
    out = np.zeros((left_canvas.shape[0], total_w, 3), dtype=np.uint8)
    out[:, :x_abs0] = left_canvas[:, :x_abs0]
    out[:, x_abs1:] = right_panel[:, x0_rel + bx:]
    ax = (0.5 * (1.0 + np.cos(np.pi * np.linspace(0.0, 1.0, bx))))[None, :, None]
    out[:, x_abs0:x_abs1] = np.clip(
        left_canvas[:, x_abs0:x_abs1].astype(np.float32) * ax
        + right_panel[:, x0_rel:x0_rel + bx].astype(np.float32) * (1.0 - ax),
        0,
        255,
    ).astype(np.uint8)
    return out


def blend_vert_prepend(top_band: np.ndarray, lower_canvas: np.ndarray) -> np.ndarray:
    by = 700
    y0 = KY + (OY - by) // 2
    out = np.zeros((lower_canvas.shape[0] + KY, lower_canvas.shape[1], 3), dtype=np.uint8)
    out[:y0] = top_band[:y0]
    out[y0 + by:] = lower_canvas[(y0 - KY) + by:]
    ay = (0.5 * (1.0 + np.cos(np.pi * np.linspace(0.0, 1.0, by))))[:, None, None]
    out[y0:y0 + by] = np.clip(
        top_band[y0:y0 + by].astype(np.float32) * ay
        + lower_canvas[(y0 - KY):(y0 - KY) + by].astype(np.float32) * (1.0 - ay),
        0,
        255,
    ).astype(np.uint8)
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description="Build 3x3 16:9 4K map via 4 diagonal waves (Batch or Live).")
    parser.add_argument("--dry-run", action="store_true", help="Validate Wave 1 only without submitting.")
    parser.add_argument("--live", action="store_true", help="Use instant one-off generate_content calls instead of Batch queue.")
    parser.add_argument("--regen-col2", action="store_true", help="Keep seamless left 2x3 tiles (r0c0..r2c1) and only regenerate r0c2, r1c2, r2c2.")
    parser.add_argument("--map", default="MAP01", help="Map code inside realm-maps.txt (default: MAP01)")
    parser.add_argument("--seed-file", type=Path, default=SEED_TILE_SRC)
    parser.add_argument("--work-dir", type=Path, default=WORK_DIR)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    args = parser.parse_args()

    load_dotenv(REPO_ROOT / ".env")
    prompts = parse_prompts(REALM_PROMPTS_PATH, args.map)
    work_dir: Path = args.work_dir
    seed_src: Path = args.seed_file
    work_dir.mkdir(parents=True, exist_ok=True)

    if not seed_src.exists():
        raise FileNotFoundError(f"Missing seed bottom-left map: {seed_src}")

    seed_dest = work_dir / "tile_r0c0.png"
    shutil.copy2(seed_src, seed_dest)

    seed_arr = np.array(Image.open(seed_dest).convert("RGB"))
    if seed_arr.shape[:2] != (H, W):
        seed_arr = np.array(Image.fromarray(seed_arr).resize((W, H), Image.Resampling.LANCZOS))
    Image.fromarray(seed_arr).save(seed_dest)
    tiles: dict[str, np.ndarray] = {"r0c0": seed_arr}

    client = None if args.dry_run else genai.Client()

    slug = args.map.lower()

    if args.regen_col2:
        for k in ("r1c0", "r0c1", "r2c0", "r1c1", "r2c1"):
            tiles[k] = np.array(Image.open(work_dir / f"tile_{k}.png").convert("RGB"))
        print("Loaded existing seamless 2x3 tiles (r0c0..r2c1); regenerating Col 2 sequentially...", flush=True)

        # Sequential Col 2: r0c2 -> r1c2 -> r2c2
        r0c2_res = submit_and_wait_wave(
            client, 2, [("r0c2", prompts["r0c2"], make_left_template(tiles["r0c1"], work_dir / "tpl_r0c2.png"))],
            args.model, args.dry_run, work_dir, slug, args.live,
        )
        if args.dry_run:
            return 0
        tiles["r0c2"] = align_and_match_tile(r0c2_res["r0c2"], tiles["r0c1"], None, "R0C2")
        Image.fromarray(tiles["r0c2"]).save(work_dir / "tile_r0c2.png")

        r1c2_res = submit_and_wait_wave(
            client, 3, [("r1c2", prompts["r1c2"], make_l_template(tiles["r1c1"], tiles["r0c2"], work_dir / "tpl_r1c2.png"))],
            args.model, False, work_dir, slug, args.live,
        )
        tiles["r1c2"] = align_and_match_tile(r1c2_res["r1c2"], tiles["r1c1"], tiles["r0c2"], "R1C2")
        Image.fromarray(tiles["r1c2"]).save(work_dir / "tile_r1c2.png")

        r2c2_res = submit_and_wait_wave(
            client, 4, [("r2c2", prompts["r2c2"], make_l_template(tiles["r2c1"], tiles["r1c2"], work_dir / "tpl_r2c2.png"))],
            args.model, False, work_dir, slug, args.live,
        )
        tiles["r2c2"] = align_and_match_tile(r2c2_res["r2c2"], tiles["r2c1"], tiles["r1c2"], "R2C2")
        Image.fromarray(tiles["r2c2"]).save(work_dir / "tile_r2c2.png")
    else:
        # Wave 1: r1c0 (North) + r0c1 (East)
        w1_tpls = [
            ("r1c0", prompts["r1c0"], make_top_template(tiles["r0c0"], work_dir / "tpl_r1c0.png")),
            ("r0c1", prompts["r0c1"], make_left_template(tiles["r0c0"], work_dir / "tpl_r0c1.png")),
        ]
        w1_res = submit_and_wait_wave(client, 1, w1_tpls, args.model, args.dry_run, work_dir, slug, args.live)
        if args.dry_run:
            print("Dry-run Wave 1 validation succeeded!")
            return 0
        tiles["r1c0"] = align_and_match_tile(w1_res["r1c0"], None, tiles["r0c0"], "R1C0")
        tiles["r0c1"] = align_and_match_tile(w1_res["r0c1"], tiles["r0c0"], None, "R0C1")
        Image.fromarray(tiles["r1c0"]).save(work_dir / "tile_r1c0.png")
        Image.fromarray(tiles["r0c1"]).save(work_dir / "tile_r0c1.png")

        # Wave 2: r2c0 (North) + r1c1 (L-corner) + r0c2 (East)
        w2_tpls = [
            ("r2c0", prompts["r2c0"], make_top_template(tiles["r1c0"], work_dir / "tpl_r2c0.png")),
            ("r1c1", prompts["r1c1"], make_l_template(tiles["r1c0"], tiles["r0c1"], work_dir / "tpl_r1c1.png")),
            ("r0c2", prompts["r0c2"], make_left_template(tiles["r0c1"], work_dir / "tpl_r0c2.png")),
        ]
        w2_res = submit_and_wait_wave(client, 2, w2_tpls, args.model, False, work_dir, slug, args.live)
        tiles["r2c0"] = align_and_match_tile(w2_res["r2c0"], None, tiles["r1c0"], "R2C0")
        tiles["r1c1"] = align_and_match_tile(w2_res["r1c1"], tiles["r1c0"], tiles["r0c1"], "R1C1")
        tiles["r0c2"] = align_and_match_tile(w2_res["r0c2"], tiles["r0c1"], None, "R0C2")
        for k in ("r2c0", "r1c1", "r0c2"):
            Image.fromarray(tiles[k]).save(work_dir / f"tile_{k}.png")

        # Wave 3: r2c1 (L-corner) + r1c2 (L-corner)
        w3_tpls = [
            ("r2c1", prompts["r2c1"], make_l_template(tiles["r2c0"], tiles["r1c1"], work_dir / "tpl_r2c1.png")),
            ("r1c2", prompts["r1c2"], make_l_template(tiles["r1c1"], tiles["r0c2"], work_dir / "tpl_r1c2.png")),
        ]
        w3_res = submit_and_wait_wave(client, 3, w3_tpls, args.model, False, work_dir, slug, args.live)
        tiles["r2c1"] = align_and_match_tile(w3_res["r2c1"], tiles["r2c0"], tiles["r1c1"], "R2C1")
        tiles["r1c2"] = align_and_match_tile(w3_res["r1c2"], tiles["r1c1"], tiles["r0c2"], "R1C2")
        for k in ("r2c1", "r1c2"):
            Image.fromarray(tiles[k]).save(work_dir / f"tile_{k}.png")

        # Wave 4: r2c2 (L-corner)
        w4_tpls = [
            ("r2c2", prompts["r2c2"], make_l_template(tiles["r2c1"], tiles["r1c2"], work_dir / "tpl_r2c2.png")),
        ]
        w4_res = submit_and_wait_wave(client, 4, w4_tpls, args.model, False, work_dir, slug, args.live)
        tiles["r2c2"] = align_and_match_tile(w4_res["r2c2"], tiles["r2c1"], tiles["r1c2"], "R2C2")
        Image.fromarray(tiles["r2c2"]).save(work_dir / "tile_r2c2.png")

    # Stitch all 3 rows horizontally then blend top-to-bottom vertically
    row0 = blend_horiz_append(blend_horiz_append(tiles["r0c0"], tiles["r0c1"], KX), tiles["r0c2"], 2 * KX)
    row1 = blend_horiz_append(blend_horiz_append(tiles["r1c0"], tiles["r1c1"], KX), tiles["r1c2"], 2 * KX)
    row2 = blend_horiz_append(blend_horiz_append(tiles["r2c0"], tiles["r2c1"], KX), tiles["r2c2"], 2 * KX)

    lower_2 = blend_vert_prepend(row1, row0)
    full_3x3 = blend_vert_prepend(row2, lower_2)

    out_png = work_dir / f"{slug}_3x3_full.png"
    out_webp = work_dir / f"{slug}_3x3_full.webp"
    Image.fromarray(full_3x3).save(out_png)
    Image.fromarray(full_3x3).save(out_webp, format="WEBP", quality=92, method=4)
    print(f"\nDONE! Saved Batch 3x3 map ({full_3x3.shape[1]}x{full_3x3.shape[0]}) -> {out_webp}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
