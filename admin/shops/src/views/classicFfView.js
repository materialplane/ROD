import { HERO_ROSTER } from "../data.js";
import { computeHeroDelta, itemSlotFor } from "../compare.js";
import { esc, formatSilver, makeIconBox } from "../uiParts.js";
import { buildClassicCompareBox } from "./classicCompareBox.js";

export function renderClassicFfView(items, selectedItem, state, handlers, anyHubStock = items) {
  const wrap = document.createElement("div");
  wrap.className = "ff-wrap";

  const activeHero = HERO_ROSTER.find((h) => h.id === state.activeHeroId);

  // Left Box: Stock Filtered Strictly to Highlighted Hero
  const left = document.createElement("div");
  left.className = "ff-list-box";

  if (items.length === 0) {
    const partyWithStock = state.partyIds
      .map((hid) => ({
        hero: HERO_ROSTER.find((h) => h.id === hid),
        count: anyHubStock.filter((x) => !x.usableBy || x.usableBy.includes(hid)).length,
      }))
      .filter((x) => x.hero && x.count > 0);

    const emptyBox = document.createElement("div");
    emptyBox.className = "ff-empty-stock";
    emptyBox.innerHTML = `
      <div class="ff-empty-title">No ${esc(activeHero?.name ?? "Hero")} Stock Here</div>
      <div class="ff-empty-copy">${esc(activeHero?.name ?? "This hero")} (${esc(activeHero?.className ?? "")}) has nothing usable in this shop. Select another party member on the right to see their stock:</div>
      <div class="ff-empty-btns"></div>
    `;
    const btnWrap = emptyBox.querySelector(".ff-empty-btns");
    for (const entry of partyWithStock) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "ff-switch-btn";
      b.textContent = `Shop for ${entry.hero.name} (${entry.count}) →`;
      b.addEventListener("click", () => handlers.onPickHero(entry.hero.id));
      btnWrap.appendChild(b);
    }
    left.appendChild(emptyBox);
  } else {
    const listGrid = document.createElement("div");
    listGrid.className = "ff-item-grid";

    for (const item of items) {
      const isSel = selectedItem?.id === item.id;
      const price = item.priceSilver;
      const isLearned = item.category === "spell" && state.learnedSpells?.has(item.id);

      const row = document.createElement("button");
      row.type = "button";
      row.className = `ff-item-btn${isSel ? " active" : ""}`;
      row.appendChild(makeIconBox(item));

      const nameEl = document.createElement("span");
      nameEl.className = "ff-item-name";
      nameEl.textContent = item.name;

      const priceEl = document.createElement("span");
      priceEl.className = "ff-item-price";
      priceEl.textContent = isLearned ? "Learned ✓" : price > 0 ? formatSilver(price) : "Relic";

      row.append(nameEl, priceEl);
      row.addEventListener("click", () => handlers.onSelectItem(item.id));
      listGrid.appendChild(row);
    }
    left.appendChild(listGrid);
  }

  // Right Side: Top = Hero Selector Stage, Bottom = Head-to-Head Compare Box
  const right = document.createElement("div");
  right.className = "ff-right-col";

  const reactBox = document.createElement("div");
  reactBox.className = "ff-box ff-react-box";
  const reactTitle = document.createElement("div");
  reactTitle.className = "ff-box-title";
  reactTitle.textContent = "Select Hero to Shop For";
  reactBox.appendChild(reactTitle);

  const stage = document.createElement("div");
  stage.className = "ff-party-stage";

  for (const hid of state.partyIds) {
    const hero = HERO_ROSTER.find((h) => h.id === hid);
    if (!hero) continue;
    const isSel = state.activeHeroId === hid;
    const countForHero = anyHubStock.filter((x) => !x.usableBy || x.usableBy.includes(hid)).length;

    let stateCls = countForHero > 0 ? "unselected" : "unselected cant-use";
    let tagText = countForHero > 0 ? hero.className : "No Stock";

    if (isSel) {
      if (!selectedItem) {
        stateCls = "can-flat inspected";
        tagText = countForHero > 0 ? hero.className : "No Stock";
      } else {
        const delta = computeHeroDelta(selectedItem, state.equippedByHero, hid);
        const diff = delta.primaryDiff ?? 0;
        if (selectedItem.category === "spell") {
          stateCls = "can-up inspected";
          tagText = state.learnedSpells?.has(selectedItem.id) ? "✓ Learned" : "Can Learn";
        } else if (selectedItem.category === "consumable" || selectedItem.category === "runestone" || !itemSlotFor(selectedItem)) {
          stateCls = "can-flat inspected";
          tagText = "Usable";
        } else if (diff > 0) {
          stateCls = "can-up inspected";
          tagText = `▲ +${diff}`;
        } else if (diff < 0) {
          stateCls = "can-down inspected";
          tagText = `▼ ${diff}`;
        } else {
          stateCls = "can-flat inspected";
          tagText = "= Same";
        }
      }
    }

    const hCard = document.createElement("button");
    hCard.type = "button";
    hCard.className = `ff-hero-card ${stateCls}`;
    hCard.innerHTML = `
      <div class="ff-hero-badge">${esc(tagText)}</div>
      <img src="${hero.avatar}" alt="${esc(hero.name)}" />
      <div class="ff-hero-name">${esc(hero.name)}</div>
    `;
    hCard.addEventListener("click", () => handlers.onPickHero(hid));
    stage.appendChild(hCard);
  }
  reactBox.appendChild(stage);
  right.appendChild(reactBox);

  right.appendChild(buildClassicCompareBox(selectedItem, state, handlers));

  wrap.append(left, right);
  return wrap;
}
