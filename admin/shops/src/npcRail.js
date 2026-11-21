import { esc } from "./uiParts.js";

// Clickable Town NPC Roster replacing the removed bottom "Options" bypass bar.
export function renderNpcRail(hub, state, onSelectNpc) {
  const aside = document.createElement("aside");
  aside.className = "npc-rail";

  const head = document.createElement("div");
  head.className = "npc-rail-head";
  head.innerHTML = `<span>Click NPC to Visit</span><span>${(hub.townNpcs ?? []).length} Here</span>`;
  aside.appendChild(head);

  const list = document.createElement("div");
  list.className = "npc-rail-list";

  for (const npc of hub.townNpcs ?? []) {
    const isSel = state.activeNpcId === npc.id && state.vendorTab !== "audit" && state.vendorTab !== "runestones";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `npc-card${isSel ? " active" : ""}${npc.isShop ? "" : " is-folk"}`;
    btn.dataset.shop = npc.shopType;

    const questPip = npc.hasQuest ? `<span class="npc-q-pip" title="Also offers quest: ${esc(npc.questTitle)}">!</span>` : "";
    btn.innerHTML = `
      <img src="/${esc(npc.portraitPath)}" alt="${esc(npc.name)}" />
      <div class="npc-meta">
        <div class="npc-name-row"><span class="npc-name">${esc(npc.name)}</span>${questPip}</div>
        <div class="npc-role-pill ${npc.shopType === "trade_goods" ? "is-trade" : npc.isShop ? "is-shop" : ""}">${esc(npc.badge)}</div>
      </div>
    `;
    btn.addEventListener("click", () => onSelectNpc(npc));
    list.appendChild(btn);
  }

  aside.appendChild(list);
  return aside;
}
