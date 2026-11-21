import { esc } from "../uiParts.js";

export function renderHubAuditView(hubs, onPickHub) {
  const wrap = document.createElement("div");
  wrap.className = "audit-wrap";

  const intro = document.createElement("div");
  intro.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;";
  intro.innerHTML = `
    <div>
      <strong style="color:#fae2aa;font-size:15px;">Complete Ethoria Town Shops (${hubs.length} Settlements · Click Any Row to Visit)</strong>
      <div style="font-size:12px;color:#9aa8be;">Each settlement stocks shops matching its town type (Weapon, Armor, Tailor, Magic, Arcanist, Adventurer &amp; Trade Goods NPC).</div>
    </div>
  `;
  wrap.appendChild(intro);

  const tbl = document.createElement("table");
  tbl.className = "audit-table";
  tbl.innerHTML = `
    <thead>
      <tr>
        <th>Region</th>
        <th>Town / Kind</th>
        <th>Steps</th>
        <th>Resident Shopkeepers</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = tbl.querySelector("tbody");
  for (const h of hubs) {
    const tr = document.createElement("tr");
    const stepText = h.steps.length > 1 ? `Steps ${h.steps[0]}–${h.steps[h.steps.length - 1]}` : `Step ${h.steps[0]}`;
    const libBadge = h.postLiberation ? ` <span style="color:#f2a8b2;font-size:10.5px;">(Post-Lib)</span>` : "";
    const shops = (h.townNpcs ?? []).filter((n) => n.isShop);
    const pills = shops
      .map((s) => `<span class="audit-shop-tag${s.shopType === "trade_goods" ? " is-trade" : ""}">${esc(s.badge)}</span>`)
      .join(" ");

    tr.innerHTML = `
      <td><strong>R${h.region}</strong></td>
      <td><strong style="color:#f7e4b6;">${esc(h.name)}</strong>${libBadge}<div style="font-size:10.5px;color:#8e9cb4;">${esc(h.playerKind || h.kind)}</div></td>
      <td><span style="color:#97d9eb;font-weight:700;">${esc(stepText)}</span></td>
      <td><div style="display:flex;flex-wrap:wrap;gap:4px;">${pills}</div></td>
    `;
    tr.addEventListener("click", () => onPickHub(h.id));
    tbody.appendChild(tr);
  }

  wrap.appendChild(tbl);
  return wrap;
}
