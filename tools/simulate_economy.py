"""Realistic Economy, Attrition & Playtime Simulator across Zones 1-20 for Realms of Dust (ROD).

Models the ACTUAL live TypeScript combat & catalog formulas (not idealized guesses):
  1. Live battleLogic.ts encounter pack size (~3.4-3.9 foes), rawXp, rawSilver, lootScale,
     and Trade Good drop probabilities mapped against data/items-catalog.json regional values.
  2. Real Consumable & Field Attrition upkeep using exact data/items-catalog.json potion prices
     for a standard mixed/non-healer 4-hero party (partially cushioned by Free Town Inns).
  3. Live data/quests-catalog.json Hub Quests, Portal Bosses, and current Outpost Hunt
     payouts (6 kills, Silver + Bonus XP per hero, zero free potion handouts).
  4. Actual starting Silver (1000s) and Step 1-24 4-hero Gear + Spell shop bills.

Read-only analysis tool: modifies NO documentation or data catalogs.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import statistics
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = REPO_ROOT / "data"

_HEROES_CFG = json.loads((DATA_DIR / "heroes-catalog.json").read_text(encoding="utf-8"))
_PROGRESSION_CFG = _HEROES_CFG.get("progression", {})
_XP_CURVE = _PROGRESSION_CFG.get("xpCurve", {"linear": 100, "quadratic": 12})

STARTING_SILVER = int(_PROGRESSION_CFG.get("startingSilver", 1000))
ACCESSORY_CATEGORIES = ("cloak", "orb", "horn", "quiver", "crystal", "tome")

# Portal zone placement mapping (Portal 1..8 -> Zones 3, 5, 8, 10, 13, 15, 18, 20)
PORTAL_NUM_TO_ZONE: dict[int, int] = {1: 3, 2: 5, 3: 8, 4: 10, 5: 13, 6: 15, 7: 18, 8: 20}


def load_outpost_hunts_catalog() -> tuple[dict[int, int], dict[int, int]]:
    data = json.loads((DATA_DIR / "outpost-hunts-catalog.json").read_text(encoding="utf-8"))
    zones = data.get("zones", {})
    silver = {int(z): int(v["silver"]) for z, v in zones.items()}
    xp = {int(z): int(v["xp"]) for z, v in zones.items()}
    return silver, xp


def load_portal_bosses_by_zone(battle_cfg: dict) -> dict[int, dict[str, int | str]]:
    out: dict[int, dict[str, int | str]] = {}
    for m in battle_cfg.get("monsters", []):
        if m.get("isBoss") and m.get("portalNum"):
            pnum = int(m["portalNum"])
            z = PORTAL_NUM_TO_ZONE.get(pnum)
            if z:
                out[z] = {"num": pnum, "name": m["name"], "xp": int(m.get("xp", 0)), "silver": int(m.get("silver", 0))}
    return out


def xp_for_level(level: int) -> int:
    """XP required to advance from level L to L+1 (data/heroes-catalog.json)."""
    lin = int(_XP_CURVE.get("linear", 100))
    quad = int(_XP_CURVE.get("quadratic", 12))
    return lin * level + quad * (level ** 2)


def level_from_xp(xp: float) -> int:
    """Compute exact hero level (1..99) reached at given cumulative XP."""
    rem = xp
    for lv in range(1, 99):
        need = xp_for_level(lv)
        if rem < need:
            return lv
        rem -= need
    return 99


def zone_of_quest(level_range: str) -> int:
    nums = [int(n) for n in re.findall(r"\d+", level_range or "")]
    mid = sum(nums) / len(nums) if nums else 1.0
    if mid >= 96:
        return 20
    return min(20, max(1, int((mid - 1) // 5) + 1))


def parse_quest_reward(reward_str: str) -> tuple[int, int]:
    ms = re.search(r"(\d[\d,]*)s", reward_str or "")
    mx = re.search(r"(\d[\d,]*)\s*XP", reward_str or "")
    silver = int(ms.group(1).replace(",", "")) if ms else 0
    xp = int(mx.group(1).replace(",", "")) if mx else 0
    return silver, xp


def load_catalog_data() -> dict:
    items = json.loads((DATA_DIR / "items-catalog.json").read_text(encoding="utf-8"))["items"]
    spells = json.loads((DATA_DIR / "spells-catalog.json").read_text(encoding="utf-8"))["spells"]
    quests = json.loads((DATA_DIR / "quests-catalog.json").read_text(encoding="utf-8"))["quests"]
    battle_cfg = json.loads((DATA_DIR / "battle-config.json").read_text(encoding="utf-8"))

    by_id = {it["id"]: it for it in items}

    # Exact average 4-hero gear cost per Step 1..24
    step_costs: dict[int, float] = {}
    for s in range(1, 25):
        w = statistics.mean(i["priceSilver"] for i in items if i["category"] == "weapon" and i.get("step") == s)
        a = statistics.mean(i["priceSilver"] for i in items if i["category"] == "armor" and i.get("step") == s)
        h = statistics.mean(i["priceSilver"] for i in items if i["category"] == "helm" and i.get("step") == s)
        acc = statistics.mean(i["priceSilver"] for i in items if i["category"] in ACCESSORY_CATEGORIES and i.get("step") == s)
        sh_vals = [i["priceSilver"] for i in items if i["category"] == "shield" and i.get("step") == s]
        sh = statistics.mean(sh_vals) if sh_vals else 0.0
        step_costs[s] = 4.0 * (w + a + h + acc) + 1.5 * sh

    zone_step_weights: dict[int, list[tuple[int, float]]] = {}
    for z in range(1, 21):
        m_idx = (z - 1) // 5
        zm = (z - 1) % 5
        s_base = m_idx * 6 + 1
        w1 = round(1.0 - 0.2 * zm, 2)
        w2 = round(0.2 * (zm + 1), 2)
        zone_step_weights[z] = [(s_base + zm, w1), (s_base + zm + 1, w2)]

    spells_by_reg: dict[int, int] = {r: 0 for r in range(1, 9)}
    for sp in spells:
        reg = sp.get("region") or 1
        spells_by_reg[reg] = spells_by_reg.get(reg, 0) + sp["priceSilver"]

    quests_by_zone: dict[int, list[dict]] = {z: [] for z in range(1, 21)}
    for q in quests:
        s, x = parse_quest_reward(q.get("reward", ""))
        z = zone_of_quest(q.get("levelRange", ""))
        quests_by_zone[z].append({**q, "_silver": s, "_xp": x})

    # Trade Goods actual region sell prices from items-catalog.json
    tg_by_region: dict[int, list[int]] = {}
    for it in items:
        if it.get("category") == "trade_good":
            tg_by_region.setdefault(int(it.get("region") or 1), []).append(int(it.get("sellSilver") or 0))
    avg_tg_by_reg = {r: statistics.mean(vals) for r, vals in tg_by_region.items()}

    outpost_silver, outpost_xp = load_outpost_hunts_catalog()
    portals_by_zone = load_portal_bosses_by_zone(battle_cfg)

    return {
        "by_id": by_id,
        "step_costs": step_costs,
        "zone_step_weights": zone_step_weights,
        "spells_by_reg": spells_by_reg,
        "quests_by_zone": quests_by_zone,
        "avg_tg_by_reg": avg_tg_by_reg,
        "monsters": battle_cfg.get("monsters", []),
        "stages": battle_cfg.get("stages", []),
        "combat_config": battle_cfg.get("combatConfig", {}),
        "outpost_silver": outpost_silver,
        "outpost_xp": outpost_xp,
        "portals_by_zone": portals_by_zone,
    }


def live_battle_drops_for_zone(z: int, catalog: dict) -> dict:
    """Reproduce exact battleLogic.ts encounter drops (pack size, rawXp, rawSilver, lootScale & Trade Goods)."""
    lv_min = (z - 1) * 5 + 1
    lv_max = 99 if z == 20 else z * 5
    lv = (lv_min + lv_max) / 2.0

    # battleLogic.ts: small 1x1 packs roll 3 (30%), 4 (50%), 5 (20%) early; 3 (25%), 4 (50%), 5 (25%) later.
    # Large 2x2 / 3x3 monsters pull total enemies down slightly (~2.8-3.4) in mid/late zones.
    stages = catalog["stages"]
    cc = catalog.get("combat_config", {})
    monsters_by_name = {m["name"].lower(): m for m in catalog["monsters"] if not m.get("isBoss")}
    zone_defs = []
    for st in stages:
        if st.get("isPortal") or not st.get("zoneSpawns"):
            continue
        for nm in st["zoneSpawns"].get(str(z), []):
            d = monsters_by_name.get(nm.lower())
            if d:
                zone_defs.append(d)

    large_share = 0.0
    if zone_defs:
        large_count = sum(1 for d in zone_defs if max(1, (d.get("gridW", 1) * d.get("gridH", 1))) >= 2)
        large_share = large_count / len(zone_defs)

    base_pack = 3.9 if lv <= 4 else 4.0
    avg_pack = base_pack * (1.0 - large_share) + 2.9 * large_share

    pack_loot = cc.get("packLootScale", {})
    group_total = float(pack_loot.get("groupTotal", 2.45))
    pair_total = 2.0 * float(pack_loot.get("pair", 1.15))
    total_loot_mul = (group_total - 0.02) if large_share < 0.35 else (pair_total + 0.02)

    rc = cc.get("rewardCurve", {})
    xp_c = rc.get("xp", {})
    xp_per_mob = max(
        float(xp_c.get("minVal", 4.0)),
        float(xp_c.get("base", 3.0)) + lv * float(xp_c.get("lin", 0.9)) + (lv ** 2) * float(xp_c.get("quad", 0.19)),
    )
    sv_c = rc.get("silver", {})
    early_max_lv = float(sv_c.get("earlyMaxLv", 25.0))
    early_power = float(sv_c.get("earlyPower", 1.0))
    early_lift = (((early_max_lv + 1.0 - lv) / early_max_lv) ** early_power) * float(sv_c.get("earlyLift", 11.45)) if lv <= early_max_lv else 0.0
    silver_per_mob = max(
        float(sv_c.get("minVal", 3.0)),
        float(sv_c.get("base", 1.2)) + early_lift + lv * float(sv_c.get("lin", 0.25)) + (lv ** 3) * float(sv_c.get("cubic", 0.00108)),
    )

    fight_xp = xp_per_mob * total_loot_mul
    fight_direct_silver = silver_per_mob * total_loot_mul

    # battleLogic.ts: per defeated enemy dropChance = min(0.6, 0.55 * (n<=2 ? pair : groupTotal/n))
    per_enemy_drop_chance = min(0.6, 0.55 * (total_loot_mul / avg_pack))
    expected_tg_drops = avg_pack * per_enemy_drop_chance
    cutoffs = cc.get("regionLevelCutoffs", [15, 25, 40, 50, 65, 75, 90])
    reg = len(cutoffs) + 1
    for idx, cap in enumerate(cutoffs):
        if lv <= float(cap):
            reg = idx + 1
            break
    avg_tg_val = catalog["avg_tg_by_reg"].get(reg, 8.0)
    fight_tg_silver = expected_tg_drops * avg_tg_val

    return {
        "avg_pack": avg_pack,
        "fight_xp": fight_xp,
        "fight_silver": fight_direct_silver,
        "fight_tg_silver": fight_tg_silver,
        "fight_total_val": fight_direct_silver + fight_tg_silver,
    }


def real_consumable_upkeep_per_fight(z: int, by_id: dict) -> dict:
    """Compute realistic per-fight Potion, Mana, Cure & Revive cost from actual items-catalog.json prices.

    Calibrated from real playtest attrition (Valen/Ellowyn/Orin/Rowan taking ~60-115 party HP damage
    plus Burn/Poison/Curse per multi-mob fight, assuming regular Free Town Inn stops cut road consumption ~45%):
      - Healing Potions/fight : ~0.55 (1 pot every ~1.8 fights outside Free Inn)
      - Mana Potions/fight    : ~0.12 (1 pot every ~8 fights for casters)
      - Status Cures/fight    : ~0.15 (1 cure every ~6-7 fights)
      - Reviving/Phoenix/fight: ~0.05 (1 KO revive every ~20 fights outside town)
    """
    if z <= 5:
        heal_id = "cons_minor_healing_potion"
    elif z <= 10:
        heal_id = "cons_stout_healing_potion"
    elif z <= 15:
        heal_id = "cons_greater_healing_potion"
    else:
        heal_id = "cons_supreme_healing_potion"

    if z <= 8:
        mana_id = "cons_minor_mana_potion"
    elif z <= 15:
        mana_id = "cons_greater_mana_potion"
    else:
        mana_id = "cons_supreme_mana_potion"

    if z <= 3:
        cure_price = float(by_id["cons_antidote_potion"]["priceSilver"])
    elif z <= 8:
        cure_price = 0.5 * by_id["cons_antidote_potion"]["priceSilver"] + 0.5 * by_id["cons_clarity_potion"]["priceSilver"]
    else:
        cure_price = float(by_id["cons_panacea_potion"]["priceSilver"])

    revive_id = "cons_reviving_potion" if z <= 10 else "cons_phoenix_potion"

    heal_p = float(by_id[heal_id]["priceSilver"])
    mana_p = float(by_id[mana_id]["priceSilver"])
    rev_p = float(by_id[revive_id]["priceSilver"])

    per_fight = 0.55 * heal_p + 0.12 * mana_p + 0.15 * cure_price + 0.05 * rev_p
    return {
        "heal_price": heal_p,
        "mana_price": mana_p,
        "cure_price": cure_price,
        "revive_price": rev_p,
        "cost_per_fight": per_fight,
    }


def zone_shop_costs(z: int, catalog: dict, fights_in_zone: float, spell_share: float = 0.67) -> tuple[float, float, float, dict]:
    reg = (z - 1) // 5 * 2 + (1 if ((z - 1) % 5) < 2 else 2)
    gross_gear = sum(catalog["step_costs"][st] * wt for st, wt in catalog["zone_step_weights"][z])
    if z == 1:
        gross_gear *= 0.85
    net_gear = gross_gear * 0.60  # 40% trade-in sell-back (docs/03)
    spells_cost = (catalog["spells_by_reg"][reg] / 2.5) * spell_share
    upkeep = real_consumable_upkeep_per_fight(z, catalog["by_id"])
    potion_cost = fights_in_zone * upkeep["cost_per_fight"]
    return net_gear, spells_cost, potion_cost, upkeep


def natural_content_profile(z: int, quests_in_z: list[dict], casual_hunts: float = 1.0, has_portal: bool | None = None) -> dict:
    n_wild = sum(1 for q in quests_in_z if q.get("questFormat") == "wilderness_pin")
    n_other = len(quests_in_z) - n_wild
    if has_portal is None:
        has_portal = z in PORTAL_NUM_TO_ZONE.values()

    fights_per_dungeon = 6.0 + (z - 1) * 0.22
    dungeon_fights = n_wild * fights_per_dungeon + n_other * 1.5
    portal_fights = (16 + z * 0.75) if has_portal else 0.0
    road_fights = 22.0 + z * 1.1
    # 6 kills across ~3.9-mob mixed-species spawns typically takes ~3.5-4.5 encounters
    hunt_fights = casual_hunts * 4.0

    total_fights = dungeon_fights + portal_fights + road_fights + hunt_fights
    sec_per_fight = 42.0 + (z - 1) * 2.0
    combat_hours = (total_fights * sec_per_fight) / 3600.0
    dungeon_explore_mins = n_wild * (13.0 + z * 0.45) + n_other * 8.0
    portal_explore_mins = (36.0 + z * 1.8) if has_portal else 0.0
    town_overworld_mins = 55.0 + z * 2.0
    explore_hours = (dungeon_explore_mins + portal_explore_mins + town_overworld_mins) / 60.0

    return {
        "natural_fights": total_fights,
        "combat_hours": combat_hours,
        "explore_hours": explore_hours,
        "total_hours": combat_hours + explore_hours,
    }


def load_combat_log_baseline() -> dict | None:
    appdata = os.environ.get("APPDATA")
    if not appdata:
        return None
    p = Path(appdata) / "rod-game-client" / "logs" / "combat-log.jsonl"
    if not p.exists():
        return None
    recs = [json.loads(ln) for ln in p.read_text(encoding="utf-8").splitlines() if ln.strip()]
    wins = [r for r in recs if r.get("outcome") == "victory"]
    if not wins:
        return None
    tg_vals = []
    for r in wins:
        v = 0
        for t in r.get("tradeGoods", []):
            m = re.search(r"x(\d+)\s*\((\d+)s", t)
            if m:
                v += int(m.group(1)) * int(m.group(2))
        tg_vals.append(v)
    return {
        "victories": len(wins),
        "avg_enemies": statistics.mean(len(r.get("enemies", [])) for r in wins),
        "avg_xp": statistics.mean(r.get("totalXpEarned", 0) for r in wins),
        "avg_silver": statistics.mean(r.get("totalSilverEarned", 0) for r in wins),
        "avg_tg": statistics.mean(tg_vals),
        "avg_total_val": statistics.mean(r.get("totalSilverEarned", 0) + tv for r, tv in zip(wins, tg_vals)),
    }


def run_simulation(casual_hunts_per_zone: float = 1.0) -> dict:
    catalog = load_catalog_data()
    zones_out: list[dict] = []

    cum_xp_hunts = 0.0
    cum_xp_zero_hunt = 0.0
    cum_xp_rush65 = 0.0
    cum_s_hunts = float(STARTING_SILVER)
    cum_s_zero_hunt = float(STARTING_SILVER)
    cum_s_rush65 = float(STARTING_SILVER)
    cum_bill_total = 0.0
    cum_potions_total = 0.0

    for z in range(1, 21):
        lv_min = (z - 1) * 5 + 1
        lv_max = 99 if z == 20 else z * 5
        qs = catalog["quests_by_zone"][z]

        q_silver = sum(q["_silver"] for q in qs)
        q_xp = sum(q["_xp"] for q in qs)
        q_avg_silver = round(q_silver / len(qs)) if qs else 0
        boss = catalog["portals_by_zone"].get(z)
        boss_xp = int(boss["xp"]) if boss else 0
        boss_silver = int(boss["silver"]) if boss else 0

        prof = natural_content_profile(z, qs, casual_hunts=casual_hunts_per_zone, has_portal=bool(boss))
        nat_fights = prof["natural_fights"]
        zero_hunt_fights = nat_fights - casual_hunts_per_zone * 4.0
        rush65_fights = zero_hunt_fights * 0.72

        drops = live_battle_drops_for_zone(z, catalog)
        net_gear, spell_cost, potion_cost, upkeep = zone_shop_costs(z, catalog, nat_fights)
        zone_bill = net_gear + spell_cost + potion_cost
        cum_bill_total += zone_bill
        cum_potions_total += potion_cost

        hunt_s = catalog["outpost_silver"][z]
        hunt_xp = catalog["outpost_xp"][z]

        cum_xp_hunts += q_xp + boss_xp + nat_fights * drops["fight_xp"] + casual_hunts_per_zone * hunt_xp
        cum_xp_zero_hunt += q_xp + boss_xp + zero_hunt_fights * drops["fight_xp"]
        cum_xp_rush65 += q_xp * 0.65 + boss_xp + rush65_fights * drops["fight_xp"]

        cum_s_hunts += q_silver + boss_silver + nat_fights * drops["fight_total_val"] + casual_hunts_per_zone * hunt_s
        cum_s_zero_hunt += q_silver + boss_silver + zero_hunt_fights * drops["fight_total_val"]
        cum_s_rush65 += q_silver * 0.65 + boss_silver + rush65_fights * drops["fight_total_val"]

        fight_net = drops["fight_total_val"] - upkeep["cost_per_fight"]

        zones_out.append({
            "z": z,
            "lv": f"{lv_min}-{lv_max}",
            "quests": len(qs),
            "q_avg_s": q_avg_silver,
            "nat_fights": nat_fights,
            "total_h": prof["total_hours"],
            "combat_h": prof["combat_hours"],
            "explore_h": prof["explore_hours"],
            "fight_xp": drops["fight_xp"],
            "fight_val": drops["fight_total_val"],
            "fight_potion_cost": upkeep["cost_per_fight"],
            "fight_net": fight_net,
            "heal_price": upkeep["heal_price"],
            "mana_price": upkeep["mana_price"],
            "potion_bill": potion_cost,
            "gear_spell_bill": net_gear + spell_cost,
            "zone_bill": zone_bill,
            "has_portal": bool(boss),
            "hunt_s": hunt_s,
            "hunt_xp": hunt_xp,
            "lv_hunts": level_from_xp(cum_xp_hunts),
            "lv_0hunt": level_from_xp(cum_xp_zero_hunt),
            "lv_rush65": level_from_xp(cum_xp_rush65),
            "wallet_pct_hunts": (cum_s_hunts / cum_bill_total) * 100.0,
            "wallet_pct_0hunt": (cum_s_zero_hunt / cum_bill_total) * 100.0,
            "wallet_pct_rush65": (cum_s_rush65 / cum_bill_total) * 100.0,
        })

    return {
        "zones": zones_out,
        "casual_hunts": casual_hunts_per_zone,
        "cum_bill_total": cum_bill_total,
        "cum_potions_total": cum_potions_total,
        "log_baseline": load_combat_log_baseline(),
    }


def print_report(sim: dict) -> None:
    zs = sim["zones"]
    hunts = sim["casual_hunts"]
    log_b = sim["log_baseline"]
    tot_fights = sum(z["nat_fights"] for z in zs)
    tot_clear_h = sum(z["total_h"] for z in zs)

    print("=" * 126)
    print(f"REALMS OF DUST (ROD) - LIVE ENGINE & REAL ATTRITION SIMULATOR (Outpost Hunts = {hunts:.1f}/Zone, 6 Kills)")
    print("=" * 126)
    if log_b:
        print(
            f"Playtest Log Check ({log_b['victories']} Z01 wins): "
            f"{log_b['avg_enemies']:.2f} foes | {log_b['avg_xp']:.1f} XP | "
            f"{log_b['avg_silver']:.1f}s Silver + {log_b['avg_tg']:.1f}s TG = {log_b['avg_total_val']:.1f}s/fight"
        )
    print(f"Simulated Total Battles (100% Quests + Portals) : {tot_fights:,.0f} fights (~{tot_clear_h:.1f}h full playthrough)")
    print(
        f"Total 4-Hero Bill (Gear60 + Spells + Real Potions): {sim['cum_bill_total']:,.0f}s "
        f"(Real Potions alone = {sim['cum_potions_total']:,.0f}s)"
    )
    print("-" * 126)
    print(f"  * 100% Play ({hunts:.1f} Hunt/Z, Start {STARTING_SILVER}s): Lv {zs[-1]['lv_hunts']} at Garrick | {zs[-1]['wallet_pct_hunts']:.0f}% Cumulative Funding")
    print(f"  * Zero Hunts (Quests + Natural Fights)  : Lv {zs[-1]['lv_0hunt']} at Garrick | {zs[-1]['wallet_pct_0hunt']:.0f}% Cumulative Funding")
    print(f"  * Main Story (~65% Quests, 0 Hunts)     : Lv {zs[-1]['lv_rush65']} at Garrick | {zs[-1]['wallet_pct_rush65']:.0f}% Cumulative Funding")
    print("=" * 126)
    print()
    hdr = (
        f"{'Zone':<5} {'Band':<6} {'Q':>2} {'AvgQ':>6} {'HuntS':>6} | "
        f"{'FgtXP':>5} {'FgtS':>6} {'Pot/F':>6} {'Net/F':>6} | "
        f"{'HealP':>5} {'ManaP':>5} | {'Lv':>4} {'ZBill':>9} {'Cum%':>5} {'0H%':>5}"
    )
    print(hdr)
    print("-" * len(hdr))
    for z in zs:
        p = "*" if z.get("has_portal") or z["z"] in PORTAL_NUM_TO_ZONE.values() else " "
        print(
            f"Z{z['z']:02d}{p} {z['lv']:<6} {z['quests']:>2} {z['q_avg_s']:>5,}s {z['hunt_s']:>5,}s | "
            f"{z['fight_xp']:>5,.0f} {z['fight_val']:>5,.0f}s {z['fight_potion_cost']:>5,.0f}s {z['fight_net']:>+5,.0f}s | "
            f"{z['heal_price']:>4,.0f}s {z['mana_price']:>4,.0f}s | "
            f"Lv{z['lv_hunts']:<2} {z['zone_bill']:>8,.0f}s {z['wallet_pct_hunts']:>4.0f}% {z['wallet_pct_0hunt']:>4.0f}%"
        )
    print("-" * len(hdr))
    print("Net/F = Fight Loot (Silver+TG) minus Real Per-Fight Potion Drain. Negative Net/F means normal fights bleed Silver!")


def main() -> int:
    parser = argparse.ArgumentParser(description="Simulate ROD 20-Zone live battle loot, real potion attrition & quest economy.")
    parser.add_argument("--hunts", type=float, default=1.0, help="Avg Outpost Hunts completed per Zone (default: 1.0).")
    parser.add_argument("--json", action="store_true", help="Print machine-readable JSON output.")
    args = parser.parse_args()

    sim = run_simulation(casual_hunts_per_zone=args.hunts)
    if args.json:
        print(json.dumps(sim, indent=2))
    else:
        print_report(sim)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
