import type {
  ActiveOutpostHunt,
  ActiveQuestProgress,
  QuestEntry,
  QuestProgressStage,
  TravelCatalog,
  TravelStoryChainEntry,
  WorldLocation,
} from "../types";

export const MAX_TRACKED_QUESTS = 5;

export function makeQuestTrackKey(questId: string): string {
  return `quest:${questId}`;
}

export function makeHuntTrackKey(outpostId: string): string {
  return `hunt:${outpostId}`;
}

/** Format quest reward strings cleanly for player-facing UI without raw Runestone tier shorthand. */
export function formatQuestRewardLine(raw: string): string {
  return raw
    .replace(/\s*\|\s*/g, " · ")
    .replace(/\bLesser Draft\b/gi, "Carved Runestone")
    .replace(/\bGreater Draft\b/gi, "Runestone Reward")
    .replace(/\bMaster Draft\b/gi, "Master Runestone");
}

/** Format internal quest category tags into natural medieval-fantasy RPG labels. */
export function formatQuestCategoryLabel(category?: string): string {
  if (!category) return "Quest";
  if (/^Purge\s*\/\s*Restore$/i.test(category)) return "Clear Out";
  if (/^Escort\s*\/\s*Defend$/i.test(category)) return "Defend";
  return category;
}

/** Shorten quest categories cleanly for compact HUD pills. */
export function formatQuestCategoryShort(category?: string): string {
  const full = formatQuestCategoryLabel(category);
  if (full === "Clear Out") return "Clear";
  if (full.includes("/")) return full.split("/")[0].trim();
  return full;
}

export interface QuestChainStatus {
  chain: TravelStoryChainEntry;
  stepIndex: number;
  totalSteps: number;
  prerequisiteQuestId: string | null;
  prerequisiteQuest: QuestEntry | null;
  isLockedByChain: boolean;
}

/** Look up Story Chain ordering and whether an earlier step must be completed first. */
export function getQuestStoryChainInfo(
  questId: string,
  travelCatalog: TravelCatalog | null | undefined,
  questsLookup: Record<string, QuestEntry> | Map<string, QuestEntry>,
  completedSet: Set<string>
): QuestChainStatus | null {
  const chains = travelCatalog?.storyChains ?? [];
  for (const chain of chains) {
    const idx = chain.questIds.indexOf(questId);
    if (idx < 0) continue;
    const prereqId = idx > 0 ? chain.questIds[idx - 1] : null;
    const prereqEntry = prereqId
      ? questsLookup instanceof Map
        ? questsLookup.get(prereqId) ?? null
        : questsLookup[prereqId] ?? null
      : null;
    const isLockedByChain = Boolean(prereqId && !completedSet.has(prereqId));
    return {
      chain,
      stepIndex: idx,
      totalSteps: chain.questIds.length,
      prerequisiteQuestId: prereqId,
      prerequisiteQuest: prereqEntry,
      isLockedByChain,
    };
  }
  return null;
}

export function getHubQuestStage(
  questId: string,
  questProgressById: Record<string, ActiveQuestProgress> | undefined,
  completedSet: Set<string>
): QuestProgressStage | "completed" {
  if (completedSet.has(questId)) return "completed";
  return questProgressById?.[questId]?.stage ?? "active";
}

export interface QuestObjectiveMeta {
  kindLabel: string;
  shortBadgeLabel: string;
  nextStepText: string;
  trackerSubtitle: string;
  locateLocId: string;
  locateMapId: string;
  readyToTurnIn: boolean;
}

/** Build plain-language objective guidance, HUD subtitles, and Atlas target location for any Hub quest. */
export function resolveQuestObjectiveMeta(
  quest: QuestEntry,
  stage: QuestProgressStage | "completed",
  worldLocations: WorldLocation[]
): QuestObjectiveMeta {
  const kindLabel = formatQuestCategoryLabel(quest.category);
  const shortBadgeLabel = formatQuestCategoryShort(quest.category);
  const readyToTurnIn = stage === "ready_to_turn_in";
  let nextStepText = "";
  let trackerSubtitle = "";
  let locateLocId = quest.hubId;

  if (quest.questFormat === "hub_courier") {
    const dest = quest.targetHubName || quest.hubName;
    locateLocId = quest.targetHubId || quest.hubId;
    nextStepText = quest.markerName
      ? `Travel to ${dest} (watch for ${quest.markerName})`
      : `Travel to ${dest} with the sealed dispatch`;
    trackerSubtitle = `To ${dest}`;
  } else if (readyToTurnIn) {
    locateLocId = quest.hubId;
    nextStepText = `Return to ${quest.giver} in ${quest.hubName} to claim your reward`;
    trackerSubtitle = `Return to ${quest.hubName}`;
  } else if (quest.questFormat === "hub_interior") {
    locateLocId = quest.hubId;
    const site = quest.markerName || quest.hubName;
    nextStepText = quest.miniBoss
      ? `Enter ${site} in ${quest.hubName} · Defeat ${quest.miniBoss}`
      : `Enter ${site} in ${quest.hubName}`;
    trackerSubtitle = quest.markerName ? `${quest.markerName} · ${quest.hubName}` : quest.hubName;
  } else {
    locateLocId = quest.markerId || quest.hubId;
    const site = quest.markerName || "Quest Site";
    nextStepText = quest.miniBoss
      ? `Seek out ${site} near ${quest.hubName} · Defeat ${quest.miniBoss}`
      : `Seek out ${site} near ${quest.hubName}`;
    trackerSubtitle = quest.markerName || quest.hubName;
  }

  const targetLoc = worldLocations.find((l) => l.id === locateLocId) ?? worldLocations.find((l) => l.id === quest.hubId);
  const locateMapId = targetLoc?.mapId || quest.mapId;

  return {
    kindLabel,
    shortBadgeLabel,
    nextStepText,
    trackerSubtitle,
    locateLocId,
    locateMapId,
    readyToTurnIn,
  };
}

/** Update quest-giver dialogue cleanly when a quest is chain-locked, active, ready, or completed. */
export function resolveQuestNpcStatusDialogue(
  baseDialogue: string,
  quest: QuestEntry | null,
  isAccepted: boolean,
  isCompleted: boolean,
  stage: QuestProgressStage | "completed",
  chainInfo: QuestChainStatus | null,
  objectiveMeta: QuestObjectiveMeta | null
): string {
  if (!quest) return baseDialogue;
  if (isCompleted) {
    return `You already settled "${quest.title}" for us—${quest.hubName} owes your company a debt of gratitude.`;
  }
  if (!isAccepted && chainInfo?.isLockedByChain && chainInfo.prerequisiteQuest) {
    return `Hold on "${quest.title}" for now. Settle "${chainInfo.prerequisiteQuest.title}" in ${chainInfo.prerequisiteQuest.hubName} first before we move on the next step.`;
  }
  if (isAccepted && stage === "ready_to_turn_in") {
    return `You made it back from "${quest.title}" in one piece! Speak when ready to settle your reward.`;
  }
  if (isAccepted && objectiveMeta) {
    return `Our contract for "${quest.title}" is active in your Journal. Next step: ${objectiveMeta.nextStepText}.`;
  }
  return baseDialogue;
}

/** Prune completed or abandoned keys and keep at most MAX_TRACKED_QUESTS pinned entries. */
export function normalizeTrackedQuestKeys(
  rawKeys: string[] | undefined,
  acceptedQuestIds: string[],
  activeOutpostHunts: ActiveOutpostHunt[]
): string[] {
  const valid = new Set<string>();
  for (const qid of acceptedQuestIds) valid.add(makeQuestTrackKey(qid));
  for (const h of activeOutpostHunts) valid.add(makeHuntTrackKey(h.outpostId));

  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of rawKeys ?? []) {
    if (!valid.has(k) || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
    if (out.length >= MAX_TRACKED_QUESTS) break;
  }
  return out;
}

/** Ensure every active Hub quest has a valid progress record and drop stale entries. */
export function normalizeQuestProgressMap(
  rawMap: Record<string, ActiveQuestProgress> | undefined,
  acceptedQuestIds: string[]
): Record<string, ActiveQuestProgress> {
  const acceptedSet = new Set(acceptedQuestIds);
  const out: Record<string, ActiveQuestProgress> = {};
  if (rawMap) {
    for (const [qid, entry] of Object.entries(rawMap)) {
      if (!acceptedSet.has(qid) || !entry) continue;
      out[qid] = {
        questId: qid,
        stage: entry.stage ?? "active",
        acceptedAtPlaytime: entry.acceptedAtPlaytime,
        clearedSite: entry.clearedSite,
        clearedBoss: entry.clearedBoss,
      };
    }
  }
  for (const qid of acceptedQuestIds) {
    if (!out[qid]) {
      out[qid] = { questId: qid, stage: "active" };
    }
  }
  return out;
}
