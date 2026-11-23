// Interactive Party, Sort Order, Gear, Runestones, Inventory & Menu Management Mockup

const HEROES = [
  {
    id: "valen",
    name: "Valen",
    className: "Duelist",
    shortTag: "Swords & Rapiers · Striker",
    focus: ["force", "finesse"],
    focusLabel: "Force & Finesse",
    baseHp: 47,
    baseMp: 0,
    wounded50: "Below 50% HP: Strikes deal more damage and land more critical hits.",
    wounded25: "Below 25% HP: Attacks strike harder still and gain counter/riposte readiness.",
    bio: "Stripped of his royal title after Highcrown's arena fallout, Valen leads with relentless blade pressure.",
  },
  {
    id: "ellowyn",
    name: "Ellowyn",
    className: "Sorceress",
    shortTag: "Quarterstaves · Arcane Mage",
    focus: ["arcana", "finesse"],
    focusLabel: "Arcana & Finesse",
    baseHp: 47,
    baseMp: 19,
    wounded50: "Below 50% HP: Attack spells hit harder and protective wards absorb more damage.",
    wounded25: "Below 25% HP: Spell power surges sharply and MP costs drop.",
    bio: "Keeper of Highcrown's hidden arcane scrolls, unlocking offensive magic and protective wards as she levels.",
  },
  {
    id: "orin",
    name: "Orin",
    className: "Knight",
    shortTag: "Axes, Maces & Spears · Guardian",
    focus: ["grit", "force"],
    focusLabel: "Grit & Force",
    baseHp: 47,
    baseMp: 0,
    wounded50: "Below 50% HP: Takes less damage from all hits and holds enemy attention longer.",
    wounded25: "Below 25% HP: Takes even less damage and steps in to shield allies from heavy blows.",
    bio: "Rowan's father and veteran fortress defender who anchors the line with shields and heavy steel.",
  },
  {
    id: "rowan",
    name: "Rowan",
    className: "Ranger",
    shortTag: "Bows & Crossbows · Marksman",
    focus: ["finesse", "force"],
    focusLabel: "Finesse & Force",
    baseHp: 47,
    baseMp: 0,
    wounded50: "Below 50% HP: Shots strike harder and pierce part of enemy armor.",
    wounded25: "Below 25% HP: Critical rate spikes and he acts faster in the turn order.",
    bio: "Sharp-eyed frontier scout trained to strike high-priority threats before they act.",
  },
  {
    id: "mera",
    name: "Mera",
    className: "Druid",
    shortTag: "Scimitars, Sickles & Staves · Nature",
    focus: ["arcana", "presence"],
    focusLabel: "Arcana & Presence",
    baseHp: 47,
    baseMp: 19,
    wounded50: "Below 50% HP: Nature spells hit and heal harder, and she dodges incoming blows more often.",
    wounded25: "Below 25% HP: Spell power surges sharply and she acts faster in the turn order.",
    bio: "Wild-magic channeler weaving storm, thorn, lightning, and mending spells to sustain the party.",
  },
  {
    id: "harlan",
    name: "Harlan",
    className: "Sage",
    shortTag: "Maces, Daggers & Staves · Healer",
    focus: ["presence", "grit"],
    focusLabel: "Presence & Grit",
    baseHp: 47,
    baseMp: 19,
    wounded50: "Below 50% HP: Healing spells restore more HP and leave a brief healing salve on allies.",
    wounded25: "Below 25% HP: Healing surges further and his poisons bite through resistant enemies.",
    bio: "Alchemist and field surgeon pairing life-saving remedies with toxic venoms.",
  },
];

const HERO_MAP = Object.fromEntries(HEROES.map((h) => [h.id, h]));

const ATTRS = [
  { key: "force", label: "Force", short: "FOR", hint: "Melee Power" },
  { key: "finesse", label: "Finesse", short: "FIN", hint: "Speed & Crit" },
  { key: "grit", label: "Grit", short: "GRT", hint: "HP & Defense" },
  { key: "arcana", label: "Arcana", short: "ARC", hint: "Magic & MP" },
  { key: "presence", label: "Presence", short: "PRE", hint: "Heal & Ward" },
];

const WEAPON_MODES = {
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

const TABS = [
  { id: "party", label: "Party & Stats", icon: "/assets/icons/ui/ui_21_party_hero_glyph.webp" },
  { id: "gear", label: "Gear & Runestones", icon: "/assets/icons/ui/ui_04_body_armor_slot_glyph.webp" },
  { id: "skills", label: "Weapons & Spells", icon: "/assets/icons/ui/ui_09_spells_magic_glyph.webp" },
  { id: "bag", label: "Inventory Bag", icon: "/assets/icons/ui/ui_22_all_pack_bag_glyph.webp" },
  { id: "journal", label: "Quest Journal", icon: "/assets/icons/ui/ui_06_quest_scroll_glyph.webp" },
  { id: "atlas", label: "World Atlas", icon: "/assets/icons/ui/ui_25_world_atlas_glyph.webp" },
];

const SLOT_CONFIG = [
  { key: "right_hand", label: "Right Hand", fallback: "/assets/icons/ui/ui_01_weapon_slot_glyph.webp" },
  { key: "left_hand", label: "Left Hand", fallback: "/assets/icons/ui/ui_02_shield_slot_glyph.webp" },
  { key: "body", label: "Body Armor", fallback: "/assets/icons/ui/ui_04_body_armor_slot_glyph.webp" },
  { key: "head", label: "Helmet", fallback: "/assets/icons/ui/ui_03_helmet_slot_glyph.webp" },
  { key: "accessory", label: "Class Accessory", fallback: "/assets/icons/ui/ui_05_accessory_slot_glyph.webp" },
];

const state = {
  items: [],
  itemsById: {},
  spells: [],
  runestoneData: null,
  runestoneIcons: [],
  runestonesBag: [],
  quests: [],
  worldLocations: [],
  activeTab: "party",
  partyOrder: ["valen", "ellowyn", "orin", "harlan"],
  selectedHeroId: "valen",
  level: 1,
  hpPctPreview: 100,
  silver: 1450,
  spentAttrs: {}, // heroId -> { force, finesse, grit, arcana, presence } (extra points added over base 1)
  equippedByHero: {},
  socketsByHero: {}, // heroId -> { weapon: runestoneObj|null, armor: runestoneObj|null }
  learnedSpellIds: new Set(),
  pinnedSpellsByHero: {},
  bagCounts: {}, // itemId -> count
  bagFilter: "all", // all | potions | runestones | gear | trade_goods | keys
  bagSort: "category", // category | step_desc | value_desc | name_asc | usable
  bagSearch: "",
  selectedBagEntry: null, // { kind: "item"|"runestone", id: string }
  gearSubTab: "gear", // gear | runestones
  journalFilter: "active", // active | portals | chains | hunts | bestiary
  activeQuestIds: [],
  sealedPortals: new Set(),
  atlasMapId: "map_01",
  atlasCache: {},
};

const elStats = document.getElementById("studioStats");
const elTabs = document.getElementById("ledgerTabs");
const elBody = document.getElementById("ledgerBody");
const elPurse = document.getElementById("pursePill");
const elPartyLvl = document.getElementById("partyLvlPill");
const elConfirmBackdrop = document.getElementById("confirmModalBackdrop");
const elConfirmTitle = document.getElementById("confirmTitle");
const elConfirmMsg = document.getElementById("confirmMessage");
const btnConfirmCancel = document.getElementById("btnConfirmCancel");
const btnConfirmProceed = document.getElementById("btnConfirmProceed");
const elToast = document.getElementById("toastBanner");

let toastTimer = null;
let pendingConfirmAction = null;

function showToast(msg) {
  elToast.textContent = msg;
  elToast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elToast.classList.add("hidden"), 2300);
}

function askConfirm(title, message, onProceed) {
  elConfirmTitle.textContent = title;
  elConfirmMsg.textContent = message;
  pendingConfirmAction = onProceed;
  elConfirmBackdrop.classList.remove("hidden");
}

btnConfirmCancel.addEventListener("click", () => {
  elConfirmBackdrop.classList.add("hidden");
  pendingConfirmAction = null;
});
btnConfirmProceed.addEventListener("click", () => {
  const fn = pendingConfirmAction;
  elConfirmBackdrop.classList.add("hidden");
  pendingConfirmAction = null;
  if (fn) fn();
});

function earnedPointsForLevel(lvl) {
  if (lvl <= 1) return 0;
  let total = (lvl - 1) * 2;
  for (let l = 5; l <= lvl; l += 5) {
    if (l < 100) total += 1;
  }
  return total;
}

function getHeroAttrs(heroId) {
  const spent = state.spentAttrs[heroId] || { force: 0, finesse: 0, grit: 0, arcana: 0, presence: 0 };
  const totalSpent = Object.values(spent).reduce((a, b) => a + b, 0);
  const budget = earnedPointsForLevel(state.level);
  const unspent = Math.max(0, budget - totalSpent);
  return {
    force: 1 + (spent.force || 0),
    finesse: 1 + (spent.finesse || 0),
    grit: 1 + (spent.grit || 0),
    arcana: 1 + (spent.arcana || 0),
    presence: 1 + (spent.presence || 0),
    spent,
    totalSpent,
    unspent,
    budget,
  };
}

function getHeroVitals(heroId) {
  const h = HERO_MAP[heroId];
  const attrs = getHeroAttrs(heroId);
  const eq = state.equippedByHero[heroId] || {};
  let bonusHp = 0;
  let bonusMp = 0;
  let atk = 0;
  let mag = 0;
  let heal = 0;
  let pDef = 0;
  let mDef = 0;
  let speed = 0;
  let crit = 0;

  for (const itemId of Object.values(eq)) {
    const it = itemId ? state.itemsById[itemId] : null;
    if (!it || !it.stats) continue;
    bonusHp += Number(it.stats.maxHp || 0);
    bonusMp += Number(it.stats.maxMp || 0);
    atk += Number(it.stats.attackPower || 0);
    mag += Number(it.stats.magicPower || 0);
    heal += Number(it.stats.healPower || 0);
    pDef += Number(it.stats.physDef || 0);
    mDef += Number(it.stats.magDef || 0);
    speed += Number(it.stats.speedMod || 0);
    crit += Number(it.stats.critBonusPct || 0);
  }

  const maxHp = Math.round(h.baseHp + (state.level - 1) * 18 + (attrs.grit - 1) * 12 + bonusHp);
  const hasMp = h.baseMp > 0 || heroId === "ellowyn" || heroId === "mera" || heroId === "harlan";
  const maxMp = hasMp ? Math.round(h.baseMp + (state.level - 1) * 3 + (attrs.arcana - 1) * 4 + bonusMp) : 0;
  const curHp = Math.max(1, Math.round((maxHp * state.hpPctPreview) / 100));
  const curMp = hasMp ? Math.round((maxMp * Math.min(100, state.hpPctPreview + 20)) / 100) : 0;

  return {
    maxHp,
    curHp,
    maxMp,
    curMp,
    hasMp,
    atk: atk + Math.round((attrs.force - 1) * 1.5),
    mag: mag + Math.round((attrs.arcana - 1) * 1.6),
    heal: heal + Math.round((attrs.presence - 1) * 1.5),
    pDef: pDef + (attrs.grit - 1),
    mDef: mDef + (attrs.presence - 1),
    speed: 10 + speed + (attrs.finesse - 1),
    crit: Math.min(45, 5 + crit + Math.round((attrs.finesse - 1) * 0.4)),
  };
}

function itemSlotFor(item) {
  if (!item) return null;
  if (item.slot) return item.slot;
  if (item.category === "weapon") return "right_hand";
  if (item.category === "shield") return "left_hand";
  if (item.category === "armor") return "body";
  if (item.category === "helm") return "head";
  if (["cloak", "orb", "horn", "quiver", "crystal", "tome"].includes(item.category)) return "accessory";
  return null;
}

function populateDemoState() {
  // Build starter equipment + richer demo bag so all 6 tabs are richly testable immediately
  const firstMatch = (cat, sub, heroId, minStep = 1) =>
    state.items.find(
      (x) =>
        x.category === cat &&
        (!sub || x.subType === sub) &&
        (!heroId || (x.usableBy || []).includes(heroId)) &&
        (x.step || 1) >= minStep
    )?.id;

  state.equippedByHero = {
    valen: {
      right_hand: firstMatch("weapon", "Longsword", "valen", 1),
      left_hand: firstMatch("shield", null, "valen", 1),
      body: firstMatch("armor", null, "valen", 1),
      head: firstMatch("helm", null, "valen", 1),
      accessory: firstMatch("cloak", null, "valen", 1),
    },
    ellowyn: {
      right_hand: firstMatch("weapon", "Quarterstaff", "ellowyn", 1),
      body: firstMatch("armor", null, "ellowyn", 1),
      head: firstMatch("helm", null, "ellowyn", 1),
      accessory: firstMatch("orb", null, "ellowyn", 1),
    },
    orin: {
      right_hand: firstMatch("weapon", "Battleaxe", "orin", 1),
      left_hand: firstMatch("shield", null, "orin", 1),
      body: firstMatch("armor", null, "orin", 1),
      head: firstMatch("helm", null, "orin", 1),
      accessory: firstMatch("horn", null, "orin", 1),
    },
    rowan: {
      right_hand: firstMatch("weapon", "Longbow", "rowan", 1),
      body: firstMatch("armor", null, "rowan", 1),
      head: firstMatch("helm", null, "rowan", 1),
      accessory: firstMatch("quiver", null, "rowan", 1),
    },
    mera: {
      right_hand: firstMatch("weapon", "Scimitar", "mera", 1),
      left_hand: firstMatch("shield", null, "mera", 1),
      body: firstMatch("armor", null, "mera", 1),
      head: firstMatch("helm", null, "mera", 1),
      accessory: firstMatch("crystal", null, "mera", 1),
    },
    harlan: {
      right_hand: firstMatch("weapon", "Mace", "harlan", 1),
      left_hand: firstMatch("shield", null, "harlan", 1),
      body: firstMatch("armor", null, "harlan", 1),
      head: firstMatch("helm", null, "harlan", 1),
      accessory: firstMatch("tome", null, "harlan", 1),
    },
  };

  state.socketsByHero = {
    valen: {
      weapon: { id: "rn_01_lesser_blazing_slate", name: "Lesser Blazing Slate of Alacrity", tier: "Lesser", target: "weapon", affix: "+14% Fire bonus damage + Burn chance · +4 Turn Speed", iconPath: "/assets/icons/runestones/rn_01_lesser_blazing_slate.webp" },
      armor: null,
    },
    ellowyn: { weapon: null, armor: null },
    orin: { weapon: null, armor: null },
    rowan: { weapon: null, armor: null },
    mera: { weapon: null, armor: null },
    harlan: { weapon: null, armor: null },
  };

  const bag = {};
  const addItems = (cat, limit, stepMin = 2, count = 1) => {
    let added = 0;
    for (const it of state.items) {
      if (it.category === cat && (it.step || 1) >= stepMin) {
        bag[it.id] = (bag[it.id] || 0) + count;
        added++;
        if (added >= limit) break;
      }
    }
  };
  addItems("consumable", 8, 1, 3);
  addItems("weapon", 8, 2, 1);
  addItems("armor", 6, 2, 1);
  addItems("helm", 5, 2, 1);
  addItems("shield", 3, 2, 1);
  addItems("trade_good", 7, 1, 2);
  addItems("key_item", 4, 1, 1);
  state.bagCounts = bag;

  const rIcons = state.runestoneIcons;
  const wPfx = state.runestoneData?.weaponPrefixes || [];
  const aPfx = state.runestoneData?.armorPrefixes || [];
  const sfx = state.runestoneData?.universalSuffixes || [];
  const makeStone = (idx, tier, target, pfx, sf) => ({
    id: `demo_rn_${idx}`,
    name: `${tier} ${pfx.name} Runestone ${sf.name}`,
    tier,
    target,
    affix: `${pfx.effect} · ${sf.effect}`,
    iconPath: "/" + (rIcons[idx % rIcons.length]?.iconPath || "assets/icons/runestones/rn_01_lesser_blazing_slate.webp"),
  });

  state.runestonesBag = [
    makeStone(0, "Lesser", "weapon", wPfx[0] || { name: "Blazing", effect: "Bonus Fire damage" }, sfx[0] || { name: "of Alacrity", effect: "+5 Speed" }),
    makeStone(1, "Lesser", "weapon", wPfx[1] || { name: "Glacial", effect: "Bonus Frost damage" }, sfx[1] || { name: "of Precision", effect: "+5% Crit" }),
    makeStone(6, "Refined", "weapon", wPfx[2] || { name: "Arcing", effect: "Bonus Lightning damage" }, sfx[2] || { name: "of Brutality", effect: "+22% Crit Dmg" }),
    makeStone(10, "Greater", "armor", aPfx[0] || { name: "Stalwart", effect: "+Phys Def" }, sfx[4] || { name: "of Vitality", effect: "+140 Max HP" }),
    makeStone(14, "Refined", "armor", aPfx[3] || { name: "Adaptive", effect: "Elemental ward barrier" }, sfx[7] || { name: "of Mending", effect: "+14% Heal Power" }),
  ];

  state.activeQuestIds = state.quests.slice(0, 6).map((q) => q.questId);
  state.spentAttrs = {};

  const seededSpells = new Set();
  for (const casterId of ["ellowyn", "mera", "harlan"]) {
    const owned = state.spells.filter((sp) => (sp.usableBy || []).includes(casterId));
    for (const sp of owned.slice(0, 2)) {
      seededSpells.add(sp.id);
    }
  }
  state.learnedSpellIds = seededSpells;
}

function buildPartyRailHtml() {
  const activeSet = new Set(state.partyOrder);
  const keepHeroes = HEROES.filter((h) => !activeSet.has(h.id));

  const cards = state.partyOrder
    .map((hid, idx) => {
      const h = HERO_MAP[hid];
      const vit = getHeroVitals(hid);
      const attrs = getHeroAttrs(hid);
      const isSel = state.selectedHeroId === hid;
      const hpRatio = Math.round((vit.curHp / vit.maxHp) * 100);
      const hpCls = hpRatio < 25 ? "low" : hpRatio < 50 ? "mid" : "";
      const resolveCls = hpRatio < 25 ? "resolve25" : hpRatio < 50 ? "resolve50" : "";
      return `
        <div class="party-card ${isSel ? "selected" : ""} ${resolveCls}" data-hero="${hid}">
          <div class="slot-badge ${idx === 0 ? "leader" : ""}">${idx === 0 ? "★1" : "#" + (idx + 1)}</div>
          <div class="party-avatar-wrap">
            <img class="party-avatar" src="/assets/portraits/heroes/${hid}_avatar.webp" alt="${h.name}" />
          </div>
          <div class="party-meta">
            <div class="party-name-row">
              <span class="party-name">${h.name}</span>
              ${attrs.unspent > 0 ? `<span class="pts-pill">+${attrs.unspent} Pts</span>` : ""}
            </div>
            <div class="party-class">${h.className} · Lv ${state.level}</div>
            <div class="vitals-stack">
              <div class="bar-row">
                <div class="bar-track"><div class="bar-fill hp ${hpCls}" style="width:${hpRatio}%"></div></div>
                <span>${vit.curHp}/${vit.maxHp}</span>
              </div>
              ${
                vit.hasMp
                  ? `<div class="bar-row">
                      <div class="bar-track"><div class="bar-fill mp" style="width:${Math.round((vit.curMp / vit.maxMp) * 100)}%"></div></div>
                      <span>${vit.curMp}/${vit.maxMp}</span>
                    </div>`
                  : ""
              }
            </div>
          </div>
          <div class="order-btns">
            <button type="button" class="ord-btn" data-act="up" data-idx="${idx}" ${idx === 0 ? "disabled" : ""} title="Move Up">&#9650;</button>
            <button type="button" class="ord-btn" data-act="lead" data-idx="${idx}" ${idx === 0 ? "disabled" : ""} title="Set Slot #1 Leader">&#9733;</button>
            <button type="button" class="ord-btn" data-act="down" data-idx="${idx}" ${idx === state.partyOrder.length - 1 ? "disabled" : ""} title="Move Down">&#9660;</button>
          </div>
        </div>
      `;
    })
    .join("");

  const keepCards = keepHeroes
    .map(
      (h) => `
      <div class="keep-hero">
        <img src="/assets/portraits/heroes/${h.id}_avatar.webp" alt="${h.name}" />
        <div>
          <div class="kname">${h.name}</div>
          <div class="kclass">${h.className}</div>
        </div>
      </div>`
    )
    .join("");

  return `
    <aside class="party-rail">
      ${cards}
      <div class="keep-box">
        <div class="keep-title">Holding Highcrown Keep (2)</div>
        <div class="keep-grid">${keepCards}</div>
      </div>
    </aside>
  `;
}

function wirePartyRailEvents(container) {
  container.querySelectorAll(".party-card").forEach((el) => {
    el.addEventListener("click", (e) => {
      const btn = e.target.closest(".ord-btn");
      if (btn) {
        e.stopPropagation();
        const idx = Number(btn.dataset.idx);
        const act = btn.dataset.act;
        const arr = [...state.partyOrder];
        if (act === "up" && idx > 0) {
          [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
        } else if (act === "down" && idx < arr.length - 1) {
          [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
        } else if (act === "lead" && idx > 0) {
          const [picked] = arr.splice(idx, 1);
          arr.unshift(picked);
        }
        state.partyOrder = arr;
        renderBody();
        return;
      }
      state.selectedHeroId = el.dataset.hero;
      renderBody();
    });
  });
}

function renderPartyStatsTab() {
  const hid = state.selectedHeroId;
  const h = HERO_MAP[hid];
  const attrs = getHeroAttrs(hid);
  const vit = getHeroVitals(hid);
  const hpStateIdx = state.hpPctPreview < 25 ? 4 : state.hpPctPreview < 50 ? 3 : state.hpPctPreview < 75 ? 2 : 1;

  const attrCards = ATTRS.map((a) => {
    const val = attrs[a.key];
    const isFocus = h.focus.includes(a.key);
    const spentVal = attrs.spent[a.key] || 0;
    return `
      <div class="attr-card ${isFocus ? "focus" : ""}">
        <span class="attr-lbl">${a.label}</span>
        <span class="attr-val">${val}</span>
        <span class="attr-hint">${a.hint}</span>
        <div class="attr-btns">
          <button type="button" class="pt-btn" data-stat="${a.key}" data-delta="-1" ${spentVal <= 0 ? "disabled" : ""}>-</button>
          <button type="button" class="pt-btn" data-stat="${a.key}" data-delta="1" ${attrs.unspent <= 0 ? "disabled" : ""}>+1</button>
          <button type="button" class="pt-btn" data-stat="${a.key}" data-delta="5" ${attrs.unspent < 5 ? "disabled" : ""}>+5</button>
        </div>
      </div>
    `;
  }).join("");

  const unlockedDisciplineTiers = [1, 10, 20, 30, 40, 50, 60, 70, 80, 90].filter((lv) => state.level >= lv).length;

  const rightHtml = `
    <section class="right-pane">
      <div class="hero-banner">
        <div class="hero-banner-left">
          <img class="hero-big-avatar" src="/assets/portraits/heroes/${hid}_avatar.webp" alt="${h.name}" />
          <div>
            <h2>${h.name} · ${h.className}</h2>
            <div class="hero-sub">${h.shortTag} · Focus: <strong style="color:#fae2aa;">${h.focusLabel}</strong></div>
            <div class="hero-sub" style="margin-top:4px;color:#cdd6e6;">${h.bio}</div>
          </div>
        </div>
        <img class="hero-token-preview" src="/assets/tokens/heroes/${hid}_hp${hpStateIdx}.webp" title="Overworld / Battle Token State" alt="" />
      </div>

      <div class="stat-spend-head">
        <span>Attributes (<strong style="color:#fae2aa;">${attrs.unspent}</strong> unspent points · Budget ${attrs.totalSpent}/${attrs.budget})</span>
        <button type="button" class="subpill" id="btnResetHeroPts" ${attrs.totalSpent <= 0 ? "disabled" : ""}>Reset Hero Points</button>
      </div>
      <div class="attr-grid">${attrCards}</div>

      <div class="derived-grid">
        <div class="derived-box"><span>Attack</span><strong>${vit.atk}</strong></div>
        <div class="derived-box"><span>Spell Mod</span><strong>${vit.mag}</strong></div>
        <div class="derived-box"><span>Phys Def</span><strong>${vit.pDef}</strong></div>
        <div class="derived-box"><span>Magic Def</span><strong>${vit.mDef}</strong></div>
        <div class="derived-box"><span>Turn Speed</span><strong>${vit.speed}</strong></div>
        <div class="derived-box"><span>Crit %</span><strong>${vit.crit}%</strong></div>
        <div class="derived-box"><span>Heal Mod</span><strong>${vit.heal}</strong></div>
        <div class="derived-box"><span>Map Slot</span><strong>${state.partyOrder[0] === hid ? "Leader (#1)" : "Slot #" + (state.partyOrder.indexOf(hid) + 1)}</strong></div>
      </div>

      <div class="resolve-card ${state.hpPctPreview < 50 ? "active" : ""}">
        <strong style="color:#fae2aa;">Resolve Passives:</strong>
        <div style="margin-top:3px;">${state.hpPctPreview < 50 ? "● ACTIVE: " : ""}${h.wounded50}</div>
        <div>${state.hpPctPreview < 25 ? "● ACTIVE: " : ""}${h.wounded25}</div>
      </div>

      <div class="resolve-card">
        <strong style="color:#fae2aa;">Arcanist Discipline Perks (${unlockedDisciplineTiers}/10 Tiers at Lv ${state.level}):</strong>
        <div style="margin-top:3px;color:#cdd6e6;">Choose 1 of 2 Body, Mind, or Spirit training perks every 10 levels (<strong>Lv 1, 10, 20, 30, 40, 50, 60, 70, 80, 90</strong>) — manage all 120 cards in <a href="/admin/disciplines/" style="color:#8dc4ff;">/admin/disciplines/</a>.</div>
      </div>
    </section>
  `;

  elBody.innerHTML = `<div class="split-with-party">${buildPartyRailHtml()}${rightHtml}</div>`;
  wirePartyRailEvents(elBody);

  elBody.querySelectorAll(".pt-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const k = btn.dataset.stat;
      const d = Number(btn.dataset.delta);
      const curAttrs = getHeroAttrs(hid);
      const curSpent = { ...(state.spentAttrs[hid] || { force: 0, finesse: 0, grit: 0, arcana: 0, presence: 0 }) };
      if (d > 0 && curAttrs.unspent >= d) curSpent[k] = (curSpent[k] || 0) + d;
      if (d < 0 && curSpent[k] >= Math.abs(d)) curSpent[k] += d;
      state.spentAttrs[hid] = curSpent;
      renderBody();
    });
  });

  const btnRst = elBody.querySelector("#btnResetHeroPts");
  if (btnRst) {
    btnRst.addEventListener("click", () => {
      state.spentAttrs[hid] = { force: 0, finesse: 0, grit: 0, arcana: 0, presence: 0 };
      renderBody();
    });
  }
}

function summarizeItemStats(it) {
  if (!it || !it.stats) return it?.effect || "";
  const parts = [];
  if (it.stats.attackPower) parts.push(`Atk +${it.stats.attackPower}`);
  if (it.stats.magicPower) parts.push(`Spell +${it.stats.magicPower}`);
  if (it.stats.healPower) parts.push(`Heal +${it.stats.healPower}`);
  if (it.stats.physDef) parts.push(`P.Def +${it.stats.physDef}`);
  if (it.stats.magDef) parts.push(`M.Def +${it.stats.magDef}`);
  if (it.stats.speedMod) parts.push(`Spd ${it.stats.speedMod > 0 ? "+" : ""}${it.stats.speedMod}`);
  return parts.join(" · ") || it.subType;
}

function equipBagItemOnHero(hid, item) {
  const slot = itemSlotFor(item);
  if (!slot) return;
  const heroEq = { ...(state.equippedByHero[hid] || {}) };
  if (slot === "right_hand" && item.handed === "2H" && heroEq.left_hand) {
    state.bagCounts[heroEq.left_hand] = (state.bagCounts[heroEq.left_hand] || 0) + 1;
    delete heroEq.left_hand;
  }
  if (slot === "left_hand" && heroEq.right_hand && state.itemsById[heroEq.right_hand]?.handed === "2H") {
    state.bagCounts[heroEq.right_hand] = (state.bagCounts[heroEq.right_hand] || 0) + 1;
    delete heroEq.right_hand;
  }
  const prevId = heroEq[slot];
  if (prevId) {
    state.bagCounts[prevId] = (state.bagCounts[prevId] || 0) + 1;
  }
  heroEq[slot] = item.id;
  state.equippedByHero[hid] = heroEq;
  state.bagCounts[item.id] = Math.max(0, (state.bagCounts[item.id] || 1) - 1);
  if (state.bagCounts[item.id] === 0) delete state.bagCounts[item.id];
  showToast(`${HERO_MAP[hid].name} equipped ${item.name}.`);
  renderBody();
}

function socketRunestoneOnHero(hid, stone) {
  const slotKey = stone.target; // "weapon" | "armor"
  const sockets = { ...(state.socketsByHero[hid] || { weapon: null, armor: null }) };
  const existing = sockets[slotKey];
  const doSocket = () => {
    sockets[slotKey] = stone;
    state.socketsByHero[hid] = sockets;
    state.runestonesBag = state.runestonesBag.filter((r) => r.id !== stone.id);
    showToast(`Socketed ${stone.name} into ${HERO_MAP[hid].name}'s ${slotKey === "weapon" ? "Weapon" : "Body Armor"}.`);
    renderBody();
  };
  if (existing) {
    askConfirm(
      "Overwrite Socketed Runestone?",
      `${HERO_MAP[hid].name}'s ${slotKey === "weapon" ? "Weapon" : "Body Armor"} already holds "${existing.name}". Socketing "${stone.name}" will permanently destroy the previous Runestone.`,
      doSocket
    );
  } else {
    doSocket();
  }
}

function renderGearRunestonesTab() {
  const hid = state.selectedHeroId;
  const h = HERO_MAP[hid];
  const eq = state.equippedByHero[hid] || {};
  const sockets = state.socketsByHero[hid] || { weapon: null, armor: null };
  const rightHandItem = eq.right_hand ? state.itemsById[eq.right_hand] : null;
  const rightHand2H = rightHandItem?.handed === "2H";

  const slotCards = SLOT_CONFIG.map((s) => {
    const isSharedLeft2H = s.key === "left_hand" && rightHand2H;
    const curId = isSharedLeft2H ? eq.right_hand : eq[s.key];
    const it = curId ? state.itemsById[curId] : null;
    const hasSocket = s.key === "right_hand" || s.key === "body";
    const sk = s.key === "right_hand" ? "weapon" : "armor";
    const curStone = hasSocket ? sockets[sk] : null;

    const socketInlineHtml = hasSocket
      ? `
        <div class="slot-socket-inline ${curStone ? "" : "empty"}">
          <div class="socket-mini-icon">
            <img src="${curStone ? curStone.iconPath : "/assets/icons/ui/ui_17_runestone_glyph.webp"}" alt="" />
          </div>
          <div class="socket-inline-meta">
            <div class="socket-inline-name">${curStone ? `Runestone Socket: ${curStone.name}` : "Empty Runestone Socket"}</div>
            <div class="socket-inline-affix">${curStone ? curStone.affix : "Pick a Runestone on the right to socket permanently into this slot."}</div>
          </div>
        </div>
      `
      : "";

    const removeKey = isSharedLeft2H ? "right_hand" : s.key;
    const kickerSuffix = isSharedLeft2H ? " · 2-Handed (Both Hands)" : "";
    const itemStatsLine = isSharedLeft2H
      ? "Held in both Right & Left Hands"
      : it
        ? summarizeItemStats(it)
        : "Empty — pick an item from your bag";

    return `
      <div class="slot-card">
        <div class="slot-main-row">
          <div class="slot-icon-box">
            <img src="${it ? "/" + it.iconPath : s.fallback}" alt="" />
          </div>
          <div class="slot-info">
            <div class="slot-kicker">${s.label}${kickerSuffix}</div>
            <div class="slot-item-name">${it ? it.name : "Empty Slot"}</div>
            <div class="slot-item-stats">${itemStatsLine}</div>
          </div>
          ${it ? `<button type="button" class="rpg-btn secondary" data-unequip="${removeKey}">Remove</button>` : ""}
        </div>
        ${socketInlineHtml}
      </div>
    `;
  }).join("");

  let pickerListHtml = "";
  if (state.gearSubTab === "gear") {
    const compatItems = Object.entries(state.bagCounts)
      .filter(([id, cnt]) => cnt > 0)
      .map(([id, cnt]) => ({ it: state.itemsById[id], cnt }))
      .filter(({ it }) => it && itemSlotFor(it) && (it.usableBy || []).includes(hid));
    pickerListHtml =
      compatItems.length === 0
        ? `<div style="color:#8f9bb0;font-size:12px;padding:12px;">No compatible spare equipment in bag for ${h.name}.</div>`
        : compatItems
            .map(
              ({ it, cnt }) => `
            <div class="bag-row">
              <img src="/${it.iconPath}" alt="" />
              <div class="slot-info">
                <div class="slot-item-name">${it.name} ${cnt > 1 ? `×${cnt}` : ""}</div>
                <div class="slot-item-stats">Step ${it.step || 1} · ${summarizeItemStats(it)}</div>
              </div>
              <button type="button" class="rpg-btn" data-equip-id="${it.id}">Equip</button>
            </div>`
            )
            .join("");
  } else {
    pickerListHtml =
      state.runestonesBag.length === 0
        ? `<div style="color:#8f9bb0;font-size:12px;padding:12px;">No Runestones in bag. Click "Refill Demo Pack" above to test more.</div>`
        : state.runestonesBag
            .map(
              (rn) => `
            <div class="bag-row">
              <img src="${rn.iconPath}" alt="" />
              <div class="slot-info">
                <div class="slot-item-name" style="color:#e6dcff;">${rn.name}</div>
                <div class="slot-item-stats">${rn.target === "weapon" ? "Fits Weapon" : "Fits Body Armor"} · ${rn.affix}</div>
              </div>
              <button type="button" class="rpg-btn" data-socket-id="${rn.id}">Socket</button>
            </div>`
            )
            .join("");
  }

  const rightHtml = `
    <section class="right-pane">
      <div class="hero-banner" style="padding-bottom:8px;">
        <div class="hero-banner-left">
          <img class="hero-big-avatar" style="width:48px;height:48px;" src="/assets/portraits/heroes/${hid}_avatar.webp" alt="" />
          <div>
            <h2>${h.name}'s Equipment &amp; Sockets</h2>
            <div class="hero-sub">5 Equipment Slots + Permanent Carved Runestones (overwrites previous stone)</div>
          </div>
        </div>
      </div>
      <div class="gear-split">
        <div class="paper-doll">${slotCards}</div>
        <div class="bag-picker">
          <div class="subtab-bar">
            <button type="button" class="subpill ${state.gearSubTab === "gear" ? "active" : ""}" data-gsub="gear">Compatible Gear in Bag</button>
            <button type="button" class="subpill ${state.gearSubTab === "runestones" ? "active" : ""}" data-gsub="runestones">Carved Runestones (${state.runestonesBag.length})</button>
          </div>
          <div class="picker-scroll">${pickerListHtml}</div>
        </div>
      </div>
    </section>
  `;

  elBody.innerHTML = `<div class="split-with-party">${buildPartyRailHtml()}${rightHtml}</div>`;
  wirePartyRailEvents(elBody);

  elBody.querySelectorAll("[data-gsub]").forEach((b) =>
    b.addEventListener("click", () => {
      state.gearSubTab = b.dataset.gsub;
      renderBody();
    })
  );
  elBody.querySelectorAll("[data-unequip]").forEach((b) =>
    b.addEventListener("click", () => {
      const slot = b.dataset.unequip;
      const curId = state.equippedByHero[hid]?.[slot];
      if (!curId) return;
      state.bagCounts[curId] = (state.bagCounts[curId] || 0) + 1;
      delete state.equippedByHero[hid][slot];
      renderBody();
    })
  );
  elBody.querySelectorAll("[data-equip-id]").forEach((b) =>
    b.addEventListener("click", () => {
      const it = state.itemsById[b.dataset.equipId];
      if (it) equipBagItemOnHero(hid, it);
    })
  );
  elBody.querySelectorAll("[data-socket-id]").forEach((b) =>
    b.addEventListener("click", () => {
      const rn = state.runestonesBag.find((r) => r.id === b.dataset.socketId);
      if (rn) socketRunestoneOnHero(hid, rn);
    })
  );
}

function renderWeaponsSpellsTab() {
  const hid = state.selectedHeroId;
  const h = HERO_MAP[hid];
  const eq = state.equippedByHero[hid] || {};
  const wpn = eq.right_hand ? state.itemsById[eq.right_hand] : null;
  const modes = (wpn && WEAPON_MODES[wpn.subType]) || ["Quick Strike", "Heavy Strike"];
  const canCast = hid === "ellowyn" || hid === "mera" || hid === "harlan";
  const heroSpells = state.spells.filter(
    (sp) => (sp.usableBy || []).includes(hid) && state.learnedSpellIds.has(sp.id)
  );
  const pinned = state.pinnedSpellsByHero[hid] || new Set(heroSpells.slice(0, 4).map((s) => s.id));

  const spellsSection = !canCast
    ? `<div class="resolve-card">
        <strong style="color:#fae2aa;">Martial Specialist (${h.className})</strong>
        <div style="margin-top:4px;">${h.name} fights without MP—combining equipped weapon attack modes with Arcanist Discipline perks, Runestones, and Resolve bonuses.</div>
      </div>`
    : heroSpells.length === 0
      ? `<div class="resolve-card">
          <strong style="color:#fae2aa;">Learned Spells (0)</strong>
          <div style="margin-top:4px;">No spells learned yet. Visit a Town Magic Shop to learn spells.</div>
        </div>`
      : `
        <div style="font-size:11.5px;font-weight:700;color:#fae2aa;">Learned Spells (${heroSpells.length})</div>
        <div class="picker-scroll" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:7px;">
          ${heroSpells
            .map((sp) => {
              const isPinned = pinned.has(sp.id);
              return `
                <div class="bag-row">
                  <img src="/${sp.iconPath}" alt="" />
                  <div class="slot-info">
                    <div class="slot-item-name">${sp.name} <span style="font-size:10px;color:#7cb7ff;">(${sp.mpCost} MP)</span></div>
                    <div class="slot-item-stats">${sp.subType} · ${sp.damageType}</div>
                    <div class="slot-item-stats" style="color:#b8c4d8;">${sp.effect}</div>
                  </div>
                  <button type="button" class="subpill ${isPinned ? "active" : ""}" data-pin-spell="${sp.id}">${isPinned ? "Slotted" : "Slot"}</button>
                </div>`;
            })
            .join("")}
        </div>
      `;

  const rightHtml = `
    <section class="right-pane">
      <div class="hero-banner">
        <div class="hero-banner-left">
          <img class="hero-big-avatar" style="width:52px;height:52px;" src="/assets/portraits/heroes/${hid}_avatar.webp" alt="" />
          <div>
            <h2>${h.name}'s Weapon Attacks &amp; Spells</h2>
            <div class="hero-sub">Active Weapon: <strong style="color:#fae2aa;">${wpn ? wpn.name : "None"}</strong> (${wpn?.damageType || "Physical"})</div>
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div class="slot-card">
          <div class="slot-icon-box"><img src="${wpn ? "/" + wpn.iconPath : "/assets/icons/ui/ui_01_weapon_slot_glyph.webp"}" alt="" /></div>
          <div class="slot-info">
            <div class="slot-kicker">0 MP Attack Mode A</div>
            <div class="slot-item-name">${modes[0]}</div>
            <div class="slot-item-stats">Fast ${wpn?.damageType || "Physical"} strike keeping turn order sharp.</div>
          </div>
        </div>
        <div class="slot-card">
          <div class="slot-icon-box"><img src="${wpn ? "/" + wpn.iconPath : "/assets/icons/ui/ui_01_weapon_slot_glyph.webp"}" alt="" /></div>
          <div class="slot-info">
            <div class="slot-kicker">0 MP Attack Mode B</div>
            <div class="slot-item-name">${modes[1]}</div>
            <div class="slot-item-stats">Heavy ${wpn?.damageType || "Physical"} hit with stronger Guard damage.</div>
          </div>
        </div>
      </div>

      ${spellsSection}
    </section>
  `;

  elBody.innerHTML = `<div class="split-with-party">${buildPartyRailHtml()}${rightHtml}</div>`;
  wirePartyRailEvents(elBody);

  elBody.querySelectorAll("[data-pin-spell]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sid = btn.dataset.pinSpell;
      const set = new Set(pinned);
      if (set.has(sid)) set.delete(sid);
      else set.add(sid);
      state.pinnedSpellsByHero[hid] = set;
      renderBody();
    });
  });
}

function consumableSignature(it) {
  const statsSig = it.stats ? JSON.stringify(Object.entries(it.stats).sort(([a], [b]) => a.localeCompare(b))) : "";
  return `${it.category}|${it.subType || ""}|${it.effect || ""}|${statsSig}`;
}

function getAllBagEntries() {
  const entries = [];
  const mergedConsumables = new Map();

  for (const [id, cnt] of Object.entries(state.bagCounts)) {
    if (cnt <= 0) continue;
    const it = state.itemsById[id];
    if (!it) continue;
    let group = "gear";
    if (it.category === "consumable") group = "potions";
    else if (it.category === "trade_good") group = "trade_goods";
    else if (it.category === "key_item") group = "keys";

    if (group === "potions") {
      const sig = consumableSignature(it);
      if (mergedConsumables.has(sig)) {
        const prev = mergedConsumables.get(sig);
        prev.count += cnt;
        prev.sourceIds.push(id);
        continue;
      }
      const entry = {
        kind: "item",
        id: it.id,
        sourceIds: [id],
        name: it.name,
        group,
        subType: it.subType || it.category,
        tierNum: Number(it.step || it.region || 1),
        silver: Number(it.sellSilver || Math.round((it.priceSilver || 10) * 0.4)),
        count: cnt,
        iconPath: "/" + it.iconPath,
        item: it,
      };
      mergedConsumables.set(sig, entry);
      entries.push(entry);
      continue;
    }

    entries.push({
      kind: "item",
      id: it.id,
      sourceIds: [id],
      name: it.name,
      group,
      subType: it.subType || it.category,
      tierNum: Number(it.step || it.region || 1),
      silver: Number(it.sellSilver || Math.round((it.priceSilver || 10) * 0.4)),
      count: cnt,
      iconPath: "/" + it.iconPath,
      item: it,
    });
  }
  for (const rn of state.runestonesBag) {
    const tierMap = { Lesser: 1, Refined: 2, Greater: 3, Mythic: 4 };
    entries.push({
      kind: "runestone",
      id: rn.id,
      name: rn.name,
      group: "runestones",
      subType: `${rn.tier} (${rn.target === "weapon" ? "Weapon" : "Armor"})`,
      tierNum: tierMap[rn.tier] || 1,
      silver: 0,
      count: 1,
      iconPath: rn.iconPath,
      runestone: rn,
    });
  }

  const filtered = entries.filter((e) => {
    if (state.bagFilter !== "all" && e.group !== state.bagFilter) return false;
    if (state.bagSort === "usable" && e.kind === "item" && e.item.usableBy && !e.item.usableBy.includes(state.selectedHeroId)) {
      return false;
    }
    if (state.bagSearch.trim()) {
      const q = state.bagSearch.trim().toLowerCase();
      if (!e.name.toLowerCase().includes(q) && !e.subType.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    if (state.bagSort === "value_desc") return b.silver - a.silver || a.name.localeCompare(b.name);
    if (state.bagSort === "step_desc") return b.tierNum - a.tierNum || a.name.localeCompare(b.name);
    if (state.bagSort === "name_asc") return a.name.localeCompare(b.name);
    return a.group.localeCompare(b.group) || b.tierNum - a.tierNum || a.name.localeCompare(b.name);
  });

  return filtered;
}

function renderInventoryBagTab() {
  const entries = getAllBagEntries();
  if (!state.selectedBagEntry || !entries.some((e) => e.id === state.selectedBagEntry.id)) {
    state.selectedBagEntry = entries[0] ? { kind: entries[0].kind, id: entries[0].id } : null;
  }
  const activeEntry = state.selectedBagEntry ? entries.find((e) => e.id === state.selectedBagEntry.id) : null;

  const tradeTotal = entries
    .filter((e) => e.group === "trade_goods")
    .reduce((sum, e) => sum + e.silver * e.count, 0);

  let detailHtml = `<div class="right-pane" style="justify-content:center;align-items:center;color:#8e9bb0;">Select any item in your bag to inspect or use it.</div>`;
  if (activeEntry) {
    const heroChoices = state.partyOrder
      .map((hid) => HERO_MAP[hid])
      .map((h) => `<option value="${h.id}" ${h.id === state.selectedHeroId ? "selected" : ""}>${h.name} (${h.className})</option>`)
      .join("");

    let actionBlock = "";
    if (activeEntry.group === "potions") {
      actionBlock = `
        <div style="font-size:11px;color:#9fb0c8;margin-top:4px;">Same-stat consumables merge into one unlimited stack.</div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px;">
          <select id="selPotionHero" class="ctrl-select">${heroChoices}</select>
          <button type="button" class="rpg-btn" id="btnUsePotion">Use on Hero</button>
          <button type="button" class="rpg-btn secondary" id="btnStack50Potion">+50 to Stack</button>
        </div>
      `;
    } else if (activeEntry.group === "gear") {
      const compat = activeEntry.item.usableBy || [];
      actionBlock = `
        <div style="font-size:11.5px;color:#b8c4d8;">Can be worn by: <strong>${compat.map((id) => HERO_MAP[id]?.name || id).join(", ")}</strong></div>
        <div style="display:flex;gap:8px;align-items:center;margin-top:6px;">
          <select id="selEquipHero" class="ctrl-select">
            ${state.partyOrder
              .filter((hid) => compat.includes(hid))
              .map((hid) => `<option value="${hid}">${HERO_MAP[hid].name}</option>`)
              .join("")}
          </select>
          <button type="button" class="rpg-btn" id="btnEquipFromBag" ${compat.some((id) => state.partyOrder.includes(id)) ? "" : "disabled"}>Equip</button>
        </div>
      `;
    } else if (activeEntry.group === "runestones") {
      actionBlock = `
        <div style="display:flex;gap:8px;align-items:center;margin-top:6px;">
          <select id="selSocketHero" class="ctrl-select">${heroChoices}</select>
          <button type="button" class="rpg-btn" id="btnSocketFromBag">Socket on Hero</button>
        </div>
      `;
    } else if (activeEntry.group === "trade_goods") {
      actionBlock = `<div class="resolve-card">Sell-only loot worth <strong style="color:#fae2aa;">${activeEntry.silver}s</strong> each at any town Trade Goods Buyer (Total Trade Goods in bag: <strong>${tradeTotal.toLocaleString()}s</strong>).</div>`;
    }

    detailHtml = `
      <div class="right-pane">
        <div style="display:flex;gap:12px;align-items:center;border-bottom:1px solid #2b3242;padding-bottom:10px;">
          <img src="${activeEntry.iconPath}" style="width:64px;height:64px;border-radius:7px;border:1px solid #8a703e;background:#0c0f16;object-fit:contain;" alt="" />
          <div>
            <h2 style="margin:0;font-size:16px;color:#fae2aa;">${activeEntry.name}</h2>
            <div style="font-size:12px;color:#9fb0c8;margin-top:2px;">${activeEntry.subType} · In Bag: <strong>×${activeEntry.count}</strong></div>
            ${activeEntry.silver > 0 ? `<div style="font-size:11.5px;color:#e5c372;">Sell Value: ${activeEntry.silver}s</div>` : ""}
          </div>
        </div>
        <div style="font-size:12.5px;color:#d8e0ed;line-height:1.5;">
          ${activeEntry.kind === "runestone" ? activeEntry.runestone.affix : activeEntry.item.effect || summarizeItemStats(activeEntry.item)}
        </div>
        ${actionBlock}
      </div>
    `;
  }

  const filterPills = [
    ["all", "All"],
    ["potions", "Potions"],
    ["runestones", "Runestones"],
    ["gear", "Gear"],
    ["trade_goods", "Trade Goods"],
    ["keys", "Key Items"],
  ]
    .map(([fid, flbl]) => `<button type="button" class="subpill ${state.bagFilter === fid ? "active" : ""}" data-bf="${fid}">${flbl}</button>`)
    .join("");

  elBody.innerHTML = `
    <div class="bag-workspace">
      <div class="bag-left">
        <div class="bag-controls">
          <div class="subtab-bar">${filterPills}</div>
          <div style="display:flex;gap:6px;align-items:center;">
            <input type="text" id="inpBagSearch" class="bag-search" placeholder="Search bag..." value="${state.bagSearch}" />
            <select id="selBagSort" class="ctrl-select">
              <option value="category" ${state.bagSort === "category" ? "selected" : ""}>Sort: Category</option>
              <option value="step_desc" ${state.bagSort === "step_desc" ? "selected" : ""}>Sort: Highest Tier</option>
              <option value="value_desc" ${state.bagSort === "value_desc" ? "selected" : ""}>Sort: Silver Value</option>
              <option value="name_asc" ${state.bagSort === "name_asc" ? "selected" : ""}>Sort: Name A–Z</option>
              <option value="usable" ${state.bagSort === "usable" ? "selected" : ""}>Filter: Usable by ${HERO_MAP[state.selectedHeroId].name}</option>
            </select>
          </div>
        </div>
        <div class="bag-grid">
          ${
            entries.length === 0
              ? `<div style="color:#8f9bb0;font-size:12.5px;padding:12px;">No matching items in bag.</div>`
              : entries
                  .map(
                    (e) => `
                  <div class="inv-tile ${activeEntry?.id === e.id ? "active" : ""}" data-bag-id="${e.id}" data-bag-kind="${e.kind}">
                    <img src="${e.iconPath}" alt="" />
                    <div class="inv-meta">
                      <div class="inv-name">${e.name}</div>
                      <div class="inv-sub">×${e.count} · ${e.subType}</div>
                    </div>
                  </div>`
                  )
                  .join("")
          }
        </div>
      </div>
      ${detailHtml}
    </div>
  `;

  elBody.querySelectorAll("[data-bf]").forEach((b) =>
    b.addEventListener("click", () => {
      state.bagFilter = b.dataset.bf;
      renderBody();
    })
  );
  elBody.querySelector("#selBagSort").addEventListener("change", (e) => {
    state.bagSort = e.target.value;
    renderBody();
  });
  const searchEl = elBody.querySelector("#inpBagSearch");
  searchEl.addEventListener("input", (e) => {
    state.bagSearch = e.target.value;
    renderBody();
    const reSearch = document.getElementById("inpBagSearch");
    if (reSearch) {
      reSearch.focus();
      reSearch.setSelectionRange(reSearch.value.length, reSearch.value.length);
    }
  });
  elBody.querySelectorAll("[data-bag-id]").forEach((el) =>
    el.addEventListener("click", () => {
      state.selectedBagEntry = { kind: el.dataset.bagKind, id: el.dataset.bagId };
      renderBody();
    })
  );

  const btnPotion = elBody.querySelector("#btnUsePotion");
  if (btnPotion && activeEntry) {
    btnPotion.addEventListener("click", () => {
      const targetHid = elBody.querySelector("#selPotionHero").value;
      const decId = (activeEntry.sourceIds || [activeEntry.id]).find((sid) => (state.bagCounts[sid] || 0) > 0) || activeEntry.id;
      state.bagCounts[decId] = Math.max(0, (state.bagCounts[decId] || 1) - 1);
      if (state.bagCounts[decId] === 0) delete state.bagCounts[decId];
      state.hpPctPreview = 100;
      document.querySelectorAll("#segHpState .seg-btn").forEach((s) => s.classList.toggle("active", s.dataset.val === "100"));
      showToast(`Used ${activeEntry.name} on ${HERO_MAP[targetHid].name} (HP/Status restored).`);
      renderBody();
    });
  }
  const btnStack50 = elBody.querySelector("#btnStack50Potion");
  if (btnStack50 && activeEntry) {
    btnStack50.addEventListener("click", () => {
      state.bagCounts[activeEntry.id] = (state.bagCounts[activeEntry.id] || 0) + 50;
      showToast(`${activeEntry.name} stack is now ×${state.bagCounts[activeEntry.id]}.`);
      renderBody();
    });
  }
  const btnEquip = elBody.querySelector("#btnEquipFromBag");
  if (btnEquip && activeEntry?.kind === "item") {
    btnEquip.addEventListener("click", () => {
      const targetHid = elBody.querySelector("#selEquipHero").value;
      if (targetHid) equipBagItemOnHero(targetHid, activeEntry.item);
    });
  }
  const btnSock = elBody.querySelector("#btnSocketFromBag");
  if (btnSock && activeEntry?.kind === "runestone") {
    btnSock.addEventListener("click", () => {
      const targetHid = elBody.querySelector("#selSocketHero").value;
      if (targetHid) socketRunestoneOnHero(targetHid, activeEntry.runestone);
    });
  }
}

function renderJournalTab() {
  const portals = state.worldLocations.filter((l) => l.bossInfo);
  const outposts = state.worldLocations.filter((l) => l.id.startsWith("outpost_"));
  const subTabs = [
    ["active", `Active Quests (${state.activeQuestIds.length}/15)`],
    ["portals", `Main Portals (${state.sealedPortals.size}/8)`],
    ["chains", "Story Chains (4)"],
    ["hunts", `Zone Outposts (${outposts.length})`],
    ["bestiary", "Bestiary Preview"],
  ]
    .map(([id, lbl]) => `<button type="button" class="subpill ${state.journalFilter === id ? "active" : ""}" data-jf="${id}">${lbl}</button>`)
    .join("");

  let cardsHtml = "";
  if (state.journalFilter === "active") {
    const activeQs = state.activeQuestIds.map((qid) => state.quests.find((q) => q.questId === qid)).filter(Boolean);
    cardsHtml = activeQs
      .map(
        (q) => `
      <div class="quest-card">
        <img src="/${q.assetPath}" alt="" />
        <div style="flex:1;min-width:0;">
          <div class="slot-item-name">${q.title} <span style="font-size:10.5px;color:#93a3ba;">(${q.levelRange})</span></div>
          <div class="slot-item-stats">${q.hubName} · ${q.giver} · Boss: ${q.miniBoss}</div>
          <div style="font-size:11px;color:#cbd5e6;margin-top:4px;">${q.description}</div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
            <span style="font-size:11px;color:#f4cf80;font-weight:700;">${q.reward}</span>
            <button type="button" class="rpg-btn secondary" data-abandon-q="${q.questId}">Abandon</button>
          </div>
        </div>
      </div>`
      )
      .join("");
  } else if (state.journalFilter === "portals") {
    cardsHtml = portals
      .map((p, i) => {
        const sealed = state.sealedPortals.has(p.id);
        return `
        <div class="quest-card">
          <img src="/${p.assetPath}" alt="" />
          <div style="flex:1;min-width:0;">
            <div class="slot-item-name">Portal #${i + 1}: ${p.name} · ${sealed ? "<span style='color:#72e3a8;'>DESTROYED</span>" : "<span style='color:#f28b95;'>OPEN</span>"}</div>
            <div class="slot-item-stats">Boss: ${p.bossInfo.boss} (${p.bossInfo.plane})</div>
            <div class="slot-item-stats">Catalyst: ${p.catalyst?.name || "Regional Key"} · Weak: ${p.bossInfo.weaknesses}</div>
            <div style="margin-top:6px;">
              <button type="button" class="rpg-btn secondary" data-toggle-portal="${p.id}">${sealed ? "Mark Open" : "Mark Destroyed"}</button>
            </div>
          </div>
        </div>`;
      })
      .join("");
  } else if (state.journalFilter === "chains") {
    const chains = [
      ["Chain A — Mera's Mother Rescue", "Saltwind Harbor -> Port Veridia -> The Gilded Auction Manor -> Free Mera's Mother"],
      ["Chain B — Harlan's Plague Woods Arc", "Briarstead -> Greenwarden Fort -> Blightwatch Keep -> Purge the Spore-Mire"],
      ["Chain C — Crown of Vultures", "Thornwall Castle -> Hollowstone Keep -> Bleakwatch Citadel -> Expose Garrick's War Pact"],
      ["Chain D — Valen & Koren's Legacy", "Millbrook Crossing -> Ashvale Village -> Reclaim Koren's Arena Trophy"],
    ];
    cardsHtml = chains
      .map(
        ([t, d]) => `
      <div class="quest-card">
        <img src="/assets/icons/ui/ui_06_quest_scroll_glyph.webp" style="border-radius:6px;" alt="" />
        <div>
          <div class="slot-item-name">${t}</div>
          <div style="font-size:12px;color:#cfd8e8;margin-top:4px;">${d}</div>
        </div>
      </div>`
      )
      .join("");
  } else if (state.journalFilter === "hunts") {
    cardsHtml = outposts
      .map(
        (o) => `
      <div class="quest-card">
        <img src="/${o.assetPath}" alt="" />
        <div>
          <div class="slot-item-name">${o.name} <span style="color:#9eb0c8;">(${o.levelRange || ""})</span></div>
          <div class="slot-item-stats">${o.playerRegion || o.mapId} · Repeatable Zone Monster Hunt (XP + Silver + Potions)</div>
        </div>
      </div>`
      )
      .join("");
  } else {
    cardsHtml = portals
      .map(
        (p) => `
      <div class="quest-card">
        <img src="/assets/icons/ui/ui_24_bestiary_skull_glyph.webp" style="border-radius:6px;" alt="" />
        <div>
          <div class="slot-item-name">${p.bossInfo.boss}</div>
          <div class="slot-item-stats">${p.bossInfo.plane} · Guard Points: ${p.bossInfo.guardPips}</div>
          <div style="font-size:11.5px;color:#f5cf80;margin-top:4px;">Revealed Weaknesses: ${p.bossInfo.weaknesses}</div>
        </div>
      </div>`
      )
      .join("");
  }

  elBody.innerHTML = `
    <div class="full-pane">
      <div class="subtab-bar">${subTabs}</div>
      <div class="journal-grid">${cardsHtml}</div>
    </div>
  `;

  elBody.querySelectorAll("[data-jf]").forEach((b) =>
    b.addEventListener("click", () => {
      state.journalFilter = b.dataset.jf;
      renderBody();
    })
  );
  elBody.querySelectorAll("[data-abandon-q]").forEach((b) =>
    b.addEventListener("click", () => {
      state.activeQuestIds = state.activeQuestIds.filter((x) => x !== b.dataset.abandonQ);
      renderBody();
    })
  );
  elBody.querySelectorAll("[data-toggle-portal]").forEach((b) =>
    b.addEventListener("click", () => {
      const pid = b.dataset.togglePortal;
      if (state.sealedPortals.has(pid)) state.sealedPortals.delete(pid);
      else state.sealedPortals.add(pid);
      renderBody();
    })
  );
}

function drawAtlasMap(canvas, mapId) {
  const ctx = canvas.getContext("2d");
  const size = 560;
  canvas.width = size;
  canvas.height = size;
  const tileSize = size / 16;

  ctx.fillStyle = "#0b0f17";
  ctx.fillRect(0, 0, size, size);

  if (!state.atlasCache[mapId]) {
    state.atlasCache[mapId] = {};
    for (let r = 0; r < 16; r++) {
      for (let c = 0; c < 16; c++) {
        const key = `${c}_${r}`;
        const img = new Image();
        img.onload = () => {
          state.atlasCache[mapId][key] = img;
          if (state.activeTab === "atlas" && state.atlasMapId === mapId) {
            ctx.drawImage(img, c * tileSize, r * tileSize, tileSize + 0.5, tileSize + 0.5);
            drawAtlasOverlay(ctx, mapId, size);
          }
        };
        img.src = `/assets/maps/${mapId}/tile_${c}_${r}.webp`;
      }
    }
  } else {
    for (let r = 0; r < 16; r++) {
      for (let c = 0; c < 16; c++) {
        const img = state.atlasCache[mapId][`${c}_${r}`];
        if (img) ctx.drawImage(img, c * tileSize, r * tileSize, tileSize + 0.5, tileSize + 0.5);
      }
    }
    drawAtlasOverlay(ctx, mapId, size);
  }
}

function drawAtlasOverlay(ctx, mapId, size) {
  const scale = size / 8192;
  const locs = state.worldLocations.filter((l) => l.placed && l.mapId === mapId && l.x != null && l.y != null);
  for (const l of locs) {
    if (l.category === "quest_field") continue;
    const x = l.x * scale;
    const y = l.y * scale;
    ctx.beginPath();
    if (l.bossInfo) {
      ctx.arc(x, y, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = state.sealedPortals.has(l.id) ? "#59c98d" : "#f25563";
    } else if (l.category === "travel") {
      ctx.arc(x, y, 4.2, 0, Math.PI * 2);
      ctx.fillStyle = "#5ce1e6";
    } else {
      ctx.arc(x, y, 3.6, 0, Math.PI * 2);
      ctx.fillStyle = "#fae2aa";
    }
    ctx.fill();
    ctx.strokeStyle = "#080b10";
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
}

function renderAtlasSystemTab() {
  const mapNames = [
    ["map_01", "Map 1 · Crownlands & Saltmarsh"],
    ["map_02", "Map 2 · Thornwall & Weald"],
    ["map_03", "Map 3 · Sun-Scorched Isles"],
    ["map_04", "Map 4 · Frostbound & Dreadwaste"],
  ];
  const mapBtns = mapNames
    .map(([id, lbl]) => `<button type="button" class="subpill ${state.atlasMapId === id ? "active" : ""}" data-amap="${id}">${lbl}</button>`)
    .join("");

  const locsOnMap = state.worldLocations.filter((l) => l.placed && l.mapId === state.atlasMapId && l.category !== "quest_field");

  elBody.innerHTML = `
    <div class="full-pane">
      <div class="subtab-bar">${mapBtns}</div>
      <div class="atlas-split">
        <div class="atlas-canvas-wrap">
          <canvas id="atlasCanvas"></canvas>
        </div>
        <div class="right-pane">
          <h3 class="font-display" style="margin:0;color:#fae2aa;">Discovered Locations &amp; System</h3>
          <div style="font-size:11.5px;color:#a9b8cf;">Gold = Towns &amp; Outposts · Cyan = Ferries / Ports / Passes · Red = Open Portal</div>
          <div class="picker-scroll" style="max-height:240px;">
            ${locsOnMap
              .map(
                (l) => `
              <div class="mastery-row">
                <strong>${l.name}</strong>
                <span style="color:#96a5bc;">${l.playerKind || l.kind}</span>
              </div>`
              )
              .join("")}
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;padding-top:6px;border-top:1px solid #2b3242;">
            <button type="button" class="rpg-btn" id="btnMockSave">Save Anywhere</button>
            <button type="button" class="rpg-btn secondary" id="btnMockSettings">Audio &amp; Controls</button>
            <button type="button" class="rpg-btn secondary" id="btnMockTitle">Return to Title</button>
          </div>
        </div>
      </div>
    </div>
  `;

  elBody.querySelectorAll("[data-amap]").forEach((b) =>
    b.addEventListener("click", () => {
      state.atlasMapId = b.dataset.amap;
      renderBody();
    })
  );
  const cvs = elBody.querySelector("#atlasCanvas");
  if (cvs) drawAtlasMap(cvs, state.atlasMapId);
  elBody.querySelector("#btnMockSave").addEventListener("click", () => showToast("Saved game cleanly to Manual Save."));
  elBody.querySelector("#btnMockSettings").addEventListener("click", () => showToast("Settings preview: Audio sliders & Controller glyphs ready."));
  elBody.querySelector("#btnMockTitle").addEventListener("click", () => showToast("Would return cleanly to Title Screen."));
}

function renderTabs() {
  elTabs.innerHTML = TABS.map(
    (t) => `
      <button type="button" class="ltab ${state.activeTab === t.id ? "active" : ""}" data-tab="${t.id}">
        <img src="${t.icon}" alt="" />
        <span>${t.label}</span>
      </button>`
  ).join("");
  elTabs.querySelectorAll(".ltab").forEach((b) =>
    b.addEventListener("click", () => {
      state.activeTab = b.dataset.tab;
      renderTabs();
      renderBody();
    })
  );
}

function renderBody() {
  elPurse.textContent = `Silver: ${state.silver.toLocaleString()}s`;
  elPartyLvl.textContent = `Party Lv ${state.level}`;
  if (state.activeTab === "party") renderPartyStatsTab();
  else if (state.activeTab === "gear") renderGearRunestonesTab();
  else if (state.activeTab === "skills") renderWeaponsSpellsTab();
  else if (state.activeTab === "bag") renderInventoryBagTab();
  else if (state.activeTab === "journal") renderJournalTab();
  else if (state.activeTab === "atlas") renderAtlasSystemTab();
}

async function init() {
  const [itemsRes, spellsRes, runesRes, questsRes, worldRes, iconsRes] = await Promise.all([
    fetch("/data/items-catalog.json"),
    fetch("/data/spells-catalog.json"),
    fetch("/data/runestone-affixes.json"),
    fetch("/data/quests-catalog.json"),
    fetch("/data/world-locations.json"),
    fetch("/assets/icons/icons-manifest.json"),
  ]);
  const [itemsData, spellsData, runesData, questsData, worldData, iconsData] = await Promise.all([
    itemsRes.json(),
    spellsRes.json(),
    runesRes.json(),
    questsRes.json(),
    worldRes.json(),
    iconsRes.json(),
  ]);

  state.items = itemsData.items || [];
  state.itemsById = Object.fromEntries(state.items.map((x) => [x.id, x]));
  state.spells = spellsData.spells || [];
  state.runestoneData = runesData;
  state.quests = questsData.quests || [];
  state.worldLocations = worldData.locations || [];
  state.runestoneIcons = (iconsData.icons || []).filter((x) => x.folder === "runestones");

  populateDemoState();
  elStats.textContent = `Loaded ${state.items.length} items · ${state.spells.length} spells · ${state.quests.length} quests · 25 UI glyphs`;

  document.getElementById("selSquad").addEventListener("change", (e) => {
    state.partyOrder = e.target.value.split(",");
    if (!state.partyOrder.includes(state.selectedHeroId)) state.selectedHeroId = state.partyOrder[0];
    renderBody();
  });
  document.getElementById("rngLevel").addEventListener("input", (e) => {
    state.level = Number(e.target.value);
    document.getElementById("lblTestLevel").textContent = String(state.level);
    renderBody();
  });
  document.querySelectorAll("#segHpState .seg-btn").forEach((b) =>
    b.addEventListener("click", () => {
      document.querySelectorAll("#segHpState .seg-btn").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      state.hpPctPreview = Number(b.dataset.val);
      renderBody();
    })
  );
  document.querySelectorAll("#segViewport .seg-btn").forEach((b) =>
    b.addEventListener("click", () => {
      document.querySelectorAll("#segViewport .seg-btn").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      const frame = document.getElementById("ledgerFrame");
      frame.classList.remove("deck", "desktop");
      if (b.dataset.val !== "full") frame.classList.add(b.dataset.val);
    })
  );
  document.getElementById("btnRefillDemo").addEventListener("click", () => {
    populateDemoState();
    showToast("Refilled demo bag, Runestones, Potions & active Quests.");
    renderBody();
  });
  document.getElementById("btnRestInn").addEventListener("click", () => {
    state.hpPctPreview = 100;
    document.querySelectorAll("#segHpState .seg-btn").forEach((x) => x.classList.toggle("active", x.dataset.val === "100"));
    showToast("Free Inn Rest (0s): Party HP & MP fully restored!");
    renderBody();
  });
  document.getElementById("btnMockClose").addEventListener("click", () => showToast("Closes back to World Map in the Game Client."));

  renderTabs();
  renderBody();
}

void init();
