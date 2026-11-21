import { HERO_ROSTER } from "../data.js";
import { canHeroUse, shortStatSummary } from "../compare.js";
import { esc, formatSilver, makeIconBox } from "../uiParts.js";

export function renderLedgerView(items, state, onSelect) {
  const list = document.createElement("div");
  list.className = "ledger-list";

  for (const item of items) {
    const row = document.createElement("div");
    row.className = `ledger-row${state.selectedItemId === item.id ? " active" : ""}`;
    row.appendChild(makeIconBox(item));

    const usable = item.usableBy ?? [];
    const inParty = usable.filter((hid) => state.partyIds.includes(hid));
    const atKeep = usable.filter((hid) => !state.partyIds.includes(hid));
    const toNames = (ids) => ids.map((hid) => HERO_ROSTER.find((h) => h.id === hid)?.name ?? hid);
    let partyTag = "";
    let tagColor = "#8b98ae";
    if (usable.length > 0) {
      if (inParty.length === 4) {
        partyTag = "All 4";
        tagColor = "#9ed8b8";
      } else if (inParty.length > 0) {
        partyTag = toNames(inParty).join(", ");
        tagColor = canHeroUse(item, state.activeHeroId) ? "#9ed8b8" : "#c7d3e6";
      } else {
        partyTag = `${toNames(atKeep).join(", ")} (at Keep)`;
      }
    }
    const price = state.vendorTab === "trade_sell" ? item.sellSilver : item.priceSilver;

    const main = document.createElement("div");
    main.className = "row-main";
    main.innerHTML = `
      <div class="row-title">${esc(item.name)}</div>
      <div class="row-sub">${esc(item.subType)} · ${esc(shortStatSummary(item))}${partyTag ? ` · <span style="color:${tagColor}">${esc(partyTag)}</span>` : ""}</div>
    `;

    const pEl = document.createElement("div");
    pEl.className = "row-price";
    pEl.textContent = price > 0 ? formatSilver(price) : (item.step ? `Step ${item.step}` : "Relic");

    row.append(main, pEl);
    row.addEventListener("click", () => onSelect(item.id));
    list.appendChild(row);
  }
  return list;
}
