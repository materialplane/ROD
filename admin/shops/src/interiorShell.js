import { getShopStock } from "./data.js";
import { SHOP_META } from "./shopTypes.js";
import { renderNpcRail } from "./npcRail.js";
import { renderClassicFfView } from "./views/classicFfView.js";
import { renderTradeGoodsView } from "./views/tradeGoodsView.js";
import { renderHubAuditView } from "./views/hubAuditView.js";
import { renderBuyPromptModal } from "./buyPrompt.js";
import { hideItemTooltip } from "./itemTooltip.js";
import { esc, formatSilver } from "./uiParts.js";

export function renderInteriorViewport(viewport, data, state, handlers) {
  hideItemTooltip();
  const hub = data.hubs.find((h) => h.id === state.hubId) ?? data.hubs[0];
  if (!hub) return;

  viewport.className = `interior-viewport frame-${state.frameStyle}${state.viewportMode !== "full" ? ` mode-${state.viewportMode}` : ""}`;
  viewport.style.setProperty("--icon-size", `${state.iconSize}px`);
  viewport.innerHTML = "";

  // 1. 16:9 Town Interior Backdrop + Vignette
  const bg = document.createElement("div");
  bg.className = "interior-bg";
  bg.style.backgroundImage = `url('/${hub.interiorAssetPath}')`;
  const vig = document.createElement("div");
  vig.className = "interior-vignette";
  viewport.append(bg, vig);

  // 2. Interior Header
  const header = document.createElement("header");
  header.className = "interior-header";
  const stepBadge = hub.steps.length > 1 ? `Gear Tiers ${hub.steps[0]}–${hub.steps[hub.steps.length - 1]}` : `Gear Tier ${hub.steps[0]}`;
  const crestHtml = hub.bannerAssetPath
    ? `<img class="hub-banner" src="/${esc(hub.bannerAssetPath)}" alt="" />`
    : `<img class="hub-pin" src="/${esc(hub.assetPath || "")}" alt="" />`;
  const factionHtml = hub.factionName
    ? `<span class="faction-pill" style="border-color:${esc(hub.factionPrimaryColor || "#8c7445")};background:${esc(hub.factionSecondaryColor || "#1d2230")};color:${esc(hub.factionPrimaryColor || "#f4cf83")};">${esc(hub.factionName)}</span>`
    : "";

  header.innerHTML = `
    <div class="hub-ident">
      ${crestHtml}
      <div>
        <div class="hub-title-row">
          <h1 class="hub-title font-display">${esc(hub.name)}</h1>
          ${factionHtml}
        </div>
        <div class="hub-sub">${esc(hub.playerKind || hub.kind)} · ${esc(hub.playerRegion || `Region ${hub.region}`)} · ${esc(stepBadge)}</div>
      </div>
    </div>
    <div class="header-right">
      <div class="purse-pill">Silver Purse: ${formatSilver(state.silverPurse)}</div>
    </div>
  `;
  viewport.appendChild(header);

  // 3. Town Stage Split: Left Clickable NPC Roster + Right Ledger Panel (ZERO bottom Options bypass!)
  const body = document.createElement("div");
  body.className = "interior-body town-stage-split";

  body.appendChild(renderNpcRail(hub, state, handlers.onSelectNpc));

  const shell = document.createElement("div");
  shell.className = "ledger-shell";
  shell.innerHTML = `
    <span class="filigree f-tl"></span>
    <span class="filigree f-tr"></span>
    <span class="filigree f-bl"></span>
    <span class="filigree f-br"></span>
  `;

  if (state.vendorTab === "audit") {
    shell.appendChild(renderHubAuditView(data.hubs, handlers.onPickHub));
  } else {
    const npcs = hub.townNpcs ?? [];
    const activeNpc = npcs.find((n) => n.id === state.activeNpcId) ?? npcs[0] ?? null;

    if (state.vendorTab === "npc_service" && activeNpc) {
      const box = document.createElement("div");
      box.className = "npc-service-card";
      box.innerHTML = `
        <img src="/${esc(activeNpc.portraitPath)}" alt="${esc(activeNpc.name)}" />
        <div class="npc-svc-copy">
          <div class="vendor-role">${esc(activeNpc.roleLabel)}</div>
          <h2 class="vendor-name font-display" style="font-size:24px;margin:4px 0 8px;">${esc(activeNpc.name)}</h2>
          <p class="npc-svc-quote">“${esc(activeNpc.quote)}”</p>
          <div class="npc-svc-hint">Select any shopkeeper portrait on the left (Weapon Shop, Armor Shop, Tailor, Magic Shop, Arcanist, Adventurer Shop, or Trade Goods Buyer) to open their counter.</div>
        </div>
      `;
      shell.appendChild(box);
    } else {
      const meta = SHOP_META[state.vendorTab] ?? { label: "Carved Runestone Gallery", quote: "Socket preview for Carved Runestones.", pills: [] };
      const stock = getShopStock(data, hub, state.vendorTab, state.catFilter, state.activeHeroId);
      const anyHubStock = getShopStock(data, hub, state.vendorTab, state.catFilter, null);
      let selected = stock.find((x) => x.id === state.selectedItemId) ?? stock[0] ?? null;
      if (!selected) state.selectedItemId = null;
      else if (state.selectedItemId !== selected.id) state.selectedItemId = selected.id;

      const vName = state.vendorTab === "runestones" ? "Carved Runestones" : (activeNpc?.name ?? `${hub.name} Merchant`);
      const vPortrait = state.vendorTab === "runestones" ? "/assets/icons/runestones/rn_01_lesser_blazing_slate.webp" : `/${activeNpc?.portraitPath ?? "assets/portraits/npcs/npc_res_ironcrest_smith.webp"}`;
      const vRole = state.vendorTab === "runestones"
        ? "Permanent Gear Socket Preview"
        : state.vendorTab === "magic"
          ? `Magic Shop · Tier ${hub.spellTier || hub.region} Spells`
          : state.vendorTab === "trade_goods"
            ? "Dedicated Trade Goods Exchange"
            : `${meta.label} · ${hub.name}`;
      const questChipHtml = activeNpc?.hasQuest
        ? `<span class="vendor-quest-pill">! Quest: ${esc(activeNpc.questTitle)}</span>`
        : "";

      const topBand = document.createElement("div");
      topBand.className = "shop-top-band";
      topBand.innerHTML = `
        <div class="vendor-card">
          <img class="vendor-portrait" src="${esc(vPortrait)}" alt="${esc(vName)}" />
          <div>
            <div class="vendor-role">${esc(vRole)} ${questChipHtml}</div>
            <div class="vendor-name font-display">${esc(vName)}</div>
            <div class="vendor-quote">“${esc(activeNpc?.quote ?? meta.quote)}”</div>
          </div>
        </div>
      `;
      shell.appendChild(topBand);

      if (state.vendorTab === "trade_goods") {
        shell.appendChild(renderTradeGoodsView(stock, state, handlers));
      } else {
        if (meta.pills?.length) {
          const fRow = document.createElement("div");
          fRow.className = "shop-filter-row";
          const pills = document.createElement("div");
          pills.className = "cat-pills";
          for (const [cid, label] of meta.pills) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = `cat-pill${state.catFilter === cid ? " active" : ""}`;
            btn.textContent = label;
            btn.addEventListener("click", () => handlers.onFilter(cid));
            pills.appendChild(btn);
          }
          fRow.appendChild(pills);
          shell.appendChild(fRow);
        }

        shell.appendChild(renderClassicFfView(stock, selected, state, handlers, anyHubStock));
      }

      if (state.buyPromptItem) {
        shell.appendChild(renderBuyPromptModal(state.buyPromptItem, state, handlers.onConfirmBuyPrompt, handlers.onCloseBuyPrompt));
      }
    }
  }

  body.appendChild(shell);
  viewport.appendChild(body);
}
