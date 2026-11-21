import React from "react";
import { assetUrl } from "../api";
import { SLOT_LABELS, itemSlotFor } from "../shops/shopLogic";
import type { EquippedGearMap, GearSlot, HeroId, ItemEntry, SpellEntry } from "../types";

const GEAR_SLOTS: GearSlot[] = ["right_hand", "left_hand", "body", "head", "accessory"];

interface PartyGearPanelProps {
  tab: "gear" | "bag_spells";
  heroId: HeroId;
  equippedByHero: EquippedGearMap;
  itemsById: Record<string, ItemEntry>;
  bagCounts: Record<string, number>;
  learnedSpellIds: string[];
  spells: SpellEntry[];
  onEquipFromBag: (heroId: HeroId, item: ItemEntry) => void;
}

export const PartyGearPanel: React.FC<PartyGearPanelProps> = ({
  tab,
  heroId,
  equippedByHero,
  itemsById,
  bagCounts,
  learnedSpellIds,
  spells,
  onEquipFromBag,
}) => {
  const heroGear = equippedByHero[heroId] ?? {};

  if (tab === "gear") {
    return (
      <div className="flex flex-col gap-1.5">
        {GEAR_SLOTS.map((slot) => {
          const itemId = heroGear[slot];
          const item = itemId ? itemsById[itemId] : null;
          return (
            <div key={slot} className="rounded border border-[#2c3446] bg-[#161b26] p-1.5 px-2.5 flex items-center gap-2.5">
              {item ? (
                <img src={assetUrl(item.iconPath)} alt={item.name} className="w-11 h-11 p-0.5 rounded object-contain border border-[#6e5936] bg-[#0f131b] shrink-0" />
              ) : (
                <div className="w-11 h-11 rounded border border-dashed border-[#3b4459] flex items-center justify-center text-[#6c7992] text-[12px] shrink-0">—</div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-wider text-[#d7b267] font-semibold">{SLOT_LABELS[slot]}</div>
                <div className="text-[13px] font-bold text-[#f3e6cb] truncate">{item?.name ?? "Empty Slot"}</div>
              </div>
              {item?.subType && <span className="text-[11px] text-[#9aa8be] shrink-0">{item.subType}</span>}
            </div>
          );
        })}
      </div>
    );
  }

  const heroSpells = spells.filter((s) => learnedSpellIds.includes(s.id) && s.usableBy.includes(heroId));
  const bagItems = Object.entries(bagCounts)
    .filter(([, q]) => q > 0)
    .map(([id, qty]) => ({ item: itemsById[id], qty }))
    .filter((x): x is { item: ItemEntry; qty: number } => Boolean(x.item));

  return (
    <div className="flex flex-col gap-2.5 overflow-y-auto pr-1 max-h-[260px]">
      {heroSpells.length > 0 && (
        <div>
          <div className="text-[10.5px] uppercase tracking-wider text-[#d7b267] font-bold mb-1">Learned Spells ({heroSpells.length})</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {heroSpells.map((sp) => (
              <div key={sp.id} className="rounded border border-[#3a4259] bg-[#161c2a] p-1.5 px-2 flex items-center gap-2">
                <img src={assetUrl(sp.iconPath)} alt="" className="w-10 h-10 rounded object-cover border border-[#4c5b7a] shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-bold text-[#f3e6cb] truncate">{sp.name}</div>
                  <div className="text-[10.5px] text-[#9eb0ca]">{sp.mpCost} MP · {sp.damageType}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="text-[10.5px] uppercase tracking-wider text-[#d7b267] font-bold mb-1">Shared Party Bag</div>
        {bagItems.length === 0 ? (
          <div className="text-[12px] text-[#8f9db3]">Party Bag is empty.</div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {bagItems.map(({ item, qty }) => {
              const slot = itemSlotFor(item);
              const canEquip = Boolean(slot && (!item.usableBy || item.usableBy.includes(heroId)));
              return (
                <div key={item.id} className="rounded border border-[#2c3446] bg-[#161b26] p-1.5 px-2 flex items-center gap-2">
                  <img src={assetUrl(item.iconPath)} alt="" className="w-10 h-10 p-0.5 rounded object-contain border border-[#59492d] bg-[#0f131b] shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-bold text-[#efe4cc] truncate">{item.name} ×{qty}</div>
                    <div className="text-[10.5px] text-[#9aa8be] truncate">{item.effect || item.subType}</div>
                  </div>
                  {canEquip && (
                    <button
                      type="button"
                      onClick={() => onEquipFromBag(heroId, item)}
                      className="px-2 py-1 rounded border border-[#8e7445] bg-[#241c10] hover:bg-[#382b17] text-[#fae2aa] text-[11px] font-bold cursor-pointer shrink-0"
                    >
                      Equip
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
