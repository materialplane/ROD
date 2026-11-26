/**
 * Client-side odd-r pointy-top hex terrain collision matching `admin/world-paint.js`.
 * Blocks impassable biomes (Ocean, Inland Water, Impassable cliffs) across the
 * full circular radius of the player's party token so no rim pixels touch water.
 */

const SQRT3 = Math.sqrt(3);
const DEFAULT_HEX_R = 16;
const DEFAULT_MAP_SIZE = 8192;

// Precomputed unit-circle sample offsets for zero-trig 60fps circle checks.
// Inner ring catches narrow 1-hex channels; 24 outer perimeter points (~18.6px
// spacing at r=71) are narrower than 1 hex (~27.7px), preventing rim overlap.
const INNER_RING_DIRS: ReadonlyArray<readonly [number, number]> = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI * 2) / 8;
  return [Math.cos(a), Math.sin(a)] as const;
});

const OUTER_RING_DIRS: ReadonlyArray<readonly [number, number]> = Array.from({ length: 24 }, (_, i) => {
  const a = (i * Math.PI * 2) / 24;
  return [Math.cos(a), Math.sin(a)] as const;
});

const SLIDE_MAG_ANGLES_RAD: ReadonlyArray<number> = [
  10, 20, 30, 42, 54, 66, 76, 83, 88,
].map((deg) => (deg * Math.PI) / 180);

const CLEAR_RING_DIRS: ReadonlyArray<readonly [number, number]> = Array.from({ length: 32 }, (_, i) => {
  const a = (i * Math.PI * 2) / 32;
  return [Math.cos(a), Math.sin(a)] as const;
});

const ODD_R_NEIGHBORS_EVEN: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, -1],
  [-1, -1],
  [0, 1],
  [-1, 1],
];

const ODD_R_NEIGHBORS_ODD: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [1, -1],
  [0, -1],
  [1, 1],
  [0, 1],
];

interface RawBiomeEntry {
  id?: string;
  code?: number;
  name?: string;
  kind?: string;
  impassable?: boolean;
}

interface RawLevelZoneEntry {
  code?: number;
  mapId?: string;
  id?: string;
  name?: string;
  min?: number;
  max?: number;
}

interface RawWorldPaintMap {
  terrainRle?: number[];
  zoneRle?: number[];
}

interface RawWorldPaintPayload {
  hexRadius?: number;
  cols?: number;
  rows?: number;
  biomesByMap?: Record<string, RawBiomeEntry[]>;
  levelZones?: RawLevelZoneEntry[];
  maps?: Record<string, RawWorldPaintMap>;
}

export interface WorldBiomeMeta {
  id: string;
  code: number;
  name: string;
  kind: string;
  impassable: boolean;
}

export interface WorldZoneMeta {
  code: number;
  mapId: string;
  id: string;
  name: string;
  min: number;
  max: number;
}

export interface WorldTerritorySample {
  biomeId: string;
  biomeName: string;
  biomeKind: string;
  zoneCode: number;
  zoneId: string;
  zoneName: string;
  regionName: string;
  zoneMin: number;
  zoneMax: number;
  nearWaterKind: "ocean" | "inland_water" | null;
  nearWaterBiomeName: string | null;
}

export function getRegionNameForZone(zoneCode: number): string {
  if (zoneCode <= 3) return "The Crownlands";
  if (zoneCode <= 5) return "Saltmarsh Coast";
  if (zoneCode <= 8) return "Thornwall Warfronts";
  if (zoneCode <= 10) return "The Verdant Weald";
  if (zoneCode <= 13) return "Sun-Scorched Isles";
  if (zoneCode <= 15) return "Ironcrest Highlands";
  if (zoneCode <= 18) return "Frostbound Reach";
  return "The Dreadwaste";
}

export interface WorldCollisionIndex {
  hexRadius: number;
  cols: number;
  rows: number;
  mapSize: number;
  impassableByMap: Record<string, Uint8Array>;
  terrainCodesByMap: Record<string, Uint8Array>;
  zoneCodesByMap: Record<string, Uint8Array>;
  biomeByMapCode: Record<string, Record<number, WorldBiomeMeta>>;
  zoneByCode: Record<number, WorldZoneMeta>;
  clearMaskCache: Map<string, Uint8Array>;
}

const COAST_SAMPLE_DIRS: ReadonlyArray<readonly [number, number]> = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI * 2) / 8;
  return [Math.cos(a), Math.sin(a)] as const;
});

function decodeRleGrid(rle: number[] | undefined, cellCount: number): Uint8Array {
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

function buildImpassableFromCodes(codes: Uint8Array, impassableCodes: Set<number>): Uint8Array {
  const mask = new Uint8Array(codes.length);
  if (impassableCodes.size === 0) return mask;
  for (let i = 0; i < codes.length; i++) {
    if (codes[i] !== 0 && impassableCodes.has(codes[i])) mask[i] = 1;
  }
  return mask;
}

/** Builds fast O(1) per-hex collision, biome, and zone lookups from `world-paint.json`. */
export function buildWorldCollisionIndex(
  payload: unknown,
  mapSize = DEFAULT_MAP_SIZE
): WorldCollisionIndex | null {
  if (!payload || typeof payload !== "object") return null;
  const raw = payload as RawWorldPaintPayload;
  if (!raw.maps || !raw.biomesByMap) return null;

  const hexRadius = typeof raw.hexRadius === "number" && raw.hexRadius > 0 ? raw.hexRadius : DEFAULT_HEX_R;
  const hexW = SQRT3 * hexRadius;
  const hexRowH = 1.5 * hexRadius;
  const cols = typeof raw.cols === "number" && raw.cols > 0 ? raw.cols : Math.ceil(mapSize / hexW) + 1;
  const rows = typeof raw.rows === "number" && raw.rows > 0 ? raw.rows : Math.ceil(mapSize / hexRowH) + 1;
  const cellCount = cols * rows;

  const zoneByCode: Record<number, WorldZoneMeta> = {};
  for (const z of raw.levelZones ?? []) {
    if (typeof z.code === "number" && z.code > 0) {
      zoneByCode[z.code] = {
        code: z.code,
        mapId: z.mapId ?? "map_01",
        id: z.id ?? `zone_${z.code}`,
        name: z.name ?? `Zone ${z.code}`,
        min: z.min ?? 1,
        max: z.max ?? 5,
      };
    }
  }

  const impassableByMap: Record<string, Uint8Array> = {};
  const terrainCodesByMap: Record<string, Uint8Array> = {};
  const zoneCodesByMap: Record<string, Uint8Array> = {};
  const biomeByMapCode: Record<string, Record<number, WorldBiomeMeta>> = {};

  for (const [mapId, mapData] of Object.entries(raw.maps)) {
    const biomes: RawBiomeEntry[] = (raw.biomesByMap as Record<string, RawBiomeEntry[]>)[mapId] ?? [];
    const blockedCodes = new Set<number>();
    const mapBiomes: Record<number, WorldBiomeMeta> = {};
    for (const biome of biomes) {
      if (typeof biome.code === "number" && biome.code !== 0) {
        const code = biome.code | 0;
        mapBiomes[code] = {
          id: biome.id ?? `biome_${code}`,
          code,
          name: biome.name ?? `Biome ${code}`,
          kind: biome.kind ?? "land",
          impassable: Boolean(biome.impassable),
        };
        if (biome.impassable) blockedCodes.add(code);
      }
    }
    biomeByMapCode[mapId] = mapBiomes;
    const tCodes = decodeRleGrid(mapData?.terrainRle, cellCount);
    terrainCodesByMap[mapId] = tCodes;
    zoneCodesByMap[mapId] = decodeRleGrid(mapData?.zoneRle, cellCount);
    impassableByMap[mapId] = buildImpassableFromCodes(tCodes, blockedCodes);
  }

  return {
    hexRadius,
    cols,
    rows,
    mapSize,
    impassableByMap,
    terrainCodesByMap,
    zoneCodesByMap,
    biomeByMapCode,
    zoneByCode,
    clearMaskCache: new Map<string, Uint8Array>(),
  };
}

function worldPointToCellCoords(index: WorldCollisionIndex, wx: number, wy: number): { col: number; row: number; idx: number } | null {
  const hr = index.hexRadius;
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
  if (col < 0 || row < 0 || col >= index.cols || row >= index.rows) return null;
  return { col, row, idx: row * index.cols + col };
}

function worldPointToCellIdx(index: WorldCollisionIndex, wx: number, wy: number): number {
  return worldPointToCellCoords(index, wx, wy)?.idx ?? -1;
}

function cellToWorldPoint(index: WorldCollisionIndex, col: number, row: number): { x: number; y: number } {
  const hr = index.hexRadius;
  return {
    x: hr * SQRT3 * (col + 0.5 * (row & 1)),
    y: hr * 1.5 * row,
  };
}

function isWorldPointImpassable(index: WorldCollisionIndex, mask: Uint8Array, wx: number, wy: number): boolean {
  const idx = worldPointToCellIdx(index, wx, wy);
  return idx < 0 || mask[idx] === 1;
}

/** Samples exact painted biome, danger level zone, and 4-hex shoreline proximity at world coordinates `(wx, wy)`. */
export function sampleWorldTerritory(
  index: WorldCollisionIndex | null,
  mapId: string,
  wx: number,
  wy: number
): WorldTerritorySample | null {
  if (!index) return null;
  const tCodes = index.terrainCodesByMap[mapId];
  const zCodes = index.zoneCodesByMap[mapId];
  const mapBiomes = index.biomeByMapCode[mapId];
  if (!tCodes || !zCodes || !mapBiomes) return null;

  const centerIdx = worldPointToCellIdx(index, wx, wy);
  let tCode = centerIdx >= 0 ? tCodes[centerIdx] : 0;
  let bMeta = mapBiomes[tCode];
  if (!bMeta || bMeta.impassable) {
    // When center touches boundary edge, sample tight ring for nearest walkable land biome
    const r = index.hexRadius * 1.4;
    for (let i = 0; i < COAST_SAMPLE_DIRS.length; i++) {
      const [dx, dy] = COAST_SAMPLE_DIRS[i];
      const probeIdx = worldPointToCellIdx(index, wx + dx * r, wy + dy * r);
      if (probeIdx >= 0) {
        const candidate = mapBiomes[tCodes[probeIdx]];
        if (candidate && !candidate.impassable) {
          tCode = tCodes[probeIdx];
          bMeta = candidate;
          break;
        }
      }
    }
  }

  const zCode = centerIdx >= 0 ? zCodes[centerIdx] : 0;
  let zMeta = index.zoneByCode[zCode];
  if (!zMeta) {
    const fallbackZone = Object.values(index.zoneByCode).find((z) => z.mapId === mapId);
    zMeta = fallbackZone ?? { code: 1, mapId, id: "zone_1_5", name: "Zone 1", min: 1, max: 5 };
  }

  // Check 4-hex ring (~4 * hexRadius * sqrt(3)) for Ocean or Inland Water coastal staging
  let nearWaterKind: "ocean" | "inland_water" | null = null;
  let nearWaterBiomeName: string | null = null;
  const hexStep = index.hexRadius * SQRT3;
  for (let ring = 2; ring <= 4 && !nearWaterKind; ring++) {
    const dist = ring * hexStep;
    for (let i = 0; i < COAST_SAMPLE_DIRS.length; i++) {
      const [dx, dy] = COAST_SAMPLE_DIRS[i];
      const probeIdx = worldPointToCellIdx(index, wx + dx * dist, wy + dy * dist);
      if (probeIdx < 0) continue;
      const nb = mapBiomes[tCodes[probeIdx]];
      if (nb && (nb.kind === "ocean" || nb.kind === "inland_water")) {
        nearWaterKind = nb.kind;
        nearWaterBiomeName = nb.name;
        break;
      }
    }
  }

  return {
    biomeId: bMeta?.id ?? "wilds",
    biomeName: bMeta?.name ?? "Wilderness",
    biomeKind: bMeta?.kind ?? "land",
    zoneCode: zMeta.code,
    zoneId: zMeta.id,
    zoneName: zMeta.name,
    regionName: getRegionNameForZone(zMeta.code),
    zoneMin: zMeta.min,
    zoneMax: zMeta.max,
    nearWaterKind,
    nearWaterBiomeName,
  };
}

/** Returns true when the entire circular token footprint sits cleanly on walkable terrain inside bounds. */
export function isCircleClear(
  index: WorldCollisionIndex | null,
  mapId: string,
  cx: number,
  cy: number,
  radius: number,
  mapWidth = DEFAULT_MAP_SIZE,
  mapHeight = DEFAULT_MAP_SIZE
): boolean {
  if (cx < radius || cy < radius || cx > mapWidth - radius || cy > mapHeight - radius) {
    return false;
  }
  if (!index) return true;
  const mask = index.impassableByMap[mapId];
  if (!mask) return true;

  if (isWorldPointImpassable(index, mask, cx, cy)) return false;

  const innerR = radius * 0.52;
  for (let i = 0; i < INNER_RING_DIRS.length; i++) {
    const [dx, dy] = INNER_RING_DIRS[i];
    if (isWorldPointImpassable(index, mask, cx + dx * innerR, cy + dy * innerR)) return false;
  }

  for (let i = 0; i < OUTER_RING_DIRS.length; i++) {
    const [dx, dy] = OUTER_RING_DIRS[i];
    if (isWorldPointImpassable(index, mask, cx + dx * radius, cy + dy * radius)) return false;
  }

  return true;
}

/** Searches outward in concentric rings for the closest walkable dry point for the full token circle. */
export function findNearestClearPoint(
  index: WorldCollisionIndex | null,
  mapId: string,
  x: number,
  y: number,
  radius: number,
  maxDist = 260,
  mapWidth = DEFAULT_MAP_SIZE,
  mapHeight = DEFAULT_MAP_SIZE
): { x: number; y: number } {
  const cx = Math.max(radius, Math.min(mapWidth - radius, x));
  const cy = Math.max(radius, Math.min(mapHeight - radius, y));
  if (isCircleClear(index, mapId, cx, cy, radius, mapWidth, mapHeight)) {
    return { x: cx, y: cy };
  }
  const step = 8;
  for (let r = step; r <= maxDist; r += step) {
    for (let i = 0; i < CLEAR_RING_DIRS.length; i++) {
      const [dx, dy] = CLEAR_RING_DIRS[i];
      const tx = cx + dx * r;
      const ty = cy + dy * r;
      if (isCircleClear(index, mapId, tx, ty, radius, mapWidth, mapHeight)) {
        return { x: tx, y: ty };
      }
    }
  }
  return { x: cx, y: cy };
}

/** Computes normalized inward boundary repulsion vector away from impassable hexes touching `(cx, cy)`. */
function estimateBoundaryRepulsionNormal(
  index: WorldCollisionIndex | null,
  mapId: string,
  cx: number,
  cy: number,
  radius: number,
  mapWidth: number,
  mapHeight: number
): { nx: number; ny: number } | null {
  let nx = 0;
  let ny = 0;

  if (cx < radius) nx += 1;
  if (cx > mapWidth - radius) nx -= 1;
  if (cy < radius) ny += 1;
  if (cy > mapHeight - radius) ny -= 1;

  if (index) {
    const mask = index.impassableByMap[mapId];
    if (mask) {
      for (let i = 0; i < OUTER_RING_DIRS.length; i++) {
        const [dx, dy] = OUTER_RING_DIRS[i];
        if (isWorldPointImpassable(index, mask, cx + dx * radius, cy + dy * radius)) {
          nx -= dx;
          ny -= dy;
        }
      }
      const innerR = radius * 0.55;
      for (let i = 0; i < INNER_RING_DIRS.length; i++) {
        const [dx, dy] = INNER_RING_DIRS[i];
        if (isWorldPointImpassable(index, mask, cx + dx * innerR, cy + dy * innerR)) {
          nx -= dx * 1.4;
          ny -= dy * 1.4;
        }
      }
    }
  }

  const len = Math.hypot(nx, ny);
  if (len < 1e-4) return null;
  return { nx: nx / len, ny: ny / len };
}

/**
 * Resolves candidate movement `(candX, candY)` against impassable hexes using the full token radius,
 * projecting onto the exact coastline tangent and searching fine angles up to 88deg for butter-smooth sliding.
 */
export function resolveCircleMove(
  index: WorldCollisionIndex | null,
  mapId: string,
  curX: number,
  curY: number,
  candX: number,
  candY: number,
  radius: number,
  mapWidth = DEFAULT_MAP_SIZE,
  mapHeight = DEFAULT_MAP_SIZE
): { x: number; y: number; slid: boolean } {
  const tx = Math.max(radius, Math.min(mapWidth - radius, candX));
  const ty = Math.max(radius, Math.min(mapHeight - radius, candY));

  if (isCircleClear(index, mapId, tx, ty, radius, mapWidth, mapHeight)) {
    return { x: tx, y: ty, slid: false };
  }

  const dx = tx - curX;
  const dy = ty - curY;
  const stepDist = Math.hypot(dx, dy);
  if (stepDist > 1e-4) {
    const ux = dx / stepDist;
    const uy = dy / stepDist;

    // 1. Project movement directly along smoothed shore/cliff normal tangent first
    let sideBias = 1;
    const normal = estimateBoundaryRepulsionNormal(index, mapId, tx, ty, radius, mapWidth, mapHeight);
    if (normal) {
      const nDot = ux * normal.nx + uy * normal.ny;
      if (nDot < 0) {
        const rawTanX = ux - nDot * normal.nx;
        const rawTanY = uy - nDot * normal.ny;
        const tanLen = Math.hypot(rawTanX, rawTanY);
        if (tanLen > 0.06) {
          const tanX = rawTanX / tanLen;
          const tanY = rawTanY / tanLen;
          // Cross product chooses which rotational sweep (+ or -) matches the coastline slope
          sideBias = ux * tanY - uy * tanX >= 0 ? 1 : -1;
          const slideDist = stepDist * Math.max(0.32, tanLen);
          for (const mult of [1, 0.55]) {
            const px = curX + tanX * slideDist * mult;
            const py = curY + tanY * slideDist * mult;
            if (isCircleClear(index, mapId, px, py, radius, mapWidth, mapHeight)) {
              return { x: px, y: py, slid: true };
            }
            // Gentle 1.5px wall separation nudge prevents catching on hex corner teeth
            const gx = px + normal.nx * 1.5;
            const gy = py + normal.ny * 1.5;
            if (isCircleClear(index, mapId, gx, gy, radius, mapWidth, mapHeight)) {
              return { x: gx, y: gy, slid: true };
            }
          }
        }
      }
    }

    // 2. Sweep progressive angles up to +-88deg, testing the tangent-aligned side first
    for (let i = 0; i < SLIDE_MAG_ANGLES_RAD.length; i++) {
      const mag = SLIDE_MAG_ANGLES_RAD[i];
      for (const sgn of [sideBias, -sideBias]) {
        const ang = mag * sgn;
        const cosA = Math.cos(ang);
        const sinA = Math.sin(ang);
        const scale = Math.max(0.28, Math.abs(cosA));
        const rx = ux * cosA - uy * sinA;
        const ry = ux * sinA + uy * cosA;
        const sx = curX + rx * stepDist * scale;
        const sy = curY + ry * stepDist * scale;
        if (isCircleClear(index, mapId, sx, sy, radius, mapWidth, mapHeight)) {
          return { x: sx, y: sy, slid: true };
        }
      }
    }

    // 3. Fallback partial forward / axis checks so token glides right up to shorelines
    for (const frac of [0.5, 0.25]) {
      const hx = curX + dx * frac;
      const hy = curY + dy * frac;
      if (isCircleClear(index, mapId, hx, hy, radius, mapWidth, mapHeight)) {
        return { x: hx, y: hy, slid: true };
      }
    }
    if (Math.abs(dx) > 0.2 && isCircleClear(index, mapId, tx, curY, radius, mapWidth, mapHeight)) {
      return { x: tx, y: curY, slid: true };
    }
    if (Math.abs(dy) > 0.2 && isCircleClear(index, mapId, curX, ty, radius, mapWidth, mapHeight)) {
      return { x: curX, y: ty, slid: true };
    }
  }

  // If current position is already invalid (e.g., legacy save loaded near shore), nudge toward nearest clear spot
  if (!isCircleClear(index, mapId, curX, curY, radius, mapWidth, mapHeight)) {
    const safe = findNearestClearPoint(index, mapId, curX, curY, radius, radius * 2, mapWidth, mapHeight);
    const ndx = safe.x - curX;
    const ndy = safe.y - curY;
    const ndist = Math.hypot(ndx, ndy);
    if (ndist > 1e-3) {
      const move = Math.min(ndist, Math.max(stepDist, 4));
      return {
        x: curX + (ndx / ndist) * move,
        y: curY + (ndy / ndist) * move,
        slid: true,
      };
    }
  }

  return { x: curX, y: curY, slid: true };
}

/** Returns true if a circle of `radius` can move linearly from `(x0, y0)` to `(x1, y1)` without clipping obstacles. */
export function isLineClear(
  index: WorldCollisionIndex | null,
  mapId: string,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  radius: number,
  mapWidth = DEFAULT_MAP_SIZE,
  mapHeight = DEFAULT_MAP_SIZE,
  stepPx = 16
): boolean {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  if (dist < 1e-3) {
    return isCircleClear(index, mapId, x1, y1, radius, mapWidth, mapHeight);
  }
  const steps = Math.max(1, Math.ceil(dist / stepPx));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (!isCircleClear(index, mapId, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, radius, mapWidth, mapHeight)) {
      return false;
    }
  }
  return true;
}

function getOrBuildClearMask(
  index: WorldCollisionIndex,
  mapId: string,
  radius: number,
  mapWidth: number,
  mapHeight: number
): Uint8Array | null {
  const rawMask = index.impassableByMap[mapId];
  if (!rawMask) return null;
  const cacheKey = `${mapId}:${Math.round(radius)}:${mapWidth}x${mapHeight}`;
  const cached = index.clearMaskCache.get(cacheKey);
  if (cached) return cached;

  const total = index.cols * index.rows;
  const clear = new Uint8Array(total);
  for (let row = 0; row < index.rows; row++) {
    for (let col = 0; col < index.cols; col++) {
      const idx = row * index.cols + col;
      if (rawMask[idx] === 1) continue;
      const pt = cellToWorldPoint(index, col, row);
      if (isCircleClear(index, mapId, pt.x, pt.y, radius, mapWidth, mapHeight)) {
        clear[idx] = 1;
      }
    }
  }
  index.clearMaskCache.set(cacheKey, clear);
  return clear;
}

/**
 * Finds a clean, smoothed overland path between walkable coordinates `(startX, startY)` and `(goalX, goalY)`.
 * Returns `null` when the target itself or the path to it is blocked by water, cliffs, or locked terrain.
 */
export function findWorldPath(
  index: WorldCollisionIndex | null,
  mapId: string,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number,
  radius: number,
  mapWidth = DEFAULT_MAP_SIZE,
  mapHeight = DEFAULT_MAP_SIZE
): Array<{ x: number; y: number }> | null {
  if (!isCircleClear(index, mapId, goalX, goalY, radius, mapWidth, mapHeight)) {
    return null;
  }
  if (!index || isLineClear(index, mapId, startX, startY, goalX, goalY, radius, mapWidth, mapHeight)) {
    return [{ x: goalX, y: goalY }];
  }

  const clearMask = getOrBuildClearMask(index, mapId, radius, mapWidth, mapHeight);
  if (!clearMask) {
    return [{ x: goalX, y: goalY }];
  }

  const cols = index.cols;
  const rows = index.rows;
  const total = cols * rows;

  const collectSeedCells = (wx: number, wy: number, checkFromStart: boolean): number[] => {
    const center = worldPointToCellCoords(index, wx, wy);
    if (!center) return [];
    const seeds: number[] = [];
    const tryAddCell = (c: number, r: number) => {
      if (c < 0 || r < 0 || c >= cols || r >= rows) return;
      const idx = r * cols + c;
      if (clearMask[idx] !== 1) return;
      const cpt = cellToWorldPoint(index, c, r);
      if (
        isLineClear(
          index,
          mapId,
          checkFromStart ? wx : cpt.x,
          checkFromStart ? wy : cpt.y,
          checkFromStart ? cpt.x : wx,
          checkFromStart ? cpt.y : wy,
          radius,
          mapWidth,
          mapHeight
        )
      ) {
        seeds.push(idx);
      }
    };

    tryAddCell(center.col, center.row);
    const nbrs = (center.row & 1) === 0 ? ODD_R_NEIGHBORS_EVEN : ODD_R_NEIGHBORS_ODD;
    for (let i = 0; i < nbrs.length; i++) {
      tryAddCell(center.col + nbrs[i][0], center.row + nbrs[i][1]);
    }

    // Ring-2 fallback handles narrow shoreline cusps where the clicked point sits clear between hex centers
    if (seeds.length === 0) {
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          if (Math.abs(dc) <= 1 && Math.abs(dr) <= 1) continue;
          tryAddCell(center.col + dc, center.row + dr);
        }
      }
    }
    return seeds;
  };

  const startSeeds = collectSeedCells(startX, startY, true);
  const goalSeeds = collectSeedCells(goalX, goalY, false);
  if (startSeeds.length === 0 || goalSeeds.length === 0) {
    return null;
  }
  const goalSet = new Set(goalSeeds);

  const gScore = new Float32Array(total);
  gScore.fill(Infinity);
  const cameFrom = new Int32Array(total);
  cameFrom.fill(-1);
  const closed = new Uint8Array(total);

  // Compact typed-array binary min-heap
  const heapIdx = new Int32Array(total);
  const heapF = new Float32Array(total);
  let heapLen = 0;

  const pushHeap = (cellIdx: number, fVal: number) => {
    let cur = heapLen++;
    heapIdx[cur] = cellIdx;
    heapF[cur] = fVal;
    while (cur > 0) {
      const parent = (cur - 1) >> 1;
      if (heapF[parent] <= heapF[cur]) break;
      const ti = heapIdx[parent];
      const tf = heapF[parent];
      heapIdx[parent] = heapIdx[cur];
      heapF[parent] = heapF[cur];
      heapIdx[cur] = ti;
      heapF[cur] = tf;
      cur = parent;
    }
  };

  const popHeap = (): number => {
    const top = heapIdx[0];
    const last = --heapLen;
    if (last > 0) {
      heapIdx[0] = heapIdx[last];
      heapF[0] = heapF[last];
      let cur = 0;
      while (true) {
        const left = (cur << 1) + 1;
        if (left >= last) break;
        const right = left + 1;
        const best = right < last && heapF[right] < heapF[left] ? right : left;
        if (heapF[cur] <= heapF[best]) break;
        const ti = heapIdx[cur];
        const tf = heapF[cur];
        heapIdx[cur] = heapIdx[best];
        heapF[cur] = heapF[best];
        heapIdx[best] = ti;
        heapF[best] = tf;
        cur = best;
      }
    }
    return top;
  };

  for (let i = 0; i < startSeeds.length; i++) {
    const sIdx = startSeeds[i];
    const sc = sIdx % cols;
    const sr = (sIdx / cols) | 0;
    const spt = cellToWorldPoint(index, sc, sr);
    const g0 = Math.hypot(spt.x - startX, spt.y - startY);
    const h0 = Math.hypot(goalX - spt.x, goalY - spt.y);
    gScore[sIdx] = g0;
    pushHeap(sIdx, g0 + h0);
  }

  const hexStep = index.hexRadius * SQRT3;
  let reachedGoalCell = -1;

  while (heapLen > 0) {
    const curIdx = popHeap();
    if (closed[curIdx] === 1) continue;
    closed[curIdx] = 1;

    if (goalSet.has(curIdx)) {
      reachedGoalCell = curIdx;
      break;
    }

    const col = curIdx % cols;
    const row = (curIdx / cols) | 0;
    const curG = gScore[curIdx];
    const nbrs = (row & 1) === 0 ? ODD_R_NEIGHBORS_EVEN : ODD_R_NEIGHBORS_ODD;

    for (let i = 0; i < 6; i++) {
      const nc = col + nbrs[i][0];
      const nr = row + nbrs[i][1];
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
      const nIdx = nr * cols + nc;
      if (closed[nIdx] === 1 || clearMask[nIdx] !== 1) continue;
      const tentG = curG + hexStep;
      if (tentG < gScore[nIdx]) {
        gScore[nIdx] = tentG;
        cameFrom[nIdx] = curIdx;
        const npt = cellToWorldPoint(index, nc, nr);
        const h = Math.hypot(goalX - npt.x, goalY - npt.y);
        pushHeap(nIdx, tentG + h);
      }
    }
  }

  if (reachedGoalCell < 0) return null;

  // Reconstruct raw hex-center polyline from start to goal
  const revCells: Array<{ x: number; y: number }> = [{ x: goalX, y: goalY }];
  let trace = reachedGoalCell;
  while (trace >= 0) {
    const tc = trace % cols;
    const tr = (trace / cols) | 0;
    revCells.push(cellToWorldPoint(index, tc, tr));
    trace = cameFrom[trace];
  }
  revCells.reverse();

  // Greedy line-of-sight string-pulling so paths hug coastlines cleanly instead of zig-zagging hexes
  const full = [{ x: startX, y: startY }, ...revCells];
  const smoothed: Array<{ x: number; y: number }> = [];
  let anchor = 0;
  while (anchor < full.length - 1) {
    let farthest = anchor + 1;
    for (let probe = full.length - 1; probe > anchor + 1; probe--) {
      if (
        isLineClear(
          index,
          mapId,
          full[anchor].x,
          full[anchor].y,
          full[probe].x,
          full[probe].y,
          radius,
          mapWidth,
          mapHeight
        )
      ) {
        farthest = probe;
        break;
      }
    }
    smoothed.push(full[farthest]);
    anchor = farthest;
  }

  return smoothed.length > 0 ? smoothed : [{ x: goalX, y: goalY }];
}
