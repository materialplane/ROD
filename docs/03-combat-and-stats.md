# ROD — Combat System & Stat Tuning Spec

> **Status:** Locked Core Spec  
> **Scope:** Damage types, the `1`–`99` stat system, speed-interleaved round turn order, top-to-bottom Party Order (`Slots 1–4`), Resolve hurt-state passives, and shop-gear scaling rules.

---

## 1. The 9 Damage Types

Damage types govern **armor mitigation, enemy weaknesses, and Runestone synergies**.  
*(Reminder: Visual animations and special effects belong to each individual weapon, skill, or spell—never one generic visual reused across a damage type.)*

### Physical (3 Types)
| Type | Primary Sources | Tactical Role |
| :--- | :--- | :--- |
| **Slashing** | Swords, greatswords, axes, claws | Reliable raw damage; strong vs. unarmored beasts and cloth foes. |
| **Piercing** | Bows, daggers, spears, fangs | High critical potential; punches cleanly through thick hides and nimble targets. |
| **Bludgeoning** | Maces, hammers, shields, heavy slams | Crushes heavy armor, skeletons/undead, and cracks enemy Guard gauges. |

### Elemental & Magic (6 Types)
| Type | Primary Sources | Tactical Role |
| :--- | :--- | :--- |
| **Fire** | Pyromancy, fire weapons/runestones | High burst damage and **Burn** pressure; strong vs. beasts, flora, and frost foes. |
| **Frost** | Cryomancy, cold weapons/runestones | Chills enemies, **lowering their Attack & Magic Power** by `15%`. |
| **Lightning** | Storm spells, shock weapons/runestones | Fast precision strikes; disrupts casting/guards and punishes heavy metal armor. |
| **Poison** | Sage brews & toxins, venom weapons, beasts | Lingering **Poison** damage-over-time and weakens enemy physical output. |
| **Shadow** | Dark magic, Garrick's undead & portal foes | Saps vitality, applies **Curse**, and bypasses conventional armor. |
| **Radiant** | Sorceress & Sage wards, light/spirit skills | Counters **Shadow** and deals bonus damage to **undead & portal horrors**. |

### Weakness & Resistance Multipliers
* **Weakness (`1.5×` damage):** Also chips **1 Guard point** off armored/elite enemies and reveals that weakness permanently on the enemy's info card.
* **Neutral (`1.0×` damage):** Standard hit.
* **Resistant (`0.5×` damage):** Reduced damage; does not chip Guard.
* **Immune (`0×` damage):** Fully negated (used sparingly on pure elemental horrors).

---

## 2. The 5 Core Attributes (`1` to `99+`)

All 6 selectable heroes start at **Level 1** with **`1` point in every attribute**.  
Every single `+1` point you invest gives an immediate combat improvement (zero "dead" points)—all hero perks come cleanly from **Arcanist Disciplines** (`1` Body, Mind, or Spirit choice at **Lv `1, 10, 20, 30, 40, 50, 60, 70, 80, 90`** = `10` total perks per hero), innate **Resolve** thresholds, and equipped **Runestones**.

*(Balance Safeguard: Percentage perks like Dodge, Crit Chance, and Resistance use smooth caps so Level 99 heroes feel legendary without becoming invincible, while raw damage, HP, MP, defense, and healing keep climbing.)*

### 1. Force *(Physical Power & Posture)*
* **Every `+1` Point Gives:** `+1.5%` physical weapon & skill damage (especially **Slashing** and **Bludgeoning** weapons) + stronger Guard pressure.

### 2. Finesse *(Precision, Dodge & Criticals)*
* **Every `+1` Point Gives:** `+0.5%` Accuracy, `+0.3%` Dodge *(capped at `+35%` with gear)*, `+0.4%` Crit Chance *(capped at `+35%` from Finesse)*, and `+1.2%` **Piercing** weapon damage (bows/daggers).

### 3. Grit *(Health, Armor & Survival)*
* **Every `+1` Point Gives:** `+12` Max HP, `+1` Physical Defense, and `+0.5%` resistance to **Poison, Burn, Chill, and Stun** *(capped at `+50%` from Grit)*.

### 4. Arcana *(Magic Power & Mana Pool)*
* **Every `+1` Point Gives:** `+4` Max MP and `+1.6%` offensive magic damage across all 6 elemental/magic types (**Fire, Frost, Lightning, Poison, Shadow, Radiant**).

### 5. Presence *(Healing, Buffs & Magic Defense)*
* **Every `+1` Point Gives:** `+1.5%` Healing & Shielding potency, `+1%` Aura/Buff strength, `+1` **Magic Defense**, and `+0.5%` **Shadow/Curse** resistance *(capped at `+50%` from Presence)*.

---

## 3. Level `1`–`99` Progression & Pacing

### Zone-by-Zone Progression & Portal Targets *(`20` Level Zones · `24` Gear Tiers)*
| Map · Continent Half | Level Zones *(`5` Lv Each)* | Shop Gear Tiers | Milestone |
| :--- | :--- | :---: | :--- |
| **Map 1 — First Half** *(Crownlands)* | **Zones `1–3`** (`Lv 1–15`) | Tiers `1–4` *(`Z02`: `2–3`)* | **Portal #1** *(`Z03`, unlocks Ferry)* |
| **Map 1 — Second Half** *(Saltmarsh Coast)* | **Zones `4–5`** (`Lv 16–25`) | Tiers `5–6` | **Portal #2** *(`Z05`, Captain sails $\to$ Map 2)* |
| **Map 2 — First Half** *(Thornwall Warfronts)* | **Zones `6–8`** (`Lv 26–40`) | Tiers `7–9` | **Portal #3** *(`Z08`, unlocks Ferry)* |
| **Map 2 — Second Half** *(Verdant Weald)* | **Zones `9–10`** (`Lv 41–50`) | Tiers `10–12` *(`Z09`: `10–11`)* | **Portal #4** *(`Z10`, Captain sails $\to$ Map 3)* |
| **Map 3 — First Half** *(Sun-Scorched Isles)* | **Zones `11–13`** (`Lv 51–65`) | Tiers `13–15` | **Portal #5** *(`Z13`, unlocks Ferry)* |
| **Map 3 — Second Half** *(Ironcrest Highlands)* | **Zones `14–15`** (`Lv 66–75`) | Tiers `16–18` *(`Z14`: `16–17`)* | **Portal #6** *(`Z15`, Captain sails $\to$ Map 4)* |
| **Map 4 — First Half** *(Frostbound Reach)* | **Zones `16–18`** (`Lv 76–90`) | Tiers `19–22` *(`Z16`: `19–20`)* | **Portal #7** *(`Z18`, opens Pass Gates)* |
| **Map 4 — Second Half** *(The Dreadwaste)* | **Zones `19–20`** (`Lv 91–99`) | Tiers `23–24` | **Portal #8** *(`Z20`: **King Garrick** Finale)* |

### Exact Level `1`–`99` Interval Table
* **Stat Points Earned:** `+2` per level, plus `+1` bonus point on every 5th level (`5, 10, 15... 95`). Total earned = **`215` points** (`220` total attribute points including the starting `1` in all 5 stats).
* **Baseline Vitals (before Grit, Arcana, Class flavor & Gear):** Starts at `35 Base HP / 15 Base MP`, growing cleanly by `+18 HP / +3 MP` per level.

| Level | Earned Points | Total Stat Budget | Base HP *(+Grit)* | Base MP *(+Arcana)* | Unlocks / Milestones |
| :---: | :---: | :---: | :---: | :---: | :--- |
| **1** | `0` | `5` *(all `1`s)* | `35` *(~47 total)* | `15` *(casters ~19 total)* | **Discipline Tier `1`**; **1 Accessory Slot**; equipped weapon attack modes |
| **10** | `20` | `25` | `197` | `42` | **Discipline Tier `2`** (`1`-of-`2` Arcanist choice) |
| **20** | `42` | `47` | `377` | `72` | **Discipline Tier `3`**; Map 1 second-half (`Zones 4–5`) gear milestone |
| **30** | `64` | `69` | `557` | `102` | **Discipline Tier `4`** |
| **40** | `86` | `91` | `737` | `132` | **Discipline Tier `5`**; Mid-game shop gear & Spell Tier 4 milestone |
| **50** | `108` | `113` | `917` | `162` | **Discipline Tier `6`**; Map 3 arrival (`Zone 11`) gear milestone |
| **60** | `130` | `135` | `1,097` | `192` | **Discipline Tier `7`**; High-tier shop gear & spell upgrades |
| **70** | `152` | `157` | `1,277` | `222` | **Discipline Tier `8`** |
| **80** | `174` | `179` | `1,457` | `252` | **Discipline Tier `9`**; Map 4 (`Gear Tier 20` / `Spell Tier 7`) milestone |
| **90** | `196` | `201` | `1,637` | `282` | **Discipline Tier `10`** *(Final Arcanist Capstone Perk)* |
| **99** | `215` | `220` | `1,799` *(~2,500–3,200+)* | `309` *(~450–700+)* | **Max Level Cap** |

* **Weapon Styles & Caster Spell Unlocks:** Martial heroes (**Valen, Orin, Rowan**) fight with their **equipped weapon's 2 unique `0 MP` Attack Modes** plus **10 Arcanist Discipline Perks** (`Lv 1, 10… 90`), Runestones, and Accessories; **Ellowyn (`Sorceress`), Mera (`Druid`), and Harlan (`Sage`)** also wield their own 8-tier spell pool unlocked across Ethoria's `8` campaign progression bands (detailed in `docs/05-cast-and-skills.md`).

---

## 4. Battle Flow & Tactical Rules

### Speed-Interleaved Round Order *(Agility / Role Turn Mixing)*
* Each Round gives every living hero and enemy **1 action** (`plus Bonus Turns`), ordered at the top of battle by **Agility / Role Speed** *(Hero Speed driven by class agility, armor weight, and `Finesse`; Enemy Speed driven by monster role & level, modified by `Haste`/`Chill` and slight round jitter)* so quick enemies act mid-round instead of always waiting behind all 4 heroes.
* Normal encounters procedurally spawn **`3–5` small enemies** or **big/medium centerpieces flanked by biome escorts** across the `4×3` battlefield grid (`zero tile overflow`), scaling per-foe durability & rewards smoothly across all 20 Zones (`Lv 1–99`).
* Light weapon attacks stay usable **every turn (`0` Cooldown)**; Heavy weapon skills pack higher damage and Guard/Armor breaks with a **`1-Turn Cooldown`** after use.
* When a hero's turn arrives, the player immediately chooses: **Attack (`Weapon Mode A or B`)**, **Magic / Remedies (`MP` — Ellowyn, Mera & Harlan)**, **Item**, **Guard**, or **Flee** *(disabled in Boss fights)*.

### Top-to-Bottom Party Order (`Slots 1–4` — No Row Complexity)
* **Single Clean Column (`Slots 1–4`):** Heroes stand in battle ordered **top-to-bottom (`Slot 1 → Slot 4`)** matching the **Top-Left Vertical Party Bar** and **Party Menu (`P`)**—zero Frontline/Backline row locks, zero Backline melee penalties, and zero `Swap Row` turns.
* **Slot 1 Sets Your Overworld Leader:** Whichever companion sits in **Party Slot 1** appears as your walking VTT avatar token on Overworld, Town, and Dungeon maps (`reordered anytime outside combat in the Party Menu via P`).
* **Full Reach Everywhere:** Every weapon (`melee, ranged, and magic`) strikes enemies cleanly from any party slot, while enemy/ally skills target single targets, adjacent groups (`2–3` targets), or the full party/field.

### Telegraphed Attacks, Guarding & Guard Break
* **Telegraphed Boss Moves:** Dangerous enemy attacks display a warning marker on the enemy & turn strip one round before firing.
* **Meaningful Guard:** Selecting **Guard** halves incoming damage until that hero's next round (plus extra mitigation from `Grit`) and grants **Momentum** (`+25%` damage on the hero's next Weapon Attack or Spell).
* **Enemy Guard Gauge & Stagger:** Elite foes and Portal Bosses carry **2–5 Guard points**. Hitting their **Weaknesses** breaks a point; breaking all points **Staggers** the enemy for 1 full turn (**skips their next action** and increases all damage they take by **`1.5×`**), after which their Guard recovers cleanly for at least 1 active action before it can be broken again.

---

## 5. Health States & Resolve Passives (`2×2` Token Integration)

Every hero's active `2×2` token cell tracks their current HP percentage—and crossing downward unlocks **Resolve**, turning desperate fights into tactical comebacks:

| HP Threshold | Visual Token State | Gameplay Effect |
| :--- | :--- | :--- |
| **100% – 75% HP** | Cell 1 (Healthy) | Standard baseline performance. |
| **74% – 50% HP** | Cell 2 (Lightly Hurt) | First cuts & grime visible; warning indicator. |
| **49% – 25% HP** | Cell 3 (Battered) | **Resolve Tier 1 Activates:** Class-specific passive awakens. |
| **24% – 1% HP** | Cell 4 (Critical) | **Resolve Tier 2 Activates:** Stronger comeback bonus triggers. |
| **0 HP** | Dimmed / Grayscale Cell 4 | **Knocked Out:** Cannot act until revived via Sage skill or Revival Item. |

*(Each of the 6 classes gets a unique Resolve theme defined in `docs/05-cast-and-skills.md`—for example, heavy counter-damage for Valen, cheaper/stronger spells for Ellowyn, desperate healing surges for Harlan.)*

---

## 6. Core Status Conditions

Status ailments stay clean, readable, and impactful (never bloated):

| Status | Mechanical Effect |
| :--- | :--- |
| **Burn** | Deals Fire damage each turn; reduces incoming healing by `25%`. |
| **Chill** | Frostbite numbness; reduces outgoing Attack & Magic Power by `15%`. |
| **Shock** | Next hit taken deals bonus burst damage; risks interrupting channeled/telegraphed moves. |
| **Poison** | Deals scaling Poison damage each turn and lowers outgoing physical damage (`15%`). |
| **Curse** | Shadow affliction; lowers outgoing damage and healing potency by `20%`. |
| **Stun** | Target loses their next action in the round (Bosses resist back-to-back Stuns). |

---

## 7. Behind-the-Scenes Balance Rule (How Stats & Shop Gear Fit Together)

* **Shop Gear Sets Your Baseline Power:** Weapons provide the core **Attack Power** and Attire provides the core **Armor Defense** expected for that Level Zone. Walking into **Zone 4** or **Map 2** wearing **Zone 1–2 (`Tier 1–2`)** gear will hurt—forcing players to earn silver and upgrade in town.
* **Your 5 Stats Multiply & Shape Your Build:** `Force`, `Finesse`, `Grit`, `Arcana`, and `Presence` determine *who* excels with *which* gear, how often you dodge, how hard you crit, and how well you survive.
* **Quest Runestones Shape Builds:** With roughly 180–200 Runestones earned across the world's 40 Hubs, socketing a Runestone is a committed build choice—inserting a Runestone is permanent (and slotting a new one overwrites and destroys the old Runestone), adding special combat mechanics (lifesteal, elemental infusion, Resolve synergy, Guard-point breaking) onto whatever gear you choose to invest in.

---

## 8. XP Curve, Silver Economy & Combat Math Tuning

### A. Level `1`–`99` XP Curve
* **Formula:** `XP_To_Next_Level(L) = 100 × L + 12 × L²` *(per party member; active 4 heroes earn full XP)*
* **Natural Content Pacing (Zero Forced Grind Walls — Decoupled From Silver):** XP and Silver scale **independently** across Ethoria so neither forces repetitive grinding. Simply exploring all `4` continents, clearing `178` quests (`151` dungeon sites, `16` hub events, `11` couriers), conquering the `8` Portals, and taking optional **`0–3` Zone Outpost Hunts** naturally carries the party from **`Lv 1` to `Lv 91–99`** across `~100–200+` hours of real content—with Hunts acting strictly as an optional catch-up valve and completionist milestone (`25 / 100 / 200 / 500`) rather than a mandatory grind gate.
* **Hidden Zone Stealth *(Internal Overworld Encounter Pacing — Never Advertised)*:**
  * Each of the **`20` 5-level Zones** (`Zone_Min`–`Zone_Max`) tracks an invisible, internal stealth value based on the party's level relative to that Zone (`never shown in any HUD meter, menu, stat line, or tutorial`).
  * **Baseline (`0%` Stealth):** At or below a Zone's entry level (`<= Zone_Min`), the party is `100%` visible and overworld wild encounters build up at the normal `100%` rate.
  * **Max Zone Stealth (`-30%` Overworld Spawns):** As the party outlevels a Zone's level band, internal stealth climbs gradually up to a cap of **`30%` slower overworld encounter buildup (`70%` normal rate)** at max stealth for that Zone tier—nudging players onward into stronger Zones without stopping anyone who wants to linger.
  * **Active Quest / Hunt Bypass:** Whenever the player has an active **Hub Quest** or **Zone Outpost Hunt** for that Zone, Zone Stealth is ignored (`100%` normal encounter buildup) so questing and repeatable hunts never slow down. *(Instanced `1:1` Dungeons & Portals are unaffected.)*
* **Coastal Encounter Buffer *(4-Hex Ocean Adjacency — No Beach Tracking Needed)*:**
  * Painted **Beach** biomes (`Sandy Cove Beaches`, `Veridian Coast Beaches`, `Frost-Shore Beaches`) remain intact for map clarity and the live HUD **Biome** readout (`see docs/09`), but encounter spawning does **not** track or multiply spawns specifically on Beach tiles (`zero special Beach-only triggers or cooldowns`).
  * **Within `4` Hexes of Ocean:** Any walkable terrain within **`4` painted hexes of Ocean water (`kind: "ocean"`)** is treated as coastal range and can spawn that Zone's **coastal mobs** *(when that Zone includes coastal species)* alongside its current land biome pool under classic invisible step-based random encounters and **Zone Stealth** pacing.
  * **No Map `4` Beach-Only Pool Required:** Zones without distinct coastal beasts (such as **Map `4`'s** tiny frost-shore slivers) simply pull from their Zone's normal adjacent biome tables.

| Level Jump | XP Required for Next Level | Avg Natural Fights per Level | Zone & Portal Context |
| :---: | :---: | :---: | :--- |
| **1 $\to$ 2** | `112 XP` | `6–8` fights | **Zone 1** Outskirts *(Highcrown)* |
| **5 $\to$ 6** | `800 XP` | `18–22` fights | **Zone 2** Approaches *(Crownlands)* |
| **12 $\to$ 13** | `2,928 XP` | `26–32` fights | **Zone 3** *(Saltwind / Portal #1)* |
| **24 $\to$ 25** | `9,312 XP` | `28–34` fights | **Zone 5** *(Portal #2 / Map 2 Ship)* |
| **36 $\to$ 37** | `19,152 XP` | `28–34` fights | **Zone 8** *(Portal #3)* |
| **48 $\to$ 49** | `32,448 XP` | `28–34` fights | **Zone 10** *(Portal #4 / Map 3 Ship)* |
| **60 $\to$ 61** | `49,200 XP` | `26–32` fights | **Zone 13** *(Portal #5)* |
| **72 $\to$ 73** | `69,408 XP` | `26–32` fights | **Zone 15** *(Portal #6 / Map 4 Ship)* |
| **85 $\to$ 86** | `95,200 XP` | `28–33` fights | **Zone 18** *(Portal #7)* |
| **98 $\to$ 99** | `125,048 XP` | `28–34` fights | Endgame (*Bone Reliquary* / *Dreadwaste*) |

---

### B. Zone XP, Silver & Trade Goods Economy
* **Trade Goods Loop:** Roughly **`1/3`** of wilderness fight value drops as direct Silver and **`2/3`** drops as **Trade Goods** sold to dedicated Town **Trade Goods Buyers** (`zero crafting clutter`).
* **Gear Sell-Back:** Replaced shop gear sells back for **`40%`** of its purchase price.
* **Potions & Magic Shop Spells:** Shop healing, mana recovery, revives, and status cures come as **Potions** sold at town **Arcanists**, while Casters (**Ellowyn, Mera, Harlan**) purchase their Tier `1–8` class **Spells** at Town **Magic Shops**.

| Map · Level Zones | Lv Band | Avg Fight XP *(Per Hero)* | Avg Fight Value *(Silver + Trade Goods)* | One-Time Quest Silver | Zone Outpost Hunt Silver | Avg Normal Mob HP | Portal Boss HP *(Target)* |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Map 1 (`Z01–03`)** | `1–15` | `10 – 95 XP` | `13s – 28s` | `18s – 375s` | `45s – 140s` | `32 – 140 HP` | `~650 HP` |
| **Map 1 (`Z04–05`)** | `16–25` | `80 – 375 XP` | `21s – 93s` | `260s – 520s` | `300s – 790s` | `160 – 450 HP` | `~2,400 HP` |
| **Map 2 (`Z06–08`)** | `26–40` | `275 – 795 XP` | `72s – 235s` | `690s – 1,450s` | `1,300s – 2,700s` | `500 – 1,050 HP` | `~6,000 HP` |
| **Map 2 (`Z09–10`)** | `41–50` | `555 – 1,425 XP` | `180s – 520s` | `1,500s – 2,600s` | `3,750s – 5,100s` | `1,150 – 1,950 HP` | `~12,500 HP` |
| **Map 3 (`Z11–13`)** | `51–65` | `940 – 2,175 XP` | `380s – 1,005s` | `3,000s – 5,350s` | `7,200s – 9,500s` | `2,100 – 3,200 HP` | `~22,000 HP` |
| **Map 3 (`Z14–15`)** | `66–75` | `1,395 – 3,090 XP` | `720s – 1,875s` | `5,800s – 9,500s` | `12,500s – 20,000s` | `3,400 – 4,900 HP` | `~36,000 HP` |
| **Map 4 (`Z16–18`)** | `76–90` | `1,935 – 4,110 XP` | `1,300s – 3,240s` | `10,500s – 16,800s` | `26,000s – 33,000s` | `5,100 – 7,200 HP` | `~55,000 HP` |
| **Map 4 (`Z19–20`)** | `91–99` | `2,505 – 5,130 XP` | `2,200s – 5,520s` | `18,000s – 30,000s` | `41,500s – 64,500s` | `7,500 – 10,500 HP` | `~90,000 HP` *(2-Phase Garrick)* |

---

### C. Core Combat Damage & Defense Formulas *(For Engine Implementation)*
* **Physical Attack Raw:** `(Weapon_Attack + 4 + Hero_Level × 1.5) × (1 + Primary_Attr × 0.015) × Skill_Multiplier`
* **Magic Attack Raw:** `(Weapon_Magic + 5 + Hero_Level × 1.5) × (1 + Arcana × 0.016) × Spell_Multiplier`
* **Healing Raw:** `(Weapon_Heal + 6 + Hero_Level × 1.4) × (1 + Presence × 0.015) × Heal_Multiplier`
* **Mitigation:** `Final_Damage = Raw × (100 / (100 + Target_Defense × 0.5)) × Weakness_Multiplier`
  * *Target_Defense* = `Body_Def + Helmet_Def + Shield_Def + Grit` *(Physical)* or `Body_MDef + Helmet_MDef + Presence` *(Magic)*.
  * *Critical Hit:* `1.5×` *(raised by Discipline Perks, Runestones, and Quivers)*.
  * *Staggered Bonus:* `1.5×` damage while enemy Guard is broken.
  * *Skill Multipliers (Standard Baseline):* Basic Attack Mode A `1.0×` | Basic Mode B `1.35×` | Single-Target Skills `1.3× – 2.2×` | Multi-Target Group AoE `0.95× – 1.35×` | Full-Field AoE `0.85× – 1.25×`.
