import os
import json

# Define the biomes and their specific background rules
biomes = [
    {
        "name": "Dense Plains Grass",
        "bg_rule": "It is a highly detailed, gritty terrain texture of dense, tall, wind-swept plains grass under a brooding, overcast sky. There are absolutely no mountains, no rivers, no sweeping horizon vistas, no background buildings, and no background structures."
    },
    {
        "name": "Scattered Grass Plains",
        "bg_rule": "It is a highly detailed, gritty terrain texture of plains with scattered grass under a brooding, overcast sky. There are absolutely no mountains, no rivers, no sweeping horizon vistas, no background buildings, and no background structures."
    },
    {
        "name": "Scattered Trees in Dense Grass Plains",
        "bg_rule": "It is a highly detailed, gritty terrain texture of dense plains grass with a few scattered trees under a brooding, overcast sky. There are absolutely no mountains, no rivers, no sweeping horizon vistas, no background buildings, and no background structures."
    },
    {
        "name": "Plains Lake",
        "bg_rule": "It is a highly detailed, gritty terrain texture of dense plains grass with a still lake under a brooding, overcast sky. There are absolutely no mountains, no rivers, no sweeping horizon vistas, no background buildings, and no background structures."
    }
]

# Refined descriptive fragments for image generation
events = [
    "A wide, perfect circle of tall plains grass pressed completely flat into the earth in an unnatural geometric pattern.",
    "A faint, pulsing blue glow emanating from beneath a particularly dense patch of overgrown grass roots.",
    "An ancient, rusted broadsword driven straight down into the soil, almost completely hidden by the swaying grass.",
    "A square stone hatch covered in faded mossy runes buried beneath a thick tangle of weeds.",
    "A sudden, sheer sinkhole dropping away into the dark, completely obscured from a distance by the tall grass.",
    "A massive, perfectly spherical boulder resting in the grass, grooved with strange, alien channels.",
    "A skeletal hand reaching up from the dirt, its bony fingers tightly clutching a heavy leather pouch.",
    "A large patch of the tall grass and soil subjected to immense heat, turned entirely into fragile, translucent green glass.",
    "A heavy iron chest abandoned in a small clearing in the grass, its surface scratched by massive claws.",
    "Wind rustling through the tall grass, sounding unnervingly like multiple whispering voices calling your name.",
    "An ancient marble pillar toppled and half-buried in the grass, covered in complex historical carvings.",
    "A massive nest constructed of torn grass and crushed bones abandoned in the field.",
    "A tiny, crude shrine built from piled stones and animal skulls holding an empty offering bowl.",
    "Several strange geometric rocks scattered haphazardly across the dirt, looking as though they once fit together.",
    "A black obsidian obelisk jutting from the dry earth, a massive glowing crack running down its center.",
    "A half-buried, circular metal vault door exposed in the patchy dirt, its locking wheel slightly ajar.",
    "An abandoned, long-cold campfire surrounded by torn tents and scattered supplies.",
    "The sun-bleached skeleton of a pack horse lying in the dirt, its leather saddlebags still miraculously intact.",
    "A fifty-foot radius of the scattered grass scorched perfectly black by an explosive magical blast.",
    "A strange, jagged crystal pulsing softly, jutting out of the dry hardpan soil.",
    "A shallow, unmarked grave showing signs of freshly overturned dirt.",
    "A crumbling stone well alone in the open plain, emanating a blast of unnaturally freezing air.",
    "The shattered remains of a merchant's wagon lying in the dirt, arrows still sticking out of the wood.",
    "A perfectly smooth, circular slab of obsidian lying flush with the dirt, completely devoid of dust.",
    "A single, massive footprint with three clawed toes pressed deeply into the dry earth.",
    "A pile of heavily rusted, archaic armor stacked like a macabre monument in the dirt.",
    "A massive, ancient oak tree with a large hollow cavity in its trunk, and something glinting softly inside.",
    "Strange, bone-carved wind chimes hanging quietly from the low branches of a solitary ash tree.",
    "A skeletal figure pinned to a thick tree trunk by an ornate, glowing spear.",
    "Thick, glowing golden sap oozing from a deep gash in a weeping willow tree.",
    "A solitary tree standing in the grass, its wood and leaves entirely petrified into solid grey stone.",
    "An ancient stone altar completely wrapped and choked by the thick, twisting roots of an old elm tree.",
    "A rusted iron gibbet cage hanging from a thick branch, a rotting backpack resting inside it.",
    "A massive, thick spider web strung between two trees, with several large cocooned shapes wrapped inside.",
    "The ruins of a wooden watchtower or treehouse high in the canopy of a massive oak.",
    "A dense cluster of bioluminescent purple mushrooms growing aggressively around the base of a dying tree.",
    "A single, unnatural fruit glowing with a soft silver light hanging from the lowest branch of a dead tree.",
    "A heavy wooden casket pushed halfway into the hollowed-out root system of a massive tree.",
    "A perfectly fitted wooden door with a brass handle built directly into the side of a living tree trunk.",
    "The head and shoulders of a massive stone statue jutting out from the murky water in the center of the lake.",
    "A faint, golden light glowing from a sunken chest resting on the mud at the bottom of the lake shallows.",
    "A small, empty rowboat drifting lazily near the edge of the lake, a locked strongbox sitting on its bench.",
    "Violent, boiling bubbles constantly rising to the surface of the lake in one specific, isolated spot.",
    "A tiny island made entirely of woven reeds in the water, a glint of metal shining from its center.",
    "A perfect circle of the lake frozen into solid ice, despite the warm weather of the plains.",
    "A hauntingly beautiful, melodic humming vibrating directly out from the depths of the lake water.",
    "A skeleton bound in heavy iron chains shackled to a large rock just below the water's surface.",
    "The ruins of an ancient stone bridge collapsed into the lake, creating a shallow reef of carved masonry.",
    "A small, unnatural whirlpool spinning continuously near the shore, seemingly defying the calm currents.",
    "A piece of highly polished, reflective metal half-buried in the thick mud at the edge of the lake.",
    "A cluster of beautiful, glowing blue lotus flowers floating gently near the shoreline.",
    "A carved stone archway completely submerged in the clear waters of the lake, leading into a dark underwater tunnel."
]

print(f"Loaded {len(events)} refined events. Should be 52.")

out_lines = []

# Process each biome (13 events each)
for b_idx, biome in enumerate(biomes):
    biome_events = events[b_idx*13 : (b_idx+1)*13]
    
    # We need to chunk these 13 events into groups of 4 (for 2x2 grids)
    # This will create 4 sheets per biome (the last sheet will have 1 event and 3 empty terrains)
    for i in range(0, 13, 4):
        chunk = biome_events[i:i+4]
        
        prompt = f"""A 1:1 2x2 image sheet of 4 distinct ancient dark fantasy 4k quality digital paintings. 

The image sheet contains 4 individual images, edge to edge image bleed, no text, no numbers, no UI elements, no borders, no characters, 4px black gutters.

The art style uses a gritty, ancient medieval aesthetic with moody, high-contrast chiaroscuro lighting and deep atmospheric shadows.

CRITICAL RULE: The background environment for all 4 images MUST be identical. {biome['bg_rule']}

The image contains ONLY the specific terrain and the event object described for each cell. The point of view is immersive, looking directly at the object from a first-person perspective.

"""
        
        positions = ["Top Left", "Top Right", "Bottom Left", "Bottom Right"]
        
        for cell_idx in range(4):
            if cell_idx < len(chunk):
                desc = chunk[cell_idx]
            else:
                desc = "Just the bare, empty terrain texture with absolutely no objects."
            prompt += f"Cell {cell_idx+1} ({positions[cell_idx]}): {desc}\n"
            
        req_obj = {
            "customId": f"event_sheet_{biome['name'].replace(' ', '_')}_{i//4 + 1}",
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

with open('scratch/events_batch.jsonl', 'w', encoding='utf-8') as f:
    f.write("\n".join(out_lines) + "\n")

print(f"Generated scratch/events_batch.jsonl with {len(out_lines)} sheets.")
