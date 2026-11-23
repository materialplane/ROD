# ROD — World Map of Ethoria, 20 Level Zones & 8 Geographic Regions

> **Status:** Locked Location Blueprint (`17` Permanent Markers Per Map: `10` Hubs + `5` Unique Zone Outposts + `2` Portals)  
> **World & Cosmology:** **Ethoria** is a human world mapped across **`4` separate island continents (`8192×8192` pure-terrain maps)** *(generated at `4096×4096` and doubled `2×` each)*, holding **`2` Geographic Regions, `5` Level Zones, `10` Towns/Villages/Forts/Castles, `5` Unique 5-Level Zone Outposts, and `2` Dimensional Portals per map** (`68` permanent Overworld markers total, with `#69` **Highcrown Keep** sitting inside **Highcrown**, Hub #1). Each of the 8 Portals opens into a **separate alien dimensional world** ruled by its own apex boss.  
> **Regions vs. Level Zones (`Core World Rule`):**
> * **Geographic Regions (`8` Total):** Named landscape territories (`2` continental halves per Map: *Crownlands & Saltmarsh Coast*, *Thornwall Warfronts & Verdant Weald*, *Sun-Scorched Isles & Ironcrest Highlands*, *Frostbound Reach & Dreadwaste*) used strictly for **world lore, regional terrain flavor, settlement architecture, and political identity**—**never** for monster level bands, XP/Silver tables, or shop gear tiers. *(A few frontier border towns—such as Saltwind Harbor, Briarstead, Highpass Refuge, and Ashenford War-Camp—sit physically in the transition Zone ahead of their map's Ferry or Mountain Pass while bridging into the next territory's story and biome flavor.)*
> * **Level Zones (`Z01–Z20`, `5` Per Map):** The **single progression spine** of the game (`5` levels per Zone from `Lv 1–5` up to `Lv 96–99` internally, with the first half of each Map spanning `3` Zones and the second half spanning `2` Zones — *kept behind the scenes; the in-game Overworld HUD displays only the Region and flavor Biome name such as `Crownland Meadows`, with no Zone number or level range*). Enemy strength, Quest rewards, Zone Outpost Hunts, and all **`24` Gear Tiers** scale directly across **`Z01–Z20`** (`1` base Gear Tier per Zone, plus `1` extra Gear Tier inside each Map's sole `3`-town Zone: **`Z02`, `Z09`, `Z14`, and `Z16`**).
> **Traversal, Collision & Sandbox Rule:** **Half-continent open sandbox** across **`4` island continents** *(with no linear side-story barriers inside any unlocked landmass)* paced by **20 5-Level Painted Zones (`5` per Map)**, with the two Portals on each map sitting in **Zone 3** and **Zone 5** (`Zones 3, 5, 8, 10, 13, 15, 18, 20`) and opening with the **Portal Catalyst Key Item** earned from the highest-level quest in each Portal's zone tier:
> * **Fear-of-Unsafe-Waters Crossings & Return Port Logic:** Travel across waterways and seas is gated organically by local fear of Portal-haunted waters rather than artificial walls:
>   * **Inland Channels (`Ferry Crossings`) & Map 4 Mountain Passes:** Nobody will travel or ferry across the inland waterways on **Maps 1–3** until that map's **1st Portal (`#1, #3, #5`)** is destroyed. On **Map 4**, **Zones 19–20 (`Dreadwaste & Black Keep`)** are enclosed behind an impassable mountain wall instead of a sea channel, crossed through **Border Mountain Pass Gates** (`using dedicated Admin Exit Spawn points`) once **Portal #7 (`The Pale Abyss`, Zone 18)** is destroyed.
>   * **Open Ocean (`Sea-Port Towns` on Maps 1–3):** No sea captain will brave deep-sea voyages until that map's **last Portal (`#2, #4, #6`)** is destroyed. Once defeated, **Royal Trade Port Town** (Map 1), **Highland Cove Port Town** (Map 2), and **Desert Harbor Port Town** (Map 3) sail onward to the next continent (`Maps 2–4`) and back to any earlier unlocked harbor.
>   * **Map 4 Return Port (`Arctic Sea-Port Town`):** Map 4 ends the campaign at **Portal #8 (The Eclipse Gate)** with no Map 5 beyond it. **Arctic Sea-Port Town** therefore uses return-only routing—letting its captain sail you back to **Map 1, Map 2, or Map 3** anytime—while all previously unlocked landmasses stay freely revisitable. **Defeating all 8 Portal Bosses (including Boss #8 King Garrick) is required to beat the game.**
> * **Full-Token Terrain Collision & Pier-to-Pier Ferries:** Painted **Ocean**, **Inland Water**, **Impassable cliffs**, and Map 4's **Ashen Border Scree** ridge wall block movement across the **entire circular diameter of the party token** (`never letting token edges overlap water or cliffs`) with smooth coastline sliding and shoreline-safe landing. **Ferry Crossings** (`coast-rotated 0°–359° in Admin`) have no separate sailing boat sprite—stepping onto an unlocked pier smoothly pans directly across the channel and pops the party out cleanly on dry shoreline beside the connected pier. **Border Mountain Pass Gates** cross Map 4's enclosed ridge to each gate's Admin-placed Exit Spawn point. **Sea-Port Towns** open dedicated **`16:9` Harbor Interior scenes** (`port-travel.txt`).
> * **Option B Locked:** Base map art is **pure unblemished terrain**, and all **40 Hubs, `20` Zone Outposts, `8` Portals, Ferry Crossings, `4` Sea-Port Towns, and Quest-only Field Sites** are placed dynamically in the Admin Suite.

---

## The 4 Island Continent `8192×8192` Overworld Maps *(`17` Permanent Markers Each + Travel Markers)*

| Map | Geographic Regions & Level Zones (`5` Per Map) | Gear Tiers & Content | Portals & Sea Access |
| :--- | :--- | :---: | :--- |
| **Map 1 — Southern Heart & Coastlands** | **The Crownlands** + **Saltmarsh Coast** (`Lv 1–25` · First Half `Z01–03` $\to$ Ferry $\to$ Second Half `Z04–05`) | **Tiers `1–6`** \| `10` Hubs + `5` Outposts *(`#69` Capital Home-Front)* | **Portal #1** *(`Z03`, unlocks Ferry $\to$ `Z04–05`)* \| **Portal #2** *(`Z05`, captain sails **Royal Trade Port** $\to$ Map 2)* |
| **Map 2 — Western Warlands & Ancient Weald** | **Thornwall Warfronts** + **The Verdant Weald** (`Lv 26–50` · First Half `Z06–08` $\to$ Ferry $\to$ Second Half `Z09–10`) | **Tiers `7–12`** \| `10` Hubs + `5` Outposts | **Portal #3** *(`Z08`, unlocks Ferry $\to$ `Z09–10`)* \| **Portal #4** *(`Z10`, captain sails **Highland Cove Port** $\to$ Map 3)* |
| **Map 3 — Sun-Scorched Isles & Highcrest** | **Sun-Scorched Isles** + **Ironcrest Highlands** (`Lv 51–75` · First Half `Z11–13` $\to$ Ferry $\to$ Second Half `Z14–15`) | **Tiers `13–18`** \| `10` Hubs + `5` Outposts | **Portal #5** *(`Z13`, unlocks Ferry $\to$ `Z14–15`)* \| **Portal #6** *(`Z15`, captain sails **Desert Harbor Port** $\to$ Map 4)* |
| **Map 4 — Northern Reach & Dreadwaste** | **Frostbound Reach** + **The Dreadwaste** (`Lv 76–99` · First Half `Z16–18` $\to$ Pass Gates $\to$ Enclosed `Z19–20`) | **Tiers `19–24`** \| `10` Hubs + `5` Outposts | **Portal #7** *(`Z18`, opens **Border Mountain Pass Gates** $\to$ `Z19–20`)* \| **Portal #8** *(`Z20`, King Garrick finale)* \| **Arctic Sea-Port Town** *(sails back to Maps `1, 2, or 3` only)* |

---

## Location Summary (`68` Overworld + `1` Home-Front + Quest Sites)
* **`40` Inhabited Hubs (`10` Per Map: `6` on the Entry Half, `4` Past the Ferry / Mountain Pass):**
  * **Every single one of the `40` Hubs** features local NPCs, rest/services, progressive **Gear Tiers (`1–24` mapped directly by Level Zone)** & Potions, and **`4–5` local quests (`178` total handcrafted quests)** tailored to its surrounding terrain!
  * **Hostile / Contested Keeps** *(Hollowstone Keep, The Gilded Auction Manor, Bleakwatch Citadel, Garrick's Black Keep)* stand alone without bunched siege-camp clutter outside their gates—players enter their outer ward/courtyard (`or infiltrated/post-liberation garrison`) directly for those `4–5` local quests.
* **`20` Unique Zone Outposts (`1` per 5-Level Zone · `5` per Map · Always Visible):**
  * Every 5-level Danger Zone (`Lv 1–5` through `Lv 96–99`) has its own permanent, uniquely named and illustrated **Zone Outpost**. Talking to the Outpost's **Hunt Quartermaster NPC** rolls a random monster species that spawns inside that Zone to kill `X` of (`no quest pins, no spawn boosts`) for **XP, Silver & Consumables**.
* **`8` Dimensional Portals (`2` Per Map — `Zone 3` & `Zone 5` of Each Continent):** Full Zelda-style procedural room-by-room dungeon grids (`sparse carved paths contained within up to 10×10+ bounding grids` using `~10` `1:1` doorless room tiles per Portal plane, with branches, locked doors, dead ends, encounters, and Apex Portal Bosses `#1–#8`). Defeating a Portal Boss removes that Portal cleanly from the Overworld map.
* **Quest-Only Exploration, Dungeons & Field Sites *(NOT Permanent Map Pins)*:**
  * All **Side Caves, Ruins, Ancient Shrines, Animal Dens, Dragon Lairs, Shipwrecks, Outlaw Camps, & Road Ambushes** (`178` unique field tokens) appear strictly as **Quest Objectives** revealed when picked up from one of the `40` Hubs, and vanish once completed.
  * Rather than dropping into a single flat battle popup, field/dungeon quest sites launch a **Procedural `1:1` Zelda-Style Dungeon** (`sparse carved paths inside 2×2 up to 10×10+ bounding grids` built from `~10`-tile outdoor or indoor room pools), while other quests complete cleanly across the Overworld (`courier runs, patrol tracking, multi-stop rescues`) or inside Hubs.
* **Zone-Interior Buffer Rule *(No Border-Hugging Spawns)*:** Both Permanent Locations and Quest-Triggered Field Sites stay inset inside their matching Level Zone—targeting **`12+` walkable painted hexes** (`~5+` seconds of walking) away from open neighboring Zone borders—so stepping 3 seconds out of a Hub or past an objective never puts players into out-of-level enemies.

---

## Map-by-Map & Level Zone Breakdown (`40` Permanent Hubs + `8` Portals)

> Every Hub below belongs to its exact painted **Level Zone (`Z01–Z20`)** and stocks the matching **Shop Gear Tier (`Tier 1–24`)**. On each Map, the **First Half (`3` Zones)** holds `6` Hubs ending at the odd-numbered Portal, and the **Second Half (`2` Zones)** holds `4` Hubs ending at the even-numbered Portal.

### Map 1 — First Half: Zones `1–3` *(Lv `1–15` | Gear Tiers `1–4` | Spell Tier 1)*
*Geographic Region: **The Crownlands & Saltwind Coast** — Map 1's eastern starter heartland of rolling green meadows, oak groves, slate hills, and its western coastal bay.*
1. **Highcrown** *(Royal Capital City #1 · **Zone 1** [`Lv 1–5`] · **Gear Tier 1**)* — Ethoria's besieged Royal Capital in the Crownlands heartland—home to **Highcrown Keep** (where 2 heroes stay openly to rally the realm while you pick **4 of 6**), **The Great Coliseum** (where Koren fell), and the **Overgrown Palace Gardens & Dry Aqueducts**. Houses Free Capital Inn/Quarters, Starter Gear (**Tier 1**), and opening quests (`4` quests).
2. **Oakhaven** *(Walled Town #2 · **Zone 1** [`Lv 1–5`] · **Gear Tier 1**)* — Entry Crownlands hub with Free Inn, Armory (**Gear Tier 1**), Magic Shop (**Tier 1 Spells**), and **`5` local quests** across the surrounding meadows.
3. **Meadowbrook Hamlet** *(Farming Village #3 · **Zone 2** [`Lv 6–10`] · **Gear Tier 2**)* — Quiet southern agricultural hamlet in the entry half of Zone 2 with Free Inn, Provisions/Armory (**Gear Tier 2**), and **`4` quests** defending pastures & barns (*Raided Barn, Alpha Wolf Hollow, Shattered Mill-Tower*).
4. **Millbrook Crossing** *(Dryland Crossroads Village #4 · **Zone 2** [`Lv 6–10`] · **Gear Tier 3**)* — Frontier windmill and wagon crossroads village on dry ground (`zero rivers`) in the deeper half of Zone 2, stocking **Gear Tier 3**, Tier-1 skills, and **`5` quests** (*Hold the West Palisade, Chain D Step 1 Roadside Bounty Camp*, etc.).
5. **Crownlands Hill-Fort** *(Border Watch-Fort #5 · **Zone 2** [`Lv 6–10`] · **Gear Tier 3**)* — Timber-and-stone garrison watch-fort nestled near the eastern rocky hills; holds Free Rest Barracks, Garrison Armory (**Gear Tier 3**), and **`4` quests** clearing nearby hills & bandit caves (*including **Bramblewatch Cave***).
6. **Saltwind Harbor** *(Coastal Port City #6 · **Zone 3** [`Lv 11–15`] · **Gear Tier 4**)* — Bustling coastal harbor city overlooking Map 1's bay on the geographic edge of the Saltmarsh Coast; holds Free Inn, Armory (**Gear Tier 4**), Magic Shop, and **`5` coastal quests** (*including **Chain A Step 1: Ledgers in the Brine** at Drowned Belltower*). *(Overseas voyages depart separately from the dedicated **Royal Trade Port Town** after sealing Portal #2.)*
* **Portal #1: The Ashen Gate** *(Zone 3 · Level `11–15` Boss — **Catalyst:** `Ashen Forge Keystone` from `Q025 The Cracked Lighthouse`, Saltwind Harbor)* — Built charred basalt archway linking to **Elemental Plane of Earth & Forge** (**The Ashen Iron Golem**).

---

### Map 1 — Second Half: Zones `4–5` *(Lv `16–25` | Gear Tiers `5–6` | Spell Tier 2)*
*Geographic Region: **The Saltmarsh Coast** — Map 1's warm western Sandstone Ridges and soggy coastal wetland islands reached across the inland strait by Ferry Crossings after Portal #1 falls.*
7. **Brinecliff Watch-Fort** *(Coastal Cliff Fort #7 · **Zone 4** [`Lv 16–20`] · **Gear Tier 5**)* — Stone cliffside fortress guarding the rugged western shoreline; stocks **Gear Tier 5** and gives **`4` cliff & cave quests** (*including **Smuggler's Cave** & reef wrecks*).
8. **Reedfen Village** *(Saltmarsh Wetland Village #8 · **Zone 4** [`Lv 16–20`] · **Gear Tier 5**)* — Timber fishing and reed-gathering settlement built on solid Saltmarsh meadow turf beside coastal marsh pools; stocks **Gear Tier 5** and gives **`4` marshland & beached-wreck quests**.
9. **Mirewatch Post** *(Deep Marsh Outpost #9 · **Zone 5** [`Lv 21–25`] · **Gear Tier 6**)* — Elevated wooden swamp outpost stocked with **Gear Tier 6**, Tier-2 spells, Free Inn, and **`5` quests** deep into the Saltmarsh wetlands.
10. **Tidewater Keep** *(Sea-Wall Castle #10 · **Zone 5** [`Lv 21–25`] · **Gear Tier 6**)* — Fortified coastal bastion guarding the outer headland; stocks **Gear Tier 6** and gives **`4` heavy coastal defense & ruin quests** leading up to Portal #2.
* **Portal #2: The Sunken Maw** *(Zone 5 · Level `21–25` Boss — **Catalyst:** `Abyssal Brine-Pearl` from `Q044 Outer Abyssal Watch`, Tidewater Keep)* — Barnacle-crusted tidal archway linking to **Elemental Plane of Water & Deep Trench** (**The Abyssal Aboleth**).

---

### Map 2 — First Half: Zones `6–8` *(Lv `26–40` | Gear Tiers `7–9` | Spell Tier 3)*
*Geographic Region: **Thornwall Warfronts** (+ *Verdant Weald* woodland border at Briarstead) — Map 2's golden-ochre highland landmass with two central gray-slate mountain clusters; linked by Ship to its northeast cove.*
11. **Redmarch Bastion** *(Garrison Port City #11 · **Zone 6** [`Lv 26–30`] · **Gear Tier 7**)* — Fortified coastal garrison on the sunlit cove where border troops rally; stocks **Gear Tier 7** and gives **`5` warfront & courier quests**.
12. **Goldmoor Village** *(Highland Meadow Village #12 · **Zone 6** [`Lv 26–30`] · **Gear Tier 7**)* — Open ochre-grassland horse-and-grain village holding Free Inn, Armory (**Gear Tier 7**), and **`4` western moor quests** (*including Torched Border Farmsteads*).
13. **Slatepeak Mining Fort** *(Mountain Quarry Fort #13 · **Zone 7** [`Lv 31–35`] · **Gear Tier 8**)* — Stone mining fortress anchored against the central gray-slate mountains; stocks **Gear Tier 8** and gives **`5` ridge & mine quests** (*including **Cinderpit Mines** & **Slate-Crag Pass Blockade***).
14. **Thornwall Border Castle** *(Highland Ridge Castle #14 · **Zone 7** [`Lv 31–35`] · **Gear Tier 8**)* — Stone warfront fortress overlooking the highland passes; stocks **Gear Tier 8**, Tier-3 spells, and **`4` quests** (*including **Chain C Step 1: Blood on the Watchtower** at Widow's Watchtower*).
15. **Hollowstone Keep** *(Contested Noble Stronghold #15 · **Zone 8** [`Lv 36–40`] · **Gear Tier 9**)* — Seat of Rival House Hollowstone on the rugged highland crags; its outer bailey rebels & post-liberation steward offer **Gear Tier 9** (`upon liberation`) and **`5` quests** (*culminating in **Chain C Step 2: Fall of House Hollowstone***).
16. **Briarstead** *(Walled Forest Town #16 · **Zone 8** [`Lv 36–40`] · **Gear Tier 9**)* — Timber-walled apothecary and hunter town nestled at the wooded border edge of the *Verdant Weald* inside Zone 8; stocks **Gear Tier 9**, Tier-3 spells, and gives **`5` local quests** (*including **Chain B Step 1: The Spreading Blight***).
* **Portal #3: The Iron Rift** *(Zone 8 · Level `36–40` Boss — **Catalyst:** `Blood-Iron Keystone` from `Q067 Shatter the Stone-Giant Picket`, Hollowstone Keep)* — Forged-iron & granite archway linking to **Blood-Iron Warlands** (**The Fire Giant Warlord**).

---

### Map 2 — Second Half: Zones `9–10` *(Lv `41–50` | Gear Tiers `10–12` | Spell Tier 4)*
*Geographic Region: **The Verdant Weald & Plague Woods** — Map 2's lush emerald forest island across the Ferry Crossing strait, shading into a dark-emerald blighted glade on the east.*
17. **Timberfall Village** *(Woodland Logging Settlement #17 · **Zone 9** [`Lv 41–45`] · **Gear Tier 10**)* — Woodland sawyer village nestled among bright forest clearings; stocks **Gear Tier 10** and gives **`4` forestry, beast-den, and courier quests** (*including **Briarwood Timber Palisade***).
18. **Mosswood Hamlet** *(Forest Glade Hamlet #18 · **Zone 9** [`Lv 41–45`] · **Gear Tier 10**)* — Quiet woodland shrine-hamlet nestled in emerald groves; stocks **Gear Tier 10** and gives **`4` forest-path & slime quests** (*including **Elderwood Shrine** & **Shrine Road Ooze Clearing***).
19. **Greenwarden Fort** *(Woodland Ranger Fort #19 · **Zone 9** [`Lv 41–45`] · **Gear Tier 11**)* — Timber-and-stone ranger bastion holding the central frontier inside the deeper half of Zone 9; stocks **Gear Tier 11**, Tier-4 spells, and **`5` deep-forest quests** (*including **Webbed Spider Grove** & **Oakhollow Ruins** leads*).
20. **Blightwatch Keep** *(Frontier Quarantine Fortress #20 · **Zone 10** [`Lv 46–50`] · **Gear Tier 12**)* — Stone quarantine citadel bordering the dark blighted glade; stocks **Gear Tier 12**, Tier-4 spells, and gives **`4` plague-purge quests** (*including **Chain B Step 3: Heart of the Mire** at **Thornroot Cavern***).
* **Portal #4: The Rotspire** *(Zone 10 · Level `46–50` Boss — **Catalyst:** `Spore-Heart Amber` from `Q089 Hold the Quarantine Gate`, Blightwatch Keep)* — Moss-and-root archway linking to **Corrupted Feywild & Spore-Mire** (**The Elder Blight-Treant**).

---

### Map 3 — First Half: Zones `11–13` *(Lv `51–65` | Gear Tiers `13–15` | Spell Tier 5)*
*Geographic Region: **The Sun-Scorched Isles** (+ *Ironcrest* foothill border at Highpass Refuge) — Map 3's golden desert lower landmass centered around a palm oasis lake.*
21. **Port Veridia** *(Desert Harbor City #21 · **Zone 11** [`Lv 51–55`] · **Gear Tier 13**)* — Sun-bleached sandstone spice-trade harbor; stocks **Gear Tier 13**, Tier-5 spells, and gives **`5` coastal & trade quests** (*including **Chain A Step 2: The Smuggler's Crossing** at **Corsair Trading Quay***). *(Overseas voyages to Map 4 depart from **Desert Harbor Port Town** after sealing Portal #6.)*
22. **Sunstone Caravan Post** *(Desert Trade Outpost #22 · **Zone 11** [`Lv 51–55`] · **Gear Tier 13**)* — Sandstone roadside oasis camp along the desert dunes; stocks **Gear Tier 13** and gives **`4` caravan, cave & canyon-raider quests**.
23. **Dunespire Oasis** *(Central Palm Oasis Town #23 · **Zone 12** [`Lv 56–60`] · **Gear Tier 14**)* — Thriving desert caravan town ringed around the central green oasis lake; stocks **Gear Tier 14** and gives **`5` aquifer & dune quests** (*including **Tremors Under the Sand** & **Glasswind Cavern***).
24. **Sandwall Citadel** *(Desert Garrison Fortress #24 · **Zone 12** [`Lv 56–60`] · **Gear Tier 14**)* — Towering weathered sandstone fortress guarding the outer dunes; stocks **Gear Tier 14**, Tier-5 spells, and **`4` high-desert & dragon-lair quests**.
25. **The Gilded Auction Manor** *(Slaver Stronghold #25 · **Zone 13** [`Lv 61–65`] · **Gear Tier 15**)* — Heavily fortified slaver compound; outer trading-ward informants & post-liberation allies offer **Gear Tier 15** (`upon liberation`) and **`4` anti-slaver & coastal rescue quests** (*culminating in **Chain A Step 3: Broken Shackles** freeing Mera's mother*).
26. **Highpass Refuge** *(Granite Highland Town #26 · **Zone 13** [`Lv 61–65`] · **Gear Tier 15**)* — Pine-and-granite foothill border town perched at the *Ironcrest* approach inside Zone 13 before the Ferry strait; stocks **Gear Tier 15**, Tier-5 spells, and gives **`5` foothill & trail quests** (*including **Granite Scree Pass** & **Star-Iron Ingots***).
* **Portal #5: The Scorched Chasm** *(Zone 13 · Level `61–65` Boss — **Catalyst:** `Brass Cinder-Seal` from `Q111 Guard Against Efreeti Scouts`, The Gilded Auction Manor)* — Sandstone & brass archway linking to **Elemental Plane of Fire** (**The Efreeti Pasha**).

---

### Map 3 — Second Half: Zones `14–15` *(Lv `66–75` | Gear Tiers `16–18` | Spell Tier 6)*
*Geographic Region: **The Ironcrest Highlands** — Map 3's upper green alpine valley landmass across the Ferry strait dotted with `3` sapphire mountain lakes and gray granite peaks (`zero snow`).*
27. **Clearwater Lake Village** *(Highland Lakeside Village #27 · **Zone 14** [`Lv 66–70`] · **Gear Tier 16**)* — Peaceful timber-and-stone fishing village resting on grassy shoreline beside one of the clear blue mountain lakes; stocks **Gear Tier 16** and gives **`4` lakeside, ruin & wyrm-roost quests** (*including **Cragwater Storm-Stone** & **Lakeside Temple Ruins***).
28. **Anvilhall Forge** *(Mountain Keep #28 · **Zone 14** [`Lv 66–70`] · **Gear Tier 17**)* — Legendary granite mountain smithy sitting in the deep highland forge tier of Zone 14; stocks **Gear Tier 17**, Tier-6 master spells, and **`5` forge & tunnel quests** (*including **Ironvein Cavern***).
29. **Cragwatch Fort** *(Granite Ridge Fort #29 · **Zone 14** [`Lv 66–70`] · **Gear Tier 16**)* — Fortified gray-stone watch-fort overlooking the lower basin trails; stocks **Gear Tier 16** and gives **`4` waystation & bear-den quests** (*including **Crag-Ledge Waystation***).
30. **Stormhold Citadel** *(Ancient Highland Castle #30 · **Zone 15** [`Lv 71–75`] · **Gear Tier 18**)* — Towering granite mountain castle guarding the highest ridges near Portal #6; stocks **Gear Tier 18**, Tier-6 spells, and gives **`4` dragon-roost & tempest-trial quests**.
* **Portal #6: The Storm-Crowned Spire** *(Zone 15 · Level `71–75` Boss — **Catalyst:** `Storm-Crown Lodestone` from `Q133 Silence the Storm-Giant Warband`, Stormhold Citadel)* — Carved lightning granite archway linking to **Elemental Plane of Air & Dragon Crags** (**The Ancient Storm Dragon**).

---

### Map 4 — First Half: Zones `16–18` *(Lv `76–90` | Gear Tiers `19–22` | Spell Tier 7)*
*Geographic Region: **The Frostbound Reach** (+ *Dreadwaste* forward border trench at Ashenford War-Camp) — Map 4's snowy frozen northern & western half (`glaciers, frozen lakes, snow pines, offshore ice floes`).*
31. **Rimeport** *(Northern Ice Port City #31 · **Zone 16** [`Lv 76–80`] · **Gear Tier 19**)* — Ice-locked timber-and-granite harbor city; stocks **Gear Tier 19**, Tier-7 spells, and gives **`5` harbor, beacon & naval-wreck quests** (*including **Whispering Fjord***). *(Continent return voyages dock at **Arctic Sea-Port Town**.)*
32. **Frostmere Village** *(Frozen Lake Trapper Village #32 · **Zone 16** [`Lv 76–80`] · **Gear Tier 19**)* — Snow-roofed fur-trapper settlement beside a frozen lake; stocks **Gear Tier 19** and gives **`4` timber-picket, wolf-pack & iceberg-wreck quests**.
33. **Glacierwatch Fort** *(Glacial Border Fort #33 · **Zone 16** [`Lv 76–80`] · **Gear Tier 20**)* — Snow-dusted granite cliff fort on the deeper glacier approaches of Zone 16; stocks **Gear Tier 20** and gives **`4` glacial-vault & blizzard-courier quests** (*including **Glacier Vault***).
34. **Icecrest Holdfast** *(Northern Clan Stone Hold #34 · **Zone 17** [`Lv 81–85`] · **Gear Tier 21**)* — Fortified stone clan hold nestled among snow-laden pines; stocks **Gear Tier 21**, Tier-7 spells, and gives **`4` labor-stockade, beast-den & fiend-raid quests**.
35. **Bleakwatch Citadel** *(Warlord Stronghold #35 · **Zone 18** [`Lv 86–90`] · **Gear Tier 22**)* — Snow-swept iron-and-basalt castle of Marshal Bleakwatch on a frozen headland; outer ward scouts & liberated garrison offer **Gear Tier 22** (`upon liberation`) and **`5` quests** (*including **Chain C Step 3: The Northern Pretender***).
36. **Ashenford War-Camp** *(Rebel Forward Hub #36 · **Zone 18** [`Lv 86–90`] · **Gear Tier 22**)* — Forward fortified war-camp dug into the volcanic *Dreadwaste* scree border inside Zone 18 ahead of the mountain pass gates; stocks **Gear Tier 22**, Tier-7/8 frontier supplies, and **`5` frontline quests** (*Ash-Wall Trench, Void-Fog Braziers, Forward Siege Battery*).
* **Portal #7: The Pale Abyss** *(Zone 18 · Level `86–90` Boss — **Catalyst:** `Pale-Abyss Ice-Seal` from `Q155 Gatekeepers of the Abyss`, Bleakwatch Citadel)* — Frost-rimmed basalt archway linking to **The Nine Hells & The Abyss** (**The Pit Fiend General**).

---

### Map 4 — Second Half: Zones `19–20` *(Lv `91–99` | Gear Tiers `23–24` | Spell Tier 8)*
*Geographic Region: **The Dreadwaste & Black Keep** — Map 4's mountain-enclosed dark volcanic basalt and ashland southeastern interior opened via Border Mountain Pass Gates once Portal #7 falls, culminating at King Garrick's isolated plateau.*
37. **Cinderwatch Bastion** *(Volcanic Ash Cliffs Bastion #37 · **Zone 19** [`Lv 91–95`] · **Gear Tier 23**)* — Dark stone border bastion watching the volcanic ridges; stocks **Gear Tier 23**, Tier-8 spells, and gives **`4` cultist-raid, mine-ruin & undead-patrol quests**.
38. **Ashvale Village** *(Ashen Basin Settlement #38 · **Zone 19** [`Lv 91–95`] · **Gear Tier 23**)* — Fortified basalt survivor village in the central ash valley; stocks **Gear Tier 23** and gives **`4` refugee-rescue, frontier war-pit & relic quests** (*including **Dreadwaste War-Pit / Ash-Pit Outskirts** & **Chain D Step 2***).
39. **Scorchwall Fort** *(Volcanic Bay Ridge Fort #39 · **Zone 20** [`Lv 96–99`] · **Gear Tier 24**)* — Jagged volcanic coastal fortress overlooking the haunted ash bay and Zone 20 ridge approaches; stocks endgame **Gear Tier 24**, Tier-8 spells, and gives **`4` crypt, shipwreck & rift-incursion quests** (*including **The Bone Reliquary***).
40. **Garrick's Black Keep** *(Final Stronghold #40 · **Zone 20** [`Lv 96–99`] · **Gear Tier 24**)* — King Garrick's isolated obsidian citadel where all 6 heroes converge; inside the breached outer bailey, allies & vanguard quartermasters offer endgame **Gear Tier 24** and **`5` final Dreadwaste breaking quests** before entering **The Eclipse Gate** inside the Throne Hall.
* **Portal #8: The Eclipse Gate** *(Zone 20 · Level `96–99` Final Boss — **Catalyst:** `Interlocking Wolf Pendant` from `Q178 Unbind the Final Ward-Seal`, Black Keep)* — Obsidian royal temple gate linking to **The Shadowfell** (**King Garrick, Sovereign of the Undead Eclipse**).

---

### Home-Front Capital Location
69. **Highcrown Keep / Capital Battlements** *(Inside Hub #1: Highcrown)* — Inner royal castle and Council Hall where the **2 remaining heroes** hold Highcrown and trigger the dynamic Home-Front Cutscenes.

---

## The 20 Unique Zone Outposts (`5` Per Map · `1` Per 5-Level Zone · Always Visible)
Every 5-level Zone has its own always-present fortified **Palisade Outpost Fort** marker housing a **Hunt Quartermaster NPC** who hands out biome-knowledge repeatable hunts (`XP + Silver + Consumables`) and an enclosed **Palisade Fort Interior**:

| Zone # | Map | Level Band | Outpost Name | Primary Terrain Setting |
| :---: | :---: | :---: | :--- | :--- |
| **Z1** | Map 1 | `Lv 1–5` | **Meadowgate Watch-Post** | Crownland Meadows |
| **Z2** | Map 1 | `Lv 6–10` | **Oakwood Ranger Camp** | Oakleaf Groves |
| **Z3** | Map 1 | `Lv 11–15` | **Slate-Ridge Scout Outpost** | Graystone Foothills, Upland Foothills & Sunlit Downs |
| **Z4** | Map 1 | `Lv 16–20` | **Brinefen Hunter Landing** | Western Sandstone Ridges & Coastal Saltmarsh Edge |
| **Z5** | Map 1 | `Lv 21–25` | **Bogwarden Stilt-Post** | Saltmarsh Wetlands |
| **Z6** | Map 2 | `Lv 26–30` | **Ochre-Downs Tracker Camp** | Ochre Grasslands |
| **Z7** | Map 2 | `Lv 31–35` | **Cragspire Quarry Post** | Thornwall Slate Crags |
| **Z8** | Map 2 | `Lv 36–40` | **Fernbrook Ranger Station** | Weald Clearings |
| **Z9** | Map 2 | `Lv 41–45` | **Canopy-Watch Tree-Post** | Verdant Canopy Woods |
| **Z10** | Map 2 | `Lv 46–50` | **Mire-Edge Quarantine Camp** | Blighted Mire-Glade Border |
| **Z11** | Map 3 | `Lv 51–55` | **Dune-Runner Nomad Post** | Sun-Scorched Dunes |
| **Z12** | Map 3 | `Lv 56–60` | **Palm-Spring Hunter Pavilion** | Palm Oasis Verge |
| **Z13** | Map 3 | `Lv 61–65` | **Mesa-Watch Ranger Outpost** | Sandstone Mesas & Lower Valley |
| **Z14** | Map 3 | `Lv 66–70` | **Pine-Valley Wardens' Post** | Ironcrest Alpine Meadow & Highland Pine |
| **Z15** | Map 3 | `Lv 71–75` | **Highland Crag-Watch Camp** | Granite Highland Ridge *(zero snow)* |
| **Z16** | Map 4 | `Lv 76–80` | **Snowdrift Fur-Hunter Post** | Glacial Snowfields & Frostpine Taiga |
| **Z17** | Map 4 | `Lv 81–85` | **Glacier-Edge Demon-Watch** | Frozen Glacial Reach Cliffs |
| **Z18** | Map 4 | `Lv 86–90` | **Ashen-Ridge Border Post** | Ashen Border Scree |
| **Z19** | Map 4 | `Lv 91–95` | **Cinder-Plain Vanguard Camp** | Charred Ash Plains |
| **Z20** | Map 4 | `Lv 96–99` | **Black-Crag Slayer's Post** | Dreadwaste Basalt Crags |

---

## Services, Shops & Overworld Visibility Rules
* **Free Rest Everywhere:** Every one of the `40` Towns, Villages, Outposts, and Friendly/Liberated Forts offers Free Rest (`0s`), while hostile keeps unlock full services upon liberation.
* **Royal Coliseum & `15` Frontier Fighting Arenas *(Inside Hub Maps)*:** **Highcrown** (`The Great Coliseum`) plus `15` major Hubs across **Zones `1–18`** (**Oakhaven**, **Saltwind Harbor**, **Tidewater Keep**, **Redmarch Bastion**, **Hollowstone Keep**, **Briarstead**, **Greenwarden Fort**, **Port Veridia**, **The Gilded Auction Manor**, **Sandwall Citadel**, **Highpass Refuge**, **Anvilhall Forge**, **Stormhold Citadel**, **Rimeport**, **Bleakwatch Citadel**) feature a built-in Arena inside their `16:9` Hub map—each visibly shown inside that Hub's own Overworld marker token *(zero duplicate Arena Overworld pins)*.
* **Permanent Runestone Socketing:** Players socket **Carved Runestones** directly in the Equipment menu anytime outside combat *(no Runesmith NPCs or extraction; socketing a new Runestone over an occupied slot overwrites and destroys the previous one)*.
* **Always Visible on Overworld:** All **`40` Permanent Hubs** + all **`20` Unique Zone Outposts** + all **unbeaten Portals (`#1–#8`)** *(each Portal marker disappears cleanly upon boss defeat)* + **Linked Pier-to-Pier Ferry Crossings** *(coast-rotated `0°–359°`, unlocked by Portals `#1/#3/#5/#7`)* + **`4` Dedicated Sea-Port Towns** *(each opening its own `16:9` harbor interior for inter-continent ship travel unlocked by Portals `#2/#4/#6`)*.
* **Dynamic Quest Sites Only:** All **Caves, Ruins, Shrines, Animal Dens, Dragon Lairs, Shipwrecks & Camps** appear strictly when an active quest from one of the `40` Hubs sends you there, clearing cleanly once finished.

---

## Political Factions & Map Banners *(Mount & Blade–Style Overworld Plates)*
Every faction-held village, town, port, fort, keep, Zone Outpost, and stronghold displays its controlling **Faction Banner** directly beside its overworld nameplate (`triggered within ~600px`). Dimensional Portals (`#1–#8`), Ferry Crossings, and Border Passes have no faction ownership and show standalone nameplates without a banner:

| Faction | Controlling / Held Locations | Banner Palette |
| :--- | :--- | :--- |
| **Highcrown Loyalists** | **Highcrown**, loyalist forts/keeps (**Crownlands Hill-Fort, Brinecliff, Tidewater Keep, Redmarch Bastion, Thornwall Border Castle, Greenwarden Fort, Blightwatch Keep, Ashenford War-Camp, Cinderwatch Bastion, Scorchwall Fort**), Royal Trade Port, and Zone Outposts `Z01–Z15` & `Z18–Z20` | Royal Gold & Crimson |
| **Free Towns & Guilds** | Independent towns, villages, sea ports & guilds (**Oakhaven, Meadowbrook, Millbrook, Saltwind Harbor, Reedfen, Mirewatch, Goldmoor, Slatepeak, Briarstead, Timberfall, Mosswood, Port Veridia, Sunstone, Dunespire, Sandwall Citadel, Highpass Refuge, Clearwater, Anvilhall Forge, Cragwatch, Stormhold, Rimeport, Ashvale**, and Sea-Travel Port Towns) | Sea Teal & Dark Bronze |
| **Northern Clans** | **Frostmere Village**, **Glacierwatch Fort**, **Icecrest Holdfast**, and Zone Outposts `Z16–Z17` | Ice Blue & Slate |
| **House Hollowstone** *(Rival)* | **Hollowstone Keep** *(Map 2 · Zone 8 — liberated in Chain C2)* | Wine Purple & Rose Copper |
| **Slaver Syndicate** *(Hostile)* | **The Gilded Auction Manor** *(Map 3 · Zone 13 — broken in Chain A3)* | Tarnished Amber & Charcoal |
| **Bleakwatch Warlord** *(Rival)* | **Bleakwatch Citadel** *(Map 4 · Zone 18 — defeated in Chain C3)* | Storm Violet & Iron |
| **King Garrick** *(Tyrant)* | **Garrick's Black Keep** *(Map 4 · Zone 20 — final stronghold)* | Obsidian & Blood Crimson |
