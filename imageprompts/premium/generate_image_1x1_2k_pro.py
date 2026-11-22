import argparse
import os
import re
from pathlib import Path

from google import genai
from google.genai import types
from PIL import Image


def get_api_key():
    """Load GEMINI_API_KEY from nearby .env files or environment."""
    search_paths = [".env", "../.env", "../../.env", "../../../.env"]
    for path in search_paths:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
                match = re.search(r"GEMINI_API_KEY=(.+)", content)
                if match:
                    return match.group(1).strip()
    return os.environ.get("GEMINI_API_KEY")


def generate_image_pro_2k(
    prompt,
    output_path="assets/generated_1x1_2k_pro.png",
    reference_path=None,
    aspect_ratio="1:1",
    image_size="2K",
    seed=None,
    model_id="gemini-3-pro-image",
):
    """Generate a single live 1:1 2K image using Gemini 3 Pro Image."""
    api_key = get_api_key()
    if not api_key:
        print("Error: GEMINI_API_KEY not found in .env or environment variables.")
        return False

    client = genai.Client(api_key=api_key)
    contents = [prompt]

    if reference_path:
        if os.path.exists(reference_path):
            print(f"Using reference image: {reference_path}")
            ref_img = Image.open(reference_path)
            contents.append(ref_img)
        else:
            print(f"Warning: Reference image not found at {reference_path}. Proceeding text-only.")

    print(f"Requesting 1:1 image from {model_id} (Resolution: {image_size}, Aspect Ratio: {aspect_ratio}, Seed: {seed})...")
    print(f"Target Output: {output_path}")

    try:
        gen_config = {
            "image_config": types.ImageConfig(
                aspect_ratio=aspect_ratio,
                image_size=image_size,
            ),
            "response_modalities": ["IMAGE"],
        }
        if seed is not None:
            gen_config["seed"] = int(seed)

        response = client.models.generate_content(
            model=model_id,
            contents=contents,
            config=types.GenerateContentConfig(**gen_config),
        )

        if response.candidates and response.candidates[0].content.parts:
            part = response.candidates[0].content.parts[0]
            if hasattr(part, "inline_data") and part.inline_data:
                image_bytes = part.inline_data.data
                out_dir = os.path.dirname(output_path)
                if out_dir:
                    os.makedirs(out_dir, exist_ok=True)

                with open(output_path, "wb") as f:
                    f.write(image_bytes)
                mime_type = getattr(part.inline_data, "mime_type", "") or ""
                if output_path.lower().endswith((".jpg", ".jpeg")) and mime_type != "image/jpeg":
                    with Image.open(output_path) as im:
                        im.convert("RGB").save(output_path, format="JPEG", quality=95)
                print(f"SUCCESS! Pro 2K image saved to {output_path} ({os.path.getsize(output_path):,} bytes)")
                return True
            print("No inline image data found in candidate parts.")
            return False

        print("No candidates returned from Gemini API.")
        return False

    except Exception as e:
        print(f"Error during Pro image generation: {e}")
        return False


def load_prompt_from_file(file_path):
    """Read and strip a prompt text file."""
    if not os.path.exists(file_path):
        print(f"Error: Prompt file not found at {file_path}")
        return None
    with open(file_path, "r", encoding="utf-8") as f:
        return f.read().strip()


def load_vfx_sheet_prompt(sheet_num: int):
    """Extract a numbered SHEET N prompt block from imageprompts/combat-vfx-overlays.txt."""
    vfx_file = Path(__file__).resolve().parents[1] / "combat-vfx-overlays.txt"
    if not vfx_file.exists():
        print(f"Error: VFX prompt file not found at {vfx_file}")
        return None
    text = vfx_file.read_text(encoding="utf-8")
    m = re.search(
        rf"---\s*SHEET\s+{sheet_num}\s+PROMPT\s+START[^\n]*---\n(.*?)\n---\s*SHEET\s+{sheet_num}\s+PROMPT\s+END\s*---",
        text,
        re.DOTALL,
    )
    if not m:
        print(f"Error: Sheet {sheet_num} not found in {vfx_file}")
        return None
    return m.group(1).strip()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate 1:1 2K images using Gemini 3 Pro Image model.")
    parser.add_argument("prompt", nargs="?", default="", help="Prompt text")
    parser.add_argument("--prompt_file", "-f", help="Path to prompt text file")
    parser.add_argument("--vfx_sheet", type=int, default=None, help="Optional sheet number (1-40) from combat-vfx-overlays.txt")
    parser.add_argument("--output", "-o", default="assets/generated_1x1_2k_pro.png", help="Output path")
    parser.add_argument("--reference", "-r", help="Optional reference image path")
    parser.add_argument("--aspect_ratio", default="1:1", help="Aspect ratio (default: 1:1)")
    parser.add_argument("--image_size", default="2K", help="Image resolution size (default: 2K)")
    parser.add_argument("--seed", type=int, default=None, help="Optional seed")
    parser.add_argument("--model", default="gemini-3-pro-image", help="Model name (default: gemini-3-pro-image)")
    args = parser.parse_args()

    prompt_text = args.prompt
    if not prompt_text and args.vfx_sheet is not None:
        prompt_text = load_vfx_sheet_prompt(args.vfx_sheet)
    elif not prompt_text and args.prompt_file:
        prompt_text = load_prompt_from_file(args.prompt_file)

    if not prompt_text:
        print("Error: Provide prompt text, --prompt_file, or --vfx_sheet.")
        raise SystemExit(1)

    generate_image_pro_2k(
        prompt=prompt_text,
        output_path=args.output,
        reference_path=args.reference,
        aspect_ratio=args.aspect_ratio,
        image_size=args.image_size,
        seed=args.seed,
        model_id=args.model,
    )
