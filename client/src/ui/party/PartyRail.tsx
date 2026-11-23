import React from "react";
import { assetUrl } from "../api";
import { audioEngine } from "../audio";
import { getHeroById, HEROES } from "../heroes";
import type { EquippedGearMap, HeroAttrMap, HeroId, HeroSocketsMap, ItemEntry } from "../types";
import { computeHeroVitals, getHeroAttributes, getHeroLevel } from "./partyLogic";

interface PartyRailProps {
  partyOrder: HeroId[];
  selectedHeroId: HeroId;
  level: number;
  heroLevels?: Partial<Record<HeroId, number>>;
  heroSpentAttrs: Partial<Record<HeroId, HeroAttrMap>>;
  equippedByHero: EquippedGearMap;
  itemsById: Record<string, ItemEntry>;
  socketsByHero: HeroSocketsMap;
  heroHpPct: Partial<Record<HeroId, number>>;
  heroMpPct?: Partial<Record<HeroId, number>>;
  onSelectHero: (heroId: HeroId) => void;
  onChangeOrder: (nextOrder: HeroId[]) => void;
}

export const PartyRail: React.FC<PartyRailProps> = ({
  partyOrder,
  selectedHeroId,
  level,
  heroLevels,
  heroSpentAttrs,
  equippedByHero,
  itemsById,
  socketsByHero,
  heroHpPct,
  heroMpPct,
  onSelectHero,
  onChangeOrder,
}) => {
  const activeSet = new Set(partyOrder);
  const keepDefenders = HEROES.filter((h) => !activeSet.has(h.id));

  const moveSlot = (idx: number, delta: -1 | 1) => {
    const nextIdx = idx + delta;
    if (nextIdx < 0 || nextIdx >= partyOrder.length) return;
    audioEngine.playUiClick(0.35);
    const next = [...partyOrder];
    const [picked] = next.splice(idx, 1);
    next.splice(nextIdx, 0, picked);
    onChangeOrder(next);
  };

  const makeLeader = (idx: number) => {
    if (idx <= 0 || idx >= partyOrder.length) return;
    audioEngine.playUiClick(0.4);
    const next = [...partyOrder];
    const [picked] = next.splice(idx, 1);
    next.unshift(picked);
    onChangeOrder(next);
  };

  return (
    <aside className="w-[310px] xl:w-[325px] shrink-0 flex flex-col gap-2 overflow-y-auto pr-1">
      {partyOrder.map((hid, idx) => {
        const hero = getHeroById(hid);
        const heroLv = getHeroLevel(heroLevels, hid, level);
        const vitals = computeHeroVitals(hid, heroLv, heroSpentAttrs, equippedByHero, itemsById, socketsByHero, heroHpPct, heroMpPct);
        const attrs = getHeroAttributes(hid, heroLv, heroSpentAttrs);
        const isSelected = selectedHeroId === hid;
        const hpRatio = vitals.hpRatio;
        const hpFillClass =
          hpRatio < 25
            ? "bg-gradient-to-r from-[#b8323e] to-[#f05e6b]"
            : hpRatio < 50
              ? "bg-gradient-to-r from-[#b67a22] to-[#e9b34a]"
              : "bg-gradient-to-r from-[#2c8a56] to-[#5ee298]";

        const resolveBorder =
          hpRatio < 25
            ? "shadow-[0_0_12px_rgba(229,77,94,0.22)] border-[#a6404c]"
            : hpRatio < 50
              ? "shadow-[0_0_10px_rgba(233,179,74,0.16)] border-[#9a7230]"
              : "";

        return (
          <div
            key={hid}
            onClick={() => {
              audioEngine.playUiClick(0.3);
              onSelectHero(hid);
            }}
            className={[
              "flex items-center gap-2.5 p-2 rounded border transition cursor-pointer relative select-none",
              isSelected
                ? "bg-gradient-to-br from-[#231e14] to-[#131720] border-[#d7b267]"
                : `bg-[#12161f]/95 border-[#2c3343] hover:border-[#6a5b3e] ${resolveBorder}`,
            ].join(" ")}
          >
            <div
              className={[
                "w-[26px] h-[26px] rounded flex items-center justify-center text-[11px] font-bold shrink-0 border",
                idx === 0
                  ? "bg-[#2c2212] border-[#c89e4b] text-[#fae2aa]"
                  : "bg-[#191f2c] border-[#353d4f] text-[#b4bfd1]",
              ].join(" ")}
            >
              {idx === 0 ? "★1" : `#${idx + 1}`}
            </div>

            <img
              src={assetUrl(hero.avatarPath)}
              alt={hero.name}
              className="w-[46px] h-[46px] rounded border border-[#5a4b31]/80 object-cover shrink-0 bg-[#0b0e14]"
              draggable={false}
            />

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[13.5px] font-bold text-[#f4e0b5] truncate">{hero.name}</span>
                {attrs.unspent > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-[#182e22] border border-[#3a8058] text-[#8ef0b6] text-[9.5px] font-bold shrink-0">
                    +{attrs.unspent} Pts
                  </span>
                )}
              </div>
              <div className="text-[10.5px] text-[#9eb0c9] truncate">
                {hero.className} · Lv {heroLv}
              </div>

              <div className="mt-1.5 flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 h-[6px] rounded-full bg-[#0a0d13] overflow-hidden border border-[#252c3b]">
                    <div className={`h-full transition-all ${hpFillClass}`} style={{ width: `${hpRatio}%` }} />
                  </div>
                  <span className="text-[10px] font-mono text-[#c4d3e3] w-[52px] text-right shrink-0">
                    {vitals.curHp}/{vitals.maxHp}
                  </span>
                </div>
                {vitals.hasMp && (
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 h-[5px] rounded-full bg-[#0a0d13] overflow-hidden border border-[#252c3b]">
                      <div
                        className="h-full bg-gradient-to-r from-[#2c5ca8] to-[#5ea8f5]"
                        style={{ width: `${vitals.maxMp > 0 ? Math.round((vitals.curMp / vitals.maxMp) * 100) : 0}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-[#96c4f8] w-[52px] text-right shrink-0">
                      {vitals.curMp}/{vitals.maxMp}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                disabled={idx === 0}
                onClick={() => moveSlot(idx, -1)}
                title="Move Up in Formation"
                className="w-[24px] h-[18px] rounded border border-[#3a4254] hover:border-[#d7b267] bg-[#181d29] disabled:opacity-25 text-[9.5px] text-[#dde4f2] leading-none cursor-pointer"
              >
                ▲
              </button>
              <button
                type="button"
                disabled={idx === 0}
                onClick={() => makeLeader(idx)}
                title="Make Party Leader (#1)"
                className="w-[24px] h-[18px] rounded border border-[#614e2e] hover:border-[#d7b267] bg-[#221c12] disabled:opacity-25 text-[9.5px] text-[#f4d898] leading-none cursor-pointer"
              >
                ★
              </button>
              <button
                type="button"
                disabled={idx === partyOrder.length - 1}
                onClick={() => moveSlot(idx, 1)}
                title="Move Down in Formation"
                className="w-[24px] h-[18px] rounded border border-[#3a4254] hover:border-[#d7b267] bg-[#181d29] disabled:opacity-25 text-[9.5px] text-[#dde4f2] leading-none cursor-pointer"
              >
                ▼
              </button>
            </div>
          </div>
        );
      })}

      {/* Highcrown Keep Reserve */}
      <div className="mt-auto rounded border border-[#2b3243] bg-[#0e121a]/95 p-2.5">
        <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#9eb0c8] mb-2">
          Holding Highcrown Keep ({keepDefenders.length})
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {keepDefenders.map((h) => (
            <div key={h.id} className="flex items-center gap-2 p-1.5 rounded border border-[#242a38] bg-[#141923]/90">
              <img
                src={assetUrl(h.avatarPath)}
                alt={h.name}
                className="w-[28px] h-[28px] rounded object-cover border border-[#4a3e28] shrink-0"
                draggable={false}
              />
              <div className="min-w-0">
                <div className="text-[11.5px] font-semibold text-[#e6edf7] truncate">{h.name}</div>
                <div className="text-[9.5px] text-[#8d9cb4] truncate">{h.className}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};
