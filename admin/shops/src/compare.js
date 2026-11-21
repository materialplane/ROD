// Stat comparison math, slot mapping, weapon attack lookup, and human-readable summaries.

const STAT_LABELS = {
  attackPower: "Attack",
  magicPower: "Spell Power Mod",
  healPower: "Heal Power Mod",
  physDef: "Phys Def",
  magDef: "Magic Def",
  critBonusPct: "Crit %",
  spellCritPct: "Spell Crit %",
  critDmgPct: "Crit Damage %",
  piercePowerPct: "Armor Pierce %",
  dodgePct: "Dodge %",
  guardBonusPct: "Guard %",
  gritBonus: "Grit",
  speedMod: "Speed",
  maxHp: "Max HP",
  maxMp: "Max MP",
  statusPotencyPct: "Ailment Power %",
  statusResistPct: "Ailment Resist %",
};

export function cleanDamageTypeLabel(raw) {
  return raw ? String(raw).replace(/\s*\/\s*(Caster|Nature)\b/gi, "").trim() : "";
}

export const SLOT_LABELS = {
  right_hand: "Right Hand",
  left_hand: "Left Hand",
  body: "Body Armor",
  head: "Helmet",
  accessory: "Class Accessory",
};

// Canon 0 MP weapon attack styles from docs/06-gear-and-runestones.md
export const WEAPON_ATTACK_MODES = {
  Longsword: ["Quick Slash", "Heavy Cleave"],
  Greatsword: ["Wide Sweep", "Overhead Rend"],
  Rapier: ["Needle Thrust", "Heart Pierce"],
  Battleaxe: ["Chopping Hack", "Execution Chop"],
  Mace: ["Heavy Bash", "Armor Crush"],
  Spear: ["Long Thrust", "Brace Sweep"],
  Longbow: ["Snap Arrow", "Aimed Piercer"],
  Shortbow: ["Quick Volley", "Wing Clip"],
  Dagger: ["Quick Jab", "Vital Gouge"],
  "Light Crossbow": ["Bolt Snap", "Siege Crank"],
  Quarterstaff: ["Staff Sweep", "Crushing Vault"],
  Scimitar: ["Crescent Cut", "Whirling Slash"],
  Sickle: ["Reaping Hook", "Thorn Slash"],
};

export function tierAccentColor(step) {
  if (!step) return "#7d653c";
  if (step <= 6) return "#6b8e6b";     // Crownlands / Saltmarsh Starter-Solid
  if (step <= 12) return "#4e86b8";    // Thornwall / Weald Veteran
  if (step <= 18) return "#9d68c4";    // Sun-Scorched / Ironcrest Master
  return "#e0a943";                    // Frostbound / Dreadwaste Mythic
}

export function itemSlotFor(item) {
  if (!item) return null;
  if (item.slot) return item.slot;
  if (["cloak", "orb", "horn", "quiver", "crystal", "tome"].includes(item.category)) return "accessory";
  return null;
}

export function canHeroUse(item, heroId) {
  if (!item || !item.usableBy) return true;
  return item.usableBy.includes(heroId);
}

export function itemOwnStatRows(item) {
  if (!item?.stats) return [];
  const rows = [];
  for (const [k, label] of Object.entries(STAT_LABELS)) {
    const val = Number(item.stats[k] ?? 0);
    if (val !== 0) rows.push({ key: k, label, curVal: 0, newVal: val, diff: val });
  }
  return rows;
}

export function computeHeroDelta(item, equippedMap, heroId) {
  const slot = itemSlotFor(item);
  const slotLabel = SLOT_LABELS[slot] ?? item?.subType ?? "Utility";
  if (!item || !canHeroUse(item, heroId)) {
    return { usable: false, headline: "Cannot Use", slot, slotLabel, rows: [], comparedItem: null, comparedTo: null };
  }
  if (!slot || !item.stats) {
    return {
      usable: true,
      headline: item.effect ? "Party Utility" : "Usable",
      slot,
      slotLabel,
      rows: [],
      comparedItem: null,
      comparedTo: null,
    };
  }

  const heroGear = equippedMap?.[heroId] ?? {};
  const cur = heroGear[slot] ?? null;
  const curStats = cur?.stats ?? {};
  const newStats = item.stats ?? {};
  const keys = [...new Set([...Object.keys(curStats), ...Object.keys(newStats)])].filter((k) => STAT_LABELS[k]);

  const rows = [];
  for (const k of keys) {
    const nv = Number(newStats[k] ?? 0);
    const cv = Number(curStats[k] ?? 0);
    const diff = nv - cv;
    if (nv === 0 && cv === 0) continue;
    rows.push({ key: k, label: STAT_LABELS[k], curVal: cv, newVal: nv, diff });
  }
  const priority =
    heroId === "ellowyn" || heroId === "mera"
      ? ["magicPower", "healPower", "attackPower", "physDef", "magDef", "spellCritPct", "speedMod"]
      : heroId === "harlan"
        ? ["healPower", "magicPower", "attackPower", "physDef", "magDef", "statusResistPct", "speedMod"]
        : ["attackPower", "physDef", "magDef", "piercePowerPct", "critBonusPct", "speedMod"];
  let primaryDiff = null;
  for (const pk of priority) {
    const hit = rows.find((r) => r.key === pk);
    if (hit) { primaryDiff = { label: hit.label, diff: hit.diff }; break; }
  }
  if (!primaryDiff && rows.length) primaryDiff = { label: rows[0].label, diff: rows[0].diff };

  let headline = "Same";
  if (cur?.id === item.id) {
    headline = "Equipped";
  } else if (primaryDiff) {
    const sign = primaryDiff.diff > 0 ? "+" : "";
    headline = primaryDiff.diff === 0 ? "Same" : `${sign}${primaryDiff.diff} ${primaryDiff.label}`;
  }

  return {
    usable: true,
    headline,
    primaryDiff: primaryDiff?.diff ?? 0,
    slot,
    slotLabel,
    rows,
    comparedItem: cur,
    comparedTo: cur?.name ?? "Empty",
    unequipsShieldFor2H: slot === "right_hand" && item.handed === "2H" && Boolean(heroGear.left_hand),
    leftHandBlockedBy2H: slot === "left_hand" && heroGear.right_hand?.handed === "2H",
  };
}

export function shortStatSummary(item) {
  if (!item) return "";
  if (item.category === "spell") return `${item.mpCost} MP · ${item.damageType} · ${item.target}`;
  if (item.effect) return item.effect;
  const s = item.stats ?? {};
  const parts = [];
  if (s.attackPower) parts.push(`ATK ${s.attackPower}`);
  if (s.magicPower) parts.push(`MAG ${s.magicPower}`);
  if (s.healPower) parts.push(`HEAL ${s.healPower}`);
  if (s.physDef) parts.push(`DEF ${s.physDef}`);
  if (s.magDef) parts.push(`MDEF ${s.magDef}`);
  if (s.critBonusPct) parts.push(`CRIT +${s.critBonusPct}%`);
  if (s.speedMod) parts.push(`SPD ${s.speedMod > 0 ? "+" : ""}${s.speedMod}`);
  if (s.dodgePct) parts.push(`DODGE +${s.dodgePct}%`);
  return parts.slice(0, 3).join(" · ") || item.subType;
}
