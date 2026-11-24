# ROD — Game Vision & Core Architecture

> **Role Split:** Creative Direction & Player Experience (User) + Lead Development, Systems & Balancing (AI)  
> **Target Platform:** Downloadable PC / Steam Release (Windows desktop build, controller & Steamworks ready)

---

## 1. High-Level Concept

**ROD** is an original turn-based RPG set across **Ethoria**—a grounded world of humans—torn open by 8 dimensional portals. Inspired by the sense of journey, town discovery, and meaningful equipment progression of classic 2D RPGs, it pairs an **illustrated digital-tabletop aesthetic** with modern tactical depth.

### Core Pillars
1. **True Zero-to-Hero Progression:** Every hero begins at **Level 1 with `1` point in every stat**, growing all the way toward **Level 99** through player-built stats, milestone unlocks, and gear upgrades.
2. **Shop-Driven Gear + Quest-Drafted Runestones:** Silver and town shops actually matter for raw power, while quests reward **Pick 1 of 3** randomized, swappable carved Runestones that create distinct builds across playthroughs.
3. **Living Illustrated Worlds:** High-resolution AI-illustrated overworlds, towns, interiors, and full-body monsters paired with dynamic VTT-style circular hero tokens.
4. **Hurt-State Gameplay:** Character portraits visibly degrade as HP drops—and those wounded thresholds directly power tactical combat passives.

---

## 1.5 Story Premise & The 6-Class Roster (Continuation of `backstory.txt`)

### Story Bridge & Main Quest *(Months After Chapter 11 $\to$ Minute 1 of ROD)*
1. **The Scandal Leaks & Civil Chaos (`Months After` [backstory.txt](../backstory.txt)):** **Koren** died in **Highcrown's Great Coliseum**. **Valen**—stripped of armor, title, and silver wolf pendant—spends months locked in Koren’s old cell beneath the arena while **Queen Ellowyn** is held in the palace vault. Over those months, truth spreads that **King Garrick has no bloodline heir**, and Garrick’s rival lords turn on each other in open succession warfare across Ethoria.
2. **Season 2 Veil-Lift (`Hidden Magic & The True Border War`):** Season 1 (`backstory.txt`) deliberately kept the spotlight strictly on Highcrown's human tragedy—the gladiator's sacrifice, the captive Queen, and Valen's arena betrayal—without revealing the wider world's magic or non-human forces. Stepping outside Highcrown in **ROD** pulls that curtain back: **magic has always existed in the world**, suppressed inside Highcrown's iron regime (`even hiding Queen Ellowyn's quiet arcane gift, Mera's covert shadow training, and Harlan's deeper alchemy behind ordinary court roles`). Meanwhile, the distant *"border wars"* Garrick fought and sustained across Chapters 2–5 weren't merely human noble squabbles—Garrick was actually fighting encroaching **non-human powers**, sealing those truths out on distant border fronts so the capital never learned what waited beyond the walls.
3. **Garrick’s Open Fracture & Flight to the North *(The Gap Between Chapter 11 & Game Start)*:** Across the months following Chapter 11—the window linking Season 1 to **ROD**—**King Garrick abandons Highcrown**, retreating north through Marshal **Bleakwatch's Citadel** on Map 4 to barricade himself inside his obsidian war-citadel (**Black Keep** in *The Dreadwaste*, Map 4 Zone 20), forging a dark alliance to tear open **8 Dimensional Portals** across Ethoria and rule behind **The Eclipse Gate**.
4. **The Open Release in Highcrown (`Zero Sneak-Out Needed`):** With Garrick gone and otherworldly legions overrunning the divided realm, Highcrown's surviving loyalists and people realize these six figures—**Valen, Ellowyn, Commander Orin, Rowan, Mera, and Harlan**—are Ethoria’s last hope to survive. Valen and Ellowyn are freed openly inside **Highcrown** (where the **Royal Palace**, the **Great Coliseum**, and the **Overgrown Palace Gardens & Dry Aqueducts** all stand).
5. **Why You Pick 4 of 6 Heroes:** **All 6 heroes stand free in Highcrown**, yet the capital itself cannot be left leaderless while Portals burn across the provinces: **2 heroes stay openly inside Highcrown Keep** to hold the city and stabilize the realm, while your chosen **4 of 6** march out into **Zone 1 (The Crownlands)** to close all 8 Portals by defeating each **Portal Boss** and slay **King Garrick** at the **8th and final portal**.
6. **Active Home-Front B-Plot:** The 2 heroes holding **Highcrown Keep** stay active across key campaign milestones via custom **16:9 illustrated cutscenes** (covering all 15 possible 2-hero pairings) showing them commanding defenses, unsealing Garrick's hidden 20-year border-war ledgers, and fighting back sieges on the capital—keeping every hero emotionally connected no matter who you picked.
7. **Ending Anchor:** At the final showdown against King Garrick (**Boss #8**, guarding **The Eclipse Gate** inside Black Keep), all 6 heroes converge (the player fights the entire final boss battle with their chosen 4-hero party intact). At the **climax of the Garrick battle**, Garrick launches a desperate lethal strike aimed at Rowan—and **Commander Orin steps in to take the fatal blow, dying to save his son** (echoing Koren's sacrifice for Valen) right as Garrick falls and the 8th portal collapses.

### The 6 Selectable Classes (Pick 4 for Your Journey — Pure Combat Roles)
1. **Prince Valen** — *Duelist* (Versatile swordsman who can wield a `2H` Greatsword, `1H` + Shield, or Dual Wield two `1H` blades for an automatic off-hand strike)
2. **Queen Ellowyn** — *Sorceress* (Offensive elemental/arcane caster & protective wards)
3. **Commander Orin** — *Knight* (Heavy shield protector & battlefield commander)
4. **Rowan *(Orin's Son)*** — *Ranger* (Long-range sniper & critical hitter)
5. **Mera *(The Queen's Handmaid)*** — *Druid* (Nature & wild-spirit caster — earth, wind, thorns & beast magic)
6. **Harlan *(The Infirmary Herbalist)*** — *Sage* (Healer, ailment cleanser & poison/remedy caster)

*(Every 4-class combination is viable across the game through Town Inns, potions, and Runestones/Accessories—no single class is mandatory.)*

---

## 2. World & Visual Architecture

### Three-Tier Scene Hierarchy
Every playable space fits into one of three illustrated layers:

1. **Overworld World Maps (`4` Connected `4K` Maps Doubled to `8192×8192` Each):**
   * Rather than cramming the entire kingdom onto one cramped map or scattering `5` landmarks across 8 sparse maps, **Ethoria** spans **`4` connected pure-terrain maps** *(generated at `4096×4096` and doubled `2×` to **`8192×8192`** each)*—each holding **`2` Geographic Regions** *(named terrain territories for world lore and visual identity)*, **`5` Level Zones (`Z01–Z20` total)**, **`10` permanent Hubs** (Towns, Villages, Outposts, Forts & Castles, starting at **Highcrown**), **`5` unique 5-level Zone Outposts**, and **`2` Dimensional Portals** (`68` permanent overworld markers total, with `#69` **Highcrown Keep** housed inside **Highcrown**, while Caves, Ruins, Shrines, Dens & Camps appear as Quest-Triggered Sites).
   * Behind the scenes, each `8192×8192` map is chunked smoothly so every PC or Steam Deck runs effortlessly, and **Option B (Admin-Placed Markers)** puts all `68` permanent overworld markers, roads/trails, linked **Ferry Crossings** (`pier-to-pier`), and **`4` Dedicated Sea-Port Towns** cleanly onto crisp, unblemished 90° 2.5D terrain.
   * Camera stays **locked at a crisp close-up zoom level** following the player's avatar token so trees and mountains stay realistically scaled while travel across each map feels substantial.
   * Each map's two continent halves link across impassable water channels via **Ferry Crossings**, while inter-continent voyages sail between **`4` Dedicated Sea-Port Towns** (**Royal Trade Port Town** on Map 1, **Highland Cove Port Town** on Map 2, **Desert Harbor Port Town** on Map 3, and **Arctic Sea-Port Town** on Map 4 returning to Maps `1–3`), each switching cleanly from its **Closed** empty-pier harbor scene (`imageprompts/port-travel.txt`) to its **Open Active Ship Harbor** scene with moored vessels (`imageprompts/water-travel-interiors.txt`).
2. **Towns, Harbors, Taverns, Portal Thresholds & Travel Gates (`16:9` Scenic Screens):**
   * Entering a Town, Castle, Keep, Harbor, Tavern, or Garrison opens a **`16:9` illustrated scenic hub screen** with clickable NPC portraits, Free Inn rest, Shops, Quest Offers, Sea Travel (at Open Sea-Port Towns), and **Launch Dungeon / Raid** buttons—zero tedious town-walking, with combat never taking place on static menu screens.
   * Stepping onto any **Dimensional Portal (`#1–#8`)** opens its **`16:9` Portal Threshold screen** (`imageprompts/portal-interiors.txt`): before claiming its **Portal Catalyst**, players see the terrifying warded gateway and which town/quest holds the Catalyst; carrying the Catalyst unlocks **"Unseal & Enter"** into that Portal's **`1:1` procedural Zelda-style dungeon**; and defeating its boss transforms the Portal into a permanent **`16:9` Sealed Monument** (`revisitable anytime to celebrate world accomplishments, using its calm Sheet-6 Closed marker on the Overworld`).
   * Stepping onto a **locked Ferry Crossing (`Maps 1–4`)** or **Border Mountain Pass Gate (`Map 4`)** opens its **`16:9` uninhabited Closed screen** (`imageprompts/water-travel-interiors.txt`) explaining why ferrymen or guards refuse passage until that map's 1st Portal falls; once unlocked, stepping onto them sends the party straight across with zero menu popup.
3. **Procedural Zelda-Style Quest Dungeons, Keep Raids & The 8 Dimensional Portals (`1:1` Room Grids):**
   * Both **Quest Dungeons** *(outdoor or indoor biomes such as stone aqueducts, caves, woods, ruins, sea caves/shipwrecks, and bandit strongholds)* and all **8 Dimensional Portals** use a **classic room-by-room Zelda-style grid generator** (`2×2` up to `10×10+` bounding grids).
   * **Bounding Grid vs. Actual Room Count:** Just like classic *The Legend of Zelda*, grid size sets the **outer coordinate boundary**—never a packed square block of rooms (`10×10` does **not** mean 100 rooms). The generator carves winding paths, branching wings, locked gates, dead ends, combat triggers, loot stops, and a Mini-Boss/Boss room through only a portion of those grid cells so every layout feels hand-shaped.
   * **Doorless `~10`-Tile `1:1` Pools + Dynamic Door Markers:** Each dungeon theme uses a reusable pool of **`~10` doorless, gridless `1:1` square top-down room paintings** placed along the carved path; the engine dynamically overlays N/S/E/W doors, locked gates/keys, barricades, and boss seals based on how the path connects.
   * **Quest Formats *(No One-Note Battle Popups & No Static-Screen Fights)*:** Every quest plays out cleanly without ever dropping onto a flat single-battle popup or fighting inside a static `16:9` town image—mixing **`167` multi-room `1:1` Dungeons & Raids** *(launched from Wilderness pins or Hub Raid/Dungeon buttons)*, **`11` Overworld Courier runs** *(traveling Hub A $\to$ Hub B across Ethoria)*, and **`20` repeatable Zone Outpost Hunts** *(pure biome hunting across the Overworld)*.

### Continent & Half-Map Sandbox + 8-Portal Progression
* The `4` connected overworld maps span **8 Geographic Regions** *(named landscape territories — `2` per map)* and **20 painted 5-Level Zones (`Z01–Z20`, covering Levels `1–99`)**—culminating in **8 Major Portal Bosses** (in Zones `3, 5, 8, 10, 13, 15, 18, 20`, with **King Garrick as Boss #8** guarding The Eclipse Gate).
* **Open Half-Continent Sandbox + Fear-Gated Water Crossings:** Inside every unlocked landmass *(for example, Zones `1–3` across Map 1's eastern Crownlands continent at start)*, exploration is **free and open** across all local Hubs, Outposts, Quests, and danger sub-zones without linear side-story gates. Rather than artificial magic barriers or letting Level 3 parties wander into late-game oceans to die immediately, travel across water follows a grounded, believable danger rule based on **fear of unsafe waters**:
  * **Inland Waterways (`Ferry Crossings` on Maps `1–4`) & Map 4 Mountain Passes:** Nobody dares ferry travelers or unbar the border passes while monsters surge out of the first local rift—stepping onto a locked **Ferry Pier** or **Border Mountain Pass Gate** opens its uninhabited **`16:9` Closed screen** (`ferrymen / guards refuse passage until that map's 1st Portal is destroyed`). Once open, there is no menu—stepping onto a Ferry glides cleanly pier-to-pier, and Map 4's **Border Mountain Pass Gates** place the party at each pass's exit spawn inside **Dreadwaste & Black Keep (`Zones 19–20`)**.
  * **Open Ocean Voyages (`Sea-Port Towns` on Maps `1–3`):** No sea captain will weigh anchor into open ocean while the outer coast Portal still churns up sea-horrors—entering a locked Sea-Port shows its **Closed empty-pier harbor scene** and explains that captains refuse deep-water voyages until that map's last Portal (`#2, #4, #6` in Zones `5, 10, 15`) is destroyed. Once destroyed, the Sea-Port switches to its **Open Active Ship Harbor** scene (moored vessels ready to depart) and opens the **Sea Travel Menu** to sail onward to the next continent (`Maps 2–4`) or back to any earlier unlocked harbor.
  * **Map 4 Return Port Logic (`Arctic Sea-Port Town`):** Map 4 is the final continent culminating at **Portal #8: The Eclipse Gate** in Dreadwaste (`Zone 20`)—no onward Map 5 exists past Map 4. Instead, arriving at **Arctic Sea-Port Town** opens return sea voyages back to **Map 1, Map 2, or Map 3** whenever you want to revisit earlier shops, arenas, or hunts. Opening each Portal requires its local **Portal Catalyst Key Item** earned in that Portal's zone tier; defeated Portals stay permanently on the Overworld as peaceful **Sealed Monuments** opening their matched `16:9` post-victory scene.
* **Soft Danger Gating:** Each continent half is painted into escalating **5-Level Danger Zones (`20` total)**—venturing ahead within your half means facing tougher monsters until you earn silver, level up, and buy stronger town gear.
* **Resting & Saving:** **Town Inns are free** (grateful townsfolk shelter the heroes fighting for Ethoria) and fully restore HP, MP, and status ailments; **Potions & Ailment Cures** allow recovery between fights. If the party is wiped out, heroes wake up at the last Town Inn keeping their earned XP/levels. Players can **Save Anywhere** outside combat, plus automatic saves on entering Towns, crossing Ferries, or using Sea-Port Towns.

### Exploration & Avatar Presentation
* **Player & NPC Tokens:** Characters move **freely and smoothly** *(no hex or tile-snapping)* across gridless top-down D&D-style tactical maps as **circular VTT portrait tokens** with stylized rings, smooth glide motion, and interactive proximity triggers.
* **Full-Token Terrain & Water Collision:** Impassable terrain (`Ocean`, `Inland Water`, `Impassable cliffs`) checks the **entire circular token footprint**—never just the token center—with smooth coastline sliding and shoreline-safe landing spots so token rims never overlap painted water. Linked **Ferry Crossings** omit separate riding-raft sprites and glide smoothly pier-to-pier, emerging cleanly on dry shore beside the destination dock.
* **Classic Random Encounters *(Unannounced Wilds Hazard)*:** Outside safe Towns and Sanctuaries, hidden step-based encounters trigger unpredictably like classic Final Fantasy—zero warning bars or threat percentages on screen—while safe Towns and Sanctuaries keep exploration completely peaceful.

---

## 3. Dynamic Character Presentation (2×2 Token State Sheets)

* **Set Cast of Heroes:** Locking in a defined cast ensures visual consistency, personal story arcs, and distinct builds. Each hero keeps one signature outfit across the game (weapon and attire upgrades show up as item icons and combat VFX rather than redrawing portraits).
* **1:1 2×2 Token State Sheets (4 Health Tiers per Sheet):** Each character uses a **Master 2×2 Health Sheet** (Full HP $\to$ Lightly Hurt <75% $\to$ Battered <50% $\to$ Critical <25%) plus matching **2×2 Elemental / Status Sheets** (Fire, Poison, Frost, etc.) so every spell hit or status ailment displays at the hero's exact current level of bruising and wounds. Individual spells of the same element share the hero's elemental `2×2` portrait state while each spell still features its own **unique visual animation/VFX and distinct combat effect**.
* **Ornate Illustrated VTT Frames:** Each circular token carries its own hand-inked class-themed frame, sliced cleanly by the Admin Suite from a `#FF00FF` chroma-key background.
* **Enemies:** Monsters and bosses appear as **full-body illustrated artwork** against a 16:9 battle backdrop so major encounters feel imposing (with optional damaged art states for bosses).

---

## 4. Combat System

Combat balances classic RPG accessibility with tactical decisions so battles never devolve into mindless "Attack $\times$ 4":

* **Classic Party-vs-Enemy Round Order *(No Initiative / No Speed Stats)*:** Every combat round runs cleanly in two predictable phases—first your active heroes act top-to-bottom in your chosen **Party Order (`Slots 1 → 4`)** (**Attack [Weapon Mode A/B] / Magic & Remedies / Item / Guard / Flee**), then each living enemy takes **1 turn**. Light weapon attacks stay usable every turn while Heavy attacks carry a **`1-Turn Cooldown`**.
* **Top-to-Bottom Party Order (`Slots 1–4`) & Slot-1 Overworld Leader:** Instead of complicated Frontline/Backline row penalties or `Swap Row` turns, the **4 active Hero circular VTT tokens** line up cleanly in a single top-to-bottom column (`Slots 1–4`) ordered in the **Party Menu (`P`)**—and whoever occupies **Party Slot 1** serves as your visible walking avatar on the Overworld & Dungeons. All weapons and skills hit freely without row restrictions.
* **Telegraphed Threats & Meaningful Guarding:** Heavy enemy attacks display a warning marker before firing on their upcoming round; guarding halves incoming damage and prepares counter-momentum rather than wasting a turn.
* **Tactical Weaknesses:** Exploiting enemy elemental or weapon weaknesses cracks their guard and creates openings.
* **Resolve (Wounded Threshold Passives):** Tied directly to the **2×2 hurt-state tokens**—dropping into Battered (<50%) or Critical (<25%) states triggers hero-specific risk-reward bonuses (turning desperate moments into dramatic comebacks).

---

## 5. Progression & Stats (`1` to `99`)

* **Starting Line:** All heroes begin at **Level 1** with **`1`** in every core stat.
* **5 Core Stats:**
  * **Force:** Physical weapon power, heavy gear synergy, breaking enemy posture.
  * **Finesse:** Accuracy, dodge chance, critical strike rate, and Piercing weapon damage.
  * **Grit:** Max HP, physical defense, and resistance to ailments/knockouts.
  * **Arcana:** Magic damage, mana pool, and elemental potency.
  * **Presence:** Healing & shielding potency, party aura/buff strength, Magic Defense, and Shadow/Curse resistance.
* **Leveling Up:** Every level grants automatic baseline HP/MP growth plus **Stat Points** for the player to invest freely, while **Arcanist Disciplines** unlock **`1` perk choice (`1`-of-`2` Body, Mind, or Spirit) every 10 levels** (**Lv `1, 10, 20… 90`** = `10` perks per hero). All underlying combat and enemy scaling math is balanced centrally so Level 1 battles feel fair while Level 99 power feels earned.

---

## 6. Economy, Shop Gear & Runestone Loop

This loop ensures **silver, grinding, quests, and exploration** all feed into each other without overlapping:

1. **Town Shops Drive Base Power:**
   * Weapon and attire upgrades (**24 Gear Tiers per category**, `6` per Map mapped directly across the **20 Level Zones** — `1` base tier per Zone plus `1` extra tier in each Map's `3`-town Zone `Z02, Z09, Z14, Z16`) live in **town shops**.
   * Players cannot simply out-explore their gear—venturing into higher-level Zones requires earning silver to buy the next Zone's town shop upgrade.
2. **Silver Sources:**
   * Earned through triggered wilderness combat, selling **Trade Goods** dropped by defeated foes in town, and completing Hub quests & Zone Outpost repeatable hunts.
3. **Equipment Slots (`5` Core Gear Pieces Per Hero):**
   * **Right Hand** (Main `1H` or `2H` Weapon — `13` D&D weapon types across `24` Gear Tiers, each with `2` unique `0 MP` attack modes)
   * **Left Hand** (**Global Shields** — `6` shield types across `24` Gear Tiers usable by any class wielding a `1H` weapon; OR a second `1H` sword [`Longsword` / `Rapier`] when **Valen (`Duelist`)** Dual Wields; locked when wielding a `2H` weapon)
   * **Body** (**`23` shared Armor types** across Light, Medium, Heavy — `6` types per class × `4` upgrades each = `24` Gear Tiers)
   * **Helmet** (**Matching Helmets** paired `4`-for-`4` with each Armor type)
   * **1 Accessory Slot** (`24`-tier class accessory: `Cloaks` Duelist, `Orbs` Sorceress, `Horns` Knight, `Quivers` Ranger, `Crystals` Druid, `Tomes` Sage)
4. **Quests Reward "Pick 1 of 3" Randomized Runestones:**
   * Weapons and Body Armor each carry **1 Runestone Socket**.
   * Completing a quest presents **3 randomized Carved Runestones** scaled to that Map (`Lesser` Map 1 $\to$ `Mythic` Map 4)—and the player drafts **1 of the 3** to keep.
   * **Permanent Socketing (Overwrite Destroys Old):** Inserting a Runestone into an empty socket is free; because quests across the 40 Hubs yield plenty of Runestones, sockets are **permanent** with **no extraction NPC**—slotting a new Runestone onto already-socketed gear **overwrites and destroys** the old Runestone.
   * **Build-Changing Combat Affixes:** Runestones focus strictly on exciting combat effects (lifesteal, elemental strikes, stun chances, low-HP Resolve synergies, Guard-break pressure, etc.) so two playthroughs produce totally different party builds.

---

## 7. Technical & Production Architecture

The project is cleanly split into **two separate applications** inside this workspace sharing a single central data/asset folder:

| Component | Purpose | Audience |
| :--- | :--- | :--- |
| **Game Client** | Playable RPG packaged via TypeScript + Web Canvas/UI + Electron into a downloadable Windows `.exe` for Steam (with Steamworks & controller support). | Players (Steam) |
| **Internal Admin Suite** | Private local tool for importing/chunking the `4` `4K` overworld maps, slicing 2×2 character token sheets (with `#FF00FF` chroma transparency), painting blocked terrain & encounter zones, placing location markers/ship ports/doors, and managing items/runestones/quests. | Developer / Designer Only |

*The Admin Suite never ships inside the Steam Game Client build.*

---

## 8. Next Documentation Steps (Feature Content Phase)

Now that the core vision is locked, the supporting specs define the art workflow and concrete game content before coding begins:
1. **[Art Direction & Token Pipeline](02-art-direction-and-token-pipeline.md)** — Official art style guide and verified 3-step AI token prompt workflow.
2. **[Combat & Stat Tuning Spec](03-combat-and-stats.md)** — Exact stat formulas, level 1–99 curves, Resolve passives, and enemy scaling rules.
3. **[World Map, 20 Level Zones & 8 Regions](04-world-and-realms.md)** — `40` Hubs + `20` Unique Zone Outposts + `8` Portals (`+ #69 Highcrown Keep`), painted 5-level Zones, Geographic Regions, towns, ship ports, and procedural `1:1` Zelda Dungeon & Portal grids.
4. **[Playable Cast & Classes](05-cast-and-skills.md)** — Hero identities, backstories, weapon attack styles, caster spell/remedy pools, and gear affinities.
5. **[Gear Suite & Runestones](06-gear-and-runestones.md)** — Weapon/Attire categories, `24`-tier Zone Silver pricing, Runestones, Class Accessories, and Consumables.
6. **[Bestiary & Portal Bosses](07-bestiary-and-bosses.md)** — Shared-engine enemy rules, 8 D&D Plane Bosses (with King Garrick as Boss #8), 120 SRD 5.2 Portal Mobs, and Ethoria natives.
7. **[Quests & Story Arcs](08-quests-and-story.md)** — 4-layer sandbox quest system (open 8-portal goal, independent story chains, `178` Hub Runestone quests spanning `1:1` procedural dungeons + overworld roam/delivery hunts + Hub events, `20` Zone Outpost repeatable biome hunts under a global quest limit, and Home-Front B-Plot triggers).
8. **[UI Screens, Controls, Audio & Steam Features](09-ui-and-steam.md)** — HUD flows, tabbed menus, town shops & services, audio volume/transition hooks, Save Anywhere, and Steam Cloud / Steam Deck / Achievements.
