(() => {
  const HERO_IDS = ["valen", "ellowyn", "orin", "rowan", "mera", "harlan"];
  const HERO_NAMES = {
    valen: "Valen",
    ellowyn: "Ellowyn",
    orin: "Orin",
    rowan: "Rowan",
    mera: "Mera",
    harlan: "Harlan",
  };
  const HERO_FOCUS = {
    valen: { force: 0.6, finesse: 0.25, grit: 0.15 },
    ellowyn: { arcana: 0.65, presence: 0.2, grit: 0.15 },
    orin: { grit: 0.55, force: 0.35, presence: 0.1 },
    rowan: { finesse: 0.55, force: 0.3, grit: 0.15 },
    mera: { presence: 0.5, arcana: 0.35, grit: 0.15 },
    harlan: { presence: 0.55, arcana: 0.35, grit: 0.1 },
  };
  const ZONE1_STARTER_WEAPON_ID = {
    valen: "wpn_01_rapier_dull_foil",
    ellowyn: "wpn_01_quarterstaff_oakwood_quarterstaff",
    orin: "wpn_01_spear_ashwood_spear",
    rowan: "wpn_01_longbow_yew_hunting_longbow",
    mera: "wpn_01_quarterstaff_oakwood_quarterstaff",
    harlan: "wpn_01_mace_oak_club_mace",
  };

  const els = {
    selZone: document.getElementById("selZone"),
    selBiome: document.getElementById("selBiome"),
    selParty: document.getElementById("selParty"),
    chkAutoRest: document.getElementById("chkAutoRest"),
    btnStartBattle: document.getElementById("btnStartBattle"),
    btnRestNow: document.getElementById("btnRestNow"),
    btnResetSession: document.getElementById("btnResetSession"),
    loadoutBar: document.getElementById("loadoutBar"),
    frame: document.getElementById("combatSandboxFrame"),
    logTail: document.getElementById("combatLogTail"),
    statusPill: document.getElementById("statusPill"),
    lblFightCounter: document.getElementById("lblFightCounter"),
    kpiXp: document.getElementById("kpiXp"),
    kpiSilver: document.getElementById("kpiSilver"),
    kpiTrade: document.getElementById("kpiTrade"),
    kpiTotalS: document.getElementById("kpiTotalS"),
    kpiRounds: document.getElementById("kpiRounds"),
    kpiSec: document.getElementById("kpiSec"),
    grindBreakdown: document.getElementById("grindBreakdown"),
    fightList: document.getElementById("fightList"),
  };

  let catalogs = {
    items: [],
    itemsById: {},
    spells: [],
    disciplines: [],
    discByHero: {},
    battles: null,
    locations: [],
  };
  let sandboxReady = false;
  let battleInProgress = false;
  let logPollTimer = null;
  let sessionFights = [];
  let partyHpPct = {};
  let partyMpPct = {};

  function earnedPointsForLevel(level) {
    const safeLvl = Math.max(1, Math.floor(level));
    if (safeLvl <= 1) return 0;
    let total = (safeLvl - 1) * 2;
    for (let l = 5; l <= safeLvl; l += 5) {
      if (l < 100) total += 1;
    }
    return total;
  }

  function xpForNextLevel(level) {
    if (level >= 99) return 0;
    return 100 * level + 12 * level * level;
  }

  function zoneXpTotal(zoneCode) {
    const startLv = (zoneCode - 1) * 5 + 1;
    const endLv = zoneCode === 20 ? 98 : zoneCode * 5;
    let total = 0;
    for (let l = startLv; l <= endLv; l++) total += xpForNextLevel(l);
    return total;
  }

  function zoneShopMeta(zoneCode) {
    const towns = catalogs.locations.filter((l) => l.zoneNum === zoneCode && !l.isPortal && (l.gearTiers || l.spellTier));
    let maxStep = Math.min(24, Math.max(1, Math.round(zoneCode * 1.2)));
    const steps = towns.flatMap((t) => (Array.isArray(t.gearTiers) ? t.gearTiers : []));
    if (steps.length > 0) maxStep = Math.max(...steps);
    const spellTiers = towns.map((t) => t.spellTier).filter((n) => typeof n === "number");
    const spellTier = spellTiers.length > 0 ? Math.max(...spellTiers) : Math.min(8, Math.ceil(zoneCode / 2.5));
    const names = [...new Set(towns.map((t) => t.name))].slice(0, 3);
    return { maxStep, spellTier, townNames: names };
  }

  function itemSlotFor(item) {
    if (!item || item.category === "spell") return null;
    if (item.slot) return item.slot;
    if (["cloak", "orb", "horn", "quiver", "crystal", "tome"].includes(item.category)) return "accessory";
    return null;
  }

  function pickBestItemForHero(hid, stepMax, slotOrFilter) {
    const cands = catalogs.items.filter((it) => {
      if ((it.step || 1) > stepMax) return false;
      if (it.usableBy && !it.usableBy.includes(hid)) return false;
      return slotOrFilter(it);
    });
    cands.sort((a, b) => (b.step || 1) - (a.step || 1) || (b.priceSilver || 0) - (a.priceSilver || 0));
    return cands[0] || null;
  }

  function buildEarlyStartSetup(zoneCode, partyOrder) {
    const startLv = (zoneCode - 1) * 5 + 1;
    const heroLevels = {};
    const heroSpentAttrs = {};
    const equippedByHero = {};
    const chosenDisciplinesByHero = {};

    const prevMeta = zoneCode > 1 ? zoneShopMeta(zoneCode - 1) : { maxStep: 1, spellTier: 0 };
    const entryStep = zoneCode === 1 ? 1 : prevMeta.maxStep;
    const entrySpellTier = zoneCode === 1 ? 0 : prevMeta.spellTier;

    const learnedSpellIds =
      entrySpellTier <= 0
        ? []
        : catalogs.spells.filter((sp) => (sp.region || 1) <= entrySpellTier).map((sp) => sp.id);

    for (const hid of partyOrder) {
      heroLevels[hid] = startLv;
      const pts = earnedPointsForLevel(startLv);
      const weights = HERO_FOCUS[hid] || { force: 0.5, grit: 0.5 };
      const spent = {};
      let rem = pts;
      const keys = Object.keys(weights);
      keys.forEach((k, idx) => {
        if (idx === keys.length - 1) {
          spent[k] = Math.max(0, rem);
        } else {
          const share = Math.round(pts * weights[k]);
          spent[k] = share;
          rem -= share;
        }
      });
      heroSpentAttrs[hid] = spent;

      const eq = {};
      if (zoneCode === 1) {
        // Zone 1 starts cleanly with starter Step-1 weapon ONLY (what starting 250s buys at Highcrown)
        const starterWpn = catalogs.itemsById[ZONE1_STARTER_WEAPON_ID[hid]] || pickBestItemForHero(hid, 1, (it) => it.category === "weapon");
        if (starterWpn) eq.right_hand = starterWpn.id;
      } else {
        const wpn = pickBestItemForHero(hid, entryStep, (it) => it.category === "weapon");
        if (wpn) eq.right_hand = wpn.id;
        if (wpn && wpn.handed === "1H") {
          if (hid === "valen") {
            const offW = pickBestItemForHero(hid, entryStep, (it) => it.category === "weapon" && it.handed === "1H");
            if (offW) eq.left_hand = offW.id;
          } else {
            const sh = pickBestItemForHero(hid, entryStep, (it) => it.category === "shield");
            if (sh) eq.left_hand = sh.id;
          }
        }
        const body = pickBestItemForHero(hid, entryStep, (it) => it.category === "armor");
        if (body) eq.body = body.id;
        const helm = pickBestItemForHero(hid, entryStep, (it) => it.category === "helm");
        if (helm) eq.head = helm.id;
        const acc = pickBestItemForHero(hid, entryStep, (it) => itemSlotFor(it) === "accessory");
        if (acc) eq.accessory = acc.id;
      }
      equippedByHero[hid] = eq;

      // Zone 1 has 0 Disciplines bound yet; Zones 2+ bind tiers up to entry level (< startLv, plus Lv 1)
      const hd = catalogs.discByHero[hid];
      const discMap = {};
      if (zoneCode > 1 && hd && Array.isArray(hd.tiers)) {
        for (const t of hd.tiers) {
          if ((t.level === 1 || t.level < startLv) && t.optionA) {
            discMap[String(t.level)] = t.optionA.id;
          }
        }
      }
      chosenDisciplinesByHero[hid] = discMap;
    }

    return {
      zoneCode,
      startLv,
      entryStep,
      entrySpellTier,
      partyOrder,
      heroLevels,
      heroSpentAttrs,
      equippedByHero,
      learnedSpellIds,
      chosenDisciplinesByHero,
    };
  }

  function computeZoneMaxOutCosts(zoneCode, setup) {
    const zMeta = zoneShopMeta(zoneCode);
    const prevMeta = zoneCode > 1 ? zoneShopMeta(zoneCode - 1) : { spellTier: 0 };
    const startLv = (zoneCode - 1) * 5 + 1;
    const endLv = zoneCode === 20 ? 99 : zoneCode * 5;

    let gearCost = 0;
    for (const hid of setup.partyOrder) {
      const curEq = setup.equippedByHero[hid] || {};
      const targetWpn = pickBestItemForHero(hid, zMeta.maxStep, (it) => it.category === "weapon");
      const targetSlots = { right_hand: targetWpn };
      if (targetWpn && targetWpn.handed === "1H") {
        targetSlots.left_hand =
          hid === "valen"
            ? pickBestItemForHero(hid, zMeta.maxStep, (it) => it.category === "weapon" && it.handed === "1H")
            : pickBestItemForHero(hid, zMeta.maxStep, (it) => it.category === "shield");
      }
      targetSlots.body = pickBestItemForHero(hid, zMeta.maxStep, (it) => it.category === "armor");
      targetSlots.head = pickBestItemForHero(hid, zMeta.maxStep, (it) => it.category === "helm");
      targetSlots.accessory = pickBestItemForHero(hid, zMeta.maxStep, (it) => itemSlotFor(it) === "accessory");

      for (const [slot, targetItem] of Object.entries(targetSlots)) {
        if (!targetItem) continue;
        const curId = curEq[slot];
        if (curId === targetItem.id) continue;
        const curItem = curId ? catalogs.itemsById[curId] : null;
        const tradeIn = curItem ? Math.round((curItem.priceSilver || 0) * 0.4) : 0;
        gearCost += Math.max(0, (targetItem.priceSilver || 0) - tradeIn);
      }
    }

    let spellCost = 0;
    const prevSpellTier = zoneCode === 1 ? 0 : prevMeta.spellTier;
    const newTierUnlock = zMeta.spellTier > prevSpellTier;
    if (newTierUnlock) {
      for (const sp of catalogs.spells) {
        if (sp.region !== zMeta.spellTier) continue;
        const usableByParty = !sp.usableBy || setup.partyOrder.some((hid) => sp.usableBy.includes(hid));
        if (usableByParty) spellCost += sp.priceSilver || 0;
      }
    }

    let discCost = 0;
    for (const hid of setup.partyOrder) {
      const hd = catalogs.discByHero[hid];
      if (!hd || !Array.isArray(hd.tiers)) continue;
      for (const t of hd.tiers) {
        const matchesZone = zoneCode === 1 ? t.level === 1 : t.level >= startLv && t.level <= endLv;
        if (matchesZone) discCost += t.silver || 0;
      }
    }

    return {
      targetStep: zMeta.maxStep,
      spellTier: zMeta.spellTier,
      townNames: zMeta.townNames,
      gearCost,
      spellCost,
      discCost,
      totalBill: gearCost + spellCost + discCost,
    };
  }

  function selectedParty() {
    return (els.selParty.value || "valen,ellowyn,orin,rowan").split(",").filter((x) => HERO_IDS.includes(x));
  }

  function populateZoneSelect() {
    els.selZone.innerHTML = "";
    for (let z = 1; z <= 20; z++) {
      const lo = (z - 1) * 5 + 1;
      const hi = z === 20 ? 99 : z * 5;
      const opt = document.createElement("option");
      opt.value = String(z);
      opt.textContent = `Zone ${z} (Lv ${lo}–${hi} · Starts Lv ${lo})`;
      els.selZone.appendChild(opt);
    }
  }

  function populateBiomeSelect(zoneCode) {
    const prev = els.selBiome.value;
    els.selBiome.innerHTML = "";
    const optRand = document.createElement("option");
    optRand.value = "";
    optRand.textContent = "Random Procedural Encounter in Zone (Recommended)";
    els.selBiome.appendChild(optRand);

    if (catalogs.battles && Array.isArray(catalogs.battles.stages)) {
      const zStages = catalogs.battles.stages.filter((s) => !s.isPortal && s.zoneSpawns && s.zoneSpawns[String(zoneCode)]);
      for (const st of zStages) {
        const opt = document.createElement("option");
        opt.value = st.name;
        const poolNames = (st.zoneSpawns[String(zoneCode)] || []).join(", ");
        opt.textContent = `${st.name} (${poolNames})`;
        els.selBiome.appendChild(opt);
      }
    }

    const portal = catalogs.locations.find((l) => l.isPortal && l.zoneNum === zoneCode);
    if (portal) {
      const optBoss = document.createElement("option");
      optBoss.value = `__PORTAL__:${portal.id}`;
      optBoss.textContent = `★ Portal Boss #${portal.portalNum || "?"}: ${portal.name}`;
      els.selBiome.appendChild(optBoss);
    }

    if ([...els.selBiome.options].some((o) => o.value === prev)) {
      els.selBiome.value = prev;
    }
  }

  function renderLoadoutAndGrind() {
    const z = Number(els.selZone.value) || 1;
    const party = selectedParty();
    const setup = buildEarlyStartSetup(z, party);
    const costs = computeZoneMaxOutCosts(z, setup);

    const loadoutParts = party.map((hid) => {
      const eq = setup.equippedByHero[hid] || {};
      const wpn = eq.right_hand ? catalogs.itemsById[eq.right_hand]?.name : "Unarmed";
      const body = eq.body ? catalogs.itemsById[eq.body]?.name : "No Armor";
      return `<strong>${HERO_NAMES[hid]}</strong> (${wpn}${z === 1 ? "" : `, ${body}`})`;
    });
    const modeNote =
      z === 1
        ? "Starter Weapon Only · No Armor/Helm/Accessory · 0 Spells · 0 Disciplines"
        : `Entry Step ${setup.entryStep} Set · Tier ${setup.entrySpellTier} Spells · Disciplines < Lv ${setup.startLv}`;
    els.loadoutBar.innerHTML = `<div><strong>Zone ${z} Early-Start (Lv ${setup.startLv})</strong> — ${modeNote}</div><div>${loadoutParts.join(" · ")}</div>`;

    const n = sessionFights.length;
    const sumXp = sessionFights.reduce((s, f) => s + (f.xpEarned || 0), 0);
    const sumSilver = sessionFights.reduce((s, f) => s + (f.silverEarned || 0), 0);
    const sumTrade = sessionFights.reduce((s, f) => s + (f.tradeSilverEarned || 0), 0);
    const sumTotalS = sumSilver + sumTrade;
    const sumRounds = sessionFights.reduce((s, f) => s + (f.rounds || 0), 0);
    const sumSec = sessionFights.reduce((s, f) => s + (f.elapsedSec || 0), 0);
    const wins = sessionFights.filter((f) => f.result === "victory").length;

    const avgXp = n > 0 ? Math.round(sumXp / n) : 0;
    const avgSilver = n > 0 ? Math.round((sumSilver / n) * 10) / 10 : 0;
    const avgTrade = n > 0 ? Math.round((sumTrade / n) * 10) / 10 : 0;
    const avgTotalS = n > 0 ? Math.round((sumTotalS / n) * 10) / 10 : 0;
    const avgRounds = n > 0 ? (sumRounds / n).toFixed(1) : "0.0";
    const avgSec = n > 0 ? Math.round(sumSec / n) : 0;

    els.lblFightCounter.textContent = `${n} / 10 Fights`;
    els.kpiXp.textContent = String(avgXp);
    els.kpiSilver.textContent = `${avgSilver}s`;
    els.kpiTrade.textContent = `${avgTrade}s`;
    els.kpiTotalS.textContent = `${avgTotalS}s`;
    els.kpiRounds.textContent = avgRounds;
    els.kpiSec.textContent = `${avgSec}s`;

    const fightsToMaxSilver = avgTotalS > 0 ? Math.ceil(costs.totalBill / avgTotalS) : null;
    const minsToMaxSilver = fightsToMaxSilver && avgSec > 0 ? Math.round((fightsToMaxSilver * avgSec) / 60) : null;
    const zXpNeed = zoneXpTotal(z);
    const fightsToLevelZone = avgXp > 0 ? Math.ceil(zXpNeed / avgXp) : null;

    els.grindBreakdown.innerHTML = `
      <div class="grind-row"><span>Zone ${z} Towns (${costs.townNames.join(", ") || "Local"})</span><strong>Step ${costs.targetStep}</strong></div>
      <div class="grind-row"><span>Upgrade 4 Heroes to Step ${costs.targetStep} Gear (after 40% trade-in)</span><strong>${costs.gearCost.toLocaleString()}s</strong></div>
      <div class="grind-row"><span>Unlock Tier ${costs.spellTier} Spells (New in Zone)</span><strong>${costs.spellCost.toLocaleString()}s</strong></div>
      <div class="grind-row"><span>Bind Zone ${z} Arcanist Disciplines</span><strong>${costs.discCost.toLocaleString()}s</strong></div>
      <div class="grind-row"><span>Total Pure-Grind Silver Bill</span><strong>${costs.totalBill.toLocaleString()}s</strong></div>
      <div class="grind-row"><span>XP Across Zone ${z}'s 5 Levels</span><strong>${zXpNeed.toLocaleString()} XP${fightsToLevelZone ? ` (~${fightsToLevelZone} fights)` : ""}</strong></div>
      <div class="grind-highlight">${
        fightsToMaxSilver
          ? `Pure Grind Estimate: ~${fightsToMaxSilver} fights${minsToMaxSilver ? ` (~${minsToMaxSilver} mins at your ${avgSec}s/fight pace)` : ""} to max Zone ${z} with zero quests`
          : "Fight 1–10 battles in this zone to measure real grind fights & minutes"
      }</div>
    `;

    els.btnStartBattle.textContent = battleInProgress ? "Battle Running..." : `Start Battle (${n} / 10)`;
    els.btnStartBattle.disabled = battleInProgress || !sandboxReady;

    if (n === 0) {
      els.fightList.innerHTML = `<div class="empty-msg">Click <strong>Start Battle</strong> to launch fight #1 with the real game engine.</div>`;
    } else {
      els.fightList.innerHTML = sessionFights
        .slice()
        .reverse()
        .map((f, rIdx) => {
          const idx = n - rIdx;
          const cls = f.result === "victory" ? "tag-win" : f.result === "fled" ? "tag-fled" : "tag-loss";
          return `
            <div class="fight-item">
              <div class="fight-top">
                <span>#${idx} · ${f.biomeName}</span>
                <span class="${cls}">${String(f.result || "").toUpperCase()} (${f.rounds}R · ${f.elapsedSec}s)</span>
              </div>
              <div>Foes: ${f.enemiesLabel}</div>
              <div>Drops: +${f.xpEarned} XP · +${f.silverEarned}s + ${f.tradeSilverEarned}s Trade Goods (${f.tradeGoodsText || "none"})</div>
            </div>
          `;
        })
        .join("");
    }

    return {
      setup,
      costs,
      stats: {
        avgXp,
        avgDirectSilver: avgSilver,
        avgTradeSilver: avgTrade,
        avgTotalSilver: avgTotalS,
        avgRounds: Number(avgRounds),
        avgSec,
        winPct: n > 0 ? Math.round((wins / n) * 100) : 0,
      },
      grind: {
        gearCost: costs.gearCost,
        spellCost: costs.spellCost,
        discCost: costs.discCost,
        totalBill: costs.totalBill,
        fightsNeeded: fightsToMaxSilver,
        estMinutes: minsToMaxSilver,
      },
    };
  }

  async function refreshCombatLogTail() {
    try {
      const resp = await fetch("/api/combat-log/latest", { cache: "no-store" });
      if (!resp.ok) return;
      const data = await resp.json();
      if (data.text) {
        const lines = data.text.trim().split(/\r?\n/);
        els.logTail.textContent = lines.slice(-26).join("\n");
        els.logTail.scrollTop = els.logTail.scrollHeight;
      }
    } catch {
      // Ignore transient poll errors
    }
  }

  async function saveSessionReport() {
    const info = renderLoadoutAndGrind();
    try {
      await fetch("/api/admin/combat-test/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zoneCode: info.setup.zoneCode,
          zoneLabel: `Lv ${info.setup.startLv}–${info.setup.zoneCode === 20 ? 99 : info.setup.zoneCode * 5}`,
          loadoutSummary:
            info.setup.zoneCode === 1
              ? "Starter Step-1 Weapon Only (No Armor/Spells)"
              : `Step ${info.setup.entryStep} Gear, Tier ${info.setup.entrySpellTier} Spells`,
          fights: sessionFights,
          stats: info.stats,
          grind: info.grind,
        }),
      });
    } catch {
      // Non-fatal
    }
  }

  function startBattle() {
    if (!sandboxReady || battleInProgress) return;
    const z = Number(els.selZone.value) || 1;
    const party = selectedParty();
    const setup = buildEarlyStartSetup(z, party);

    if (els.chkAutoRest.checked) {
      partyHpPct = {};
      partyMpPct = {};
    }

    const biomeChoice = els.selBiome.value;
    let biomeName = biomeChoice || undefined;
    let portalLoc = null;
    if (biomeChoice && biomeChoice.startsWith("__PORTAL__:")) {
      const pid = biomeChoice.slice("__PORTAL__:".length);
      portalLoc = catalogs.locations.find((l) => l.id === pid) || null;
      biomeName = undefined;
    }

    battleInProgress = true;
    renderLoadoutAndGrind();

    els.frame.contentWindow.postMessage(
      {
        type: "rod:combat-sandbox-start",
        payload: {
          zoneCode: z,
          biomeName,
          portalLoc,
          partyOrder: setup.partyOrder,
          heroLevels: setup.heroLevels,
          heroSpentAttrs: setup.heroSpentAttrs,
          equippedByHero: setup.equippedByHero,
          learnedSpellIds: setup.learnedSpellIds,
          chosenDisciplinesByHero: setup.chosenDisciplinesByHero,
          bagCounts: {},
          heroHpPct: partyHpPct,
          heroMpPct: partyMpPct,
        },
      },
      window.location.origin
    );
  }

  window.addEventListener("message", async (event) => {
    if (event.origin !== window.location.origin) return;
    const msg = event.data;
    if (!msg || typeof msg !== "object") return;
    if (msg.type === "rod:combat-sandbox-ready") {
      sandboxReady = true;
      els.statusPill.textContent = "Real Game Combat Engine Ready";
      renderLoadoutAndGrind();
    } else if (msg.type === "rod:combat-sandbox-complete") {
      battleInProgress = false;
      const out = msg.outcome || {};
      if (!els.chkAutoRest.checked) {
        partyHpPct = out.heroHpPct || {};
        partyMpPct = out.heroMpPct || {};
      }
      const enemyList = (msg.meta?.enemies || []).map((e) => `${e.name} Lv${e.level}`);
      const goodsList = (msg.tradeGoodsDetail || []).map((g) => `${g.name} x${g.qty} (${g.sellEach}s)`);
      sessionFights.push({
        result: out.result || "victory",
        biomeName: msg.meta?.biomeName || "Wilderness",
        enemiesLabel: enemyList.join(", "),
        rounds: msg.rounds || 1,
        elapsedSec: msg.elapsedSec || 1,
        xpEarned: out.xpEarned || 0,
        silverEarned: out.silverEarned || 0,
        tradeSilverEarned: msg.tradeSilverEarned || 0,
        tradeGoodsText: goodsList.join(", "),
      });
      await refreshCombatLogTail();
      await saveSessionReport();
    }
  });

  async function init() {
    populateZoneSelect();
    try {
      const bust = Date.now();
      const [iR, sR, dR, bR, wR] = await Promise.all([
        fetch(`/client/assets/data/items-catalog.json?t=${bust}`),
        fetch(`/client/assets/data/spells-catalog.json?t=${bust}`),
        fetch(`/client/assets/data/disciplines-catalog.json?t=${bust}`),
        fetch(`/client/assets/data/battle-config.json?t=${bust}`),
        fetch(`/client/assets/data/world-locations.json?t=${bust}`),
      ]);
      if (iR.ok) {
        catalogs.items = (await iR.json()).items || [];
        catalogs.itemsById = Object.fromEntries(catalogs.items.map((x) => [x.id, x]));
      }
      if (sR.ok) catalogs.spells = (await sR.json()).spells || [];
      if (dR.ok) {
        catalogs.disciplines = (await dR.json()).heroes || [];
        catalogs.discByHero = Object.fromEntries(catalogs.disciplines.map((h) => [h.heroId, h]));
      }
      if (bR.ok) catalogs.battles = await bR.json();
      if (wR.ok) catalogs.locations = (await wR.json()).locations || [];
    } catch {
      els.statusPill.textContent = "Error loading catalogs";
    }

    populateBiomeSelect(Number(els.selZone.value) || 1);
    renderLoadoutAndGrind();
    await refreshCombatLogTail();
    if (logPollTimer) clearInterval(logPollTimer);
    logPollTimer = setInterval(refreshCombatLogTail, 1500);
  }

  els.selZone.addEventListener("change", () => {
    const z = Number(els.selZone.value) || 1;
    sessionFights = [];
    partyHpPct = {};
    partyMpPct = {};
    populateBiomeSelect(z);
    renderLoadoutAndGrind();
  });
  els.selBiome.addEventListener("change", () => renderLoadoutAndGrind());
  els.selParty.addEventListener("change", () => {
    sessionFights = [];
    partyHpPct = {};
    partyMpPct = {};
    renderLoadoutAndGrind();
  });
  els.btnStartBattle.addEventListener("click", startBattle);
  els.btnRestNow.addEventListener("click", () => {
    partyHpPct = {};
    partyMpPct = {};
    els.statusPill.textContent = "Party rested to 100% HP & MP";
  });
  els.btnResetSession.addEventListener("click", async () => {
    sessionFights = [];
    partyHpPct = {};
    partyMpPct = {};
    renderLoadoutAndGrind();
    await saveSessionReport();
  });

  void init();
})();
