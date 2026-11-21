import os
import psycopg2
import json
import re
from dotenv import load_dotenv

load_dotenv('.env')

conn = psycopg2.connect(os.environ.get('DATABASE_URL'))
cur = conn.cursor()

# 1. Fetch all 309 monsters from the full database table
cur.execute("SELECT id, name, type, size, cr, stats FROM monsters ORDER BY type, cr, name;")
all_monsters = cur.fetchall()

def should_keep_monster(m):
    name = m[1].lower()
    m_type = m[2]
    size = m[3]
    
    if 'swarm of' in name:
        return False
    unwanted = [
        'weasel', 'lizard', 'rat', 'baboon', 'eagle', 'jackal', 'octopus',
        'piranha', 'scorpion', 'venomous snake', 'poisonous snake', 'vulture',
        'hyena', 'mastiff', 'frog', 'toad', 'crab', 'fire beetle', 'shrub', 'homunculus',
        'goblin', 'hobgoblin', 'bugbear', 'kobold', 'animated rug', 'sprite', 'satyr', 'shrieker',
        'pseudodragon', 'crawling claw', 'imp', 'quasit', 'dretch', 'giant wasp'
    ]
    for uw in unwanted:
        if name == uw or name == f"giant {uw}" or uw in name:
            return False
            
    if m_type == 'Beast':
        is_large_or_giant = size in ('Large', 'Huge', 'Gargantuan') or 'giant' in name or 'dire' in name
        combat_beasts = [
            'ape', 'black bear', 'brown bear', 'polar bear', 'boar', 'wolf', 
            'lion', 'tiger', 'panther', 'crocodile', 'allosaurus', 'ankylosaurus', 
            'triceratops', 'tyrannosaurus rex', 'warhorse', 'elephant', 'mammoth', 'rhinoceros'
        ]
        if is_large_or_giant or any(cb in name for cb in combat_beasts):
            return True
        return False
        
    if name in ['sprite', 'awakened shrub']:
        return False
        
    return True

kept = [m for m in all_monsters if should_keep_monster(m)]
print(f"Total monsters selected after filtering: {len(kept)}")

# Trim or pad to multiple of 16 (e.g. 17 sheets * 16 = 272)
target_count = (len(kept) // 16) * 16
kept = kept[:target_count]
print(f"Final selected for staging: {len(kept)} monsters ({len(kept)//16} full 4x4 sheets)")

BASE_HEADER = """A 1:1 4k quality 4x4 image sheet containing 16 distinct dark fantasy full-body creature combat paintings in dynamic battle attack poses.

The entire canvas has a solid, flat, shadowless #FF00FF pure magenta background for chroma-key extraction. 

Each cell represents a single standalone full-body creature in an aggressive combat stance, wielding the exact iconic weapons and natural attacks from their official bestiary statblocks.

BASE ART STYLE MANDATE:
- Gritty, ancient medieval dark fantasy oil painting aesthetic in 4k quality, matching authentic tabletop RPG masterworks.
- Realistic painterly shading and soft anatomical blending. Absolutely NO cel-shading, NO flat graphic fills, and NO comic-book illustration styles.
- Grounded, desaturated dark fantasy color palette: earthy ochres, soot grays, weathered iron, oxidized bronze, dried blood, and natural beast hides. No neon, plastic, or cartoonish saturation.
- Moody, high-contrast chiaroscuro lighting: directional lighting casting deep atmospheric shadows into crevices, with natural rim lighting defining the creature's silhouette against the background.
- Tactile, weathered material textures: coarse matted fur, cracked horn, chipped bone, scarred hide, pitted iron weapons, realistic reptilian scales, and battle grime.
- Dynamic combat attack poses: lunging, snarling, claws raised, weapons mid-swing, wings flared, fangs bared.

CRITICAL LIMB & ANATOMY MANDATE (BOTH ARMS MANDATORY):
- Every humanoid and bipedal creature MUST have BOTH arms and hands fully drawn and visibly rendered. If wielding a one-handed weapon (dagger, sword, mace), the creature must either hold it in a two-handed combat grip, or have its secondary arm and hand clearly raised in an aggressive guard, claw, or fist pose. Never hide an arm behind the body or omit a limb.

CRITICAL FRAMING & CELL PADDING MANDATES (STRICT ZERO-CLIPPING):
1. MANDATORY 20% MAGENTA SAFETY BUFFER: Every creature must be scaled down to occupy ONLY the central 75% to 80% of its cell. A mandatory wide moat of empty, solid #FF00FF magenta background must completely surround every creature on all four sides (top, bottom, left, right).
2. ABSOLUTELY ZERO BOUNDARY CLIPPING: Absolutely NO wingtips, weapon blades, horns, claws, tails, or feet may touch or cross the boundary of any cell. If a creature has large wings or long weapons, draw the entire creature slightly smaller in scale so every extremity fits comfortably with generous magenta margins.
3. COMPACT COMBAT POSES: Winged creatures must angle their wings in compact, arched poses; long-tailed creatures must coil their tails close to their bodies; weapon-wielding creatures must hold their weapons angled across their silhouette rather than thrusting into cell edges.
4. PURE #FF00FF MAGENTA BACKGROUND: Solid flat #FF00FF magenta with zero ground terrain, zero environmental clutter, zero drop shadows on the background, and zero cast lighting onto the background.
5. ZERO MAGENTA ON CREATURES: The color magenta must NEVER appear on the creatures, skin, clothing, armor, or weapons.
6. CLEAN NATURAL EDGES (NO CARTOON INK CONTOURS): The creature's silhouette must be cleanly defined against the solid magenta background by its own natural form and rim lighting. Do NOT draw black ink outline strokes, comic-book line art, or cartoon contours around the body.
7. NO FRAMES, NO LABELS, NO TEXT: Absolutely no borders, no circular frames, no tile grids, no divider lines between cells, no text, and no UI elements.

ROW & COLUMN BREAKDOWN (16 CREATURES FROM ETHORIA BESTIARY):
"""

def get_creature_prompt(m):
    name = m[1]
    m_type = m[2]
    size = m[3]
    cr = m[4]
    stats = m[5] if isinstance(m[5], dict) else json.loads(m[5]) if m[5] else {}
    
    actions = stats.get('actions', [])
    action_names = [a.get('name', '') for a in actions if isinstance(a, dict)]
    
    # Specific pose & weapon logic
    weapon_desc = ""
    for an in action_names:
        an_lower = an.lower()
        if any(w in an_lower for w in ['scimitar', 'shortsword', 'longsword', 'greatsword', 'dagger', 'spear', 'rapier', 'mace', 'club', 'flail', 'warhammer', 'glaive', 'halberd', 'axe', 'greataxe', 'battleaxe', 'bow', 'crossbow', 'trident']):
            weapon_desc = f"wielding an iconic {an} with both hands and arms fully visible in an active combat grip"
            break
            
    if not weapon_desc and action_names:
        weapon_desc = f"striking forward with deadly {action_names[0]} attack, claws and fangs bared"
    elif not weapon_desc:
        weapon_desc = "rearing forward in an aggressive combat attack stance"
        
    extra_rules = ""
    if "dragon" in m_type.lower():
        extra_rules = "Scaled wings arched inward in a compact pose, tail curled along flank, horned snout snarling with elemental energy, zero clipping."
    elif size in ('Huge', 'Gargantuan'):
        extra_rules = "Scaled down significantly to fit comfortably inside cell with full 20% magenta moat on all sides."
        
    return f"{name} ({size} {m_type}, CR {cr}). Centered full-body creature painting, {weapon_desc}. {extra_rules} Zero edge clipping, full 20% margin.".strip()

os.makedirs('docs/prompts', exist_ok=True)
os.makedirs('scratch', exist_ok=True)

batch_requests = []
sheet_chunks = [kept[i:i+16] for i in range(0, len(kept), 16)]

for sheet_num, chunk in enumerate(sheet_chunks, start=1):
    prompt_lines = [BASE_HEADER]
    
    for idx, m in enumerate(chunk):
        row = (idx // 4) + 1
        col = (idx % 4) + 1
        desc = get_creature_prompt(m)
        prompt_lines.append(f"- Row {row} Col {col}: {desc}")
        
    prompt_lines.append("""
FINAL CRITICAL REMINDERS:
- ALL CREATURES MUST FACE LEFT: Every creature across all 16 cells must be posed facing toward the left side of the canvas (facing left toward the player party in combat).
- ALL CREATURES MUST FIT ENTIRELY WITHIN THEIR CELLS: Every wing, tail, weapon, horn, and limb must remain strictly inside its cell boundary with generous empty magenta safety margins on all four sides. Zero clipping.
- ABSOLUTELY NO TEXT: No creature names, labels, letters, numbers, watermarks, UI elements, or borders anywhere on the sheet.
""")
    prompt_lines.append("--ar 1:1")
    full_prompt = "\n".join(prompt_lines)
    
    prompt_file = f"docs/prompts/bestiary_combat_sheet_{sheet_num}.txt"
    with open(prompt_file, 'w', encoding='utf-8') as f:
        f.write(full_prompt)
        
    req_obj = {
        "customId": f"bestiary_combat_sheet_{sheet_num}",
        "request": {
            "model": "models/gemini-3-pro-image",
            "contents": [
                {
                    "parts": [{"text": full_prompt}]
                }
            ],
            "generationConfig": {
                "responseModalities": ["IMAGE"],
                "imageConfig": {
                    "aspectRatio": "1:1",
                    "imageSize": "4K"
                }
            }
        }
    }
    batch_requests.append(json.dumps(req_obj))

batch_jsonl_path = 'scratch/bestiary_batch_requests.jsonl'
with open(batch_jsonl_path, 'w', encoding='utf-8') as f:
    f.write("\n".join(batch_requests) + "\n")

print(f"\nSuccessfully generated {len(batch_requests)} sheets ({len(kept)} total monsters) into {batch_jsonl_path}!")
