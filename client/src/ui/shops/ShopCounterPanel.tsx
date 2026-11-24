import React, { useEffect, useState } from "react";
import { assetUrl } from "../api";
import { audioEngine } from "../audio";
import { getHeroById } from "../heroes";
import type {
  ChosenDisciplinesMap,
  DisciplineOption,
  EquippedGearMap,
  GearSlot,
  HeroDisciplinesEntry,
  HeroId,
  ItemEntry,
  NpcEntry,
  ShopType,
  SpellEntry,
  WorldLocation,
} from "../types";
import { CompareBox } from "./CompareBox";
import { DisciplinesShopView } from "./DisciplinesShopView";
import { hideClientItemTooltip, itemTooltipHandlers } from "./itemTooltip";
import {
  computeHeroDelta,
  countRegionSpellsForHero,
  getStockForHero,
  itemSlotFor,
  itemSlotForHero,
  MAX_SPELLS_PER_REGION,
  parseHubSteps,
  SHOP_META,
  type ShopCatalogEntry,
} from "./shopLogic";

export interface BuyConfirmChoice {
  entry: ShopCatalogEntry;
  mode: "equip" | "equip_sell_old" | "bag" | "spell";
  heroId: HeroId;
  oldItem?: ItemEntry | null;
  targetSlot?: GearSlot;
}

interface ShopCounterPanelProps {
  hub: WorldLocation;
  npc: NpcEntry;
  shopType: ShopType;
  townShopTypes?: ShopType[];
  partyOrder: HeroId[];
  partyLevel?: number;
  heroLevels?: Partial<Record<HeroId, number>>;
  silver: number;
  items: ItemEntry[];
  itemsById: Record<string, ItemEntry>;
  spells: SpellEntry[];
  equippedByHero: EquippedGearMap;
  learnedSpellIds: string[];
  disciplinesByHero?: Partial<Record<HeroId, HeroDisciplinesEntry>>;
  chosenDisciplinesByHero?: ChosenDisciplinesMap;
  onSelectDiscipline?: (heroId: HeroId, tierLevel: number, opt: DisciplineOption, silverCost: number) => void;
  onBuy: (choice: BuyConfirmChoice) => void;
  onReturnDialogue: () => void;
}

export const ShopCounterPanel: React.FC<ShopCounterPanelProps> = ({
  hub,
  npc,
  shopType,
  townShopTypes,
  partyOrder,
  partyLevel = 1,
  heroLevels,
  silver,
  items,
  itemsById,
  spells,
  equippedByHero,
  learnedSpellIds,
  disciplinesByHero,
  chosenDisciplinesByHero,
  onSelectDiscipline,
  onBuy,
  onReturnDialogue,
}) => {
  const [activeHeroId, setActiveHeroId] = useState<HeroId>(partyOrder[0] ?? "valen");
  const [catFilter, setCatFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmEntry, setConfirmEntry] = useState<ShopCatalogEntry | null>(null);
  const [preferredSlot, setPreferredSlot] = useState<GearSlot>("right_hand");

  const meta = SHOP_META[shopType];
  const { zoneNum: hubZoneNum } = parseHubSteps(hub);
  const anyHeroStock = getStockForHero(items, spells, hub, shopType, catFilter, null, townShopTypes);

  useEffect(() => {
    hideClientItemTooltip();
    setCatFilter("all");
    setSelectedId(null);
    setConfirmEntry(null);
    const allCatStock = getStockForHero(items, spells, hub, shopType, "all", null, townShopTypes);
    const curHasStock = allCatStock.some((x) => !x.usableBy || x.usableBy.includes(activeHeroId));
    if (!curHasStock) {
      const firstUsableHero = partyOrder.find((hid) =>
        allCatStock.some((x) => !x.usableBy || x.usableBy.includes(hid))
      );
      if (firstUsableHero) setActiveHeroId(firstUsableHero);
    }
    return () => hideClientItemTooltip();
  }, [hub.id, shopType, npc.id]);

  const isDisciplinesTab = shopType === "arcanist" && catFilter === "disciplines";
  const heroStock = getStockForHero(items, spells, hub, shopType, isDisciplinesTab ? "all" : catFilter, activeHeroId, townShopTypes);
  const selected = heroStock.find((x) => x.id === selectedId) ?? heroStock[0] ?? null;

  const activeHero = getHeroById(activeHeroId);
  const activeHeroLevel = heroLevels?.[activeHeroId] ?? partyLevel;
  const activeChosenDiscs = chosenDisciplinesByHero?.[activeHeroId] ?? {};
  const activeHeroDiscTiers = disciplinesByHero?.[activeHeroId]?.tiers ?? [];
  const handleHeroPick = (hid: HeroId) => {
    audioEngine.playUiClick(0.28);
    setActiveHeroId(hid);
    setSelectedId(null);
    setConfirmEntry(null);
    setPreferredSlot("right_hand");
  };

  const handleAction = (entry: ShopCatalogEntry, chosenSlot?: GearSlot) => {
    audioEngine.playUiClick(0.38);
    if (entry.category === "spell") {
      onBuy({ entry, mode: "spell", heroId: activeHeroId });
      return;
    }
    if (chosenSlot) setPreferredSlot(chosenSlot);
    const slot = itemSlotForHero(entry, activeHeroId, chosenSlot ?? preferredSlot);
    if (!slot) {
      onBuy({ entry, mode: "bag", heroId: activeHeroId });
      return;
    }
    setConfirmEntry(entry);
  };

  const confirmSlot = confirmEntry ? itemSlotForHero(confirmEntry, activeHeroId, preferredSlot) : null;
  const confirmOldId = confirmSlot ? equippedByHero[activeHeroId]?.[confirmSlot] : undefined;
  const confirmOldItem = confirmOldId ? itemsById[confirmOldId] ?? null : null;
  const confirmDelta = confirmEntry ? computeHeroDelta(confirmEntry, equippedByHero, itemsById, activeHeroId, preferredSlot) : null;

  return (
    <div className="relative flex flex-col gap-2.5 flex-1 min-h-0">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#2c3446] shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src={assetUrl(npc.portraitPath ?? "assets/portraits/heroes/valen_avatar.webp")}
            alt={npc.name}
            className="w-10 h-10 rounded object-cover border border-[#9e7f47] shrink-0"
          />
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-[#d9b468]">
              {meta.label} · {npc.name}
            </div>
            <div className="text-[12px] text-[#cbd5e6] truncate">“{meta.quote}”</div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onReturnDialogue}
            className="px-3 py-1.5 rounded border border-[#5f5034] hover:border-[#d7b267] bg-[#19150f] text-[#e8d5a8] hover:text-white text-[11px] font-semibold uppercase tracking-wider cursor-pointer"
          >
            Back to {npc.name}
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      {meta.pills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 shrink-0">
          {meta.pills.map(([cid, label]) => (
            <button
              key={cid}
              type="button"
              onClick={() => {
                audioEngine.playUiClick(0.24);
                setCatFilter(cid);
                setSelectedId(null);
              }}
              className={`px-2.5 py-1 rounded border text-[12px] font-semibold cursor-pointer ${
                catFilter === cid
                  ? "border-[#ebca7e] bg-[#292112] text-[#fae4b0]"
                  : "border-[#323a4d] bg-[#151a25] text-[#b8c4d8] hover:border-[#7d653c]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Split Shop Stock List (Left) + Hero Selector & Compare Box (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.08fr)_minmax(350px,1fr)] gap-2.5 flex-1 min-h-0">
        {/* Stock List */}
        <div className="rounded border border-[#59492d] bg-[#0b0f19]/92 p-2 overflow-y-auto min-h-0">
          {isDisciplinesTab ? (
            <DisciplinesShopView
              heroId={activeHeroId}
              heroName={activeHero.name}
              tiers={activeHeroDiscTiers}
              zoneNum={hubZoneNum}
              partyLevel={activeHeroLevel}
              silver={silver}
              chosenByTier={activeChosenDiscs}
              onSelectDiscipline={onSelectDiscipline ?? (() => {})}
            />
          ) : heroStock.length === 0 ? (
            <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center p-4 gap-2.5">
              <div className="text-[16px] font-bold text-[#fae2aa]">No {activeHero.name} Stock Here</div>
              <div className="text-[13px] text-[#b7c6dd] max-w-[340px]">
                {activeHero.name} ({activeHero.className}) has nothing usable in {meta.label}. Select another hero on the right:
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {partyOrder
                  .map((hid) => ({
                    hero: getHeroById(hid),
                    cnt: anyHeroStock.filter((x) => !x.usableBy || x.usableBy.includes(hid)).length,
                  }))
                  .filter((x) => x.cnt > 0)
                  .map((x) => (
                    <button
                      key={x.hero.id}
                      type="button"
                      onClick={() => handleHeroPick(x.hero.id)}
                      className="px-3 py-1.5 rounded border border-[#e0ba6c] bg-[#2f2514] hover:bg-[#48371c] text-[#fff2ce] text-[12.5px] font-bold cursor-pointer"
                    >
                      Shop for {x.hero.name} ({x.cnt}) →
                    </button>
                  ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {heroStock.map((it) => {
                const isSel = selected?.id === it.id;
                const isSpell = it.category === "spell";
                const sp = isSpell ? (it as SpellEntry) : null;
                const learned = isSpell && learnedSpellIds.includes(it.id);
                const regFull = Boolean(
                  sp && !learned && countRegionSpellsForHero(learnedSpellIds, spells, activeHeroId, sp.region) >= MAX_SPELLS_PER_REGION
                );
                const gear = !isSpell ? (it as ItemEntry) : null;
                const subLine = sp
                  ? `${sp.mpCost} MP · ${sp.damageType}`
                  : `${gear?.handed ? `${gear.handed} · ` : ""}${it.subType}`;
                return (
                  <button
                    key={it.id}
                    type="button"
                    {...itemTooltipHandlers(it, { activeHeroId, equippedByHero, itemsById, learnedSpellIds })}
                    onClick={() => {
                      audioEngine.playUiClick(0.22);
                      setSelectedId(it.id);
                      setPreferredSlot("right_hand");
                    }}
                    className={`flex items-center gap-2.5 p-2 rounded border text-left cursor-pointer transition-colors ${
                      isSel
                        ? "border-[#f4d182] bg-gradient-to-r from-[#342812]/95 to-[#181e2c]/95 shadow-[0_0_14px_rgba(232,188,100,0.24)]"
                        : "border-[#262e40] bg-[#111622]/90 hover:border-[#8f7445]"
                    }`}
                  >
                    <img
                      src={assetUrl(it.iconPath)}
                      alt=""
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded border border-[#59492d] bg-[#141822] shrink-0 ${
                        isSpell ? "object-cover" : "object-contain p-1"
                      }`}
                    />
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <span className="text-[13.5px] font-bold text-[#f3ead7] truncate leading-tight">
                        {isSel ? `▸ ${it.name}` : it.name}
                      </span>
                      <div className="flex items-center justify-between gap-2 text-[11.5px]">
                        <span className="text-[#96a7c2] truncate">{subLine}</span>
                        <span
                          className={`font-extrabold shrink-0 ${
                            learned ? "text-[#84f2b8]" : regFull ? "text-[#f28b95]" : "text-[#f4cf81]"
                          }`}
                        >
                          {learned ? "Learned ✓" : regFull ? `Tier ${sp!.region} Full` : `${it.priceSilver.toLocaleString()}s`}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Select Hero to Shop For + Compare Box */}
        <div className="flex flex-col gap-2 min-h-0">
          <div className="rounded border border-[#59492d] bg-[#0b0f19]/94 p-2 shrink-0">
            <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#d7b267] mb-1.5">
              Select Hero to Shop For
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {partyOrder.map((hid) => {
                const hero = getHeroById(hid);
                const isSel = hid === activeHeroId;
                const heroCount = anyHeroStock.filter((x) => !x.usableBy || x.usableBy.includes(hid)).length;
                const heroDiscCount = Object.keys(chosenDisciplinesByHero?.[hid] ?? {}).length;
                let badge = isDisciplinesTab ? `${heroDiscCount}/10 Trained` : heroCount > 0 ? hero.className : "No Stock";
                let badgeColor = "text-[#9eb0ca]";
                let cardCls =
                  isDisciplinesTab || heroCount > 0
                    ? "border-[#364056] opacity-75 hover:opacity-100"
                    : "border-[#262d3d] opacity-35 grayscale";

                if (isSel) {
                  cardCls = "border-[#f4d182] bg-[#19231d] outline outline-2 outline-[#f4d182]";
                  if (isDisciplinesTab) {
                    badge = `${heroDiscCount}/10 Bound`;
                    badgeColor = "text-[#f2d084] font-extrabold";
                  } else if (selected) {
                    const d = computeHeroDelta(selected, equippedByHero, itemsById, hid);
                    if (selected.category === "spell") {
                      const sp = selected as SpellEntry;
                      const isKnown = learnedSpellIds.includes(selected.id);
                      const capReached =
                        !isKnown && countRegionSpellsForHero(learnedSpellIds, spells, hid, sp.region) >= MAX_SPELLS_PER_REGION;
                      badge = isKnown ? "✓ Learned" : capReached ? `Tier ${sp.region} Full` : "Can Learn";
                      badgeColor = capReached ? "text-[#f28b95] font-extrabold" : "text-[#79f0b0] font-extrabold";
                    } else if (!itemSlotFor(selected)) {
                      badge = "Usable";
                      badgeColor = "text-[#f1d99d] font-extrabold";
                    } else if (d.leftHandBlockedBy2H) {
                      badge = "Needs 1H";
                      badgeColor = "text-[#f5c266] font-extrabold";
                    } else if (d.primaryDiff > 0) {
                      badge = `▲ +${d.primaryDiff}`;
                      badgeColor = "text-[#79f0b0] font-extrabold";
                    } else if (d.primaryDiff < 0) {
                      badge = `▼ ${d.primaryDiff}`;
                      badgeColor = "text-[#f28b95] font-extrabold";
                    } else {
                      badge = "= Same";
                      badgeColor = "text-[#f1d99d] font-extrabold";
                    }
                  }
                }

                return (
                  <button
                    key={hid}
                    type="button"
                    onClick={() => handleHeroPick(hid)}
                    className={`flex flex-col items-center gap-1 p-1.5 rounded border bg-[#131824] cursor-pointer transition-all ${cardCls}`}
                  >
                    <span className={`text-[10.5px] leading-none truncate max-w-full ${badgeColor}`}>{badge}</span>
                    <img src={assetUrl(hero.avatarPath)} alt={hero.name} className="w-11 h-11 rounded object-cover border border-[#53462c]" />
                    <span className="text-[11.5px] font-bold text-[#efe7d6]">{hero.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {isDisciplinesTab ? (
            <div className="flex-1 min-h-0 rounded border border-[#59492d] bg-[#0b0f19]/95 p-3 flex flex-col gap-2 overflow-y-auto shadow-[inset_0_0_0_1px_rgba(242,210,139,0.1)]">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#2b3346]">
                <div className="flex items-center gap-2.5">
                  <img
                    src={assetUrl(activeHero.avatarPath)}
                    alt={activeHero.name}
                    className="w-9 h-9 rounded object-cover border border-[#8a6e3b]"
                  />
                  <div>
                    <div className="font-display text-[17px] font-bold text-[#fae2aa] leading-tight">
                      {activeHero.name} · {activeHero.className}
                    </div>
                    <div className="text-[11.5px] text-[#9fb0c9]">
                      Arcanist Discipline Mastery ({Object.keys(activeChosenDiscs).length}/10 Bound)
                    </div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded border border-[#8c703b] bg-[#241c0f] text-[11px] font-bold text-[#f6dca0]">
                  {activeHero.name} Lv {activeHeroLevel}
                </span>
              </div>
              <div className="text-[12.5px] leading-relaxed text-[#cfd9ea]">
                At <strong className="text-[#f5dfa9]">Level 1</strong> and every <strong className="text-[#f5dfa9]">10 levels</strong>{" "}
                (10–90), each hero may train <strong className="text-[#f5dfa9]">1 of 2</strong> permanent Disciplines per tier. Bound
                Disciplines remain active in battle and appear on {activeHero.name}’s battle plaque.
              </div>
              <div className="flex flex-col gap-1.5 mt-1">
                {activeHeroDiscTiers.filter((t) => Boolean(activeChosenDiscs[String(t.level)])).length === 0 ? (
                  <div className="rounded border border-dashed border-[#343d52] bg-[#101521] p-3 text-[12px] text-[#8d9eb8]">
                    No Disciplines bound for {activeHero.name} yet. Pick an unlocked option on the left to bind it.
                  </div>
                ) : (
                  activeHeroDiscTiers.map((t) => {
                    const optId = activeChosenDiscs[String(t.level)];
                    const opt = optId ? [t.optionA, t.optionB].find((o) => o.id === optId) : undefined;
                    if (!opt) return null;
                    return (
                      <div key={t.level} className="rounded border border-[#5b7444] bg-[#131d19] px-2.5 py-1.5 flex items-start gap-2">
                        <span className="text-[10.5px] font-bold text-[#9de6bc] shrink-0 mt-0.5">Lv {t.level}</span>
                        <div className="min-w-0">
                          <div className="text-[12.5px] font-bold text-[#fae4b0] leading-tight">{opt.name}</div>
                          <div className="text-[11px] text-[#bfd2c9] leading-snug">{opt.effect}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <CompareBox
              item={selected}
              activeHeroId={activeHeroId}
              silver={silver}
              equippedByHero={equippedByHero}
              itemsById={itemsById}
              spells={spells}
              learnedSpellIds={learnedSpellIds}
              preferredSlot={preferredSlot}
              onChangePreferredSlot={setPreferredSlot}
              onAction={handleAction}
            />
          )}
        </div>
      </div>

      {/* Confirm Equip / Bag Drawer */}
      {confirmEntry && (
        <div
          onClick={() => setConfirmEntry(null)}
          className="absolute inset-0 z-20 rounded bg-[#05070c]/82 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[490px] rounded border border-[#b89146] bg-gradient-to-b from-[#171c28] to-[#0e121b] p-4 flex flex-col gap-3 shadow-2xl"
          >
            <div className="flex items-center gap-3.5 border-b border-[#2b3346] pb-3">
              <img src={assetUrl(confirmEntry.iconPath)} alt="" className="w-16 h-16 p-1 rounded object-contain border border-[#7d653c] bg-[#141822]" />
              <div>
                <div className="text-[11px] uppercase tracking-widest text-[#d7b267] font-bold">
                  Confirm Purchase for {activeHero.name}
                </div>
                <div className="font-display text-[18px] font-bold text-[#fae2aa]">{confirmEntry.name}</div>
                <div className="text-[12px] text-[#aebbd0]">
                  Cost: <strong className="text-[#f6cf7e]">{confirmEntry.priceSilver.toLocaleString()}s</strong> · Purse: {silver.toLocaleString()}s
                </div>
              </div>
            </div>

            <div className="rounded border border-[#2e374b] bg-[#141925] p-3 flex flex-wrap items-center gap-2.5">
              <img src={assetUrl(activeHero.avatarPath)} alt={activeHero.name} className="w-10 h-10 rounded object-cover border border-[#6e5936]" />
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-bold text-[#f6e7c3]">
                  {activeHero.name}{" "}
                  <span className={`text-[12px] ml-1 ${confirmDelta?.leftHandBlockedBy2H ? "text-[#f5c266]" : "text-[#84f3ba]"}`}>
                    {confirmDelta?.leftHandBlockedBy2H ? "Needs 1H Weapon" : confirmDelta?.headline ?? ""}
                  </span>
                </div>
                <div className="text-[11.5px] text-[#9aa8be] truncate">
                  {confirmDelta?.leftHandBlockedBy2H
                    ? `Blocked by 2H weapon in Right Hand — buy to Shared Party Bag`
                    : `${confirmSlot === "left_hand" && confirmEntry.category === "weapon" ? "Off-Hand (Dual Wield) · " : ""}Replaces: ${confirmOldItem?.name ?? "Empty Slot"}`}
                </div>
              </div>
              {!confirmDelta?.leftHandBlockedBy2H && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onBuy({ entry: confirmEntry, mode: "equip", heroId: activeHeroId, oldItem: confirmOldItem, targetSlot: confirmSlot ?? undefined });
                      setConfirmEntry(null);
                    }}
                    className="px-3 py-1.5 rounded border border-[#e6c170] bg-[#7f5d22] hover:brightness-110 text-[#fff4d4] text-[12px] font-bold cursor-pointer"
                  >
                    Equip Now
                  </button>
                  {confirmOldItem && confirmOldItem.sellSilver > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        onBuy({ entry: confirmEntry, mode: "equip_sell_old", heroId: activeHeroId, oldItem: confirmOldItem, targetSlot: confirmSlot ?? undefined });
                        setConfirmEntry(null);
                      }}
                      className="px-3 py-1.5 rounded border border-[#4aa376] bg-[#153526] hover:brightness-110 text-[#b4f5d2] text-[12px] font-bold cursor-pointer"
                    >
                      Equip &amp; Sell Old (+{confirmOldItem.sellSilver}s)
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="flex justify-between gap-2 pt-2 border-t border-[#2b3346]">
              <button
                type="button"
                onClick={() => {
                  onBuy({ entry: confirmEntry, mode: "bag", heroId: activeHeroId });
                  setConfirmEntry(null);
                }}
                className="px-3 py-1.5 rounded border border-[#48546e] bg-[#1a2030] hover:border-[#9e8453] text-[#e6ecf8] text-[12px] font-bold cursor-pointer"
              >
                Put in Shared Party Bag
              </button>
              <button
                type="button"
                onClick={() => setConfirmEntry(null)}
                className="px-3 py-1.5 rounded border border-[#3a4256] bg-[#191d27] text-[#9aa8be] text-[12px] font-bold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
