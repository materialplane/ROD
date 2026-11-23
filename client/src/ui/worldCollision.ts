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

const SLIDE_ANGLES_RAD: ReadonlyArray<number> = [
  15, -15, 30, -30, 45, -45, 60, -60, 75, -75,
].map((deg) => (deg * Math.PI) / 180);

const CLEAR_RING_DIRS: ReadonlyArray<readonly [number, number]> = Array.from({ length: 32 }, (_, i) => {
  const a = (i * Math.PI * 2) / 32;
  return [Math.cos(a), Math.sin(a)] as const;
});

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
  zoneMin: number;
  zoneMax: number;
  nearWaterKind: "ocean" | "inland_water" | null;
  nearWaterBiomeName: string | null;
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
  };
}

function worldPointToCellIdx(index: WorldCollisionIndex, wx: number, wy: number): number {
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
  if (col < 0 || row < 0 || col >= index.cols || row >= index.rows) return -1;
  return row * index.cols + col;
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
    zMeta = fallbackZone ?? { code: 1, mapId, id: "zone_1_5", name: "Lv 1–5", min: 1, max: 5 };
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

/**
 * Resolves candidate movement `(candX, candY)` against impassable hexes using the full token radius,
 * sliding smoothly along curved coastlines when direct travel clips water or cliffs.
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

    for (let i = 0; i < SLIDE_ANGLES_RAD.length; i++) {
      const ang = SLIDE_ANGLES_RAD[i];
      const cosA = Math.cos(ang);
      const sinA = Math.sin(ang);
      const scale = Math.abs(cosA);
      const rx = ux * cosA - uy * sinA;
      const ry = ux * sinA + uy * cosA;
      const sx = curX + rx * stepDist * scale;
      const sy = curY + ry * stepDist * scale;
      if (isCircleClear(index, mapId, sx, sy, radius, mapWidth, mapHeight)) {
        return { x: sx, y: sy, slid: true };
      }
    }

    // Fallback pure-axis slide for crisp edge scraping when nearly perpendicular
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
