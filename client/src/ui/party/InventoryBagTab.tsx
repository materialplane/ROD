import React, { useEffect, useMemo, useState } from "react";
import { assetUrl } from "../api";
import { audioEngine } from "../audio";
import { getHeroById } from "../heroes";
import { hideClientItemTooltip, itemTooltipHandlers, runestoneTooltipHandlers } from "../shops/itemTooltip";
import { WeaponAttackIconsRow } from "../shops/WeaponAttackIconsRow";
import { canDualWieldItem } from "../shops/shopLogic";
import type {
  EquippedGearMap,
  GearSlot,
  HeroAttrMap,
  HeroId,
  HeroSocketsMap,
  ItemEntry,
  RunestoneItem,
} from "../types";
import {
  type BagFilterGroup,
  type BagSortMode,
  computeHeroVitals,
  getHeroLevel,
  mergeBagEntries,
  type MergedBagEntry,
  summarizeItemStats,
} from "./partyLogic";

interface InventoryBagTabProps {
  partyOrder: HeroId[];
  selectedHeroId: HeroId;
  level?: number;
  heroLevels?: Partial<Record<HeroId, number>>;
  heroSpentAttrs?: Partial<Record<HeroId, HeroAttrMap>>;
  socketsByHero?: HeroSocketsMap;
  heroHpPct?: Partial<Record<HeroId, number>>;
  heroMpPct?: Partial<Record<HeroId, number>>;
  bagCounts: Record<string, number>;
  tradeGoodCounts: Record<string, number>;
  itemsById: Record<string, ItemEntry>;
  equippedByHero: EquippedGearMap;
  runestonesBag: RunestoneItem[];
  onEquipFromBag: (heroId: HeroId, itemId: string, targetSlot?: GearSlot) => void;
  onUseConsumable: (sourceIds: string[], targetHeroId: HeroId, item: ItemEntry) => void;
  onRequestSocketRunestone: (heroId: HeroId, stone: RunestoneItem) => void;
}

const HEALTH_STATE_LABELS: Record<1 | 2 | 3 | 4, { label: string; colorClass: string }> = {
  1: { label: "Healthy", colorClass: "text-[#8be0b2]" },
  2: { label: "Wounded", colorClass: "text-[#f2d379]" },
  3: { label: "Battered", colorClass: "text-[#f59f5b]" },
  4: { label: "Critical", colorClass: "text-[#f27986]" },
};

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
  level = 1,
  heroLevels,
  heroSpentAttrs = {},
  socketsByHero = {},
  heroHpPct,
  heroMpPct,
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
                    : entry.runestone
                      ? runestoneTooltipHandlers(entry.runestone)
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
            <div
              className="flex items-center gap-3 border-b border-[#293040] pb-3 rounded p-1 -m-1"
              {...(activeEntry.item
                ? itemTooltipHandlers(activeEntry.item, {
                    activeHeroId: selectedHeroId,
                    equippedByHero,
                    itemsById,
                  })
                : activeEntry.runestone
                  ? runestoneTooltipHandlers(activeEntry.runestone)
                  : {})}
            >
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

            {activeEntry.item?.category === "weapon" && (
              <div className="rounded border border-[#2c3445] bg-[#0d1119] p-2.5 flex items-center justify-between gap-2">
                <div className="flex flex-col">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#e5c37a]">Weapon Attacks</span>
                  <span className="text-[10.5px] text-[#8f9fb8]">Hover icon for attack details</span>
                </div>
                <WeaponAttackIconsRow
                  subType={activeEntry.item.subType}
                  damageType={activeEntry.item.damageType}
                  size="md"
                />
              </div>
            )}

            {activeEntry.group === "potions" && activeEntry.item && (() => {
              const pItem = activeEntry.item;
              const isPureMp = /mana|mp/i.test(pItem.name) && !/elixir|phoenix/i.test(pItem.name);
              const isCureOnly = /antidote|cooling|warming|clarity|panacea/i.test(pItem.name);
              const chosenHero = partyOrder.includes(targetHero) ? targetHero : partyOrder[0];
              const chosenMeta = chosenHero ? getHeroById(chosenHero) : null;
              const chosenLv = chosenHero ? getHeroLevel(heroLevels, chosenHero, level) : 1;
              const chosenVitals = chosenHero
                ? computeHeroVitals(chosenHero, chosenLv, heroSpentAttrs, equippedByHero, itemsById, socketsByHero, heroHpPct, heroMpPct)
                : null;
              const chosenDisabled =
                !chosenVitals ||
                isCureOnly ||
                (isPureMp ? !chosenVitals.hasMp || chosenVitals.curMp >= chosenVitals.maxMp : chosenVitals.hpRatio >= 100);

              return (
                <div className="mt-1 rounded border border-[#2c3445] bg-[#0d1119] p-3 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#d9b468]">
                      Select Companion
                    </span>
                    <span className="text-[10.5px] text-[#8d9cb5]">Identical consumables stack automatically</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {partyOrder.map((hid) => {
                      const h = getHeroById(hid);
                      const hLv = getHeroLevel(heroLevels, hid, level);
                      const v = computeHeroVitals(hid, hLv, heroSpentAttrs, equippedByHero, itemsById, socketsByHero, heroHpPct, heroMpPct);
                      const isTarget = chosenHero === hid;
                      const healthInfo = HEALTH_STATE_LABELS[v.hpTokenState];
                      const hpFill =
                        v.hpRatio > 75 ? "bg-[#3fb97c]" : v.hpRatio > 50 ? "bg-[#d9b24c]" : v.hpRatio > 25 ? "bg-[#e37f3b]" : "bg-[#d94d5c]";
                      const mpPct = v.hasMp && v.maxMp > 0 ? Math.min(100, Math.round((v.curMp / v.maxMp) * 100)) : 0;

                      return (
                        <button
                          key={hid}
                          type="button"
                          onClick={() => {
                            audioEngine.playUiClick(0.28);
                            setTargetHero(hid);
                          }}
                          className={[
                            "rounded border p-2 flex items-center gap-2.5 text-left transition cursor-pointer",
                            isTarget
                              ? "border-[#e5c170] bg-gradient-to-br from-[#282012] to-[#131824] shadow-[0_0_14px_rgba(229,193,112,0.22)]"
                              : "border-[#2a3142] bg-[#141925] hover:border-[#6a5b3e]",
                          ].join(" ")}
                        >
                          <img
                            src={assetUrl(`assets/tokens/heroes/${hid}_hp${v.hpTokenState}.webp`)}
                            alt={`${h.name} (${healthInfo.label})`}
                            draggable={false}
                            className="w-[46px] h-[46px] rounded-full object-cover shrink-0 bg-[#080a0f]"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[12.5px] font-bold text-[#fae4b0] truncate">{h.name}</span>
                              <span className={`text-[10px] font-bold uppercase ${healthInfo.colorClass}`}>
                                {healthInfo.label}
                              </span>
                            </div>

                            <div className="mt-1">
                              <div className="flex justify-between text-[10px] text-[#cfe0f5] leading-none mb-0.5">
                                <span>HP</span>
                                <span>
                                  {v.curHp} / {v.maxHp}
                                </span>
                              </div>
                              <div className="h-[5px] w-full rounded-full bg-[#1a202e] overflow-hidden border border-[#2d3648]">
                                <div className={`h-full ${hpFill} transition-all`} style={{ width: `${v.hpRatio}%` }} />
                              </div>
                            </div>

                            {v.hasMp ? (
                              <div className="mt-1">
                                <div className="flex justify-between text-[10px] text-[#b4ccf0] leading-none mb-0.5">
                                  <span>MP</span>
                                  <span>
                                    {v.curMp} / {v.maxMp}
                                  </span>
                                </div>
                                <div className="h-[5px] w-full rounded-full bg-[#1a202e] overflow-hidden border border-[#2d3648]">
                                  <div className="h-full bg-[#4b92e6] transition-all" style={{ width: `${mpPct}%` }} />
                                </div>
                              </div>
                            ) : (
                              <div className="mt-1 text-[9.5px] text-[#7887a0]">Martial · No MP</div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <span className="text-[11px] text-[#9fb0c8]">
                      {isCureOnly
                        ? "Cure potions apply in combat when afflicted."
                        : isPureMp && chosenVitals && !chosenVitals.hasMp
                          ? `${chosenMeta?.name ?? "Hero"} does not use MP.`
                          : isPureMp && chosenVitals && chosenVitals.curMp >= chosenVitals.maxMp
                            ? `${chosenMeta?.name ?? "Hero"} is already at full MP.`
                            : !isPureMp && chosenVitals && chosenVitals.hpRatio >= 100
                              ? `${chosenMeta?.name ?? "Hero"} is already at full HP.`
                              : `Ready to use on ${chosenMeta?.name ?? "Hero"}.`}
                    </span>
                    <button
                      type="button"
                      disabled={chosenDisabled}
                      onClick={() => {
                        if (!chosenHero || chosenDisabled) return;
                        audioEngine.playUiClick(0.4);
                        onUseConsumable(activeEntry.sourceIds, chosenHero, pItem);
                      }}
                      className={[
                        "px-4 py-1.5 rounded border text-[11.5px] font-bold uppercase tracking-wider shrink-0 transition-colors",
                        chosenDisabled
                          ? "border-[#2f3648] bg-[#161b26] text-[#6d7a91] cursor-default"
                          : "border-[#56a874] bg-[#21613d]/65 hover:bg-[#2a7d4e]/85 text-[#eafff2] cursor-pointer",
                      ].join(" ")}
                    >
                      Use on {chosenMeta?.name ?? "Hero"}
                    </button>
                  </div>
                </div>
              );
            })()}

            {activeEntry.group === "gear" && activeEntry.item && (
              <div className="mt-1 rounded border border-[#2c3445] bg-[#0d1119] p-3 flex flex-col gap-2.5">
                <div className="text-[11.5px] text-[#b8c4d8]">
                  Usable by:{" "}
                  <strong className="text-[#fae2aa]">
                    {(activeEntry.item.usableBy ?? []).map((id) => getHeroById(id).name).join(", ")}
                  </strong>
                </div>
                {compatGearParty.length > 0 ? (
                  <div className="flex flex-col gap-2.5">
                    <div className="grid grid-cols-2 gap-1.5">
                      {compatGearParty.map((hid) => {
                        const h = getHeroById(hid);
                        const hLv = getHeroLevel(heroLevels, hid, level);
                        const v = computeHeroVitals(hid, hLv, heroSpentAttrs, equippedByHero, itemsById, socketsByHero, heroHpPct, heroMpPct);
                        const isTarget = chosenEquipHero === hid;
                        return (
                          <button
                            key={hid}
                            type="button"
                            onClick={() => {
                              audioEngine.playUiClick(0.28);
                              setTargetHero(hid);
                            }}
                            className={[
                              "rounded border p-2 flex items-center gap-2 text-left transition cursor-pointer",
                              isTarget
                                ? "border-[#e5c170] bg-[#282012]"
                                : "border-[#2a3142] bg-[#141925] hover:border-[#6a5b3e]",
                            ].join(" ")}
                          >
                            <img
                              src={assetUrl(`assets/tokens/heroes/${hid}_hp${v.hpTokenState}.webp`)}
                              alt={h.name}
                              draggable={false}
                              className="w-[34px] h-[34px] rounded-full object-cover shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="text-[12px] font-bold text-[#fae4b0] truncate">{h.name}</div>
                              <div className="text-[10px] text-[#98a7bf] truncate">{h.className}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {chosenEquipHero && canDualWieldItem(chosenEquipHero, activeEntry.item) && itemsById[equippedByHero[chosenEquipHero]?.right_hand ?? ""]?.handed === "1H" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              if (!chosenEquipHero) return;
                              audioEngine.playUiClick(0.38);
                              onEquipFromBag(chosenEquipHero, activeEntry.item!.id, "right_hand");
                            }}
                            className="px-3 py-1.5 rounded border border-[#c7a052] bg-[#c49848]/30 hover:bg-[#c49848]/50 text-[11px] font-bold uppercase tracking-wider text-[#fff1cb] cursor-pointer"
                          >
                            Equip Main ({getHeroById(chosenEquipHero).name})
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!chosenEquipHero) return;
                              audioEngine.playUiClick(0.38);
                              onEquipFromBag(chosenEquipHero, activeEntry.item!.id, "left_hand");
                            }}
                            className="px-3 py-1.5 rounded border border-[#56a874] bg-[#21613d]/55 hover:bg-[#2a7d4e]/75 text-[11px] font-bold uppercase tracking-wider text-[#eafff2] cursor-pointer"
                          >
                            Equip Off-Hand
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (!chosenEquipHero) return;
                            audioEngine.playUiClick(0.38);
                            onEquipFromBag(chosenEquipHero, activeEntry.item!.id);
                          }}
                          className="px-3.5 py-1.5 rounded border border-[#c7a052] bg-[#c49848]/30 hover:bg-[#c49848]/50 text-[11.5px] font-bold uppercase tracking-wider text-[#fff1cb] cursor-pointer"
                        >
                          Equip on {chosenEquipHero ? getHeroById(chosenEquipHero).name : "Hero"}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-[11.5px] text-[#98a6bc]">
                    None of your active 4 party members use this gear type.
                  </div>
                )}
              </div>
            )}

            {activeEntry.group === "runestones" && activeEntry.runestone && (() => {
              const rs = activeEntry.runestone;
              const chosenHero = partyOrder.includes(targetHero) ? targetHero : partyOrder[0];
              return (
                <div className="mt-1 rounded border border-[#3b3252] bg-[#141120] p-3 flex flex-col gap-2.5">
                  <div className="text-[11.5px] text-[#cdc1ec]">
                    Fits <strong>{rs.target === "weapon" ? "Right Hand Weapon" : "Body Armor"}</strong>{" "}
                    socket. Permanently binds to the selected companion&apos;s slot.
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {partyOrder.map((hid) => {
                      const h = getHeroById(hid);
                      const hLv = getHeroLevel(heroLevels, hid, level);
                      const v = computeHeroVitals(hid, hLv, heroSpentAttrs, equippedByHero, itemsById, socketsByHero, heroHpPct, heroMpPct);
                      const isTarget = chosenHero === hid;
                      const occupied = Boolean(socketsByHero?.[hid]?.[rs.target]);
                      return (
                        <button
                          key={hid}
                          type="button"
                          onClick={() => {
                            audioEngine.playUiClick(0.28);
                            setTargetHero(hid);
                          }}
                          className={[
                            "rounded border p-2 flex items-center gap-2 text-left transition cursor-pointer",
                            isTarget
                              ? "border-[#b594f0] bg-[#241c38]"
                              : "border-[#302845] bg-[#171324] hover:border-[#6f5b9e]",
                          ].join(" ")}
                        >
                          <img
                            src={assetUrl(`assets/tokens/heroes/${hid}_hp${v.hpTokenState}.webp`)}
                            alt={h.name}
                            draggable={false}
                            className="w-[34px] h-[34px] rounded-full object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-[12px] font-bold text-[#f1e7ff] truncate">{h.name}</div>
                            <div className="text-[10px] text-[#b4a6d4] truncate">
                              {occupied ? "Occupied (Overwrites)" : "Open Socket"}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (!chosenHero) return;
                        audioEngine.playUiClick(0.4);
                        onRequestSocketRunestone(chosenHero, rs);
                      }}
                      className="px-3.5 py-1.5 rounded border border-[#9d7ee0] bg-[#694da8]/35 hover:bg-[#694da8]/55 text-[11.5px] font-bold uppercase tracking-wider text-[#f3ebff] cursor-pointer"
                    >
                      Socket on {chosenHero ? getHeroById(chosenHero).name : "Hero"}
                    </button>
                  </div>
                </div>
              );
            })()}

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
