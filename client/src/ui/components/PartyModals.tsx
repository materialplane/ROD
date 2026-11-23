import React, { useEffect, useState } from "react";
import { assetUrl } from "../api";
import { audioEngine } from "../audio";
import { ATTRIBUTE_META, DEFAULT_PARTY_ORDER, getHeroById, HEROES } from "../heroes";
import { hideClientItemTooltip } from "../shops/itemTooltip";
import type {
  EquippedGearMap,
  GearSlot,
  HeroAttrKey,
  HeroAttrMap,
  HeroId,
  HeroSocketsMap,
  ItemEntry,
  QuestEntry,
  RunestoneItem,
  SpellEntry,
  WorldLocation,
} from "../types";
import { GearRunestonesTab } from "../party/GearRunestonesTab";
import { InventoryBagTab } from "../party/InventoryBagTab";
import { computeHeroVitals, getHeroLevel, LEDGER_TABS, type LedgerTabId } from "../party/partyLogic";
import { PartyRail } from "../party/PartyRail";
import { PartyStatsTab } from "../party/PartyStatsTab";
import { QuestJournalTab, WorldAtlasTab } from "../party/QuestAtlasTabs";
import { WeaponsSpellsTab } from "../party/WeaponsSpellsTab";

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
  currentMapId: string;
  playerX: number;
  playerY: number;
  equippedByHero: EquippedGearMap;
  itemsById: Record<string, ItemEntry>;
  bagCounts: Record<string, number>;
  tradeGoodCounts: Record<string, number>;
  learnedSpellIds: string[];
  spells: SpellEntry[];
  heroSpentAttrs: Partial<Record<HeroId, HeroAttrMap>>;
  socketsByHero: HeroSocketsMap;
  runestonesBag: RunestoneItem[];
  heroHpPct: Partial<Record<HeroId, number>>;
  heroMpPct?: Partial<Record<HeroId, number>>;
  partyXp?: number;
  heroLevels?: Partial<Record<HeroId, number>>;
  heroXp?: Partial<Record<HeroId, number>>;
  disciplinesByHero?: Partial<Record<HeroId, import("../types").HeroDisciplinesEntry>>;
  chosenDisciplinesByHero?: import("../types").ChosenDisciplinesMap;
  acceptedQuestIds: string[];
  questsCatalog: QuestEntry[];
  worldLocations: WorldLocation[];
  discoveredLocations: string[];
  sealedPortalIds: string[];
  onEquipFromBag: (heroId: HeroId, itemId: string) => void;
  onUnequipSlot: (heroId: HeroId, slot: GearSlot) => void;
  onSocketRunestone: (heroId: HeroId, stone: RunestoneItem) => void;
  onUseConsumable: (sourceIds: string[], targetHeroId: HeroId, item: ItemEntry) => void;
  onAdjustHeroStat: (heroId: HeroId, stat: HeroAttrKey, delta: number) => void;
  onResetHeroStats: (heroId: HeroId) => void;
  onChangeOrder: (nextOrder: HeroId[]) => void;
  onAbandonQuest: (questId: string) => void;
  onSaveGame: () => void;
  onOpenSettings: () => void;
  onClose: () => void;
}

export const PartyMenuModal: React.FC<PartyMenuModalProps> = ({
  open,
  partyOrder,
  level,
  silver,
  currentMapId,
  playerX,
  playerY,
  equippedByHero,
  itemsById,
  bagCounts,
  tradeGoodCounts,
  learnedSpellIds,
  spells,
  heroSpentAttrs,
  socketsByHero,
  runestonesBag,
  heroHpPct,
  heroMpPct,
  partyXp = 0,
  heroLevels,
  heroXp,
  disciplinesByHero,
  chosenDisciplinesByHero,
  acceptedQuestIds,
  questsCatalog,
  worldLocations,
  discoveredLocations,
  sealedPortalIds,
  onEquipFromBag,
  onUnequipSlot,
  onSocketRunestone,
  onUseConsumable,
  onAdjustHeroStat,
  onResetHeroStats,
  onChangeOrder,
  onAbandonQuest,
  onSaveGame,
  onOpenSettings,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<LedgerTabId>("party");
  const [selectedHeroId, setSelectedHeroId] = useState<HeroId>(partyOrder[0] ?? "valen");
  const [pendingOverwrite, setPendingOverwrite] = useState<{
    heroId: HeroId;
    stone: RunestoneItem;
    existing: RunestoneItem;
  } | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedHeroId((prev) => (partyOrder.includes(prev) ? prev : partyOrder[0] ?? "valen"));
      setPendingOverwrite(null);
    } else {
      hideClientItemTooltip();
    }
  }, [open, partyOrder]);

  useEffect(() => {
    if (!partyOrder.includes(selectedHeroId) && partyOrder[0]) {
      setSelectedHeroId(partyOrder[0]);
    }
  }, [partyOrder, selectedHeroId]);

  if (!open) return null;

  const requestSocketRunestone = (heroId: HeroId, stone: RunestoneItem) => {
    const existing = socketsByHero[heroId]?.[stone.target];
    if (existing) {
      setPendingOverwrite({ heroId, stone, existing });
      return;
    }
    onSocketRunestone(heroId, stone);
  };

  const leaderId = partyOrder[0] ?? "valen";
  const leaderHero = getHeroById(leaderId);
  const leaderLv = getHeroLevel(heroLevels, leaderId, level);
  const leaderVitals = computeHeroVitals(leaderId, leaderLv, heroSpentAttrs, equippedByHero, itemsById, socketsByHero, heroHpPct);
  const leaderTokenPath = `assets/tokens/heroes/${leaderId}_hp${leaderVitals.hpTokenState}.webp`;

  return (
    <div
      className="fixed inset-0 z-30 bg-[#06070b]/82 backdrop-blur-sm flex items-center justify-center p-2 md:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="rpg-modal-panel w-[1180px] max-w-[96vw] h-[min(760px,92vh)] rounded p-4 md:p-5 flex flex-col overflow-hidden relative">
        {/* Top Ledger Header */}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#353b4a] pb-2.5 mb-2.5 shrink-0">
          <div>
            <h2 className="font-display m-0 text-[18px] tracking-[0.12em] uppercase text-[#f0d79d]">
              Party, Gear &amp; Journey (P)
            </h2>
            <p className="m-0 mt-0.5 text-[11.5px] text-[#a7b1c2]">
              Active 4 Companions · <strong className="text-[#f2c96c]">Slot #1</strong> leads on the World Map
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2.5 py-1 rounded border border-[#5f4d2e] bg-[#1b160e] text-[12px] font-bold text-[#fae2aa]">
              Purse: {silver.toLocaleString()}s
            </span>
            <span className="px-2.5 py-1 rounded border border-[#364156] bg-[#141925] text-[12px] font-bold text-[#cfe0f5]">
              Party Lv {level}
            </span>
            <button
              type="button"
              onClick={() => {
                audioEngine.playUiClick(0.35);
                onSaveGame();
              }}
              className="px-2.5 py-1 rounded border border-[#735e37] hover:border-[#d7b267] bg-[#211b11] text-[11.5px] font-semibold text-[#fae2aa] cursor-pointer"
              title="Save Game"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                audioEngine.playUiClick(0.32);
                onOpenSettings();
              }}
              className="px-2.5 py-1 rounded border border-[#3a4256] hover:border-[#d7b267] bg-[#161c28] text-[11.5px] font-semibold text-[#d3ddec] cursor-pointer"
              title="Audio & Controls"
            >
              Settings
            </button>
            <button
              type="button"
              onClick={() => {
                hideClientItemTooltip();
                audioEngine.playUiClick(0.32);
                onClose();
              }}
              className="w-[32px] h-[32px] rounded border border-[#484f60] hover:border-[#d7b267] text-[#c8c0af] hover:text-white cursor-pointer"
              title="Close (Esc / P)"
            >
              ✕
            </button>
          </div>
        </header>

        {/* 6 Main Navigation Tabs */}
        <nav className="flex flex-wrap gap-1.5 pb-2.5 mb-2.5 border-b border-[#293040] shrink-0">
          {LEDGER_TABS.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  hideClientItemTooltip();
                  audioEngine.playUiClick(0.32);
                  setActiveTab(t.id);
                }}
                className={[
                  "flex items-center gap-2 px-3 py-1.5 rounded border text-[12px] font-semibold cursor-pointer transition",
                  isActive
                    ? "border-[#d7b267] bg-gradient-to-b from-[#2c2315] to-[#1a160f] text-[#fff1cb]"
                    : "border-[#2e3547] bg-[#141925] text-[#aab6ca] hover:border-[#6a5b3e] hover:text-[#e5ecf8]",
                ].join(" ")}
              >
                <img src={assetUrl(t.icon)} alt="" className="w-[17px] h-[17px] object-contain shrink-0" draggable={false} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Tab Workspace Body */}
        <div className="flex-1 min-h-0 flex gap-3 overflow-hidden">
          {(activeTab === "party" || activeTab === "gear" || activeTab === "skills") && (
            <PartyRail
              partyOrder={partyOrder}
              selectedHeroId={selectedHeroId}
              level={level}
              heroLevels={heroLevels}
              heroSpentAttrs={heroSpentAttrs}
              equippedByHero={equippedByHero}
              itemsById={itemsById}
              socketsByHero={socketsByHero}
              heroHpPct={heroHpPct}
              heroMpPct={heroMpPct}
              onSelectHero={setSelectedHeroId}
              onChangeOrder={onChangeOrder}
            />
          )}

          {activeTab === "party" && (
            <PartyStatsTab
              heroId={selectedHeroId}
              partyOrder={partyOrder}
              level={level}
              partyXp={partyXp}
              heroLevels={heroLevels}
              heroXp={heroXp}
              heroSpentAttrs={heroSpentAttrs}
              equippedByHero={equippedByHero}
              itemsById={itemsById}
              socketsByHero={socketsByHero}
              heroHpPct={heroHpPct}
              heroMpPct={heroMpPct}
              disciplinesByHero={disciplinesByHero}
              chosenDisciplinesByHero={chosenDisciplinesByHero}
              onAdjustStat={onAdjustHeroStat}
              onResetStats={onResetHeroStats}
            />
          )}

          {activeTab === "gear" && (
            <GearRunestonesTab
              heroId={selectedHeroId}
              equippedByHero={equippedByHero}
              itemsById={itemsById}
              bagCounts={bagCounts}
              socketsByHero={socketsByHero}
              runestonesBag={runestonesBag}
              onEquipFromBag={onEquipFromBag}
              onUnequipSlot={onUnequipSlot}
              onRequestSocketRunestone={requestSocketRunestone}
            />
          )}

          {activeTab === "skills" && (
            <WeaponsSpellsTab
              heroId={selectedHeroId}
              equippedByHero={equippedByHero}
              itemsById={itemsById}
              spells={spells}
              learnedSpellIds={learnedSpellIds}
            />
          )}

          {activeTab === "bag" && (
            <InventoryBagTab
              partyOrder={partyOrder}
              selectedHeroId={selectedHeroId}
              bagCounts={bagCounts}
              tradeGoodCounts={tradeGoodCounts}
              itemsById={itemsById}
              equippedByHero={equippedByHero}
              runestonesBag={runestonesBag}
              onEquipFromBag={onEquipFromBag}
              onUseConsumable={onUseConsumable}
              onRequestSocketRunestone={requestSocketRunestone}
            />
          )}

          {activeTab === "journal" && (
            <QuestJournalTab
              acceptedQuestIds={acceptedQuestIds}
              questsCatalog={questsCatalog}
              worldLocations={worldLocations}
              sealedPortalIds={sealedPortalIds}
              onAbandonQuest={onAbandonQuest}
            />
          )}

          {activeTab === "atlas" && (
            <WorldAtlasTab
              currentMapId={currentMapId}
              playerX={playerX}
              playerY={playerY}
              leaderName={leaderHero.name}
              leaderTokenPath={leaderTokenPath}
              worldLocations={worldLocations}
              discoveredLocations={discoveredLocations}
              acceptedQuestIds={acceptedQuestIds}
              questsCatalog={questsCatalog}
              sealedPortalIds={sealedPortalIds}
            />
          )}
        </div>

        {/* Permanent Runestone Overwrite Confirmation Overlay */}
        {pendingOverwrite && (
          <div
            className="fixed inset-0 z-50 bg-[#05060a]/80 flex items-center justify-center p-4"
            onClick={() => setPendingOverwrite(null)}
          >
            <div
              className="rpg-modal-panel w-[440px] max-w-[92vw] rounded border border-[#8e6e3e] p-5 flex flex-col gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-display m-0 text-[16.5px] text-[#fae2aa]">Overwrite Socketed Runestone?</h3>
              <p className="m-0 text-[12.5px] text-[#d5deed] leading-relaxed">
                {getHeroById(pendingOverwrite.heroId).name}&apos;s{" "}
                <strong>{pendingOverwrite.stone.target === "weapon" ? "Weapon" : "Body Armor"}</strong> already holds{" "}
                <strong className="text-[#e7dcff]">&ldquo;{pendingOverwrite.existing.name}&rdquo;</strong>. Socketing{" "}
                <strong className="text-[#fae2aa]">&ldquo;{pendingOverwrite.stone.name}&rdquo;</strong> will permanently
                destroy the previous Runestone.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    audioEngine.playUiClick(0.32);
                    setPendingOverwrite(null);
                  }}
                  className="px-3.5 py-1.5 rounded border border-[#454d60] hover:border-[#d7b267] bg-[#1a202d] text-[12px] font-semibold text-[#dfe7f4] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    audioEngine.playUiClick(0.45);
                    onSocketRunestone(pendingOverwrite.heroId, pendingOverwrite.stone);
                    setPendingOverwrite(null);
                  }}
                  className="px-4 py-1.5 rounded border border-[#c95c68] bg-[#78242e] hover:bg-[#962e3b] text-[12px] font-bold text-[#ffecee] cursor-pointer"
                >
                  Overwrite &amp; Destroy Old Stone
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
