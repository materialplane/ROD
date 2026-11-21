# ROD — Combat System & Stat Tuning Spec

> **Status:** Locked Core Spec  
> **Scope:** Damage types, the `1`–`99` stat system, turn-order timeline, top-to-bottom Party Order (`Slots 1–4`), Resolve hurt-state passives, and shop-gear scaling rules.

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
| **Frost** | Cryomancy, cold weapons/runestones | Chills enemies, **pushing their turns back** on the timeline. |
| **Lightning** | Storm spells, shock weapons/runestones | Fast precision strikes; disrupts casting/guards and punishes heavy metal armor. |
| **Poison** | Herbalist brews, venom weapons, beasts | Lingering **Poison** damage-over-time and weakens enemy physical output. |
| **Shadow** | Dark magic, Garrick's undead & portal foes | Saps vitality, applies **Curse**, and bypasses conventional armor. |
| **Radiant** | Mystic wards, light/spirit skills | Counters **Shadow** and deals bonus damage to **undead & portal horrors**. |

### Weakness & Resistance Multipliers
* **Weakness (`1.5×` damage):** Also chips **1 Guard point** off armored/elite enemies and reveals that weakness permanently on the enemy's info card.
* **Neutral (`1.0×` damage):** Standard hit.
* **Resistant (`0.5×` damage):** Reduced damage; does not chip Guard.
* **Immune (`0×` damage):** Fully negated (used sparingly on pure elemental horrors).

---

## 2. The 5 Core Attributes (`1` to `99+`)

All 6 selectable heroes start at **Level 1** with **`1` point in every attribute**.  
Every single `+1` point you invest gives an immediate combat improvement (zero "dead" points), **and** hitting **`20 / 40 / 60 / 80 / 100`** in any attribute unlocks a permanent **Mastery Perk**.

*(Balance Safeguard: Percentage perks like Dodge, Crit Chance, and Resistance use smooth caps so Level 99 heroes feel legendary without becoming invincible, while raw damage, HP, MP, speed, defense, and healing keep climbing.)*

### 1. Force *(Physical Power & Posture)*
* **Every `+1` Point Gives:** `+1.5%` physical weapon & skill damage (especially **Slashing** and **Bludgeoning** weapons) + stronger knockback/Guard pressure.
* **Attribute Mastery Intervals:**
  * **`20 Force`:** Heavy melee strikes deal `+10%` bonus damage to Guarded/Shielded foes.
  * **`40 Force`:** Standard Attacks have a `20%` chance to knock an enemy back or chip an extra Guard pip.
  * **`60 Force`:** Ignore `15%` of enemy Physical Defense.
  * **`80 Force`:** Breaking an enemy's Guard grants the hero an immediate **Momentum** charge (`+25%` next hit).
  * **`100 Force`:** Melee critical hits cleave `25%` of damage onto an adjacent enemy.

### 2. Finesse *(Speed, Precision & Criticals)*
* **Every `+1` Point Gives:** `+1` Turn Timeline Speed, `+0.5%` Accuracy, `+0.3%` Dodge *(capped at `+25%` from Finesse)*, `+0.4%` Crit Chance *(capped at `+35%` from Finesse)*, and `+1.2%` **Piercing** weapon damage (bows/daggers).
* **Attribute Mastery Intervals:**
  * **`20 Finesse`:** Always act earlier in the opening turn of normal ambushes/battles (`+15` opening initiative).
  * **`40 Finesse`:** Critical hits deal `+20%` bonus damage.
  * **`60 Finesse`:** Dodging an attack immediately shifts your next turn forward on the timeline.
  * **`80 Finesse`:** First Attack or Skill in every battle gains `+25%` Critical Chance.
  * **`100 Finesse`:** Critical hits trigger a free follow-up pierce/bleed strike (or refund `10%` of spell MP cost for casters).

### 3. Grit *(Health, Armor & Survival)*
* **Every `+1` Point Gives:** `+12` Max HP, `+1` Physical Defense, and `+0.5%` resistance to **Poison, Burn, Chill, and Stun** *(capped at `+50%` from Grit)*.
* **Attribute Mastery Intervals:**
  * **`20 Grit`:** Guarding reduces incoming damage by `60%` instead of `50%`.
  * **`40 Grit`:** Recover `5%` Max HP automatically at the end of every victorious battle.
  * **`60 Grit`:** **Last Stand** — Once per battle, survive a lethal hit with `1 HP` instead of being Knocked Out *(synergizes with Critical Resolve!)*.
  * **`80 Grit`:** Poison and Burn damage taken each turn is cut by `35%`.
  * **`100 Grit`:** Reduce all incoming physical damage by a flat `15%`.

### 4. Arcana *(Magic Power & Mana Pool)*
* **Every `+1` Point Gives:** `+4` Max MP and `+1.6%` offensive magic damage across all 6 elemental/magic types (**Fire, Frost, Lightning, Poison, Shadow, Radiant**).
* **Attribute Mastery Intervals:**
  * **`20 Arcana`:** Recover `3` MP every time you use **Guard**.
  * **`40 Arcana`:** Offensive spells can now land **Critical Hits** (`1.5×` damage).
  * **`60 Arcana`:** Hitting an enemy's Elemental Weakness restores `5%` Max MP.
  * **`80 Arcana`:** Status effects applied by your spells (**Burn, Chill, Shock, Poison, Curse**) last `+1` extra turn.
  * **`100 Arcana`:** Once per battle, your first spell while Battered (`<50% HP`) costs `0 MP`.

### 5. Presence *(Healing, Buffs & Magic Defense)*
* **Every `+1` Point Gives:** `+1.5%` Healing & Shielding potency, `+1%` Aura/Buff strength, `+1` **Magic Defense**, and `+0.5%` **Shadow/Curse** resistance *(capped at `+50%` from Presence)*.
* **Attribute Mastery Intervals:**
  * **`20 Presence`:** Healing and shielding skills used on allies Battered (`<50% HP`) gain `+20%` bonus potency.
  * **`40 Presence`:** Healing skills/items used by this hero also cleanse `1` minor ailment when the target is below `50%` HP.
  * **`60 Presence`:** Party-wide buffs applied by this hero last `+1` extra turn.
  * **`80 Presence`:** Active allies gain `+10%` resistance to Stun & Curse.
  * **`100 Presence`:** Reviving a Knocked Out ally restores them to `50% HP` instead of low HP and grants them immediate Momentum.

---

## 3. Level `1`–`99` Progression & Pacing

### Realm-by-Realm Level Targets
| Realm | Target Level Range | Shop Gear Steps | Milestone |
| :--- | :--- | :--- | :--- |
| **Region 1** | Levels `1–12` | Steps `1–3` | Portal Boss #1 |
| **Region 2** | Levels `13–24` | Steps `4–6` | Portal Boss #2 |
| **Region 3** | Levels `25–36` | Steps `7–9` | Portal Boss #3 |
| **Region 4** | Levels `37–48` | Steps `10–12` | Portal Boss #4 |
| **Region 5** | Levels `49–60` | Steps `13–15` | Portal Boss #5 |
| **Region 6** | Levels `61–72` | Steps `16–18` | Portal Boss #6 |
| **Region 7** | Levels `73–85` | Steps `19–21` | Portal Boss #7 |
| **Region 8** | Levels `86–99` | Steps `22–24` | Portal Boss #8: **King Garrick** *(Finale)* |

### Exact Level `1`–`99` Interval Table
* **Stat Points Earned:** `+2` per level, plus `+1` bonus point on every 5th level (`5, 10, 15... 95`). Total earned = **`215` points** (`220` total attribute points including the starting `1` in all 5 stats).
* **Baseline Vitals (before Grit, Arcana, Class flavor & Gear):** Starts at `35 Base HP / 15 Base MP`, growing cleanly by `+18 HP / +3 MP` per level.

| Level | Earned Points | Total Stat Budget | Base HP *(+Grit)* | Base MP *(+Arcana)* | Unlocks / Milestones |
| :---: | :---: | :---: | :---: | :---: | :--- |
| **1** | `0` | `5` *(all `1`s)* | `35` *(~47 total)* | `15` *(casters ~19 total)* | **1 Accessory Slot**; equipped weapon attack modes *(Casters learn their Tier 1 spells naturally — zero shop Tomes)* |
| **10** | `20` | `25` | `197` | `42` | First `20`-pt Mastery perk reachable |
| **20** | `42` | `47` | `377` | `72` | Region 2–3 shop gear milestone |
| **30** | `64` | `69` | `557` | `102` | First `40`-pt Mastery perk reachable |
| **40** | `86` | `91` | `737` | `132` | Mid-game shop gear & spell tier milestone |
| **50** | `108` | `113` | `917` | `162` | `60`-pt Mastery reachable; Region 5 shop gear milestone |
| **60** | `130` | `135` | `1,097` | `192` | High-tier shop gear & spell upgrades |
| **70** | `152` | `157` | `1,277` | `222` | `80`-pt Mastery perk reachable |
| **80** | `174` | `179` | `1,457` | `252` | Endgame gear & Region 8 spell tier |
| **90** | `196` | `201` | `1,637` | `282` | `100`-pt Capstone Mastery reachable |
| **99** | `215` | `220` | `1,799` *(~2,500–3,200+)* | `309` *(~450–700+)* | **Max Level Cap** |

* **Weapon Styles & Caster Spell Unlocks:** Martial heroes (**Valen, Orin, Rowan**) fight with their **equipped weapon's 2 unique `0 MP` Attack Modes** plus Stat Mastery Perks, Runestones, and Accessories; **Ellowyn (`Mystic`), Mera (`Druid`), and Harlan (`Herbalist`)** each unlock their own unique 8-tier spell pool naturally as they level across the 8 Regions (zero shop-bought spells — detailed in `docs/05-cast-and-skills.md`).

---

## 4. Battle Flow & Tactical Rules

### Visible Turn-Order Timeline
* A timeline bar shows the **next 8–10 upcoming turns** (heroes and monsters mixed by `Finesse`).
* Fast actions keep your next turn closer; heavy skills or **Frost** chills push a target's next turn further down the bar.
* When a hero's turn arrives, the player immediately chooses: **Attack (`Weapon Mode A or B`)**, **Magic / Remedies (`MP` — Ellowyn & Harlan)**, **Item**, **Guard**, or **Flee** *(disabled in Boss fights)*.

### Top-to-Bottom Party Order (`Slots 1–4` — No Row Complexity)
* **Single Clean Column (`Slots 1–4`):** Heroes stand in battle ordered **top-to-bottom (`Slot 1 → Slot 4`)** matching the **Top-Left Vertical Party Bar** and **Party Menu (`P`)**—zero Frontline/Backline row locks, zero Backline melee penalties, and zero `Swap Row` turns.
* **Slot 1 Sets Your Overworld Leader:** Whichever companion sits in **Party Slot 1** appears as your walking VTT avatar token on Overworld, Town, and Dungeon maps (`reordered anytime outside combat in the Party Menu via P`).
* **Full Reach Everywhere:** Every weapon (`melee, ranged, and magic`) strikes enemies cleanly from any party slot, while enemy/ally skills target single targets, adjacent groups (`2–3` targets), or the full party/field.

### Telegraphed Attacks, Guarding & Guard Break
* **Telegraphed Boss Moves:** Dangerous enemy attacks display a warning marker on the turn timeline one turn before firing.
* **Meaningful Guard:** Selecting **Guard** halves incoming damage (plus extra mitigation from `Grit`), resists timeline knockback, and grants **Momentum** (acts slightly faster next turn with `+25%` damage on the hero's next Weapon Attack or Spell).
* **Enemy Guard Gauge & Stagger:** Elite foes and Portal Bosses carry **2–5 Guard pips**. Hitting their **Weaknesses** breaks a pip; breaking all pips **Staggers** the enemy for 1 full turn (**skips their next action** and increases all damage they take by **`1.5×`**).

---

## 5. Health States & Resolve Passives (`2×2` Token Integration)

Every hero's active `2×2` token cell tracks their current HP percentage—and crossing downward unlocks **Resolve**, turning desperate fights into tactical comebacks:

| HP Threshold | Visual Token State | Gameplay Effect |
| :--- | :--- | :--- |
| **100% – 75% HP** | Cell 1 (Healthy) | Standard baseline performance. |
| **74% – 50% HP** | Cell 2 (Lightly Hurt) | First cuts & grime visible; warning indicator. |
| **49% – 25% HP** | Cell 3 (Battered) | **Resolve Tier 1 Activates:** Class-specific passive awakens. |
| **24% – 1% HP** | Cell 4 (Critical) | **Resolve Tier 2 Activates:** Stronger comeback bonus triggers. |
| **0 HP** | Dimmed / Grayscale Cell 4 | **Knocked Out:** Cannot act until revived via Herbalist skill or Revival Item. |

*(Each of the 6 classes gets a unique Resolve theme defined in `docs/05-cast-and-skills.md`—for example, heavy counter-damage for Valen, cheaper/stronger spells for Ellowyn, desperate healing surges for the Herbalist.)*

---

## 6. Core Status Conditions

Status ailments stay clean, readable, and impactful (never bloated):

| Status | Mechanical Effect |
| :--- | :--- |
| **Burn** | Deals Fire damage each turn; reduces incoming healing by `25%`. |
| **Chill** | Slows turn speed (`Finesse` penalty) and pushes the next turn back on the timeline. |
| **Shock** | Next hit taken deals bonus burst damage; risks interrupting channeled/telegraphed moves. |
| **Poison** | Deals scaling Poison damage each turn and lowers outgoing physical damage (`15%`). |
| **Curse** | Shadow affliction; lowers outgoing damage and healing potency by `20%`. |
| **Stun** | Target loses their next turn on the timeline (Bosses resist back-to-back Stuns). |

---

## 7. Behind-the-Scenes Balance Rule (How Stats & Shop Gear Fit Together)

* **Shop Gear Sets Your Baseline Power:** Weapons provide the core **Attack Power** and Attire provides the core **Armor Defense** expected for that Realm's Danger Sub-Zones. Walking into Realm 2's Deep Frontier wearing Realm 1 Tier-2 gear will hurt—forcing players to earn silver and upgrade in town.
* **Your 5 Stats Multiply & Shape Your Build:** `Force`, `Finesse`, `Grit`, `Arcana`, and `Presence` determine *who* excels with *which* gear, how fast you move, how hard you crit, and how well you survive.
* **Quest Runestones Shape Builds:** With roughly 180–200 Runestones earned across the world's 40 Hubs, socketing a Runestone is a committed build choice—inserting a Runestone is permanent (and slotting a new one overwrites and destroys the old Runestone), adding special combat mechanics (lifesteal, elemental infusion, Resolve synergy, Guard-pip breaking) onto whatever gear you choose to invest in.

---

## 8. XP Curve, Silver Economy & Combat Math Tuning

### A. Level `1`–`99` XP Curve
* **Formula:** `XP_To_Next_Level(L) = 100 × L + 12 × L²` *(per party member; active 4 heroes earn full XP)*
* **Intentional Pacing (Light Grinding Required):** Main Portal Bosses + Story Chains alone provide roughly **`35%–40%`** of the XP & Silver needed to keep pace—meaning players **must** engage with wilderness encounters, Hub quests, and **Zone Outpost Hunts** (`XP + Silver + Consumables`) to gear up and survive deeper Danger Zones.
* **Hidden Zone Stealth *(Internal Overworld Encounter Pacing — Never Advertised)*:**
  * Each of the **`20` 5-level Zones** (`Zone_Min`–`Zone_Max`) tracks an invisible, internal stealth value based on the party's level relative to that Zone (`never shown in any HUD meter, menu, stat line, or tutorial`).
  * **Baseline (`0%` Stealth):** At or below a Zone's entry level (`<= Zone_Min`), the party is `100%` visible and overworld wild encounters build up at the normal `100%` rate.
  * **Max Zone Stealth (`-30%` Overworld Spawns):** As the party outlevels a Zone's level band, internal stealth climbs gradually up to a cap of **`30%` slower overworld encounter buildup (`70%` normal rate)** at max stealth for that Zone tier—nudging players onward into stronger Zones without stopping anyone who wants to linger.
  * **Active Quest / Hunt Bypass:** Whenever the player has an active **Hub Quest** or **Zone Outpost Hunt** for that Zone, Zone Stealth is ignored (`100%` normal encounter buildup) so questing and repeatable hunts never slow down. *(Instanced `1:1` Dungeons & Portals are unaffected.)*
* **Coastal Encounter Buffer *(4-Hex Ocean Adjacency — No Beach Tracking Needed)*:**
  * Painted **Beach** biomes (`Sandy Cove Beaches`, `Veridian Coast Beaches`, `Frost-Shore Beaches`) remain intact for map clarity and the live HUD **Biome** readout (`see docs/09`), but encounter spawning does **not** track or multiply spawns specifically on Beach tiles (`zero special Beach-only triggers or cooldowns`).
  * **Within `4` Hexes of Ocean:** Any walkable terrain within **`4` painted hexes of Ocean water (`kind: "ocean"`)** is treated as coastal range and can spawn that Zone's **coastal mobs** *(when the Zone/Region includes coastal species)* alongside its current land biome pool under normal **Encounter Danger Indicator** buildup and **Zone Stealth** pacing.
  * **No Map `4` Beach-Only Pool Required:** Regions without distinct coastal beasts (such as **Map `4`'s** tiny frost-shore slivers) simply pull from their Zone's normal adjacent biome tables.

| Level Step | XP Required for Next Level | Avg Wilderness Fights per Level | Region Context |
| :---: | :---: | :---: | :--- |
| **1 $\to$ 2** | `112 XP` | `4–5` fights | Region 1 Outskirts |
| **5 $\to$ 6** | `800 XP` | `6–8` fights | Region 1 Mid-Wilds |
| **12 $\to$ 13** | `2,928 XP` | `8–10` fights | Portal #1 / Early Region 2 |
| **24 $\to$ 25** | `9,312 XP` | `9–12` fights | Portal #2 / Early Region 3 |
| **36 $\to$ 37** | `19,152 XP` | `10–13` fights | Portal #3 / Early Region 4 |
| **48 $\to$ 49** | `32,448 XP` | `11–14` fights | Portal #4 / Early Region 5 |
| **60 $\to$ 61** | `49,200 XP` | `11–15` fights | Portal #5 / Early Region 6 |
| **72 $\to$ 73** | `69,408 XP` | `12–16` fights | Portal #6 / Early Region 7 |
| **85 $\to$ 86** | `95,200 XP` | `13–17` fights | Portal #7 / Early Region 8 |
| **98 $\to$ 99** | `125,048 XP` | `15–20` fights | Endgame (*Bone Reliquary* / *Dreadwaste*) |

---

### B. Region XP, Silver & Trade Goods Economy
* **Trade Goods Loop:** Roughly **`1/3`** of wilderness fight value drops as direct Silver and **`2/3`** drops as **Trade Goods** sold to dedicated Town **Trade Goods Buyers** (`zero crafting clutter`).
* **Gear Sell-Back:** Replaced shop gear sells back for **`40%`** of its purchase price.
* **Potions & Magic Shop Spells:** Shop healing, mana recovery, revives, and status cures come as **Potions** sold at town **Arcanists**, while Casters (**Ellowyn, Mera, Harlan**) purchase their Tier `1–8` class **Spells** at Town **Magic Shops**.

| Region | Lv Band | Avg Fight XP *(Per Hero)* | Avg Fight Value *(Silver + Trade Goods)* | One-Time Quest Silver | Zone Outpost Hunt Silver | Avg Normal Mob HP | Portal Boss HP *(Target)* |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Region 1** | `1–12` | `25 – 220 XP` | `20s – 110s` | `120s – 250s` | `90s – 180s` | `32 – 140 HP` | `~650 HP` |
| **Region 2** | `13–24` | `250 – 850 XP` | `150s – 480s` | `450s – 900s` | `320s – 650s` | `160 – 450 HP` | `~2,400 HP` |
| **Region 3** | `25–36` | `900 – 1,800 XP` | `550s – 1,250s` | `1,400s – 2,400s` | `900s – 1,700s` | `500 – 1,050 HP` | `~6,000 HP` |
| **Region 4** | `37–48` | `1,900 – 3,100 XP` | `1,400s – 2,700s` | `3,200s – 5,000s` | `2,200s – 3,600s` | `1,150 – 1,950 HP` | `~12,500 HP` |
| **Region 5** | `49–60` | `3,200 – 4,700 XP` | `3,000s – 5,200s` | `6,500s – 10,000s` | `4,500s – 7,000s` | `2,100 – 3,200 HP` | `~22,000 HP` |
| **Region 6** | `61–72` | `4,800 – 6,500 XP` | `5,800s – 9,500s` | `12,000s – 18,000s` | `8,500s – 13,000s` | `3,400 – 4,900 HP` | `~36,000 HP` |
| **Region 7** | `73–85` | `6,600 – 8,400 XP` | `10,500s – 16,500s` | `22,000s – 32,000s` | `15,000s – 23,000s` | `5,100 – 7,200 HP` | `~55,000 HP` |
| **Region 8** | `86–99` | `8,500 – 10,500 XP` | `18,000s – 28,000s` | `40,000s – 60,000s` | `28,000s – 42,000s` | `7,500 – 10,500 HP` | `~90,000 HP` *(2-Phase Garrick)* |

---

### C. Core Combat Damage & Defense Formulas *(For Engine Implementation)*
* **Physical Attack Raw:** `(Weapon_Attack + 4 + Hero_Level × 1.5) × (1 + Primary_Attr × 0.015) × Skill_Multiplier`
* **Magic Attack Raw:** `(Weapon_Magic + 5 + Hero_Level × 1.5) × (1 + Arcana × 0.016) × Spell_Multiplier`
* **Healing Raw:** `(Weapon_Heal + 6 + Hero_Level × 1.4) × (1 + Presence × 0.015) × Heal_Multiplier`
* **Mitigation:** `Final_Damage = Raw × (100 / (100 + Target_Defense × 0.5)) × Weakness_Multiplier`
  * *Target_Defense* = `Body_Def + Helmet_Def + Shield_Def + Grit` *(Physical)* or `Body_MDef + Helmet_MDef + Presence` *(Magic)*.
  * *Critical Hit:* `1.5×` *(raised by Finesse 40 mastery, Runestones, and Quivers)*.
  * *Staggered Bonus:* `1.5×` damage while enemy Guard is broken.
  * *Skill Multipliers (Standard Baseline):* Basic Attack Mode A `1.0×` | Basic Mode B `1.35×` | Single-Target Skills `1.3× – 2.2×` | Multi-Target Group AoE `0.95× – 1.35×` | Full-Field AoE `0.85× – 1.25×`.
