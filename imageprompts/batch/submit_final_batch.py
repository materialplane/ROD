import os
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv('.env')
client = genai.Client()

# Get missing images
with open('scratch/missing_images.json', 'r') as f:
    missing = json.load(f)

# Filter out trinkets just in case
missing = [m for m in missing if m.get('category') != 'Trinkets']

# Ensure the custom ones are there:
custom_items = [
    {"name": "Arrow", "category": "weapons"},
    {"name": "Crossbow Bolt", "category": "weapons"},
    {"name": "Rowboat", "category": "vehicles"}
]

# Add custom items if not already in missing
for ci in custom_items:
    if not any(m['name'] == ci['name'] for m in missing):
        missing.append(ci)

print(f"Total items to generate: {len(missing)}")

# Function to describe
def describe_item(item):
    name = item['name'].lower()
    cat = item.get('category', '').lower()
    
    if cat == 'gem': return f"a raw unpolished {name} sitting inside a small open leather pouch, standalone inventory icon, fully visible"
    if cat == 'potion' or 'potion' in name: return f"a glass vial filled with colored liquid labeled {name}, standalone inventory icon, fully visible"
    if name == 'lockpicks': return 'a set of small metal tension wrenches and picks, standalone inventory icon, fully visible'
    if name == 'quiver': return 'an empty leather quiver, standalone inventory icon, fully visible'
    if name == 'arrow': return 'a single wooden arrow with fletching, standalone inventory icon, fully visible'
    if name == 'crossbow bolt': return 'a single thick wooden crossbow bolt, standalone inventory icon, fully visible'
    if name == 'rowboat': return 'a small carved wooden statue of a rowboat, standalone inventory icon, fully visible'
    
    return f"a {name}, standalone inventory icon, fully visible"

BASE_PROMPT = """A 1:1 4x4 image sheet of 16 distinct ancient medieval RPG inventory items. 

Each cell represents a single 1:1 standalone square painting of an item. The art style is a dark fantasy digital painting in 4k quality. It uses a gritty, ancient medieval aesthetic with moody, high-contrast chiaroscuro lighting and deep atmospheric shadows.

CRITICAL RULE 1: Absolutely NO TEXT, NO LABELS, NO NUMBERS, and no UI borders anywhere in the image.
CRITICAL RULE 2: The MAGENTA BACKGROUND must remain completely unaffected by the lighting. The background behind every single item MUST be a pure, flat, uniform MAGENTA color (#FF00FF). The chiaroscuro shadows MUST remain strictly on the objects themselves. Do NOT cast drop-shadows, vignettes, or gradients onto the magenta background. The magenta must be 100% flat for transparency keying.
CRITICAL RULE 3: Every item MUST be fully contained within its square cell. Do not crop the items. You must zoom out and scale down the weapons so the ENTIRE item (from the tip of the blade to the bottom of the handle) is 100% visible inside the frame. For long items like spears or pikes, draw them diagonally to ensure the whole weapon fits perfectly inside the cell.
CRITICAL RULE 4: If an item is a necklace, amulet, medallion, or a trinket attached to a chain/string, you MUST draw the entire chain coiled up or resting completely inside the cell. The chain or string must NEVER extend out of the top or sides of the cell.
CRITICAL RULE 5: You MUST follow this exact breakdown for the 16 cells. These are base, generic items without glowing magical auras, particle effects, light rays, blooms, sparkling effects, lens flares, or ornate environmental backgrounds:"""

out_lines = []
chunk_size = 16

for i in range(0, len(missing), chunk_size):
    chunk = missing[i:i+chunk_size]
    prompt = BASE_PROMPT + "\n"
    
    for idx in range(16):
        row = (idx // 4) + 1
        col = (idx % 4) + 1
        if idx < len(chunk):
            desc = describe_item(chunk[idx])
        else:
            desc = "a raw unpolished placeholder stone sitting inside a small open leather pouch, standalone inventory icon, fully visible"
        prompt += f"Row {row} Col {col}: {desc}\n"
    
    req_obj = {
        "customId": f"final_batch_{i//16 + 1}",
        "request": {
            "model": "models/gemini-3.1-flash-image",
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "responseModalities": ["IMAGE"],
                "aspectRatio": "1:1"
            }
        }
    }
    out_lines.append(json.dumps(req_obj))

with open('scratch/final_images_batch.jsonl', 'w') as f:
    f.write("\n".join(out_lines) + "\n")

print("Uploading file to Google Cloud...")
uploaded_file = client.files.upload(file='scratch/final_images_batch.jsonl')
print(f"File uploaded: {uploaded_file.name}")

print("Creating batch job...")
job = client.batches.create(
    src=uploaded_file.name
)
print(f"Batch Job created successfully!")
print(f"Job Name: {job.name}")
print(f"Job State: {job.state.name}")
