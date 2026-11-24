import React, { useEffect } from "react";
import { assetUrl } from "../api";
import { audioEngine } from "../audio";
import { ATTRIBUTE_META, getHeroById } from "../heroes";
import { hideClientItemTooltip, infoTooltipHandlers, type InfoTooltipRow } from "../shops/itemTooltip";
import type {
  ChosenDisciplinesMap,
  EquippedGearMap,
  HeroAttrKey,
  HeroAttrMap,
  HeroDisciplinesEntry,
  HeroId,
  HeroSocketsMap,
  ItemEntry,
} from "../types";
import { computeHeroVitals, getHeroAttributes, getHeroLevel, getHeroXp, xpRequiredForNextLevel } from "./partyLogic";

interface PartyStatsTabProps {
  heroId: HeroId;
  partyOrder: HeroId[];
  level: number;
  partyXp?: number;
  heroLevels?: Partial<Record<HeroId, number>>;
  heroXp?: Partial<Record<HeroId, number>>;
  heroSpentAttrs: Partial<Record<HeroId, HeroAttrMap>>;
  equippedByHero: EquippedGearMap;
  itemsById: Record<string, ItemEntry>;
  socketsByHero: HeroSocketsMap;
  heroHpPct: Partial<Record<HeroId, number>>;
  heroMpPct?: Partial<Record<HeroId, number>>;
  disciplinesByHero?: Partial<Record<HeroId, HeroDisciplinesEntry>>;
  chosenDisciplinesByHero?: ChosenDisciplinesMap;
  onAdjustStat: (heroId: HeroId, stat: HeroAttrKey, delta: number) => void;
  onResetStats: (heroId: HeroId) => void;
}

export const PartyStatsTab: React.FC<PartyStatsTabProps> = ({
  heroId,
  partyOrder,
  level,
  partyXp = 0,
  heroLevels,
  heroXp,
  heroSpentAttrs,
  equippedByHero,
  itemsById,
  socketsByHero,
  heroHpPct,
  heroMpPct,
  disciplinesByHero,
  chosenDisciplinesByHero,
  onAdjustStat,
  onResetStats,
}) => {
  useEffect(() => () => hideClientItemTooltip(), []);

  const hero = getHeroById(heroId);
  const heroLv = getHeroLevel(heroLevels, heroId, level);
  const curXp = heroXp ? getHeroXp(heroXp, heroId) : partyXp;
  const attrs = getHeroAttributes(heroId, heroLv, heroSpentAttrs);
  const vitals = computeHeroVitals(heroId, heroLv, heroSpentAttrs, equippedByHero, itemsById, socketsByHero, heroHpPct, heroMpPct);
  const slotIdx = partyOrder.indexOf(heroId);
  const nextLevelXp = xpRequiredForNextLevel(heroLv);
  const xpPct = nextLevelXp > 0 ? Math.min(100, Math.round((curXp / nextLevelXp) * 100)) : 100;
  const heroDiscTiers = disciplinesByHero?.[heroId]?.tiers ?? [];
  const chosenDiscMap = chosenDisciplinesByHero?.[heroId] ?? {};
  const chosenDiscEntries = heroDiscTiers
    .map((t) => {
      const oid = chosenDiscMap[String(t.level)];
      const opt = oid ? [t.optionA, t.optionB].find((o) => o.id === oid) : undefined;
      return opt ? { tier: t.level, opt } : null;
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  const attrTooltipSpec = (statKey: HeroAttrKey, label: string, val: number, spentVal: number, isFocus: boolean) => {
    const baseVal = val - spentVal;
    const rows: InfoTooltipRow[] = [
      { label: "Base + Spent", value: `${baseVal} + ${spentVal} = ${val}` },
    ];
    let effect = "";
    if (statKey === "force") {
      rows.push({ label: "Physical Attack", value: `+${Math.round(Math.max(0, val - 1) * 1.5)}` });
      effect = "Raises Physical Attack (+1.5 per point above 1) and fuels heavy melee & bow strikes.";
    } else if (statKey === "finesse") {
      rows.push({ label: "Dodge Bonus", value: `+${Math.round(Math.max(0, val - 1) * 0.3)}%` });
      rows.push({ label: "Crit Bonus", value: `+${Math.round(Math.max(0, val - 1) * 0.4)}%` });
      effect = "Improves Dodge Chance (+0.3% per point) and Critical Hit Chance (+0.4% per point), both capped at 45% with gear.";
    } else if (statKey === "grit") {
      rows.push({ label: "Max HP Bonus", value: `+${val * 12}` });
      rows.push({ label: "Phys Defense", value: `+${Math.max(0, val - 1)}` });
      effect = "Increases Maximum HP (+12 HP per point) and Physical Defense (+1 per point above 1).";
    } else if (statKey === "arcana") {
      rows.push({ label: "Spell Power", value: `+${Math.round(Math.max(0, val - 1) * 1.6)}` });
      rows.push({ label: "Max MP Bonus", value: vitals.hasMp ? `+${val * 4}` : "N/A (No MP)" });
      effect = "Raises Spell Power (+1.6 per point above 1) and enlarges MP reserves (+4 MP per point) for spellcasters.";
    } else {
      rows.push({ label: "Heal Power", value: `+${Math.round(Math.max(0, val - 1) * 1.5)}` });
      rows.push({ label: "Magic Defense", value: `+${Math.max(0, val - 1)}` });
      effect = "Strengthens Healing Spells (+1.5 per point above 1) and raises Magic Defense (+1 per point above 1).";
    }
    return {
      key: `attr:${heroId}:${statKey}:${val}:${spentVal}`,
      eyebrow: isFocus ? `${hero.name} Focus Attribute ★` : "Spendable Attribute",
      title: `${label} (${val})`,
      badges: isFocus ? [{ label: "Natural Focus ★", tone: "gold" as const }] : undefined,
      statsTitle: "Current Scaling",
      rows,
      effect,
      notes: ["Click - / +1 / +5 to adjust spent points freely outside combat."],
    };
  };

  const derivedStats: Array<{ label: string; val: string | number; tipTitle: string; tipDesc: string }> = [
    {
      label: "Attack",
      val: vitals.dualWielding ? `${vitals.atk} (+${vitals.offhandAtk} Off-Hand)` : vitals.atk,
      tipTitle: "Physical Attack",
      tipDesc: "Combined weapon Attack, Level growth, Force scaling, and Carved Runestones. Dual-wielding strikes twice (main + 50% off-hand).",
    },
    {
      label: "Spell Power",
      val: vitals.mag,
      tipTitle: "Spell Power",
      tipDesc: vitals.hasMp
        ? "Scales offensive spell damage from equipped Staves/Talismans, Level, Arcana, and Runestones."
        : "Spell Power from gear and Arcana. This martial hero does not cast MP spells.",
    },
    {
      label: "Phys Defense",
      val: vitals.pDef,
      tipTitle: "Physical Defense",
      tipDesc: "Reduces incoming Slashing, Piercing, and Bludgeoning damage using Body Armor, Helm, Shield, Grit, and Runestones.",
    },
    {
      label: "Magic Defense",
      val: vitals.mDef,
      tipTitle: "Magic Defense",
      tipDesc: "Reduces incoming elemental and Shadow spell damage using Attire, Presence, and Carved Runestones.",
    },
    {
      label: "Dodge Chance",
      val: `${vitals.dodge}%`,
      tipTitle: "Dodge Chance (Cap 45%)",
      tipDesc: "Chance to completely evade incoming strikes. Built from Finesse, light attire/gear, and Runestones.",
    },
    {
      label: "Crit Chance",
      val: `${vitals.crit}%`,
      tipTitle: "Critical Hit Chance (Cap 45%)",
      tipDesc: "Base 5% plus Finesse scaling, weapons/gear, and Runestones. Critical hits amplify damage and trigger crit passives.",
    },
    {
      label: "Heal Power",
      val: vitals.heal,
      tipTitle: "Healing Power",
      tipDesc: "Scales healing spells and restorative wards using Staff/Talisman bonuses, Presence, and Runestones.",
    },
    {
      label: "Party Position",
      val: slotIdx === 0 ? "Leader (#1)" : `Slot #${slotIdx + 1}`,
      tipTitle: "Formation & Leader Order",
      tipDesc: "Slot #1 leads the party on the world map and takes point in formation. Reorder heroes anytime using the ▲ ★ ▼ buttons on the left rail.",
    },
  ];

  return (
    <section className="flex-1 min-w-0 rounded border border-[#323a4b] bg-[#11151f]/95 p-4 flex flex-col gap-3 overflow-y-auto">
      {/* Hero Banner */}
      <div
        {...infoTooltipHandlers({
          key: `stats-hero:${heroId}:${heroLv}:${vitals.curHp}`,
          eyebrow: `${hero.className} · Level ${heroLv}`,
          title: hero.name,
          iconPath: hero.avatarPath,
          badges: [
            { label: `${vitals.curHp}/${vitals.maxHp} HP`, tone: "up" },
            ...(vitals.hasMp ? [{ label: `${vitals.curMp}/${vitals.maxMp} MP`, tone: "mp" as const }] : []),
          ],
          rows: [
            { label: "Natural Focus", value: hero.focusLabel },
            { label: "XP Progress", value: nextLevelXp > 0 ? `${curXp.toLocaleString()} / ${nextLevelXp.toLocaleString()}` : "Max Level" },
          ],
          effect: hero.worldBio,
        })}
        className="flex items-center gap-3 border-b border-[#293040] pb-3 cursor-default"
      >
        <img
          src={assetUrl(hero.avatarPath)}
          alt={hero.name}
          className="w-[62px] h-[62px] rounded border border-[#8a703e] object-cover shrink-0 bg-[#0b0e14]"
          draggable={false}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display m-0 text-[18px] text-[#fae2aa] tracking-wide truncate">
              {hero.name} · {hero.className}
            </h3>
            <span className="text-[11px] font-semibold text-[#d6be86]">
              Lv {heroLv} ·{" "}
              {nextLevelXp > 0 ? `${curXp.toLocaleString()} / ${nextLevelXp.toLocaleString()} XP` : "Max Level"}
            </span>
          </div>
          <div className="mt-1 h-[5px] rounded-full bg-[#090d14] border border-[#2a3142] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#8f6a28] via-[#d7ad56] to-[#ffe191] transition-all"
              style={{ width: `${xpPct}%` }}
            />
          </div>
          <div className="text-[12px] text-[#aebad0] mt-1">
            {hero.shortTag} · Natural Focus: <strong className="text-[#fae2aa]">{hero.focusLabel}</strong>
          </div>
          <p className="m-0 mt-0.5 text-[11.5px] text-[#cbd5e6] leading-snug line-clamp-2">{hero.worldBio}</p>
        </div>
      </div>

      {/* Spendable Attributes */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span className="text-[12px] text-[#ced8ea]">
            Attributes (<strong className="text-[#fae2aa]">{attrs.unspent}</strong> unspent points · Total Allocated:{" "}
            {attrs.totalSpent}/{attrs.budget})
          </span>
          <button
            type="button"
            disabled={attrs.totalSpent <= 0}
            onClick={() => {
              audioEngine.playUiClick(0.35);
              onResetStats(heroId);
            }}
            className="px-2.5 py-1 rounded border border-[#4a5368] hover:border-[#d7b267] bg-[#1a202c] disabled:opacity-35 text-[11px] font-semibold text-[#dfe7f4] cursor-pointer"
          >
            Reset Points
          </button>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {ATTRIBUTE_META.map((stat) => {
            const isFocus = hero.focusAttributes.includes(stat.key);
            const val = attrs[stat.key];
            const spentVal = attrs.spent[stat.key];
            return (
              <div
                key={stat.key}
                {...infoTooltipHandlers(attrTooltipSpec(stat.key, stat.label, val, spentVal, isFocus))}
                className={[
                  "rounded border p-2 flex flex-col items-center text-center gap-1 cursor-help transition-colors",
                  isFocus
                    ? "bg-gradient-to-b from-[#231d12] to-[#151822] border-[#a88547]/80 hover:border-[#e6c170]"
                    : "bg-[#151924] border-[#2c3446] hover:border-[#687594]",
                ].join(" ")}
              >
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#d9b86c]">
                  {stat.label}
                  {isFocus ? " ★" : ""}
                </div>
                <div className="font-display text-[22px] font-bold text-[#fff3cf] leading-none">{val}</div>
                <div className="text-[10px] text-[#8f9eb6]">{stat.hint}</div>
                <div className="flex items-center gap-1 mt-1">
                  <button
                    type="button"
                    disabled={spentVal <= 0}
                    onClick={() => {
                      audioEngine.playUiClick(0.3);
                      onAdjustStat(heroId, stat.key, -1);
                    }}
                    className="w-[24px] h-[22px] rounded border border-[#3e4659] hover:border-[#d7b267] bg-[#1b2130] disabled:opacity-25 text-[11px] font-bold text-[#e5ecf7] cursor-pointer"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    disabled={attrs.unspent < 1}
                    onClick={() => {
                      audioEngine.playUiClick(0.35);
                      onAdjustStat(heroId, stat.key, 1);
                    }}
                    className="px-1.5 h-[22px] rounded border border-[#5d4d30] hover:border-[#d7b267] bg-[#251f14] disabled:opacity-25 text-[10.5px] font-bold text-[#fae2aa] cursor-pointer"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    disabled={attrs.unspent < 5}
                    onClick={() => {
                      audioEngine.playUiClick(0.38);
                      onAdjustStat(heroId, stat.key, 5);
                    }}
                    className="px-1.5 h-[22px] rounded border border-[#5d4d30] hover:border-[#d7b267] bg-[#251f14] disabled:opacity-25 text-[10.5px] font-bold text-[#fae2aa] cursor-pointer"
                  >
                    +5
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Derived Totals */}
      <div className="grid grid-cols-4 gap-2">
        {derivedStats.map((d) => (
          <div
            key={d.label}
            {...infoTooltipHandlers({
              key: `derived:${heroId}:${d.label}:${d.val}`,
              eyebrow: `${hero.name} Derived Combat Stat`,
              title: `${d.tipTitle}: ${d.val}`,
              effect: d.tipDesc,
            })}
            className="rounded border border-[#293040] hover:border-[#6a5b3e] bg-[#0e1219] px-2.5 py-1.5 flex items-center justify-between cursor-help transition-colors"
          >
            <span className="text-[11px] text-[#96a6bf]">{d.label}</span>
            <strong className="text-[13px] text-[#f3dfb1]">{d.val}</strong>
          </div>
        ))}
      </div>

      {/* Resolve Passives */}
      <div
        {...infoTooltipHandlers({
          key: `resolve:${heroId}:${Math.round(vitals.hpRatio)}`,
          eyebrow: `${hero.name} Innate Comeback Trait`,
          title: "Resolve (Wounded Thresholds)",
          badges: [
            {
              label: vitals.hpRatio < 25 ? "Desperate (<25% HP Active)" : vitals.hpRatio < 50 ? "Wounded (<50% HP Active)" : "Standing Ready",
              tone: vitals.hpRatio < 50 ? "gold" : "default",
            },
          ],
          rows: [
            { label: "Below 50% HP", value: vitals.hpRatio < 50 ? "ACTIVE" : "Inactive", tone: vitals.hpRatio < 50 ? "up" : "flat" },
            { label: "Below 25% HP", value: vitals.hpRatio < 25 ? "ACTIVE" : "Inactive", tone: vitals.hpRatio < 25 ? "up" : "flat" },
          ],
          effect: `${hero.wounded50}\n${hero.wounded25}`,
        })}
        className={[
          "rounded border px-3 py-2 text-[11.5px] leading-relaxed cursor-help transition-colors",
          vitals.hpRatio < 50
            ? "border-[#b57b30] hover:border-[#e6b360] bg-[#241b10]/90 text-[#f7e5be]"
            : "border-[#2a3142] hover:border-[#6a5b3e] bg-[#0e1219]/90 text-[#c2cde0]",
        ].join(" ")}
      >
        <strong className="text-[#fae2aa]">Resolve (Wounded Comeback Traits):</strong>
        <div className="mt-0.5">
          {vitals.hpRatio < 50 ? <span className="text-[#f5c25b] font-bold">● ACTIVE: </span> : ""}
          {hero.wounded50}
        </div>
        <div>
          {vitals.hpRatio < 25 ? <span className="text-[#f56b78] font-bold">● ACTIVE: </span> : ""}
          {hero.wounded25}
        </div>
      </div>

      {/* Arcanist Disciplines Summary */}
      <div className="rounded border border-[#2a3142] bg-[#0e1219]/90 px-3 py-2 text-[11.5px]">
        <div className="flex items-center justify-between gap-2 mb-1">
          <strong className="text-[#fae2aa]">Arcanist Disciplines ({chosenDiscEntries.length}/10 Bound)</strong>
          <span className="text-[10.5px] text-[#8fa1bd]">Train at any Town Arcanist (Lv 1, 10–90)</span>
        </div>
        {chosenDiscEntries.length === 0 ? (
          <div className="text-[#8f9fb8]">No Disciplines bound yet for {hero.name}.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-1">
            {chosenDiscEntries.map(({ tier, opt }) => (
              <div
                key={opt.id}
                {...infoTooltipHandlers({
                  key: `disc:${heroId}:${tier}:${opt.id}`,
                  eyebrow: `Arcanist Discipline · Lv ${tier} Tier (${opt.pillar.toUpperCase()})`,
                  title: opt.name,
                  iconPath: opt.iconPath,
                  badges: [{ label: opt.tag, tone: "up" }],
                  effect: opt.effect,
                })}
                className="rounded border border-[#3e4f38] hover:border-[#86c98e] bg-[#131d19] px-2 py-1 flex items-center gap-2 cursor-help transition-colors"
              >
                {opt.iconPath && (
                  <img
                    src={assetUrl(opt.iconPath)}
                    alt={opt.name}
                    className="w-[24px] h-[24px] rounded border border-[#4e6646] bg-[#0b100e] object-cover shrink-0"
                    draggable={false}
                  />
                )}
                <span className="text-[10px] font-bold text-[#9de6bc] shrink-0">Lv {tier}</span>
                <div className="min-w-0">
                  <div className="text-[11.5px] font-bold text-[#fae4b0] leading-tight truncate">{opt.name}</div>
                  <div className="text-[10px] text-[#bfd2c9] leading-snug line-clamp-1">{opt.effect}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
