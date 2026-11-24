(() => {
  const REGION_PROFILES = {
    1: { name: "The Crownlands", map: 1, banner: "/assets/tokens/banners/banner_crown_loyalists.webp", bg: "/assets/maps/battle_scenes/biome_01_crownland_meadows.webp" },
    2: { name: "Saltmarsh Coast", map: 1, banner: "/assets/tokens/banners/banner_free_towns.webp", bg: "/assets/maps/battle_scenes/biome_08_saltmarsh_wetlands.webp" },
    3: { name: "Thornwall Warfronts", map: 2, banner: "/assets/tokens/banners/banner_house_hollowstone.webp", bg: "/assets/maps/battle_scenes/biome_10_thornwall_slate_crags.webp" },
    4: { name: "The Verdant Weald", map: 2, banner: "/assets/tokens/banners/banner_free_towns.webp", bg: "/assets/maps/battle_scenes/biome_12_verdant_canopy_woods.webp" },
    5: { name: "Sun-Scorched Isles", map: 3, banner: "/assets/tokens/banners/banner_slaver_syndicate.webp", bg: "/assets/maps/battle_scenes/biome_18_sun_scorched_dunes.webp" },
    6: { name: "Ironcrest Highlands", map: 3, banner: "/assets/tokens/banners/banner_free_towns.webp", bg: "/assets/maps/battle_scenes/biome_22_granite_highland_ridge.webp" },
    7: { name: "Frostbound Reach", map: 4, banner: "/assets/tokens/banners/banner_northern_clans.webp", bg: "/assets/maps/battle_scenes/biome_29_glacial_snowfields.webp" },
    8: { name: "The Dreadwaste", map: 4, banner: "/assets/tokens/banners/banner_king_garrick.webp", bg: "/assets/maps/battle_scenes/biome_33_charred_ash_plains.webp" },
  };

  const PORTAL_META = {
    3: { name: "The Ashen Gate", boss: "Earth Elemental", icon: "/assets/enemies/earth_elemental.webp", scene: "/assets/maps/battle_scenes/biome_35_portal_1_ashen_gate.webp" },
    5: { name: "The Sunken Maw", boss: "Otyugh", icon: "/assets/enemies/otyugh.webp", scene: "/assets/maps/battle_scenes/biome_36_portal_2_sunken_maw.webp" },
    8: { name: "The Iron Rift", boss: "Fire Giant", icon: "/assets/enemies/fire_giant.webp", scene: "/assets/maps/battle_scenes/biome_37_portal_3_iron_rift.webp" },
    10: { name: "The Rotspire", boss: "Aboleth", icon: "/assets/enemies/aboleth.webp", scene: "/assets/maps/battle_scenes/biome_38_portal_4_rotspire.webp" },
    13: { name: "The Scorched Chasm", boss: "Efreeti", icon: "/assets/enemies/efreeti.webp", scene: "/assets/maps/battle_scenes/biome_39_portal_5_scorched_chasm.webp" },
    15: { name: "Storm-Crowned Spire", boss: "Adult Blue Dragon", icon: "/assets/enemies/adult_blue_dragon.webp", scene: "/assets/maps/battle_scenes/biome_40_portal_6_storm_crowned_spire.webp" },
    18: { name: "The Pale Abyss", boss: "Pit Fiend", icon: "/assets/enemies/pit_fiend.webp", scene: "/assets/maps/battle_scenes/biome_41_portal_7_pale_abyss.webp" },
    20: { name: "The Eclipse Gate", boss: "King Garrick", icon: "/assets/enemies/king_garrick.webp", scene: "/assets/maps/battle_scenes/biome_33_charred_ash_plains.webp" },
  };

  let simData = null;
  let questsCatalog = [];
  let worldLocations = [];
  let itemsCatalog = [];
  let currentView = "cards";

  const $ = (id) => document.getElementById(id);

  function fmtS(n) {
    return `${Math.round(n).toLocaleString()}s`;
  }

  function zoneRegionNum(z) {
    if (z <= 3) return 1;
    if (z <= 5) return 2;
    if (z <= 8) return 3;
    if (z <= 10) return 4;
    if (z <= 13) return 5;
    if (z <= 15) return 6;
    if (z <= 18) return 7;
    return 8;
  }

  function zoneBackdrop(z) {
    const custom = {
      1: "/assets/maps/battle_scenes/biome_01_crownland_meadows.webp",
      2: "/assets/maps/battle_scenes/biome_02_oakleaf_groves.webp",
      3: "/assets/maps/battle_scenes/biome_04_upland_foothills.webp",
      4: "/assets/maps/battle_scenes/biome_08_saltmarsh_wetlands.webp",
      5: "/assets/maps/battle_scenes/biome_09_saltmarsh_waterways_shore.webp",
      6: "/assets/maps/battle_scenes/biome_11_ochre_grasslands.webp",
      7: "/assets/maps/battle_scenes/biome_10_thornwall_slate_crags.webp",
      8: "/assets/maps/battle_scenes/biome_13_weald_clearings.webp",
      9: "/assets/maps/battle_scenes/biome_12_verdant_canopy_woods.webp",
      10: "/assets/maps/battle_scenes/biome_15_blighted_mire_glade.webp",
      11: "/assets/maps/battle_scenes/biome_18_sun_scorched_dunes.webp",
      12: "/assets/maps/battle_scenes/biome_21_palm_oasis_verge.webp",
      13: "/assets/maps/battle_scenes/biome_19_sandstone_mesas.webp",
      14: "/assets/maps/battle_scenes/biome_26_ironcrest_alpine_meadow.webp",
      15: "/assets/maps/battle_scenes/biome_22_granite_highland_ridge.webp",
      16: "/assets/maps/battle_scenes/biome_28_frostpine_taiga.webp",
      17: "/assets/maps/battle_scenes/biome_29_glacial_snowfields.webp",
      18: "/assets/maps/battle_scenes/biome_30_ashen_border_scree.webp",
      19: "/assets/maps/battle_scenes/biome_33_charred_ash_plains.webp",
      20: "/assets/maps/battle_scenes/biome_34_coastal_shore_frostbound_ocean.webp",
    };
    return custom[z] || REGION_PROFILES[zoneRegionNum(z)].bg;
  }

  function zoneHealManaIds(z) {
    const healId = z <= 5 ? "cons_minor_healing_potion" : z <= 10 ? "cons_stout_healing_potion" : z <= 15 ? "cons_greater_healing_potion" : "cons_supreme_healing_potion";
    const manaId = z <= 8 ? "cons_minor_mana_potion" : z <= 15 ? "cons_greater_mana_potion" : "cons_supreme_mana_potion";
    return { healId, manaId };
  }

  function questZoneOf(levelRange) {
    const nums = (levelRange || "").match(/\d+/g)?.map(Number) || [1];
    const mid = nums.reduce((a, b) => a + b, 0) / nums.length;
    if (mid >= 96) return 20;
    return Math.min(20, Math.max(1, Math.floor((mid - 1) / 5) + 1));
  }

  function renderKpis(data) {
    const zs = data.zones;
    const last = zs[zs.length - 1];
    const z1 = zs[0];
    const deficitZones = zs.filter((z) => z.wallet_pct_hunts < 100);
    const totalFights = zs.reduce((s, z) => s + z.nat_fights, 0);
    const totalHours = zs.reduce((s, z) => s + z.total_h, 0);
    const potionPct = Math.round((data.cum_potions_total / Math.max(1, data.cum_bill_total)) * 100);
    const log = data.log_baseline;

    $("kpiStrip").innerHTML = `
      <article class="kpi-card ${log ? "gold-glow" : ""}">
        <div class="kpi-head">
          <img class="kpi-icon" src="/assets/icons/ui/ui_23_combat_arena_glyph.webp" alt="" />
          <div>
            <div class="kpi-label">Real Playtest Log Baseline</div>
            <div class="kpi-main">${log ? `${log.avg_total_val.toFixed(1)}s / Fight` : "No Combat Logs Yet"}</div>
          </div>
        </div>
        <div class="kpi-sub">
          ${log
            ? `Across <strong>${log.victories} Zone 1 wins</strong>: <strong>${log.avg_enemies.toFixed(2)}</strong> foes, <strong>${log.avg_xp.toFixed(1)} XP</strong>, <strong>${log.avg_silver.toFixed(1)}s</strong> Silver + <strong>${log.avg_tg.toFixed(1)}s</strong> Trade Goods.`
            : "Fight battles in the Game Client to cross-check live telemetry here."}
        </div>
        <div class="hero-avatars-row">
          <span class="hero-mini-chip"><img src="/assets/portraits/heroes/valen_avatar.webp" alt="" />Valen</span>
          <span class="hero-mini-chip"><img src="/assets/portraits/heroes/ellowyn_avatar.webp" alt="" />Ellowyn</span>
          <span class="hero-mini-chip"><img src="/assets/portraits/heroes/orin_avatar.webp" alt="" />Orin</span>
          <span class="hero-mini-chip"><img src="/assets/portraits/heroes/rowan_avatar.webp" alt="" />Rowan</span>
        </div>
      </article>

      <article class="kpi-card ${deficitZones.length > 0 ? "warn-glow" : "gold-glow"}">
        <div class="kpi-head">
          <img class="kpi-icon" src="/assets/icons/items/cons_minor_healing_potion.webp" alt="" />
          <div>
            <div class="kpi-label">Zone 1 Attrition Reality</div>
            <div class="kpi-main" style="color:${z1.fight_net < 0 ? "#ff8c98" : "#78e5ac"}">${z1.fight_net >= 0 ? "+" : ""}${Math.round(z1.fight_net)}s Net / Fight</div>
          </div>
        </div>
        <div class="kpi-sub">
          Zone 1 earns <strong>${fmtS(z1.fight_val)}</strong> per fight vs <strong>${fmtS(z1.fight_potion_cost)}</strong> in real potions (Heal ${z1.heal_price}s · Mana ${z1.mana_price}s). Deficit zones (&lt;100%): <strong>${deficitZones.length ? deficitZones.map((d) => `Z${d.z}`).join(", ") : "None"}</strong>.
        </div>
      </article>

      <article class="kpi-card">
        <div class="kpi-head">
          <img class="kpi-icon" src="/assets/icons/ui/ui_25_world_atlas_glyph.webp" alt="" />
          <div>
            <div class="kpi-label">Campaign Pace &amp; Ending Lv</div>
            <div class="kpi-main">Lv ${last.lv_hunts} · ${totalHours.toFixed(0)}h</div>
          </div>
        </div>
        <div class="kpi-sub">
          <strong>${Math.round(totalFights).toLocaleString()}</strong> natural battles across 20 Zones. Zero Hunts reaches <strong>Lv ${last.lv_0hunt}</strong>; ~65% Main Story reaches <strong>Lv ${last.lv_rush65}</strong> at Black Keep.
        </div>
      </article>

      <article class="kpi-card gold-glow">
        <div class="kpi-head">
          <img class="kpi-icon" src="/assets/icons/quests/quest_outpost_hunt_board.webp" alt="" />
          <div>
            <div class="kpi-label">4-Hero Bill &amp; Wallet Ending</div>
            <div class="kpi-main">${Math.round(last.wallet_pct_hunts)}% Funded</div>
          </div>
        </div>
        <div class="kpi-sub">
          Lifetime spend: <strong>${fmtS(data.cum_bill_total)}</strong> (Gear, Spells &amp; <strong>${fmtS(data.cum_potions_total)}</strong> [${potionPct}%] in field Potions). Zero Hunts ends at <strong>${Math.round(last.wallet_pct_0hunt)}%</strong>.
        </div>
      </article>
    `;
  }

  function renderWalletChart(zs) {
    const W = 560, H = 235, padL = 46, padR = 16, padT = 18, padB = 30;
    const cw = W - padL - padR, ch = H - padT - padB;
    const maxY = Math.max(170, Math.ceil(Math.max(...zs.map((z) => z.wallet_pct_hunts)) / 20) * 20);

    const xOf = (idx) => padL + (idx / Math.max(1, zs.length - 1)) * cw;
    const yOf = (val) => padT + ch - (Math.min(maxY, Math.max(0, val)) / maxY) * ch;

    const ptsH = zs.map((z, i) => `${xOf(i).toFixed(1)},${yOf(z.wallet_pct_hunts).toFixed(1)}`).join(" ");
    const pts0 = zs.map((z, i) => `${xOf(i).toFixed(1)},${yOf(z.wallet_pct_0hunt).toFixed(1)}`).join(" ");
    const y100 = yOf(100);

    const gridLines = [0, 50, 100, 150].filter((v) => v <= maxY).map((v) => {
      const y = yOf(v);
      const isTarget = v === 100;
      return `
        <line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="${isTarget ? "#e6be6a" : "#252f42"}" stroke-width="${isTarget ? 1.5 : 1}" ${isTarget ? 'stroke-dasharray="5 4"' : ""} />
        <text x="${padL - 6}" y="${y + 4}" text-anchor="end" fill="${isTarget ? "#fae2aa" : "#8999b3"}" font-size="10">${v}%</text>
      `;
    }).join("");

    const dots = zs.map((z, i) => {
      const x = xOf(i), y = yOf(z.wallet_pct_hunts);
      const bad = z.wallet_pct_hunts < 100;
      return `
        <g class="chart-pt" data-zone="${z.z}">
          <circle cx="${x}" cy="${y}" r="${bad ? 5 : 4}" fill="${bad ? "#f26c79" : "#f2c96c"}" stroke="#0a0d14" stroke-width="1.5" />
          <title>Z${z.z}: ${Math.round(z.wallet_pct_hunts)}% with Hunts (${Math.round(z.wallet_pct_0hunt)}% 0 Hunts)</title>
        </g>
        ${i % 2 === 0 || i === zs.length - 1 ? `<text x="${x}" y="${H - 8}" text-anchor="middle" fill="#8d9db8" font-size="10">Z${z.z}</text>` : ""}
      `;
    }).join("");

    const areaPts = `${padL},${padT + ch} ${ptsH} ${W - padR},${padT + ch}`;

    $("chartWallet").innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
        <defs>
          <linearGradient id="walletArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#e5bc66" stop-opacity="0.30" />
            <stop offset="100%" stop-color="#e5bc66" stop-opacity="0.02" />
          </linearGradient>
        </defs>
        ${gridLines}
        <rect x="${padL}" y="${y100}" width="${cw}" height="${padT + ch - y100}" fill="rgba(242, 108, 121, 0.08)" />
        <polygon points="${areaPts}" fill="url(#walletArea)" />
        <polyline fill="none" stroke="#6cb8ff" stroke-width="1.8" stroke-dasharray="4 3" points="${pts0}" />
        <polyline fill="none" stroke="#f2c96c" stroke-width="2.5" points="${ptsH}" />
        ${dots}
      </svg>
    `;
  }

  function renderFightNetChart(zs) {
    const W = 560, H = 235, padL = 46, padR = 14, padT = 18, padB = 30;
    const cw = W - padL - padR, ch = H - padT - padB;
    // Use normalized % ratio: Potion Cost as % of Fight Loot (capped at 200% for readable early-zone alert!)
    const ratios = zs.map((z) => ({
      z: z.z,
      pct: Math.min(200, Math.round((z.fight_potion_cost / Math.max(1, z.fight_val)) * 100)),
      rawPct: Math.round((z.fight_potion_cost / Math.max(1, z.fight_val)) * 100),
      loot: Math.round(z.fight_val),
      pot: Math.round(z.fight_potion_cost),
      net: Math.round(z.fight_net),
    }));

    const slotW = cw / ratios.length;
    const barW = Math.max(8, slotW * 0.62);
    const yOf = (pct) => padT + ch - (pct / 200) * ch;
    const y100 = yOf(100);

    const grid = [0, 50, 100, 150, 200].map((v) => {
      const y = yOf(v);
      return `
        <line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="${v === 100 ? "#f26c79" : "#252f42"}" stroke-width="${v === 100 ? 1.4 : 1}" ${v === 100 ? 'stroke-dasharray="5 4"' : ""} />
        <text x="${padL - 5}" y="${y + 4}" text-anchor="end" fill="${v === 100 ? "#ffa3ad" : "#8999b3"}" font-size="10">${v}%</text>
      `;
    }).join("");

    const bars = ratios.map((r, i) => {
      const x = padL + i * slotW + (slotW - barW) / 2;
      const y = yOf(r.pct);
      const bh = Math.max(2, padT + ch - y);
      const isBleed = r.rawPct > 100;
      const fill = isBleed ? "#f06e7d" : r.rawPct > 50 ? "#e8b658" : "#56d699";
      return `
        <g>
          <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${bh.toFixed(1)}" rx="3" fill="${fill}" opacity="0.9">
            <title>Z${r.z}: Potion cost = ${r.rawPct}% of fight loot (${r.pot}s potions vs ${r.loot}s fight loot, Net ${r.net >= 0 ? "+" : ""}${r.net}s)</title>
          </rect>
          ${i % 2 === 0 || i === ratios.length - 1 ? `<text x="${(x + barW / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle" fill="#8d9db8" font-size="10">Z${r.z}</text>` : ""}
        </g>
      `;
    }).join("");

    $("chartFightNet").innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
        ${grid}
        <text x="${W - padR - 4}" y="${y100 - 5}" text-anchor="end" fill="#ffa3ad" font-size="9.5" font-weight="700">Above 100% = Potions Cost More Than Fights Drop</text>
        ${bars}
      </svg>
    `;
  }

  function filterZones(zs) {
    const mVal = $("selMapFilter").value;
    const defOnly = $("chkDeficitOnly").checked;
    return zs.filter((z) => {
      const reg = zoneRegionNum(z.z);
      const mapNum = REGION_PROFILES[reg].map;
      if (mVal !== "all" && String(mapNum) !== mVal) return false;
      if (defOnly && z.wallet_pct_hunts >= 100 && z.fight_net >= 0) return false;
      return true;
    });
  }

  function zoneStatusInfo(z) {
    if (z.wallet_pct_hunts < 100 || z.fight_net < 0) return { cls: "deficit", cardCls: "status-deficit", label: "Deficit Alert" };
    if (z.wallet_pct_hunts <= 125) return { cls: "balanced", cardCls: "status-balanced", label: "Balanced" };
    return { cls: "surplus", cardCls: "", label: "High Surplus" };
  }

  function renderZonesCards(zs) {
    const filtered = filterZones(zs);
    if (filtered.length === 0) {
      $("zonesCardsGrid").innerHTML = `<div class="glass-card" style="padding:20px;color:#aebcd1;">No Zones match the active filter.</div>`;
      return;
    }

    $("zonesCardsGrid").innerHTML = filtered.map((z) => {
      const reg = zoneRegionNum(z.z);
      const regMeta = REGION_PROFILES[reg];
      const st = zoneStatusInfo(z);
      const portal = PORTAL_META[z.z];
      const outpost = worldLocations.find((l) => l.id.startsWith(`outpost_z${String(z.z).padStart(2, "0")}`));
      const { healId, manaId } = zoneHealManaIds(z.z);

      return `
        <button type="button" class="zone-card ${st.cardCls}" data-zone="${z.z}">
          <div class="zone-card-banner">
            <img class="zone-card-backdrop" src="${zoneBackdrop(z.z)}" alt="" />
            <div class="zone-card-shade"></div>
            <div class="zone-card-top">
              <div class="zone-card-badges">
                <div class="zone-emblems">
                  <img class="zone-faction-banner" src="${regMeta.banner}" alt="" />
                  ${outpost?.assetPath ? `<img class="zone-outpost-pin" src="/assets/${outpost.assetPath.replace(/^assets\//, "")}" alt="" />` : ""}
                </div>
                <span class="status-pill ${st.cls}">${st.label}</span>
              </div>
              <div class="zone-card-title-row">
                <div>
                  <div class="zone-name">Zone ${z.z} · Lv ${z.lv}</div>
                  <div class="zone-sub">${regMeta.name}${outpost ? ` · ${outpost.name}` : ""}</div>
                </div>
                ${portal ? `
                  <span class="portal-boss-pill">
                    <img src="${portal.icon}" alt="" />
                    <span>Portal #${z.z === 3 ? 1 : z.z === 5 ? 2 : z.z === 8 ? 3 : z.z === 10 ? 4 : z.z === 13 ? 5 : z.z === 15 ? 6 : z.z === 18 ? 7 : 8}</span>
                  </span>
                ` : ""}
              </div>
            </div>
          </div>

          <div class="zone-card-body">
            <div class="metric-grid">
              <div class="metric-cell">
                <span class="m-lbl">Avg Quest</span>
                <span class="m-val gold">${fmtS(z.q_avg_s)} (${z.quests})</span>
              </div>
              <div class="metric-cell">
                <span class="m-lbl">Outpost Hunt</span>
                <span class="m-val gold">${fmtS(z.hunt_s)}</span>
              </div>
              <div class="metric-cell">
                <span class="m-lbl">Cumulative %</span>
                <span class="m-val ${z.wallet_pct_hunts < 100 ? "bad" : "good"}">${Math.round(z.wallet_pct_hunts)}%</span>
              </div>
              <div class="metric-cell">
                <span class="m-lbl">Fight Loot</span>
                <span class="m-val">${fmtS(z.fight_val)}</span>
              </div>
              <div class="metric-cell">
                <span class="m-lbl">Potion / Fight</span>
                <span class="m-val">${fmtS(z.fight_potion_cost)}</span>
              </div>
              <div class="metric-cell">
                <span class="m-lbl">Net / Fight</span>
                <span class="m-val ${z.fight_net < 0 ? "bad" : "good"}">${z.fight_net >= 0 ? "+" : ""}${fmtS(z.fight_net)}</span>
              </div>
            </div>

            <div class="zone-potion-strip">
              <div class="potion-pair">
                <span class="potion-chip"><img src="/assets/icons/items/${healId}.webp" alt="" />${fmtS(z.heal_price)}</span>
                <span class="potion-chip"><img src="/assets/icons/items/${manaId}.webp" alt="" />${fmtS(z.mana_price)}</span>
              </div>
              <span>End Lv ${z.lv_hunts} · Bill ${fmtS(z.zone_bill)}</span>
            </div>
          </div>
        </button>
      `;
    }).join("");

    $("zonesCardsGrid").querySelectorAll(".zone-card").forEach((el) => {
      el.addEventListener("click", () => openZoneDrawer(Number(el.getAttribute("data-zone"))));
    });
  }

  function renderZonesTable(zs) {
    const filtered = filterZones(zs);
    $("zonesTableWrap").innerHTML = `
      <table class="sim-table">
        <thead>
          <tr>
            <th>Zone</th>
            <th>Region &amp; Band</th>
            <th>Q</th>
            <th>AvgQ</th>
            <th>HuntS</th>
            <th>FgtXP</th>
            <th>FgtLoot</th>
            <th>Pot/F</th>
            <th>Net/F</th>
            <th>Heal</th>
            <th>Mana</th>
            <th>Lv</th>
            <th>Zone Bill</th>
            <th>Cum%</th>
            <th>0H%</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map((z) => {
            const reg = REGION_PROFILES[zoneRegionNum(z.z)].name;
            const netCls = z.fight_net < 0 ? "cell-bad" : "cell-good";
            const cumCls = z.wallet_pct_hunts < 100 ? "cell-bad" : z.wallet_pct_hunts > 130 ? "cell-gold" : "cell-good";
            return `
              <tr data-zone="${z.z}">
                <td class="cell-gold">Z${String(z.z).padStart(2, "0")}${PORTAL_META[z.z] ? " ★" : ""}</td>
                <td>${reg} (Lv ${z.lv})</td>
                <td>${z.quests}</td>
                <td>${fmtS(z.q_avg_s)}</td>
                <td>${fmtS(z.hunt_s)}</td>
                <td>${Math.round(z.fight_xp).toLocaleString()}</td>
                <td>${fmtS(z.fight_val)}</td>
                <td>${fmtS(z.fight_potion_cost)}</td>
                <td class="${netCls}">${z.fight_net >= 0 ? "+" : ""}${fmtS(z.fight_net)}</td>
                <td>${fmtS(z.heal_price)}</td>
                <td>${fmtS(z.mana_price)}</td>
                <td>Lv ${z.lv_hunts}</td>
                <td>${fmtS(z.zone_bill)}</td>
                <td class="${cumCls}">${Math.round(z.wallet_pct_hunts)}%</td>
                <td>${Math.round(z.wallet_pct_0hunt)}%</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    `;
    $("zonesTableWrap").querySelectorAll("tbody tr").forEach((tr) => {
      tr.addEventListener("click", () => openZoneDrawer(Number(tr.getAttribute("data-zone"))));
    });
  }

  function openZoneDrawer(zoneNum) {
    if (!simData) return;
    const z = simData.zones.find((item) => item.z === zoneNum);
    if (!z) return;
    const regNum = zoneRegionNum(zoneNum);
    const regMeta = REGION_PROFILES[regNum];
    const outpost = worldLocations.find((l) => l.id.startsWith(`outpost_z${String(zoneNum).padStart(2, "0")}`));
    const heroImg = outpost?.interiorAssetPath ? `/assets/${outpost.interiorAssetPath.replace(/^assets\//, "")}` : zoneBackdrop(zoneNum);
    const zoneQuests = questsCatalog.filter((q) => questZoneOf(q.levelRange) === zoneNum);
    const regionTgs = itemsCatalog.filter((it) => it.category === "trade_good" && (it.region ?? 1) === regNum).slice(0, 6);
    const { healId, manaId } = zoneHealManaIds(zoneNum);
    const portal = PORTAL_META[zoneNum];

    $("drawerBody").innerHTML = `
      <div class="drawer-hero">
        <img src="${heroImg}" alt="" />
        <div class="drawer-hero-shade"></div>
        <div class="drawer-hero-text">
          <h2>Zone ${zoneNum} · ${regMeta.name} (Lv ${z.lv})</h2>
          <p>${outpost ? `${outpost.name} · ` : ""}${Math.round(z.nat_fights)} expected battles · ${z.total_h.toFixed(1)}h content</p>
        </div>
      </div>

      <div class="drawer-content">
        <div class="drawer-section">
          <h3>Zone Economic Balance</h3>
          <div class="metric-grid">
            <div class="metric-cell"><span class="m-lbl">Gear + Spells</span><span class="m-val">${fmtS(z.gear_spell_bill)}</span></div>
            <div class="metric-cell"><span class="m-lbl">Real Potions Total</span><span class="m-val">${fmtS(z.potion_bill)}</span></div>
            <div class="metric-cell"><span class="m-lbl">Total Zone Bill</span><span class="m-val gold">${fmtS(z.zone_bill)}</span></div>
            <div class="metric-cell"><span class="m-lbl">Battle Drops / Fight</span><span class="m-val">${fmtS(z.fight_val)}</span></div>
            <div class="metric-cell"><span class="m-lbl">Potions / Fight</span><span class="m-val">${fmtS(z.fight_potion_cost)}</span></div>
            <div class="metric-cell"><span class="m-lbl">Net Margin / Fight</span><span class="m-val ${z.fight_net < 0 ? "bad" : "good"}">${z.fight_net >= 0 ? "+" : ""}${fmtS(z.fight_net)}</span></div>
          </div>
          <div class="zone-potion-strip" style="margin-top:8px;">
            <div class="potion-pair">
              <span class="potion-chip"><img src="/assets/icons/items/${healId}.webp" alt="" />Healing: ${fmtS(z.heal_price)}</span>
              <span class="potion-chip"><img src="/assets/icons/items/${manaId}.webp" alt="" />Mana: ${fmtS(z.mana_price)}</span>
            </div>
            <span>Outpost Hunt: <strong>${fmtS(z.hunt_s)} · ${z.hunt_xp.toLocaleString()} XP/hero</strong></span>
          </div>
        </div>

        ${portal ? `
          <div class="drawer-section">
            <h3>Portal Gate Boss</h3>
            <div class="drawer-quest-item">
              <img src="${portal.icon}" alt="" />
              <div class="dq-meta">
                <div class="dq-title">${portal.name} — ${portal.boss}</div>
                <div class="dq-sub">Zone ${zoneNum} Capstone Boss</div>
              </div>
            </div>
          </div>
        ` : ""}

        <div class="drawer-section">
          <h3>Hub Quests in Zone ${zoneNum} (${zoneQuests.length} Exported Quest Cards)</h3>
          <div class="drawer-quest-list">
            ${zoneQuests.map((q) => `
              <div class="drawer-quest-item">
                <img src="/assets/icons/quests/${q.questId}.webp" alt="" />
                <div class="dq-meta">
                  <div class="dq-title">${q.title}</div>
                  <div class="dq-sub">${q.hubName} · ${q.giver} (${q.category})</div>
                  <div class="dq-rew">${q.reward}</div>
                </div>
              </div>
            `).join("")}
          </div>
        </div>

        ${regionTgs.length > 0 ? `
          <div class="drawer-section">
            <h3>Regional Trade Good Drops (${regMeta.name})</h3>
            <div class="hero-avatars-row" style="flex-wrap:wrap;gap:8px;">
              ${regionTgs.map((tg) => `
                <span class="hero-mini-chip">
                  <img src="/assets/${String(tg.iconPath || "").replace(/^assets\//, "")}" alt="" />
                  ${tg.name} (${tg.sellSilver}s)
                </span>
              `).join("")}
            </div>
          </div>
        ` : ""}
      </div>
    `;
    $("zoneDrawer").classList.remove("hidden");
  }

  function closeZoneDrawer() {
    $("zoneDrawer").classList.add("hidden");
  }

  function renderAll() {
    if (!simData) return;
    renderKpis(simData);
    renderWalletChart(simData.zones);
    renderFightNetChart(simData.zones);
    renderZonesCards(simData.zones);
    renderZonesTable(simData.zones);
  }

  async function runSimulator() {
    const btn = $("btnRerun");
    const badge = $("simRunBadge");
    const hunts = $("rngHunts").value;
    btn.disabled = true;
    badge.textContent = "Running Python economy simulator...";
    try {
      const res = await fetch(`/api/admin/simulator/run?hunts=${encodeURIComponent(hunts)}`);
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      simData = json;
      renderAll();
      badge.textContent = `Simulated @ ${new Date(json.ranAt).toLocaleTimeString()} · ${json.zones.length} Zones`;
    } catch (err) {
      badge.textContent = `Error: ${String(err.message || err)}`;
    } finally {
      btn.disabled = false;
    }
  }

  async function boot() {
    const [qRes, wRes, iRes] = await Promise.all([
      fetch("/data/quests-catalog.json").then((r) => r.json()).catch(() => ({ quests: [] })),
      fetch("/data/world-locations.json").then((r) => r.json()).catch(() => ({ locations: [] })),
      fetch("/data/items-catalog.json").then((r) => r.json()).catch(() => ({ items: [] })),
    ]);
    questsCatalog = qRes.quests || [];
    worldLocations = wRes.locations || [];
    itemsCatalog = iRes.items || [];

    $("rngHunts").addEventListener("input", () => {
      $("lblHuntsVal").textContent = Number($("rngHunts").value).toFixed(1);
    });
    $("rngHunts").addEventListener("change", runSimulator);
    $("btnRerun").addEventListener("click", runSimulator);
    $("selMapFilter").addEventListener("change", renderAll);
    $("chkDeficitOnly").addEventListener("change", renderAll);

    document.querySelectorAll(".vtab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".vtab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        currentView = tab.getAttribute("data-view") || "cards";
        $("zonesCardsGrid").classList.toggle("hidden", currentView !== "cards");
        $("zonesTableWrap").classList.toggle("hidden", currentView !== "table");
      });
    });

    $("btnCloseDrawer").addEventListener("click", closeZoneDrawer);
    $("drawerBackdrop").addEventListener("click", closeZoneDrawer);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeZoneDrawer();
    });

    await runSimulator();
  }

  boot();
})();
