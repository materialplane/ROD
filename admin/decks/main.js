// ROD Admin Suite — Proposed Decks Studio

const CATEGORY_ORDER = ["room", "loot", "combat", "trap", "respite"];

const CATEGORY_META = {
  room: {
    label: "Doors & Stairs (Shared 16:9 Pool)",
    desc: "Generic doors and stairs open any unseen room from the Base Deck 16:9 Room Pool below.",
    dot: "cobalt",
  },
  loot: {
    label: "Treasures & Chests",
    desc: "Chests and coffers granting Silver and field potions directly inside the active room.",
    dot: "gold",
  },
  combat: {
    label: "Shadow Ambushes (Dynamic Zone / Quest Mobs)",
    desc: "Generic shadowy-figure ambushes that trigger dynamic encounters from the active zone or quest table.",
    dot: "crimson",
  },
  trap: {
    label: "Traps & Hazards",
    desc: "Mechanical snares and dungeon hazards that wound or hinder the party.",
    dot: "amber",
  },
  respite: {
    label: "Springs & Shrines",
    desc: "Restore HP or MP, or bless one hero with a random resistance for the next fight.",
    dot: "emerald",
  },
};

const state = {
  catalog: null,
  promptsCatalog: null,
  selectedDeckId: "",
  groupBy: "category", // "category" | "sheet"
  filter: "all",       // "all" | "room" | "loot" | "combat" | "trap" | "respite" | "pool_rooms" | "commented"
  search: "",
  flippedIds: new Set(),
  commentTabIds: new Set(),
  dirty: false,
  saving: false,
  queuedSaveMsg: null,
  lightboxItems: [],
  lightboxIdx: -1,
};

const elStats = document.getElementById("studioStats");
const elSidebar = document.getElementById("deckSidebar");
const elGallery = document.getElementById("deckGallery");
const elSearch = document.getElementById("inpSearch");
const elSegGroupBy = document.getElementById("segGroupBy");
const elSegFilter = document.getElementById("segFilter");
const btnToggleAllRooms = document.getElementById("btnToggleAllRooms");
const btnSaveDecks = document.getElementById("btnSaveDecks");
const elToast = document.getElementById("toastBanner");

const elRefModal = document.getElementById("refModal");
const elRefBackdrop = document.getElementById("refModalBackdrop");
const elRefEyebrow = document.getElementById("refModalEyebrow");
const elRefTitle = document.getElementById("refModalTitle");
const elRefImg = document.getElementById("refModalImg");
const elRefNote = document.getElementById("refModalNote");
const btnPrevRefModal = document.getElementById("btnPrevRefModal");
const btnNextRefModal = document.getElementById("btnNextRefModal");
const btnCloseRefModal = document.getElementById("btnCloseRefModal");

function renderLightboxItem() {
  const item = state.lightboxItems[state.lightboxIdx];
  if (!item) return;
  if (elRefEyebrow) elRefEyebrow.textContent = item.eyebrow || "Full Image View";
  elRefTitle.textContent = item.title || "Image Preview";
  elRefImg.src = item.src || "";
  elRefNote.textContent = item.note || "";
  const multi = state.lightboxItems.length > 1;
  btnPrevRefModal?.classList.toggle("hidden", !multi);
  btnNextRefModal?.classList.toggle("hidden", !multi);
  elRefModal.classList.remove("hidden");
}

function openImageLightbox(src, title, eyebrow, note) {
  const allZoomEls = [...elGallery.querySelectorAll("[data-zoom-src]"), ...elSidebar.querySelectorAll("[data-zoom-src]")];
  const seen = new Set();
  const items = [];
  for (const el of allZoomEls) {
    const u = el.getAttribute("data-zoom-src") || "";
    if (!u || seen.has(u)) continue;
    seen.add(u);
    items.push({
      src: u,
      title: el.getAttribute("data-zoom-title") || "Preview",
      eyebrow: el.getAttribute("data-zoom-eyebrow") || "Full Image View",
      note: el.getAttribute("data-zoom-note") || "",
    });
  }
  const hitIdx = items.findIndex((x) => x.src === src);
  if (hitIdx >= 0) {
    state.lightboxItems = items;
    state.lightboxIdx = hitIdx;
  } else {
    state.lightboxItems = [{ src, title, eyebrow, note }];
    state.lightboxIdx = 0;
  }
  renderLightboxItem();
}

function stepLightbox(delta) {
  if (!state.lightboxItems.length) return;
  state.lightboxIdx = (state.lightboxIdx + delta + state.lightboxItems.length) % state.lightboxItems.length;
  renderLightboxItem();
}

let toastTimer = null;
function showToast(msg) {
  elToast.textContent = msg;
  elToast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elToast.classList.add("hidden"), 2300);
}

function esc(val) {
  return String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatCommentTime(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function ensureComments(item) {
  if (!Array.isArray(item.comments)) {
    item.comments = [];
  }
  return item.comments;
}

function getActiveDeck() {
  const decks = state.catalog?.decks || [];
  return decks.find((d) => d.id === state.selectedDeckId) || decks[0] || null;
}

function cardHasRoomLink(card) {
  return card.roomLinkMode === "fixed" && Boolean(card.fixedRoomId);
}

function markDirty() {
  state.dirty = true;
  btnSaveDecks.classList.add("dirty");
  btnSaveDecks.textContent = "Save Review Status *";
  updateStats();
}

function countCommentsAll(deck) {
  const cardComments = (deck.cards || []).reduce((sum, c) => sum + ensureComments(c).length, 0);
  const backComments = (deck.cardBacks || []).reduce((sum, b) => sum + ensureComments(b).length, 0);
  const roomComments = (deck.roomPool16x9 || []).reduce((sum, r) => sum + ensureComments(r).length, 0);
  const bgComments = (deck.battlegrounds || []).reduce((sum, bg) => sum + ensureComments(bg).length, 0);
  return cardComments + backComments + roomComments + bgComments;
}

function cardCopies(card) {
  const n = Number(card?.copies);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 1;
}

function updateStats() {
  const deck = getActiveDeck();
  if (!deck) return;
  const cards = deck.cards || [];
  const backs = deck.cardBacks || [];
  const totalCopies = cards.reduce((sum, c) => sum + cardCopies(c), 0);
  const poolRooms = deck.roomPool16x9 || [];
  const battlegrounds = deck.battlegrounds || [];
  const approvedCards = cards.filter((c) => c.approved).length;
  const approvedBacks = backs.filter((b) => b.approved).length;
  const approvedRooms = poolRooms.filter((r) => r.approved).length;
  const approvedBgs = battlegrounds.filter((bg) => bg.approved).length;
  const commentTotal = countCommentsAll(deck);
  elStats.textContent = `${deck.name} · ${backs.length} Backs · ${cards.length} Cards (${totalCopies}) · ${poolRooms.length} Rooms · ${battlegrounds.length} Battlegrounds · ${approvedCards + approvedBacks + approvedRooms + approvedBgs}/${cards.length + backs.length + poolRooms.length + battlegrounds.length} Approved · ${commentTotal} Comment${commentTotal === 1 ? "" : "s"}`;
}

function renderSidebar() {
  const decks = state.catalog?.decks || [];
  const activeDeck = getActiveDeck();
  if (!activeDeck) {
    elSidebar.innerHTML = "";
    return;
  }

  const cards = activeDeck.cards || [];
  const poolRooms = activeDeck.roomPool16x9 || [];
  const battlegrounds = activeDeck.battlegrounds || [];
  const totalCopies = cards.reduce((sum, c) => sum + cardCopies(c), 0) || 1;
  const counts = {};
  for (const cat of CATEGORY_ORDER) counts[cat] = 0;
  for (const c of cards) {
    counts[c.category] = (counts[c.category] || 0) + cardCopies(c);
  }
  const commentTotal = countCommentsAll(activeDeck);

  const deckButtons = decks
    .map((deck) => {
      const app = (deck.cards || []).filter((c) => c.approved).length;
      const deckTotal = (deck.cards || []).reduce((s, c) => s + cardCopies(c), 0);
      const isActive = deck.id === activeDeck.id;
      return `
        <button type="button" class="deck-nav-item ${isActive ? "active" : ""}" data-deck-id="${esc(deck.id)}">
          <div class="deck-nav-top">
            <span class="deck-nav-name">${esc(deck.name)}</span>
            <span class="count-pill">${deckTotal} in Deck</span>
          </div>
          <div class="deck-nav-sub">${(deck.cards || []).length} Unique Designs · ${app}/${(deck.cards || []).length} Approved</div>
        </button>
      `;
    })
    .join("");

  const compSegments = CATEGORY_ORDER.map((cat) => {
    const pct = ((counts[cat] || 0) / totalCopies) * 100;
    return `<div class="comp-seg ${cat}" style="width:${pct.toFixed(2)}%" title="${esc(CATEGORY_META[cat].label)}: ${counts[cat]}"></div>`;
  }).join("");

  const breakdownRows = CATEGORY_ORDER.filter((cat) => (counts[cat] || 0) > 0)
    .map((cat) => {
      const meta = CATEGORY_META[cat];
      return `
      <button type="button" class="breakdown-row" data-filter-jump="${cat}">
        <span class="breakdown-left">
          <span class="dot ${meta.dot}"></span>
          <span>${esc(meta.label.split(" (")[0])}</span>
        </span>
        <strong>${counts[cat] || 0}</strong>
      </button>
    `;
    })
    .join("");

  const refs = activeDeck.referenceAssets || [];
  const refHtml = refs
    .map(
      (r, idx) => `
      <button type="button" class="ref-thumb-btn" data-ref-idx="${idx}" data-zoom-src="${esc(r.path)}" data-zoom-title="${esc(r.label)}" data-zoom-eyebrow="Reference 2x2 Sheet" data-zoom-note="${esc(r.note)}">
        <img src="${esc(r.path)}" alt="${esc(r.label)}" loading="lazy" />
        <div>
          <div class="ref-thumb-label">${esc(r.label)}</div>
          <div class="ref-thumb-note">${esc(r.note)}</div>
        </div>
      </button>
    `
    )
    .join("");

  elSidebar.innerHTML = `
    <div>
      <div class="side-section-title">Proposed Decks</div>
      ${deckButtons}
      <div class="future-note">
        Any Base Door/Stair card pulls interchangeably from this deck's <strong>${poolRooms.length}-Room 16:9 Pool</strong>. Only Quest-specific cards lock to one fixed room.
      </div>
    </div>

    <div>
      <div class="side-section-title">Deck Balance &amp; Rooms</div>
      <div class="breakdown-card">
        <div class="comp-bar">${compSegments}</div>
        <div class="breakdown-rows">
          ${breakdownRows}
          <button type="button" class="breakdown-row" data-filter-jump="pool_rooms">
            <span class="breakdown-left">
              <span class="dot cobalt"></span>
              <span>16:9 Pool Rooms</span>
            </span>
            <strong>${poolRooms.length}</strong>
          </button>
          <button type="button" class="breakdown-row" data-filter-jump="battlegrounds">
            <span class="breakdown-left">
              <span class="dot crimson"></span>
              <span>Battlegrounds</span>
            </span>
            <strong>${battlegrounds.length}</strong>
          </button>
          <button type="button" class="breakdown-row" data-filter-jump="commented">
            <span class="breakdown-left">
              <span class="dot gold"></span>
              <span>With Comments</span>
            </span>
            <strong>${commentTotal}</strong>
          </button>
        </div>
      </div>
    </div>

    ${
      refs.length
        ? `<div>
            <div class="side-section-title">Generated Master Sheets</div>
            <div class="ref-list">${refHtml}</div>
          </div>`
        : ""
    }
  `;

  for (const btn of elSidebar.querySelectorAll("[data-deck-id]")) {
    btn.addEventListener("click", () => {
      state.selectedDeckId = btn.dataset.deckId || "";
      state.flippedIds.clear();
      state.commentTabIds.clear();
      renderAll();
    });
  }

  for (const row of elSidebar.querySelectorAll("[data-filter-jump]")) {
    row.addEventListener("click", () => {
      const cat = row.dataset.filterJump || "all";
      state.filter = state.filter === cat ? "all" : cat;
      syncSegButtons(elSegFilter, state.filter);
      renderGallery();
    });
  }

  for (const btn of elSidebar.querySelectorAll("[data-ref-idx]")) {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.refIdx);
      const item = refs[idx];
      if (!item) return;
      openImageLightbox(item.path || "", item.label || "Reference Asset", "Reference 2x2 Sheet", item.note || "");
    });
  }
}

function cardMatchesFilter(card) {
  if (state.filter === "pool_rooms") return false;
  const comments = ensureComments(card);
  if (state.filter === "commented") {
    if (comments.length === 0) return false;
  } else if (state.filter !== "all" && card.category !== state.filter) {
    return false;
  }

  const q = state.search.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    card.title,
    card.cardText,
    card.cardArtSummary,
    card.gameplayEffect,
    card.sheetGroup,
    card.categoryLabel,
    ...comments.map((cm) => cm.text),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

function backMatchesFilter(back) {
  if (state.filter !== "all" && state.filter !== "commented") {
    return false;
  }
  const comments = ensureComments(back);
  if (state.filter === "commented" && comments.length === 0) return false;

  const q = state.search.trim().toLowerCase();
  if (!q) return true;
  const haystack = [back.title, back.summary, "card back sigil", ...comments.map((cm) => cm.text)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

function battlegroundMatchesFilter(bg) {
  if (state.filter !== "all" && state.filter !== "battlegrounds" && state.filter !== "commented") {
    return false;
  }
  const comments = ensureComments(bg);
  if (state.filter === "commented" && comments.length === 0) return false;

  const q = state.search.trim().toLowerCase();
  if (!q) return true;
  const haystack = [bg.roomTitle, bg.sceneSummary, ...(bg.sceneElements || []), ...comments.map((cm) => cm.text)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

function roomMatchesFilter(room) {
  if (state.filter !== "all" && state.filter !== "pool_rooms" && state.filter !== "commented") {
    return false;
  }
  const comments = ensureComments(room);
  if (state.filter === "commented" && comments.length === 0) return false;

  const q = state.search.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    room.roomTitle,
    room.sceneSummary,
    ...(room.sceneElements || []),
    ...comments.map((cm) => cm.text),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

function renderAmbushSilhouetteSvg(variant) {
  if (variant === "plunge") {
    return `
      <svg class="ambush-silhouette-svg" viewBox="0 0 180 140" aria-hidden="true">
        <path d="M12 42 L74 42 L78 52 L12 52 Z" fill="#232834" />
        <path d="M108 36 L170 36 L170 46 L104 46 Z" fill="#232834" />
        <path d="M54 32 C64 24 78 28 84 44 L96 74 L76 66 L64 88 L52 60 Z" fill="#07080d" stroke="rgba(240,180,90,0.45)" stroke-width="1.5" />
        <path d="M108 26 C120 20 132 28 134 46 L142 78 L124 68 L112 90 L102 58 Z" fill="#07080d" stroke="rgba(240,180,90,0.45)" stroke-width="1.5" />
      </svg>`;
  }
  if (variant === "flanking") {
    return `
      <svg class="ambush-silhouette-svg" viewBox="0 0 180 140" aria-hidden="true">
        <path d="M14 132 L22 72 L40 50 C48 44 58 48 58 60 L72 90 L52 94 L46 132 Z" fill="#07080d" stroke="rgba(240,180,90,0.45)" stroke-width="1.5" />
        <path d="M166 132 L158 72 L140 50 C132 44 122 48 122 60 L108 90 L128 94 L134 132 Z" fill="#07080d" stroke="rgba(240,180,90,0.45)" stroke-width="1.5" />
      </svg>`;
  }
  if (variant === "strike") {
    return `
      <svg class="ambush-silhouette-svg" viewBox="0 0 180 140" aria-hidden="true">
        <path d="M30 132 L38 78 L54 58 C62 52 70 58 70 68 L82 96 L64 102 L58 132 Z" fill="#080a10" stroke="rgba(240,180,90,0.38)" stroke-width="1.4" />
        <path d="M112 132 L116 74 L132 54 C140 48 148 54 148 66 L160 94 L142 100 L138 132 Z" fill="#080a10" stroke="rgba(240,180,90,0.38)" stroke-width="1.4" />
        <path d="M64 134 L72 64 L88 38 C98 32 108 40 108 54 L126 94 L104 98 L98 134 Z" fill="#05060a" stroke="rgba(255,196,108,0.55)" stroke-width="1.7" />
      </svg>`;
  }
  return `
    <svg class="ambush-silhouette-svg" viewBox="0 0 180 140" aria-hidden="true">
      <rect x="26" y="14" width="22" height="122" fill="#171b24" />
      <rect x="132" y="14" width="22" height="122" fill="#171b24" />
      <path d="M40 132 L46 68 C50 48 66 44 74 56 L92 86 L72 94 L66 132 Z" fill="#06070c" stroke="rgba(240,180,90,0.5)" stroke-width="1.6" />
      <path d="M140 132 L134 74 C130 56 116 52 108 64 L94 90 L114 96 L118 132 Z" fill="#06070c" stroke="rgba(240,180,90,0.42)" stroke-width="1.5" />
    </svg>`;
}

const BIOME_PALETTES = {
  cavern: { skyTop: "#131722", skyBot: "#080b12", ridge: "#222938", ground: "#181d28", accent: "#d9943b", secondary: "#4ea8c8" },
  woodland: { skyTop: "#172d1f", skyBot: "#0c1710", ridge: "#244028", ground: "#2a2319", accent: "#e2a944", secondary: "#5cb86b" },
  marsh: { skyTop: "#19261d", skyBot: "#0b120e", ridge: "#25382c", ground: "#1b2821", accent: "#d69a40", secondary: "#639675" },
  coastal: { skyTop: "#122938", skyBot: "#091520", ridge: "#223b4a", ground: "#3b3529", accent: "#ebb14b", secondary: "#52a2b8" },
  roadcamp: { skyTop: "#1c2235", skyBot: "#12151f", ridge: "#2d303c", ground: "#35281c", accent: "#e88a38", secondary: "#8d6338" },
  highland: { skyTop: "#1b263b", skyBot: "#0e1522", ridge: "#39465c", ground: "#2c3340", accent: "#dbb464", secondary: "#7f96b8" },
  desert: { skyTop: "#543616", skyBot: "#24190d", ridge: "#8c6429", ground: "#6b4b22", accent: "#f0b443", secondary: "#468c88" },
  sandstone: { skyTop: "#542716", skyBot: "#241214", ridge: "#7d3e21", ground: "#5c2f1a", accent: "#f0a943", secondary: "#466e9c" },
  frost: { skyTop: "#112b45", skyBot: "#081423", ridge: "#29587a", ground: "#213a4f", accent: "#78d5ff", secondary: "#e88235" },
  ash: { skyTop: "#1c1416", skyBot: "#090708", ridge: "#2b2328", ground: "#191618", accent: "#ea6526", secondary: "#66cadb" },
  holdline: { skyTop: "#1f1d2b", skyBot: "#0c0d14", ridge: "#33394a", ground: "#24262f", accent: "#eb8b34", secondary: "#6aa7cf" },
  timberhold: { skyTop: "#1c241b", skyBot: "#0e110e", ridge: "#423020", ground: "#2b2117", accent: "#e88a32", secondary: "#6ab57e" },
  deserthold: { skyTop: "#4f371b", skyBot: "#241a0d", ridge: "#8c6b3b", ground: "#6b4d24", accent: "#f0b854", secondary: "#4d9898" },
};

function renderBiomeScenery(theme, w = 180, h = 140) {
  const p = BIOME_PALETTES[theme] || BIOME_PALETTES.woodland;
  const gId = `bg_${theme}_${w}`;
  let shapes = "";
  if (theme === "woodland") {
    shapes = `
      <polygon points="18,0 56,0 92,102 68,102" fill="rgba(255,205,110,0.12)"/>
      <polygon points="108,0 138,0 162,102 128,102" fill="rgba(255,205,110,0.09)"/>
      <path d="M0,104 Q45,92 90,102 T180,98 L180,140 L0,140 Z" fill="${p.ground}"/>
      <path d="M12,115 L12,0 L28,0 L26,115 Z M150,115 L152,0 L170,0 L166,115 Z" fill="#1b140e" opacity="0.88"/>
      <ellipse cx="45" cy="18" rx="48" ry="26" fill="${p.ridge}" opacity="0.85"/>
      <ellipse cx="142" cy="16" rx="50" ry="24" fill="${p.ridge}" opacity="0.85"/>
    `;
  } else if (theme === "marsh") {
    shapes = `
      <rect x="0" y="92" width="180" height="48" fill="#172923"/>
      <path d="M0,92 Q45,86 90,94 T180,90" stroke="#456b5a" stroke-width="1.5" fill="none" opacity="0.6"/>
      <path d="M14,116 C18,62 24,26 10,0 L28,0 C34,36 32,78 36,116 Z" fill="#161d17"/>
      <path d="M142,116 C140,74 146,28 158,0 L172,0 C164,42 162,82 166,116 Z" fill="#161d17"/>
      <path d="M22,20 Q34,48 28,68 M152,18 Q138,48 144,68" stroke="#364f3e" stroke-width="2" fill="none"/>
    `;
  } else if (theme === "coastal") {
    shapes = `
      <rect x="0" y="82" width="180" height="24" fill="#133447"/>
      <path d="M0,98 Q90,94 180,100 L180,140 L0,140 Z" fill="${p.ground}"/>
      <circle cx="136" cy="48" r="14" fill="${p.accent}" opacity="0.22"/>
      <path d="M0,84 L38,52 L64,84 Z M132,84 L158,44 L180,84 Z" fill="${p.ridge}"/>
    `;
  } else if (theme === "roadcamp") {
    shapes = `
      <path d="M0,88 Q90,82 180,88 L180,140 L0,140 Z" fill="${p.ground}"/>
      <path d="M14,56 L18,90 M46,56 L48,90 M8,66 L54,66 M8,78 L54,78" stroke="#4a3520" stroke-width="3" fill="none"/>
      <path d="M126,56 L130,90 M162,56 L160,90 M120,66 L168,66 M120,78 L168,78" stroke="#4a3520" stroke-width="3" fill="none"/>
      <circle cx="90" cy="46" r="22" fill="${p.accent}" opacity="0.14"/>
    `;
  } else if (theme === "highland") {
    shapes = `
      <polygon points="0,95 38,32 78,76 118,22 158,64 180,38 180,140 0,140" fill="${p.ridge}"/>
      <path d="M0,98 L180,92 L180,140 L0,140 Z" fill="${p.ground}"/>
      <polyline points="38,32 78,76 118,22" fill="none" stroke="${p.accent}" stroke-width="1.2" opacity="0.5"/>
    `;
  } else if (theme === "desert") {
    shapes = `
      <circle cx="130" cy="36" r="16" fill="${p.accent}" opacity="0.28"/>
      <path d="M0,78 Q55,46 112,78 T180,68 L180,140 L0,140 Z" fill="${p.ridge}"/>
      <path d="M0,92 Q64,82 120,94 T180,88 L180,140 L0,140 Z" fill="${p.ground}"/>
    `;
  } else if (theme === "sandstone") {
    shapes = `
      <circle cx="128" cy="44" r="18" fill="${p.accent}" opacity="0.3"/>
      <path d="M0,90 L22,28 L52,42 L68,90 Z M126,90 L144,24 L180,34 L180,90 Z" fill="#3a1c12"/>
      <path d="M0,92 Q64,82 120,94 T180,88 L180,140 L0,140 Z" fill="${p.ground}"/>
    `;
  } else if (theme === "frost") {
    shapes = `
      <path d="M0,26 Q60,12 120,30 T180,18 L180,52 Q110,44 0,58 Z" fill="${p.accent}" opacity="0.16"/>
      <polygon points="0,92 26,22 52,92" fill="#2d6488" opacity="0.8"/>
      <polygon points="134,92 156,18 180,92" fill="#2d6488" opacity="0.8"/>
      <path d="M0,92 L180,92 L180,140 L0,140 Z" fill="${p.ground}"/>
    `;
  } else if (theme === "ash") {
    shapes = `
      <polygon points="0,95 24,18 46,95" fill="#110e10"/>
      <polygon points="138,95 158,14 180,95" fill="#110e10"/>
      <path d="M0,96 L180,96 L180,140 L0,140 Z" fill="${p.ground}"/>
      <path d="M32,126 L68,118 L112,128 L148,120" stroke="${p.accent}" stroke-width="1.6" fill="none" opacity="0.65"/>
    `;
  } else if (theme === "holdline") {
    shapes = `
      <path d="M0,44 L16,44 L16,56 L32,56 L32,44 L50,44 L50,56 L66,56 L66,44 L86,44 L86,56 L102,56 L102,44 L120,44 L120,56 L138,56 L138,44 L156,44 L156,56 L170,56 L170,44 L180,44 L180,96 L0,96 Z" fill="${p.ridge}"/>
      <path d="M0,96 L180,96 L180,140 L0,140 Z" fill="${p.ground}"/>
      <circle cx="44" cy="68" r="10" fill="${p.accent}" opacity="0.24"/>
      <circle cx="136" cy="68" r="10" fill="${p.accent}" opacity="0.24"/>
    `;
  } else if (theme === "timberhold") {
    shapes = `
      <polygon points="0,96 0,48 8,36 16,48 16,44 24,32 32,44 32,48 40,36 48,48 48,44 56,32 64,44 64,48 116,48 116,44 124,32 132,44 132,48 140,36 148,48 148,44 156,32 164,44 164,48 172,36 180,48 180,96" fill="${p.ridge}"/>
      <path d="M0,96 L180,96 L180,140 L0,140 Z" fill="${p.ground}"/>
      <circle cx="90" cy="66" r="12" fill="${p.accent}" opacity="0.24"/>
    `;
  } else if (theme === "deserthold") {
    shapes = `
      <path d="M0,74 Q42,60 88,72 Q132,64 180,74 L180,96 L0,96 Z" fill="${p.ridge}" opacity="0.72"/>
      <rect x="0" y="72" width="180" height="24" fill="${p.ridge}"/>
      <path d="M12,72 L168,72" stroke="${p.accent}" stroke-width="4" stroke-dasharray="18 8" opacity="0.38"/>
      <path d="M142,72 Q140,48 144,32 M144,32 Q126,26 116,36 M144,32 Q134,18 124,22 M144,32 Q158,20 168,28 M144,32 Q160,30 172,40" stroke="${p.accent}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.45"/>
      <path d="M0,96 L180,96 L180,140 L0,140 Z" fill="${p.ground}"/>
    `;
  } else {
    // cavern
    shapes = `
      <polygon points="14,0 24,34 34,0 56,0 64,22 72,0 112,0 120,28 128,0 154,0 162,38 172,0" fill="#0d111a"/>
      <path d="M0,96 L180,96 L180,140 L0,140 Z" fill="${p.ground}"/>
      <circle cx="34" cy="64" r="14" fill="${p.accent}" opacity="0.16"/>
      <circle cx="146" cy="64" r="14" fill="${p.accent}" opacity="0.14"/>
    `;
  }
  return `
    <defs>
      <linearGradient id="${gId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${p.skyTop}"/>
        <stop offset="100%" stop-color="${p.skyBot}"/>
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#${gId})"/>
    ${shapes}
  `;
}

function renderBiomeCardSvg(m) {
  const theme = m.theme || "woodland";
  const p = BIOME_PALETTES[theme] || BIOME_PALETTES.woodland;
  const motif = m.motif || m.category || "trail";
  let fg = "";

  if (m.category === "room") {
    if (motif === "stepping") {
      fg = `
        <path d="M0,96 L180,96 L180,136 L0,136 Z" fill="#173a48" opacity="0.82"/>
        <ellipse cx="90" cy="126" rx="22" ry="7" fill="#6b7880" stroke="#9eb0b8" stroke-width="1.2"/>
        <ellipse cx="78" cy="110" rx="16" ry="5" fill="#647078" stroke="#96a8b0" stroke-width="1.1"/>
        <ellipse cx="98" cy="96" rx="12" ry="4" fill="#5e6870" stroke="#8a9aa2" stroke-width="1"/>
      `;
    } else if (motif === "bridge" || motif === "pier") {
      fg = `
        <path d="M22,126 L70,84 L110,84 L158,126 Z" fill="#5e4128" stroke="#b38754" stroke-width="1.5"/>
        <line x1="36" y1="114" x2="144" y2="114" stroke="#362414" stroke-width="2"/>
        <line x1="48" y1="103" x2="132" y2="103" stroke="#362414" stroke-width="2"/>
        <line x1="60" y1="93" x2="120" y2="93" stroke="#362414" stroke-width="2"/>
        <line x1="22" y1="126" x2="70" y2="84" stroke="${p.accent}" stroke-width="1.4" opacity="0.7"/>
      `;
    } else if (motif === "gap") {
      fg = `
        <path d="M10,132 L10,32 L72,44 L62,132 Z" fill="${p.ridge}" stroke="${p.accent}" stroke-width="1"/>
        <path d="M170,132 L170,32 L108,44 L118,132 Z" fill="${p.ridge}" stroke="${p.accent}" stroke-width="1"/>
        <circle cx="90" cy="84" r="22" fill="${p.accent}" opacity="0.24"/>
      `;
    } else if (motif === "gate") {
      fg = `
        <rect x="44" y="42" width="92" height="84" rx="4" fill="#2c2118" stroke="#96744e" stroke-width="2.2"/>
        <line x1="90" y1="42" x2="90" y2="126" stroke="#18120c" stroke-width="3"/>
        <rect x="50" y="64" width="80" height="8" fill="#545d6d"/>
        <rect x="50" y="96" width="80" height="8" fill="#545d6d"/>
        <circle cx="34" cy="54" r="6" fill="${p.accent}" opacity="0.8"/>
        <circle cx="146" cy="54" r="6" fill="${p.accent}" opacity="0.8"/>
      `;
    } else if (motif === "descent" || motif === "climb" || motif === "ramp") {
      fg = `
        <path d="M44,126 L68,98 L112,98 L136,126 Z" fill="${p.ridge}" stroke="${p.accent}" stroke-width="1.2"/>
        <path d="M58,98 L76,78 L104,78 L122,98 Z" fill="#465266" stroke="${p.accent}" stroke-width="1"/>
        <path d="M72,78 L84,64 L96,64 L108,78 Z" fill="#5b6880"/>
        <circle cx="90" cy="54" r="14" fill="${p.accent}" opacity="0.3"/>
      `;
    } else {
      // winding trail
      fg = `
        <path d="M46,136 C68,110 116,104 92,84 C74,70 100,56 106,48" fill="none" stroke="#8f724d" stroke-width="26" stroke-linecap="round" opacity="0.72"/>
        <path d="M54,136 C74,112 116,106 94,85 C76,71 100,57 104,50" fill="none" stroke="${p.accent}" stroke-width="2" opacity="0.55"/>
        <circle cx="104" cy="48" r="14" fill="${p.accent}" opacity="0.28"/>
      `;
    }
  } else if (m.category === "loot") {
    if (motif === "stash") {
      fg = `
        <path d="M42,128 C46,72 52,38 90,34 C128,38 134,72 138,128 Z" fill="#3a2819" stroke="#6b4b30" stroke-width="1.8"/>
        <ellipse cx="90" cy="88" rx="26" ry="30" fill="#130e09"/>
        <rect x="74" y="84" width="32" height="24" rx="5" fill="#7c522e" stroke="#d19a47" stroke-width="1.6"/>
        <circle cx="90" cy="95" r="3" fill="#ffd273"/>
      `;
    } else if (motif === "pack") {
      fg = `
        <rect x="60" y="54" width="60" height="62" rx="12" fill="#6b4c30" stroke="#c99552" stroke-width="1.8"/>
        <path d="M60,72 Q90,88 120,72 L120,58 Q90,46 60,58 Z" fill="#855f3a" stroke="#c99552" stroke-width="1.5"/>
        <rect x="70" y="76" width="8" height="22" rx="2" fill="#d9b25f"/>
        <rect x="102" y="76" width="8" height="22" rx="2" fill="#d9b25f"/>
        <rect x="66" y="42" width="48" height="14" rx="7" fill="#4f6448" stroke="#85a179" stroke-width="1.2"/>
      `;
    } else if (motif === "crate") {
      fg = `
        <rect x="54" y="62" width="72" height="58" rx="3" fill="#6d4c2c" stroke="#c2955d" stroke-width="1.8"/>
        <line x1="54" y1="62" x2="126" y2="120" stroke="#47301a" stroke-width="5"/>
        <line x1="126" y1="62" x2="54" y2="120" stroke="#47301a" stroke-width="5"/>
        <line x1="54" y1="86" x2="126" y2="86" stroke="#c2955d" stroke-width="2" stroke-dasharray="6,4"/>
      `;
    } else {
      // strongbox / lockbox / box
      fg = `
        <rect x="50" y="64" width="80" height="54" rx="5" fill="#464d59" stroke="#aeb8c9" stroke-width="2"/>
        <path d="M50,76 L130,76" stroke="#aeb8c9" stroke-width="2.5"/>
        <rect x="82" y="70" width="16" height="18" rx="3" fill="#e5b853" stroke="#7a5b16" stroke-width="1.4"/>
        <circle cx="90" cy="78" r="2.5" fill="#211805"/>
      `;
    }
  } else if (m.category === "respite") {
    const col = motif === "spring" ? "#45d9a8" : motif === "shrine" ? "#5cb6ff" : motif === "phys" ? "#e5a349" : "#b87aff";
    if (motif === "spring") {
      fg = `
        <ellipse cx="90" cy="108" rx="52" ry="18" fill="#174f5c" stroke="${col}" stroke-width="2"/>
        <ellipse cx="90" cy="106" rx="32" ry="9" fill="#5ce8d5" opacity="0.45"/>
        <path d="M84,54 Q92,76 86,104 M96,58 Q100,78 94,104" stroke="${col}" stroke-width="3" stroke-linecap="round" fill="none"/>
      `;
    } else {
      fg = `
        <circle cx="90" cy="74" r="36" fill="${col}" opacity="0.16"/>
        <polygon points="70,122 76,42 90,28 104,42 110,122" fill="#3a4354" stroke="${col}" stroke-width="1.8"/>
        <path d="M90,46 L100,66 L90,88 L80,66 Z" fill="${col}" opacity="0.88"/>
      `;
    }
  } else if (m.category === "trap") {
    if (motif === "snare") {
      fg = `
        <path d="M36,120 Q90,94 144,116" stroke="#d4aa6a" stroke-width="3.5" fill="none"/>
        <ellipse cx="90" cy="104" rx="28" ry="11" fill="none" stroke="#ffd282" stroke-width="2.6"/>
        <path d="M40,56 Q62,84 44,122" stroke="#63482c" stroke-width="4" fill="none"/>
      `;
    } else if (motif === "fall") {
      fg = `
        <path d="M32,44 L148,74 L140,86 L24,56 Z" fill="#5c422c" stroke="#e89448" stroke-width="1.6"/>
        <polygon points="62,68 72,96 82,74" fill="#3b4454" stroke="#e89448" stroke-width="1.2"/>
        <polygon points="104,78 114,108 122,82" fill="#3b4454" stroke="#e89448" stroke-width="1.2"/>
      `;
    } else if (motif === "poison") {
      fg = `
        <ellipse cx="90" cy="106" rx="26" ry="18" fill="#3b5e2e" stroke="#8ef25c" stroke-width="1.6"/>
        <circle cx="78" cy="74" r="14" fill="#7ae64b" opacity="0.45"/>
        <circle cx="102" cy="64" r="18" fill="#9cf765" opacity="0.38"/>
        <circle cx="90" cy="48" r="12" fill="#b4ff85" opacity="0.35"/>
      `;
    } else if (motif === "frost") {
      fg = `
        <polygon points="90,34 102,86 78,86" fill="#9ee5ff" opacity="0.85"/>
        <polygon points="60,64 82,102 68,108" fill="#6ec7f2" opacity="0.75"/>
        <polygon points="120,64 112,108 98,102" fill="#6ec7f2" opacity="0.75"/>
      `;
    } else {
      // stakes / jaws
      fg = `
        <polygon points="50,122 58,64 68,122" fill="#8c6438" stroke="#ff9d54" stroke-width="1.4"/>
        <polygon points="82,122 90,54 98,122" fill="#9c7244" stroke="#ff9d54" stroke-width="1.4"/>
        <polygon points="112,122 122,64 130,122" fill="#8c6438" stroke="#ff9d54" stroke-width="1.4"/>
        <path d="M36,120 Q90,110 144,120" stroke="#75522c" stroke-width="4" fill="none"/>
      `;
    }
  } else if (m.category === "combat") {
    // Biome-specific cover instead of dungeon stone pillars
    let cover = "";
    if (motif === "boughs") {
      cover = `
        <path d="M0,44 Q60,34 110,48 L110,58 Q56,48 0,56 Z" fill="#171b16"/>
        <path d="M180,38 Q125,30 92,46 L94,56 Q130,42 180,48 Z" fill="#171b16"/>
      `;
    } else if (motif === "ferns") {
      cover = `
        <path d="M4,136 Q26,84 54,104 Q32,122 24,136 Z M176,136 Q154,84 126,104 Q148,122 156,136 Z" fill="${p.ridge}"/>
      `;
    } else if (motif === "brush") {
      cover = `
        <ellipse cx="90" cy="112" rx="80" ry="22" fill="rgba(220,225,235,0.12)"/>
        <path d="M0,124 Q34,94 64,124 Z M116,124 Q146,94 180,124 Z" fill="${p.ridge}" opacity="0.85"/>
      `;
    } else {
      // trunks / spires / pilings
      cover = `
        <path d="M18,136 L22,12 L42,12 L46,136 Z" fill="#141815"/>
        <path d="M134,136 L138,12 L158,12 L162,136 Z" fill="#141815"/>
      `;
    }
    fg = `
      ${cover}
      <path d="M46,134 L52,72 C56,54 70,50 78,62 L92,90 L74,98 L68,134 Z" fill="#06070a" stroke="${p.accent}" stroke-width="1.5"/>
      <path d="M134,134 L128,76 C124,58 112,54 104,66 L94,92 L110,98 L116,134 Z" fill="#06070a" stroke="${p.accent}" stroke-width="1.4"/>
    `;
  }

  return `<svg class="biome-mockup-svg" viewBox="0 0 180 140" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${renderBiomeScenery(theme, 180, 140)}${fg}</svg>`;
}

function renderBiomePlateSvg(theme, isBattleground = false) {
  const p = BIOME_PALETTES[theme] || BIOME_PALETTES.woodland;
  if (isBattleground) {
    return `
      <svg class="biome-plate-svg" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="bgp_${theme}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${p.skyTop}"/>
            <stop offset="22%" stop-color="${p.ridge}"/>
            <stop offset="24%" stop-color="${p.ground}"/>
            <stop offset="100%" stop-color="${p.skyBot}"/>
          </linearGradient>
        </defs>
        <rect width="320" height="180" fill="url(#bgp_${theme})"/>
        <line x1="0" y1="34" x2="320" y2="34" stroke="${p.accent}" stroke-width="1" stroke-dasharray="5,4" opacity="0.55"/>
        <ellipse cx="160" cy="112" rx="126" ry="44" fill="none" stroke="${p.accent}" stroke-width="1" opacity="0.24"/>
      </svg>
    `;
  }
  return `<svg class="biome-plate-svg" viewBox="0 0 180 140" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${renderBiomeScenery(theme, 180, 140)}</svg>`;
}

function renderMockupArtwork(card) {
  const m = card.mockup || {};
  if (m.kind === "biome-svg") {
    return `
      <div class="gothic-window is-biome">
        ${renderBiomeCardSvg(m)}
      </div>
    `;
  }
  if (m.kind === "shadow-ambush") {
    return `
      <div class="gothic-window">
        <div class="arch-torch-glow"></div>
        <div class="mockup-stage ambush-stage">
          ${renderAmbushSilhouetteSvg(m.variant)}
        </div>
      </div>
    `;
  }
  const primary = m.primaryAsset
    ? `<img class="${m.secondaryAsset ? "mockup-primary" : m.kind === "icon-scene" ? "mockup-icon-only" : "mockup-primary"}" src="${esc(m.primaryAsset)}" alt="" loading="lazy" />`
    : "";
  const secondary = m.secondaryAsset ? `<img class="mockup-secondary" src="${esc(m.secondaryAsset)}" alt="" loading="lazy" />` : "";
  return `
    <div class="gothic-window">
      <div class="arch-torch-glow"></div>
      <div class="mockup-stage">
        <div class="mockup-pair">
          ${primary}
          ${secondary}
        </div>
      </div>
    </div>
  `;
}

function renderCardFront(card, deck) {
  const isPool = card.roomLinkMode === "pool";
  const isFixed = card.roomLinkMode === "fixed" && card.fixedRoomId;
  const sheetShort = (card.sheetGroup || "").split(" — ")[0] || "Sheet";
  const qty = cardCopies(card);
  const poolBadge = deck?.uiMeta?.poolBadge || "Shared Room Pool";
  const sceneWord = deck?.uiMeta?.sceneWord || "Room";

  let badgeHtml = `<span class="instant-badge">Instant Card</span>`;
  if (isPool) badgeHtml = `<span class="instant-badge">${esc(poolBadge)}</span>`;
  else if (isFixed) badgeHtml = `<span class="bg-link-badge">Fixed 16:9 ${esc(sceneWord)} &middot; Click</span>`;

  if (card.renderedCardPath) {
    return `
    <div class="card-inlay is-actual-card">
      <div class="card-top-meta">
        <span class="slot-tag">#${String(card.slotNumber).padStart(2, "0")} · &times;${qty} · ${esc(sheetShort)}</span>
        ${badgeHtml}
      </div>

      <div class="actual-card-stage">
        <img class="actual-card-img" src="${esc(card.renderedCardPath)}" alt="${esc(card.title)}" loading="lazy" data-zoom-src="${esc(card.renderedCardPath)}" data-zoom-title="${esc(card.title)}" data-zoom-eyebrow="${esc(card.sheetGroup || "Delve Card")}" data-zoom-note="${esc(card.cardText || "")}" title="Click image to expand full screen" />
      </div>
    </div>
  `;
  }

  return `
    <div class="card-inlay">
      <div class="card-top-meta">
        <span class="slot-tag">#${String(card.slotNumber).padStart(2, "0")} · &times;${qty} · ${esc(sheetShort)}</span>
        ${badgeHtml}
      </div>

      ${renderMockupArtwork(card)}

      <div class="ribbon-plate">
        <div class="ribbon-title">${esc(card.title)}</div>
      </div>

      <div class="parchment-box">
        <p class="parchment-text">${esc(card.cardText)}</p>
      </div>
    </div>
  `;
}

function renderCard16x9PoolFace(card, deck) {
  const poolRooms = deck.roomPool16x9 || [];
  const isFixed = card.roomLinkMode === "fixed" && card.fixedRoomId;
  const matchingRooms = isFixed ? poolRooms.filter((r) => r.id === card.fixedRoomId) : poolRooms;
  const sceneWord = deck?.uiMeta?.sceneWord || "Room";

  const entriesHtml = matchingRooms
    .map(
      (room, idx) => `
      <div class="bg-pool-entry">
        <div class="bg-pool-entry-head">
          <span class="bg-pool-entry-title">${esc(room.roomTitle)}</span>
          <span class="bg-pool-entry-num">${esc(sceneWord)} ${idx + 1}/${matchingRooms.length}</span>
        </div>
        <p class="bg-pool-entry-copy">${esc(room.sceneSummary)}</p>
        <div class="bg-elements">
          ${(room.sceneElements || []).map((el) => `<span class="bg-chip">${esc(el)}</span>`).join("")}
        </div>
      </div>
    `
    )
    .join("");

  const ruleText = isFixed
    ? `Quest-locked card: always leads into this specific 16:9 ${sceneWord.toLowerCase()}.`
    : `Interchangeable Base card: picks from all ${matchingRooms.length} 16:9 ${sceneWord} scenes in this Base Deck.`;

  return `
    <div class="card-inlay bg-face">
      <div class="card-top-meta">
        <span class="bg-link-badge">${isFixed ? `Fixed Quest ${esc(sceneWord)}` : `16:9 ${esc(sceneWord)} Pool (${matchingRooms.length})`}</span>
        <span class="slot-tag">${esc(card.title)}</span>
      </div>

      <div class="bg-pool-rule">${esc(ruleText)}</div>

      <div class="bg-pool-scroll">${entriesHtml || '<div class="comment-empty">No 16:9 rooms defined in pool.</div>'}</div>

      <button type="button" class="bg-return-btn">&larr; Back to Card Front</button>
    </div>
  `;
}

function renderCommentsPanel(item, labelPrefix, subLabel) {
  const comments = ensureComments(item);
  const titleText = item.title || item.roomTitle || "Item";
  const listHtml =
    comments.length === 0
      ? `<div class="comment-empty">No comments on <strong>${esc(titleText)}</strong> yet.<br/>Write any edit or note below and click Submit.</div>`
      : comments
          .map(
            (cm, idx) => `
          <div class="comment-item" data-comment-idx="${idx}">
            <div class="comment-item-meta">
              <span class="comment-author">${esc(cm.author || "Creative Director")}</span>
              <span class="comment-meta-right">
                <span>${esc(formatCommentTime(cm.createdAt))}</span>
                <button type="button" class="comment-del-btn" data-del-comment="${idx}" title="Delete comment">&times;</button>
              </span>
            </div>
            <p class="comment-body">${esc(cm.text)}</p>
          </div>
        `
          )
          .join("");

  return `
    <div class="comments-panel">
      <div class="comments-head">
        <div>
          <div class="comments-card-title">${esc(labelPrefix)} · ${esc(titleText)}</div>
          <div class="comments-card-sub">${esc(subLabel)}</div>
        </div>
        <button type="button" class="comments-back-btn btn-back-to-card">&larr; Card View</button>
      </div>

      <div class="comment-list">${listHtml}</div>

      <form class="comment-composer">
        <textarea class="comment-textarea" rows="2" placeholder="Add comment or requested edit..."></textarea>
        <div class="comment-submit-row">
          <button type="button" class="comments-back-btn btn-back-to-card">&larr; Back to Card</button>
          <button type="submit" class="rpg-btn primary">Add Comment</button>
        </div>
      </form>
    </div>
  `;
}

function sheetIdForCard(card) {
  const sg = String(card?.sheetGroup || "");
  if (sg.includes("Sheet 1") || card?.category === "room") return "sheet_1";
  if (sg.includes("Sheet 2") || card?.category === "loot") return "sheet_2";
  if (sg.includes("Sheet 3") || card?.category === "respite") return "sheet_3";
  if (sg.includes("Sheet 4") || card?.category === "trap") return "sheet_4";
  if (sg.includes("Sheet 5") || card?.category === "combat") return "sheet_5";
  return "";
}

function renderCardUnit(card, deck) {
  const hasRoomLink = cardHasRoomLink(card);
  const isFlipped = hasRoomLink && state.flippedIds.has(card.id);
  const isCommentTab = state.commentTabIds.has(card.id);
  const comments = ensureComments(card);
  const sheetId = sheetIdForCard(card);

  const tabBar = `
    <div class="unit-tabs" role="tablist" aria-label="View switch for ${esc(card.title)}">
      <button type="button" role="tab" aria-selected="${!isCommentTab}" class="unit-tab-btn ${!isCommentTab ? "active" : ""}" data-tab="card">${isCommentTab ? "&larr; Card View" : "Card"}</button>
      <button type="button" role="tab" aria-selected="${isCommentTab}" class="unit-tab-btn ${isCommentTab ? "active" : ""}" data-tab="comments">
        <span>Comments</span>
        <span class="comment-count-badge ${comments.length > 0 ? "has-items" : ""}">${comments.length}</span>
      </button>
    </div>
  `;

  const cardTabBody = `
    <div class="card-frame ${hasRoomLink && !isFlipped ? "has-bg" : ""}" ${hasRoomLink && !isFlipped ? 'role="button" tabindex="0" title="Click to inspect all 16:9 rooms in this Base Deck pool"' : ""}>
      ${isFlipped ? renderCard16x9PoolFace(card, deck) : renderCardFront(card, deck)}
    </div>

    <div class="card-spec-box">
      <div class="spec-row"><strong>Mini-Window Scene:</strong> ${esc(card.cardArtSummary)}</div>
      <div class="spec-row"><strong>In Play:</strong> ${esc(card.gameplayEffect)}</div>
      <div class="review-controls">
        <label class="approve-toggle">
          <input type="checkbox" class="chk-approve" ${card.approved ? "checked" : ""} />
          <span>${card.approved ? "Approved" : "Approve"}</span>
        </label>
        ${sheetId ? `<button type="button" class="copy-prompt-btn" data-copy-sheet="${esc(sheetId)}" title="Copy full 2x2 sheet prompt for testing">Copy Sheet Prompt</button>` : ""}
        <button type="button" class="comment-jump-hint">${comments.length ? `Read Comments (${comments.length})` : "+ Add Comment"}</button>
      </div>
    </div>
  `;

  return `
    <article class="deck-card-unit ${card.approved ? "approved" : ""}" data-item-type="card" data-item-id="${esc(card.id)}" data-trim="${esc(card.trimColor || "basalt")}">
      ${tabBar}
      ${isCommentTab ? renderCommentsPanel(card, `#${String(card.slotNumber).padStart(2, "0")}`, card.categoryLabel) : cardTabBody}
    </article>
  `;
}

function renderBackUnit(back, idx) {
  const isCommentTab = state.commentTabIds.has(back.id);
  const comments = ensureComments(back);

  const tabBar = `
    <div class="unit-tabs" role="tablist" aria-label="View switch for ${esc(back.title)}">
      <button type="button" role="tab" aria-selected="${!isCommentTab}" class="unit-tab-btn ${!isCommentTab ? "active" : ""}" data-tab="card">${isCommentTab ? "&larr; Card Back" : "Card Back"}</button>
      <button type="button" role="tab" aria-selected="${isCommentTab}" class="unit-tab-btn ${isCommentTab ? "active" : ""}" data-tab="comments">
        <span>Comments</span>
        <span class="comment-count-badge ${comments.length > 0 ? "has-items" : ""}">${comments.length}</span>
      </button>
    </div>
  `;

  const backTabBody = `
    <div class="card-frame">
      <div class="card-inlay is-actual-card">
        <div class="card-top-meta">
          <span class="slot-tag">Back #0${idx + 1} · Basalt Sigil</span>
          <span class="instant-badge">Card Back</span>
        </div>
        <div class="actual-card-stage">
          <img class="actual-card-img" src="${esc(back.renderedCardPath)}" alt="${esc(back.title)}" loading="lazy" data-zoom-src="${esc(back.renderedCardPath)}" data-zoom-title="${esc(back.title)}" data-zoom-eyebrow="Universal Card Back" data-zoom-note="${esc(back.summary || "")}" title="Click image to expand full screen" />
        </div>
      </div>
    </div>

    <div class="card-spec-box">
      <div class="spec-row"><strong>${esc(back.title)}:</strong> ${esc(back.summary)}</div>
      <div class="review-controls">
        <label class="approve-toggle">
          <input type="checkbox" class="chk-approve" ${back.approved ? "checked" : ""} />
          <span>${back.approved ? "Approved" : "Approve Back"}</span>
        </label>
        <button type="button" class="comment-jump-hint">${comments.length ? `Read Comments (${comments.length})` : "+ Add Comment"}</button>
      </div>
    </div>
  `;

  return `
    <article class="deck-card-unit ${back.approved ? "approved" : ""}" data-item-type="back" data-item-id="${esc(back.id)}" data-trim="basalt">
      ${tabBar}
      ${isCommentTab ? renderCommentsPanel(back, `Back #0${idx + 1}`, "Card Back · Sigil Variant") : backTabBody}
    </article>
  `;
}

function renderBattlegroundUnit(bg, idx, total, deck) {
  const isCommentTab = state.commentTabIds.has(bg.id);
  const comments = ensureComments(bg);
  const elements = (bg.sceneElements || []).map((el) => `<span class="bg-chip">${esc(el)}</span>`).join("");
  const bgTheme = bg.biomeTheme || deck?.roomPool16x9?.[0]?.biomeTheme || "cavern";

  const tabBar = `
    <div class="unit-tabs" role="tablist" aria-label="View switch for ${esc(bg.roomTitle)}">
      <button type="button" role="tab" aria-selected="${!isCommentTab}" class="unit-tab-btn ${!isCommentTab ? "active" : ""}" data-tab="card">${isCommentTab ? "&larr; Battleground" : "Battleground"}</button>
      <button type="button" role="tab" aria-selected="${isCommentTab}" class="unit-tab-btn ${isCommentTab ? "active" : ""}" data-tab="comments">
        <span>Comments</span>
        <span class="comment-count-badge ${comments.length > 0 ? "has-items" : ""}">${comments.length}</span>
      </button>
    </div>
  `;

  const bgTabBody = `
    <div class="bg-plate-16x9${bg.sampleRefPath ? " has-real-img" : ""}" ${bg.sampleRefPath ? `data-zoom-src="${esc(bg.sampleRefPath)}" data-zoom-title="${esc(bg.roomTitle)}" data-zoom-eyebrow="16:9 Combat Battleground (${idx + 1} of ${total})" data-zoom-note="${esc(bg.sceneSummary || "")}" title="Click to expand battleground full screen"` : ""}>
      ${bg.sampleRefPath ? `<img src="${esc(bg.sampleRefPath)}" alt="${esc(bg.roomTitle)}" loading="lazy" />` : `${bg.biomeTheme ? renderBiomePlateSvg(bgTheme, true) : ""}<div class="bg-plate-overlay"><div class="bg-plate-kicker">Proposed Combat Stage · ${idx + 1} of ${total}</div><div class="bg-plate-title">${esc(bg.roomTitle)}</div></div>`}
    </div>

    <div class="bg-desc-panel">
      ${bg.sampleRefPath ? `<div class="bg-desc-title">${esc(bg.roomTitle)}</div>` : ""}
      <div class="bg-desc-label">${bg.sampleRefPath ? `Battleground ${idx + 1} of ${total} · ` : ""}85% Open Floor / 15% Top Rim</div>
      <p class="bg-desc-copy">${esc(bg.sceneSummary)}</p>
      <div class="bg-elements">${elements}</div>
    </div>

    <div class="review-controls">
      <label class="approve-toggle">
        <input type="checkbox" class="chk-approve" ${bg.approved ? "checked" : ""} />
        <span>${bg.approved ? "Approved" : "Approve Stage"}</span>
      </label>
      <button type="button" class="copy-prompt-btn" data-copy-bg="${esc(bg.id)}" title="Copy full 16:9 Pro 3 Battleground AI prompt for ${esc(bg.roomTitle)}">Copy Prompt</button>
      <button type="button" class="comment-jump-hint">${comments.length ? `Read Comments (${comments.length})` : "+ Add Comment"}</button>
    </div>
  `;

  return `
    <article class="room-pool-unit ${bg.approved ? "approved" : ""}" data-item-type="battleground" data-item-id="${esc(bg.id)}">
      ${tabBar}
      ${isCommentTab ? renderCommentsPanel(bg, `Battleground ${idx + 1}`, "16:9 Combat Stage") : bgTabBody}
    </article>
  `;
}

function renderPoolRoomUnit(room, idx, total, deck) {
  const isCommentTab = state.commentTabIds.has(room.id);
  const comments = ensureComments(room);
  const elements = (room.sceneElements || []).map((el) => `<span class="bg-chip">${esc(el)}</span>`).join("");
  const sceneWord = deck?.uiMeta?.sceneWord || "Room";
  const rTheme = room.biomeTheme || deck?.roomPool16x9?.[0]?.biomeTheme || "cavern";

  const tabBar = `
    <div class="unit-tabs" role="tablist" aria-label="View switch for ${esc(room.roomTitle)}">
      <button type="button" role="tab" aria-selected="${!isCommentTab}" class="unit-tab-btn ${!isCommentTab ? "active" : ""}" data-tab="card">${isCommentTab ? `&larr; 16:9 ${esc(sceneWord)}` : `16:9 ${esc(sceneWord)}`}</button>
      <button type="button" role="tab" aria-selected="${isCommentTab}" class="unit-tab-btn ${isCommentTab ? "active" : ""}" data-tab="comments">
        <span>Comments</span>
        <span class="comment-count-badge ${comments.length > 0 ? "has-items" : ""}">${comments.length}</span>
      </button>
    </div>
  `;

  const roomTabBody = `
    <div class="bg-plate-16x9${room.sampleRefPath ? " has-real-img" : ""}" ${room.sampleRefPath ? `data-zoom-src="${esc(room.sampleRefPath)}" data-zoom-title="${esc(room.roomTitle)}" data-zoom-eyebrow="16:9 ${esc(sceneWord)} (${idx + 1} of ${total})" data-zoom-note="${esc(room.sceneSummary || "")}" title="Click to expand scene full screen"` : ""}>
      ${room.sampleRefPath ? `<img src="${esc(room.sampleRefPath)}" alt="${esc(room.roomTitle)}" loading="lazy" />` : `${room.biomeTheme ? renderBiomePlateSvg(rTheme, false) : ""}<div class="bg-plate-overlay"><div class="bg-plate-kicker">Base Deck ${esc(sceneWord)} Pool · ${idx + 1} of ${total}</div><div class="bg-plate-title">${esc(room.roomTitle)}</div></div>`}
    </div>

    <div class="bg-desc-panel">
      ${room.sampleRefPath ? `<div class="bg-desc-title">${esc(room.roomTitle)}</div>` : ""}
      <div class="bg-desc-label">${room.sampleRefPath ? `${esc(sceneWord)} ${idx + 1} of ${total} · ` : ""}What Appears On This 16:9 Background</div>
      <p class="bg-desc-copy">${esc(room.sceneSummary)}</p>
      <div class="bg-elements">${elements}</div>
    </div>

    <div class="review-controls">
      <label class="approve-toggle">
        <input type="checkbox" class="chk-approve" ${room.approved ? "checked" : ""} />
        <span>${room.approved ? "Approved" : `Approve ${esc(sceneWord)}`}</span>
      </label>
      <button type="button" class="copy-prompt-btn" data-copy-room="${esc(room.id)}" title="Copy full 16:9 Pro 3 AI prompt for ${esc(room.roomTitle)}">Copy Prompt</button>
      <button type="button" class="comment-jump-hint">${comments.length ? `Read Comments (${comments.length})` : "+ Add Comment"}</button>
    </div>
  `;

  return `
    <article class="room-pool-unit ${room.approved ? "approved" : ""}" data-item-type="room" data-item-id="${esc(room.id)}">
      ${tabBar}
      ${isCommentTab ? renderCommentsPanel(room, `${sceneWord} ${idx + 1}`, "16:9 Shared Backdrop") : roomTabBody}
    </article>
  `;
}

function buildGroups(cards, deck) {
  if (state.groupBy === "sheet") {
    const map = new Map();
    for (const card of cards) {
      const key = card.sheetGroup || "Sheet";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(card);
    }
    return Array.from(map.entries()).map(([sheetName, list]) => ({
      title: sheetName,
      desc: "Grouped as a single 2×2 generation sheet (4 cards).",
      dot: "gold",
      sheetId: sheetIdForCard(list[0]),
      cards: list,
    }));
  }

  return CATEGORY_ORDER.map((cat) => {
    const list = cards.filter((c) => c.category === cat);
    const meta = deck?.uiMeta?.categories?.[cat] || CATEGORY_META[cat];
    return {
      title: meta.label,
      desc: meta.desc,
      dot: CATEGORY_META[cat].dot,
      sheetId: list.length ? sheetIdForCard(list[0]) : "",
      cards: list,
    };
  }).filter((g) => g.cards.length > 0);
}

function updateFilterTabs(deck) {
  const defaults = {
    room: "Doors & Stairs",
    loot: "Treasures",
    combat: "Combat",
    trap: "Traps",
    respite: "Springs & Shrines",
    pool_rooms: "16:9 Room Pool",
  };
  const custom = deck?.uiMeta?.filterLabels || {};
  for (const btn of elSegFilter.querySelectorAll(".seg-btn")) {
    const key = btn.dataset.val;
    if (key && defaults[key]) {
      btn.textContent = custom[key] || defaults[key];
    }
  }
}

function getDeckPrompts(deck) {
  if (!deck) return null;
  if (state.promptsCatalog?.byDeck?.[deck.id]) return state.promptsCatalog.byDeck[deck.id];
  return deck.id === "base_stone_dungeon" ? state.promptsCatalog : null;
}

function renderGallery() {
  const deck = getActiveDeck();
  if (!deck) {
    elGallery.innerHTML = `<div class="empty-state">No proposed decks found in data/proposed-decks.json.</div>`;
    return;
  }

  updateFilterTabs(deck);
  const uiMeta = deck.uiMeta || null;
  const sceneWord = uiMeta?.sceneWord || "Room";
  const allCards = deck.cards || [];
  const allBacks = deck.cardBacks || [];
  const allRooms = deck.roomPool16x9 || [];
  const allBattlegrounds = deck.battlegrounds || [];
  const filteredCards = allCards.filter(cardMatchesFilter);
  const filteredBacks = allBacks.filter(backMatchesFilter);
  const filteredRooms = allRooms.filter(roomMatchesFilter);
  const filteredBattlegrounds = allBattlegrounds.filter(battlegroundMatchesFilter);

  const linkCards = allCards.filter(cardHasRoomLink);
  const allRoomsFlipped = linkCards.length > 0 && linkCards.every((c) => state.flippedIds.has(c.id));
  btnToggleAllRooms.style.display = linkCards.length > 0 ? "" : "none";
  btnToggleAllRooms.classList.toggle("active", allRoomsFlipped);
  btnToggleAllRooms.textContent = allRoomsFlipped ? "Show Card Fronts" : `Flip 16:9 ${sceneWord}s`;

  const totalCopiesAll = allCards.reduce((sum, c) => sum + cardCopies(c), 0);

  const deckPrompts = getDeckPrompts(deck);
  const sheetButtonsHtml = (deckPrompts?.sheets || [])
    .filter((sh) => sh.prompt)
    .map((sh) => `<button type="button" class="copy-prompt-btn" data-copy-sheet="${esc(sh.id)}">${esc(sh.label)}</button>`)
    .join("");

  const flowHtml = uiMeta
    ? `<strong>${esc(uiMeta.flowLabel || "Path Flow")}:</strong> ${esc(uiMeta.flowText)}`
    : `<strong>Room Flow:</strong> Generic Doors &amp; Stairs pull from the <strong>${allRooms.length} generic 16:9 rooms</strong> at the bottom. Only quest-fixed doors carry a clickable 16:9 link.`;

  const bannerHtml = `
    <div class="deck-hero-banner">
      <div>
        <div class="deck-banner-eyebrow">${esc(deck.badge || "Proposed Deck")} &middot; ${esc(deck.status || "")}</div>
        <h2 class="deck-banner-title">${esc(deck.name)} (${allCards.length} Unique &rarr; ${totalCopiesAll} Cards + ${allRooms.length} Pool ${esc(sceneWord)}s)</h2>
        <p class="deck-banner-sub">${esc(deck.themeNotes || deck.subtitle || "")}</p>
        ${
          sheetButtonsHtml
            ? `<div class="sheet-prompts-bar"><span class="sheet-prompts-label">Copy Sheet Prompt:</span>${sheetButtonsHtml}</div>`
            : ""
        }
      </div>
      <div class="deck-tip-pill">${flowHtml}</div>
    </div>
  `;

  if (allCards.length === 0 && allBacks.length === 0 && allRooms.length === 0 && allBattlegrounds.length === 0) {
    elGallery.innerHTML = `${bannerHtml}<div class="empty-state">This Base Deck is prepared empty and ready to author (0 cards, backs, rooms, or battlegrounds added yet).</div>`;
    return;
  }

  if (filteredCards.length === 0 && filteredBacks.length === 0 && filteredRooms.length === 0 && filteredBattlegrounds.length === 0) {
    elGallery.innerHTML = `${bannerHtml}<div class="empty-state">No cards, backs, scenes, or battlegrounds match your current search or filter.</div>`;
    return;
  }

  const groups = buildGroups(filteredCards, deck);
  const isSheetMode = state.groupBy === "sheet";
  const cardSectionsHtml = groups
    .map(
      (g) => {
        const groupTotal = g.cards.reduce((sum, c) => sum + cardCopies(c), 0);
        return `
      <section class="card-group-block">
        <div class="group-header">
          <div class="group-title-row">
            <span class="dot ${esc(g.dot)}"></span>
            <h3 class="group-title">${esc(g.title)}</h3>
            <span class="group-count">${g.cards.length} Design${g.cards.length === 1 ? "" : "s"} &middot; ${groupTotal} in Deck</span>
            ${g.sheetId ? `<button type="button" class="copy-prompt-btn" data-copy-sheet="${esc(g.sheetId)}" title="Copy full 2x2 AI prompt for ${esc(g.title)}">Copy Prompt</button>` : ""}
          </div>
          <div class="group-desc">${esc(g.desc)}</div>
        </div>
        <div class="cards-grid ${isSheetMode ? "sheet-mode" : ""}">
          ${g.cards.map((c) => renderCardUnit(c, deck)).join("")}
        </div>
      </section>
    `;
      }
    )
    .join("");

  const cardBacksSectionHtml =
    filteredBacks.length > 0
      ? `
      <section class="card-group-block" id="cardBacksSection">
        <div class="group-header">
          <div class="group-title-row">
            <span class="dot cobalt"></span>
            <h3 class="group-title">Card Backs — Abstract Basalt Sigils (${filteredBacks.length} Variants)</h3>
            <span class="group-count">${filteredBacks.length} Backs</span>
            <button type="button" class="copy-prompt-btn" data-copy-sheet="base_backs" title="Copy full 2x2 Card Backs prompt">Copy Prompt</button>
          </div>
          <div class="group-desc">Universal carved dark basalt card backs rotated at random across face-down stacks.</div>
        </div>
        <div class="cards-grid sheet-mode">
          ${filteredBacks.map((bk) => renderBackUnit(bk, allBacks.indexOf(bk))).join("")}
        </div>
      </section>
    `
      : "";

  const roomPoolTitle = uiMeta?.poolTitle || "Base Deck 16:9 Room Pool";
  const roomPoolDesc = uiMeta?.poolDesc || "Interchangeable 16:9 room backdrops shared across all generic Doors, Archways, and Stairs in this deck.";
  const roomPoolSectionHtml =
    filteredRooms.length > 0
      ? `
      <section class="card-group-block" id="roomPoolSection">
        <div class="group-header">
          <div class="group-title-row">
            <span class="dot cobalt"></span>
            <h3 class="group-title">${esc(roomPoolTitle)}</h3>
            <span class="group-count">${filteredRooms.length} ${esc(sceneWord)}${filteredRooms.length === 1 ? "" : "s"}</span>
          </div>
          <div class="group-desc">${esc(roomPoolDesc)}</div>
        </div>
        <div class="rooms-grid">
          ${filteredRooms.map((rm) => renderPoolRoomUnit(rm, allRooms.indexOf(rm), allRooms.length, deck)).join("")}
        </div>
      </section>
    `
      : "";

  const battlegroundsSectionHtml =
    filteredBattlegrounds.length > 0
      ? `
      <section class="card-group-block" id="battlegroundsSection">
        <div class="group-header">
          <div class="group-title-row">
            <span class="dot crimson"></span>
            <h3 class="group-title">Base Deck 16:9 Combat Battlegrounds (${filteredBattlegrounds.length} Arenas)</h3>
            <span class="group-count">${filteredBattlegrounds.length} Stages</span>
          </div>
          <div class="group-desc">Shown at random whenever an Ambush card triggers a fight inside a ${esc(deck.name)} quest pack (85% open battle floor / 15% top horizon rim).</div>
        </div>
        <div class="rooms-grid">
          ${filteredBattlegrounds.map((bg) => renderBattlegroundUnit(bg, allBattlegrounds.indexOf(bg), allBattlegrounds.length, deck)).join("")}
        </div>
      </section>
    `
      : "";

  elGallery.innerHTML = `${bannerHtml}${cardBacksSectionHtml}${cardSectionsHtml}${roomPoolSectionHtml}${battlegroundsSectionHtml}`;

  for (const unit of elGallery.querySelectorAll("[data-item-id]")) {
    const itemType = unit.dataset.itemType;
    const itemId = unit.dataset.itemId;
    const item =
      itemType === "room"
        ? allRooms.find((r) => r.id === itemId)
        : itemType === "battleground"
          ? allBattlegrounds.find((bg) => bg.id === itemId)
          : itemType === "back"
            ? allBacks.find((b) => b.id === itemId)
            : allCards.find((c) => c.id === itemId);
    if (!item) continue;

    // Tabs (Card/Room vs Comments)
    for (const tabBtn of unit.querySelectorAll(".unit-tab-btn")) {
      tabBtn.addEventListener("click", () => {
        if (tabBtn.dataset.tab === "comments") state.commentTabIds.add(item.id);
        else state.commentTabIds.delete(item.id);
        renderGallery();
      });
    }

    const jumpBtn = unit.querySelector(".comment-jump-hint");
    if (jumpBtn) {
      jumpBtn.addEventListener("click", () => {
        state.commentTabIds.add(item.id);
        renderGallery();
      });
    }

    for (const backBtn of unit.querySelectorAll(".btn-back-to-card")) {
      backBtn.addEventListener("click", () => {
        state.commentTabIds.delete(item.id);
        renderGallery();
      });
    }

    // Room-Pool Flip Interaction on Cards
    if (itemType === "card") {
      const frame = unit.querySelector(".card-frame.has-bg");
      if (frame) {
        const flipToPool = (e) => {
          if (e?.target?.closest?.("[data-zoom-src]")) return;
          state.flippedIds.add(item.id);
          renderGallery();
        };
        frame.addEventListener("click", flipToPool);
        frame.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            flipToPool();
          }
        });
      }

      const returnBtn = unit.querySelector(".bg-return-btn");
      if (returnBtn) {
        returnBtn.addEventListener("click", () => {
          state.flippedIds.delete(item.id);
          renderGallery();
        });
      }
    }

    const chk = unit.querySelector(".chk-approve");
    if (chk) {
      chk.addEventListener("change", async () => {
        item.approved = chk.checked;
        markDirty();
        unit.classList.toggle("approved", item.approved);
        const labelSpan = chk.parentElement?.querySelector("span");
        const baseLabel = itemType === "room" ? "Approve Room" : itemType === "battleground" ? "Approve Stage" : itemType === "back" ? "Approve Back" : "Approve";
        if (labelSpan) labelSpan.textContent = item.approved ? "Approved" : baseLabel;
        renderSidebar();
        const nm = item.title || item.roomTitle || "Item";
        await saveDecks(item.approved ? `Approved ${nm}` : `Unmarked ${nm}`);
      });
    }

    const copyRoomBtn = unit.querySelector("[data-copy-room]");
    if (copyRoomBtn) {
      copyRoomBtn.addEventListener("click", async () => {
        const rid = copyRoomBtn.dataset.copyRoom || "";
        const txt = getDeckPrompts(getActiveDeck())?.rooms?.[rid] || "";
        if (!txt) {
          showToast("Prompt not loaded yet — refresh page");
          return;
        }
        await copyPromptText(txt, copyRoomBtn, `${item.roomTitle || rid} prompt`);
      });
    }

    const copyBgBtn = unit.querySelector("[data-copy-bg]");
    if (copyBgBtn) {
      copyBgBtn.addEventListener("click", async () => {
        const bgId = copyBgBtn.dataset.copyBg || "";
        const txt = getDeckPrompts(getActiveDeck())?.battlegrounds?.[bgId] || "";
        if (!txt) {
          showToast("Prompt not loaded yet — refresh page");
          return;
        }
        await copyPromptText(txt, copyBgBtn, `${item.roomTitle || bgId} prompt`);
      });
    }

    const form = unit.querySelector(".comment-composer");
    const textarea = unit.querySelector(".comment-textarea");
    if (form && textarea) {
      const submitComment = async () => {
        const text = textarea.value.trim();
        if (!text) return;
        const comments = ensureComments(item);
        comments.push({
          id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          author: "Creative Director",
          text,
          createdAt: new Date().toISOString(),
        });
        state.commentTabIds.add(item.id);
        renderAll();
        const nm = item.title || item.roomTitle || "item";
        const saved = await saveDecks(`Comment saved on ${nm}`);
        if (saved) {
          const freshUnit = elGallery.querySelector(`[data-item-id="${item.id}"]`);
          const list = freshUnit?.querySelector(".comment-list");
          if (list) list.scrollTop = list.scrollHeight;
          freshUnit?.querySelector(".comment-textarea")?.focus();
        }
      };

      form.addEventListener("submit", (e) => {
        e.preventDefault();
        submitComment();
      });

      textarea.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          submitComment();
        }
      });
    }

    for (const delBtn of unit.querySelectorAll("[data-del-comment]")) {
      delBtn.addEventListener("click", async () => {
        const idx = Number(delBtn.dataset.delComment);
        const comments = ensureComments(item);
        if (idx >= 0 && idx < comments.length) {
          comments.splice(idx, 1);
          renderAll();
          await saveDecks("Comment removed");
        }
      });
    }
  }
}

function syncSegButtons(container, activeVal) {
  for (const btn of container.querySelectorAll(".seg-btn")) {
    btn.classList.toggle("active", btn.dataset.val === activeVal);
  }
}

function renderAll() {
  updateStats();
  renderSidebar();
  renderGallery();
}

async function copyPromptText(promptText, btnEl, label) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(promptText);
    } else {
      const ta = document.createElement("textarea");
      ta.value = promptText;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    const orig = btnEl.textContent;
    btnEl.classList.add("copied");
    btnEl.textContent = "Copied!";
    showToast(`Copied ${label} (${promptText.length} chars)`);
    setTimeout(() => {
      btnEl.classList.remove("copied");
      btnEl.textContent = orig;
    }, 1500);
  } catch (err) {
    showToast(`Copy failed: ${err.message}`);
  }
}

async function saveDecks(toastMsg = "Saved proposed deck reviews") {
  if (!state.catalog) return false;
  if (state.saving) {
    state.queuedSaveMsg = toastMsg;
    return true;
  }
  state.saving = true;
  btnSaveDecks.disabled = true;
  try {
    const res = await fetch("/api/proposed-decks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state.catalog),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const out = await res.json();
    if (out?.catalog) {
      state.catalog = out.catalog;
    } else if (out?.savedAt) {
      state.catalog.updatedAt = out.savedAt;
    }
    state.dirty = false;
    btnSaveDecks.classList.remove("dirty");
    btnSaveDecks.textContent = "Save Review Status";
    renderAll();
    showToast(toastMsg);
    return true;
  } catch (err) {
    showToast(`Save failed: ${err.message}`);
    return false;
  } finally {
    state.saving = false;
    btnSaveDecks.disabled = false;
    if (state.queuedSaveMsg !== null) {
      const nextMsg = state.queuedSaveMsg;
      state.queuedSaveMsg = null;
      saveDecks(nextMsg);
    }
  }
}

function bindEvents() {
  elSearch.addEventListener("input", () => {
    state.search = elSearch.value;
    renderGallery();
  });

  for (const btn of elSegGroupBy.querySelectorAll(".seg-btn")) {
    btn.addEventListener("click", () => {
      state.groupBy = btn.dataset.val || "category";
      syncSegButtons(elSegGroupBy, state.groupBy);
      renderGallery();
    });
  }

  for (const btn of elSegFilter.querySelectorAll(".seg-btn")) {
    btn.addEventListener("click", () => {
      state.filter = btn.dataset.val || "all";
      syncSegButtons(elSegFilter, state.filter);
      renderGallery();
    });
  }

  btnToggleAllRooms.addEventListener("click", () => {
    const deck = getActiveDeck();
    if (!deck) return;
    const linkCards = (deck.cards || []).filter(cardHasRoomLink);
    const allFlipped = linkCards.length > 0 && linkCards.every((c) => state.flippedIds.has(c.id));
    if (allFlipped) {
      state.flippedIds.clear();
    } else {
      for (const c of linkCards) state.flippedIds.add(c.id);
    }
    renderGallery();
  });

  btnSaveDecks.addEventListener("click", () => saveDecks());

  const closeModal = () => elRefModal.classList.add("hidden");
  btnPrevRefModal?.addEventListener("click", () => stepLightbox(-1));
  btnNextRefModal?.addEventListener("click", () => stepLightbox(1));
  btnCloseRefModal.addEventListener("click", closeModal);
  elRefBackdrop.addEventListener("click", closeModal);
  document.addEventListener("keydown", (e) => {
    if (elRefModal.classList.contains("hidden")) return;
    if (e.key === "Escape") closeModal();
    else if (e.key === "ArrowLeft") stepLightbox(-1);
    else if (e.key === "ArrowRight") stepLightbox(1);
  });
}

async function init() {
  bindEvents();
  elGallery.addEventListener("click", async (e) => {
    const zoomEl = e.target.closest("[data-zoom-src]");
    if (zoomEl) {
      e.stopPropagation();
      openImageLightbox(
        zoomEl.getAttribute("data-zoom-src") || "",
        zoomEl.getAttribute("data-zoom-title") || "Preview",
        zoomEl.getAttribute("data-zoom-eyebrow") || "Full Image View",
        zoomEl.getAttribute("data-zoom-note") || ""
      );
      return;
    }
    const shBtn = e.target.closest("[data-copy-sheet]");
    if (!shBtn) return;
    const sid = shBtn.dataset.copySheet || "";
    const entry = (getDeckPrompts(getActiveDeck())?.sheets || []).find((s) => s.id === sid);
    if (!entry || !entry.prompt) {
      showToast("Sheet prompt unavailable");
      return;
    }
    await copyPromptText(entry.prompt, shBtn, entry.label);
  });

  try {
    const [res, pRes] = await Promise.all([
      fetch("/api/proposed-decks", { cache: "no-store" }),
      fetch("/api/base-deck-prompts", { cache: "no-store" }).catch(() => null),
    ]);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.catalog = await res.json();
    if (pRes && pRes.ok) {
      state.promptsCatalog = await pRes.json();
    }
    state.selectedDeckId = state.catalog?.decks?.[0]?.id || "";
    renderAll();
  } catch (err) {
    elStats.textContent = "Failed to load proposed decks";
    elGallery.innerHTML = `<div class="empty-state">Error loading proposed decks: ${esc(err.message)}</div>`;
  }
}

init();
