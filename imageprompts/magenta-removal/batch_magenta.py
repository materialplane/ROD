import os
import sys

# Add scripts/local to python path to import the function
sys.path.append('scripts/local')
from remove_magenta import remove_magenta_aggressive

# We know the items we just generated are in all_missing_items_and_gems.json
import json
import re

def slugify(name):
    slug = name.lower().replace("'", "").replace(" ", "-")
    slug = re.sub(r'[^a-z0-9\-]', '', slug)
    slug = re.sub(r'-+', '-', slug)
    slug = slug.strip('-')
    if '-1' in slug or '-2' in slug or '-3' in slug or 'ammunition' in slug or 'armor-' in slug:
        slug = re.sub(r'-1-2-or-3', '', slug)
        slug = re.sub(r'-[123]', '', slug)
        slug = slug.strip('-')
    return slug

with open('scratch/all_missing_items_and_gems.json', 'r') as f:
    items = json.load(f)

print(f"Applying magenta key to {len(items)} items...")
count = 0
for item_name in items:
    slug = slugify(item_name)
    img_path = f'apps/client/public/assets/items/{slug}.png'
    
    if os.path.exists(img_path):
        remove_magenta_aggressive(img_path)
        count += 1
        
print(f"Finished keying {count} images!")
