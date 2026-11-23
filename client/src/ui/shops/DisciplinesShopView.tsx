import React from "react";
import { assetUrl } from "../api";
import { audioEngine } from "../audio";
import type { DisciplineOption, DisciplineTier, HeroId } from "../types";

interface DisciplinesShopViewProps {
  heroId: HeroId;
  heroName: string;
  tiers: DisciplineTier[];
  partyLevel: number;
  silver: number;
  chosenByTier: Record<string, string>;
  onSelectDiscipline: (heroId: HeroId, tierLevel: number, opt: DisciplineOption, silverCost: number) => void;
}

const PILLAR_COLORS: Record<string, string> = {
  body: "border-[#a96d42] bg-[#2a190e] text-[#f4be96]",
  mind: "border-[#5487c4] bg-[#102036] text-[#98caff]",
  spirit: "border-[#8b6cd4] bg-[#201638] text-[#cbb6ff]",
};

export const DisciplinesShopView: React.FC<DisciplinesShopViewProps> = ({
  heroId,
  heroName,
  tiers,
  partyLevel,
  silver,
  chosenByTier,
  onSelectDiscipline,
}) => {
  if (tiers.length === 0) {
    return (
      <div className="h-full min-h-[200px] flex items-center justify-center text-[13px] text-[#9fb0c9]">
        Loading Arcanist Discipline catalog...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 pr-1">
      <div className="rounded border border-[#473c27] bg-[#141822]/95 px-3 py-2 text-[12px] text-[#cdd7e8]">
        <strong className="text-[#fae2aa]">{heroName}&apos;s Discipline Training:</strong> Pick{" "}
        <strong className="text-[#ffe49e]">1 of 2</strong> perks per milestone (Lv 1, 10, 20… 90). Choices are permanent per hero.
      </div>

      {tiers.map((tier) => {
        const chosenId = chosenByTier[String(tier.level)];
        const unlocked = partyLevel >= tier.level;
        const canAfford = silver >= tier.silver;

        return (
          <div
            key={tier.level}
            className={`rounded border p-2.5 flex flex-col gap-2 ${
              chosenId
                ? "border-[#4b805c] bg-[#0f1d17]/90"
                : unlocked
                  ? "border-[#635030] bg-[#111622]/95"
                  : "border-[#282e3d] bg-[#0c0f17]/80 opacity-60"
            }`}
          >
            <div className="flex items-center justify-between gap-2 border-b border-[#283142] pb-1.5">
              <div className="text-[12.5px] font-bold text-[#fae2aa]">
                Level {tier.level} Tier
              </div>
              <div className="text-[11.5px] font-bold">
                {chosenId ? (
                  <span className="text-[#84f2b8]">✓ Mastered</span>
                ) : !unlocked ? (
                  <span className="text-[#8f9db3]">Unlocks at Lv {tier.level}</span>
                ) : (
                  <span className={canAfford ? "text-[#f4cf81]" : "text-[#f28b95]"}>
                    {tier.silver.toLocaleString()}s Silver
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[tier.optionA, tier.optionB].map((opt) => {
                const isPicked = chosenId === opt.id;
                const isOtherLocked = Boolean(chosenId && chosenId !== opt.id);
                const canBuy = unlocked && !chosenId && canAfford;
                const pillarCls = PILLAR_COLORS[opt.pillar] ?? PILLAR_COLORS.mind;

                return (
                  <div
                    key={opt.id}
                    className={`rounded border p-2 flex flex-col justify-between gap-2 ${
                      isPicked
                        ? "border-[#84f2b8] bg-[#142a1f]/95 shadow-[0_0_12px_rgba(88,219,147,0.2)]"
                        : isOtherLocked
                          ? "border-[#252a36] bg-[#0d1018]/70 opacity-45"
                          : "border-[#333d54] bg-[#141a26]/95"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <img
                        src={assetUrl(opt.iconPath)}
                        alt={opt.name}
                        className="w-11 h-11 rounded border border-[#6e5a35] bg-[#0b0e14] object-cover shrink-0"
                        draggable={false}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[13px] font-bold text-[#f6e6c2] leading-tight">{opt.name}</span>
                          <span className={`px-1.5 py-0.2 rounded border text-[9.5px] font-bold uppercase ${pillarCls}`}>
                            {opt.pillar}
                          </span>
                        </div>
                        <div className="text-[10.5px] font-semibold text-[#96aac6] mt-0.5">{opt.tag}</div>
                      </div>
                    </div>

                    <p className="m-0 text-[11.5px] text-[#cfd8e8] leading-snug">{opt.effect}</p>

                    <div className="pt-1 flex justify-end">
                      {isPicked ? (
                        <span className="text-[11px] font-extrabold text-[#84f2b8]">✓ Active Discipline</span>
                      ) : isOtherLocked ? (
                        <span className="text-[11px] font-semibold text-[#7d8ca3]">Alternative Not Chosen</span>
                      ) : (
                        <button
                          type="button"
                          disabled={!canBuy}
                          onClick={() => {
                            audioEngine.playUiClick(0.38);
                            onSelectDiscipline(heroId, tier.level, opt, tier.silver);
                          }}
                          className="px-2.5 py-1 rounded border border-[#e0ba6c] bg-[#6d501b] hover:brightness-110 disabled:opacity-40 disabled:cursor-default text-[#fff2ce] text-[11px] font-bold cursor-pointer"
                        >
                          {!unlocked ? `Lv ${tier.level} Required` : !canAfford ? `Need ${tier.silver}s` : `Train (${tier.silver}s)`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
