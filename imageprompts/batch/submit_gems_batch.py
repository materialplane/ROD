import os
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv('.env')
client = genai.Client()

# Get missing gems
with open('scratch/missing_images.json', 'r') as f:
    missing = json.load(f)

gems = [m for m in missing if m.get('category') == 'gem']
print(f"Found {len(gems)} missing gems.")

BASE_PROMPT = """A 1:1 4x4 image sheet of 16 distinct ancient medieval RPG inventory items. 

Each cell represents a single 1:1 standalone square painting of an item. The art style is a dark fantasy digital painting in 4k quality. It uses a gritty, ancient medieval aesthetic with moody, high-contrast chiaroscuro lighting and deep atmospheric shadows.

CRITICAL RULE 1: Absolutely NO TEXT, NO LABELS, NO NUMBERS, and no UI borders anywhere in the image.
CRITICAL RULE 2: The MAGENTA BACKGROUND must remain completely unaffected by the lighting. The background behind every single item MUST be a pure, flat, uniform MAGENTA color (#FF00FF). The chiaroscuro shadows MUST remain strictly on the objects themselves. Do NOT cast drop-shadows, vignettes, or gradients onto the magenta background. The magenta must be 100% flat for transparency keying.
CRITICAL RULE 3: Every item MUST be fully contained within its square cell. Do not crop the items. You must zoom out and scale down the weapons so the ENTIRE item (from the tip of the blade to the bottom of the handle) is 100% visible inside the frame. For long items like spears or pikes, draw them diagonally to ensure the whole weapon fits perfectly inside the cell.
CRITICAL RULE 4: If an item is a necklace, amulet, medallion, or a trinket attached to a chain/string, you MUST draw the entire chain coiled up or resting completely inside the cell. The chain or string must NEVER extend out of the top or sides of the cell.
CRITICAL RULE 5: You MUST follow this exact breakdown for the 16 cells. These are base, generic items without glowing magical auras, particle effects, light rays, blooms, sparkling effects, lens flares, or ornate environmental backgrounds:"""

def describe_gem(gem_name):
    name = gem_name.lower()
    return f"a raw unpolished {name} sitting inside a small open leather pouch, standalone inventory icon, fully visible"

out_lines = []

for i in range(0, len(gems), 16):
    chunk = gems[i:i+16]
    prompt = BASE_PROMPT + "\n"
    for idx, gem in enumerate(chunk):
        row = (idx // 4) + 1
        col = (idx % 4) + 1
        prompt += f"Row {row} Col {col}: {describe_gem(gem['name'])}\n"
    
    req_obj = {
        "customId": f"gems_batch_{i//16 + 1}",
        "request": {
            "model": "models/gemini-3.1-flash-image",
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "responseModalities": ["IMAGE"],
                "aspectRatio": "1:1",
                # The premium script uses image_size='2K'. The Batch API usually accepts imageConfig.
                # If we omit it, it defaults. The user's generate_batch.py didn't specify imageConfig.
                # Let's try specifying it anyway, or just omit to be safe like the previous AI did.
            }
        }
    }
    out_lines.append(json.dumps(req_obj))

with open('scratch/gems_batch.jsonl', 'w') as f:
    f.write("\n".join(out_lines) + "\n")

print("Uploading file to Google Cloud...")
uploaded_file = client.files.upload(file='scratch/gems_batch.jsonl')
print(f"File uploaded: {uploaded_file.name}")

print("Creating batch job...")
job = client.batches.create(
    src=uploaded_file.name
)
print(f"Batch Job created successfully!")
print(f"Job Name: {job.name}")
print(f"Job State: {job.state.name}")
