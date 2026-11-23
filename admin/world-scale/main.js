(() => {
  "use strict";

  const TILE_SIZE = 512;
  const MAP_SIZE = 8192;
  const SQRT3 = Math.sqrt(3);

  // Region 1 (Crownlands) locations from world-locations.json on map_01
  const CROWNLANDS_ANCHOR = { x: 5521, y: 5638 }; // Highcrown
  const BASE_SPAWN = { x: 5391, y: 5768 };

  // Contiguous pure-land Crownlands tiles (c=10..12, r=5..8) verified impassable-free
  const PATCH_COLS = [10, 11, 12];
  const PATCH_ROWS = [5, 6, 7, 8];

  const PRESETS = {
    current: {
      id: "current",
      label: "Current Live (4 Maps)",
      mapsTotal: 4,
      newMapsNeeded: 0,
      zoom: 0.75,
      landSpread: 1.0,
      tokenSize: 142,
      markerSize: 148,
      speed: 140,
      verdictClass: "warn",
      verdict:
        "Right now Crownlands shares Map 1 with Saltmarsh Coast. At 0.75x camera zoom and a 142px hero token, Zone 1 fits inside roughly 1 screen and you cross west into Zone 2 in under 5 seconds."
    },
    stretch: {
      id: "stretch",
      label: "Over-Zoom Warning (Same 4 Maps)",
      mapsTotal: 4,
      newMapsNeeded: 0,
      zoom: 1.85,
      landSpread: 1.0,
      tokenSize: 112,
      markerSize: 118,
      speed: 140,
      verdictClass: "warn",
      verdict:
        "Zooming in without adding maps makes every tree, rock, and hill look nearly 2x fatter and softer, while Zone 1 still holds the exact same cramped distance between towns."
    },
    regional8: {
      id: "regional8",
      label: "Proposal A: 8 Regional Maps (Recommended)",
      mapsTotal: 8,
      newMapsNeeded: 4,
      zoom: 1.0,
      landSpread: 2.0,
      tokenSize: 82,
      markerSize: 94,
      speed: 140,
      verdictClass: "good",
      verdict:
        "Giving each of the 8 Regions its own full 8192x8192 map keeps trees 100% crisp at 1:1 native detail, trims the hero token to 82px, and expands Crownlands by 4x area (~30s+ across Zone 1) with zero story changes."
    },
    subregion16: {
      id: "subregion16",
      label: "Proposal B: 16 Maps (2 per Region)",
      mapsTotal: 16,
      newMapsNeeded: 12,
      zoom: 1.05,
      landSpread: 2.7,
      tokenSize: 78,
      markerSize: 88,
      speed: 145,
      verdictClass: "good",
      verdict:
        "Splits each Region across two standalone 8192x8192 maps connected by Border Roads/Ferries. Countryside treks between Highcrown and Oakhaven feel genuinely expansive at full 1:1 crispness."
    },
    zone20: {
      id: "zone20",
      label: "Proposal C: 20 Dedicated Zone Maps",
      mapsTotal: 20,
      newMapsNeeded: 16,
      zoom: 1.05,
      landSpread: 3.4,
      tokenSize: 74,
      markerSize: 84,
      speed: 150,
      verdictClass: "good",
      verdict:
        "Every single Level Zone (Lv 1-5 through Lv 96-99) owns an entire 8192x8192 map. Classic SNES/PS1 RPG world-map scale (~45-60s+ treks) with zero bloated trees—just 16 standalone maps to generate & paint."
    }
  };

  const BLUEPRINT_HTML = {
    rec: `
      <p><strong>Why 8 Regional Maps (Proposal A) is the cleanest sweet spot:</strong></p>
      <ul>
        <li><strong>Solves both complaints at once:</strong> You never stretch existing 8192 art past 1:1 sharpness, AND Zone 1 grows from a 5-second hop into a real ~30-second trek across multiple screens.</li>
        <li><strong>1 Region = 1 Full Map = 1 Portal:</strong> Ethoria already has <strong>8 Regions</strong> and <strong>8 Portals</strong>. Putting each Region on its own full 8192&times;8192 canvas spreads 5 Hubs + 1 Portal comfortably across the whole map instead of cramming 10 Hubs + 2 Portals together.</li>
        <li><strong>Fast turnaround:</strong> You keep every existing town, NPC, quest, shop, battle background, and marker pin—just 4–8 fresh regional terrains generated via Batch API and painted in Admin.</li>
        <li><strong>Token + Camera polish multiplies it:</strong> Shrinking the hero from 142px &rarr; <strong>82px</strong> and setting zoom to <strong>1.0&times;</strong> doubles how spacious the exact same terrain feels without blurring a single tree.</li>
      </ul>
    `,
    maps: `
      <div class="map-split-list">
        <div class="map-split-row"><strong>Map 1 · The Crownlands (Lv 1–15)</strong><span>Zones 1–3 · Highcrown, Oakhaven, Millbrook, Hill-Fort, Meadowbrook &rarr; Portal #1 (Ashen Gate) unlocks Crossing North/West</span></div>
        <div class="map-split-row"><strong>Map 2 · Saltmarsh Coast (Lv 16–25)</strong><span>Zones 4–5 · Saltwind Harbor, Reedfen, Brinecliff, Mirewatch, Tidewater Keep &rarr; Portal #2 unlocks Sea Voyage</span></div>
        <div class="map-split-row"><strong>Map 3 · Thornwall Warfronts (Lv 26–40)</strong><span>Zones 6–8 · Border Keeps &amp; Siege Roads &rarr; Portal #3 unlocks Ferry to the Weald</span></div>
        <div class="map-split-row"><strong>Map 4 · Verdant Weald (Lv 41–50)</strong><span>Zones 9–10 · Forest Shrines &amp; Cove Harbor &rarr; Portal #4 unlocks Sea Voyage</span></div>
        <div class="map-split-row"><strong>Map 5 · Sun-Scorched Isles (Lv 51–65)</strong><span>Zones 11–13 · Oasis Cities &amp; Sandstone Citadels &rarr; Portal #5 unlocks North Pass</span></div>
        <div class="map-split-row"><strong>Map 6 · Ironcrest Highlands (Lv 66–75)</strong><span>Zones 14–15 · Granite Peaks &amp; Desert Harbor &rarr; Portal #6 unlocks Northern Voyage</span></div>
        <div class="map-split-row"><strong>Map 7 · Frostbound Reach (Lv 76–90)</strong><span>Zones 16–18 · Frozen Fjords &amp; Arctic Harbor &rarr; Portal #7 opens Dreadwaste Gate</span></div>
        <div class="map-split-row"><strong>Map 8 · The Dreadwaste (Lv 91–99)</strong><span>Zones 19–20 · Ash Plains, Siege Camps &amp; Black Keep &rarr; Portal #8 Finale</span></div>
      </div>
    `,
    bigger: `
      <p><strong>If 8 Maps still feels too compact, scale straight to 16 or 20 standalone 8192 maps:</strong></p>
      <table class="compare-mini">
        <thead>
          <tr><th>Plan</th><th>4K Maps</th><th>Z1 Width</th><th>Tree Detail</th></tr>
        </thead>
        <tbody>
          <tr><td>Current</td><td>4 (done)</td><td>~1 screen</td><td>0.75&times; (small)</td></tr>
          <tr><td><strong>8 Regional</strong></td><td><strong>8 (+4 net)</strong></td><td><strong>~3.2 screens</strong></td><td><strong>1:1 Crisp</strong></td></tr>
          <tr><td>16 Sub-Region</td><td>16 (+12)</td><td>~4.5 screens</td><td>1:1 Crisp</td></tr>
          <tr><td>20 Zone Maps</td><td>20 (+16)</td><td>~6+ screens</td><td>1:1 Crisp</td></tr>
        </tbody>
      </table>
      <ul>
        <li><strong>No stitched seams needed:</strong> Every map stays an independent 4K &rarr; 8192 continent/valley connected cleanly by <strong>Border Road Gates</strong>, <strong>Ferry Crossings</strong>, and <strong>Sea-Ports</strong>.</li>
        <li><strong>Timeline reality:</strong> At 1 day per ~4–6 maps (Batch generate + paint hexes + drop pins), <strong>8 Maps = ~1 day</strong>, <strong>20 Maps = ~3–4 days</strong>—never months.</li>
      </ul>
    `
  };

  // DOM References
  const simCanvas = document.getElementById("simCanvas");
  const simCtx = simCanvas.getContext("2d");
  const loupeCanvas = document.getElementById("loupeCanvas");
  const loupeCtx = loupeCanvas.getContext("2d");
  const minimapCanvas = document.getElementById("minimapCanvas");
  const minimapCtx = minimapCanvas.getContext("2d");

  const viewportFrame = document.getElementById("viewportFrame");
  const loupeBox = document.getElementById("loupeBox");
  const minimapBox = document.getElementById("minimapBox");
  const loupeBadge = document.getElementById("loupeBadge");
  const loupeCaption = document.getElementById("loupeCaption");

  const hudZoneBadge = document.getElementById("hudZoneBadge");
  const hudWalkMeta = document.getElementById("hudWalkMeta");
  const lblWalkTimer = document.getElementById("lblWalkTimer");
  const studioStats = document.getElementById("studioStats");

  const mMapsCount = document.getElementById("mMapsCount");
  const mTreeSharp = document.getElementById("mTreeSharp");
  const mZone2Walk = document.getElementById("mZone2Walk");
  const mOakhavenWalk = document.getElementById("mOakhavenWalk");
  const mScreensWide = document.getElementById("mScreensWide");
  const mHeroShare = document.getElementById("mHeroShare");
  const verdictBanner = document.getElementById("verdictBanner");

  const rngZoom = document.getElementById("rngZoom");
  const rngSpread = document.getElementById("rngSpread");
  const rngToken = document.getElementById("rngToken");
  const rngMarker = document.getElementById("rngMarker");
  const rngSpeed = document.getElementById("rngSpeed");

  const valZoom = document.getElementById("valZoom");
  const valSpread = document.getElementById("valSpread");
  const valToken = document.getElementById("valToken");
  const valMarker = document.getElementById("valMarker");
  const valSpeed = document.getElementById("valSpeed");

  const chkZoneBorders = document.getElementById("chkZoneBorders");
  const chkShowPins = document.getElementById("chkShowPins");
  const chkShowMinimap = document.getElementById("chkShowMinimap");
  const chkShowLoupe = document.getElementById("chkShowLoupe");

  const btnAutoWalk = document.getElementById("btnAutoWalk");
  const btnResetHighcrown = document.getElementById("btnResetHighcrown");
  const btnJumpOakhaven = document.getElementById("btnJumpOakhaven");
  const bpBody = document.getElementById("bpBody");

  // Application State
  const state = {
    presetId: "current",
    screenMode: "desktop", // desktop (1920x1080) or deck (1280x800)
    zoom: PRESETS.current.zoom,
    landSpread: PRESETS.current.landSpread,
    tokenSize: PRESETS.current.tokenSize,
    markerSize: PRESETS.current.markerSize,
    speed: PRESETS.current.speed,
    playerX: BASE_SPAWN.x,
    playerY: BASE_SPAWN.y,
    clickTarget: null,
    autoWalkActive: false,
    walkElapsed: 0,
    keys: new Set(),
    lastTick: performance.now(),
    locations: [],
    markerImgs: new Map(),
    tiles: new Map(),
    valenImg: null,
    worldPaint: null,
    impassableGrid: null,
    zoneGrid: null,
    biomeByCode: {},
    zoneByCode: {}
  };

  function getScreenDims() {
    return state.screenMode === "deck"
      ? { w: 1280, h: 800 }
      : { w: 1920, h: 1080 };
  }

  function loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  function getTile(c, r) {
    const key = `${c}_${r}`;
    if (!state.tiles.has(key)) {
      state.tiles.set(key, null);
      loadImage(`/assets/maps/map_01/tile_${c}_${r}.webp`).then((img) => {
        state.tiles.set(key, img);
      });
    }
    return state.tiles.get(key);
  }

  function decodeRleGrid(rle, cellCount) {
    const grid = new Uint8Array(cellCount);
    if (!Array.isArray(rle)) return grid;
    let pos = 0;
    for (let i = 0; i + 1 < rle.length; i += 2) {
      const val = rle[i] & 0xff;
      const count = rle[i + 1] | 0;
      const end = Math.min(cellCount, pos + count);
      if (val !== 0) grid.fill(val, pos, end);
      pos = end;
      if (pos >= cellCount) break;
    }
    return grid;
  }

  function worldPointToCellIdx(wx, wy) {
    if (!state.worldPaint) return -1;
    const hr = state.worldPaint.hexRadius || 16;
    const cols = state.worldPaint.cols;
    const rows = state.worldPaint.rows;
    const q = ((SQRT3 / 3) * wx - (1 / 3) * wy) / hr;
    const r = ((2 / 3) * wy) / hr;
    const s = -q - r;
    let rq = Math.round(q);
    let rr = Math.round(r);
    const rs = Math.round(s);
    const dq = Math.abs(rq - q);
    const dr = Math.abs(rr - r);
    const ds = Math.abs(rs - s);
    if (dq > dr && dq > ds) rq = -rr - rs;
    else if (dr > ds) rr = -rq - rs;
    const row = rr;
    const col = rq + ((rr - (rr & 1)) >> 1);
    if (col < 0 || row < 0 || col >= cols || row >= rows) return -1;
    return row * cols + col;
  }

  function isCircleClearExact(cx, cy, radius) {
    if (!state.impassableGrid) return true;
    const rInner = radius * 0.55;
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI * 2) / 8;
      const idx = worldPointToCellIdx(cx + Math.cos(a) * rInner, cy + Math.sin(a) * rInner);
      if (idx < 0 || state.impassableGrid[idx] === 1) return false;
    }
    for (let i = 0; i < 20; i++) {
      const a = (i * Math.PI * 2) / 20;
      const idx = worldPointToCellIdx(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
      if (idx < 0 || state.impassableGrid[idx] === 1) return false;
    }
    return true;
  }

  function getSimMapSpan() {
    if (state.landSpread <= 1.001) return MAP_SIZE;
    if (state.landSpread <= 2.05) return MAP_SIZE; // Proposal A: 1 full 8192x8192 map per Region
    return Math.round(MAP_SIZE * (1 + (state.landSpread - 2.05) * 0.62));
  }

  function projectPoint(origX, origY) {
    if (state.landSpread <= 1.001) return { x: origX, y: origY };
    const span = getSimMapSpan();
    const simCenterX = span * 0.51;
    const simCenterY = span * 0.72;
    const dx = origX - CROWNLANDS_ANCHOR.x;
    const dy = origY - CROWNLANDS_ANCHOR.y;

    // Expand X across full Regional width; smoothly fit northern Zone 3 inside [520..span-460]
    const px = simCenterX + dx * state.landSpread;
    let py;
    if (dy >= 0) {
      const southCap = Math.min(state.landSpread, 1.55 + (state.landSpread - 2.0) * 0.45);
      py = simCenterY + dy * Math.max(1.2, southCap);
    } else if (dy > -1800) {
      // Zone 1 & nearby Zone 2 towns expand full scale
      py = simCenterY + dy * Math.min(state.landSpread, 1.9 + (state.landSpread - 2.0) * 0.8);
    } else {
      const z2Top = -1800 * Math.min(state.landSpread, 1.9 + (state.landSpread - 2.0) * 0.8);
      const extraN = dy + 1800; // negative
      const remScale = Math.max(0.55, 0.95 * (span / MAP_SIZE));
      py = simCenterY + z2Top + extraN * remScale;
    }

    return {
      x: Math.max(360, Math.min(span - 360, px)),
      y: Math.max(420, Math.min(span - 420, py))
    };
  }

  function getZone1BorderX() {
    if (state.landSpread <= 1.001) {
      return 4725; // Exact Zone 1 west border on map_01
    }
    const hc = projectPoint(CROWNLANDS_ANCHOR.x, CROWNLANDS_ANCHOR.y);
    return hc.x - Math.round(1220 * state.landSpread);
  }

  function getZone1BoundsExpanded() {
    const hc = projectPoint(CROWNLANDS_ANCHOR.x, CROWNLANDS_ANCHOR.y);
    const halfW = 1220 * state.landSpread;
    const halfN = 1280 * Math.min(state.landSpread, 2.5);
    const halfS = 1040 * Math.min(state.landSpread, 2.1);
    return {
      minX: hc.x - halfW,
      maxX: hc.x + halfW * 1.15,
      minY: hc.y - halfN,
      maxY: hc.y + halfS
    };
  }

  function currentZoneInfo(wx, wy) {
    if (state.landSpread <= 1.001 && state.zoneGrid) {
      const idx = worldPointToCellIdx(wx, wy);
      const zc = idx >= 0 ? state.zoneGrid[idx] : 1;
      const zm = state.zoneByCode[zc];
      if (zm) {
        return {
          code: zm.code,
          title: `Zone ${zm.code} · ${zm.name} · Map 1`,
          isZone1: zm.code === 1
        };
      }
    }
    const b = getZone1BoundsExpanded();
    const inZ1 = wx >= b.minX && wx <= b.maxX && wy >= b.minY && wy <= b.maxY;
    if (inZ1) {
      return { code: 1, title: "Zone 1 · Lv 1–5 · Southern Crownlands", isZone1: true };
    }
    if (wy > b.minY - 1250 * state.landSpread) {
      return { code: 2, title: "Zone 2 · Lv 6–10 · Northern Meadows & Oaks", isZone1: false };
    }
    return { code: 3, title: "Zone 3 · Lv 11–15 · Graystone Borderlands", isZone1: false };
  }

  function resetToHighcrown() {
    stopAutoWalk();
    const spawn = projectPoint(BASE_SPAWN.x, BASE_SPAWN.y);
    state.playerX = spawn.x;
    state.playerY = spawn.y;
    state.clickTarget = null;
    state.walkElapsed = 0;
    lblWalkTimer.textContent = "0.0s";
  }

  function jumpNearOakhaven() {
    stopAutoWalk();
    const oak = projectPoint(5604, 4639);
    state.playerX = oak.x - 140;
    state.playerY = oak.y + 110;
    state.clickTarget = null;
    state.walkElapsed = 0;
    lblWalkTimer.textContent = "0.0s";
  }

  function stopAutoWalk() {
    state.autoWalkActive = false;
    btnAutoWalk.classList.remove("running");
    btnAutoWalk.innerHTML = "&#9654; Walk to Zone 2 Edge";
  }

  function startAutoWalkToZone2() {
    resetToHighcrown();
    state.autoWalkActive = true;
    state.walkElapsed = 0;
    btnAutoWalk.classList.add("running");
    btnAutoWalk.textContent = "Walking to Zone 2 Edge... (Stop)";
  }

  function estimatePresetMapsCount(spread) {
    if (spread <= 1.15) return { total: 4, extra: 0, label: "4 maps (existing)" };
    if (spread <= 2.35) return { total: 8, extra: 4, label: "8 Regional maps (+4)" };
    if (spread <= 3.05) return { total: 16, extra: 12, label: "16 Sub-Region maps (+12)" };
    return { total: 20, extra: 16, label: "20 Zone maps (+16)" };
  }

  function applyPreset(presetId) {
    const p = PRESETS[presetId];
    if (!p) return;
    state.presetId = presetId;
    state.zoom = p.zoom;
    state.landSpread = p.landSpread;
    state.tokenSize = p.tokenSize;
    state.markerSize = p.markerSize;
    state.speed = p.speed;

    document.querySelectorAll(".preset-card").forEach((el) => {
      el.classList.toggle("active", el.dataset.preset === presetId);
    });

    syncSlidersFromState();
    resetToHighcrown();
    updateReadouts();
  }

  function syncSlidersFromState() {
    rngZoom.value = state.zoom.toFixed(2);
    rngSpread.value = state.landSpread.toFixed(1);
    rngToken.value = String(Math.round(state.tokenSize));
    rngMarker.value = String(Math.round(state.markerSize));
    rngSpeed.value = String(Math.round(state.speed));
  }

  function updateReadouts() {
    const dims = getScreenDims();
    const visibleWorldW = dims.w / state.zoom;
    const mapMeta = estimatePresetMapsCount(state.landSpread);

    valZoom.textContent = `${state.zoom.toFixed(2)}×`;
    valSpread.textContent = `${state.landSpread.toFixed(1)}× (${mapMeta.total} maps)`;
    valToken.textContent = `${Math.round(state.tokenSize)} px`;
    valMarker.textContent = `${Math.round(state.markerSize)} px`;
    valSpeed.textContent = `${Math.round(state.speed)} px/s`;

    // Travel measurements
    const spawn = projectPoint(BASE_SPAWN.x, BASE_SPAWN.y);
    const hc = projectPoint(CROWNLANDS_ANCHOR.x, CROWNLANDS_ANCHOR.y);
    const oak = projectPoint(5604, 4639);
    const borderX = getZone1BorderX();
    const distToZ2 = Math.max(120, Math.abs(spawn.x - borderX));
    const secToZ2 = distToZ2 / state.speed;

    const distOak = Math.hypot(oak.x - hc.x, oak.y - hc.y);
    const secToOak = distOak / state.speed;

    const z1Width = state.landSpread <= 1.001
      ? 2633
      : (getZone1BoundsExpanded().maxX - getZone1BoundsExpanded().minX);
    const screensWide = z1Width / visibleWorldW;
    const heroRatio = Math.round(visibleWorldW / state.tokenSize);

    mMapsCount.textContent = mapMeta.label;
    mMapsCount.className = `m-val ${mapMeta.total >= 8 ? "gold" : ""}`;

    // Tree crispness readout
    if (state.zoom <= 1.15) {
      mTreeSharp.textContent = state.zoom < 0.9 ? `${Math.round(state.zoom * 100)}% (Tiny)` : "100% Crisp 1:1";
      mTreeSharp.className = "m-val good";
      loupeBadge.textContent = state.zoom < 0.9 ? `${Math.round(state.zoom * 100)}% Small` : "100% Native";
      loupeBadge.className = `loupe-status ${state.zoom < 0.9 ? "sub" : "ok"}`;
      loupeCaption.textContent =
        state.zoom <= 1.15
          ? "Trees stay true 1:1 size—no stretching or fat foliage."
          : "";
    } else if (state.zoom <= 1.35) {
      mTreeSharp.textContent = `${Math.round(state.zoom * 100)}% Slight Soft`;
      mTreeSharp.className = "m-val";
      loupeBadge.textContent = `${Math.round(state.zoom * 100)}% Limit`;
      loupeBadge.className = "loupe-status sub";
      loupeCaption.textContent = "Near the zoom limit before painted trees start looking fat.";
    } else {
      mTreeSharp.textContent = `${Math.round(state.zoom * 100)}% Fat/Stretched`;
      mTreeSharp.className = "m-val bad";
      loupeBadge.textContent = `${Math.round(state.zoom * 100)}% Stretched`;
      loupeBadge.className = "loupe-status warn";
      loupeCaption.textContent = "Single painted tree looks bloated & soft because art is over-zoomed.";
    }

    mZone2Walk.textContent = `~${secToZ2.toFixed(1)}s`;
    mZone2Walk.className = `m-val ${secToZ2 >= 14 ? "good" : "bad"}`;

    mOakhavenWalk.textContent = `~${secToOak.toFixed(1)}s`;
    mOakhavenWalk.className = `m-val ${secToOak >= 13 ? "good" : ""}`;

    mScreensWide.textContent = `${screensWide.toFixed(1)} screens`;
    mScreensWide.className = `m-val ${screensWide >= 2.2 ? "good" : ""}`;

    mHeroShare.textContent = `1 / ${heroRatio} width`;

    const preset = PRESETS[state.presetId];
    if (preset && Math.abs(state.zoom - preset.zoom) < 0.02 && Math.abs(state.landSpread - preset.landSpread) < 0.05) {
      verdictBanner.textContent = preset.verdict;
      verdictBanner.className = `verdict-banner ${preset.verdictClass}`;
    } else {
      verdictBanner.textContent =
        state.zoom > 1.35
          ? "Custom Tuning: Warning—zoom above 1.35x enlarges every tree unnaturally. Raise Map Land Spread instead!"
          : "Custom Tuning: Compare how Map Land Spread + 1.0x Zoom + smaller Hero Token expands the world cleanly.";
      verdictBanner.className = `verdict-banner ${state.zoom > 1.35 ? "warn" : "good"}`;
    }

    studioStats.textContent = `${mapMeta.total} Maps · Zoom ${state.zoom.toFixed(2)}× · Hero ${Math.round(state.tokenSize)}px · Zone 1 Walk ~${secToZ2.toFixed(1)}s`;
  }

  function stepSimulation(dt) {
    let vx = 0;
    let vy = 0;

    if (state.autoWalkActive) {
      const targetX = getZone1BorderX() - 40;
      const dx = targetX - state.playerX;
      if (dx < -4) {
        vx = -1;
      } else {
        stopAutoWalk();
      }
    } else {
      if (state.keys.has("KeyW") || state.keys.has("ArrowUp")) vy -= 1;
      if (state.keys.has("KeyS") || state.keys.has("ArrowDown")) vy += 1;
      if (state.keys.has("KeyA") || state.keys.has("ArrowLeft")) vx -= 1;
      if (state.keys.has("KeyD") || state.keys.has("ArrowRight")) vx += 1;

      if (vx === 0 && vy === 0 && state.clickTarget) {
        const dx = state.clickTarget.x - state.playerX;
        const dy = state.clickTarget.y - state.playerY;
        const dist = Math.hypot(dx, dy);
        if (dist > 8) {
          vx = dx / dist;
          vy = dy / dist;
        } else {
          state.clickTarget = null;
        }
      }
    }

    if (vx !== 0 || vy !== 0) {
      const len = Math.hypot(vx, vy);
      vx /= len;
      vy /= len;
      const moveDist = state.speed * dt;
      const nx = state.playerX + vx * moveDist;
      const ny = state.playerY + vy * moveDist;

      state.walkElapsed += dt;
      lblWalkTimer.textContent = `${state.walkElapsed.toFixed(1)}s`;

      const span = getSimMapSpan();
      const clampedX = Math.max(96, Math.min(span - 96, nx));
      const clampedY = Math.max(96, Math.min(span - 96, ny));

      if (state.landSpread <= 1.001 && state.impassableGrid) {
        const r = state.tokenSize * 0.45;
        if (isCircleClearExact(clampedX, clampedY, r)) {
          state.playerX = clampedX;
          state.playerY = clampedY;
        } else if (isCircleClearExact(clampedX, state.playerY, r)) {
          state.playerX = clampedX;
        } else if (isCircleClearExact(state.playerX, clampedY, r)) {
          state.playerY = clampedY;
        }
      } else {
        state.playerX = clampedX;
        state.playerY = clampedY;
      }

      if (state.autoWalkActive) {
        const zInfo = currentZoneInfo(state.playerX, state.playerY);
        if (!zInfo.isZone1) {
          stopAutoWalk();
        }
      }
    }
  }

  function renderSimulatedTerrain(ctx, camX, camY, viewW, viewH) {
    if (state.landSpread <= 1.001) {
      // Render exact 8192x8192 map_01 tiles
      const minC = Math.max(0, Math.floor((camX - viewW / 2) / TILE_SIZE));
      const maxC = Math.min(15, Math.floor((camX + viewW / 2) / TILE_SIZE));
      const minR = Math.max(0, Math.floor((camY - viewH / 2) / TILE_SIZE));
      const maxR = Math.min(15, Math.floor((camY + viewH / 2) / TILE_SIZE));

      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          const tile = getTile(c, r);
          if (tile) {
            ctx.drawImage(tile, c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE + 0.8, TILE_SIZE + 0.8);
          } else {
            ctx.fillStyle = "#141d24";
            ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          }
        }
      }
      return;
    }

    // Expanded Regional / Zone simulation: tile pure Crownlands meadows & oak groves at 1:1 NATIVE world pixels
    // using seamless mirrored block alternation so trees NEVER stretch or grow blurry!
    const minC = Math.floor((camX - viewW / 2) / TILE_SIZE);
    const maxC = Math.floor((camX + viewW / 2) / TILE_SIZE);
    const minR = Math.floor((camY - viewH / 2) / TILE_SIZE);
    const maxR = Math.floor((camY + viewH / 2) / TILE_SIZE);

    const nC = PATCH_COLS.length; // 3
    const nR = PATCH_ROWS.length; // 4

    for (let r = minR; r <= maxR; r++) {
      const cycleR = Math.floor(r / nR);
      const localR = ((r % nR) + nR) % nR;
      const flipY = (cycleR & 1) === 1;
      const srcRowIdx = flipY ? nR - 1 - localR : localR;
      const tileRow = PATCH_ROWS[srcRowIdx];

      for (let c = minC; c <= maxC; c++) {
        const cycleC = Math.floor(c / nC);
        const localC = ((c % nC) + nC) % nC;
        const flipX = (cycleC & 1) === 1;
        const srcColIdx = flipX ? nC - 1 - localC : localC;
        const tileCol = PATCH_COLS[srcColIdx];

        const tile = getTile(tileCol, tileRow);
        const wx = c * TILE_SIZE;
        const wy = r * TILE_SIZE;

        if (tile) {
          ctx.save();
          ctx.translate(wx + (flipX ? TILE_SIZE : 0), wy + (flipY ? TILE_SIZE : 0));
          ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
          ctx.drawImage(tile, 0, 0, TILE_SIZE + 0.8, TILE_SIZE + 0.8);
          ctx.restore();
        } else {
          ctx.fillStyle = "#19291e";
          ctx.fillRect(wx, wy, TILE_SIZE, TILE_SIZE);
        }
      }
    }
  }

  function renderZoneBorders(ctx, camX, camY, viewW, viewH) {
    if (!chkZoneBorders.checked) return;

    if (state.landSpread <= 1.001 && state.zoneGrid && state.worldPaint) {
      // Fast coarse border highlight for Zone 1 (4725..7358, 4128..7032)
      ctx.save();
      ctx.strokeStyle = "rgba(74, 222, 128, 0.85)";
      ctx.lineWidth = Math.max(4, 5 / state.zoom);
      ctx.setLineDash([18, 12]);
      ctx.strokeRect(4725, 4128, 7358 - 4725, 7032 - 4128);
      ctx.fillStyle = "rgba(74, 222, 128, 0.9)";
      ctx.font = `700 ${Math.round(18 / state.zoom)}px "Segoe UI", sans-serif`;
      ctx.fillText("ZONE 2 BORDER (Lv 6-10) ->", 4735, Math.max(4180, Math.min(6980, camY - 24)));
      ctx.restore();
      return;
    }

    const b = getZone1BoundsExpanded();
    ctx.save();
    ctx.strokeStyle = "rgba(74, 222, 128, 0.85)";
    ctx.lineWidth = Math.max(4, 5 / state.zoom);
    ctx.setLineDash([22, 14]);
    ctx.strokeRect(b.minX, b.minY, b.maxX - b.minX, b.maxY - b.minY);
    ctx.fillStyle = "rgba(134, 239, 172, 0.92)";
    ctx.font = `700 ${Math.round(16 / state.zoom)}px "Segoe UI", sans-serif`;
    ctx.fillText("<- ZONE 2 BORDER (Lv 6-10)", b.minX + 18, state.playerY - 18);
    ctx.fillText("ZONE 1 · CROWNLANDS (Lv 1-5)", b.minX + 18, b.minY + 30);
    ctx.restore();
  }

  function renderMainCanvas() {
    const dims = getScreenDims();
    if (simCanvas.width !== dims.w || simCanvas.height !== dims.h) {
      simCanvas.width = dims.w;
      simCanvas.height = dims.h;
    }

    const ctx = simCtx;
    const viewW = dims.w / state.zoom;
    const viewH = dims.h / state.zoom;
    const span = getSimMapSpan();

    const camX = Math.max(viewW / 2, Math.min(span - viewW / 2, state.playerX));
    const camY = Math.max(viewH / 2, Math.min(span - viewH / 2, state.playerY));

    ctx.clearRect(0, 0, dims.w, dims.h);
    ctx.save();
    ctx.scale(state.zoom, state.zoom);
    ctx.translate(-(camX - viewW / 2), -(camY - viewH / 2));

    renderSimulatedTerrain(ctx, camX, camY, viewW, viewH);
    renderZoneBorders(ctx, camX, camY, viewW, viewH);

    // Subtle roads between Highcrown & nearby towns when expanded
    if (state.landSpread > 1.001) {
      const hc = projectPoint(5521, 5638);
      const oak = projectPoint(5604, 4639);
      const mg = projectPoint(5974, 6608);
      const mb = projectPoint(7261, 4752);
      ctx.save();
      ctx.strokeStyle = "rgba(214, 188, 128, 0.35)";
      ctx.lineWidth = 14;
      ctx.setLineDash([28, 22]);
      ctx.beginPath();
      ctx.moveTo(hc.x, hc.y); ctx.lineTo(oak.x, oak.y);
      ctx.moveTo(hc.x, hc.y); ctx.lineTo(mg.x, mg.y);
      ctx.moveTo(oak.x, oak.y); ctx.lineTo(mb.x, mb.y);
      ctx.stroke();
      ctx.restore();
    }

    // Draw Region 1 (+ Map 1) locations
    if (chkShowPins.checked) {
      for (const loc of state.locations) {
        if (state.landSpread > 1.001 && loc.region !== 1) continue;
        const p = projectPoint(loc.x, loc.y);
        if (
          p.x < camX - viewW / 2 - 260 ||
          p.x > camX + viewW / 2 + 260 ||
          p.y < camY - viewH / 2 - 260 ||
          p.y > camY + viewH / 2 + 260
        ) {
          continue;
        }
        const mSize = state.markerSize * (loc.scale || 1.0);
        const img = state.markerImgs.get(loc.id);
        if (img) {
          ctx.drawImage(img, p.x - mSize / 2, p.y - mSize / 2, mSize, mSize);
        } else {
          ctx.fillStyle = "#d7b267";
          ctx.beginPath();
          ctx.arc(p.x, p.y, mSize * 0.25, 0, Math.PI * 2);
          ctx.fill();
        }

        // Clean Nameplate + travel ETA
        const secAway = Math.round(Math.hypot(p.x - state.playerX, p.y - state.playerY) / state.speed);
        const label = secAway > 2 ? `${loc.name} (${secAway}s)` : loc.name;
        ctx.save();
        ctx.font = `700 ${Math.max(13, Math.round(14 / Math.min(1, state.zoom)))}px "Segoe UI", sans-serif`;
        const tw = ctx.measureText(label).width + 16;
        const th = 24;
        const lx = p.x - tw / 2;
        const ly = p.y - mSize / 2 - th - 4;
        ctx.fillStyle = "rgba(10, 14, 22, 0.85)";
        ctx.strokeStyle = loc.isPortal ? "#f87171" : "#d7b267";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(lx, ly, tw, th, 5);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#fff5da";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, p.x, ly + th / 2);
        ctx.restore();
      }
    }

    // Draw Valen Token
    const ts = state.tokenSize;
    if (state.valenImg) {
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.65)";
      ctx.shadowBlur = 12;
      ctx.drawImage(state.valenImg, state.playerX - ts / 2, state.playerY - ts / 2, ts, ts);
      ctx.restore();
    } else {
      ctx.fillStyle = "#4ade80";
      ctx.beginPath();
      ctx.arc(state.playerX, state.playerY, ts / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Update live HUD zone pill
    const zInfo = currentZoneInfo(state.playerX, state.playerY);
    hudZoneBadge.textContent = zInfo.title;
    hudWalkMeta.textContent = `${dims.w}×${dims.h} Frame · ${state.zoom.toFixed(2)}× Zoom · Hero ${Math.round(state.tokenSize)}px`;
  }

  function renderLoupe() {
    if (!chkShowLoupe.checked) return;
    // Always sample crisp Oakwood Grove tile (tile_11_6) so user sees single painted tree crispness
    const treeTile = getTile(11, 6);
    const w = loupeCanvas.width;
    const h = loupeCanvas.height;
    loupeCtx.clearRect(0, 0, w, h);
    if (!treeTile) {
      loupeCtx.fillStyle = "#16201a";
      loupeCtx.fillRect(0, 0, w, h);
      return;
    }
    // Crop center of tile_11_6 scaled inversely by effective pixel zoom so user sees real tree size on screen
    const sampleScale = state.landSpread > 1.001 ? state.zoom : state.zoom;
    const srcW = w / sampleScale;
    const srcH = h / sampleScale;
    const sx = Math.max(0, 220 - srcW / 2);
    const sy = Math.max(0, 240 - srcH / 2);
    loupeCtx.imageSmoothingEnabled = true;
    loupeCtx.drawImage(treeTile, sx, sy, Math.min(512 - sx, srcW), Math.min(512 - sy, srcH), 0, 0, w, h);

    // Draw reference hero dot in loupe for proportion comparison
    const r = Math.max(4, Math.min(34, (state.tokenSize * 0.24) * state.zoom));
    loupeCtx.save();
    loupeCtx.strokeStyle = state.zoom > 1.35 ? "#f87171" : "#86efac";
    loupeCtx.lineWidth = 2;
    loupeCtx.beginPath();
    loupeCtx.arc(28, h - 24, r * 0.5, 0, Math.PI * 2);
    loupeCtx.stroke();
    loupeCtx.fillStyle = "rgba(10, 14, 22, 0.8)";
    loupeCtx.fillRect(4, 4, 88, 17);
    loupeCtx.fillStyle = state.zoom > 1.35 ? "#fca5a5" : "#d7fbe4";
    loupeCtx.font = "700 10px Segoe UI, sans-serif";
    loupeCtx.fillText(`Zoom ${state.zoom.toFixed(2)}×`, 9, 15);
    loupeCtx.restore();
  }

  function renderMinimap() {
    if (!chkShowMinimap.checked) return;
    const w = minimapCanvas.width;
    const h = minimapCanvas.height;
    const span = getSimMapSpan();
    const s = w / span;
    const dims = getScreenDims();
    const viewW = dims.w / state.zoom;
    const viewH = dims.h / state.zoom;
    const camX = Math.max(viewW / 2, Math.min(span - viewW / 2, state.playerX));
    const camY = Math.max(viewH / 2, Math.min(span - viewH / 2, state.playerY));

    minimapCtx.fillStyle = "#0e1520";
    minimapCtx.fillRect(0, 0, w, h);

    // Subtle Region / Zone 1 footprint
    if (state.landSpread <= 1.001) {
      minimapCtx.fillStyle = "rgba(56, 189, 248, 0.14)";
      minimapCtx.fillRect(0, 0, w, h);
      minimapCtx.fillStyle = "rgba(74, 222, 128, 0.22)";
      minimapCtx.strokeStyle = "rgba(74, 222, 128, 0.7)";
      minimapCtx.lineWidth = 1;
      minimapCtx.fillRect(4725 * s, 4128 * s, (7358 - 4725) * s, (7032 - 4128) * s);
      minimapCtx.strokeRect(4725 * s, 4128 * s, (7358 - 4725) * s, (7032 - 4128) * s);
    } else {
      const b = getZone1BoundsExpanded();
      minimapCtx.fillStyle = "rgba(21, 56, 36, 0.45)";
      minimapCtx.fillRect(0, 0, w, h);
      minimapCtx.fillStyle = "rgba(74, 222, 128, 0.25)";
      minimapCtx.strokeStyle = "rgba(74, 222, 128, 0.75)";
      minimapCtx.lineWidth = 1;
      minimapCtx.fillRect(b.minX * s, b.minY * s, (b.maxX - b.minX) * s, (b.maxY - b.minY) * s);
      minimapCtx.strokeRect(b.minX * s, b.minY * s, (b.maxX - b.minX) * s, (b.maxY - b.minY) * s);
    }

    // Location dots
    for (const loc of state.locations) {
      if (state.landSpread > 1.001 && loc.region !== 1) continue;
      const p = projectPoint(loc.x, loc.y);
      minimapCtx.fillStyle = loc.isPortal ? "#f87171" : "#fae2aa";
      minimapCtx.beginPath();
      minimapCtx.arc(p.x * s, p.y * s, loc.id === "loc_01_overgrown_garden_sanctuary" ? 3.5 : 2.2, 0, Math.PI * 2);
      minimapCtx.fill();
    }

    // Player dot
    minimapCtx.fillStyle = "#4ade80";
    minimapCtx.beginPath();
    minimapCtx.arc(state.playerX * s, state.playerY * s, 3.2, 0, Math.PI * 2);
    minimapCtx.fill();

    // Live camera viewport rectangle
    minimapCtx.strokeStyle = "#ffffff";
    minimapCtx.lineWidth = 1.5;
    minimapCtx.strokeRect((camX - viewW / 2) * s, (camY - viewH / 2) * s, viewW * s, viewH * s);
  }

  function loop(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - state.lastTick) / 1000));
    state.lastTick = now;

    stepSimulation(dt);
    renderMainCanvas();
    renderLoupe();
    renderMinimap();
    requestAnimationFrame(loop);
  }

  // Event Listeners
  document.querySelectorAll(".preset-card").forEach((btn) => {
    btn.addEventListener("click", () => applyPreset(btn.dataset.preset));
  });

  document.querySelectorAll(".scr-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.screenMode = btn.dataset.screen;
      document.querySelectorAll(".scr-btn").forEach((b) => b.classList.toggle("active", b === btn));
      viewportFrame.classList.toggle("deck", state.screenMode === "deck");
      updateReadouts();
    });
  });

  document.querySelectorAll(".bp-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".bp-tab").forEach((b) => b.classList.toggle("active", b === btn));
      bpBody.innerHTML = BLUEPRINT_HTML[btn.dataset.tab] || BLUEPRINT_HTML.rec;
    });
  });

  rngZoom.addEventListener("input", () => {
    state.zoom = parseFloat(rngZoom.value);
    updateReadouts();
  });
  rngSpread.addEventListener("input", () => {
    const oldSpawn = projectPoint(BASE_SPAWN.x, BASE_SPAWN.y);
    const dx = state.playerX - oldSpawn.x;
    const dy = state.playerY - oldSpawn.y;
    const oldSpread = state.landSpread;
    state.landSpread = parseFloat(rngSpread.value);
    const newSpawn = projectPoint(BASE_SPAWN.x, BASE_SPAWN.y);
    const ratio = state.landSpread / oldSpread;
    state.playerX = newSpawn.x + dx * ratio;
    state.playerY = newSpawn.y + dy * ratio;
    state.clickTarget = null;
    updateReadouts();
  });
  rngToken.addEventListener("input", () => {
    state.tokenSize = parseFloat(rngToken.value);
    updateReadouts();
  });
  rngMarker.addEventListener("input", () => {
    state.markerSize = parseFloat(rngMarker.value);
    updateReadouts();
  });
  rngSpeed.addEventListener("input", () => {
    state.speed = parseFloat(rngSpeed.value);
    updateReadouts();
  });

  chkShowMinimap.addEventListener("change", () => {
    minimapBox.style.display = chkShowMinimap.checked ? "block" : "none";
  });
  chkShowLoupe.addEventListener("change", () => {
    loupeBox.style.display = chkShowLoupe.checked ? "block" : "none";
  });

  btnAutoWalk.addEventListener("click", () => {
    if (state.autoWalkActive) stopAutoWalk();
    else startAutoWalkToZone2();
  });
  btnResetHighcrown.addEventListener("click", resetToHighcrown);
  btnJumpOakhaven.addEventListener("click", jumpNearOakhaven);

  simCanvas.addEventListener("click", (ev) => {
    const rect = simCanvas.getBoundingClientRect();
    const dims = getScreenDims();
    const sx = ((ev.clientX - rect.left) / rect.width) * dims.w;
    const sy = ((ev.clientY - rect.top) / rect.height) * dims.h;
    const viewW = dims.w / state.zoom;
    const viewH = dims.h / state.zoom;
    const span = getSimMapSpan();
    const camX = Math.max(viewW / 2, Math.min(span - viewW / 2, state.playerX));
    const camY = Math.max(viewH / 2, Math.min(span - viewH / 2, state.playerY));
    stopAutoWalk();
    state.clickTarget = {
      x: camX - viewW / 2 + sx / state.zoom,
      y: camY - viewH / 2 + sy / state.zoom
    };
  });

  window.addEventListener("keydown", (ev) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(ev.code)) {
      ev.preventDefault();
    }
    if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(ev.code)) {
      stopAutoWalk();
      state.clickTarget = null;
      state.keys.add(ev.code);
    }
  });
  window.addEventListener("keyup", (ev) => {
    state.keys.delete(ev.code);
  });

  // Boot & Load Shared Data
  async function init() {
    bpBody.innerHTML = BLUEPRINT_HTML.rec;

    const [locRes, paintRes, valen] = await Promise.all([
      fetch("/assets/data/world-locations.json").then((r) => r.json()).catch(() => null),
      fetch("/assets/data/world-paint.json").then((r) => r.json()).catch(() => null),
      loadImage("/assets/tokens/heroes/valen_hp1.webp")
    ]);

    state.valenImg = valen;

    if (locRes && Array.isArray(locRes.locations)) {
      state.locations = locRes.locations.filter(
        (l) => l.mapId === "map_01" && l.category === "permanent" && l.placed && l.x !== null && l.y !== null
      );
      for (const loc of state.locations) {
        if (loc.assetPath) {
          loadImage(`/assets/${loc.assetPath.replace(/^assets\//, "")}`).then((img) => {
            if (img) state.markerImgs.set(loc.id, img);
          });
        }
      }
    }

    if (paintRes && paintRes.maps && paintRes.maps.map_01) {
      state.worldPaint = paintRes;
      const cellCount = paintRes.cols * paintRes.rows;
      const m1 = paintRes.maps.map_01;
      const tCodes = decodeRleGrid(m1.terrainRle, cellCount);
      state.zoneGrid = decodeRleGrid(m1.zoneRle, cellCount);
      const blocked = new Set();
      for (const b of (paintRes.biomesByMap && paintRes.biomesByMap.map_01) || []) {
        state.biomeByCode[b.code] = b;
        if (b.impassable) blocked.add(b.code);
      }
      const imp = new Uint8Array(cellCount);
      for (let i = 0; i < tCodes.length; i++) {
        if (tCodes[i] !== 0 && blocked.has(tCodes[i])) imp[i] = 1;
      }
      state.impassableGrid = imp;
      for (const z of paintRes.levelZones || []) {
        state.zoneByCode[z.code] = z;
      }
    }

    // Preload Crownlands pure-land tiles for fast startup
    for (const r of PATCH_ROWS) {
      for (const c of PATCH_COLS) {
        getTile(c, r);
      }
    }

    applyPreset("current");
    requestAnimationFrame(loop);
  }

  init();
})();
