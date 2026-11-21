(() => {
  const MAP_SIZE = 8192;
  const HEX_R = 16; // Fixed 3px-at-fit-screen hex grid (zero multiple size options)
  const SQRT3 = Math.sqrt(3);
  const HEX_W = SQRT3 * HEX_R;
  const HEX_ROW_H = 1.5 * HEX_R;
  const GRID_COLS = Math.ceil(MAP_SIZE / HEX_W) + 1;
  const GRID_ROWS = Math.ceil(MAP_SIZE / HEX_ROW_H) + 1;
  const CELL_COUNT = GRID_COLS * GRID_ROWS;

  const PAINT_SCALE = 0.5; // 4096x4096 cached offscreen layer per active map
  const PAINT_CANVAS_SIZE = MAP_SIZE * PAINT_SCALE;

  // Shared 1 impassable color + unique Ocean, Inland Water & natural terrain biomes per map
  const IMPASSABLE_BIOME = {
    id: "impassable",
    code: 1,
    name: "Impassable Terrain",
    kind: "impassable",
    impassable: true,
    color: "#E11D48",
    tags: ["impassable", "blocked"],
    note: "Blocked cliffs, steep ridges, or unwalkable obstacles",
  };

  const BIOMES_BY_MAP = {
    map_01: [
      IMPASSABLE_BIOME,
      { id: "m1_crown_sea", code: 2, name: "Crown Sea", kind: "ocean", impassable: true, color: "#0369A1", tags: ["ocean", "water", "coast"], note: "Ocean (Impassable)" },
      { id: "m1_saltmarsh_waterways", code: 3, name: "Saltmarsh Waterways", kind: "inland_water", impassable: true, color: "#06B6D4", tags: ["inland_water", "water", "river", "marsh"], note: "Inland Water (Impassable)" },
      { id: "m1_crownland_meadows", code: 4, name: "Crownland Meadows", kind: "land", impassable: false, color: "#4ADE80", tags: ["meadow", "plains", "farm", "road"], note: "Open green meadows & trails" },
      { id: "m1_oakleaf_groves", code: 5, name: "Oakleaf Groves", kind: "land", impassable: false, color: "#15803D", tags: ["forest", "woods", "grove", "wolf", "hollow"], note: "Oak & broadleaf tree clusters" },
      { id: "m1_sunlit_downs", code: 6, name: "Sunlit Downs", kind: "land", impassable: false, color: "#FACC15", tags: ["hills", "downs", "coast", "shore", "farm", "mill"], note: "Warm golden upland grass & sandy shores" },
      { id: "m1_saltmarsh_wetlands", code: 7, name: "Saltmarsh Wetlands", kind: "land", impassable: false, color: "#84CC16", tags: ["marsh", "bog", "swamp", "wetland", "mire", "reed"], note: "Wetland flats on western islands" },
      { id: "m1_graystone_foothills", code: 8, name: "Graystone Foothills", kind: "land", impassable: false, color: "#94A3B8", tags: ["mountain", "hill", "crag", "slate", "cave", "fort"], note: "Eastern rocky slate hills & ridges" },
      { id: "m1_sandstone_ridges", code: 9, name: "Sandstone Ridges", kind: "land", impassable: false, color: "#D97706", tags: ["mountain", "ridge", "cliff", "bluff", "cave", "fort"], note: "Warm sand-toned western cliff ridges & plateaus" },
      { id: "m1_upland_foothills", code: 10, name: "Upland Foothills", kind: "land", impassable: false, color: "#A855F7", tags: ["foothills", "hills", "knoll", "slope", "ridge", "meadow"], note: "Rolling upland foothills bordering mountain ridges" },
    ],
    map_02: [
      IMPASSABLE_BIOME,
      { id: "m2_thornwall_sea", code: 2, name: "Thornwall Sea", kind: "ocean", impassable: true, color: "#1D4ED8", tags: ["ocean", "water", "coast"], note: "Ocean (Impassable)" },
      { id: "m2_borderland_channel", code: 3, name: "Borderland Channel", kind: "inland_water", impassable: true, color: "#38BDF8", tags: ["inland_water", "water", "river", "channel"], note: "Inland Water (Impassable)" },
      { id: "m2_ochre_grasslands", code: 4, name: "Ochre Grasslands", kind: "land", impassable: false, color: "#EAB308", tags: ["meadow", "plains", "grassland", "border", "farm", "highland", "moor"], note: "Golden-ochre western highland hills" },
      { id: "m2_thornwall_slate_crags", code: 5, name: "Thornwall Slate Crags", kind: "land", impassable: false, color: "#64748B", tags: ["mountain", "slate", "crag", "mine", "quarry", "fort", "gorge", "iron"], note: "Central western gray-slate rock clusters" },
      { id: "m2_weald_clearings", code: 6, name: "Weald Clearings", kind: "land", impassable: false, color: "#A3E635", tags: ["meadow", "clearing", "hamlet", "shrine", "road"], note: "Moss-green eastern forest clearings" },
      { id: "m2_verdant_canopy_woods", code: 7, name: "Verdant Canopy Woods", kind: "land", impassable: false, color: "#16A34A", tags: ["forest", "woods", "timber", "sawyer", "spider", "briar"], note: "Lush eastern woodland belts" },
      { id: "m2_blighted_mire_glade", code: 8, name: "Blighted Mire-Glade", kind: "land", impassable: false, color: "#0F766E", tags: ["blight", "mire", "plague", "rot", "cavern", "shrine", "ooze"], note: "Dark-emerald shadowy hollow in eastern woods" },
      { id: "m2_sandy_cove_beaches", code: 9, name: "Sandy Cove Beaches", kind: "land", impassable: false, color: "#F472B6", tags: ["beach", "coast", "shore", "sand", "cove", "harbor", "port"], note: "Coastal sandy coves & walkable island beaches" },
      { id: "m2_highland_foothills", code: 10, name: "Highland Foothills", kind: "land", impassable: false, color: "#8B5CF6", tags: ["foothills", "hills", "ridge", "slope", "highland", "border"], note: "Rolling foothills bordering slate crags & upland rises" },
      { id: "m2_alpine_foothills", code: 11, name: "Alpine Foothills", kind: "land", impassable: false, color: "#6366F1", tags: ["foothills", "alpine", "hills", "ridge", "slope", "weald", "meadow"], note: "Mossy eastern alpine foothills & rolling Weald slopes" },
    ],
    map_03: [
      IMPASSABLE_BIOME,
      { id: "m3_veridian_sea", code: 2, name: "Veridian Sea", kind: "ocean", impassable: true, color: "#1E40AF", tags: ["ocean", "water", "coast"], note: "Ocean (Impassable)" },
      { id: "m3_oasis_alpine_lakes", code: 3, name: "Oasis & Alpine Lakes", kind: "inland_water", impassable: true, color: "#22D3EE", tags: ["inland_water", "water", "lake", "oasis"], note: "Inland Water (Impassable)" },
      { id: "m3_sun_scorched_dunes", code: 4, name: "Sun-Scorched Dunes", kind: "land", impassable: false, color: "#FB923C", tags: ["desert", "dune", "sand", "caravan", "scorched", "chasm"], note: "Golden southern desert sand dunes" },
      { id: "m3_sandstone_mesas", code: 5, name: "Sandstone Mesas", kind: "land", impassable: false, color: "#B45309", tags: ["mesa", "sandstone", "cavern", "cliff", "citadel", "manor", "desert"], note: "Desert sandstone crags & coastal formations" },
      { id: "m3_palm_oasis_verge", code: 6, name: "Palm Oasis Verge", kind: "land", impassable: false, color: "#34D399", tags: ["oasis", "palm", "spring", "well", "water"], note: "Green palm ring around desert oasis" },
      { id: "m3_ironcrest_alpine_meadow", code: 7, name: "Ironcrest Alpine Meadow", kind: "land", impassable: false, color: "#BEF264", tags: ["alpine", "meadow", "valley", "lake", "village", "weir"], note: "Northern highland valley grass" },
      { id: "m3_highland_oak_woods", code: 8, name: "Highland Oak Woods", kind: "land", impassable: false, color: "#059669", tags: ["oak", "forest", "woods", "broadleaf", "bear", "trail"], note: "Broadleaf oak & deciduous highland woods" },
      { id: "m3_granite_highland_ridge", code: 9, name: "Granite Highland Ridge", kind: "land", impassable: false, color: "#CBD5E1", tags: ["mountain", "granite", "peak", "crag", "forge", "cavern", "dragon", "storm", "spire"], note: "Cool gray northern granite slopes" },
      { id: "m3_evergreen_pine_forest", code: 10, name: "Evergreen Pine Forest", kind: "land", impassable: false, color: "#7C3AED", tags: ["pine", "evergreen", "conifer", "forest", "woods", "wyvern", "trail"], note: "Dark blue-green highland evergreen & pine forests" },
      { id: "m3_ironcrest_foothills", code: 11, name: "Ironcrest Foothills", kind: "land", impassable: false, color: "#EC4899", tags: ["foothills", "hills", "ridge", "slope", "ironcrest", "highland", "valley", "trail"], note: "Rolling highland foothills below Ironcrest's granite peaks" },
      { id: "m3_veridian_coast_beaches", code: 12, name: "Veridian Coast Beaches", kind: "land", impassable: false, color: "#FDE047", tags: ["beach", "coast", "shore", "sand", "cove", "harbor", "port"], note: "Walkable sandy beaches & coastal coves bordering Veridian Sea" },
    ],
    map_04: [
      IMPASSABLE_BIOME,
      { id: "m4_frostbound_ocean", code: 2, name: "Frostbound Ocean", kind: "ocean", impassable: true, color: "#0F172A", tags: ["ocean", "water", "coast", "fjord", "port", "ice"], note: "Ocean (Impassable)" },
      { id: "m4_frozen_glacial_lakes", code: 3, name: "Frozen Glacial Lakes", kind: "land", impassable: false, color: "#7DD3FC", tags: ["frozen_lake", "ice", "lake", "frozen", "frost", "glacial"], note: "Solid frozen glacial lake ice (Traversable on foot)" },
      { id: "m4_glacial_snowfields", code: 4, name: "Glacial Snowfields", kind: "land", impassable: false, color: "#F8FAFC", tags: ["snow", "glacier", "ice", "frost", "rime", "abyss", "bleak", "frozen"], note: "Snowy plains & glacial ridges" },
      { id: "m4_frostpine_taiga", code: 5, name: "Frostpine Taiga", kind: "land", impassable: false, color: "#2DD4BF", tags: ["taiga", "pine", "forest", "woods", "timber", "wolf", "snow"], note: "Snow-dusted northern evergreen clusters" },
      { id: "m4_ashen_border_scree", code: 6, name: "Ashen Border Scree", kind: "land", impassable: false, color: "#A1A1AA", tags: ["scree", "border", "camp", "cinder", "ridge", "mountain"], note: "Rocky transitional snow-to-ash spine" },
      { id: "m4_charred_ash_plains", code: 7, name: "Charred Ash Plains", kind: "land", impassable: false, color: "#78350F", tags: ["ash", "wasteland", "dreadwaste", "coliseum", "trench", "siege", "vale"], note: "Flat dark volcanic ash plains" },
      { id: "m4_dreadwaste_basalt_crags", code: 8, name: "Dreadwaste Basalt Crags", kind: "land", impassable: false, color: "#A855F7", tags: ["basalt", "volcanic", "keep", "eclipse", "crypt", "reliquary", "scorch", "obsidian"], note: "Dark volcanic basalt ridges & Black Keep plateau" },
      { id: "m4_frostbound_foothills", code: 9, name: "Frostbound Foothills", kind: "land", impassable: false, color: "#3B82F6", tags: ["snow", "glacier", "foothills", "hills", "frost", "ridge", "frozen", "slope"], note: "Snowy icy foothills below the Frostbound Reach glaciers" },
      { id: "m4_frost_shore_beaches", code: 10, name: "Frost-Shore Beaches", kind: "land", impassable: false, color: "#FDBA74", tags: ["snow", "frost", "beach", "coast", "shore", "fjord", "cove", "sand"], note: "Walkable frosted sandy shores & snowy coastal beaches" },
      { id: "m4_black_lava_mountain", code: 11, name: "Black Lava Mountain", kind: "land", impassable: false, color: "#F97316", tags: ["lava", "volcanic", "obsidian", "basalt", "mountain", "peak", "crag", "ash", "dreadwaste"], note: "Small volcanic black lava-rock mountain & dark igneous peaks" },
    ],
  };

  // 20 Level Zones in exact 5-level increments divided 5 per map (high-contrast per map)
  const ZONE_COLORS = [
    // Map 1 (Lv 1–25)
    "#4ADE80", "#22D3EE", "#FACC15", "#FB923C", "#F43F5E",
    // Map 2 (Lv 26–50)
    "#86EFAC", "#38BDF8", "#A78BFA", "#F59E0B", "#EF4444",
    // Map 3 (Lv 51–75)
    "#2DD4BF", "#60A5FA", "#E879F9", "#FB7185", "#EA580C",
    // Map 4 (Lv 76–99)
    "#A3E635", "#06B6D4", "#818CF8", "#D946EF", "#FDE047",
  ];
  const LEVEL_ZONES = ZONE_COLORS.map((color, idx) => {
    const min = idx * 5 + 1;
    const max = Math.min(99, (idx + 1) * 5);
    const mapId = idx < 5 ? "map_01" : idx < 10 ? "map_02" : idx < 15 ? "map_03" : "map_04";
    return {
      code: idx + 1,
      mapId,
      id: `zone_${min}_${max}`,
      name: `Lv ${min}–${max}`,
      min,
      max,
      color,
    };
  });

  const ZONES_BY_MAP = {
    map_01: LEVEL_ZONES.slice(0, 5),
    map_02: LEVEL_ZONES.slice(5, 10),
    map_03: LEVEL_ZONES.slice(10, 15),
    map_04: LEVEL_ZONES.slice(15, 20),
  };

  // State
  const mapBuffers = new Map(); // mapId -> { terrain: Uint8Array, zone: Uint8Array }
  const hiddenTerrain = new Set(); // biome codes
  const hiddenZones = new Set(); // zone codes

  const terrainCanvas = document.createElement("canvas");
  terrainCanvas.width = PAINT_CANVAS_SIZE;
  terrainCanvas.height = PAINT_CANVAS_SIZE;
  const terrainCtx = terrainCanvas.getContext("2d");

  const zoneCanvas = document.createElement("canvas");
  zoneCanvas.width = PAINT_CANVAS_SIZE;
  zoneCanvas.height = PAINT_CANVAS_SIZE;
  const zoneCtx = zoneCanvas.getContext("2d");

  let gridPattern = null;
  let currentMapId = "map_01";

  function ensureMapBuffer(mapId) {
    if (!mapBuffers.has(mapId)) {
      mapBuffers.set(mapId, {
        terrain: new Uint8Array(CELL_COUNT),
        zone: new Uint8Array(CELL_COUNT),
      });
    }
    return mapBuffers.get(mapId);
  }

  // Hex Coordinate Helpers (odd-r pointy top)
  function hexToWorld(col, row) {
    return {
      x: col * HEX_W + (row & 1 ? HEX_W * 0.5 : 0),
      y: row * HEX_ROW_H,
    };
  }

  function pixelToHex(wx, wy) {
    const q = ((SQRT3 / 3) * wx - (1 / 3) * wy) / HEX_R;
    const r = ((2 / 3) * wy) / HEX_R;
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
    return { col, row };
  }

  function offsetToCube(col, row) {
    const q = col - ((row - (row & 1)) >> 1);
    const r = row;
    return { q, r, s: -q - r };
  }

  function cubeToOffset(q, r) {
    return { col: q + ((r - (r & 1)) >> 1), row: r };
  }

  function inBounds(col, row) {
    return col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS;
  }

  function idxOf(col, row) {
    return row * GRID_COLS + col;
  }

  function getNeighbors(col, row) {
    const parity = row & 1;
    const dirs = parity
      ? [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]]
      : [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]];
    const out = [];
    for (let i = 0; i < 6; i++) {
      const nc = col + dirs[i][0];
      const nr = row + dirs[i][1];
      if (inBounds(nc, nr)) out.push([nc, nr]);
    }
    return out;
  }

  function traceHexPath(targetCtx, cx, cy, r) {
    targetCtx.moveTo(cx, cy - r);
    for (let i = 1; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      targetCtx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
    }
    targetCtx.closePath();
  }

  function getBiomeMap(mapId) {
    const list = BIOMES_BY_MAP[mapId] || BIOMES_BY_MAP.map_01;
    const m = new Map();
    for (const b of list) m.set(b.code, b);
    return m;
  }

  function getColorForValue(layer, mapId, code) {
    if (!code) return null;
    if (layer === "terrain") {
      if (hiddenTerrain.has(code)) return null;
      const b = getBiomeMap(mapId).get(code);
      return b ? b.color : null;
    }
    if (hiddenZones.has(code)) return null;
    const z = LEVEL_ZONES[code - 1];
    return z ? z.color : null;
  }

  function rebuildLayerCanvas(layer, mapId) {
    currentMapId = mapId;
    const buf = ensureMapBuffer(mapId);
    const arr = layer === "terrain" ? buf.terrain : buf.zone;
    const tCtx = layer === "terrain" ? terrainCtx : zoneCtx;
    tCtx.clearRect(0, 0, PAINT_CANVAS_SIZE, PAINT_CANVAS_SIZE);

    const rScaled = HEX_R * PAINT_SCALE + 0.4;
    const byColor = new Map();
    for (let row = 0; row < GRID_ROWS; row++) {
      const rowBase = row * GRID_COLS;
      for (let col = 0; col < GRID_COLS; col++) {
        const code = arr[rowBase + col];
        if (!code) continue;
        const color = getColorForValue(layer, mapId, code);
        if (!color) continue;
        let bucket = byColor.get(color);
        if (!bucket) {
          bucket = [];
          byColor.set(color, bucket);
        }
        bucket.push(col, row);
      }
    }

    for (const [color, coords] of byColor.entries()) {
      tCtx.fillStyle = color;
      tCtx.beginPath();
      for (let i = 0; i < coords.length; i += 2) {
        const { x, y } = hexToWorld(coords[i], coords[i + 1]);
        traceHexPath(tCtx, x * PAINT_SCALE, y * PAINT_SCALE, rScaled);
      }
      tCtx.fill();
    }
  }

  function refreshDirtyBox(layer, mapId, minCol, maxCol, minRow, maxRow) {
    const buf = ensureMapBuffer(mapId);
    const arr = layer === "terrain" ? buf.terrain : buf.zone;
    const tCtx = layer === "terrain" ? terrainCtx : zoneCtx;

    const pMinX = Math.max(0, Math.floor((minCol * HEX_W - HEX_W) * PAINT_SCALE));
    const pMinY = Math.max(0, Math.floor((minRow * HEX_ROW_H - HEX_R * 2) * PAINT_SCALE));
    const pMaxX = Math.min(PAINT_CANVAS_SIZE, Math.ceil(((maxCol + 1.5) * HEX_W + HEX_W) * PAINT_SCALE));
    const pMaxY = Math.min(PAINT_CANVAS_SIZE, Math.ceil((maxRow * HEX_ROW_H + HEX_R * 2) * PAINT_SCALE));

    tCtx.save();
    tCtx.beginPath();
    tCtx.rect(pMinX, pMinY, pMaxX - pMinX, pMaxY - pMinY);
    tCtx.clip();
    tCtx.clearRect(pMinX, pMinY, pMaxX - pMinX, pMaxY - pMinY);

    const rScaled = HEX_R * PAINT_SCALE + 0.45;
    const byColor = new Map();
    const rc0 = Math.max(0, Math.floor(pMinX / PAINT_SCALE / HEX_W) - 2);
    const rc1 = Math.min(GRID_COLS - 1, Math.ceil(pMaxX / PAINT_SCALE / HEX_W) + 2);
    const rr0 = Math.max(0, Math.floor(pMinY / PAINT_SCALE / HEX_ROW_H) - 2);
    const rr1 = Math.min(GRID_ROWS - 1, Math.ceil(pMaxY / PAINT_SCALE / HEX_ROW_H) + 2);

    for (let row = rr0; row <= rr1; row++) {
      const rowBase = row * GRID_COLS;
      for (let col = rc0; col <= rc1; col++) {
        const code = arr[rowBase + col];
        if (!code) continue;
        const color = getColorForValue(layer, mapId, code);
        if (!color) continue;
        let bucket = byColor.get(color);
        if (!bucket) {
          bucket = [];
          byColor.set(color, bucket);
        }
        bucket.push(col, row);
      }
    }

    for (const [color, coords] of byColor.entries()) {
      tCtx.fillStyle = color;
      tCtx.beginPath();
      for (let i = 0; i < coords.length; i += 2) {
        const { x, y } = hexToWorld(coords[i], coords[i + 1]);
        traceHexPath(tCtx, x * PAINT_SCALE, y * PAINT_SCALE, rScaled);
      }
      tCtx.fill();
    }
    tCtx.restore();
  }

  function paintBrushAt(layer, mapId, wx, wy, value, radiusHexes) {
    const center = pixelToHex(wx, wy);
    const { q: cq, r: cr, s: cs } = offsetToCube(center.col, center.row);
    const N = Math.max(0, Math.round(radiusHexes) - 1);
    const arr = layer === "terrain" ? ensureMapBuffer(mapId).terrain : ensureMapBuffer(mapId).zone;

    let minC = GRID_COLS, maxC = -1, minR = GRID_ROWS, maxR = -1;
    let changed = false;
    for (let dq = -N; dq <= N; dq++) {
      const rMin = Math.max(-N, -dq - N);
      const rMax = Math.min(N, -dq + N);
      for (let dr = rMin; dr <= rMax; dr++) {
        const { col, row } = cubeToOffset(cq + dq, cr + dr);
        if (!inBounds(col, row)) continue;
        const idx = idxOf(col, row);
        if (arr[idx] !== value) {
          arr[idx] = value;
          changed = true;
          if (col < minC) minC = col;
          if (col > maxC) maxC = col;
          if (row < minR) minR = row;
          if (row > maxR) maxR = row;
        }
      }
    }
    if (changed && mapId === currentMapId) {
      refreshDirtyBox(layer, mapId, minC, maxC, minR, maxR);
    }
    return changed;
  }

  function paintBrushLine(layer, mapId, x0, y0, x1, y1, value, radiusHexes) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    const step = HEX_R * 0.5;
    const steps = Math.max(1, Math.ceil(dist / step));
    let anyChanged = false;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      if (paintBrushAt(layer, mapId, x0 + dx * t, y0 + dy * t, value, radiusHexes)) {
        anyChanged = true;
      }
    }
    return anyChanged;
  }

  function bucketFillAt(layer, mapId, wx, wy, value) {
    const start = pixelToHex(wx, wy);
    if (!inBounds(start.col, start.row)) return false;
    const arr = layer === "terrain" ? ensureMapBuffer(mapId).terrain : ensureMapBuffer(mapId).zone;
    const startIdx = idxOf(start.col, start.row);
    const targetVal = arr[startIdx];
    if (targetVal === value) return false;

    const queue = new Int32Array(CELL_COUNT);
    let head = 0;
    let tail = 0;
    arr[startIdx] = value;
    queue[tail++] = startIdx;

    while (head < tail) {
      const curIdx = queue[head++];
      const row = (curIdx / GRID_COLS) | 0;
      const col = curIdx - row * GRID_COLS;
      const nbrs = getNeighbors(col, row);
      for (let i = 0; i < nbrs.length; i++) {
        const nIdx = idxOf(nbrs[i][0], nbrs[i][1]);
        if (arr[nIdx] === targetVal) {
          arr[nIdx] = value;
          queue[tail++] = nIdx;
        }
      }
    }
    if (mapId === currentMapId) rebuildLayerCanvas(layer, mapId);
    return true;
  }

  function clearLayer(layer, mapId) {
    const buf = ensureMapBuffer(mapId);
    if (layer === "terrain") buf.terrain.fill(0);
    else buf.zone.fill(0);
    if (mapId === currentMapId) rebuildLayerCanvas(layer, mapId);
  }

  function setMap(mapId) {
    currentMapId = mapId;
    rebuildLayerCanvas("terrain", mapId);
    rebuildLayerCanvas("zone", mapId);
  }

  // Build crisp sub-pixel seamless hex pattern for zoomed-out grid preview
  function ensureGridPattern() {
    if (gridPattern) return gridPattern;
    const patW = 128;
    const patH = Math.round(128 * ((3 * HEX_R) / HEX_W));
    const pCanvas = document.createElement("canvas");
    pCanvas.width = patW;
    pCanvas.height = patH;
    const pCtx = pCanvas.getContext("2d");

    const sx = patW / HEX_W;
    const sy = patH / (3 * HEX_R);
    pCtx.strokeStyle = "rgba(255, 255, 255, 0.28)";
    pCtx.lineWidth = 1.1;
    pCtx.beginPath();

    const centers = [
      [0, 0], [HEX_W, 0],
      [HEX_W * 0.5, HEX_ROW_H], [-HEX_W * 0.5, HEX_ROW_H], [HEX_W * 1.5, HEX_ROW_H],
      [0, 3 * HEX_R], [HEX_W, 3 * HEX_R],
    ];
    for (const [cx, cy] of centers) {
      pCtx.moveTo(cx * sx, (cy - HEX_R) * sy);
      for (let i = 1; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        pCtx.lineTo((cx + HEX_R * Math.cos(angle)) * sx, (cy + HEX_R * Math.sin(angle)) * sy);
      }
      pCtx.closePath();
    }
    pCtx.stroke();

    const pat = pCtx.createPattern(pCanvas, "repeat");
    if (pat && typeof pat.setTransform === "function") {
      pat.setTransform(new DOMMatrix().scale(HEX_W / patW, (3 * HEX_R) / patH));
    }
    gridPattern = pat;
    return gridPattern;
  }

  function drawPaintedLayers(ctx, showTerrain, showZones, opacity) {
    ctx.save();
    ctx.globalAlpha = opacity;
    if (showTerrain) {
      ctx.drawImage(terrainCanvas, 0, 0, MAP_SIZE, MAP_SIZE);
    }
    if (showZones) {
      ctx.drawImage(zoneCanvas, 0, 0, MAP_SIZE, MAP_SIZE);
    }
    ctx.restore();
  }

  function drawHexGrid(ctx, camX, camY, zoom, viewW, viewH) {
    const halfW = viewW / 2 / zoom;
    const halfH = viewH / 2 / zoom;
    const x0 = Math.max(0, camX - halfW);
    const y0 = Math.max(0, camY - halfH);
    const x1 = Math.min(MAP_SIZE, camX + halfW);
    const y1 = Math.min(MAP_SIZE, camY + halfH);

    // Zoomed-in exact viewport hex wireframe vs zoomed-out pattern
    if (zoom * HEX_W >= 6.5) {
      const minC = Math.max(0, Math.floor(x0 / HEX_W) - 1);
      const maxC = Math.min(GRID_COLS - 1, Math.ceil(x1 / HEX_W) + 1);
      const minR = Math.max(0, Math.floor(y0 / HEX_ROW_H) - 1);
      const maxR = Math.min(GRID_ROWS - 1, Math.ceil(y1 / HEX_ROW_H) + 1);

      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.24)";
      ctx.lineWidth = Math.max(1, 1 / zoom);
      ctx.beginPath();
      for (let row = minR; row <= maxR; row++) {
        for (let col = minC; col <= maxC; col++) {
          const { x, y } = hexToWorld(col, row);
          traceHexPath(ctx, x, y, HEX_R);
        }
      }
      ctx.stroke();
      ctx.restore();
    } else {
      const pat = ensureGridPattern();
      if (!pat) return;
      ctx.save();
      ctx.fillStyle = pat;
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      ctx.restore();
    }
  }

  function drawBrushPreview(ctx, wx, wy, radiusHexes, color, zoom, isEraser) {
    if (wx < 0 || wx > MAP_SIZE || wy < 0 || wy > MAP_SIZE) return;
    const center = pixelToHex(wx, wy);
    const { q: cq, r: cr } = offsetToCube(center.col, center.row);
    const N = Math.max(0, Math.round(radiusHexes) - 1);

    ctx.save();
    ctx.strokeStyle = isEraser ? "#ff7a7a" : color || "#ffffff";
    ctx.lineWidth = Math.max(1.5, 2 / zoom);
    ctx.beginPath();
    for (let dq = -N; dq <= N; dq++) {
      const rMin = Math.max(-N, -dq - N);
      const rMax = Math.min(N, -dq + N);
      for (let dr = rMin; dr <= rMax; dr++) {
        const { col, row } = cubeToOffset(cq + dq, cr + dr);
        if (!inBounds(col, row)) continue;
        // Draw outer rim or all cells if small brush
        const dist = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(-dq - dr));
        if (N <= 2 || dist === N) {
          const { x, y } = hexToWorld(col, row);
          traceHexPath(ctx, x, y, HEX_R);
        }
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  // Run-Length Encoding (RLE) for compact JSON save/load
  function encodeRle(arr) {
    const out = [];
    if (!arr.length) return out;
    let prev = arr[0];
    let count = 1;
    for (let i = 1; i < arr.length; i++) {
      const v = arr[i];
      if (v === prev) {
        count++;
      } else {
        out.push(prev, count);
        prev = v;
        count = 1;
      }
    }
    out.push(prev, count);
    return out;
  }

  function decodeRle(rle, target) {
    target.fill(0);
    if (!Array.isArray(rle)) return;
    let pos = 0;
    for (let i = 0; i + 1 < rle.length; i += 2) {
      const val = rle[i] | 0;
      const count = rle[i + 1] | 0;
      const end = Math.min(CELL_COUNT, pos + count);
      if (val !== 0) target.fill(val, pos, end);
      pos = end;
      if (pos >= CELL_COUNT) break;
    }
  }

  function snapshotLayer(layer, mapId) {
    const buf = ensureMapBuffer(mapId);
    const arr = layer === "terrain" ? buf.terrain : buf.zone;
    return encodeRle(arr);
  }

  function restoreLayer(layer, mapId, rle) {
    const buf = ensureMapBuffer(mapId);
    const arr = layer === "terrain" ? buf.terrain : buf.zone;
    decodeRle(rle, arr);
    if (mapId === currentMapId) {
      rebuildLayerCanvas(layer, mapId);
    }
  }

  function exportPayload() {
    const maps = {};
    for (const mapId of Object.keys(BIOMES_BY_MAP)) {
      const buf = ensureMapBuffer(mapId);
      maps[mapId] = {
        terrainRle: encodeRle(buf.terrain),
        zoneRle: encodeRle(buf.zone),
      };
    }
    return {
      version: 1,
      hexRadius: HEX_R,
      cols: GRID_COLS,
      rows: GRID_ROWS,
      biomesByMap: BIOMES_BY_MAP,
      levelZones: LEVEL_ZONES,
      maps,
    };
  }

  function loadPayload(payload) {
    if (!payload || !payload.maps) return;
    for (const [mapId, m] of Object.entries(payload.maps)) {
      const buf = ensureMapBuffer(mapId);
      decodeRle(m.terrainRle, buf.terrain);
      decodeRle(m.zoneRle, buf.zone);
    }
    rebuildLayerCanvas("terrain", currentMapId);
    rebuildLayerCanvas("zone", currentMapId);
  }

  function getHoverInfo(mapId, wx, wy) {
    const { col, row } = pixelToHex(wx, wy);
    if (!inBounds(col, row)) return null;
    const buf = ensureMapBuffer(mapId);
    const idx = idxOf(col, row);
    const tCode = buf.terrain[idx];
    const zCode = buf.zone[idx];
    const biome = tCode ? getBiomeMap(mapId).get(tCode) : null;
    const zone = zCode ? LEVEL_ZONES[zCode - 1] : null;
    return { col, row, biome, zone };
  }

  // =========================================================================
  // PROCEDURAL LOCATION PLACEMENT ENGINE (Locations Only — Not Quest Markers)
  // =========================================================================

  const MAP_LOCATION_ALLOWED_TERRAIN_IDS = {
    map_01: new Set(["m1_upland_foothills", "m1_saltmarsh_wetlands", "m1_crownland_meadows"]),
  };

  // Coastal locations anchored directly beside Sunlit Downs (without spawning ON Sunlit Downs)
  const NEAR_SUNLIT_DOWNS_IDS = new Set([
    "hub_brinecliff_watch_fort",
    "loc_06_saltwind_harbor",
    "outpost_z04_brinefen",
    "hub_tidewater_keep",
  ]);

  function parseLevelRange(lvlStr, regionNum) {
    if (lvlStr) {
      const m = String(lvlStr).match(/Lv\s*(\d+)(?:\s*[–-]\s*(\d+))?/i);
      if (m) {
        const minL = Number(m[1]);
        const maxL = m[2] ? Number(m[2]) : minL;
        return [minL, maxL];
      }
      const cleaned = String(lvlStr).replace(/Zone\s*\d+/gi, "");
      const nums = cleaned.match(/\d+/g);
      if (nums && nums.length >= 2) {
        return [Number(nums[0]), Number(nums[1])];
      }
      if (nums && nums.length === 1) {
        const n = Number(nums[0]);
        return [n, Math.min(99, n + 3)];
      }
    }
    const r = Number(regionNum) || 1;
    const rMin = (r - 1) * 12 + 1;
    return [rMin, Math.min(99, rMin + 11)];
  }

  function analyzeLocationRules(loc) {
    const text = `${loc.name || ""} ${loc.kind || ""} ${loc.description || ""}`.toLowerCase();
    const coastal = /\b(port|harbor|harbour|ship|shipwreck|wreck|dock|pier|quay|lighthouse|coast|coastal|cove|fjord|tidewater|tide|sandbar|shoal|breakwater|sea|shoreline|beach|brine)\b/.test(text);
    const inlandWater = /\b(oasis|lakeside|lake|weir|marsh|bog|fen|wetland|swamp|wellhead|peat|reeds)\b/.test(text);
    const forest = /\b(forest|woods|woodland|grove|timber|sawyer|spider|treant|oak|pine|taiga|canopy|briar|wolf|copse|thicket|glade|howl|trapper|brushwood|orchard)\b/.test(text);
    const blight = /\b(blight|plague|mire|rot|spore|fungus|ooze|pudding|shrieker)\b/.test(text);
    const desert = /\b(desert|dune|sand|sandstone|sunstone|slaver|glasswind|scorched|brass|mirage|canyon)\b/.test(text);
    const mountain = /\b(mountain|crag|ridge|highland|granite|slate|forge|anvil|mine|quarry|cavern|cave|tunnel|cliff|spire|roc|wyvern|dragon|smelt|den)\b/.test(text);
    const snow = /\b(snow|frost|rime|glacier|glacial|ice|winter|cold|tundra|frozen|iceberg)\b/.test(text);
    const ash = /\b(ashen|ashvale|cinder|scorch|volcanic|basalt|obsidian|dreadwaste|eclipse|garrick|coliseum|reliquary)\b/.test(text);
    const meadow = /\b(meadow|farm|barn|grain|shepherd|village|hamlet|pasture|mill|clearing|garden|road|trail|bridge|crossroad)\b/.test(text);

    return { coastal, inlandWater, forest, blight, desert, mountain, snow, ash, meadow };
  }

  function matchesPrimaryBiome(biome, rules, loc) {
    if (!biome || biome.impassable) return false;
    if (Array.isArray(loc?.allowedBiomeIds) && loc.allowedBiomeIds.length > 0) {
      return loc.allowedBiomeIds.includes(biome.id);
    }
    const tags = new Set(biome.tags || []);
    if (rules.blight) return tags.has("blight") || tags.has("mire");
    if (rules.forest) return tags.has("forest") || tags.has("woods") || tags.has("grove") || tags.has("taiga") || tags.has("pine");
    if (rules.mountain) return tags.has("mountain") || tags.has("crag") || tags.has("granite") || tags.has("slate") || tags.has("mesa") || tags.has("foothills") || tags.has("hills") || tags.has("scree");
    if (rules.desert) return tags.has("desert") || tags.has("dune") || tags.has("mesa") || tags.has("sandstone") || tags.has("oasis");
    if (rules.snow) return tags.has("snow") || tags.has("glacier") || tags.has("taiga");
    if (rules.inlandWater) return tags.has("oasis") || tags.has("marsh") || tags.has("wetland") || tags.has("alpine");
    if (rules.meadow) return tags.has("meadow") || tags.has("plains") || tags.has("clearing") || tags.has("grassland") || tags.has("alpine");
    return true;
  }

  function scoreBiomeTags(biome, rules) {
    if (!biome || biome.impassable) return -9999;
    const tags = new Set(biome.tags || []);
    let s = 0;
    if (rules.blight) {
      if (tags.has("blight") || tags.has("mire")) s += 550;
      else if (tags.has("forest") || tags.has("woods")) s += 160;
    }
    if (rules.forest) {
      if (tags.has("forest") || tags.has("woods") || tags.has("taiga") || tags.has("pine")) s += 460;
      else if (tags.has("clearing") || tags.has("meadow")) s += 120;
    }
    if (rules.desert) {
      if (tags.has("desert") || tags.has("dune") || tags.has("mesa") || tags.has("sandstone")) s += 440;
      else if (tags.has("oasis")) s += 260;
    }
    if (rules.inlandWater) {
      if (tags.has("oasis") || tags.has("marsh") || tags.has("wetland") || tags.has("alpine")) s += 420;
    }
    if (rules.snow) {
      if (tags.has("snow") || tags.has("glacier") || tags.has("taiga")) s += 480;
      else if (tags.has("scree")) s += 120;
      else if (tags.has("ash") || tags.has("basalt")) s -= 320;
    }
    if (rules.ash) {
      if (tags.has("ash") || tags.has("basalt") || tags.has("wasteland") || tags.has("dreadwaste")) s += 480;
      else if (tags.has("scree")) s += 220;
      else if (tags.has("snow") || tags.has("glacier")) s -= 320;
    }
    if (rules.mountain) {
      if (tags.has("mountain") || tags.has("crag") || tags.has("granite") || tags.has("slate") || tags.has("mesa")) s += 420;
      else if (tags.has("foothills") || tags.has("hills") || tags.has("scree")) s += 240;
    }
    if (rules.coastal && (tags.has("beach") || tags.has("cove") || tags.has("shore"))) {
      s += 260;
    }
    if (rules.meadow) {
      if (tags.has("meadow") || tags.has("plains") || tags.has("clearing") || tags.has("grassland") || tags.has("alpine")) s += 380;
    }
    return s;
  }

  /**
   * Build walkable hex candidates, coast/blocked/Zone-border BFS distances, and land components for a map.
   */
  function preparePlacementGrid(mapId) {
    const buf = ensureMapBuffer(mapId);
    const biomeMap = getBiomeMap(mapId);

    const walkableIndices = [];
    const oceanDist = new Uint8Array(CELL_COUNT).fill(255);
    const inlandDist = new Uint8Array(CELL_COUNT).fill(255);
    const blockedDist = new Uint8Array(CELL_COUNT).fill(255);
    const downsDist = new Uint8Array(CELL_COUNT).fill(255);
    const zoneBorderDist = new Uint8Array(CELL_COUNT).fill(255);
    const landComp = new Int32Array(CELL_COUNT).fill(-1);

    const qOcean = new Int32Array(CELL_COUNT);
    let qOTail = 0;
    const qInland = new Int32Array(CELL_COUNT);
    let qITail = 0;
    const qBlock = new Int32Array(CELL_COUNT);
    let qBTail = 0;
    const qDowns = new Int32Array(CELL_COUNT);
    let qDTail = 0;
    const qZoneB = new Int32Array(CELL_COUNT);
    let qZBTail = 0;

    let zonePaintedCount = 0;

    for (let i = 0; i < CELL_COUNT; i++) {
      if (buf.zone[i] > 0) zonePaintedCount++;
      const tCode = buf.terrain[i];
      if (!tCode) continue;
      const b = biomeMap.get(tCode);
      if (!b) continue;
      if (b.id === "m1_sunlit_downs") {
        downsDist[i] = 0;
        qDowns[qDTail++] = i;
      }
      if (b.impassable) {
        blockedDist[i] = 0;
        qBlock[qBTail++] = i;
        if (b.kind === "ocean") {
          oceanDist[i] = 0;
          qOcean[qOTail++] = i;
        } else if (b.kind === "inland_water") {
          inlandDist[i] = 0;
          qInland[qITail++] = i;
        }
      } else {
        walkableIndices.push(i);
      }
    }

    if (walkableIndices.length < 40) {
      return {
        ok: false,
        reason: "need_terrain",
        message: "Paint walkable land terrain on this map first (at least 40 hexes) so the generator knows where land, water, and impassable areas are.",
      };
    }

    if (zonePaintedCount > 0) {
      for (let wi = 0; wi < walkableIndices.length; wi++) {
        const i = walkableIndices[wi];
        const z = buf.zone[i];
        if (!z) continue;
        const row = (i / GRID_COLS) | 0;
        const col = i - row * GRID_COLS;
        const nbrs = getNeighbors(col, row);
        for (let k = 0; k < nbrs.length; k++) {
          const ni = idxOf(nbrs[k][0], nbrs[k][1]);
          const nz = buf.zone[ni];
          if (!nz || nz === z) continue;
          const tb = biomeMap.get(buf.terrain[ni]);
          if (tb && !tb.impassable) {
            zoneBorderDist[i] = 1;
            qZoneB[qZBTail++] = i;
            break;
          }
        }
      }
      let zbHead = 0;
      while (zbHead < qZBTail) {
        const cur = qZoneB[zbHead++];
        const d = zoneBorderDist[cur];
        if (d >= 30) continue;
        const curZ = buf.zone[cur];
        const row = (cur / GRID_COLS) | 0;
        const col = cur - row * GRID_COLS;
        const nbrs = getNeighbors(col, row);
        for (let k = 0; k < nbrs.length; k++) {
          const ni = idxOf(nbrs[k][0], nbrs[k][1]);
          if (buf.zone[ni] !== curZ || zoneBorderDist[ni] <= d + 1) continue;
          const tb = biomeMap.get(buf.terrain[ni]);
          if (tb && !tb.impassable) {
            zoneBorderDist[ni] = d + 1;
            qZoneB[qZBTail++] = ni;
          }
        }
      }
    }

    const runDistBfs = (distArr, qArr, tail, maxDist) => {
      let head = 0;
      while (head < tail) {
        const cur = qArr[head++];
        const d = distArr[cur];
        if (d >= maxDist) continue;
        const row = (cur / GRID_COLS) | 0;
        const col = cur - row * GRID_COLS;
        const nbrs = getNeighbors(col, row);
        for (let k = 0; k < nbrs.length; k++) {
          const ni = idxOf(nbrs[k][0], nbrs[k][1]);
          if (distArr[ni] > d + 1) {
            distArr[ni] = d + 1;
            qArr[tail++] = ni;
          }
        }
      }
    };
    runDistBfs(oceanDist, qOcean, qOTail, 18);
    runDistBfs(inlandDist, qInland, qITail, 10);
    runDistBfs(blockedDist, qBlock, qBTail, 6);
    runDistBfs(downsDist, qDowns, qDTail, 30);

    let nextComp = 0;
    const compSizes = [];
    const cQueue = new Int32Array(CELL_COUNT);
    for (let wi = 0; wi < walkableIndices.length; wi++) {
      const start = walkableIndices[wi];
      if (landComp[start] !== -1) continue;
      const cid = nextComp++;
      let ch = 0, ct = 0;
      landComp[start] = cid;
      cQueue[ct++] = start;
      while (ch < ct) {
        const cur = cQueue[ch++];
        const row = (cur / GRID_COLS) | 0;
        const col = cur - row * GRID_COLS;
        const nbrs = getNeighbors(col, row);
        for (let k = 0; k < nbrs.length; k++) {
          const ni = idxOf(nbrs[k][0], nbrs[k][1]);
          const tb = biomeMap.get(buf.terrain[ni]);
          if (tb && !tb.impassable && landComp[ni] === -1) {
            landComp[ni] = cid;
            cQueue[ct++] = ni;
          }
        }
      }
      compSizes[cid] = ct;
    }

    const stride = walkableIndices.length > 6000 ? 2 : 1;
    const candidates = [];
    for (let i = 0; i < walkableIndices.length; i++) {
      const idx = walkableIndices[i];
      if (downsDist[idx] > 3 && i % stride !== 0) continue;
      if (compSizes[landComp[idx]] < 6) continue;
      const row = (idx / GRID_COLS) | 0;
      const col = idx - row * GRID_COLS;
      const pos = hexToWorld(col, row);
      if (pos.x < 180 || pos.x > MAP_SIZE - 180 || pos.y < 180 || pos.y > MAP_SIZE - 180) continue;
      candidates.push({
        idx,
        col,
        row,
        x: Math.round(pos.x),
        y: Math.round(pos.y),
        biome: biomeMap.get(buf.terrain[idx]),
        zoneCode: buf.zone[idx],
        oceanD: oceanDist[idx],
        inlandD: inlandDist[idx],
        blockedD: blockedDist[idx],
        downsD: downsDist[idx],
        zoneBorderD: zoneBorderDist[idx],
        comp: landComp[idx],
      });
    }

    if (candidates.length === 0) {
      return {
        ok: false,
        reason: "need_land_area",
        message: "Not enough contiguous walkable land hexes inside map bounds.",
      };
    }

    return {
      ok: true,
      zonePaintedCount,
      walkableCount: walkableIndices.length,
      buf,
      biomeMap,
      landComp,
      qDTail,
      candidates,
    };
  }

  /**
   * Filter candidate hexes to the location's painted Level Zone (or full pool when unpainted).
   */
  function filterByZoneRules(candidates, loc, zonePaintedCount) {
    if (zonePaintedCount <= 0) return candidates;
    const [lvlMin, lvlMax] = parseLevelRange(loc.levelRange, loc.region);
    if (loc.zoneNum) {
      return candidates.filter((c) => c.zoneCode === loc.zoneNum);
    }
    return candidates.filter((c) => {
      if (c.zoneCode <= 0) return false;
      const z = LEVEL_ZONES[c.zoneCode - 1];
      return z && z.min <= lvlMax && z.max >= lvlMin;
    });
  }

  /**
   * Step down Zone-border clearance tiers ([12, 8, 4, 0]) while keeping enough room to place.
   */
  function selectInteriorTier(spacedPool, zonePaintedCount, wantNearDowns) {
    const interiorTiers = zonePaintedCount > 0 ? [12, 8, 4, 0] : [0];
    for (const minZB of interiorTiers) {
      const tierMatches = spacedPool.filter((entry) => entry.c.zoneBorderD >= minZB);
      if (tierMatches.length === 0) continue;
      if (wantNearDowns && !tierMatches.some((entry) => entry.c.downsD <= 2)) continue;
      return tierMatches;
    }
    return spacedPool;
  }

  function procedurallyPlaceMap(worldData, mapId, options = {}) {
    const keepPlaced = options.keepPlaced !== false;
    const grid = preparePlacementGrid(mapId);
    if (!grid.ok) return grid;

    const { zonePaintedCount, walkableCount, landComp, qDTail, candidates } = grid;

    // Build list of Permanent Locations ONLY belonging to this map (never place quest markers)
    const allowedTerrainSet = MAP_LOCATION_ALLOWED_TERRAIN_IDS[mapId] || null;
    const mapLocs = worldData.locations.filter((l) => l.mapId === mapId && l.category === "permanent");
    const shouldPlace = (loc) => !loc.locked && (!keepPlaced || !loc.placed);

    const permanentTargets = mapLocs
      .filter((l) => shouldPlace(l))
      .sort((a, b) => {
        const pa = NEAR_SUNLIT_DOWNS_IDS.has(a.id) ? 0 : (Array.isArray(a.allowedBiomeIds) && a.allowedBiomeIds.length > 0 ? 1 : 2);
        const pb = NEAR_SUNLIT_DOWNS_IDS.has(b.id) ? 0 : (Array.isArray(b.allowedBiomeIds) && b.allowedBiomeIds.length > 0 ? 1 : 2);
        if (pa !== pb) return pa - pb;
        return (a.progOrder ?? 999) - (b.progOrder ?? 999);
      });

    if (permanentTargets.length === 0) {
      return {
        ok: true,
        placedCount: 0,
        skipped: [],
        zonePaintedCount,
        walkableCount,
        nothingToPlace: true,
      };
    }

    // Filter candidate pool cleanly by map-level allowed terrains if configured
    const locationCandidates = allowedTerrainSet
      ? candidates.filter((c) => c.biome && allowedTerrainSet.has(c.biome.id))
      : candidates;

    if (locationCandidates.length === 0) {
      const biomeMap = getBiomeMap(mapId);
      const allowedNames = allowedTerrainSet
        ? Array.from(allowedTerrainSet)
            .map((id) => BIOMES_BY_MAP[mapId]?.find((b) => b.id === id)?.name || biomeMap.get(id)?.name || id)
            .join(", ")
        : "walkable land";
      return {
        ok: false,
        reason: "need_allowed_terrain",
        message: `No painted hexes match the allowed location terrains for this map (${allowedNames}). Paint those terrain types first.`,
      };
    }

    // Anchor on permanent/travel/locked markers (never let unlocked quest pins block town spots)
    const occupied = worldData.locations
      .filter(
        (l) =>
          l.mapId === mapId &&
          l.placed &&
          (l.locked || (l.category !== "quest_field" && (l.category !== "permanent" || !shouldPlace(l))))
      )
      .map((l) => {
        const h = pixelToHex(l.x, l.y);
        const hIdx = inBounds(h.col, h.row) ? idxOf(h.col, h.row) : -1;
        return {
          loc: l,
          x: l.x,
          y: l.y,
          comp: hIdx >= 0 ? landComp[hIdx] : -1,
        };
      });

    // Helper: pick highest-scoring candidate honoring strict (1) Zone Level and (2) Allowed Terrain rules
    const pickBestFor = (loc, minSpacing) => {
      const [lvlMin, lvlMax] = parseLevelRange(loc.levelRange, loc.region);
      const lvlMid = (lvlMin + lvlMax) * 0.5;
      const rules = analyzeLocationRules(loc);

      let zoneFiltered = filterByZoneRules(locationCandidates, loc, zonePaintedCount);
      if (zoneFiltered.length === 0) return null;
      if (Array.isArray(loc.allowedBiomeIds) && loc.allowedBiomeIds.length > 0) {
        const biomeSubset = zoneFiltered.filter((c) => c.biome && loc.allowedBiomeIds.includes(c.biome.id));
        if (biomeSubset.length > 0) zoneFiltered = biomeSubset;
      }

      // Preferred region landmass if siblings already placed
      let siblingComp = -1;
      let prevHubPos = null;
      if (loc.region) {
        const regPlaced = occupied.filter((o) => o.loc.category === "permanent" && o.loc.region === loc.region && o.comp >= 0);
        if (regPlaced.length > 0) {
          siblingComp = regPlaced[0].comp;
          prevHubPos = regPlaced[regPlaced.length - 1];
        }
      }

      const idealPermDist = 720;
      const maxPlateauDist = 1150;
      const wantNearDowns = NEAR_SUNLIT_DOWNS_IDS.has(loc.id) && qDTail > 0;
      const spacedPool = [];

      for (let i = 0; i < zoneFiltered.length; i++) {
        const c = zoneFiltered[i];
        let tooClose = false;
        let nearestPerm = Infinity;
        let nearestPortal = Infinity;

        for (let j = 0; j < occupied.length; j++) {
          const o = occupied[j];
          const d = Math.hypot(c.x - o.x, c.y - o.y);
          if (d < minSpacing) {
            tooClose = true;
            break;
          }
          if (o.loc.category === "permanent" && d < nearestPerm) nearestPerm = d;
          if (o.loc.isPortal && d < nearestPortal) nearestPortal = d;
        }
        if (tooClose) continue;
        spacedPool.push({ c, nearestPerm, nearestPortal });
      }

      if (spacedPool.length === 0) return null;

      const interiorPool = selectInteriorTier(spacedPool, zonePaintedCount, wantNearDowns);

      let minValidDownsD = Infinity;
      if (wantNearDowns) {
        for (let i = 0; i < interiorPool.length; i++) {
          if (interiorPool[i].c.downsD < minValidDownsD) minValidDownsD = interiorPool[i].c.downsD;
        }
      }

      let best = null;
      let bestScore = -Infinity;

      for (let i = 0; i < interiorPool.length; i++) {
        const { c, nearestPerm, nearestPortal } = interiorPool[i];
        if (wantNearDowns && c.downsD > minValidDownsD + 1) continue;

        let score = 0;

        if (nearestPerm < idealPermDist) {
          score -= (idealPermDist - nearestPerm) * 1.05;
        } else if (nearestPerm < maxPlateauDist) {
          score += ((nearestPerm - idealPermDist) / (maxPlateauDist - idealPermDist)) * 120;
        } else if (nearestPerm < Infinity) {
          score += 120;
        }
        if (loc.isPortal && nearestPortal < 1800) score -= (1800 - nearestPortal) * 0.5;

        if (zonePaintedCount > 0) {
          score += Math.min(20, c.zoneBorderD) * 28;
        }

        if (c.zoneCode > 0 && !loc.zoneNum) {
          const z = LEVEL_ZONES[c.zoneCode - 1];
          const zMid = (z.min + z.max) * 0.5;
          if (lvlMid >= z.min && lvlMid <= z.max) score += 1200;
          else score -= Math.abs(lvlMid - zMid) * 60;
        }

        if (wantNearDowns) {
          score -= c.downsD * 2200;
          if (c.downsD === 1) score += 2000;
          score += Math.max(0, 500 - c.oceanD * 35);
          if (c.oceanD >= 2 && c.blockedD >= 2) score += 160;
        } else if (rules.coastal) {
          if (c.oceanD >= 2 && c.oceanD <= 4) score += 720;
          else if (c.oceanD <= 6) score += 360;
          else if (c.inlandD >= 2 && c.inlandD <= 4) score += 180;
          else score -= 450;
        } else {
          if (c.oceanD >= 2 && c.blockedD >= 2) score += 340;
          else score -= 350;
        }

        score += scoreBiomeTags(c.biome, rules);

        if (siblingComp >= 0) {
          if (c.comp === siblingComp) score += 240;
          if (prevHubPos) {
            const sd = Math.hypot(c.x - prevHubPos.x, c.y - prevHubPos.y);
            if (sd >= 750 && sd <= 2400) score += 140;
          }
        }

        score += (Math.random() - 0.5) * 260;

        if (score > bestScore) {
          bestScore = score;
          best = c;
        }
      }
      return best;
    };

    let placedCount = 0;
    const skipped = [];

    for (const loc of permanentTargets) {
      let pick = pickBestFor(loc, 420);
      if (!pick) pick = pickBestFor(loc, 240);
      if (pick) {
        loc.mapId = mapId;
        loc.placed = true;
        loc.x = pick.x;
        loc.y = pick.y;
        occupied.push({ loc, x: pick.x, y: pick.y, comp: pick.comp });
        placedCount++;
      } else {
        skipped.push(loc.name);
      }
    }

    return {
      ok: true,
      placedCount,
      skipped,
      zonePaintedCount,
      walkableCount,
    };
  }

  /**
   * Procedurally place wilderness Quest markers (placeOnOverworld !== false) tethered to placed parent Hubs.
   */
  /**
   * Flood-fill walkable hexes reachable on foot from a Hub without crossing any higher-level Zone.
   */
  function computeSafeReachableMask(startIdx, maxZoneCode, zonePaintedCount, buf, biomeMap) {
    let seedIdx = -1;
    if (startIdx >= 0) {
      const sb = biomeMap.get(buf.terrain[startIdx]);
      if (sb && !sb.impassable) {
        seedIdx = startIdx;
      } else {
        const sRow = (startIdx / GRID_COLS) | 0;
        const sCol = startIdx - sRow * GRID_COLS;
        for (const [nc, nr] of getNeighbors(sCol, sRow)) {
          const ni = idxOf(nc, nr);
          const nb = biomeMap.get(buf.terrain[ni]);
          if (nb && !nb.impassable) {
            seedIdx = ni;
            break;
          }
        }
      }
    }
    if (seedIdx < 0) return null;

    const visited = new Uint8Array(CELL_COUNT);
    const q = new Int32Array(CELL_COUNT);
    let head = 0;
    let tail = 0;
    visited[seedIdx] = 1;
    q[tail++] = seedIdx;

    while (head < tail) {
      const cur = q[head++];
      const row = (cur / GRID_COLS) | 0;
      const col = cur - row * GRID_COLS;
      const nbrs = getNeighbors(col, row);
      for (let k = 0; k < nbrs.length; k++) {
        const ni = idxOf(nbrs[k][0], nbrs[k][1]);
        if (visited[ni]) continue;
        const tb = biomeMap.get(buf.terrain[ni]);
        if (!tb || tb.impassable) continue;
        if (zonePaintedCount > 0 && maxZoneCode > 0) {
          const nz = buf.zone[ni];
          if (nz > maxZoneCode) continue;
        }
        visited[ni] = 1;
        q[tail++] = ni;
      }
    }
    return visited;
  }

  function procedurallyPlaceQuests(worldData, mapId, options = {}) {
    const keepPlaced = options.keepPlaced !== false;
    const grid = preparePlacementGrid(mapId);
    if (!grid.ok) return grid;

    const { zonePaintedCount, walkableCount, buf, biomeMap, landComp, qDTail, candidates } = grid;
    const byId = new Map(worldData.locations.map((l) => [l.id, l]));
    const safeMaskCache = new Map();

    const shouldPlace = (loc) => !loc.locked && (!keepPlaced || !loc.placed);
    const questTargets = worldData.locations
      .filter((l) => l.mapId === mapId && l.category === "quest_field" && l.placeOnOverworld !== false && shouldPlace(l))
      .sort((a, b) => (a.progOrder ?? 999) - (b.progOrder ?? 999));

    if (questTargets.length === 0) {
      return {
        ok: true,
        placedCount: 0,
        skipped: [],
        missingHubs: [],
        zonePaintedCount,
        walkableCount,
        nothingToPlace: true,
      };
    }

    const occupied = worldData.locations
      .filter((l) => l.mapId === mapId && l.placed && (l.category !== "quest_field" || !shouldPlace(l)))
      .map((l) => {
        const h = pixelToHex(l.x, l.y);
        const hIdx = inBounds(h.col, h.row) ? idxOf(h.col, h.row) : -1;
        return {
          loc: l,
          x: l.x,
          y: l.y,
          comp: hIdx >= 0 ? landComp[hIdx] : -1,
        };
      });

    const getSafeMask = (parent, pIdx, maxZoneCode) => {
      const key = `${parent.id}:${maxZoneCode}`;
      if (!safeMaskCache.has(key)) {
        safeMaskCache.set(key, computeSafeReachableMask(pIdx, maxZoneCode, zonePaintedCount, buf, biomeMap));
      }
      return safeMaskCache.get(key);
    };

    const pickQuestCandidate = (loc, parent, parentComp, targetZoneCode, maxZoneCode, safeMask, sibAngles, opts) => {
      const rules = analyzeLocationRules(loc);

      let pool = candidates;
      if (zonePaintedCount > 0) {
        if (targetZoneCode > 0) {
          pool = opts.strictZone
            ? pool.filter((c) => c.zoneCode === targetZoneCode)
            : pool.filter((c) => c.zoneCode > 0 && c.zoneCode <= targetZoneCode);
        } else {
          const refLoc = parent.levelRange ? { ...loc, levelRange: parent.levelRange } : loc;
          pool = filterByZoneRules(pool, refLoc, zonePaintedCount);
        }
      }
      if (pool.length === 0) return null;

      if (opts.requireSafePath) {
        if (safeMask) {
          const safePool = pool.filter((c) => safeMask[c.idx] === 1);
          if (safePool.length === 0) return null;
          pool = safePool;
        } else if (parentComp >= 0) {
          const sameIsland = pool.filter((c) => c.comp === parentComp);
          if (sameIsland.length > 0) pool = sameIsland;
        }
      }

      if (opts.strictCoastalBiome) {
        const hasExplicitBiome = Array.isArray(loc.allowedBiomeIds) && loc.allowedBiomeIds.length > 0;
        if (hasExplicitBiome) {
          const explicitPool = pool.filter((c) => c.biome && loc.allowedBiomeIds.includes(c.biome.id));
          if (explicitPool.length > 0) pool = explicitPool;
        }
        if (rules.coastal && !(loc.minOceanHexes > 0)) {
          const shore4 = pool.filter((c) => c.oceanD <= 4);
          if (shore4.length > 0) {
            pool = shore4;
          } else {
            const shore7 = pool.filter((c) => c.oceanD <= 7);
            if (shore7.length > 0) pool = shore7;
          }
        } else if (!hasExplicitBiome && (rules.blight || rules.forest || rules.mountain || rules.desert || rules.snow || rules.inlandWater)) {
          const biomePref = pool.filter((c) => matchesPrimaryBiome(c.biome, rules, loc));
          if (biomePref.length >= 4) pool = biomePref;
        }
        const applyMinHexDist = (arr, field, minReq) => {
          if (!(minReq > 0)) return arr;
          const strict = arr.filter((c) => c[field] >= minReq);
          if (strict.length > 0) return strict;
          const mid = arr.filter((c) => c[field] >= Math.max(4, Math.floor(minReq / 2)));
          return mid.length > 0 ? mid : arr;
        };
        pool = applyMinHexDist(pool, "oceanD", loc.minOceanHexes);
        if (qDTail > 0) pool = applyMinHexDist(pool, "downsD", loc.minDownsHexes);
        if (loc.maxDownsHexes > 0 && qDTail > 0) {
          const downsAdj = pool.filter((c) => c.downsD <= loc.maxDownsHexes);
          if (downsAdj.length > 0) {
            pool = downsAdj;
          } else {
            const downsNear = pool.filter((c) => c.downsD <= Math.max(4, loc.maxDownsHexes * 2));
            if (downsNear.length > 0) pool = downsNear;
          }
        }
      }

      const spacedPool = [];
      for (let i = 0; i < pool.length; i++) {
        const c = pool[i];
        let blocked = false;
        let nearestAny = Infinity;

        for (let j = 0; j < occupied.length; j++) {
          const o = occupied[j];
          const d = Math.hypot(c.x - o.x, c.y - o.y);
          const req =
            o.loc.category !== "quest_field"
              ? opts.minPermDist
              : o.loc.pickedUpAtId === loc.pickedUpAtId
                ? opts.minSibDist
                : opts.minOtherQDist;
          if (d < req) {
            blocked = true;
            break;
          }
          if (d < nearestAny) nearestAny = d;
        }
        if (blocked) continue;
        spacedPool.push({ c, nearestAny });
      }

      if (spacedPool.length === 0) return null;
      const wantNearDowns = Boolean(loc.maxDownsHexes > 0 && qDTail > 0);
      const interiorPool = selectInteriorTier(spacedPool, zonePaintedCount, wantNearDowns);

      let best = null;
      let bestScore = -Infinity;

      for (let i = 0; i < interiorPool.length; i++) {
        const { c, nearestAny } = interiorPool[i];
        const dHub = Math.hypot(c.x - parent.x, c.y - parent.y);
        let score = 0;

        // 1. Tight local orbit around parent Hub (sweet spot ~300-860 px, peaking ~560 px)
        if (dHub < 260) score -= (260 - dHub) * 4.5;
        else if (dHub <= 1050) score += 950 - Math.abs(dHub - 560) * 0.6;
        else score -= (dHub - 1050) * 1.35;

        // 2. Compass angular spread around parent Hub so sibling quests radiate instead of clumping
        if (sibAngles.length > 0) {
          const candAng = Math.atan2(c.y - parent.y, c.x - parent.x);
          let minAngDiff = Math.PI;
          for (let s = 0; s < sibAngles.length; s++) {
            const raw = Math.abs(candAng - sibAngles[s]);
            const diff = Math.min(raw, Math.PI * 2 - raw);
            if (diff < minAngDiff) minAngDiff = diff;
          }
          score += minAngDiff * 360;
        }

        // 3. Keep cleanly inside Zone border & matching safe Zone level
        if (zonePaintedCount > 0) score += Math.min(20, c.zoneBorderD) * 24;
        if (c.zoneCode > 0 && maxZoneCode > 0 && c.zoneCode === maxZoneCode) score += 500;

        // 4. Coastal vs interior land clearance + biome affinity
        if (rules.coastal) {
          if (c.oceanD >= 2 && c.oceanD <= 4) score += 780;
          else if (c.oceanD <= 6) score += 360;
          else score -= 360;
        } else {
          if (c.oceanD >= 2 && c.blockedD >= 2) score += 260;
          else score -= 320;
        }

        score += scoreBiomeTags(c.biome, rules);
        if (Array.isArray(loc.allowedBiomeIds) && loc.allowedBiomeIds.includes(c.biome?.id)) score += 2000;
        if (loc.minOceanHexes > 0) score += Math.min(18, c.oceanD) * 45;
        if (loc.minDownsHexes > 0 && qDTail > 0) score += Math.min(20, c.downsD) * 40;
        if (loc.maxDownsHexes > 0 && qDTail > 0) {
          if (c.downsD === 1) score += 1600;
          else if (c.downsD <= loc.maxDownsHexes) score += 900;
          else score -= c.downsD * 280;
        }
        if (parentComp >= 0 && c.comp === parentComp) score += 1600;
        if (nearestAny < Infinity) score += Math.min(240, nearestAny * 0.4);
        score += (Math.random() - 0.5) * 180;

        if (score > bestScore) {
          bestScore = score;
          best = c;
        }
      }
      return best;
    };

    const fallbackLadder = [
      { minPermDist: 260, minSibDist: 260, minOtherQDist: 170, strictZone: true,  requireSafePath: true,  strictCoastalBiome: true },
      { minPermDist: 200, minSibDist: 195, minOtherQDist: 125, strictZone: true,  requireSafePath: true,  strictCoastalBiome: true },
      { minPermDist: 240, minSibDist: 230, minOtherQDist: 150, strictZone: true,  requireSafePath: true,  strictCoastalBiome: false },
      { minPermDist: 185, minSibDist: 180, minOtherQDist: 120, strictZone: true,  requireSafePath: true,  strictCoastalBiome: false },
      { minPermDist: 160, minSibDist: 155, minOtherQDist: 100, strictZone: false, requireSafePath: true,  strictCoastalBiome: false },
      { minPermDist: 150, minSibDist: 140, minOtherQDist: 95,  strictZone: false, requireSafePath: false, strictCoastalBiome: false },
    ];

    let placedCount = 0;
    const skipped = [];
    const missingHubsSet = new Set();

    for (const loc of questTargets) {
      const parent = byId.get(loc.pickedUpAtId);
      if (!parent || !parent.placed || parent.mapId !== mapId) {
        missingHubsSet.add(loc.pickedUpAtName || loc.pickedUpAtId || loc.name);
        continue;
      }
      const ph = pixelToHex(parent.x, parent.y);
      const pIdx = inBounds(ph.col, ph.row) ? idxOf(ph.col, ph.row) : -1;
      const parentComp = pIdx >= 0 ? landComp[pIdx] : -1;
      const targetZoneCode = pIdx >= 0 && zonePaintedCount > 0 ? buf.zone[pIdx] : 0;

      let maxZoneCode = targetZoneCode;
      if (maxZoneCode <= 0) {
        const [pMin, pMax] = parseLevelRange(parent.levelRange || loc.levelRange, parent.region || loc.region);
        for (const z of LEVEL_ZONES) {
          if (z.min <= pMax && z.max >= pMin && z.code > maxZoneCode) {
            maxZoneCode = z.code;
          }
        }
      }

      const safeMask = getSafeMask(parent, pIdx, maxZoneCode);
      const sibAngles = occupied
        .filter((o) => o.loc.category === "quest_field" && o.loc.pickedUpAtId === loc.pickedUpAtId)
        .map((o) => Math.atan2(o.y - parent.y, o.x - parent.x));

      let pick = null;
      for (const opts of fallbackLadder) {
        pick = pickQuestCandidate(loc, parent, parentComp, targetZoneCode, maxZoneCode, safeMask, sibAngles, opts);
        if (pick) break;
      }

      if (pick) {
        loc.mapId = mapId;
        loc.placed = true;
        loc.x = pick.x;
        loc.y = pick.y;
        occupied.push({ loc, x: pick.x, y: pick.y, comp: pick.comp });
        placedCount++;
      } else {
        skipped.push(loc.name);
      }
    }

    return {
      ok: true,
      placedCount,
      skipped,
      missingHubs: Array.from(missingHubsSet),
      zonePaintedCount,
      walkableCount,
    };
  }

  window.RODWorldPaint = {
    HEX_R,
    GRID_COLS,
    GRID_ROWS,
    BIOMES_BY_MAP,
    LEVEL_ZONES,
    ZONES_BY_MAP,
    hiddenTerrain,
    hiddenZones,
    ensureMapBuffer,
    setMap,
    rebuildLayerCanvas,
    paintBrushLine,
    bucketFillAt,
    clearLayer,
    snapshotLayer,
    restoreLayer,
    drawPaintedLayers,
    drawHexGrid,
    drawBrushPreview,
    exportPayload,
    loadPayload,
    getHoverInfo,
    procedurallyPlaceMap,
    procedurallyPlaceQuests,
  };
})();
