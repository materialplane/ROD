"""Sync all 178 unique quests, 178 unique quest markers, Quest Sheets B–H prompts, docs/08, and exporter/enricher pipelines."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(r"C:\Users\drew0\Documents\ROD")
sys.path.insert(0, str(ROOT / "tools"))

from quest_data_maps12 import QUESTS_MAPS_1_2  # noqa: E402
from quest_data_maps34 import EXTRA_SHEET_TOKENS, QUESTS_MAPS_3_4  # noqa: E402


SHEET_LETTERS = ["B", "C", "D", "E", "F", "G", "H"]

# Hub-to-Hub [Deliver] quests resolved at another permanent Hub (token displays in Quest Journal)
COURIER_TARGET_HUBS: dict[int, tuple[str, str]] = {
    4: ("loc_02_oakhaven", "Oakhaven"),
    7: ("loc_04_millbrook_crossing", "Millbrook Crossing"),
    35: ("loc_09_mirewatch_post", "Mirewatch Post"),
    36: ("loc_06_saltwind_harbor", "Saltwind Harbor"),
    62: ("loc_11_redmarch_bastion", "Redmarch Bastion"),
    69: ("hub_timberfall_village", "Timberfall Village"),
    80: ("hub_greenwarden_fort", "Greenwarden Fort"),
    95: ("loc_23_dunespire_oasis", "Dunespire Oasis"),
    113: ("loc_27_anvilhall_forge", "Anvilhall Forge"),
    129: ("hub_stormhold_citadel", "Stormhold Citadel"),
    137: ("hub_frostmere_village", "Frostmere Village"),
}

# Quests resolved directly inside their parent Hub / Keep 16:9 map (token displays in Quest Journal)
HUB_INTERIOR_QUEST_NUMS: set[int] = {
    1,
    24,
    63,
    64,
    65,
    108,
    110,
    135,
    138,
    151,
    152,
    174,
    175,
    176,
    177,
    178,
}


def classify_quest_format(q: dict) -> tuple[str, bool, str | None, str | None]:
    """Return (questFormat, placeOnOverworld, targetHubId, targetHubName) for a quest."""
    qnum = q["questNum"]
    if qnum in COURIER_TARGET_HUBS:
        tid, tname = COURIER_TARGET_HUBS[qnum]
        return ("hub_courier", False, tid, tname)
    if qnum in HUB_INTERIOR_QUEST_NUMS:
        return ("hub_interior", False, q["hubId"], q["hubName"])
    return ("wilderness_pin", True, None, None)

SHEET_HEADER = (
    "1:1 square sheet showing a STRICT 4x4 grid (EXACTLY 4 columns across by 4 rows down — 16 circular "
    "tokens total, NEVER 5 columns, NEVER 5 rows, NEVER 25 tokens, NEVER duplicate any token) of 16 evenly "
    "spaced circular tabletop RPG map landmark tokens floating completely separate on a pure, flat, solid "
    "neon magenta (#FF00FF) background with NO grid divider lines, NO outer drop shadows onto the pink, "
    "NO numbers, NO captions, and NO text labels anywhere under or beside any token (STRICTLY PURE SOLID "
    "#FF00FF MAGENTA OUTSIDE EVERY CIRCULAR RING). Stylized League of Legends (Legends of Runeterra / "
    "Arcane) hand-painted fantasy digital illustration inside every circular token — chiseled silhouettes, "
    "bold sculpted rock and architecture planes, crisp dark contour definition, rich handcrafted color "
    "clarity, and moody directional lighting, framed as a 3/4 angled miniature scenic diorama filling the "
    "interior of each circle (strictly zero pixel art, zero scratchy ink outlines, zero colored-pencil or "
    "crayon sketchiness, zero watercolor bleed, zero paper or canvas grain, zero glossy plastic 3D CGI, "
    "and ZERO letters or printed titles anywhere in the image)."
)


def main() -> None:
    all_quests = QUESTS_MAPS_1_2 + QUESTS_MAPS_3_4
    assert len(all_quests) == 178, f"Expected 178 quests, found {len(all_quests)}"
    assert [q["questNum"] for q in all_quests] == list(range(1, 179))
    assert len({q["markerId"] for q in all_quests}) == 178
    assert len({q["description"].strip() for q in all_quests}) == 178

    # Collect the exact 112 new tokens across Sheets B–H
    new_items: list[dict] = []
    for q in all_quests:
        if q["existingSource"] is None:
            assert q["markerPrompt"], f"Missing markerPrompt on Q{q['questNum']:03d}"
            new_items.append(
                {
                    "kind": "quest",
                    "quest": q,
                    "id": q["markerId"],
                    "name": q["markerName"],
                    "ring": q["ring"],
                    "prompt": q["markerPrompt"],
                    "label": f"Q{q['questNum']:03d} R{q['region']} {q['markerName']}",
                }
            )

    for ext in EXTRA_SHEET_TOKENS:
        if ext.get("existingSource") is None:
            new_items.append(
                {
                    "kind": ext["cat"],
                    "ext": ext,
                    "id": ext["id"],
                    "name": ext["name"],
                    "ring": ext["ring"],
                    "prompt": ext["markerPrompt"],
                    "label": ext["name"],
                }
            )

    assert len(new_items) == 112, f"Expected 112 new items (7x16), got {len(new_items)}"

    # Assign Sheet letter + (r, c) coordinates
    sheets_map: dict[str, list[dict]] = {ltr: [] for ltr in SHEET_LETTERS}
    for idx, item in enumerate(new_items):
        s_idx = idx // 16
        cell_idx = idx % 16
        r, c = cell_idx // 4, cell_idx % 4
        ltr = SHEET_LETTERS[s_idx]
        item["sheetKey"] = f"quest_{ltr.lower()}"
        item["sheetLetter"] = ltr
        item["r"] = r
        item["c"] = c
        sheets_map[ltr].append(item)
        if item["kind"] == "quest":
            item["quest"]["sheet"] = item["sheetKey"]
            item["quest"]["r"] = r
            item["quest"]["c"] = c
        else:
            item["ext"]["sheet"] = item["sheetKey"]
            item["ext"]["r"] = r
            item["ext"]["c"] = c

    # Fill sheet/r/c for existing quests as well
    for q in all_quests:
        if q["existingSource"] is not None:
            q["sheet"] = q["existingSource"]["sheet"]
            q["r"] = q["existingSource"]["r"]
            q["c"] = q["existingSource"]["c"]

    # 1) Write data/quests-catalog.json and client mirror
    catalog_quests: list[dict] = []
    for q in all_quests:
        q_fmt, place_ow, tgt_id, tgt_name = classify_quest_format(q)
        q["questFormat"] = q_fmt
        q["placeOnOverworld"] = place_ow
        q["targetHubId"] = tgt_id
        q["targetHubName"] = tgt_name
        catalog_quests.append(
            {
                "questId": f"q{q['questNum']:03d}",
                "questNum": q["questNum"],
                "hubId": q["hubId"],
                "hubName": q["hubName"],
                "mapId": q["mapId"],
                "region": q["region"],
                "levelRange": q["levelRange"],
                "category": q["category"],
                "questFormat": q_fmt,
                "placeOnOverworld": place_ow,
                "targetHubId": tgt_id,
                "targetHubName": tgt_name,
                **({"allowedBiomeIds": q["allowedBiomeIds"]} if q.get("allowedBiomeIds") else {}),
                **({"minOceanHexes": q["minOceanHexes"]} if q.get("minOceanHexes") is not None else {}),
                **({"minDownsHexes": q["minDownsHexes"]} if q.get("minDownsHexes") is not None else {}),
                **({"maxDownsHexes": q["maxDownsHexes"]} if q.get("maxDownsHexes") is not None else {}),
                "title": q["title"],
                "giver": q["giver"],
                "miniBoss": q["miniBoss"],
                "reward": q["reward"],
                "description": q["description"],
                "markerId": q["markerId"],
                "markerName": q["markerName"],
                "assetPath": f"assets/tokens/markers/{q['markerId']}.webp",
                "sheet": q["sheet"],
                "r": q["r"],
                "c": q["c"],
            }
        )
    catalog = {
        "version": 2,
        "count": len(all_quests),
        "quests": catalog_quests,
    }
    cat_json = json.dumps(catalog, indent=2, ensure_ascii=False)
    (ROOT / "data" / "quests-catalog.json").write_text(cat_json, encoding="utf-8")
    (ROOT / "client" / "assets" / "data" / "quests-catalog.json").write_text(cat_json, encoding="utf-8")
    print(f"Wrote data/quests-catalog.json & client mirror ({len(all_quests)} unique quests)")

    # 2) Update imageprompts/quest-markers.txt (preserve up through QUEST SHEET A, then write B–H cleanly)
    qtxt_path = ROOT / "imageprompts" / "quest-markers.txt"
    qtxt = qtxt_path.read_text(encoding="utf-8")

    # Retire the 2 wet-marsh slots replaced by Sheets B–H and update header count
    qtxt = qtxt.replace(
        "- [Sheet 5 (1,4)] MARSH SIGNAL LANTERNS [Iron Ring]: Mist-shrouded deep green bog flats pierced by crooked wooden walkways and wrought-iron signal lantern poles flickering warmly above sunken reeds.",
        "- [Sheet 5 (1,4) RETIRED — REPLACED IN QUEST SHEET C] MARSH SIGNAL LANTERNS (water boardwalk retired; replaced by dry marsh trail poles).",
    )
    qtxt = qtxt.replace(
        "- [Sheet 6 (3,1)] MARSH CAUSEWAY AMBUSH [Iron Ring]: Narrow raised wet cobblestone causeway bridge cutting across dark-green coastal marsh reeds with a tipped wooden apothecary cart and spilled herb vials.",
        "- [Sheet 6 (3,1) RETIRED — REPLACED IN QUEST SHEET C] MARSH CAUSEWAY AMBUSH (stone water-bridge art retired; replaced by dry dirt-and-cobble track).",
    )
    qtxt = qtxt.replace(
        "SECTION B: STAGED NEW QUEST MARKERS (NOT YET SUBMITTED — 16 Tokens Across 1 x 4x4 Sheet)",
        "SECTION B: QUEST MARKER SHEETS A–H (128 Tokens Across 8 x 4x4 Sheets — Sheet A SUCCEEDED, Sheets B–H Staged for Batch)",
    )

    cut_marker = "\n================================================================================\nQUEST SHEET B "
    if cut_marker in qtxt:
        qtxt = qtxt.split(cut_marker)[0].rstrip() + "\n"

    sheet_blocks: list[str] = []
    for ltr in SHEET_LETTERS:
        items = sheets_map[ltr]
        assert len(items) == 16
        regs = sorted({it["quest"]["region"] for it in items if it["kind"] == "quest"})
        reg_tag = f"R{regs[0]}–R{regs[-1]}" if len(regs) > 1 else (f"R{regs[0]}" if regs else "Travel/Standby")
        block_lines = [
            "",
            "=" * 80,
            f"QUEST SHEET {ltr} (4x4, 16 Tokens): UNIQUE QUEST SITES ({reg_tag})",
            "=" * 80,
            SHEET_HEADER,
            "",
            "FRAME RULE BY CATEGORY: Give every circular VTT token on this sheet a scarred dark tarnished iron circular VTT ring (strictly NO magenta bleed onto frames).",
            "",
        ]
        for row in range(4):
            block_lines.append(f"ROW {row + 1}:")
            for col in range(4):
                it = items[row * 4 + col]
                ring_lbl = f"{it['ring'].capitalize()} Ring"
                title_upper = it["name"].upper()
                block_lines.append(f"- ({row + 1},{col + 1}) {title_upper} [{ring_lbl}]: {it['prompt']}")
            block_lines.append("")
        sheet_blocks.append("\n".join(block_lines).rstrip())

    new_qtxt = qtxt.rstrip() + "\n\n" + "\n\n".join(sheet_blocks) + "\n"
    qtxt_path.write_text(new_qtxt, encoding="utf-8")
    print(f"Updated imageprompts/quest-markers.txt with QUEST SHEET B–H (7 x 16 = 112 new tokens)")

    # 3) Write generated marker subset file consumed by export_markers_and_maps.py
    gen_marker_defs = []
    for q in all_quests:
        gen_marker_defs.append(
            {
                "sheet": q["sheet"],
                "r": q["r"],
                "c": q["c"],
                "id": q["markerId"],
                "name": q["markerName"],
                "cat": "quest_field",
                "map": q["mapId"],
                "region": q["region"],
                "kind": f"Quest Q{q['questNum']:03d}: {q['title']} ({q['hubName']})",
                "ring": q["ring"],
                "questNum": q["questNum"],
                "questId": f"q{q['questNum']:03d}",
                "questTitle": q["title"],
                "hubId": q["hubId"],
                "hubName": q["hubName"],
                "questFormat": q["questFormat"],
                "placeOnOverworld": q["placeOnOverworld"],
                "targetHubId": q["targetHubId"],
                "targetHubName": q["targetHubName"],
                **({"allowedBiomeIds": q["allowedBiomeIds"]} if q.get("allowedBiomeIds") else {}),
                **({"minOceanHexes": q["minOceanHexes"]} if q.get("minOceanHexes") is not None else {}),
                **({"minDownsHexes": q["minDownsHexes"]} if q.get("minDownsHexes") is not None else {}),
                **({"maxDownsHexes": q["maxDownsHexes"]} if q.get("maxDownsHexes") is not None else {}),
            }
        )
    for ext in EXTRA_SHEET_TOKENS:
        if ext.get("existingSource") is not None:
            src = ext["existingSource"]
            ext["sheet"] = src["sheet"]
            ext["r"] = src["r"]
            ext["c"] = src["c"]
        gen_marker_defs.append(
            {
                "sheet": ext["sheet"],
                "r": ext["r"],
                "c": ext["c"],
                "id": ext["id"],
                "name": ext["name"],
                "cat": ext["cat"],
                "map": ext["map"],
                "kind": ext["kind"],
                "ring": ext["ring"],
            }
        )

    (ROOT / "data" / "generated-quest-markers.json").write_text(
        json.dumps(gen_marker_defs, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"Wrote data/generated-quest-markers.json ({len(gen_marker_defs)} marker entries)")

    # 4) Update docs/08-quests-and-story.md master roster with unique site name & unique description per quest
    doc_path = ROOT / "docs" / "08-quests-and-story.md"
    doc_text = doc_path.read_text(encoding="utf-8")
    split_hdr = "## Layer 3 + 2 Hub-by-Hub Master Quest Roster"
    assert split_hdr in doc_text
    doc_head = doc_text.split(split_hdr)[0].rstrip()
    doc_head = doc_head.replace(
        "All **Caves, Ruins, Ancient Shrines, Animal Dens, Dragon Lairs, Shipwrecks, Outlaw Camps, & Road Ambushes** (`~60` illustrated diorama tokens)",
        "All **`178` Unique Quest Field Sites** (one unique diorama marker & unique description per quest)",
    )

    region_titles = {
        1: "### Map 1 — Region 1: The Crownlands *(`22` Quests | `Lv 1–12` | `60s–180s` | `80–265 XP` | Lesser Draft)*",
        2: "### Map 1 — Region 2: The Saltmarsh & Westward Coast *(`22` Quests | `Lv 12–25` | `260s–520s` | `360–780 XP` | Lesser Draft)*",
        3: "### Map 2 — Region 3: Thornwall Warfronts *(`23` Quests | `Lv 25–39` | `690s–1,450s` | `810–1,750 XP` | Refined Draft)*",
        4: "### Map 2 — Region 4: The Verdant Weald & Plague Woods *(`22` Quests | `Lv 37–50` | `1,500s–2,600s` | `1,750–3,000 XP` | Refined Draft)*",
        5: "### Map 3 — Region 5: The Sun-Scorched Isles *(`22` Quests | `Lv 49–64` | `3,000s–5,350s` | `2,800–4,750 XP` | Greater Draft)*",
        6: "### Map 3 — Region 6: The Ironcrest Highlands *(`22` Quests | `Lv 61–75` | `5,800s–9,500s` | `4,800–7,200 XP` | Greater Draft)*",
        7: "### Map 4 — Region 7: The Frostbound Reach *(`22` Quests | `Lv 73–89` | `10,500s–16,800s` | `7,400–10,800 XP` | Mythic Draft)*",
        8: "### Map 4 — Region 8: The Dreadwaste & Black Keep *(`23` Quests | `Lv 86–99` | `18,000s–30,000s` | `10,800–15,000 XP` | Mythic Draft)*",
    }

    roster_lines = [
        "",
        "## Layer 3 + 2 Hub-by-Hub Master Quest Roster (`178` Unique Quests & `178` Unique Field Markers Across `40` Hubs)",
        "",
    ]

    # Group sequentially by region -> hub
    cur_reg = None
    cur_hub = None
    hub_num = 0
    # Precompute hub quest counts
    hub_groups: list[tuple[int, str, str, str, list[dict]]] = []
    for q in all_quests:
        if not hub_groups or hub_groups[-1][1] != q["hubId"]:
            hub_groups.append((q["region"], q["hubId"], q["hubName"], q["levelRange"], []))
        hub_groups[-1][4].append(q)

    for reg, hid, hname, lvl_band, hqs in hub_groups:
        hub_num += 1
        if reg != cur_reg:
            if cur_reg is not None:
                roster_lines.extend(["---", ""])
            cur_reg = reg
            roster_lines.extend([region_titles[reg], ""])
        roster_lines.append(f"#### {hub_num}. {hname} *({len(hqs)} Quests · `{lvl_band}`)*")
        for q in hqs:
            roster_lines.append(
                f"{q['questNum']}. **`[{q['category']}]` {q['title']}** *({q['giver']} · Marker: **{q['markerName']}**)* — {q['description']} | **Mini-Boss:** {q['miniBoss']} | `{q['reward']}`"
            )
        roster_lines.append("")

    doc_path.write_text(doc_head + "\n" + "\n".join(roster_lines).rstrip() + "\n", encoding="utf-8")
    print("Updated docs/08-quests-and-story.md with all 178 unique descriptions & 1-to-1 markers.")


if __name__ == "__main__":
    main()
