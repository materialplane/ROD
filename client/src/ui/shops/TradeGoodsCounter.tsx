import React, { useEffect } from "react";
import { assetUrl } from "../api";
import type { ItemEntry, NpcEntry } from "../types";
import { hideClientItemTooltip, itemTooltipHandlers } from "./itemTooltip";

interface TradeGoodsCounterProps {
  npc: NpcEntry;
  tradeGoodCounts: Record<string, number>;
  itemsById: Record<string, ItemEntry>;
  onSellAll: () => void;
  onReturnDialogue: () => void;
}

export const TradeGoodsCounter: React.FC<TradeGoodsCounterProps> = ({
  npc,
  tradeGoodCounts,
  itemsById,
  onSellAll,
  onReturnDialogue,
}) => {
  useEffect(() => () => hideClientItemTooltip(), []);
  const entries = Object.entries(tradeGoodCounts)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => ({ item: itemsById[id], qty }))
    .filter((x): x is { item: ItemEntry; qty: number } => Boolean(x.item));

  const totalCount = entries.reduce((sum, e) => sum + e.qty, 0);
  const totalSilver = entries.reduce((sum, e) => sum + (e.item.sellSilver || 0) * e.qty, 0);

  return (
    <div className="flex flex-col gap-3 min-h-0 flex-1">
      <div className="border-b border-[#2c3446] pb-2.5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] font-semibold text-[#d9b468]">
            Trade Goods Exchange · {npc.name}
          </div>
          <h2 className="font-display m-0 text-[22px] md:text-[25px] font-bold text-[#fae2aa] leading-tight mt-0.5">
            Trade Goods Exchange
          </h2>
        </div>
        <button
          type="button"
          onClick={onReturnDialogue}
          className="px-3.5 py-2 rounded border border-[#5f5034] hover:border-[#d7b267] bg-[#19150f] text-[#e8d5a8] hover:text-white text-[11.5px] font-semibold uppercase tracking-wider cursor-pointer"
        >
          Return to Dialogue
        </button>
      </div>

      <div className="rounded border border-[#6e5936] bg-gradient-to-br from-[#241e11]/95 to-[#101520]/95 p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#d7b267]">Trade Goods Appraisal</div>
          <div className="font-display text-[19px] font-bold text-[#fae2aa] mt-0.5">
            {totalCount > 0 ? `${totalCount} Trade Goods Ready to Sell` : "No Trade Goods in Bag"}
          </div>
          <div className="text-[13.5px] text-[#c8d5e8] mt-0.5">
            {totalCount > 0
              ? `Total Exchange Value: +${totalSilver.toLocaleString()}s`
              : "Defeat wild foes and return here to weigh and sell your trade goods for Silver."}
          </div>
        </div>
        <button
          type="button"
          disabled={totalCount === 0}
          onClick={onSellAll}
          className="px-5 py-2.5 rounded border border-[#e6c170] bg-gradient-to-b from-[#b88a38] to-[#845e1e] hover:brightness-110 disabled:opacity-45 disabled:cursor-default text-[#fff6dc] text-[14.5px] font-bold cursor-pointer shrink-0"
        >
          {totalCount > 0 ? `Sell All Trade Goods (+${totalSilver.toLocaleString()}s)` : "Bag Empty"}
        </button>
      </div>

      {entries.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 overflow-y-auto pr-1 max-h-[260px]">
          {entries.map(({ item, qty }) => (
            <div
              key={item.id}
              {...itemTooltipHandlers(item, { isSellMode: true })}
              className="rounded border border-[#283144] bg-[#0f141e]/92 p-2 px-3 flex items-center gap-2.5"
            >
              <img
                src={assetUrl(item.iconPath)}
                alt={item.name}
                draggable={false}
                className="w-14 h-14 p-1 rounded object-contain border border-[#59492d] bg-[#141822] shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-bold text-[#f4e9d3] truncate">
                  {item.name} {qty > 1 ? `×${qty}` : ""}
                </div>
                <div className="text-[11.5px] text-[#96a7c2] truncate">
                  {item.sourceMob ? `From ${item.sourceMob}` : item.subType}
                </div>
              </div>
              <div className="text-[13.5px] font-extrabold text-[#8ff2be] shrink-0">
                +{(item.sellSilver * qty).toLocaleString()}s
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
