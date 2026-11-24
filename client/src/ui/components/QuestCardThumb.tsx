import React, { useEffect, useState } from "react";
import { assetUrl } from "../api";

export const QUEST_CARD_FALLBACK = "assets/icons/ui/ui_06_quest_scroll_glyph.webp";

interface QuestCardThumbProps {
  cardId: string;
  fallbackPath?: string;
  badgeCardId?: string;
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
          className="pointer-events-none absolute -bottom-1 -right-1 w-[22px] h-[22px] rounded-full border border-[#f0ce79] bg-[#0a0d13] object-cover shadow"
        />
      )}
    </div>
  );
};
