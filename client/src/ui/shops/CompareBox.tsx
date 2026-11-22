import React from "react";
import { assetUrl } from "../api";
import { getHeroById } from "../heroes";
import type { EquippedGearMap, HeroId, ItemEntry, SpellEntry } from "../types";
import { itemTooltipHandlers } from "./itemTooltip";
import { cleanDamageTypeLabel, computeHeroDelta, WEAPON_ATTACK_MODES, type ShopCatalogEntry, type StatDeltaRow } from "./shopLogic";

interface CompareBoxProps {
  item: ShopCatalogEntry | null;
  activeHeroId: HeroId;
  silver: number;
  equippedByHero: EquippedGearMap;
  itemsById: Record<string, ItemEntry>;
  learnedSpellIds: string[];
  onAction: (entry: ShopCatalogEntry) => void;
}

function fmtStat(row: StatDeltaRow, v: number): string {
  const suf = row.label.includes("%") ? "%" : "";
  return `${v}${suf}`;
}

function pillForRow(row: StatDeltaRow): { text: string; cls: string } {
  const suf = row.label.includes("%") ? "%" : "";
  if (row.curVal === 0 && row.newVal > 0) return { text: `★ +${row.diff}${suf}`, cls: "bg-[#288054]/35 text-[#84f3ba]" };
  if (row.diff > 0) return { text: `▲ +${row.diff}${suf}`, cls: "bg-[#288054]/35 text-[#84f3ba]" };
  if (row.diff < 0) return { text: `▼ ${row.diff}${suf}`, cls: "bg-[#942e3a]/40 text-[#f89ea7]" };
  return { text: "Same", cls: "bg-[#343e52]/50 text-[#b5c3d9]" };
}

export const CompareBox: React.FC<CompareBoxProps> = ({
  item,
  activeHeroId,
  silver,
  equippedByHero,
  itemsById,
  learnedSpellIds,
  onAction,
}) => {
  const focusHero = getHeroById(activeHeroId);

  if (!item) {
    return (
      <div className="flex-1 rounded border border-[#59492d] bg-[#0b0f19]/95 p-5 flex items-center justify-center text-center text-[14.5px] text-[#9fb0c9]">
        Select an item on the left—or click another hero above if <strong className="text-[#fae2aa] mx-1">{focusHero.name}</strong> has no items here.
      </div>
    );
  }

  const delta = computeHeroDelta(item, equippedByHero, itemsById, activeHeroId);
  const isSpell = item.category === "spell";
  const spell = isSpell ? (item as SpellEntry) : null;
  const gearItem = !isSpell ? (item as ItemEntry) : null;
  const isGear = Boolean(delta.slot);
  const sameEquipped = Boolean(isGear && delta.comparedItem?.id === item.id);
  const alreadyLearned = Boolean(isSpell && learnedSpellIds.includes(item.id));
  const canAfford = silver >= item.priceSilver;

  let badgeTxt = delta.headline;
  let badgeCls = "border-[#3f4a62] bg-[#171d2c] text-[#dce5f4]";
  if (isSpell && spell) {
    badgeCls = alreadyLearned ? "border-[#8c703b] bg-[#2c2313] text-[#f6dca0]" : "border-[#4aa376] bg-[#143324] text-[#84f2b8]";
    badgeTxt = alreadyLearned ? "✓ Already Learned" : `Can Learn (${spell.mpCost} MP)`;
  } else if (!isGear) {
    badgeTxt = item.subType;
  } else if (sameEquipped) {
    badgeCls = "border-[#8c703b] bg-[#2c2313] text-[#f6dca0]";
    badgeTxt = "= Already Wearing";
  } else if (delta.primaryDiff > 0) {
    badgeCls = "border-[#4aa376] bg-[#143324] text-[#84f2b8]";
    badgeTxt = `▲ ${delta.headline}`;
  } else if (delta.primaryDiff < 0) {
    badgeCls = "border-[#a84955] bg-[#31151b] text-[#f79aa3]";
    badgeTxt = `▼ ${delta.headline}`;
  } else if (!delta.comparedItem) {
    badgeCls = "border-[#4aa376] bg-[#143324] text-[#84f2b8]";
    badgeTxt = "★ Empty Slot";
  }

  const heroIdsMap = equippedByHero[activeHeroId] ?? {};
  const equippedLeft = heroIdsMap.left_hand ? itemsById[heroIdsMap.left_hand] : null;
  const equippedRight = heroIdsMap.right_hand ? itemsById[heroIdsMap.right_hand] : null;
  const attacks = gearItem?.category === "weapon" ? WEAPON_ATTACK_MODES[gearItem.subType] : undefined;

  let footNote = item.subType;
  if (spell) {
    footNote = alreadyLearned ? `${focusHero.name} knows this spell` : `Teaches ${focusHero.name} (Tier ${spell.region})`;
  } else if (sameEquipped) {
    footNote = `${focusHero.name} already wears this item`;
  } else if (isGear && delta.comparedItem && delta.comparedItem.sellSilver > 0 && item.priceSilver > 0) {
    const net = Math.max(0, item.priceSilver - delta.comparedItem.sellSilver);
    footNote = `Trade in old: +${delta.comparedItem.sellSilver}s · Net: ${net}s`;
  } else if (isGear) {
    footNote = `${delta.slotLabel} · ${item.subType}`;
  }

  const btnText = spell
    ? alreadyLearned
      ? "✓ Learned"
      : `Learn Spell (${item.priceSilver.toLocaleString()}s) →`
    : isGear
      ? `Buy for ${focusHero.name} (${item.priceSilver.toLocaleString()}s) →`
      : `Buy (${item.priceSilver.toLocaleString()}s) →`;

  const gridCols = delta.rows.length === 1 ? "grid-cols-1" : delta.rows.length === 3 ? "grid-cols-3" : "grid-cols-2";

  return (
    <div className="flex-1 min-h-0 rounded border border-[#59492d] bg-[#0b0f19]/95 p-2.5 flex flex-col gap-1.5 shadow-[inset_0_0_0_1px_rgba(242,210,139,0.1)]">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-[#2b3346] shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {(isGear || isSpell) && (
            <img src={assetUrl(focusHero.avatarPath)} alt={focusHero.name} className="w-8 h-8 rounded object-cover border border-[#8a6e3b] shrink-0" />
          )}
          <div className="min-w-0">
            <div className="text-[15.5px] font-bold text-[#fae2aa] leading-tight truncate">
              {isGear || isSpell ? `${focusHero.name} · ${focusHero.className}` : item.name}
            </div>
            <div className="text-[12.5px] text-[#b7c6dd] truncate">
              {spell ? `${spell.name} · Tier ${spell.region}` : `${delta.slotLabel} · ${item.subType}`}
            </div>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded border text-[12.5px] font-extrabold shrink-0 ${badgeCls}`}>{badgeTxt}</span>
      </div>

      {/* Scroll-safe Body */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1.5 pr-0.5">
        {isGear && (
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
            <div
              {...itemTooltipHandlers(delta.comparedItem, { activeHeroId, equippedByHero, itemsById, learnedSpellIds })}
              className="flex items-center gap-2.5 p-1.5 px-2 rounded border border-[#2b3448] bg-[#121723]/92 min-w-0"
            >
              {delta.comparedItem ? (
                <img src={assetUrl(delta.comparedItem.iconPath)} alt="" className="w-11 h-11 sm:w-12 sm:h-12 p-0.5 rounded object-contain border border-[#59492d] bg-[#141822] shrink-0" />
              ) : (
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded border border-dashed border-[#3c465c] flex items-center justify-center text-[#6b7892] shrink-0">—</div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-wider text-[#96a7c2] font-bold">Currently Wearing</div>
                <div className="text-[13px] font-bold text-[#f6ebd5] truncate">{delta.comparedItem?.name ?? "Empty Slot"}</div>
                <div className="text-[11px] text-[#a7b6ce] truncate">
                  {delta.comparedItem ? `Equipped · Sell +${delta.comparedItem.sellSilver}s` : "No gear equipped"}
                </div>
              </div>
            </div>
            <span className={`text-[18px] font-extrabold ${delta.primaryDiff > 0 ? "text-[#7aeeb0]" : "text-[#c9a760]"}`}>→</span>
            <div
              {...itemTooltipHandlers(item, { activeHeroId, equippedByHero, itemsById, learnedSpellIds })}
              className={`flex items-center gap-2.5 p-1.5 px-2 rounded border min-w-0 ${sameEquipped ? "border-[#5b6985] bg-[#141925]/92" : "border-[#9e7f47] bg-gradient-to-br from-[#2c2211]/90 to-[#141926]/95"}`}
            >
              <img src={assetUrl(item.iconPath)} alt="" className="w-11 h-11 sm:w-12 sm:h-12 p-0.5 rounded object-contain border border-[#8c703b] bg-[#141822] shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-wider text-[#e2be74] font-bold">{sameEquipped ? "Matching Stock" : "Shop Item"}</div>
                <div className="text-[13px] font-bold text-[#f6ebd5] truncate">{item.name}</div>
                <div className="text-[11px] text-[#a7b6ce] truncate">{`${gearItem?.handed ? `${gearItem.handed} · ` : item.subType ? `${item.subType} · ` : ""}${item.priceSilver.toLocaleString()}s`}</div>
              </div>
            </div>
          </div>
        )}

        {delta.unequipsShieldFor2H && equippedLeft && (
          <div className="p-2 px-2.5 rounded border border-[#9b773b] bg-[#423013]/55 text-[#fae0a8] text-[13px] font-semibold">
            Two-Handed Weapon — equipping removes {equippedLeft.name} from Left Hand.
          </div>
        )}
        {delta.leftHandBlockedBy2H && equippedRight && (
          <div className="p-2 px-2.5 rounded border border-[#9b773b] bg-[#423013]/55 text-[#fae0a8] text-[13px] font-semibold">
            Needs 1H Weapon — {focusHero.name} is wielding {equippedRight.name} (2H).
          </div>
        )}

        {spell ? (
          <div className="flex items-start gap-2.5">
            <div
              {...itemTooltipHandlers(spell, { activeHeroId, equippedByHero, itemsById, learnedSpellIds })}
              className="w-16 h-16 rounded border border-[#a88644] bg-[#0b0e17] overflow-hidden shrink-0 shadow-[0_4px_12px_rgba(0,0,0,0.55)]"
            >
              <img src={assetUrl(spell.iconPath)} alt={spell.name} className="w-full h-full object-cover" draggable={false} />
            </div>
            <div className="flex-1 min-w-0 grid grid-cols-2 gap-1.5">
              <div className="p-1.5 px-2.5 rounded border border-[#283144] bg-[#121824]/95">
                <div className="text-[11.5px] text-[#9eb2cf] font-semibold uppercase tracking-wider">MP Cost</div>
                <div className="text-[16px] font-extrabold text-[#93c7ff]">{spell.mpCost} MP</div>
              </div>
              <div className="p-1.5 px-2.5 rounded border border-[#283144] bg-[#121824]/95">
                <div className="text-[11.5px] text-[#9eb2cf] font-semibold uppercase tracking-wider">Element / Type</div>
                <div className="text-[15px] font-extrabold text-[#f7ebd2] truncate">{spell.damageType}</div>
              </div>
              <div className="p-1.5 px-2.5 rounded border border-[#283144] bg-[#121824]/95">
                <div className="text-[11.5px] text-[#9eb2cf] font-semibold uppercase tracking-wider">Target</div>
                <div className="text-[15px] font-extrabold text-[#f7ebd2] truncate">{spell.target}</div>
              </div>
              <div className="p-1.5 px-2.5 rounded border border-[#283144] bg-[#121824]/95">
                <div className="text-[11.5px] text-[#9eb2cf] font-semibold uppercase tracking-wider">Grimoire Tier</div>
                <div className="text-[15px] font-extrabold text-[#f4cf81]">
                  Tier {spell.region} · {alreadyLearned ? "Learned" : `${spell.priceSilver.toLocaleString()}s`}
                </div>
              </div>
            </div>
          </div>
        ) : delta.rows.length > 0 ? (
          <div className={`grid ${gridCols} gap-1.5`}>
            {delta.rows.map((r) => {
              const p = pillForRow(r);
              const tileCls = r.diff > 0 ? "border-[#3d8560] bg-[#12241c]/85" : r.diff < 0 ? "border-[#873f48] bg-[#261318]/85" : "border-[#283144] bg-[#121824]/95";
              const newCls = r.diff > 0 ? "text-[#72e3a8]" : r.diff < 0 ? "text-[#f28b95]" : "text-[#f7ebd2]";
              if (delta.rows.length === 1) {
                return (
                  <div key={r.key} className={`p-2.5 px-3 rounded border flex items-center gap-3 ${tileCls}`}>
                    <span className="text-[14.5px] font-semibold text-[#cad6ea]">{r.label}</span>
                    <div className="ml-auto flex items-baseline gap-2 tabular-nums">
                      <span className="text-[15.5px] font-semibold text-[#95a5bf]">{fmtStat(r, r.curVal)}</span>
                      <span className="text-[14px] text-[#7e8da8]">→</span>
                      <span className={`text-[19px] font-extrabold ${newCls}`}>{fmtStat(r, r.newVal)}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[12.5px] font-extrabold ${p.cls}`}>{p.text}</span>
                  </div>
                );
              }
              return (
                <div key={r.key} className={`p-1.5 px-2.5 rounded border flex flex-col gap-0.5 ${tileCls}`}>
                  <div className="text-[12.5px] font-semibold text-[#cad6ea] leading-tight">{r.label}</div>
                  <div className="flex items-center justify-between gap-1 tabular-nums">
                    <div className="flex items-baseline gap-1">
                      <span className="text-[14.5px] font-semibold text-[#95a5bf]">{fmtStat(r, r.curVal)}</span>
                      <span className="text-[13px] text-[#7e8da8]">→</span>
                      <span className={`text-[16.5px] font-extrabold ${newCls}`}>{fmtStat(r, r.newVal)}</span>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[11px] font-extrabold shrink-0 ${p.cls}`}>{p.text}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            {...itemTooltipHandlers(item, { activeHeroId, equippedByHero, itemsById, learnedSpellIds })}
            className="flex items-center gap-3.5 p-2.5 rounded border border-[#2b3448] bg-[#121723]/92"
          >
            <img src={assetUrl(item.iconPath)} alt="" className="w-16 h-16 p-1 rounded object-contain border border-[#59492d] bg-[#141822] shrink-0" />
            <div>
              <div className="text-[10.5px] uppercase tracking-wider text-[#96a7c2] font-bold">Merchant Stock</div>
              <div className="text-[14px] font-bold text-[#f6ebd5]">{item.name}</div>
              <div className="text-[12px] text-[#a7b6ce]">Stacks in Shared Party Bag</div>
            </div>
          </div>
        )}

        {/* Traits / Attacks / Effects */}
        <div className="mt-auto rounded border border-[#293142] bg-[#0f131d]/90 p-1.5 px-2 flex flex-col gap-0.5">
          {gearItem && (
            <div className="flex flex-wrap gap-1">
              {gearItem.damageType && <span className="px-1.5 py-0.5 rounded border border-[#7e663b] bg-[#261f13] text-[#f7dea4] text-[11.5px] font-semibold">{cleanDamageTypeLabel(gearItem.damageType)}</span>}
              {gearItem.handed && <span className="px-1.5 py-0.5 rounded border border-[#354057] bg-[#171d2b] text-[#cbd7eb] text-[11.5px] font-semibold">{gearItem.handed === "2H" ? "2H · Two-Handed" : "1H · Allows Shield"}</span>}
              {gearItem.weight && <span className="px-1.5 py-0.5 rounded border border-[#354057] bg-[#171d2b] text-[#cbd7eb] text-[11.5px] font-semibold">{gearItem.weight} Armor</span>}
              {gearItem.runestoneSockets ? (
                <span className="px-1.5 py-0.5 rounded border border-[#497b8c] bg-[#13252d] text-[#9de2f7] text-[11.5px] font-semibold">◆ {gearItem.runestoneSockets} Runestone Socket</span>
              ) : isGear ? (
                <span className="px-1.5 py-0.5 rounded border border-[#354057] bg-[#171d2b] text-[#cbd7eb] text-[11.5px] font-semibold">No Runestone Socket</span>
              ) : null}
            </div>
          )}
          {attacks && (
            <div className="text-[13px] text-[#dce5f5]">
              <strong className="text-[#e5c37a]">Weapon Attacks:</strong> {attacks[0]} · {attacks[1]}
            </div>
          )}
          {gearItem?.stats?.passiveBonus && (
            <div className="text-[13px] text-[#dce5f5]">
              <strong className="text-[#e5c37a]">Passive Bonus:</strong> {String(gearItem.stats.passiveBonus)}
            </div>
          )}
          {item.effect && <div className="text-[14.5px] text-[#edf2fa] leading-snug">{item.effect}</div>}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#2b3346] shrink-0">
        <span className="text-[13.5px] font-semibold text-[#b7c5db] truncate">{footNote}</span>
        <button
          type="button"
          disabled={alreadyLearned || !canAfford}
          onClick={() => onAction(item)}
          className="px-4 py-2 rounded border border-[#e6c170] bg-gradient-to-b from-[#b88a38] to-[#845e1e] hover:brightness-110 disabled:opacity-45 disabled:cursor-default text-[#fff6dc] text-[14px] font-bold cursor-pointer shrink-0"
        >
          {!canAfford && !alreadyLearned ? `Need ${item.priceSilver.toLocaleString()}s` : btnText}
        </button>
      </div>
    </div>
  );
};
