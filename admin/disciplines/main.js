// Admin Suite — Hero Disciplines Reviewer & Catalog Editor

const state = {
  catalog: null,
  cardManifest: null,
  selectedHeroId: "all", // "all" | valen | ellowyn | orin | rowan | mera | harlan | "reserves"
  search: "",
  filter: "all", // all | pending | approved
  dirty: false,
  modalItems: [],
  modalIndex: -1,
};

const elStats = document.getElementById("studioStats");
const elSidebar = document.getElementById("heroSidebar");
const elPane = document.getElementById("tiersPane");
const elSearch = document.getElementById("inpSearch");
const btnSave = document.getElementById("btnSaveCatalog");
const btnApproveHero = document.getElementById("btnApproveHero");
const btnApproveAll = document.getElementById("btnApproveAll");
const elToast = document.getElementById("toastBanner");

const elModal = document.getElementById("cardModal");
const elModalBackdrop = document.getElementById("modalBackdrop");
const elModalEyebrow = document.getElementById("modalEyebrow");
const elModalTitle = document.getElementById("modalTitle");
const elModalImg = document.getElementById("modalImg");
const elModalBadges = document.getElementById("modalBadges");
const elModalEffect = document.getElementById("modalEffect");
const elModalId = document.getElementById("modalId");
const elModalCounter = document.getElementById("modalCounter");
const btnCloseModal = document.getElementById("btnCloseModal");
const btnPrevCard = document.getElementById("btnPrevCard");
const btnNextCard = document.getElementById("btnNextCard");

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

function markDirty() {
  state.dirty = true;
  btnSave.classList.add("dirty");
  btnSave.textContent = "Save Changes *";
  updateStatsBar();
}

const PILLAR_LABELS = {
  body: "of the Body",
  mind: "of the Mind",
  spirit: "of the Spirit",
};

function pillarText(pillar) {
  return PILLAR_LABELS[pillar] || "of the Body";
}

function pillarOptionsHtml(selected) {
  return ["body", "mind", "spirit"]
    .map((p) => `<option value="${p}" ${selected === p ? "selected" : ""}>${PILLAR_LABELS[p]}</option>`)
    .join("");
}

function resolveIconUrl(id, iconPath) {
  const raw = iconPath || state.cardManifest?.cards?.[id] || "";
  if (!raw) return "";
  return raw.startsWith("/") ? raw : `/${raw}`;
}

function updateStatsBar() {
  if (!state.catalog) return;
  const heroes = state.catalog.heroes || [];
  let totalPairs = 0;
  let approvedPairs = 0;
  let conflicts = 0;
  let linkedArt = 0;
  for (const h of heroes) {
    for (const t of h.tiers || []) {
      totalPairs++;
      if (t.approved) approvedPairs++;
      if (t.optionA?.pillar && t.optionA.pillar === t.optionB?.pillar) conflicts++;
      if (resolveIconUrl(t.optionA?.id, t.optionA?.iconPath)) linkedArt++;
      if (resolveIconUrl(t.optionB?.id, t.optionB?.iconPath)) linkedArt++;
    }
  }
  const extraArt = (state.cardManifest?.pillars?.length || 0) + (state.cardManifest?.reserves?.length || 0);
  const mixMsg = conflicts === 0 ? "0 same-type clashes" : `${conflicts} same-type clash(es)!`;
  elStats.textContent = `${heroes.length} Classes · ${totalPairs} Pairs · ${linkedArt + extraArt}/128 Cards Ready · ${mixMsg} · ${approvedPairs}/${totalPairs} Approved`;
}

function renderSidebar() {
  const heroes = state.catalog.heroes || [];
  let allTotal = 0;
  let allApp = 0;
  for (const h of heroes) {
    allTotal += h.tiers.length;
    allApp += h.tiers.filter((t) => t.approved).length;
  }

  const allCard = `
    <button type="button" class="hero-nav-card ${state.selectedHeroId === "all" ? "active" : ""}" data-hid="all">
      <img src="/assets/icons/ui/ui_21_party_hero_glyph.webp" alt="" style="object-fit:contain;padding:4px;background:#0a0d14;" />
      <div class="hero-nav-meta">
        <div class="hero-nav-name">
          <span>All 6 Heroes</span>
          <span class="app-pill ${allApp === allTotal ? "done" : ""}">${allApp}/${allTotal}</span>
        </div>
        <div class="hero-nav-sub">View every class &amp; level tier</div>
      </div>
    </button>
  `;

  const heroCards = heroes
    .map((h) => {
      const app = h.tiers.filter((t) => t.approved).length;
      const tot = h.tiers.length;
      return `
        <button type="button" class="hero-nav-card ${state.selectedHeroId === h.heroId ? "active" : ""}" data-hid="${h.heroId}">
          <img src="/assets/portraits/heroes/${h.heroId}_avatar.webp" alt="${esc(h.name)}" />
          <div class="hero-nav-meta">
            <div class="hero-nav-name">
              <span>${esc(h.name)}</span>
              <span class="app-pill ${app === tot ? "done" : ""}">${app}/${tot}</span>
            </div>
            <div class="hero-nav-sub">${esc(h.className)}</div>
          </div>
        </button>
      `;
    })
    .join("");

  const reserveCount = (state.cardManifest?.pillars?.length || 0) + (state.cardManifest?.reserves?.length || 0);
  const sealUrl = resolveIconUrl("disc_res_arcanist_seal") || "/assets/icons/ui/ui_21_party_hero_glyph.webp";
  const reservesCard = `
    <button type="button" class="hero-nav-card ${state.selectedHeroId === "reserves" ? "active" : ""}" data-hid="reserves">
      <img src="${esc(sealUrl)}" alt="Emblems &amp; Reserves" />
      <div class="hero-nav-meta">
        <div class="hero-nav-name">
          <span>Emblems &amp; Reserves</span>
          <span class="app-pill done">${reserveCount}</span>
        </div>
        <div class="hero-nav-sub">3 Pillar Crests · 5 Shop/Reserve Cards</div>
      </div>
    </button>
  `;

  elSidebar.innerHTML = allCard + heroCards + reservesCard;
  elSidebar.querySelectorAll(".hero-nav-card").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.selectedHeroId = btn.dataset.hid;
      render();
    });
  });
}

function matchesSearch(tier, q) {
  if (!q) return true;
  const hay = [
    `lv ${tier.level}`,
    tier.tradeoff,
    pillarText(tier.optionA.pillar),
    tier.optionA.name,
    tier.optionA.tag,
    tier.optionA.effect,
    pillarText(tier.optionB.pillar),
    tier.optionB.name,
    tier.optionB.tag,
    tier.optionB.effect,
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

function renderOptionBoxHtml(optKey, opt, modalItems, eyebrow) {
  const pillar = opt.pillar || (optKey === "optionA" ? "body" : "mind");
  const iconUrl = resolveIconUrl(opt.id, opt.iconPath);
  if (iconUrl) {
    modalItems.push({
      id: opt.id,
      name: opt.name,
      eyebrow,
      pillar,
      tag: opt.tag || "",
      effect: opt.effect || "",
      iconUrl,
    });
  }
  const iconHtml = iconUrl
    ? `<button type="button" class="disc-icon-btn pillar-${esc(pillar)}" data-card-id="${esc(opt.id)}" title="Click to inspect full 512x512 card art">
         <img src="${esc(iconUrl)}" alt="${esc(opt.name)}" loading="lazy" />
       </button>`
    : `<div class="icon-placeholder">Icon<br/>Missing</div>`;

  return `
    <div class="opt-box opt-${esc(pillar)}">
      ${iconHtml}
      <div class="opt-fields">
        <div class="opt-top-row">
          <select class="pillar-select pillar-${esc(pillar)}" data-opt="${optKey}" data-subfield="pillar" title="Discipline Type">
            ${pillarOptionsHtml(pillar)}
          </select>
          <input type="text" class="opt-name" value="${esc(opt.name)}" data-opt="${optKey}" data-subfield="name" />
          <input type="text" class="opt-tag" value="${esc(opt.tag)}" data-opt="${optKey}" data-subfield="tag" />
        </div>
        <textarea class="opt-effect" data-opt="${optKey}" data-subfield="effect">${esc(opt.effect)}</textarea>
      </div>
    </div>
  `;
}

function renderReserveGroupHtml(title, subtitle, entries, modalItems) {
  const cardsHtml = entries
    .map((entry) => {
      const iconUrl = resolveIconUrl(entry.id, entry.iconPath);
      const pillar = entry.id.includes("_body") ? "body" : entry.id.includes("_mind") ? "mind" : entry.id.includes("_spirit") ? "spirit" : "";
      if (iconUrl) {
        modalItems.push({
          id: entry.id,
          name: entry.name,
          eyebrow: title,
          pillar,
          tag: entry.detail || "",
          effect: entry.detail || "",
          iconUrl,
        });
      }
      return `
        <div class="reserve-card">
          ${
            iconUrl
              ? `<button type="button" class="disc-icon-btn ${pillar ? `pillar-${pillar}` : ""}" data-card-id="${esc(entry.id)}" title="Inspect 512x512 card">
                   <img src="${esc(iconUrl)}" alt="${esc(entry.name)}" loading="lazy" />
                 </button>`
              : `<div class="icon-placeholder">Missing</div>`
          }
          <div class="reserve-card-meta">
            <div class="reserve-card-title">${esc(entry.name)}</div>
            <div class="reserve-card-sub">${esc(entry.detail)}</div>
            <div class="reserve-card-id">${esc(entry.id)}</div>
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <div class="hero-banner-bar">
      <div class="hero-banner-bar-left">
        <img src="${esc(resolveIconUrl("disc_res_arcanist_seal") || "/assets/icons/ui/ui_21_party_hero_glyph.webp")}" alt="" />
        <div>
          <h2>${esc(title)}</h2>
          <p>${esc(subtitle)}</p>
        </div>
      </div>
    </div>
    <div class="reserves-grid">${cardsHtml}</div>
  `;
}

function renderCardModal() {
  const item = state.modalItems[state.modalIndex];
  if (!item) return;
  elModalEyebrow.textContent = item.eyebrow;
  elModalTitle.textContent = item.name;
  elModalImg.src = item.iconUrl;
  elModalImg.alt = item.name;
  elModalEffect.textContent = item.effect;
  elModalId.textContent = `${item.id}  ·  ${item.iconUrl}`;
  elModalCounter.textContent = `${state.modalIndex + 1} / ${state.modalItems.length}`;

  const badges = [];
  if (item.pillar) {
    badges.push(`<span class="card-modal-badge pillar-${esc(item.pillar)}">${esc(pillarText(item.pillar))}</span>`);
  }
  if (item.tag) {
    badges.push(`<span class="card-modal-badge">${esc(item.tag)}</span>`);
  }
  elModalBadges.innerHTML = badges.join("");
}

function openCardModal(cardId) {
  const idx = state.modalItems.findIndex((x) => x.id === cardId);
  if (idx < 0) return;
  state.modalIndex = idx;
  renderCardModal();
  elModal.classList.remove("hidden");
}

function closeCardModal() {
  elModal.classList.add("hidden");
}

function stepCardModal(delta) {
  if (state.modalItems.length === 0) return;
  state.modalIndex = (state.modalIndex + delta + state.modalItems.length) % state.modalItems.length;
  renderCardModal();
}

function wireCardInspectButtons() {
  elPane.querySelectorAll("[data-card-id]").forEach((btn) => {
    btn.addEventListener("click", () => openCardModal(btn.dataset.cardId));
  });
}

function renderTiersPane() {
  state.modalItems = [];
  const q = state.search.trim().toLowerCase();

  if (state.selectedHeroId === "reserves") {
    btnApproveHero.style.display = "none";
    const filterEntry = (e) => !q || `${e.id} ${e.name} ${e.detail}`.toLowerCase().includes(q);
    const pillars = (state.cardManifest?.pillars || []).filter(filterEntry);
    const reserves = (state.cardManifest?.reserves || []).filter(filterEntry);
    const sections = [];
    if (pillars.length) {
      sections.push(renderReserveGroupHtml("Pillar Emblems (Body / Mind / Spirit)", "Sheet 08 shared UI crests for Discipline pillars", pillars, state.modalItems));
    }
    if (reserves.length) {
      sections.push(renderReserveGroupHtml("Arcanist Shop & Reserve Mastery Cards", "Sheet 08 spare guild seal & bonus Discipline mastery cards", reserves, state.modalItems));
    }
    elPane.innerHTML = sections.length
      ? sections.join("")
      : `<div style="color:#8d99b0;font-size:12px;padding:12px;">No matching emblems or reserve cards.</div>`;
    wireCardInspectButtons();
    return;
  }

  const heroes = state.catalog.heroes || [];
  const visibleHeroes = state.selectedHeroId === "all" ? heroes : heroes.filter((h) => h.heroId === state.selectedHeroId);

  btnApproveHero.style.display = state.selectedHeroId === "all" ? "none" : "inline-block";

  const chunks = visibleHeroes.map((h) => {
    const totalSilver = h.tiers.reduce((s, t) => s + Number(t.silver || 0), 0);
    const filteredTiers = h.tiers.filter((t) => {
      if (state.filter === "pending" && t.approved) return false;
      if (state.filter === "approved" && !t.approved) return false;
      return matchesSearch(t, q);
    });

    const tierHtml =
      filteredTiers.length === 0
        ? `<div style="color:#8d99b0;font-size:12px;padding:12px;">No matching tiers for current filter.</div>`
        : filteredTiers
            .map((t) => {
              const pA = t.optionA.pillar || "body";
              const pB = t.optionB.pillar || "mind";
              const hasConflict = pA === pB;
              const eyebrow = `${h.name} (${h.className}) · Level ${t.level} · ${t.silver}s`;
              return `
          <article class="tier-card ${t.approved ? "is-approved" : ""} ${hasConflict ? "has-pillar-conflict" : ""}" data-hero="${h.heroId}" data-lvl="${t.level}">
            <div class="tier-head">
              <span class="lvl-badge">Level ${t.level}</span>
              <span class="silver-edit">
                Arcanist Cost:
                <input type="number" min="0" step="10" value="${Number(t.silver || 0)}" data-field="silver" />s
              </span>
              <input type="text" class="tradeoff-input" value="${esc(t.tradeoff)}" data-field="tradeoff" title="Tradeoff contrast" />
              ${hasConflict ? '<span class="conflict-pill">Same-Type Pair!</span>' : ""}
              <button type="button" class="approve-btn ${t.approved ? "on" : ""}" data-act="toggleApprove">
                ${t.approved ? "✓ Approved" : "Approve Pair"}
              </button>
            </div>

            <div class="pair-grid">
              ${renderOptionBoxHtml("optionA", t.optionA, state.modalItems, eyebrow)}
              <div class="vs-pill">OR</div>
              ${renderOptionBoxHtml("optionB", t.optionB, state.modalItems, eyebrow)}
            </div>
          </article>`;
            })
            .join("");

    return `
      <div class="hero-banner-bar">
        <div class="hero-banner-bar-left">
          <img src="/assets/portraits/heroes/${h.heroId}_avatar.webp" alt="${esc(h.name)}" />
          <div>
            <h2>${esc(h.name)} · ${esc(h.className)}</h2>
            <p>${esc(h.roleTag)} · All 10 Tiers Total Cost: <strong style="color:#fae2aa;">${totalSilver.toLocaleString()}s</strong></p>
          </div>
        </div>
      </div>
      ${tierHtml}
    `;
  });

  elPane.innerHTML = chunks.join("");
  wireCardInspectButtons();

  // Wire editable fields directly to in-memory catalog
  elPane.querySelectorAll(".tier-card").forEach((card) => {
    const hid = card.dataset.hero;
    const lvl = Number(card.dataset.lvl);
    const heroObj = state.catalog.heroes.find((x) => x.heroId === hid);
    const tierObj = heroObj?.tiers.find((t) => t.level === lvl);
    if (!tierObj) return;

    card.querySelectorAll("[data-field]").forEach((inp) => {
      inp.addEventListener("input", () => {
        const f = inp.dataset.field;
        tierObj[f] = f === "silver" ? Math.max(0, Number(inp.value || 0)) : inp.value;
        markDirty();
      });
    });

    card.querySelectorAll("[data-opt]").forEach((inp) => {
      const evt = inp.tagName === "SELECT" ? "change" : "input";
      inp.addEventListener(evt, () => {
        const opt = inp.dataset.opt;
        const sub = inp.dataset.subfield;
        tierObj[opt][sub] = inp.value;
        markDirty();
        if (sub === "pillar") render();
      });
    });

    card.querySelector('[data-act="toggleApprove"]').addEventListener("click", () => {
      tierObj.approved = !tierObj.approved;
      markDirty();
      render();
    });
  });
}

function render() {
  updateStatsBar();
  renderSidebar();
  renderTiersPane();
}

elSearch.addEventListener("input", (e) => {
  state.search = e.target.value;
  renderTiersPane();
});

document.querySelectorAll("#segFilter .seg-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#segFilter .seg-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.filter = btn.dataset.val;
    renderTiersPane();
  });
});

btnApproveHero.addEventListener("click", () => {
  const h = state.catalog?.heroes?.find((x) => x.heroId === state.selectedHeroId);
  if (!h) return;
  for (const t of h.tiers) t.approved = true;
  markDirty();
  render();
  showToast(`Approved all 10 Discipline pairs for ${h.name}`);
});

btnApproveAll.addEventListener("click", () => {
  for (const h of state.catalog?.heroes || []) {
    for (const t of h.tiers) t.approved = true;
  }
  markDirty();
  render();
  showToast("Approved all 60 Discipline pairs across all 6 heroes");
});

btnSave.addEventListener("click", async () => {
  if (!state.catalog) return;
  try {
    const resp = await fetch("/api/disciplines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state.catalog),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    state.dirty = false;
    btnSave.classList.remove("dirty");
    btnSave.textContent = "Save Catalog";
    showToast("Saved to data/disciplines-catalog.json");
  } catch (err) {
    showToast(`Save failed: ${err.message}`);
  }
});

btnCloseModal.addEventListener("click", closeCardModal);
elModalBackdrop.addEventListener("click", closeCardModal);
btnPrevCard.addEventListener("click", () => stepCardModal(-1));
btnNextCard.addEventListener("click", () => stepCardModal(1));
document.addEventListener("keydown", (e) => {
  if (elModal.classList.contains("hidden")) return;
  if (e.key === "Escape") closeCardModal();
  if (e.key === "ArrowLeft") stepCardModal(-1);
  if (e.key === "ArrowRight") stepCardModal(1);
});

(async () => {
  const ts = Date.now();
  const [catResp, manifestResp] = await Promise.all([
    fetch(`/api/disciplines?t=${ts}`),
    fetch(`/assets/icons/disciplines/disciplines-cards-manifest.json?t=${ts}`).catch(() => null),
  ]);
  if (!catResp.ok) {
    elStats.textContent = "Failed to load disciplines catalog.";
    return;
  }
  state.catalog = await catResp.json();
  if (manifestResp && manifestResp.ok) {
    state.cardManifest = await manifestResp.json();
  }
  render();
})();
