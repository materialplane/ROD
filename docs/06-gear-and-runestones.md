# ROD — Gear Suite & Carved Runestones

> **Status:** Complete (Synced to `classes.txt`: `13` D&D Weapons, `23` Shared Armor & Helmet Types, `6` Global Shields, `6` Class Accessories, Procedural Runestones & Town Potions)  
> **Equipment Slots (`5` Core Slots Per Hero):** **Right Hand** (Main `1H`/`2H` Weapon), **Left Hand** (Global Shield when wielding `1H`), **Body** (Armor), **Helmet**, plus **1 Class Accessory Slot** (`Cloak`, `Orb`, `Horn`, `Quiver`, `Crystal`, or `Tome`).
> **Town Shop Structure (`6` Shop Types + Dedicated Trade Goods Buyer):** **Weapon Shop** (`all 13 weapons`), **Armor Shop** (`metal body armor, metal helmets & shields`), **Tailor** (`all non-metal armor & helmets: robes, leather, hide, bone, dragonscale`), **Magic Shop** (`caster spells`), **Arcanist** (`all potions + Orbs, Crystals, Tomes`), **Adventurer Shop** (`Cloaks, War-Horns, Quivers`), plus dedicated **Trade Goods Buyer NPCs** (`weigh & sell all monster trophies for Silver — no buy list`).
> **Progression Structure:** Each Weapon and Class Accessory climbs **24 steps** (`3` per Region across `8` Regions). Each class wears **6 Armor Types** (`4` progressive Body pieces + `4` Helmets per type = `24` steps; shared types use the exact same `4`-item set cleanly without duplication). Weapons and Body Armor carry **1 Permanent Runestone Socket** (inserting a new Runestone overwrites and destroys the previous one).

---

## 1. The `13` D&D Weapon Categories & Unique `0 MP` Attack Modes

Every class uses **3 distinct D&D weapon types** (`1H` or `2H`, shared cleanly across the cast), and each weapon type carries **2 unique `0 MP` Attack Modes**:

| # | Weapon Type | Handed | Damage Type | Usable By | Attack Mode A *(Fast / Accurate)* | Attack Mode B *(Slow / Heavy / Special)* |
| :---: | :--- | :---: | :--- | :--- | :--- | :--- |
| **1** | **Longsword** | 1H | Slashing | Duelist (`Valen`) | **Quick Slash** — High hit rate, faster turn recovery | **Heavy Cleave** — High damage, double crit, extra Guard break |
| **2** | **Greatsword** | 2H | Slashing | Duelist (`Valen`) | **Wide Sweep** — Reliable arc with light knockback pressure | **Overhead Rend** — Massive heavy strike, breaks extra Guard pip |
| **3** | **Rapier** | 1H | Piercing | Duelist (`Valen`) | **Needle Thrust** — Ultra-fast turn recovery, `98%` base hit | **Heart Pierce** — High crit multiplier, ignores part of armor |
| **4** | **Battleaxe** | 1H | Slashing | Bulwark (`Orin`) | **Chopping Hack** — Solid hit rate, reliable raw chop | **Execution Chop** — High crit damage vs. enemies below `50%` HP |
| **5** | **Mace** | 1H | Bludgeoning | Bulwark (`Orin`), Herbalist (`Harlan`) | **Heavy Bash** — Fast blunt hit, chips 1 Guard pip | **Armor Crush** — Heavy slam, lowers enemy Physical Defense 1 turn |
| **6** | **Spear** | 2H | Piercing | Bulwark (`Orin`) | **Long Thrust** — Precision high-reach thrust, extra accuracy & Crit | **Brace Sweep** — Heavy thrust that pushes enemies back on timeline |
| **7** | **Longbow** | 2H | Piercing | Archer (`Rowan`) | **Snap Arrow** — Fast long-range shot, high accuracy | **Aimed Piercer** — Slow drawn shot, double crit & high range pierce |
| **8** | **Shortbow** | 2H | Piercing | Archer (`Rowan`) | **Quick Volley** — Fastest ranged attack, quick turn cycle | **Wing Clip** — Pushes target slightly back on the turn timeline |
| **9** | **Dagger** | 1H | Piercing | Mystic (`Ellowyn`), Archer (`Rowan`), Herbalist (`Harlan`) | **Quick Jab** — Fast accurate cut, quick turn cycle | **Vital Gouge** — Risky thrust with high crit & Bleed chance |
| **10** | **Light Crossbow** | 2H | Piercing | Mystic (`Ellowyn`) | **Bolt Snap** — Steady armor-piercing bolt | **Siege Crank** — Heavy drawn shot + Guard pip break |
| **11** | **Quarterstaff** | 2H | Bludgeoning *(+Caster)* | Mystic (`Ellowyn`), Druid (`Mera`), Herbalist (`Harlan`) | **Staff Sweep** — Quick two-handed strike, restores a sliver of MP | **Crushing Vault** — Heavy iron-shod overhead slam, chips 1 Guard pip |
| **12** | **Scimitar** | 1H | Slashing *(+Nature)* | Druid (`Mera`) | **Crescent Cut** — Fluid high-hit curved slash | **Whirling Slash** — Crit-weighted sweep granting slight turn speed |
| **13** | **Sickle** | 1H | Slashing *(+Nature)* | Druid (`Mera`) | **Reaping Hook** — Fast curving slice with Bleed chance | **Thorn Slash** — Sharp cut that lowers target Attack 1 turn |

---

## 2. Weapon Power & Silver Curve (Steps `1`–`24`)

Base values scale smoothly across the 8 Regions so players feel a clear power jump with each Town upgrade:

* **1H Weapons (`Longsword, Rapier, Battleaxe, Mace, Dagger, Scimitar, Sickle`):** Standard `1.0×` Attack Power and `1.0×` Silver Cost (`leaves Left Hand free for any Global Shield`).
* **2H Weapons (`Greatsword, Spear, Longbow, Shortbow, Light Crossbow, Quarterstaff`):** `+25%` higher Attack Power, `+20%` Silver Cost *(uses both hands—locks Left Hand slot)*.
* **Caster Weapon Scaling (`Quarterstaff, Scimitar, Sickle`, plus `Dagger / Mace / Light Crossbow` on Casters):** Casters (**Ellowyn, Mera, Harlan**) get matching **Magic / Heal Power** from **`Quarterstaff, Scimitar, Sickle`** (`2H Quarterstaff` gives `+20%` more Magic/Heal Power than `1H`) and additional Spell Power from their Class Accessories (`Orbs`, `Crystals`, `Tomes`).

| Step | Region | Target Levels | Base 1H Attack | Base 2H Attack | Caster Magic/Heal Power | Typical 1H Price (Silver) | Where Stocked |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **1** | Region 1 | `1–4` | `6` | `8` | `+5` (`2H +6`) | `40s` *(or Starter)* | Highcrown / Oakhaven |
| **2** | Region 1 | `5–8` | `10` | `13` | `+9` (`2H +11`) | `120s` | Oakhaven / Meadowbrook Hamlet |
| **3** | Region 1 | `9–12` | `15` | `19` | `+14` (`2H +17`) | `260s` | Millbrook Crossing / Crownlands Hill-Fort |
| **4** | Region 2 | `12–15` | `21` | `26` | `+20` (`2H +24`) | `450s` | Saltwind Harbor |
| **5** | Region 2 | `16–20` | `28` | `35` | `+27` (`2H +32`) | `720s` | Brinecliff Watch-Fort / Reedfen Village |
| **6** | Region 2 | `21–24` | `36` | `45` | `+35` (`2H +42`) | `1,050s` | Mirewatch Post / Tidewater Keep |
| **7** | Region 3 | `25–28` | `45` | `56` | `+44` (`2H +53`) | `1,500s` | Redmarch Bastion / Goldmoor Village |
| **8** | Region 3 | `29–32` | `55` | `69` | `+54` (`2H +65`) | `2,100s` | Redmarch Bastion / Slatepeak Mining Fort |
| **9** | Region 3 | `33–36` | `66` | `83` | `+65` (`2H +78`) | `2,900s` | Thornwall Border Castle *(+ Hollowstone liberated)* |
| **10** | Region 4 | `37–40` | `78` | `98` | `+77` (`2H +92`) | `3,900s` | Briarstead / Timberfall Village |
| **11** | Region 4 | `41–44` | `91` | `114` | `+90` (`2H +108`) | `5,200s` | Briarstead / Mosswood Hamlet |
| **12** | Region 4 | `45–48` | `105` | `131` | `+104` (`2H +125`) | `6,800s` | Greenwarden Fort / Blightwatch Keep |
| **13** | Region 5 | `49–52` | `120` | `150` | `+119` (`2H +143`) | `8,800s` | Port Veridia / Sunstone Caravan Post |
| **14** | Region 5 | `53–56` | `136` | `170` | `+135` (`2H +162`) | `11,200s` | Port Veridia / Dunespire Oasis |
| **15** | Region 5 | `57–60` | `153` | `191` | `+152` (`2H +182`) | `14,000s` | Sandwall Citadel *(+ Gilded Manor liberated)* |
| **16** | Region 6 | `61–64` | `172` | `215` | `+171` (`2H +205`) | `17,500s` | Highpass Refuge / Clearwater Lake Village |
| **17** | Region 6 | `65–68` | `192` | `240` | `+191` (`2H +229`) | `21,500s` | Highpass Refuge / Cragwatch Fort |
| **18** | Region 6 | `69–72` | `214` | `268` | `+213` (`2H +256`) | `26,500s` | Anvilhall Forge / Stormhold Citadel |
| **19** | Region 7 | `73–76` | `238` | `298` | `+237` (`2H +284`) | `32,500s` | Rimeport / Frostmere Village |
| **20** | Region 7 | `77–80` | `264` | `330` | `+263` (`2H +316`) | `39,500s` | Rimeport / Glacierwatch Fort |
| **21** | Region 7 | `81–85` | `292` | `365` | `+291` (`2H +349`) | `48,000s` | Icecrest Holdfast *(+ Bleakwatch liberated)* |
| **22** | Region 8 | `86–90` | `324` | `405` | `+322` (`2H +386`) | `58,000s` | Ashenford War-Camp / Cinderwatch Bastion |
| **23** | Region 8 | `91–95` | `358` | `448` | `+356` (`2H +427`) | `70,000s` | Cinderwatch Bastion / Ashvale Village |
| **24** | Region 8 | `96–99` | `395` | `494` | `+394` (`2H +473`) | `85,000s` | Ashenford War-Camp / Scorchwall Fort |

---

## 3. Complete Weapon Catalog (`13` D&D Types × `24` Steps)

### Region 1: The Crownlands *(Steps `1–3` — Oakhaven & Millbrook Crossing)*
| Weapon Type | Step 1 *(Oakhaven / Start)* | Step 2 *(Oakhaven)* | Step 3 *(Millbrook Crossing)* |
| :--- | :--- | :--- | :--- |
| **Longsword** | Rusted Longsword | Iron Arming Longsword | Millbrook Broadsword |
| **Greatsword** | Pitted Claymore | Iron Greatsword | Riverguard Zweihander |
| **Rapier** | Dull Foil | Steel Rapier | Duelist's Estoc |
| **Battleaxe** | Woodman's Hatchet | Iron Bearded Axe | Crownlands Cleaver |
| **Mace** | Oak Club Mace | Iron Flanged Mace | Bridgewarden Maul |
| **Spear** | Ashwood Spear | Iron War-Spear | Millbrook Pike |
| **Longbow** | Yew Hunting Longbow | Ash Longbow | Crownland Greatbow |
| **Shortbow** | Scout's Shortbow | Sinew Shortbow | Ranger's Quickbow |
| **Dagger** | Chipped Iron Dagger | Balanced Steel Dagger | Cutthroat Dirk |
| **Light Crossbow** | Light Ash Crossbow | Iron-Latch Crossbow | Cranked Scout Arbalest |
| **Quarterstaff** | Oakwood Quarterstaff | Iron-Ferruled Quarterstaff | Millbrook Fighting Staff |
| **Scimitar** | Bronze Leaf Scimitar | Curved Forester Blade | Crownland Briar Scimitar |
| **Sickle** | Iron Herb-Sickle | Curved Field Sickle | Harvest Steel Sickle |

### Region 2: The Saltmarsh & Westward Coast *(Steps `4–6` — Saltwind Harbor, Brinecliff / Reedfen & Mirewatch Post)*
| Weapon Type | Step 4 *(Saltwind Harbor)* | Step 5 *(Brinecliff / Reedfen)* | Step 6 *(Mirewatch Post)* |
| :--- | :--- | :--- | :--- |
| **Longsword** | Sailor's Cutlass | Salt-Tempered Longsword | Marshwarden Saber |
| **Greatsword** | Deckbreaker Greatsword | Tide-Forged Greatsword | Fen-Cleaver Greatsword |
| **Rapier** | Corsair Rapier | Sea-Glass Epee | Tidecaller Needle |
| **Battleaxe** | Boarding Battleaxe | Barnacle Cleaver | Mire-Splitter Axe |
| **Mace** | Belaying Mace | Anchorhead Mace | Bog-Crusher Hammer |
| **Spear** | Harpoon Spear | Reef-Guard Spear | Bog-Stalker Pike |
| **Longbow** | Driftwood Longbow | Horn-Tipped Longbow | Saltwind Composite |
| **Shortbow** | Sea-Gull Shortbow | Reed-Bound Shortbow | Smuggler's Whisperbow |
| **Dagger** | Gutting Dagger | Bilge-Rat Dirk | Salt-Stained Stiletto |
| **Light Crossbow** | Deck Light Crossbow | Mariner Steel Arbalest | Mire-Piercer Crossbow |
| **Quarterstaff** | Driftwood Quarterstaff | Saltwind Brass-Bound Staff | Mirewarden Ironwood Staff |
| **Scimitar** | Mariner Crescent Scimitar | Brine-Edge Scimitar | Fen-Fang Scimitar |
| **Sickle** | Marsh-Reed Sickle | Brine-Steel Sickle | Mire-Root Sickle |

### Region 3: Thornwall & The Border Warfronts *(Steps `7–9` — Redmarch Bastion)*
| Weapon Type | Step 7 *(Redmarch)* | Step 8 *(Redmarch)* | Step 9 *(Redmarch)* |
| :--- | :--- | :--- | :--- |
| **Longsword** | Garrison Longsword | Redmarch Bastion Sword | Veteran's Vanguard Blade |
| **Greatsword** | Siege Greatsword | Thornwall Bastard Sword | Warfront Executioner |
| **Rapier** | Officer's Estoc | Duel-Scarred Rapier | Captain's Edge |
| **Battleaxe** | Trench Battleaxe | Redmarch War-Axe | Gatebreaker Axe |
| **Mace** | Siegebreaker Mace | Iron-Bound Flanged Mace | Bastion Greatmaul |
| **Spear** | Phalanx Spear | Borderland Partisan | Redmarch War-Spear |
| **Longbow** | Border Longbow | Ironwood War-Longbow | Watchtower Greatbow |
| **Shortbow** | Outrider Shortbow | Skirmisher Shortbow | Scout-Captain's Shortbow |
| **Dagger** | Trench Dagger | Assassin's Tantō | Hollowstone Twin-Edge |
| **Light Crossbow** | Rampart Light Crossbow | Steel-Limb Arbalest | Garrison Rapid Crossbow |
| **Quarterstaff** | Garrison Oak Quarterstaff | Redmarch Steel-Cap Staff | Bastion War-Staff |
| **Scimitar** | Border Cavalry Scimitar | Redmarch Curved Blade | Thornwall Trench Scimitar |
| **Sickle** | Trench-Iron Sickle | Borderland Hook-Sickle | Bastion War-Sickle |

### Region 4: The Verdant Weald & Plague Woods *(Steps `10–12` — Briarstead)*
| Weapon Type | Step 10 *(Briarstead)* | Step 11 *(Briarstead)* | Step 12 *(Briarstead)* |
| :--- | :--- | :--- | :--- |
| **Longsword** | Briarwood Longsword | Amber-Hilt Longsword | Elderwood Fang |
| **Greatsword** | Thorn-Etched Greatsword | Moss-Iron Claymore | Ancient Canopy Blade |
| **Rapier** | Briar Needle | Hornet-Sting Rapier | Venomthorn Estoc |
| **Battleaxe** | Timberfall Battleaxe | Sap-Tempered Cleaver | Weald-Reaper Axe |
| **Mace** | Ironwood Cudgel | Root-Knotted Mace | Oakheart Warhammer |
| **Spear** | Thorn-Tipped Spear | Stag-Horn Spear | Elderwood Long-Spear |
| **Longbow** | Briarwood Longbow | Heartwood Recurve | Canopy Greatbow |
| **Shortbow** | Leaf-Wrapped Shortbow | Stalker's Willowbow | Shadowbranch Quickbow |
| **Dagger** | Fang-Tipped Dagger | Nightshade Dirk | Briar-Claw Stiletto |
| **Light Crossbow** | Yew-Stock Light Crossbow | Thorn-Bolt Arbalest | Canopy Sniper Crossbow |
| **Quarterstaff** | Briarwood Quarterstaff | Heartwood Fighting Staff | Verdant Iron-Bound Staff |
| **Scimitar** | Thorn-Curved Scimitar | Moss-Steel Scimitar | Elderwood Leaf-Blade |
| **Sickle** | Druidic Oak Sickle | Amber-Edge Sickle | Elderwood Moon-Sickle |

### Region 5: The Sun-Scorched Isles *(Steps `13–15` — Port Veridia & Dunespire Oasis)*
| Weapon Type | Step 13 *(Port Veridia)* | Step 14 *(Port Veridia)* | Step 15 *(Dunespire Oasis)* |
| :--- | :--- | :--- | :--- |
| **Longsword** | Sun-Bronze Longsword | Mirage Steel Sword | Solarflare Blade |
| **Greatsword** | Sand-Glass Greatsword | Bronze-Gilded Claymore | Sunfire Executioner |
| **Rapier** | Golden Sand-Needle | Viper-Fang Epee | Mirage Piercer |
| **Battleaxe** | Crescent Dune Axe | Brass-Edged War-Axe | Scorched Twin-Crescent |
| **Mace** | Sun-Disk Mace | Obsidian-Studded Mace | Desert Colossus Hammer |
| **Spear** | Sand-Strider Spear | Gilded Sun-Spear | Oasis War-Spear |
| **Longbow** | Palm-Horn Longbow | Dune-Wind Composite | Sun-Crest Greatbow |
| **Shortbow** | Nomad's Horsebow | Sand-Viper Shortbow | Sirocco Quickbow |
| **Dagger** | Curved Jambiya Dagger | Obsidian Desert Dirk | Mirage Assassin Kris |
| **Light Crossbow** | Brass-Gear Light Crossbow | Desert Scorpion Arbalest | Sun-Forged Quickbow |
| **Quarterstaff** | Sun-Hardened Quarterstaff | Gilded Oasis Staff | Desert Palm Quarterstaff |
| **Scimitar** | Bronze Dune Scimitar | Mirage Shamshir | Oasis Golden Scimitar |
| **Sickle** | Sun-Brass Sickle | Glasswind Crescent Sickle | Oasis Solar Sickle |

### Region 6: The Ironcrest Peaks *(Steps `16–18` — Highpass Refuge & Anvilhall Forge)*
| Weapon Type | Step 16 *(Highpass Refuge)* | Step 17 *(Highpass Refuge)* | Step 18 *(Anvilhall Forge)* |
| :--- | :--- | :--- | :--- |
| **Longsword** | Highland Steel Longsword | Storm-Quenched Longsword | Anvilhall Mythril Blade |
| **Greatsword** | Crag-Splitter Greatsword | Thunder-Forged Blade | Titan-Peak Claymore |
| **Rapier** | Wind-Edge Rapier | Silver-Peak Estoc | Lightning-Etched Needle |
| **Battleaxe** | Peak-Cleaver Axe | Granite-Biter War-Axe | Anvilhall Runed Axe |
| **Mace** | Quarry Maul Mace | Crag-Breaker Mace | Master-Smith's Greatmaul |
| **Spear** | Cliff-Guard Spear | Skybridge Lance Spear | Storm-Peak War-Spear |
| **Longbow** | Ridge-Horn Longbow | Eagle-Eye Greatbow | Storm-String Composite |
| **Shortbow** | Crag-Jumper Shortbow | Gale-Wing Shortbow | Falcon-Strike Quickbow |
| **Dagger** | Flint-Edge Dagger | Sky-Talon Dirk | Mythril Twin Stiletto |
| **Light Crossbow** | Crag-Winch Crossbow | Silver-Spring Arbalest | Thunder-Latch Crossbow |
| **Quarterstaff** | Highland Pine Quarterstaff | Anvilhall Steel-Shod Staff | Storm-Iron Battle Staff |
| **Scimitar** | Ridge-Steel Scimitar | Thunder-Curved Scimitar | Anvilhall Silver Scimitar |
| **Sickle** | Flint Ridge Sickle | Storm-Forged Sickle | Anvilhall Mythril Sickle |

### Region 7: The Frostbound Reach *(Steps `19–21` — Rimeport)*
| Weapon Type | Step 19 *(Rimeport)* | Step 20 *(Rimeport)* | Step 21 *(Rimeport)* |
| :--- | :--- | :--- | :--- |
| **Longsword** | Rime-Iron Longsword | Frost-Etched Longsword | Glacier-Edge Blade |
| **Greatsword** | Icebreaker Greatsword | Frozen Fjord Claymore | Pale-Abyss Greatblade |
| **Rapier** | Icicle Estoc | Cold-Steel Needle | Frostbite Rapier |
| **Battleaxe** | Ice-Carver Axe | Northern Wolf-Axe | Rimefang Executioner |
| **Mace** | Frost-Bound Mace | Glacial Crusher Mace | Permafrost Warhammer |
| **Spear** | Glacier Spear | Boreal Trident-Spear | Frostguard War-Spear |
| **Longbow** | White-Pine Longbow | Glacial Hornbow | Boreal Wind Greatbow |
| **Shortbow** | Snow-Stalker Shortbow | Tundra Quickbow | Winter-Fang Shortbow |
| **Dagger** | Ice-Shard Dagger | Frost-Fang Dirk | Silent-Snow Stiletto |
| **Light Crossbow** | Ice-Lock Light Crossbow | Bleakwatch Quick Arbalest | Boreal Bolt-Thrower |
| **Quarterstaff** | Frostpine Quarterstaff | Rime-Bound Iron Staff | Boreal Warden Quarterstaff |
| **Scimitar** | Frost-Iron Scimitar | Tundra Moon Scimitar | Boreal Glacier Scimitar |
| **Sickle** | Ice-Carved Sickle | Frostfang Hook-Sickle | Pale-Winter Sickle |

### Region 8: The Dreadwaste & Garrick's Citadel *(Steps `22–24` — Ashenford War-Camp)*
| Weapon Type | Step 22 *(Ashenford)* | Step 23 *(Ashenford)* | Step 24 *(Ashenford Endgame)* |
| :--- | :--- | :--- | :--- |
| **Longsword** | Ashen-Steel Longsword | Crimson-Oath Sword | **Sovereign's Edge** |
| **Greatsword** | Dreadwaste Greatsword | Wolf-Bane Zweihander | **Koren's Reckoning** |
| **Rapier** | Obsidian Estoc | Blood-Moon Rapier | **Eclipse Heartseeker** |
| **Battleaxe** | Ash-Forged Battleaxe | Skull-Splitter Axe | **Executioner's Judgment** |
| **Mace** | Siege-Breaker Mace | Dread-Iron Warhammer | **Citadel Shatterer** |
| **Spear** | War-Camp War-Spear | Black-Keep Partisan | **Dragonspine Spear** |
| **Longbow** | Ashen-Yew Longbow | Shadow-Piercer Bow | **Horizon Starbow** |
| **Shortbow** | Nightwatch Shortbow | Gale-Heart Quickbow | **Phantom Shortbow** |
| **Dagger** | Shadow-Steel Dagger | Night-Viper Dirk | **Whispering Eclipse Dagger** |
| **Light Crossbow** | Dread-Latch Crossbow | Eclipse Quick-Arbalest | **Starlight Bolt-Thrower** |
| **Quarterstaff** | Ashenwood Quarterstaff | Lifebinder's Ironwood Staff | **Harlan's Lifebinder Staff** |
| **Scimitar** | Obsidian Ash Scimitar | Wild-Eclipse Scimitar | **Primal Dawn Scimitar** |
| **Sickle** | Ash-Steel Sickle | Lifeblood Briar Sickle | **Moonblade Crescent Sickle** |

---

## 4. Armor (`23` Shared Types), Global Shields (`6` Types) & Class Accessories

Each hero wears **Helmet** + **Body** (choosing from `6` Armor Types per class, `4` Body + `4` Helmets per type = exact `24`-step progression without duplicating shared sets), wields a **Right-Hand Weapon**, holds a **Global Shield** (`6` types × `4` tiers, usable by **any class wielding a `1H` weapon**), and equips **1 Class Accessory** (`Cloak`, `Orb`, `Horn`, `Quiver`, `Crystal`, or `Tome`).

### A. Armor Weights *(~65% Body / ~35% Helmet Split · Body Carries 1 Runestone Socket)*
| Weight | Combat Profile |
| :--- | :--- |
| **Heavy** | Highest Physical Defense (`100%`), lower Magic Defense (`50%`), slight `-2` Timeline Speed trade-off; Heavy Helmets add `+10%–25%` Stun & Pushback resist. |
| **Medium** | Balanced Physical (`75%`) & Magic (`75%`) Defense, `0` Speed penalty; Medium Helmets add `+2%–8%` Accuracy & Critical Chance. |
| **Light** | Highest Magic Defense (`100%`), lower Physical Defense (`45%`), `+Max MP` and `+2` Timeline Speed bonus; Light Helmets add bonus `+Max MP`. |

### B. Class Accessory Profiles *(`1` Accessory Slot Per Hero · `24`-Step Progression)*
| Accessory Type | Usable By | Combat Profile |
| :--- | :--- | :--- |
| **Cloaks** | Duelist (`Valen`) | Boosts Turn Timeline Speed, Dodge Chance & Critical Chance. |
| **Orbs** | Mystic (`Ellowyn`) | Boosts Magic Power, Spell Crit Chance & Turn Timeline Speed. |
| **Horns** | Bulwark (`Orin`) | Boosts Grit, Physical Defense & Guard mitigation bonus. |
| **Quivers** | Archer (`Rowan`) | Boosts Piercing Attack Power & Critical Damage. |
| **Crystals** | Druid (`Mera`) | Boosts Magic Power, Max MP & Nature/Status potency. |
| **Tomes** | Herbalist (`Harlan`) | Boosts Healing Power, Max MP & Status Ailment Resistance. |

### C. Combined Defense & Price Curve (Steps `1`–`24`)
* **Armor Split Across Both Slots:** Values below show the **combined** Step total (`Body + Helmet`)—in town shops, **Body Armor** provides ~`65%` of the stats & price and **Helmets** provide ~`35%`, so equipping a matching pair hits the exact balanced baseline.
* **Shield / Class Accessory Silver Cost:** Roughly `0.65×` of a 1H Weapon at the same Step (`25s` at Step 1 $\to$ `55,000s` at Step 24).

| Step | Region | Heavy P.Def / M.Def | Medium P.Def / M.Def | Light P.Def / M.Def *(+MP)* | Shield P.Def | Body + Helmet Price | Shield / Accessory Price |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | Region 1 | `6 / 3` | `5 / 5` | `3 / 6` *(+5 MP)* | `+4` | `35s` | `25s` |
| **2** | Region 1 | `10 / 5` | `8 / 8` | `5 / 10` *(+8 MP)* | `+6` | `110s` | `80s` |
| **3** | Region 1 | `15 / 7` | `12 / 12` | `7 / 15` *(+10 MP)* | `+9` | `230s` | `170s` |
| **4** | Region 2 | `21 / 10` | `16 / 16` | `9 / 21` *(+13 MP)* | `+13` | `400s` | `290s` |
| **5** | Region 2 | `28 / 14` | `21 / 21` | `13 / 28` *(+16 MP)* | `+17` | `650s` | `470s` |
| **6** | Region 2 | `36 / 18` | `27 / 27` | `16 / 36` *(+19 MP)* | `+22` | `950s` | `680s` |
| **7** | Region 3 | `45 / 22` | `34 / 34` | `20 / 45` *(+22 MP)* | `+27` | `1,350s` | `975s` |
| **8** | Region 3 | `55 / 27` | `41 / 41` | `25 / 55` *(+25 MP)* | `+33` | `1,900s` | `1,360s` |
| **9** | Region 3 | `66 / 33` | `50 / 50` | `30 / 66` *(+28 MP)* | `+40` | `2,600s` | `1,880s` |
| **10** | Region 4 | `78 / 39` | `59 / 59` | `35 / 78` *(+31 MP)* | `+47` | `3,500s` | `2,500s` |
| **11** | Region 4 | `91 / 45` | `68 / 68` | `41 / 91` *(+34 MP)* | `+55` | `4,700s` | `3,400s` |
| **12** | Region 4 | `105 / 52` | `79 / 79` | `47 / 105` *(+37 MP)* | `+63` | `6,100s` | `4,400s` |
| **13** | Region 5 | `120 / 60` | `90 / 90` | `54 / 120` *(+40 MP)* | `+72` | `7,900s` | `5,700s` |
| **14** | Region 5 | `136 / 68` | `102 / 102` | `61 / 136` *(+43 MP)* | `+82` | `10,000s` | `7,300s` |
| **15** | Region 5 | `153 / 76` | `115 / 115` | `69 / 153` *(+46 MP)* | `+92` | `12,600s` | `9,100s` |
| **16** | Region 6 | `172 / 86` | `129 / 129` | `77 / 172` *(+49 MP)* | `+103` | `15,800s` | `11,400s` |
| **17** | Region 6 | `192 / 96` | `144 / 144` | `86 / 192` *(+52 MP)* | `+115` | `19,400s` | `14,000s` |
| **18** | Region 6 | `214 / 107` | `161 / 161` | `96 / 214` *(+55 MP)* | `+128` | `24,000s` | `17,200s` |
| **19** | Region 7 | `238 / 119` | `179 / 179` | `107 / 238` *(+58 MP)* | `+143` | `29,000s` | `21,000s` |
| **20** | Region 7 | `264 / 132` | `198 / 198` | `119 / 264` *(+61 MP)* | `+158` | `35,500s` | `25,600s` |
| **21** | Region 7 | `292 / 146` | `219 / 219` | `131 / 292` *(+64 MP)* | `+175` | `43,000s` | `31,200s` |
| **22** | Region 8 | `324 / 162` | `243 / 243` | `146 / 324` *(+68 MP)* | `+194` | `52,000s` | `37,700s` |
| **23** | Region 8 | `358 / 179` | `269 / 269` | `161 / 358` *(+72 MP)* | `+215` | `63,000s` | `45,500s` |
| **24** | Region 8 | `395 / 198` | `296 / 296` | `178 / 395` *(+78 MP)* | `+237` | `78,000s` | `55,000s` |

---

### D. Complete Shared Armor & Helmet Catalog *(`23` Types × `4` Body + `4` Helmets = `92` Body + `92` Helmets)*

| Armor Type | Weight | Steps | Slot | Usable By | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
| :--- | :---: | :---: | :---: | :--- | :--- | :--- | :--- | :--- |
| **Leather** | Light | `1, 2, 3, 4` | Body | Valen, Rowan, Mera | Traveler's Leather Jerkin | Frontier Leather Coat | Tempered Leather Vest | Veteran Leather Cuirass |
| **Leather** | Light | `1, 2, 3, 4` | Helmet | Valen, Rowan, Mera | Leather Skullcap | Scout's Leather Cap | Hardened Leather Hood | Ranger Leather Cowl |
| **Padded Leather** | Light | `5, 6, 7, 8` | Body | Valen, Rowan, Mera | Quilted Leather Jacket | Saltwind Padded Coat | Redmarch Padded Jerkin | Warden Padded Hauberk |
| **Padded Leather** | Light | `5, 6, 7, 8` | Helmet | Valen, Rowan, Mera | Padded Leather Cap | Stitched Leather Hood | Border Padded Coif | Guard Padded Helm |
| **Studded Leather** | Light | `9, 10, 11, 12` | Body | Valen, Rowan, Mera | Iron-Studded Jerkin | Briar Studded Coat | Steel-Riveted Leather | Master Studded Brigandine |
| **Studded Leather** | Light | `9, 10, 11, 12` | Helmet | Valen, Rowan, Mera | Studded Leather Cap | Riveted Leather Coif | Briar Studded Hood | Master Studded Cowl |
| **Spiked Leather** | Light | `13, 14, 15, 16` | Body | Valen, Rowan | Desert Spiked Leather | Sun-Thorn Jerkin | Barbed Arena Coat | Highpass Spiked Armor |
| **Spiked Leather** | Light | `13, 14, 15, 16` | Helmet | Valen, Rowan | Spiked Leather Cap | Arena Horned Coif | Barbed Leather Mask | Highpass Spiked Hood |
| **Breastplate** | Medium | `17, 18, 19, 20` | Body | Valen | Crag-Steel Breastplate | Mythril-Trimmed Breastplate | Rime-Steel Cuirass | Frostguard Breastplate |
| **Breastplate** | Medium | `17, 18, 19, 20` | Helmet | Valen | Highland Open Barbute | Anvilhall Crest Helm | Rime-Steel Sallet | Frostguard Visor |
| **Half Plate** | Medium | `21, 22, 23, 24` | Body | Valen | Glacial Half Plate | Ashen-Steel Half Plate | Crimson-Oath Half Plate | **Sovereign Royal Half Plate** |
| **Half Plate** | Medium | `21, 22, 23, 24` | Helmet | Valen | Glacial Close Helm | Ashen-Steel Armet | Crimson-Oath Greathelm | **Crown Duelist Helm** |
| **Reinforced Leather** | Medium | `17, 18, 19, 20` | Body | Rowan | Charred-Copper Jerkin | Ember-Burnished Leather | Scorched Copper Coat | Tarnished Copper Cuirass |
| **Reinforced Leather** | Medium | `17, 18, 19, 20` | Helmet | Rowan | Copper-Dyed Hood | Charred Leather Mask | Burnt-Copper Coif | Ash-Hunter Visor |
| **Leather Plate** | Medium | `21, 22, 23, 24` | Body | Rowan | Charred-Silver Leather Plate | Ash-Tempered Coat | Eclipse-Burnt Plate | **Sovereign Shadow-Leather** |
| **Leather Plate** | Medium | `21, 22, 23, 24` | Helmet | Rowan | Silver-Charred Mask | Ash-Silver Hood | Pale-Charcoal Helm | **Horizon Scout Cowl** |
| **Hide** | Medium | `1, 2, 3, 4` | Body | Orin | Rough Boar-Hide Tunic | Thick Elk-Hide Vest | Crownland Bull-Hide | Harbor Sea-Hide Coat |
| **Hide** | Medium | `1, 2, 3, 4` | Helmet | Orin | Boar-Hide Cap | Elk-Hide Coif | Horned Hide Hood | Saltwind Hide Helm |
| **Scale Mail** | Medium | `5, 6, 7, 8` | Body | Orin | Saltwind Scale Mail | Mire-Iron Scale Coat | Redmarch Bronze Scale | Bastion Steel Scale |
| **Scale Mail** | Medium | `5, 6, 7, 8` | Helmet | Orin | Scale-Cheeked Nasal | Brine Scale Bascinet | Garrison Scale Barbute | Bastion Scale Helm |
| **Ring Mail** | Heavy | `9, 10, 11, 12` | Body | Orin | Thornwall Ring Mail | Iron-Ringed Hauberk | Amber-Linked Ring Mail | Elderwood Ring Armor |
| **Ring Mail** | Heavy | `9, 10, 11, 12` | Helmet | Orin | Thornwall Ring Coif | Iron-Ringed Sallet | Briar Ring Barbute | Elderwood Ring Helm |
| **Chain Mail** | Heavy | `13, 14, 15, 16` | Body | Orin | Veridian Chain Mail | Sun-Forged Chain Hauberk | Sandwall Siege Chain | Ironcrest Heavy Chain |
| **Chain Mail** | Heavy | `13, 14, 15, 16` | Helmet | Orin | Veridian Chain Coif | Sun-Forged Greathelm | Sandwall Chain Helm | Highpass Chain Visor |
| **Splint** | Heavy | `17, 18, 19, 20` | Body | Orin | Crag-Iron Splint | Anvilhall Mythril Splint | Rime-Bound Splint | Glacierwall Splint |
| **Splint** | Heavy | `17, 18, 19, 20` | Helmet | Orin | Crag-Iron Kettle Helm | Anvilhall Splint Greathelm | Rime-Bound Visor | Glacierwall Armet |
| **Plate** | Heavy | `21, 22, 23, 24` | Body | Orin | Bleakwatch War-Plate | Ashen-Iron Full Plate | Black-Keep Siege Plate | **Bastion of the First King** |
| **Plate** | Heavy | `21, 22, 23, 24` | Helmet | Orin | Bleakwatch Warhelm | Ashen-Iron Greathelm | Black-Keep Full Visor | **Crown of the First King** |
| **Simple Robes** | Light | `1, 2, 3, 4` | Body | Ellowyn, Harlan | Linen Travel Robes | Simple Apprentice Robes | Crownland Cloth Robes | Harbor Wool Robes |
| **Simple Robes** | Light | `1, 2, 3, 4` | Helmet | Ellowyn, Harlan | Simple Linen Hood | Plain Cloth Cowl | Wanderer's Cap | Saltwind Wool Hood |
| **Fine Robes** | Light | `5, 6, 7, 8` | Body | Ellowyn | Trimmed Fine Robes | Dyed Velvet Robes | Redmarch Fine Mantle | Noble Thread Robes |
| **Fine Robes** | Light | `5, 6, 7, 8` | Helmet | Ellowyn | Fine Silk Fillet | Copper Circlet | Redmarch Hood | Noble Velour Cowl |
| **Padded Robes** | Light | `6, 8, 10, 12` | Body | Ellowyn, Harlan | Quilted Hemp Robes | Marsh-Padded Mantle | Garrison Padded Robes | Briar-Lined Padded Coat |
| **Padded Robes** | Light | `6, 8, 10, 12` | Helmet | Ellowyn, Harlan | Quilted Linen Cap | Soft Padded Hood | Garrison Padded Cowl | Briar Padded Circlet |
| **Silk Robes** | Light | `10, 12, 14, 16` | Body | Ellowyn, Harlan | Weald Silk Robes | Golden-Thread Silk Robes | Oasis Star-Silk Mantle | Storm-Woven Silk Robes |
| **Silk Robes** | Light | `10, 12, 14, 16` | Helmet | Ellowyn, Harlan | Weald Silk Veil | Silver Silk Band | Oasis Silk Crownlet | Highpass Silk Diadem |
| **Widowsilk Robes** | Light | `13, 14, 15, 16` | Body | Mera, Harlan | Dune-Web Widowsilk | Black-Spun Widowsilk | Velvet Widowsilk Mantle | Frost-Spun Widowsilk |
| **Widowsilk Robes** | Light | `13, 14, 15, 16` | Helmet | Mera, Harlan | Web-Spun Hood | Black-Silk Cowl | Spider-Thread Veil | Crystal Widowsilk Crown |
| **Padded Bone** | Medium | `17, 18, 19, 20` | Body | Mera, Harlan | Carved Rib-Bone Coat | Highland Padded Bone | Tundra-Hide Bone Armor | Frost-Stitched Bone Vest |
| **Padded Bone** | Medium | `17, 18, 19, 20` | Helmet | Mera, Harlan | Carved Bone Mask | Highland Bone Hood | Ivory Bone Coif | Frost-Bone Circlet |
| **Reinforced Bone** | Medium | `21, 22, 23, 24` | Body | Mera, Harlan | Giant-Skull Bone Plate | Ashen-Carved Bone Armor | Dreadwaste Ossuary Coat | **Sovereign Bone Vestments** |
| **Reinforced Bone** | Medium | `21, 22, 23, 24` | Helmet | Mera, Harlan | Skull-Crested Mask | Ashen Bone Crown | Ossuary War-Hood | **Lifebinder's Bone Diadem** |
| **Scale Plate** | Medium | `17, 18, 19, 20` | Body | Ellowyn | Wyvern-Scale Mantle | Drake-Crest Scale Plate | Storm-Scale Mystic Plate | Boreal Scale Armor |
| **Scale Plate** | Medium | `17, 18, 19, 20` | Helmet | Ellowyn | Wyvern-Scale Diadem | Drake-Crest Crown | Storm-Scale Circlet | Boreal Scale Tiara |
| **Dragonscale** | Medium | `21, 22, 23, 24` | Body | Ellowyn | Blue-Wyrm Dragonscale | Crimson Dragonscale Coat | Shadow-Wyrm Dragonscale | **Sovereign Dawn Dragonscale** |
| **Dragonscale** | Medium | `21, 22, 23, 24` | Helmet | Ellowyn | Blue-Wyrm Coronet | Crimson Wyrm Crown | Shadow-Wyrm Tiara | **Circlet of the First Dawn** |

---

### E. Complete Global Shields Catalog *(`6` Types × `4` Tiers = `24` Shields · All Classes w/ `1H` Weapon)*

| Shield Type | Weight | Steps | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
| :--- | :---: | :---: | :--- | :--- | :--- | :--- |
| **Buckler** | Light | `1, 2, 3, 4` | Cracked Wood Buckler | Iron-Rimmed Buckler | Crownland Steel Buckler | Saltwind Brass Buckler |
| **Round Shield** | Light | `5, 6, 7, 8` | Oak-Plank Round Shield | Mire-Iron Round Shield | Redmarch Bronze Round | Veteran's Steel Round |
| **Heater Shield** | Medium | `9, 10, 11, 12` | Thornwall Crest Heater | Briarwood Steel Heater | Amber-Bound Heater | Greenwarden Heater |
| **Kite Shield** | Medium | `13, 14, 15, 16` | Veridian Bronze Kite | Sun-Crest Caravan Kite | Highpass Steel Kite | Storm-Rim Kite Shield |
| **Spiked Shield** | Heavy | `17, 18, 19, 20` | Crag-Tooth Spiked Shield | Anvilhall Mythril Spiked | Rime-Iron Barbed Shield | Glacierwall Spiked Bulwark |
| **Tower Shield** | Heavy | `21, 22, 23, 24` | Bleakwatch Wall Shield | Ashen-Steel Tower Shield | Black-Keep Pavise Tower | **Aegis of the Crown** |

---

### F. Complete Class Accessories Catalog *(`6` Types × `24` Steps = `144` Items · `1` Slot)*

#### Region 1: The Crownlands *(Steps `1–3`)*
| Category | Step 1 | Step 2 | Step 3 |
| :--- | :--- | :--- | :--- |
| **Cloak** | Tattered Travel Cloak | Oakhaven Wool Cloak | Millbrook Duelist Cape |
| **Orb** | Cracked Glass Orb | Amber Focus Orb | Crownland Star-Orb |
| **Horn** | Wooden Watch-Horn | Brass Garrison Horn | Crownland Bugle-Horn |
| **Quiver** | Torn Leather Quiver | Fletched Scout Quiver | Hardened Yew Quiver |
| **Crystal** | Chipped Quartz Crystal | Moss-Lit Shard | Crownland Verdant Crystal |
| **Tome** | Linen Herbal Tome | Stitched Field Primer | Crownland Herbal Ledger |

#### Region 2: The Saltmarsh & Westward Coast *(Steps `4–6`)*
| Category | Step 4 | Step 5 | Step 6 |
| :--- | :--- | :--- | :--- |
| **Cloak** | Waxed Mariner Cloak | Saltwind Storm-Cape | Mirewatch Oilskin Cloak |
| **Orb** | Brine-Pearl Sphere | Sea-Glass Globe | Tidestone Crystal Orb |
| **Horn** | Conch Fog-Horn | Harbor Brass Horn | Mirewarden Iron Horn |
| **Quiver** | Waterproof Seal Quiver | Gull-Feather Quiver | Mire-Hunter Case |
| **Crystal** | Sea-Salt Prism Crystal | Brine-Moss Crystal | Fen-Amber Crystal |
| **Tome** | Mariner's Tide-Tome | Sea-Kelp Herbarium | Mire-Antidote Ledger |

#### Region 3: Thornwall & The Border Warfronts *(Steps `7–9`)*
| Category | Step 7 | Step 8 | Step 9 |
| :--- | :--- | :--- | :--- |
| **Cloak** | Ash-Dyed Border Cloak | Redmarch Crimson Cape | Vanguard Silk Mantle |
| **Orb** | Smoke-Quartz Sphere | War-Chanter Orb | Redmarch Focus Globe |
| **Horn** | Iron Signal-Horn | Redmarch War-Horn | Bastion Great-Horn |
| **Quiver** | Garrison Arrow-Tube | Steel-Capped Quiver | Border-Captain's Quiver |
| **Crystal** | Slate-Bound Crystal | Amber-Vein Crystal | Redmarch Storm-Shard |
| **Tome** | Battlefield Triage Tome | Cinder-Ink Compendium | Bastion Field Codex |

#### Region 4: The Verdant Weald & Plague Woods *(Steps `10–12`)*
| Category | Step 10 | Step 11 | Step 12 |
| :--- | :--- | :--- | :--- |
| **Cloak** | Fern-Dyed Ranger Cloak | Briar-Thorn Mantle | Elderwood Canopy Cloak |
| **Orb** | Amber-Sap Sphere | Dewdrop Crystal Orb | Elderwood Star-Globe |
| **Horn** | Carved Stag-Horn | Timberfall Oak Horn | Elderwood Ivory Horn |
| **Quiver** | Bark-Wrapped Quiver | Willow-Woven Quiver | Phantom-Leaf Case |
| **Crystal** | Heartwood Sap Crystal | Emerald Weald Crystal | Ancient Grove Prism |
| **Tome** | Herbalist's Lore Tome | Amber-Leaf Codex | Elderwood Panacea Tome |

#### Region 5: The Sun-Scorched Isles *(Steps `13–15`)*
| Category | Step 13 | Step 14 | Step 15 |
| :--- | :--- | :--- | :--- |
| **Cloak** | Sun-Bleached Sand Cloak | Gilded Veridia Cape | Mirage Silk Shawl |
| **Orb** | Sun-Glass Sphere | Topaz Mirage Orb | Solar Prism Globe |
| **Horn** | Sand-Bronze Hunting Horn | Sun-Gilded Battle Horn | Dunespire Ram-Horn |
| **Quiver** | Camel-Hide Quiver | Gilded Brass Tube | Sirocco Winged Quiver |
| **Crystal** | Sunstone Shard Crystal | Topaz Desert Crystal | Solar Hearth Crystal |
| **Tome** | Sun-Dial Field Tome | Oasis Tincture Codex | Solar-Flare Lexicon |

#### Region 6: The Ironcrest Peaks *(Steps `16–18`)*
| Category | Step 16 | Step 17 | Step 18 |
| :--- | :--- | :--- | :--- |
| **Cloak** | Wolf-Fur Travel Cloak | Storm-Weave Cape | Anvilhall Silver Mantle |
| **Orb** | Thunder-Quartz Orb | Silver-Core Sphere | Anvilhall Prism Globe |
| **Horn** | Ram-Horn Signal Trumpet | Highland Steel Horn | Anvilhall Thunder-Horn |
| **Quiver** | Mountain-Horn Quiver | Eagle-Plume Case | Gale-Wing Mythril Quiver |
| **Crystal** | Storm-Quartz Crystal | Silver-Peak Crystal | Sky-Heart Gem Crystal |
| **Tome** | Alpine-Herb Folio | Mineral-Salve Compendium | Anvilhall Runic Tome |

#### Region 7: The Frostbound Reach *(Steps `19–21`)*
| Category | Step 19 | Step 20 | Step 21 |
| :--- | :--- | :--- | :--- |
| **Cloak** | Rime-Lined Wolf Cloak | Tundra Snow-Mantle | Boreal Starlight Cape |
| **Orb** | Frosted Glass Sphere | Boreal Ice-Orb | Pale-Star Crystal Globe |
| **Horn** | Carved Ivory Mammoth-Horn | Frostguard War-Horn | Pale-Ice Great-Horn |
| **Quiver** | Fur-Lined Quiver | Glacial Horn Case | Boreal Wind Quiver |
| **Crystal** | Glacial Ice Crystal | Boreal Frost Crystal | Winter-Moon Prism |
| **Tome** | Frost-Script Folio | Ice-Bound Herbarium | Glacial Elixir Tome |

#### Region 8: The Dreadwaste & Garrick's Citadel *(Steps `22–24`)*
| Category | Step 22 | Step 23 | Step 24 |
| :--- | :--- | :--- | :--- |
| **Cloak** | Ashen-Hide Cloak | Crimson-Oath Cape | **Sovereign Duelist Cloak** |
| **Orb** | Void-Glass Sphere | Eclipse Rift Orb | **Heart of the First Dawn** |
| **Horn** | Dread-Iron War-Horn | Crimson-Steel Bugle | **War-Horn of the Crown** |
| **Quiver** | Ashen-Hide Quiver | Shadow-Feather Case | **Horizon Star-Quiver** |
| **Crystal** | Volcanic Obsidian Crystal | Wild-Eclipse Crystal | **Seed-Heart Crystal** |
| **Tome** | Ash-Ward Triage Tome | Lifebinder's Folio | **Codex of the First Dawn** |

---

## 5. Procedural Carved Runestones *(Prefix / Suffix Drops)*

### A. How Quest Runestones Work
* **Lore Hook:** Ties straight back to the mysterious *"smuggled dark stone"* from [backstory.txt](../backstory.txt)—weathered tablets of slate, basalt, bone, or obsidian etched with glowing runes.
* **1 Permanent Runestone Socket on Every Weapon & Body Armor:** Every Weapon and Body Armor piece has **1 socket**. Slotting a Runestone into an empty socket is free anytime from the Equipment menu.
* **Permanent Binding & Overwrite Rule (No Extraction):** Runestones **cannot be removed or reclaimed** once socketed, and there are **no Runesmith NPCs**. Inserting a **new Runestone** onto an already-occupied socket **overwrites and destroys the old Runestone** *(with a clear confirmation prompt)*, making every replacement a high-stakes choice.
* **Pick 1 of 3 Procedural Quest Draft:** Completing any quest opens a 3-card Runestone Draft that **procedurally generates 3 distinct Runestones** scaled to the Region's tier by rolling **Prefixes + Suffixes** from the pools below (`name format: "[Prefix] Runestone [of Suffix]"`, e.g., *Vampiric Runestone of Alacrity*, or multi-affix rolls like *Arcing Echoing Runestone of Precision & Brutality*).
* **100% Pure Combat Effects:** No non-combat economy affixes—every Prefix and Suffix directly impacts combat. Unwanted Runestones can be **sold to merchants for Silver** (`Runestones cannot be crafted, extracted, or rerolled in shops`).

#### Runestone Rarity Tiers Across the 8 Regions
| Tier | Regions | Roll Formula | Strength Scale |
| :--- | :--- | :--- | :---: |
| **Lesser** | Regions `1–2` | `1` Prefix + `1` Suffix | Base Tier (`1×`) |
| **Refined** | Regions `3–4` | `1` Prefix + `1` Suffix | Strong Tier (`~1.5×`) |
| **Greater** | Regions `5–6` | `2` Prefixes + `1` Suffix **or** `1` Prefix + `2` Suffixes | High Tier (`~2×`) |
| **Mythic** | Regions `7–8` | `2` Prefixes + `2` Suffixes | Endgame Tier (`~2.5×`) |

---

### B. Weapon Prefixes *(Combat Triggers & Conversions — Weapon Socket)*
| Prefix Name | Combat Effect *(Scales Lesser $\to$ Mythic)* |
| :--- | :--- |
| **Blazing** | Strikes deal bonus **Fire** damage (`+12%–25%`), splash `35%` to an adjacent enemy, and chance to **Burn**. |
| **Glacial** | Strikes deal bonus **Frost** damage (`+12%–25%`) and apply **Chill**, pushing targets back on the timeline. |
| **Arcing** | Strikes deal bonus **Lightning** damage (`+12%–25%`) that chains to a 2nd enemy with a **Shock** chance. |
| **Venomous** | Strikes deal bonus **Poison** damage (`+12%–25%`); poisoned foes deal `10%–18%` less physical damage. |
| **Hallowed** | Strikes deal bonus **Radiant** damage (`+15%–32%` vs. Undead & Portal Horrors) and purge `1` enemy buff on crit. |
| **Detonating** | Hitting an enemy suffering **Burn, Bleed, or Poison** detonates `25%–50%` of remaining over-time damage immediately. |
| **Vampiric** | Attacks & skills heal the user for `8%–18%` of damage dealt. |
| **Siphoning** | Attacks & skills restore `2–7 MP` per hit *(doubled on Weakness or Critical hits)*. |
| **Crushing** | `0 MP` Attack Modes chip **+1 extra Guard pip** and lower enemy Defense by `10%–22%` for 2 turns. |
| **Rending** | Weapon Critical Hits inflict heavy **Bleed** (`3 turns`) and deal `+15%–32%` bonus damage vs. Bleeding foes. |
| **Executioner's** | Deal `+20%–42%` bonus weapon damage to enemies below `40% HP` or **Staggered**. |
| **Echoing** | `15%–32%` chance for single-target `0 MP` attacks to strike a second time at `50%` power. |

---

### C. Body Armor Prefixes *(Survival, Counter & Resolve Mechanics — Body Armor Socket)*
| Prefix Name | Combat Effect *(Scales Lesser $\to$ Mythic)* |
| :--- | :--- |
| **Bastion's** | Enter every battle with a protective **Ward Shield** (`12%–30%` Max HP). |
| **Retaliating** | Reflect `18%–38%` of incoming melee damage back onto attackers and chip `1` Guard pip when hit while Battered. |
| **Resolve-Heart** | Gain `+18%–38%` damage & healing potency whenever HP is below `50%` (**Battered**). |
| **Sanctified** | Gain `25%–60%` resistance to **all Status Ailments & Stun**, and heal `3%–6%` HP when an ailment fails or expires. |
| **Vanguard's** | Taking the **Guard** action restores `6%–15%` Max HP + `4–10 MP` and pushes your next turn forward on the timeline. |
| **Unbreakable** | Once per battle, survive a fatal hit at `1 HP` and immediately gain a `10%–25%` **Ward Shield**. |
| **Overflowing** | Excess healing above `100%` Max HP converts into a protective **Ward Shield** *(up to `15%–30%` Max HP)*. |
| **Phantom's** | Gain `+6%–16%` Dodge Chance, and dodging an attack immediately grants **Momentum** (`+25%` next hit). |
| **Adaptive** | Taking elemental/magic damage grants a `25%–55%` resistance barrier against that element for `2` turns. |
| **Martyr's** | When an adjacent ally is hit below `40% HP`, intercept `25%–40%` of the hit with `15%` damage reduction. |

---

### D. Universal Suffixes *(Combat Stats & Perks — Roll on Any Runestone)*
| Suffix Name | Stat & Combat Bonus *(Scales Lesser $\to$ Mythic)* |
| :--- | :--- |
| **of Alacrity** | `+3 to +14` **Turn Timeline Speed** & `+3 to +12` opening battle Initiative. |
| **of Precision** | `+3% to +14%` **Critical Chance** & `+5% to +18%` **Accuracy**. |
| **of Brutality** | `+12% to +45%` **Critical Damage** multiplier. |
| **of Piercing** | Attacks & spells ignore `10%–30%` of enemy Physical & Magic Defense. |
| **of Vitality** | `+30 to +280` **Max HP** & recover `3%–8%` HP after battle victories. |
| **of the Magus** | `+10 to +90` **Max MP** & `-5% to -15%` spell/remedy MP cost. |
| **of Momentum** | Landing a kill or Critical Hit grants **Momentum** (`+25%` next hit or spell). |
| **of Mending** | `+8% to +28%` **Healing & Shielding Power** *(both cast and received)*. |
| **of Might** | `+2 to +16` **Force** & `+3% to +12%` Guard-break power. |
| **of Cunning** | `+2 to +16` **Finesse** & `+2% to +10%` Dodge Chance. |
| **of Iron** | `+2 to +16` **Grit** & `+6 to +65` Physical Defense. |
| **of Wisdom** | `+2 to +16` **Arcana & Presence** & `+6 to +65` Magic Defense. |

---

## 6. Town Potions

Because players can pick **any 4 of the 6 heroes** (even a squad without **Harlan** or **Mera**), Town **Arcanist** shops stock healing, mana, revival, and status-cure supplies strictly as **Potions** across the 8 Regions:

### A. Healing & Mana Potions *(Usable In or Out of Combat)*
| Item | Regions Stocked | Effect | Price *(Silver)* |
| :--- | :--- | :--- | :---: |
| **Minor Healing Potion** | Regions `1–8` | Restores `60 HP` to 1 ally | `25s` |
| **Stout Healing Potion** | Regions `3–8` | Restores `220 HP` to 1 ally | `90s` |
| **Greater Healing Potion** | Regions `5–8` | Restores `600 HP` to 1 ally | `300s` |
| **Supreme Healing Potion** | Regions `7–8` | Restores `1,500 HP` to 1 ally | `950s` |
| **Minor Mana Potion** | Regions `1–8` | Restores `25 MP` to 1 ally | `60s` |
| **Greater Mana Potion** | Regions `4–8` | Restores `75 MP` to 1 ally | `240s` |
| **Supreme Mana Potion** | Regions `7–8` | Restores `180 MP` to 1 ally | `750s` |

### B. Revival & Cure Potions *(Usable In or Out of Combat)*
| Item | Regions Stocked | Effect | Price *(Silver)* |
| :--- | :--- | :--- | :---: |
| **Reviving Potion** | Regions `1–8` | Revives a Knocked Out (`0 HP`) ally with `30% HP` | `120s` |
| **Phoenix Potion** | Regions `5–8` | Revives a Knocked Out ally with `75% HP` & cures ailments | `650s` |
| **Antidote Potion** | Regions `1–8` | Cures **Poison** on 1 ally | `30s` |
| **Cooling Potion** | Regions `1–8` | Cures **Burn** on 1 ally | `30s` |
| **Warming Potion** | Regions `1–8` | Cures **Chill** on 1 ally | `30s` |
| **Clarity Potion** | Regions `2–8` | Cures **Shock, Curse & Stun** on 1 ally | `45s` |
| **Panacea Potion** | Regions `4–8` | Cures **all ailments** on 1 ally | `180s` |
