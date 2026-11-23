import React, { useEffect, useRef, useState } from "react";
import { assetUrl } from "../api";
import { audioEngine } from "../audio";
import { getHeroById, HEROES } from "../heroes";
import type { HeroId, MapMeta, WorldLocation } from "../types";
import {
  findNearestClearPoint,
  isCircleClear,
  resolveCircleMove,
  sampleWorldTerritory,
  type WorldCollisionIndex,
  type WorldTerritorySample,
} from "../worldCollision";
import { ServiceChip } from "./ServiceChip";

export interface PlayerRuntimeRef {
  x: number;
  y: number;
  playtime: number;
  mapId: string;
  regionLabel: string;
  discoveredLocations: string[];
}

export interface OverworldEncounterTrigger {
  mapId: string;
  x: number;
  y: number;
  biomeName: string;
  zoneCode: number;
  zoneName: string;
  zoneMin: number;
  zoneMax: number;
  nearWaterKind: "ocean" | "inland_water" | null;
  nearWaterBiomeName: string | null;
  portalLoc?: WorldLocation | null;
}

interface OverworldCanvasProps {
  active: boolean;
  paused: boolean;
  insideLocationId: string | null;
  mapMeta: MapMeta;
  worldLocations: WorldLocation[];
  worldCollision: WorldCollisionIndex | null;
  partyOrder: HeroId[];
  level: number;
  heroLevels?: Partial<Record<HeroId, number>>;
  heroHpPct?: Partial<Record<HeroId, number>>;
  heroMpPct?: Partial<Record<HeroId, number>>;
  sealedPortalIds?: string[];
  activeQuestZones?: number[];
  startX: number;
  startY: number;
  startPlaytime: number;
  initialDiscovered: string[];
  runtimeRef: React.MutableRefObject<PlayerRuntimeRef>;
  onAutoSaveNeeded: () => void;
  onEnterLocation: (loc: WorldLocation) => void;
  onTriggerEncounter?: (trigger: OverworldEncounterTrigger) => void;
  onOpenParty: () => void;
  onOpenPause: () => void;
  onToast: (msg: string) => void;
}

const CAMERA_ZOOM = 0.75;
const TOKEN_DISPLAY_SIZE = 142;
const TOKEN_RADIUS = TOKEN_DISPLAY_SIZE / 2;
const BASE_MARKER_DISPLAY_SIZE = 148;
const NAMEPLATE_TRIGGER_PX = 600;
const MOVE_SPEED = 140;
const ENTER_ANIM_DURATION = 0.22;

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function getEntryRadius(loc: WorldLocation): number {
  return Math.max(loc.triggerRadius ?? 104, BASE_MARKER_DISPLAY_SIZE * (loc.scale ?? 1.0) * 0.72);
}

function getWalkEnterRadius(loc: WorldLocation): number {
  const base = clamp(BASE_MARKER_DISPLAY_SIZE * (loc.scale ?? 1.0) * 0.36, 46, 82);
  if (loc.category === "travel") {
    return Math.max(base, 90);
  }
  return base;
}

function findLinkedFerryPartner(
  loc: WorldLocation,
  worldLocations: WorldLocation[],
  mapId: string
): WorldLocation | null {
  if (!loc.id.startsWith("tr_ferry_crossing") || !loc.linkedFerryId) return null;
  const partner = worldLocations.find(
    (l) => l.id === loc.linkedFerryId && l.placed && l.mapId === mapId && l.x !== null && l.y !== null
  );
  return partner ?? null;
}

function hasMountainPassExit(loc: WorldLocation): boolean {
  return Boolean(
    loc.id.startsWith("tr_border_mountain_pass_gate") &&
    typeof loc.passExitX === "number" &&
    typeof loc.passExitY === "number"
  );
}

function drawFactionEmblem(ctx: CanvasRenderingContext2D, factionId: string, cx: number, cy: number, color: string): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  switch (factionId) {
    case "crown_loyalists": {
      // 3-point royal crown
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy + 4);
      ctx.lineTo(cx - 6, cy - 2);
      ctx.lineTo(cx - 2.5, cy + 1);
      ctx.lineTo(cx, cy - 5);
      ctx.lineTo(cx + 2.5, cy + 1);
      ctx.lineTo(cx + 6, cy - 2);
      ctx.lineTo(cx + 6, cy + 4);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "free_towns": {
      // 4-point trade guild star
      ctx.beginPath();
      ctx.moveTo(cx, cy - 6);
      ctx.lineTo(cx + 2, cy - 2);
      ctx.lineTo(cx + 6, cy);
      ctx.lineTo(cx + 2, cy + 2);
      ctx.lineTo(cx, cy + 6);
      ctx.lineTo(cx - 2, cy + 2);
      ctx.lineTo(cx - 6, cy);
      ctx.lineTo(cx - 2, cy - 2);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "northern_clans": {
      // Northern spearhead & twin horns
      ctx.beginPath();
      ctx.moveTo(cx, cy - 6);
      ctx.lineTo(cx + 4.5, cy + 1);
      ctx.lineTo(cx, cy + 5.5);
      ctx.lineTo(cx - 4.5, cy + 1);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy - 4);
      ctx.lineTo(cx - 3.5, cy);
      ctx.moveTo(cx + 6, cy - 4);
      ctx.lineTo(cx + 3.5, cy);
      ctx.stroke();
      break;
    }
    case "house_hollowstone": {
      // Split noble tower lozenge
      ctx.beginPath();
      ctx.moveTo(cx - 4.5, cy - 4.5);
      ctx.lineTo(cx + 4.5, cy - 4.5);
      ctx.lineTo(cx + 4.5, cy + 4.5);
      ctx.lineTo(cx - 4.5, cy + 4.5);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy - 4.5);
      ctx.lineTo(cx, cy + 4.5);
      ctx.stroke();
      break;
    }
    case "slaver_syndicate": {
      // Interlocked links
      ctx.beginPath();
      ctx.arc(cx - 2.2, cy, 3.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + 2.2, cy, 3.2, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case "bleakwatch_warlord": {
      // Double warlord chevron
      ctx.beginPath();
      ctx.moveTo(cx - 5.5, cy - 3);
      ctx.lineTo(cx, cy + 1.5);
      ctx.lineTo(cx + 5.5, cy - 3);
      ctx.moveTo(cx - 5.5, cy + 1);
      ctx.lineTo(cx, cy + 5.5);
      ctx.lineTo(cx + 5.5, cy + 1);
      ctx.stroke();
      break;
    }
    case "king_garrick": {
      // Jagged iron crown / eclipse ring
      ctx.beginPath();
      ctx.arc(cx, cy + 1, 4.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 5.5, cy - 2);
      ctx.lineTo(cx - 3, cy - 5.5);
      ctx.lineTo(cx, cy - 2.5);
      ctx.lineTo(cx + 3, cy - 5.5);
      ctx.lineTo(cx + 5.5, cy - 2);
      ctx.stroke();
      break;
    }
    default: {
      // Fallback heraldic diamond
      ctx.beginPath();
      ctx.moveTo(cx, cy - 5);
      ctx.lineTo(cx + 4.5, cy);
      ctx.lineTo(cx, cy + 5);
      ctx.lineTo(cx - 4.5, cy);
      ctx.closePath();
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

interface CachedPlate {
  canvas: HTMLCanvasElement;
  w: number;
  h: number;
}

/** Bake banner + text nameplate onto a supersampled canvas once so scrolling never causes glyph hinting jitter. */
function getCachedPlateCanvas(
  cache: Map<string, CachedPlate>,
  loc: WorldLocation,
  bannerImg: HTMLImageElement | null
): CachedPlate {
  const isMajor = (loc.scale ?? 1.0) >= 1.5;
  const key = `${loc.id}_${bannerImg ? 1 : 0}_${isMajor ? 1 : 0}_${loc.factionId ?? ""}`;
  const existing = cache.get(key);
  if (existing) return existing;

  const font = isMajor ? '700 32px Georgia, "Palatino Linotype", serif' : '700 28px "Segoe UI", sans-serif';
  const measureCanvas = document.createElement("canvas");
  const mctx = measureCanvas.getContext("2d");
  let textW = loc.name.length * 16;
  if (mctx) {
    mctx.font = font;
    textW = mctx.measureText(loc.name).width;
  }

  const primary = loc.factionPrimaryColor ?? "#d7b267";
  const secondary = loc.factionSecondaryColor ?? "#1a202d";
  const hasFaction = Boolean(loc.factionId);

  const pad = 6;
  const bannerH = 96;
  const bannerAspect = bannerImg && bannerImg.naturalHeight > 0 ? bannerImg.naturalWidth / bannerImg.naturalHeight : 0.72;
  const bannerW = hasFaction ? Math.round(bannerH * bannerAspect) : 0;
  const bannerGap = hasFaction ? 6 : 0;
  const plateH = 48;
  const plateW = Math.ceil(textW) + 36;
  const w = bannerW + bannerGap + plateW + pad * 2;
  const h = Math.max(bannerH, plateH) + pad * 2;

  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(w * scale);
  canvas.height = Math.ceil(h * scale);
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.scale(scale, scale);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    const startX = pad;
    const plateX = startX + bannerW + bannerGap;
    const plateY = pad + Math.round((bannerH - plateH) * 0.42);

    // Right Nameplate Box
    ctx.fillStyle = "rgba(10, 13, 20, 0.90)";
    ctx.fillRect(plateX, plateY, plateW, plateH);
    ctx.strokeStyle = primary;
    ctx.globalAlpha = 0.88;
    ctx.lineWidth = 2.2;
    ctx.strokeRect(plateX, plateY, plateW, plateH);
    ctx.globalAlpha = 1;

    // Location Name Text
    ctx.font = font;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = isMajor ? "#fce8bc" : "#f1e3c3";
    ctx.fillText(loc.name, plateX + 18, plateY + plateH / 2 + 1);

    // Left Hanging Faction Banner Standard (2x taller than text panel)
    if (hasFaction) {
      const bx = startX;
      const by = pad;
      if (bannerImg) {
        ctx.save();
        ctx.shadowColor = "rgba(0, 0, 0, 0.72)";
        ctx.shadowBlur = 7;
        ctx.shadowOffsetY = 2.5;
        ctx.drawImage(bannerImg, bx, by, bannerW, bannerH);
        ctx.restore();
      } else {
        ctx.fillStyle = "#b7985b";
        ctx.fillRect(bx - 2, by, bannerW + 4, 5);

        ctx.beginPath();
        ctx.moveTo(bx + 2, by + 5);
        ctx.lineTo(bx + bannerW - 2, by + 5);
        ctx.lineTo(bx + bannerW - 2, by + bannerH - 20);
        ctx.lineTo(bx + bannerW / 2, by + bannerH);
        ctx.lineTo(bx + 2, by + bannerH - 20);
        ctx.closePath();
        ctx.fillStyle = secondary;
        ctx.fill();
        ctx.strokeStyle = primary;
        ctx.lineWidth = 2.4;
        ctx.stroke();

        ctx.save();
        ctx.translate(bx + bannerW / 2, by + bannerH * 0.48);
        ctx.scale(1.8, 1.8);
        drawFactionEmblem(ctx, loc.factionId!, 0, 0, primary);
        ctx.restore();
      }
    }
  }

  const plate = { canvas, w, h };
  cache.set(key, plate);
  return plate;
}

/** Pre-downscale high-res tokens cleanly in 2x mipmap steps to eliminate subpixel color shimmering. */
function getScaledTokenCanvas(
  cache: Map<string, HTMLCanvasElement>,
  key: string,
  img: HTMLImageElement,
  targetPx: number
): HTMLCanvasElement {
  const cached = cache.get(key);
  if (cached && cached.width === targetPx && cached.height === targetPx) {
    return cached;
  }

  let cur: HTMLCanvasElement | HTMLImageElement = img;
  let curW = img.naturalWidth || targetPx;
  let curH = img.naturalHeight || targetPx;

  while (curW * 0.5 > targetPx * 1.15 && curH * 0.5 > targetPx * 1.15) {
    const nextW = Math.max(targetPx, Math.round(curW * 0.5));
    const nextH = Math.max(targetPx, Math.round(curH * 0.5));
    const step = document.createElement("canvas");
    step.width = nextW;
    step.height = nextH;
    const sctx = step.getContext("2d");
    if (!sctx) break;
    sctx.imageSmoothingEnabled = true;
    sctx.imageSmoothingQuality = "high";
    sctx.drawImage(cur, 0, 0, nextW, nextH);
    cur = step;
    curW = nextW;
    curH = nextH;
  }

  const out = document.createElement("canvas");
  out.width = targetPx;
  out.height = targetPx;
  const octx = out.getContext("2d");
  if (octx) {
    octx.imageSmoothingEnabled = true;
    octx.imageSmoothingQuality = "high";
    octx.drawImage(cur, 0, 0, targetPx, targetPx);
  }
  cache.set(key, out);
  return out;
}

const SAFE_TOWN_RADIUS_PX = 240;
const ENCOUNTER_STEP_PX = 48;
const SAFE_GRACE_STEPS = 8;

function isSafeSanctuaryLocation(loc: WorldLocation): boolean {
  if (!loc.placed || loc.x === null || loc.y === null) return false;
  if (loc.category === "portal" || loc.category === "quest_field" || loc.visibility === "quest_active_only") {
    return false;
  }
  return Boolean(loc.interiorAssetPath || loc.id.startsWith("tr_"));
}

function heroTokenStateForPct(pct: number): 1 | 2 | 3 | 4 {
  if (pct > 75) return 1;
  if (pct > 50) return 2;
  if (pct > 25) return 3;
  return 4;
}

export const OverworldCanvas: React.FC<OverworldCanvasProps> = ({
  active,
  paused,
  insideLocationId,
  mapMeta,
  worldLocations,
  worldCollision,
  partyOrder,
  level,
  heroLevels,
  heroHpPct,
  heroMpPct,
  sealedPortalIds = [],
  activeQuestZones = [],
  startX,
  startY,
  startPlaytime,
  initialDiscovered,
  runtimeRef,
  onAutoSaveNeeded,
  onEnterLocation,
  onTriggerEncounter,
  onOpenParty,
  onOpenPause,
  onToast,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const insideLocRef = useRef<string | null>(insideLocationId);
  const prevInsideRef = useRef<string | null>(insideLocationId);
  insideLocRef.current = insideLocationId;

  useEffect(() => {
    const prevId = prevInsideRef.current;
    prevInsideRef.current = insideLocationId;
    if (prevId && !insideLocationId) {
      // Stepping out of a hub restores the avatar cleanly and avoids instant re-trigger until walking off
      stateRef.current.entering = null;
      stateRef.current.suppressedLocId = prevId;
    }
  }, [insideLocationId]);

  useEffect(() => {
    if (paused) {
      stateRef.current.pressed.clear();
      stateRef.current.targetX = null;
      stateRef.current.targetY = null;
    }
  }, [paused]);

  const autoSaveCbRef = useRef(onAutoSaveNeeded);
  autoSaveCbRef.current = onAutoSaveNeeded;

  const enterLocCbRef = useRef(onEnterLocation);
  enterLocCbRef.current = onEnterLocation;

  const triggerEncounterCbRef = useRef(onTriggerEncounter);
  triggerEncounterCbRef.current = onTriggerEncounter;

  const collisionRef = useRef<WorldCollisionIndex | null>(worldCollision);
  collisionRef.current = worldCollision;

  const partyLevelRef = useRef(level);
  partyLevelRef.current = level;

  const heroHpPctRef = useRef(heroHpPct);
  heroHpPctRef.current = heroHpPct;

  const sealedPortalSetRef = useRef(new Set(sealedPortalIds));
  sealedPortalSetRef.current = new Set(sealedPortalIds);

  const activeQuestZoneSetRef = useRef(new Set(activeQuestZones));
  activeQuestZoneSetRef.current = new Set(activeQuestZones);

  const leaderId = partyOrder[0] ?? "valen";
  const leaderRef = useRef<HeroId>(leaderId);
  leaderRef.current = leaderId;

  const [hoveredLoc, setHoveredLoc] = useState<{ loc: WorldLocation; x: number; y: number } | null>(null);
  const [nearbyLoc, setNearbyLoc] = useState<WorldLocation | null>(null);
  const nearbyLocRef = useRef<WorldLocation | null>(null);
  const [territoryHud, setTerritoryHud] = useState<WorldTerritorySample | null>(null);
  const [encounterFlash, setEncounterFlash] = useState(false);

  // Store mutable animation/input state inside refs so the 60fps loop triggers 0 React re-renders
  const stateRef = useRef({
    x: startX,
    y: startY,
    targetX: null as number | null,
    targetY: null as number | null,
    camX: 0,
    camY: 0,
    playtime: startPlaytime,
    wasMoving: false,
    wildStepAccum: 0,
    wildSteps: 0,
    lastHudBiome: "",
    lastHudZone: -1,
    lastAutoSaveMs: 0,
    lastSavedX: startX,
    lastSavedY: startY,
    pressed: new Set<string>(),
    tiles: new Map<string, HTMLImageElement>(),
    markers: new Map<string, HTMLImageElement>(),
    heroImgs: new Map<string, HTMLImageElement>(),
    scaledHeroes: new Map<string, HTMLCanvasElement>(),
    scaledMarkers: new Map<string, HTMLCanvasElement>(),
    cachedPlates: new Map<string, CachedPlate>(),
    plateAlphas: new Map<string, number>(),
    discovered: new Set<string>(initialDiscovered),
    entering: null as { loc: WorldLocation; startX: number; startY: number; elapsed: number } | null,
    ferryTransit: null as {
      origin: WorldLocation;
      destId: string;
      destX: number;
      destY: number;
      startPlayerX: number;
      startPlayerY: number;
      landX: number;
      landY: number;
      boardDur: number;
      travelDur: number;
      disembarkDur: number;
      elapsed: number;
    } | null,
    suppressedLocId: null as string | null,
  });

  const buildEncounterPayload = (
    x: number,
    y: number,
    portalLoc?: WorldLocation | null
  ): OverworldEncounterTrigger => {
    const sample = sampleWorldTerritory(collisionRef.current, mapMeta.id, x, y);
    return {
      mapId: mapMeta.id,
      x,
      y,
      biomeName: sample?.biomeName ?? mapMeta.regionLabel,
      zoneCode: sample?.zoneCode ?? 1,
      zoneName: sample ? `Zone ${sample.zoneCode}` : "Zone 1",
      zoneMin: sample?.zoneMin ?? 1,
      zoneMax: sample?.zoneMax ?? 5,
      nearWaterKind: sample?.nearWaterKind ?? null,
      nearWaterBiomeName: sample?.nearWaterBiomeName ?? null,
      portalLoc: portalLoc ?? null,
    };
  };

  const startEnterLocation = (loc: WorldLocation) => {
    const st = stateRef.current;
    if (st.entering || st.ferryTransit || insideLocRef.current) return;
    if (loc.category === "portal" && !sealedPortalSetRef.current.has(loc.id) && triggerEncounterCbRef.current) {
      st.pressed.clear();
      st.targetX = null;
      st.targetY = null;
      st.wildStepAccum = 0;
      st.wildSteps = 0;
      audioEngine.setMovementLoop("none");
      audioEngine.playUiClick(0.36);
      setHoveredLoc(null);
      triggerEncounterCbRef.current(buildEncounterPayload(st.x, st.y, loc));
      return;
    }
    const ferryPartner = findLinkedFerryPartner(loc, worldLocations, mapMeta.id);
    const isPassExit = hasMountainPassExit(loc);
    if (
      (ferryPartner && ferryPartner.x !== null && ferryPartner.y !== null) ||
      isPassExit
    ) {
      if (loc.x === null || loc.y === null) return;
      const rawDestX = ferryPartner ? (ferryPartner.x as number) : (loc.passExitX as number);
      const rawDestY = ferryPartner ? (ferryPartner.y as number) : (loc.passExitY as number);
      const destId = ferryPartner ? ferryPartner.id : loc.id;
      st.pressed.clear();
      st.targetX = null;
      st.targetY = null;
      st.suppressedLocId = loc.id;
      const land = findNearestClearPoint(
        collisionRef.current,
        mapMeta.id,
        rawDestX,
        rawDestY,
        TOKEN_RADIUS,
        160,
        mapMeta.width,
        mapMeta.height
      );
      const dist = Math.hypot(land.x - loc.x, land.y - loc.y);
      st.ferryTransit = {
        origin: loc,
        destId,
        destX: rawDestX,
        destY: rawDestY,
        startPlayerX: st.x,
        startPlayerY: st.y,
        landX: land.x,
        landY: land.y,
        boardDur: 0.24,
        travelDur: clamp(dist / 780, 0.7, 1.45),
        disembarkDur: 0.30,
        elapsed: 0,
      };
      audioEngine.setMovementLoop("none");
      audioEngine.playUiClick(0.32);
      setHoveredLoc(null);
      return;
    }
    if (!loc.interiorAssetPath) return;
    if (!st.discovered.has(loc.id)) {
      st.discovered.add(loc.id);
      runtimeRef.current.discoveredLocations = [...st.discovered];
    }
    st.pressed.clear();
    st.targetX = null;
    st.targetY = null;
    st.suppressedLocId = loc.id;
    st.entering = { loc, startX: st.x, startY: st.y, elapsed: 0 };
    audioEngine.setMovementLoop("none");
    enterLocCbRef.current(loc);
  };

  // Sync spawn / loaded save position when entering world
  useEffect(() => {
    const st = stateRef.current;
    const clampedX = clamp(startX, TOKEN_RADIUS, mapMeta.width - TOKEN_RADIUS);
    const clampedY = clamp(startY, TOKEN_RADIUS, mapMeta.height - TOKEN_RADIUS);
    const safe = findNearestClearPoint(
      collisionRef.current,
      mapMeta.id,
      clampedX,
      clampedY,
      TOKEN_RADIUS,
      260,
      mapMeta.width,
      mapMeta.height
    );
    st.x = safe.x;
    st.y = safe.y;
    st.targetX = null;
    st.targetY = null;
    st.playtime = startPlaytime;
    st.wasMoving = false;
    st.lastSavedX = st.x;
    st.lastSavedY = st.y;
    st.lastAutoSaveMs = performance.now();
    st.discovered = new Set<string>(initialDiscovered);
    // Ensure Highcrown / nearby starting settlements at spawn are recorded as discovered immediately
    for (const loc of worldLocations) {
      if (!loc.placed || loc.mapId !== mapMeta.id || loc.x === null || loc.y === null) continue;
      if (loc.category === "quest_field" || loc.visibility === "hidden_discovery") continue;
      if (loc.id === "loc_01_overgrown_garden_sanctuary" || Math.hypot(st.x - loc.x, st.y - loc.y) <= 460) {
        st.discovered.add(loc.id);
      }
    }
    st.plateAlphas.clear();
    st.pressed.clear();
    st.entering = null;
    st.ferryTransit = null;
    st.wildStepAccum = 0;
    st.wildSteps = 0;
    const spawnedAt = worldLocations.find(
      (l) =>
        l.placed &&
        (l.interiorAssetPath || findLinkedFerryPartner(l, worldLocations, mapMeta.id) || hasMountainPassExit(l)) &&
        l.mapId === mapMeta.id &&
        l.x !== null &&
        l.y !== null &&
        Math.hypot(st.x - l.x, st.y - l.y) <= getWalkEnterRadius(l) + 18
    );
    st.suppressedLocId = spawnedAt?.id ?? null;

    const initSample = sampleWorldTerritory(collisionRef.current, mapMeta.id, st.x, st.y);
    if (initSample) {
      st.lastHudBiome = initSample.biomeName;
      st.lastHudZone = initSample.zoneCode;
      setTerritoryHud(initSample);
    }

    runtimeRef.current = {
      x: st.x,
      y: st.y,
      playtime: st.playtime,
      mapId: mapMeta.id,
      regionLabel: initSample?.regionName ?? mapMeta.regionLabel,
      discoveredLocations: [...st.discovered],
    };
  }, [mapMeta, startX, startY, startPlaytime, initialDiscovered, runtimeRef]);

  // If terrain collision mask finishes loading after initial mount, keep token cleanly on dry ground
  useEffect(() => {
    if (!worldCollision) return;
    const st = stateRef.current;
    if (!isCircleClear(worldCollision, mapMeta.id, st.x, st.y, TOKEN_RADIUS, mapMeta.width, mapMeta.height)) {
      const safe = findNearestClearPoint(
        worldCollision,
        mapMeta.id,
        st.x,
        st.y,
        TOKEN_RADIUS,
        260,
        mapMeta.width,
        mapMeta.height
      );
      st.x = safe.x;
      st.y = safe.y;
      st.targetX = null;
      st.targetY = null;
      runtimeRef.current.x = st.x;
      runtimeRef.current.y = st.y;
    }
    const initSample = sampleWorldTerritory(worldCollision, mapMeta.id, st.x, st.y);
    if (initSample) {
      st.lastHudBiome = initSample.biomeName;
      st.lastHudZone = initSample.zoneCode;
      runtimeRef.current.regionLabel = initSample.regionName;
      setTerritoryHud(initSample);
    }
  }, [worldCollision, mapMeta, runtimeRef]);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const st = stateRef.current;

    const getOrLoadHero = (hid: HeroId, hpState: 1 | 2 | 3 | 4 = 1): HTMLImageElement | null => {
      const key = `${hid}_hp${hpState}`;
      const existing = st.heroImgs.get(key);
      if (existing) {
        return existing.complete && existing.naturalWidth > 0 ? existing : null;
      }
      const im = new Image();
      const bust = window.rodApi ? "" : "?v=512";
      im.src = assetUrl(`assets/tokens/heroes/${hid}_hp${hpState}.webp${bust}`);
      st.heroImgs.set(key, im);
      const fb = hpState > 1 ? st.heroImgs.get(`${hid}_hp1`) : null;
      return fb && fb.complete && fb.naturalWidth > 0 ? fb : null;
    };

    // Preload all 6 hero healthy tokens so swapping Slot #1 leader keeps token & shadow instant
    for (const hero of HEROES) {
      getOrLoadHero(hero.id, 1);
    }

    const getOrLoadTile = (col: number, row: number): HTMLImageElement | null => {
      const key = `${mapMeta.id}:${col}_${row}`;
      const existing = st.tiles.get(key);
      if (existing) {
        return existing.complete && existing.naturalWidth > 0 ? existing : null;
      }
      const img = new Image();
      img.src = assetUrl(`assets/maps/${mapMeta.id}/tile_${col}_${row}.webp`);
      st.tiles.set(key, img);
      return null;
    };

    const getOrLoadMarker = (rel: string): HTMLImageElement | null => {
      const existing = st.markers.get(rel);
      if (existing) {
        return existing.complete && existing.naturalWidth > 0 ? existing : null;
      }
      const img = new Image();
      const url = assetUrl(rel);
      img.src = typeof window !== "undefined" && window.location.protocol.startsWith("http")
        ? `${url}?v=20261122r2`
        : url;
      st.markers.set(rel, img);
      return null;
    };

    let viewW = window.innerWidth;
    let viewH = window.innerHeight;

    const updateCam = () => {
      const worldViewW = viewW / CAMERA_ZOOM;
      const worldViewH = viewH / CAMERA_ZOOM;
      const maxCamX = Math.max(0, mapMeta.width - worldViewW);
      const maxCamY = Math.max(0, mapMeta.height - worldViewH);
      st.camX = clamp(st.x - worldViewW / 2, 0, maxCamX);
      st.camY = clamp(st.y - worldViewH / 2, 0, maxCamY);
    };

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      viewW = window.innerWidth;
      viewH = window.innerHeight;
      canvas.width = Math.floor(viewW * dpr);
      canvas.height = Math.floor(viewH * dpr);
      canvas.style.width = `${viewW}px`;
      canvas.style.height = `${viewH}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      updateCam();
    };
    resize();
    window.addEventListener("resize", resize);

    const onKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        e.preventDefault();
      }
      if (!pausedRef.current && (e.code === "KeyE" || e.code === "Enter") && nearbyLocRef.current) {
        e.preventDefault();
        startEnterLocation(nearbyLocRef.current);
        return;
      }
      if (!pausedRef.current) st.pressed.add(e.code);
    };
    const onKeyUp = (e: KeyboardEvent) => st.pressed.delete(e.code);
    const onBlur = () => st.pressed.clear();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    let last = performance.now();
    let raf = 0;

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (st.entering) {
        st.entering.elapsed = Math.min(ENTER_ANIM_DURATION, st.entering.elapsed + dt);
      }

      if (st.ferryTransit && !pausedRef.current) {
        const ft = st.ferryTransit;
        ft.elapsed += dt;
        const emergeStart = Math.max(ft.boardDur, ft.travelDur - 0.14);
        const totalDur = Math.max(ft.travelDur, emergeStart + ft.disembarkDur);

        if (ft.elapsed < ft.travelDur) {
          const u = clamp(ft.elapsed / ft.travelDur, 0, 1);
          const ease = u * u * u * (u * (u * 6 - 15) + 10);
          st.x = ft.startPlayerX + (ft.landX - ft.startPlayerX) * ease;
          st.y = ft.startPlayerY + (ft.landY - ft.startPlayerY) * ease;
        } else {
          st.x = ft.landX;
          st.y = ft.landY;
        }

        if (ft.elapsed >= totalDur) {
          st.x = ft.landX;
          st.y = ft.landY;
          st.suppressedLocId = ft.destId;
          st.ferryTransit = null;
          st.lastSavedX = st.x;
          st.lastSavedY = st.y;
          st.lastAutoSaveMs = now;
          runtimeRef.current.x = st.x;
          runtimeRef.current.y = st.y;
          autoSaveCbRef.current();
          audioEngine.playUiClick(0.32);
        }
        updateCam();
      }

      if (!pausedRef.current && !st.entering && !st.ferryTransit) {
        st.playtime += dt;
        const prevX = st.x;
        const prevY = st.y;
        let kx = 0;
        let ky = 0;
        if (st.pressed.has("KeyW") || st.pressed.has("ArrowUp")) ky -= 1;
        if (st.pressed.has("KeyS") || st.pressed.has("ArrowDown")) ky += 1;
        if (st.pressed.has("KeyA") || st.pressed.has("ArrowLeft")) kx -= 1;
        if (st.pressed.has("KeyD") || st.pressed.has("ArrowRight")) kx += 1;

        if (kx !== 0 || ky !== 0) {
          st.targetX = null;
          st.targetY = null;
          const len = Math.hypot(kx, ky);
          const candX = st.x + (kx / len) * MOVE_SPEED * dt;
          const candY = st.y + (ky / len) * MOVE_SPEED * dt;
          const res = resolveCircleMove(
            collisionRef.current,
            mapMeta.id,
            st.x,
            st.y,
            candX,
            candY,
            TOKEN_RADIUS,
            mapMeta.width,
            mapMeta.height
          );
          st.x = res.x;
          st.y = res.y;
        } else if (st.targetX !== null && st.targetY !== null) {
          const dx = st.targetX - st.x;
          const dy = st.targetY - st.y;
          const dist = Math.hypot(dx, dy);
          const step = MOVE_SPEED * dt;
          let candX: number;
          let candY: number;
          let reachedTarget = false;
          if (dist <= step) {
            candX = st.targetX;
            candY = st.targetY;
            reachedTarget = true;
          } else {
            candX = st.x + (dx / dist) * step;
            candY = st.y + (dy / dist) * step;
          }
          const res = resolveCircleMove(
            collisionRef.current,
            mapMeta.id,
            st.x,
            st.y,
            candX,
            candY,
            TOKEN_RADIUS,
            mapMeta.width,
            mapMeta.height
          );
          const actualMove = Math.hypot(res.x - st.x, res.y - st.y);
          st.x = res.x;
          st.y = res.y;
          if (reachedTarget && !res.slid) {
            st.targetX = null;
            st.targetY = null;
          } else if (res.slid && actualMove < step * 0.2) {
            st.targetX = null;
            st.targetY = null;
          }
        }

        st.x = clamp(st.x, TOKEN_RADIUS, mapMeta.width - TOKEN_RADIUS);
        st.y = clamp(st.y, TOKEN_RADIUS, mapMeta.height - TOKEN_RADIUS);
        updateCam();

        runtimeRef.current.x = st.x;
        runtimeRef.current.y = st.y;
        runtimeRef.current.playtime = st.playtime;

        const stepDist = Math.hypot(st.x - prevX, st.y - prevY);
        const moved = stepDist > 0.05;
        const movedSinceSave = Math.hypot(st.x - st.lastSavedX, st.y - st.lastSavedY) >= 4;
        if (moved && movedSinceSave && now - st.lastAutoSaveMs >= 2000) {
          st.lastAutoSaveMs = now;
          st.lastSavedX = st.x;
          st.lastSavedY = st.y;
          autoSaveCbRef.current();
        } else if (st.wasMoving && !moved && movedSinceSave) {
          st.lastAutoSaveMs = now;
          st.lastSavedX = st.x;
          st.lastSavedY = st.y;
          autoSaveCbRef.current();
        }
        st.wasMoving = moved;
        audioEngine.setMovementLoop(moved ? "walk" : "none");

        // Classic Final Fantasy invisible step-by-step random encounters (zero HUD warning)
        const territory = sampleWorldTerritory(collisionRef.current, mapMeta.id, st.x, st.y);
        const inSafeZone = worldLocations.some(
          (l) => l.mapId === mapMeta.id && isSafeSanctuaryLocation(l) && Math.hypot(st.x - (l.x as number), st.y - (l.y as number)) <= SAFE_TOWN_RADIUS_PX
        );
        if (inSafeZone) {
          st.wildStepAccum = 0;
          st.wildSteps = 0;
        } else if (moved && triggerEncounterCbRef.current && !insideLocRef.current) {
          st.wildStepAccum += stepDist;
          while (st.wildStepAccum >= ENCOUNTER_STEP_PX) {
            st.wildStepAccum -= ENCOUNTER_STEP_PX;
            st.wildSteps += 1;
            if (st.wildSteps > SAFE_GRACE_STEPS) {
              const zoneOverleveled = territory ? partyLevelRef.current > territory.zoneMax : false;
              const stealthActive = Boolean(
                territory && zoneOverleveled && !activeQuestZoneSetRef.current.has(territory.zoneCode)
              );
              const stealthMul =
                stealthActive && territory
                  ? Math.max(0.7, 1 - (partyLevelRef.current - territory.zoneMax) * 0.06)
                  : 1.0;
              const ambushChance = Math.min(0.28, (st.wildSteps - SAFE_GRACE_STEPS) * 0.011 * stealthMul);
              if (Math.random() < ambushChance) {
                st.wildStepAccum = 0;
                st.wildSteps = 0;
                st.pressed.clear();
                st.targetX = null;
                st.targetY = null;
                st.wasMoving = false;
                audioEngine.setMovementLoop("none");
                audioEngine.playSfx("sword", 0.56);
                setEncounterFlash(true);
                window.setTimeout(() => setEncounterFlash(false), 200);
                triggerEncounterCbRef.current(buildEncounterPayload(st.x, st.y, null));
                break;
              }
            }
          }
        }

        const bKey = territory?.biomeName ?? "";
        const zCode = territory?.zoneCode ?? -1;
        if (st.lastHudBiome !== bKey || st.lastHudZone !== zCode) {
          st.lastHudBiome = bKey;
          st.lastHudZone = zCode;
          if (territory) runtimeRef.current.regionLabel = territory.regionName;
          setTerritoryHud(territory);
        }
      } else {
        audioEngine.setMovementLoop("none");
      }

      // Render world using continuous camera coords so player & markers stay 100% locked with zero diagonal jitter
      ctx.clearRect(0, 0, viewW, viewH);
      const dpr = window.devicePixelRatio || 1;
      const snapScale = CAMERA_ZOOM * dpr;
      const worldViewW = viewW / CAMERA_ZOOM;
      const worldViewH = viewH / CAMERA_ZOOM;
      const camX = st.camX;
      const camY = st.camY;

      const ts = mapMeta.tileSize;
      const c0 = clamp(Math.floor(camX / ts), 0, mapMeta.cols - 1);
      const c1 = clamp(Math.floor((camX + worldViewW) / ts), 0, mapMeta.cols - 1);
      const r0 = clamp(Math.floor(camY / ts), 0, mapMeta.rows - 1);
      const r1 = clamp(Math.floor((camY + worldViewH) / ts), 0, mapMeta.rows - 1);

      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.scale(CAMERA_ZOOM, CAMERA_ZOOM);

      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const tile = getOrLoadTile(c, r);
          const sx = c * ts - camX;
          const sy = r * ts - camY;
          if (tile) {
            ctx.drawImage(tile, sx, sy, ts + 1.25, ts + 1.25);
          } else {
            ctx.fillStyle = "#101824";
            ctx.fillRect(sx, sy, ts + 1.25, ts + 1.25);
          }
        }
      }

      // Preload 1-tile ring outside viewport (and around destination ferry pier during transit)
      for (let r = Math.max(0, r0 - 1); r <= Math.min(mapMeta.rows - 1, r1 + 1); r++) {
        for (let c = Math.max(0, c0 - 1); c <= Math.min(mapMeta.cols - 1, c1 + 1); c++) {
          getOrLoadTile(c, r);
        }
      }
      if (st.ferryTransit) {
        const dc = Math.floor(st.ferryTransit.destX / mapMeta.tileSize);
        const dr = Math.floor(st.ferryTransit.destY / mapMeta.tileSize);
        for (let r = Math.max(0, dr - 1); r <= Math.min(mapMeta.rows - 1, dr + 1); r++) {
          for (let c = Math.max(0, dc - 1); c <= Math.min(mapMeta.cols - 1, dc + 1); c++) {
            getOrLoadTile(c, r);
          }
        }
      }

      // Placed Overworld markers + nearest enterable hub detection
      let closestEnterable: WorldLocation | null = null;
      let closestEnterDist = Number.POSITIVE_INFINITY;

      for (const loc of worldLocations) {
        if (!loc.placed || loc.mapId !== mapMeta.id || loc.x === null || loc.y === null) continue;
        const dPlayer = Math.hypot(st.x - loc.x, st.y - loc.y);
        const ferryPartner = findLinkedFerryPartner(loc, worldLocations, mapMeta.id);
        const isPortalReady = loc.category === "portal" && !sealedPortalSetRef.current.has(loc.id);
        const isWalkEnterable = Boolean(loc.interiorAssetPath || ferryPartner || hasMountainPassExit(loc));
        const isEnterable = isWalkEnterable || isPortalReady;

        if (!st.ferryTransit && isEnterable && dPlayer <= getEntryRadius(loc) && dPlayer < closestEnterDist) {
          closestEnterDist = dPlayer;
          closestEnterable = loc;
        }

        // Clear exit suppression once the player steps off the token center
        if (st.suppressedLocId === loc.id && dPlayer > getWalkEnterRadius(loc) + 28) {
          st.suppressedLocId = null;
        }

        // Moving onto an enterable town or linked ferry pier boards / enters automatically (Portals use E / click)
        if (
          !pausedRef.current &&
          !st.entering &&
          !st.ferryTransit &&
          !insideLocRef.current &&
          isWalkEnterable &&
          st.suppressedLocId !== loc.id &&
          dPlayer <= getWalkEnterRadius(loc)
        ) {
          startEnterLocation(loc);
        }

        if (loc.visibility === "quest_active_only") continue;
        if (loc.visibility === "hidden_discovery" && !st.discovered.has(loc.id)) {
          if (dPlayer <= (loc.triggerRadius ?? 88) + 90) {
            st.discovered.add(loc.id);
            runtimeRef.current.discoveredLocations = [...st.discovered];
            autoSaveCbRef.current();
            audioEngine.playDiscovery();
            onToast(`Discovered: ${loc.name}!`);
          } else {
            continue;
          }
        } else if (loc.category !== "quest_field" && !st.discovered.has(loc.id) && dPlayer <= 440) {
          st.discovered.add(loc.id);
          runtimeRef.current.discoveredLocations = [...st.discovered];
        }

        const mSize = BASE_MARKER_DISPLAY_SIZE * (loc.scale ?? 1.0);
        const mHalf = mSize / 2;
        const lx = loc.x - camX;
        const ly = loc.y - camY;
        if (lx + mHalf < -240 || ly + mHalf < -80 || lx - mHalf > worldViewW + 240 || ly - mHalf > worldViewH + 140) {
          continue;
        }

        const mImg = getOrLoadMarker(loc.assetPath);
        if (mImg) {
          const targetMarkerPx = Math.round(mSize * snapScale);
          const mSrc =
            mImg.naturalWidth > targetMarkerPx * 1.15
              ? getScaledTokenCanvas(st.scaledMarkers, `${loc.id}_${targetMarkerPx}`, mImg, targetMarkerPx)
              : mImg;
          const rotDeg = loc.rotation ?? 0;
          if (rotDeg !== 0) {
            ctx.save();
            ctx.translate(lx, ly);
            ctx.rotate((rotDeg * Math.PI) / 180);
            ctx.drawImage(mSrc, -mHalf, -mHalf, mSize, mSize);
            ctx.restore();
          } else {
            ctx.drawImage(mSrc, lx - mHalf, ly - mHalf, mSize, mSize);
          }
        }

        const nameRange = NAMEPLATE_TRIGGER_PX + Math.max(0, mHalf - BASE_MARKER_DISPLAY_SIZE / 2);
        if (loc.bannerAssetPath && dPlayer <= nameRange + 180) {
          getOrLoadMarker(loc.bannerAssetPath);
        }
        const targetAlpha = dPlayer <= nameRange ? 1 : 0;
        const prevAlpha = st.plateAlphas.get(loc.id) ?? 0;
        const fadeStep = dt / 0.28;
        const nextAlpha =
          targetAlpha > prevAlpha
            ? Math.min(1, prevAlpha + fadeStep)
            : Math.max(0, prevAlpha - fadeStep);
        if (nextAlpha <= 0.002) {
          st.plateAlphas.delete(loc.id);
        } else {
          st.plateAlphas.set(loc.id, nextAlpha);
          const ease = nextAlpha * nextAlpha * (3 - 2 * nextAlpha);
          const glideY = (1 - ease) * 6;
          const bannerImg = loc.bannerAssetPath ? getOrLoadMarker(loc.bannerAssetPath) : null;
          const plate = getCachedPlateCanvas(st.cachedPlates, loc, bannerImg);
          ctx.save();
          ctx.globalAlpha = ease;
          ctx.drawImage(plate.canvas, lx - plate.w / 2, ly - mHalf - plate.h - 2 + glideY, plate.w, plate.h);
          ctx.restore();
        }
      }

      if ((nearbyLocRef.current?.id ?? null) !== (closestEnterable?.id ?? null)) {
        nearbyLocRef.current = closestEnterable;
        setNearbyLoc(closestEnterable);
      }

      if (st.targetX !== null && st.targetY !== null) {
        const tx = st.targetX - camX;
        const ty = st.targetY - camY;
        ctx.strokeStyle = "rgba(240, 203, 126, 0.85)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(tx, ty, 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "rgba(240, 203, 126, 0.35)";
        ctx.beginPath();
        ctx.arc(tx, ty, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Avatar token glides onto marker center and vanishes as the interior menu fades in (or pops in/out across ferries)
      const ft = st.ferryTransit;
      const enterAnim = st.entering;
      let avatarAlpha = insideLocRef.current && !enterAnim ? 0 : 1;
      let avatarScale = 1;
      let drawWorldX = st.x;
      let drawWorldY = st.y;
      if (enterAnim) {
        const t = clamp(enterAnim.elapsed / ENTER_ANIM_DURATION, 0, 1);
        const ease = t * t * (3 - 2 * t);
        const destX = enterAnim.loc.x ?? enterAnim.startX;
        const destY = enterAnim.loc.y ?? enterAnim.startY;
        drawWorldX = enterAnim.startX + (destX - enterAnim.startX) * ease * 0.45;
        drawWorldY = enterAnim.startY + (destY - enterAnim.startY) * ease * 0.45;
        avatarScale = 1 - ease * 0.52;
        avatarAlpha = 1 - ease;
      } else if (ft) {
        const ox = ft.origin.x ?? st.x;
        const oy = ft.origin.y ?? st.y;
        const dx = ft.destX;
        const dy = ft.destY;
        const emergeStart = Math.max(ft.boardDur, ft.travelDur - 0.14);
        if (ft.elapsed < ft.boardDur) {
          const t = clamp(ft.elapsed / ft.boardDur, 0, 1);
          const ease = t * t * (3 - 2 * t);
          drawWorldX = ft.startPlayerX + (ox - ft.startPlayerX) * ease * 0.65;
          drawWorldY = ft.startPlayerY + (oy - ft.startPlayerY) * ease * 0.65;
          avatarScale = 1 - ease * 0.52;
          avatarAlpha = 1 - ease;
        } else if (ft.elapsed < emergeStart) {
          avatarAlpha = 0;
        } else {
          const p = clamp((ft.elapsed - emergeStart) / ft.disembarkDur, 0, 1);
          const easeOut = 1 - Math.pow(1 - p, 3);
          drawWorldX = dx + (ft.landX - dx) * easeOut;
          drawWorldY = dy + (ft.landY - dy) * easeOut;
          avatarScale = 0.48 + 0.52 * easeOut;
          avatarAlpha = easeOut;
        }
      }

      if (avatarAlpha > 0.01) {
        const px = drawWorldX - camX;
        const py = drawWorldY - camY;
        const scaledDisplay = TOKEN_DISPLAY_SIZE * avatarScale;
        const drawSizePx = Math.max(16, Math.round(scaledDisplay * snapScale));
        const isCenteredX = Math.abs(px - worldViewW / 2) < 0.01 && avatarScale === 1;
        const isCenteredY = Math.abs(py - worldViewH / 2) < 0.01 && avatarScale === 1;
        const drawDevX = isCenteredX ? Math.round(px * snapScale - drawSizePx / 2) : px * snapScale - drawSizePx / 2;
        const drawDevY = isCenteredY ? Math.round(py * snapScale - drawSizePx / 2) : py * snapScale - drawSizePx / 2;
        const lockedPx = (drawDevX + drawSizePx / 2) / snapScale;
        const lockedPy = (drawDevY + drawSizePx / 2) / snapScale;

        ctx.save();
        ctx.globalAlpha = avatarAlpha;
        ctx.fillStyle = "rgba(0, 0, 0, 0.30)";
        ctx.beginPath();
        ctx.ellipse(
          lockedPx,
          lockedPy + TOKEN_RADIUS * avatarScale * 0.64,
          TOKEN_RADIUS * avatarScale * 0.70,
          TOKEN_RADIUS * avatarScale * 0.24,
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();

        const leaderHp = heroHpPctRef.current?.[leaderRef.current] ?? 100;
        const leaderHpState = heroTokenStateForPct(leaderHp);
        const activeHeroImg = getOrLoadHero(leaderRef.current, leaderHpState);
        if (activeHeroImg) {
          const mip = getScaledTokenCanvas(
            st.scaledHeroes,
            `${leaderRef.current}_hp${leaderHpState}_${drawSizePx}`,
            activeHeroImg,
            drawSizePx
          );
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.imageSmoothingEnabled = !(isCenteredX && isCenteredY);
          ctx.imageSmoothingQuality = "high";
          ctx.shadowColor = "rgba(0, 0, 0, 0.58)";
          ctx.shadowBlur = Math.round(14 * dpr * avatarScale);
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = Math.round(6 * dpr * avatarScale);
          ctx.drawImage(mip, drawDevX, drawDevY);
        }
        ctx.restore();
      }

      ctx.restore();
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      audioEngine.setMovementLoop("none");
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [active, mapMeta, worldLocations, runtimeRef, onToast]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const st = stateRef.current;
    if (!active || paused || st.ferryTransit || st.entering || e.button !== 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const wx = st.camX + (e.clientX - rect.left) / CAMERA_ZOOM;
    const wy = st.camY + (e.clientY - rect.top) / CAMERA_ZOOM;

    for (const loc of worldLocations) {
      const canEnter = Boolean(
        loc.interiorAssetPath ||
        findLinkedFerryPartner(loc, worldLocations, mapMeta.id) ||
        hasMountainPassExit(loc) ||
        (loc.category === "portal" && !sealedPortalSetRef.current.has(loc.id))
      );
      if (!loc.placed || !canEnter || loc.mapId !== mapMeta.id || loc.x === null || loc.y === null) continue;
      const rad = (BASE_MARKER_DISPLAY_SIZE * (loc.scale ?? 1.0)) / 2;
      if (Math.hypot(wx - loc.x, wy - loc.y) <= rad) {
        if (Math.hypot(st.x - loc.x, st.y - loc.y) <= getWalkEnterRadius(loc)) {
          startEnterLocation(loc);
          return;
        }
        // Clicking any hub marker walks the party to the nearest walkable shore/approach within its entry trigger
        if (st.suppressedLocId === loc.id) st.suppressedLocId = null;
        const stand = findNearestClearPoint(
          collisionRef.current,
          mapMeta.id,
          loc.x,
          loc.y,
          TOKEN_RADIUS,
          160,
          mapMeta.width,
          mapMeta.height
        );
        st.targetX = stand.x;
        st.targetY = stand.y;
        audioEngine.playUiClick(0.24);
        return;
      }
    }

    st.targetX = clamp(wx, TOKEN_RADIUS, mapMeta.width - TOKEN_RADIUS);
    st.targetY = clamp(wy, TOKEN_RADIUS, mapMeta.height - TOKEN_RADIUS);
    audioEngine.playUiClick(0.24);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!active || paused) {
      if (hoveredLoc) setHoveredLoc(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const st = stateRef.current;
    const wx = st.camX + (e.clientX - rect.left) / CAMERA_ZOOM;
    const wy = st.camY + (e.clientY - rect.top) / CAMERA_ZOOM;

    let hit: WorldLocation | null = null;
    for (const loc of worldLocations) {
      if (!loc.placed || loc.mapId !== mapMeta.id || loc.x === null || loc.y === null) continue;
      if (loc.visibility === "quest_active_only") continue;
      if (loc.visibility === "hidden_discovery" && !st.discovered.has(loc.id)) continue;
      const rad = (BASE_MARKER_DISPLAY_SIZE * (loc.scale ?? 1.0)) / 2;
      if (Math.hypot(wx - loc.x, wy - loc.y) <= rad) {
        hit = loc;
        break;
      }
    }
    if (hit) {
      setHoveredLoc({
        loc: hit,
        x: Math.max(14, Math.min(window.innerWidth - 412, e.clientX + 18)),
        y: Math.max(14, Math.min(window.innerHeight - 235, e.clientY + 18)),
      });
    } else if (hoveredLoc) {
      setHoveredLoc(null);
    }
  };

  if (!active) return null;

  return (
    <main className="fixed inset-0">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredLoc(null)}
        className="block w-full h-full cursor-crosshair"
      />

      {/* Brief FF-Style Ambush Transition Flash */}
      <div
        className={[
          "fixed inset-0 z-30 pointer-events-none bg-white transition-opacity duration-200",
          encounterFlash ? "opacity-55" : "opacity-0",
        ].join(" ")}
      />

      {/* Top Right Unified Region & Live Terrain Plaque */}
      <div className="fixed top-[18px] right-5 z-[5] pointer-events-none">
        <div className="px-4 py-2 bg-[#10141d]/92 border border-[#7c653e]/85 rounded-md shadow-xl text-right backdrop-blur-sm">
          <div className="font-display text-[13.5px] font-bold tracking-[0.09em] uppercase text-[#f4dfae] leading-tight">
            {territoryHud?.regionName ?? mapMeta.regionLabel}
          </div>
          {territoryHud?.biomeName && (
            <div className="mt-0.5 text-[11.5px] font-medium tracking-[0.02em] text-[#b9c6da] leading-tight">
              {territoryHud.biomeName}
            </div>
          )}
        </div>
      </div>

      {/* Top Left Vertical Party Bar (Slots 1–4 top-to-bottom; Slot 1 = Overworld Leader) */}
      <div className="fixed top-[18px] left-5 z-[5] flex flex-col gap-1.5">
        {partyOrder.map((hid, idx) => {
          const hero = getHeroById(hid);
          const isLeader = idx === 0;
          const hpVal = Math.max(1, Math.min(100, heroHpPct?.[hid] ?? 100));
          const mpVal = Math.max(0, Math.min(100, heroMpPct?.[hid] ?? 100));
          const hpBarCls =
            hpVal <= 25
              ? "bg-gradient-to-r from-[#a82430] to-[#f25260]"
              : hpVal <= 50
                ? "bg-gradient-to-r from-[#b4741a] to-[#e9b34a]"
                : "bg-gradient-to-r from-[#38a169] to-[#68d391]";
          const hasMpBar = hero.baseMp > 0 || hid === "ellowyn" || hid === "mera" || hid === "harlan";
          return (
            <button
              key={hid}
              type="button"
              onClick={() => {
                audioEngine.playUiClick();
                onOpenParty();
              }}
              title="Open Party Menu (P)"
              className={[
                "flex items-center gap-2.5 py-1.5 pl-2 pr-3 rounded-md shadow-xl border text-left cursor-pointer transition-colors",
                isLeader
                  ? "bg-[#151720]/92 border-[#d7b267]/85 hover:border-[#f3d690]"
                  : "bg-[#10131a]/88 border-[#5b4d34] hover:border-[#b39356]",
              ].join(" ")}
            >
              <img
                className={[
                  "w-[42px] h-[42px] rounded-sm object-cover shrink-0 border",
                  isLeader ? "border-[#e2be73]" : "border-[#5d5038]",
                ].join(" ")}
                src={assetUrl(hero.avatarPath)}
                alt={hero.name}
                draggable={false}
              />
              <div className="flex flex-col gap-0.5 min-w-[116px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13.5px] font-bold text-[#f3dfb1] tracking-wide leading-tight">
                    {hero.name}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#d7b267]">
                    {isLeader ? "★ Lead" : `#${idx + 1}`}
                  </span>
                </div>
                <div className="text-[11px] text-[#adb5c4] leading-tight">
                  {hero.className} · Lv {heroLevels?.[hid] ?? level}
                </div>
                <div className="mt-0.5 w-28 h-1.5 bg-[#232834] border border-[#444b5c] rounded-full overflow-hidden">
                  <div className={`h-full transition-all ${hpBarCls}`} style={{ width: `${hpVal}%` }} />
                </div>
                {hasMpBar && (
                  <div className="w-28 h-1 bg-[#1e2432] border border-[#3a4358] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#3182ce] to-[#63b3ed] transition-all"
                      style={{ width: `${mpVal}%` }}
                    />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Nearby Enter Hub / Portal Prompt Pill */}
      {nearbyLoc && !paused && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-10">
          <button
            type="button"
            onClick={() => startEnterLocation(nearbyLoc)}
            className="rpg-modal-panel flex items-center gap-2.5 px-5 py-2.5 rounded border border-[#d7b267] hover:border-[#f8df9c] bg-[#161a24]/95 hover:bg-[#231f16] text-[#fae3ae] hover:text-[#fff6db] shadow-[0_10px_28px_rgba(0,0,0,0.85)] cursor-pointer transition-all"
          >
            <span className="font-display text-[14px] font-bold tracking-wider uppercase">
              {nearbyLoc.id.startsWith("tr_ferry_crossing")
                ? "Cross Ferry"
                : nearbyLoc.id.startsWith("tr_border_mountain_pass_gate")
                  ? "Cross Mountain Pass"
                  : nearbyLoc.category === "portal"
                    ? `Enter Portal: ${nearbyLoc.name}`
                    : `Enter ${nearbyLoc.name}`}
            </span>
            <span className="px-2 py-0.5 rounded-sm bg-[#2b2416] border border-[#b7914a] text-[11px] font-bold text-[#ffd985]">
              E
            </span>
          </button>
        </div>
      )}

      {/* Bottom Right Quick Buttons */}
      <div className="fixed right-5 bottom-[18px] z-[5] flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            audioEngine.playUiClick();
            onOpenParty();
          }}
          className="px-3.5 py-2.5 bg-[#12161f]/90 hover:bg-[#1a1f2c] border border-[#6b5a3c] hover:border-[#d7b267] rounded text-[#e9d9b4] hover:text-[#fff2cc] text-[13px] font-semibold tracking-wider uppercase cursor-pointer shadow-lg transition-colors"
        >
          Party (P)
        </button>
        <button
          type="button"
          onClick={() => {
            audioEngine.playUiClick();
            onOpenPause();
          }}
          className="px-4 py-2.5 bg-[#12161f]/90 hover:bg-[#1a1f2c] border border-[#6b5a3c] hover:border-[#d7b267] rounded text-[#e9d9b4] hover:text-[#fff2cc] text-[13px] font-semibold tracking-wider uppercase cursor-pointer shadow-lg transition-colors"
        >
          Menu (Esc)
        </button>
      </div>

      {/* Hover Tooltip */}
      {hoveredLoc && (
        <div
          style={{ left: hoveredLoc.x, top: hoveredLoc.y }}
          className="fixed z-20 pointer-events-none w-[392px] max-w-[calc(100vw-28px)] rpg-modal-panel rounded-[4px] px-4 py-3.5 text-[#dbe2ee]"
        >
          {/* Corner Filigree Accents */}
          <span className="absolute -top-[1px] -left-[1px] w-2.5 h-2.5 border-t-2 border-l-2 border-[#d9b263]" />
          <span className="absolute -top-[1px] -right-[1px] w-2.5 h-2.5 border-t-2 border-r-2 border-[#d9b263]" />
          <span className="absolute -bottom-[1px] -left-[1px] w-2.5 h-2.5 border-b-2 border-l-2 border-[#d9b263]" />
          <span className="absolute -bottom-[1px] -right-[1px] w-2.5 h-2.5 border-b-2 border-r-2 border-[#d9b263]" />

          {/* Header: Emblem/Banner + Title & Kind + Faction Pill */}
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              {hoveredLoc.loc.bannerAssetPath ? (
                <img
                  src={assetUrl(hoveredLoc.loc.bannerAssetPath)}
                  alt=""
                  className="w-[26px] h-[34px] object-contain shrink-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]"
                />
              ) : hoveredLoc.loc.assetPath ? (
                <img
                  src={assetUrl(hoveredLoc.loc.assetPath)}
                  alt=""
                  className="w-[34px] h-[34px] object-contain shrink-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]"
                />
              ) : null}
              <div className="min-w-0">
                <div className="font-display text-[16px] font-bold text-[#f7dca1] tracking-wide leading-tight truncate">
                  {hoveredLoc.loc.name}
                </div>
                <div className="text-[10.5px] uppercase tracking-[0.09em] text-[#98a6bd] mt-0.5">
                  {hoveredLoc.loc.playerKind ?? hoveredLoc.loc.kind}
                  {hoveredLoc.loc.playerRegion ? ` · ${hoveredLoc.loc.playerRegion}` : ""}
                </div>
              </div>
            </div>

            {hoveredLoc.loc.factionName && (
              <span
                style={{
                  borderColor: hoveredLoc.loc.factionPrimaryColor ?? "#8c7445",
                  backgroundColor: hoveredLoc.loc.factionSecondaryColor ?? "#1d2230",
                  color: hoveredLoc.loc.factionPrimaryColor ?? "#f4cf83",
                }}
                className="px-2 py-0.5 rounded-sm border text-[10px] font-semibold tracking-wide whitespace-nowrap shrink-0 mt-0.5"
              >
                {hoveredLoc.loc.factionName}
              </span>
            )}
          </div>

          {/* Engraved Gold Hairline Divider */}
          <div className="my-2.5 h-px bg-gradient-to-r from-[#a3834a]/70 via-[#d8b164]/45 to-transparent" />

          {/* Lore Body */}
          {(hoveredLoc.loc.playerDescription ?? hoveredLoc.loc.description) && (
            <p className="m-0 text-[12px] leading-[1.58] text-[#cdd6e6] italic border-l-2 border-[#7b6339]/55 pl-2.5">
              {hoveredLoc.loc.playerDescription ?? hoveredLoc.loc.description}
            </p>
          )}

          {/* Icon Service Chips */}
          {(hoveredLoc.loc.playerServices || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-[#252d3e]">
              {hoveredLoc.loc.playerServices!.map((svc) => (
                <ServiceChip key={svc} label={svc} />
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
};
