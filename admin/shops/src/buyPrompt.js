import { HERO_ROSTER } from "./data.js";
import { computeHeroDelta, itemSlotFor } from "./compare.js";
import { esc, formatSilver, makeIconBox } from "./uiParts.js";

export function renderBuyPromptModal(item, state, onConfirm, onCancel) {
  const overlay = document.createElement("div");
  overlay.className = "ff-buy-overlay";

  const modal = document.createElement("div");
  modal.className = "ff-buy-modal";

  const slot = itemSlotFor(item);
  const focusHero = HERO_ROSTER.find((h) => h.id === state.activeHeroId);
  const eligible = slot
    ? [state.activeHeroId].filter((hid) => (item.usableBy ?? [hid]).includes(hid))
    : [];

  const head = document.createElement("div");
  head.className = "ff-buy-head";
  head.appendChild(makeIconBox(item));
  const titleDiv = document.createElement("div");
  titleDiv.innerHTML = `
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#d7b267;">${slot && focusHero ? `Confirm Purchase for ${esc(focusHero.name)}` : "Shared Party Bag Purchase"}</div>
    <div class="font-display" style="font-size:19px;font-weight:700;color:#fae2aa;">${esc(item.name)}</div>
    <div style="font-size:12px;color:#aebbd0;">Cost: <strong style="color:#f6cf7e;">${formatSilver(item.priceSilver)}</strong> · Purse: ${formatSilver(state.silverPurse)}</div>
  `;
  head.appendChild(titleDiv);
  modal.appendChild(head);

  const choices = document.createElement("div");
  choices.className = "ff-buy-choices";

  if (eligible.length > 0) {
    for (const hid of eligible) {
      const hero = HERO_ROSTER.find((h) => h.id === hid);
      const delta = computeHeroDelta(item, state.equippedByHero, hid);
      const oldItem = state.equippedByHero[hid]?.[slot] ?? null;
      const dNum = delta.primaryDiff ?? 0;
      const dCls = dNum > 0 ? "delta-up" : dNum < 0 ? "delta-down" : "delta-flat";

      const row = document.createElement("div");
      row.className = "ff-buy-hero-row";
      row.innerHTML = `
        <img src="${hero.avatar}" alt="${esc(hero.name)}" />
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;font-size:13.5px;color:#f6e7c3;">${esc(hero.name)} <span class="${dCls}" style="font-size:12px;margin-left:6px;">${esc(delta.headline)}</span></div>
          <div style="font-size:11px;color:#9aa8be;">Replaces: ${esc(oldItem?.name ?? "Empty Slot")}</div>
        </div>
      `;

      const btnEquip = document.createElement("button");
      btnEquip.type = "button";
      btnEquip.className = "ff-choice-btn primary";
      btnEquip.textContent = "Equip Now";
      btnEquip.addEventListener("click", () => onConfirm(item, { mode: "equip", heroId: hid }));
      row.appendChild(btnEquip);

      if (oldItem && oldItem.sellSilver > 0) {
        const btnSwapSell = document.createElement("button");
        btnSwapSell.type = "button";
        btnSwapSell.className = "ff-choice-btn trade";
        btnSwapSell.textContent = `Equip & Sell Old (+${formatSilver(oldItem.sellSilver)})`;
        btnSwapSell.addEventListener("click", () => onConfirm(item, { mode: "equip_sell_old", heroId: hid, oldItem }));
        row.appendChild(btnSwapSell);
      }

      choices.appendChild(row);
    }
  }

  const bagRow = document.createElement("div");
  bagRow.className = "ff-buy-footer";
  bagRow.innerHTML = `
    <button type="button" class="ff-choice-btn" data-act="bag">Put in Shared Party Bag (${formatSilver(item.priceSilver)})</button>
    <button type="button" class="ff-choice-btn cancel" data-act="cancel">Cancel</button>
  `;
  bagRow.querySelector('[data-act="bag"]').addEventListener("click", () => onConfirm(item, { mode: "bag" }));
  bagRow.querySelector('[data-act="cancel"]').addEventListener("click", onCancel);

  modal.append(choices, bagRow);
  overlay.appendChild(modal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) onCancel();
  });
  return overlay;
}
