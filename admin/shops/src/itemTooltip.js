// Shared floating hover tooltip displaying a crisp 96x96 item icon, full stats, traits, and hero comparison delta.
import { HERO_ROSTER } from "./data.js";
import {
  WEAPON_ATTACK_MODES,
  cleanDamageTypeLabel,
  computeHeroDelta,
  itemOwnStatRows,
  itemSlotFor,
  tierAccentColor,
} from "./compare.js";
import { esc, formatSilver } from "./uiParts.js";

let tooltipEl = null;

function ensureTooltipEl() {
  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.id = "rodItemTooltip";
    tooltipEl.className = "rod-item-tooltip";
    tooltipEl.setAttribute("role", "tooltip");
    tooltipEl.style.display = "none";
    document.body.appendChild(tooltipEl);
    window.addEventListener("scroll", hideItemTooltip, true);
    window.addEventListener("blur", hideItemTooltip);
  }
  return tooltipEl;
}

export function hideItemTooltip() {
  if (tooltipEl) {
    tooltipEl.style.display = "none";
  }
}

function positionTooltip(clientX, clientY) {
  const el = ensureTooltipEl();
  const pad = 12;
  const offset = 16;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const rect = el.getBoundingClientRect();

  let left = clientX + offset;
  let top = clientY + offset;
  if (left + rect.width > vw - pad) {
    left = Math.max(pad, clientX - rect.width - offset);
  }
  if (top + rect.height > vh - pad) {
    top = Math.max(pad, clientY - rect.height - offset);
  }
  el.style.left = `${Math.round(left)}px`;
  el.style.top = `${Math.round(top)}px`;
}

function heroName(id) {
  return HERO_ROSTER.find((h) => h.id === id)?.name ?? id;
}

function fmtStatValue(row, val) {
  return `${val}${row.label.includes("%") ? "%" : ""}`;
}

function buildTooltipHtml(item, state) {
  const iconSrc = "/" + String(item.iconPath || "").replace(/^assets\//, "assets/");
  const tierColor = tierAccentColor(item.step);
  const slot = itemSlotFor(item);
  const isSpell = item.category === "spell";
  const isTrade = item.category === "trade_good";
  const isGear = Boolean(slot);

  const metaParts = [isSpell && item.region ? `Tier ${item.region} Spell` : esc(item.subType || "Item")];
  if (!isGear && !isSpell && item.region) metaParts.push(`Region ${item.region}`);
  if (item.handed) metaParts.push(esc(item.handed));
  if (item.weight) metaParts.push(`${esc(item.weight)} Attire`);
  if (item.damageType) metaParts.push(esc(cleanDamageTypeLabel(item.damageType)));

  const badges = [];
  if (isSpell) {
    const learned = state.learnedSpells?.has(item.id);
    badges.push(`<span class="tip-pill is-mp">${item.mpCost} MP</span>`);
    badges.push(`<span class="tip-pill">${esc(item.target)}</span>`);
    if (learned) badges.push(`<span class="tip-pill is-up">✓ Learned</span>`);
  }
  if (item.runestoneSockets > 0) {
    badges.push(`<span class="tip-pill is-socket">◆ ${item.runestoneSockets} Runestone Socket</span>`);
  }
  if (item.priceSilver > 0) {
    badges.push(`<span class="tip-pill is-gold">Buy ${formatSilver(item.priceSilver)}</span>`);
  }
  if (item.sellSilver > 0 && (isTrade || item.priceSilver === 0 || state.vendorTab === "trade_sell")) {
    badges.push(`<span class="tip-pill is-up">Sell +${formatSilver(item.sellSilver)}</span>`);
  } else if (item.sellSilver > 0) {
    badges.push(`<span class="tip-pill">Sell +${formatSilver(item.sellSilver)}</span>`);
  }

  let statsHtml = "";
  const hero = HERO_ROSTER.find((h) => h.id === state.activeHeroId);
  const delta = computeHeroDelta(item, state.equippedByHero, state.activeHeroId);

  if (isGear) {
    // Include item's own stats even if active hero cannot equip it, and merge delta when usable
    const ownRows = itemOwnStatRows(item);
    const statRows = delta.usable
      ? delta.rows.filter((r) => r.newVal !== 0 || r.curVal !== 0)
      : ownRows;

    if (statRows.length > 0) {
      const hdrTxt = delta.usable && hero
        ? `Stats (${esc(hero.name)} vs ${esc(delta.comparedTo)})`
        : "Item Stats";
      const rowsHtml = statRows.map((r) => {
        const suf = r.label.includes("%") ? "%" : "";
        let diffHtml = "";
        if (delta.usable) {
          if (r.diff > 0) diffHtml = `<span class="delta-up">+${r.diff}${suf}</span>`;
          else if (r.diff < 0) diffHtml = `<span class="delta-down">${r.diff}${suf}</span>`;
          else diffHtml = `<span class="delta-flat">=</span>`;
        }
        return `
          <div class="tip-stat-row">
            <span class="tip-stat-lbl">${esc(r.label)}</span>
            <span class="tip-stat-val">${fmtStatValue(r, r.newVal)} ${diffHtml}</span>
          </div>
        `;
      }).join("");
      statsHtml += `
        <div class="tip-section">
          <div class="tip-sec-hdr">${hdrTxt}</div>
          <div class="tip-stat-grid">${rowsHtml}</div>
        </div>
      `;
    }

    const attacks = item.category === "weapon" ? WEAPON_ATTACK_MODES[item.subType] : null;
    const notes = [];
    if (attacks) notes.push(`<strong>Attacks:</strong> ${esc(attacks[0])} · ${esc(attacks[1])}`);
    if (item.stats?.passiveBonus) notes.push(`<strong>Passive:</strong> ${esc(item.stats.passiveBonus)}`);
    if (item.usableBy?.length) notes.push(`<strong>Usable By:</strong> ${esc(item.usableBy.map(heroName).join(", "))}`);
    if (item.effect) {
      statsHtml += `<div class="tip-effect">${esc(item.effect)}</div>`;
    }
    if (notes.length > 0) {
      statsHtml += `<div class="tip-notes">${notes.map((n) => `<div>${n}</div>`).join("")}</div>`;
    }
  } else if (isSpell) {
    const notes = [];
    if (item.usableBy?.length) notes.push(`<strong>Learnable By:</strong> ${esc(item.usableBy.map(heroName).join(", "))}`);
    statsHtml += `
      <div class="tip-section">
        <div class="tip-sec-hdr">Spell Details</div>
        <div class="tip-stat-grid">
          <div class="tip-stat-row"><span class="tip-stat-lbl">MP Cost</span><span class="tip-stat-val">${item.mpCost} MP</span></div>
          <div class="tip-stat-row"><span class="tip-stat-lbl">Element</span><span class="tip-stat-val">${esc(item.damageType)}</span></div>
          <div class="tip-stat-row"><span class="tip-stat-lbl">Target</span><span class="tip-stat-val">${esc(item.target)}</span></div>
          <div class="tip-stat-row"><span class="tip-stat-lbl">Tier</span><span class="tip-stat-val">Tier ${item.region}</span></div>
        </div>
      </div>
      ${item.effect ? `<div class="tip-effect">${esc(item.effect)}</div>` : ""}
      ${notes.length ? `<div class="tip-notes">${notes.join("")}</div>` : ""}
    `;
  } else {
    const extra = [];
    if (item.sourceMob) extra.push(`<div><strong>Dropped By:</strong> ${esc(item.sourceMob)}${item.sourceType ? ` (${esc(item.sourceType)})` : ""}</div>`);
    if (item.zonesStocked || item.regionsStocked) extra.push(`<div><strong>Stocked:</strong> ${esc(item.zonesStocked ?? item.regionsStocked)}</div>`);
    if (item.effect) {
      statsHtml += `<div class="tip-effect">${esc(item.effect)}</div>`;
    }
    if (extra.length) {
      statsHtml += `<div class="tip-notes">${extra.join("")}</div>`;
    }
  }

  return `
    <div class="tip-head">
      <div class="tip-icon-frame" style="--tier-color:${tierColor}">
        <img src="${esc(iconSrc)}" alt="${esc(item.name)}" width="96" height="96" />
      </div>
      <div class="tip-head-meta">
        <div class="tip-eyebrow">${metaParts.join(" · ")}</div>
        <div class="tip-title font-display">${esc(item.name)}</div>
        ${badges.length ? `<div class="tip-badges">${badges.join("")}</div>` : ""}
      </div>
    </div>
    ${statsHtml}
  `;
}

export function bindItemTooltip(targetEl, item, state) {
  if (!targetEl || !item) return;
  targetEl.addEventListener("mouseenter", (ev) => {
    const el = ensureTooltipEl();
    el.className = `rod-item-tooltip frame-${state.frameStyle || "bronze"}`;
    el.innerHTML = buildTooltipHtml(item, state);
    el.style.display = "block";
    positionTooltip(ev.clientX, ev.clientY);
  });
  targetEl.addEventListener("mousemove", (ev) => {
    if (tooltipEl && tooltipEl.style.display !== "none") {
      positionTooltip(ev.clientX, ev.clientY);
    }
  });
  targetEl.addEventListener("mouseleave", hideItemTooltip);
}
