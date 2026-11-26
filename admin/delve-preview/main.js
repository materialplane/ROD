// ROD Admin Suite — 3-Card Stage + Vertically-Draggable Centered Containers

const SAMPLE_FRONTS = [
  { label: "Descending Stairs (Door/Stair)", path: "/assets/ui/dungeons/cards/base_03.webp", isCutout: true },
  { label: "Ascending Stairs (Door/Stair)", path: "/assets/ui/dungeons/cards/base_asc_stairs.webp", isCutout: true },
  { label: "Iron Door (Door/Stair)", path: "/assets/ui/dungeons/cards/base_14.webp", isCutout: true },
  { label: "Stone Door (Door/Stair)", path: "/assets/ui/dungeons/cards/base_stone_door.webp", isCutout: true },
  { label: "Iron Treasure Chest (Loot)", path: "/assets/ui/dungeons/cards/base_01.webp", isCutout: true },
  { label: "Bronze Treasure Chest (Loot)", path: "/assets/ui/dungeons/cards/base_chest_bronze.webp", isCutout: true },
  { label: "Crimson Treasure Chest (Loot)", path: "/assets/ui/dungeons/cards/base_chest_crimson.webp", isCutout: true },
  { label: "Gold Treasure Chest (Loot)", path: "/assets/ui/dungeons/cards/base_chest_gold.webp", isCutout: true },
  { label: "Healing Spring (Respite)", path: "/assets/ui/dungeons/cards/base_04.webp", isCutout: true },
  { label: "Mana Shrine (Respite)", path: "/assets/ui/dungeons/cards/base_07.webp", isCutout: true },
  { label: "Ironward Shrine (Respite)", path: "/assets/ui/dungeons/cards/base_shrine_phys_resist.webp", isCutout: true },
  { label: "Spellward Shrine (Respite)", path: "/assets/ui/dungeons/cards/base_shrine_magic_resist.webp", isCutout: true },
  { label: "Choking Mire Fumes (Trap)", path: "/assets/ui/dungeons/cards/base_12.webp", isCutout: true },
  { label: "Falling Stone (Trap)", path: "/assets/ui/dungeons/cards/base_20.webp", isCutout: true },
  { label: "Floor Spikes (Trap)", path: "/assets/ui/dungeons/cards/base_trap_spikes.webp", isCutout: true },
  { label: "Frost Vents (Trap)", path: "/assets/ui/dungeons/cards/base_trap_frost_rune.webp", isCutout: true },
  { label: "Ambush #1 · Pillars (Combat)", path: "/assets/ui/dungeons/cards/base_ambush_01.webp", isCutout: true },
  { label: "Ambush #2 · Ledge (Combat)", path: "/assets/ui/dungeons/cards/base_ambush_02.webp", isCutout: true },
  { label: "Ambush #3 · Corners (Combat)", path: "/assets/ui/dungeons/cards/base_ambush_03.webp", isCutout: true },
  { label: "Ambush #4 · Haze (Combat)", path: "/assets/ui/dungeons/cards/base_ambush_04.webp", isCutout: true },
];

const ROOM_PRESETS = {
  room_01: {
    name: "Great Hearth Undercroft",
    bgPath: "/assets/maps/dungeons/base_stone_brick/room_01.webp",
    blurb: "Golden light from high courtyard grate-slits slices across an unlit sculpted hearth and tattered crimson banners inside this lower keep undercroft, warmed by blazing wrought-iron braziers across shadowed flagstones.",
  },
  room_02: {
    name: "Chandelier Vault",
    bgPath: "/assets/maps/dungeons/base_stone_brick/room_02.webp",
    blurb: "Set beneath the keep's upper flagstones, a blazing iron chandelier casts warm candlelight over an ancient carved wheel medallion, shadowed stone walls, and cool silver-blue sconces.",
  },
  room_03: {
    name: "Sunken Garden Cistern",
    bgPath: "/assets/maps/dungeons/base_stone_brick/room_03.webp",
    blurb: "Sunlight filters down through a collapsed garden ceiling breach directly overhead, catching creeping ivy vines, a weathered stone fountain basin, and burning bronze wall torches.",
  },
  room_04: {
    name: "Garrison Undercroft",
    bgPath: "/assets/maps/dungeons/base_stone_brick/room_04.webp",
    blurb: "Tucked below the fortress curtain wall, iron weapon racks, scarred bucklers, and tattered black banners line dark stone masonry lit fiercely by twin roaring ember braziers.",
  },
  room_05: {
    name: "Cliffside Statue Vault",
    bgPath: "/assets/maps/dungeons/base_stone_brick/room_05.webp",
    blurb: "Set just inside the ravine cliff-rock below the keep, narrow violet glass slits spill twilight across three weathered statue alcoves beneath hanging iron oil lanterns.",
  },
  room_06: {
    name: "Lower Aqueduct Cistern",
    bgPath: "/assets/maps/dungeons/base_stone_brick/room_06.webp",
    blurb: "Blazing orange sconces catch damp emerald moss seams, an inset carved water cistern, and heavy iron wall chains along this quiet lower aqueduct chamber.",
  },
  room_07: {
    name: "Under-Keep Record Vault",
    bgPath: "/assets/maps/dungeons/base_stone_brick/room_07.webp",
    blurb: "Sheltered beneath the keep's upper floors, tall burning candelabras warm recessed stone shelves stuffed with crumbling leather tomes, cracked clay urns, and scattered oak crates.",
  },
  room_08: {
    name: "Deep Basalt Vault",
    bgPath: "/assets/maps/dungeons/base_stone_brick/room_08.webp",
    blurb: "Set behind heavy dark foundation masonry, stepped basalt pilasters catch high crimson-violet sconce flame and fierce molten amber braziers above forgotten steel blades and cold flagstones.",
  },
  hollowstone: {
    name: "Hollowstone Keep",
    bgPath: "/assets/maps/interiors/loc_13_hollowstone_keep.webp",
    blurb: "Violet light streams through tall stained-glass windows across carved stone arches, wine-purple banners, and creeping vines. Wall torches and low iron braziers warm the shadowed flagstones beside sweeping stone stairs.",
  },
  blightwatch: {
    name: "Blightwatch Keep",
    bgPath: "/assets/maps/interiors/hub_blightwatch_keep.webp",
    blurb: "Fierce amber wall-braziers flare against iron-grated limestone arches and thick cracked pillars while pale violet forest dusk spills through narrow barred windows onto cold granite flags.",
  },
  highcrown: {
    name: "Highcrown Keep",
    bgPath: "/assets/maps/interiors/loc_69_highcrown_keep.webp",
    blurb: "Golden sunset shafts slice through tall leaded windows across sculpted pillars, faded heraldic tapestries, and a carved oak council table lit by flickering candlesticks.",
  },
  blackkeep: {
    name: "Garrick's Black Keep",
    bgPath: "/assets/maps/interiors/loc_40_garricks_black_keep.webp",
    blurb: "Shattered black-basalt arches soar into deep shadow above blazing floor braziers, while cracked crimson-and-violet stained glass casts ominous light across the fractured floor.",
  },
};

const BASALT_BACKS = [
  "/assets/ui/dungeons/backs/back_sigil_01.webp",
  "/assets/ui/dungeons/backs/back_sigil_02.webp",
  "/assets/ui/dungeons/backs/back_sigil_03.webp",
  "/assets/ui/dungeons/backs/back_sigil_04.webp",
];

function pickThreeDistinctBasaltBacks() {
  const pool = [...BASALT_BACKS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}

const state = {
  roomKey: "hollowstone",
  backPath: "random_3_of_4_basalt",
  cardScalePct: 44,
  cardGapPx: 32,
  blurbBottomPct: 74.5,
  cardsBottomPct: 20.5,
  chooseBottomPct: 11.0,
  partyLeftPct: 2.0,
  partyCenterYPct: 50.0,
  showHud: true,
  showGuides: true,
  deckCount: 17,
  flipped: [false, false, false], // All 3 cards start FACE-DOWN!
  slotFronts: [0, 2, 1],
  slotBacks: pickThreeDistinctBasaltBacks(),
  lastDragEndedAt: 0,
  dirty: false,
  saving: false,
};

const elStats = document.getElementById("studioStats");
const elStageViewport = document.getElementById("stageViewport");
const elStage16x9 = document.getElementById("stage16x9");
const elBgImg = document.getElementById("bgImg");
const elMockHud = document.getElementById("mockHud");
const elHudStatusPill = document.getElementById("hudStatusPill");

const elBlurbDragWrap = document.getElementById("blurbDragWrap");
const elCardsDragWrap = document.getElementById("cardsDragWrap");
const elChooseDragWrap = document.getElementById("chooseDragWrap");
const elPartyDragWrap = document.getElementById("partyDragWrap");
const elBlurbYTag = document.getElementById("blurbYTag");
const elCardsYTag = document.getElementById("cardsYTag");
const elChooseYTag = document.getElementById("chooseYTag");
const elPartyPosTag = document.getElementById("partyPosTag");

const elRoomBlurbBox = document.getElementById("roomBlurbBox");
const elRoomBlurbText = document.getElementById("roomBlurbText");
const elFloatingCardsRow = document.getElementById("floatingCardsRow");
const elSlotReadout = document.getElementById("slotReadout");

const selBg = document.getElementById("selBg");
const selBack = document.getElementById("selBack");
const rngCardScale = document.getElementById("rngCardScale");
const rngSpread = document.getElementById("rngSpread");
const lblCardScale = document.getElementById("lblCardScale");
const lblSpread = document.getElementById("lblSpread");

const btnToggleGuides = document.getElementById("btnToggleGuides");
const btnToggleHud = document.getElementById("btnToggleHud");
const btnDealThree = document.getElementById("btnDealThree");
const btnFlipAll = document.getElementById("btnFlipAll");
const btnChooseCard = document.getElementById("btnChooseCard");
const btnFullscreen = document.getElementById("btnFullscreen");
const btnSaveTop = document.getElementById("btnSaveTop");
const btnSaveSide = document.getElementById("btnSaveSide");
const btnResetTuning = document.getElementById("btnResetTuning");
const elToastBanner = document.getElementById("toastBanner");

const frontSelects = [
  document.getElementById("selFront1"),
  document.getElementById("selFront2"),
  document.getElementById("selFront3"),
];

function buildDarkStoneBackMarkup() {
  return `
    <div class="dark-stone-back">
      <div class="dark-stone-inner">
        <div class="basalt-sigil tl" aria-hidden="true">
          <svg viewBox="0 0 32 32" fill="none">
            <path d="M16 4L21 16L16 28L11 16L16 4Z" stroke="#9aa6bc" stroke-width="1.6" />
            <path d="M7 16H25" stroke="#c6a25e" stroke-width="1.3" />
          </svg>
        </div>
        <div class="basalt-sigil tr" aria-hidden="true">
          <svg viewBox="0 0 32 32" fill="none">
            <path d="M19 6A9 9 0 1 0 19 26A7 7 0 1 1 19 6Z" stroke="#9aa6bc" stroke-width="1.6" />
            <circle cx="19" cy="16" r="2.2" fill="#c6a25e" />
          </svg>
        </div>
        <div class="basalt-sigil bl" aria-hidden="true">
          <svg viewBox="0 0 32 32" fill="none">
            <polygon points="16,5 25,24 7,24" stroke="#9aa6bc" stroke-width="1.6" />
            <circle cx="16" cy="18" r="2.4" stroke="#c6a25e" stroke-width="1.3" />
          </svg>
        </div>
        <div class="basalt-sigil br" aria-hidden="true">
          <svg viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="8" stroke="#9aa6bc" stroke-width="1.5" />
            <path d="M16 5V27M5 16H27" stroke="#c6a25e" stroke-width="1.3" />
          </svg>
        </div>
        <div class="dark-stone-emblem">
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="23" stroke="rgba(138, 148, 168, 0.45)" stroke-width="1.5" stroke-dasharray="3 3" />
            <path d="M32 7L36.5 26.5L56 32L36.5 37.5L32 57L27.5 37.5L8 32L27.5 26.5L32 7Z" fill="rgba(164, 174, 194, 0.16)" stroke="#9faabd" stroke-width="1.8" />
            <circle cx="32" cy="32" r="7" fill="rgba(16, 19, 27, 0.96)" stroke="#c7a25c" stroke-width="1.8" />
            <circle cx="32" cy="32" r="2.3" fill="#e6c47e" />
          </svg>
        </div>
      </div>
    </div>
  `;
}

function syncBlurbWidth() {
  const rowWidth = elFloatingCardsRow.offsetWidth;
  if (rowWidth > 40) {
    elRoomBlurbBox.style.width = `${rowWidth}px`;
  }
}

function applyMetrics() {
  elCardsDragWrap.style.setProperty("--card-scale", `${state.cardScalePct}%`);
  elFloatingCardsRow.style.setProperty("--card-gap", `${state.cardGapPx}px`);
  elBlurbDragWrap.style.bottom = `${state.blurbBottomPct.toFixed(1)}%`;
  elCardsDragWrap.style.bottom = `${state.cardsBottomPct.toFixed(1)}%`;
  if (elChooseDragWrap) elChooseDragWrap.style.bottom = `${state.chooseBottomPct.toFixed(1)}%`;
  if (elPartyDragWrap) {
    elPartyDragWrap.style.left = `${state.partyLeftPct.toFixed(1)}%`;
    elPartyDragWrap.style.top = `${state.partyCenterYPct.toFixed(1)}%`;
    elPartyDragWrap.classList.toggle("hidden", !state.showHud);
  }

  elBlurbYTag.textContent = `${state.blurbBottomPct.toFixed(1)}%`;
  elCardsYTag.textContent = `${state.cardsBottomPct.toFixed(1)}%`;
  if (elChooseYTag) elChooseYTag.textContent = `${state.chooseBottomPct.toFixed(1)}%`;
  if (elPartyPosTag) elPartyPosTag.textContent = `${state.partyLeftPct.toFixed(1)}%, ${state.partyCenterYPct.toFixed(1)}%`;

  lblCardScale.textContent = `${state.cardScalePct}%`;
  lblSpread.textContent = `${state.cardGapPx}px`;

  elStage16x9.classList.toggle("hide-guides", !state.showGuides);
  btnToggleGuides.textContent = state.showGuides ? "Hide Move Frames" : "Show Move Frames";
  btnToggleGuides.classList.toggle("active", state.showGuides);

  elMockHud.classList.toggle("hidden", !state.showHud);
  btnToggleHud.textContent = state.showHud ? "Hide Hero HUD" : "Show Hero HUD";
  btnToggleHud.classList.toggle("active", !state.showHud);

  requestAnimationFrame(syncBlurbWidth);
}

function updateReadout() {
  const faceDownCount = state.flipped.filter((v) => !v).length;
  const room = ROOM_PRESETS[state.roomKey] || ROOM_PRESETS.hollowstone;
  elHudStatusPill.textContent = `${state.deckCount} Cards Remaining`;
  elStats.textContent = `${room.name} · Blurb Y: ${state.blurbBottomPct.toFixed(1)}% · Cards Y: ${state.cardsBottomPct.toFixed(1)}% · Btn Y: ${state.chooseBottomPct.toFixed(1)}% · ${faceDownCount}/3 Down`;

  if (btnFlipAll) {
    btnFlipAll.textContent = faceDownCount > 0 ? "Flip 3 Cards" : "Hide 3 Cards";
  }

  elSlotReadout.textContent = [
    `Hero Panel    : ${state.partyLeftPct.toFixed(1)}% L, ${state.partyCenterYPct.toFixed(1)}% Y-ctr`,
    `Blurb Bottom  : ${state.blurbBottomPct.toFixed(1)}% (centered)`,
    `Cards Bottom  : ${state.cardsBottomPct.toFixed(1)}% (centered)`,
    `Button Bottom : ${state.chooseBottomPct.toFixed(1)}% (centered)`,
    `Card Size     : ${state.cardScalePct}% stage height`,
    `Card Gap      : ${state.cardGapPx}px | Equal Blurb Width`,
  ].join("\n");
}

let flipWaveTimers = [];

function clearFlipWave() {
  flipWaveTimers.forEach((id) => clearTimeout(id));
  flipWaveTimers = [];
}

function syncCardFlipState(btn, idx) {
  const isFlipped = Boolean(state.flipped[idx]);
  const frontObj = SAMPLE_FRONTS[state.slotFronts[idx] % SAMPLE_FRONTS.length];
  btn.classList.toggle("is-flipped", isFlipped);
  btn.title = isFlipped ? "Click to turn Face-Down" : `Click to test flip (${frontObj.label})`;
}

function renderCards() {
  clearFlipWave();
  const room = ROOM_PRESETS[state.roomKey] || ROOM_PRESETS.hollowstone;
  elBgImg.src = room.bgPath;
  elRoomBlurbText.textContent = room.blurb;

  elFloatingCardsRow.innerHTML = "";

  for (let idx = 0; idx < 3; idx++) {
    const isFlipped = Boolean(state.flipped[idx]);
    const frontObj = SAMPLE_FRONTS[state.slotFronts[idx] % SAMPLE_FRONTS.length];
    const slotBackPath = state.backPath === "random_3_of_4_basalt"
      ? state.slotBacks[idx]
      : state.backPath;
    const backIsCutout = slotBackPath.startsWith("/assets/ui/dungeons/backs/");
    const backMarkup = slotBackPath === "mock_dark_stone"
      ? buildDarkStoneBackMarkup()
      : `<img src="${slotBackPath}" alt="Face-Down Card" />`;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "float-card-btn";

    btn.innerHTML = `
      <div class="float-card-flipper">
        <div class="float-card-face float-card-back">
          <div class="float-card-frame${backIsCutout ? " is-cutout-card" : ""}">
            ${backMarkup}
          </div>
        </div>
        <div class="float-card-face float-card-front">
          <div class="float-card-frame${frontObj.isCutout ? " is-cutout-card" : ""}">
            <img src="${frontObj.path}" alt="${frontObj.label}" />
          </div>
        </div>
      </div>
    `;
    syncCardFlipState(btn, idx);

    btn.addEventListener("click", () => {
      if (Date.now() - state.lastDragEndedAt < 180) return;
      clearFlipWave();
      state.flipped[idx] = !state.flipped[idx];
      syncCardFlipState(btn, idx);
      updateReadout();
    });
    elFloatingCardsRow.appendChild(btn);
  }

  applyMetrics();
  updateReadout();
}

function attachVerticalDrag(containerEl, stateKey, maxPct = 95, minPct = 0) {
  let active = false;
  let startY = 0;
  let startBottomPct = 0;
  let moved = false;

  const onMove = (e) => {
    if (!active) return;
    const dy = e.clientY - startY;
    if (!moved && Math.abs(dy) >= 8) {
      moved = true;
      containerEl.classList.add("dragging");
    }
    if (!moved) return;

    const stageH = elStage16x9.clientHeight || 720;
    const deltaBottomPct = (-dy / stageH) * 100;
    const clamped = Math.max(minPct, Math.min(maxPct, startBottomPct + deltaBottomPct));
    const nextVal = Math.round(clamped * 2) / 2; // clean 0.5% increments
    if (nextVal !== state[stateKey]) {
      state[stateKey] = nextVal;
      markDirty();
      applyMetrics();
      updateReadout();
    }
  };

  const endDrag = () => {
    if (!active) return;
    active = false;
    containerEl.classList.remove("dragging");
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", endDrag);
    window.removeEventListener("pointercancel", endDrag);
    if (moved) {
      state.lastDragEndedAt = Date.now();
    }
  };

  containerEl.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    active = true;
    moved = false;
    startY = e.clientY;
    startBottomPct = state[stateKey];
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
  });
}

function attachFreeDrag(containerEl, leftKey, centerYKey) {
  if (!containerEl) return;
  let active = false;
  let startX = 0;
  let startY = 0;
  let startLeftPct = 0;
  let startCenterYPct = 0;
  let moved = false;

  const onMove = (e) => {
    if (!active) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (!moved && Math.hypot(dx, dy) >= 6) {
      moved = true;
      containerEl.classList.add("dragging");
    }
    if (!moved) return;

    const stageW = elStage16x9.clientWidth || 1280;
    const stageH = elStage16x9.clientHeight || 720;
    const halfHPct = ((containerEl.offsetHeight / 2) / stageH) * 100;
    const maxLeftPct = Math.max(5, ((stageW - containerEl.offsetWidth) / stageW) * 100);
    const minCenterYPct = Math.min(50, halfHPct + 1);
    const maxCenterYPct = Math.max(50, 100 - halfHPct - 1);

    const nextLeft = Math.round(Math.max(0, Math.min(maxLeftPct, startLeftPct + (dx / stageW) * 100)) * 2) / 2;
    const nextCenterY = Math.round(Math.max(minCenterYPct, Math.min(maxCenterYPct, startCenterYPct + (dy / stageH) * 100)) * 2) / 2;

    if (nextLeft !== state[leftKey] || nextCenterY !== state[centerYKey]) {
      state[leftKey] = nextLeft;
      state[centerYKey] = nextCenterY;
      markDirty();
      applyMetrics();
      updateReadout();
    }
  };

  const endDrag = () => {
    if (!active) return;
    active = false;
    containerEl.classList.remove("dragging");
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", endDrag);
    window.removeEventListener("pointercancel", endDrag);
    if (moved) {
      state.lastDragEndedAt = Date.now();
    }
  };

  containerEl.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    active = true;
    moved = false;
    startX = e.clientX;
    startY = e.clientY;
    startLeftPct = state[leftKey];
    startCenterYPct = state[centerYKey];
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
  });
}

function dealFreshThree() {
  state.deckCount = state.deckCount <= 5 ? 17 : state.deckCount - 3;
  state.flipped = [false, false, false];
  state.slotFronts = state.slotFronts.map((i) => (i + 3) % SAMPLE_FRONTS.length);
  state.slotBacks = pickThreeDistinctBasaltBacks();
  syncFrontPickers();
  renderCards();
}

function populateFrontPickers() {
  frontSelects.forEach((sel, idx) => {
    sel.innerHTML = SAMPLE_FRONTS.map((f, fi) => `<option value="${fi}">${f.label}</option>`).join("");
    sel.value = String(state.slotFronts[idx]);
    sel.addEventListener("change", () => {
      state.slotFronts[idx] = Number(sel.value) || 0;
      renderCards();
    });
  });
}

function syncFrontPickers() {
  frontSelects.forEach((sel, idx) => {
    sel.value = String(state.slotFronts[idx]);
  });
}

let toastTimer = null;

function showToast(message, isError = false) {
  if (!elToastBanner) return;
  elToastBanner.textContent = message;
  elToastBanner.classList.toggle("error", Boolean(isError));
  elToastBanner.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    elToastBanner.classList.add("hidden");
  }, 2400);
}

function syncSaveButtons() {
  const buttons = [btnSaveTop, btnSaveSide].filter(Boolean);
  for (const btn of buttons) {
    btn.disabled = state.saving;
    btn.classList.toggle("dirty", state.dirty);
    if (state.saving) {
      btn.textContent = "Saving...";
    } else if (state.dirty) {
      btn.textContent = "Save Positions *";
    } else {
      btn.textContent = "Save Positions";
    }
  }
}

function markDirty() {
  if (!state.dirty) {
    state.dirty = true;
    syncSaveButtons();
  }
}

async function loadSavedLayout() {
  try {
    const res = await fetch("/api/delve-layout", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    if (typeof data.blurbBottomPct === "number") state.blurbBottomPct = data.blurbBottomPct;
    if (typeof data.cardsBottomPct === "number") state.cardsBottomPct = data.cardsBottomPct;
    if (typeof data.chooseBottomPct === "number") state.chooseBottomPct = data.chooseBottomPct;
    if (typeof data.partyLeftPct === "number") state.partyLeftPct = data.partyLeftPct;
    if (typeof data.partyCenterYPct === "number") state.partyCenterYPct = data.partyCenterYPct;
    if (typeof data.cardScalePct === "number") state.cardScalePct = data.cardScalePct;
    if (typeof data.cardGapPx === "number") state.cardGapPx = data.cardGapPx;
    if (typeof data.roomKey === "string" && ROOM_PRESETS[data.roomKey]) state.roomKey = data.roomKey;
    if (typeof data.backPath === "string") state.backPath = data.backPath;
    if (typeof data.showHud === "boolean") state.showHud = data.showHud;

    selBg.value = state.roomKey;
    selBack.value = state.backPath;
    rngCardScale.value = String(state.cardScalePct);
    rngSpread.value = String(state.cardGapPx);
    state.dirty = false;
  } catch {
    // Keep defaults if layout endpoint is unavailable
  }
}

async function savePositions() {
  if (state.saving) return;
  state.saving = true;
  syncSaveButtons();
  try {
    const res = await fetch("/api/delve-layout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blurbBottomPct: state.blurbBottomPct,
        cardsBottomPct: state.cardsBottomPct,
        chooseBottomPct: state.chooseBottomPct,
        partyLeftPct: state.partyLeftPct,
        partyCenterYPct: state.partyCenterYPct,
        cardScalePct: state.cardScalePct,
        cardGapPx: state.cardGapPx,
        roomKey: state.roomKey,
        backPath: state.backPath,
        showHud: state.showHud,
      }),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast(result.error || "Failed to save positions", true);
      return;
    }
    state.dirty = false;
    showToast(`Saved positions (Blurb ${state.blurbBottomPct.toFixed(1)}% · Cards ${state.cardsBottomPct.toFixed(1)}% · Btn ${state.chooseBottomPct.toFixed(1)}% · Heroes ${state.partyLeftPct.toFixed(1)}%,${state.partyCenterYPct.toFixed(1)}%)`);
  } catch (err) {
    showToast(`Save error: ${String(err)}`, true);
  } finally {
    state.saving = false;
    syncSaveButtons();
  }
}

function bindEvents() {
  attachVerticalDrag(elBlurbDragWrap, "blurbBottomPct", 90, 0);
  attachVerticalDrag(elCardsDragWrap, "cardsBottomPct", 75, 0);
  if (elChooseDragWrap) attachVerticalDrag(elChooseDragWrap, "chooseBottomPct", 94, 0);
  if (elPartyDragWrap) attachFreeDrag(elPartyDragWrap, "partyLeftPct", "partyCenterYPct");

  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(syncBlurbWidth).observe(elFloatingCardsRow);
    new ResizeObserver(syncBlurbWidth).observe(elStage16x9);
  }
  window.addEventListener("resize", syncBlurbWidth);

  selBg.addEventListener("change", () => {
    state.roomKey = selBg.value;
    markDirty();
    renderCards();
  });

  selBack.addEventListener("change", () => {
    state.backPath = selBack.value;
    if (state.backPath === "random_3_of_4_basalt") {
      state.slotBacks = pickThreeDistinctBasaltBacks();
    }
    markDirty();
    renderCards();
  });

  rngCardScale.addEventListener("input", () => {
    state.cardScalePct = Number(rngCardScale.value);
    markDirty();
    applyMetrics();
    updateReadout();
  });

  rngSpread.addEventListener("input", () => {
    state.cardGapPx = Number(rngSpread.value);
    markDirty();
    applyMetrics();
    updateReadout();
  });

  btnToggleGuides.addEventListener("click", () => {
    state.showGuides = !state.showGuides;
    applyMetrics();
  });

  btnToggleHud.addEventListener("click", () => {
    state.showHud = !state.showHud;
    markDirty();
    applyMetrics();
  });

  btnDealThree.addEventListener("click", dealFreshThree);

  btnChooseCard?.addEventListener("click", () => {
    if (Date.now() - state.lastDragEndedAt < 180) return;
    clearFlipWave();
    const nextDownIdx = state.flipped.findIndex((v) => !v);
    if (nextDownIdx !== -1) {
      state.flipped[nextDownIdx] = true;
      const btn = elFloatingCardsRow.children[nextDownIdx];
      if (btn) syncCardFlipState(btn, nextDownIdx);
      updateReadout();
    } else {
      dealFreshThree();
    }
  });

  btnFlipAll.addEventListener("click", () => {
    clearFlipWave();
    const anyDown = state.flipped.some((v) => !v);
    flipWaveTimers = [0, 1, 2].map((idx, order) =>
      setTimeout(() => {
        state.flipped[idx] = anyDown;
        const btn = elFloatingCardsRow.children[idx];
        if (btn) syncCardFlipState(btn, idx);
        updateReadout();
      }, order * 75)
    );
  });

  btnSaveTop?.addEventListener("click", savePositions);
  btnSaveSide?.addEventListener("click", savePositions);

  btnResetTuning.addEventListener("click", () => {
    state.cardScalePct = 44;
    state.cardGapPx = 32;
    state.blurbBottomPct = 74.5;
    state.cardsBottomPct = 20.5;
    state.chooseBottomPct = 11.0;
    state.partyLeftPct = 2.0;
    state.partyCenterYPct = 50.0;
    rngCardScale.value = "44";
    rngSpread.value = "32";
    markDirty();
    applyMetrics();
    updateReadout();
  });

  btnFullscreen.addEventListener("click", () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      elStageViewport.requestFullscreen().catch(() => {});
    }
  });
}

async function init() {
  await loadSavedLayout();
  populateFrontPickers();
  bindEvents();
  syncSaveButtons();
  renderCards();
}

init();
