import React, { useEffect, useMemo, useState } from "react";
import { assetUrl } from "../api";
import { audioEngine } from "../audio";
import { getHeroById } from "../heroes";
import { hideClientItemTooltip, itemTooltipHandlers } from "../shops/itemTooltip";
import type { EquippedGearMap, HeroId, ItemEntry, RunestoneItem } from "../types";
import {
  type BagFilterGroup,
  type BagSortMode,
  mergeBagEntries,
  type MergedBagEntry,
  summarizeItemStats,
} from "./partyLogic";

interface InventoryBagTabProps {
  partyOrder: HeroId[];
  selectedHeroId: HeroId;
  bagCounts: Record<string, number>;
  tradeGoodCounts: Record<string, number>;
  itemsById: Record<string, ItemEntry>;
  equippedByHero: EquippedGearMap;
  runestonesBag: RunestoneItem[];
  onEquipFromBag: (heroId: HeroId, itemId: string) => void;
  onUseConsumable: (sourceIds: string[], targetHeroId: HeroId, item: ItemEntry) => void;
  onRequestSocketRunestone: (heroId: HeroId, stone: RunestoneItem) => void;
}

const FILTER_PILLS: Array<{ id: BagFilterGroup; label: string }> = [
  { id: "all", label: "All" },
  { id: "potions", label: "Potions" },
  { id: "runestones", label: "Runestones" },
  { id: "gear", label: "Gear" },
  { id: "trade_goods", label: "Trade Goods" },
  { id: "keys", label: "Key Items" },
];

export const InventoryBagTab: React.FC<InventoryBagTabProps> = ({
  partyOrder,
  selectedHeroId,
  bagCounts,
  tradeGoodCounts,
  itemsById,
  equippedByHero,
  runestonesBag,
  onEquipFromBag,
  onUseConsumable,
  onRequestSocketRunestone,
}) => {
  const [filterGroup, setFilterGroup] = useState<BagFilterGroup>("all");
  const [sortMode, setSortMode] = useState<BagSortMode>("category");
  const [searchText, setSearchText] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [targetHero, setTargetHero] = useState<HeroId>(selectedHeroId);

  useEffect(() => {
    setTargetHero(selectedHeroId);
  }, [selectedHeroId]);

  useEffect(() => () => hideClientItemTooltip(), []);

  const allEntries = useMemo(
    () => mergeBagEntries(bagCounts, tradeGoodCounts, itemsById, runestonesBag),
    [bagCounts, tradeGoodCounts, itemsById, runestonesBag]
  );

  const tradeGoodsTotalSilver = useMemo(
    () =>
      allEntries
        .filter((e) => e.group === "trade_goods")
        .reduce((sum, e) => sum + e.silver * e.count, 0),
    [allEntries]
  );

  const visibleEntries = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const list = allEntries.filter((e) => {
      if (filterGroup !== "all" && e.group !== filterGroup) return false;
      if (sortMode === "usable" && e.kind === "item" && e.item?.usableBy && !e.item.usableBy.includes(selectedHeroId)) {
        return false;
      }
      if (q && !e.name.toLowerCase().includes(q) && !e.subType.toLowerCase().includes(q)) return false;
      return true;
    });

    list.sort((a, b) => {
      if (sortMode === "value_desc") return b.silver - a.silver || a.name.localeCompare(b.name);
      if (sortMode === "step_desc") return b.tierNum - a.tierNum || a.name.localeCompare(b.name);
      if (sortMode === "name_asc") return a.name.localeCompare(b.name);
      return a.group.localeCompare(b.group) || b.tierNum - a.tierNum || a.name.localeCompare(b.name);
    });
    return list;
  }, [allEntries, filterGroup, sortMode, searchText, selectedHeroId]);

  const activeEntry: MergedBagEntry | null =
    visibleEntries.find((e) => `${e.kind}:${e.id}` === selectedKey) ?? visibleEntries[0] ?? null;

  const selectedHeroMeta = getHeroById(selectedHeroId);

  const compatGearParty =
    activeEntry?.group === "gear" && activeEntry.item
      ? partyOrder.filter((hid) => (activeEntry.item!.usableBy ?? []).includes(hid))
      : [];

  const chosenEquipHero = compatGearParty.includes(targetHero) ? targetHero : compatGearParty[0];

  return (
    <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1.28fr_0.92fr] gap-3">
      {/* Left Bag List */}
      <div className="rounded border border-[#323a4b] bg-[#10141d]/95 p-3 flex flex-col gap-2.5 min-h-0">
        <div className="flex flex-col gap-2 shrink-0">
          <div className="flex flex-wrap gap-1.5">
            {FILTER_PILLS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  audioEngine.playUiClick(0.3);
                  setFilterGroup(p.id);
                }}
                className={[
                  "px-2.5 py-1 rounded border text-[11.5px] font-semibold cursor-pointer transition",
                  filterGroup === p.id
                    ? "border-[#d7b267] bg-[#2a2214] text-[#fae2aa]"
                    : "border-[#2f3648] bg-[#161b26] text-[#aeb9cc] hover:border-[#6a5b3e]",
                ].join(" ")}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search items in bag..."
              className="flex-1 min-w-[160px] px-2.5 py-1.5 rounded border border-[#31384a] bg-[#0b0e15] text-[12px] text-[#e6edf7] placeholder-[#6f7d94] focus:outline-none focus:border-[#c8a256]"
            />
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as BagSortMode)}
              className="px-2.5 py-1.5 rounded border border-[#31384a] bg-[#0b0e15] text-[11.5px] text-[#dfe7f4] focus:outline-none focus:border-[#c8a256] cursor-pointer"
            >
              <option value="category">Sort: Category</option>
              <option value="step_desc">Sort: Highest Tier</option>
              <option value="value_desc">Sort: Silver Value</option>
              <option value="name_asc">Sort: Name A–Z</option>
              <option value="usable">Filter: Usable by {selectedHeroMeta.name}</option>
            </select>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5 content-start pr-1">
          {visibleEntries.length === 0 ? (
            <div className="col-span-full py-8 text-center text-[12.5px] text-[#8d99b0]">
              No matching items in your pack.
            </div>
          ) : (
            visibleEntries.map((entry) => {
              const eKey = `${entry.kind}:${entry.id}`;
              const isSelected = activeEntry && `${activeEntry.kind}:${activeEntry.id}` === eKey;
              return (
                <button
                  key={eKey}
                  type="button"
                  onClick={() => {
                    audioEngine.playUiClick(0.28);
                    setSelectedKey(eKey);
                  }}
                  className={[
                    "rounded border p-2 flex items-center gap-2.5 text-left transition cursor-pointer",
                    isSelected
                      ? "border-[#d7b267] bg-gradient-to-br from-[#231d13] to-[#131722]"
                      : "border-[#2a3142] bg-[#141925] hover:border-[#645538]",
                  ].join(" ")}
                  {...(entry.item
                    ? itemTooltipHandlers(entry.item, {
                        activeHeroId: selectedHeroId,
                        equippedByHero,
                        itemsById,
                      })
                    : {})}
                >
                  <img
                    src={assetUrl(entry.iconPath)}
                    alt={entry.name}
                    className="w-[38px] h-[38px] rounded border border-[#4a3e28] bg-[#0b0e14] object-contain shrink-0"
                    draggable={false}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-semibold text-[#f3dfb1] truncate">{entry.name}</div>
                    <div className="text-[10.5px] text-[#98a7bf] truncate">
                      ×{entry.count} · {entry.subType}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Inspection & Action Pane */}
      <div className="rounded border border-[#323a4b] bg-[#11151f]/95 p-4 flex flex-col gap-3 min-h-0 overflow-y-auto">
        {!activeEntry ? (
          <div className="flex-1 flex items-center justify-center text-[13px] text-[#8d99b0]">
            Select any item in your pack to inspect or use it.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-[#293040] pb-3">
              <img
                src={assetUrl(activeEntry.iconPath)}
                alt={activeEntry.name}
                className="w-[60px] h-[60px] rounded border border-[#8a703e] bg-[#0b0e14] object-contain shrink-0"
                draggable={false}
              />
              <div className="min-w-0 flex-1">
                <h3 className="font-display m-0 text-[16.5px] text-[#fae2aa] leading-tight">{activeEntry.name}</h3>
                <div className="text-[12px] text-[#9fb0c8] mt-1">
                  {activeEntry.subType} · In Bag: <strong className="text-white">×{activeEntry.count}</strong>
                </div>
                {activeEntry.silver > 0 && (
                  <div className="text-[11.5px] text-[#e5c372] mt-0.5">
                    Sell Value: {activeEntry.silver.toLocaleString()}s each
                  </div>
                )}
              </div>
            </div>

            <div className="text-[12.5px] text-[#d8e0ed] leading-relaxed">
              {activeEntry.kind === "runestone"
                ? activeEntry.runestone?.affix
                : activeEntry.item?.effect || summarizeItemStats(activeEntry.item)}
            </div>

            {activeEntry.group === "potions" && activeEntry.item && (
              <div className="mt-1 rounded border border-[#2c3445] bg-[#0d1119] p-3 flex flex-col gap-2.5">
                <div className="text-[11px] text-[#9bb0c8]">
                  Identical consumables combine into a single unlimited stack.
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={targetHero}
                    onChange={(e) => setTargetHero(e.target.value as HeroId)}
                    className="px-2.5 py-1.5 rounded border border-[#353d50] bg-[#141925] text-[12px] text-[#eaeff8] cursor-pointer"
                  >
                    {partyOrder.map((hid) => {
                      const h = getHeroById(hid);
                      return (
                        <option key={hid} value={hid}>
                          {h.name} ({h.className})
                        </option>
                      );
                    })}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      audioEngine.playUiClick(0.4);
                      onUseConsumable(activeEntry.sourceIds, targetHero, activeEntry.item!);
                    }}
                    className="px-3.5 py-1.5 rounded border border-[#56a874] bg-[#21613d]/60 hover:bg-[#2a7d4e]/80 text-[11.5px] font-bold uppercase tracking-wider text-[#eafff2] cursor-pointer"
                  >
                    Use on Hero
                  </button>
                </div>
              </div>
            )}

            {activeEntry.group === "gear" && activeEntry.item && (
              <div className="mt-1 rounded border border-[#2c3445] bg-[#0d1119] p-3 flex flex-col gap-2.5">
                <div className="text-[11.5px] text-[#b8c4d8]">
                  Usable by:{" "}
                  <strong className="text-[#fae2aa]">
                    {(activeEntry.item.usableBy ?? []).map((id) => getHeroById(id).name).join(", ")}
                  </strong>
                </div>
                {compatGearParty.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={chosenEquipHero}
                      onChange={(e) => setTargetHero(e.target.value as HeroId)}
                      className="px-2.5 py-1.5 rounded border border-[#353d50] bg-[#141925] text-[12px] text-[#eaeff8] cursor-pointer"
                    >
                      {compatGearParty.map((hid) => (
                        <option key={hid} value={hid}>
                          {getHeroById(hid).name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        if (!chosenEquipHero) return;
                        audioEngine.playUiClick(0.38);
                        onEquipFromBag(chosenEquipHero, activeEntry.item!.id);
                      }}
                      className="px-3.5 py-1.5 rounded border border-[#c7a052] bg-[#c49848]/30 hover:bg-[#c49848]/50 text-[11.5px] font-bold uppercase tracking-wider text-[#fff1cb] cursor-pointer"
                    >
                      Equip on Hero
                    </button>
                  </div>
                ) : (
                  <div className="text-[11.5px] text-[#98a6bc]">
                    None of your active 4 party members use this gear type.
                  </div>
                )}
              </div>
            )}

            {activeEntry.group === "runestones" && activeEntry.runestone && (
              <div className="mt-1 rounded border border-[#3b3252] bg-[#141120] p-3 flex flex-col gap-2.5">
                <div className="text-[11.5px] text-[#cdc1ec]">
                  Fits <strong>{activeEntry.runestone.target === "weapon" ? "Right Hand Weapon" : "Body Armor"}</strong>{" "}
                  socket. Permanently binds to the selected companion&apos;s slot.
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={targetHero}
                    onChange={(e) => setTargetHero(e.target.value as HeroId)}
                    className="px-2.5 py-1.5 rounded border border-[#43395d] bg-[#191529] text-[12px] text-[#eaeff8] cursor-pointer"
                  >
                    {partyOrder.map((hid) => {
                      const h = getHeroById(hid);
                      return (
                        <option key={hid} value={hid}>
                          {h.name} ({h.className})
                        </option>
                      );
                    })}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      audioEngine.playUiClick(0.4);
                      onRequestSocketRunestone(targetHero, activeEntry.runestone!);
                    }}
                    className="px-3.5 py-1.5 rounded border border-[#9d7ee0] bg-[#694da8]/35 hover:bg-[#694da8]/55 text-[11.5px] font-bold uppercase tracking-wider text-[#f3ebff] cursor-pointer"
                  >
                    Socket on Hero
                  </button>
                </div>
              </div>
            )}

            {activeEntry.group === "trade_goods" && (
              <div className="mt-1 rounded border border-[#5b492c] bg-[#1a150e] p-3 text-[12px] text-[#dfcfb0] leading-relaxed">
                Sell-only loot worth <strong className="text-[#fae2aa]">{activeEntry.silver.toLocaleString()}s</strong>{" "}
                each at any town Trade Goods Buyer.
                <div className="mt-1 text-[#b8c6db]">
                  Total Trade Goods value in pack:{" "}
                  <strong className="text-[#fae2aa]">{tradeGoodsTotalSilver.toLocaleString()}s</strong>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
