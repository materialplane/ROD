import type React from "react";
import { assetUrl } from "../api";
import { getHeroById } from "../heroes";
import type { EquippedGearMap, HeroId, ItemEntry, SpellEntry } from "../types";
import {
  cleanDamageTypeLabel,
  computeHeroDelta,
  itemOwnStatRows,
  itemSlotFor,
  tierAccentColor,
  WEAPON_ATTACK_MODES,
  type ShopCatalogEntry,
  type StatDeltaRow,
} from "./shopLogic";

export interface TooltipContext {
  activeHeroId?: HeroId;
  equippedByHero?: EquippedGearMap;
  itemsById?: Record<string, ItemEntry>;
  learnedSpellIds?: string[];
  isSellMode?: boolean;
}

let tooltipEl: HTMLDivElement | null = null;

function escHtml(raw: unknown): string {
  return String(raw ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function ensureTooltipEl(): HTMLDivElement {
  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.id = "rodClientItemTooltip";
    tooltipEl.className = "rod-item-tooltip";
    tooltipEl.setAttribute("role", "tooltip");
    tooltipEl.style.display = "none";
    document.body.appendChild(tooltipEl);
    window.addEventListener("scroll", hideClientItemTooltip, true);
    window.addEventListener("blur", hideClientItemTooltip);
  }
  return tooltipEl;
}

export function hideClientItemTooltip(): void {
  if (tooltipEl) {
    tooltipEl.style.display = "none";
  }
}

function positionTooltip(clientX: number, clientY: number): void {
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

function fmtStatVal(row: StatDeltaRow, val: number): string {
  return `${val}${row.label.includes("%") ? "%" : ""}`;
}

function buildTooltipHtml(entry: ShopCatalogEntry, ctx: TooltipContext): string {
  const isSpell = entry.category === "spell";
  const spell = isSpell ? (entry as SpellEntry) : null;
  const gearItem = !isSpell ? (entry as ItemEntry) : null;
  const isTrade = entry.category === "trade_good";
  const slot = itemSlotFor(entry);
  const isGear = Boolean(slot);
  const tierColor = tierAccentColor(entry.step);
  const imgSrc = assetUrl(entry.iconPath);

  const metaParts: string[] = [isSpell && entry.region ? `Tier ${entry.region} Spell` : escHtml(entry.subType || "Item")];
  if (!isGear && !isSpell && entry.region) metaParts.push(`Region ${entry.region}`);
  if (gearItem?.handed) metaParts.push(escHtml(gearItem.handed));
  if (gearItem?.weight) metaParts.push(`${escHtml(gearItem.weight)} Attire`);
  if (entry.damageType) metaParts.push(escHtml(cleanDamageTypeLabel(entry.damageType)));

  const badges: string[] = [];
  if (spell) {
    const learned = Boolean(ctx.learnedSpellIds?.includes(spell.id));
    badges.push(`<span class="tip-pill is-mp">${spell.mpCost} MP</span>`);
    badges.push(`<span class="tip-pill">${escHtml(spell.target)}</span>`);
    if (learned) badges.push(`<span class="tip-pill is-up">✓ Learned</span>`);
  }
  if (gearItem?.runestoneSockets && gearItem.runestoneSockets > 0) {
    badges.push(`<span class="tip-pill is-socket">◆ ${gearItem.runestoneSockets} Runestone Socket</span>`);
  }
  if (entry.priceSilver > 0) {
    badges.push(`<span class="tip-pill is-gold">Buy ${entry.priceSilver.toLocaleString()}s</span>`);
  }
  if (entry.sellSilver > 0) {
    const cls = isTrade || entry.priceSilver === 0 || ctx.isSellMode ? "tip-pill is-up" : "tip-pill";
    badges.push(`<span class="${cls}">Sell +${entry.sellSilver.toLocaleString()}s</span>`);
  }

  let bodyHtml = "";
  if (isGear && gearItem) {
    const hasHeroCmp = Boolean(ctx.activeHeroId && ctx.equippedByHero && ctx.itemsById);
    const delta = hasHeroCmp
      ? computeHeroDelta(gearItem, ctx.equippedByHero!, ctx.itemsById!, ctx.activeHeroId!)
      : null;
    const heroName = ctx.activeHeroId ? getHeroById(ctx.activeHeroId).name : "";
    const ownRows = itemOwnStatRows(gearItem);
    const statRows = delta?.usable
      ? delta.rows.filter((r) => r.newVal !== 0 || r.curVal !== 0)
      : ownRows;

    if (statRows.length > 0) {
      const hdrTxt = delta?.usable && heroName
        ? `Stats (${escHtml(heroName)} vs ${escHtml(delta.comparedItem?.name ?? "Empty")})`
        : "Item Stats";
      const rowsHtml = statRows
        .map((r) => {
          const suf = r.label.includes("%") ? "%" : "";
          let diffHtml = "";
          if (delta?.usable) {
            if (r.diff > 0) diffHtml = `<span class="delta-up">+${r.diff}${suf}</span>`;
            else if (r.diff < 0) diffHtml = `<span class="delta-down">${r.diff}${suf}</span>`;
            else diffHtml = `<span class="delta-flat">=</span>`;
          }
          return `
            <div class="tip-stat-row">
              <span class="tip-stat-lbl">${escHtml(r.label)}</span>
              <span class="tip-stat-val">${fmtStatVal(r, r.newVal)} ${diffHtml}</span>
            </div>
          `;
        })
        .join("");

      bodyHtml += `
        <div class="tip-section">
          <div class="tip-sec-hdr">${hdrTxt}</div>
          <div class="tip-stat-grid">${rowsHtml}</div>
        </div>
      `;
    }

    const attacks = gearItem.category === "weapon" ? WEAPON_ATTACK_MODES[gearItem.subType] : undefined;
    const notes: string[] = [];
    if (attacks) notes.push(`<strong>Attacks:</strong> ${escHtml(attacks[0])} · ${escHtml(attacks[1])}`);
    if (gearItem.stats?.passiveBonus) {
      notes.push(`<strong>Passive:</strong> ${escHtml(gearItem.stats.passiveBonus)}`);
    }
    if (gearItem.usableBy?.length) {
      notes.push(`<strong>Usable By:</strong> ${escHtml(gearItem.usableBy.map((id) => getHeroById(id).name).join(", "))}`);
    }
    if (gearItem.effect) {
      bodyHtml += `<div class="tip-effect">${escHtml(gearItem.effect)}</div>`;
    }
    if (notes.length > 0) {
      bodyHtml += `<div class="tip-notes">${notes.map((n) => `<div>${n}</div>`).join("")}</div>`;
    }
  } else if (spell) {
    const notes = spell.usableBy?.length
      ? [`<strong>Learnable By:</strong> ${escHtml(spell.usableBy.map((id) => getHeroById(id).name).join(", "))}`]
      : [];
    bodyHtml += `
      <div class="tip-section">
        <div class="tip-sec-hdr">Spell Details</div>
        <div class="tip-stat-grid">
          <div class="tip-stat-row"><span class="tip-stat-lbl">MP Cost</span><span class="tip-stat-val">${spell.mpCost} MP</span></div>
          <div class="tip-stat-row"><span class="tip-stat-lbl">Element</span><span class="tip-stat-val">${escHtml(spell.damageType)}</span></div>
          <div class="tip-stat-row"><span class="tip-stat-lbl">Target</span><span class="tip-stat-val">${escHtml(spell.target)}</span></div>
          <div class="tip-stat-row"><span class="tip-stat-lbl">Tier</span><span class="tip-stat-val">Tier ${spell.region}</span></div>
        </div>
      </div>
      ${spell.effect ? `<div class="tip-effect">${escHtml(spell.effect)}</div>` : ""}
      ${notes.length > 0 ? `<div class="tip-notes">${notes.join("")}</div>` : ""}
    `;
  } else if (gearItem) {
    const extra: string[] = [];
    if (gearItem.sourceMob) {
      extra.push(`<div><strong>Dropped By:</strong> ${escHtml(gearItem.sourceMob)}${gearItem.sourceType ? ` (${escHtml(gearItem.sourceType)})` : ""}</div>`);
    }
    if (gearItem.regionsStocked) {
      extra.push(`<div><strong>Stocked:</strong> ${escHtml(gearItem.regionsStocked)}</div>`);
    }
    if (gearItem.effect) {
      bodyHtml += `<div class="tip-effect">${escHtml(gearItem.effect)}</div>`;
    }
    if (extra.length > 0) {
      bodyHtml += `<div class="tip-notes">${extra.join("")}</div>`;
    }
  }

  return `
    <div class="tip-head">
      <div class="tip-icon-frame" style="--tier-color:${tierColor}">
        <img src="${escHtml(imgSrc)}" alt="${escHtml(entry.name)}" width="96" height="96" />
      </div>
      <div class="tip-head-meta">
        <div class="tip-eyebrow">${metaParts.join(" · ")}</div>
        <div class="tip-title font-display">${escHtml(entry.name)}</div>
        ${badges.length ? `<div class="tip-badges">${badges.join("")}</div>` : ""}
      </div>
    </div>
    ${bodyHtml}
  `;
}

export function itemTooltipHandlers(
  entry: ShopCatalogEntry | null | undefined,
  ctx: TooltipContext = {}
): {
  onMouseEnter?: (e: React.MouseEvent<HTMLElement>) => void;
  onMouseMove?: (e: React.MouseEvent<HTMLElement>) => void;
  onMouseLeave?: () => void;
} {
  if (!entry) return {};
  return {
    onMouseEnter: (e) => {
      const el = ensureTooltipEl();
      el.innerHTML = buildTooltipHtml(entry, ctx);
      el.style.display = "block";
      positionTooltip(e.clientX, e.clientY);
    },
    onMouseMove: (e) => {
      if (tooltipEl && tooltipEl.style.display !== "none") {
        positionTooltip(e.clientX, e.clientY);
      }
    },
    onMouseLeave: hideClientItemTooltip,
  };
}
