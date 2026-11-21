import React, { useEffect, useState } from "react";
import { assetUrl } from "../api";
import { audioEngine } from "../audio";
import { ATTRIBUTE_META, DEFAULT_PARTY_ORDER, getHeroById, HEROES } from "../heroes";
import type { EquippedGearMap, HeroId, ItemEntry, SpellEntry } from "../types";
import { PartyGearPanel } from "./PartyGearPanel";

interface CharacterSelectModalProps {
  open: boolean;
  onConfirm: (partyOrder: HeroId[]) => void;
  onClose: () => void;
}

export const CharacterSelectModal: React.FC<CharacterSelectModalProps> = ({ open, onConfirm, onClose }) => {
  const [selected, setSelected] = useState<HeroId[]>(DEFAULT_PARTY_ORDER);
  const [inspectId, setInspectId] = useState<HeroId>(DEFAULT_PARTY_ORDER[0]);

  useEffect(() => {
    if (open) {
      setSelected(DEFAULT_PARTY_ORDER);
      setInspectId(HEROES[0].id);
    }
  }, [open]);

  if (!open) return null;

  const selectedSet = new Set(selected);
  const orderedParty = HEROES.filter((h) => selectedSet.has(h.id)).map((h) => h.id);
  const keepDefenders = HEROES.filter((h) => !selectedSet.has(h.id));
  const inspectedHero = getHeroById(inspectId);
  const isInspectedPicked = selectedSet.has(inspectedHero.id);

  const toggleHero = (id: HeroId) => {
    audioEngine.playUiClick(0.38);
    setSelected((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  };

  return (
    <div
      className="fixed inset-0 z-30 bg-[#05060a]/85 backdrop-blur-sm flex items-center justify-center p-3 md:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="rpg-modal-panel w-[1060px] max-w-[96vw] md:h-[700px] max-h-[92vh] rounded p-4 md:p-5 flex flex-col overflow-hidden">
        <header className="flex items-start justify-between gap-4 border-b border-[#353b4a] pb-2.5 mb-3 shrink-0">
          <div>
            <h2 className="font-display m-0 text-[18px] md:text-[19px] tracking-[0.14em] uppercase text-[#f0d79d]">
              Highcrown Keep — Choose Your 4 Heroes
            </h2>
            <p className="m-0 mt-1 text-[12px] text-[#aeb7c7]">
              Select any hero on the left to read their story, class style, and starting stats. Pick{" "}
              <strong className="text-[#f3dfb1]">4 heroes</strong> to set out—the other 2 stay behind to defend Highcrown Keep.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              audioEngine.playUiClick();
              onClose();
            }}
            className="w-[30px] h-[30px] shrink-0 rounded border border-[#484f60] hover:border-[#d7b267] text-[#c8c0af] hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </header>

        {/* Split Two-Panel Layout: Left = Vertical 1:1 Hero Row | Right = Fixed-Height Hero Details */}
        <div className="grid grid-cols-1 md:grid-cols-[340px_1fr] gap-3.5 flex-1 min-h-0 overflow-y-auto md:overflow-hidden">
          {/* Left Panel: Vertical Row of All 6 Heroes Using 1:1 Avatars + Keep Defenders */}
          <div className="flex flex-col gap-1.5 min-h-0">
            <div className="flex flex-col gap-1.5 flex-1 md:overflow-y-auto pr-1">
              {HEROES.map((hero) => {
                const isPicked = selectedSet.has(hero.id);
                const isInspected = hero.id === inspectedHero.id;
                const partyFull = orderedParty.length >= 4;

                return (
                  <div
                    key={hero.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      audioEngine.playUiClick(0.28);
                      setInspectId(hero.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setInspectId(hero.id);
                      }
                    }}
                    className={[
                      "rounded border p-1.5 px-2 flex items-center gap-2.5 cursor-pointer transition-all shrink-0",
                      isInspected
                        ? "bg-[#241e14]/95 border-[#e2be73] shadow-[0_0_16px_rgba(215,178,103,0.22)]"
                        : isPicked
                        ? "bg-[#191b23]/95 border-[#6c5938] hover:border-[#a98b54]"
                        : "bg-[#131720]/95 border-[#2f3646] hover:border-[#637089] hover:bg-[#181d29]",
                    ].join(" ")}
                  >
                    <img
                      src={assetUrl(hero.avatarPath)}
                      alt={hero.fullName}
                      className={[
                        "w-[52px] h-[52px] rounded-sm object-cover shrink-0 border",
                        isInspected ? "border-[#e2be73]" : isPicked ? "border-[#8d7447]" : "border-[#3c4557]",
                      ].join(" ")}
                      draggable={false}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="font-display text-[14.5px] font-bold text-[#f4dfb3] truncate">{hero.fullName}</div>
                      <div className="text-[12px] text-[#d9b86c] font-semibold">{hero.className}</div>
                      <div className="text-[10.5px] text-[#95a3b8] truncate">{hero.shortTag}</div>
                    </div>

                    {/* Simple Pick / Remove Control */}
                    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                      {isPicked ? (
                        <button
                          type="button"
                          title={`Remove ${hero.name} from party`}
                          onClick={() => toggleHero(hero.id)}
                          className="px-2.5 py-1 rounded border border-[#8e7442] bg-[#292214] hover:border-[#d67a7a] hover:bg-[#381d1d] text-[11px] font-semibold text-[#f3dfb1] hover:text-[#ffd2d2] cursor-pointer transition-colors"
                        >
                          ✓ Picked
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={partyFull}
                          onClick={() => {
                            setInspectId(hero.id);
                            toggleHero(hero.id);
                          }}
                          className="px-2.5 py-1 rounded border border-[#5d6c87] hover:border-[#d7b267] bg-[#1b2230] hover:bg-[#2a2316] disabled:opacity-35 disabled:cursor-not-allowed text-[11px] font-semibold text-[#dbe3f2] hover:text-[#f8e6be] cursor-pointer"
                        >
                          + Pick
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="shrink-0 rounded border border-[#2a303f] bg-[#0f131b]/90 px-3 py-2 text-[11.5px] text-[#9aa6bc] truncate">
              <strong className="text-[#d7b267]">Holding Highcrown Keep:</strong>{" "}
              <span className="text-[#dce2ee]">
                {keepDefenders.length > 0 ? keepDefenders.map((h) => `${h.name} (${h.className})`).join(" & ") : "—"}
              </span>
            </div>
          </div>

          {/* Right Panel: Fixed-Geometry Hero Sheet so Switching Heroes Never Shifts Layout */}
          <div className="rounded border border-[#3a4254] bg-[#131720]/95 p-4 flex flex-col gap-2.5 min-h-0 md:overflow-hidden">
            {/* Hero Header (Fixed Height Band) */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-b border-[#2c3342] pb-2.5 sm:h-[118px] shrink-0">
              <img
                src={assetUrl(inspectedHero.avatarPath)}
                alt={inspectedHero.fullName}
                className="w-[100px] h-[100px] sm:w-[104px] sm:h-[104px] rounded border border-[#7c653b] object-cover shrink-0 shadow-[0_6px_20px_rgba(0,0,0,0.45)]"
                draggable={false}
              />

              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display m-0 text-[20px] font-bold tracking-wide text-[#f6e3ba] truncate">
                    {inspectedHero.fullName}
                  </h3>
                  <span
                    className={[
                      "px-2.5 py-0.5 rounded text-[10.5px] font-bold tracking-wider uppercase shrink-0 whitespace-nowrap",
                      isInspectedPicked
                        ? "bg-[#2a2113] text-[#f3d89b] border border-[#8e7442]"
                        : "bg-[#1a1f2b] text-[#9aa5b8] border border-[#384052]",
                    ].join(" ")}
                  >
                    {isInspectedPicked ? "In Party" : "Holding Highcrown Keep"}
                  </span>
                </div>

                <div className="text-[13.5px] text-[#d9b86c] font-semibold mt-0.5 truncate">
                  {inspectedHero.className} <span className="text-[#78849b]">·</span>{" "}
                  <span className="text-[#aebbd0] font-normal text-[12.5px]">{inspectedHero.shortTag}</span>
                </div>

                <div className="mt-2.5 h-[32px] flex items-center gap-2">
                  {isInspectedPicked ? (
                    <button
                      type="button"
                      onClick={() => toggleHero(inspectedHero.id)}
                      className="px-3.5 py-1.5 rounded border border-[#4c5468] hover:border-[#d67a7a] bg-[#1a1f2c] hover:bg-[#331b1b] text-[12px] font-semibold text-[#cfd7e6] hover:text-[#ffd6d6] whitespace-nowrap cursor-pointer"
                    >
                      Remove from Party
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={orderedParty.length >= 4}
                      onClick={() => toggleHero(inspectedHero.id)}
                      className="px-3.5 py-1.5 rounded border border-[#d7b267] bg-[#c49848]/25 hover:bg-[#c49848]/40 disabled:opacity-40 disabled:cursor-not-allowed text-[12px] font-semibold text-[#fff2cc] whitespace-nowrap cursor-pointer"
                    >
                      {orderedParty.length >= 4 ? "Party Full (4/4)" : "+ Add to Party"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Who They Are in Our World (Fixed Height Slot) */}
            <div className="md:h-[96px] shrink-0 overflow-y-auto pr-1">
              <div className="text-[11px] uppercase tracking-[0.12em] text-[#d9b86c] font-semibold mb-1">
                Who They Are in Ethoria
              </div>
              <p className="m-0 text-[12.5px] leading-[1.48] text-[#dce3f0]">{inspectedHero.worldBio}</p>
            </div>

            {/* Class Style & Gear (Fixed Height Slot) */}
            <div className="md:h-[92px] shrink-0 overflow-y-auto pr-1">
              <div className="text-[11px] uppercase tracking-[0.12em] text-[#d9b86c] font-semibold mb-1">Class Style</div>
              <p className="m-0 text-[12.5px] leading-[1.45] text-[#c6d0e0]">{inspectedHero.classStyle}</p>
              <div className="mt-1 text-[11.5px] text-[#98a6bc] truncate" title={inspectedHero.gearSummary}>
                <strong className="text-[#cad4e3]">Weapons &amp; Armor:</strong> {inspectedHero.gearSummary}
              </div>
            </div>

            {/* Starting Stats (Pinned Bottom Band, Fixed Height) */}
            <div className="rounded border border-[#2c3343] bg-[#0f131b]/90 py-2.5 px-3 mt-auto shrink-0">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <span className="text-[11px] uppercase tracking-[0.12em] text-[#d9b86c] font-semibold">
                  Level 1 Starting Stats
                </span>
                <div className="flex items-center gap-2 text-[11.5px]">
                  <span className="px-2 py-0.5 rounded bg-[#182820] border border-[#2d5841] text-[#83e5aa] font-semibold">
                    HP {inspectedHero.baseHp}
                  </span>
                  {inspectedHero.baseMp > 0 && (
                    <span className="px-2 py-0.5 rounded bg-[#162235] border border-[#2b4973] text-[#84bfff] font-semibold">
                      MP {inspectedHero.baseMp}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-5 gap-1.5 text-center">
                {ATTRIBUTE_META.map((stat) => {
                  const isFocus = inspectedHero.focusAttributes.includes(stat.key);
                  const startVal = inspectedHero.startingAttributes[stat.key];
                  return (
                    <div
                      key={stat.key}
                      title={`${stat.label}: ${stat.hint}${isFocus ? " (Natural Focus)" : ""}`}
                      className={[
                        "rounded py-1.5 px-1 border",
                        isFocus ? "bg-[#221c12] border-[#a88547]/80" : "bg-[#171c27] border-[#2d3546]",
                      ].join(" ")}
                    >
                      <div className={["text-[10px] font-semibold", isFocus ? "text-[#f2c96c]" : "text-[#9aa5b8]"].join(" ")}>
                        {stat.label}
                      </div>
                      <div
                        className={["text-[15px] font-bold leading-tight mt-0.5", isFocus ? "text-[#fff0c9]" : "text-[#e3e8f2]"].join(
                          " "
                        )}
                      >
                        {startVal}
                      </div>
                      <div className="text-[9px] text-[#8290a6] leading-tight mt-0.5">{stat.hint}</div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-1.5 text-[11px] text-[#9aa7bd] truncate">
                <strong className="text-[#edd59c]">Natural Focus: {inspectedHero.focusLabel}</strong> · All stats begin at{" "}
                <strong className="text-[#d6deec]">1</strong> (+2 points per level up).
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Chosen Party Preview & Begin Button */}
        <footer className="mt-3 pt-3 border-t border-[#353b4a] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11.5px] uppercase tracking-wider text-[#aeb7c7] font-semibold mr-1 whitespace-nowrap">
              Party ({orderedParty.length}/4):
            </span>
            {[0, 1, 2, 3].map((idx) => {
              const hid = orderedParty[idx];
              const h = hid ? getHeroById(hid) : null;
              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (h) setInspectId(h.id);
                  }}
                  className={[
                    "flex items-center gap-2 w-[124px] px-2.5 py-1.5 rounded border text-[12px] shrink-0",
                    h
                      ? "bg-[#1a1d27] border-[#665434] text-[#f3dfb1] cursor-pointer hover:border-[#b89652]"
                      : "bg-[#12151c] border-dashed border-[#343b49] text-[#6d7688]",
                  ].join(" ")}
                >
                  {h ? (
                    <>
                      <img src={assetUrl(h.avatarPath)} alt={h.name} className="w-[22px] h-[22px] rounded-sm object-cover shrink-0" />
                      <span className="font-semibold truncate">{h.name}</span>
                    </>
                  ) : (
                    <span>Open Spot</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-end shrink-0">
            <button
              type="button"
              disabled={orderedParty.length !== 4}
              onClick={() => {
                audioEngine.playSfx("torch", 0.58);
                onConfirm(orderedParty);
              }}
              className="px-5 py-2 rounded border border-[#d7b267] bg-[#c49848]/25 hover:bg-[#c49848]/40 disabled:opacity-40 disabled:cursor-not-allowed text-[#fff2cc] font-display text-[13px] font-semibold tracking-wider uppercase cursor-pointer whitespace-nowrap"
            >
              {orderedParty.length === 4 ? "Begin Journey" : `Pick ${4 - orderedParty.length} More`}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

interface PartyMenuModalProps {
  open: boolean;
  partyOrder: HeroId[];
  level: number;
  silver: number;
  equippedByHero: EquippedGearMap;
  itemsById: Record<string, ItemEntry>;
  bagCounts: Record<string, number>;
  learnedSpellIds: string[];
  spells: SpellEntry[];
  onEquipFromBag: (heroId: HeroId, item: ItemEntry) => void;
  onChangeOrder: (nextOrder: HeroId[]) => void;
  onClose: () => void;
}

export const PartyMenuModal: React.FC<PartyMenuModalProps> = ({
  open,
  partyOrder,
  level,
  silver,
  equippedByHero,
  itemsById,
  bagCounts,
  learnedSpellIds,
  spells,
  onEquipFromBag,
  onChangeOrder,
  onClose,
}) => {
  const [inspectIdx, setInspectIdx] = useState(0);
  const [sheetTab, setSheetTab] = useState<"stats" | "gear" | "bag_spells">("stats");

  useEffect(() => {
    if (open) setInspectIdx(0);
  }, [open]);

  if (!open) return null;

  const activeSet = new Set(partyOrder);
  const keepDefenders = HEROES.filter((h) => !activeSet.has(h.id));
  const inspectedHero = getHeroById(partyOrder[inspectIdx] ?? partyOrder[0]);

  const moveSlot = (idx: number, delta: -1 | 1) => {
    const nextIdx = idx + delta;
    if (nextIdx < 0 || nextIdx >= partyOrder.length) return;
    const copy = [...partyOrder];
    const tmp = copy[idx];
    copy[idx] = copy[nextIdx];
    copy[nextIdx] = tmp;
    onChangeOrder(copy);
    setInspectIdx(nextIdx);
  };

  const makeLeader = (idx: number) => {
    if (idx <= 0 || idx >= partyOrder.length) return;
    const copy = [...partyOrder];
    const [picked] = copy.splice(idx, 1);
    copy.unshift(picked);
    onChangeOrder(copy);
    setInspectIdx(0);
  };

  return (
    <div
      className="fixed inset-0 z-30 bg-[#06070b]/80 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="rpg-modal-panel w-[940px] max-w-[95vw] max-h-[92vh] rounded p-5 md:p-6 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-[#353b4a] pb-3 mb-4 shrink-0">
          <div>
            <h2 className="font-display m-0 text-[18px] tracking-[0.14em] uppercase text-[#f0d79d]">
              Party Order, Gear &amp; Stats (P)
            </h2>
            <p className="m-0 mt-0.5 text-[12px] text-[#a7b1c2]">
              Ordered top-to-bottom (Slots 1–4). <strong className="text-[#f2c96c]">Slot #1</strong> leads your party on the World Map · Purse: <strong className="text-[#ffe49e]">{silver.toLocaleString()}s</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-[30px] h-[30px] rounded border border-[#484f60] hover:border-[#d7b267] text-[#c8c0af] hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.15fr] gap-4 flex-1 min-h-0 overflow-y-auto">
          {/* Top-to-Bottom Active Party Stack */}
          <div className="flex flex-col gap-2">
            {partyOrder.map((hid, idx) => {
              const hero = getHeroById(hid);
              const isSelected = idx === inspectIdx;
              return (
                <div
                  key={hid}
                  onClick={() => setInspectIdx(idx)}
                  className={[
                    "rounded border p-2.5 flex items-center gap-3 cursor-pointer transition-all",
                    isSelected
                      ? "bg-[#221d14]/95 border-[#d7b267]"
                      : "bg-[#151923]/95 border-[#353c4c] hover:border-[#6e5a36]",
                  ].join(" ")}
                >
                  <div className="flex flex-col items-center w-7 shrink-0">
                    <span className={idx === 0 ? "text-[12px] font-bold text-[#f2c96c]" : "text-[12px] font-bold text-[#8e98ab]"}>
                      {idx === 0 ? "★1" : `#${idx + 1}`}
                    </span>
                  </div>

                  <img
                    src={assetUrl(hero.avatarPath)}
                    alt={hero.name}
                    className="w-[50px] h-[50px] rounded-sm object-cover shrink-0 border border-[#6e5a36]/70"
                    draggable={false}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[14.5px] font-bold text-[#f4dfb3]">{hero.name}</span>
                      {idx === 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-[#d7b267]/20 border border-[#d7b267]/60 text-[#f5d896] text-[10px] font-semibold uppercase tracking-wider">
                          Party Leader
                        </span>
                      )}
                    </div>
                    <div className="text-[11.5px] text-[#aeb7c7]">
                      {hero.className} · Lv {level}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[10.5px] text-[#b9c4d6]">
                      <span className="text-[#78e09e]">
                        HP {hero.baseHp}/{hero.baseHp}
                      </span>
                      {hero.baseMp > 0 && (
                        <span className="text-[#79b8ff]">
                          MP {hero.baseMp}/{hero.baseMp}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Reorder Buttons */}
                  <div className="flex flex-col gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveSlot(idx, -1)}
                        title="Move Up"
                        className="px-2 py-0.5 rounded border border-[#454d60] hover:border-[#d7b267] bg-[#1b202d] disabled:opacity-30 text-[11px] text-[#e2e7f0] cursor-pointer"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        disabled={idx === partyOrder.length - 1}
                        onClick={() => moveSlot(idx, 1)}
                        title="Move Down"
                        className="px-2 py-0.5 rounded border border-[#454d60] hover:border-[#d7b267] bg-[#1b202d] disabled:opacity-30 text-[11px] text-[#e2e7f0] cursor-pointer"
                      >
                        ▼
                      </button>
                    </div>
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={() => makeLeader(idx)}
                        className="px-2 py-0.5 rounded border border-[#735e37] hover:border-[#d7b267] bg-[#241e14] text-[10px] text-[#f0d79d] uppercase tracking-wider cursor-pointer"
                      >
                        Set #1
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Companion Sheet */}
          <div className="rounded border border-[#353c4c] bg-[#131720]/95 p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3 border-b border-[#2b3140] pb-2.5">
              <img
                src={assetUrl(inspectedHero.avatarPath)}
                alt={inspectedHero.name}
                className="w-[62px] h-[62px] rounded border border-[#6e5a36]/70 object-cover shrink-0"
                draggable={false}
              />
              <div className="min-w-0 flex-1">
                <h3 className="font-display m-0 text-[17px] text-[#f3dfb1] tracking-wide">{inspectedHero.fullName}</h3>
                <div className="text-[12.5px] text-[#d9b86c] font-semibold">
                  {inspectedHero.className} · Level {level}
                </div>
                <div className="text-[11px] text-[#98a3b6] mt-0.5 truncate">{inspectedHero.shortTag}</div>
              </div>
            </div>

            <div className="flex gap-1.5">
              {(
                [
                  ["stats", "Stats & Bio"],
                  ["gear", "Equipped Gear"],
                  ["bag_spells", "Spells & Bag"],
                ] as const
              ).map(([tid, label]) => (
                <button
                  key={tid}
                  type="button"
                  onClick={() => setSheetTab(tid)}
                  className={`px-2.5 py-1 rounded border text-[11.5px] font-bold cursor-pointer ${
                    sheetTab === tid
                      ? "border-[#e0ba6c] bg-[#292112] text-[#fae4b0]"
                      : "border-[#323a4d] bg-[#161b26] text-[#9eb0ca] hover:border-[#7d653c]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {sheetTab === "stats" ? (
              <>
                <p className="m-0 text-[12px] leading-relaxed text-[#cfd7e6] md:min-h-[42px]">{inspectedHero.roleSummary}</p>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-[#9ba6b8] font-semibold mb-1.5">
                    Stats (0 Points to Spend)
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 text-center">
                    {ATTRIBUTE_META.map((stat) => (
                      <div
                        key={stat.key}
                        title={`${stat.label}: ${stat.hint}`}
                        className="rounded bg-[#1a202c] border border-[#2f3747] py-1.5 px-1"
                      >
                        <div className="text-[10px] text-[#9aa5b8]">{stat.shortLabel}</div>
                        <div className="text-[14px] font-bold text-[#f3dfb1]">{inspectedHero.startingAttributes[stat.key]}</div>
                        <div className="text-[8.5px] text-[#7c879b] leading-tight mt-0.5">{stat.hint}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pt-2 border-t border-[#2b3140] text-[11.5px] text-[#aeb8c9] flex flex-col gap-1 md:min-h-[84px]">
                  <div className="text-[11px] uppercase tracking-wider text-[#d9b86c] font-semibold">Wounded Bonuses</div>
                  <div>{inspectedHero.wounded50}</div>
                  <div>{inspectedHero.wounded25}</div>
                </div>
              </>
            ) : (
              <PartyGearPanel
                tab={sheetTab}
                heroId={inspectedHero.id}
                equippedByHero={equippedByHero}
                itemsById={itemsById}
                bagCounts={bagCounts}
                learnedSpellIds={learnedSpellIds}
                spells={spells}
                onEquipFromBag={onEquipFromBag}
              />
            )}

            <div className="mt-auto pt-2.5 border-t border-[#2b3140] text-[11.5px] text-[#98a3b6]">
              <strong className="text-[#dbe2ee]">Holding Highcrown Keep:</strong>{" "}
              {keepDefenders.map((h) => `${h.name} (${h.className})`).join(" & ")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
