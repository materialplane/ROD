import React, { useEffect, useState } from "react";
import { assetUrl } from "../api";
import { audioEngine } from "../audio";
import { getHeroById } from "../heroes";
import { hideClientItemTooltip, infoTooltipHandlers, itemTooltipHandlers, runestoneTooltipHandlers } from "../shops/itemTooltip";
import { WeaponAttackIconsRow } from "../shops/WeaponAttackIconsRow";
import { canDualWieldItem, itemSlotFor } from "../shops/shopLogic";
import type { EquippedGearMap, GearSlot, HeroId, HeroSocketsMap, ItemEntry, RunestoneItem } from "../types";
import { RUNESTONE_EMPTY_ICON, SLOT_CONFIG, summarizeItemStats } from "./partyLogic";

interface GearRunestonesTabProps {
  heroId: HeroId;
  equippedByHero: EquippedGearMap;
  itemsById: Record<string, ItemEntry>;
  bagCounts: Record<string, number>;
  socketsByHero: HeroSocketsMap;
  runestonesBag: RunestoneItem[];
  onEquipFromBag: (heroId: HeroId, itemId: string, targetSlot?: GearSlot) => void;
  onUnequipSlot: (heroId: HeroId, slot: GearSlot) => void;
  onSwapHands?: (heroId: HeroId) => void;
  onRequestSocketRunestone: (heroId: HeroId, stone: RunestoneItem) => void;
}

export const GearRunestonesTab: React.FC<GearRunestonesTabProps> = ({
  heroId,
  equippedByHero,
  itemsById,
  bagCounts,
  socketsByHero,
  runestonesBag,
  onEquipFromBag,
  onUnequipSlot,
  onSwapHands,
  onRequestSocketRunestone,
}) => {
  const [subTab, setSubTab] = useState<"gear" | "runestones">("gear");

  useEffect(() => () => hideClientItemTooltip(), []);

  const hero = getHeroById(heroId);
  const heroEq = equippedByHero[heroId] ?? {};
  const sockets = socketsByHero[heroId] ?? { weapon: null, armor: null };
  const rightHandItem = heroEq.right_hand ? itemsById[heroEq.right_hand] : undefined;
  const rightHandIs2H = rightHandItem?.handed === "2H";

  const compatibleBagGear = Object.entries(bagCounts)
    .filter(([, count]) => count > 0)
    .map(([id, count]) => ({ item: itemsById[id], count }))
    .filter(
      (x): x is { item: ItemEntry; count: number } =>
        Boolean(x.item && itemSlotFor(x.item) && (x.item.usableBy ?? []).includes(heroId))
    )
    .sort((a, b) => (b.item.step ?? 1) - (a.item.step ?? 1) || a.item.name.localeCompare(b.item.name));

  return (
    <section className="flex-1 min-w-0 rounded border border-[#323a4b] bg-[#11151f]/95 p-4 flex flex-col gap-3 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[#293040] pb-2.5 shrink-0">
        <img
          src={assetUrl(hero.avatarPath)}
          alt={hero.name}
          className="w-[46px] h-[46px] rounded border border-[#8a703e] object-cover shrink-0 bg-[#0b0e14]"
          draggable={false}
        />
        <div className="min-w-0">
          <h3 className="font-display m-0 text-[17px] text-[#fae2aa] tracking-wide truncate">
            {hero.name}&apos;s Equipment &amp; Runestones
          </h3>
          <div className="text-[11.5px] text-[#9eb0c9]">
            5 Equipment Slots · Carved Runestones socket permanently into Weapons &amp; Body Armor
          </div>
        </div>
      </div>

      {/* Split Paper-Doll & Compatible Bag/Runestones */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1.08fr_0.92fr] gap-3">
        {/* Left: All 5 Equipment Slots (Always Visible) */}
        <div className="flex flex-col gap-2 overflow-y-auto pr-1">
          {SLOT_CONFIG.map((slot) => {
            const isSharedLeft2H = slot.key === "left_hand" && rightHandIs2H;
            const curId = isSharedLeft2H ? heroEq.right_hand : heroEq[slot.key];
            const equippedItem = curId ? itemsById[curId] : undefined;
            const isDualWieldLeft = slot.key === "left_hand" && canDualWieldItem(heroId, equippedItem);
            const hasSocket = slot.key === "right_hand" || slot.key === "body";
            const socketKey = slot.key === "right_hand" ? "weapon" : "armor";
            const curStone = hasSocket ? sockets[socketKey] ?? null : null;
            const unequipKey: GearSlot = isSharedLeft2H ? "right_hand" : slot.key;

            return (
              <div
                key={slot.key}
                className="rounded border border-[#2d3546] bg-[#141925]/95 p-2.5 flex flex-col gap-2"
              >
                <div
                  className="flex items-center gap-2.5"
                  {...(equippedItem
                    ? itemTooltipHandlers(equippedItem, {
                        activeHeroId: heroId,
                        equippedByHero,
                        itemsById,
                      })
                    : infoTooltipHandlers({
                        key: `empty-slot:${heroId}:${slot.key}`,
                        eyebrow: "Equipment Slot",
                        title: `${slot.label} — Empty`,
                        iconPath: slot.fallbackIcon,
                        badges: [{ label: "No Item Equipped" }],
                        effect: `Choose a compatible item from the Bag tab on the right to equip it into ${getHeroById(heroId).name}'s ${slot.label}.`,
                      }))}
                >
                  <div className="w-[42px] h-[42px] rounded border border-[#5d4c30] bg-[#0b0e14] flex items-center justify-center shrink-0">
                    <img
                      src={assetUrl(equippedItem ? equippedItem.iconPath : slot.fallbackIcon)}
                      alt={equippedItem?.name ?? slot.label}
                      className="w-[34px] h-[34px] object-contain"
                      draggable={false}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#d9b86c]">
                      {slot.label}
                      {isSharedLeft2H ? " · 2-Handed (Both Hands)" : isDualWieldLeft ? " · Dual Wield (50% 2nd Hit)" : ""}
                    </div>
                    <div className="text-[13px] font-semibold text-[#f3e3bd] truncate">
                      {equippedItem ? equippedItem.name : "Empty Slot"}
                    </div>
                    <div className="text-[11px] text-[#96a6bf] truncate">
                      {isSharedLeft2H
                        ? "Held in both Right & Left Hands"
                        : isDualWieldLeft && equippedItem
                          ? `Off-Hand Follow-Up (50% Power) · ${summarizeItemStats(equippedItem)}`
                          : equippedItem
                            ? summarizeItemStats(equippedItem)
                            : "Empty — pick an item from your bag"}
                    </div>
                  </div>
                  {slot.key === "right_hand" && equippedItem?.category === "weapon" && (
                    <WeaponAttackIconsRow
                      subType={equippedItem.subType}
                      damageType={equippedItem.damageType}
                      size="sm"
                      suppressParentItemTooltip
                    />
                  )}
                  {isDualWieldLeft && onSwapHands && rightHandItem && canDualWieldItem(heroId, rightHandItem) && (
                    <button
                      type="button"
                      onClick={() => {
                        audioEngine.playUiClick(0.32);
                        onSwapHands(heroId);
                      }}
                      className="px-2 py-1 rounded border border-[#725b34] hover:border-[#e6c170] bg-[#211b10] text-[11px] font-semibold text-[#f6dfa8] cursor-pointer shrink-0"
                    >
                      Swap Hands
                    </button>
                  )}
                  {equippedItem && (
                    <button
                      type="button"
                      onClick={() => {
                        audioEngine.playUiClick(0.35);
                        onUnequipSlot(heroId, unequipKey);
                      }}
                      className="px-2.5 py-1 rounded border border-[#4a5266] hover:border-[#d7b267] bg-[#1b202e] text-[11px] font-semibold text-[#dbe3f2] cursor-pointer shrink-0"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {/* Inline Runestone Socket inside Weapon & Body Armor */}
                {hasSocket && (
                  <div
                    className={[
                      "rounded border px-2.5 py-1.5 flex items-center gap-2.5",
                      curStone
                        ? "border-[#5d4b7a] bg-[#191526]/90"
                        : "border-dashed border-[#343c4f] bg-[#0e121a]/80",
                    ].join(" ")}
                    {...(curStone
                      ? runestoneTooltipHandlers(curStone, {
                          hint: `Carved permanently into ${equippedItem?.name ?? slot.label}. Socketing another Runestone will overwrite and destroy this one.`,
                        })
                      : infoTooltipHandlers({
                          key: `empty-socket:${heroId}:${socketKey}`,
                          eyebrow: "Carved Runestone Socket",
                          title: `Open ${slot.key === "right_hand" ? "Weapon" : "Armor"} Socket`,
                          iconPath: RUNESTONE_EMPTY_ICON,
                          badges: [{ label: "Empty Socket", tone: "socket" }],
                          effect: "Open the Carved Runestones tab on the right and click Socket to engrave a Runestone permanently into this slot.",
                        }))}
                  >
                    <img
                      src={assetUrl(curStone ? curStone.iconPath : RUNESTONE_EMPTY_ICON)}
                      alt=""
                      className="w-[26px] h-[26px] rounded object-contain shrink-0 bg-[#0b0d13] border border-[#3e3456]"
                      draggable={false}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-semibold text-[#e6dcff] truncate">
                        {curStone ? `Runestone Socket: ${curStone.name}` : "Empty Runestone Socket"}
                      </div>
                      <div className="text-[10.5px] text-[#b2a9cf] leading-snug">
                        {curStone
                          ? curStone.affix
                          : "Choose a Carved Runestone on the right to bind permanently to this gear."}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: Compatible Gear in Bag / Carved Runestones */}
        <div className="rounded border border-[#2b3243] bg-[#0d1119]/95 p-3 flex flex-col gap-2.5 min-h-0">
          <div className="flex gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                audioEngine.playUiClick(0.3);
                setSubTab("gear");
              }}
              className={[
                "px-2.5 py-1 rounded border text-[11.5px] font-semibold cursor-pointer transition",
                subTab === "gear"
                  ? "border-[#d7b267] bg-[#2a2214] text-[#fae2aa]"
                  : "border-[#31384a] bg-[#161b26] text-[#aeb9cc] hover:border-[#6a5b3e]",
              ].join(" ")}
            >
              Compatible Gear in Bag ({compatibleBagGear.length})
            </button>
            <button
              type="button"
              onClick={() => {
                audioEngine.playUiClick(0.3);
                setSubTab("runestones");
              }}
              className={[
                "px-2.5 py-1 rounded border text-[11.5px] font-semibold cursor-pointer transition",
                subTab === "runestones"
                  ? "border-[#a585e8] bg-[#231b35] text-[#ebe1ff]"
                  : "border-[#31384a] bg-[#161b26] text-[#aeb9cc] hover:border-[#6e5a96]",
              ].join(" ")}
            >
              Carved Runestones ({runestonesBag.length})
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1.5 pr-1">
            {subTab === "gear" ? (
              compatibleBagGear.length === 0 ? (
                <div className="text-[12px] text-[#8d99b0] py-6 text-center">
                  No spare equipment in your bag that {hero.name} can wear.
                </div>
              ) : (
                compatibleBagGear.map(({ item, count }) => (
                  <div
                    key={item.id}
                    className="rounded border border-[#2b3243] bg-[#141925] hover:border-[#685838] p-2 flex items-center gap-2.5"
                    {...itemTooltipHandlers(item, {
                      activeHeroId: heroId,
                      equippedByHero,
                      itemsById,
                    })}
                  >
                    <img
                      src={assetUrl(item.iconPath)}
                      alt={item.name}
                      className="w-[38px] h-[38px] rounded border border-[#493d28] bg-[#0b0e14] object-contain shrink-0"
                      draggable={false}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] font-semibold text-[#f3dfb1] truncate">
                        {item.name} {count > 1 ? `×${count}` : ""}
                      </div>
                      <div className="text-[10.5px] text-[#9aa9c0] truncate">
                        {item.subType}
                        {item.handed === "2H" ? " · 2-Handed" : ""} · {summarizeItemStats(item)}
                      </div>
                    </div>
                    {canDualWieldItem(heroId, item) && rightHandItem && rightHandItem.handed === "1H" ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            audioEngine.playUiClick(0.38);
                            onEquipFromBag(heroId, item.id, "right_hand");
                          }}
                          className="px-2 py-1 rounded border border-[#c7a052] bg-[#c49848]/25 hover:bg-[#c49848]/45 text-[10.5px] font-bold uppercase tracking-wider text-[#fff1cb] cursor-pointer"
                        >
                          Main
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            audioEngine.playUiClick(0.38);
                            onEquipFromBag(heroId, item.id, "left_hand");
                          }}
                          className="px-2 py-1 rounded border border-[#56a874] bg-[#21613d]/45 hover:bg-[#2a7d4e]/65 text-[10.5px] font-bold uppercase tracking-wider text-[#eafff2] cursor-pointer"
                        >
                          Off-Hand
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          audioEngine.playUiClick(0.38);
                          onEquipFromBag(heroId, item.id);
                        }}
                        className="px-3 py-1 rounded border border-[#c7a052] bg-[#c49848]/25 hover:bg-[#c49848]/45 text-[11px] font-bold uppercase tracking-wider text-[#fff1cb] cursor-pointer shrink-0"
                      >
                        Equip
                      </button>
                    )}
                  </div>
                ))
              )
            ) : runestonesBag.length === 0 ? (
              <div className="text-[12px] text-[#8d99b0] py-6 text-center leading-relaxed">
                No Carved Runestones in your bag yet.
                <br />
                Complete quests and defeat threats to earn Runestones.
              </div>
            ) : (
              runestonesBag.map((stone) => (
                <div
                  key={stone.id}
                  className="rounded border border-[#3a3250] bg-[#151322] hover:border-[#8e74c4] p-2 flex items-center gap-2.5"
                  {...runestoneTooltipHandlers(stone)}
                >
                  <img
                    src={assetUrl(stone.iconPath || RUNESTONE_EMPTY_ICON)}
                    alt={stone.name}
                    className="w-[38px] h-[38px] rounded border border-[#4d3f6b] bg-[#0b0c12] object-contain shrink-0"
                    draggable={false}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-semibold text-[#ebe1ff] truncate">{stone.name}</div>
                    <div className="text-[10.5px] text-[#b4a9d4] leading-snug">
                      {stone.target === "weapon" ? "Fits Weapon" : "Fits Body Armor"} · {stone.affix}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      audioEngine.playUiClick(0.38);
                      onRequestSocketRunestone(heroId, stone);
                    }}
                    className="px-3 py-1 rounded border border-[#9d7ee0] bg-[#694da8]/30 hover:bg-[#694da8]/50 text-[11px] font-bold uppercase tracking-wider text-[#f3ebff] cursor-pointer shrink-0"
                  >
                    Socket
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
