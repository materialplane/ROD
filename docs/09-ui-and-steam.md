# ROD — UI Screens, Controls, Audio Integration & Steam Features

> **Status:** Locked Pre-Code UI & Platform Spec  
> **Target Platforms:** Windows PC (`.exe` via Electron + TypeScript) & Steam Deck (`16:9` / `16:10` responsive scaling)  
> **Audio Assets:** Music tracks and SFX are already supplied separately by the Creative Director—this spec defines engine playback hooks and player volume controls only.

---

## 1. Visual UI Philosophy (Tabletop Ledger & Inked Parchment)

Every interface panel complements **Hand-Inked Painterly Fantasy** art without hiding the artwork behind heavy neon sci-fi boxes:
* **Palette & Materials:** Dark weathered iron/bronze frames, warm aged parchment panels for readable stats and lore, crisp dark-ink dividers, and subtle gold/ember highlights for active selections.
* **Readability First (PC & Steam Deck):** Clean high-contrast typography sized to remain effortless to read at `1920×1080`, `2560×1440`, and `1280×800` *(Steam Deck)* from couch or desk distance.
* **Seamless Input Switching:** Full mouse point-and-click, keyboard (`WASD` / Arrows + hotkeys), and gamepad controller support with automatic on-screen glyph switching *(PC Keys / Xbox / PlayStation / Steam Deck)*.

---

## 2. Core Game Screens & HUD Flows

### A. Title Screen & Campaign Setup
* **Backdrop:** `16:9` Key Art painting with open left/top sky space for the **ROD** title crest and menu stack (`assets/ui/menu_background_16x9_4k.png`).
* **Options:**
  1. **Continue** *(loads latest manual or auto-save immediately)*
  2. **New Campaign** *(opens **Highcrown Keep** `Pick 4 of 6 Heroes` selection screen $\to$ **Opening Council Dialogue Scene** showing the 4 riding out and the 2 remaining to hold the Keep before stepping onto the Overworld)*
  3. **Load Game** *(shows saved party tokens, Level, current Region, Playtime, Silver, Portals Sealed `X/8`, and a **Cleared Crown** badge once beaten)*
  4. **Settings** *(Display, Audio sliders, Battle Speed, Controls)*
  5. **Quit**

### B. Overworld, Town & Dungeon Exploration HUD
Minimal corner/side overlays keep the `4` connected `8192×8192` overworld maps, `16:9` Towns/Interiors, and centered **`1:1` Zelda-style Dungeon / Portal rooms** front and center:
* **Top-Right Corner Mini-Map / Status:**
  * *Overworld:* Current **Region**, **Danger Sub-Zone (`Level Band`)**, and live **Biome** name (`updating directly from the painted terrain hex under the player token—such as Oakleaf Groves, Sandy Cove Beaches, or Black Lava Mountain—so players can track matching monster habitats for Zone Outpost Hunts`), plus compass orientation and nearby discovered markers.
  * *Procedural Dungeon / Portal (`1:1` Room View):* Flanking HUD beside the `1:1` square room displays the **auto-filling Zelda-style room grid minimap** (sparse carved corridors & dead ends contained inside `2×2` up to `10×10+` bounding grids), visited rooms, locked gates & keys, Mini-Boss / Boss Seal *(once revealed)*, and **Rift / Area Chart** full-grid reveal when found.
* **Encounter Danger Indicator *(Overworld & Dungeons only)*:** Clean edge gauge shifting smoothly from cool slate $\to$ amber $\to$ crimson as steps build toward a triggered encounter, giving players clear warning before fights start *(automatically hidden inside safe Towns and Sanctuaries; internal Zone Stealth in outleveled Zones slows step buildup up to `30%` behind the scenes with zero Stealth UI shown—see `docs/03`)*.
* **Top-Left Vertical Party Bar *(Overworld Leader = Slot #1)*:** Your **4 active Hero `1:1` avatars** *(clean frameless UI portraits—no circular map token rings)* stacked **top-to-bottom (`Slot 1 → Slot 4`)**, displaying compact HP/MP bars, active status badges, current silver purse (`s`), while whichever hero occupies **Slot 1** walks across the Overworld & Dungeon maps as their circular VTT map token.
* **Bottom-Right Quick Menu Bar *(or `Esc` / Start, plus `P` for Party Menu)*:** **Party (`P`)**, **Gear**, **Bag**, **Journal**, **World Map**, **Save**, **System**.

### C. Turn-Based Battle Screen (`16:9` Arena)
* **Top Center — Visible Turn-Order Timeline:** Horizontal strip of upcoming hero and enemy turns ordered by **Finesse** + action speed, clearly pulsing **Telegraphed Heavy Attack** warnings on enemy portraits so players know when to **Guard** or interrupt.
* **Center Stage (`16:9` Biome Backdrop):**
  * *Right/Upper Field:* **Full-body enemy & boss illustrations** *(with wounded art variants on major bosses)*, HP bars, status icons, and **Weakness Badges** *(auto-revealed permanently per enemy family once struck by matching weapon/elemental types)*.
  * *Left Column Formation:* Your **4 Hero `1:1` Portraits** lined up cleanly **top-to-bottom (`Slot 1 → Slot 4`)** matching the **Party Menu (`P`)** *(clean `1:1` UI portraits without the circular map token ring)*—zero Frontline/Backline row logic. Incoming hits play each individual weapon or spell's custom VFX animation and swap the struck hero's portrait cleanly to its matching frameless **`2×2` Health** state (`<75% / <50% / <25%`), and **Resolve** glows along the portrait frame below `<50%` and `<25%`.
* **Bottom Action Deck *(Active Hero)*:**
  * **Attack:** Displays the equipped weapon's **2 unique `0 MP` Attack Modes** *(showing Damage Type & effect)*
  * **Spells (`Ellowyn`, `Mera` & `Harlan`):** Opens the caster's naturally unlocked `MP` Spells (`MP` cost + AoE/status preview)
  * **Item:** Quick-use Potions *(Healing, Mana, Revival & Status Cures)*
  * **Guard:** Damage mitigation + counter/posture readiness
  * **Flee:** Party escape attempt *(disabled in Portal Boss & story boss fights)*

---

## 3. Party Ledger & Menu Tabs *(Hotkey `P` for Party Menu / `Esc` Pause Menu)*

Opening the Party Menu (`Hotkey P`) or ledger pauses exploration cleanly across **6 tabbed screens** *(switchable via click or `LB / RB`)*:

1. **Party & Stats (`Hotkey P`):**
   * View and **reorder your 4 active party slots (`Slots 1–4` top-to-bottom)** anytime outside combat—putting any hero in **Slot 1** immediately swaps your visible Overworld walking VTT token, and also inspect the 2 companions holding **Highcrown Keep**.
   * Inspect each hero's HP/MP, Level, XP to next level, stats, and equipment summary, and view active **Resolve** passive thresholds (`<50%` & `<25%`).
   * Spend **Stat Points** freely across **Force, Finesse, Grit, Arcana, Presence**, with clear milestone markers at **`20 / 40 / 60 / 80 / 100`** showing earned **Mastery Perks**.
2. **Weapons & Spells:**
   * Inspect each hero's equipped weapon's **2 `0 MP` Attack Modes**; for our 3 casters (**Ellowyn, Mera, Harlan**), view Tiers `1–8` unlocked naturally by leveling up and swap active slotted spells anytime outside combat.
3. **Equipment, Runestones & Accessories:**
   * Equip **Right Hand**, **Left Hand** *(Global Shields when wielding a 1H weapon)*, **Helmet**, **Body**, **1 Weapon/Body Runestone**, and **1 Class Accessory Slot**.
   * Shows clear green/red combat stat deltas before confirming swaps.
   * **Permanent Runestone Socketing:** Empty sockets accept Runestones anywhere for free; slotting a new Runestone over an occupied socket shows a clear warning that the previous Runestone will be **permanently destroyed** before confirming.
4. **Inventory:**
   * Tabbed categories: **Potions** *(Healing, Mana, Revival & Cure Potions — usable in battle or on the overworld)*, **Runestones**, **Trade Goods** *(sell-only items showing total Silver value)*, and **Key Items / Portal Catalysts / Dungeon Keys**.
5. **Quest Journal & Bestiary:**
   * Clean filters matching all 4 sandbox quest layers (tracked under one **Global Active Quest Limit**, e.g. `15` active quests total): **Main Portals (`X/8`) & Home Front**, **Story Chains (`4`)**, **Hub Quests (`178`)**, and **Zone Outpost Hunts (`20` Outposts)**.
   * Bestiary sub-tab logs every seen SRD 5.2 realm mob, boss, and Ethoria native along with discovered **Weaknesses** and Trade Good drops.
6. **World Atlas & System:**
   * Interactive zoomed-out preview of explored Regions, discovered **Towns & Keeps**, **Ship Ports**, and **Portal status** *(Sealed vs. Open)*.
   * Manual **Save Anywhere** button *(outside combat)*, Settings, and Return to Title.

---

## 4. Town Services, Pick-1-of-3 Draft & Cutscene Screens

* **NPC-Driven Town Shops (`6` Shop Types + Dedicated Trade Goods Buyer):** Players click actual town NPC portrait cards directly inside settlement interiors (`no bottom shortcut bar bypassing NPCs`) to open **Weapon Shops**, **Armor Shops**, **Tailors**, **Magic Shops**, **Arcanists**, **Adventurer Shops**, or **Trade Goods Buyers** (`single Sell All Trade Goods exchange`). Shops use strict **Hero-First Filtering**: clicking a hero card highlights them and filters stock to items/spells that hero can use, showing a visual **Currently Wearing → Shop Item** comparison (`stat deltas`, `Weapon Attacks`, `Runestone Sockets`, trade-in Silver math) and prompting to equip immediately, equip & sell old gear, or place in Shared Party Bag.
* **Town Inn:** Instant full party restore (`HP`, `MP`, status ailments) for **`0s` (Free)** with a warm rest transition.
* **Equipment Socketing Confirmation *(Inventory / Equipment Menu)*:** Hovering or dropping a **Carved Runestone** onto gear previews the combat effect directly; if a Runestone is already socketed, a crisp warning modal confirms that the existing Runestone will be overwritten and destroyed *(no Reforging, no Extraction)*.
* **Zone Outpost Hunt NPC (`20` Unique Zone Outposts — `1` per 5-Level Zone):** Talking to the Outpost's Quartermaster rolls a random monster from that Zone's natural spawn pool (`Kill X [Monster]`) with **zero map pins** and **zero boosted spawns**, paying **XP + Silver + Consumables** upon completion (or **Abandon / Roll Another** under the Global Active Quest Limit).
* **Pick-1-of-3 Runestone Draft Modal:** Dramatic 3-card presentation upon completing quests, displaying each generated Runestone's icon, rarity/Region tier, and combat affix before choosing 1 to keep.
* **Dialogue & Home-Front Cutscenes:** Bottom dialogue plate anchored by crisp `1:1` hero avatars; **Highcrown Keep** scenes cover both the post-select departure dialogue and milestone B-plot updates *(triggered at `2/4/6/7` closed Portals)* with text-advance and skip on replays.

---

## 5. Audio Integration Hooks & Settings

Because music tracks and SFX are **already provided by the Creative Director**, the engine implements clean event-driven playback hooks and user sliders rather than generating or scoping placeholder audio:
* **Audio Channels & Sliders:** **Master Volume**, **Music Volume**, **SFX Volume**, and **Unfocus Mute toggle** *(saved locally)*.
* **Context Transitions (Crossfaded):** Overworld Region theme $\leftrightarrow$ Town / Interior theme $\leftrightarrow$ **Tavern (`Enter Tavern` inside our `18` settlements — shuffles a continent-assigned subset of the `11` Season 1 musical chapters across the `4` continents in chronological progression)** $\leftrightarrow$ Dungeon / Portal theme $\leftrightarrow$ Standard Battle $\leftrightarrow$ Portal / Mini-Boss Battle $\leftrightarrow$ `16:9` Cutscene *(with instant stingers for Level Up, Portal Sealed, Runestone Draft, Free Inn Rest, and Victory)*.

---

## 6. Save Architecture & Steam Integration

### Save System
* **Save Anywhere:** Available anytime outside active combat across manual save slots + rotating **Auto-Save** slots *(triggered on entering Towns, using Ship Ports, stepping before a Portal Boss Seal, or waking at an Inn after party wipe keeping XP/Levels)*.
* **Post-Ending "Cleared" Save:** After defeating **King Garrick** and watching the ending & credits, the game awards victory Achievements, marks the slot with a **Cleared Crown**, and places you right outside **The Eclipse Gate** *(with your 4-hero party intact)* so you can continue finishing leftover side content, Level `99`, and Bestiary entries.
* **Clean JSON Save State:** Stores your **4 party members** *(plus which 2 characters are holding Highcrown Keep)*, `campaignCleared` badge flag, stats, XP/levels, equipped gear + Runestones, silver, quest/bounty states *(including cumulative completed Outpost Hunts)*, discovered Bestiary weaknesses, explored Dungeon & Portal room flags, and current overworld map ID + player coordinates.

### Steamworks & Build Rules
* **Steam Cloud Saves:** Automatic sync across desktop PC and Steam Deck.
* **Controller & Steam Deck Target:** Native `1280×800` scaling, readable text sizing, zero required typing after launch, and full gamepad control.
* **Steam Rich Presence:** Displays live status such as *"Exploring Region 4: Briarwood — 3/8 Portals Sealed"*.
* **Steam Achievements *(25–30 Milestones)*:**
  * Closing each of the **8 Dimensional Portals** *(Garrick climax marked hidden)*
  * Completing each of the **4 Story Chains** (`Orin/Garrick`, `Ellowyn/Valen`, `Rowan/Mera`, `Harlan`)
  * Completing `40`, `100`, and all `178` **Hub Quests**
  * Completing **`25`**, **`100`**, **`200`**, and **`500` Zone Outpost Hunts** *(cumulative global count across all `20` Outposts; individual Outposts remain unlimited)*
  * Reaching **Level `50`** and **Level `99`**, unlocking a **`100` Stat Mastery Perk**, winning a battle via **Critical `<25%` Resolve**, and discovering all **40 Hubs** / **Bestiary entries**.
* **Strict Client / Admin Separation:** Only the Electron **Game Client** + game data/assets bundle into the Steam depot—the **Internal Admin Suite** never ships in public builds.
