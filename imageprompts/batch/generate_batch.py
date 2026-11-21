import io
import re
import json

wiki_path = 'wiki/Image_Generation_Templates.wiki'
with io.open(wiki_path, 'r', encoding='utf-8') as f:
    d = f.read()

# Extract the 8 prompts
# They are under the headers === 1. Dense Plains Grass ===, etc.
# We can find them by looking for "=== X. " and taking the text until the next "===" or "CRITICAL INSTRUCTION".

matches = re.finditer(r'=== \d+\.\s*(.+?) ===\s*\n(.*?)(?=\n\s*(?:===|\nCRITICAL INSTRUCTION|$))', d, re.DOTALL)

out_lines = []
for m in matches:
    title = m.group(1).strip()
    prompt_text = m.group(2).strip()
    
    # Format for Gemini Batch API
    custom_id = title.lower().replace(" ", "_").replace(",", "")
    
    # The user asked for "16:9" ratio to be specified, let's include it in the config just in case,
    # or just trust the prompt text which already says "A 16:9...".
    # We will pass the exact JSON structure from their previous file, plus an aspectRatio if they support it, 
    # but to be safe we'll just follow the known structure and add the config.
    
    req_obj = {
        "customId": f"combat_{custom_id}",
        "request": {
            "model": "models/gemini-3.1-flash-image",
            "contents": [
                {
                    "parts": [
                        {"text": prompt_text}
                    ]
                }
            ],
            "generationConfig": {
                "responseModalities": ["IMAGE"],
                "aspectRatio": "16:9"
            }
        }
    }
    
    out_lines.append(json.dumps(req_obj))

if out_lines:
    with io.open('combat_biomes_batch.jsonl', 'w', encoding='utf-8') as f:
        f.write("\n".join(out_lines) + "\n")
    print(f"Generated combat_biomes_batch.jsonl with {len(out_lines)} prompts.")
else:
    print("Could not find prompts!")
