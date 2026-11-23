/**
 * Combat Endurance Simulator for ROD (Realms of Dust).
 * Mirrors the exact client math in:
 *   - client/src/ui/party/partyLogic.ts
 *   - client/src/ui/battle/battleLogic.ts
 *   - client/src/ui/battle/BattleOverlay.tsx
 *   - client/src/ui/App.tsx
 *
 * Read-only simulation tool: modifies NO game data or source files.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

const battleConfig = JSON.parse(
  fs.readFileSync(path.join(REPO_ROOT, "client/assets/data/battle-config.json"), "utf8")
);
const itemsCatalog = JSON.parse(
  fs.readFileSync(path.join(REPO_ROOT, "client/assets/data/items-catalog.json"), "utf8")
).items;

const HERO_BASE = {
  valen: { id: "valen", name: "Valen", baseHp: 47, baseMp: 0 },
  ellowyn: { id: "ellowyn", name: "Ellowyn", baseHp: 47, baseMp: 19 },
  orin: { id: "orin", name: "Orin", baseHp: 47, baseMp: 0 },
  rowan: { id: "rowan", name: "Rowan", baseHp: 47, baseMp: 0 },
  mera: { id: "mera", name: "Mera", baseHp: 47, baseMp: 19 },
  harlan: { id: "harlan", name: "Harlan", baseHp: 47, baseMp: 19 },
};

const STATUS_IS_BUFF = {
  burn: false,
  bleed: false,
  poison: false,
  chill: false,
  shock: false,
  curse: false,
  stun: false,
  def_down: false,
  atk_down: false,
  blind: false,
  ward: true,
  regen: true,
  reflect: true,
  immunity: true,
  haste: true,
  undying: true,
};

const WEAPON_MODE_SPECS = {
  Longsword: [
    { name: "Quick Slash", power: 1.0, critBonus: 0, delayPct: 0.78 },
    { name: "Heavy Cleave", power: 1.4, critBonus: 0.15, delayPct: 1.12, guardChip: 1 },
  ],
  Greatsword: [
    { name: "Wide Sweep", power: 1.05, critBonus: 0, delayPct: 0.92, targetDelayPush: 18 },
    { name: "Overhead Rend", power: 1.45, critBonus: 0.08, delayPct: 1.18, guardChip: 1 },
  ],
  Rapier: [
    { name: "Needle Thrust", power: 1.0, critBonus: 0.05, delayPct: 0.72 },
    { name: "Heart Pierce", power: 1.38, critBonus: 0.2, armorIgnore: 0.25, delayPct: 1.05 },
  ],
  Battleaxe: [
    { name: "Chopping Hack", power: 1.02, critBonus: 0, delayPct: 0.88 },
    { name: "Execution Chop", power: 1.44, critBonus: 0.05, execCritBonus: 0.25, delayPct: 1.16 },
  ],
  Mace: [
    { name: "Heavy Bash", power: 1.02, critBonus: 0, delayPct: 0.85, guardChip: 1 },
    { name: "Armor Crush", power: 1.36, critBonus: 0, delayPct: 1.1, debuff: "def_down" },
  ],
  Spear: [
    { name: "Long Thrust", power: 1.04, critBonus: 0.12, delayPct: 0.82 },
    { name: "Brace Sweep", power: 1.34, critBonus: 0, delayPct: 1.06, targetDelayPush: 24 },
  ],
  Dagger: [
    { name: "Quick Jab", power: 0.96, critBonus: 0.06, delayPct: 0.68 },
    { name: "Vital Gouge", power: 1.35, critBonus: 0.15, delayPct: 1.0, debuff: "poison" },
  ],
  Quarterstaff: [
    { name: "Staff Sweep", power: 1.0, critBonus: 0, delayPct: 0.82 },
    { name: "Crushing Vault", power: 1.36, critBonus: 0, delayPct: 1.08, guardChip: 1 },
  ],
  Scimitar: [
    { name: "Crescent Cut", power: 1.02, critBonus: 0.05, delayPct: 0.76 },
    { name: "Whirling Slash", power: 1.36, critBonus: 0.15, delayPct: 0.88 },
  ],
  Sickle: [
    { name: "Reaping Hook", power: 1.0, critBonus: 0.05, delayPct: 0.78, debuff: "poison" },
    { name: "Thorn Slash", power: 1.32, critBonus: 0, delayPct: 1.04, debuff: "atk_down" },
  ],
};

function xpRequiredForNextLevel(level) {
  const safe = Math.max(1, Math.min(99, Math.floor(level)));
  if (safe >= 99) return 0;
  return 100 * safe + 12 * safe * safe;
}

function applyHeroXpGain(level, currentXp, gainedXp) {
  let lv = Math.max(1, Math.min(99, Math.floor(level)));
  let xp = Math.max(0, Math.floor(currentXp) + Math.max(0, Math.floor(gainedXp)));
  while (lv < 99) {
    const req = xpRequiredForNextLevel(lv);
    if (req <= 0 || xp < req) break;
    xp -= req;
    lv += 1;
  }
  if (lv >= 99) xp = 0;
  return { level: lv, xp };
}

function earnedPointsForLevel(level) {
  const safeLvl = Math.max(1, Math.floor(level));
  if (safeLvl <= 1) return 0;
  let total = (safeLvl - 1) * 2;
  for (let l = 5; l <= safeLvl; l += 5) {
    if (l < 100) total += 1;
  }
  return total;
}

function getEffectiveSpeed(speed, statuses) {
  let mul = 1.0;
  if (statuses.some((s) => s.kind === "chill")) mul *= 0.72;
  if (statuses.some((s) => s.kind === "haste")) mul *= 1.2;
  return Math.max(4, speed * mul);
}

function getTimeAdvanceForDelay(speed, delayPct) {
  return (100 / Math.max(4, speed)) * Math.max(0.5, delayPct);
}

function upsertStatusEffect(list, kind, turns) {
  const isNegative = !STATUS_IS_BUFF[kind];
  if (isNegative && list.some((s) => s.kind === "immunity")) return list;
  const rest = list.filter((s) => s.kind !== kind);
  return [...rest, { kind, turns: Math.max(1, turns) }];
}

function applyTurnStartAilments(statuses, maxHp, statusResistPct) {
  let dotDamage = 0;
  let regenHeal = 0;
  let stunned = false;
  const remaining = [];
  for (const st of statuses) {
    if (st.kind === "burn") dotDamage += Math.max(3, Math.round(maxHp * 0.06));
    else if (st.kind === "bleed") dotDamage += Math.max(3, Math.round(maxHp * 0.05));
    else if (st.kind === "poison") dotDamage += Math.max(3, Math.round(maxHp * 0.05));
    else if (st.kind === "regen") regenHeal += Math.max(4, Math.round(maxHp * 0.1));
    else if (st.kind === "stun") {
      if (Math.random() * 100 >= statusResistPct) stunned = true;
    }
    if (st.turns > 1) remaining.push({ ...st, turns: st.turns - 1 });
  }
  return { remaining, dotDamage, regenHeal, stunned };
}

function parseDamageTypeList(raw) {
  if (!raw || raw.toLowerCase() === "none") return [];
  return raw.split(/[,/]/).map((s) => s.trim()).filter(Boolean);
}

function pickEnemyCombatMove(enemy) {
  const hay = `${enemy.name} ${enemy.role} ${enemy.weakTypes.join(" ")} ${enemy.resistTypes.join(" ")}`.toLowerCase();
  const isBoss = enemy.isBoss;
  const moves = [];
  if (/fire|flame|efreet|ember|magma|cinder|hell|pyro|salamander/.test(hay)) {
    moves.push(
      { name: "Sear Claw", damageType: "Fire", target: "1 Ally", power: 1.0, inflictStatus: "burn", inflictTurns: 2, inflictChance: 0.45 },
      { name: "Cinder Wave", damageType: "Fire", target: isBoss ? "All Allies" : "1 Ally", power: 1.15, inflictStatus: "burn", inflictTurns: 2, inflictChance: 0.55 }
    );
  } else if (/frost|ice|winter|yeti|snow|glaci|cold|white dragon/.test(hay)) {
    moves.push(
      { name: "Rime Slash", damageType: "Frost", target: "1 Ally", power: 1.0, inflictStatus: "chill", inflictTurns: 2, inflictChance: 0.5 },
      { name: "Glacial Gale", damageType: "Frost", target: isBoss ? "All Allies" : "1 Ally", power: 1.1, inflictStatus: "chill", inflictTurns: 2, inflictChance: 0.55 }
    );
  } else if (/poison|venom|spider|ooze|otyugh|cobra|viper|scorp|mire|rot|spore/.test(hay)) {
    moves.push(
      { name: "Venom Strike", damageType: "Poison", target: "1 Ally", power: 0.96, inflictStatus: "poison", inflictTurns: 3, inflictChance: 0.55 },
      { name: "Corrosive Bile", damageType: "Poison", target: "1 Ally", power: 1.08, inflictStatus: "def_down", inflictTurns: 2, inflictChance: 0.5 }
    );
  } else if (/blue dragon|storm|lightning|thunder|will-o|djinn|air/.test(hay)) {
    moves.push(
      { name: "Tempest Arc", damageType: "Lightning", target: isBoss ? "All Allies" : "1 Ally", power: 1.08, inflictStatus: "shock", inflictTurns: 2, inflictChance: 0.5 },
      { name: "Thunder Strike", damageType: "Lightning", target: "1 Ally", power: 1.05, inflictStatus: "shock", inflictTurns: 2, inflictChance: 0.45 }
    );
  } else if (/shadow|garrick|fiend|pit |aboleth|wraith|specter|lich|vampire|cult|ghoul|necro|mind/.test(hay)) {
    moves.push(
      { name: "Dread Hex", damageType: "Shadow", target: "1 Ally", power: 1.02, inflictStatus: "curse", inflictTurns: 2, inflictChance: 0.5 },
      { name: "Abyssal Pulse", damageType: "Shadow", target: isBoss ? "All Allies" : "1 Ally", power: 1.15, inflictStatus: "curse", inflictTurns: 2, inflictChance: 0.4 }
    );
  } else if (/giant|ogre|golem|elemental|troll|brute|minotaur/.test(hay)) {
    moves.push(
      { name: "Crushing Slam", damageType: "Bludgeoning", target: "1 Ally", power: 1.1, inflictStatus: "stun", inflictTurns: 1, inflictChance: 0.25 },
      { name: "Armor Shatter", damageType: "Bludgeoning", target: "1 Ally", power: 1.02, inflictStatus: "def_down", inflictTurns: 2, inflictChance: 0.45 }
    );
  } else {
    moves.push(
      { name: "Fierce Strike", damageType: "Slashing", target: "1 Ally", power: 1.0 },
      { name: "Rending Slash", damageType: "Piercing", target: "1 Ally", power: 1.05, inflictStatus: "bleed", inflictTurns: 2, inflictChance: 0.38 }
    );
  }
  return moves[Math.floor(Math.random() * moves.length)];
}

function getHeroResolveState(hero) {
  const pct = (hero.curHp / Math.max(1, hero.maxHp)) * 100;
  if (pct <= 25) return { atkMul: 1.25 };
  if (pct <= 50) return { atkMul: 1.12 };
  return { atkMul: 1.0 };
}

function computeDamageOnEnemy(hero, mode, enemy) {
  const resolve = getHeroResolveState(hero);
  const momentumMul = hero.momentum ? 1.25 : 1.0;
  const hasteMul = hero.statuses.some((s) => s.kind === "haste") ? 1.2 : 1.0;
  const cursedMul = hero.statuses.some((s) => s.kind === "curse") ? 0.8 : 1.0;
  const weakMul = hero.statuses.some((s) => s.kind === "atk_down") ? 0.78 : 1.0;
  const poisonMul = hero.statuses.some((s) => s.kind === "poison") ? 0.85 : 1.0;

  const baseStat = (12 + hero.atk) * resolve.atkMul * hasteMul;
  const defStat = enemy.pDef * (1 - Math.min(0.6, mode.armorIgnore ?? 0));
  const defMod = enemy.statuses.some((s) => s.kind === "def_down") ? 0.75 : 1.0;
  const effDef = defStat * defMod;

  const lowHp = enemy.curHp / Math.max(1, enemy.maxHp) < 0.5;
  const critChance = Math.min(0.85, hero.critPct / 100 + (mode.critBonus || 0) + (lowHp ? mode.execCritBonus || 0 : 0));
  const isCrit = Math.random() < critChance;

  const dtLower = hero.weaponDamageType.toLowerCase();
  const isWeak = enemy.weakTypes.some((w) => dtLower.includes(w.toLowerCase()));
  const isResist = !isWeak && enemy.resistTypes.some((r) => dtLower.includes(r.toLowerCase()));

  let elemMul = isWeak ? 1.5 : isResist ? 0.5 : 1.0;
  if (enemy.staggeredTurns > 0) elemMul *= 1.5;
  if (enemy.statuses.some((s) => s.kind === "shock")) {
    elemMul *= 1.2;
    enemy.statuses = enemy.statuses.filter((s) => s.kind !== "shock");
  }

  let raw = Math.max(baseStat * 0.45, baseStat * 1.45 - effDef * 0.55) * mode.power * elemMul * momentumMul * cursedMul * weakMul * poisonMul;
  if (isCrit) raw *= 1.55;
  raw *= 0.94 + Math.random() * 0.12;
  return Math.max(1, Math.round(raw));
}

function instantiateEnemyUnit(def, zoneLevel = 3) {
  const lv = Math.max(1, Math.round((def.level ?? zoneLevel) * 0.4 + zoneLevel * 0.6));
  const roleLow = (def.role ?? "").toLowerCase();
  const speedBase = roleLow.includes("skirmish") || roleLow.includes("assassin") ? 22 : roleLow.includes("tank") || roleLow.includes("brute") ? 12 : 16;
  const maxHp = Math.max(24, Math.round(def.hp * (0.85 + (lv / Math.max(4, (def.level ?? lv) + 2)) * 0.25)));
  const xpReward = def.xp ?? Math.max(4, Math.round(3 + lv * 0.9 + lv * lv * 0.19));
  const pDef = def.pDef ?? Math.round(2 + lv * 0.85);
  const mDef = def.mDef ?? Math.round(2 + lv * 0.8);

  return {
    name: def.name,
    level: lv,
    role: def.role ?? "Enemy",
    maxHp,
    curHp: maxHp,
    atk: Math.max(6, Math.round(def.atk)),
    mag: Math.max(0, Math.round(def.mag ?? 0)),
    pDef,
    mDef,
    speed: speedBase + Math.floor(lv * 0.7),
    xpReward,
    weakTypes: parseDamageTypeList(def.weak),
    resistTypes: parseDamageTypeList(def.resist),
    staggeredTurns: 0,
    isBoss: false,
    timelinePos: Math.random() * 25 + 15,
    statuses: [],
  };
}

function allocateStats(level, statPolicy) {
  const pts = earnedPointsForLevel(level);
  const spent = { force: 0, finesse: 0, grit: 0, arcana: 0, presence: 0 };
  if (statPolicy === "none" || pts <= 0) return spent;
  if (statPolicy === "grit") {
    spent.grit = pts;
  } else if (statPolicy === "balanced") {
    for (let i = 0; i < pts; i++) {
      if (i % 2 === 0) spent.grit += 1;
      else spent.force += 1;
    }
  } else if (statPolicy === "force") {
    spent.force = pts;
  }
  return spent;
}

function simulateFight({ partyState, partyWeapons, mobPool, tactic, statPolicy, lockLevel1 = false, enemyCount = 2, noAutoRevive = false, fairInitiative = false }) {
  const heroes = partyState.map((ps, slotIdx) => {
    const base = HERO_BASE[ps.id];
    const wpn = partyWeapons[ps.id];
    const spent = allocateStats(ps.level, statPolicy);
    const attrs = {
      force: 1 + spent.force,
      finesse: 1 + spent.finesse,
      grit: 1 + spent.grit,
      arcana: 1 + spent.arcana,
      presence: 1 + spent.presence,
    };
    const maxHp = Math.round(base.baseHp + (ps.level - 1) * 18 + (attrs.grit - 1) * 12);
    const curHp = noAutoRevive && ps.dead ? 0 : Math.max(1, Math.min(maxHp, Math.round((maxHp * ps.hpPct) / 100)));
    return {
      id: ps.id,
      name: base.name,
      level: ps.level,
      maxHp,
      curHp,
      atk: Number(wpn.stats.attackPower) + Math.round((attrs.force - 1) * 1.6),
      pDef: attrs.grit - 1,
      mDef: attrs.presence - 1,
      speed: 10 + (attrs.finesse - 1),
      critPct: Math.min(45, 5 + Math.round((attrs.finesse - 1) * 0.4)),
      dodgePct: Math.min(40, Math.round(attrs.finesse * 0.3)),
      statusResistPct: Math.min(65, Math.round(attrs.grit * 0.5)),
      weaponSubType: wpn.subType,
      weaponDamageType: wpn.damageType,
      guarding: false,
      momentum: false,
      timelinePos: Math.random() * 14 + slotIdx * 4,
      statuses: [],
    };
  });

  // Zone 1 midZoneLv = 3 -> 2 enemies in live code
  const enemies = Array.from({ length: enemyCount }, () => {
    const e = instantiateEnemyUnit(mobPool[Math.floor(Math.random() * mobPool.length)], 3);
    if (fairInitiative) e.timelinePos = Math.random() * 18;
    return e;
  });

  let totalXpEarned = 0;
  let turns = 0;
  let enemySwings = 0;
  let dmgTaken = 0;

  while (turns < 300) {
    turns += 1;
    const livingHeroes = heroes.filter((h) => h.curHp > 0);
    const livingEnemies = enemies.filter((e) => e.curHp > 0);
    if (livingHeroes.length === 0) {
      return { won: false, enemySwings, dmgTaken, enemiesKilled: enemies.filter((e) => e.curHp <= 0).map((e) => e.name), enemiesAll: enemies.map((e) => `${e.name}(Lv${e.level})`), turns, heroes };
    }
    if (livingEnemies.length === 0) {
      for (const ps of partyState) {
        const h = heroes.find((x) => x.id === ps.id);
        if (h.curHp <= 0) {
          ps.hpPct = noAutoRevive ? 0 : 1;
          ps.dead = noAutoRevive;
          ps.kos += 1;
        } else {
          ps.hpPct = Math.max(1, Math.min(100, Math.round((h.curHp / Math.max(1, h.maxHp)) * 100)));
          if (!lockLevel1) {
            const gained = applyHeroXpGain(ps.level, ps.xp, totalXpEarned);
            ps.level = gained.level;
            ps.xp = gained.xp;
          }
        }
      }
      return { won: true, totalXpEarned, enemySwings, dmgTaken, enemiesAll: enemies.map((e) => `${e.name}(Lv${e.level})`), turns, heroes };
    }

    let actor = null;
    let actorKind = "hero";
    let minPos = Infinity;
    for (const h of livingHeroes) {
      if (h.timelinePos < minPos) {
        minPos = h.timelinePos;
        actor = h;
        actorKind = "hero";
      }
    }
    for (const e of livingEnemies) {
      if (e.timelinePos < minPos) {
        minPos = e.timelinePos;
        actor = e;
        actorKind = "enemy";
      }
    }
    if (Number.isFinite(minPos) && minPos > 0) {
      for (const h of livingHeroes) h.timelinePos = Math.max(0, h.timelinePos - minPos);
      for (const e of livingEnemies) e.timelinePos = Math.max(0, e.timelinePos - minPos);
    }

    if (actorKind === "hero") {
      const hero = actor;
      hero.guarding = false;
      if (hero.statuses.length > 0) {
        const tick = applyTurnStartAilments(hero.statuses, hero.maxHp, hero.statusResistPct);
        hero.statuses = tick.remaining;
        if (tick.dotDamage > 0) {
          const prevHp = hero.curHp;
          hero.curHp = Math.max(0, hero.curHp - tick.dotDamage);
          dmgTaken += prevHp - hero.curHp;
          if (hero.curHp <= 0) {
            hero.statuses = [];
            continue;
          }
        }
        if (tick.stunned) {
          hero.timelinePos += getTimeAdvanceForDelay(getEffectiveSpeed(hero.speed, hero.statuses), 0.9);
          continue;
        }
      }

      // Pick target: lowest current HP enemy to eliminate incoming damage fast
      const target = [...livingEnemies].sort((a, b) => a.curHp - b.curHp)[0];
      const modes = WEAPON_MODE_SPECS[hero.weaponSubType];
      let mode = modes[0];
      if (tactic === "smart") {
        // Use Armor Crush or Vital Gouge on full/healthy targets, Overhead Rend / Heavy if target > 18 HP
        if (modes[1].debuff && !target.statuses.some((s) => s.kind === modes[1].debuff) && target.curHp > 18) {
          mode = modes[1];
        } else if (modes[1].power >= 1.4 && target.curHp > 22 && target.curHp <= 36) {
          mode = modes[1];
        }
      } else if (tactic === "heavy") {
        mode = modes[1];
      }

      const isBlinded = hero.statuses.some((s) => s.kind === "blind");
      if (!(isBlinded && Math.random() < 0.22)) {
        const dmg = computeDamageOnEnemy(hero, mode, target);
        target.curHp = Math.max(0, target.curHp - dmg);
        if (mode.targetDelayPush && target.curHp > 0) {
          target.timelinePos += mode.targetDelayPush * 0.45;
        }
        if (mode.debuff && target.curHp > 0 && Math.random() < 0.75) {
          target.statuses = upsertStatusEffect(target.statuses, mode.debuff, 2);
        }
        if (target.curHp <= 0) totalXpEarned += target.xpReward;
      }
      hero.momentum = false;
      hero.timelinePos += getTimeAdvanceForDelay(getEffectiveSpeed(hero.speed, hero.statuses), mode.delayPct);
    } else {
      const enemy = actor;
      if (enemy.statuses.length > 0) {
        const tick = applyTurnStartAilments(enemy.statuses, enemy.maxHp, 15);
        enemy.statuses = tick.remaining;
        if (tick.dotDamage > 0) {
          enemy.curHp = Math.max(0, enemy.curHp - tick.dotDamage);
          if (enemy.curHp <= 0) {
            totalXpEarned += enemy.xpReward;
            continue;
          }
        }
        if (tick.stunned) {
          enemy.timelinePos += getTimeAdvanceForDelay(getEffectiveSpeed(enemy.speed, enemy.statuses), 0.9);
          continue;
        }
      }

      const target = livingHeroes[Math.floor(Math.random() * livingHeroes.length)];
      enemySwings += 1;
      const picked = pickEnemyCombatMove(enemy);
      const isMagicMove = enemy.mag > enemy.atk * 0.8 || /fire|frost|lightning|shadow|radiant|poison/i.test(picked.damageType);
      const atkWeaken = enemy.statuses.some((s) => s.kind === "atk_down") ? 0.78 : 1.0;
      const curseMul = enemy.statuses.some((s) => s.kind === "curse") ? 0.8 : 1.0;
      const hasteMul = enemy.statuses.some((s) => s.kind === "haste") ? 1.2 : 1.0;
      const isBlinded = enemy.statuses.some((s) => s.kind === "blind");

      if (!(isBlinded && Math.random() < 0.22) && !(Math.random() * 100 < target.dodgePct)) {
        const baseOffense = Math.max(4, (isMagicMove ? Math.max(enemy.atk, enemy.mag) : enemy.atk) * picked.power * atkWeaken * curseMul * hasteMul);
        const rawDef = isMagicMove ? target.mDef : target.pDef;
        const defVal = target.statuses.some((s) => s.kind === "def_down") ? Math.round(rawDef * 0.75) : rawDef;
        const rawStrike = baseOffense * 2.4;
        const mitigation = 1 / (1 + Math.max(0, defVal) / Math.max(3.5, baseOffense * 0.48));
        let dmg = Math.max(2, Math.round(rawStrike * mitigation));
        if (target.guarding) dmg = Math.max(1, Math.round(dmg * 0.5));
        if (target.statuses.some((s) => s.kind === "ward")) dmg = Math.max(1, Math.round(dmg * 0.75));
        dmg = Math.max(1, Math.round(dmg * (0.92 + Math.random() * 0.16)));

        const prevHp = target.curHp;
        target.curHp = Math.max(0, target.curHp - dmg);
        dmgTaken += prevHp - target.curHp;
        if (target.curHp <= 0) target.statuses = [];
        if (target.curHp > 0 && picked.inflictStatus && Math.random() < (picked.inflictChance ?? 0.55)) {
          target.statuses = upsertStatusEffect(target.statuses, picked.inflictStatus, picked.inflictTurns ?? 2);
        }
      }
      enemy.timelinePos += getTimeAdvanceForDelay(getEffectiveSpeed(enemy.speed, enemy.statuses), 1.0);
    }
  }
  return { won: false, enemiesAll: enemies.map((e) => e.name), turns, heroes };
}

function runScenario({ label, heroIds, weaponIds, mobPool, tactic = "smart", statPolicy = "none", lockLevel1 = false, enemyCount = 2, noAutoRevive = false, fairInitiative = false, runs = 500, traceSample = false }) {
  const byId = Object.fromEntries(itemsCatalog.map((it) => [it.id, it]));
  const partyWeapons = {};
  for (let i = 0; i < heroIds.length; i++) {
    partyWeapons[heroIds[i]] = byId[weaponIds[i]];
  }

  const winsList = [];
  const finalLevels = [];
  const koCounts = [];
  let totalFightsSimulated = 0;
  let totalEnemySwings = 0;
  let totalDmgTaken = 0;
  let firstKoList = [];
  let sampleLog = [];

  for (let r = 0; r < runs; r++) {
    const partyState = heroIds.map((id) => ({ id, level: 1, xp: 0, hpPct: 100, kos: 0, dead: false }));
    let fightsWon = 0;
    let firstKo = null;
    while (fightsWon < 500) {
      const res = simulateFight({ partyState, partyWeapons, mobPool, tactic, statPolicy, lockLevel1, enemyCount, noAutoRevive, fairInitiative });
      totalFightsSimulated += 1;
      totalEnemySwings += res.enemySwings;
      totalDmgTaken += res.dmgTaken;
      if (firstKo === null && partyState.some((p) => p.kos > 0)) {
        firstKo = fightsWon + 1;
      }
      if (traceSample && r === 0 && fightsWon < 15) {
        sampleLog.push(`  Fight ${fightsWon + 1}: vs [${res.enemiesAll.join(", ")}] -> ${res.won ? "WIN" : "WIPE"} (swings=${res.enemySwings}, dmg=${res.dmgTaken}) | HPs: ${res.heroes.map((h) => `${h.name}(Lv${h.level}):${h.curHp}/${h.maxHp}`).join(" ")}`);
      }
      if (!res.won) {
        if (traceSample && r === 0 && fightsWon >= 15) {
          sampleLog.push(`  Fight ${fightsWon + 1}: vs [${res.enemiesAll.join(", ")}] -> WIPE`);
        }
        break;
      }
      fightsWon += 1;
    }
    winsList.push(fightsWon);
    if (firstKo !== null) firstKoList.push(firstKo);
    finalLevels.push(partyState.reduce((s, p) => s + p.level, 0) / partyState.length);
    koCounts.push(partyState.reduce((s, p) => s + p.kos, 0));
  }

  winsList.sort((a, b) => a - b);
  const avg = winsList.reduce((s, v) => s + v, 0) / runs;
  const median = winsList[Math.floor(runs / 2)];
  const p10 = winsList[Math.floor(runs * 0.1)];
  const p90 = winsList[Math.floor(runs * 0.9)];
  const avgLv = finalLevels.reduce((s, v) => s + v, 0) / runs;
  const avgKos = koCounts.reduce((s, v) => s + v, 0) / runs;
  const avgSwings = totalEnemySwings / Math.max(1, totalFightsSimulated);
  const avgDmg = totalDmgTaken / Math.max(1, totalFightsSimulated);
  const firstKoStr = firstKoList.length > 0 ? `Avg Fight #${(firstKoList.reduce((a, b) => a + b, 0) / firstKoList.length).toFixed(1)} (${firstKoList.length}/${runs} runs had a KO)` : "None in 500 fights";

  console.log(`\n=== ${label} ===`);
  console.log(`Party & Weapons: ${heroIds.map((id) => `${HERO_BASE[id].name} (${partyWeapons[id].name}, +${partyWeapons[id].stats.attackPower} ATK)`).join(" | ")}`);
  console.log(`Params: tactic=${tactic} | stats=${statPolicy} | lv1Locked=${lockLevel1} | foes=${enemyCount} | noAutoRevive=${noAutoRevive} | fairInit=${fairInitiative}`);
  console.log(`Fights Survived Before Wipe -> Avg: ${avg.toFixed(2)} | Median: ${median} | Min: ${winsList[0]} | Max: ${winsList[runs - 1]} (P10=${p10}, P90=${p90})`);
  console.log(`Avg Enemy Swings/Fight: ${avgSwings.toFixed(2)} | Avg Party Dmg Taken/Fight: ${avgDmg.toFixed(2)} HP | First Hero KO: ${firstKoStr}`);
  console.log(`Avg Hero Level at End: ${avgLv.toFixed(2)} | Avg Total KOs: ${avgKos.toFixed(2)}`);
  if (sampleLog.length > 0) {
    console.log("Sample Run #1 Trace:\n" + sampleLog.join("\n"));
  }
}

// Build Zone 1 pools
const z1AllMobs = battleConfig.monsters.filter((m) => !m.isBoss && typeof m.level === "number" && m.level <= 5);
const crownlandMeadowsZone1Only = z1AllMobs.filter((m) => ["Bandit", "Acolyte"].includes(m.name));
const liveCodeCrownlandPool = battleConfig.monsters.filter((m) => !m.isBoss && ["Bandit", "Acolyte", "Thug", "Spy", "Bandit Captain", "Warrior Veteran"].includes(m.name));

const PARTY_HEROES = ["valen", "orin", "rowan", "harlan"];
const PARTY_WEAPONS_BEST_MELEE = [
  "wpn_01_greatsword_pitted_claymore", // Valen: 2H +8 ATK (48s)
  "wpn_01_spear_ashwood_spear",        // Orin:  2H +8 ATK (48s)
  "wpn_01_dagger_chipped_iron_dagger", // Rowan: 1H +6 ATK (40s)
  "wpn_01_mace_oak_club_mace",         // Harlan: 1H +6 ATK (40s)
];
const PARTY_WEAPONS_ALL_1H = [
  "wpn_01_longsword_rusted_longsword", // Valen: 1H +6 ATK (40s)
  "wpn_01_battleaxe_woodmans_hatchet", // Orin:  1H +6 ATK (40s)
  "wpn_01_dagger_chipped_iron_dagger", // Rowan: 1H +6 ATK (40s)
  "wpn_01_mace_oak_club_mace",         // Harlan: 1H +6 ATK (40s)
];

console.log("Zone 1 (Lv 1-5) Monsters:", z1AllMobs.map((m) => `${m.name} (Lv${m.level}, ${m.hp}HP, ${m.atk}ATK/${m.mag}MAG)`).join(", "));

runScenario({
  label: "1. Zone 1 (All 6 Lv 1-5 Mobs) | Best Step-1 Melee Weapons (176s) | No Stat Points Spent",
  heroIds: PARTY_HEROES,
  weaponIds: PARTY_WEAPONS_BEST_MELEE,
  mobPool: z1AllMobs,
  tactic: "smart",
  statPolicy: "none",
  traceSample: true,
});

runScenario({
  label: "1B. Zone 1 (All 6 Lv 1-5 Mobs) | Best Step-1 Melee Weapons | Level 1 Locked (No Level-Up HP Boost)",
  heroIds: PARTY_HEROES,
  weaponIds: PARTY_WEAPONS_BEST_MELEE,
  mobPool: z1AllMobs,
  tactic: "smart",
  statPolicy: "none",
  lockLevel1: true,
  traceSample: true,
});

runScenario({
  label: "1C. Zone 1 (All 6 Lv 1-5 Mobs) | Best Step-1 Melee Weapons | Level 1 Locked + 3 Mobs/Fight",
  heroIds: PARTY_HEROES,
  weaponIds: PARTY_WEAPONS_BEST_MELEE,
  mobPool: z1AllMobs,
  tactic: "smart",
  statPolicy: "none",
  lockLevel1: true,
  enemyCount: 3,
});

runScenario({
  label: "1C2. Zone 1 (All 6 Lv 1-5 Mobs) | Best Step-1 Melee Weapons | Leveling ON + 2 Mobs/Fight + Fair Init",
  heroIds: PARTY_HEROES,
  weaponIds: PARTY_WEAPONS_BEST_MELEE,
  mobPool: z1AllMobs,
  tactic: "smart",
  statPolicy: "none",
  enemyCount: 2,
  fairInitiative: true,
});

runScenario({
  label: "1D. Zone 1 (All 6 Lv 1-5 Mobs) | Best Step-1 Melee Weapons | Leveling ON + 3 Mobs/Fight + Fair Init",
  heroIds: PARTY_HEROES,
  weaponIds: PARTY_WEAPONS_BEST_MELEE,
  mobPool: z1AllMobs,
  tactic: "smart",
  statPolicy: "none",
  enemyCount: 3,
  fairInitiative: true,
});

runScenario({
  label: "1E. Zone 1 (All 6 Lv 1-5 Mobs) | Best Step-1 Melee Weapons | Leveling ON + 4 Mobs/Fight + Fair Init",
  heroIds: PARTY_HEROES,
  weaponIds: PARTY_WEAPONS_BEST_MELEE,
  mobPool: z1AllMobs,
  tactic: "smart",
  statPolicy: "none",
  enemyCount: 4,
  fairInitiative: true,
});

runScenario({
  label: "1F. Zone 1 (All 6 Lv 1-5 Mobs) | Best Step-1 Melee Weapons | No Auto-Revive + 3 Mobs + Fair Init",
  heroIds: PARTY_HEROES,
  weaponIds: PARTY_WEAPONS_BEST_MELEE,
  mobPool: z1AllMobs,
  tactic: "smart",
  statPolicy: "none",
  enemyCount: 3,
  noAutoRevive: true,
  fairInitiative: true,
});

runScenario({
  label: "2. Zone 1 (All 6 Lv 1-5 Mobs) | Best Step-1 Melee Weapons (176s) | Fast Mode Only + No Stats",
  heroIds: PARTY_HEROES,
  weaponIds: PARTY_WEAPONS_BEST_MELEE,
  mobPool: z1AllMobs,
  tactic: "fast",
  statPolicy: "none",
});

runScenario({
  label: "3. Zone 1 (All 6 Lv 1-5 Mobs) | Best Step-1 Melee Weapons (176s) | Level-Up Points Into Grit (+HP/+DEF)",
  heroIds: PARTY_HEROES,
  weaponIds: PARTY_WEAPONS_BEST_MELEE,
  mobPool: z1AllMobs,
  tactic: "smart",
  statPolicy: "grit",
});

runScenario({
  label: "4. Zone 1 (All 6 Lv 1-5 Mobs) | All 1H Step-1 Melee Weapons (160s) | No Stat Points Spent",
  heroIds: PARTY_HEROES,
  weaponIds: PARTY_WEAPONS_ALL_1H,
  mobPool: z1AllMobs,
  tactic: "smart",
  statPolicy: "none",
});

runScenario({
  label: "5. Crownland Meadows Zone 1 Only (Bandit + Acolyte) | Best Step-1 Melee Weapons | No Stat Points",
  heroIds: PARTY_HEROES,
  weaponIds: PARTY_WEAPONS_BEST_MELEE,
  mobPool: crownlandMeadowsZone1Only,
  tactic: "smart",
  statPolicy: "none",
});

runScenario({
  label: "6. CURRENT LIVE CODE BUG CHECK (Crownland Meadows Unfiltered Spawn Pool: Bandit..Warrior Veteran Lv24)",
  heroIds: PARTY_HEROES,
  weaponIds: PARTY_WEAPONS_BEST_MELEE,
  mobPool: liveCodeCrownlandPool,
  tactic: "smart",
  statPolicy: "none",
});
