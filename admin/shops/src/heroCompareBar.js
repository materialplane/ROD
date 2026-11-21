import { HERO_ROSTER } from "./data.js";
import { computeHeroDelta } from "./compare.js";

export function renderHeroCompareBar(state, selectedItem, onPickHero) {
  const wrap = document.createElement("div");
  wrap.className = "hero-strip";

  for (const hid of state.partyIds) {
    const hero = HERO_ROSTER.find((h) => h.id === hid);
    if (!hero) continue;
    const isSel = state.activeHeroId === hid;
    const delta = isSel ? computeHeroDelta(selectedItem, state.equippedByHero, hid) : null;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `hero-chip${isSel ? " active" : ""}`;

    let subCls = "delta-flat";
    let subTxt = hero.className;
    if (isSel && selectedItem && delta) {
      subTxt = delta.headline;
      if ((delta.primaryDiff ?? 0) > 0) subCls = "delta-up";
      else if ((delta.primaryDiff ?? 0) < 0) subCls = "delta-down";
    }

    btn.innerHTML = `
      <img src="${hero.avatar}" alt="${hero.name}" />
      <div>
        <div class="hero-meta-top">${hero.name}</div>
        <div class="hero-delta ${subCls}">${subTxt}</div>
      </div>
    `;
    btn.addEventListener("click", () => onPickHero(hid));
    wrap.appendChild(btn);
  }
  return wrap;
}
