import os
import re
import argparse
from google import genai
from google.genai import types
from PIL import Image

def get_api_key():
    search_paths = [".env", "../.env", "../../.env", "../../../.env"]
    for path in search_paths:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
                match = re.search(r"GEMINI_API_KEY=(.+)", content)
                if match:
                    return match.group(1).strip()
    return os.environ.get("GEMINI_API_KEY")

def generate_image_pro(
    prompt,
    output_path="assets/generated_realm_map_4k_pro.png",
    reference_path=None,
    aspect_ratio="1:1",
    image_size="4K",
    seed=None,
    model_id="gemini-3-pro-image"
):
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

    print(f"Requesting image from {model_id} (Resolution: {image_size}, Aspect Ratio: {aspect_ratio}, Seed: {seed})...")
    print(f"Target Output: {output_path}")

    try:
        gen_config = {
            "image_config": types.ImageConfig(
                aspect_ratio=aspect_ratio,
                image_size=image_size,
            ),
            "response_modalities": ["IMAGE"]
        }
        if seed is not None:
            gen_config["seed"] = int(seed)

        response = client.models.generate_content(
            model=model_id,
            contents=contents,
            config=types.GenerateContentConfig(**gen_config)
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
                print(f"SUCCESS! Pro 4K image saved to {output_path} ({len(image_bytes)} bytes)")
                return True
            else:
                print("No inline image data found in candidate parts.")
                return False
        else:
            print("No candidates returned from Gemini API.")
            return False

    except Exception as e:
        print(f"Error during Pro image generation: {e}")
        return False

def load_prompt_from_file(file_path):
    if not os.path.exists(file_path):
        print(f"Error: Prompt file not found at {file_path}")
        return None
    with open(file_path, "r", encoding="utf-8") as f:
        return f.read().strip()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate 1:1 4K images using Gemini 3 Pro Image model.")
    parser.add_argument("prompt", nargs="?", default="", help="Prompt text")
    parser.add_argument("--prompt_file", "-f", default="image-prompt.txt", help="Path to prompt text file (default: image-prompt.txt)")
    parser.add_argument("--output", "-o", default="assets/overworld_continent_pro_4k.png", help="Output path")
    parser.add_argument("--reference", "-r", help="Optional reference image path")
    parser.add_argument("--aspect_ratio", default="1:1", help="Aspect ratio (default: 1:1)")
    parser.add_argument("--image_size", default="4K", help="Image resolution size (default: 4K)")
    parser.add_argument("--seed", type=int, default=None, help="Optional seed")
    parser.add_argument("--model", default="gemini-3-pro-image", help="Model name (default: gemini-3-pro-image)")
    args = parser.parse_args()

    prompt_text = args.prompt
    if not prompt_text and args.prompt_file:
        prompt_text = load_prompt_from_file(args.prompt_file)

    if not prompt_text:
        print("Error: No prompt provided via command line argument or --prompt_file.")
        exit(1)

    generate_image_pro(
        prompt=prompt_text,
        output_path=args.output,
        reference_path=args.reference,
        aspect_ratio=args.aspect_ratio,
        image_size=args.image_size,
        seed=args.seed,
        model_id=args.model
    )
