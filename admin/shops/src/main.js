import { getShopStock, loadStudioData } from "./data.js";
import { createInitialState, syncMockPartyForHub } from "./state.js";
import { itemSlotFor } from "./compare.js";
import { renderInteriorViewport } from "./interiorShell.js";

async function boot() {
  const data = await loadStudioData();
  const state = createInitialState(data.hubs);

  const selHub = document.getElementById("selHub");
  const viewport = document.getElementById("interiorViewport");
  const statsPill = document.getElementById("studioStats");
  statsPill.textContent = `${data.items.length} Items · ${data.spells.length} Spells · ${data.hubs.length} Hubs`;

  // Populate Hub selector grouped cleanly by Region
  const byRegion = new Map();
  for (const h of data.hubs) {
    if (!byRegion.has(h.region)) byRegion.set(h.region, []);
    byRegion.get(h.region).push(h);
  }
  for (const [reg, list] of [...byRegion.entries()].sort((a, b) => a[0] - b[0])) {
    const og = document.createElement("optgroup");
    og.label = `Region ${reg}`;
    for (const h of list) {
      const opt = document.createElement("option");
      const st = h.steps.length > 1 ? `Steps ${h.steps[0]}–${h.steps[h.steps.length - 1]}` : `Step ${h.steps[0]}`;
      const shopCount = (h.townNpcs ?? []).filter((n) => n.isShop).length;
      opt.value = h.id;
      opt.textContent = `${h.name} (${st} · ${shopCount} Shops)`;
      og.appendChild(opt);
    }
    selHub.appendChild(og);
  }
  selHub.value = state.hubId;

  const setActiveHub = (hubId) => {
    state.hubId = hubId;
    selHub.value = hubId;
    const hub = data.hubs.find((h) => h.id === hubId) ?? data.hubs[0];
    syncMockPartyForHub(state, data.items, hub);
    const firstShop = (hub.townNpcs ?? []).find((n) => n.isShop) ?? hub.townNpcs?.[0];
    state.activeNpcId = firstShop?.id ?? null;
    state.vendorTab = firstShop?.shopType ?? "weapon";
    state.catFilter = "all";
    state.selectedItemId = null;
    render();
  };

  const syncAdminTools = () => {
    const group = document.getElementById("segAdminTool");
    if (!group) return;
    for (const b of group.querySelectorAll(".seg-btn")) {
      b.classList.toggle("active", b.dataset.tool === state.vendorTab);
    }
  };

  const render = () => {
    syncAdminTools();
    renderInteriorViewport(viewport, data, state, {
      onSelectNpc: (npc) => {
        state.activeNpcId = npc.id;
        state.vendorTab = npc.shopType;
        state.catFilter = "all";
        state.selectedItemId = null;
        const curHub = data.hubs.find((h) => h.id === state.hubId) ?? data.hubs[0];
        const curStock = getShopStock(data, curHub, state.vendorTab, "all", state.activeHeroId);
        if (!curStock.length) {
          const allStock = getShopStock(data, curHub, state.vendorTab, "all", null);
          const firstMatch = state.partyIds.find((hid) => allStock.some((x) => !x.usableBy || x.usableBy.includes(hid)));
          if (firstMatch) state.activeHeroId = firstMatch;
        }
        render();
      },
      onPickHub: (hubId) => setActiveHub(hubId),
      onFilter: (cid) => {
        state.catFilter = cid;
        state.selectedItemId = null;
        render();
      },
      onSelectItem: (id) => {
        state.selectedItemId = id;
        render();
      },
      onPickHero: (hid) => {
        state.activeHeroId = hid;
        state.selectedItemId = null;
        render();
      },
      onBuyOrSell: (item, mode) => {
        if (mode === "spell") {
          if (!state.learnedSpells.has(item.id) && state.silverPurse >= item.priceSilver) {
            state.silverPurse -= item.priceSilver;
            state.learnedSpells.add(item.id);
          }
        } else if (mode === "sell") {
          if (!state.soldTradeIds.has(item.id)) {
            state.soldTradeIds.add(item.id);
            state.silverPurse += item.sellSilver || 0;
          }
        } else if (state.silverPurse >= item.priceSilver) {
          state.silverPurse -= item.priceSilver;
          const slot = itemSlotFor(item);
          if (slot && item.usableBy?.includes(state.activeHeroId)) {
            state.equippedByHero[state.activeHeroId][slot] = item;
          }
        }
        render();
      },
      onSellAllTrade: (stock) => {
        for (const it of stock) {
          if (!state.soldTradeIds.has(it.id)) {
            state.soldTradeIds.add(it.id);
            state.silverPurse += it.sellSilver || 0;
          }
        }
        render();
      },
      onEquipTest: (item, heroId) => {
        const slot = itemSlotFor(item);
        if (slot) state.equippedByHero[heroId][slot] = item;
        render();
      },
      onOpenBuyPrompt: (item) => {
        state.buyPromptItem = item;
        render();
      },
      onCloseBuyPrompt: () => {
        state.buyPromptItem = null;
        render();
      },
      onConfirmBuyPrompt: (item, opts) => {
        if (state.silverPurse >= item.priceSilver) {
          state.silverPurse -= item.priceSilver;
          const slot = itemSlotFor(item);
          if (opts.mode === "equip" || opts.mode === "equip_sell_old") {
            if (slot && opts.heroId) state.equippedByHero[opts.heroId][slot] = item;
            if (opts.mode === "equip_sell_old" && opts.oldItem) {
              state.silverPurse += opts.oldItem.sellSilver || 0;
            }
          }
        }
        state.buyPromptItem = null;
        render();
      },
    });
  };

  selHub.addEventListener("change", () => setActiveHub(selHub.value));
  const selSquad = document.getElementById("selSquad");
  if (selSquad) {
    selSquad.addEventListener("change", () => {
      state.partyIds = selSquad.value.split(",");
      if (!state.partyIds.includes(state.activeHeroId)) {
        state.activeHeroId = state.partyIds[0];
      }
      render();
    });
  }

  const adminGroup = document.getElementById("segAdminTool");
  if (adminGroup) {
    adminGroup.addEventListener("click", (e) => {
      const btn = e.target.closest(".seg-btn");
      if (!btn) return;
      const tool = btn.dataset.tool;
      if (state.vendorTab === tool) {
        const hub = data.hubs.find((h) => h.id === state.hubId) ?? data.hubs[0];
        const npc = (hub.townNpcs ?? []).find((n) => n.id === state.activeNpcId) ?? hub.townNpcs?.[0];
        state.vendorTab = npc?.shopType ?? "weapon";
      } else {
        state.vendorTab = tool;
      }
      state.catFilter = "all";
      state.selectedItemId = null;
      render();
    });
  }

  const wireSeg = (elId, key, cast = (v) => v) => {
    const group = document.getElementById(elId);
    group.addEventListener("click", (e) => {
      const btn = e.target.closest(".seg-btn");
      if (!btn) return;
      state[key] = cast(btn.dataset.val);
      for (const b of group.querySelectorAll(".seg-btn")) b.classList.toggle("active", b === btn);
      render();
    });
  };

  wireSeg("segLayout", "layout");
  wireSeg("segFrame", "frameStyle");
  wireSeg("segSize", "iconSize", Number);
  wireSeg("segViewport", "viewportMode");

  setActiveHub(state.hubId);
}

boot().catch((err) => {
  console.error(err);
  document.getElementById("interiorViewport").innerHTML = `<div style="padding:24px;color:#f28b95;">Failed to load Shops Mockup Studio: ${err.message}</div>`;
});
