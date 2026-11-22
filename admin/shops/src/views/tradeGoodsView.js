import { esc, formatSilver, makeIconBox } from "../uiParts.js";
import { bindItemTooltip } from "../itemTooltip.js";

// Dedicated Trade Goods NPC Exchange Counter: shows carried trade goods + 1-click Sell All (NO buy list).
export function renderTradeGoodsView(tradeGoods, state, handlers) {
  const wrap = document.createElement("div");
  wrap.className = "tg-wrap";

  const remaining = tradeGoods.filter((it) => !state.soldTradeIds.has(it.id));
  const totalSilver = remaining.reduce((s, it) => s + (it.sellSilver || 0), 0);
  const earnedSilver = tradeGoods
    .filter((it) => state.soldTradeIds.has(it.id))
    .reduce((s, it) => s + (it.sellSilver || 0), 0);

  const banner = document.createElement("div");
  banner.className = "tg-banner";
  banner.innerHTML = `
    <div class="tg-summary">
      <div class="tg-eyebrow">Trade Goods Appraisal</div>
      <div class="tg-headline font-display">${
        remaining.length > 0
          ? `${remaining.length} Trade Goods Ready to Sell`
          : `All Trade Goods Sold (+${formatSilver(earnedSilver)} Earned)`
      }</div>
      <div class="tg-sub">
        ${
          remaining.length > 0
            ? `Total Exchange Value: <strong style="color:#fae2aa;">+${formatSilver(totalSilver)}</strong>`
            : "Bring back more trade goods from the wilds to exchange for Silver."
        }
      </div>
    </div>
    <button type="button" class="btn-buy tg-sell-btn" ${remaining.length === 0 ? "disabled" : ""}>
      ${remaining.length > 0 ? `Sell All Trade Goods (+${formatSilver(totalSilver)})` : "✓ Bag Empty"}
    </button>
  `;
  banner.querySelector(".tg-sell-btn").addEventListener("click", () => handlers.onSellAllTrade(tradeGoods));
  wrap.appendChild(banner);

  if (remaining.length > 0) {
    const manifestHead = document.createElement("div");
    manifestHead.className = "tg-list-head";
    manifestHead.textContent = "Carrying in Party Pack (Weighed All Together)";
    wrap.appendChild(manifestHead);

    const grid = document.createElement("div");
    grid.className = "tg-grid";
    for (const item of remaining) {
      const row = document.createElement("div");
      row.className = "tg-row";
      row.appendChild(makeIconBox(item));

      const meta = document.createElement("div");
      meta.className = "tg-row-info";
      meta.innerHTML = `
        <div class="tg-row-name">${esc(item.name)}</div>
        <div class="tg-row-src">${esc(item.sourceMob ? `Dropped by ${item.sourceMob}` : item.subType)}</div>
      `;
      const val = document.createElement("div");
      val.className = "tg-row-val";
      val.textContent = `+${formatSilver(item.sellSilver)}`;

      row.append(meta, val);
      bindItemTooltip(row, item, state);
      grid.appendChild(row);
    }
    wrap.appendChild(grid);
  }

  return wrap;
}
