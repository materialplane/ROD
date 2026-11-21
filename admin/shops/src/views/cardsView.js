import { canHeroUse, shortStatSummary } from "../compare.js";
import { esc, formatSilver, makeIconBox } from "../uiParts.js";

export function renderCardsView(items, state, onSelect) {
  const grid = document.createElement("div");
  grid.className = "cards-grid";

  for (const item of items) {
    const card = document.createElement("div");
    card.className = `shop-card${state.selectedItemId === item.id ? " active" : ""}`;
    card.appendChild(makeIconBox(item));

    const price = state.vendorTab === "trade_sell" ? item.sellSilver : item.priceSilver;
    const ok = canHeroUse(item, state.activeHeroId);

    const info = document.createElement("div");
    info.className = "card-info";
    info.innerHTML = `
      <div class="card-title">${esc(item.name)}</div>
      <div class="card-stats">${esc(shortStatSummary(item))}</div>
      <div class="card-foot">
        <span style="color:${ok ? "#85dfb1" : "#8896ac"}">${esc(item.subType)}</span>
        <strong style="color:#f6cf7e">${price > 0 ? formatSilver(price) : "Runestone"}</strong>
      </div>
    `;
    card.appendChild(info);
    card.addEventListener("click", () => onSelect(item.id));
    grid.appendChild(card);
  }
  return grid;
}
