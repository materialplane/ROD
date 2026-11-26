import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { assetUrl } from "../api";
import { audioEngine } from "../audio";
import { formatRewardLine } from "../components/LocationInteriorModal";
import { QuestCardThumb, QuestReferenceCard, type QuestReferenceStatus } from "../components/QuestCardThumb";
import { resolveDamageTypeIcons } from "../battle/battleLogic";
import { GLOBAL_ACTIVE_QUEST_LIMIT, formatOutpostRewardLine, pluralizeMonsterName } from "../quests/outpostHunts";
import { resolveOutpostHuntLore } from "../quests/outpostHuntLore";
import {
  getHubQuestStage,
  getQuestStoryChainInfo,
  makeHuntTrackKey,
  makeQuestTrackKey,
  MAX_TRACKED_QUESTS,
  resolveQuestObjectiveMeta,
} from "../quests/questUtils";
import type {
  ActiveOutpostHunt,
  ActiveQuestProgress,
  BattleEnemyDef,
  DiscoveredMonsterTraitsMap,
  ItemEntry,
  QuestEntry,
  TravelCatalog,
  TravelStoryChainEntry,
  WorldLocation,
} from "../types";

interface QuestJournalTabProps {
  acceptedQuestIds: string[];
  completedQuestIds?: string[];
  questProgressById?: Record<string, ActiveQuestProgress>;
  trackedQuestKeys?: string[];
  travelCatalog?: TravelCatalog | null;
  initialFocusRequest?: { key: string; seq: number } | null;
  activeOutpostHunts?: ActiveOutpostHunt[];
  completedOutpostHunts?: number;
  questsCatalog: QuestEntry[];
  worldLocations: WorldLocation[];
  discoveredLocations?: string[];
  sealedPortalIds: string[];
  itemsById?: Record<string, ItemEntry>;
  discoveredMonsterTraits?: DiscoveredMonsterTraitsMap;
  battleMonsters?: BattleEnemyDef[];
  onAbandonQuest: (questId: string) => void;
  onAbandonOutpostHunt?: (outpostId: string) => void;
  onToggleTrackQuest?: (trackKey: string) => void;
  onLocateInAtlas?: (locationId: string, mapId: string) => void;
}

type JournalSubTab = "active" | "completed" | "chains" | "portals" | "hunts" | "bestiary";
type ActiveFilterMode = "all" | "ready" | "quests" | "hunts";

const REGION_NAMES: Record<number, string> = {};
const STORY_CHAINS: TravelStoryChainEntry[] = [];
const REALM_ORDER: Array<{ id: string; name: string }> = [];
const REALM_NAME_BY_ID: Record<string, string> = {};

/** Populate Quest Journal region names, story chains, and realm names from data/travel-catalog.json. */
export function applyAtlasTravelCatalog(catalog: TravelCatalog | null | undefined): void {
  if (!catalog) return;
  if (catalog.regionNames) {
    for (const k of Object.keys(REGION_NAMES)) delete REGION_NAMES[Number(k)];
    for (const [k, v] of Object.entries(catalog.regionNames)) {
      REGION_NAMES[Number(k)] = v;
    }
  }
  if (Array.isArray(catalog.storyChains)) {
    STORY_CHAINS.splice(0, STORY_CHAINS.length, ...catalog.storyChains);
  }
  if (Array.isArray(catalog.realms)) {
    REALM_ORDER.splice(0, REALM_ORDER.length, ...catalog.realms);
    for (const k of Object.keys(REALM_NAME_BY_ID)) delete REALM_NAME_BY_ID[k];
    for (const r of REALM_ORDER) {
      REALM_NAME_BY_ID[r.id] = r.name;
    }
  }
}

export const QuestJournalTab: React.FC<QuestJournalTabProps> = ({
  acceptedQuestIds,
  completedQuestIds = [],
  questProgressById = {},
  trackedQuestKeys = [],
  travelCatalog = null,
  initialFocusRequest = null,
  activeOutpostHunts = [],
  completedOutpostHunts = 0,
  questsCatalog,
  worldLocations,
  discoveredLocations = [],
  sealedPortalIds,
  discoveredMonsterTraits = {},
  battleMonsters = [],
  onAbandonQuest,
  onAbandonOutpostHunt,
  onToggleTrackQuest,
  onLocateInAtlas,
}) => {
  const [subTab, setSubTab] = useState<JournalSubTab>("active");
  const [activeFilter, setActiveFilter] = useState<ActiveFilterMode>("all");
  const [regionFilter, setRegionFilter] = useState<number | "all">("all");
  const [confirmAbandonKey, setConfirmAbandonKey] = useState<string | null>(null);
  const [highlightedKey, setHighlightedKey] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const portals = useMemo(() => worldLocations.filter((l) => Boolean(l.isPortal)), [worldLocations]);
  const bossLocations = useMemo(() => worldLocations.filter((l) => Boolean(l.bossInfo)), [worldLocations]);
  const outposts = useMemo(() => worldLocations.filter((l) => l.id.startsWith("outpost_")), [worldLocations]);
  const locById = useMemo(() => new Map(worldLocations.map((l) => [l.id, l])), [worldLocations]);
  const discoveredSet = useMemo(() => new Set(discoveredLocations), [discoveredLocations]);
  const sealedSet = useMemo(() => new Set(sealedPortalIds), [sealedPortalIds]);
  const acceptedSet = useMemo(() => new Set(acceptedQuestIds), [acceptedQuestIds]);
  const completedSet = useMemo(() => new Set(completedQuestIds), [completedQuestIds]);
  const pinnedSet = useMemo(() => new Set(trackedQuestKeys), [trackedQuestKeys]);
  const effectiveTravelCatalog = useMemo<TravelCatalog | null>(
    () => travelCatalog ?? (STORY_CHAINS.length > 0 ? { version: 1, seaPortRoutes: [], outboundSeaPortalGates: {}, storyChains: STORY_CHAINS } : null),
    [travelCatalog]
  );

  useEffect(() => {
    if (!initialFocusRequest?.key) return;
    setSubTab("active");
    setActiveFilter("all");
    setConfirmAbandonKey(null);
    setHighlightedKey(initialFocusRequest.key);
    const timer = window.setTimeout(() => {
      cardRefs.current[initialFocusRequest.key]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 60);
    return () => window.clearTimeout(timer);
  }, [initialFocusRequest]);

  const questsById = useMemo(
    () => new Map(questsCatalog.map((q) => [q.questId, q])),
    [questsCatalog]
  );

  const activeQuests = useMemo(
    () => acceptedQuestIds.map((qid) => questsById.get(qid)).filter((x): x is QuestEntry => Boolean(x)),
    [acceptedQuestIds, questsById]
  );

  const completedQuests = useMemo(
    () =>
      completedQuestIds
        .map((qid) => questsById.get(qid))
        .filter((x): x is QuestEntry => Boolean(x))
        .sort((a, b) => a.questNum - b.questNum),
    [completedQuestIds, questsById]
  );

  const filteredCompleted = useMemo(
    () => (regionFilter === "all" ? completedQuests : completedQuests.filter((q) => q.region === regionFilter)),
    [completedQuests, regionFilter]
  );

  const readyQuestCount = useMemo(
    () => activeQuests.filter((q) => getHubQuestStage(q.questId, questProgressById, completedSet) === "ready_to_turn_in").length,
    [activeQuests, questProgressById, completedSet]
  );
  const readyHuntCount = useMemo(
    () => activeOutpostHunts.filter((h) => h.killsProgress >= h.killsRequired).length,
    [activeOutpostHunts]
  );
  const totalReadyCount = readyQuestCount + readyHuntCount;

  const filteredActiveHunts = useMemo(() => {
    if (activeFilter === "quests") return [];
    if (activeFilter === "ready") return activeOutpostHunts.filter((h) => h.killsProgress >= h.killsRequired);
    return activeOutpostHunts;
  }, [activeOutpostHunts, activeFilter]);

  const filteredActiveQuests = useMemo(() => {
    if (activeFilter === "hunts") return [];
    if (activeFilter === "ready") {
      return activeQuests.filter((q) => getHubQuestStage(q.questId, questProgressById, completedSet) === "ready_to_turn_in");
    }
    return activeQuests;
  }, [activeQuests, activeFilter, questProgressById, completedSet]);

  const totalActiveCount = acceptedQuestIds.length + activeOutpostHunts.length;
  const activeHuntByOutpost = useMemo(
    () => new Map(activeOutpostHunts.map((h) => [h.outpostId, h])),
    [activeOutpostHunts]
  );

  const subTabs: Array<{ id: JournalSubTab; label: string }> = [
    { id: "active", label: `Active (${totalActiveCount}/${GLOBAL_ACTIVE_QUEST_LIMIT})` },
    { id: "completed", label: `Completed (${completedQuests.length}/${questsCatalog.length || 178})` },
    { id: "chains", label: "Story Chains (4)" },
    { id: "portals", label: `Main Portals (${sealedSet.size}/8)` },
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

      {subTab === "active" && (
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 rounded border border-[#2f3647] bg-[#121621]/95 px-3 py-2">
          <div className="flex flex-wrap items-center gap-3 text-[12px]">
            <span className="font-semibold text-[#e7cf96]">
              Journal Slots:{" "}
              <strong className={totalActiveCount >= GLOBAL_ACTIVE_QUEST_LIMIT ? "text-[#ff9da6]" : "text-[#fff0c2]"}>
                {totalActiveCount} / {GLOBAL_ACTIVE_QUEST_LIMIT}
              </strong>
            </span>
            <span className="text-[#9fb2cb]">
              HUD Pinned:{" "}
              <strong className="text-[#f5d88f]">
                {trackedQuestKeys.length} / {MAX_TRACKED_QUESTS}
              </strong>
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {(
              [
                { id: "all", label: `All (${totalActiveCount})` },
                { id: "ready", label: `Ready (${totalReadyCount})` },
                { id: "quests", label: `Town Quests (${activeQuests.length})` },
                { id: "hunts", label: `Outpost Hunts (${activeOutpostHunts.length})` },
              ] as Array<{ id: ActiveFilterMode; label: string }>
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  audioEngine.playUiClick(0.25);
                  setConfirmAbandonKey(null);
                  setActiveFilter(f.id);
                }}
                className={[
                  "px-2.5 py-0.5 rounded border text-[10.5px] font-semibold cursor-pointer",
                  activeFilter === f.id
                    ? "border-[#d7b267] bg-[#2a2214] text-[#fae2aa]"
                    : "border-[#2f3648] bg-[#161b26] text-[#9eb0c8] hover:border-[#6a5b3e]",
                ].join(" ")}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {subTab === "completed" && (
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 rounded border border-[#2f3647] bg-[#121621]/95 px-3 py-2">
          <div className="flex items-center gap-2.5">
            <QuestCardThumb
              cardId="quest_complete_royal_seal"
              className="w-[34px] h-[34px] rounded border border-[#96783b] bg-[#0b0e14] shrink-0"
            />
            <div className="text-[12px] text-[#e7cf96] font-semibold">
              Completed Quests:{" "}
              <span className="text-[#fff0c2]">
                {completedQuests.length} / {questsCatalog.length || 178}
              </span>
              {completedOutpostHunts > 0 && (
                <span className="text-[#9fb2cb] font-normal ml-2.5">
                  · Outpost Hunts: {completedOutpostHunts}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => {
                audioEngine.playUiClick(0.25);
                setRegionFilter("all");
              }}
              className={[
                "px-2 py-0.5 rounded border text-[10.5px] font-semibold cursor-pointer",
                regionFilter === "all"
                  ? "border-[#d7b267] bg-[#2a2214] text-[#fae2aa]"
                  : "border-[#2f3648] bg-[#161b26] text-[#9eb0c8] hover:border-[#6a5b3e]",
              ].join(" ")}
            >
              All
            </button>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((reg) => (
              <button
                key={reg}
                type="button"
                onClick={() => {
                  audioEngine.playUiClick(0.25);
                  setRegionFilter(reg);
                }}
                className={[
                  "px-2 py-0.5 rounded border text-[10.5px] font-semibold cursor-pointer",
                  regionFilter === reg
                    ? "border-[#d7b267] bg-[#2a2214] text-[#fae2aa]"
                    : "border-[#2f3648] bg-[#161b26] text-[#9eb0c8] hover:border-[#6a5b3e]",
                ].join(" ")}
              >
                R{reg}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-2.5 content-start pr-1">
        {subTab === "active" &&
          (filteredActiveQuests.length === 0 && filteredActiveHunts.length === 0 ? (
            <div className="col-span-full py-8 text-center text-[12.5px] text-[#8d99b0]">
              {activeQuests.length === 0 && activeOutpostHunts.length === 0
                ? "No active quests or hunts yet. Speak with townsfolk in settlements or Hunt Quartermasters at Zone Outposts."
                : "No active quests match this filter."}
            </div>
          ) : (
            <>
              {filteredActiveHunts.map((h) => {
                const ready = h.killsProgress >= h.killsRequired;
                const pct = Math.min(100, Math.round((h.killsProgress / Math.max(1, h.killsRequired)) * 100));
                const lore = resolveOutpostHuntLore(h.mobId, h.mobName, h.outpostName, h.zoneNum, h.biomeHints);
                const trackKey = makeHuntTrackKey(h.outpostId);
                const isPinned = pinnedSet.has(trackKey);
                const isFocused = highlightedKey === trackKey;
                const isConfirming = confirmAbandonKey === trackKey;
                const outpostLoc = locById.get(h.outpostId);
                return (
                  <div
                    key={h.huntId}
                    ref={(el) => {
                      cardRefs.current[trackKey] = el;
                    }}
                    className={[
                      "rounded border bg-[#121621]/95 p-3 flex gap-3 items-start transition-shadow",
                      ready ? "border-[#c49c48]" : isPinned ? "border-[#7c6438]" : "border-[#2f3647]",
                      isFocused ? "ring-2 ring-[#f0c76e]/70 shadow-[0_0_20px_rgba(240,199,110,0.22)]" : "",
                    ].join(" ")}
                  >
                    <div className="flex flex-col gap-1 shrink-0">
                      <QuestCardThumb
                        cardId={h.isElite ? "quest_outpost_elite_contract" : "quest_outpost_hunt_board"}
                        fallbackPath={h.mobIconPath}
                        badgeCardId={ready ? "quest_complete_royal_seal" : undefined}
                        alt={h.mobName}
                        className="w-[74px] h-[74px] rounded border border-[#7c6438] bg-[#0b0e14] shrink-0 shadow"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-[13.5px] font-bold text-[#fae2aa] leading-snug">
                          {lore.contractTitle}
                        </div>
                        <span
                          className={[
                            "px-1.5 py-0.5 rounded border text-[10px] font-semibold shrink-0",
                            ready
                              ? "border-[#e6c170] bg-[#2d2311] text-[#ffe9ad]"
                              : "border-[#3c6a5c] bg-[#132620] text-[#95e2be]",
                          ].join(" ")}
                        >
                          {ready
                            ? "★ Return to Outpost"
                            : `Slay ${h.killsProgress}/${h.killsRequired} ${pluralizeMonsterName(h.mobName, h.killsRequired)}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <img
                          src={assetUrl(h.mobIconPath)}
                          alt=""
                          draggable={false}
                          className="w-[22px] h-[22px] rounded border border-[#404b62] bg-[#0b0e15] object-contain shrink-0"
                        />
                        <div className="text-[11px] text-[#9db0c8] truncate">
                          Outpost Hunt · {h.outpostName} · Zone {h.zoneNum} Wilds
                        </div>
                      </div>
                      <div className="mt-1.5 h-[6px] w-full rounded-full bg-[#1a202d] overflow-hidden border border-[#2d3648]">
                        <div
                          className={["h-full transition-all", ready ? "bg-[#f0c76e]" : "bg-[#4ebd8c]"].join(" ")}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="m-0 mt-1.5 text-[11.5px] text-[#cfd8e8] leading-snug">{lore.threatSummary}</p>
                      <div className="mt-1.5 text-[11px] text-[#a7e6c3]">
                        <strong className="text-[#d9f7e7]">Next Step:</strong>{" "}
                        {ready
                          ? `Return to Quartermaster at ${h.outpostName} to claim reward`
                          : h.biomeHints.length > 0
                            ? `Hunt in ${h.biomeHints.slice(0, 3).join(", ")} inside Zone ${h.zoneNum}`
                            : `Hunt in Zone ${h.zoneNum} Wilds`}
                      </div>
                      <div className="mt-2 pt-2 border-t border-[#232a3a] flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-[#f4cf80] truncate">
                          {formatOutpostRewardLine(h)}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {onToggleTrackQuest && (
                            <button
                              type="button"
                              onClick={() => onToggleTrackQuest(trackKey)}
                              className={[
                                "px-2 py-0.5 rounded border text-[10.5px] font-semibold cursor-pointer transition-colors",
                                isPinned
                                  ? "border-[#e6c170] bg-[#2e2412] text-[#ffe9a8]"
                                  : "border-[#3f495e] bg-[#171d2a] hover:border-[#b99653] text-[#c7d4e8]",
                              ].join(" ")}
                              title={isPinned ? "Unpin from HUD Tracker" : "Pin to HUD Tracker"}
                            >
                              {isPinned ? "◆ Pinned" : "Pin"}
                            </button>
                          )}
                          {onLocateInAtlas && outpostLoc && (
                            <button
                              type="button"
                              onClick={() => {
                                audioEngine.playUiClick(0.3);
                                onLocateInAtlas(outpostLoc.id, outpostLoc.mapId);
                              }}
                              className="px-2 py-0.5 rounded border border-[#3d526e] hover:border-[#78aee8] bg-[#141d2b] text-[10.5px] font-semibold text-[#b9d9ff] cursor-pointer"
                            >
                              Locate
                            </button>
                          )}
                          {isConfirming ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  audioEngine.playUiClick(0.35);
                                  setConfirmAbandonKey(null);
                                  onAbandonOutpostHunt?.(h.outpostId);
                                }}
                                className="px-2 py-0.5 rounded border border-[#d46974] bg-[#5c1e26] hover:bg-[#762630] text-[10.5px] font-bold text-[#ffe6e9] cursor-pointer"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  audioEngine.playUiClick(0.25);
                                  setConfirmAbandonKey(null);
                                }}
                                className="px-2 py-0.5 rounded border border-[#454d60] bg-[#1a202d] text-[10.5px] font-semibold text-[#cfd7e6] cursor-pointer"
                              >
                                Keep
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                audioEngine.playUiClick(0.28);
                                setConfirmAbandonKey(trackKey);
                              }}
                              className="px-2.5 py-0.5 rounded border border-[#4f566a] hover:border-[#d46974] bg-[#1b202d] text-[10.5px] font-semibold text-[#d7dfee] hover:text-[#ffb4bc] cursor-pointer"
                            >
                              Abandon
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredActiveQuests.map((q) => {
                const trackKey = makeQuestTrackKey(q.questId);
                const isPinned = pinnedSet.has(trackKey);
                const isFocused = highlightedKey === trackKey;
                const isConfirming = confirmAbandonKey === trackKey;
                const stage = getHubQuestStage(q.questId, questProgressById, completedSet);
                const objMeta = resolveQuestObjectiveMeta(q, stage, worldLocations);
                const chainInfo = getQuestStoryChainInfo(q.questId, effectiveTravelCatalog, questsById, completedSet);
                return (
                  <div
                    key={q.questId}
                    ref={(el) => {
                      cardRefs.current[trackKey] = el;
                    }}
                    className={[
                      "rounded border bg-[#121621]/95 p-3 flex gap-3 items-start transition-shadow",
                      objMeta.readyToTurnIn
                        ? "border-[#c49c48]"
                        : isPinned
                          ? "border-[#7c6438]"
                          : "border-[#2f3647]",
                      isFocused ? "ring-2 ring-[#f0c76e]/70 shadow-[0_0_20px_rgba(240,199,110,0.22)]" : "",
                    ].join(" ")}
                  >
                    <QuestCardThumb
                      cardId={q.questId}
                      fallbackPath={q.assetPath}
                      badgeCardId={objMeta.readyToTurnIn ? "quest_complete_royal_seal" : undefined}
                      alt={q.title}
                      className="w-[74px] h-[74px] rounded border border-[#7c6438] bg-[#0b0e14] shrink-0 shadow"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-[13.5px] font-bold text-[#fae2aa] leading-snug">{q.title}</div>
                        <div className="flex items-center gap-1 shrink-0">
                          {objMeta.readyToTurnIn && (
                            <span className="px-1.5 py-0.5 rounded border border-[#e6c170] bg-[#2d2311] text-[10px] font-bold text-[#ffe9ad]">
                              ★ Turn In
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 rounded border border-[#454f63] bg-[#171d2a] text-[10px] font-semibold text-[#bfd0e8]">
                            {objMeta.kindLabel}
                          </span>
                        </div>
                      </div>
                      <div className="text-[11px] text-[#9db0c8] mt-0.5">
                        {REGION_NAMES[q.region] ? `${REGION_NAMES[q.region]} · ` : ""}
                        {q.hubName} · {q.giver}
                        {chainInfo ? ` · Story Part ${chainInfo.stepIndex + 1}/${chainInfo.totalSteps}` : ""}
                      </div>
                      <p className="m-0 mt-1.5 text-[11.5px] text-[#cfd8e8] leading-snug">{q.description}</p>
                      <div className="mt-1.5 text-[11px] text-[#a7e6c3]">
                        <strong className="text-[#d9f7e7]">Next Step:</strong> {objMeta.nextStepText}
                      </div>
                      <div className="mt-2 pt-2 border-t border-[#232a3a] flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-[#f4cf80] truncate">{formatRewardLine(q.reward)}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {onToggleTrackQuest && (
                            <button
                              type="button"
                              onClick={() => onToggleTrackQuest(trackKey)}
                              className={[
                                "px-2 py-0.5 rounded border text-[10.5px] font-semibold cursor-pointer transition-colors",
                                isPinned
                                  ? "border-[#e6c170] bg-[#2e2412] text-[#ffe9a8]"
                                  : "border-[#3f495e] bg-[#171d2a] hover:border-[#b99653] text-[#c7d4e8]",
                              ].join(" ")}
                              title={isPinned ? "Unpin from HUD Tracker" : "Pin to HUD Tracker"}
                            >
                              {isPinned ? "◆ Pinned" : "Pin"}
                            </button>
                          )}
                          {onLocateInAtlas && (
                            <button
                              type="button"
                              onClick={() => {
                                audioEngine.playUiClick(0.3);
                                onLocateInAtlas(objMeta.locateLocId, objMeta.locateMapId);
                              }}
                              className="px-2 py-0.5 rounded border border-[#3d526e] hover:border-[#78aee8] bg-[#141d2b] text-[10.5px] font-semibold text-[#b9d9ff] cursor-pointer"
                            >
                              Locate
                            </button>
                          )}
                          {isConfirming ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  audioEngine.playUiClick(0.35);
                                  setConfirmAbandonKey(null);
                                  onAbandonQuest(q.questId);
                                }}
                                className="px-2 py-0.5 rounded border border-[#d46974] bg-[#5c1e26] hover:bg-[#762630] text-[10.5px] font-bold text-[#ffe6e9] cursor-pointer"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  audioEngine.playUiClick(0.25);
                                  setConfirmAbandonKey(null);
                                }}
                                className="px-2 py-0.5 rounded border border-[#454d60] bg-[#1a202d] text-[10.5px] font-semibold text-[#cfd7e6] cursor-pointer"
                              >
                                Keep
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                audioEngine.playUiClick(0.28);
                                setConfirmAbandonKey(trackKey);
                              }}
                              className="px-2.5 py-0.5 rounded border border-[#4f566a] hover:border-[#d46974] bg-[#1b202d] text-[10.5px] font-semibold text-[#d7dfee] hover:text-[#ffb4bc] cursor-pointer"
                            >
                              Abandon
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          ))}

        {subTab === "completed" &&
          (filteredCompleted.length === 0 ? (
            <div className="col-span-full py-8 text-center text-[12.5px] text-[#8d99b0]">
              {completedQuests.length === 0
                ? "No completed quests yet. Finished hub contracts are archived here with their Quest Cards and Royal Victory Seals."
                : `No completed quests recorded in Region ${regionFilter} (${REGION_NAMES[Number(regionFilter)] ?? ""}) yet.`}
            </div>
          ) : (
            filteredCompleted.map((q) => (
              <div key={q.questId} className="rounded border border-[#4b4028] bg-[#121621]/95 p-3 flex gap-3 items-start">
                <QuestCardThumb
                  cardId={q.questId}
                  fallbackPath={q.assetPath}
                  badgeCardId="quest_complete_royal_seal"
                  alt={q.title}
                  className="w-[74px] h-[74px] rounded border border-[#9a7b3f] bg-[#0b0e14] shrink-0 shadow"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-[13.5px] font-bold text-[#f7dfa4] leading-snug">{q.title}</div>
                    <span className="px-1.5 py-0.5 rounded border border-[#96783b] bg-[#2a2214] text-[10px] font-bold text-[#f5d88f] shrink-0">
                      ★ Completed
                    </span>
                  </div>
                  <div className="text-[11px] text-[#9db0c8] mt-0.5">
                    {REGION_NAMES[q.region] ? `${REGION_NAMES[q.region]} · ` : ""}
                    {q.hubName} · {q.giver}
                  </div>
                  <p className="m-0 mt-1.5 text-[11.5px] text-[#b9c5d8] leading-snug">{q.description}</p>
                  <div className="mt-2 text-[11px] font-semibold text-[#d9bd7c] truncate">Earned: {formatRewardLine(q.reward)}</div>
                </div>
              </div>
            ))
          ))}

        {subTab === "portals" &&
          portals.map((p, i) => {
            const sealed = sealedSet.has(p.id);
            const catQuestId = p.catalyst?.questId;
            const catQuest = catQuestId ? questsById.get(catQuestId) : undefined;
            const catDone = Boolean(catQuestId && completedSet.has(catQuestId));
            const catActive = Boolean(catQuestId && acceptedSet.has(catQuestId));
            const catStatus: QuestReferenceStatus = sealed || catDone ? "completed" : catActive ? "active" : "required";
            return (
              <div key={p.id} className="rounded border border-[#2f3647] bg-[#121621]/95 p-3 flex flex-col gap-2.5">
                <div className="flex gap-3 items-start">
                  <img
                    src={assetUrl(sealed ? p.assetPath.replace(/\.webp$/, "_closed.webp") : p.assetPath)}
                    alt={p.name}
                    className="w-[54px] h-[54px] rounded border border-[#5a492e] bg-[#0b0e14] object-contain shrink-0"
                    draggable={false}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[13.5px] font-bold text-[#fae2aa] truncate">
                        Portal #{i + 1}: {p.name} ·{" "}
                        <span className={sealed ? "text-[#72e3a8]" : "text-[#f28b95]"}>
                          {sealed ? "DESTROYED" : "OPEN"}
                        </span>
                      </div>
                      {onLocateInAtlas && discoveredSet.has(p.id) && (
                        <button
                          type="button"
                          onClick={() => {
                            audioEngine.playUiClick(0.3);
                            onLocateInAtlas(p.id, p.mapId);
                          }}
                          className="px-2 py-0.5 rounded border border-[#3d526e] hover:border-[#78aee8] bg-[#141d2b] text-[10px] font-semibold text-[#b9d9ff] cursor-pointer shrink-0"
                        >
                          Locate
                        </button>
                      )}
                    </div>
                    <div className="text-[11.5px] text-[#b4c2d7] mt-0.5">
                      Boss: {p.bossInfo?.boss} ({p.bossInfo?.plane})
                    </div>
                    <div className="text-[11px] font-semibold text-[#e6c278] mt-0.5 truncate">
                      Weaknesses: {p.bossInfo?.weaknesses}
                    </div>
                  </div>
                </div>
                {catQuestId && p.catalyst?.questTitle ? (
                  <QuestReferenceCard
                    variant="compact"
                    cardId={catQuestId}
                    fallbackPath={catQuest?.assetPath}
                    eyebrow={`Catalyst Quest · ${p.catalyst.hubName}`}
                    title={p.catalyst.questTitle}
                    subtitle={`Reward: ${p.catalyst.name}`}
                    status={catStatus}
                  />
                ) : (
                  <div className="flex items-center gap-2 text-[11px] text-[#95a6be]">
                    <QuestCardThumb
                      cardId="quest_portal_catalyst_seal"
                      fallbackPath="assets/icons/ui/ui_18_key_glyph.webp"
                      className="w-[24px] h-[24px] rounded border border-[#4a5770] bg-[#0b0e14] shrink-0"
                    />
                    <span className="truncate">Catalyst: {p.catalyst?.name || "Regional Key"}</span>
                  </div>
                )}
              </div>
            );
          })}

        {subTab === "chains" &&
          STORY_CHAINS.map((c) => {
            const doneCount = c.questIds.filter((qid) => completedSet.has(qid)).length;
            return (
              <div key={c.id} className="rounded border border-[#2f3647] bg-[#121621]/95 p-3 flex flex-col gap-2.5">
                <div className="flex gap-3 items-start">
                  <QuestCardThumb
                    cardId={c.cardId}
                    alt={c.title}
                    className="w-[62px] h-[62px] rounded border border-[#7c6438] bg-[#0b0e14] shrink-0 shadow"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[13.5px] font-bold text-[#fae2aa] leading-snug">{c.title}</div>
                      <span className="px-1.5 py-0.5 rounded border border-[#4b566c] bg-[#182030] text-[10px] font-semibold text-[#dce5f5] shrink-0">
                        {doneCount}/{c.questIds.length}
                      </span>
                    </div>
                    <div className="text-[11.5px] text-[#cfd8e8] mt-1 leading-snug">{c.route}</div>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  {c.questIds.map((qid, idx) => {
                    const entry = questsById.get(qid);
                    const isDone = completedSet.has(qid);
                    const isActive = acceptedSet.has(qid);
                    const prevDone = idx === 0 || completedSet.has(c.questIds[idx - 1]);
                    const stepStatus: QuestReferenceStatus = isDone
                      ? "completed"
                      : isActive
                        ? "active"
                        : prevDone
                          ? "available"
                          : "required";
                    return (
                      <QuestReferenceCard
                        key={qid}
                        variant="compact"
                        cardId={qid}
                        fallbackPath={entry?.assetPath}
                        eyebrow={`Part ${idx + 1}${entry?.hubName ? ` · ${entry.hubName}` : ""}`}
                        title={entry?.title ?? qid}
                        subtitle={entry ? formatRewardLine(entry.reward) : undefined}
                        status={stepStatus}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}

        {subTab === "hunts" && (
          <>
            <div className="col-span-full rounded border border-[#3a4254] bg-[#121621]/95 p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <QuestCardThumb
                  cardId="quest_outpost_hunt_board"
                  className="w-[52px] h-[52px] rounded border border-[#7c6438] bg-[#0b0e14] shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-[13.5px] font-bold text-[#fae2aa]">Zone Outpost Monster Hunts</div>
                  <div className="text-[11.5px] text-[#b4c2d7] mt-0.5">
                    Speak with an Outpost Quartermaster to hunt monsters naturally found in that zone&apos;s wilds—no map markers are placed.
                  </div>
                </div>
              </div>
              <div className="px-3 py-1.5 rounded border border-[#6e5832] bg-[#1d1912] text-right shrink-0">
                <div className="text-[10px] uppercase tracking-wider text-[#bba476]">Completed</div>
                <div className="text-[15px] font-bold text-[#fae2aa]">{completedOutpostHunts}</div>
              </div>
            </div>
            {outposts.map((o, idx) => {
              const activeHunt = activeHuntByOutpost.get(o.id);
              const ready = Boolean(activeHunt && activeHunt.killsProgress >= activeHunt.killsRequired);
              return (
                <div
                  key={o.id}
                  className={[
                    "rounded border bg-[#121621]/95 p-3 flex gap-3 items-center",
                    ready ? "border-[#c49c48]" : activeHunt ? "border-[#3c6a5c]" : "border-[#2f3647]",
                  ].join(" ")}
                >
                  <QuestCardThumb
                    cardId={activeHunt?.isElite || idx % 2 === 1 ? "quest_outpost_elite_contract" : "quest_outpost_hunt_board"}
                    fallbackPath={activeHunt?.mobIconPath || o.assetPath}
                    badgeCardId={ready ? "quest_complete_royal_seal" : undefined}
                    alt={o.name}
                    className="w-[52px] h-[52px] rounded border border-[#5a492e] bg-[#0b0e14] shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[13.5px] font-bold text-[#fae2aa] truncate">{o.name}</div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {activeHunt && (
                          <span
                            className={[
                              "px-1.5 py-0.5 rounded border text-[10px] font-semibold",
                              ready
                                ? "border-[#e6c170] bg-[#2d2311] text-[#ffe9ad]"
                                : "border-[#3c6a5c] bg-[#132620] text-[#95e2be]",
                            ].join(" ")}
                          >
                            {ready
                              ? `★ ${activeHunt.mobName} Ready`
                              : `${activeHunt.mobName} ${activeHunt.killsProgress}/${activeHunt.killsRequired}`}
                          </span>
                        )}
                        {onLocateInAtlas && (discoveredSet.has(o.id) || Boolean(activeHunt)) && (
                          <button
                            type="button"
                            onClick={() => {
                              audioEngine.playUiClick(0.3);
                              onLocateInAtlas(o.id, o.mapId);
                            }}
                            className="px-2 py-0.5 rounded border border-[#3d526e] hover:border-[#78aee8] bg-[#141d2b] text-[10px] font-semibold text-[#b9d9ff] cursor-pointer"
                          >
                            Locate
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-[11px] text-[#9bb0c9] mt-0.5 truncate">
                      {activeHunt
                        ? `${o.playerRegion || o.mapId} · Active Zone ${activeHunt.zoneNum} Hunt`
                        : `${o.playerRegion || o.mapId} · Repeatable Zone Monster Hunt`}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {subTab === "bestiary" && (
          <>
            {bossLocations.map((p) => {
              const bossWeakIcons = resolveDamageTypeIcons(p.bossInfo?.weaknesses);
              return (
                <div key={p.id} className="rounded border border-[#2f3647] bg-[#121621]/95 p-3 flex gap-3 items-center">
                  <img
                    src={assetUrl("assets/icons/ui/ui_24_bestiary_skull_glyph.webp")}
                    alt=""
                    className="w-[44px] h-[44px] rounded border border-[#5a492e] bg-[#0b0e14] object-contain shrink-0"
                    draggable={false}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-bold text-[#fae2aa]">{p.bossInfo?.boss}</div>
                    <div className="text-[11px] text-[#9eb0c9]">
                      {p.bossInfo?.plane} · Guard Points: {p.bossInfo?.guardPips ?? 4}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#f5cf80]">Weaknesses:</span>
                      {bossWeakIcons.length > 0 ? (
                        bossWeakIcons.map((dt) => (
                          <span
                            key={dt.id}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-[#ff9c42]/75 bg-[#2a170b] text-[#ffe08a] text-[10.5px] font-bold"
                          >
                            <img src={assetUrl(dt.iconPath)} alt="" className="w-3.5 h-3.5 rounded-[2px] object-cover" draggable={false} />
                            {dt.label} 1.5×
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] font-semibold text-[#f5cf80]">{p.bossInfo?.weaknesses}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {(() => {
              const monstersById = new Map(battleMonsters.map((m) => [m.id, m]));
              const entries = Object.entries(discoveredMonsterTraits)
                .map(([mobId, traits]) => ({ mobId, traits, def: monstersById.get(mobId) }))
                .filter((x): x is { mobId: string; traits: { weak?: string[]; resist?: string[]; immune?: string[] }; def: BattleEnemyDef } =>
                  Boolean(x.def && !x.def.isBoss && ((x.traits.weak?.length ?? 0) > 0 || (x.traits.resist?.length ?? 0) > 0 || (x.traits.immune?.length ?? 0) > 0))
                )
                .sort((a, b) => (a.def.level ?? 1) - (b.def.level ?? 1) || a.def.name.localeCompare(b.def.name));
              if (entries.length === 0) return null;
              return (
                <>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#aebcd4] pt-2 border-t border-[#262e40]">
                    Discovered Field Monsters ({entries.length})
                  </div>
                  {entries.map(({ mobId, traits, def }) => (
                    <div key={mobId} className="rounded border border-[#2c3446] bg-[#121621]/95 p-2.5 flex gap-3 items-center">
                      <img
                        src={assetUrl(def.iconPath)}
                        alt={def.name}
                        className="w-[44px] h-[44px] rounded border border-[#4a546d] bg-[#0b0e14] object-contain shrink-0"
                        draggable={false}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[13px] font-bold text-[#f3e2b7] truncate">{def.name}</span>
                          <span className="text-[10.5px] font-semibold text-[#9eb0c9] shrink-0">Lv {def.level ?? 1} · {def.role ?? "Enemy"}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          {(traits.weak ?? []).map((w) => {
                            const dt = resolveDamageTypeIcons(w)[0];
                            if (!dt) return null;
                            return (
                              <span
                                key={`w_${dt.id}`}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-[#ff9c42]/75 bg-[#2a170b] text-[#ffe08a] text-[10px] font-bold"
                              >
                                <img src={assetUrl(dt.iconPath)} alt="" className="w-3.5 h-3.5 rounded-[2px] object-cover" draggable={false} />
                                {dt.label} 1.5×
                              </span>
                            );
                          })}
                          {(traits.resist ?? []).map((r) => {
                            const dt = resolveDamageTypeIcons(r)[0];
                            if (!dt) return null;
                            return (
                              <span
                                key={`r_${dt.id}`}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-[#63aee8]/75 bg-[#0e2033] text-[#b8e1ff] text-[10px] font-bold"
                              >
                                <img src={assetUrl(dt.iconPath)} alt="" className="w-3.5 h-3.5 rounded-[2px] object-cover" draggable={false} />
                                {dt.label} 0.5×
                              </span>
                            );
                          })}
                          {(traits.immune ?? []).map((im) => {
                            const dt = resolveDamageTypeIcons(im)[0];
                            if (!dt) return null;
                            return (
                              <span
                                key={`i_${dt.id}`}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-[#dce4f0]/75 bg-[#1b2029] text-[#ffffff] text-[10px] font-bold"
                              >
                                <img src={assetUrl(dt.iconPath)} alt="" className="w-3.5 h-3.5 rounded-[2px] object-cover" draggable={false} />
                                {dt.label} 0×
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              );
            })()}
          </>
        )}
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
  questProgressById?: Record<string, ActiveQuestProgress>;
  activeOutpostHunts?: ActiveOutpostHunt[];
  questsCatalog: QuestEntry[];
  sealedPortalIds: string[];
  focusRequest?: { locId: string; mapId: string; seq: number } | null;
}

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
  questProgressById = {},
  activeOutpostHunts = [],
  questsCatalog,
  sealedPortalIds,
  focusRequest = null,
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
  const skipNextRealmPanResetRef = useRef(false);
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
      if (!activeSet.has(q.questId)) continue;
      const stage = questProgressById[q.questId]?.stage ?? "active";
      const objMeta = resolveQuestObjectiveMeta(q, stage, worldLocations);
      if (objMeta.locateMapId !== atlasMapId && q.mapId !== atlasMapId) continue;
      const targets = new Set<string>();
      if (q.markerId && q.questFormat === "wilderness_pin") targets.add(q.markerId);
      if (q.targetHubId) targets.add(q.targetHubId);
      if (q.questFormat === "hub_interior" || objMeta.readyToTurnIn) targets.add(q.hubId);
      for (const targetId of targets) {
        const arr = map.get(targetId) ?? [];
        arr.push(q);
        map.set(targetId, arr);
      }
    }
    return map;
  }, [acceptedQuestIds, questProgressById, questsCatalog, atlasMapId, worldLocations]);

  const huntTargetsByOutpost = useMemo(() => {
    const map = new Map<string, ActiveOutpostHunt>();
    for (const h of activeOutpostHunts) {
      map.set(h.outpostId, h);
    }
    return map;
  }, [activeOutpostHunts]);

  // Earned pins only: discovered permanent places + active quest/hunt targets (never spoil unvisited wilds)
  const visibleLocations = useMemo(
    () =>
      worldLocations.filter((l) => {
        if (!l.placed || l.mapId !== atlasMapId || l.x === null || l.y === null) return false;
        const hasQuest = questTargetsByLoc.has(l.id) || huntTargetsByOutpost.has(l.id);
        if (l.category === "quest_field") return questTargetsByLoc.has(l.id);
        return discoveredSet.has(l.id) || hasQuest;
      }),
    [worldLocations, atlasMapId, discoveredSet, questTargetsByLoc, huntTargetsByOutpost]
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

  // Keep pan clamped on initial mount around player unless jumping via Journal Locate
  useEffect(() => {
    if (skipNextRealmPanResetRef.current) {
      skipNextRealmPanResetRef.current = false;
      return;
    }
    if (atlasMapId === currentMapId) {
      setPan(clampPanForViewport(playerX, playerY, zoom));
    }
    // Run only when switching realm tab or first mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atlasMapId]);

  useEffect(() => {
    if (!focusRequest) return;
    const loc = worldLocations.find((l) => l.id === focusRequest.locId);
    if (!loc || !loc.placed || loc.x === null || loc.y === null) return;
    if (atlasMapId !== focusRequest.mapId) {
      skipNextRealmPanResetRef.current = true;
      setAtlasMapId(focusRequest.mapId);
    }
    setSelectedLocId(loc.id);
    const nextZ = Math.max(zoom, 1.9);
    setZoom(nextZ);
    setPan(clampPanForViewport(loc.x, loc.y, nextZ));
    // Trigger only when Locate is clicked from Journal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest]);

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

        const activeHunt = huntTargetsByOutpost.get(loc.id);
        const isQuest = questTargetsByLoc.has(loc.id) || Boolean(activeHunt);
        const hasReadyTurnIn =
          Boolean(activeHunt && activeHunt.killsProgress >= activeHunt.killsRequired) ||
          (questTargetsByLoc.get(loc.id) ?? []).some((q) => questProgressById[q.questId]?.stage === "ready_to_turn_in");
        const isPortal = Boolean(loc.isPortal);
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

        // Active Quest / Hunt pill above pin
        if (isQuest) {
          const badgeText = hasReadyTurnIn
            ? "★ Turn In"
            : activeHunt && !questTargetsByLoc.has(loc.id)
              ? "Hunt!"
              : "Quest!";
          drawRoundedPill(ctx, sx, sy - r - 21, badgeText, "rgba(38, 25, 8, 0.94)", "#ffbe4f", "#ffe39f", 10);
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
    huntTargetsByOutpost,
    questProgressById,
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
              {REALM_NAME_BY_ID[atlasMapId] ?? "The Crownlands"}
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
            const activeHunt = huntTargetsByOutpost.get(hoveredLoc.id);
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

                {(activeQuests.length > 0 || activeHunt) && (
                  <div className="mt-1.5 pt-1.5 border-t border-[#3b2f1c] flex flex-col gap-1">
                    {activeHunt && (
                      <div className="flex items-center gap-2 text-[10.5px] text-[#9be8be] leading-snug">
                        <QuestCardThumb
                          cardId={activeHunt.isElite ? "quest_outpost_elite_contract" : "quest_outpost_hunt_board"}
                          fallbackPath={activeHunt.mobIconPath}
                          badgeCardId={activeHunt.killsProgress >= activeHunt.killsRequired ? "quest_complete_royal_seal" : undefined}
                          alt={activeHunt.mobName}
                          className="w-[24px] h-[24px] rounded border border-[#967741] bg-[#090c12] shrink-0"
                        />
                        <span className="truncate font-semibold">
                          {activeHunt.killsProgress >= activeHunt.killsRequired
                            ? `★ Hunt Ready: ${activeHunt.mobName}`
                            : `Hunt: ${activeHunt.mobName} (${activeHunt.killsProgress}/${activeHunt.killsRequired})`}
                        </span>
                      </div>
                    )}
                    {activeQuests.map((q) => (
                      <div key={q.questId} className="flex items-center gap-2 text-[10.5px] text-[#ffdfa0] leading-snug">
                        <QuestCardThumb
                          cardId={q.questId}
                          fallbackPath={q.assetPath}
                          alt={q.title}
                          className="w-[24px] h-[24px] rounded border border-[#967741] bg-[#090c12] shrink-0"
                        />
                        <span className="truncate font-semibold">{q.title}</span>
                      </div>
                    ))}
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
                const locQuests = questTargetsByLoc.get(l.id) ?? [];
                const locHunt = huntTargetsByOutpost.get(l.id);
                const hasQuest = locQuests.length > 0 || Boolean(locHunt);
                const isSelected = l.id === selectedLocId || l.id === hoveredLocId;
                const badgeCardId = locQuests[0]?.questId ?? (locHunt?.isElite ? "quest_outpost_elite_contract" : "quest_outpost_hunt_board");
                const badgeFallback = locQuests[0]?.assetPath ?? locHunt?.mobIconPath;
                const badgeText =
                  locQuests.length > 1
                    ? `Quests (${locQuests.length})`
                    : locQuests.length === 1
                      ? "Quest"
                      : locHunt && locHunt.killsProgress >= locHunt.killsRequired
                        ? "★ Hunt"
                        : "Hunt";
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
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#30220d] border border-[#a87c32] text-[#ffd98e] text-[9.5px] font-bold shrink-0">
                            <QuestCardThumb
                              cardId={badgeCardId}
                              fallbackPath={badgeFallback}
                              className="w-[14px] h-[14px] rounded-[2px] border border-[#8e6f35] bg-[#090c12] shrink-0"
                            />
                            {badgeText}
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
