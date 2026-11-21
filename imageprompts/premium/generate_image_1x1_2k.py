import os
import re
import argparse
from google import genai
from google.genai import types
from PIL import Image

def get_api_key():
    # Look for .env in current directory or parent directories
    search_paths = [".env", "../.env", "../../.env", "../../../.env"]
    for path in search_paths:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
                match = re.search(r"GEMINI_API_KEY=(.+)", content)
                if match:
                    return match.group(1).strip()
    return os.environ.get("GEMINI_API_KEY")

def generate_image(prompt, output_path, reference_path=None, aspect_ratio='1:1', image_size='2K', seed=None):
    api_key = get_api_key()
    if not api_key:
        print("Error: GEMINI_API_KEY not found in .env or environment variables.")
        return False

    # Initialize the GenAI Client
    client = genai.Client(api_key=api_key)

    # Prepare contents list for multimodal input
    contents = [prompt]

    if reference_path:
        if os.path.exists(reference_path):
            print(f"Using reference image: {reference_path}")
            ref_img = Image.open(reference_path)
            contents.append(ref_img)
            contents[0] = f"Use the exact art style, color palette, and visual finish from the attached image to fulfill this request: {prompt}"
        else:
            print(f"Warning: Reference image not found at {reference_path}. Proceeding with text-only.")

    model_id = 'gemini-3.1-flash-image'
    print(f"Requesting image from {model_id} (Resolution: {image_size}, Aspect Ratio: {aspect_ratio}, Seed: {seed})...")
    print(f"Target Output: {output_path}")

    try:
        gen_config = {
            "image_config": types.ImageConfig(
                aspect_ratio=aspect_ratio,
                image_size=image_size,
            ),
            "response_modalities": ['IMAGE']
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
            if hasattr(part, 'inline_data') and part.inline_data:
                image_bytes = part.inline_data.data

                # Ensure output directory exists
                out_dir = os.path.dirname(output_path)
                if out_dir:
                    os.makedirs(out_dir, exist_ok=True)

                with open(output_path, "wb") as f:
                    f.write(image_bytes)
                print(f"SUCCESS! Image saved to {output_path}")
                return True
            else:
                print("No image data found in response parts.")
                return False
        else:
            print("No candidates or parts returned.")
            return False

    except Exception as e:
        print("Error during image generation:", str(e))
        return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate a 1:1 2K image using Gemini 3.1 Flash Image model.")
    parser.add_argument("prompt", nargs="?", default="", help="The prompt text for image generation.")
    parser.add_argument("--prompt_file", "-f", help="Path to a text file containing the prompt.")
    parser.add_argument("--output", "-o", default="assets/generated_1x1_2k.png", help="Path to save the generated image.")
    parser.add_argument("--aspect_ratio", default="1:1", help="Aspect ratio (default: 1:1)")
    parser.add_argument("--image_size", default="2K", help="Resolution size (default: 2K)")
    parser.add_argument("--reference", "-r", help="Optional path to a reference image for style matching.")
    parser.add_argument("--seed", "-s", type=int, default=None, help="Optional random seed for generation.")

    args = parser.parse_args()

    prompt_text = args.prompt
    if args.prompt_file:
        if os.path.exists(args.prompt_file):
            with open(args.prompt_file, "r", encoding="utf-8") as pf:
                prompt_text = pf.read().strip()
        else:
            print(f"Error: Prompt file '{args.prompt_file}' not found.")
            exit(1)

    if not prompt_text:
        print("Error: No prompt provided. Provide a prompt argument or use --prompt_file / -f.")
        exit(1)

    generate_image(
        prompt=prompt_text,
        output_path=args.output,
        reference_path=args.reference,
        aspect_ratio=args.aspect_ratio,
        image_size=args.image_size,
        seed=args.seed
    )
