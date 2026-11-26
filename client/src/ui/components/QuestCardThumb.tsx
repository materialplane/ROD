import React, { useEffect, useState } from "react";
import { assetUrl } from "../api";
import { audioEngine } from "../audio";
import {
  formatQuestRewardLine,
  type QuestChainStatus,
  type QuestObjectiveMeta,
} from "../quests/questUtils";
import type { QuestEntry, QuestProgressStage } from "../types";

export const QUEST_CARD_FALLBACK = "assets/icons/ui/ui_06_quest_scroll_glyph.webp";

interface QuestCardThumbProps {
  cardId: string;
  fallbackPath?: string;
  badgeCardId?: string;
  badgeClassName?: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
}

/**
 * Displays a 512x512 illustrated Quest Card or Crest from client/assets/icons/quests/
 * with automatic fallback to an existing marker/UI icon until the batch export completes.
 */
export const QuestCardThumb: React.FC<QuestCardThumbProps> = ({
  cardId,
  fallbackPath = QUEST_CARD_FALLBACK,
  badgeCardId,
  badgeClassName = "w-[22px] h-[22px] -bottom-1 -right-1 border",
  alt = "",
  className = "w-[60px] h-[60px] rounded border border-[#6e5832] bg-[#0b0e14] shrink-0",
  imgClassName = "w-full h-full object-cover rounded-[3px]",
}) => {
  const primaryRel = `assets/icons/quests/${cardId}.webp`;
  const [srcRel, setSrcRel] = useState(primaryRel);
  const [badgeFailed, setBadgeFailed] = useState(false);

  useEffect(() => {
    setSrcRel(primaryRel);
  }, [primaryRel]);

  useEffect(() => {
    setBadgeFailed(false);
  }, [badgeCardId]);

  return (
    <div className={`relative overflow-hidden select-none ${className}`}>
      <img
        src={assetUrl(srcRel)}
        alt={alt}
        draggable={false}
        className={imgClassName}
        onError={() => {
          const fb = fallbackPath || QUEST_CARD_FALLBACK;
          if (srcRel !== fb) {
            setSrcRel(fb);
          } else if (srcRel !== QUEST_CARD_FALLBACK) {
            setSrcRel(QUEST_CARD_FALLBACK);
          }
        }}
      />
      {badgeCardId && !badgeFailed && (
        <img
          src={assetUrl(`assets/icons/quests/${badgeCardId}.webp`)}
          alt=""
          draggable={false}
          onError={() => setBadgeFailed(true)}
          className={`pointer-events-none absolute rounded-full border-[#f0ce79] bg-[#0a0d13] object-cover shadow ${badgeClassName}`}
        />
      )}
    </div>
  );
};

export type QuestReferenceStatus = "required" | "active" | "completed" | "available";

interface QuestReferenceCardProps {
  cardId: string;
  title: string;
  eyebrow?: string;
  subtitle?: string;
  fallbackPath?: string;
  status?: QuestReferenceStatus;
  variant?: "card" | "compact";
  className?: string;
}

const REFERENCE_SURFACE: Record<QuestReferenceStatus, string> = {
  required: "border-[#b87b35]/90 bg-[#1c140b]/92",
  active: "border-[#3c785b]/90 bg-[#12221a]/92",
  completed: "border-[#9a7b3f]/90 bg-[#1f190f]/92",
  available: "border-[#354055] bg-[#111622]/92",
};

const REFERENCE_BADGE: Partial<Record<QuestReferenceStatus, { label: string; cls: string }>> = {
  completed: {
    label: "★ Completed",
    cls: "border-[#96783b] bg-[#2a2214] text-[#f5d88f]",
  },
  active: {
    label: "In Journal",
    cls: "border-[#3c785b] bg-[#142920] text-[#91e3b8]",
  },
  required: {
    label: "Needed First",
    cls: "border-[#c48332] bg-[#2c1c0b] text-[#ffd48a]",
  },
};

/**
 * Shared inline Quest reference block pairing a specific quest's Quest Card artwork
 * with its title, hub/prerequisite note, and live journal status.
 */
export const QuestReferenceCard: React.FC<QuestReferenceCardProps> = ({
  cardId,
  title,
  eyebrow,
  subtitle,
  fallbackPath,
  status = "available",
  variant = "card",
  className = "",
}) => {
  const isCompact = variant === "compact";
  const badge = REFERENCE_BADGE[status];

  return (
    <div
      className={[
        "rounded border flex items-center min-w-0",
        isCompact ? "gap-2.5 p-2" : "gap-3 p-2.5",
        REFERENCE_SURFACE[status],
        className,
      ].join(" ")}
    >
      <QuestCardThumb
        cardId={cardId}
        fallbackPath={fallbackPath}
        badgeCardId={status === "completed" ? "quest_complete_royal_seal" : undefined}
        alt={title}
        className={[
          "rounded border bg-[#090c12] shrink-0 shadow",
          status === "completed"
            ? "border-[#a68542]"
            : status === "active"
              ? "border-[#4aa376]"
              : status === "required"
                ? "border-[#c88a38]"
                : "border-[#6e5832]",
          isCompact ? "w-[40px] h-[40px]" : "w-[56px] h-[56px]",
        ].join(" ")}
      />
      <div className="min-w-0 flex-1">
        {(eyebrow || badge) && (
          <div className="flex items-center justify-between gap-2">
            {eyebrow ? (
              <span
                className={[
                  "text-[10px] font-bold uppercase tracking-[0.11em] text-[#dfba6b]",
                  isCompact ? "truncate" : "leading-snug",
                ].join(" ")}
              >
                {eyebrow}
              </span>
            ) : (
              <span />
            )}
            {badge && (
              <span
                className={[
                  "px-1.5 py-0.5 rounded-sm border text-[9.5px] font-bold leading-none shrink-0",
                  badge.cls,
                ].join(" ")}
              >
                {badge.label}
              </span>
            )}
          </div>
        )}
        <div
          className={[
            "font-bold text-[#fae2aa] leading-snug",
            isCompact ? "text-[12.5px] mt-0.5 truncate" : "text-[14px] mt-0.5",
          ].join(" ")}
        >
          {title}
        </div>
        {subtitle && (
          <div
            className={[
              "text-[11px] text-[#bfd0e6] leading-snug mt-0.5",
              isCompact ? "truncate" : "",
            ].join(" ")}
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};

interface NpcQuestOfferBarProps {
  quest: QuestEntry;
  stage: QuestProgressStage | "completed";
  isAccepted: boolean;
  isCompleted: boolean;
  isPinned: boolean;
  journalCount: number;
  journalLimit: number;
  chainInfo: QuestChainStatus | null;
  objectiveMeta: QuestObjectiveMeta;
  onAcceptQuest: (quest: QuestEntry) => void;
  onToggleTrackQuest?: (trackKey: string) => void;
  onOpenJournal?: (focusTrackKey?: string) => void;
  extraAction?: React.ReactNode;
  compact?: boolean;
}

/** Shared NPC Quest Offer & Active Contract status footer for Hubs, Keeps, and Taverns. */
export const NpcQuestOfferBar: React.FC<NpcQuestOfferBarProps> = ({
  quest,
  stage,
  isAccepted,
  isCompleted,
  isPinned: _isPinned,
  journalCount,
  journalLimit,
  chainInfo,
  objectiveMeta,
  onAcceptQuest,
  onToggleTrackQuest: _onToggleTrackQuest,
  onOpenJournal,
  extraAction,
  compact = false,
}) => {
  void _isPinned;
  void _onToggleTrackQuest;
  const lockedByChain = Boolean(!isAccepted && !isCompleted && chainInfo?.isLockedByChain);
  const journalFull = !isAccepted && !isCompleted && journalCount >= journalLimit;

  return (
    <div className="border-t border-[#2c3446] pt-2.5 mt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="min-w-0 flex items-center gap-3">
        <QuestCardThumb
          cardId={quest.questId}
          fallbackPath={quest.assetPath}
          badgeCardId={isCompleted || objectiveMeta.readyToTurnIn ? "quest_complete_royal_seal" : undefined}
          className={
            compact
              ? "w-[54px] h-[54px] rounded border border-[#967741] bg-[#090c12] shrink-0"
              : "w-[62px] h-[62px] rounded border border-[#967741] bg-[#090c12] shrink-0 shadow-[0_0_16px_rgba(226,184,96,0.2)]"
          }
        />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#d9b468]">
              {isCompleted
                ? "Completed Contract"
                : objectiveMeta.readyToTurnIn
                  ? "Ready to Turn In"
                  : isAccepted
                    ? "Active Contract"
                    : "Contract Offer"}
            </span>
            <span className="text-[11px] text-[#8f9eb5]">
              · {objectiveMeta.kindLabel}
              {chainInfo ? ` · Story Part ${chainInfo.stepIndex + 1}/${chainInfo.totalSteps}` : ""}
            </span>
            {!isAccepted && !isCompleted && (
              <span
                className={[
                  "px-1.5 py-[1px] rounded border text-[10px] font-semibold",
                  journalFull
                    ? "border-[#c45b66] bg-[#2a1216] text-[#ffb6be]"
                    : "border-[#3a4358] bg-[#161c28] text-[#aebcd2]",
                ].join(" ")}
              >
                Journal {journalCount}/{journalLimit}
              </span>
            )}
          </div>

          <div className={compact ? "text-[14.5px] font-bold text-[#fbe3a6] mt-0.5 leading-snug" : "text-[16px] lg:text-[18px] font-bold text-[#fbe3a6] mt-0.5 leading-snug"}>
            {quest.title}
          </div>

          {lockedByChain && chainInfo?.prerequisiteQuest ? (
            <div className="text-[12px] text-[#ffcf87] mt-0.5">
              Prerequisite: Complete &ldquo;{chainInfo.prerequisiteQuest.title}&rdquo; ({chainInfo.prerequisiteQuest.hubName}) first
            </div>
          ) : isAccepted ? (
            <div className="text-[12px] text-[#a7e6c3] mt-0.5">
              <strong className="text-[#d9f7e7]">Next Step:</strong> {objectiveMeta.nextStepText}
            </div>
          ) : null}

          <div className="text-[12px] text-[#b8c8df] mt-0.5">
            <span className="text-[#e3c27a] font-semibold">Reward:</span> {formatQuestRewardLine(quest.reward)}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {extraAction}

        {isCompleted ? (
          <span className="px-4 py-2 rounded border border-[#96783b] bg-[#261f12] text-[#f5d88f] text-[12.5px] font-bold uppercase tracking-wider">
            ★ Completed
          </span>
        ) : isAccepted ? (
          !extraAction ? (
            <span className="px-3.5 py-2 rounded border border-[#3c785b] bg-[#142920] text-[#9be8be] text-[12px] font-bold uppercase tracking-wider">
              {stage === "ready_to_turn_in" ? "★ Ready to Turn In" : "✓ Active"}
            </span>
          ) : null
        ) : (
          <>
            {journalFull && onOpenJournal && (
              <button
                type="button"
                onClick={() => {
                  audioEngine.playUiClick(0.32);
                  onOpenJournal();
                }}
                className="px-3.5 py-2 rounded border border-[#c88c42] bg-[#281b0e] hover:bg-[#382612] text-[#ffd996] text-[12px] font-bold uppercase tracking-wider cursor-pointer transition-colors"
              >
                Open Journal
              </button>
            )}
            <button
              type="button"
              disabled={lockedByChain || journalFull}
              onClick={() => onAcceptQuest(quest)}
              className={[
                "px-4 py-2 rounded border text-[12.5px] font-bold uppercase tracking-wider shrink-0 transition-colors",
                lockedByChain || journalFull
                  ? "border-[#4c4640] bg-[#18181f] text-[#8d96a8] cursor-not-allowed opacity-75"
                  : "border-[#e6c170] bg-[#c99b44]/35 hover:bg-[#c99b44]/55 text-[#fff4d4] cursor-pointer shadow-[0_0_20px_rgba(226,190,115,0.22)]",
              ].join(" ")}
            >
              {lockedByChain
                ? `Requires Part ${chainInfo!.stepIndex}`
                : journalFull
                  ? `Journal Full (${journalCount}/${journalLimit})`
                  : "Accept Quest"}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
