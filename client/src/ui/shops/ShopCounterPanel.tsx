import React, { useEffect, useState } from "react";
import { assetUrl } from "../api";
import { audioEngine } from "../audio";
import { getHeroById } from "../heroes";
import type { EquippedGearMap, HeroId, ItemEntry, NpcEntry, ShopType, SpellEntry, WorldLocation } from "../types";
import { CompareBox } from "./CompareBox";
import { hideClientItemTooltip, itemTooltipHandlers } from "./itemTooltip";
import { computeHeroDelta, getStockForHero, itemSlotFor, SHOP_META, type ShopCatalogEntry } from "./shopLogic";

export interface BuyConfirmChoice {
  entry: ShopCatalogEntry;
  mode: "equip" | "equip_sell_old" | "bag" | "spell";
  heroId: HeroId;
  oldItem?: ItemEntry | null;
}

interface ShopCounterPanelProps {
  hub: WorldLocation;
  npc: NpcEntry;
  shopType: ShopType;
  partyOrder: HeroId[];
  silver: number;
  items: ItemEntry[];
  itemsById: Record<string, ItemEntry>;
  spells: SpellEntry[];
  equippedByHero: EquippedGearMap;
  learnedSpellIds: string[];
  onBuy: (choice: BuyConfirmChoice) => void;
  onReturnDialogue: () => void;
}

export const ShopCounterPanel: React.FC<ShopCounterPanelProps> = ({
  hub,
  npc,
  shopType,
  partyOrder,
  silver,
  items,
  itemsById,
  spells,
  equippedByHero,
  learnedSpellIds,
  onBuy,
  onReturnDialogue,
}) => {
  const [activeHeroId, setActiveHeroId] = useState<HeroId>(partyOrder[0] ?? "valen");
  const [catFilter, setCatFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmEntry, setConfirmEntry] = useState<ShopCatalogEntry | null>(null);

  const meta = SHOP_META[shopType];
  const anyHeroStock = getStockForHero(items, spells, hub, shopType, catFilter, null);

  useEffect(() => {
    hideClientItemTooltip();
    setCatFilter("all");
    setSelectedId(null);
    setConfirmEntry(null);
    const curHasStock = anyHeroStock.some((x) => !x.usableBy || x.usableBy.includes(activeHeroId));
    if (!curHasStock) {
      const firstUsableHero = partyOrder.find((hid) =>
        anyHeroStock.some((x) => !x.usableBy || x.usableBy.includes(hid))
      );
      if (firstUsableHero) setActiveHeroId(firstUsableHero);
    }
    return () => hideClientItemTooltip();
  }, [hub.id, shopType, npc.id]);

  const heroStock = getStockForHero(items, spells, hub, shopType, catFilter, activeHeroId);
  const selected = heroStock.find((x) => x.id === selectedId) ?? heroStock[0] ?? null;

  const activeHero = getHeroById(activeHeroId);
  const handleHeroPick = (hid: HeroId) => {
    audioEngine.playUiClick(0.28);
    setActiveHeroId(hid);
    setSelectedId(null);
    setConfirmEntry(null);
  };

  const handleAction = (entry: ShopCatalogEntry) => {
    audioEngine.playUiClick(0.38);
    if (entry.category === "spell") {
      onBuy({ entry, mode: "spell", heroId: activeHeroId });
      return;
    }
    const slot = itemSlotFor(entry);
    if (!slot) {
      onBuy({ entry, mode: "bag", heroId: activeHeroId });
      return;
    }
    setConfirmEntry(entry);
  };

  const confirmSlot = confirmEntry ? itemSlotFor(confirmEntry) : null;
  const confirmOldId = confirmSlot ? equippedByHero[activeHeroId]?.[confirmSlot] : undefined;
  const confirmOldItem = confirmOldId ? itemsById[confirmOldId] ?? null : null;
  const confirmDelta = confirmEntry ? computeHeroDelta(confirmEntry, equippedByHero, itemsById, activeHeroId) : null;

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
          {heroStock.length === 0 ? (
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
                        <span className={`font-extrabold shrink-0 ${learned ? "text-[#84f2b8]" : "text-[#f4cf81]"}`}>
                          {learned ? "Learned ✓" : `${it.priceSilver.toLocaleString()}s`}
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
                let badge = heroCount > 0 ? hero.className : "No Stock";
                let badgeColor = "text-[#9eb0ca]";
                let cardCls = heroCount > 0 ? "border-[#364056] opacity-75 hover:opacity-100" : "border-[#262d3d] opacity-35 grayscale";

                if (isSel) {
                  cardCls = "border-[#f4d182] bg-[#19231d] outline outline-2 outline-[#f4d182]";
                  if (selected) {
                    const d = computeHeroDelta(selected, equippedByHero, itemsById, hid);
                    if (selected.category === "spell") {
                      badge = learnedSpellIds.includes(selected.id) ? "✓ Learned" : "Can Learn";
                      badgeColor = "text-[#79f0b0] font-extrabold";
                    } else if (!itemSlotFor(selected)) {
                      badge = "Usable";
                      badgeColor = "text-[#f1d99d] font-extrabold";
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

          <CompareBox
            item={selected}
            activeHeroId={activeHeroId}
            silver={silver}
            equippedByHero={equippedByHero}
            itemsById={itemsById}
            learnedSpellIds={learnedSpellIds}
            onAction={handleAction}
          />
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
                  <span className="text-[12px] text-[#84f3ba] ml-1">{confirmDelta?.headline ?? ""}</span>
                </div>
                <div className="text-[11.5px] text-[#9aa8be] truncate">
                  Replaces: {confirmOldItem?.name ?? "Empty Slot"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onBuy({ entry: confirmEntry, mode: "equip", heroId: activeHeroId, oldItem: confirmOldItem });
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
                    onBuy({ entry: confirmEntry, mode: "equip_sell_old", heroId: activeHeroId, oldItem: confirmOldItem });
                    setConfirmEntry(null);
                  }}
                  className="px-3 py-1.5 rounded border border-[#4aa376] bg-[#153526] hover:brightness-110 text-[#b4f5d2] text-[12px] font-bold cursor-pointer"
                >
                  Equip &amp; Sell Old (+{confirmOldItem.sellSilver}s)
                </button>
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
