import { HERO_ROSTER } from "../data.js";
import { WEAPON_ATTACK_MODES, cleanDamageTypeLabel, computeHeroDelta, itemOwnStatRows } from "../compare.js";
import { bindItemTooltip } from "../itemTooltip.js";
import { esc, formatSilver, makeIconBox } from "../uiParts.js";

function heroName(id) {
  return HERO_ROSTER.find((h) => h.id === id)?.name ?? id;
}

function statValueText(row, val) {
  const suf = row.label.includes("%") ? "%" : "";
  return `${val}${suf}`;
}

function buildDeltaPill(row) {
  const isPct = row.label.includes("%");
  const suf = isPct ? "%" : "";
  if (row.curVal === 0 && row.newVal > 0) return `<span class="ff-dpill is-up">★ +${row.diff}${suf}</span>`;
  if (row.diff > 0) return `<span class="ff-dpill is-up">▲ +${row.diff}${suf}</span>`;
  if (row.diff < 0) return `<span class="ff-dpill is-down">▼ ${row.diff}${suf}</span>`;
  return `<span class="ff-dpill is-flat">Same</span>`;
}

function buildSwapCard(label, item, subText, extraClass, state) {
  const card = document.createElement("div");
  card.className = `ff-swap-card ${extraClass}`;
  if (item) {
    card.appendChild(makeIconBox(item));
    if (state) bindItemTooltip(card, item, state);
  } else {
    const empty = document.createElement("div");
    empty.className = "ff-empty-icon";
    empty.textContent = "—";
    card.appendChild(empty);
  }
  const info = document.createElement("div");
  info.className = "ff-swap-info";
  info.innerHTML = `
    <div class="ff-swap-eyebrow">${esc(label)}</div>
    <div class="ff-swap-name">${esc(item?.name ?? "Empty Slot")}</div>
    <div class="ff-swap-sub">${esc(subText)}</div>
  `;
  card.appendChild(info);
  return card;
}

function renderTraitsHtml(item, slot) {
  const chips = [];
  if (item.damageType) chips.push(`<span class="ff-tchip is-accent">${esc(cleanDamageTypeLabel(item.damageType))}</span>`);
  if (item.handed) {
    chips.push(`<span class="ff-tchip">${item.handed === "2H" ? "2H · Uses Both Hands" : "1H · Allows Shield"}</span>`);
  }
  if (item.weight) chips.push(`<span class="ff-tchip">${esc(item.weight)} Armor</span>`);
  if (item.runestoneSockets > 0) {
    chips.push(`<span class="ff-tchip is-socket">◆ ${item.runestoneSockets} Runestone Socket</span>`);
  } else if (slot && ["right_hand", "body", "head", "left_hand", "accessory"].includes(slot)) {
    chips.push(`<span class="ff-tchip">No Runestone Socket</span>`);
  }
  if (item.usableBy?.length) {
    chips.push(`<span class="ff-tchip">For: ${esc(item.usableBy.map(heroName).join(", "))}</span>`);
  }

  const attacks = item.category === "weapon" ? WEAPON_ATTACK_MODES[item.subType] : null;
  const extraLines = [];
  if (attacks) {
    extraLines.push(
      `<div class="ff-trait-line"><strong>Weapon Attacks:</strong> ${esc(attacks[0])} <span class="ff-sep">·</span> ${esc(attacks[1])}</div>`
    );
  }
  if (item.stats?.passiveBonus) {
    extraLines.push(
      `<div class="ff-trait-line"><strong>Passive Bonus:</strong> ${esc(item.stats.passiveBonus)}</div>`
    );
  }
  if (!slot && item.effect) {
    extraLines.push(`<div class="ff-effect-copy">${esc(item.effect)}</div>`);
  }

  if (!chips.length && !extraLines.length) return "";
  return `
    <div class="ff-traits-band">
      ${chips.length ? `<div class="ff-tchips">${chips.join("")}</div>` : ""}
      ${extraLines.join("")}
    </div>
  `;
}

export function buildClassicCompareBox(item, state, handlers) {
  const box = document.createElement("div");
  box.className = "ff-box ff-stat-box";
  if (!item) {
    const hero = HERO_ROSTER.find((h) => h.id === state.activeHeroId);
    box.innerHTML = `<div style="margin:auto;text-align:center;color:#9fb0c9;font-size:14.5px;padding:18px;">Select an item on the left—or click another hero above if <strong style="color:#fae2aa;">${esc(hero?.name ?? "this hero")}</strong> has no items in this shop.</div>`;
    return box;
  }

  const focusHero = HERO_ROSTER.find((h) => h.id === state.activeHeroId);
  const delta = computeHeroDelta(item, state.equippedByHero, state.activeHeroId);
  const slot = delta.slot;
  const isGear = Boolean(slot);
  const isSpell = item.category === "spell";
  const heroGear = state.equippedByHero?.[state.activeHeroId] ?? {};
  const sameEquipped = Boolean(isGear && delta.comparedItem?.id === item.id);
  const alreadyLearned = Boolean(isSpell && state.learnedSpells?.has(item.id));

  // 1. Header Bar
  const head = document.createElement("div");
  head.className = "ff-cmp-head";
  let badgeClass = "is-flat";
  let badgeLabel = delta.headline;
  if (isSpell) {
    if (!delta.usable) { badgeClass = "is-bad"; badgeLabel = "Wrong Class"; }
    else if (alreadyLearned) { badgeClass = "is-same"; badgeLabel = "✓ Already Learned"; }
    else { badgeClass = "is-up"; badgeLabel = `Can Learn (${item.mpCost} MP)`; }
  } else if (!isGear) {
    badgeLabel = item.subType || "Utility";
  } else if (!delta.usable) {
    badgeClass = "is-bad";
    badgeLabel = "Cannot Equip";
  } else if (sameEquipped) {
    badgeClass = "is-same";
    badgeLabel = "= Already Wearing";
  } else if ((delta.primaryDiff ?? 0) > 0) {
    badgeClass = "is-up";
    badgeLabel = `▲ ${delta.headline}`;
  } else if ((delta.primaryDiff ?? 0) < 0) {
    badgeClass = "is-down";
    badgeLabel = `▼ ${delta.headline}`;
  } else if (!delta.comparedItem) {
    badgeClass = "is-up";
    badgeLabel = "★ Empty Slot";
  }

  head.innerHTML = (isGear || isSpell) && focusHero
    ? `
      <div class="ff-cmp-hero">
        <img src="${focusHero.avatar}" alt="${esc(focusHero.name)}" />
        <div>
          <div class="ff-cmp-heroname">${esc(focusHero.name)} · ${esc(focusHero.className)}</div>
          <div class="ff-cmp-slot">${isSpell ? `${esc(item.name)} · Tier ${item.region}` : `${esc(delta.slotLabel)}${item.subType ? ` · ${esc(item.subType)}` : ""}`}</div>
        </div>
      </div>
      <span class="ff-cmp-badge ${badgeClass}">${esc(badgeLabel)}</span>
    `
    : `
      <div class="ff-cmp-hero">
        <div>
          <div class="ff-cmp-heroname">${esc(item.name)}</div>
          <div class="ff-cmp-slot">${esc(item.subType || "Party Supply")}</div>
        </div>
      </div>
      <span class="ff-cmp-badge ${badgeClass}">${esc(badgeLabel)}</span>
    `;
  box.appendChild(head);

  // Scroll-safe body wrapper for Deck / Desktop fit
  const body = document.createElement("div");
  body.className = "ff-cmp-body";

  // 2. Visual Swap Banner (Wearing -> Buying) or Notice
  if (isGear && delta.usable) {
    const swap = document.createElement("div");
    swap.className = "ff-swap-strip";
    const curSub = delta.comparedItem
      ? `Equipped · Sell +${formatSilver(delta.comparedItem.sellSilver)}`
      : "No item equipped";
    const newSub = `${item.handed ? `${item.handed} · ` : item.subType ? `${item.subType} · ` : ""}${item.priceSilver > 0 ? formatSilver(item.priceSilver) : "Relic"}`;
    swap.append(
      buildSwapCard("Currently Wearing", delta.comparedItem, curSub, "is-cur", state),
      Object.assign(document.createElement("div"), { className: `ff-swap-arrow ${(delta.primaryDiff ?? 0) > 0 ? "is-up" : ""}`, innerHTML: "&rarr;" }),
      buildSwapCard(sameEquipped ? "Matching Shop Item" : "Shop Item", item, newSub, `is-new${sameEquipped ? " is-same" : ""}`, state)
    );
    body.appendChild(swap);
  }

  if (isGear && !delta.usable && focusHero) {
    const notice = document.createElement("div");
    notice.className = "ff-cmp-notice";
    const partyUsable = (item.usableBy ?? []).filter((id) => state.partyIds.includes(id));
    const keepUsable = (item.usableBy ?? []).filter((id) => !state.partyIds.includes(id));
    const msg = document.createElement("span");
    msg.textContent = `${focusHero.name} cannot equip ${item.subType || "this gear"}.`;
    notice.appendChild(msg);
    if (partyUsable.length > 0) {
      for (const hid of partyUsable) {
        const sw = document.createElement("button");
        sw.type = "button";
        sw.className = "ff-switch-btn";
        sw.textContent = `Compare ${heroName(hid)} →`;
        sw.addEventListener("click", () => handlers.onPickHero(hid));
        notice.appendChild(sw);
      }
    } else if (keepUsable.length > 0) {
      const k = document.createElement("strong");
      k.textContent = `Usable by ${keepUsable.map(heroName).join(", ")} (at Highcrown Keep)`;
      notice.appendChild(k);
    }
    body.appendChild(notice);
  } else if (delta.unequipsShieldFor2H && heroGear.left_hand) {
    const warn = document.createElement("div");
    warn.className = "ff-cmp-notice is-warn";
    warn.textContent = `Two-Handed Weapon — equipping unequips ${heroGear.left_hand.name} from Left Hand.`;
    body.appendChild(warn);
  } else if (delta.leftHandBlockedBy2H && heroGear.right_hand) {
    const warn = document.createElement("div");
    warn.className = "ff-cmp-notice is-warn";
    warn.textContent = `Requires a 1H Weapon — ${focusHero?.name ?? "Hero"} currently holds ${heroGear.right_hand.name} (2H).`;
    body.appendChild(warn);
  }

  // 3. Responsive Stat Comparison Tiles or Spell Specs
  const rows = delta.usable ? delta.rows : itemOwnStatRows(item);
  if (isSpell) {
    if (!delta.usable && focusHero) {
      const swNotice = document.createElement("div");
      swNotice.className = "ff-cmp-notice";
      const casterIds = item.usableBy ?? [];
      const inParty = casterIds.filter((id) => state.partyIds.includes(id));
      swNotice.innerHTML = `<span>${esc(focusHero.name)} cannot learn ${esc(item.name)}.</span>`;
      for (const cid of inParty) {
        const sw = document.createElement("button");
        sw.type = "button";
        sw.className = "ff-switch-btn";
        sw.textContent = `Select ${heroName(cid)} →`;
        sw.addEventListener("click", () => handlers.onPickHero(cid));
        swNotice.appendChild(sw);
      }
      if (!inParty.length && casterIds.length) {
        swNotice.insertAdjacentHTML("beforeend", `<strong>Spell for ${esc(casterIds.map(heroName).join(", "))} (at Keep)</strong>`);
      }
      body.appendChild(swNotice);
    }
    const spot = document.createElement("div");
    spot.className = "ff-spell-spotlight";
    const artSrc = "/" + String(item.iconPath || "").replace(/^assets\//, "assets/");
    const learnedTag = state.learnedSpells?.has(item.id) ? "Learned" : formatSilver(item.priceSilver);
    spot.innerHTML = `
      <div class="ff-spell-spotlight-art">
        <img src="${esc(artSrc)}" alt="${esc(item.name)}" draggable="false" />
      </div>
      <div class="ff-spell-specs">
        <div class="ff-stat-tile"><div class="ff-stile-top"><span class="ff-stile-lbl">MP Cost</span></div><div class="ff-stile-vals"><span class="ff-sval-new is-mp">${item.mpCost} MP</span></div></div>
        <div class="ff-stat-tile"><div class="ff-stile-top"><span class="ff-stile-lbl">Element / Type</span></div><div class="ff-stile-vals"><span class="ff-sval-new">${esc(item.damageType)}</span></div></div>
        <div class="ff-stat-tile"><div class="ff-stile-top"><span class="ff-stile-lbl">Target</span></div><div class="ff-stile-vals"><span class="ff-sval-new">${esc(item.target)}</span></div></div>
        <div class="ff-stat-tile"><div class="ff-stile-top"><span class="ff-stile-lbl">Grimoire Tier</span></div><div class="ff-stile-vals"><span class="ff-sval-new is-tier">Tier ${item.region} · ${esc(learnedTag)}</span></div></div>
      </div>
    `;
    bindItemTooltip(spot.querySelector(".ff-spell-spotlight-art"), item, state);
    body.appendChild(spot);
  } else if (rows.length > 0) {
    const grid = document.createElement("div");
    const gridMod = rows.length === 1 ? " is-single" : rows.length === 3 ? " is-3col" : "";
    grid.className = `ff-stat-grid${gridMod}`;
    for (const r of rows) {
      const tile = document.createElement("div");
      const valCls = r.diff > 0 ? "delta-up" : r.diff < 0 ? "delta-down" : "delta-flat";
      tile.className = `ff-stat-tile${delta.usable && r.diff > 0 ? " is-up" : delta.usable && r.diff < 0 ? " is-down" : ""}`;
      tile.innerHTML = delta.usable
        ? `
          <div class="ff-stile-top">
            <span class="ff-stile-lbl">${esc(r.label)}</span>
            ${buildDeltaPill(r)}
          </div>
          <div class="ff-stile-vals">
            <span class="ff-sval-cur">${statValueText(r, r.curVal)}</span>
            <span class="ff-sval-arr">&rarr;</span>
            <span class="ff-sval-new ${valCls}">${statValueText(r, r.newVal)}</span>
          </div>
        `
        : `
          <div class="ff-stile-top">
            <span class="ff-stile-lbl">${esc(r.label)}</span>
            <span class="ff-dpill is-flat">Stat</span>
          </div>
          <div class="ff-stile-vals">
            <span class="ff-sval-new">${r.newVal > 0 ? "+" : ""}${statValueText(r, r.newVal)}</span>
          </div>
        `;
      grid.appendChild(tile);
    }
    body.appendChild(grid);
  } else if (!isGear && item.iconPath) {
    const card = buildSwapCard(state.vendorTab === "trade_sell" ? "From Party Bag" : "Merchant Stock", item, item.sourceMob ? `Dropped by ${item.sourceMob}` : "Stacks in Shared Party Bag", "is-single-item", state);
    body.appendChild(card);
  }

  // 4. Traits, Weapon Attacks & Effects
  const traitsHtml = renderTraitsHtml(item, slot);
  if (traitsHtml) body.insertAdjacentHTML("beforeend", traitsHtml);
  box.appendChild(body);

  // 5. Footer Strip (Trade-in Math + Buy/Sell Action)
  const foot = document.createElement("div");
  foot.className = "ff-stat-foot";
  let footNote = item.subType || "Supply";
  if (isSpell) {
    footNote = alreadyLearned ? `${item.usableBy.map(heroName).join(", ")} knows this spell` : `Teaches ${item.usableBy.map(heroName).join(", ")} (Tier ${item.region})`;
  } else if (sameEquipped) {
    footNote = `${focusHero?.name ?? "Hero"} already wears this item`;
  } else if (isGear && delta.usable && delta.comparedItem?.sellSilver > 0 && item.priceSilver > 0) {
    const net = Math.max(0, item.priceSilver - delta.comparedItem.sellSilver);
    footNote = `Trade in old: +${formatSilver(delta.comparedItem.sellSilver)} · Net: ${formatSilver(net)}`;
  } else if (isGear) {
    footNote = `${delta.slotLabel} · ${item.subType}`;
  }

  const buyBtnLabel = isGear && focusHero ? `Buy for ${focusHero.name} (${formatSilver(item.priceSilver)})` : `Buy (${formatSilver(item.priceSilver)})`;
  const actionHtml = isSpell
    ? `<button type="button" class="btn-buy ff-action-btn" data-act="spell" ${alreadyLearned ? "disabled" : ""}>${alreadyLearned ? "✓ Learned" : `Learn Spell (${formatSilver(item.priceSilver)}) →`}</button>`
    : item.priceSilver > 0
      ? `<button type="button" class="btn-buy ff-action-btn" data-act="buy">${esc(buyBtnLabel)} &rarr;</button>`
      : "";

  foot.innerHTML = `<span class="ff-foot-note">${esc(footNote)}</span>${actionHtml}`;
  const actBtn = foot.querySelector(".ff-action-btn");
  if (actBtn) {
    actBtn.addEventListener("click", () => {
      if (actBtn.dataset.act === "spell") handlers.onBuyOrSell(item, "spell");
      else if (handlers.onOpenBuyPrompt) handlers.onOpenBuyPrompt(item);
      else handlers.onBuyOrSell(item, "buy");
    });
  }
  box.appendChild(foot);
  return box;
}
