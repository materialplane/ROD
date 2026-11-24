import type {
  ActiveOutpostHunt,
  BattleConfigData,
  BattleEnemyDef,
  WorldLocation,
} from "../types";

export interface OutpostHuntCandidate {
  mob: BattleEnemyDef;
  biomeHints: string[];
}

export const GLOBAL_ACTIVE_QUEST_LIMIT = 15;

// Exact Zone Outpost Silver rewards calibrated per docs/03-combat-and-stats.md Section B
const OUTPOST_SILVER_BY_ZONE: Record<number, number> = {
  1: 50,
  2: 90,
  3: 140,
  4: 380,
  5: 720,
  6: 1350,
  7: 1950,
  8: 2650,
  9: 3850,
  10: 5000,
  11: 7200,
  12: 8350,
  13: 9500,
  14: 14500,
  15: 19500,
  16: 26000,
  17: 29500,
  18: 33000,
  19: 44000,
  20: 62000,
};

// Average single-hero fight XP from docs/03-combat-and-stats.md scaled by 3.5x as Hunt turn-in bonus
const OUTPOST_XP_BY_ZONE: Record<number, number> = {
  1: 55,
  2: 140,
  3: 280,
  4: 490,
  5: 1120,
  6: 1200,
  7: 1850,
  8: 2600,
  9: 2800,
  10: 4500,
  11: 4200,
  12: 5600,
  13: 7200,
  14: 6600,
  15: 10200,
  16: 9000,
  17: 11800,
  18: 14000,
  19: 13500,
  20: 18000,
};

const OUTPOST_CONSUMABLE_TIERS: Array<{ maxZone: number; pool: Array<{ itemId: string; qty: number }> }> = [
  {
    maxZone: 3,
    pool: [
      { itemId: "cons_minor_healing_potion", qty: 2 },
      { itemId: "cons_minor_mana_potion", qty: 1 },
      { itemId: "cons_antidote_potion", qty: 2 },
    ],
  },
  {
    maxZone: 5,
    pool: [
      { itemId: "cons_stout_healing_potion", qty: 2 },
      { itemId: "cons_reviving_potion", qty: 1 },
      { itemId: "cons_cooling_potion", qty: 2 },
    ],
  },
  {
    maxZone: 8,
    pool: [
      { itemId: "cons_stout_healing_potion", qty: 3 },
      { itemId: "cons_greater_mana_potion", qty: 1 },
      { itemId: "cons_clarity_potion", qty: 2 },
    ],
  },
  {
    maxZone: 12,
    pool: [
      { itemId: "cons_greater_healing_potion", qty: 2 },
      { itemId: "cons_panacea_potion", qty: 1 },
      { itemId: "cons_reviving_potion", qty: 2 },
    ],
  },
  {
    maxZone: 16,
    pool: [
      { itemId: "cons_supreme_healing_potion", qty: 2 },
      { itemId: "cons_greater_mana_potion", qty: 2 },
      { itemId: "cons_panacea_potion", qty: 2 },
    ],
  },
  {
    maxZone: 20,
    pool: [
      { itemId: "cons_supreme_healing_potion", qty: 3 },
      { itemId: "cons_supreme_mana_potion", qty: 2 },
      { itemId: "cons_phoenix_potion", qty: 1 },
    ],
  },
];

export function extractOutpostZoneNum(loc: WorldLocation): number {
  if (typeof loc.zoneNum === "number" && loc.zoneNum >= 1 && loc.zoneNum <= 20) {
    return loc.zoneNum;
  }
  const m = loc.id.match(/outpost_z(\d+)/i) || (loc.levelRange ?? "").match(/Zone\s+(\d+)/i);
  return m ? Math.max(1, Math.min(20, Number(m[1]))) : 1;
}

/** Collect every non-boss monster that naturally spawns inside this Zone via battle-config stage pools. */
export function buildOutpostHuntPool(zoneNum: number, config: BattleConfigData | null): OutpostHuntCandidate[] {
  if (!config) return [];
  const byName = new Map<string, BattleEnemyDef>();
  for (const m of config.monsters) {
    if (!m.isBoss) {
      byName.set(m.name.toLowerCase(), m);
    }
  }

  const stageMap = new Map<string, { mob: BattleEnemyDef; biomes: Set<string> }>();
  for (const st of config.stages) {
    if (st.isPortal) continue;
    const names = st.zoneSpawns?.[String(zoneNum)] ?? [];
    for (const rawName of names) {
      const def = byName.get(rawName.toLowerCase());
      if (!def) continue;
      let entry = stageMap.get(def.id);
      if (!entry) {
        entry = { mob: def, biomes: new Set<string>() };
        stageMap.set(def.id, entry);
      }
      entry.biomes.add(st.name);
    }
  }

  if (stageMap.size > 0) {
    return Array.from(stageMap.values()).map((e) => ({
      mob: e.mob,
      biomeHints: Array.from(e.biomes),
    }));
  }

  const zoneTag = `Zone ${zoneNum} `;
  const fallback = config.monsters.filter(
    (m) => !m.isBoss && ((m.zone ?? "").includes(zoneTag) || (m.zone ?? "").endsWith(`Zone ${zoneNum}`))
  );
  return fallback.map((mob) => ({
    mob,
    biomeHints: mob.homeBiome ? [mob.homeBiome] : [],
  }));
}

function pickKillsRequired(mob: BattleEnemyDef): number {
  const cells = Math.max(1, (mob.gridW ?? 1) * (mob.gridH ?? 1));
  if (cells >= 4) return 4;
  if (cells >= 2) return 5;
  return 6 + ((mob.name.length + Math.round(mob.level ?? 1)) % 3); // 6-8 for 1x1 mobs
}

function pickConsumableReward(zoneNum: number, mob: BattleEnemyDef): { itemId: string; qty: number } {
  const tier = OUTPOST_CONSUMABLE_TIERS.find((t) => zoneNum <= t.maxZone) ?? OUTPOST_CONSUMABLE_TIERS[OUTPOST_CONSUMABLE_TIERS.length - 1];
  const idx = Math.floor(Math.random() * tier.pool.length);
  const picked = tier.pool[idx] ?? tier.pool[0];
  const isElite = (mob.gridW ?? 1) * (mob.gridH ?? 1) > 1;
  return {
    itemId: picked.itemId,
    qty: picked.qty + (isElite ? 1 : 0),
  };
}

export function rollOutpostHuntOffer(
  outpost: WorldLocation,
  config: BattleConfigData | null,
  excludeMobId?: string
): ActiveOutpostHunt | null {
  const zoneNum = extractOutpostZoneNum(outpost);
  const pool = buildOutpostHuntPool(zoneNum, config);
  if (pool.length === 0) return null;

  const choices = pool.length > 1 && excludeMobId ? pool.filter((c) => c.mob.id !== excludeMobId) : pool;
  const pick = choices[Math.floor(Math.random() * choices.length)] ?? pool[0];
  const mob = pick.mob;
  const killsRequired = pickKillsRequired(mob);
  const baseSilver = OUTPOST_SILVER_BY_ZONE[zoneNum] ?? 50;
  const baseXp = OUTPOST_XP_BY_ZONE[zoneNum] ?? 55;
  const isElite = (mob.gridW ?? 1) * (mob.gridH ?? 1) > 1;
  const silverBonusMul = isElite ? 1.15 : 1.0;
  const cons = pickConsumableReward(zoneNum, mob);

  return {
    huntId: `${outpost.id}::${mob.id}::${Date.now().toString(36)}`,
    outpostId: outpost.id,
    outpostName: outpost.name,
    zoneNum,
    mobId: mob.id,
    mobName: mob.name,
    mobIconPath: mob.iconPath,
    isElite,
    biomeHints: pick.biomeHints,
    killsRequired,
    killsProgress: 0,
    rewardSilver: Math.round(baseSilver * silverBonusMul),
    rewardXp: Math.round(baseXp * silverBonusMul),
    rewardConsumableId: cons.itemId,
    rewardConsumableQty: cons.qty,
  };
}

export function formatOutpostRewardLine(
  hunt: ActiveOutpostHunt,
  consumableName?: string
): string {
  const itemPart = consumableName ? ` · ${hunt.rewardConsumableQty}x ${consumableName}` : "";
  return `${hunt.rewardSilver.toLocaleString()}s · ${hunt.rewardXp.toLocaleString()} XP Each${itemPart}`;
}
