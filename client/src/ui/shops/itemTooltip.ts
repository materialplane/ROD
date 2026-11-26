import type React from "react";
import { assetUrl } from "../api";
import { resolveDamageTypeIcons } from "../battle/battleLogic";
import { getHeroById } from "../heroes";
import type { EquippedGearMap, GearSlot, HeroId, ItemEntry, RunestoneItem, SpellEntry } from "../types";
import {
  cleanDamageTypeLabel,
  computeHeroDelta,
  getWeaponAttackSpecs,
  itemOwnStatRows,
  itemSlotFor,
  tierAccentColor,
  type ShopCatalogEntry,
  type StatDeltaRow,
  type WeaponAttackDisplayInfo,
} from "./shopLogic";

export interface TooltipContext {
  activeHeroId?: HeroId;
  equippedByHero?: EquippedGearMap;
  itemsById?: Record<string, ItemEntry>;
  learnedSpellIds?: string[];
  preferredSlot?: GearSlot;
  isSellMode?: boolean;
}

const HOVER_FOCUS_DELAY_MS = 1500;
const NESTED_ATTACK_DELAY_MS = 350;

let tooltipEl: HTMLDivElement | null = null;
let attackTooltipEl: HTMLDivElement | null = null;
let hideTimer: number | null = null;
let showTimer: number | null = null;
let attackShowTimer: number | null = null;
let activeItemKey: string | null = null;
let activeSourceEl: HTMLElement | null = null;
let pendingItemKey: string | null = null;
let pendingSourceEl: HTMLElement | null = null;
let pendingClientX = 0;
let pendingClientY = 0;
let pendingAttackEl: HTMLElement | null = null;
let pointerInsideTooltip = false;

function escHtml(raw: unknown): string {
  return String(raw ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function clearHideTimer(): void {
  if (hideTimer !== null) {
    window.clearTimeout(hideTimer);
    hideTimer = null;
  }
}

function clearShowTimer(): void {
  if (showTimer !== null) {
    window.clearTimeout(showTimer);
    showTimer = null;
  }
  pendingItemKey = null;
  pendingSourceEl = null;
}

function clearAttackShowTimer(): void {
  if (attackShowTimer !== null) {
    window.clearTimeout(attackShowTimer);
    attackShowTimer = null;
  }
  pendingAttackEl = null;
}

function hideAttackTooltip(): void {
  clearAttackShowTimer();
  if (attackTooltipEl) {
    attackTooltipEl.style.display = "none";
  }
}

export function hideClientItemTooltip(): void {
  clearHideTimer();
  clearShowTimer();
  pointerInsideTooltip = false;
  activeItemKey = null;
  activeSourceEl = null;
  hideAttackTooltip();
  if (tooltipEl) {
    tooltipEl.style.display = "none";
  }
}

function scheduleTooltipHide(delayMs = 175): void {
  clearHideTimer();
  hideTimer = window.setTimeout(() => {
    if (!pointerInsideTooltip) {
      hideClientItemTooltip();
    }
  }, delayMs);
}

function ensureAttackTooltipEl(): HTMLDivElement {
  if (!attackTooltipEl) {
    attackTooltipEl = document.createElement("div");
    attackTooltipEl.id = "rodAttackSkillTooltip";
    attackTooltipEl.className = "rod-attack-tooltip";
    attackTooltipEl.setAttribute("role", "tooltip");
    attackTooltipEl.style.display = "none";
    document.body.appendChild(attackTooltipEl);
  }
  return attackTooltipEl;
}

function ensureTooltipEl(): HTMLDivElement {
  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.id = "rodClientItemTooltip";
    tooltipEl.className = "rod-item-tooltip";
    tooltipEl.setAttribute("role", "tooltip");
    tooltipEl.style.display = "none";
    document.body.appendChild(tooltipEl);

    tooltipEl.addEventListener("mouseenter", () => {
      pointerInsideTooltip = true;
      clearHideTimer();
    });
    tooltipEl.addEventListener("mouseleave", () => {
      pointerInsideTooltip = false;
      hideAttackTooltip();
      scheduleTooltipHide(150);
    });
    tooltipEl.addEventListener("mouseover", (e) => {
      const btn = (e.target as HTMLElement | null)?.closest("[data-atk-subtype]") as HTMLElement | null;
      if (!btn) {
        hideAttackTooltip();
        return;
      }
      if (pendingAttackEl === btn) return;
      clearAttackShowTimer();
      pendingAttackEl = btn;
      const subType = btn.dataset.atkSubtype;
      const slot = Number(btn.dataset.atkSlot) === 1 ? 1 : 0;
      const dmg = btn.dataset.atkDmg;
      attackShowTimer = window.setTimeout(() => {
        attackShowTimer = null;
        if (!btn.isConnected || pendingAttackEl !== btn) return;
        pendingAttackEl = null;
        showAttackSkillTooltip(subType, slot, dmg, btn.getBoundingClientRect());
      }, NESTED_ATTACK_DELAY_MS);
    });
    tooltipEl.addEventListener("mouseout", (e) => {
      const fromBtn = (e.target as HTMLElement | null)?.closest("[data-atk-subtype]");
      const toBtn = (e.relatedTarget as HTMLElement | null)?.closest("[data-atk-subtype]");
      if (fromBtn && fromBtn !== toBtn && !toBtn) {
        hideAttackTooltip();
      }
    });

    window.addEventListener("scroll", hideClientItemTooltip, true);
    window.addEventListener("blur", hideClientItemTooltip);
  }
  return tooltipEl;
}

function buildAttackStatsChips(info: WeaponAttackDisplayInfo): Array<{ label: string; cls?: string }> {
  const { spec, powerPct, cooldownLabel } = info;
  const chips: Array<{ label: string; cls?: string }> = [
    { label: `${powerPct}% Power`, cls: powerPct >= 130 ? "is-gold" : "" },
    { label: cooldownLabel, cls: spec.cooldownTurns > 0 ? "is-gold" : "is-up" },
  ];
  if (spec.critBonus > 0) {
    chips.push({ label: `+${Math.round(spec.critBonus * 100)}% Crit`, cls: "is-gold" });
  }
  if (spec.splashPct && spec.splashPct > 0) {
    chips.push({ label: `${Math.round(spec.splashPct * 100)}% Neighbor Splash`, cls: "is-mp" });
  }
  if (spec.execCritBonus && spec.execCritBonus > 0) {
    chips.push({ label: `+${Math.round(spec.execCritBonus * 100)}% Execute Crit`, cls: "is-gold" });
  }
  if (spec.guardChip && spec.guardChip > 0) {
    chips.push({ label: `Breaks ${spec.guardChip} Guard`, cls: "is-mp" });
  }
  if (spec.armorIgnore && spec.armorIgnore > 0) {
    chips.push({ label: `Ignores ${Math.round(spec.armorIgnore * 100)}% DEF`, cls: "is-mp" });
  }
  if (spec.restoreMp && spec.restoreMp > 0) {
    chips.push({ label: `+${spec.restoreMp} MP on Hit`, cls: "is-up" });
  }
  if (spec.debuff === "def_down") {
    chips.push({ label: "Cracks Defense", cls: "is-socket" });
  } else if (spec.debuff === "atk_down") {
    chips.push({ label: "Lowers Enemy ATK", cls: "is-socket" });
  } else if (spec.debuff === "blind") {
    chips.push({ label: "Blinds Target", cls: "is-socket" });
  } else if (spec.debuff === "poison") {
    chips.push({ label: "Inflicts Poison", cls: "is-socket" });
  }
  return chips;
}

function buildDamageTypeInlineHtml(raw?: string, sizePx = 14): string {
  const icons = resolveDamageTypeIcons(raw);
  if (icons.length === 0) return "";
  return icons
    .map(
      (dt) =>
        `<img src="${escHtml(assetUrl(dt.iconPath))}" alt="${escHtml(dt.label)}" width="${sizePx}" height="${sizePx}" style="width:${sizePx}px;height:${sizePx}px;border-radius:3px;object-fit:cover;display:inline-block;vertical-align:middle;margin-right:3px;border:1px solid rgba(255,255,255,0.22);" />`
    )
    .join("");
}

function buildAttackTooltipHtml(info: WeaponAttackDisplayInfo, subTypeLabel: string): string {
  const chips = buildAttackStatsChips(info);
  const iconSrc = assetUrl(info.iconPath);
  const dtIcons = buildDamageTypeInlineHtml(info.damageTypeLabel, 13);
  const pillsHtml = chips
    .map((c) => `<span class="tip-pill${c.cls ? ` ${c.cls}` : ""}">${escHtml(c.label)}</span>`)
    .join("");

  return `
    <div class="atk-tip-head">
      <div class="atk-tip-icon-frame">
        <img src="${escHtml(iconSrc)}" alt="${escHtml(info.spec.name)}" width="56" height="56" />
      </div>
      <div class="tip-head-meta">
        <div class="tip-eyebrow">${escHtml(subTypeLabel)} · 0 MP Attack · ${dtIcons}${escHtml(info.damageTypeLabel)}</div>
        <div class="atk-tip-title font-display">${escHtml(info.spec.name)}</div>
        <div class="tip-badges" style="margin-top:4px">
          <span class="tip-pill is-gold">${escHtml(info.spec.tag)}</span>
        </div>
      </div>
    </div>
    <div class="tip-section">
      <div class="tip-sec-hdr">Attack Traits</div>
      <div class="atk-tip-pills">${pillsHtml}</div>
    </div>
    <div class="tip-effect">${escHtml(info.spec.effect)}</div>
  `;
}

function positionPopupNearRect(el: HTMLDivElement, anchorRect: DOMRect, fallbackX: number, fallbackY: number): void {
  const pad = 12;
  const gap = 4;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const rect = el.getBoundingClientRect();

  // Prefer immediately right of anchor/cursor, flip left if offscreen, fallback near cursor
  let left = anchorRect.width > 0 ? Math.min(fallbackX + gap + 6, anchorRect.right + gap) : fallbackX + gap;
  if (anchorRect.width > 0 && anchorRect.width < 220) {
    left = anchorRect.right + gap;
  } else {
    left = fallbackX + gap;
  }
  if (left + rect.width > vw - pad) {
    const leftSide = anchorRect.width > 0 && anchorRect.width < 220 ? anchorRect.left - rect.width - gap : fallbackX - rect.width - gap;
    left = leftSide >= pad ? leftSide : Math.max(pad, vw - rect.width - pad);
  }

  let top = anchorRect.width > 0 && anchorRect.height < 140 ? anchorRect.top - 6 : fallbackY - 24;
  if (top + rect.height > vh - pad) {
    top = Math.max(pad, vh - rect.height - pad);
  }
  if (top < pad) top = pad;

  el.style.left = `${Math.round(left)}px`;
  el.style.top = `${Math.round(top)}px`;
}

export function showAttackSkillTooltip(
  subType: string | undefined,
  slot: 0 | 1,
  damageType: string | undefined,
  anchorRect: DOMRect
): void {
  const pair = getWeaponAttackSpecs(subType, damageType);
  const info = pair[slot];
  const el = ensureAttackTooltipEl();
  el.innerHTML = buildAttackTooltipHtml(info, subType || "Unarmed");
  el.style.display = "flex";

  const pad = 10;
  const gap = 10;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const rect = el.getBoundingClientRect();

  let left = anchorRect.right + gap;
  if (left + rect.width > vw - pad) {
    const altLeft = anchorRect.left - rect.width - gap;
    left = altLeft >= pad ? altLeft : Math.max(pad, vw - rect.width - pad);
  }
  let top = anchorRect.top - 8;
  if (top + rect.height > vh - pad) {
    top = Math.max(pad, vh - rect.height - pad);
  }
  if (top < pad) top = pad;

  el.style.left = `${Math.round(left)}px`;
  el.style.top = `${Math.round(top)}px`;
}

export function weaponAttackTooltipHandlers(
  subType: string | undefined,
  slot: 0 | 1,
  damageType?: string,
  opts?: { suppressItemTooltip?: boolean }
): {
  onMouseEnter: (e: React.MouseEvent<HTMLElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLElement>) => void;
  onMouseLeave: (e: React.MouseEvent<HTMLElement>) => void;
  onMouseDown: () => void;
} {
  return {
    onMouseEnter: (e) => {
      if (opts?.suppressItemTooltip) {
        e.stopPropagation();
        hideClientItemTooltip();
      }
      const btn = e.currentTarget as HTMLElement;
      clearAttackShowTimer();
      pendingAttackEl = btn;
      attackShowTimer = window.setTimeout(() => {
        attackShowTimer = null;
        if (!btn.isConnected || pendingAttackEl !== btn) return;
        pendingAttackEl = null;
        showAttackSkillTooltip(subType, slot, damageType, btn.getBoundingClientRect());
      }, HOVER_FOCUS_DELAY_MS);
    },
    onMouseMove: (e) => {
      if (opts?.suppressItemTooltip) {
        e.stopPropagation();
      }
    },
    onMouseLeave: (e) => {
      if (opts?.suppressItemTooltip) {
        e.stopPropagation();
      }
      hideAttackTooltip();
    },
    onMouseDown: () => {
      clearAttackShowTimer();
    },
  };
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
  if (entry.damageType) {
    const dtIcons = buildDamageTypeInlineHtml(entry.damageType, 13);
    if (dtIcons) {
      badges.push(`<span class="tip-pill is-gold" style="display:inline-flex;align-items:center;">${dtIcons}${escHtml(cleanDamageTypeLabel(entry.damageType))}</span>`);
    }
  }
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
      ? computeHeroDelta(gearItem, ctx.equippedByHero!, ctx.itemsById!, ctx.activeHeroId!, ctx.preferredSlot)
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

    if (gearItem.category === "weapon") {
      const atkPair = getWeaponAttackSpecs(gearItem.subType, gearItem.damageType);
      const dmgRaw = escHtml(gearItem.damageType ?? "Physical");
      const subRaw = escHtml(gearItem.subType);
      const btnsHtml = atkPair
        .map(
          (info) => `
          <button
            type="button"
            class="tip-atk-btn"
            data-atk-subtype="${subRaw}"
            data-atk-slot="${info.slot}"
            data-atk-dmg="${dmgRaw}"
            aria-label="${escHtml(info.spec.name)}"
          >
            <img src="${escHtml(assetUrl(info.iconPath))}" alt="${escHtml(info.spec.name)}" width="48" height="48" />
          </button>
        `
        )
        .join("");

      bodyHtml += `
        <div class="tip-section tip-attacks-sec">
          <div class="tip-sec-hdr-row">
            <span class="tip-sec-hdr" style="margin-bottom:0">Weapon Attacks</span>
            <span class="tip-atk-hint">Hover icon for details</span>
          </div>
          <div class="tip-attacks-row">${btnsHtml}</div>
        </div>
      `;
    }

    const notes: string[] = [];
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
          <div class="tip-stat-row"><span class="tip-stat-lbl">Element</span><span class="tip-stat-val">${buildDamageTypeInlineHtml(spell.damageType, 13)}${escHtml(spell.damageType)}</span></div>
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
    if (gearItem.zonesStocked || gearItem.regionsStocked) {
      extra.push(`<div><strong>Stocked:</strong> ${escHtml(gearItem.zonesStocked ?? gearItem.regionsStocked)}</div>`);
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

export interface InfoTooltipBadge {
  label: string;
  tone?: "default" | "gold" | "mp" | "up" | "socket";
}

export interface InfoTooltipRow {
  label: string;
  value: string;
  note?: string;
  tone?: "up" | "down" | "flat";
}

export interface InfoTooltipSpec {
  key: string;
  title: string;
  eyebrow?: string;
  iconPath?: string;
  tier?: number | string;
  accentColor?: string;
  badges?: InfoTooltipBadge[];
  statsTitle?: string;
  rows?: InfoTooltipRow[];
  effect?: string;
  notes?: string[];
}

export type TooltipHoverHandlers = {
  onMouseEnter?: (e: React.MouseEvent<HTMLElement>) => void;
  onMouseMove?: (e: React.MouseEvent<HTMLElement>) => void;
  onMouseLeave?: (e: React.MouseEvent<HTMLElement>) => void;
  onMouseDown?: () => void;
};

function tierStepValue(tier?: number | string): number | undefined {
  if (typeof tier === "number") return tier;
  if (!tier) return undefined;
  const upper = tier.trim().toUpperCase();
  if (upper === "S") return 20;
  if (upper === "A") return 16;
  if (upper === "B") return 10;
  if (upper === "C") return 6;
  if (upper === "D") return 3;
  const parsed = Number(upper);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function buildInfoTooltipHtml(spec: InfoTooltipSpec): string {
  const accent = spec.accentColor ?? tierAccentColor(tierStepValue(spec.tier));
  const iconHtml = spec.iconPath
    ? `
      <div class="tip-icon-frame" style="--tier-color:${accent}">
        <img src="${escHtml(assetUrl(spec.iconPath))}" alt="${escHtml(spec.title)}" width="96" height="96" />
      </div>`
    : "";

  const badgesHtml = (spec.badges ?? [])
    .map((b) => `<span class="tip-pill${b.tone && b.tone !== "default" ? ` is-${b.tone}` : ""}">${escHtml(b.label)}</span>`)
    .join("");

  let bodyHtml = "";
  if (spec.rows && spec.rows.length > 0) {
    const rowsHtml = spec.rows
      .map((r) => {
        const noteHtml = r.note ? `<span class="delta-${r.tone ?? "flat"}">${escHtml(r.note)}</span>` : "";
        return `
          <div class="tip-stat-row">
            <span class="tip-stat-lbl">${escHtml(r.label)}</span>
            <span class="tip-stat-val">${escHtml(r.value)} ${noteHtml}</span>
          </div>`;
      })
      .join("");
    bodyHtml += `
      <div class="tip-section">
        <div class="tip-sec-hdr">${escHtml(spec.statsTitle ?? "Details")}</div>
        <div class="tip-stat-grid">${rowsHtml}</div>
      </div>`;
  }
  if (spec.effect) {
    bodyHtml += `<div class="tip-effect">${escHtml(spec.effect)}</div>`;
  }
  if (spec.notes && spec.notes.length > 0) {
    bodyHtml += `<div class="tip-notes">${spec.notes.map((n) => `<div>${escHtml(n)}</div>`).join("")}</div>`;
  }

  return `
    <div class="tip-head">
      ${iconHtml}
      <div class="tip-head-meta">
        ${spec.eyebrow ? `<div class="tip-eyebrow">${escHtml(spec.eyebrow)}</div>` : ""}
        <div class="tip-title font-display">${escHtml(spec.title)}</div>
        ${badgesHtml ? `<div class="tip-badges">${badgesHtml}</div>` : ""}
      </div>
    </div>
    ${bodyHtml}
  `;
}

function hoverTooltipHandlers(
  ctxKey: string,
  buildHtml: () => string,
  opts?: { suppressItemTooltip?: boolean }
): TooltipHoverHandlers {
  const scheduleShow = (targetEl: HTMLElement) => {
    const isAlreadyOpenForThis =
      tooltipEl &&
      tooltipEl.style.display !== "none" &&
      activeItemKey === ctxKey &&
      activeSourceEl === targetEl;
    if (isAlreadyOpenForThis) {
      clearHideTimer();
      clearShowTimer();
      return;
    }

    clearShowTimer();
    pendingItemKey = ctxKey;
    pendingSourceEl = targetEl;
    showTimer = window.setTimeout(() => {
      showTimer = null;
      if (!targetEl.isConnected || pendingItemKey !== ctxKey || pendingSourceEl !== targetEl) {
        return;
      }
      pendingItemKey = null;
      pendingSourceEl = null;
      clearHideTimer();
      hideAttackTooltip();
      const el = ensureTooltipEl();
      activeItemKey = ctxKey;
      activeSourceEl = targetEl;
      el.innerHTML = buildHtml();
      el.style.display = "flex";
      positionPopupNearRect(el, targetEl.getBoundingClientRect(), pendingClientX, pendingClientY);
    }, HOVER_FOCUS_DELAY_MS);
  };

  return {
    onMouseEnter: (e) => {
      if (opts?.suppressItemTooltip) {
        e.stopPropagation();
        hideClientItemTooltip();
      }
      const targetEl = e.currentTarget as HTMLElement;
      pendingClientX = e.clientX;
      pendingClientY = e.clientY;
      scheduleShow(targetEl);
    },
    onMouseMove: (e) => {
      if (opts?.suppressItemTooltip) {
        e.stopPropagation();
      }
      const targetEl = e.currentTarget as HTMLElement;
      pendingClientX = e.clientX;
      pendingClientY = e.clientY;
      if (!opts?.suppressItemTooltip && !pendingAttackEl && pendingSourceEl !== targetEl && activeSourceEl !== targetEl) {
        scheduleShow(targetEl);
      }
    },
    onMouseLeave: (e) => {
      if (opts?.suppressItemTooltip) {
        e.stopPropagation();
      }
      const targetEl = e.currentTarget as HTMLElement;
      if (pendingSourceEl === targetEl) {
        clearShowTimer();
      }
      if (activeSourceEl === targetEl) {
        scheduleTooltipHide(175);
      }
    },
    onMouseDown: () => {
      clearShowTimer();
    },
  };
}

export function itemTooltipHandlers(
  entry: ShopCatalogEntry | null | undefined,
  ctx: TooltipContext = {}
): TooltipHoverHandlers {
  if (!entry) return {};
  const ctxKey = `${entry.id}:${ctx.activeHeroId ?? ""}:${ctx.isSellMode ? "sell" : "buy"}`;
  return hoverTooltipHandlers(ctxKey, () => buildTooltipHtml(entry, ctx));
}

export function infoTooltipHandlers(
  spec: InfoTooltipSpec | null | undefined,
  opts?: { suppressItemTooltip?: boolean }
): TooltipHoverHandlers {
  if (!spec) return {};
  return hoverTooltipHandlers(`info:${spec.key}`, () => buildInfoTooltipHtml(spec), opts);
}

export function runestoneTooltipHandlers(
  stone: RunestoneItem | null | undefined,
  opts?: { suppressItemTooltip?: boolean; hint?: string }
): TooltipHoverHandlers {
  if (!stone) return {};
  return infoTooltipHandlers(
    {
      key: `stone:${stone.id}`,
      title: stone.name,
      eyebrow: `Tier ${stone.tier} Carved Runestone`,
      iconPath: stone.iconPath,
      tier: stone.tier,
      badges: [
        {
          label: stone.target === "weapon" ? "Weapon Socket" : "Armor Socket",
          tone: "socket",
        },
        ...(stone.sellSilver && stone.sellSilver > 0
          ? [{ label: `Sell +${stone.sellSilver.toLocaleString()}s`, tone: "up" as const }]
          : []),
      ],
      effect: stone.affix,
      notes: [
        opts?.hint ??
          "Socket into an open Weapon or Body Armor slot. Carving is permanent — replacing a Runestone destroys the old one.",
      ],
    },
    opts
  );
}
