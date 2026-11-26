import React, { useEffect } from "react";
import { assetUrl } from "../api";
import { resolveDamageTypeIcons } from "../battle/battleLogic";
import { getHeroById } from "../heroes";
import { hideClientItemTooltip, itemTooltipHandlers, weaponAttackTooltipHandlers } from "../shops/itemTooltip";
import { canDualWieldItem, cleanDamageTypeLabel, getWeaponAttackSpecs, MAX_SPELLS_PER_REGION } from "../shops/shopLogic";
import type { EquippedGearMap, HeroId, ItemEntry, SpellEntry } from "../types";

interface WeaponsSpellsTabProps {
  heroId: HeroId;
  equippedByHero: EquippedGearMap;
  itemsById: Record<string, ItemEntry>;
  spells: SpellEntry[];
  learnedSpellIds: string[];
}

export const WeaponsSpellsTab: React.FC<WeaponsSpellsTabProps> = ({
  heroId,
  equippedByHero,
  itemsById,
  spells,
  learnedSpellIds,
}) => {
  useEffect(() => () => hideClientItemTooltip(), []);

  const hero = getHeroById(heroId);
  const wpnId = equippedByHero[heroId]?.right_hand;
  const wpn = wpnId ? itemsById[wpnId] : undefined;
  const offhandId = equippedByHero[heroId]?.left_hand;
  const rawOffhand = offhandId ? itemsById[offhandId] : undefined;
  const offhandWpn = canDualWieldItem(heroId, rawOffhand) ? rawOffhand : undefined;
  const attackModes = getWeaponAttackSpecs(wpn?.subType, wpn?.damageType);
  const dmgLabel = cleanDamageTypeLabel(wpn?.damageType ?? "Bludgeoning");
  const canCast = hero.baseMp > 0 || heroId === "ellowyn" || heroId === "mera" || heroId === "harlan";

  // Strictly show ONLY spells already learned — never preview unlearned/future spells
  const learnedSet = new Set(learnedSpellIds);
  const heroSpells = spells.filter((sp) => (sp.usableBy ?? []).includes(heroId) && learnedSet.has(sp.id));

  return (
    <section className="flex-1 min-w-0 rounded border border-[#323a4b] bg-[#11151f]/95 p-4 flex flex-col gap-3 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[#293040] pb-2.5 shrink-0">
        <img
          src={assetUrl(hero.avatarPath)}
          alt={hero.name}
          className="w-[50px] h-[50px] rounded border border-[#8a703e] object-cover shrink-0 bg-[#0b0e14]"
          draggable={false}
        />
        <div className="min-w-0">
          <h3 className="font-display m-0 text-[17px] text-[#fae2aa] tracking-wide truncate">
            {hero.name}&apos;s Weapon Attacks &amp; Spells
          </h3>
          <div className="text-[12px] text-[#aebad0]">
            Active Weapon:{" "}
            {wpn ? (
              <strong
                {...itemTooltipHandlers(wpn, {
                  activeHeroId: heroId,
                  equippedByHero,
                  itemsById,
                })}
                className="text-[#fae2aa] underline decoration-dotted decoration-[#8c703b] cursor-pointer"
              >
                {wpn.name}
              </strong>
            ) : (
              <strong className="text-[#fae2aa]">None Equipped (Unarmed)</strong>
            )}{" "}
            ({dmgLabel})
            {offhandWpn && (
              <>
                {" "}· Off-Hand:{" "}
                <strong
                  {...itemTooltipHandlers(offhandWpn, {
                    activeHeroId: heroId,
                    equippedByHero,
                    itemsById,
                  })}
                  className="text-[#fae2aa] underline decoration-dotted decoration-[#8c703b] cursor-pointer"
                >
                  {offhandWpn.name}
                </strong>{" "}
                ({cleanDamageTypeLabel(offhandWpn.damageType ?? "Physical")})
              </>
            )}
          </div>
        </div>
      </div>

      {/* 0 MP Weapon Attack Modes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {attackModes.map((mode) => (
          <div
            key={mode.spec.id}
            {...weaponAttackTooltipHandlers(wpn?.subType, mode.slot, wpn?.damageType)}
            className="rounded border border-[#343c4e] hover:border-[#8c703b] bg-[#141925] p-3 flex items-center gap-3 cursor-pointer transition-colors"
          >
            <div className="w-[46px] h-[46px] rounded border border-[#8c703b] bg-[#0b0e14] overflow-hidden flex items-center justify-center shrink-0">
              <img
                src={assetUrl(mode.iconPath)}
                alt={mode.spec.name}
                className={wpn ? "w-full h-full object-cover" : "w-[34px] h-[34px] object-contain"}
                draggable={false}
              />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#d9b86c]">
                Weapon Attack · {mode.spec.tag}
              </div>
              <div className="text-[14px] font-bold text-[#fae2aa] truncate">{mode.spec.name}</div>
              <div className="text-[11px] text-[#9fb0c8]">{mode.spec.effect}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Dual Wielding Follow-Up Note */}
      {offhandWpn && (
        <div
          {...itemTooltipHandlers(offhandWpn, {
            activeHeroId: heroId,
            equippedByHero,
            itemsById,
          })}
          className="rounded border border-[#725b34] hover:border-[#e6c170] bg-[#211a0f]/90 p-2.5 px-3 flex items-center gap-3 cursor-pointer transition-colors"
        >
          <img src={assetUrl(offhandWpn.iconPath)} alt={offhandWpn.name} className="w-9 h-9 object-contain rounded border border-[#5d4c30] bg-[#0b0e14] p-0.5 shrink-0" draggable={false} />
          <div className="min-w-0">
            <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#e5c273]">
              Dual Wield · Automatic Follow-Up Hit
            </div>
            <div className="text-[12px] text-[#dce4f4]">
              Every weapon attack with <strong className="text-[#fae2aa]">{wpn?.name ?? "Main Hand"}</strong> automatically strikes a second time with{" "}
              <strong className="text-[#fae2aa]">{offhandWpn.name}</strong> at <strong className="text-[#84f3ba]">50% Attack Power</strong>.
            </div>
          </div>
        </div>
      )}

      {/* Spells Section (Only Learned Spells) */}
      {!canCast ? (
        <div className="rounded border border-[#2c3344] bg-[#0e121a] p-3.5 text-[12px] text-[#c5d0e2] leading-relaxed">
          <strong className="text-[#fae2aa]">Martial Fighter ({hero.className})</strong>
          <div className="mt-1">
            {hero.name} fights without MP—relying on equipped weapon attacks, Carved Runestones, and Wounded Resolve bonuses.
          </div>
        </div>
      ) : heroSpells.length === 0 ? (
        <div className="rounded border border-[#2c3344] bg-[#0e121a] p-3.5 text-[12px] text-[#c5d0e2] leading-relaxed">
          <strong className="text-[#fae2aa]">Learned Spells (0)</strong>
          <div className="mt-1">No spells learned yet. Visit a Town Magic Shop to learn spells for {hero.name}.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 min-h-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-[#fae2aa]">
              Learned Spells ({heroSpells.length} / 16)
            </span>
            <span className="text-[10.5px] text-[#9eb0c9]">Up to {MAX_SPELLS_PER_REGION} spells learned per Region Tier (T1–T8)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 overflow-y-auto pr-1">
            {heroSpells.map((sp) => (
              <div
                key={sp.id}
                className="rounded border border-[#2c364d] bg-[#141925] p-2.5 flex items-center gap-2.5"
                {...itemTooltipHandlers(
                  { ...sp, isSpell: true },
                  { learnedSpellIds }
                )}
              >
                <img
                  src={assetUrl(sp.iconPath)}
                  alt={sp.name}
                  className="w-[40px] h-[40px] rounded border border-[#3a4a6e] bg-[#0b0e14] object-cover shrink-0"
                  draggable={false}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-bold text-[#f3e2b7] truncate">{sp.name}</span>
                    <span className="text-[10.5px] font-bold text-[#82bdff] shrink-0">
                      T{sp.region} · {sp.mpCost} MP
                    </span>
                  </div>
                  <div className="text-[10.5px] text-[#9eb0c9] flex items-center gap-1">
                    {resolveDamageTypeIcons(sp.damageType).map((dt) => (
                      <img
                        key={dt.id}
                        src={assetUrl(dt.iconPath)}
                        alt=""
                        className="w-3.5 h-3.5 rounded-[2px] border border-white/20 object-cover shrink-0"
                        draggable={false}
                      />
                    ))}
                    <span>
                      {sp.subType} · {cleanDamageTypeLabel(sp.damageType)}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#c6d1e3] mt-0.5 line-clamp-2">{sp.effect}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
