/**
 * Shared Discipline, Carved Runestone, Spell Edge-Case, and Hero Resolve Combat Engine.
 * Centralizes all 120 Discipline triggers, 32 Runestone prefixes/suffixes, and class passives
 * so UI battle loops and balance simulations share identical, zero-drift behavior.
 */
import type { HeroDisciplinesEntry, HeroId, RunestoneAffixesCatalog, RunestoneItem } from "../types";
import type { BattleHeroUnit, HeroCombatPassives, HeroDisciplineModifiers } from "./battleTypes";

const TIER_SCALE_BY_NAME: Record<string, number> = {};

/** Populate Runestone rarity scaling factors from data/runestone-affixes.json. */
export function applyRunestoneAffixesCatalog(catalog: RunestoneAffixesCatalog | null | undefined): void {
  if (!catalog || !Array.isArray(catalog.rarityTiers)) return;
  for (const k of Object.keys(TIER_SCALE_BY_NAME)) delete TIER_SCALE_BY_NAME[k];
  for (const tier of catalog.rarityTiers) {
    const scale = Number(tier.scale ?? 1);
    if (tier.tier) TIER_SCALE_BY_NAME[tier.tier.toLowerCase()] = scale;
    if (tier.id) TIER_SCALE_BY_NAME[tier.id.toLowerCase()] = scale;
  }
}

/** Return continuous Runestone tier ratio in [0..1] (Lesser=0, Refined=0.333, Greater=0.667, Mythic=1). */
export function getRunestoneTierRatio(tier: string): number {
  const tScale = TIER_SCALE_BY_NAME[(tier || "Lesser").toLowerCase()] ?? 1.0;
  return Math.max(0, Math.min(1, (tScale - 1.0) / 1.5));
}

const PCT_RANGE_RE = /(\d+)%?(?:\s*(?:[–-]|to)\s*\+?(\d+)%)?/i;
const MP_RANGE_RE = /(\d+)(?:\s*(?:[–-]|to)\s*(\d+))?\s*mp\b/i;

/** Estimate continuous Runestone potency scalar [0..1] from tier or explicit single rolled value. */
function pullRunestoneValue(affix: string, tier: string, re: RegExp, lo: number, hi: number): number {
  const ratio = getRunestoneTierRatio(tier);
  const m = affix.match(re);
  if (m) {
    const a = Number(m[1]);
    if (m[2] === undefined) return a;
    return Math.round(a + (Number(m[2]) - a) * ratio);
  }
  return Math.round(lo + (hi - lo) * ratio);
}

export function createEmptyModifiers(): HeroDisciplineModifiers {
  return {
    critPct: 0,
    spellCritPct: 0,
    atkPct: 0,
    magPct: 0,
    healPct: 0,
    pDefPct: 0,
    mDefPct: 0,
    maxHpPct: 0,
    maxMpPct: 0,
    dodgePct: 0,
    guardMitigationPct: 0,
    mpCostReductionPct: 0,
    armorPiercePct: 0,
    lifestealPct: 0,
    hpRegenPct: 0,
    ailmentPowerPct: 0,
    statusResistPct: 0,
  };
}

export function createEmptyPassives(): HeroCombatPassives {
  return {
    meleeDamageTakenReductionPct: 0,
    aboveHalfHpMitigationPct: 0,
    critTakenReductionPct: 0,
    dotResistPct: 0,
    plagueShadowResistPct: 0,
    counterDamageHalvePct: 0,
    stunCurseResistPct: 0,
    accuracyBonusPct: 0,
    critDamagePct: 0,
    magicPiercePct: 0,
    universalPoisonPenPct: 0,
    poisonDotBonusPct: 0,
    potionBonusPct: 0,
    extraGuardChip: 0,
    extraGuardVsGuarded: 0,
    extraGuardModeB: 0,
    extraGuardAcidPoison: 0,
    extraGuardOnWeakness: 0,
    extraGuardPct: 0,
    extraSpellMpCost: 0,
    wardExtraTurn: 0,
    regenExtraTurn: 0,
    startWardShieldPct: 0,
    unbreakableWardPct: 0,
    overflowShieldMaxPct: 0,
    sacredResilience: false,
    guardHealPct: 0,
    guardMpGain: 0,
    guardDefTurn: false,
    guardClearsBurnOrBleed: false,
    guardDodgePct: 0,
    guardSlamEnemy: false,
    guardNatureSpellPct: 0,
    guardShieldWallLowestPct: 0,
    guardTauntBarricade: false,
    wardOrGuardMpPct: 0,
    riposteEachRound: false,
    cleaveSecondEnemyPct: 0,
    seizeOpeningOnce: false,
    soloEnemyBonusPct: 0,
    firstHitBonusPct: 0,
    firstShotCritPct: 0,
    firstSpellHalfMpPct: 0,
    antiBossArmorPct: 0,
    vsGuardedBonusPct: 0,
    vsLowHp35BonusPct: 0,
    vsLowHp35CritPct: 0,
    vsLowHp35PenPct: 0,
    vsLowHp40ExecPct: 0,
    vsCasterRangedBonusPct: 0,
    vsBeastMonsterBonusPct: 0,
    greatswordStaggeredBonusPct: 0,
    shieldAccuracyPct: 0,
    shieldCritDamagePct: 0,
    shieldPDefPct: 0,
    shieldDodgePct: 0,
    shieldStunResistPct: 0,
    spearCritPct: 0,
    crossbowBonusPct: 0,
    crossbowBlinds: false,
    staffSpellPct: 0,
    scimitarSicklePct: 0,
    bowSeverBuffChance: 0,
    bowTwinShotChance: 0,
    bowArrowStormR3: false,
    critInflictsBleedTurns: 0,
    critBouncePct: 0,
    critGainMomentum: false,
    lightModeCritPct: 0,
    lightModeBleed: false,
    lightModeBlinds: false,
    modeBBlindsAndStrips: false,
    modeBStunChance: 0,
    coatedEdgePoisonChance: 0,
    radiantStripBuffChance: 0,
    frostStunOrWeaken: false,
    singleSpellEchoRadiantPct: 0,
    multiSpellMpRefundPct: 0,
    galeWindPartyDodgePct: 0,
    creepingBriarsSpreadChance: 0,
    corrosiveThornsDefDown: false,
    purifyingDewCleanses: false,
    mossWardTurns: 0,
    triageHalfHpHealPct: 0,
    protectiveSalveWardPct: 0,
    smellingSaltCleanseBuff: false,
    toxicRuptureOnPoisoned: false,
    vaporShatterPoisonSplashPct: 0,
    quickeningBalmBonusPct: 0,
    quickeningBalmWardPct: 0,
    masterPanaceaResistBuff: false,
    emergencyHealHalfMp30Pct: 0,
    lifebloomSurgeOnce: false,
    nerveLockStumbleChance: 0,
    blightSiphonMpPerPoison: 0,
    dodgeHealsPct: 0,
    dodgeGrantsMomentum: false,
    rangedDodgePct: 0,
    highlandHp75CritPct: 0,
    cadenceAtkPerRoundPct: 0,
    battleWrathPerHitPct: 0,
    bluntingEnemyAtkDown: false,
    interceptLowestAllyPct: 0,
    vowInterceptAbove25Pct: false,
    martyrInterceptPct: 0,
    regalCommandMark: false,
    critiqueExposeDef: false,
    spotterExposeDef: false,
    crushingFollowThroughPct: 0,
    commandingBreachPct: 0,
    royalChallengeR1: false,
    coveringVolleyOnceRound: false,
    partyStartEmpowerTurns: 0,
    partyMDefAuraPct: 0,
    partyAoeDamageReductionPct: 0,
    partyPackCritPct: 0,
    partyPackAccPct: 0,
    partyShockBonusPct: 0,
    partyBleedShockCritPct: 0,
    partyBleedShockPenPct: 0,
    partyWardRootResistPct: 0,
    runestoneBonusElemType: null,
    runestoneBonusElemPct: 0,
    runestoneSplash35Burn: false,
    runestoneChillOnHit: false,
    runestoneArcChainShock: false,
    runestonePoisonWeakenPct: 0,
    runestoneHallowedUndeadPct: 0,
    runestoneHallowedCritStrip: false,
    runestoneDetonateDotPct: 0,
    runestoneSiphonMpPerHit: 0,
    runestoneEchoAttackChance: 0,
    runestoneRetaliateMeleePct: 0,
    runestoneRetaliateBatteredGuard: false,
    runestoneBatteredPowerPct: 0,
    runestoneSanctifiedHealPct: 0,
    runestoneAdaptiveMaxPct: 0,
    postBattleHealPct: 0,
  };
}

/** Populate Runestone combat affixes onto modifiers & combat passives. */
export function applyRunestoneCombatEffects(
  stones: Array<RunestoneItem | null | undefined>,
  mods: HeroDisciplineModifiers,
  passives: HeroCombatPassives
): void {
  for (const st of stones) {
    if (!st) continue;
    const text = `${st.name} ${st.affix}`.toLowerCase();
    const tier = st.tier || "Lesser";

    // Weapon Prefixes
    if (text.includes("blazing") || text.includes("bonus fire damage")) {
      passives.runestoneBonusElemType = "Fire";
      passives.runestoneBonusElemPct = Math.max(
        passives.runestoneBonusElemPct,
        pullRunestoneValue(st.affix, tier, PCT_RANGE_RE, 12, 25)
      );
      passives.runestoneSplash35Burn = true;
    }
    if (text.includes("glacial") || text.includes("bonus frost damage")) {
      passives.runestoneBonusElemType = passives.runestoneBonusElemType ?? "Frost";
      passives.runestoneBonusElemPct = Math.max(
        passives.runestoneBonusElemPct,
        pullRunestoneValue(st.affix, tier, PCT_RANGE_RE, 12, 25)
      );
      passives.runestoneChillOnHit = true;
    }
    if (text.includes("arcing") || text.includes("bonus lightning damage")) {
      passives.runestoneBonusElemType = passives.runestoneBonusElemType ?? "Lightning";
      passives.runestoneBonusElemPct = Math.max(
        passives.runestoneBonusElemPct,
        pullRunestoneValue(st.affix, tier, PCT_RANGE_RE, 12, 25)
      );
      passives.runestoneArcChainShock = true;
    }
    if (text.includes("venomous") || text.includes("bonus poison damage")) {
      passives.runestoneBonusElemType = passives.runestoneBonusElemType ?? "Poison";
      passives.runestoneBonusElemPct = Math.max(
        passives.runestoneBonusElemPct,
        pullRunestoneValue(st.affix, tier, PCT_RANGE_RE, 12, 25)
      );
      passives.runestonePoisonWeakenPct = Math.max(
        passives.runestonePoisonWeakenPct,
        pullRunestoneValue(st.affix, tier, /poisoned\s+foes\s+deal\s+(\d+)%(?:\s*(?:[–-]|to)\s*(\d+)%)?/i, 10, 18)
      );
    }
    if (text.includes("hallowed") || text.includes("bonus radiant damage")) {
      passives.runestoneHallowedUndeadPct += pullRunestoneValue(st.affix, tier, PCT_RANGE_RE, 15, 32);
      passives.runestoneHallowedCritStrip = true;
    }
    if (text.includes("detonating") || text.includes("detonates")) {
      passives.runestoneDetonateDotPct += pullRunestoneValue(st.affix, tier, PCT_RANGE_RE, 25, 50);
    }
    if (text.includes("vampiric") || (text.includes("heal the user") && text.includes("damage dealt"))) {
      mods.lifestealPct += pullRunestoneValue(st.affix, tier, PCT_RANGE_RE, 8, 18);
    }
    if (text.includes("siphoning") || text.includes("mp per hit")) {
      passives.runestoneSiphonMpPerHit += pullRunestoneValue(st.affix, tier, MP_RANGE_RE, 2, 7);
    }
    if (text.includes("crushing") && text.includes("guard")) {
      passives.extraGuardChip += 1;
      passives.critiqueExposeDef = true;
    }
    if (text.includes("rending") && text.includes("bleed")) {
      passives.critInflictsBleedTurns = Math.max(passives.critInflictsBleedTurns, 3);
      mods.ailmentPowerPct += pullRunestoneValue(st.affix, tier, PCT_RANGE_RE, 15, 32);
    }
    if (text.includes("executioner")) {
      passives.vsLowHp40ExecPct += pullRunestoneValue(st.affix, tier, PCT_RANGE_RE, 20, 42);
    }
    if (text.includes("echoing") || text.includes("strike a second time")) {
      passives.runestoneEchoAttackChance = Math.min(
        0.5,
        passives.runestoneEchoAttackChance + pullRunestoneValue(st.affix, tier, PCT_RANGE_RE, 15, 32) / 100
      );
    }

    // Armor Prefixes
    if (text.includes("bastion")) {
      passives.startWardShieldPct += pullRunestoneValue(st.affix, tier, PCT_RANGE_RE, 12, 30);
    }
    if (text.includes("retaliating") || text.includes("reflect")) {
      passives.runestoneRetaliateMeleePct += pullRunestoneValue(st.affix, tier, PCT_RANGE_RE, 18, 38);
      if (text.includes("battered")) passives.runestoneRetaliateBatteredGuard = true;
    }
    if (text.includes("resolve-heart") || (text.includes("below 50%") && text.includes("potency"))) {
      passives.runestoneBatteredPowerPct += pullRunestoneValue(st.affix, tier, PCT_RANGE_RE, 18, 38);
    }
    if (text.includes("sanctified")) {
      mods.statusResistPct += pullRunestoneValue(st.affix, tier, PCT_RANGE_RE, 25, 60);
      passives.runestoneSanctifiedHealPct += pullRunestoneValue(
        st.affix,
        tier,
        /heal\s+(\d+)%(?:\s*(?:[–-]|to)\s*(\d+)%)?/i,
        3,
        6
      );
    }
    if (text.includes("vanguard") && text.includes("guard action")) {
      passives.guardHealPct += pullRunestoneValue(st.affix, tier, PCT_RANGE_RE, 6, 15);
      passives.guardMpGain += pullRunestoneValue(st.affix, tier, MP_RANGE_RE, 4, 10);
      passives.guardDefTurn = true;
    }
    if (text.includes("unbreakable") && text.includes("fatal")) {
      passives.unbreakableWardPct = Math.max(passives.unbreakableWardPct, pullRunestoneValue(st.affix, tier, PCT_RANGE_RE, 10, 25));
    }
    if (text.includes("overflowing")) {
      passives.overflowShieldMaxPct = Math.max(passives.overflowShieldMaxPct, pullRunestoneValue(st.affix, tier, PCT_RANGE_RE, 15, 30));
    }
    if (text.includes("phantom") && text.includes("dodge")) {
      passives.dodgeGrantsMomentum = true;
    }
    if (text.includes("adaptive") && text.includes("elemental")) {
      passives.runestoneAdaptiveMaxPct = Math.max(passives.runestoneAdaptiveMaxPct, pullRunestoneValue(st.affix, tier, PCT_RANGE_RE, 25, 55));
    }
    if (text.includes("martyr")) {
      passives.martyrInterceptPct = Math.max(passives.martyrInterceptPct, pullRunestoneValue(st.affix, tier, PCT_RANGE_RE, 25, 40));
    }

    // Universal Suffixes
    if (text.includes("alacrity")) {
      passives.accuracyBonusPct += pullRunestoneValue(
        st.affix,
        tier,
        /(\d+)%(?:\s*(?:[–-]|to)\s*\+?(\d+)%)?\s*accuracy/i,
        3,
        12
      );
    }
    if (text.includes("of precision")) {
      passives.accuracyBonusPct += pullRunestoneValue(
        st.affix,
        tier,
        /(\d+)%(?:\s*(?:[–-]|to)\s*\+?(\d+)%)?\s*accuracy/i,
        5,
        18
      );
    }
    if (text.includes("brutality")) {
      passives.critDamagePct += pullRunestoneValue(st.affix, tier, PCT_RANGE_RE, 12, 45);
    }
    if (text.includes("of piercing") || (text.includes("ignore") && text.includes("defense"))) {
      const val = pullRunestoneValue(st.affix, tier, PCT_RANGE_RE, 10, 30);
      mods.armorPiercePct += val;
      passives.magicPiercePct += val;
    }
    if (text.includes("vitality") || text.includes("after battle")) {
      passives.postBattleHealPct += pullRunestoneValue(
        st.affix,
        tier,
        /(\d+)%(?:\s*(?:[–-]|to)\s*\+?(\d+)%)?\s*hp\s*after/i,
        3,
        8
      );
    }
    if (text.includes("of the magus")) {
      mods.mpCostReductionPct += pullRunestoneValue(
        st.affix,
        tier,
        /-(\d+)%(?:\s*(?:[–-]|to)\s*-(\d+)%)?/i,
        5,
        15
      );
    }
    if (text.includes("of momentum")) {
      passives.critGainMomentum = true;
    }
    if (text.includes("of mending")) {
      mods.healPct += pullRunestoneValue(st.affix, tier, PCT_RANGE_RE, 8, 28);
    }
    if (text.includes("guard-break power")) {
      passives.extraGuardPct += pullRunestoneValue(
        st.affix,
        tier,
        /(\d+)%(?:\s*(?:[–-]|to)\s*\+?(\d+)%)?\s*guard[- ]break/i,
        3,
        12
      );
    }
  }
}

/** Populate exact Discipline perks and baseline pillar modifiers across all 120 choices. */
export function buildFullDisciplineProfile(
  heroEntry: HeroDisciplinesEntry | undefined,
  chosenByTier: Record<string, string> | undefined,
  stones: Array<RunestoneItem | null | undefined> = []
): {
  badges: Array<{ tier: number; id: string; name: string; pillar: "body" | "mind" | "spirit"; tag: string; effect: string; iconPath: string }>;
  mods: HeroDisciplineModifiers;
  passives: HeroCombatPassives;
} {
  const mods = createEmptyModifiers();
  const passives = createEmptyPassives();
  const badges: Array<{ tier: number; id: string; name: string; pillar: "body" | "mind" | "spirit"; tag: string; effect: string; iconPath: string }> = [];

  if (heroEntry && chosenByTier) {
    for (const tier of heroEntry.tiers) {
      const pickedId = chosenByTier[String(tier.level)];
      if (!pickedId) continue;
      const opt = [tier.optionA, tier.optionB].find((o) => o.id === pickedId);
      if (!opt) continue;
      badges.push({
        tier: tier.level,
        id: opt.id,
        name: opt.name,
        pillar: opt.pillar,
        tag: opt.tag,
        effect: opt.effect,
        iconPath: opt.iconPath,
      });

      // Exact per-ID passive & trigger assignments across all 120 options
      switch (opt.id) {
        // VALEN
        case "disc_valen_01_a": mods.critPct += 8; break;
        case "disc_valen_01_b": mods.pDefPct += 12; passives.meleeDamageTakenReductionPct += 10; break;
        case "disc_valen_10_a": passives.riposteEachRound = true; break;
        case "disc_valen_10_b": passives.extraGuardVsGuarded += 1; break;
        case "disc_valen_20_a": passives.shieldAccuracyPct += 12; passives.shieldCritDamagePct += 15; break;
        case "disc_valen_20_b": passives.greatswordStaggeredBonusPct += 16; break;
        case "disc_valen_30_a": passives.critInflictsBleedTurns = Math.max(passives.critInflictsBleedTurns, 2); break;
        case "disc_valen_30_b": passives.lightModeBlinds = true; break;
        case "disc_valen_40_a": passives.soloEnemyBonusPct += 14; break;
        case "disc_valen_40_b": passives.cleaveSecondEnemyPct += 25; break;
        case "disc_valen_50_a": passives.guardHealPct += 10; passives.guardClearsBurnOrBleed = true; break;
        case "disc_valen_50_b": passives.seizeOpeningOnce = true; break;
        case "disc_valen_60_a": passives.rangedDodgePct += 15; break;
        case "disc_valen_60_b": passives.antiBossArmorPct += 15; break;
        case "disc_valen_70_a": passives.interceptLowestAllyPct = 25; break;
        case "disc_valen_70_b": mods.armorPiercePct += 15; break;
        case "disc_valen_80_a": passives.cadenceAtkPerRoundPct += 3; break;
        case "disc_valen_80_b": mods.statusResistPct += 25; passives.stunCurseResistPct += 45; break;
        case "disc_valen_90_a": passives.royalChallengeR1 = true; break;
        case "disc_valen_90_b": passives.counterDamageHalvePct = 50; passives.firstHitBonusPct += 20; break;

        // ELLOWYN
        case "disc_ellowyn_01_a": mods.mpCostReductionPct += 15; break;
        case "disc_ellowyn_01_b": mods.pDefPct += 12; mods.maxHpPct += 8; break;
        case "disc_ellowyn_10_a": passives.accuracyBonusPct += 15; passives.stunCurseResistPct += 40; break;
        case "disc_ellowyn_10_b": passives.magicPiercePct += 18; passives.frostStunOrWeaken = true; break;
        case "disc_ellowyn_20_a": passives.wardExtraTurn += 1; break;
        case "disc_ellowyn_20_b": passives.regalCommandMark = true; break;
        case "disc_ellowyn_30_a": passives.crossbowBonusPct += 22; passives.crossbowBlinds = true; break;
        case "disc_ellowyn_30_b": passives.shieldPDefPct += 15; passives.shieldDodgePct += 10; break;
        case "disc_ellowyn_40_a": mods.magPct += 14; passives.extraSpellMpCost += 2; break;
        case "disc_ellowyn_40_b": passives.critiqueExposeDef = true; break;
        case "disc_ellowyn_50_a": passives.startWardShieldPct += 12; break;
        case "disc_ellowyn_50_b": mods.dodgePct += 10; passives.dotResistPct += 30; break;
        case "disc_ellowyn_60_a": passives.wardOrGuardMpPct += 10; break;
        case "disc_ellowyn_60_b": passives.extraGuardOnWeakness += 1; break;
        case "disc_ellowyn_70_a": passives.radiantStripBuffChance = 0.65; break;
        case "disc_ellowyn_70_b": mods.guardMitigationPct += 15; passives.guardHealPct += 8; break;
        case "disc_ellowyn_80_a": passives.partyMDefAuraPct += 10; break;
        case "disc_ellowyn_80_b": mods.dodgePct += 8; passives.stunCurseResistPct += 45; break;
        case "disc_ellowyn_90_a": passives.multiSpellMpRefundPct += 20; passives.singleSpellEchoRadiantPct += 20; break;
        case "disc_ellowyn_90_b": mods.pDefPct += 15; passives.aboveHalfHpMitigationPct += 15; break;

        // ORIN
        case "disc_orin_01_a": passives.guardShieldWallLowestPct = 25; break;
        case "disc_orin_01_b": passives.vsGuardedBonusPct += 15; break;
        case "disc_orin_10_a": passives.partyStartEmpowerTurns = Math.max(passives.partyStartEmpowerTurns, 2); break;
        case "disc_orin_10_b": passives.critTakenReductionPct += 20; passives.stunCurseResistPct += 50; break;
        case "disc_orin_20_a": passives.guardTauntBarricade = true; break;
        case "disc_orin_20_b": passives.bluntingEnemyAtkDown = true; break;
        case "disc_orin_30_a": passives.spearCritPct += 12; passives.counterDamageHalvePct = 50; break;
        case "disc_orin_30_b": passives.guardSlamEnemy = true; break;
        case "disc_orin_40_a": passives.dotResistPct += 40; break;
        case "disc_orin_40_b": passives.vsLowHp35BonusPct += 18; passives.accuracyBonusPct += 10; break;
        case "disc_orin_50_a": passives.sacredResilience = true; break;
        case "disc_orin_50_b": mods.armorPiercePct += 18; passives.extraGuardChip += 1; break;
        case "disc_orin_60_a": passives.vowInterceptAbove25Pct = true; break;
        case "disc_orin_60_b": passives.battleWrathPerHitPct += 4; break;
        case "disc_orin_70_a": mods.pDefPct += 12; mods.mDefPct += 12; break;
        case "disc_orin_70_b": passives.crushingFollowThroughPct += 8; break;
        case "disc_orin_80_a": passives.partyAoeDamageReductionPct += 12; break;
        case "disc_orin_80_b": passives.modeBStunChance = Math.max(passives.modeBStunChance, 0.2); break;
        case "disc_orin_90_a": passives.unbreakableWardPct = Math.max(passives.unbreakableWardPct, 15); break;
        case "disc_orin_90_b": passives.commandingBreachPct += 15; break;

        // ROWAN
        case "disc_rowan_01_a": passives.firstShotCritPct += 20; passives.accuracyBonusPct += 10; break;
        case "disc_rowan_01_b": passives.lightModeBlinds = true; break;
        case "disc_rowan_10_a": passives.vsCasterRangedBonusPct += 15; break;
        case "disc_rowan_10_b": passives.shieldDodgePct += 8; passives.lightModeBleed = true; break;
        case "disc_rowan_20_a": passives.modeBBlindsAndStrips = true; break;
        case "disc_rowan_20_b": mods.armorPiercePct += 15; break;
        case "disc_rowan_30_a": passives.guardDodgePct += 18; break;
        case "disc_rowan_30_b": passives.coveringVolleyOnceRound = true; break;
        case "disc_rowan_40_a": passives.spotterExposeDef = true; break;
        case "disc_rowan_40_b": passives.critBouncePct += 25; break;
        case "disc_rowan_50_a": passives.critDamagePct += 20; break;
        case "disc_rowan_50_b": passives.dodgeHealsPct += 8; break;
        case "disc_rowan_60_a": passives.bowSeverBuffChance = Math.max(passives.bowSeverBuffChance, 0.6); break;
        case "disc_rowan_60_b": passives.vsBeastMonsterBonusPct += 15; break;
        case "disc_rowan_70_a": passives.lightModeCritPct += 12; passives.lightModeBleed = true; break;
        case "disc_rowan_70_b": passives.extraGuardModeB += 1; break;
        case "disc_rowan_80_a": passives.bowTwinShotChance = Math.max(passives.bowTwinShotChance, 0.22); break;
        case "disc_rowan_80_b": passives.accuracyBonusPct += 12; passives.stunCurseResistPct += 40; break;
        case "disc_rowan_90_a": passives.vsLowHp35CritPct += 25; passives.vsLowHp35PenPct += 18; break;
        case "disc_rowan_90_b": passives.bowArrowStormR3 = true; break;

        // MERA
        case "disc_mera_01_a": mods.pDefPct += 12; break;
        case "disc_mera_01_b": passives.firstSpellHalfMpPct += 15; break;
        case "disc_mera_10_a": passives.runestoneRetaliateMeleePct += 15; break;
        case "disc_mera_10_b": passives.regenExtraTurn += 1; break;
        case "disc_mera_20_a": passives.scimitarSicklePct += 14; passives.lightModeBleed = true; break;
        case "disc_mera_20_b": passives.staffSpellPct += 12; break;
        case "disc_mera_30_a": passives.corrosiveThornsDefDown = true; break;
        case "disc_mera_30_b": passives.galeWindPartyDodgePct += 6; break;
        case "disc_mera_40_a": passives.extraGuardModeB += 1; break;
        case "disc_mera_40_b": passives.purifyingDewCleanses = true; break;
        case "disc_mera_50_a": passives.highlandHp75CritPct += 12; break;
        case "disc_mera_50_b": passives.emergencyHealHalfMp30Pct += 20; break;
        case "disc_mera_60_a": passives.creepingBriarsSpreadChance = 0.4; break;
        case "disc_mera_60_b": mods.statusResistPct += 25; passives.stunCurseResistPct += 45; break;
        case "disc_mera_70_a": passives.partyShockBonusPct += 12; break;
        case "disc_mera_70_b": passives.mossWardTurns = Math.max(passives.mossWardTurns, 2); break;
        case "disc_mera_80_a": passives.guardNatureSpellPct += 18; break;
        case "disc_mera_80_b": passives.partyPackAccPct += 10; passives.partyPackCritPct += 8; break;
        case "disc_mera_90_a": passives.partyBleedShockCritPct += 12; passives.partyBleedShockPenPct += 15; break;
        case "disc_mera_90_b": passives.lifebloomSurgeOnce = true; break;

        // HARLAN
        case "disc_harlan_01_a": passives.triageHalfHpHealPct += 18; break;
        case "disc_harlan_01_b": passives.spotterExposeDef = true; break;
        case "disc_harlan_10_a": passives.shieldPDefPct += 12; passives.shieldStunResistPct += 35; break;
        case "disc_harlan_10_b": passives.coatedEdgePoisonChance = Math.max(passives.coatedEdgePoisonChance, 0.3); break;
        case "disc_harlan_20_a": passives.potionBonusPct += 30; break;
        case "disc_harlan_20_b": passives.poisonDotBonusPct += 25; break;
        case "disc_harlan_30_a": passives.protectiveSalveWardPct += 10; break;
        case "disc_harlan_30_b": passives.runestonePoisonWeakenPct += 10; break;
        case "disc_harlan_40_a": passives.smellingSaltCleanseBuff = true; break;
        case "disc_harlan_40_b": passives.extraGuardAcidPoison += 1; break;
        case "disc_harlan_50_a": passives.plagueShadowResistPct += 25; passives.dotResistPct += 25; break;
        case "disc_harlan_50_b": passives.toxicRuptureOnPoisoned = true; break;
        case "disc_harlan_60_a": passives.quickeningBalmBonusPct += 20; passives.quickeningBalmWardPct += 12; break;
        case "disc_harlan_60_b": passives.nerveLockStumbleChance = Math.max(passives.nerveLockStumbleChance, 0.18); break;
        case "disc_harlan_70_a": mods.mpCostReductionPct += 15; break;
        case "disc_harlan_70_b": passives.vaporShatterPoisonSplashPct += 35; break;
        case "disc_harlan_80_a": passives.partyWardRootResistPct += 18; break;
        case "disc_harlan_80_b": passives.blightSiphonMpPerPoison += 4; break;
        case "disc_harlan_90_a": passives.masterPanaceaResistBuff = true; break;
        case "disc_harlan_90_b": passives.universalPoisonPenPct += 50; break;
      }

      // Consistent baseline pillar bonus
      if (opt.pillar === "body") {
        mods.maxHpPct += 3;
        mods.pDefPct += 3;
      } else if (opt.pillar === "mind") {
        mods.atkPct += 3;
        mods.critPct += 2;
      } else {
        mods.magPct += 3;
        mods.mDefPct += 3;
      }
    }
  }

  applyRunestoneCombatEffects(stones, mods, passives);
  return { badges, mods, passives };
}

/** Aggregate party-wide living hero auras for combat calculations. */
export function getPartyCombatAuras(heroes: BattleHeroUnit[], stateGaleDodgeBonusPct = 0): {
  mDefAuraPct: number;
  aoeDamageReductionPct: number;
  packCritPct: number;
  packAccPct: number;
  shockBonusPct: number;
  bleedShockCritPct: number;
  bleedShockPenPct: number;
  wardRootResistPct: number;
  livingBarricadeDodgePct: number;
  galeDodgePct: number;
  poisonDotBonusPct: number;
  universalPoisonPenPct: number;
  poisonWeakenPct: number;
} {
  const out = {
    mDefAuraPct: 0,
    aoeDamageReductionPct: 0,
    packCritPct: 0,
    packAccPct: 0,
    shockBonusPct: 0,
    bleedShockCritPct: 0,
    bleedShockPenPct: 0,
    wardRootResistPct: 0,
    livingBarricadeDodgePct: 0,
    galeDodgePct: stateGaleDodgeBonusPct,
    poisonDotBonusPct: 0,
    universalPoisonPenPct: 0,
    poisonWeakenPct: 0,
  };
  for (const h of heroes) {
    if (h.curHp <= 0) continue;
    const p = h.passives;
    out.mDefAuraPct += p.partyMDefAuraPct;
    out.aoeDamageReductionPct += p.partyAoeDamageReductionPct;
    out.packCritPct += p.partyPackCritPct;
    out.packAccPct += p.partyPackAccPct;
    out.shockBonusPct += p.partyShockBonusPct;
    out.bleedShockCritPct += p.partyBleedShockCritPct;
    out.bleedShockPenPct += p.partyBleedShockPenPct;
    out.wardRootResistPct += p.partyWardRootResistPct;
    if (h.guarding && p.guardTauntBarricade) out.livingBarricadeDodgePct += 8;
    out.poisonDotBonusPct = Math.max(out.poisonDotBonusPct, p.poisonDotBonusPct);
    out.universalPoisonPenPct = Math.max(out.universalPoisonPenPct, p.universalPoisonPenPct);
    out.poisonWeakenPct = Math.max(out.poisonWeakenPct, p.runestonePoisonWeakenPct);
  }
  return out;
}

/** Pick secondary living ally when an action affects "2 Allies". */
export function pickSecondAllyForDualTarget(heroes: BattleHeroUnit[], primaryAllyId: HeroId): BattleHeroUnit | null {
  const others = heroes.filter((h) => h.curHp > 0 && h.heroId !== primaryAllyId);
  if (others.length === 0) return null;
  const idx = heroes.findIndex((h) => h.heroId === primaryAllyId);
  const adjacent = others
    .map((h) => ({ h, dist: Math.abs(heroes.findIndex((x) => x.heroId === h.heroId) - idx) }))
    .sort((a, b) => a.dist - b.dist || a.h.curHp / a.h.maxHp - b.h.curHp / b.h.maxHp);
  return adjacent[0]?.h ?? null;
}

/** Apply shield absorption before HP loss; returns remaining damage that penetrates to HP. */
export function absorbWithWardShield(hero: BattleHeroUnit, incomingDmg: number): { absorbed: number; hpDmg: number } {
  if (hero.shieldHp <= 0 || incomingDmg <= 0) return { absorbed: 0, hpDmg: incomingDmg };
  const absorbed = Math.min(hero.shieldHp, incomingDmg);
  hero.shieldHp = Math.max(0, hero.shieldHp - absorbed);
  return { absorbed, hpDmg: incomingDmg - absorbed };
}

/** Grant Ward Shield HP capped cleanly at reasonable battle limit. */
export function grantWardShield(hero: BattleHeroUnit, pctOfMaxHp: number): number {
  const gain = Math.max(1, Math.round((hero.maxHp * pctOfMaxHp) / 100));
  const cap = Math.round(hero.maxHp * 0.65);
  const prev = hero.shieldHp;
  hero.shieldHp = Math.min(cap, hero.shieldHp + gain);
  return hero.shieldHp - prev;
}

/** Pick effective enemy strike target honoring Guarding taunts, Round-1 Royal Challenge, or Valen/Orin Intercepts. */
export function resolveEnemyTargetAndIntercept(
  livingHeroes: BattleHeroUnit[],
  enemyIsStrongest: boolean,
  turnCounter: number,
  isAoe: boolean
): {
  primary: BattleHeroUnit;
  interceptor: BattleHeroUnit | null;
  interceptKeepRatio: number;
} {
  if (isAoe || livingHeroes.length === 0) {
    return { primary: livingHeroes[0], interceptor: null, interceptKeepRatio: 1.0 };
  }

  // Round-1 Royal Challenge draw or Living Barricade weighted draw
  let primary: BattleHeroUnit;
  const r1Taunter = turnCounter === 1 && enemyIsStrongest
    ? livingHeroes.find((h) => h.passives.royalChallengeR1)
    : undefined;

  if (r1Taunter) {
    primary = r1Taunter;
  } else {
    const weights = livingHeroes.map((h) => (h.guarding && h.passives.guardTauntBarricade ? 3.0 : h.guarding ? 1.35 : 1.0));
    const totalW = weights.reduce((s, w) => s + w, 0);
    let roll = Math.random() * totalW;
    primary = livingHeroes[livingHeroes.length - 1];
    for (let i = 0; i < livingHeroes.length; i++) {
      roll -= weights[i];
      if (roll <= 0) {
        primary = livingHeroes[i];
        break;
      }
    }
  }

  // Check Intercept passives if an ally other than the protector was targeted
  const candidates = livingHeroes.filter((h) => h.heroId !== primary.heroId && !h.statuses.some((s) => s.kind === "stun"));
  const lowestPct = Math.min(...livingHeroes.map((h) => h.curHp / Math.max(1, h.maxHp)));
  const primaryIsLowest = primary.curHp / Math.max(1, primary.maxHp) <= lowestPct + 0.02;

  // Orin <25% HP Unbroken Wall (50% intercept once/turn), Orin Lv60 Vow (>25% HP weakest ally), Valen Lv70 Royal Intercept (25%), Martyr's Runestone (<40% HP adjacent ally)
  for (const protector of candidates) {
    if (protector.interceptUsedThisRound) continue;
    const isOrinCrit = protector.heroId === "orin" && protector.curHp / Math.max(1, protector.maxHp) <= 0.25;
    if (isOrinCrit) {
      protector.interceptUsedThisRound = true;
      return { primary, interceptor: protector, interceptKeepRatio: 0.5 };
    }
    if (protector.passives.vowInterceptAbove25Pct && primaryIsLowest && protector.curHp / Math.max(1, protector.maxHp) > 0.25) {
      protector.interceptUsedThisRound = true;
      return { primary, interceptor: protector, interceptKeepRatio: 0.2 };
    }
    if (protector.passives.martyrInterceptPct > 0 && primary.curHp / Math.max(1, primary.maxHp) < 0.4) {
      protector.interceptUsedThisRound = true;
      return { primary, interceptor: protector, interceptKeepRatio: 1 - protector.passives.martyrInterceptPct / 100 };
    }
    if (protector.passives.interceptLowestAllyPct > 0 && primaryIsLowest) {
      protector.interceptUsedThisRound = true;
      return { primary, interceptor: protector, interceptKeepRatio: 1 - protector.passives.interceptLowestAllyPct / 100 };
    }
  }

  return { primary, interceptor: null, interceptKeepRatio: 1.0 };
}
