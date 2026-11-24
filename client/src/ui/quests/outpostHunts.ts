import type {
  ActiveOutpostHunt,
  BattleConfigData,
  BattleEnemyDef,
  OutpostHuntsCatalog,
  WorldLocation,
} from "../types";

export interface OutpostHuntCandidate {
  mob: BattleEnemyDef;
  biomeHints: string[];
}

export let GLOBAL_ACTIVE_QUEST_LIMIT = 15;

let activeCatalog: OutpostHuntsCatalog | null = null;

/** Store the fetched outpost-hunts-catalog.json payload once loaded by the client runtime. */
export function setOutpostHuntsCatalog(catalog: OutpostHuntsCatalog | null): void {
  activeCatalog = catalog;
  GLOBAL_ACTIVE_QUEST_LIMIT = catalog?.globalActiveQuestLimit ?? 15;
}

export function getOutpostHuntsCatalog(): OutpostHuntsCatalog | null {
  return activeCatalog;
}

export function getGlobalActiveQuestLimit(): number {
  return activeCatalog?.globalActiveQuestLimit ?? GLOBAL_ACTIVE_QUEST_LIMIT;
}

function getZoneReward(zoneNum: number): { silver: number; xp: number } {
  const row = activeCatalog?.zones?.[String(zoneNum)];
  return {
    silver: row?.silver ?? 0,
    xp: row?.xp ?? 0,
  };
}

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
  const table = activeCatalog?.killsByCellSize ?? { "4": 4, "2": 5, "1": 6 };
  if (cells >= 4) return table["4"] ?? 4;
  if (cells >= 2) return table["2"] ?? 5;
  return table["1"] ?? 6;
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
  const { silver: baseSilver, xp: baseXp } = getZoneReward(zoneNum);
  const isElite = (mob.gridW ?? 1) * (mob.gridH ?? 1) > 1;
  const eliteMul = activeCatalog?.eliteRewardMultiplier ?? 1.15;
  const silverBonusMul = isElite ? eliteMul : 1.0;

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
  };
}

/** Normalize saved hunt offers to current catalog kill counts, Silver/XP calibration, and zero consumable handouts. */
export function normalizeOutpostOfferScale(
  offer: ActiveOutpostHunt,
  config: BattleConfigData | null
): ActiveOutpostHunt {
  const mob = config?.monsters.find((m) => m.id === offer.mobId);
  const targetKills = mob ? pickKillsRequired(mob) : offer.isElite ? (activeCatalog?.killsByCellSize?.["4"] ?? 4) : (activeCatalog?.killsByCellSize?.["1"] ?? 6);
  const { silver: baseSilver, xp: baseXp } = getZoneReward(offer.zoneNum);
  const eliteMul = activeCatalog?.eliteRewardMultiplier ?? 1.15;
  const mul = offer.isElite ? eliteMul : 1.0;
  const targetSilver = baseSilver > 0 ? Math.round(baseSilver * mul) : offer.rewardSilver;
  const targetXp = baseXp > 0 ? Math.round(baseXp * mul) : offer.rewardXp;
  const nextProgress = Math.min(offer.killsProgress, targetKills);
  const hasLegacyConsumable = offer.rewardConsumableId !== undefined || offer.rewardConsumableQty !== undefined;

  if (
    targetKills === offer.killsRequired &&
    nextProgress === offer.killsProgress &&
    targetSilver === offer.rewardSilver &&
    targetXp === offer.rewardXp &&
    !hasLegacyConsumable
  ) {
    return offer;
  }

  return {
    ...offer,
    killsRequired: targetKills,
    killsProgress: nextProgress,
    rewardSilver: targetSilver,
    rewardXp: targetXp,
    rewardConsumableId: undefined,
    rewardConsumableQty: undefined,
  };
}

export function formatOutpostRewardLine(hunt: ActiveOutpostHunt): string {
  return `${hunt.rewardSilver.toLocaleString()}s · ${hunt.rewardXp.toLocaleString()} XP per hero`;
}

export function pluralizeMonsterName(name: string, count = 2): string {
  if (count === 1) return name;
  const irregular = activeCatalog?.irregularPlurals;
  if (irregular?.[name]) return irregular[name];
  if (name.endsWith("Wolf")) return `${name.slice(0, -4)}Wolves`;
  if (name.endsWith("s") || name.endsWith("sh") || name.endsWith("ch") || name.endsWith("x") || name.endsWith("z")) {
    return `${name}es`;
  }
  if (/[^aeiou]y$/i.test(name)) return `${name.slice(0, -1)}ies`;
  return `${name}s`;
}
