# ROD — Art Direction & Verified Token Pipeline

> **Art Engine:** Gemini Image Generation (`gemini-3-pro-image` Pro 4K / `gemini-3.1-flash-image` 2K)  
> **Visual Anchor:** Modern Stylized High-Fantasy Digital Art inspired by **League of Legends** (**No Retro / No Pixel Art / No Colored-Pencil Sketchiness**)

---

## 1. Official Art Style Definition

Every visual asset in **ROD** shares one unified visual language so maps, towns, portraits, monsters, and UI feel handcrafted inside the same world:

* **Medium & Finish *(League of Legends Visual Fidelity)*:**
  * **Overworld & Map Terrain:** **Crisp Stylized High-Definition 90° Overhead Digital Cartography** with rich **2.5D topological elevation relief**, clean chiseled rock planes, bold readable biome shapes, warm golden-hour directional sunlight + deep valley shadows, and calm gradient ocean water—strictly **zero** scratchy ink outlines, **zero** colored-pencil/crayon texture, **zero** watercolor bleed, **zero** paper/canvas grain, **zero** glossy plastic 3D toy shine, and **zero** frozen white crashing waves so ground terrain stays razor-sharp when doubled to `8192×8192`.
  * **Characters, Tokens, Enemies & Cutscenes:** Bold, high-definition stylized high-fantasy illustration inspired by **League of Legends** (*Runeterra / Arcane*)—chiseled silhouettes, crisp dark contour definition, rich handcrafted metal/leather/cloth textures, moody directional lighting, and per-weapon/per-spell combat VFX.
* **What We Strictly Avoid:**
  * Zero 16-bit or pixel art
  * Zero 3D-render / plastic CGI look
  * Zero tiny walking sprites (world traversal uses circular VTT avatar tokens moving freely on top-down tactical maps)
  * Zero square-grid or hex-grid lines baked into maps (movement is smooth and free, never hex/tile-locked)
  * Zero baked-in text, numbers, or UI labels inside generated art
  * Zero baked-in towns, roads, ships, or castles inside the `4` Overworld base paintings *(generated at `4K`, doubled to `8192×8192` each, with markers placed via Admin Suite)*

### Asset Formats Across the Game
| Asset Type | Aspect / Format | Notes |
| :--- | :--- | :--- |
| **Website / Key Art** | 16:9 or 21:9 | Wide cinematic framing with open sky space for title placement. |
| **Overworld Maps (`4` Total)** | `4` × `8192×8192` *(from `4K` base, chunked)* | **Option B Locked (Pure Terrain Base + Admin Markers):** `4` connected maps (`2` Regions / `10` permanent locations / `2` Portals per map), rendered at `4K` in crisp 90° overhead 2.5D digital relief with **zero baked-in buildings, roads, or text**, then doubled `2×` to `8192×8192` each. All `40` permanent locations, trails, & Ship Port routes are placed cleanly as engine/Admin markers. |
| **Towns, Keeps & Interiors** | 16:9 | **Gridless top-down D&D-style tactical battlemaps** with open streets/floors walked freely using circular tokens (never hex or square grids). |
| **Dungeon & Portal Room Pools** | `1:1` Squares (`~10`-Tile Theme Pools) + Door Markers | Clean **doorless, gridless `1:1`** top-down battlemap tiles covering both **outdoor** themes (aqueducts, caves, woods, ruins, coastlines/wrecks) and **indoor / Portal** planes. Placed onto sparse paths carved inside **`2×2` to `10×10+` bounding grids**, with interactive N/S/E/W door, lock, dead-end, and boss-seal markers placed dynamically by code. |
| **Home-Front & Story Cutscenes** | 16:9 | Custom illustrated scenes (including the 15 two-hero kingdom-defense pairings, anchored to both heroes' Step 1A tokens for consistency). |
| **Hero Tokens (`2×2` Health States)** | 1:1 `2×2` Sheets | Class-themed circular VTT tokens (`100%`, `<75%`, `<50%`, `<25%`) on `#FF00FF` chroma background. |
| **Enemies & Bosses** | Full-Body Illustrated | Placed against 16:9 battle backdrops (no circular token crop). |
| **Weapons, Attire & Runestones** | 1:1 Icons (`4×4` sheets) | Displayed in shops, inventory, and battle/status badges. |

---

## 2. Verified Two-Layer Character Token Pipeline *(Static Frame + Frameless `2×2` Portraits)*

Baking decorative frames directly around all 4 portraits in a `2×2` sheet causes subtle rivet/shape/color shifts when swapping HP states, while `4×4` portrait sheets drift facial identity. Separating the **immutable class frame** from the **4 progressive portrait states** solves both completely:

1. **Layer A — Static Class Frame (`1:1`, Text-Only, Empty Center):** Generate ONE isolated class-themed circular VTT frame per hero with flat `#FF00FF` filling **both** outside the ring and inside the empty center hole (`include_interior_voids=True`). Produces **1 immutable transparent Frame PNG** per hero (`0px` shift across HP states).
2. **Layer B — Frameless Portrait Chain (`Step 1A` $\to$ `Step 1B 2×2`):**
   * **Step 1A — Single Frameless Portrait (`1:1`):** Lock the hero's chest-up Runeterra portrait on its dark painted vignette edge-to-edge (zero baked frame, centered with `~18%` headroom so a circular crop fits cleanly).
   * **Step 1B — `2×2` Master Health Portraits (`1:1`):** Attach Portrait Step 1A and generate 4 equal frameless `1:1` square quadrants (`100%`, `<75%`, `<50%`, `<25%`). Expression, pose, clothing, and scale stay 100% locked; only cuts, dirt, bruising, and sweat progress.
3. **Runtime / Slicing Composite:** Each sliced portrait tile is circularly masked to the exact inner radius of its hero's locked static **Frame PNG** and drawn cleanly behind it (allowing independent Resolve ring glows and Canvas `source-atop` color-shift washes).

### Key Technical Rules (Proven in Testing)
* **Frameless Portraits + Isolated Frame:** Never bake the decorative VTT frame into the `2×2` injury sheet; always overlay the single locked static Frame PNG cleanly in code/Canvas.
* **Empty Center `#FF00FF` on Frames:** Frame prompts specify pure `#FF00FF` inside the center portrait window as well as outside corners so chroma-key extraction punches the inner circle cleanly.
* **Lock the Expression & Outfit:** Never ask for facial expression changes (`frown`, `grimace`, `snarl`) or clothing tears between HP states—keep face and clothes identical and layer only scratches, dirt, bruising, and sweat.
* **Consistent Head Orientation:** Keep all 6 hero portraits angled naturally in a calm three-quarter pose facing the viewer's left (`~8 o'clock`).
* **Keep Portraits Strictly Physical + Use Overlay VFX + Color-Shift:** Never generate generic damage-type portrait sheets. Combat effects use flat front-facing `4×6` animated VFX sprite rows / `4×4` overlays played over the token alongside a `1–2s` Canvas silhouette color-shift.

---

## 3. Reference Prompts Structure *(All 6 Heroes in `imageprompts/class-avatar-tokens.txt`)*

* **Frame Prompt (`1:1`, Text-Only, Empty Center):** Generates ONE isolated decorative class border ONLY with `#FF00FF` filling both outside corners and the empty circular center window (`zero character inside`).
* **Portrait Step 1A (`1:1`, Frameless Anchor):** Generates an edge-to-edge Runeterra portrait on the dark vignette background (`zero frame/border`, `~18%` headroom above hair, facing viewer's left).
* **Portrait Step 1B (`1:1`, Frameless `2×2` Health Sheet):** Attaches Portrait Step 1A and generates 4 seamless square quadrants (`100%`, `<75%`, `<50%`, `<25%`) with identical pose, clothing, and framing.

---

## 4. Reusing This Pipeline Across All 6 Heroes

1. **`FRAME` construction:** Shape the circular ring itself out of that class's signature gear/material (curved tarnished-steel sabers for Duelist, forged steel battlements for Bulwark, beveled brass & yew wood for Archer, forged weathered bronze & iron etched with metallic herb stems and sage leaves for Herbalist).
2. **`PORTRAIT` generation:** Keep the same unified **League of Legends / Runeterra** chiseled portrait formula with `~18%` headroom and calm viewer's-left three-quarter orientation across all 6 heroes.
3. For complete copy-ready Frame + Portrait prompts for all 6 heroes, see `imageprompts/class-avatar-tokens.txt`.

---

## 5. Website Header Reference Prompt (`16:9`)

```text
Wide cinematic 16:9 fantasy RPG key art banner illustration, hand-inked painterly fantasy style with crisp dark ink linework, rich layered brushwork, dramatic volumetric lighting, and vibrant elemental color accents. On a wind-swept cliffside overlooking a vast, sprawling fantasy realm at golden dusk, a seasoned party of four distinct adventurers stands silhouetted and battle-ready—a scarred knight with a socketed glowing blade, a hooded arcane mage holding a radiant sigil, an agile dual-blade rogue, and a heavy-armored warden—gazing out toward a distant walled port town, ancient crumbling ruins, jagged mountain passes, and a docked galleon ship on a shimmering sea. Leave open atmospheric sky in the upper-left third for title placement. Moody cobalt shadows contrasted with warm amber sunset highlights and faint cyan arcane mist. High-detail modern indie RPG promotional art, clean sharp edges, zero pixel art, no 3D render look, no text, no logos, no watermarks.
```
