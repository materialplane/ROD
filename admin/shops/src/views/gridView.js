import { formatSilver, makeIconBox } from "../uiParts.js";

export function renderGridView(items, state, onSelect) {
  const grid = document.createElement("div");
  grid.className = "vault-grid";

  for (const item of items) {
    const tile = document.createElement("div");
    tile.className = `vault-tile${state.selectedItemId === item.id ? " active" : ""}`;
    tile.title = `${item.name} (${item.subType})`;

    if (item.step) {
      const st = document.createElement("span");
      st.className = "vault-step";
      st.textContent = `S${item.step}`;
      tile.appendChild(st);
    }

    tile.appendChild(makeIconBox(item));

    const nm = document.createElement("div");
    nm.className = "vault-name";
    nm.textContent = item.name;

    const price = state.vendorTab === "trade_sell" ? item.sellSilver : item.priceSilver;
    const pr = document.createElement("div");
    pr.className = "vault-price";
    pr.textContent = price > 0 ? formatSilver(price) : "Rune";

    tile.append(nm, pr);
    tile.addEventListener("click", () => onSelect(item.id));
    grid.appendChild(tile);
  }
  return grid;
}
