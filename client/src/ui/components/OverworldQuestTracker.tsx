import React, { useMemo, useState } from "react";
import { assetUrl } from "../api";
import { audioEngine } from "../audio";
import { resolveOutpostHuntLore } from "../quests/outpostHuntLore";
import { pluralizeMonsterName } from "../quests/outpostHunts";
import type { ActiveOutpostHunt, QuestEntry, WorldLocation } from "../types";
import { QuestCardThumb } from "./QuestCardThumb";

export const MAX_TRACKED_QUESTS = 5;

interface OverworldQuestTrackerProps {
  mapId: string;
  currentZoneCode?: number | null;
  acceptedQuestIds: string[];
  completedQuestIds: string[];
  activeOutpostHunts: ActiveOutpostHunt[];
  questsCatalog: QuestEntry[];
  worldLocations: WorldLocation[];
  onOpenJournal: () => void;
}

type TrackerRow =
  | {
      kind: "hunt";
      id: string;
      sortTier: number;
      zoneNum: number;
      ready: boolean;
      hunt: ActiveOutpostHunt;
      title: string;
      subtitle: string;
    }
  | {
      kind: "quest";
      id: string;
      sortTier: number;
      zoneNum: number;
      ready: false;
      quest: QuestEntry;
      title: string;
      subtitle: string;
    };

function buildHubQuestSubtitle(q: QuestEntry): string {
  const parts: string[] = [];
  if (q.targetHubName) {
    parts.push(`To ${q.targetHubName}`);
  } else if (q.markerName) {
    parts.push(q.markerName);
  } else {
    parts.push(q.hubName);
  }
  if (q.levelRange) {
    parts.push(q.levelRange);
  }
  return parts.join(" · ");
}

function shortQuestCategory(category: string): string {
  if (category.includes("/")) return category.split("/")[0].trim();
  return category;
}

export const OverworldQuestTracker: React.FC<OverworldQuestTrackerProps> = ({
  mapId,
  currentZoneCode,
  acceptedQuestIds,
  completedQuestIds,
  activeOutpostHunts,
  questsCatalog,
  worldLocations,
  onOpenJournal,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const hubZoneById = useMemo(() => {
    const out = new Map<string, number>();
    for (const loc of worldLocations) {
      if (typeof loc.zoneNum === "number") out.set(loc.id, loc.zoneNum);
    }
    return out;
  }, [worldLocations]);

  const completedSet = useMemo(() => new Set(completedQuestIds), [completedQuestIds]);

  const { rows, totalActive } = useMemo(() => {
    const items: TrackerRow[] = [];

    for (const h of activeOutpostHunts) {
      const ready = h.killsProgress >= h.killsRequired;
      const lore = resolveOutpostHuntLore(h.mobId, h.mobName, h.outpostName, h.zoneNum);
      const isLocalZone = currentZoneCode != null && h.zoneNum === currentZoneCode;
      const outpostMap = worldLocations.find((l) => l.id === h.outpostId)?.mapId;
      const isSameMap = outpostMap === mapId;
      const sortTier = ready ? 0 : isLocalZone ? 1 : isSameMap ? 2 : 4;

      items.push({
        kind: "hunt",
        id: `hunt:${h.huntId}`,
        sortTier,
        zoneNum: h.zoneNum,
        ready,
        hunt: h,
        title: lore.contractTitle,
        subtitle: ready
          ? `Return to ${h.outpostName}`
          : `${pluralizeMonsterName(h.mobName, h.killsRequired)} · ${h.outpostName} (Zone ${h.zoneNum})`,
      });
    }

    for (const qid of acceptedQuestIds) {
      if (completedSet.has(qid)) continue;
      const q = questsCatalog.find((entry) => entry.questId === qid);
      if (!q) continue;
      const qZone = hubZoneById.get(q.hubId) ?? 0;
      const isLocalZone = currentZoneCode != null && qZone === currentZoneCode;
      const isSameMap = q.mapId === mapId;
      const sortTier = isLocalZone ? 1 : isSameMap ? 3 : 5;

      items.push({
        kind: "quest",
        id: `quest:${q.questId}`,
        sortTier,
        zoneNum: qZone,
        ready: false,
        quest: q,
        title: q.title,
        subtitle: buildHubQuestSubtitle(q),
      });
    }

    items.sort((a, b) => a.sortTier - b.sortTier || a.zoneNum - b.zoneNum);
    return {
      rows: items.slice(0, MAX_TRACKED_QUESTS),
      totalActive: items.length,
    };
  }, [activeOutpostHunts, acceptedQuestIds, completedSet, questsCatalog, hubZoneById, currentZoneCode, mapId, worldLocations]);

  const hiddenCount = Math.max(0, totalActive - rows.length);

  return (
    <aside
      aria-label="Quest Tracker"
      className="w-[274px] max-w-[calc(100vw-28px)] pointer-events-auto"
    >
      <div className="bg-[#10141d]/92 border border-[#7c653e]/80 rounded-md shadow-xl backdrop-blur-sm overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-[#3a3428]/80 bg-[#151a26]/85">
          <button
            type="button"
            onClick={() => {
              audioEngine.playUiClick(0.32);
              onOpenJournal();
            }}
            title="Open Full Quest Journal (J)"
            className="flex items-center gap-1.5 min-w-0 text-left cursor-pointer group"
          >
            <img
              src={assetUrl("assets/icons/ui/ui_06_quest_scroll_glyph.webp")}
              alt=""
              draggable={false}
              className="w-4 h-4 rounded-sm object-contain shrink-0"
            />
            <span className="font-display text-[11.5px] font-bold tracking-[0.11em] uppercase text-[#f4dfae] group-hover:text-[#fff3d1] truncate">
              Quest Tracker
            </span>
            <span className="px-1.5 py-[1px] rounded bg-[#212736] border border-[#5b4d34]/75 text-[10px] font-bold text-[#e6c882] shrink-0">
              {totalActive}
            </span>
          </button>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                audioEngine.playUiClick(0.32);
                onOpenJournal();
              }}
              className="px-1.5 py-0.5 rounded border border-[#4a4335] hover:border-[#b99653] bg-[#1a1f2b] text-[10px] font-semibold uppercase tracking-wider text-[#d9c496] hover:text-[#fff2cc] cursor-pointer"
              title="Open Quest Journal (J)"
            >
              J
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
                No active quests — speak with townsfolk or Hunt Quartermasters.
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
                        onOpenJournal();
                      }}
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
                        <div className="text-[10.5px] text-[#aebcd1] truncate mt-0.5 leading-tight">
                          {row.subtitle}
                        </div>
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

                const { quest } = row;
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => {
                      audioEngine.playUiClick(0.32);
                      onOpenJournal();
                    }}
                    className="w-full text-left rounded border border-[#2b3446] bg-[#141925]/90 hover:border-[#78633d] hover:bg-[#19202e] px-2 py-1.5 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <QuestCardThumb
                      cardId={quest.questId}
                      fallbackPath={quest.assetPath}
                      alt={quest.title}
                      className="w-[30px] h-[30px] rounded border border-[#6e5832] bg-[#0b0e14] shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[11.5px] font-bold text-[#f4dfb0] truncate leading-tight">
                          {row.title}
                        </span>
                        <span className="px-1.5 py-[1px] rounded border border-[#444e63] bg-[#1a2030] text-[9.5px] font-semibold text-[#bfd0e8] shrink-0 leading-tight">
                          {shortQuestCategory(quest.category)}
                        </span>
                      </div>
                      <div className="text-[10.5px] text-[#a9b7cd] truncate mt-0.5 leading-tight">
                        {row.subtitle}
                      </div>
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
