// Admin Suite — Interactive FF Battle Encounters, Ability Selection, VFX & Stage Configurator

const HERO_BASE = {
  valen: {
    id: "valen",
    name: "Valen",
    role: "Duelist",
    maxHp: 280,
    maxMp: 0,
    atk: 34,
    mag: 0,
    defWeapon: "wpn_02_longsword_iron_arming_longsword",
    allowedWeapons: ["Longsword", "Greatsword", "Rapier"],
  },
  ellowyn: {
    id: "ellowyn",
    name: "Ellowyn",
    role: "Sorceress",
    maxHp: 220,
    maxMp: 160,
    atk: 14,
    mag: 42,
    defWeapon: "wpn_02_staff_ash_runestaff",
    allowedWeapons: ["Quarterstaff", "Dagger", "Light Crossbow"],
  },
  orin: {
    id: "orin",
    name: "Orin",
    role: "Knight",
    maxHp: 340,
    maxMp: 0,
    atk: 30,
    mag: 0,
    defWeapon: "wpn_02_spear_iron_leafspear",
    allowedWeapons: ["Battleaxe", "Mace", "Spear"],
  },
  rowan: {
    id: "rowan",
    name: "Rowan",
    role: "Ranger",
    maxHp: 245,
    maxMp: 0,
    atk: 33,
    mag: 0,
    defWeapon: "wpn_02_longbow_yew_longbow",
    allowedWeapons: ["Longbow", "Shortbow", "Dagger"],
  },
  mera: {
    id: "mera",
    name: "Mera",
    role: "Druid",
    maxHp: 255,
    maxMp: 150,
    atk: 24,
    mag: 38,
    defWeapon: "wpn_02_scimitar_brass_hilted_scimitar",
    allowedWeapons: ["Quarterstaff", "Scimitar", "Sickle"],
  },
  harlan: {
    id: "harlan",
    name: "Harlan",
    role: "Sage",
    maxHp: 250,
    maxMp: 145,
    atk: 20,
    mag: 34,
    defWeapon: "wpn_02_mace_flanged_iron_mace",
    allowedWeapons: ["Quarterstaff", "Mace", "Dagger"],
  },
};

// All 13 D&D weapon categories x 2 defined 0 MP attack modes (docs/06-gear-and-runestones.md)
const WEAPON_ATTACK_MODES = {
  Longsword: [
    { id: "wpn_skill_longsword_quick_slash", name: "Quick Slash", tag: "Fast", power: 1.0, critBonus: 0, effect: "Fast slash with high hit accuracy; keeps your next turn sooner." },
    { id: "wpn_skill_longsword_heavy_cleave", name: "Heavy Cleave", tag: "Heavy", power: 1.4, critBonus: 0.15, effect: "Heavy slash dealing high damage (+15% Crit Chance) and breaking 1 Guard point." },
  ],
  Greatsword: [
    { id: "wpn_skill_greatsword_wide_sweep", name: "Wide Sweep", tag: "Push", power: 1.05, critBonus: 0, effect: "Wide arc that deals solid damage and pushes the target back on the turn bar." },
    { id: "wpn_skill_greatsword_overhead_rend", name: "Overhead Rend", tag: "Heavy", power: 1.45, critBonus: 0.08, effect: "Heavy overhead chop dealing huge damage and breaking 1 extra Guard point." },
  ],
  Rapier: [
    { id: "wpn_skill_rapier_needle_thrust", name: "Needle Thrust", tag: "Fast", power: 1.0, critBonus: 0.05, effect: "Ultra-fast lunge with 98% hit accuracy; keeps your next turn sooner." },
    { id: "wpn_skill_rapier_heart_pierce", name: "Heart Pierce", tag: "Crit", power: 1.38, critBonus: 0.2, armorIgnore: 0.25, effect: "Focused thrust (+20% Crit Chance) that ignores 25% of enemy Physical Defense." },
  ],
  Battleaxe: [
    { id: "wpn_skill_battleaxe_chopping_hack", name: "Chopping Hack", tag: "Fast", power: 1.02, critBonus: 0, effect: "Dependable axe chop with reliable accuracy and steady Slashing damage." },
    { id: "wpn_skill_battleaxe_execution_chop", name: "Execution Chop", tag: "Execute", power: 1.44, critBonus: 0.05, execCritBonus: 0.25, effect: "Heavy chop gaining +25% Crit Chance and bonus damage vs. enemies below 50% HP." },
  ],
  Mace: [
    { id: "wpn_skill_mace_heavy_bash", name: "Heavy Bash", tag: "Guard", power: 1.02, critBonus: 0, effect: "Fast blunt bash that chips 1 Guard point off guarded enemies." },
    { id: "wpn_skill_mace_armor_crush", name: "Armor Crush", tag: "Break", power: 1.36, critBonus: 0, effect: "Heavy smash that lowers the target's Physical Defense for 1 turn." },
  ],
  Spear: [
    { id: "wpn_skill_spear_long_thrust", name: "Long Thrust", tag: "Aim", power: 1.04, critBonus: 0.12, effect: "Long-reach thrust granting bonus hit accuracy and +12% Crit Chance." },
    { id: "wpn_skill_spear_brace_sweep", name: "Brace Sweep", tag: "Delay", power: 1.34, critBonus: 0, effect: "Sweeping polearm hit that pushes the enemy back on the turn bar." },
  ],
  Longbow: [
    { id: "wpn_skill_longbow_snap_arrow", name: "Snap Arrow", tag: "Fast", power: 1.0, critBonus: 0, effect: "Quick long-range arrow with high accuracy and fast recovery." },
    { id: "wpn_skill_longbow_aimed_piercer", name: "Aimed Piercer", tag: "Sniper", power: 1.42, critBonus: 0.25, armorIgnore: 0.25, effect: "Slow, aimed shot granting +25% Crit Chance and ignoring 25% of enemy Physical Defense." },
  ],
  Shortbow: [
    { id: "wpn_skill_shortbow_quick_volley", name: "Quick Volley", tag: "Fast", power: 0.98, critBonus: 0.05, effect: "Fastest bow shot; keeps your next turn early on the turn bar." },
    { id: "wpn_skill_shortbow_wing_clip", name: "Wing Clip", tag: "Delay", power: 1.3, critBonus: 0, effect: "Pinning arrow that pushes the enemy's next turn back on the turn bar." },
  ],
  Dagger: [
    { id: "wpn_skill_dagger_quick_jab", name: "Quick Jab", tag: "Fast", power: 0.96, critBonus: 0.06, effect: "Rapid stab with high accuracy and fast turn recovery." },
    { id: "wpn_skill_dagger_vital_gouge", name: "Vital Gouge", tag: "Bleed", power: 1.35, critBonus: 0.15, effect: "Deep stab (+15% Crit Chance) with a chance to inflict 2-turn Bleed." },
  ],
  "Light Crossbow": [
    { id: "wpn_skill_crossbow_bolt_snap", name: "Bolt Snap", tag: "Pierce", power: 1.02, critBonus: 0.05, armorIgnore: 0.15, effect: "Steady bolt shot that ignores 15% of enemy Physical Defense." },
    { id: "wpn_skill_crossbow_siege_crank", name: "Siege Crank", tag: "Break", power: 1.38, critBonus: 0.08, effect: "Heavy cranked bolt dealing high damage and chipping 1 Guard point." },
  ],
  Quarterstaff: [
    { id: "wpn_skill_staff_sweep", name: "Staff Sweep", tag: "MP+", power: 1.0, critBonus: 0, effect: "Quick two-handed strike that restores a small amount of MP on hit." },
    { id: "wpn_skill_staff_crushing_vault", name: "Crushing Vault", tag: "Break", power: 1.36, critBonus: 0, effect: "Heavy overhead staff slam that chips 1 Guard point." },
  ],
  Scimitar: [
    { id: "wpn_skill_scimitar_crescent_cut", name: "Crescent Cut", tag: "Fast", power: 1.02, critBonus: 0.05, effect: "Smooth curved slash with high hit accuracy and fast recovery." },
    { id: "wpn_skill_scimitar_whirling_slash", name: "Whirling Slash", tag: "Haste", power: 1.36, critBonus: 0.15, effect: "Spinning slash (+15% Crit Chance) that brings your next turn sooner." },
  ],
  Sickle: [
    { id: "wpn_skill_sickle_reaping_hook", name: "Reaping Hook", tag: "Bleed", power: 1.0, critBonus: 0.05, effect: "Fast hooked slice with a chance to inflict 2-turn Bleed." },
    { id: "wpn_skill_sickle_thorn_slash", name: "Thorn Slash", tag: "Weaken", power: 1.32, critBonus: 0, effect: "Barbed cut that lowers the enemy's Attack for 1 turn." },
  ],
};

const FOOTPRINT_PRESETS = [
  { label: "1×1 Standard", w: 1, h: 1, name: "Standard (1×1)" },
  { label: "2×2 Large", w: 2, h: 2, name: "Large (2×2)" },
  { label: "3×3 Colossal", w: 3, h: 3, name: "Colossal (3×3)" },
  { label: "2×1 Wide", w: 2, h: 1, name: "Large Wide (2×1)" },
  { label: "1×2 Tall", w: 1, h: 2, name: "Large Tall (1×2)" },
  { label: "3×2 Boss", w: 3, h: 2, name: "Boss (3×2)" },
];

const VFX_MAP = {
  slashing_fast: { folder: "sheet_01", row: 1, color: "#e5e7eb", shake: true, frames: 6 },
  slashing_heavy: { folder: "sheet_01", row: 2, color: "#f59e0b", shake: true, frames: 6 },
  slashing_twin: { folder: "sheet_01", row: 3, color: "#f5b041", shake: true, frames: 6 },
  slashing_bleed: { folder: "sheet_01", row: 4, color: "#ef4444", shake: true, frames: 6 },
  bludgeoning_fast: { folder: "sheet_01", row: 5, color: "#d97706", shake: true, frames: 6 },
  bludgeoning_heavy: { folder: "sheet_01", row: 6, color: "#fb923c", shake: true, frames: 6 },
  piercing_melee: { folder: "sheet_02", row: 1, color: "#67e8f9", shake: true, frames: 6 },
  arrow_single: { folder: "sheet_02", row: 2, color: "#f59e0b", shake: true, frames: 6 },
  arrow_volley: { folder: "sheet_02", row: 3, color: "#38bdf8", shake: true, frames: 6 },
  fire_single: { folder: "sheet_02", row: 4, color: "#ff5722", shake: true, frames: 6 },
  fire_aoe: { folder: "sheet_02", row: 5, color: "#f97316", shake: true, frames: 6 },
  lightning: { folder: "sheet_02", row: 6, color: "#fde047", shake: true, frames: 6 },
  frost_single: { folder: "sheet_03", row: 1, color: "#4dd0e1", shake: true, frames: 6 },
  frost_aoe: { folder: "sheet_03", row: 2, color: "#38bdf8", shake: true, frames: 6 },
  poison_acid: { folder: "sheet_03", row: 3, color: "#84cc16", shake: false, frames: 6 },
  poison_spore: { folder: "sheet_03", row: 4, color: "#7ac74f", shake: false, frames: 5 }, // sheet_03 r4c6 empty
  shadow_single: { folder: "sheet_03", row: 5, color: "#6366f1", shake: true, frames: 6 },
  radiant: { folder: "sheet_03", row: 6, color: "#fde047", shake: true, frames: 6 },
  heal_single: { folder: "sheet_04", row: 1, color: "#2ecc71", shake: false, frames: 6 },
  heal_aoe: { folder: "sheet_04", row: 2, color: "#10b981", shake: false, frames: 6 },
  revive: { folder: "sheet_04", row: 3, color: "#fbbf24", shake: false, frames: 6 },
  ward: { folder: "sheet_04", row: 4, color: "#38d9c0", shake: false, frames: 6 },
  guard: { folder: "sheet_04", row: 5, color: "#94a3b8", shake: false, frames: 6 },
  mana: { folder: "sheet_04", row: 6, color: "#3b82f6", shake: false, frames: 6 },
  nature_vine: { folder: "sheet_05", row: 1, color: "#22c55e", shake: true, frames: 6 },
  cleanse: { folder: "sheet_05", row: 2, color: "#5eead4", shake: false, frames: 6 },
  buff: { folder: "sheet_05", row: 3, color: "#eab308", shake: false, frames: 6 },
  shadow_aoe: { folder: "sheet_05", row: 4, color: "#4f46e5", shake: true, frames: 6 },
  wind: { folder: "sheet_05", row: 5, color: "#67e8f9", shake: true, frames: 6 },
};

const state = {
  config: null,
  spells: [],
  itemsById: {},
  potions: [],
  inventoryPotions: [], // { id, qty } dynamically grows/shrinks hotbar
  weaponSkillManifest: null,
  magicTierManifest: null,
  disciplinesByHero: {},
  squadIds: ["valen", "ellowyn", "orin", "rowan"],
  party: [],
  selectedStageId: null,
  stageFilter: "all",
  stageSearch: "",
  mobSearch: "",
  viewMode: "player", // player | editor
  mobFacing: "normal",
  heroHpTier: 1,
  maxSpellTier: 8, // 0..8 unlocked Magic Tiers (2/3 learned per Tier)
  perkCount: 10, // 0..10 unlocked Arcanist Discipline perks per Hero
  openTierPopup: null, // null | 1..8
  activeHeroTurn: 0,
  armedAction: null,
  encounter: [], // { instanceId, mobId, hp, maxHp }
  selectedMobId: null,
  selectedInstanceId: null,
  isAnimating: false,
  dirty: false,
};

let nextInstanceSeq = 1;
const vfxCache = new Map();

const elStats = document.getElementById("studioStats");
const elStageList = document.getElementById("stageList");
const elStageFrameWrap = document.getElementById("stageFrameWrap");
const elStageViewport = document.getElementById("stageViewport");
const elImgBackdrop = document.getElementById("imgBackdrop");
const elHeroZoneBox = document.getElementById("heroZoneBox");
const elHeroSlotsLayer = document.getElementById("heroSlotsLayer");
const elEnemyZoneBox = document.getElementById("enemyZoneBox");
const elEnemyGridCells = document.getElementById("enemyGridCells");
const elEnemySpritesLayer = document.getElementById("enemySpritesLayer");
const elLblGridDims = document.getElementById("lblGridDims");
const elTurnBar = document.getElementById("ffTurnBar");
const elActionBanner = document.getElementById("battleActionBanner");
const elVfxLayer = document.getElementById("vfxOverlayLayer");
const elTierMenuPopup = document.getElementById("tierMenuPopup");
const elHotbarTooltip = document.getElementById("hotbarTooltip");
const elPerkTooltip = document.getElementById("perkTooltip");
const elEnemyTooltip = document.getElementById("enemyTooltip");
const elBattleHotbar = document.getElementById("battleHotbar");
const elHotbarSlots = document.getElementById("hotbarSlots");
const selHeroWeapon = document.getElementById("selHeroWeapon");
const selSpellTier = document.getElementById("selSpellTier");
const selPerkCount = document.getElementById("selPerkCount");

const elNativeMobs = document.getElementById("nativeMobChips");
const elAllMobs = document.getElementById("allMobChips");
const elSelectedMobEditor = document.getElementById("selectedMobEditor");
const elSpawnedList = document.getElementById("spawnedList");
const elLblSpawnCount = document.getElementById("lblSpawnCount");
const elLblStageTitle = document.getElementById("lblStageTitle");
const elLblStageZones = document.getElementById("lblStageZones");
const elLblAllMobsHeader = document.getElementById("lblAllMobsHeader");
const elToast = document.getElementById("toastBanner");

const inpGridCols = document.getElementById("inpGridCols");
const inpGridRows = document.getElementById("inpGridRows");
const inpEnemyBackScale = document.getElementById("inpEnemyBackScale");
const inpEnemyFrontScale = document.getElementById("inpEnemyFrontScale");
const lblEnemyCoords = document.getElementById("lblEnemyCoords");
const inpHeroStagger = document.getElementById("inpHeroStagger");
const inpHeroScale = document.getElementById("inpHeroScale");
const lblHeroCoords = document.getElementById("lblHeroCoords");
const btnSave = document.getElementById("btnSaveConfig");

let toastTimer = null;
function showToast(msg) {
  elToast.textContent = msg;
  elToast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elToast.classList.add("hidden"), 2400);
}

function esc(val) {
  return String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function markDirty() {
  state.dirty = true;
  btnSave.classList.add("dirty");
  btnSave.textContent = "Save Changes *";
}

function getStage() {
  if (!state.config?.stages?.length) return null;
  return state.config.stages.find((s) => s.id === state.selectedStageId) || state.config.stages[0];
}

function getMob(mobId) {
  return state.config?.monsters?.find((m) => m.id === mobId) || null;
}

function findMobByName(name) {
  const target = name.trim().toLowerCase();
  return state.config?.monsters?.find((m) => m.name.toLowerCase() === target) || null;
}

function findWeaponForSubType(heroId, subType) {
  const candidates = Object.values(state.itemsById).filter(
    (it) => it.category === "weapon" && it.subType === subType
  );
  return candidates[1] || candidates[0] || findBestWeaponForHero(heroId);
}

function equipWeaponSubTypeOnHero(hero, subType) {
  const wpn = findWeaponForSubType(hero.id, subType);
  hero.weaponName = wpn?.name || subType;
  hero.weaponSubType = subType;
  hero.weaponDamageType = wpn?.damageType || hero.weaponDamageType || "Slashing";
  hero.weaponIcon = wpn?.iconPath || "assets/icons/ui/ui_01_weapon_slot_glyph.webp";
  hero.attackModes = WEAPON_ATTACK_MODES[subType] || WEAPON_ATTACK_MODES.Longsword;
}

function restockTestPotions() {
  const starterSpecs = [
    ["cons_minor_healing_potion", 2],
    ["cons_greater_healing_potion", 1],
    ["cons_minor_mana_potion", 2],
    ["cons_antidote_potion", 1],
  ];
  state.inventoryPotions = [];
  for (const [id, qty] of starterSpecs) {
    if (state.itemsById[id]) state.inventoryPotions.push({ id, qty });
  }
  if (!state.inventoryPotions.length && state.potions.length) {
    state.inventoryPotions = state.potions.slice(0, 3).map((p, idx) => ({ id: p.id, qty: idx === 0 ? 2 : 1 }));
  }
}

function buildPartyFromSquad() {
  const hpFrac = [1.0, 0.72, 0.44, 0.2][state.heroHpTier - 1] ?? 1.0;
  state.party = state.squadIds.map((hid) => {
    const base = HERO_BASE[hid];
    const wpn = findBestWeaponForHero(hid, base.defWeapon);
    const subType = wpn?.subType || base.allowedWeapons?.[0] || "Longsword";
    const modes = WEAPON_ATTACK_MODES[subType] || WEAPON_ATTACK_MODES.Longsword;
    return {
      id: hid,
      name: base.name,
      role: base.role,
      hp: Math.round(base.maxHp * hpFrac),
      maxHp: base.maxHp,
      mp: base.maxMp,
      maxMp: base.maxMp,
      atk: base.atk,
      mag: base.mag,
      guard: 0,
      weaponName: wpn?.name || subType,
      weaponSubType: subType,
      weaponDamageType: wpn?.damageType || "Slashing",
      weaponIcon: wpn?.iconPath || "assets/icons/ui/ui_01_weapon_slot_glyph.webp",
      attackModes: modes,
    };
  });
  state.activeHeroTurn = 0;
  armDefaultActionForActiveHero();
}

function syncWeaponDropdownForActiveHero() {
  const hero = getActiveHero();
  if (!hero || !selHeroWeapon) return;
  const allowed = HERO_BASE[hero.id]?.allowedWeapons || [hero.weaponSubType];
  selHeroWeapon.innerHTML = allowed
    .map((wt) => `<option value="${esc(wt)}" ${wt === hero.weaponSubType ? "selected" : ""}>${esc(hero.name)}: ${esc(wt)}</option>`)
    .join("");
}

function findBestWeaponForHero(heroId, preferredId) {
  if (state.itemsById[preferredId]) return state.itemsById[preferredId];
  return Object.values(state.itemsById).find(
    (it) => it.category === "weapon" && Array.isArray(it.usableBy) && it.usableBy.includes(heroId)
  );
}

function getActiveHero() {
  return state.party[state.activeHeroTurn] || state.party[0];
}

function pickVfxKey(damageType = "", target = "", name = "", isHeavy = false) {
  const dt = damageType.toLowerCase();
  const tg = target.toLowerCase();
  const nm = name.toLowerCase();

  if (nm.includes("reviv") || nm.includes("phoenix") || nm.includes("undying")) return "revive";
  if (nm.includes("cleanse") || nm.includes("antidote") || nm.includes("smelling") || nm.includes("panacea")) return "cleanse";
  if (nm.includes("mana") || dt === "arcane") return "mana";
  if (nm.includes("ward") || nm.includes("aegis") || nm.includes("veil") || nm.includes("sanctuary")) return "ward";
  if (dt.includes("restor") || nm.includes("heal") || nm.includes("mend") || nm.includes("balm") || nm.includes("poultice") || nm.includes("salve") || nm.includes("elixir") || nm.includes("bloom") || nm.includes("rain")) {
    return tg.includes("all") ? "heal_aoe" : "heal_single";
  }
  if (dt.includes("nature")) {
    return nm.includes("thorn") || nm.includes("briar") || nm.includes("vine") || nm.includes("snare") ? "nature_vine" : "buff";
  }
  if (dt.includes("fire")) return tg.includes("all") || tg.includes("splash") || nm.includes("meteor") || nm.includes("fireball") || nm.includes("wall") ? "fire_aoe" : "fire_single";
  if (dt.includes("frost")) return tg.includes("all") || nm.includes("blizzard") || nm.includes("prison") ? "frost_aoe" : "frost_single";
  if (dt.includes("lightning")) return "lightning";
  if (dt.includes("poison")) return nm.includes("spore") || nm.includes("cloud") || nm.includes("mist") ? "poison_spore" : "poison_acid";
  if (dt.includes("shadow")) return tg.includes("all") || nm.includes("eclipse") || nm.includes("void") ? "shadow_aoe" : "shadow_single";
  if (dt.includes("radiant")) return "radiant";
  if (dt.includes("bludge")) return isHeavy ? "bludgeoning_heavy" : "bludgeoning_fast";
  if (dt.includes("pierc")) {
    if (nm.includes("arrow") || nm.includes("bolt") || nm.includes("crank") || nm.includes("volley") || nm.includes("snap")) {
      return isHeavy || nm.includes("volley") ? "arrow_volley" : "arrow_single";
    }
    return "piercing_melee";
  }
  if (dt.includes("slash")) return isHeavy ? "slashing_heavy" : nm.includes("whirl") || nm.includes("twin") ? "slashing_twin" : "slashing_fast";
  return "slashing_fast";
}

const HERO_MAGIC_THEMES = {
  ellowyn: {
    label: "Arcane Seal",
    themeClass: "theme-ellowyn",
    tierNames: [
      "Initiate Sparks",
      "Stormfire Adept",
      "Sovereign Ward",
      "High Conduit",
      "Halo & Tempest",
      "Solar & Void",
      "Queen's Verdict",
      "Astral Cataclysm",
    ],
  },
  mera: {
    label: "Druidic Totem",
    themeClass: "theme-mera",
    tierNames: [
      "Briar Awakening",
      "Spore & Gale",
      "Stone & Brambles",
      "Earth & Talon",
      "Grove Tempest",
      "Sunbeam Stag",
      "Elder Fang",
      "Primal Heart",
    ],
  },
  harlan: {
    label: "Alchemical Tier",
    themeClass: "theme-harlan",
    tierNames: [
      "Field Satchel",
      "Woodland Brewhouse",
      "Combat Tinctures",
      "Purge & Acid",
      "Mist & Elixir",
      "Master Alembic",
      "Phoenix Panacea",
      "Grand Opus",
    ],
  },
};

function resolveWeaponSkillIcon(skillId, hero) {
  const custom = state.weaponSkillManifest?.cards?.[skillId];
  if (custom) return custom;
  return hero.weaponIcon || "assets/icons/spells/ability_res_blade_strike.webp";
}

function resolveMagicTierIcon(heroId, tierNum, armedSpellIcon, fallbackSpellIcon) {
  const id = `tier_${heroId}_${tierNum}`;
  const custom = state.magicTierManifest?.cards?.[id];
  if (custom) return custom;
  return armedSpellIcon || fallbackSpellIcon || "assets/icons/spells/ability_res_guard_stance.webp";
}

function buildSpellActionFromEntry(s) {
  const tg = (s.target || "").toLowerCase();
  const isAlly = tg.includes("ally") || tg.includes("allies");
  const isAll = tg.includes("all ") || tg.includes("splash");
  return {
    group: "spell",
    type: "spell",
    id: s.id,
    name: s.name,
    region: Number(s.region || 1),
    subType: s.subType || `Tier ${s.region || 1} Spell`,
    categoryLabel: `${s.subType || `Tier ${s.region || 1} Spell`} · ${s.damageType}`,
    badge: `${s.mpCost} MP`,
    badgeClass: "mp",
    sub: `${s.mpCost} MP · ${s.damageType} · ${s.target} — ${s.effect}`,
    effect: s.effect,
    targetLabel: s.target || (isAlly ? "Ally" : "1 Enemy"),
    costLabel: `${s.mpCost} MP`,
    icon: s.iconPath,
    mpCost: Number(s.mpCost || 0),
    targetScope: isAlly ? (isAll ? "all_allies" : "ally") : isAll ? "all_enemies" : "enemy",
    damageType: s.damageType,
    power: 1.15 + Number(s.step || 1) * 0.12,
    vfxKey: pickVfxKey(s.damageType, s.target, s.name, s.step >= 4),
  };
}

function flattenHotbarActions(slots) {
  const list = [];
  for (const s of slots) {
    if (s.type === "tier_folder") list.push(...(s.spells || []));
    else list.push(s);
  }
  return list;
}

function buildDynamicHotbarSlots(hero) {
  if (!hero) return [];
  const slots = [];

  // 1. Two 0-MP Weapon Attack Mode slots for the equipped weapon category
  const modes = Array.isArray(hero.attackModes) ? hero.attackModes : WEAPON_ATTACK_MODES.Longsword;
  modes.forEach((mode, idx) => {
    const isHeavy = idx === 1;
    slots.push({
      group: "weapon",
      type: "attack",
      id: mode.id,
      name: mode.name,
      categoryLabel: `${hero.weaponSubType} · ${mode.tag} Attack`,
      badge: mode.tag,
      badgeClass: "atk-kind",
      sub: `${hero.weaponSubType} · ${hero.weaponDamageType} · 0 MP — ${mode.effect}`,
      effect: mode.effect,
      targetLabel: "1 Enemy",
      costLabel: "0 MP",
      icon: resolveWeaponSkillIcon(mode.id, hero),
      mpCost: 0,
      targetScope: "enemy",
      damageType: hero.weaponDamageType,
      power: mode.power,
      critBonus: Number(mode.critBonus || 0),
      execCritBonus: Number(mode.execCritBonus || 0),
      armorIgnore: Number(mode.armorIgnore || 0),
      vfxKey: pickVfxKey(hero.weaponDamageType, "1 Enemy", mode.name, isHeavy),
    });
  });

  // 2. Up to 8 Class-Themed Magic Tier buttons (Casters learn 2 of 3 spells per Region Tier)
  if (state.maxSpellTier > 0) {
    const heroSpells = state.spells.filter((s) => Array.isArray(s.usableBy) && s.usableBy.includes(hero.id));
    if (heroSpells.length > 0) {
      const theme = HERO_MAGIC_THEMES[hero.id] || {
        label: "Magic Tier",
        themeClass: "",
        tierNames: [],
      };
      for (let tier = 1; tier <= state.maxSpellTier; tier++) {
        const tierCatalog = heroSpells.filter((s) => Number(s.region || 0) === tier);
        // 2/3 per Region rule: active battle slot carries 2 chosen spells per Tier
        const learnedSpells = tierCatalog.slice(0, 2).map(buildSpellActionFromEntry);
        if (!learnedSpells.length) continue;

        const minMp = Math.min(...learnedSpells.map((x) => x.mpCost));
        const maxMp = Math.max(...learnedSpells.map((x) => x.mpCost));
        const elements = Array.from(new Set(learnedSpells.map((x) => x.damageType))).join(" / ");
        const tierTitle = theme.tierNames[tier - 1] || `Tier ${tier}`;
        const armedHere = state.armedAction?.type === "spell" && Number(state.armedAction.region) === tier;

        slots.push({
          group: "tier",
          type: "tier_folder",
          id: `tier_slot_${hero.id}_${tier}`,
          tierNum: tier,
          themeClass: theme.themeClass,
          themeLabel: theme.label,
          name: `Tier ${tier} — ${tierTitle}`,
          categoryLabel: `${theme.label} · Region ${tier} (${learnedSpells.length}/${tierCatalog.length} Spells)`,
          badge: `T${tier}`,
          badgeClass: "tier-num",
          effect: `Spells: ${learnedSpells.map((x) => `${x.name} (${x.mpCost} MP)`).join("  ·  ")}`,
          sub: `${theme.label} T${tier} · ${learnedSpells.map((x) => x.name).join(" / ")}`,
          targetLabel: `${learnedSpells.length}/3 Learned`,
          costLabel: minMp === maxMp ? `${minMp} MP` : `${minMp}–${maxMp} MP`,
          damageType: elements,
          icon: resolveMagicTierIcon(
            hero.id,
            tier,
            armedHere ? state.armedAction.icon : null,
            learnedSpells[0]?.icon
          ),
          mpCost: minMp,
          spells: learnedSpells,
          isArmedTier: armedHere,
        });
      }
    }
  }

  // 3. Owned Potions (only qty > 0 appear — using the last potion removes the slot!)
  for (const inv of state.inventoryPotions) {
    if (!inv || inv.qty <= 0) continue;
    const item = state.itemsById[inv.id];
    if (!item) continue;
    const eff = item.effect || "";
    const isAll = /\ball\s+(allies|party)\b/i.test(eff);
    const numMatch = eff.replace(/,/g, "").match(/(\d+)\s*(hp|mp)/i);
    const parsedHp = numMatch && numMatch[2].toLowerCase() === "hp" ? Number(numMatch[1]) : 0;
    const parsedMp = numMatch && numMatch[2].toLowerCase() === "mp" ? Number(numMatch[1]) : 0;
    slots.push({
      group: "potion",
      type: "item",
      id: item.id,
      name: item.name,
      categoryLabel: "Belt Consumable",
      qty: inv.qty,
      badge: `×${inv.qty}`,
      badgeClass: "qty",
      sub: `Belt (×${inv.qty}) · ${eff || "Consumable Item"}`,
      effect: eff || "Restorative potion from party belt.",
      targetLabel: isAll ? "All Allies" : "1 Ally",
      costLabel: `${inv.qty} in Bag`,
      icon: item.iconPath,
      mpCost: 0,
      targetScope: isAll ? "all_allies" : "ally",
      damageType: "Restorative",
      healHp: parsedHp,
      restoreMp: parsedMp,
      vfxKey: pickVfxKey("Restorative", eff, item.name, false),
    });
  }

  // 4. Core Guard Stance slot (always available)
  slots.push({
    group: "guard",
    type: "guard",
    id: "guard_stance",
    name: "Guard Stance",
    categoryLabel: "Core Defense Action",
    badge: "+1",
    badgeClass: "guard",
    sub: "Brace Defense · +1 Guard Pips",
    effect: "Halves incoming damage this turn, blocks turn pushback, and boosts your next Attack or Spell by +25%.",
    targetLabel: "Self",
    costLabel: "0 MP · Instant",
    icon: "assets/icons/spells/ability_res_guard_stance.webp",
    mpCost: 0,
    targetScope: "self",
    damageType: "Defense",
    isGuard: true,
    vfxKey: "guard",
  });

  slots.forEach((slot, i) => {
    slot.hotkey = i < 9 ? String(i + 1) : "";
  });
  return slots;
}

function armDefaultActionForActiveHero() {
  const hero = getActiveHero();
  if (!hero) return;
  const actions = flattenHotbarActions(buildDynamicHotbarSlots(hero));
  const stillValid = state.armedAction && actions.find((a) => a.id === state.armedAction.id && a.mpCost <= hero.mp);
  state.armedAction = stillValid || actions.find((a) => a.type === "attack") || actions[0] || null;
}

function getNativeMobsForStage(stage) {
  if (!stage) return [];
  const list = [];
  for (const nm of stage.spawnNames || []) {
    const mob = findMobByName(nm);
    if (mob) list.push(mob);
  }
  return list;
}

function packEncounterIntoGrid(encounter, cols, rows) {
  const grid = Array.from({ length: rows }, () => Array(cols).fill(false));
  const placements = [];

  const fitsAt = (r0, c0, gw, gh) => {
    if (r0 < 0 || c0 < 0 || r0 + gh > rows || c0 + gw > cols) return false;
    for (let r = r0; r < r0 + gh; r++) {
      for (let c = c0; c < c0 + gw; c++) {
        if (grid[r][c]) return false;
      }
    }
    return true;
  };

  const occupy = (r0, c0, gw, gh) => {
    for (let r = r0; r < r0 + gh; r++) {
      for (let c = c0; c < c0 + gw; c++) grid[r][c] = true;
    }
  };

  const items = [...encounter]
    .map((inst) => ({ inst, mob: getMob(inst.mobId) }))
    .filter((x) => x.mob);

  // Preserve valid coordinates on surviving mobs so allies stay planted in place when another dies
  const unplaced = [];
  for (const entry of items) {
    const { inst, mob } = entry;
    const gw = Math.min(cols, Math.max(1, Number(mob.gridW || 1)));
    const gh = Math.min(rows, Math.max(1, Number(mob.gridH || 1)));
    if (Number.isInteger(inst.r0) && Number.isInteger(inst.c0) && fitsAt(inst.r0, inst.c0, gw, gh)) {
      occupy(inst.r0, inst.c0, gw, gh);
      placements.push({ inst, mob, r0: inst.r0, c0: inst.c0, gw, gh });
    } else {
      unplaced.push(entry);
    }
  }

  unplaced.sort((a, b) => b.mob.gridW * b.mob.gridH - a.mob.gridW * a.mob.gridH);

  for (const { inst, mob } of unplaced) {
    const gw = Math.min(cols, Math.max(1, Number(mob.gridW || 1)));
    const gh = Math.min(rows, Math.max(1, Number(mob.gridH || 1)));
    let placed = false;

    for (let c0 = 0; c0 <= cols - gw; c0++) {
      for (let r0 = 0; r0 <= rows - gh; r0++) {
        if (fitsAt(r0, c0, gw, gh)) {
          occupy(r0, c0, gw, gh);
          inst.r0 = r0;
          inst.c0 = c0;
          placements.push({ inst, mob, r0, c0, gw, gh });
          placed = true;
          break;
        }
      }
      if (placed) break;
    }

    if (!placed) {
      placements.push({ inst, mob, r0: 0, c0: 0, gw, gh, overflow: true });
    }
  }
  return placements;
}

function createEnemyInstance(mob) {
  const baseHp = Math.max(40, Number(mob.hp || 80));
  return {
    instanceId: `inst_${nextInstanceSeq++}`,
    mobId: mob.id,
    hp: baseHp,
    maxHp: baseHp,
  };
}

function rollBiomeEncounter(stage) {
  const natives = getNativeMobsForStage(stage);
  state.encounter = [];
  if (!natives.length) return;

  const boss = natives.find((m) => m.isBoss);
  if (boss) {
    state.encounter.push(createEnemyInstance(boss));
    state.selectedMobId = boss.id;
    state.selectedInstanceId = state.encounter[0].instanceId;
    return;
  }

  const eg = stage.enemyGrid;
  const maxCells = eg.cols * eg.rows;
  const targetCount = Math.min(4, Math.max(2, Math.floor(Math.random() * 3) + 2));
  let usedCells = 0;

  for (let i = 0; i < targetCount; i++) {
    const pick = natives[Math.floor(Math.random() * natives.length)];
    const cells = pick.gridW * pick.gridH;
    if (usedCells + cells > maxCells && state.encounter.length > 0) continue;
    usedCells += cells;
    state.encounter.push(createEnemyInstance(pick));
  }
  if (state.encounter[0]) {
    state.selectedMobId = state.encounter[0].mobId;
    state.selectedInstanceId = state.encounter[0].instanceId;
  }
}

function addMobToEncounter(mobId) {
  const stage = getStage();
  const mob = getMob(mobId);
  if (!stage || !mob) return;
  const candidate = createEnemyInstance(mob);
  const testPack = packEncounterIntoGrid([...state.encounter, candidate], stage.enemyGrid.cols, stage.enemyGrid.rows);
  if (testPack.some((p) => p.overflow)) {
    showToast(`Not enough free cells for ${mob.name} (${mob.gridW}×${mob.gridH}). Increase grid or remove a mob.`);
    return;
  }
  state.encounter.push(candidate);
  state.selectedMobId = mobId;
  state.selectedInstanceId = candidate.instanceId;
  renderArena();
  renderInspector();
}

// --- VFX Frame Player & Damage Numbers ---
function preloadVfxFrames(spec) {
  const promises = [];
  for (let f = 1; f <= spec.frames; f++) {
    const url = `/repo-assets/vfx/slices/${spec.folder}/row${spec.row}_f${f}.webp`;
    if (!vfxCache.has(url)) {
      const p = new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(url);
        img.onerror = () => resolve(null);
        img.src = url;
      });
      vfxCache.set(url, p);
    }
    promises.push(vfxCache.get(url));
  }
  return Promise.all(promises);
}

function getRenderedImageBox(img, fallbackEl) {
  const target = img || fallbackEl;
  const r = target.getBoundingClientRect();
  if (!img || !img.naturalWidth || !img.naturalHeight || fallbackEl.classList.contains("hero-card-unit")) {
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  }
  const natRatio = img.naturalWidth / img.naturalHeight;
  const boxRatio = r.width / Math.max(1, r.height);
  if (natRatio > boxRatio) {
    const drawW = r.width;
    const drawH = drawW / natRatio;
    return { left: r.left, top: r.bottom - drawH, width: drawW, height: drawH };
  }
  const drawH = r.height;
  const drawW = drawH * natRatio;
  return { left: r.left + (r.width - drawW) / 2, top: r.top, width: drawW, height: drawH };
}

function getCenterInViewportPct(el) {
  const vpRect = elStageViewport.getBoundingClientRect();
  const isHeroCard = el.classList.contains("hero-card-unit");
  const targetImg = el.querySelector("img");
  const box = getRenderedImageBox(targetImg, el);
  const xPct = ((box.left + box.width / 2 - vpRect.left) / vpRect.width) * 100;
  const yPct = ((box.top + box.height / 2 - vpRect.top) / vpRect.height) * 100;
  const sizePx = isHeroCard
    ? Math.max(60, Math.min(92, box.height * 1.45))
    : Math.max(88, Math.min(220, Math.min(box.width, box.height) * 0.96));
  return { xPct, yPct, sizePx, box, vpRect, targetImg };
}

function renderTargetTintOverlay(targetEl, targetImg, box, vpRect, colorHex, totalMs) {
  if (!targetImg || !targetImg.complete || !targetImg.naturalWidth || box.width < 4 || box.height < 4) {
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.className = "vfx-tint-canvas";
  const w = Math.max(1, Math.round(box.width));
  const h = Math.max(1, Math.round(box.height));
  canvas.width = w;
  canvas.height = h;
  canvas.style.left = `${((box.left - vpRect.left) / vpRect.width) * 100}%`;
  canvas.style.top = `${((box.top - vpRect.top) / vpRect.height) * 100}%`;
  canvas.style.width = `${(box.width / vpRect.width) * 100}%`;
  canvas.style.height = `${(box.height / vpRect.height) * 100}%`;
  elVfxLayer.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  const mirrored = targetEl.classList.contains("face-right");
  const start = performance.now();

  const drawFrame = (now) => {
    const t = Math.min(1, (now - start) / totalMs);
    const pulse = Math.sin(Math.PI * Math.pow(t, 0.7)) * 0.68;
    ctx.clearRect(0, 0, w, h);

    if (pulse > 0.01) {
      ctx.save();
      if (mirrored) {
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
      }
      // Silhouette color-shift matching vfx-test bench without blurring or moving the sprite
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.drawImage(targetImg, 0, 0, w, h);

      ctx.globalCompositeOperation = "color";
      ctx.globalAlpha = Math.min(1, pulse * 1.15);
      ctx.fillStyle = colorHex;
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = "source-atop";
      ctx.globalAlpha = pulse * 0.45;
      ctx.fillStyle = colorHex;
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = "destination-in";
      ctx.globalAlpha = 1;
      ctx.drawImage(targetImg, 0, 0, w, h);
      ctx.restore();

      canvas.style.opacity = String(Math.min(1, pulse * 1.15));
    }

    if (t < 1 && canvas.isConnected) {
      requestAnimationFrame(drawFrame);
    } else {
      canvas.remove();
    }
  };
  requestAnimationFrame(drawFrame);
  return canvas;
}

function spawnFloatingNumber(xPct, yPct, text, cssClass) {
  const div = document.createElement("div");
  div.className = `floating-dmg ${cssClass}`;
  div.style.left = `${xPct}%`;
  div.style.top = `${yPct}%`;
  div.textContent = text;
  elVfxLayer.appendChild(div);
  setTimeout(() => div.remove(), 950);
}

async function playVfxAtTarget(targetEl, vfxKey, floatText, floatClass) {
  if (!targetEl) return;
  const spec = VFX_MAP[vfxKey] || VFX_MAP.slashing_fast;
  const urls = (await preloadVfxFrames(spec)).filter(Boolean);
  const pos = getCenterInViewportPct(targetEl);
  const frameMs = 85;
  const totalMs = Math.max(420, urls.length * frameMs);

  if (spec.shake && !targetEl.classList.contains("hero-card-unit")) {
    elStageViewport.classList.remove("arena-shake");
    void elStageViewport.offsetWidth;
    elStageViewport.classList.add("arena-shake");
  }

  const tintCanvas = renderTargetTintOverlay(targetEl, pos.targetImg, pos.box, pos.vpRect, spec.color, totalMs);

  const img = document.createElement("img");
  img.className = "vfx-burst-sprite";
  img.style.left = `${pos.xPct}%`;
  img.style.top = `${pos.yPct}%`;
  img.style.width = `${pos.sizePx}px`;
  img.style.height = `${pos.sizePx}px`;
  elVfxLayer.appendChild(img);

  if (floatText) {
    setTimeout(() => spawnFloatingNumber(pos.xPct, pos.yPct - 4, floatText, floatClass), 90);
  }

  for (let i = 0; i < urls.length; i++) {
    img.src = urls[i];
    await waitMs(frameMs);
  }
  img.remove();
  if (tintCanvas && tintCanvas.isConnected) tintCanvas.remove();
}

function computeDamageOnEnemy(hero, action, inst, mob) {
  const baseStat = action.type === "spell" ? Math.max(24, hero.mag) : Math.max(22, hero.atk);
  const scaleFactor = Math.max(1, (mob.maxHp || 100) / 140);
  const mult = Number(action.power || 1.0) * (1 + Number(action.armorIgnore || 0) * 0.25);
  const isLowHpFoe = inst.hp / Math.max(1, inst.maxHp || mob.maxHp || 100) < 0.5;
  const critChance = Math.min(
    0.85,
    0.18 + Number(action.critBonus || 0) + (isLowHpFoe ? Number(action.execCritBonus || 0) : 0)
  );
  const isWeak = (mob.weak || "").toLowerCase().includes((action.damageType || "").toLowerCase());
  const isCrit = Math.random() < critChance;
  let dmg = Math.round((baseStat * 2.2 + scaleFactor * 14) * mult * (0.92 + Math.random() * 0.16));
  if (isWeak) dmg = Math.round(dmg * 1.5);
  if (isCrit) dmg = Math.round(dmg * 1.5);
  return { dmg, isWeak, isCrit };
}

const waitMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function setBusy(flag) {
  state.isAnimating = Boolean(flag);
  if (elStageViewport) elStageViewport.classList.toggle("is-busy", state.isAnimating);
}

async function finishHeroTurnAfterBeat(heroCardEl) {
  if (heroCardEl) heroCardEl.classList.remove("is-attacking");

  const prevCount = state.encounter.length;
  state.encounter = state.encounter.filter((e) => e.hp > 0);
  if (prevCount > 0 && state.encounter.length === 0) {
    showToast("Victory! All enemies defeated — click Roll Pack for another wave.");
  }

  // Update battlefield state (killed mobs removed / HP bars updated) while holding current hero focus for 1s
  renderArena();
  renderInspector();
  await waitMs(1000);

  state.activeHeroTurn = (state.activeHeroTurn + 1) % state.party.length;
  armDefaultActionForActiveHero();
  setBusy(false);
  renderArena();
}

async function executePlayerActionOnTarget(targetInstId = null, targetHeroIdx = null) {
  if (state.isAnimating) return;
  const hero = getActiveHero();
  const action = state.armedAction;
  if (!hero || !action) return;

  if (action.mpCost > 0 && hero.mp < action.mpCost) {
    showToast(`${hero.name} doesn't have enough MP (${action.mpCost} MP required).`);
    return;
  }

  setBusy(true);
  if (action.mpCost > 0) hero.mp = Math.max(0, hero.mp - action.mpCost);
  if (action.type === "item") {
    const inv = state.inventoryPotions.find((p) => p.id === action.id);
    if (inv && inv.qty > 0) inv.qty -= 1;
  }

  // Only lunge the active hero card forward when striking enemies (keep panels steady on ally heals/buffs)
  const heroCardEl = elHeroSlotsLayer.querySelector(`[data-hidx="${state.activeHeroTurn}"]`);
  const isOffensive = action.targetScope === "enemy" || action.targetScope === "all_enemies";
  if (heroCardEl && isOffensive) heroCardEl.classList.add("is-attacking");

  const jobs = [];
  if (action.targetScope === "enemy") {
    const alive = state.encounter.filter((e) => e.hp > 0);
    const chosen = alive.find((e) => e.instanceId === targetInstId) || alive[0];
    if (chosen) {
      const mob = getMob(chosen.mobId);
      const { dmg, isWeak, isCrit } = computeDamageOnEnemy(hero, action, chosen, mob);
      chosen.hp = Math.max(0, chosen.hp - dmg);
      const targetEl = elEnemySpritesLayer.querySelector(`[data-inst="${chosen.instanceId}"]`);
      const label = isWeak ? `WEAK! -${dmg}` : isCrit ? `CRIT! -${dmg}` : `-${dmg}`;
      jobs.push(playVfxAtTarget(targetEl, action.vfxKey, label, isCrit || isWeak ? "crit" : "damage"));
    }
  } else if (action.targetScope === "all_enemies") {
    const targets = state.encounter.filter((e) => e.hp > 0);
    for (const chosen of targets) {
      const mob = getMob(chosen.mobId);
      const { dmg, isWeak, isCrit } = computeDamageOnEnemy(hero, action, chosen, mob);
      chosen.hp = Math.max(0, chosen.hp - dmg);
      const targetEl = elEnemySpritesLayer.querySelector(`[data-inst="${chosen.instanceId}"]`);
      const label = isWeak ? `WEAK! -${dmg}` : `-${dmg}`;
      jobs.push(playVfxAtTarget(targetEl, action.vfxKey, label, isCrit || isWeak ? "crit" : "damage"));
    }
  } else if (action.targetScope === "ally" || action.targetScope === "all_allies") {
    const applyToAlly = (ally, idx) => {
      const targetHeroEl = elHeroSlotsLayer.querySelector(`[data-hidx="${idx}"]`);
      let txt = "WARD!";
      let cls = "buff";
      if (action.restoreMp > 0) {
        ally.mp = Math.min(ally.maxMp, ally.mp + action.restoreMp);
        txt = ally.maxMp > 0 ? `+${action.restoreMp} MP` : "NO MP POOL";
        cls = "mana";
      } else if (/cures?\s/i.test(action.effect || "") && action.healHp <= 0) {
        txt = "CURED!";
        cls = "buff";
      } else if (action.healHp > 0 || (action.damageType || "").toLowerCase().includes("restor")) {
        const heal = action.healHp || Math.round(95 * (action.power || 1));
        ally.hp = Math.min(ally.maxHp, ally.hp + heal);
        txt = `+${heal} HP`;
        cls = "heal";
      }
      return playVfxAtTarget(targetHeroEl, action.vfxKey, txt, cls);
    };

    if (action.targetScope === "ally") {
      const idx = targetHeroIdx !== null ? targetHeroIdx : state.activeHeroTurn;
      const ally = state.party[idx] || hero;
      jobs.push(applyToAlly(ally, idx));
    } else {
      state.party.forEach((ally, idx) => {
        jobs.push(applyToAlly(ally, idx));
      });
    }
  }

  await Promise.all(jobs);
  await finishHeroTurnAfterBeat(heroCardEl);
}

async function executeGuardAction() {
  if (state.isAnimating) return;
  const hero = getActiveHero();
  if (!hero) return;
  setBusy(true);
  hero.guard = Math.min(3, hero.guard + 1);
  const heroCardEl = elHeroSlotsLayer.querySelector(`[data-hidx="${state.activeHeroTurn}"]`);
  await playVfxAtTarget(heroCardEl, "guard", "GUARD +1", "buff");
  await finishHeroTurnAfterBeat(heroCardEl);
}

async function executeEnemyTurn() {
  if (state.isAnimating) return;
  const aliveMobs = state.encounter.filter((e) => e.hp > 0);
  if (!aliveMobs.length) {
    rollBiomeEncounter(getStage());
    renderArena();
    return;
  }
  setBusy(true);
  const stage = getStage();

  for (let i = 0; i < aliveMobs.length; i++) {
    const foe = aliveMobs[i];
    const mob = getMob(foe.mobId);
    const foeEl = elEnemySpritesLayer.querySelector(`[data-inst="${foe.instanceId}"]`);
    const targetIdx = Math.floor(Math.random() * state.party.length);
    const victim = state.party[targetIdx];
    const dmg = Math.max(14, Math.round(victim.maxHp * (0.14 + Math.random() * 0.14)));
    victim.hp = Math.max(1, victim.hp - dmg);
    const vfxKey = mob.role === "Caster" ? "shadow_single" : mob.role === "Beast" ? "slashing_bleed" : "slashing_heavy";

    if (elActionBanner) elActionBanner.textContent = `${mob.name} attacks ${victim.name}!`;
    if (foeEl) foeEl.classList.add("is-enemy-lunging");
    await waitMs(260);

    const heroCardEl = elHeroSlotsLayer.querySelector(`[data-hidx="${targetIdx}"]`);
    await playVfxAtTarget(heroCardEl, vfxKey, `-${dmg}`, "damage");
    if (foeEl) foeEl.classList.remove("is-enemy-lunging");

    renderRightArenaHeroes(stage);
    await waitMs(i < aliveMobs.length - 1 ? 650 : 500);
  }

  setBusy(false);
  renderArena();
}

// --- Rendering ---
function renderStageSidebar() {
  const q = state.stageSearch.trim().toLowerCase();
  const filtered = state.config.stages.filter((s) => {
    if (state.stageFilter === "biomes" && s.isPortal) return false;
    if (state.stageFilter === "portals" && !s.isPortal) return false;
    if (!q) return true;
    return `${s.name} ${s.zones} ${(s.spawnNames || []).join(" ")}`.toLowerCase().includes(q);
  });

  elStageList.innerHTML = filtered
    .map(
      (s) => `
      <button type="button" class="stage-item ${s.id === state.selectedStageId ? "active" : ""}" data-sid="${s.id}">
        <img src="/${esc(s.imagePath)}" alt="" loading="lazy" />
        <div class="stage-item-meta">
          <div class="stage-item-name">${s.order}. ${esc(s.name)}</div>
          <div class="stage-item-sub">${(s.spawnNames || []).length} native spawns · ${s.enemyGrid.cols}×${s.enemyGrid.rows}</div>
        </div>
      </button>
    `
    )
    .join("");

  elStageList.querySelectorAll(".stage-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.selectedStageId = btn.dataset.sid;
      rollBiomeEncounter(getStage());
      renderAll();
    });
  });
}

function getUnlockedHeroPerks(heroId) {
  const count = Math.max(0, Math.min(10, Number(state.perkCount || 0)));
  if (count === 0) return [];
  const tiers = state.disciplinesByHero?.[heroId] || [];
  return tiers.slice(0, count).map((t, idx) => {
    // Alternate A/B choices for realistic Body/Mind/Spirit mix in preview
    const chosen = idx % 2 === 0 ? t.optionA : t.optionB || t.optionA;
    return {
      ...chosen,
      reqLevel: t.level,
    };
  });
}

function showPerkTooltip(perkEl, hero, perk) {
  if (!elPerkTooltip || !perkEl || !hero || !perk || state.viewMode !== "player") return;
  const pillarName = (perk.pillar || "mind").replace(/^./, (c) => c.toUpperCase());
  elPerkTooltip.innerHTML = `
    <div class="hb-tt-head">
      <img src="/${esc(perk.iconPath)}" alt="" />
      <div class="hb-tt-title-wrap">
        <div class="hb-tt-name">${esc(perk.name)}</div>
        <div class="hb-tt-kind">${esc(hero.name)} · Lv ${perk.reqLevel || 1} Discipline</div>
      </div>
    </div>
    <div class="hb-tt-pills">
      <span class="hb-tt-pill mp">${esc(pillarName)}</span>
      <span class="hb-tt-pill">${esc(perk.tag || "Passive")}</span>
    </div>
    <p class="hb-tt-effect">${esc(perk.effect || "")}</p>
  `;
  elPerkTooltip.classList.remove("hidden");

  const vpRect = elStageViewport.getBoundingClientRect();
  const cardEl = perkEl.closest(".hero-card-unit") || perkEl;
  const cardRect = cardEl.getBoundingClientRect();
  const perkRect = perkEl.getBoundingClientRect();
  const ttRect = elPerkTooltip.getBoundingClientRect();

  let leftPx = cardRect.left - vpRect.left - ttRect.width - 10;
  if (leftPx < 8) {
    leftPx = Math.max(8, Math.min(vpRect.width - ttRect.width - 8, perkRect.left - vpRect.left - ttRect.width / 2));
  }
  const rawTop = perkRect.top - vpRect.top + perkRect.height / 2 - ttRect.height / 2;
  const topPx = Math.max(46, Math.min(vpRect.height - ttRect.height - 10, rawTop));
  elPerkTooltip.style.left = `${leftPx}px`;
  elPerkTooltip.style.top = `${topPx}px`;
}

function hidePerkTooltip() {
  if (elPerkTooltip) elPerkTooltip.classList.add("hidden");
}

function renderRightArenaHeroes(stage) {
  const hz = stage.heroZone;
  elHeroZoneBox.style.left = `${hz.xPct}%`;
  elHeroZoneBox.style.top = `${hz.yPct}%`;
  elHeroZoneBox.style.width = `${hz.wPct}%`;
  elHeroZoneBox.style.height = `${hz.hPct}%`;

  const stagger = Number(hz.staggerPct ?? 0);
  const scale = Number(hz.frontScale ?? 1.0);
  const isAllyTarget = state.viewMode === "player" && state.armedAction?.targetScope === "ally";
  const perksMap = new Map();

  elHeroSlotsLayer.innerHTML = state.party
    .map((hero, idx) => {
      const hpRatio = hero.hp / Math.max(1, hero.maxHp);
      const hpPct = Math.round(hpRatio * 100);
      const mpPct = hero.maxMp > 0 ? Math.round((hero.mp / hero.maxMp) * 100) : 0;
      const tierCls = hpRatio < 0.25 ? "critical" : hpRatio < 0.5 ? "bloodied" : hpRatio < 0.75 ? "bruised" : "";
      const isActive = idx === state.activeHeroTurn;
      const indent = idx * stagger;
      const rightLabel = `${hero.guard > 0 ? `🛡${hero.guard} · ` : ""}${hero.role}`;
      const unlockedPerks = getUnlockedHeroPerks(hero.id);
      perksMap.set(hero.id, unlockedPerks);

      const perksTrayHtml = unlockedPerks.length
        ? `<div class="hero-perks-tray" aria-label="Unlocked Discipline Perks">
            ${unlockedPerks
              .map(
                (pk, pIdx) => `
              <span
                class="hero-perk-icon pillar-${esc(pk.pillar || "mind")}"
                data-perk-hero="${esc(hero.id)}"
                data-perk-idx="${pIdx}"
                tabindex="0"
              >
                <img src="/${esc(pk.iconPath)}" alt="${esc(pk.name)}" />
              </span>`
              )
              .join("")}
          </div>`
        : "";

      return `
        <div class="hero-card-unit ${tierCls} ${isActive ? "is-active" : ""} ${isAllyTarget ? "is-ally-target" : ""}" data-hidx="${idx}" style="margin-right:${indent}%;transform-origin:right center;${scale !== 1 ? `scale:${scale};` : ""}">
          ${isActive ? `<span class="hero-turn-arrow" aria-hidden="true">&#x25B6;</span>` : ""}
          <img src="/assets/portraits/heroes/${hero.id}_avatar.webp" alt="${hero.name}" />
          <div class="hero-card-info">
            <div class="hero-vitals-col">
              <div class="hero-card-top">
                <span class="hero-card-name">${hero.name}</span>
                <span class="hero-card-role">${rightLabel}</span>
              </div>
              <div class="hero-gauge hp-gauge">
                <div class="hero-gauge-fill" style="width:${hpPct}%;"></div>
                <span class="hero-gauge-lbl">HP</span>
                <span class="hero-gauge-text">${hero.hp} / ${hero.maxHp}</span>
              </div>
              ${
                hero.maxMp > 0
                  ? `<div class="hero-gauge mp-gauge">
                       <div class="hero-gauge-fill" style="width:${mpPct}%;"></div>
                       <span class="hero-gauge-lbl">MP</span>
                       <span class="hero-gauge-text">${hero.mp} / ${hero.maxMp}</span>
                     </div>`
                  : `<div class="hero-weapon-pill">
                       <span>${esc(hero.weaponSubType)}</span>
                       <span class="wpn-zero">0 MP</span>
                     </div>`
              }
            </div>
            ${perksTrayHtml}
          </div>
        </div>
      `;
    })
    .join("");

  elHeroSlotsLayer.querySelectorAll(".hero-perk-icon").forEach((perkEl) => {
    const hId = perkEl.dataset.perkHero;
    const pIdx = Number(perkEl.dataset.perkIdx);
    const heroObj = state.party.find((x) => x.id === hId);
    const perkObj = perksMap.get(hId)?.[pIdx];
    if (!heroObj || !perkObj) return;
    perkEl.addEventListener("mouseenter", () => showPerkTooltip(perkEl, heroObj, perkObj));
    perkEl.addEventListener("focus", () => showPerkTooltip(perkEl, heroObj, perkObj));
    perkEl.addEventListener("mouseleave", hidePerkTooltip);
    perkEl.addEventListener("blur", hidePerkTooltip);
  });

  elHeroSlotsLayer.querySelectorAll("[data-hidx]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      const idx = Number(el.dataset.hidx);
      if (state.viewMode === "player" && state.armedAction?.targetScope === "ally") {
        executePlayerActionOnTarget(null, idx);
      } else {
        state.activeHeroTurn = idx;
        armDefaultActionForActiveHero();
        renderArena();
      }
    });
  });
}

function showHotbarTooltip(slotBtn, slot, hero) {
  if (!elHotbarTooltip || !slotBtn || !slot) return;
  const canAfford = slot.mpCost <= hero.mp;
  const costClass = slot.mpCost > 0 ? (canAfford ? "mp" : "warn") : slot.qty ? "qty" : "";
  const hint = !canAfford
    ? `Need ${slot.mpCost} MP (${hero.mp} MP remaining)`
    : slot.type === "tier_folder"
      ? `Click to open Tier ${slot.tierNum} vertical spell menu`
      : slot.type === "guard"
        ? "Click to immediately Gain +1 Guard"
        : slot.targetScope === "ally"
          ? "Click to select, then click any Hero on the right"
          : slot.targetScope === "all_enemies" || slot.targetScope === "all_allies"
            ? "Click to cast immediately across all targets"
            : "Click to select, then click any Enemy on the left";

  elHotbarTooltip.innerHTML = `
    <div class="hb-tt-head">
      <img src="/${esc(slot.icon)}" alt="" />
      <div class="hb-tt-title-wrap">
        <div class="hb-tt-name">${esc(slot.name)}</div>
        <div class="hb-tt-kind">${esc(slot.categoryLabel || "")}</div>
      </div>
    </div>
    <div class="hb-tt-pills">
      <span class="hb-tt-pill ${costClass}">${esc(slot.costLabel || "0 MP")}</span>
      <span class="hb-tt-pill">${esc(slot.damageType || "Action")}</span>
      <span class="hb-tt-pill">${esc(slot.targetLabel || "")}</span>
      ${slot.hotkey ? `<span class="hb-tt-pill">Key ${esc(slot.hotkey)}</span>` : ""}
    </div>
    <p class="hb-tt-effect">${esc(slot.effect || slot.sub)}</p>
    <div class="hb-tt-hint">${esc(hint)}</div>
  `;
  elHotbarTooltip.classList.remove("hidden");

  const vpRect = elStageViewport.getBoundingClientRect();
  const hbRect = elBattleHotbar.getBoundingClientRect();
  const popOpen = elTierMenuPopup && !elTierMenuPopup.classList.contains("hidden");
  const popRect = popOpen ? elTierMenuPopup.getBoundingClientRect() : null;
  const anchorTop = popRect ? Math.min(hbRect.top, popRect.top) : hbRect.top;
  const bottomPx = Math.max(8, vpRect.bottom - anchorTop + 8);

  elHotbarTooltip.style.bottom = `${bottomPx}px`;
}

function hideHotbarTooltip() {
  if (elHotbarTooltip) elHotbarTooltip.classList.add("hidden");
}

function showEnemyTooltip(mobEl, inst, mob) {
  if (state.viewMode !== "editor") {
    hideEnemyTooltip();
    return;
  }
  if (!elEnemyTooltip || !mobEl || !inst || !mob) return;
  const hpPct = Math.round((inst.hp / Math.max(1, inst.maxHp)) * 100);
  const weakStr = mob.weak && mob.weak !== "None" ? mob.weak : "None";
  const resistStr = mob.resist && mob.resist !== "None" ? mob.resist : "None";
  const act = state.armedAction;
  const dt = (act?.damageType || "").toLowerCase();
  const hitsWeak = dt && weakStr !== "None" && weakStr.toLowerCase().includes(dt);
  const hitsResist = dt && resistStr !== "None" && resistStr.toLowerCase().includes(dt);

  const hint =
    state.viewMode === "editor"
      ? `Click to tune size (${mob.gridW}×${mob.gridH} cells) or height scale`
      : act && (act.targetScope === "enemy" || act.targetScope === "all_enemies")
        ? hitsWeak
          ? `WEAKNESS! ${act.name} deals 1.5× Damage`
          : hitsResist
            ? `Resisted by foe (${act.damageType} deals 0.5× Damage)`
            : `Click to strike with ${act.name} (${act.damageType})`
        : "Select an attack or spell on the hotbar to target";

  elEnemyTooltip.innerHTML = `
    <div class="hb-tt-head">
      <img src="/${esc(mob.iconPath)}" alt="" style="object-fit:contain;background:#0a0d14;" />
      <div class="hb-tt-title-wrap">
        <div class="hb-tt-name">${esc(mob.name)}</div>
        <div class="hb-tt-kind">Lv ${mob.level || 1} · ${esc(mob.role || "Enemy")} · ${mob.gridW}×${mob.gridH}</div>
      </div>
    </div>
    <div class="hb-tt-hpbar">
      <div class="hb-tt-hpfill" style="width:${hpPct}%;"></div>
      <div class="hb-tt-hptext">${inst.hp} / ${inst.maxHp} HP</div>
    </div>
    <div class="hb-tt-pills">
      ${mob.isBoss ? `<span class="hb-tt-pill boss">Boss</span>` : ""}
      ${mob.guard > 0 ? `<span class="hb-tt-pill">🛡 ${mob.guard} Guard</span>` : ""}
      <span class="hb-tt-pill ${weakStr !== "None" ? "weak" : ""}">Weak: ${esc(weakStr)}</span>
      ${resistStr !== "None" ? `<span class="hb-tt-pill resist">Resist: ${esc(resistStr)}</span>` : ""}
    </div>
    <div class="hb-tt-hint" style="${hitsWeak ? "color:#ffe399;font-weight:700;" : hitsResist ? "color:#ffb3b3;" : ""}">${esc(hint)}</div>
  `;
  elEnemyTooltip.classList.remove("hidden");

  const vpRect = elStageViewport.getBoundingClientRect();
  const mobRect = mobEl.getBoundingClientRect();
  const ttRect = elEnemyTooltip.getBoundingClientRect();

  // Place above enemy if room below Turn Bar; otherwise place cleanly to the right of the enemy
  let topPx = mobRect.top - vpRect.top - ttRect.height - 8;
  let leftPx = mobRect.left - vpRect.left + mobRect.width / 2 - ttRect.width / 2;
  if (topPx < 48) {
    leftPx = mobRect.right - vpRect.left + 10;
    if (leftPx + ttRect.width > vpRect.width - 10) {
      leftPx = Math.max(10, mobRect.left - vpRect.left - ttRect.width - 10);
    }
    topPx = Math.max(48, Math.min(vpRect.height - ttRect.height - 10, mobRect.top - vpRect.top + 10));
  } else {
    leftPx = Math.max(10, Math.min(vpRect.width - ttRect.width - 10, leftPx));
  }

  elEnemyTooltip.style.left = `${leftPx}px`;
  elEnemyTooltip.style.top = `${topPx}px`;
}

function hideEnemyTooltip() {
  if (elEnemyTooltip) elEnemyTooltip.classList.add("hidden");
}

function closeTierPopup(skipButtonReset = false) {
  if (!state.openTierPopup && (!elTierMenuPopup || elTierMenuPopup.classList.contains("hidden"))) return;
  state.openTierPopup = null;
  if (elTierMenuPopup) {
    elTierMenuPopup.classList.add("hidden");
    elTierMenuPopup.innerHTML = "";
  }
  if (!skipButtonReset) {
    elHotbarSlots.querySelectorAll(".hb-slot.is-open").forEach((b) => b.classList.remove("is-open"));
  }
}

function openTierMenu(btn, tierSlot, hero) {
  if (!elTierMenuPopup || !btn || !tierSlot) return;
  if (state.openTierPopup?.slotId === tierSlot.id) {
    closeTierPopup();
    return;
  }

  closeTierPopup(true);
  elHotbarSlots.querySelectorAll(".hb-slot.is-open").forEach((b) => b.classList.remove("is-open"));
  btn.classList.add("is-open");
  state.openTierPopup = { slotId: tierSlot.id, tierNum: tierSlot.tierNum };

  const spells = tierSlot.spells || [];
  elTierMenuPopup.innerHTML = spells
    .map((sp) => {
      const isArmed = state.armedAction?.id === sp.id;
      const canAfford = sp.mpCost <= hero.mp;
      return `
        <button
          type="button"
          class="hb-slot group-spell ${isArmed ? "active" : ""} ${!canAfford ? "is-disabled" : ""}"
          data-spell-id="${esc(sp.id)}"
          role="menuitem"
        >
          <img src="/${esc(sp.icon)}" alt="${esc(sp.name)}" />
          <span class="hb-badge mp">${sp.mpCost} MP</span>
        </button>
      `;
    })
    .join("");
  elTierMenuPopup.classList.remove("hidden");

  const vpRect = elStageViewport.getBoundingClientRect();
  const btnRect = btn.getBoundingClientRect();
  const hbRect = elBattleHotbar.getBoundingClientRect();
  const popWidth = elTierMenuPopup.offsetWidth || 60;
  const centerX = btnRect.left - vpRect.left + btnRect.width / 2 - popWidth / 2;
  const clampedLeft = Math.max(8, Math.min(vpRect.width - popWidth - 8, centerX));
  const bottomPx = Math.max(8, vpRect.bottom - hbRect.top + 6);
  elTierMenuPopup.style.left = `${clampedLeft}px`;
  elTierMenuPopup.style.bottom = `${bottomPx}px`;

  elTierMenuPopup.querySelectorAll("[data-spell-id]").forEach((spBtn) => {
    const sp = spells.find((x) => x.id === spBtn.dataset.spellId);
    if (!sp) return;
    spBtn.addEventListener("mouseenter", () => showHotbarTooltip(spBtn, sp, hero));
    spBtn.addEventListener("focus", () => showHotbarTooltip(spBtn, sp, hero));
    spBtn.addEventListener("mouseleave", hideHotbarTooltip);
    spBtn.addEventListener("blur", hideHotbarTooltip);

    spBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (sp.mpCost > hero.mp) {
        showToast(`${hero.name} doesn't have enough MP (${sp.mpCost} MP required).`);
        return;
      }
      state.armedAction = sp;
      closeTierPopup(true);
      hideHotbarTooltip();
      if (sp.targetScope === "all_enemies" || sp.targetScope === "all_allies") {
        executePlayerActionOnTarget();
      } else {
        renderArena();
      }
    });
  });

  hideHotbarTooltip();
}

function renderDynamicHotbar() {
  const hero = getActiveHero();
  if (!hero) return;
  hideHotbarTooltip();
  syncWeaponDropdownForActiveHero();

  const slots = buildDynamicHotbarSlots(hero);
  const actions = flattenHotbarActions(slots);
  if (!state.armedAction || !actions.some((a) => a.id === state.armedAction.id)) {
    state.armedAction = actions.find((a) => a.type === "attack") || actions[0] || null;
  }

  const htmlParts = [];
  let prevGroup = null;
  for (const s of slots) {
    if (prevGroup && prevGroup !== s.group) {
      htmlParts.push(`<div class="hb-sep" aria-hidden="true"></div>`);
    }
    prevGroup = s.group;
    const isSel = s.type === "tier_folder" ? Boolean(s.isArmedTier) : state.armedAction?.id === s.id;
    const isOpen = s.type === "tier_folder" && state.openTierPopup?.slotId === s.id;
    const canAfford = s.mpCost <= hero.mp;
    const extraCls = [
      `group-${esc(s.group)}`,
      s.themeClass ? esc(s.themeClass) : "",
      isSel ? "active" : "",
      isOpen ? "is-open" : "",
      !canAfford ? "is-disabled" : "",
    ]
      .filter(Boolean)
      .join(" ");
    htmlParts.push(`
      <button
        type="button"
        class="hb-slot ${extraCls}"
        data-hb-id="${esc(s.id)}"
        aria-disabled="${!canAfford ? "true" : "false"}"
        ${s.type === "tier_folder" ? `aria-haspopup="menu" aria-expanded="${isOpen ? "true" : "false"}"` : ""}
      >
        <img src="/${esc(s.icon)}" alt="${esc(s.name)}" />
        ${s.hotkey ? `<span class="hb-key">${s.hotkey}</span>` : ""}
        ${s.badge ? `<span class="hb-badge ${esc(s.badgeClass)}">${esc(s.badge)}</span>` : ""}
      </button>
    `);
  }
  elHotbarSlots.innerHTML = htmlParts.join("");

  elHotbarSlots.querySelectorAll("[data-hb-id]").forEach((btn) => {
    const found = slots.find((x) => x.id === btn.dataset.hbId);
    if (!found) return;

    btn.addEventListener("mouseenter", () => showHotbarTooltip(btn, found, hero));
    btn.addEventListener("focus", () => showHotbarTooltip(btn, found, hero));
    btn.addEventListener("mouseleave", hideHotbarTooltip);
    btn.addEventListener("blur", hideHotbarTooltip);

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (found.mpCost > hero.mp) {
        const msg =
          found.type === "tier_folder"
            ? `${hero.name} needs at least ${found.mpCost} MP for Tier ${found.tierNum} spells.`
            : `${hero.name} doesn't have enough MP (${found.mpCost} MP required).`;
        showToast(msg);
        return;
      }
      if (found.type === "tier_folder") {
        openTierMenu(btn, found, hero);
        return;
      }
      closeTierPopup(true);
      if (found.type === "guard") {
        executeGuardAction();
        return;
      }
      state.armedAction = found;
      if (found.targetScope === "all_enemies" || found.targetScope === "all_allies") {
        executePlayerActionOnTarget();
      } else {
        renderArena();
      }
    });
  });

  renderArenaBanner();
}

function renderArenaBanner() {
  const hero = getActiveHero();
  const act = state.armedAction;
  if (!hero || !act) {
    elActionBanner.textContent = "Pick a 1:1 Slot on the Hotbar below!";
    return;
  }
  if (act.targetScope === "ally") {
    elActionBanner.textContent = `${hero.name} ready: "${act.name}" — click any Hero on the Right!`;
  } else if (act.targetScope === "all_enemies" || act.targetScope === "all_allies") {
    elActionBanner.textContent = `${hero.name}: Casting "${act.name}" across all targets!`;
  } else {
    elActionBanner.textContent = `${hero.name} ready: "${act.name}" (${act.damageType}) — click any Enemy on the Left to strike!`;
  }
}

function renderArena() {
  const stage = getStage();
  if (!stage) return;
  closeTierPopup(true);
  hidePerkTooltip();
  hideEnemyTooltip();

  elStageViewport.classList.toggle("player-view", state.viewMode === "player");
  elImgBackdrop.src = `/${stage.imagePath}`;
  elLblStageTitle.textContent = `${stage.order}. ${stage.name}`;
  elLblStageZones.textContent = stage.zones ? `(${stage.zones})` : "";

  renderRightArenaHeroes(stage);

  const eg = stage.enemyGrid;
  elEnemyZoneBox.style.left = `${eg.xPct}%`;
  elEnemyZoneBox.style.top = `${eg.yPct}%`;
  elEnemyZoneBox.style.width = `${eg.wPct}%`;
  elEnemyZoneBox.style.height = `${eg.hPct}%`;
  elLblGridDims.textContent = `${eg.cols}×${eg.rows}`;

  elEnemyGridCells.style.gridTemplateColumns = `repeat(${eg.cols}, 1fr)`;
  elEnemyGridCells.style.gridTemplateRows = `repeat(${eg.rows}, 1fr)`;
  let cellHtml = "";
  for (let r = 0; r < eg.rows; r++) {
    for (let c = 0; c < eg.cols; c++) {
      cellHtml += `<div class="grid-cell-slot">${r + 1},${c + 1}</div>`;
    }
  }
  elEnemyGridCells.innerHTML = cellHtml;

  const placements = packEncounterIntoGrid(state.encounter, eg.cols, eg.rows);
  const sortedByDepth = [...placements].sort((a, b) => a.r0 + a.gh - (b.r0 + b.gh));
  const targetable = state.viewMode === "player" && (state.armedAction?.targetScope === "enemy" || state.armedAction?.targetScope === "all_enemies");

  elEnemySpritesLayer.innerHTML = sortedByDepth
    .map((p) => {
      const leftPct = (p.c0 / eg.cols) * 100;
      const widthPct = (p.gw / eg.cols) * 100;
      const topPct = (p.r0 / eg.rows) * 100;
      const heightPct = (p.gh / eg.rows) * 100;

      const bottomRow = p.r0 + p.gh - 1;
      const depthT = eg.rows > 1 ? bottomRow / (eg.rows - 1) : 1;
      const rowScale = Number(eg.backRowScale) + (Number(eg.frontRowScale) - Number(eg.backRowScale)) * depthT;
      const finalScale = rowScale * Number(p.mob.visualScale || 1.0);
      const isSelected = state.selectedInstanceId === p.inst.instanceId || state.selectedMobId === p.mob.id;
      const inEditor = state.viewMode === "editor";
      const isMirrored = (state.mobFacing === "flip_all") !== Boolean(p.mob.flipX);
      const hpPct = Math.round((p.inst.hp / Math.max(1, p.inst.maxHp)) * 100);

      return `
        <div
          class="spawned-enemy ${inEditor ? "in-editor-box" : ""} ${isSelected ? "selected" : ""} ${isMirrored ? "face-right" : ""} ${targetable ? "is-targetable" : ""}"
          data-inst="${p.inst.instanceId}"
          data-mob="${p.mob.id}"
          style="left:${leftPct}%;top:${topPct}%;width:${widthPct}%;height:${heightPct}%;z-index:${bottomRow + 3};"
        >
          ${inEditor ? `<div class="enemy-tag-chip">${esc(p.mob.name)} <span style="color:#8dc4ff;">${p.gw}×${p.gh}</span></div>` : ""}
          <div class="ground-shadow" style="transform:scale(${Math.min(1.35, finalScale)});"></div>
          <img src="/${esc(p.mob.iconPath)}" alt="${esc(p.mob.name)}" style="height:${Math.round(92 * finalScale)}%;" />
          ${!inEditor ? `<div class="enemy-hp-mini"><span style="width:${hpPct}%;"></span></div>` : ""}
        </div>
      `;
    })
    .join("");

  elTurnBar.innerHTML = [
    ...state.party.map((h, i) => `
      <div class="turn-pip ${i === state.activeHeroTurn ? "active" : ""}">
        <img src="/assets/portraits/heroes/${h.id}_avatar.webp" alt="" />
        <span>${h.name}</span>
      </div>
    `),
    ...placements.slice(0, 3).map((p) => `
      <div class="turn-pip foe">
        <img src="/${esc(p.mob.iconPath)}" alt="" />
        <span>${esc(p.mob.name)}</span>
      </div>
    `),
  ].join("");

  elEnemySpritesLayer.querySelectorAll(".spawned-enemy").forEach((el) => {
    const instObj = state.encounter.find((x) => x.instanceId === el.dataset.inst);
    const mobObj = getMob(el.dataset.mob);
    el.addEventListener("mouseenter", () => showEnemyTooltip(el, instObj, mobObj));
    el.addEventListener("mouseleave", hideEnemyTooltip);
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      state.selectedInstanceId = el.dataset.inst;
      state.selectedMobId = el.dataset.mob;
      if (state.viewMode === "player" && (state.armedAction?.targetScope === "enemy" || state.armedAction?.targetScope === "all_enemies")) {
        executePlayerActionOnTarget(el.dataset.inst);
      } else {
        renderArena();
        renderInspector();
      }
    });
  });

  renderDynamicHotbar();
}

function renderBestiaryDrawer() {
  const stage = getStage();
  const natives = getNativeMobsForStage(stage);
  elNativeMobs.innerHTML =
    natives.length === 0
      ? `<span style="color:#8897b0;font-size:11px;">No fixed spawns mapped — add any mob below.</span>`
      : natives
          .map(
            (m) => `
          <button type="button" class="mob-chip ${m.isBoss ? "boss" : ""}" data-add-mob="${m.id}">
            <img src="/${esc(m.iconPath)}" alt="" />
            <span>${esc(m.name)}</span>
            <span class="mob-size-pill">${m.gridW}×${m.gridH}</span>
          </button>
        `
          )
          .join("");

  const q = state.mobSearch.trim().toLowerCase();
  const list = state.config.monsters.filter((m) => {
    if (!q) return true;
    return `${m.name} ${m.role} cr ${m.cr} ${m.gridW}x${m.gridH} ${m.homeBiome}`.toLowerCase().includes(q);
  });

  elLblAllMobsHeader.textContent = `Bestiary Palette (${list.length} of ${state.config.monsters.length} Exported Monsters)`;
  elAllMobs.innerHTML = list
    .map(
      (m) => `
      <button type="button" class="mob-chip ${m.isBoss ? "boss" : ""}" data-add-mob="${m.id}">
        <img src="/${esc(m.iconPath)}" alt="" loading="lazy" />
        <span>${esc(m.name)}</span>
        <span class="mob-size-pill">${m.gridW}×${m.gridH}</span>
      </button>
    `
    )
    .join("");

  document.querySelectorAll("[data-add-mob]").forEach((btn) => {
    btn.addEventListener("click", () => addMobToEncounter(btn.dataset.addMob));
  });
}

function renderInspector() {
  const stage = getStage();
  if (!stage) return;
  const eg = stage.enemyGrid;
  const hz = stage.heroZone;

  inpGridCols.value = eg.cols;
  inpGridRows.value = eg.rows;
  inpEnemyBackScale.value = Math.round(eg.backRowScale * 100);
  inpEnemyFrontScale.value = Math.round(eg.frontRowScale * 100);
  lblEnemyCoords.textContent = `X:${eg.xPct.toFixed(1)}% · Y:${eg.yPct.toFixed(1)}% · W:${eg.wPct.toFixed(1)}% · H:${eg.hPct.toFixed(1)}%`;

  inpHeroStagger.value = Math.round(hz.staggerPct ?? 0);
  inpHeroScale.value = Math.round((hz.frontScale ?? 1.0) * 100);
  lblHeroCoords.textContent = `X:${hz.xPct.toFixed(1)}% · Y:${hz.yPct.toFixed(1)}% · W:${hz.wPct.toFixed(1)}% · H:${hz.hPct.toFixed(1)}%`;

  const mob = getMob(state.selectedMobId);
  if (!mob) {
    elSelectedMobEditor.innerHTML = `<div class="empty-note">Click any monster in the arena or spawned list below to tune its grid footprint (<code>1×1</code>, <code>2×2</code>, <code>3×3</code>, etc.) and size.</div>`;
  } else {
    elSelectedMobEditor.innerHTML = `
      <div class="mob-editor-top">
        <img src="/${esc(mob.iconPath)}" alt="${esc(mob.name)}" />
        <div style="min-width:0;flex:1;">
          <div style="font-weight:800;color:#fae2aa;font-size:12.5px;">${esc(mob.name)}</div>
          <div style="font-size:10.5px;color:#93a6c4;">Lv ${mob.level} · CR ${mob.cr} · ${esc(mob.role)}</div>
          <div style="font-size:10px;color:#7285a3;">Weak: ${esc(mob.weak)} · ${mob.spriteW}×${mob.spriteH} px</div>
        </div>
      </div>
      <div style="font-size:10.5px;color:#c9d6ea;font-weight:700;">Grid Cell Footprint: <span style="color:#fae2aa;">${mob.gridW}×${mob.gridH} (${mob.gridW * mob.gridH} cell${mob.gridW * mob.gridH > 1 ? "s" : ""})</span></div>
      <div class="footprint-pills">
        ${FOOTPRINT_PRESETS.map(
          (fp) => `
          <button type="button" class="fp-btn ${mob.gridW === fp.w && mob.gridH === fp.h ? "active" : ""}" data-fpw="${fp.w}" data-fph="${fp.h}" data-fpname="${esc(fp.name)}">
            ${fp.label}
          </button>
        `
        ).join("")}
      </div>
      <label class="num-field" style="margin-top:8px;">Visual Height Scale (${Math.round((mob.visualScale || 1) * 100)}%)
        <input type="range" id="rngMobScale" min="60" max="145" step="2" value="${Math.round((mob.visualScale || 1) * 100)}" />
      </label>
      <label style="display:flex;align-items:center;gap:6px;margin-top:7px;font-size:11px;color:#c9d6ea;cursor:pointer;">
        <input type="checkbox" id="chkMobFlipX" ${mob.flipX ? "checked" : ""} />
        Mirror This Monster Horizontally
      </label>
    `;

    elSelectedMobEditor.querySelectorAll("[data-fpw]").forEach((btn) => {
      btn.addEventListener("click", () => {
        mob.gridW = Number(btn.dataset.fpw);
        mob.gridH = Number(btn.dataset.fph);
        mob.sizePreset = btn.dataset.fpname;
        state.encounter.forEach((inst) => {
          delete inst.r0;
          delete inst.c0;
        });
        markDirty();
        renderArena();
        renderBestiaryDrawer();
        renderInspector();
      });
    });

    const rng = document.getElementById("rngMobScale");
    rng.addEventListener("input", () => {
      mob.visualScale = Number(rng.value) / 100;
      markDirty();
      renderArena();
    });

    const chkFlip = document.getElementById("chkMobFlipX");
    chkFlip.addEventListener("change", () => {
      mob.flipX = chkFlip.checked;
      markDirty();
      renderArena();
    });
  }

  elLblSpawnCount.textContent = String(state.encounter.length);
  elSpawnedList.innerHTML = state.encounter
    .map((inst, idx) => {
      const m = getMob(inst.mobId);
      if (!m) return "";
      const active = state.selectedInstanceId === inst.instanceId;
      return `
        <div class="spawned-row ${active ? "active" : ""}" data-pick-inst="${inst.instanceId}" data-pick-mob="${m.id}">
          <div class="spawned-row-left">
            <img src="/${esc(m.iconPath)}" alt="" />
            <span>#${idx + 1} ${esc(m.name)} <strong style="color:#9ec6ff;">${m.gridW}×${m.gridH}</strong></span>
          </div>
          <button type="button" class="del-btn" data-del-inst="${inst.instanceId}">✕</button>
        </div>
      `;
    })
    .join("");

  elSpawnedList.querySelectorAll("[data-pick-inst]").forEach((row) => {
    row.addEventListener("click", () => {
      state.selectedInstanceId = row.dataset.pickInst;
      state.selectedMobId = row.dataset.pickMob;
      renderArena();
      renderInspector();
    });
  });

  elSpawnedList.querySelectorAll("[data-del-inst]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      state.encounter = state.encounter.filter((x) => x.instanceId !== btn.dataset.delInst);
      renderArena();
      renderInspector();
    });
  });
}

function renderAll() {
  elStats.textContent = `${state.config.stages.length} Arenas · ${state.config.monsters.length} Mobs · ${state.spells.length} Real Spells`;
  renderStageSidebar();
  renderArena();
  renderBestiaryDrawer();
  renderInspector();
}

// Drag & Resize Boxes in Stage Editor
function wireBoxInteractions(boxEl, getRectObj, coordLabelEl) {
  let dragMode = null;
  let startX = 0;
  let startY = 0;
  let startRect = null;

  boxEl.addEventListener("mousedown", (e) => {
    if (state.viewMode === "player") return;
    if (e.target.closest(".spawned-enemy") || e.target.closest(".hero-card-unit")) return;
    const isHandle = e.target.classList.contains("zone-resize-handle");
    dragMode = isHandle ? "resize" : "move";
    startX = e.clientX;
    startY = e.clientY;
    startRect = { ...getRectObj() };
    e.preventDefault();
  });

  window.addEventListener("mousemove", (e) => {
    if (!dragMode || !startRect) return;
    const vp = elStageViewport.getBoundingClientRect();
    const dxPct = ((e.clientX - startX) / vp.width) * 100;
    const dyPct = ((e.clientY - startY) / vp.height) * 100;
    const target = getRectObj();

    if (dragMode === "move") {
      target.xPct = Math.max(0, Math.min(100 - target.wPct, Number((startRect.xPct + dxPct).toFixed(1))));
      target.yPct = Math.max(0, Math.min(100 - target.hPct, Number((startRect.yPct + dyPct).toFixed(1))));
    } else {
      target.wPct = Math.max(16, Math.min(100 - target.xPct, Number((startRect.wPct + dxPct).toFixed(1))));
      target.hPct = Math.max(16, Math.min(100 - target.yPct, Number((startRect.hPct + dyPct).toFixed(1))));
    }

    boxEl.style.left = `${target.xPct}%`;
    boxEl.style.top = `${target.yPct}%`;
    boxEl.style.width = `${target.wPct}%`;
    boxEl.style.height = `${target.hPct}%`;
    coordLabelEl.textContent = `X:${target.xPct.toFixed(1)}% · Y:${target.yPct.toFixed(1)}% · W:${target.wPct.toFixed(1)}% · H:${target.hPct.toFixed(1)}%`;
    markDirty();
  });

  window.addEventListener("mouseup", () => {
    if (!dragMode) return;
    dragMode = null;
    startRect = null;
    renderArena();
  });
}

wireBoxInteractions(elHeroZoneBox, () => getStage().heroZone, lblHeroCoords);
wireBoxInteractions(elEnemyZoneBox, () => getStage().enemyGrid, lblEnemyCoords);

// Toolbar & Command Deck Listeners
document.getElementById("segViewMode").addEventListener("click", (e) => {
  const btn = e.target.closest(".seg-btn");
  if (!btn) return;
  document.querySelectorAll("#segViewMode .seg-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  state.viewMode = btn.dataset.val;
  renderArena();
});

document.getElementById("selSquad").addEventListener("change", (e) => {
  state.squadIds = e.target.value.split(",");
  buildPartyFromSquad();
  renderArena();
});

selHeroWeapon.addEventListener("change", (e) => {
  const hero = getActiveHero();
  if (!hero) return;
  equipWeaponSubTypeOnHero(hero, e.target.value);
  armDefaultActionForActiveHero();
  renderArena();
  showToast(`${hero.name} equipped ${hero.weaponSubType} (${hero.attackModes[0].name} / ${hero.attackModes[1].name})`);
});

selSpellTier.addEventListener("change", (e) => {
  state.maxSpellTier = Number(e.target.value || 0);
  closeTierPopup(true);
  armDefaultActionForActiveHero();
  renderArena();
});

if (selPerkCount) {
  selPerkCount.addEventListener("change", (e) => {
    state.perkCount = Number(e.target.value || 0);
    hidePerkTooltip();
    renderRightArenaHeroes(getStage());
  });
}

elHotbarSlots.addEventListener("mouseleave", hideHotbarTooltip);

document.getElementById("btnRestockPotions").addEventListener("click", () => {
  restockTestPotions();
  renderDynamicHotbar();
  showToast("Restocked potion belt — watch hotbar slots grow cleanly!");
});

document.getElementById("segMobFacing").addEventListener("click", (e) => {
  const btn = e.target.closest(".seg-btn");
  if (!btn) return;
  document.querySelectorAll("#segMobFacing .seg-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  state.mobFacing = btn.dataset.val;
  renderArena();
});

document.getElementById("selHpState").addEventListener("change", (e) => {
  state.heroHpTier = Number(e.target.value);
  buildPartyFromSquad();
  renderArena();
});

document.getElementById("segStageFilter").addEventListener("click", (e) => {
  const btn = e.target.closest(".seg-btn");
  if (!btn) return;
  document.querySelectorAll("#segStageFilter .seg-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  state.stageFilter = btn.dataset.val;
  renderStageSidebar();
});

document.getElementById("inpStageSearch").addEventListener("input", (e) => {
  state.stageSearch = e.target.value;
  renderStageSidebar();
});

document.getElementById("inpMobSearch").addEventListener("input", (e) => {
  state.mobSearch = e.target.value;
  renderBestiaryDrawer();
});

document.getElementById("btnRollEncounter").addEventListener("click", () => {
  rollBiomeEncounter(getStage());
  renderArena();
  renderInspector();
});

document.getElementById("btnEnemyTurn").addEventListener("click", executeEnemyTurn);

document.getElementById("btnClearMobs").addEventListener("click", () => {
  state.encounter = [];
  renderArena();
  renderInspector();
});

function syncFullscreenBtn() {
  const active = document.fullscreenElement === elStageFrameWrap || elStageFrameWrap.classList.contains("is-fullscreen");
  document.getElementById("btnFullscreen").innerHTML = active ? "&#x2715; Exit Fullscreen" : "&#x26F6; Fullscreen";
}

async function toggleStageFullscreen(forceState) {
  const currentlyActive = document.fullscreenElement === elStageFrameWrap || elStageFrameWrap.classList.contains("is-fullscreen");
  const nextActive = typeof forceState === "boolean" ? forceState : !currentlyActive;

  if (nextActive) {
    if (elStageFrameWrap.requestFullscreen) {
      try {
        await elStageFrameWrap.requestFullscreen();
      } catch {
        elStageFrameWrap.classList.add("is-fullscreen");
      }
    } else {
      elStageFrameWrap.classList.add("is-fullscreen");
    }
  } else {
    elStageFrameWrap.classList.remove("is-fullscreen");
    if (document.fullscreenElement === elStageFrameWrap && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch {}
    }
  }
  syncFullscreenBtn();
}

function stepStage(delta) {
  const list = state.config?.stages || [];
  if (!list.length) return;
  const idx = list.findIndex((s) => s.id === state.selectedStageId);
  const nextIdx = (idx + delta + list.length) % list.length;
  state.selectedStageId = list[nextIdx].id;
  rollBiomeEncounter(getStage());
  renderAll();
}

document.getElementById("btnFullscreen").addEventListener("click", () => toggleStageFullscreen());
document.getElementById("btnFsExit").addEventListener("click", () => toggleStageFullscreen(false));
document.getElementById("btnFsPrev").addEventListener("click", () => stepStage(-1));
document.getElementById("btnFsNext").addEventListener("click", () => stepStage(1));
document.getElementById("btnFsRoll").addEventListener("click", () => {
  rollBiomeEncounter(getStage());
  renderArena();
  renderInspector();
});
document.getElementById("btnFsEnemyTurn").addEventListener("click", executeEnemyTurn);
document.getElementById("btnFsToggleView").addEventListener("click", () => {
  state.viewMode = state.viewMode === "editor" ? "player" : "editor";
  document.querySelectorAll("#segViewMode .seg-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.val === state.viewMode);
  });
  renderArena();
});
document.addEventListener("fullscreenchange", syncFullscreenBtn);
document.addEventListener("click", (e) => {
  if (!e.target.closest("#tierMenuPopup") && !e.target.closest("[data-hb-id]")) {
    closeTierPopup();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && state.openTierPopup) {
    closeTierPopup();
    return;
  }
  if (e.key === "Escape" && elStageFrameWrap.classList.contains("is-fullscreen")) {
    toggleStageFullscreen(false);
    return;
  }
  if (e.target.closest("input, select, textarea")) return;
  if (state.viewMode === "player" && e.key >= "1" && e.key <= "9") {
    const slotBtn = elHotbarSlots.querySelectorAll(".hb-slot")[Number(e.key) - 1];
    if (slotBtn && !slotBtn.classList.contains("is-disabled")) slotBtn.click();
  }
});

[inpGridCols, inpGridRows, inpEnemyBackScale, inpEnemyFrontScale].forEach((el) => {
  el.addEventListener("input", () => {
    const st = getStage();
    if (!st) return;
    st.enemyGrid.cols = Math.max(2, Math.min(5, Number(inpGridCols.value || 4)));
    st.enemyGrid.rows = Math.max(2, Math.min(3, Number(inpGridRows.value || 3)));
    st.enemyGrid.backRowScale = Math.max(0.5, Math.min(1.1, Number(inpEnemyBackScale.value || 84) / 100));
    st.enemyGrid.frontRowScale = Math.max(0.7, Math.min(1.4, Number(inpEnemyFrontScale.value || 100) / 100));
    if (el === inpGridCols || el === inpGridRows) {
      state.encounter.forEach((inst) => {
        delete inst.r0;
        delete inst.c0;
      });
    }
    markDirty();
    renderArena();
  });
});

[inpHeroStagger, inpHeroScale].forEach((el) => {
  el.addEventListener("input", () => {
    const st = getStage();
    if (!st) return;
    st.heroZone.staggerPct = Math.max(0, Math.min(18, Number(inpHeroStagger.value || 0)));
    st.heroZone.frontScale = Math.max(0.65, Math.min(1.3, Number(inpHeroScale.value || 100) / 100));
    markDirty();
    renderArena();
  });
});

document.getElementById("btnResetStage").addEventListener("click", () => {
  const st = getStage();
  if (!st || !state.config) return;
  st.heroZone = { ...state.config.heroZoneDefault };
  st.enemyGrid = { ...state.config.enemyGridDefault };
  markDirty();
  renderAll();
  showToast(`Reset ${st.name} to default full-screen battle layout`);
});

document.getElementById("btnApplyEnemyAll").addEventListener("click", () => {
  const src = getStage();
  if (!src || !state.config) return;
  for (const st of state.config.stages) {
    st.enemyGrid = { ...src.enemyGrid };
  }
  markDirty();
  renderStageSidebar();
  showToast("Applied Enemy Grid dimensions & placement to all 41 stages");
});

document.getElementById("btnApplyHeroAll").addEventListener("click", () => {
  const src = getStage();
  if (!src || !state.config) return;
  for (const st of state.config.stages) {
    st.heroZone = { ...src.heroZone };
  }
  markDirty();
  showToast("Applied Hero Zone placement to all 41 stages");
});

btnSave.addEventListener("click", async () => {
  if (!state.config) return;
  try {
    const resp = await fetch("/api/battles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state.config),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    state.dirty = false;
    btnSave.classList.remove("dirty");
    btnSave.textContent = "Save Battle Config";
    showToast("Saved battle-config.json (data + client synced)");
  } catch (err) {
    showToast(`Save failed: ${err.message}`);
  }
});

(async () => {
  const t = Date.now();
  const [rBat, rSp, rIt, rDisc, rWpnSkills, rMagicTiers] = await Promise.all([
    fetch(`/api/battles?t=${t}`),
    fetch(`/data/spells-catalog.json?t=${t}`),
    fetch(`/data/items-catalog.json?t=${t}`),
    fetch(`/data/disciplines-catalog.json?t=${t}`).catch(() => null),
    fetch(`/assets/icons/weapon_abilities/weapon-abilities-manifest.json?t=${t}`).catch(() => null),
    fetch(`/assets/icons/magic_tiers/magic-tiers-manifest.json?t=${t}`).catch(() => null),
  ]);
  if (!rBat.ok) {
    elStats.textContent = "battle-config.json missing";
    return;
  }
  state.config = await rBat.json();
  if (rSp.ok) {
    const spJson = await rSp.json();
    state.spells = Array.isArray(spJson) ? spJson : spJson.spells || [];
  }
  if (rIt.ok) {
    const itJson = await rIt.json();
    const list = Array.isArray(itJson) ? itJson : itJson.items || [];
    state.itemsById = Object.fromEntries(list.map((x) => [x.id, x]));
    state.potions = list.filter((x) => x.category === "consumable" && /potion|tonic|elixir|salve|antidote|remedy/i.test(x.name || ""));
  }
  if (rDisc && rDisc.ok) {
    const discJson = await rDisc.json();
    const heroesList = Array.isArray(discJson?.heroes) ? discJson.heroes : [];
    state.disciplinesByHero = Object.fromEntries(heroesList.map((h) => [h.heroId, h.tiers || []]));
  }
  if (rWpnSkills && rWpnSkills.ok) {
    state.weaponSkillManifest = await rWpnSkills.json();
  }
  if (rMagicTiers && rMagicTiers.ok) {
    state.magicTierManifest = await rMagicTiers.json();
  }

  state.selectedStageId = state.config.stages?.[0]?.id || null;
  restockTestPotions();
  buildPartyFromSquad();
  rollBiomeEncounter(getStage());
  renderAll();
})();
