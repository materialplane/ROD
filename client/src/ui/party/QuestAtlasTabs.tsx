import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { assetUrl } from "../api";
import { audioEngine } from "../audio";
import type { QuestEntry, WorldLocation } from "../types";

interface QuestJournalTabProps {
  acceptedQuestIds: string[];
  questsCatalog: QuestEntry[];
  worldLocations: WorldLocation[];
  sealedPortalIds: string[];
  onAbandonQuest: (questId: string) => void;
}

type JournalSubTab = "active" | "portals" | "chains" | "hunts" | "bestiary";

const STORY_CHAINS = [
  {
    title: "Chain A — Mera's Mother Rescue",
    route: "Saltwind Harbor -> Port Veridia -> The Gilded Auction Manor -> Free Mera's Mother",
  },
  {
    title: "Chain B — Harlan's Plague Woods Arc",
    route: "Briarstead -> Greenwarden Fort -> Blightwatch Keep -> Purge the Spore-Mire",
  },
  {
    title: "Chain C — Crown of Vultures",
    route: "Thornwall Castle -> Hollowstone Keep -> Bleakwatch Citadel -> Expose Garrick's War Pact",
  },
  {
    title: "Chain D — Valen & Koren's Legacy",
    route: "Millbrook Crossing -> Ashvale Village -> Reclaim Koren's Arena Trophy",
  },
];

export const QuestJournalTab: React.FC<QuestJournalTabProps> = ({
  acceptedQuestIds,
  questsCatalog,
  worldLocations,
  sealedPortalIds,
  onAbandonQuest,
}) => {
  const [subTab, setSubTab] = useState<JournalSubTab>("active");

  const portals = useMemo(() => worldLocations.filter((l) => Boolean(l.bossInfo)), [worldLocations]);
  const outposts = useMemo(() => worldLocations.filter((l) => l.id.startsWith("outpost_")), [worldLocations]);
  const sealedSet = useMemo(() => new Set(sealedPortalIds), [sealedPortalIds]);

  const activeQuests = useMemo(
    () => acceptedQuestIds.map((qid) => questsCatalog.find((q) => q.questId === qid)).filter((x): x is QuestEntry => Boolean(x)),
    [acceptedQuestIds, questsCatalog]
  );

  const subTabs: Array<{ id: JournalSubTab; label: string }> = [
    { id: "active", label: `Active Quests (${acceptedQuestIds.length}/15)` },
    { id: "portals", label: `Main Portals (${sealedSet.size}/8)` },
    { id: "chains", label: "Story Chains (4)" },
    { id: "hunts", label: `Zone Outposts (${outposts.length})` },
    { id: "bestiary", label: "Bestiary" },
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2.5">
      <div className="flex flex-wrap gap-1.5 shrink-0">
        {subTabs.map((st) => (
          <button
            key={st.id}
            type="button"
            onClick={() => {
              audioEngine.playUiClick(0.3);
              setSubTab(st.id);
            }}
            className={[
              "px-3 py-1 rounded border text-[11.5px] font-semibold cursor-pointer transition",
              subTab === st.id
                ? "border-[#d7b267] bg-[#2a2214] text-[#fae2aa]"
                : "border-[#2f3648] bg-[#161b26] text-[#aeb9cc] hover:border-[#6a5b3e]",
            ].join(" ")}
          >
            {st.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-2.5 content-start pr-1">
        {subTab === "active" &&
          (activeQuests.length === 0 ? (
            <div className="col-span-full py-8 text-center text-[12.5px] text-[#8d99b0]">
              No active quests yet. Speak with townsfolk inside settlements and fortresses to accept quests.
            </div>
          ) : (
            activeQuests.map((q) => (
              <div key={q.questId} className="rounded border border-[#2f3647] bg-[#121621]/95 p-3 flex gap-3 items-start">
                <img
                  src={assetUrl(q.assetPath || "assets/icons/ui/ui_06_quest_scroll_glyph.webp")}
                  alt=""
                  className="w-[46px] h-[46px] rounded border border-[#5a492e] bg-[#0b0e14] object-cover shrink-0"
                  draggable={false}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-bold text-[#fae2aa] leading-snug">
                    {q.title} <span className="text-[11px] font-normal text-[#93a3ba]">({q.levelRange})</span>
                  </div>
                  <div className="text-[11px] text-[#9db0c8] mt-0.5">
                    {q.hubName} · {q.giver}
                    {q.miniBoss ? ` · Threat: ${q.miniBoss}` : ""}
                  </div>
                  <p className="m-0 mt-1.5 text-[11.5px] text-[#cfd8e8] leading-snug">{q.description}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-[#f4cf80] truncate">{q.reward}</span>
                    <button
                      type="button"
                      onClick={() => {
                        audioEngine.playUiClick(0.35);
                        onAbandonQuest(q.questId);
                      }}
                      className="px-2.5 py-0.5 rounded border border-[#4f566a] hover:border-[#d46974] bg-[#1b202d] text-[10.5px] font-semibold text-[#d7dfee] hover:text-[#ffb4bc] cursor-pointer shrink-0"
                    >
                      Abandon
                    </button>
                  </div>
                </div>
              </div>
            ))
          ))}

        {subTab === "portals" &&
          portals.map((p, i) => {
            const sealed = sealedSet.has(p.id);
            return (
              <div key={p.id} className="rounded border border-[#2f3647] bg-[#121621]/95 p-3 flex gap-3 items-start">
                <img
                  src={assetUrl(p.assetPath)}
                  alt={p.name}
                  className="w-[48px] h-[48px] rounded border border-[#5a492e] bg-[#0b0e14] object-contain shrink-0"
                  draggable={false}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-bold text-[#fae2aa]">
                    Portal #{i + 1}: {p.name} ·{" "}
                    <span className={sealed ? "text-[#72e3a8]" : "text-[#f28b95]"}>
                      {sealed ? "DESTROYED" : "OPEN"}
                    </span>
                  </div>
                  <div className="text-[11.5px] text-[#b4c2d7] mt-0.5">
                    Boss: {p.bossInfo?.boss} ({p.bossInfo?.plane})
                  </div>
                  <div className="text-[11px] text-[#95a6be] mt-0.5">
                    Catalyst: {p.catalyst?.name || "Regional Key"} · Weaknesses: {p.bossInfo?.weaknesses}
                  </div>
                </div>
              </div>
            );
          })}

        {subTab === "chains" &&
          STORY_CHAINS.map((c) => (
            <div key={c.title} className="rounded border border-[#2f3647] bg-[#121621]/95 p-3 flex gap-3 items-center">
              <img
                src={assetUrl("assets/icons/ui/ui_06_quest_scroll_glyph.webp")}
                alt=""
                className="w-[42px] h-[42px] rounded border border-[#5a492e] bg-[#0b0e14] object-contain shrink-0"
                draggable={false}
              />
              <div className="min-w-0">
                <div className="text-[13.5px] font-bold text-[#fae2aa]">{c.title}</div>
                <div className="text-[11.5px] text-[#cfd8e8] mt-1 leading-snug">{c.route}</div>
              </div>
            </div>
          ))}

        {subTab === "hunts" &&
          outposts.map((o) => (
            <div key={o.id} className="rounded border border-[#2f3647] bg-[#121621]/95 p-3 flex gap-3 items-center">
              <img
                src={assetUrl(o.assetPath)}
                alt={o.name}
                className="w-[44px] h-[44px] rounded border border-[#5a492e] bg-[#0b0e14] object-contain shrink-0"
                draggable={false}
              />
              <div className="min-w-0">
                <div className="text-[13.5px] font-bold text-[#fae2aa]">
                  {o.name} <span className="text-[11px] font-normal text-[#9eb0c8]">({o.levelRange || ""})</span>
                </div>
                <div className="text-[11px] text-[#9bb0c9] mt-0.5">
                  {o.playerRegion || o.mapId} · Repeatable Zone Monster Hunt
                </div>
              </div>
            </div>
          ))}

        {subTab === "bestiary" &&
          portals.map((p) => (
            <div key={p.id} className="rounded border border-[#2f3647] bg-[#121621]/95 p-3 flex gap-3 items-center">
              <img
                src={assetUrl("assets/icons/ui/ui_24_bestiary_skull_glyph.webp")}
                alt=""
                className="w-[44px] h-[44px] rounded border border-[#5a492e] bg-[#0b0e14] object-contain shrink-0"
                draggable={false}
              />
              <div className="min-w-0">
                <div className="text-[13.5px] font-bold text-[#fae2aa]">{p.bossInfo?.boss}</div>
                <div className="text-[11px] text-[#9eb0c9]">
                  {p.bossInfo?.plane} · Guard Points: {p.bossInfo?.guardPips ?? 4}
                </div>
                <div className="text-[11px] font-semibold text-[#f5cf80] mt-0.5">
                  Known Weaknesses: {p.bossInfo?.weaknesses}
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

interface WorldAtlasTabProps {
  currentMapId: string;
  playerX: number;
  playerY: number;
  leaderName: string;
  leaderTokenPath: string;
  worldLocations: WorldLocation[];
  discoveredLocations: string[];
  acceptedQuestIds: string[];
  questsCatalog: QuestEntry[];
  sealedPortalIds: string[];
}

const REALM_ORDER: Array<{ id: string; name: string }> = [
  { id: "map_01", name: "King's Reach" },
  { id: "map_02", name: "Westmarch" },
  { id: "map_03", name: "Suncrest Isles" },
  { id: "map_04", name: "Northhold" },
];

const REALM_NAME_BY_ID: Record<string, string> = Object.fromEntries(REALM_ORDER.map((r) => [r.id, r.name]));

// Persistent image caches so switching tabs or reopening Party (P) is instant
const ATLAS_IMAGE_CACHE: Record<string, HTMLImageElement> = {};
const MARKER_ICON_CACHE: Record<string, HTMLImageElement> = {};

function clampVal(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function cleanServicesList(loc: WorldLocation): string[] {
  const raw = loc.playerServices ?? loc.services ?? [];
  return raw
    .map((s) =>
      s
        .replace(/\s*\([^)]*(?:Step|Tier|Chain|Portal)[^)]*\)/gi, "")
        .replace(/\bSteps?\s*\d+(?:\s*[–-]\s*\d+)?/gi, "")
        .replace(/\s{2,}/g, " ")
        .trim()
    )
    .filter((s) => s.length > 0 && !/^(?:None|Step)/i.test(s));
}

function drawRoundedPill(
  ctx: CanvasRenderingContext2D,
  cx: number,
  topY: number,
  text: string,
  fill: string,
  stroke: string,
  textColor: string,
  fontSize = 11
): void {
  ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
  const w = ctx.measureText(text).width + 14;
  const h = fontSize + 8;
  const x = cx - w / 2;
  ctx.beginPath();
  ctx.roundRect(x, topY, w, h, 4);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = textColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cx, topY + h / 2 + 0.5);
}

export const WorldAtlasTab: React.FC<WorldAtlasTabProps> = ({
  currentMapId,
  playerX,
  playerY,
  leaderName,
  leaderTokenPath,
  worldLocations,
  discoveredLocations,
  acceptedQuestIds,
  questsCatalog,
  sealedPortalIds,
}) => {
  const [atlasMapId, setAtlasMapId] = useState(currentMapId || "map_01");
  const [zoom, setZoom] = useState(1.45);
  const [pan, setPan] = useState({
    x: currentMapId === atlasMapId ? playerX : 4096,
    y: currentMapId === atlasMapId ? playerY : 4096,
  });
  const [hoveredLocId, setHoveredLocId] = useState<string | null>(null);
  const [selectedLocId, setSelectedLocId] = useState<string | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [renderTick, setRenderTick] = useState(0);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mistCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
    moved: boolean;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    startPanX: 4096,
    startPanY: 4096,
    moved: false,
  });

  const discoveredSet = useMemo(() => new Set(discoveredLocations), [discoveredLocations]);
  const sealedSet = useMemo(() => new Set(sealedPortalIds), [sealedPortalIds]);

  // Only expose continent tabs the party has actually visited / reached
  const unlockedRealms = useMemo(() => {
    const unlockedIds = new Set<string>([currentMapId || "map_01"]);
    for (const loc of worldLocations) {
      if (loc.mapId && discoveredSet.has(loc.id)) {
        unlockedIds.add(loc.mapId);
      }
    }
    return REALM_ORDER.filter((r) => unlockedIds.has(r.id));
  }, [currentMapId, worldLocations, discoveredSet]);

  // Active accepted quests mapped onto target location IDs for this realm
  const questTargetsByLoc = useMemo(() => {
    const map = new Map<string, QuestEntry[]>();
    const activeSet = new Set(acceptedQuestIds);
    for (const q of questsCatalog) {
      if (!activeSet.has(q.questId) || q.mapId !== atlasMapId) continue;
      for (const targetId of [q.markerId, q.targetHubId]) {
        if (!targetId) continue;
        const arr = map.get(targetId) ?? [];
        arr.push(q);
        map.set(targetId, arr);
      }
    }
    return map;
  }, [acceptedQuestIds, questsCatalog, atlasMapId]);

  // Earned pins only: discovered permanent places + active quest targets (never spoil unvisited wilds)
  const visibleLocations = useMemo(
    () =>
      worldLocations.filter((l) => {
        if (!l.placed || l.mapId !== atlasMapId || l.x === null || l.y === null) return false;
        const hasQuest = questTargetsByLoc.has(l.id);
        if (l.category === "quest_field") return hasQuest;
        return discoveredSet.has(l.id) || hasQuest;
      }),
    [worldLocations, atlasMapId, discoveredSet, questTargetsByLoc]
  );

  // Full-bleed math: ensures scaled map ALWAYS covers 100% of container width & height with zero black bars
  const getViewMetrics = useCallback((w: number, h: number, z: number) => {
    const baseSide = Math.max(w, h);
    const scale = (baseSide * z) / 8192;
    const halfW = w / 2 / scale;
    const halfH = h / 2 / scale;
    return { scale, halfW, halfH };
  }, []);

  const clampPanForViewport = useCallback(
    (cx: number, cy: number, z: number) => {
      const wrap = wrapRef.current;
      const w = wrap?.clientWidth || 600;
      const h = wrap?.clientHeight || 480;
      const { halfW, halfH } = getViewMetrics(w, h, z);
      return {
        x: clampVal(cx, halfW, 8192 - halfW),
        y: clampVal(cy, halfH, 8192 - halfH),
      };
    },
    [getViewMetrics]
  );

  // Preload unlocked realm atlases & visible marker crests cleanly
  useEffect(() => {
    let alive = true;
    const bump = () => {
      if (alive) setRenderTick((t) => t + 1);
    };

    for (const r of unlockedRealms) {
      if (!ATLAS_IMAGE_CACHE[r.id]) {
        const img = new Image();
        img.onload = bump;
        img.src = assetUrl(`assets/maps/${r.id}/atlas.webp`);
        ATLAS_IMAGE_CACHE[r.id] = img;
      }
    }

    if (leaderTokenPath && !MARKER_ICON_CACHE[leaderTokenPath]) {
      const pImg = new Image();
      pImg.onload = bump;
      pImg.src = assetUrl(leaderTokenPath);
      MARKER_ICON_CACHE[leaderTokenPath] = pImg;
    }

    for (const loc of visibleLocations) {
      if (loc.assetPath && !MARKER_ICON_CACHE[loc.assetPath]) {
        const icon = new Image();
        icon.onload = bump;
        icon.src = assetUrl(loc.assetPath);
        MARKER_ICON_CACHE[loc.assetPath] = icon;
      }
    }

    return () => {
      alive = false;
    };
  }, [unlockedRealms, visibleLocations, leaderTokenPath]);

  // Keep pan clamped on initial mount around player
  useEffect(() => {
    if (atlasMapId === currentMapId) {
      setPan(clampPanForViewport(playerX, playerY, zoom));
    }
    // Run only when switching realm tab or first mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atlasMapId]);

  const focusLocation = useCallback(
    (loc: WorldLocation) => {
      if (loc.x === null || loc.y === null) return;
      setSelectedLocId(loc.id);
      const nextZ = Math.max(zoom, 1.9);
      setZoom(nextZ);
      setPan(clampPanForViewport(loc.x, loc.y, nextZ));
    },
    [zoom, clampPanForViewport]
  );

  const centerOnParty = useCallback(() => {
    const targetMap = currentMapId || "map_01";
    setAtlasMapId(targetMap);
    setSelectedLocId(null);
    const nextZ = 1.65;
    setZoom(nextZ);
    setPan(clampPanForViewport(playerX, playerY, nextZ));
  }, [currentMapId, playerX, playerY, clampPanForViewport]);

  const changeZoom = useCallback(
    (nextZoomRaw: number) => {
      const nextZ = clampVal(Number(nextZoomRaw.toFixed(2)), 1, 3.4);
      setZoom(nextZ);
      setPan((p) => clampPanForViewport(p.x, p.y, nextZ));
    },
    [clampPanForViewport]
  );

  // Paint Full-Bleed Map + Soft Fog Mist + Bold Earned Pins
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const paint = () => {
      const rect = wrap.getBoundingClientRect();
      const w = Math.max(320, Math.floor(rect.width));
      const h = Math.max(280, Math.floor(rect.height));
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const bw = Math.floor(w * dpr);
      const bh = Math.floor(h * dpr);
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { scale, halfW, halfH } = getViewMetrics(w, h, zoom);
      const clampedX = clampVal(pan.x, halfW, 8192 - halfW);
      const clampedY = clampVal(pan.y, halfH, 8192 - halfH);
      const worldLeft = clampedX - halfW;
      const worldTop = clampedY - halfH;
      const toScreenX = (wx: number) => (wx - worldLeft) * scale;
      const toScreenY = (wy: number) => (wy - worldTop) * scale;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // 1. Base Illustrated Continent Artwork (full-bleed edge-to-edge)
      const mapDx = -worldLeft * scale;
      const mapDy = -worldTop * scale;
      const mapDw = 8192 * scale;
      const atlasImg = ATLAS_IMAGE_CACHE[atlasMapId];
      if (atlasImg && atlasImg.complete && atlasImg.naturalWidth > 0) {
        ctx.drawImage(atlasImg, mapDx, mapDy, mapDw, mapDw);
      } else {
        ctx.fillStyle = "#111622";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#d9c292";
        ctx.font = "600 13px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`Unrolling ${REALM_NAME_BY_ID[atlasMapId] ?? "World Map"}...`, w / 2, h / 2);
      }

      // 2. Soft Parchment Mist Veil Over Unexplored Land
      if (!mistCanvasRef.current) {
        mistCanvasRef.current = document.createElement("canvas");
        mistCanvasRef.current.width = 512;
        mistCanvasRef.current.height = 512;
      }
      const mistCanvas = mistCanvasRef.current;
      const mCtx = mistCanvas.getContext("2d");
      if (mCtx) {
        const mScale = 512 / 8192;
        mCtx.globalCompositeOperation = "source-over";
        mCtx.clearRect(0, 0, 512, 512);
        mCtx.fillStyle = "rgba(8, 11, 18, 0.80)";
        mCtx.fillRect(0, 0, 512, 512);

        mCtx.globalCompositeOperation = "destination-out";
        const punchClearing = (wx: number, wy: number, innerWorldR: number, outerWorldR: number, strength = 1) => {
          const cx = wx * mScale;
          const cy = wy * mScale;
          const rIn = innerWorldR * mScale;
          const rOut = outerWorldR * mScale;
          const g = mCtx.createRadialGradient(cx, cy, rIn, cx, cy, rOut);
          g.addColorStop(0, `rgba(0,0,0,${strength})`);
          g.addColorStop(0.55, `rgba(0,0,0,${strength * 0.72})`);
          g.addColorStop(1, "rgba(0,0,0,0)");
          mCtx.fillStyle = g;
          mCtx.beginPath();
          mCtx.arc(cx, cy, rOut, 0, Math.PI * 2);
          mCtx.fill();
        };

        // Current party surroundings
        if (atlasMapId === currentMapId) {
          punchClearing(playerX, playerY, 920, 1480, 1);
        }

        // Every discovered town / landmark clears surrounding territory
        for (const loc of visibleLocations) {
          if (loc.x === null || loc.y === null) continue;
          if (discoveredSet.has(loc.id)) {
            punchClearing(loc.x, loc.y, 760, 1180, 1);
          } else if (questTargetsByLoc.has(loc.id)) {
            punchClearing(loc.x, loc.y, 260, 520, 0.75);
          }
        }

        ctx.drawImage(mistCanvas, mapDx, mapDy, mapDw, mapDw);
      }

      // 3. Draw Bold High-Contrast Earned Pins
      const ordered = [...visibleLocations].sort((a, b) => {
        const aFocus = a.id === hoveredLocId || a.id === selectedLocId ? 1 : 0;
        const bFocus = b.id === hoveredLocId || b.id === selectedLocId ? 1 : 0;
        return aFocus - bFocus;
      });

      const basePinR = clampVal(14.5 + (zoom - 1) * 4.2, 14.5, 24);

      for (const loc of ordered) {
        if (loc.x === null || loc.y === null) continue;
        const sx = toScreenX(loc.x);
        const sy = toScreenY(loc.y);
        if (sx < -40 || sy < -40 || sx > w + 40 || sy > h + 40) continue;

        const isQuest = questTargetsByLoc.has(loc.id);
        const isPortal = Boolean(loc.bossInfo);
        const isSealed = sealedSet.has(loc.id);
        const isTravel = loc.category === "travel";
        const isFocus = loc.id === hoveredLocId || loc.id === selectedLocId;
        const isMajor = isPortal || /capital|city|castle|keep|citadel|harbor|port/i.test(loc.playerKind || loc.kind || "");

        const r = (isPortal ? basePinR * 1.15 : isMajor ? basePinR * 1.1 : basePinR * 0.94) * (isFocus ? 1.18 : 1);
        const rimColor = isPortal
          ? isSealed
            ? "#60e39e"
            : "#ff5c6c"
          : isQuest
            ? "#ffbe4f"
            : isTravel
              ? "#5ce1e6"
              : "#fae2aa";

        // Deep drop shadow & outer halo so pins unmistakably stand out
        ctx.save();
        if (isFocus || isQuest) {
          ctx.beginPath();
          ctx.arc(sx, sy, r + 5.5, 0, Math.PI * 2);
          ctx.strokeStyle = isQuest ? "rgba(255, 190, 79, 0.78)" : "rgba(250, 226, 170, 0.85)";
          ctx.lineWidth = 2.4;
          ctx.stroke();
        }
        ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(sx, sy, r + 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "#080b12";
        ctx.fill();
        ctx.restore();

        // Circular clipped marker crest
        const iconImg = loc.assetPath ? MARKER_ICON_CACHE[loc.assetPath] : undefined;
        ctx.save();
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.clip();
        if (iconImg && iconImg.complete && iconImg.naturalWidth > 0) {
          ctx.drawImage(iconImg, sx - r * 1.08, sy - r * 1.08, r * 2.16, r * 2.16);
        } else {
          ctx.fillStyle = rimColor;
          ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
        }
        ctx.restore();

        // Crisp high-contrast border ring
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.strokeStyle = rimColor;
        ctx.lineWidth = isFocus ? 2.8 : 2.1;
        ctx.stroke();

        // Active Quest star pill above pin
        if (isQuest) {
          drawRoundedPill(ctx, sx, sy - r - 21, "Quest!", "rgba(38, 25, 8, 0.94)", "#ffbe4f", "#ffe39f", 10);
        }

        // Permanent crisp nameplate pill below earned pins
        drawRoundedPill(
          ctx,
          sx,
          sy + r + 5,
          loc.name,
          isFocus ? "rgba(22, 18, 11, 0.96)" : "rgba(10, 14, 22, 0.90)",
          isFocus ? "#fae2aa" : "rgba(148, 125, 76, 0.85)",
          isFocus ? "#fff4d1" : "#f2e7cb",
          isFocus ? 11.5 : 10.5
        );
      }

      // 4. Active Party Leader Portrait Pin
      if (atlasMapId === currentMapId) {
        const px = toScreenX(playerX);
        const py = toScreenY(playerY);
        const pr = clampVal(17 + (zoom - 1) * 4.5, 17, 26);

        ctx.save();
        ctx.shadowColor = "rgba(0, 0, 0, 0.92)";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(px, py, pr + 5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 226, 122, 0.28)";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2.4;
        ctx.stroke();
        ctx.restore();

        const leaderImg = leaderTokenPath ? MARKER_ICON_CACHE[leaderTokenPath] : undefined;
        ctx.save();
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.clip();
        if (leaderImg && leaderImg.complete && leaderImg.naturalWidth > 0) {
          ctx.drawImage(leaderImg, px - pr * 1.05, py - pr * 1.05, pr * 2.1, pr * 2.1);
        } else {
          ctx.fillStyle = "#ffe27a";
          ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
        }
        ctx.restore();

        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.strokeStyle = "#ffe27a";
        ctx.lineWidth = 2.6;
        ctx.stroke();

        drawRoundedPill(ctx, px, py - pr - 23, `${leaderName} (You)`, "rgba(15, 20, 30, 0.96)", "#ffe27a", "#fff5d2", 10.5);
      }

      ctx.restore();
    };

    paint();
    const ro = new ResizeObserver(() => paint());
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [
    atlasMapId,
    currentMapId,
    playerX,
    playerY,
    leaderName,
    leaderTokenPath,
    visibleLocations,
    discoveredSet,
    questTargetsByLoc,
    sealedSet,
    zoom,
    pan,
    hoveredLocId,
    selectedLocId,
    renderTick,
    getViewMetrics,
  ]);

  // Cursor-anchored smooth wheel zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.18 : 1 / 1.18;
      changeZoom(zoom * factor);
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [zoom, changeZoom]);

  const hitTestMarker = (clientX: number, clientY: number): WorldLocation | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    const { scale, halfW, halfH } = getViewMetrics(w, h, zoom);
    const clampedX = clampVal(pan.x, halfW, 8192 - halfW);
    const clampedY = clampVal(pan.y, halfH, 8192 - halfH);
    const worldLeft = clampedX - halfW;
    const worldTop = clampedY - halfH;

    let best: WorldLocation | null = null;
    let bestDist = 28;
    for (const l of visibleLocations) {
      if (l.x === null || l.y === null) continue;
      const sx = (l.x - worldLeft) * scale;
      const sy = (l.y - worldTop) * scale;
      const d = Math.hypot(mx - sx, my - sy);
      if (d <= bestDist) {
        bestDist = d;
        best = l;
      }
    }
    return best;
  };

  const hoveredLoc = hoveredLocId ? visibleLocations.find((l) => l.id === hoveredLocId) ?? null : null;
  const wrapWidth = wrapRef.current?.clientWidth || 600;
  const wrapHeight = wrapRef.current?.clientHeight || 460;

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2.5">
      {/* Realm Title / Unlocked Realms Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
        {unlockedRealms.length <= 1 ? (
          <div className="flex items-center gap-2.5">
            <span className="font-display text-[15px] font-bold text-[#fae2aa] tracking-wide">
              {REALM_NAME_BY_ID[atlasMapId] ?? "King's Reach"}
            </span>
            <span className="text-[11px] text-[#9eb0c8]">
              Places Discovered: <strong className="text-[#fae2aa]">{visibleLocations.filter((l) => discoveredSet.has(l.id)).length}</strong>
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {unlockedRealms.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  audioEngine.playUiClick(0.3);
                  setAtlasMapId(r.id);
                  setZoom(1.35);
                  setPan(r.id === currentMapId ? { x: playerX, y: playerY } : { x: 4096, y: 4096 });
                  setSelectedLocId(null);
                }}
                className={[
                  "px-3 py-1 rounded border text-[12px] font-semibold cursor-pointer transition",
                  atlasMapId === r.id
                    ? "border-[#d7b267] bg-[#2a2214] text-[#fae2aa]"
                    : "border-[#2f3648] bg-[#161b26] text-[#aeb9cc] hover:border-[#6a5b3e]",
                ].join(" ")}
              >
                {r.name}
                {r.id === currentMapId ? " (Here)" : ""}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            audioEngine.playUiClick(0.32);
            centerOnParty();
          }}
          className="px-3 py-1 rounded border border-[#735e37] hover:border-[#d7b267] bg-[#211b11] text-[11.5px] font-semibold text-[#fae2aa] cursor-pointer"
        >
          Center on Party
        </button>
      </div>

      {/* Full-Bleed Map Viewport + Visited Places Sidebar */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1.45fr_0.75fr] gap-3">
        {/* Full-Bleed Rectangular World Map */}
        <div
          ref={wrapRef}
          className="relative w-full h-full min-h-[320px] rounded border border-[#6e5a36] bg-[#090c13] overflow-hidden shadow-inner"
        >
          <canvas
            ref={canvasRef}
            onPointerDown={(e) => {
              dragRef.current = {
                active: true,
                startX: e.clientX,
                startY: e.clientY,
                startPanX: pan.x,
                startPanY: pan.y,
                moved: false,
              };
            }}
            onPointerMove={(e) => {
              const rect = wrapRef.current?.getBoundingClientRect();
              if (rect) {
                setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
              }
              if (dragRef.current.active) {
                const dx = e.clientX - dragRef.current.startX;
                const dy = e.clientY - dragRef.current.startY;
                if (Math.hypot(dx, dy) > 3) dragRef.current.moved = true;
                const { scale } = getViewMetrics(rect?.width || 600, rect?.height || 460, zoom);
                setPan(clampPanForViewport(dragRef.current.startPanX - dx / scale, dragRef.current.startPanY - dy / scale, zoom));
                return;
              }
              const hit = hitTestMarker(e.clientX, e.clientY);
              setHoveredLocId(hit ? hit.id : null);
            }}
            onPointerUp={(e) => {
              const wasClick = dragRef.current.active && !dragRef.current.moved;
              dragRef.current.active = false;
              if (wasClick) {
                const hit = hitTestMarker(e.clientX, e.clientY);
                if (hit) {
                  audioEngine.playUiClick(0.28);
                  focusLocation(hit);
                } else {
                  setSelectedLocId(null);
                }
              }
            }}
            onPointerLeave={() => {
              dragRef.current.active = false;
              setHoveredLocId(null);
              setCursorPos(null);
            }}
            className="w-full h-full block cursor-grab active:cursor-grabbing"
          />

          {/* Top-Right Zoom Controls */}
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded border border-[#4a3e28] bg-[#0d111a]/92 px-1.5 py-1 shadow-lg">
            <button
              type="button"
              onClick={() => changeZoom(zoom / 1.28)}
              disabled={zoom <= 1.02}
              className="w-[24px] h-[24px] rounded border border-[#3a4256] bg-[#161c28] disabled:opacity-35 text-[#e6edf8] text-[13px] font-bold cursor-pointer leading-none"
              title="Zoom Out"
            >
              -
            </button>
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setPan(clampPanForViewport(pan.x, pan.y, 1));
              }}
              className="px-2 h-[24px] rounded border border-[#3a4256] bg-[#161c28] text-[#fae2aa] text-[11px] font-semibold cursor-pointer leading-none"
              title="Full Realm View"
            >
              {zoom.toFixed(1)}x
            </button>
            <button
              type="button"
              onClick={() => changeZoom(zoom * 1.28)}
              disabled={zoom >= 3.35}
              className="w-[24px] h-[24px] rounded border border-[#3a4256] bg-[#161c28] disabled:opacity-35 text-[#e6edf8] text-[13px] font-bold cursor-pointer leading-none"
              title="Zoom In"
            >
              +
            </button>
          </div>

          {/* Bottom-Left Compact Legend */}
          <div className="pointer-events-none absolute bottom-2.5 left-2.5 rounded border border-[#353d4f] bg-[#0a0e16]/90 px-2.5 py-1 text-[10.5px] text-[#cfd9ea] flex flex-wrap gap-x-3 gap-y-0.5 shadow">
            <span><strong className="text-[#fae2aa]">●</strong> Visited Place</span>
            <span><strong className="text-[#ffbe4f]">●</strong> Active Quest</span>
            <span><strong className="text-[#5ce1e6]">●</strong> Travel / Ferry</span>
          </div>

          {/* Cursor-Anchored Location Hover Tooltip */}
          {hoveredLoc && cursorPos && (() => {
            const flipLeft = cursorPos.x + 270 > wrapWidth;
            const flipTop = cursorPos.y + 135 > wrapHeight;
            const left = flipLeft ? Math.max(8, cursorPos.x - 266) : cursorPos.x + 18;
            const top = flipTop ? Math.max(8, cursorPos.y - 120) : cursorPos.y + 16;
            const services = cleanServicesList(hoveredLoc);
            const activeQuests = questTargetsByLoc.get(hoveredLoc.id) ?? [];
            const isFound = discoveredSet.has(hoveredLoc.id);

            return (
              <div
                className="pointer-events-none absolute z-20 w-[252px] rounded border border-[#b5904d] bg-[#0b0e15]/96 p-2.5 shadow-2xl"
                style={{ left, top }}
              >
                <div className="flex items-center gap-2.5">
                  <img
                    src={assetUrl(hoveredLoc.assetPath)}
                    alt=""
                    className="w-[36px] h-[36px] rounded-full border border-[#8a703e] bg-[#07090f] object-contain shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-bold text-[#fae2aa] leading-tight truncate">{hoveredLoc.name}</div>
                    <div className="text-[10.5px] text-[#9eb0c8] mt-0.5 truncate">
                      {hoveredLoc.playerKind || hoveredLoc.kind}
                      {hoveredLoc.levelRange ? ` · ${hoveredLoc.levelRange}` : ""}
                    </div>
                  </div>
                </div>

                <div className="mt-1.5 flex flex-wrap gap-1">
                  <span
                    className={[
                      "px-1.5 py-0.5 rounded border text-[9.5px] font-semibold",
                      isFound
                        ? "bg-[#16281e] border-[#387c55] text-[#8ef0b6]"
                        : "bg-[#231d13] border-[#6b5835] text-[#f3dfb1]",
                    ].join(" ")}
                  >
                    {isFound ? "Discovered" : "Quest Lead"}
                  </span>
                  {hoveredLoc.bossInfo && (
                    <span className="px-1.5 py-0.5 rounded border border-[#8c3b46] bg-[#2a1216] text-[#ffb6be] text-[9.5px] font-semibold">
                      Boss: {hoveredLoc.bossInfo.boss}
                    </span>
                  )}
                </div>

                {services.length > 0 && (
                  <div className="mt-1.5 pt-1.5 border-t border-[#262d3d] text-[10.5px] text-[#cdd7e8] leading-snug">
                    <strong className="text-[#e7cf98]">Available:</strong> {services.slice(0, 4).join(" · ")}
                  </div>
                )}

                {activeQuests.length > 0 && (
                  <div className="mt-1.5 pt-1.5 border-t border-[#3b2f1c] text-[10.5px] text-[#ffdfa0] leading-snug">
                    <strong>Active Quest:</strong> {activeQuests.map((q) => q.title).join(", ")}
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Clean Discovered Locations & Active Quests Drawer */}
        <div className="rounded border border-[#323a4b] bg-[#11151f]/95 p-3.5 flex flex-col gap-2.5 min-h-0">
          <div>
            <h3 className="font-display m-0 text-[15.5px] text-[#fae2aa]">Discovered Locations</h3>
            <div className="text-[11px] text-[#a9b8cf] mt-0.5">
              Hover pins on the map for details · Click a place below to focus it.
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1.5 pr-1">
            {visibleLocations.length === 0 ? (
              <div className="py-8 text-center text-[12px] text-[#8e9cb3]">
                Explore the roads outside towns to uncover landmarks on your map.
              </div>
            ) : (
              visibleLocations.map((l) => {
                const found = discoveredSet.has(l.id);
                const hasQuest = questTargetsByLoc.has(l.id);
                const isSelected = l.id === selectedLocId || l.id === hoveredLocId;
                return (
                  <button
                    key={l.id}
                    type="button"
                    onMouseEnter={() => setHoveredLocId(l.id)}
                    onMouseLeave={() => setHoveredLocId((prev) => (prev === l.id ? null : prev))}
                    onClick={() => {
                      audioEngine.playUiClick(0.28);
                      focusLocation(l);
                    }}
                    className={[
                      "rounded border px-2.5 py-2 flex items-center gap-2.5 text-left text-[11.5px] transition cursor-pointer",
                      isSelected
                        ? "border-[#d7b267] bg-[#211b12]"
                        : "border-[#272f40] bg-[#0e1219] hover:border-[#625236]",
                    ].join(" ")}
                  >
                    <img
                      src={assetUrl(l.assetPath)}
                      alt=""
                      className="w-[28px] h-[28px] rounded-full object-contain shrink-0 bg-[#080b10] border border-[#4a3e28]"
                      draggable={false}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <strong className={["truncate", found ? "text-[#fae2aa]" : "text-[#d9e2f0]"].join(" ")}>
                          {l.name}
                        </strong>
                        {hasQuest && (
                          <span className="px-1.5 py-0.5 rounded bg-[#30220d] border border-[#a87c32] text-[#ffd98e] text-[9.5px] font-bold shrink-0">
                            Quest
                          </span>
                        )}
                      </div>
                      <div className="text-[10.5px] text-[#96a5bc] truncate">
                        {l.playerKind || l.kind}
                        {l.levelRange ? ` · ${l.levelRange}` : ""}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
