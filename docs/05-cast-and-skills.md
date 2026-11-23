# ROD — Playable Cast & Classes

> **Status:** Complete (Part 1: All 6 Classes | Part 2: Weapon Attack Styles & 3 Natural Caster Spell Pools | Part 3: Equipment Matrix Synced to classes.txt)  
> **Selection Rule:** At the start of the journey, players choose **4 of the 6** characters/classes to venture across the 8 Realms. The remaining 2 stay behind to hold **Highcrown Keep** in Garrick's absence.  
> **Core Rule:** All class roles, attributes, weapon styles, and spells are **100% pure combat** (zero non-combat economy or shop-scavenging perks).

---

## 1. The 6 Selectable Classes

### 1. Prince Valen — **Duelist**
* **Combat Role:** Versatile offensive striker built around sharp swordsmanship, high single-target pressure, and relentless momentum.
* **Natural Attribute Lean:** `Force` & `Finesse` *(all stats start at `1`)*
* **Resolve Theme (Wounded States `<50%` / `<25%`):** Scarred pride—counter-aggression and strike speed sharpen as he gets bruised and cornered.
* **Token Visual Identity:** Battle-worn young man in his early 20s, thick wavy dark brown hair, permanent horizontal scar across his right cheekbone, stripped of royal gold into rugged dark leather-and-iron shoulder gear.
* **Suggested Token Frame:** Scarred tarnished iron ring with faint notched blade markings.

### 2. Queen Ellowyn — **Sorceress**
* **Combat Role:** Primary offensive spellcaster—unleashes elemental magic to punish enemy groups and elemental weaknesses, backed by protective arcane/radiant wards.
* **Natural Attribute Lean:** `Arcana` & `Presence` *(all stats start at `1`)*
* **Resolve Theme (Wounded States `<50%` / `<25%`):** Desperate power—wounded states amplify spell potency and mana efficiency.
* **Token Visual Identity:** Regal mid-30s woman with pale skin, striking obsidian-black eyes, wavy raven-black hair, wearing a high-collared indigo/charcoal travel cloak and bronze clasp without her stolen silver crown.
* **Suggested Token Frame:** Weathered dark bronze and wrought-iron filigree engraved with faint cyan runes.

### 3. Commander Orin — **Knight**
* **Combat Role:** Heavy armored protector who absorbs blows, shields allies, cracks enemy Guard/armor, and steadies the party's defense.
* **Natural Attribute Lean:** `Grit` & `Force` *(all stats start at `1`)*
* **Resolve Theme (Wounded States `<50%` / `<25%`):** Unbreakable veteran—physical mitigation and ally-protecting grit tighten the closer he gets to falling.
* **Backstory & Motivation:** Under Ethoria's kingdom doctrine, the **Lead Commander** post forbids marriage. King Garrick pressed **Orin** to take the post before he married, and Orin refused for love. Only after his wife died giving birth to his son **Rowan** did a heartbroken Orin accept the office and swear the vow never to love again—never blaming Rowan and devoting his quiet, fiercely protective life to raising his boy. *(At the climax of the final King Garrick battle, all 6 heroes converge and Orin sacrifices himself taking Garrick's desperate lethal strike to save Rowan—so players still fight the full battle with their 4-hero party intact.)*
* **Token Visual Identity:** Hardened military veteran in his 50s with salt-and-pepper hair, sharp hazel eyes, and weathered scarred steel-plate pauldrons.
* **Suggested Token Frame:** Heavy riveted dark steel shield-rim border.

### 4. Rowan *(Orin's Son)* — **Ranger**
* **Combat Role:** Long-range physical sniper specializing in critical hits, targeting priority enemies, and disrupting enemy turn timing.
* **Natural Attribute Lean:** `Finesse` & `Force` *(all stats start at `1`)*
* **Resolve Theme (Wounded States `<50%` / `<25%`):** Cold focus under fire—precision and critical strike power spike at low HP.
* **Backstory & Motivation:** Raised solely by his grieving father Orin after his mother died in childbirth; grew up hardened on the borderlands rather than sheltered behind castle walls.
* **Token Visual Identity:** Young hardened borderland scout in his early 20s with sharp alert eyes, neat settled dark chestnut hair, weathered leather-and-fur ranger mantle, and buckled leather chest strap.
* **Suggested Token Frame:** Weathered dark wood and burnished brass ring with subtle fletching notches.

### 5. Mera *(The Queen's Handmaid)* — **Druid**
* **Combat Role:** Versatile nature spellcaster weaving thorn strikes, earth tremors, stormwinds, thorns, and regenerative wild magic.
* **Natural Attribute Lean:** `Arcana` & `Finesse` *(all stats start at `1`)*
* **Resolve Theme (Wounded States `<50%` / `<25%`):** Untamed surge—spell speed and nature-magic potency sharpen when cornered.
* **Backstory & Quest Hook:** As a child, **Mera** was spotted in slavery by **Queen Ellowyn**, who immediately purchased and freed her—forging Mera's fierce, lifelong loyalty. Mera's mother was sold away before Ellowyn ever knew Mera, and **finding and rescuing Mera's mother** is a major questline across the Realms.
* **Token Visual Identity:** Sharp-eyed woman in her mid-20s wearing dark hooded travel garb woven with dried forest leaves and a muted cloth scarf.
* **Suggested Token Frame:** Sleek blackened silver ring etched with winding thorny briar markings.

### 6. Harlan *(The Arena Herbalist)* — **Sage**
* **Combat Role:** Sustains the party with restorative salves and ailment cleansing while weakening enemies with toxic Poison brews and combat debuffs.
* **Natural Attribute Lean:** `Presence` & `Arcana` *(all stats start at `1`)*
* **Resolve Theme (Wounded States `<50%` / `<25%`):** Emergency triage—healing potency and cleansing effectiveness spike when battered or tending critical allies.
* **Backstory & Motivation:** Lost both his **wife and daughter** to a devastating plague that swept the kingdom when Harlan was in his early 20s—driving him to spend decades mastering medicine, salves, and toxins beneath the arena so others wouldn't suffer the same loss.
* **Token Visual Identity:** Lean, clean-shaven elderly herbalist scholar in his late 60s with warm weathered olive skin, shaved crown with swept-back silver-white temple hair, brass spectacles resting on his forehead, and worn layered olive-and-brown robes with leather herb-satchel straps.
* **Suggested Token Frame:** Braided circular ring formed directly from dried medicinal herb stems, woody root tendrils, and dried sage leaves with small weathered-bronze clasps.

---

## 2. How Combat Actions Work (Weapon Attack Modes & Caster Spells)

* **Weapon Attack Modes (`0 MP` — All 6 Heroes):** Every weapon category (`13` D&D weapon types—see `docs/06-gear-and-runestones.md`) carries **2 unique `0 MP` Attack Modes** *(for example, a fast accurate strike vs. a slow heavy critical or armor-crushing blow)*.
* **No Martial MP Skill Bloat:** Martial heroes (**Valen, Orin, and Rowan**) do **not** carry MP skill bars or buyable Combat Manuals. Their tactical choices come straight from picking **which weapon category** to equip (`3` options per hero, each with its own **2 Attack Modes**), **Guard**, **Global Shields** (`with 1H weapons`), **Potions**, **Carved Runestones**, and their **1 Accessory Slot**.
* **8-Tier Caster Spells (`MP` — 3 Casters: Ellowyn, Mera & Harlan):** **Queen Ellowyn (`Sorceress`)**, **Mera (`Druid`)**, and **Harlan (`Sage`)** use `MP` and each have their own unique **8-Tier Spell Pool** (`3` spells offered per tier at Town **Magic Shops** across Regions `1–8` — classic Final Fantasy style). Each Caster may learn **`2 of the 3` spells per Region Tier** (`up to 16` spells total across Tiers `1–8`), keeping combat clean via **`8` Class-Themed Tier buttons** that pop open compact vertical `1:1` spell stacks. Shop curative/healing supplies come as **Potions** sold by Town **Arcanists** *(alongside each hero's `10` Discipline training tiers at Levels `1, 10… 90`)*.
* **Unique Per-Attack & Per-Spell Effects:** Every weapon attack mode and spell has its own distinct visual animation and combat effect—never generic copies.

---

## 3. Class Styles, Resolve Bonuses & Caster Spell Pools

### Class #1: Prince Valen — **Duelist** *(Precision Striker)*
* **Primary Damage Types:** **Slashing** *(Longsword, Greatsword)*, **Piercing** *(Rapier)*
* **Gear Access:** **Longsword** *(1H)*, **Greatsword** *(2H)*, **Rapier** *(1H)* + **Global Shields** *(w/ 1H weapons)* | **Armor:** `Leather, Padded Leather, Studded Leather, Spiked Leather` *(Light)*; `Breastplate, Half Plate` *(Medium)* | **Accessory (`1` Slot):** **Cloaks**
* **Weapon Attack Styles (`0 MP`):**
  * **Longsword *(1H)*:** *Quick Slash* (fast turn recovery, high accuracy) & *Heavy Cleave* (heavy damage, `+15%` Crit Chance, breaks `1` Guard point).
  * **Greatsword *(2H)*:** *Wide Sweep* (pushes target back on turn timeline) & *Overhead Rend* (heavy slam, breaks `1` extra Guard point).
  * **Rapier *(1H)*:** *Needle Thrust* (`98%` hit, fast turn) & *Heart Pierce* (`+20%` Crit Chance, ignores `25%` of Physical Defense).
* **Resolve Passives (`2×2` Wounded Thresholds):**
  * **Battered (`<50% HP`) — *Scarred Pride*:** Weapon attacks deal `+15%` damage and gain `+10%` Accuracy & Critical Chance.
  * **Critical (`<25% HP`) — *Arena Instinct*:** Damage bonus increases to `+30%`, and once per turn when hit in melee, Valen automatically counters with a fast `0 MP` strike.

---

### Class #2: Queen Ellowyn — **Sorceress** *(Elemental Caster & Arcane Warden)*
* **Primary Damage Types:** **Fire, Frost, Lightning, Radiant, Shadow**
* **Season 2 Reveal (`Hidden Arcane Craft`):** Kept completely concealed behind her "captive Queen" role during Season 1's gladiator focus, Ellowyn secretly possessed forbidden arcane mastery suppressed under Garrick's iron rule—unleashing her true Sorceress power the moment Highcrown's gates open. *(Similarly, Mera reveals hidden Druid nature-magic and Harlan steps into full Sage restorative and toxic craft.)*
* **Gear Access:** **Quarterstaff** *(2H)*, **Dagger** *(1H)*, **Light Crossbow** *(2H)* + **Global Shields** *(w/ Dagger)* | **Armor:** `Simple Robes, Fine Robes, Padded Robes, Silk Robes` *(Light)*; `Scale Plate, Dragonscale` *(Medium)* | **Accessory (`1` Slot):** **Orbs**
* **Resolve Passives (`2×2` Wounded Thresholds):**
  * **Battered (`<50% HP`) — *Caged Fury*:** Offensive spells deal `+18%` damage, and Ward/Shield spells gain `+25%` barrier strength.
  * **Critical (`<25% HP`) — *Sovereign Surge*:** Offensive spell bonus rises to `+35%`, and all spells cost `35%` less MP.

#### Ellowyn's 8-Tier Spell Pool *(Purchased at Town Magic Shops Across Regions `1–8`)*
* **Tier 1 — Region 1 *(Lv 1–12)*:**
  1. **Ember Spark** *(`5 MP`)*: Quick single-target **Fire** snap; high accuracy with a light **Burn** chance (2 turns).
  2. **Frost Shard** *(`6 MP`)*: Piercing **Frost** spike on 1 enemy; applies **Chill** to push their next turn back on the timeline.
  3. **Crown Ward** *(`7 MP`)*: Projects a protective **Ward Shield** onto 1 ally and raises their Magic Defense for 2 turns.
* **Tier 2 — Region 2 *(Lv 13–24)*:**
  1. **Arcane Fireball** *(`10 MP`)*: Blazing **Fire** orb hitting 1 target and splashing `50%` heat onto adjacent foes.
  2. **Chain Spark** *(`10 MP`)*: Fast **Lightning** bolt striking 1 enemy and arcing to 1 additional random enemy; punishes armored targets.
  3. **Dawn Gleam** *(`9 MP`)*: Concentrated **Radiant** beam on 1 target; deals extra damage to Undead & Portal Horrors and lowers enemy Accuracy.
* **Tier 3 — Region 3 *(Lv 25–36)*:**
  1. **Rime Curtain** *(`14 MP`)*: Sweeping **Frost** wave across **up to 3 enemies**, pushing all hit enemies back on the turn timeline.
  2. **Static Cage** *(`13 MP`)*: Traps 1 enemy in crackling **Lightning**; inflicts **Shock** and interrupts/delays telegraphed wind-ups.
  3. **Sovereign Aegis** *(`15 MP`)*: Raises a shimmering barrier across **2 adjacent allies** (`or self + nearest ally`), cutting incoming damage for 2 turns.
* **Tier 4 — Region 4 *(Lv 37–48)*:**
  1. **Flame Wall** *(`18 MP`)*: Ignites a roaring curtain of **Fire** across **all enemies**; heavy damage + high **Burn** rate.
  2. **Umbral Lance** *(`17 MP`)*: Piercing **Shadow** spear hitting any enemy; bypasses `40%` Magic Defense and applies **Curse**.
  3. **Arcane Conduit** *(`12 MP`)*: Channels raw mana—empowers Ellowyn’s next spell (`+35%` damage and `+1` extra Guard-point break) or restores MP to an ally.
* **Tier 5 — Region 5 *(Lv 49–60)*:**
  1. **Tempest Arc** *(`22 MP`)*: High-voltage **Lightning** storm striking **all enemies on the field** and stripping enemy evasion/dodge buffs.
  2. **Glacial Prison** *(`21 MP`)*: Encases 1 enemy in solid **Frost** crystals; heavy cold hit with a strong chance to **Stun** non-bosses (or heavy turn delay on bosses).
  3. **Purifying Halo** *(`20 MP`)*: **Radiant** ring damaging up to **3 enemies** while **cleansing 1 Curse/Shadow ailment** from the party.
* **Tier 6 — Region 6 *(Lv 61–72)*:**
  1. **Solar Flare** *(`26 MP`)*: Blinding **Fire + Radiant** eruption hitting 1 target and scorching adjacent foes; breaks **2 Guard points** on Fire/Radiant weaknesses.
  2. **Void Pull** *(`25 MP`)*: **Shadow** gravity rift hitting **all enemies**, scrambling their turn timeline order.
  3. **Mirror Veil** *(`24 MP`)*: Wraps 1 ally in a refractive ward for 2 turns—reflects `30%` of incoming magic damage back at the caster.
* **Tier 7 — Region 7 *(Lv 73–85)*:**
  1. **Blizzard Vortex** *(`31 MP`)*: Swirling **Frost** storm battering **all enemies**, infusing the battlefield with **Chill**.
  2. **Thunderhead Verdict** *(`30 MP`)*: Towering **Lightning** pillar on 1 target; ignores `50%` Magic Defense and deals massive bonus damage if target is **Shocked** or **Chilled**.
  3. **Queen’s Decree** *(`28 MP`)*: Royal aura command—grants the entire party `+20%` Physical & Magic Defense plus immediate **Momentum** for 2 turns.
* **Tier 8 — Region 8 *(Lv 86–99)*:**
  1. **Meteor** *(`42 MP`)*: Calls a devastating **Fire** comet down onto **all enemies**; massive screen-shaking impact and severe **Burn**.
  2. **Astral Judgment** *(`40 MP`)*: Twin **Radiant + Lightning** orbital strike on 1 boss/elite; colossal endgame single-target burst that strips positive enemy buffs.
  3. **Eclipse Singularity** *(`38 MP`)*: Collapses a **Shadow** rift onto the enemy ranks—heavy multi-target damage, applies **Curse**, and siphons `15%` of damage dealt back to Ellowyn as HP & MP.

---

### Class #3: Commander Orin — **Knight** *(Heavy Armored Defender)*
* **Primary Damage Types:** **Slashing** *(Battleaxe)*, **Bludgeoning** *(Mace)*, **Piercing** *(Spear)*
* **Gear Access:** **Battleaxe** *(1H)*, **Mace** *(1H)*, **Spear** *(2H)* + **Global Shields** *(w/ 1H weapons)* | **Armor:** `Hide, Scale Mail` *(Medium)*; `Ring Mail, Chain Mail, Splint, Plate` *(Heavy)* | **Accessory (`1` Slot):** **Horns**
* **Weapon Attack Styles (`0 MP`):**
  * **Battleaxe *(1H)*:** *Chopping Hack* (solid hit rate, reliable chop) & *Execution Chop* (`+25%` Crit Chance & bonus damage vs. `<50% HP` foes).
  * **Mace *(1H)*:** *Heavy Bash* (chips 1 Guard point) & *Armor Crush* (heavy slam lowering enemy Physical Defense).
  * **Spear *(2H)*:** *Long Thrust* (high-reach thrust with bonus accuracy & `+12%` Crit Chance) & *Brace Sweep* (pushes enemies back on the turn bar).
* **Resolve Passives (`2×2` Wounded Thresholds):**
  * **Battered (`<50% HP`) — *Grizzled Veteran*:** Takes `15%` less incoming damage from all sources, and Guarding grants stronger counter-momentum (`+35%` next strike) and draws enemy attention longer.
  * **Critical (`<25% HP`) — *Unbroken Wall*:** Damage mitigation rises to `25%`, and once per turn when an ally takes a single-target hit, Orin automatically **Intercepts `50%`** of that damage if not Stunned.

---

### Class #4: Rowan *(Orin's Son)* — **Ranger** *(Ranged Marksman)*
* **Primary Damage Types:** **Piercing** *(main)*, plus elemental/status effects via Carved Runestones
* **Gear Access:** **Longbow** *(2H)*, **Shortbow** *(2H)*, **Dagger** *(1H)* + **Global Shields** *(w/ Dagger)* | **Armor:** `Leather, Padded Leather, Studded Leather, Spiked Leather` *(Light)*; `Reinforced Leather, Leather Plate` *(Medium)* | **Accessory (`1` Slot):** **Quivers**
* **Weapon Attack Styles (`0 MP`):**
  * **Longbow *(2H)*:** *Snap Arrow* (fast, high accuracy) & *Aimed Piercer* (slow, aimed shot granting `+25%` Crit Chance & ignoring `25%` Physical Defense).
  * **Shortbow *(2H)*:** *Quick Volley* (fastest bow shot) & *Wing Clip* (pushes target back on the turn bar).
  * **Dagger *(1H)*:** *Quick Jab* (fast accurate stab) & *Vital Gouge* (`+15%` Crit Chance & Bleed chance).
* **Resolve Passives (`2×2` Wounded Thresholds):**
  * **Battered (`<50% HP`) — *Borderland Grit*:** `+15%` Critical Chance and `+20%` Critical Damage; shots ignore `25%` of enemy Physical Defense.
  * **Critical (`<25% HP`) — *Cornered Hawk*:** Critical bonuses rise to `+25%` Crit Chance / `+35%` Crit Damage, and Rowan gains `+12` Turn Timeline Speed until healed above `25%`.

---

### Class #5: Mera *(The Queen's Handmaid)* — **Druid** *(Wild Nature Caster)*
* **Primary Damage Types:** **Nature / Lightning / Bludgeoning / Piercing**, plus **Regen & Thorns**
* **Gear Access:** **Quarterstaff** *(2H)*, **Scimitar** *(1H)*, **Sickle** *(1H)* + **Global Shields** *(w/ 1H weapons)* | **Armor:** `Leather, Padded Leather, Studded Leather, Widowsilk Robes` *(Light)*; `Padded Bone, Reinforced Bone` *(Medium)* | **Accessory (`1` Slot):** **Crystals**
* **Weapon Attack Styles (`0 MP`):**
  * **Quarterstaff *(2H)*:** *Staff Sweep* (fast swing + nature focus) & *Crushing Vault* (Guard-chipping overhead slam).
  * **Scimitar *(1H)*:** *Crescent Cut* (fluid curved slash) & *Whirling Slash* (spinning slash with `+15%` Crit Chance & faster next turn).
  * **Sickle *(1H)*:** *Reaping Hook* (fast bleed-chance slice) & *Thorn Slash* (lowers enemy attack 1 turn).
* **Resolve Passives (`2×2` Wounded Thresholds):**
  * **Battered (`<50% HP`) — *Wildblood Instinct*:** Nature spells deal `+18%` bonus damage & healing over time, and Mera gains `+12%` Dodge Chance.
  * **Critical (`<25% HP`) — *Grove's Wrath*:** Spell bonus rises to `+32%`, and Mera gains `+15` Turn Timeline Speed until healed above `25%`.

#### Mera's 8-Tier Druid Spell Pool *(Purchased at Town Magic Shops Across Regions `1–8`)*
* **Tier 1 — Region 1 *(Lv 1–12)*:**
  1. **Thorn Lash** *(`5 MP`)*: Whips thorny vines across 1 enemy for **Piercing** damage + light **Bleed** (2 turns).
  2. **Bramble Snare** *(`6 MP`)*: Entangles 1 foe in hardened roots, chipping **1 Guard point** and delaying their next turn.
  3. **Mossy Mend** *(`6 MP`)*: Wraps 1 ally in living moss, restoring light HP immediately plus a 3-turn **Regeneration** trickle.
* **Tier 2 — Region 2 *(Lv 13–24)*:**
  1. **Gale Gust** *(`10 MP`)*: Sweeps **Lightning/Wind** force across **up to 3 enemies**, pushing their turns slightly back.
  2. **Spore Cloud** *(`9 MP`)*: Sprays choking forest spores onto **all enemies**, dealing **Poison** damage and cutting enemy Accuracy for 2 turns.
  3. **Barkskin Call** *(`9 MP`)*: Hardens 1 ally's defenses in oak-bark ward (`+30%` Physical Defense for 3 turns).
* **Tier 3 — Region 3 *(Lv 25–36)*:**
  1. **Stone Lance** *(`13 MP`)*: Drives a jagged **Bludgeoning** spire through 1 enemy; ignores `25%` Physical Defense.
  2. **Briar Wall** *(`14 MP`)*: Surrounds **2 adjacent allies** in stinging thorns reflecting `25%` of melee damage for 3 turns.
  3. **Wildfire Burst** *(`14 MP`)*: Ignites dry brush **Fire** across **up to 3 targets** with a strong **Burn** chance.
* **Tier 4 — Region 4 *(Lv 37–48)*:**
  1. **Tremor Slam** *(`18 MP`)*: Splits the earth beneath **all enemies** with **Bludgeoning** shockwaves and chips **1 Guard point**.
  2. **Verdant Bloom** *(`16 MP`)*: Restores solid HP and grants 3-turn **Regeneration** across **2 chosen/adjacent allies**.
  3. **Hawk Strike** *(`15 MP`)*: Channels wind-spirit fury into a slicing **Piercing** hit on 1 foe and pulls Mera's next turn earlier.
* **Tier 5 — Region 5 *(Lv 49–60)*:**
  1. **Razor Vines** *(`21 MP`)*: Lashes thorny steel-roots across **up to 3 foes** for heavy **Piercing** damage + strong **Bleed**.
  2. **Tempest Wing** *(`22 MP`)*: Unleashes a roaring **Lightning** gale across **all enemies**, stripping enemy positive buffs.
  3. **Grove Sanctuary** *(`20 MP`)*: Shields 1 ally with `2` turns of **Status Immunity** and restores `15 MP`.
* **Tier 6 — Region 6 *(Lv 61–72)*:**
  1. **Sunbeam Canopy** *(`25 MP`)*: Drops focused **Radiant** sunlight onto 1 foe, melting Undead & Shadow creatures for bonus damage.
  2. **Earthshatter** *(`27 MP`)*: Heaves boulders across **all enemies** with heavy **Bludgeoning** damage and chance to **Stun**.
  3. **Stag's Vigor** *(`23 MP`)*: Grants the entire party `+25%` Force & Finesse for `3` turns.
* **Tier 7 — Region 7 *(Lv 73–85)*:**
  1. **Elder Wrath** *(`31 MP`)*: Calls lightning and crushing roots down onto **all enemies**, applying **Shock** and heavy Guard damage.
  2. **Moonlit Renewal** *(`29 MP`)*: Washes the entire party in silver forest light—restoring HP, granting 3-turn **Regeneration**, and cleansing `1` ailment.
  3. **Dire Fang Spirit** *(`30 MP`)*: Summons a ghostly white wolf bite on 1 target with high Critical Multiplier (`+35%` Crit Chance).
* **Tier 8 — Region 8 *(Lv 86–99)*:**
  1. **Cataclysm Quake** *(`41 MP`)*: Rends the battlefield with volcanic **Bludgeoning + Fire** power across **all enemies**, breaking **2 Guard points**.
  2. **Heart of the Wild** *(`38 MP`)*: Party-wide massive heal + strong **Regeneration** + immediate **Momentum** for all 4 heroes.
  3. **Primal Eclipse** *(`40 MP`)*: Apex wild storm focusing **Lightning + Radiant + Piercing** fury onto 1 boss/elite.

---

### Class #6: Harlan *(The Arena Herbalist)* — **Sage** *(Healer & Remedy/Poison Caster)*
* **Primary Damage Types:** **Poison** *(main)*, plus **Radiant** purifying bursts & **Bludgeoning / Piercing** weapon hits
* **Gear Access:** **Quarterstaff** *(2H)*, **Mace** *(1H)*, **Dagger** *(1H)* + **Global Shields** *(w/ 1H weapons)* | **Armor:** `Simple Robes, Padded Robes, Silk Robes, Widowsilk Robes` *(Light)*; `Padded Bone, Reinforced Bone` *(Medium)* | **Accessory (`1` Slot):** **Tomes**
* **Resolve Passives (`2×2` Wounded Thresholds):**
  * **Battered (`<50% HP`) — *Emergency Triage*:** Healing and cleansing spells gain `+20%` potency and leave a `10%` 2-turn regen on healed allies.
  * **Critical (`<25% HP`) — *Plague-Survivor's Oath*:** Healing bonus rises to `+35%`, and Poison spells ignore `50%` of enemy Poison resistance.

#### Harlan's 8-Tier Spell Pool *(Purchased at Town Magic Shops Across Regions `1–8`; Potions at Arcanists)*
* **Tier 1 — Region 1 *(Lv 1–12)*:**
  1. **Stinging Salve** *(`4 MP`)*: Restores a crisp burst of HP to 1 ally and removes `1` **Bleed** or **Burn** *(callback to `backstory.txt` Chapter 1)*.
  2. **Bitterroot Vial** *(`5 MP`)*: Hurls a corrosive **Poison** flask at 1 enemy; deals light damage and inflicts **Poison** (3 turns).
  3. **Smelling Salts** *(`5 MP`)*: Cures **Stun, Chill, or Curse** on 1 ally and nudges their next turn slightly forward on the timeline.
* **Tier 2 — Region 2 *(Lv 13–24)*:**
  1. **Soothing Poultice** *(`9 MP`)*: Restores HP across **2 chosen/adjacent allies**.
  2. **Weakening Draught** *(`8 MP`)*: Splashes **Poison** onto 1 enemy, reducing both Physical & Magic Attack (`-15%`) for 3 turns.
  3. **Barkskin Tonic** *(`8 MP`)*: Coats 1 ally in a toughening elixir, granting `+25%` Physical Defense and Poison/Burn resistance for 3 turns.
* **Tier 3 — Region 3 *(Lv 25–36)*:**
  1. **Venom Mist** *(`12 MP`)*: Shatters a toxic cloud across **up to 3 enemies**, dealing **Poison** damage and inflicting **Poison**.
  2. **Reviving Tincture** *(`14 MP`)*: Revives a Knocked Out (`0 HP`) ally at `35% HP` with 1-turn Bleed/Poison immunity.
  3. **Adrenaline Brew** *(`11 MP`)*: Energizes 1 ally—grants immediate **Momentum** (`+25%` next hit) and `+10` Turn Timeline Speed for 2 turns.
* **Tier 4 — Region 4 *(Lv 37–48)*:**
  1. **Blightbane Remedy** *(`15 MP`)*: Party-wide **Radiant / Herbal** cleanse—removes **all active ailments** from every ally and restores a modest burst of HP.
  2. **Acidic Flask** *(`15 MP`)*: Corrosive **Poison + Bludgeoning** vial on 1 enemy; melts armor (`-25%` Physical & Magic Defense for 3 turns) and chips **1 Guard point**.
  3. **Vitality Infusion** *(`14 MP`)*: Places a strong 3-turn **Regeneration** buff on 1 ally, healing them at the start of each turn.
* **Tier 5 — Region 5 *(Lv 49–60)*:**
  1. **Mending Rain** *(`20 MP`)*: Restores solid HP to **all 4 party members**.
  2. **Plague-Spore Burst** *(`19 MP`)*: Detonates an alchemical **Poison** cloud hitting **all enemies**—deals bonus damage for every ailment already active on each foe.
  3. **Iron-Lung Elixir** *(`17 MP`)*: Grants **2 chosen/adjacent allies** immunity to new Status Ailments for 2 turns and `+20%` Magic Defense.
* **Tier 6 — Region 6 *(Lv 61–72)*:**
  1. **Miracle Balm** *(`24 MP`)*: Massive single-target emergency heal (restores ~`75%–90%` HP) and removes all ailments on that ally.
  2. **Neurotoxin Dart** *(`22 MP`)*: Concentrated **Poison** toxin on 1 enemy; inflicts severe Poison and has a strong chance to **Stun** non-bosses (or heavy turn-delay on bosses).
  3. **Mana Distillate** *(`18 MP`)*: Restores a generous burst of **MP** (`+30–45 MP`) to 1 ally and boosts their Magic Power for 2 turns.
* **Tier 7 — Region 7 *(Lv 73–85)*:**
  1. **Phoenix Draught** *(`29 MP`)*: Revives a fallen ally with `75% HP`, cleanses ailments, and grants a protective Ward Shield—or full-heals a living ally.
  2. **Rot-Cloud Catalyst** *(`28 MP`)*: Heavy **Poison + Shadow** alchemical bomb hitting **up to 3 enemies**; doubles tick damage of all active Poison & Burn effects for 2 turns.
  3. **Hero’s Panacea** *(`27 MP`)*: Party-wide master tonic granting `+20%` Defense and `15%` HP regeneration per turn for 2 turns.
* **Tier 8 — Region 8 *(Lv 86–99)*:**
  1. **Grand Elixir** *(`38 MP`)*: Fully restores **HP and clears all ailments** across **all 4 party members**.
  2. **Oakhollow Requiem** *(`36 MP`)*: Master alchemical **Poison + Radiant** burst hitting **all enemies**—strips enemy buffs, inflicts severe Poison, and heals the party for `20%` of damage dealt.
  3. **Undying Vow** *(`32 MP`)*: 2-turn party-wide emergency grace—the next time any ally would be Knocked Out, they survive at `20% HP` once.

---

## 4. Weapon & Armor Affinities *(Complete Matrix)*

| Hero / Class | Archetype | Weapons (`3` Each) | Left Hand | Armor (`6` Types = `24` Steps) | Accessory (`1` Slot) |
| :--- | :---: | :--- | :--- | :--- | :---: |
| **Valen *(Duelist)*** | Martial (`0 MP`) | Longsword *(1H)*, Greatsword *(2H)*, Rapier *(1H)* | Global Shields *(w/ 1H)* | Leather, Padded Leather, Studded Leather, Spiked Leather, Breastplate, Half Plate | Cloaks |
| **Ellowyn *(Sorceress)*** | Spellcaster | Quarterstaff *(2H)*, Dagger *(1H)*, Light Crossbow *(2H)* | Global Shields *(w/ Dagger)* | Simple Robes, Fine Robes, Padded Robes, Silk Robes, Scale Plate, Dragonscale | Orbs |
| **Orin *(Knight)*** | Martial (`0 MP`) | Battleaxe *(1H)*, Mace *(1H)*, Spear *(2H)* | Global Shields *(w/ 1H)* | Hide, Scale Mail, Ring Mail, Chain Mail, Splint, Plate | Horns |
| **Rowan *(Ranger)*** | Martial (`0 MP`) | Longbow *(2H)*, Shortbow *(2H)*, Dagger *(1H)* | Global Shields *(w/ Dagger)* | Leather, Padded Leather, Studded Leather, Spiked Leather, Reinforced Leather, Leather Plate | Quivers |
| **Mera *(Druid)*** | Spellcaster | Quarterstaff *(2H)*, Scimitar *(1H)*, Sickle *(1H)* | Global Shields *(w/ 1H)* | Leather, Padded Leather, Studded Leather, Widowsilk Robes, Padded Bone, Reinforced Bone | Crystals |
| **Harlan *(Sage)*** | Spellcaster | Quarterstaff *(2H)*, Mace *(1H)*, Dagger *(1H)* | Global Shields *(w/ 1H)* | Simple Robes, Padded Robes, Silk Robes, Widowsilk Robes, Padded Bone, Reinforced Bone | Tomes |

*All 6 heroes share `Global Shields` (with any `1H` weapon), **Carved Runestones** (`1` socket in Weapons & Body Armor), and `1` class-locked **Accessory Slot**.*
