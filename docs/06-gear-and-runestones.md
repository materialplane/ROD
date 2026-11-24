# ROD — Gear Suite & Carved Runestones

> **Status:** Complete (Synced to `classes.txt`: `13` D&D Weapons, `23` Shared Armor & Helmet Types, `6` Global Shields, `6` Class Accessories, Procedural Runestones & Town Potions)  
> **Equipment Slots (`5` Core Slots Per Hero):** **Right Hand** (Main `1H`/`2H` Weapon), **Left Hand** (Global Shield when wielding `1H`, or a second `1H` Longsword/Rapier when **Valen [`Duelist`]** Dual Wields), **Body** (Armor), **Helmet**, plus **1 Class Accessory Slot** (`Cloak`, `Orb`, `Horn`, `Quiver`, `Crystal`, or `Tome`).
> **Town Shop Structure (`6` Shop Types + Dedicated Trade Goods Buyer):** **Weapon Shop** (`all 13 weapons`), **Armor Shop** (`leather, hide, mail, splint & plate armor + helmets + shields`; stocks all armor at Forts & Keeps), **Tailor** (`cloth robes plus stitched bone and hardened scale caster sets`; stocks all armor & shields at Villages), **Magic Shop** (`caster spells`), **Arcanist** (`all potions + Orbs, Crystals, Tomes`), **Adventurer Shop** (`Cloaks, War-Horns, Quivers`), plus dedicated **Trade Goods Buyer NPCs** (`weigh & sell all trade goods for Silver — no buy list`).
> **Progression Structure:** Each Weapon, Shield, Armor Set progression, and Class Accessory climbs **`24` Gear Tiers (`Tier 1`–`Tier 24`)** mapped directly across Ethoria's **`20` Level Zones (`Z01–Z20`, `6` Gear Tiers per Map)**: **`1` base tier per Zone, plus `1` extra mid-zone upgrade tier inside each Map's sole `3`-town Zone (`Z02`, `Z09`, `Z14`, `Z16`)**. Each class wears **6 Armor Types** (`4` progressive Body pieces + `4` Helmets per type = `24` Gear Tiers; shared types use the exact same `4`-item set cleanly without duplication). Weapons and Body Armor carry **1 Permanent Runestone Socket** (inserting a new Runestone overwrites and destroys the previous one).

---

## 1. The `13` D&D Weapon Categories & Unique `0 MP` Attack Modes

Every class uses **3 distinct D&D weapon types** (`1H` or `2H`, shared cleanly across the cast), and each weapon type carries **2 unique `0 MP` Attack Modes**:

| # | Weapon Type | Handed | Damage Type | Usable By | Attack Mode A *(No Cooldown)* | Attack Mode B *(1-Turn Cooldown)* |
| :---: | :--- | :---: | :--- | :--- | :--- | :--- |
| **1** | **Longsword** | 1H | Slashing | Duelist (`Valen`) | **Quick Slash** — Reliable slash with sharp accuracy (`No Cooldown`) | **Heavy Cleave** — High damage, `+15%` Crit Chance, breaks 1 Guard point (`1-Turn Cooldown`) |
| **2** | **Greatsword** | 2H | Slashing | Duelist (`Valen`) | **Wide Sweep** — Broad arc (`95%` target + `50%` neighbor splash, `No Cooldown`) | **Overhead Rend** — Massive heavy strike, breaks 1 extra Guard point (`1-Turn Cooldown`) |
| **3** | **Rapier** | 1H | Piercing | Duelist (`Valen`) | **Needle Thrust** — Precision lunge (`+5%` Crit, high accuracy, `No Cooldown`) | **Heart Pierce** — Focused thrust (`+20%` Crit Chance), ignores `25%` Physical Defense (`1-Turn Cooldown`) |
| **4** | **Battleaxe** | 1H | Slashing | Knight (`Orin`) | **Chopping Hack** — Dependable axe chop with reliable accuracy (`No Cooldown`) | **Execution Chop** — Heavy chop (`+25%` Crit Chance vs. enemies below `50%` HP, `1-Turn Cooldown`) |
| **5** | **Mace** | 1H | Bludgeoning | Knight (`Orin`), Sage (`Harlan`) | **Heavy Bash** — Steady blunt hit, chips 1 Guard point (`No Cooldown`) | **Armor Crush** — Heavy slam, lowers enemy Physical Defense (`1-Turn Cooldown`) |
| **6** | **Spear** | 2H | Piercing | Knight (`Orin`) | **Long Thrust** — High-reach thrust with `+12%` Crit Chance (`No Cooldown`) | **Brace Sweep** — Heavy sweep breaking 1 Guard & lowering enemy Attack (`1-Turn Cooldown`) |
| **7** | **Longbow** | 2H | Piercing | Ranger (`Rowan`) | **Snap Arrow** — Clean long-range arrow, high accuracy (`No Cooldown`) | **Aimed Piercer** — Aimed shot (`+25%` Crit Chance), ignores `25%` Physical Defense (`1-Turn Cooldown`) |
| **8** | **Shortbow** | 2H | Piercing | Ranger (`Rowan`) | **Quick Volley** — Light volley with `+5%` Crit & steady accuracy (`No Cooldown`) | **Wing Clip** — Pinning arrow cutting enemy Attack & Accuracy (`1-Turn Cooldown`) |
| **9** | **Dagger** | 1H | Piercing | Sorceress (`Ellowyn`), Ranger (`Rowan`), Sage (`Harlan`) | **Quick Jab** — Precise stab (`+6%` Crit) with high accuracy (`No Cooldown`) | **Vital Gouge** — Deep stab (`+15%` Crit Chance) with lingering Poison (`1-Turn Cooldown`) |
| **10** | **Light Crossbow** | 2H | Piercing | Sorceress (`Ellowyn`) | **Bolt Snap** — Steady shot ignoring `15%` of Physical Defense (`No Cooldown`) | **Siege Crank** — Heavy cranked bolt + breaks 1 Guard point (`1-Turn Cooldown`) |
| **11** | **Quarterstaff** | 2H | Bludgeoning *(+Caster)* | Sorceress (`Ellowyn`), Druid (`Mera`), Sage (`Harlan`) | **Staff Sweep** — Clean two-handed strike restoring 6 MP on hit (`No Cooldown`) | **Crushing Vault** — Heavy overhead slam, chips 1 Guard point & restores 4 MP on hit (`1-Turn Cooldown`) |
| **12** | **Scimitar** | 1H | Slashing *(+Nature)* | Druid (`Mera`) | **Crescent Cut** — Smooth curved slash (`+5%` Crit, `No Cooldown`) | **Whirling Slash** — Spinning slash (`+15%` Crit Chance) & bonus power (`1-Turn Cooldown`) |
| **13** | **Sickle** | 1H | Slashing *(+Nature)* | Druid (`Mera`) | **Reaping Hook** — Hooked slice (`+5%` Crit) with Poison chance (`No Cooldown`) | **Thorn Slash** — Barbed cut that lowers target Attack 2 turns (`1-Turn Cooldown`) |

---

## 2. Weapon Power & Silver Curve (`Gear Tiers 1–24` Across `Zones 1–20`)

Base values scale smoothly across all `20` Level Zones (`6` Gear Tiers per Map) so players feel a clear power jump with each Zone's towns and forts:

* **1H Weapons (`Longsword, Rapier, Battleaxe, Mace, Dagger, Scimitar, Sickle`):** Standard `1.0×` Attack Power and `1.0×` Silver Cost (`leaves Left Hand free for any Global Shield—or a second Longsword/Rapier on Valen for an automatic 50% off-hand follow-up strike`).
* **2H Weapons (`Greatsword, Spear, Longbow, Shortbow, Light Crossbow, Quarterstaff`):** `+25%` higher Attack Power, `+20%` Silver Cost *(uses both hands—locks Left Hand slot)*.
* **Caster Weapon Scaling (`Quarterstaff, Scimitar, Sickle`, plus `Dagger / Mace / Light Crossbow` on Casters):** Casters (**Ellowyn, Mera, Harlan**) get **Magic / Heal Power** from **2H Quarterstaff** (`100%`), **Scimitar / Sickle** (`~83%` + `1H` Shield), **Light Crossbow** (`~85%` + Armor-Pierce), and **Dagger / Mace** (`~75%` + `1H` Shield), plus additional Spell Power from their Class Accessories (`Orbs`, `Crystals`, `Tomes`). Guarding also restores **`+10%` Max MP** for spellcasters.

* **New Campaign Starting State:** Heroes begin unequipped with an empty pack (`no free weapons, armor, spells, or potions`) and **`1,000s` Silver**—enough to arm all `4` party members with starter weapons (`~640s–700s`) and pick up a safety pack of potions plus early spells, armor, or Level 1 disciplines, while still staying well short of outfitting the full party in all Tier 1 slots (`~2,800s+` for full gear, spells, and Level 1 disciplines).

| Gear Tier | Map · Level Zone | Target Levels | Base 1H Attack | Base 2H Attack | Caster Magic/Heal Power | Typical 1H Price (Silver) | Where Stocked |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **1** | Map 1 · **Zone 1** | `1–5` | `6` | `8` | `+5` (`2H +6`) | `160s` | Highcrown / Oakhaven |
| **2** | Map 1 · **Zone 2** *(entry)* | `6–8` | `10` | `13` | `+9` (`2H +11`) | `265s` | Meadowbrook Hamlet |
| **3** | Map 1 · **Zone 2** *(frontier)* | `8–10` | `15` | `19` | `+14` (`2H +17`) | `395s` | Millbrook Crossing |
| **4** | Map 1 · **Zone 3** | `11–15` | `21` | `26` | `+20` (`2H +24`) | `565s` | Crownlands Hill-Fort / Saltwind Harbor |
| **5** | Map 1 · **Zone 4** | `16–20` | `28` | `35` | `+27` (`2H +32`) | `780s` | Brinecliff Watch-Fort / Reedfen Village |
| **6** | Map 1 · **Zone 5** | `21–25` | `36` | `45` | `+35` (`2H +42`) | `1,050s` | Mirewatch Post / Tidewater Keep |
| **7** | Map 2 · **Zone 6** | `26–30` | `45` | `56` | `+44` (`2H +53`) | `1,500s` | Redmarch Bastion / Goldmoor Village |
| **8** | Map 2 · **Zone 7** | `31–35` | `55` | `69` | `+54` (`2H +65`) | `2,100s` | Slatepeak Mining Fort / Thornwall Border Castle |
| **9** | Map 2 · **Zone 8** | `36–40` | `66` | `83` | `+65` (`2H +78`) | `2,900s` | Briarstead *(+ Hollowstone liberated)* |
| **10** | Map 2 · **Zone 9** *(entry)* | `41–43` | `78` | `98` | `+77` (`2H +92`) | `3,900s` | Timberfall Village / Mosswood Hamlet |
| **11** | Map 2 · **Zone 9** *(deep)* | `43–45` | `91` | `114` | `+90` (`2H +108`) | `5,200s` | Greenwarden Fort |
| **12** | Map 2 · **Zone 10** | `46–50` | `105` | `131` | `+104` (`2H +125`) | `6,800s` | Blightwatch Keep |
| **13** | Map 3 · **Zone 11** | `51–55` | `120` | `150` | `+119` (`2H +143`) | `8,800s` | Port Veridia / Sunstone Caravan Post |
| **14** | Map 3 · **Zone 12** | `56–60` | `136` | `170` | `+135` (`2H +162`) | `11,200s` | Dunespire Oasis / Sandwall Citadel |
| **15** | Map 3 · **Zone 13** | `61–65` | `153` | `191` | `+152` (`2H +182`) | `14,000s` | Highpass Refuge *(+ Gilded Manor liberated)* |
| **16** | Map 3 · **Zone 14** *(basin)* | `66–68` | `172` | `215` | `+171` (`2H +205`) | `17,500s` | Clearwater Lake Village / Cragwatch Fort |
| **17** | Map 3 · **Zone 14** *(forge)* | `68–70` | `192` | `240` | `+191` (`2H +229`) | `21,500s` | Anvilhall Forge |
| **18** | Map 3 · **Zone 15** | `71–75` | `214` | `268` | `+213` (`2H +256`) | `26,500s` | Stormhold Citadel |
| **19** | Map 4 · **Zone 16** *(coast)* | `76–78` | `238` | `298` | `+237` (`2H +284`) | `32,500s` | Rimeport / Frostmere Village |
| **20** | Map 4 · **Zone 16** *(glacier)* | `78–80` | `264` | `330` | `+263` (`2H +316`) | `39,500s` | Glacierwatch Fort |
| **21** | Map 4 · **Zone 17** | `81–85` | `292` | `365` | `+291` (`2H +349`) | `48,000s` | Icecrest Holdfast |
| **22** | Map 4 · **Zone 18** | `86–90` | `324` | `405` | `+322` (`2H +386`) | `58,000s` | Ashenford War-Camp *(+ Bleakwatch liberated)* |
| **23** | Map 4 · **Zone 19** | `91–95` | `358` | `448` | `+356` (`2H +427`) | `70,000s` | Cinderwatch Bastion / Ashvale Village |
| **24** | Map 4 · **Zone 20** | `96–99` | `395` | `494` | `+394` (`2H +473`) | `85,000s` | Scorchwall Fort / Garrick's Black Keep |

---

## 3. Complete Weapon Catalog (`13` D&D Types × `24` Gear Tiers)

### Map 1 — Crownlands Heart & Roads *(Zones `1–2` | Gear Tiers `1–3`)*
| Weapon Type | Tier 1 *(`Z01`: Highcrown / Oakhaven)* | Tier 2 *(`Z02`: Meadowbrook Hamlet)* | Tier 3 *(`Z02`: Millbrook / Hill-Fort)* |
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

### Map 1 — Coast & Saltmarsh *(Zones `3–5` | Gear Tiers `4–6`)*
| Weapon Type | Tier 4 *(`Z03`: Saltwind Harbor)* | Tier 5 *(`Z04`: Brinecliff / Reedfen)* | Tier 6 *(`Z05`: Mirewatch / Tidewater)* |
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

### Map 2 — Thornwall Warfronts & Weald Border *(Zones `6–8` | Gear Tiers `7–9`)*
| Weapon Type | Tier 7 *(`Z06`: Redmarch / Goldmoor)* | Tier 8 *(`Z07`: Slatepeak / Thornwall)* | Tier 9 *(`Z08`: Briarstead / Hollowstone)* |
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

### Map 2 — Verdant Weald & Plague Woods *(Zones `9–10` | Gear Tiers `10–12`)*
| Weapon Type | Tier 10 *(`Z09`: Timberfall / Mosswood)* | Tier 11 *(`Z09`: Greenwarden Fort)* | Tier 12 *(`Z10`: Blightwatch Keep)* |
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

### Map 3 — Sun-Scorched Isles *(Zones `11–13` | Gear Tiers `13–15`)*
| Weapon Type | Tier 13 *(`Z11`: Port Veridia / Sunstone)* | Tier 14 *(`Z12`: Dunespire / Sandwall)* | Tier 15 *(`Z13`: Highpass / Gilded Manor)* |
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

### Map 3 — Ironcrest Highlands *(Zones `14–15` | Gear Tiers `16–18`)*
| Weapon Type | Tier 16 *(`Z14`: Clearwater / Cragwatch)* | Tier 17 *(`Z14`: Anvilhall Forge)* | Tier 18 *(`Z15`: Stormhold Citadel)* |
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

### Map 4 — Frostbound Reach *(Zones `16–17` | Gear Tiers `19–21`)*
| Weapon Type | Tier 19 *(`Z16`: Rimeport / Frostmere)* | Tier 20 *(`Z16`: Glacierwatch Fort)* | Tier 21 *(`Z17`: Icecrest Holdfast)* |
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

### Map 4 — Ashen Border & The Dreadwaste *(Zones `18–20` | Gear Tiers `22–24`)*
| Weapon Type | Tier 22 *(`Z18`: Ashenford / Bleakwatch)* | Tier 23 *(`Z19`: Cinderwatch / Ashvale)* | Tier 24 *(`Z20`: Scorchwall / Black Keep)* |
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

Each hero wears **Helmet** + **Body** (choosing from `6` Armor Types per class, `4` Body + `4` Helmets per type = exact `24` Gear Tiers without duplicating shared sets), wields a **Right-Hand Weapon**, holds a **Global Shield** (`6` types × `4` upgrades = `24` Gear Tiers, usable by **any class wielding a `1H` weapon**), and equips **1 Class Accessory** (`Cloak`, `Orb`, `Horn`, `Quiver`, `Crystal`, or `Tome`).

### A. Armor Weights *(~65% Body / ~35% Helmet Split · Body Carries 1 Runestone Socket)*
| Weight | Combat Profile |
| :--- | :--- |
| **Heavy** | Highest Physical Defense (`100%`), lower Magic Defense (`50%`); Heavy Helmets add `+10%–25%` Stun & Status resist. |
| **Medium** | Balanced Physical (`75%`) & Magic (`75%`) Defense; Medium Helmets add `+2%–8%` Accuracy & Critical Chance. |
| **Light** | Highest Magic Defense (`100%`), lower Physical Defense (`45%`), `+Max MP` and `+4%` Dodge Chance; Light Helmets add bonus `+Max MP`. |

### B. Class Accessory Profiles *(`1` Accessory Slot Per Hero · `24` Gear Tiers)*
| Accessory Type | Usable By | Combat Profile |
| :--- | :--- | :--- |
| **Cloaks** | Duelist (`Valen`) | Boosts Dodge Chance & Critical Chance. |
| **Orbs** | Sorceress (`Ellowyn`) | Boosts Magic Power, Spell Crit Chance & Max MP. |
| **Horns** | Knight (`Orin`) | Boosts Grit, Physical Defense & Guard mitigation bonus. |
| **Quivers** | Ranger (`Rowan`) | Boosts Piercing Attack Power & Critical Damage. |
| **Crystals** | Druid (`Mera`) | Boosts Magic Power, Max MP & Nature/Status potency. |
| **Tomes** | Sage (`Harlan`) | Boosts Healing Power, Max MP & Status Ailment Resistance. |

### C. Combined Defense & Price Curve (`Gear Tiers 1–24` Across `Zones 1–20`)
* **Armor Split Across Both Slots:** Values below show the **combined** Gear Tier total (`Body + Helmet`)—in town shops, **Body Armor** provides ~`65%` of the stats & price and **Helmets** provide ~`35%`, so equipping a matching pair hits the exact balanced baseline.
* **Shield / Class Accessory Silver Cost:** Roughly `0.60×`–`0.65×` of a 1H Weapon at the same Gear Tier (`95s` at Tier 1 $\to$ `55,000s` at Tier 24).

| Gear Tier | Map · Level Zone | Heavy P.Def / M.Def | Medium P.Def / M.Def | Light P.Def / M.Def *(+MP)* | Shield P.Def | Body + Helmet Price | Shield / Accessory Price |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | Map 1 · **Zone 1** | `6 / 3` | `5 / 5` | `3 / 6` *(+5 MP)* | `+4` | `130s` | `95s` |
| **2** | Map 1 · **Zone 2** *(entry)* | `10 / 5` | `8 / 8` | `5 / 10` *(+8 MP)* | `+6` | `215s` | `155s` |
| **3** | Map 1 · **Zone 2** *(frontier)* | `15 / 7` | `12 / 12` | `7 / 15` *(+10 MP)* | `+9` | `330s` | `240s` |
| **4** | Map 1 · **Zone 3** | `21 / 10` | `16 / 16` | `9 / 21` *(+13 MP)* | `+13` | `485s` | `355s` |
| **5** | Map 1 · **Zone 4** | `28 / 14` | `21 / 21` | `13 / 28` *(+16 MP)* | `+17` | `690s` | `495s` |
| **6** | Map 1 · **Zone 5** | `36 / 18` | `27 / 27` | `16 / 36` *(+19 MP)* | `+22` | `950s` | `680s` |
| **7** | Map 2 · **Zone 6** | `45 / 22` | `34 / 34` | `20 / 45` *(+22 MP)* | `+27` | `1,350s` | `975s` |
| **8** | Map 2 · **Zone 7** | `55 / 27` | `41 / 41` | `25 / 55` *(+25 MP)* | `+33` | `1,900s` | `1,360s` |
| **9** | Map 2 · **Zone 8** | `66 / 33` | `50 / 50` | `30 / 66` *(+28 MP)* | `+40` | `2,600s` | `1,880s` |
| **10** | Map 2 · **Zone 9** *(entry)* | `78 / 39` | `59 / 59` | `35 / 78` *(+31 MP)* | `+47` | `3,500s` | `2,500s` |
| **11** | Map 2 · **Zone 9** *(deep)* | `91 / 45` | `68 / 68` | `41 / 91` *(+34 MP)* | `+55` | `4,700s` | `3,400s` |
| **12** | Map 2 · **Zone 10** | `105 / 52` | `79 / 79` | `47 / 105` *(+37 MP)* | `+63` | `6,100s` | `4,400s` |
| **13** | Map 3 · **Zone 11** | `120 / 60` | `90 / 90` | `54 / 120` *(+40 MP)* | `+72` | `7,900s` | `5,700s` |
| **14** | Map 3 · **Zone 12** | `136 / 68` | `102 / 102` | `61 / 136` *(+43 MP)* | `+82` | `10,000s` | `7,300s` |
| **15** | Map 3 · **Zone 13** | `153 / 76` | `115 / 115` | `69 / 153` *(+46 MP)* | `+92` | `12,600s` | `9,100s` |
| **16** | Map 3 · **Zone 14** *(basin)* | `172 / 86` | `129 / 129` | `77 / 172` *(+49 MP)* | `+103` | `15,800s` | `11,400s` |
| **17** | Map 3 · **Zone 14** *(forge)* | `192 / 96` | `144 / 144` | `86 / 192` *(+52 MP)* | `+115` | `19,400s` | `14,000s` |
| **18** | Map 3 · **Zone 15** | `214 / 107` | `161 / 161` | `96 / 214` *(+55 MP)* | `+128` | `24,000s` | `17,200s` |
| **19** | Map 4 · **Zone 16** *(coast)* | `238 / 119` | `179 / 179` | `107 / 238` *(+58 MP)* | `+143` | `29,000s` | `21,000s` |
| **20** | Map 4 · **Zone 16** *(glacier)* | `264 / 132` | `198 / 198` | `119 / 264` *(+61 MP)* | `+158` | `35,500s` | `25,600s` |
| **21** | Map 4 · **Zone 17** | `292 / 146` | `219 / 219` | `131 / 292` *(+64 MP)* | `+175` | `43,000s` | `31,200s` |
| **22** | Map 4 · **Zone 18** | `324 / 162` | `243 / 243` | `146 / 324` *(+68 MP)* | `+194` | `52,000s` | `37,700s` |
| **23** | Map 4 · **Zone 19** | `358 / 179` | `269 / 269` | `161 / 358` *(+72 MP)* | `+215` | `63,000s` | `45,500s` |
| **24** | Map 4 · **Zone 20** | `395 / 198` | `296 / 296` | `178 / 395` *(+78 MP)* | `+237` | `78,000s` | `55,000s` |

---

### D. Complete Shared Armor & Helmet Catalog *(`23` Types × `4` Body + `4` Helmets = `92` Body + `92` Helmets)*

| Armor Type | Weight | Gear Tiers | Slot | Usable By | Upgrade 1 | Upgrade 2 | Upgrade 3 | Upgrade 4 |
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
| **Fine Robes** | Light | `5, 6, 7, 8` | Body | Ellowyn, Harlan | Trimmed Fine Robes | Dyed Velvet Robes | Redmarch Fine Mantle | Noble Thread Robes |
| **Fine Robes** | Light | `5, 6, 7, 8` | Helmet | Ellowyn, Harlan | Fine Silk Fillet | Copper Circlet | Redmarch Hood | Noble Velour Cowl |
| **Padded Robes** | Light | `9, 10, 11, 12` | Body | Ellowyn, Harlan | Quilted Hemp Robes | Marsh-Padded Mantle | Garrison Padded Robes | Briar-Lined Padded Coat |
| **Padded Robes** | Light | `9, 10, 11, 12` | Helmet | Ellowyn, Harlan | Quilted Linen Cap | Soft Padded Hood | Garrison Padded Cowl | Briar Padded Circlet |
| **Silk Robes** | Light | `13, 14, 15, 16` | Body | Ellowyn | Weald Silk Robes | Golden-Thread Silk Robes | Oasis Star-Silk Mantle | Storm-Woven Silk Robes |
| **Silk Robes** | Light | `13, 14, 15, 16` | Helmet | Ellowyn | Weald Silk Veil | Silver Silk Band | Oasis Silk Crownlet | Highpass Silk Diadem |
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

### E. Complete Global Shields Catalog *(`6` Types × `4` Upgrades = `24` Gear Tiers · All Classes w/ `1H` Weapon)*

| Shield Type | Weight | Gear Tiers | Upgrade 1 | Upgrade 2 | Upgrade 3 | Upgrade 4 |
| :--- | :---: | :---: | :--- | :--- | :--- | :--- |
| **Buckler** | Light | `1, 2, 3, 4` | Cracked Wood Buckler | Iron-Rimmed Buckler | Crownland Steel Buckler | Saltwind Brass Buckler |
| **Round Shield** | Light | `5, 6, 7, 8` | Oak-Plank Round Shield | Mire-Iron Round Shield | Redmarch Bronze Round | Veteran's Steel Round |
| **Heater Shield** | Medium | `9, 10, 11, 12` | Thornwall Crest Heater | Briarwood Steel Heater | Amber-Bound Heater | Greenwarden Heater |
| **Kite Shield** | Medium | `13, 14, 15, 16` | Veridian Bronze Kite | Sun-Crest Caravan Kite | Highpass Steel Kite | Storm-Rim Kite Shield |
| **Spiked Shield** | Heavy | `17, 18, 19, 20` | Crag-Tooth Spiked Shield | Anvilhall Mythril Spiked | Rime-Iron Barbed Shield | Glacierwall Spiked Bulwark |
| **Tower Shield** | Heavy | `21, 22, 23, 24` | Bleakwatch Wall Shield | Ashen-Steel Tower Shield | Black-Keep Pavise Tower | **Aegis of the Crown** |

---

### F. Complete Class Accessories Catalog *(`6` Types × `24` Gear Tiers = `144` Items · `1` Slot)*

#### Map 1 — Crownlands Heart & Roads *(Zones `1–2` | Gear Tiers `1–3`)*
| Category | Tier 1 *(`Z01`)* | Tier 2 *(`Z02` entry)* | Tier 3 *(`Z02` frontier)* |
| :--- | :--- | :--- | :--- |
| **Cloak** | Tattered Travel Cloak | Oakhaven Wool Cloak | Millbrook Duelist Cape |
| **Orb** | Cracked Glass Orb | Amber Focus Orb | Crownland Star-Orb |
| **Horn** | Wooden Watch-Horn | Brass Garrison Horn | Crownland Bugle-Horn |
| **Quiver** | Torn Leather Quiver | Fletched Scout Quiver | Hardened Yew Quiver |
| **Crystal** | Chipped Quartz Crystal | Moss-Lit Shard | Crownland Verdant Crystal |
| **Tome** | Linen Herbal Tome | Stitched Field Primer | Crownland Herbal Ledger |

#### Map 1 — Coast & Saltmarsh *(Zones `3–5` | Gear Tiers `4–6`)*
| Category | Tier 4 *(`Z03`)* | Tier 5 *(`Z04`)* | Tier 6 *(`Z05`)* |
| :--- | :--- | :--- | :--- |
| **Cloak** | Waxed Mariner Cloak | Saltwind Storm-Cape | Mirewatch Oilskin Cloak |
| **Orb** | Brine-Pearl Sphere | Sea-Glass Globe | Tidestone Crystal Orb |
| **Horn** | Conch Fog-Horn | Harbor Brass Horn | Mirewarden Iron Horn |
| **Quiver** | Waterproof Seal Quiver | Gull-Feather Quiver | Mire-Hunter Case |
| **Crystal** | Sea-Salt Prism Crystal | Brine-Moss Crystal | Fen-Amber Crystal |
| **Tome** | Mariner's Tide-Tome | Sea-Kelp Herbarium | Mire-Antidote Ledger |

#### Map 2 — Thornwall Warfronts & Weald Border *(Zones `6–8` | Gear Tiers `7–9`)*
| Category | Tier 7 *(`Z06`)* | Tier 8 *(`Z07`)* | Tier 9 *(`Z08`)* |
| :--- | :--- | :--- | :--- |
| **Cloak** | Ash-Dyed Border Cloak | Redmarch Crimson Cape | Vanguard Silk Mantle |
| **Orb** | Smoke-Quartz Sphere | War-Chanter Orb | Redmarch Focus Globe |
| **Horn** | Iron Signal-Horn | Redmarch War-Horn | Bastion Great-Horn |
| **Quiver** | Garrison Arrow-Tube | Steel-Capped Quiver | Border-Captain's Quiver |
| **Crystal** | Slate-Bound Crystal | Amber-Vein Crystal | Redmarch Storm-Shard |
| **Tome** | Battlefield Triage Tome | Cinder-Ink Compendium | Bastion Field Codex |

#### Map 2 — Verdant Weald & Plague Woods *(Zones `9–10` | Gear Tiers `10–12`)*
| Category | Tier 10 *(`Z09` entry)* | Tier 11 *(`Z09` deep)* | Tier 12 *(`Z10`)* |
| :--- | :--- | :--- | :--- |
| **Cloak** | Fern-Dyed Ranger Cloak | Briar-Thorn Mantle | Elderwood Canopy Cloak |
| **Orb** | Amber-Sap Sphere | Dewdrop Crystal Orb | Elderwood Star-Globe |
| **Horn** | Carved Stag-Horn | Timberfall Oak Horn | Elderwood Ivory Horn |
| **Quiver** | Bark-Wrapped Quiver | Willow-Woven Quiver | Phantom-Leaf Case |
| **Crystal** | Heartwood Sap Crystal | Emerald Weald Crystal | Ancient Grove Prism |
| **Tome** | Herbalist's Lore Tome | Amber-Leaf Codex | Elderwood Panacea Tome |

#### Map 3 — Sun-Scorched Isles *(Zones `11–13` | Gear Tiers `13–15`)*
| Category | Tier 13 *(`Z11`)* | Tier 14 *(`Z12`)* | Tier 15 *(`Z13`)* |
| :--- | :--- | :--- | :--- |
| **Cloak** | Sun-Bleached Sand Cloak | Gilded Veridia Cape | Mirage Silk Shawl |
| **Orb** | Sun-Glass Sphere | Topaz Mirage Orb | Solar Prism Globe |
| **Horn** | Sand-Bronze Hunting Horn | Sun-Gilded Battle Horn | Dunespire Ram-Horn |
| **Quiver** | Camel-Hide Quiver | Gilded Brass Tube | Sirocco Winged Quiver |
| **Crystal** | Sunstone Shard Crystal | Topaz Desert Crystal | Solar Hearth Crystal |
| **Tome** | Sun-Dial Field Tome | Oasis Tincture Codex | Solar-Flare Lexicon |

#### Map 3 — Ironcrest Highlands *(Zones `14–15` | Gear Tiers `16–18`)*
| Category | Tier 16 *(`Z14` basin)* | Tier 17 *(`Z14` forge)* | Tier 18 *(`Z15`)* |
| :--- | :--- | :--- | :--- |
| **Cloak** | Wolf-Fur Travel Cloak | Storm-Weave Cape | Anvilhall Silver Mantle |
| **Orb** | Thunder-Quartz Orb | Silver-Core Sphere | Anvilhall Prism Globe |
| **Horn** | Ram-Horn Signal Trumpet | Highland Steel Horn | Anvilhall Thunder-Horn |
| **Quiver** | Mountain-Horn Quiver | Eagle-Plume Case | Gale-Wing Mythril Quiver |
| **Crystal** | Storm-Quartz Crystal | Silver-Peak Crystal | Sky-Heart Gem Crystal |
| **Tome** | Alpine-Herb Folio | Mineral-Salve Compendium | Anvilhall Runic Tome |

#### Map 4 — Frostbound Reach *(Zones `16–17` | Gear Tiers `19–21`)*
| Category | Tier 19 *(`Z16` coast)* | Tier 20 *(`Z16` glacier)* | Tier 21 *(`Z17`)* |
| :--- | :--- | :--- | :--- |
| **Cloak** | Rime-Lined Wolf Cloak | Tundra Snow-Mantle | Boreal Starlight Cape |
| **Orb** | Frosted Glass Sphere | Boreal Ice-Orb | Pale-Star Crystal Globe |
| **Horn** | Carved Ivory Mammoth-Horn | Frostguard War-Horn | Pale-Ice Great-Horn |
| **Quiver** | Fur-Lined Quiver | Glacial Horn Case | Boreal Wind Quiver |
| **Crystal** | Glacial Ice Crystal | Boreal Frost Crystal | Winter-Moon Prism |
| **Tome** | Frost-Script Folio | Ice-Bound Herbarium | Glacial Elixir Tome |

#### Map 4 — Ashen Border & The Dreadwaste *(Zones `18–20` | Gear Tiers `22–24`)*
| Category | Tier 22 *(`Z18`)* | Tier 23 *(`Z19`)* | Tier 24 *(`Z20`)* |
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
* **Pick 1 of 3 Procedural Quest Draft:** Completing any quest opens a 3-card Runestone Draft that **procedurally generates 3 distinct Runestones** scaled to the quest's Map / Level Zone tier by rolling **Prefixes + Suffixes** from the pools below (`name format: "[Prefix] Runestone [of Suffix]"`, e.g., *Vampiric Runestone of Alacrity*, or multi-affix rolls like *Arcing Echoing Runestone of Precision & Brutality*).
* **100% Pure Combat Effects:** No non-combat economy affixes—every Prefix and Suffix directly impacts combat. Unwanted Runestones can be **sold to merchants for Silver** (`Runestones cannot be crafted, extracted, or rerolled in shops`).

#### Runestone Rarity Tiers Across Maps `1–4` (`Zones 1–20`)
| Rarity Tier | Maps & Level Zones | Roll Formula | Strength Scale |
| :--- | :--- | :--- | :---: |
| **Lesser** | **Map 1** (`Zones 1–5`) | `1` Prefix + `1` Suffix | Base Tier (`1×`) |
| **Refined** | **Map 2** (`Zones 6–10`) | `1` Prefix + `1` Suffix | Strong Tier (`~1.5×`) |
| **Greater** | **Map 3** (`Zones 11–15`) | `2` Prefixes + `1` Suffix **or** `1` Prefix + `2` Suffixes | High Tier (`~2×`) |
| **Mythic** | **Map 4** (`Zones 16–20`) | `2` Prefixes + `2` Suffixes | Endgame Tier (`~2.5×`) |

---

### B. Weapon Prefixes *(Combat Triggers & Conversions — Weapon Socket)*
| Prefix Name | Combat Effect *(Scales Lesser $\to$ Mythic)* |
| :--- | :--- |
| **Blazing** | Strikes deal bonus **Fire** damage (`+12%–25%`), splash `35%` to an adjacent enemy, and chance to **Burn**. |
| **Glacial** | Strikes deal bonus **Frost** damage (`+12%–25%`) and apply **Chill**, lowering enemy Attack & Magic Power by `15%`. |
| **Arcing** | Strikes deal bonus **Lightning** damage (`+12%–25%`) that chains to a 2nd enemy with a **Shock** chance. |
| **Venomous** | Strikes deal bonus **Poison** damage (`+12%–25%`); poisoned foes deal `10%–18%` less physical damage. |
| **Hallowed** | Strikes deal bonus **Radiant** damage (`+15%–32%` vs. Undead & Portal Horrors) and purge `1` enemy buff on crit. |
| **Detonating** | Hitting an enemy suffering **Burn, Bleed, or Poison** detonates `25%–50%` of remaining over-time damage immediately. |
| **Vampiric** | Attacks & skills heal the user for `8%–18%` of damage dealt. |
| **Siphoning** | Attacks & skills restore `2–7 MP` per hit *(doubled on Weakness or Critical hits)*. |
| **Crushing** | `0 MP` Attack Modes chip **+1 extra Guard point** and lower enemy Defense by `10%–22%` for 2 turns. |
| **Rending** | Weapon Critical Hits inflict heavy **Bleed** (`3 turns`) and deal `+15%–32%` bonus damage vs. Bleeding foes. |
| **Executioner's** | Deal `+20%–42%` bonus weapon damage to enemies below `40% HP` or **Staggered**. |
| **Echoing** | `15%–32%` chance for single-target `0 MP` attacks to strike a second time at `50%` power. |

---

### C. Body Armor Prefixes *(Survival, Counter & Resolve Mechanics — Body Armor Socket)*
| Prefix Name | Combat Effect *(Scales Lesser $\to$ Mythic)* |
| :--- | :--- |
| **Bastion's** | Enter every battle with a protective **Ward Shield** (`12%–30%` Max HP). |
| **Retaliating** | Reflect `18%–38%` of incoming melee damage back onto attackers and chip `1` Guard point when hit while Battered. |
| **Resolve-Heart** | Gain `+18%–38%` damage & healing potency whenever HP is below `50%` (**Battered**). |
| **Sanctified** | Gain `25%–60%` resistance to **all Status Ailments & Stun**, and heal `3%–6%` HP when an ailment fails or expires. |
| **Vanguard's** | Taking the **Guard** action restores `6%–15%` Max HP + `4–10 MP` and grants `+15%` Defense for `1` turn. |
| **Unbreakable** | Once per battle, survive a fatal hit at `1 HP` and immediately gain a `10%–25%` **Ward Shield**. |
| **Overflowing** | Excess healing above `100%` Max HP converts into a protective **Ward Shield** *(up to `15%–30%` Max HP)*. |
| **Phantom's** | Gain `+6%–16%` Dodge Chance, and dodging an attack immediately grants **Momentum** (`+25%` next hit). |
| **Adaptive** | Taking elemental/magic damage grants a `25%–55%` resistance barrier against that element for `2` turns. |
| **Martyr's** | When an adjacent ally is hit below `40% HP`, intercept `25%–40%` of the hit with `15%` damage reduction. |

---

### D. Universal Suffixes *(Combat Stats & Perks — Roll on Any Runestone)*
| Suffix Name | Stat & Combat Bonus *(Scales Lesser $\to$ Mythic)* |
| :--- | :--- |
| **of Alacrity** | `+3% to +14%` **Dodge Chance** & `+3% to +12%` **Accuracy**. |
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

Because players can pick **any 4 of the 6 heroes** (even a squad without **Harlan** or **Mera**), Town **Arcanist** shops stock healing, mana, revival, and status-cure supplies strictly as **Potions** scaled across Ethoria's Level Zones (`Maps 1–4`). **Unlimited Stacking:** Any consumables sharing the exact same stats and effect merge together into a single unlimited stack in your bag (`no 99-item limit`).

### A. Healing & Mana Potions *(Usable In or Out of Combat)*
| Item | Zones Stocked | Effect | Price *(Silver)* |
| :--- | :--- | :--- | :---: |
| **Minor Healing Potion** | Zones `1–20` *(Maps `1–4`)* | Restores `60 HP` to 1 ally | `25s` |
| **Stout Healing Potion** | Zones `6–20` *(Maps `2–4`)* | Restores `220 HP` to 1 ally | `90s` |
| **Greater Healing Potion** | Zones `11–20` *(Maps `3–4`)* | Restores `600 HP` to 1 ally | `300s` |
| **Supreme Healing Potion** | Zones `16–20` *(Map `4`)* | Restores `1,500 HP` to 1 ally | `950s` |
| **Minor Mana Potion** | Zones `1–20` *(Maps `1–4`)* | Restores `25 MP` to 1 ally | `60s` |
| **Greater Mana Potion** | Zones `9–20` *(Map `2` Weald onward)* | Restores `75 MP` to 1 ally | `240s` |
| **Supreme Mana Potion** | Zones `16–20` *(Map `4`)* | Restores `180 MP` to 1 ally | `750s` |

### B. Revival & Cure Potions *(Usable In or Out of Combat)*
| Item | Zones Stocked | Effect | Price *(Silver)* |
| :--- | :--- | :--- | :---: |
| **Reviving Potion** | Zones `1–20` *(Maps `1–4`)* | Revives a Knocked Out (`0 HP`) ally with `30% HP` | `120s` |
| **Phoenix Potion** | Zones `11–20` *(Maps `3–4`)* | Revives a Knocked Out ally with `75% HP` & cures ailments | `650s` |
| **Antidote Potion** | Zones `1–20` *(Maps `1–4`)* | Cures **Poison** on 1 ally | `30s` |
| **Cooling Potion** | Zones `1–20` *(Maps `1–4`)* | Cures **Burn** on 1 ally | `30s` |
| **Warming Potion** | Zones `1–20` *(Maps `1–4`)* | Cures **Chill** on 1 ally | `30s` |
| **Clarity Potion** | Zones `4–20` *(Map `1` Saltmarsh onward)* | Cures **Shock, Curse & Stun** on 1 ally | `45s` |
| **Panacea Potion** | Zones `9–20` *(Map `2` Weald onward)* | Cures **all ailments** on 1 ally | `180s` |
