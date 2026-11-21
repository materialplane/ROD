import os
import re
import argparse
from google import genai
from google.genai import types
from PIL import Image

def get_api_key():
    # Look for .env in the current directory or parent directory
    search_paths = [".env", "../.env", "../../.env"]
    for path in search_paths:
        if os.path.exists(path):
            with open(path, "r") as f:
                content = f.read()
                match = re.search(r"GEMINI_API_KEY=(.+)", content)
                if match:
                    return match.group(1).strip()
    return os.environ.get("GEMINI_API_KEY")

def generate_image(prompt, output_path, reference_path=None, aspect_ratio='16:9', image_size='4K'):
    api_key = get_api_key()
    if not api_key:
        print("Error: GEMINI_API_KEY not found in .env or environment variables.")
        return

    # Initialize the GenAI Client
    client = genai.Client(api_key=api_key)

    # Prepare contents list for multimodal input
    contents = [prompt]
    
    if reference_path:
        if os.path.exists(reference_path):
            print(f"Using reference image: {reference_path}")
            ref_img = Image.open(reference_path)
            contents.append(ref_img)
            # Instruct the model to match the style of the provided image
            contents[0] = f"Use the exact art style, color palette, and visual finish from the attached image to fulfill this request: {prompt}"
        else:
            print(f"Warning: Reference image not found at {reference_path}. Proceeding with text-only.")

    # Clean prompt without Midjourney flags

    model_id = 'gemini-3.1-flash-image'
    print(f"Requesting image from {model_id} (Resolution: {image_size}, Aspect Ratio: {aspect_ratio})...")
    print(f"Final Prompt: {contents[0]}")
    
    try:
        response = client.models.generate_content(
            model=model_id,
            contents=contents,
            config=types.GenerateContentConfig(
                image_config=types.ImageConfig(
                    aspect_ratio=aspect_ratio,
                    image_size=image_size, 
                ),
                response_modalities=['IMAGE']
            )
        )
        
        if response.candidates and response.candidates[0].content.parts:
            part = response.candidates[0].content.parts[0]
            if hasattr(part, 'inline_data'):
                image_bytes = part.inline_data.data
                
                # Ensure directory exists
                os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else ".", exist_ok=True)
                
                with open(output_path, "wb") as f:
                    f.write(image_bytes)
                print(f"SUCCESS! Image saved to {output_path}")
            else:
                print("No image data found in response parts.")
        else:
            print("No candidates or parts returned.")
            
    except Exception as e:
        print("Error during image generation:", str(e))

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate a 16:9 4K image using Gemini 3.1 Flash Image model.")
    parser.add_argument("prompt", nargs="?", default="", help="The prompt for the image generation.")
    parser.add_argument("--prompt_file", "-f", help="Path to text file containing prompt.")
    parser.add_argument("--output", "-o", default="assets/overworld_tactical_16x9_flash_4k.png", help="Path to save the generated image.")
    parser.add_argument('--aspect_ratio', default='16:9', help='Aspect ratio (default: 16:9)')
    parser.add_argument('--image_size', default='4K', help='Resolution size (default: 4K)')
    parser.add_argument('--reference', "-r", help="Optional path to a reference image.")
    
    args = parser.parse_args()
    prompt_text = args.prompt
    if not prompt_text and args.prompt_file and os.path.exists(args.prompt_file):
        with open(args.prompt_file, "r", encoding="utf-8") as f:
            prompt_text = f.read().strip()

    if not prompt_text:
        print("Error: No prompt provided.")
        exit(1)

    generate_image(prompt_text, args.output, args.reference, args.aspect_ratio, args.image_size)




