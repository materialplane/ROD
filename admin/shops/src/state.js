// Reactive mockup UI state and mock party equipment tailored to the inspected settlement tier.

export function createInitialState(hubs) {
  const oakhaven = hubs.find((h) => h.id === "loc_02_oakhaven") ?? hubs[0];
  const firstNpc = oakhaven?.townNpcs?.[0] ?? null;
  return {
    hubId: oakhaven?.id ?? "loc_02_oakhaven",
    vendorTab: firstNpc?.shopType ?? "weapon", // weapon | armor | tailor | magic | arcanist | adventurer | trade_goods | npc_service | runestones | audit
    activeNpcId: firstNpc?.id ?? null,
    catFilter: "all",
    frameStyle: "bronze",      // bronze | flat | parchment | tier
    iconSize: 64,              // 48 | 64 | 80 | 96
    viewportMode: "full",      // full | deck | desktop
    partyIds: ["valen", "ellowyn", "orin", "rowan"],
    activeHeroId: "valen",
    selectedItemId: null,
    buyPromptItem: null,
    silverPurse: 1850,
    equippedByHero: {},
    learnedSpells: new Set(),
    soldTradeIds: new Set(),
  };
}

export function syncMockPartyForHub(state, items, hub) {
  // Equip party with gear 1 step below current hub minimum so upgrades glow green cleanly
  const baseStep = Math.max(1, (hub.steps[0] ?? 1) - 1);
  const findItem = (cat, subType, fallbackIdx = 0) => {
    const matches = items.filter((x) => x.category === cat && (!subType || x.subType === subType));
    return matches.find((x) => x.step === baseStep) ?? matches[fallbackIdx] ?? null;
  };

  const armorFor = (heroId) => {
    const list = items.filter((x) => x.category === "armor" && x.usableBy?.includes(heroId));
    return list[Math.min(list.length - 1, Math.max(0, baseStep - 1))] ?? list[0] ?? null;
  };
  const helmFor = (heroId) => {
    const list = items.filter((x) => x.category === "helm" && x.usableBy?.includes(heroId));
    return list[Math.min(list.length - 1, Math.max(0, baseStep - 1))] ?? list[0] ?? null;
  };

  state.equippedByHero = {
    valen: {
      right_hand: findItem("weapon", "Longsword"),
      left_hand: findItem("shield", null),
      body: armorFor("valen"),
      head: helmFor("valen"),
      accessory: findItem("cloak", null),
    },
    ellowyn: {
      right_hand: findItem("weapon", "Quarterstaff"),
      left_hand: null,
      body: armorFor("ellowyn"),
      head: helmFor("ellowyn"),
      accessory: findItem("orb", null),
    },
    orin: {
      right_hand: findItem("weapon", "Battleaxe"),
      left_hand: findItem("shield", null),
      body: armorFor("orin"),
      head: helmFor("orin"),
      accessory: findItem("horn", null),
    },
    rowan: {
      right_hand: findItem("weapon", "Longbow"),
      left_hand: null,
      body: armorFor("rowan"),
      head: helmFor("rowan"),
      accessory: findItem("quiver", null),
    },
    mera: {
      right_hand: findItem("weapon", "Scimitar"),
      left_hand: findItem("shield", null),
      body: armorFor("mera"),
      head: helmFor("mera"),
      accessory: findItem("crystal", null),
    },
    harlan: {
      right_hand: findItem("weapon", "Mace"),
      left_hand: findItem("shield", null),
      body: armorFor("harlan"),
      head: helmFor("harlan"),
      accessory: findItem("tome", null),
    },
  };

  // Scale mock purse realistically to the hub's region
  state.silverPurse = Math.max(450, Math.round(Math.pow(hub.steps[0] || 1, 2.2) * 140));
  state.soldTradeIds.clear();
}
