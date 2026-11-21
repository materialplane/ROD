import { HERO_ROSTER } from "./data.js";
import { computeHeroDelta, itemSlotFor } from "./compare.js";
import { esc, formatSilver, makeIconBox } from "./uiParts.js";

export function renderDetailPane(item, state, onBuyOrSell, onEquipTest, onOpenBuyPrompt) {
  const pane = document.createElement("aside");
  pane.className = "detail-pane";

  if (!item) {
    pane.innerHTML = `<div style="color:#8f9db3;font-size:13px;">Select an item to inspect its full stats, Runestone socket, and party comparison.</div>`;
    return pane;
  }

  const head = document.createElement("div");
  head.className = "detail-hero-head";
  const iconWrap = document.createElement("div");
  iconWrap.className = "detail-icon-wrap";
  iconWrap.appendChild(makeIconBox(item));

  const titleWrap = document.createElement("div");
  const tierTxt = item.step ? ` · Step ${item.step} (Region ${item.region})` : item.region ? ` · Region ${item.region}` : "";
  titleWrap.innerHTML = `
    <div class="detail-sub">${esc(item.subType)}${esc(tierTxt)}</div>
    <h3 class="detail-name font-display">${esc(item.name)}</h3>
    <div style="font-size:11.5px;color:#b8c7dc;margin-top:4px;">
      ${item.handed ? `${esc(item.handed)} · ${esc(item.damageType)}` : ""}
      ${item.weight ? `${esc(item.weight)} Attire` : ""}
      ${item.runestoneSockets ? " · 1 Permanent Runestone Socket" : ""}
    </div>
  `;
  head.append(iconWrap, titleWrap);
  pane.appendChild(head);

  if (item.effect) {
    const eff = document.createElement("div");
    eff.style.cssText = "font-size:12.5px;line-height:1.5;color:#e6edf8;border-left:2px solid #c8a256;padding-left:10px;";
    eff.textContent = item.effect;
    pane.appendChild(eff);
  }

  // Hero stat comparison table
  const hero = HERO_ROSTER.find((h) => h.id === state.activeHeroId);
  const delta = computeHeroDelta(item, state.equippedByHero, state.activeHeroId);
  const tbl = document.createElement("div");
  tbl.className = "stat-table";

  const hdr = document.createElement("div");
  hdr.style.cssText = "font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#d7b267;margin-bottom:2px;";
  hdr.textContent = hero
    ? delta.comparedTo
      ? `Compare for ${hero.name} (vs ${delta.comparedTo})`
      : `Inspecting for ${hero.name}`
    : "Stats";
  tbl.appendChild(hdr);

  if (!delta.usable) {
    const row = document.createElement("div");
    row.style.cssText = "font-size:12px;color:#f28b95;";
    row.textContent = `${hero?.name ?? "Hero"} cannot equip ${item.subType}.`;
    tbl.appendChild(row);
  } else if (delta.rows.length > 0) {
    for (const r of delta.rows) {
      const row = document.createElement("div");
      row.className = "stat-row";
      const dStr = r.diff > 0 ? `+${r.diff}` : r.diff < 0 ? `${r.diff}` : "0";
      const dCls = r.diff > 0 ? "delta-up" : r.diff < 0 ? "delta-down" : "delta-flat";
      row.innerHTML = `
        <span style="color:#aebbd0;">${esc(r.label)}</span>
        <span><strong>${r.newVal}</strong> <span class="${dCls}">(${dStr})</span></span>
      `;
      tbl.appendChild(row);
    }
  } else if (item.category === "trade_good") {
    const row = document.createElement("div");
    row.className = "stat-row";
    row.innerHTML = `<span style="color:#aebbd0;">Source</span><span>${esc(item.sourceMob ?? "Wilderness")}</span>`;
    tbl.appendChild(row);
  }
  pane.appendChild(tbl);

  // Actions row
  const actions = document.createElement("div");
  actions.className = "detail-actions";

  if (item.category === "spell") {
    const learned = state.learnedSpells?.has(item.id);
    const spellBtn = document.createElement("button");
    spellBtn.className = "btn-buy";
    spellBtn.textContent = learned ? "✓ Spell Learned" : `Learn Spell (${formatSilver(item.priceSilver)})`;
    spellBtn.disabled = learned;
    spellBtn.addEventListener("click", () => onBuyOrSell(item, "spell"));
    actions.appendChild(spellBtn);
  } else if (item.priceSilver > 0) {
    const buyBtn = document.createElement("button");
    buyBtn.className = "btn-buy";
    buyBtn.textContent = `Buy (${formatSilver(item.priceSilver)})`;
    buyBtn.addEventListener("click", () => {
      if (onOpenBuyPrompt) onOpenBuyPrompt(item);
      else onBuyOrSell(item, "buy");
    });
    actions.appendChild(buyBtn);
  }

  if (itemSlotFor(item) && delta.usable) {
    const eqBtn = document.createElement("button");
    eqBtn.className = "btn-equip-test";
    eqBtn.textContent = `Equip on ${hero?.name ?? "Hero"}`;
    eqBtn.addEventListener("click", () => onEquipTest(item, state.activeHeroId));
    actions.appendChild(eqBtn);
  }
  pane.appendChild(actions);

  const dbg = document.createElement("div");
  dbg.className = "asset-debug";
  dbg.textContent = `${item.id} · ${item.iconPath}`;
  pane.appendChild(dbg);

  return pane;
}
