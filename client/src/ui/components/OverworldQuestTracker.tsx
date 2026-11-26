import React, { useMemo, useState } from "react";
import { audioEngine } from "../audio";
import { resolveOutpostHuntLore } from "../quests/outpostHuntLore";
import { pluralizeMonsterName } from "../quests/outpostHunts";
import {
  getHubQuestStage,
  makeHuntTrackKey,
  makeQuestTrackKey,
  MAX_TRACKED_QUESTS,
  resolveQuestObjectiveMeta,
} from "../quests/questUtils";
import type { ActiveOutpostHunt, ActiveQuestProgress, QuestEntry, WorldLocation } from "../types";
import { QuestCardThumb } from "./QuestCardThumb";

export { MAX_TRACKED_QUESTS };

interface OverworldQuestTrackerProps {
  mapId: string;
  currentZoneCode?: number | null;
  acceptedQuestIds: string[];
  completedQuestIds: string[];
  questProgressById?: Record<string, ActiveQuestProgress>;
  trackedQuestKeys?: string[];
  activeOutpostHunts: ActiveOutpostHunt[];
  questsCatalog: QuestEntry[];
  worldLocations: WorldLocation[];
  onOpenJournal: (focusTrackKey?: string) => void;
}

type TrackerRow =
  | {
      kind: "hunt";
      id: string;
      trackKey: string;
      pinned: boolean;
      pinOrder: number;
      ready: boolean;
      hunt: ActiveOutpostHunt;
      title: string;
      subtitle: string;
    }
  | {
      kind: "quest";
      id: string;
      trackKey: string;
      pinned: boolean;
      pinOrder: number;
      ready: boolean;
      badgeLabel: string;
      quest: QuestEntry;
      title: string;
      subtitle: string;
    };

export const OverworldQuestTracker: React.FC<OverworldQuestTrackerProps> = ({
  mapId,
  currentZoneCode,
  acceptedQuestIds,
  completedQuestIds,
  questProgressById = {},
  trackedQuestKeys = [],
  activeOutpostHunts,
  questsCatalog,
  worldLocations,
  onOpenJournal,
}) => {
  void mapId;
  void currentZoneCode;
  const [collapsed, setCollapsed] = useState(false);

  const completedSet = useMemo(() => new Set(completedQuestIds), [completedQuestIds]);

  const { rows, totalActive } = useMemo(() => {
    const pinIndexByKey = new Map<string, number>();
    trackedQuestKeys.forEach((k, idx) => pinIndexByKey.set(k, idx));

    const items: TrackerRow[] = [];

    for (const h of activeOutpostHunts) {
      const ready = h.killsProgress >= h.killsRequired;
      const lore = resolveOutpostHuntLore(h.mobId, h.mobName, h.outpostName, h.zoneNum);
      const trackKey = makeHuntTrackKey(h.outpostId);
      const pinIdx = pinIndexByKey.get(trackKey);

      items.push({
        kind: "hunt",
        id: trackKey,
        trackKey,
        pinned: pinIdx !== undefined,
        pinOrder: pinIdx ?? 999,
        ready,
        hunt: h,
        title: lore.contractTitle,
        subtitle: ready
          ? `Return to ${h.outpostName}`
          : `${pluralizeMonsterName(h.mobName, h.killsRequired)} · ${h.outpostName}`,
      });
    }

    for (const qid of acceptedQuestIds) {
      if (completedSet.has(qid)) continue;
      const q = questsCatalog.find((entry) => entry.questId === qid);
      if (!q) continue;
      const stage = getHubQuestStage(qid, questProgressById, completedSet);
      const objMeta = resolveQuestObjectiveMeta(q, stage, worldLocations);
      const trackKey = makeQuestTrackKey(q.questId);
      const pinIdx = pinIndexByKey.get(trackKey);

      items.push({
        kind: "quest",
        id: trackKey,
        trackKey,
        pinned: pinIdx !== undefined,
        pinOrder: pinIdx ?? 999,
        ready: objMeta.readyToTurnIn,
        badgeLabel: objMeta.readyToTurnIn ? "★ Turn In" : objMeta.shortBadgeLabel,
        quest: q,
        title: q.title,
        subtitle: objMeta.trackerSubtitle,
      });
    }

    const pinnedRows = items
      .filter((it) => it.pinned)
      .sort((a, b) => a.pinOrder - b.pinOrder)
      .slice(0, MAX_TRACKED_QUESTS);

    return {
      rows: pinnedRows,
      totalActive: items.length,
    };
  }, [
    activeOutpostHunts,
    acceptedQuestIds,
    completedSet,
    questProgressById,
    trackedQuestKeys,
    questsCatalog,
    worldLocations,
  ]);

  const hiddenCount = Math.max(0, totalActive - rows.length);

  return (
    <aside aria-label="Quest Tracker" className="w-full pointer-events-auto">
      <div className="bg-[#10131a]/90 border border-[#7c653e]/85 rounded-md shadow-xl backdrop-blur-sm overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-2 px-3.5 py-2 border-b border-[#3a3428]/75 bg-[#151720]/85">
          <button
            type="button"
            onClick={() => {
              audioEngine.playUiClick(0.32);
              onOpenJournal();
            }}
            title="Open Full Quest Journal (J)"
            className="flex items-center gap-1.5 min-w-0 text-left cursor-pointer group"
          >
            <span className="font-display text-[11.5px] font-bold tracking-[0.1em] uppercase text-[#f4dfae] group-hover:text-[#fff3d1] truncate">
              Quests ({totalActive})
            </span>
          </button>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                audioEngine.playUiClick(0.32);
                onOpenJournal();
              }}
              className="px-2 py-0.5 rounded border border-[#4a4335] hover:border-[#b99653] bg-[#1a1f2b] text-[10px] font-semibold tracking-wide text-[#d9c496] hover:text-[#fff2cc] cursor-pointer"
              title="Open Quest Journal (J)"
            >
              Journal · J
            </button>
            <button
              type="button"
              onClick={() => {
                audioEngine.playUiClick(0.28);
                setCollapsed((prev) => !prev);
              }}
              aria-label={collapsed ? "Expand Quest Tracker" : "Collapse Quest Tracker"}
              title={collapsed ? "Show Tracked Quests" : "Hide Tracked Quests"}
              className="w-5 h-5 flex items-center justify-center rounded border border-[#3e4658] hover:border-[#b99653] bg-[#1a1f2b] text-[12px] font-bold text-[#cfd7e6] cursor-pointer leading-none"
            >
              {collapsed ? "+" : "−"}
            </button>
          </div>
        </div>

        {/* Tracked Rows (up to 5) */}
        {!collapsed && (
          <div className="p-2 flex flex-col gap-1.5">
            {rows.length === 0 ? (
              <button
                type="button"
                onClick={() => {
                  audioEngine.playUiClick(0.32);
                  onOpenJournal();
                }}
                className="w-full text-left px-2 py-1.5 rounded border border-dashed border-[#343c4d] hover:border-[#6a5b3e] bg-[#131823]/75 text-[11px] text-[#98a6be] hover:text-[#d7dfee] cursor-pointer transition-colors"
              >
                {totalActive > 0
                  ? `${totalActive} active in Journal — Pin quests in Journal (J) to show them here.`
                  : "No active quests — speak with townsfolk or Hunt Quartermasters."}
              </button>
            ) : (
              rows.map((row) => {
                if (row.kind === "hunt") {
                  const { hunt, ready } = row;
                  const pct = Math.min(100, Math.round((hunt.killsProgress / Math.max(1, hunt.killsRequired)) * 100));
                  return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => {
                        audioEngine.playUiClick(0.32);
                        onOpenJournal(row.trackKey);
                      }}
                      title="Open in Quest Journal"
                      className={[
                        "w-full text-left rounded border px-2 py-1.5 flex items-center gap-2 cursor-pointer transition-colors",
                        ready
                          ? "border-[#c79e49]/90 bg-[#231c10]/90 hover:bg-[#2c2313]"
                          : "border-[#2b3446] bg-[#141925]/90 hover:border-[#78633d] hover:bg-[#19202e]",
                      ].join(" ")}
                    >
                      <QuestCardThumb
                        cardId={hunt.isElite ? "quest_outpost_elite_contract" : "quest_outpost_hunt_board"}
                        fallbackPath={hunt.mobIconPath}
                        badgeCardId={ready ? "quest_complete_royal_seal" : undefined}
                        alt={hunt.mobName}
                        className="w-[30px] h-[30px] rounded border border-[#6e5832] bg-[#0b0e14] shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-[11.5px] font-bold text-[#f7e2ad] truncate leading-tight">
                            {row.pinned ? "◆ " : ""}
                            {row.title}
                          </span>
                          <span
                            className={[
                              "px-1.5 py-[1px] rounded border text-[9.5px] font-bold shrink-0 leading-tight",
                              ready
                                ? "border-[#e6c170] bg-[#332711] text-[#ffeaa8]"
                                : "border-[#366556] bg-[#122620] text-[#92e2bd]",
                            ].join(" ")}
                          >
                            {ready ? "★ Turn In" : `${hunt.killsProgress}/${hunt.killsRequired}`}
                          </span>
                        </div>
                        <div className="text-[10.5px] text-[#aebcd1] truncate mt-0.5 leading-tight">{row.subtitle}</div>
                        <div className="mt-1 h-[3px] w-full rounded-full bg-[#1e2433] overflow-hidden">
                          <div
                            className={ready ? "h-full bg-[#f0c76e]" : "h-full bg-[#4ebd8c]"}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </button>
                  );
                }

                const { quest, ready } = row;
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => {
                      audioEngine.playUiClick(0.32);
                      onOpenJournal(row.trackKey);
                    }}
                    title="Open in Quest Journal"
                    className={[
                      "w-full text-left rounded border px-2 py-1.5 flex items-center gap-2 cursor-pointer transition-colors",
                      ready
                        ? "border-[#c79e49]/90 bg-[#231c10]/90 hover:bg-[#2c2313]"
                        : "border-[#2b3446] bg-[#141925]/90 hover:border-[#78633d] hover:bg-[#19202e]",
                    ].join(" ")}
                  >
                    <QuestCardThumb
                      cardId={quest.questId}
                      fallbackPath={quest.assetPath}
                      badgeCardId={ready ? "quest_complete_royal_seal" : undefined}
                      alt={quest.title}
                      className="w-[30px] h-[30px] rounded border border-[#6e5832] bg-[#0b0e14] shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[11.5px] font-bold text-[#f4dfb0] truncate leading-tight">
                          {row.pinned ? "◆ " : ""}
                          {row.title}
                        </span>
                        <span
                          className={[
                            "px-1.5 py-[1px] rounded border text-[9.5px] font-semibold shrink-0 leading-tight",
                            ready
                              ? "border-[#e6c170] bg-[#332711] text-[#ffeaa8]"
                              : "border-[#444e63] bg-[#1a2030] text-[#bfd0e8]",
                          ].join(" ")}
                        >
                          {row.badgeLabel}
                        </span>
                      </div>
                      <div className="text-[10.5px] text-[#a9b7cd] truncate mt-0.5 leading-tight">{row.subtitle}</div>
                    </div>
                  </button>
                );
              })
            )}

            {hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  audioEngine.playUiClick(0.32);
                  onOpenJournal();
                }}
                className="w-full text-center py-1 rounded border border-[#343c4d] hover:border-[#8a7041] bg-[#141824]/80 text-[10.5px] font-semibold text-[#d9c496] hover:text-[#fff1c9] cursor-pointer transition-colors"
              >
                +{hiddenCount} more in Quest Journal (J)
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
