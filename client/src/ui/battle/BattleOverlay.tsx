import React, { useEffect, useMemo, useRef, useState } from "react";
import { assetUrl } from "../api";
import { audioEngine } from "../audio";
import { applyHeroXpGain, getHeroLevel, getHeroXp } from "../party/partyLogic";
import type { HeroId, ItemEntry, SpellEntry } from "../types";
import {
  advanceToNextTurnInRound,
  applyLootAndDropsForDefeatedEnemy,
  applyTurnStartAilments,
  buildCombatPotionActions,
  buildDualWieldFollowupAction,
  buildHeroSpellTierBuckets,
  buildHeroWeaponActions,
  computeDamageOnEnemy,
  computeEnemyStrikeDamage,
  finishHeroTurnCooldowns,
  getAdjacentEnemies,
  getHeroResolveState,
  HERO_MAGIC_THEMES,
  packEncounterIntoGrid,
  pickEnemyCombatMove,
  pickVfxKey,
  previewRoundOrder,
  STATUS_UI_META,
  upsertStatusEffect,
  VFX_MAP,
} from "./battleLogic";
import {
  absorbWithWardShield,
  getPartyCombatAuras,
  grantWardShield,
  pickSecondAllyForDualTarget,
  resolveEnemyTargetAndIntercept,
} from "./combatEffects";
import type {
  BattleActionSpec,
  BattleEnemyUnit,
  BattleHeroDisciplineBadge,
  BattleHeroUnit,
  BattleState,
} from "./battleTypes";

export interface BattleOutcomeResult {
  result: "victory" | "defeat" | "fled";
  heroHpPct: Partial<Record<HeroId, number>>;
  heroMpPct: Partial<Record<HeroId, number>>;
  consumedPotions: Record<string, number>;
  xpEarned: number;
  heroXpEarned: Partial<Record<HeroId, number>>;
  silverEarned: number;
  droppedTradeGoods: Record<string, number>;
  sealedPortalId: string | null;
}

interface BattleOverlayProps {
  open: boolean;
  initialBattle: BattleState | null;
  partyLevel: number;
  partyXp: number;
  heroLevels?: Partial<Record<HeroId, number>>;
  heroXp?: Partial<Record<HeroId, number>>;
  spells: SpellEntry[];
  learnedSpellIds: string[];
  bagCounts: Record<string, number>;
  itemsById: Record<string, ItemEntry>;
  itemsCatalog: ItemEntry[];
  onBattleSnapshot?: (snapshot: BattleState) => void;
  onComplete: (outcome: BattleOutcomeResult) => void;
}

function cloneBattleSnapshot(state: BattleState): BattleState {
  return JSON.parse(JSON.stringify(state)) as BattleState;
}

function normalizeRestoredBattle(raw: BattleState): BattleState {
  const b = cloneBattleSnapshot(raw);
  for (const h of b.heroes) {
    h.actedThisRound ??= false;
    h.bonusTurnUsedThisRound ??= false;
    h.bonusTurnUsedThisBattle ??= false;
    h.skillCooldowns ??= {};
  }
  for (const e of b.enemies) {
    e.actedThisRound ??= false;
  }
  if (b.phase === "victory" || b.phase === "defeat" || b.phase === "fled") return b;

  const liveHeroes = b.heroes.filter((h) => h.curHp > 0);
  const liveEnemies = b.enemies.filter((e) => e.curHp > 0);
  if (liveHeroes.length === 0) {
    b.phase = "defeat";
    b.bannerText = "All companions have fallen...";
    return b;
  }
  if (liveEnemies.length === 0) {
    b.phase = "victory";
    b.bannerText = "Victory! All enemies defeated.";
    return b;
  }

  const actorAlive =
    b.activeActor.kind === "hero"
      ? liveHeroes.some((h) => h.heroId === (b.activeActor as { heroId: HeroId }).heroId)
      : liveEnemies.some((e) => e.instanceId === (b.activeActor as { instanceId: string }).instanceId);
  if (!actorAlive) {
    advanceToNextTurnInRound(b);
  }
  if (b.activeActor.kind === "hero") {
    const activeHero = liveHeroes.find((h) => h.heroId === (b.activeActor as { heroId: HeroId }).heroId);
    b.phase = "player_turn";
    if (activeHero) {
      b.bannerText = `${activeHero.name}'s turn — choose an action`;
    }
  } else {
    b.phase = "animating";
  }
  return b;
}

interface FloatingTextItem {
  id: number;
  xPct: number;
  yPct: number;
  text: string;
  colorClass: string;
}

interface ActiveBurstItem {
  id: number;
  xPct: number;
  yPct: number;
  sizePx: number;
  src: string;
}

function waitMs(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

function hpTierForHero(hero: BattleHeroUnit): 1 | 2 | 3 | 4 {
  const pct = (hero.curHp / Math.max(1, hero.maxHp)) * 100;
  if (pct > 75) return 1;
  if (pct > 50) return 2;
  if (pct > 25) return 3;
  return 4;
}

export const BattleOverlay: React.FC<BattleOverlayProps> = ({
  open,
  initialBattle,
  partyLevel,
  partyXp,
  heroLevels,
  heroXp,
  spells,
  learnedSpellIds,
  bagCounts,
  itemsById,
  itemsCatalog,
  onBattleSnapshot,
  onComplete,
}) => {
  const onBattleSnapshotRef = useRef(onBattleSnapshot);
  onBattleSnapshotRef.current = onBattleSnapshot;
  const stageRef = useRef<HTMLDivElement | null>(null);
  const vfxLayerRef = useRef<HTMLDivElement | null>(null);
  const hotbarRef = useRef<HTMLDivElement | null>(null);
  const enemyElRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const heroElRefs = useRef<Map<HeroId, HTMLDivElement>>(new Map());
  const tierBtnRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const vfxCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  const battleRef = useRef<BattleState | null>(null);
  const busyRef = useRef(false);
  const enemyTurnLockRef = useRef(false);
  const mountedRef = useRef(true);
  const nextFxSeqRef = useRef(1);

  const [, setRenderTick] = useState(0);
  const [armedAction, setArmedAction] = useState<BattleActionSpec | null>(null);
  const [openTierPopup, setOpenTierPopup] = useState<number | null>(null);
  const [popupAnchorLeft, setPopupAnchorLeft] = useState<number>(0);
  const [hoverTip, setHoverTip] = useState<{
    title: string;
    subtitle: string;
    icon: string;
    pills: Array<{ label: string; tone?: "mp" | "qty" | "warn" }>;
    effect: string;
    hint?: string;
    leftPx: number;
    bottomPx: number;
    widthPx: number;
  } | null>(null);
  const [perkTip, setPerkTip] = useState<{
    badge: BattleHeroDisciplineBadge;
    xPct: number;
    yPct: number;
  } | null>(null);
  const [floatingTexts, setFloatingTexts] = useState<FloatingTextItem[]>([]);
  const [activeBursts, setActiveBursts] = useState<ActiveBurstItem[]>([]);
  const [stageShaking, setStageShaking] = useState(false);
  const [lungingEnemyId, setLungingEnemyId] = useState<string | null>(null);
  const [lungingHeroId, setLungingHeroId] = useState<HeroId | null>(null);
  const [hoveredEnemyId, setHoveredEnemyId] = useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!open || !initialBattle) {
      battleRef.current = null;
      return;
    }
    const restored = normalizeRestoredBattle(initialBattle);
    battleRef.current = restored;
    busyRef.current = false;
    enemyTurnLockRef.current = false;
    setOpenTierPopup(null);
    setHoverTip(null);
    setPerkTip(null);
    setFloatingTexts([]);
    setActiveBursts([]);

    // Pre-arm Hero's default Weapon Attack 1 if Hero starts immediately
    if (restored.phase === "player_turn" && restored.activeActor.kind === "hero") {
      const actorId = restored.activeActor.heroId;
      const hero = restored.heroes.find((h) => h.heroId === actorId);
      const acts = hero ? buildHeroWeaponActions(hero) : [];
      setArmedAction(acts.find((a) => !a.disabledReason) ?? acts[0] ?? null);
    } else {
      setArmedAction(null);
    }
    setRenderTick((t) => t + 1);
  }, [open, initialBattle]);

  const forceRefresh = () => {
    if (mountedRef.current) setRenderTick((t) => t + 1);
  };

  const showActionTip = (
    anchorEl: HTMLElement,
    tip: {
      title: string;
      subtitle: string;
      icon: string;
      pills: Array<{ label: string; tone?: "mp" | "qty" | "warn" }>;
      effect: string;
      hint?: string;
    },
    besidePopup = false
  ) => {
    const stRect = stageRef.current?.getBoundingClientRect();
    const btnRect = anchorEl.getBoundingClientRect();
    if (!stRect) return;

    const tipW = Math.min(290, Math.max(210, stRect.width - 24));
    const popupW = btnRect.width + 14;
    const pLeft = popupAnchorLeft;
    const pRight = pLeft + popupW;
    const btnCenter = btnRect.left - stRect.left + btnRect.width / 2;

    let leftPx: number;
    let bottomPx: number;

    if (besidePopup && openTierPopup !== null) {
      const rightCandidate = pRight + 10;
      const leftCandidate = pLeft - tipW - 10;
      // Prefer opening right of the vertical spell stack without crowding the right-hand hero cards
      if (rightCandidate + tipW <= stRect.width * 0.77) {
        leftPx = rightCandidate;
      } else if (leftCandidate >= 12) {
        leftPx = leftCandidate;
      } else {
        leftPx = Math.max(12, Math.min(stRect.width - tipW - 12, rightCandidate));
      }
      bottomPx = Math.max(24, Math.min(stRect.height - 170, stRect.bottom - btnRect.bottom));
    } else {
      leftPx = Math.max(12, Math.min(stRect.width - tipW - 12, btnCenter - tipW / 2));
      bottomPx = Math.max(78, stRect.bottom - btnRect.top + 10);

      // Keep bar tooltips clear of an open vertical Tier spell popup
      if (openTierPopup !== null && leftPx < pRight + 8 && leftPx + tipW > pLeft - 8) {
        if (btnCenter < pLeft + popupW / 2 && pLeft - tipW - 10 >= 12) {
          leftPx = pLeft - tipW - 10;
        } else if (pRight + 10 + tipW <= stRect.width - 12) {
          leftPx = pRight + 10;
        } else {
          leftPx = Math.max(12, pLeft - tipW - 10);
        }
      }
    }

    setHoverTip({ ...tip, leftPx, bottomPx, widthPx: tipW });
  };

  const spawnFloatingText = (xPct: number, yPct: number, text: string, colorClass: string) => {
    const id = nextFxSeqRef.current++;
    setFloatingTexts((prev) => [...prev, { id, xPct, yPct, text, colorClass }]);
    setTimeout(() => {
      if (mountedRef.current) {
        setFloatingTexts((prev) => prev.filter((item) => item.id !== id));
      }
    }, 950);
  };

  const playTargetTint = (targetEl: HTMLElement, colorHex: string, totalMs: number) => {
    const stage = stageRef.current;
    const layer = vfxLayerRef.current;
    if (!stage || !layer) return;
    const imgEl = targetEl.querySelector("img") as HTMLImageElement | null;
    if (!imgEl || !imgEl.complete || !imgEl.naturalWidth) return;

    const vpRect = stage.getBoundingClientRect();
    const imgRect = imgEl.getBoundingClientRect();
    if (imgRect.width <= 0 || imgRect.height <= 0) return;

    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "26";
    canvas.style.left = `${((imgRect.left - vpRect.left) / vpRect.width) * 100}%`;
    canvas.style.top = `${((imgRect.top - vpRect.top) / vpRect.height) * 100}%`;
    canvas.style.width = `${(imgRect.width / vpRect.width) * 100}%`;
    canvas.style.height = `${(imgRect.height / vpRect.height) * 100}%`;
    canvas.width = Math.max(2, Math.round(imgRect.width * dpr));
    canvas.height = Math.max(2, Math.round(imgRect.height * dpr));
    layer.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      canvas.remove();
      return;
    }

    const mirrored = targetEl.classList.contains("face-right");
    const start = performance.now();
    const drawFrame = (now: number) => {
      const t = Math.min(1, (now - start) / totalMs);
      const pulse = Math.sin(Math.PI * Math.pow(t, 0.7)) * 0.68;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (pulse > 0.01) {
        ctx.save();
        if (mirrored) {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
        ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);

        ctx.globalCompositeOperation = "color";
        ctx.globalAlpha = Math.min(1, pulse * 1.15);
        ctx.fillStyle = colorHex;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.globalCompositeOperation = "source-atop";
        ctx.globalAlpha = pulse * 0.45;
        ctx.fillStyle = colorHex;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.globalCompositeOperation = "destination-in";
        ctx.globalAlpha = 1;
        ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
        ctx.restore();
        canvas.style.opacity = String(Math.min(1, pulse * 1.15));
      }

      if (t < 1 && canvas.isConnected && mountedRef.current) {
        requestAnimationFrame(drawFrame);
      } else {
        canvas.remove();
      }
    };
    requestAnimationFrame(drawFrame);
  };

  const playVfxAtElement = async (
    targetEl: HTMLElement | undefined,
    vfxKey: string,
    floatText: string | null,
    colorClass: string,
    shakeAllowed = true
  ) => {
    const stage = stageRef.current;
    if (!stage || !targetEl) return;
    const spec = VFX_MAP[vfxKey] ?? VFX_MAP.slashing_fast;
    const vpRect = stage.getBoundingClientRect();
    const imgEl = (targetEl.querySelector("img") as HTMLElement | null) ?? targetEl;
    const box = imgEl.getBoundingClientRect();
    const xPct = (((box.left + box.width * 0.5) - vpRect.left) / Math.max(1, vpRect.width)) * 100;
    const yPct = (((box.top + box.height * 0.5) - vpRect.top) / Math.max(1, vpRect.height)) * 100;
    const sizePx = Math.max(78, Math.min(188, Math.max(box.width, box.height) * 1.1));

    const urls: string[] = [];
    for (let f = 1; f <= spec.frames; f++) {
      const path = assetUrl(`assets/vfx/${spec.folder}/row${spec.row}_f${f}.webp`);
      urls.push(path);
      if (!vfxCacheRef.current.has(path)) {
        const im = new Image();
        im.src = path;
        vfxCacheRef.current.set(path, im);
      }
    }

    if (spec.shake && shakeAllowed) {
      setStageShaking(false);
      requestAnimationFrame(() => mountedRef.current && setStageShaking(true));
      setTimeout(() => mountedRef.current && setStageShaking(false), 300);
    }

    const frameMs = 80;
    const totalMs = Math.max(420, urls.length * frameMs);
    playTargetTint(targetEl, spec.color, totalMs);

    const burstId = nextFxSeqRef.current++;
    if (floatText) {
      setTimeout(() => mountedRef.current && spawnFloatingText(xPct, yPct - 4, floatText, colorClass), 85);
    }

    for (let i = 0; i < urls.length; i++) {
      if (!mountedRef.current) break;
      setActiveBursts((prev) => [
        ...prev.filter((b) => b.id !== burstId),
        { id: burstId, xPct, yPct, sizePx, src: urls[i] },
      ]);
      await waitMs(frameMs);
    }
    if (mountedRef.current) {
      setActiveBursts((prev) => prev.filter((b) => b.id !== burstId));
    }
  };

  const advanceNextTurn = async (b: BattleState) => {
    advanceToNextTurnInRound(b);
    if (b.phase === "victory" || b.phase === "defeat") {
      setArmedAction(null);
      busyRef.current = false;
      onBattleSnapshotRef.current?.(cloneBattleSnapshot(b));
      if (b.phase === "victory") audioEngine.playSfx("coin", 0.65);
      forceRefresh();
      return;
    }

    if (b.activeActor.kind === "hero") {
      const heroId = b.activeActor.heroId;
      const hero = b.heroes.find((h) => h.heroId === heroId);
      if (!hero || hero.curHp <= 0) {
        await advanceNextTurn(b);
        return;
      }

      const isBonusTurnContinuation = Boolean(hero.bonusTurnUsedThisRound);
      if (!isBonusTurnContinuation) {
        hero.guarding = false;

        // Discipline passive HP regen
        if (hero.mods.hpRegenPct > 0 && hero.curHp > 0 && hero.curHp < hero.maxHp) {
          const regenAmt = Math.max(1, Math.round((hero.maxHp * hero.mods.hpRegenPct) / 100));
          hero.curHp = Math.min(hero.maxHp, hero.curHp + regenAmt);
          const hEl = heroElRefs.current.get(hero.heroId);
          if (hEl) {
            const vpRect = stageRef.current?.getBoundingClientRect();
            const bRect = hEl.getBoundingClientRect();
            if (vpRect) {
              spawnFloatingText(
                (((bRect.left + bRect.width * 0.3) - vpRect.left) / vpRect.width) * 100,
                (((bRect.top + bRect.height * 0.4) - vpRect.top) / vpRect.height) * 100,
                `+${regenAmt}`,
                "text-[#79f2a5]"
              );
            }
          }
        }

        // Tick Turn-Start Buffs & Ailments
        const turnAuras = getPartyCombatAuras(b.heroes, b.galeCanopyDodgeTurns && b.galeCanopyDodgeTurns > 0 ? 6 : 0);
        if (hero.statuses.length > 0) {
          const hadBurn = hero.statuses.some((s) => s.kind === "burn");
          const hadCurse = hero.statuses.some((s) => s.kind === "curse");
          const tick = applyTurnStartAilments(
            hero.statuses,
            hero.maxHp,
            Math.min(85, hero.statusResistPct + turnAuras.wardRootResistPct),
            {
              dotResistPct: hero.passives.dotResistPct,
              onExpireHealPct: hero.passives.runestoneSanctifiedHealPct,
            }
          );
          hero.statuses = tick.remaining;
          if (tick.expiredHeal > 0 && hero.curHp > 0 && hero.curHp < hero.maxHp) {
            hero.curHp = Math.min(hero.maxHp, hero.curHp + tick.expiredHeal);
            await playVfxAtElement(heroElRefs.current.get(hero.heroId), "heal_single", `+${tick.expiredHeal}`, "text-[#9df5dc]", false);
          }
          if (tick.regenHeal > 0 && hero.curHp > 0 && hero.curHp < hero.maxHp) {
            const finalRegen = Math.max(1, Math.round(tick.regenHeal * (hadBurn ? 0.75 : 1) * (hadCurse ? 0.8 : 1)));
            hero.curHp = Math.min(hero.maxHp, hero.curHp + finalRegen);
            await playVfxAtElement(
              heroElRefs.current.get(hero.heroId),
              "heal_single",
              `+${finalRegen}`,
              "text-[#79f2a5]",
              false
            );
          }
          if (tick.dotDamage > 0) {
            const dotBlocked = absorbWithWardShield(hero, tick.dotDamage);
            const dotHpDmg = dotBlocked.hpDmg;
            if (hero.curHp - dotHpDmg <= 0 && hero.statuses.some((s) => s.kind === "undying")) {
              hero.statuses = hero.statuses.filter((s) => s.kind !== "undying");
              hero.curHp = Math.max(1, Math.round(hero.maxHp * 0.2));
              await playVfxAtElement(
                heroElRefs.current.get(hero.heroId),
                "revive",
                "UNDYING!",
                "text-[#fff0ad]",
                false
              );
            } else {
              hero.curHp = Math.max(0, hero.curHp - dotHpDmg);
              await playVfxAtElement(
                heroElRefs.current.get(hero.heroId),
                tick.label === "Burn" ? "fire_single" : tick.label === "Bleed" ? "slashing_bleed" : "poison_acid",
                dotBlocked.absorbed > 0 && dotHpDmg === 0 ? `🛡 -${dotBlocked.absorbed}` : `-${tick.dotDamage}`,
                "text-[#ff8e6e]",
                false
              );
            }
            if (hero.curHp <= 0) {
              hero.statuses = [];
              hero.actedThisRound = true;
              finishHeroTurnCooldowns(hero);
              await advanceNextTurn(b);
              return;
            }
          }
          if (tick.stunned) {
            b.bannerText = `${hero.name} is stunned and skips this turn!`;
            forceRefresh();
            await waitMs(600);
            hero.actedThisRound = true;
            finishHeroTurnCooldowns(hero);
            await advanceNextTurn(b);
            return;
          }
        }

        // Rowan Lv90 Arrow Storm: Every 3rd round rains Piercing volley across all enemies before his action
        if (hero.passives.bowArrowStormR3 && b.turnCounter % 3 === 0) {
          const stormTargets = b.enemies.filter((e) => e.curHp > 0);
          if (stormTargets.length > 0) {
            b.bannerText = `${hero.name} unleashes Arrow Storm!`;
            audioEngine.playSfx("Longbow", 0.55);
            const stormSpec = { ...buildHeroWeaponActions(hero)[0], power: 0.7, damageType: "Piercing" };
            await Promise.all(
              stormTargets.map(async (foe) => {
                const res = computeDamageOnEnemy(hero, stormSpec, foe, undefined, {
                  allHeroes: b.heroes,
                  livingEnemiesCount: stormTargets.length,
                });
                foe.curHp = Math.max(0, foe.curHp - res.damage);
                await playVfxAtElement(enemyElRefs.current.get(foe.instanceId), "piercing_arrow", `${res.damage} STORM`, "text-[#ffe066]", false);
                if (foe.curHp <= 0) applyLootAndDropsForDefeatedEnemy(b, foe, itemsCatalog);
              })
            );
            if (b.enemies.every((e) => e.curHp <= 0)) {
              await advanceNextTurn(b);
              return;
            }
          }
        }
      }

      b.phase = "player_turn";
      b.bannerText = isBonusTurnContinuation
        ? `${hero.name}'s Bonus Turn — choose an action`
        : `${hero.name}'s turn — choose an action`;
      const availWeaponActs = buildHeroWeaponActions(hero);
      const defaultAtk = availWeaponActs.find((a) => !a.disabledReason) ?? availWeaponActs[0] ?? null;
      setArmedAction(defaultAtk);
      setOpenTierPopup(null);
      busyRef.current = false;
      onBattleSnapshotRef.current?.(cloneBattleSnapshot(b));
      forceRefresh();
    } else {
      setArmedAction(null);
      setOpenTierPopup(null);
      b.phase = "animating";
      onBattleSnapshotRef.current?.(cloneBattleSnapshot(b));
      forceRefresh();
      await runEnemyTurn(b, b.activeActor.instanceId);
    }
  };

  const runEnemyTurn = async (b: BattleState, instanceId: string) => {
    if (enemyTurnLockRef.current || !mountedRef.current) return;
    enemyTurnLockRef.current = true;
    busyRef.current = true;

    try {
      const enemy = b.enemies.find((e) => e.instanceId === instanceId && e.curHp > 0);
      if (!enemy) {
        enemyTurnLockRef.current = false;
        await advanceNextTurn(b);
        return;
      }

      // Stagger Recovery Check
      if (enemy.staggeredTurns > 0) {
        enemy.staggeredTurns -= 1;
        if (enemy.staggeredTurns === 0) enemy.guardCur = enemy.guardMax;
        b.bannerText = `${enemy.name} recovers from Stagger!`;
        forceRefresh();
        await waitMs(700);
        enemy.actedThisRound = true;
        enemyTurnLockRef.current = false;
        await advanceNextTurn(b);
        return;
      }

      // Tick Enemy Buffs & Ailments
      const enemyAuras = getPartyCombatAuras(b.heroes, b.galeCanopyDodgeTurns && b.galeCanopyDodgeTurns > 0 ? 6 : 0);
      if (enemy.statuses.length > 0) {
        const hadBurn = enemy.statuses.some((s) => s.kind === "burn");
        const tick = applyTurnStartAilments(enemy.statuses, enemy.maxHp, enemy.isBoss ? 40 : 15, {
          poisonDotBonusPct: enemyAuras.poisonDotBonusPct,
          doublePoisonBurn: Boolean(enemy.rotCloudDoubleTurns && enemy.rotCloudDoubleTurns > 0),
          universalPoisonPenPct: enemyAuras.universalPoisonPenPct,
        });
        enemy.statuses = tick.remaining;
        if (tick.regenHeal > 0 && enemy.curHp > 0 && enemy.curHp < enemy.maxHp) {
          const finalRegen = Math.max(1, Math.round(tick.regenHeal * (hadBurn ? 0.75 : 1)));
          enemy.curHp = Math.min(enemy.maxHp, enemy.curHp + finalRegen);
          await playVfxAtElement(enemyElRefs.current.get(enemy.instanceId), "heal_single", `+${finalRegen}`, "text-[#79f2a5]");
        }
        if (tick.dotDamage > 0) {
          enemy.curHp = Math.max(0, enemy.curHp - tick.dotDamage);
          await playVfxAtElement(
            enemyElRefs.current.get(enemy.instanceId),
            tick.label === "Burn" ? "fire_single" : tick.label === "Bleed" ? "slashing_bleed" : "poison_acid",
            `-${tick.dotDamage}`,
            "text-[#ff8e6e]"
          );
          if (enemy.curHp <= 0) {
            applyLootAndDropsForDefeatedEnemy(b, enemy, itemsCatalog);
            b.bannerText = `${enemy.name} fell to ${tick.label ?? "wounds"}!`;
            enemy.actedThisRound = true;
            enemyTurnLockRef.current = false;
            await advanceNextTurn(b);
            return;
          }
        }
        const nerveLockChance = Math.max(0, ...b.heroes.filter((h) => h.curHp > 0).map((h) => h.passives.nerveLockStumbleChance));
        const stumbled =
          !tick.stunned && enemy.statuses.length >= 2 && nerveLockChance > 0 && Math.random() < nerveLockChance;
        if (tick.stunned || stumbled) {
          b.bannerText = stumbled
            ? `${enemy.name} stumbles under toxic lock!`
            : `${enemy.name} is Stunned!`;
          forceRefresh();
          await waitMs(650);
          enemy.actedThisRound = true;
          enemyTurnLockRef.current = false;
          await advanceNextTurn(b);
          return;
        }
      }

      const livingHeroes = b.heroes.filter((h) => h.curHp > 0);
      if (livingHeroes.length === 0) {
        enemyTurnLockRef.current = false;
        await advanceNextTurn(b);
        return;
      }

      // Boss Telegraphed Heavy Strike check
      const rawActions = enemy.rawDef.actions ?? [];
      if (enemy.isBoss && !enemy.telegraphedMove && Math.random() < 0.34) {
        enemy.telegraphedMove = rawActions.find((a) => (a.target ?? "").toLowerCase().includes("all"))?.name ?? "Abyssal Cataclysm";
        b.bannerText = `Warning: ${enemy.name} gathers power for ${enemy.telegraphedMove}!`;
        forceRefresh();
        await waitMs(780);
        enemy.actedThisRound = true;
        enemyTurnLockRef.current = false;
        await advanceNextTurn(b);
        return;
      }

      const pickedAction = pickEnemyCombatMove(enemy, enemy.telegraphedMove);
      const isTelegraphRelease = Boolean(enemy.telegraphedMove);
      enemy.telegraphedMove = null;
      const isAoe = pickedAction.target === "All Allies" || isTelegraphRelease;
      const livingMaxHp = Math.max(...b.enemies.filter((e) => e.curHp > 0).map((e) => e.maxHp));
      const interceptPlan = resolveEnemyTargetAndIntercept(
        livingHeroes,
        enemy.maxHp >= livingMaxHp,
        b.turnCounter,
        isAoe
      );
      const targets = isAoe ? livingHeroes : [interceptPlan.primary];

      b.bannerText = `${enemy.name} unleashes ${pickedAction.name}!`;
      audioEngine.playSfx(pickedAction.damageType ?? "sword", 0.52);
      setLungingEnemyId(enemy.instanceId);
      forceRefresh();
      await waitMs(220);

      const isMagicMove =
        enemy.mag > enemy.atk * 0.8 ||
        /fire|frost|lightning|shadow|radiant|poison/i.test(pickedAction.damageType ?? "");
      const atkWeaken = enemy.statuses.some((s) => s.kind === "atk_down") ? 0.78 : 1.0;
      const chillWeaken = enemy.statuses.some((s) => s.kind === "chill") ? 0.85 : 1.0;
      const curseMul = enemy.statuses.some((s) => s.kind === "curse") ? 0.8 : 1.0;
      const hasteMul = enemy.statuses.some((s) => s.kind === "haste") ? 1.2 : 1.0;
      const poisonWeakenMul =
        enemy.statuses.some((s) => s.kind === "poison") && enemyAuras.poisonWeakenPct > 0
          ? 1 - enemyAuras.poisonWeakenPct / 100
          : 1.0;
      const isBlinded = enemy.statuses.some((s) => s.kind === "blind");
      const offenseMul = atkWeaken * chillWeaken * curseMul * hasteMul * poisonWeakenMul;
      const vfxKey = pickVfxKey(pickedAction.damageType ?? "Slashing", pickedAction.target, pickedAction.name, isAoe);

      const wasAliveBeforeReflect = enemy.curHp > 0;
      await Promise.all(
        targets.map(async (target) => {
          const hEl = heroElRefs.current.get(target.heroId);
          const tp = target.passives;
          const missedBlind = isBlinded && Math.random() < 0.22;
          const effectiveDodge =
            target.dodgePct +
            (target.guardDodgeBonusPct ?? 0) +
            enemyAuras.livingBarricadeDodgePct +
            enemyAuras.galeDodgePct +
            (!isMagicMove ? tp.rangedDodgePct * 0.5 : 0);
          const dodged = Math.random() * 100 < effectiveDodge;
          if (missedBlind || dodged) {
            await playVfxAtElement(hEl, "wind", missedBlind ? "MISS" : "DODGE", "text-[#8be9ff]", false);
            if (dodged && tp.dodgeHealsPct > 0 && !target.dodgeHealUsedThisRound && target.curHp > 0) {
              target.dodgeHealUsedThisRound = true;
              const healAmt = Math.max(1, Math.round((target.maxHp * tp.dodgeHealsPct) / 100));
              target.curHp = Math.min(target.maxHp, target.curHp + healAmt);
              await playVfxAtElement(hEl, "heal_single", `+${healAmt}`, "text-[#79f2a5]", false);
            }
            if (dodged && tp.dodgeGrantsMomentum) target.momentum = true;
            return;
          }
          const mAuraBoost = isMagicMove
            ? 1 + (enemyAuras.mDefAuraPct + ((target.mossWardTurns ?? 0) > 0 ? 12 : 0)) / 100
            : 1;
          const rawDef = (isMagicMove ? target.mDef : target.pDef) * mAuraBoost;
          const defVal = target.statuses.some((s) => s.kind === "def_down") ? Math.round(rawDef * 0.75) : rawDef;
          let dmg = computeEnemyStrikeDamage({
            atk: enemy.atk,
            mag: enemy.mag,
            isMagicMove,
            movePower: pickedAction.power,
            offenseMul,
            defVal,
            guarding: target.guarding,
            guardMitigationPct: target.mods.guardMitigationPct,
            hasWard: target.statuses.some((s) => s.kind === "ward"),
            hasChillBonus:
              target.statuses.some((s) => s.kind === "chill") &&
              /frost|lightning/i.test(pickedAction.damageType ?? ""),
          });
          if (isAoe && enemyAuras.aoeDamageReductionPct > 0) {
            dmg = Math.max(1, Math.round(dmg * (1 - enemyAuras.aoeDamageReductionPct / 100)));
          }
          if (!isMagicMove && tp.meleeDamageTakenReductionPct > 0) {
            dmg = Math.max(1, Math.round(dmg * (1 - tp.meleeDamageTakenReductionPct / 100)));
          }
          if (tp.aboveHalfHpMitigationPct > 0 && target.curHp / Math.max(1, target.maxHp) > 0.5) {
            dmg = Math.max(1, Math.round(dmg * (1 - tp.aboveHalfHpMitigationPct / 100)));
          }
          if (
            isMagicMove &&
            target.adaptiveTurns &&
            target.adaptiveTurns > 0 &&
            target.adaptiveElement === (pickedAction.damageType ?? "Arcane")
          ) {
            dmg = Math.max(1, Math.round(dmg * (1 - (target.adaptiveReductionPct ?? 0) / 100)));
          }
          if (isMagicMove && tp.plagueShadowResistPct > 0 && /poison|shadow/i.test(pickedAction.damageType ?? "")) {
            dmg = Math.max(1, Math.round(dmg * (1 - tp.plagueShadowResistPct / 100)));
          }
          const lowestHeroPct = Math.min(...livingHeroes.map((h) => h.curHp / Math.max(1, h.maxHp)));
          if (
            target.curHp / Math.max(1, target.maxHp) <= lowestHeroPct + 0.02 &&
            livingHeroes.some((h) => h.guarding && h.guardShieldWall && h.heroId !== target.heroId)
          ) {
            dmg = Math.max(1, Math.round(dmg * 0.75));
          }

          // Split with Interceptor (Orin Unbroken Wall / Vow of Protection / Valen Royal Intercept / Martyr Runestone)
          const interceptor = !isAoe ? interceptPlan.interceptor : null;
          let targetDmg = interceptor ? Math.max(1, Math.round(dmg * interceptPlan.interceptKeepRatio)) : dmg;
          if (interceptor) {
            const takeDmg = Math.max(1, Math.round(dmg * (1 - interceptPlan.interceptKeepRatio) * 0.85));
            const iEl = heroElRefs.current.get(interceptor.heroId);
            const iShield = absorbWithWardShield(interceptor, takeDmg);
            interceptor.curHp = Math.max(1, interceptor.curHp - iShield.hpDmg);
            await playVfxAtElement(iEl, "guard", `INTERCEPT -${takeDmg}`, "text-[#ffd878]", false);
          }

          const shielded = absorbWithWardShield(target, targetDmg);
          const hpHit = shielded.hpDmg;
          const prevPct = target.curHp / Math.max(1, target.maxHp);

          if (target.curHp - hpHit <= 0 && target.statuses.some((s) => s.kind === "undying")) {
            target.statuses = target.statuses.filter((s) => s.kind !== "undying");
            target.curHp = Math.max(1, Math.round(target.maxHp * 0.2));
            await playVfxAtElement(hEl, "revive", "UNDYING!", "text-[#fff0ad]", false);
          } else if (target.curHp - hpHit <= 0 && !target.unbreakableUsed && tp.unbreakableWardPct > 0) {
            target.unbreakableUsed = true;
            target.curHp = 1;
            if (target.heroId === "orin") {
              for (const ally of b.heroes) {
                if (ally.curHp > 0) grantWardShield(ally, tp.unbreakableWardPct);
              }
            } else {
              grantWardShield(target, tp.unbreakableWardPct);
            }
            await playVfxAtElement(hEl, "guard", "UNBREAKABLE!", "text-[#9de6ff]", false);
          } else {
            target.curHp = Math.max(0, target.curHp - hpHit);
            if (target.curHp <= 0) target.statuses = [];
            const txt =
              shielded.absorbed > 0 && hpHit === 0 ? `🛡 -${shielded.absorbed}` : `-${hpHit}`;
            await playVfxAtElement(hEl, vfxKey, txt, target.guarding ? "text-[#ffd878]" : "text-[#ff8e6e]", false);
          }

          // Adaptive Barrier Runestone
          if (isMagicMove && tp.runestoneAdaptiveMaxPct > 0 && target.curHp > 0) {
            target.adaptiveElement = pickedAction.damageType ?? "Arcane";
            target.adaptiveReductionPct = tp.runestoneAdaptiveMaxPct;
            target.adaptiveTurns = 2;
          }

          // Orin Sacred Resilience (<35% HP once/battle heal 15% + cleanse 1 + 12% Ward Shield)
          if (target.curHp > 0 && prevPct >= 0.35 && target.curHp / Math.max(1, target.maxHp) < 0.35 && tp.sacredResilience && !target.sacredResilienceUsed) {
            target.sacredResilienceUsed = true;
            const badIdx = target.statuses.findIndex((s) => !STATUS_UI_META[s.kind].isBuff);
            if (badIdx >= 0) target.statuses.splice(badIdx, 1);
            const resHeal = Math.max(1, Math.round(target.maxHp * 0.15));
            target.curHp = Math.min(target.maxHp, target.curHp + resHeal);
            grantWardShield(target, 12);
            await playVfxAtElement(hEl, "heal_single", `SACRED +${resHeal}`, "text-[#9de6ff]", false);
          }

          if (target.curHp > 0 && tp.battleWrathPerHitPct > 0) {
            target.battleWrathStacks = Math.min(4, (target.battleWrathStacks ?? 0) + 1);
          }
          if (target.curHp > 0 && tp.bluntingEnemyAtkDown && enemy.curHp > 0) {
            enemy.statuses = upsertStatusEffect(enemy.statuses, "atk_down", 1);
          }

          // Reflect / Retaliate / Thorns
          const reflectTotalPct =
            (target.statuses.some((s) => s.kind === "reflect") ? 25 : 0) +
            (!isMagicMove ? tp.runestoneRetaliateMeleePct : 0);
          if (reflectTotalPct > 0 && enemy.curHp > 0) {
            const reflectDmg = Math.max(1, Math.round((targetDmg * reflectTotalPct) / 100));
            enemy.curHp = Math.max(0, enemy.curHp - reflectDmg);
            if (!isMagicMove && tp.runestoneRetaliateBatteredGuard && target.curHp / Math.max(1, target.maxHp) < 0.5 && enemy.guardCur > 0) {
              enemy.guardCur = Math.max(0, enemy.guardCur - 1);
              if (enemy.guardCur === 0) enemy.staggeredTurns = 1;
            }
            await playVfxAtElement(enemyElRefs.current.get(enemy.instanceId), "radiant", `${reflectDmg} REFLECT`, "text-[#c2c9ff]", true);
          }

          // Valen Duelist's Riposte OR Resolve <25% HP Automatic Counterstrike
          const canValenCounter =
            !isMagicMove &&
            target.curHp > 0 &&
            enemy.curHp > 0 &&
            !target.riposteUsedThisRound &&
            !target.statuses.some((s) => s.kind === "stun") &&
            (tp.riposteEachRound || (target.heroId === "valen" && target.curHp / Math.max(1, target.maxHp) <= 0.25));
          if (canValenCounter) {
            target.riposteUsedThisRound = true;
            const riposteSpec = { ...buildHeroWeaponActions(target)[0], power: 0.55 };
            const ripRes = computeDamageOnEnemy(target, riposteSpec, enemy, undefined, {
              allHeroes: b.heroes,
              livingEnemiesCount: b.enemies.filter((e) => e.curHp > 0).length,
            });
            enemy.curHp = Math.max(0, enemy.curHp - ripRes.damage);
            await playVfxAtElement(enemyElRefs.current.get(enemy.instanceId), riposteSpec.vfxKey, `${ripRes.damage} COUNTER!`, "text-[#ffe066]", false);
          }

          if (
            target.curHp > 0 &&
            pickedAction.inflictStatus &&
            Math.random() < (pickedAction.inflictChance ?? 0.55)
          ) {
            const effResist =
              target.statusResistPct +
              enemyAuras.wardRootResistPct +
              (pickedAction.inflictStatus === "stun" || pickedAction.inflictStatus === "curse" ? tp.stunCurseResistPct : 0);
            if (Math.random() * 100 >= Math.min(88, effResist)) {
              target.statuses = upsertStatusEffect(target.statuses, pickedAction.inflictStatus, pickedAction.inflictTurns ?? 2);
            }
          }
        })
      );

      if (wasAliveBeforeReflect && enemy.curHp <= 0) {
        applyLootAndDropsForDefeatedEnemy(b, enemy, itemsCatalog);
      }

      setLungingEnemyId(null);
      enemy.actedThisRound = true;
      onBattleSnapshotRef.current?.(cloneBattleSnapshot(b));
      await waitMs(240);
      enemyTurnLockRef.current = false;
      await advanceNextTurn(b);
    } finally {
      enemyTurnLockRef.current = false;
    }
  };

  // Trigger initial enemy turn if fastest unit happens to be an enemy
  useEffect(() => {
    const b = battleRef.current;
    if (!open || !b || b.phase === "victory" || b.phase === "defeat" || b.phase === "fled") return;
    if (b.activeActor.kind === "enemy" && !enemyTurnLockRef.current && !busyRef.current) {
      void runEnemyTurn(b, b.activeActor.instanceId);
    }
  });

  const executeHeroAction = async (action: BattleActionSpec, targetId?: string) => {
    const b = battleRef.current;
    if (!b || b.phase !== "player_turn" || busyRef.current || b.activeActor.kind !== "hero") return;
    const activeHeroId = b.activeActor.heroId;
    const hero = b.heroes.find((h) => h.heroId === activeHeroId);
    if (!hero || hero.curHp <= 0) return;
    if (action.disabledReason || action.mpCost > hero.curMp) return;

    busyRef.current = true;
    b.phase = "animating";
    setOpenTierPopup(null);
    setHoverTip(null);

    if (action.kind === "flee") {
      if (b.isBossBattle) {
        b.phase = "player_turn";
        busyRef.current = false;
        b.bannerText = "Cannot flee from a Dimensional Portal Guardian!";
        forceRefresh();
        return;
      }
      const livingHeroesCount = b.heroes.filter((h) => h.curHp > 0).length;
      const escapeChance = Math.min(0.85, 0.62 + hero.dodgePct * 0.005 + (livingHeroesCount > 1 ? 0.05 : 0));
      if (Math.random() < escapeChance) {
        b.phase = "fled";
        b.bannerText = `${hero.name} led the party safely out of battle!`;
        audioEngine.playSfx("wind", 0.45);
        busyRef.current = false;
        forceRefresh();
        setTimeout(() => {
          if (mountedRef.current) onComplete(buildOutcomePayload("fled"));
        }, 450);
        return;
      }
      b.bannerText = `${hero.name} tried to break away, but the enemy blocked the escape!`;
      forceRefresh();
      await playVfxAtElement(heroElRefs.current.get(hero.heroId), "wind", "BLOCKED!", "text-[#ffb085]", false);
      hero.actedThisRound = true;
      finishHeroTurnCooldowns(hero, action);
      onBattleSnapshotRef.current?.(cloneBattleSnapshot(b));
      await advanceNextTurn(b);
      return;
    }

    if (action.kind === "guard") {
      hero.guarding = true;
      hero.momentum = true;
      const gp = hero.passives;
      if (gp.guardDodgePct > 0) hero.guardDodgeBonusPct = gp.guardDodgePct;
      if (gp.guardShieldWallLowestPct > 0) hero.guardShieldWall = true;
      if (gp.guardNatureSpellPct > 0) hero.guardNatureEmpower = true;
      if (gp.guardClearsBurnOrBleed) {
        const rmIdx = hero.statuses.findIndex((s) => s.kind === "burn" || s.kind === "bleed");
        if (rmIdx >= 0) hero.statuses.splice(rmIdx, 1);
      }
      if (gp.guardHealPct > 0 && hero.curHp > 0) {
        const gHeal = Math.max(1, Math.round((hero.maxHp * gp.guardHealPct) / 100));
        hero.curHp = Math.min(hero.maxHp, hero.curHp + gHeal);
      }
      const guardMp = (gp.wardOrGuardMpPct > 0 && hero.hasMp ? Math.round((hero.maxMp * gp.wardOrGuardMpPct) / 100) : 0) + gp.guardMpGain;
      if (guardMp > 0 && hero.hasMp) hero.curMp = Math.min(hero.maxMp, hero.curMp + guardMp);
      if (gp.guardSlamEnemy && hero.hasShield) {
        const slamFoe = b.enemies.find((e) => e.curHp > 0 && e.guardCur > 0) ?? b.enemies.find((e) => e.curHp > 0);
        if (slamFoe && slamFoe.guardCur > 0) {
          slamFoe.guardCur = Math.max(0, slamFoe.guardCur - 1);
          if (slamFoe.guardCur === 0) slamFoe.staggeredTurns = 1;
          await playVfxAtElement(enemyElRefs.current.get(slamFoe.instanceId), "guard", "SHIELD SLAM!", "text-[#ffd878]", true);
        }
      }
      if (gp.critiqueExposeDef || gp.regalCommandMark) {
        const markFoe = b.enemies.find((e) => e.curHp > 0);
        if (markFoe) {
          if (gp.critiqueExposeDef) markFoe.statuses = upsertStatusEffect(markFoe.statuses, "def_down", 2);
          if (gp.regalCommandMark) {
            for (const x of b.enemies) x.markedByRegalCommand = false;
            markFoe.markedByRegalCommand = true;
          }
        }
      }
      b.bannerText = `${hero.name} braces behind Guard (+25% next strike Momentum)!`;
      forceRefresh();
      await playVfxAtElement(heroElRefs.current.get(hero.heroId), "guard", "GUARD", "text-[#b8d4ff]", false);
      hero.actedThisRound = true;
      finishHeroTurnCooldowns(hero, action);
      onBattleSnapshotRef.current?.(cloneBattleSnapshot(b));
      await advanceNextTurn(b);
      return;
    }

    // Deduct MP or Bag Potion qty
    if (action.mpCost > 0) {
      const resolve = getHeroResolveState(hero);
      const effectiveMp = Math.max(1, Math.round(action.mpCost * (1 - resolve.mpSavePct)));
      hero.curMp = Math.max(0, hero.curMp - Math.min(hero.curMp, effectiveMp));
    }
    if (action.kind === "item" && action.itemId) {
      b.consumedPotions[action.itemId] = (b.consumedPotions[action.itemId] ?? 0) + 1;
    }

    b.bannerText = `${hero.name} uses ${action.name}!`;
    audioEngine.playSfx(
      action.kind === "spell" ? (action.damageType || "spell_cast") : action.kind === "item" ? "water_spell" : hero.weaponSubType,
      0.58
    );
    setLungingHeroId(hero.heroId);
    forceRefresh();
    await waitMs(180);

    // Resolve Ally Support / Healing / Revive
    if (
      action.targetScope === "ally" ||
      action.targetScope === "dead_ally" ||
      action.targetScope === "all_allies" ||
      action.targetScope === "self"
    ) {
      const primaryTarget =
        action.targetScope === "dead_ally"
          ? (b.heroes.find((h) => h.heroId === targetId && h.curHp <= 0) ?? b.heroes.find((h) => h.curHp <= 0))
          : (b.heroes.find((h) => h.heroId === targetId && h.curHp > 0) ?? hero);
      const secondTarget =
        action.targetScope === "ally" && action.secondAlly && primaryTarget
          ? pickSecondAllyForDualTarget(b.heroes, primaryTarget.heroId)
          : null;
      const targets =
        action.targetScope === "all_allies"
          ? b.heroes.filter((h) => h.curHp > 0)
          : action.targetScope === "self"
            ? [hero]
            : [primaryTarget, secondTarget].filter((x): x is BattleHeroUnit => Boolean(x));

      const resolve = getHeroResolveState(hero);
      const hpCritMul = hero.passives.runestoneBatteredPowerPct > 0 && hero.curHp / Math.max(1, hero.maxHp) < 0.5
        ? 1 + hero.passives.runestoneBatteredPowerPct / 100
        : 1.0;
      await Promise.all(
        targets.map(async (ally) => {
          const hEl = heroElRefs.current.get(ally.heroId);
          if (action.revive && ally.curHp <= 0) {
            const revivePct = 0.45 + (hero.passives.quickeningBalmBonusPct ?? 0) / 100;
            ally.curHp = Math.max(1, Math.round(ally.maxHp * revivePct));
            ally.statuses = [];
            if (hero.passives.quickeningBalmWardPct > 0) grantWardShield(ally, hero.passives.quickeningBalmWardPct);
            if (action.grantStatus) {
              ally.statuses = upsertStatusEffect(ally.statuses, action.grantStatus.kind, action.grantStatus.turns);
            }
            await playVfxAtElement(hEl, action.vfxKey, `REVIVED`, "text-[#ffe066]", false);
            return;
          }
          let playedFx = false;
          if (action.cleanse) {
            ally.statuses = ally.statuses.filter((s) => STATUS_UI_META[s.kind].isBuff);
            if (hero.passives.smellingSaltCleanseBuff) {
              ally.statuses = upsertStatusEffect(ally.statuses, "haste", 2);
              if (hero.hasMp) hero.curMp = Math.min(hero.maxMp, hero.curMp + 5);
            }
          }
          if (action.grantStatus) {
            let gTurns = action.grantStatus.turns;
            if (action.grantStatus.kind === "ward") gTurns += hero.passives.wardExtraTurn;
            if (action.grantStatus.kind === "regen") {
              gTurns += hero.passives.regenExtraTurn;
              if (hero.passives.purifyingDewCleanses) {
                ally.statuses = ally.statuses.filter((s) => s.kind !== "bleed" && s.kind !== "poison");
              }
            }
            ally.statuses = upsertStatusEffect(ally.statuses, action.grantStatus.kind, gTurns);
            if (action.grantStatus.kind === "ward") {
              grantWardShield(ally, 12);
              if (hero.passives.wardOrGuardMpPct > 0 && hero.hasMp) {
                hero.curMp = Math.min(hero.maxMp, hero.curMp + Math.round((hero.maxMp * hero.passives.wardOrGuardMpPct) / 100));
              }
            }
          }
          if (action.empowerNextSpell) {
            hero.nextSpellEmpower = true;
          }
          if (action.grantMomentum) {
            ally.momentum = true;
          }
          if (action.restoreMp && ally.hasMp) {
            const mpMult = action.kind === "item" ? 1 + hero.passives.potionBonusPct / 100 : 1;
            const mpGain = Math.max(8, Math.round(ally.maxMp * (action.restoreMp / 100) * mpMult));
            ally.curMp = Math.min(ally.maxMp, ally.curMp + mpGain);
            await playVfxAtElement(hEl, "mana", `+${mpGain} MP`, "text-[#7fc4ff]", false);
            playedFx = true;
          }
          if (action.healPower !== undefined) {
            const burned = ally.statuses.some((s) => s.kind === "burn");
            const cursedHeal = ally.statuses.some((s) => s.kind === "curse") ? 0.8 : 1.0;
            const allyBelowHalf = ally.curHp / Math.max(1, ally.maxHp) < 0.5;
            const triageMul = allyBelowHalf && hero.passives.triageHalfHpHealPct > 0 ? 1 + hero.passives.triageHalfHpHealPct / 100 : 1;
            const emerMul = ally.curHp / Math.max(1, ally.maxHp) < 0.3 && hero.passives.emergencyHealHalfMp30Pct > 0 ? 1 + hero.passives.emergencyHealHalfMp30Pct / 100 : 1;
            const potMul = action.kind === "item" ? 1 + hero.passives.potionBonusPct / 100 : 1;
            const rawHeal =
              action.kind === "item"
                ? Math.max(15, Math.round(ally.maxHp * action.healPower * potMul))
                : Math.max(18, Math.round((12 + hero.heal) * 1.45 * action.healPower * resolve.healMul * hpCritMul * triageMul * emerMul));
            const finalHeal = Math.max(1, Math.round(rawHeal * (burned ? 0.75 : 1.0) * cursedHeal));
            const preHp = ally.curHp;
            ally.curHp = Math.min(ally.maxHp, ally.curHp + finalHeal);
            const overheal = preHp + finalHeal - ally.curHp;
            if (overheal > 0 && ally.passives.overflowShieldMaxPct > 0) {
              grantWardShield(ally, Math.min(ally.passives.overflowShieldMaxPct, Math.round((overheal / Math.max(1, ally.maxHp)) * 100)));
            }
            if (allyBelowHalf && hero.passives.protectiveSalveWardPct > 0) {
              grantWardShield(ally, hero.passives.protectiveSalveWardPct);
            }
            if (hero.passives.mossWardTurns > 0) ally.mossWardTurns = Math.max(ally.mossWardTurns ?? 0, hero.passives.mossWardTurns);
            if (action.targetScope === "all_allies" && hero.passives.masterPanaceaResistBuff) {
              ally.statuses = upsertStatusEffect(ally.statuses, "immunity", 2);
            }
            await playVfxAtElement(hEl, action.vfxKey, `+${finalHeal}`, "text-[#79f2a5]", false);
            playedFx = true;
          }
          if (!playedFx) {
            const buffLabel = action.grantStatus
              ? `${STATUS_UI_META[action.grantStatus.kind].label.toUpperCase()} ${action.grantStatus.turns}T`
              : action.cleanse
                ? "CLEANSED"
                : action.grantMomentum
                  ? "EMPOWERED"
                  : "BUFFED";
            await playVfxAtElement(hEl, action.vfxKey, buffLabel, "text-[#ffe399]", false);
          }
        })
      );

      // Mera Lv90 Lifebloom Surge: once/battle single heal spreads 40% healing + Regen to all other living allies
      if (action.kind === "spell" && action.healPower !== undefined && action.targetScope === "ally" && hero.passives.lifebloomSurgeOnce && !hero.lifebloomUsed && primaryTarget) {
        hero.lifebloomUsed = true;
        const spreadHeal = Math.max(8, Math.round((12 + hero.heal) * 1.45 * action.healPower * 0.4));
        for (const extra of b.heroes) {
          if (extra.curHp > 0 && extra.heroId !== primaryTarget.heroId) {
            extra.curHp = Math.min(extra.maxHp, extra.curHp + spreadHeal);
            extra.statuses = upsertStatusEffect(extra.statuses, "regen", 2 + hero.passives.regenExtraTurn);
          }
        }
      }

      if (!action.grantMomentum || (action.targetScope !== "self" && !targets.some((t) => t.heroId === hero.heroId))) {
        hero.momentum = false;
      }
      setLungingHeroId(null);
      if (action.grantBonusTurn && !hero.bonusTurnUsedThisBattle && !hero.bonusTurnUsedThisRound) {
        hero.bonusTurnUsedThisBattle = true;
        hero.bonusTurnUsedThisRound = true;
        hero.actedThisRound = false;
      } else {
        hero.actedThisRound = true;
        finishHeroTurnCooldowns(hero, action);
      }
      onBattleSnapshotRef.current?.(cloneBattleSnapshot(b));
      await waitMs(180);
      await advanceNextTurn(b);
      return;
    }

    // Offensive Attack / Spell against Enemy / All Enemies / Neighbor Splash
    const livingEnemies = b.enemies.filter((e) => e.curHp > 0);
    const enemyTargets =
      action.targetScope === "all_enemies"
        ? livingEnemies
        : [livingEnemies.find((e) => e.instanceId === targetId) ?? livingEnemies[0]].filter(
            (x): x is BattleEnemyUnit => Boolean(x)
          );

    const splashRate = action.targetScope === "enemy" && action.splashPct ? action.splashPct : 0;
    const hitEntries: Array<{ enemy: BattleEnemyUnit; act: BattleActionSpec; isSplash: boolean }> = [];
    if (splashRate > 0 && enemyTargets[0]) {
      const primary = enemyTargets[0];
      hitEntries.push({ enemy: primary, act: action, isSplash: false });
      for (const nb of getAdjacentEnemies(primary, livingEnemies)) {
        hitEntries.push({
          enemy: nb,
          act: {
            ...action,
            power: action.power * splashRate,
            guardChip: undefined,
            inflictStatus: undefined,
          },
          isSplash: true,
        });
      }
    } else {
      for (const enemy of enemyTargets) {
        hitEntries.push({ enemy, act: action, isSplash: false });
      }
    }

    const isHeroBlinded = action.kind === "attack" && hero.statuses.some((s) => s.kind === "blind");
    const heroAccOffset = Math.min(0.18, (hero.passives.accuracyBonusPct + (hero.hasShield ? hero.passives.shieldAccuracyPct : 0)) / 100);
    const isModeB = Boolean((action.cooldownTurns ?? 0) > 0);
    let anyLandedCrit = false;
    let totalOffensiveDamage = 0;

    await Promise.all(
      hitEntries.map(async ({ enemy, act, isSplash }) => {
        if (isHeroBlinded && Math.random() < Math.max(0.05, 0.22 - heroAccOffset)) {
          await playVfxAtElement(enemyElRefs.current.get(enemy.instanceId), "wind", "MISS", "text-[#8be9ff]", false);
          return;
        }
        const res = computeDamageOnEnemy(hero, act, enemy, undefined, {
          allHeroes: b.heroes,
          livingEnemiesCount: livingEnemies.length,
          isModeB,
        });
        const totalHit = res.damage + res.detonateDotDmg;
        enemy.curHp = Math.max(0, enemy.curHp - totalHit);
        totalOffensiveDamage += totalHit;
        if (res.isCrit) anyLandedCrit = true;
        if (res.isCrit && hero.passives.critGainMomentum) hero.momentum = true;

        if (!isSplash) {
          if (hero.heroId === "orin") enemy.struckThisRoundByOrin = true;
          if (hero.passives.regalCommandMark) {
            for (const x of b.enemies) x.markedByRegalCommand = false;
            enemy.markedByRegalCommand = true;
          }
          if (hero.passives.critiqueExposeDef || hero.passives.spotterExposeDef) {
            enemy.statuses = upsertStatusEffect(enemy.statuses, "def_down", 2);
          }
        }

        const stripChance = act.stripEnemyBuffs
          ? 1.0
          : (act.damageType.toLowerCase().includes("radiant") ? hero.passives.radiantStripBuffChance : 0) ||
            (isModeB && hero.passives.modeBBlindsAndStrips ? 0.6 : 0) ||
            (["Longbow", "Shortbow"].includes(hero.weaponSubType) && act.kind === "attack" ? hero.passives.bowSeverBuffChance : 0) ||
            (res.isCrit && hero.passives.runestoneHallowedCritStrip ? 1.0 : 0);
        if (!isSplash && stripChance > 0 && enemy.curHp > 0 && Math.random() < stripChance) {
          enemy.statuses = enemy.statuses.filter((s) => !STATUS_UI_META[s.kind].isBuff);
        }

        const alreadyPoisoned = enemy.statuses.some((s) => s.kind === "poison");
        if (!isSplash && act.inflictStatus && enemy.curHp > 0 && Math.random() < (act.inflictChance ?? 0.75)) {
          const appliedKind =
            act.inflictStatus === "stun" && enemy.isBoss && act.effectText.toLowerCase().includes("chill on bosses")
              ? "chill"
              : act.inflictStatus;
          if (!(appliedKind === "stun" && enemy.isBoss && act.effectText.toLowerCase().includes("non-bosses"))) {
            enemy.statuses = upsertStatusEffect(enemy.statuses, appliedKind, act.inflictTurns ?? 2);
            if (appliedKind === "bleed" && hero.passives.corrosiveThornsDefDown) {
              enemy.statuses = upsertStatusEffect(enemy.statuses, "def_down", 2);
            }
            if (appliedKind === "poison" && alreadyPoisoned && hero.passives.toxicRuptureOnPoisoned) {
              const burst = Math.max(8, Math.round(enemy.maxHp * 0.08));
              enemy.curHp = Math.max(0, enemy.curHp - burst);
              await playVfxAtElement(enemyElRefs.current.get(enemy.instanceId), "poison_acid", `${burst} RUPTURE!`, "text-[#b4f285]", false);
            }
            if (appliedKind === "shock" && enemy.telegraphedMove) {
              enemy.telegraphedMove = null;
            }
          }
        }

        // Extra Discipline & Runestone status effects on hit
        if (!isSplash && enemy.curHp > 0) {
          if (act.specialTag === "double_dot") enemy.rotCloudDoubleTurns = 2;
          if (act.kind === "spell" && act.damageType.toLowerCase().includes("frost") && hero.passives.frostStunOrWeaken && Math.random() < 0.25) {
            enemy.statuses = upsertStatusEffect(enemy.statuses, enemy.isBoss ? "atk_down" : "stun", 1);
          }
          if (res.isCrit && act.kind === "attack" && hero.passives.critInflictsBleedTurns > 0) {
            enemy.statuses = upsertStatusEffect(enemy.statuses, "bleed", hero.passives.critInflictsBleedTurns);
          }
          if (act.kind === "attack" && hero.passives.coatedEdgePoisonChance > 0 && Math.random() < hero.passives.coatedEdgePoisonChance) {
            enemy.statuses = upsertStatusEffect(enemy.statuses, "poison", 2);
          }
          if (act.kind === "attack" && !isModeB && hero.passives.lightModeBlinds) {
            enemy.statuses = upsertStatusEffect(enemy.statuses, "blind", 2);
          }
          if (act.kind === "attack" && !isModeB && hero.passives.lightModeBleed && Math.random() < 0.4) {
            enemy.statuses = upsertStatusEffect(enemy.statuses, "bleed", 2);
          }
          if (act.kind === "attack" && hero.weaponSubType === "Light Crossbow" && hero.passives.crossbowBlinds) {
            enemy.statuses = upsertStatusEffect(enemy.statuses, "blind", 2);
          }
          if (act.kind === "attack" && isModeB && hero.passives.modeBBlindsAndStrips) {
            enemy.statuses = upsertStatusEffect(enemy.statuses, "blind", 2);
          }
          if (act.kind === "attack" && isModeB && hero.passives.modeBStunChance > 0 && Math.random() < hero.passives.modeBStunChance) {
            enemy.statuses = upsertStatusEffect(enemy.statuses, enemy.isBoss ? "atk_down" : "stun", 1);
          }
          if (act.kind === "attack" && hero.passives.runestoneChillOnHit) {
            enemy.statuses = upsertStatusEffect(enemy.statuses, "chill", 2);
          }
          if (hero.passives.creepingBriarsSpreadChance > 0 && (act.inflictStatus === "bleed" || hero.passives.lightModeBleed)) {
            const other = livingEnemies.find((o) => o.instanceId !== enemy.instanceId && o.curHp > 0);
            if (other && Math.random() < hero.passives.creepingBriarsSpreadChance) {
              other.statuses = upsertStatusEffect(other.statuses, "bleed", 2);
            }
          }
        }

        if (hero.mods.lifestealPct > 0 && hero.curHp > 0) {
          const healAmt = Math.max(1, Math.round((totalHit * hero.mods.lifestealPct) / 100));
          hero.curHp = Math.min(hero.maxHp, hero.curHp + healAmt);
        }
        if (!isSplash && hero.passives.runestoneSiphonMpPerHit > 0 && hero.hasMp) {
          const bonusMult = res.isWeak || res.isCrit ? 2 : 1;
          hero.curMp = Math.min(hero.maxMp, hero.curMp + hero.passives.runestoneSiphonMpPerHit * bonusMult);
        }
        if (!isSplash && act.restoreMp && hero.hasMp) {
          hero.curMp = Math.min(hero.maxMp, hero.curMp + act.restoreMp);
        }

        const label = res.triggeredStagger
          ? `${totalHit}! STAGGER`
          : res.isCrit
            ? `${totalHit}!`
            : isSplash
              ? `${totalHit} CLEAVE`
              : res.isWeak
                ? `${totalHit} WEAK`
                : `${totalHit}`;
        const cls = res.isCrit ? "text-[#ffe066] text-[22px]" : res.isWeak ? "text-[#ffa65c]" : isSplash ? "text-[#ffd294]" : res.isResist ? "text-[#9cb0cc]" : "text-[#ff8e6e]";
        await playVfxAtElement(enemyElRefs.current.get(enemy.instanceId), act.vfxKey, label, cls, !isSplash);

        // Secondary bounce / cleave / elemental splash / Radiant echo
        if (!isSplash) {
          const otherAlive = b.enemies.filter((e) => e.curHp > 0 && e.instanceId !== enemy.instanceId);
          if (otherAlive.length > 0) {
            const randOther = otherAlive[Math.floor(Math.random() * otherAlive.length)];
            if (act.kind === "attack" && hero.passives.cleaveSecondEnemyPct > 0 && ["Longsword", "Greatsword", "Scimitar"].includes(hero.weaponSubType)) {
              const cDmg = Math.max(1, Math.round((totalHit * hero.passives.cleaveSecondEnemyPct) / 100));
              randOther.curHp = Math.max(0, randOther.curHp - cDmg);
              await playVfxAtElement(enemyElRefs.current.get(randOther.instanceId), "slashing_heavy", `${cDmg} CLEAVE`, "text-[#ffd294]", false);
            }
            if (res.isCrit && act.kind === "attack" && hero.passives.critBouncePct > 0) {
              const bDmg = Math.max(1, Math.round((totalHit * hero.passives.critBouncePct) / 100));
              randOther.curHp = Math.max(0, randOther.curHp - bDmg);
              await playVfxAtElement(enemyElRefs.current.get(randOther.instanceId), "piercing_arrow", `${bDmg} RICOCHET`, "text-[#ffd294]", false);
            }
            if (act.kind === "attack" && hero.passives.runestoneSplash35Burn) {
              const sDmg = Math.max(1, Math.round(totalHit * 0.35));
              randOther.curHp = Math.max(0, randOther.curHp - sDmg);
              randOther.statuses = upsertStatusEffect(randOther.statuses, "burn", 2);
              await playVfxAtElement(enemyElRefs.current.get(randOther.instanceId), "fire_single", `${sDmg} BLAZE`, "text-[#ffab85]", false);
            }
            if (act.kind === "attack" && hero.passives.runestoneArcChainShock) {
              const aDmg = Math.max(1, Math.round(totalHit * 0.3));
              randOther.curHp = Math.max(0, randOther.curHp - aDmg);
              randOther.statuses = upsertStatusEffect(randOther.statuses, "shock", 2);
              await playVfxAtElement(enemyElRefs.current.get(randOther.instanceId), "lightning_single", `${aDmg} ARC`, "text-[#ffe885]", false);
            }
            if (hero.passives.vaporShatterPoisonSplashPct > 0 && act.damageType.toLowerCase().includes("poison") && act.targetScope === "enemy") {
              const vDmg = Math.max(1, Math.round((totalHit * hero.passives.vaporShatterPoisonSplashPct) / 100));
              randOther.curHp = Math.max(0, randOther.curHp - vDmg);
              randOther.statuses = upsertStatusEffect(randOther.statuses, "poison", 2);
              await playVfxAtElement(enemyElRefs.current.get(randOther.instanceId), "poison_acid", `${vDmg} VAPOR`, "text-[#b4f285]", false);
            }
          }
          if (act.kind === "spell" && act.targetScope === "enemy" && hero.passives.singleSpellEchoRadiantPct > 0 && enemy.curHp > 0) {
            const eDmg = Math.max(1, Math.round((totalHit * hero.passives.singleSpellEchoRadiantPct) / 100));
            enemy.curHp = Math.max(0, enemy.curHp - eDmg);
            await playVfxAtElement(enemyElRefs.current.get(enemy.instanceId), "radiant", `${eDmg} ECHO`, "text-[#fff0ad]", false);
          }
        }

        if (enemy.curHp <= 0) {
          applyLootAndDropsForDefeatedEnemy(b, enemy, itemsCatalog);
          if (hero.passives.critGainMomentum) hero.momentum = true;
        }
      })
    );

    // Siphon & Spell Multi-Target Refunds + Gale Canopy Wind Dodge + Single-Use Resets
    if (action.kind === "spell") {
      hero.nextSpellEmpower = false;
      hero.guardNatureEmpower = false;
      if (action.siphonHpPct && totalOffensiveDamage > 0 && hero.curHp > 0) {
        const sHp = Math.max(1, Math.round(totalOffensiveDamage * action.siphonHpPct));
        hero.curHp = Math.min(hero.maxHp, hero.curHp + sHp);
        await playVfxAtElement(heroElRefs.current.get(hero.heroId), "heal_single", `+${sHp}`, "text-[#79f2a5]", false);
      }
      if (action.siphonMpPct && totalOffensiveDamage > 0 && hero.hasMp) {
        const sMp = Math.max(2, Math.round(totalOffensiveDamage * action.siphonMpPct));
        hero.curMp = Math.min(hero.maxMp, hero.curMp + sMp);
      }
      if (action.siphonPartyHpPct && totalOffensiveDamage > 0) {
        const pHeal = Math.max(4, Math.round(totalOffensiveDamage * action.siphonPartyHpPct));
        for (const a of b.heroes) {
          if (a.curHp > 0) a.curHp = Math.min(a.maxHp, a.curHp + pHeal);
        }
      }
      if (hero.passives.multiSpellMpRefundPct > 0 && action.targetScope === "all_enemies" && action.mpCost > 0) {
        hero.curMp = Math.min(hero.maxMp, hero.curMp + Math.max(1, Math.round((action.mpCost * hero.passives.multiSpellMpRefundPct) / 100)));
      }
      if (hero.passives.galeWindPartyDodgePct > 0 && /wind|gale|lightning|tempest/i.test(`${action.name} ${action.damageType}`)) {
        b.galeCanopyDodgeTurns = 1;
      }
    }
    hero.firstStrikeUsed = true;

    // Sweeping clean dead allies/enemies check & Echoing / Twin-Nock / Seize the Opening / Covering Volley
    const postAliveEnemies = b.enemies.filter((e) => e.curHp > 0);
    if (action.kind === "attack" && action.targetScope === "enemy" && postAliveEnemies.length > 0) {
      const targetEcho = postAliveEnemies.find((e) => e.instanceId === targetId) ?? postAliveEnemies[0];
      const twinChance =
        (["Longbow", "Shortbow"].includes(hero.weaponSubType) ? hero.passives.bowTwinShotChance : 0) +
        hero.passives.runestoneEchoAttackChance;
      if (twinChance > 0 && Math.random() < twinChance && targetEcho.curHp > 0) {
        const echoSpec = { ...action, power: action.power * 0.5, cooldownTurns: 0 };
        const echoRes = computeDamageOnEnemy(hero, echoSpec, targetEcho, undefined, { allHeroes: b.heroes });
        targetEcho.curHp = Math.max(0, targetEcho.curHp - echoRes.damage);
        await playVfxAtElement(enemyElRefs.current.get(targetEcho.instanceId), echoSpec.vfxKey, `${echoRes.damage} ECHO!`, "text-[#ffd294]", false);
        if (targetEcho.curHp <= 0) applyLootAndDropsForDefeatedEnemy(b, targetEcho, itemsCatalog);
      }
    }

    if (hero.passives.seizeOpeningOnce && !hero.seizeOpeningUsed) {
      const killedSomeone = enemyTargets.some((t) => t.curHp <= 0);
      const nextFoe = b.enemies.find((e) => e.curHp > 0);
      if (nextFoe && (killedSomeone || livingEnemies.length === 1)) {
        hero.seizeOpeningUsed = true;
        const seizeSpec = { ...action, power: action.power * 0.5, cooldownTurns: 0 };
        const seizeRes = computeDamageOnEnemy(hero, seizeSpec, nextFoe, undefined, { allHeroes: b.heroes });
        nextFoe.curHp = Math.max(0, nextFoe.curHp - seizeRes.damage);
        await playVfxAtElement(enemyElRefs.current.get(nextFoe.instanceId), seizeSpec.vfxKey, `${seizeRes.damage} SEIZE!`, "text-[#ffe066]", false);
        if (nextFoe.curHp <= 0) applyLootAndDropsForDefeatedEnemy(b, nextFoe, itemsCatalog);
      }
    }

    if (anyLandedCrit) {
      const rowanAlly = b.heroes.find(
        (h) => h.curHp > 0 && h.heroId !== hero.heroId && h.passives.coveringVolleyOnceRound && !h.coveringVolleyUsedThisRound
      );
      const volleyTarget = b.enemies.find((e) => e.curHp > 0);
      if (rowanAlly && volleyTarget) {
        rowanAlly.coveringVolleyUsedThisRound = true;
        const volSpec = { ...buildHeroWeaponActions(rowanAlly)[0], power: 0.6, damageType: "Piercing" };
        const volRes = computeDamageOnEnemy(rowanAlly, volSpec, volleyTarget, undefined, { allHeroes: b.heroes });
        volleyTarget.curHp = Math.max(0, volleyTarget.curHp - volRes.damage);
        await playVfxAtElement(enemyElRefs.current.get(volleyTarget.instanceId), "piercing_arrow", `${volRes.damage} COVER!`, "text-[#ffe066]", false);
        if (volleyTarget.curHp <= 0) applyLootAndDropsForDefeatedEnemy(b, volleyTarget, itemsCatalog);
      }
    }

    hero.momentum = false;
    if (action.kind === "attack") {
      const offhandAct = buildDualWieldFollowupAction(hero);
      const offhandTarget = enemyTargets[0];
      if (offhandAct && offhandTarget && offhandTarget.curHp > 0) {
        await waitMs(130);
        if (isHeroBlinded && Math.random() < 0.22) {
          await playVfxAtElement(enemyElRefs.current.get(offhandTarget.instanceId), "wind", "MISS", "text-[#8be9ff]", false);
        } else {
          audioEngine.playSfx(hero.offhandWeaponSubType ?? hero.weaponSubType, 0.48);
          const ohRes = computeDamageOnEnemy(hero, offhandAct, offhandTarget, hero.offhandAtk);
          offhandTarget.curHp = Math.max(0, offhandTarget.curHp - ohRes.damage);
          if (hero.mods.lifestealPct > 0 && hero.curHp > 0) {
            const healAmt = Math.max(1, Math.round((ohRes.damage * hero.mods.lifestealPct) / 100));
            hero.curHp = Math.min(hero.maxHp, hero.curHp + healAmt);
          }
          const ohLabel = ohRes.triggeredStagger
            ? `${ohRes.damage}! STAGGER`
            : ohRes.isCrit
              ? `${ohRes.damage}! OFF-HAND`
              : `${ohRes.damage} OFF-HAND`;
          const ohCls = ohRes.isCrit ? "text-[#ffe066] text-[20px]" : ohRes.isWeak ? "text-[#ffa65c]" : "text-[#ffd294]";
          await playVfxAtElement(enemyElRefs.current.get(offhandTarget.instanceId), offhandAct.vfxKey, ohLabel, ohCls, false);
          if (offhandTarget.curHp <= 0) {
            applyLootAndDropsForDefeatedEnemy(b, offhandTarget, itemsCatalog);
          }
        }
      }
    }
    setLungingHeroId(null);
    const grantedBonus = Boolean(action.grantBonusTurn && !hero.bonusTurnUsedThisBattle && !hero.bonusTurnUsedThisRound);
    if (grantedBonus) {
      hero.bonusTurnUsedThisBattle = true;
      hero.bonusTurnUsedThisRound = true;
      hero.actedThisRound = false;
      await playVfxAtElement(heroElRefs.current.get(hero.heroId), "wind", "BONUS TURN!", "text-[#ffe066]", false);
    } else {
      hero.actedThisRound = true;
      finishHeroTurnCooldowns(hero, action);
    }
    onBattleSnapshotRef.current?.(cloneBattleSnapshot(b));
    await waitMs(200);
    await advanceNextTurn(b);
  };

  const b = battleRef.current;
  const packedEnemies = useMemo(
    () => (b ? packEncounterIntoGrid(b.enemies.filter((e) => e.curHp > 0), b.stage) : []),
    [b, b?.enemies.map((e) => `${e.instanceId}:${e.curHp > 0}`).join(",")]
  );

  if (!open || !b) return null;

  const activeHeroId = b.phase === "player_turn" && b.activeActor.kind === "hero" ? b.activeActor.heroId : null;
  const activeHero = activeHeroId ? b.heroes.find((h) => h.heroId === activeHeroId) ?? null : null;

  const roundOrderPips = previewRoundOrder(b, 9);
  const weaponActions = activeHero ? buildHeroWeaponActions(activeHero) : [];
  const spellBuckets = activeHero ? buildHeroSpellTierBuckets(activeHero, spells, learnedSpellIds, b.heroes) : new Map<number, BattleActionSpec[]>();
  const potionActions = buildCombatPotionActions(bagCounts, b.consumedPotions, itemsById);
  const magicTheme = activeHero ? HERO_MAGIC_THEMES[activeHero.heroId] : undefined;

  const guardAction: BattleActionSpec = {
    id: "act_guard",
    kind: "guard",
    name: "Guard",
    categoryLabel: "Defense Stance",
    badge: "Guard",
    badgeKind: "guard",
    iconPath: "assets/icons/magic_tiers/tier_res_guard_pip.webp",
    mpCost: 0,
    targetScope: "self",
    damageType: "Physical",
    power: 0,
    critBonus: 0,
    vfxKey: "guard",
    effectText: "Halves incoming damage until your next turn and grants Momentum (+25% damage on your next strike).",
  };

  const fleeAction: BattleActionSpec = {
    id: "act_flee",
    kind: "flee",
    name: "Flee",
    categoryLabel: b.isBossBattle ? "Blocked in Boss Fight" : "Escape Encounter",
    badge: "Esc",
    badgeKind: "guard",
    iconPath: "assets/icons/magic_tiers/tier_res_flee_retreat.webp",
    mpCost: 0,
    targetScope: "self",
    damageType: "Physical",
    power: 0,
    critBonus: 0,
    vfxKey: "wind",
    effectText: b.isBossBattle
      ? "Cannot retreat from a Dimensional Portal Guardian."
      : "Attempt to withdraw back onto Ethoria's map without losing items (~67% chance + Finesse/Dodge). Failing ends your turn while foes finish attacking.",
    disabledReason: b.isBossBattle ? "Boss Battle" : undefined,
  };

  const handleHotbarSlotClick = (act: BattleActionSpec) => {
    if (!activeHero || act.disabledReason) return;
    audioEngine.playUiClick(0.32);
    setOpenTierPopup(null);
    if (act.targetScope === "all_enemies" || act.targetScope === "all_allies" || act.targetScope === "self") {
      void executeHeroAction(act);
      return;
    }
    setArmedAction(act);
    b.bannerText =
      act.targetScope === "ally"
        ? `${activeHero.name}: Click any companion panel to use ${act.name}`
        : act.targetScope === "dead_ally"
          ? `${activeHero.name}: Click a fallen companion to revive`
          : `${activeHero.name}: Click an enemy to use ${act.name}`;
    forceRefresh();
  };

  const buildOutcomePayload = (result: "victory" | "defeat" | "fled"): BattleOutcomeResult => {
    const heroHpPct: Partial<Record<HeroId, number>> = {};
    const heroMpPct: Partial<Record<HeroId, number>> = {};
    const heroXpEarned: Partial<Record<HeroId, number>> = {};
    for (const h of b.heroes) {
      if (result === "defeat") {
        heroHpPct[h.heroId] = 100;
        heroMpPct[h.heroId] = 100;
        heroXpEarned[h.heroId] = 0;
      } else {
        const basePct = h.curHp <= 0 ? 1 : Math.max(1, Math.min(100, Math.round((h.curHp / Math.max(1, h.maxHp)) * 100)));
        const vitHeal = result === "victory" && h.curHp > 0 ? h.passives.postBattleHealPct : 0;
        heroHpPct[h.heroId] = Math.min(100, basePct + vitHeal);
        heroMpPct[h.heroId] = h.hasMp ? Math.max(0, Math.min(100, Math.round((h.curMp / Math.max(1, h.maxMp)) * 100))) : 100;
        heroXpEarned[h.heroId] = result === "victory" && h.curHp > 0 ? b.totalXpEarned : 0;
      }
    }
    return {
      result,
      heroHpPct,
      heroMpPct,
      consumedPotions: b.consumedPotions,
      xpEarned: result === "victory" ? b.totalXpEarned : 0,
      heroXpEarned,
      silverEarned: result === "victory" ? b.totalSilverEarned : 0,
      droppedTradeGoods: result === "victory" ? b.droppedTradeGoods : {},
      sealedPortalId: result === "victory" && b.isBossBattle && b.portalLoc ? b.portalLoc.id : null,
    };
  };

  const heroVictoryRows =
    b.phase === "victory"
      ? b.heroes.map((h) => {
          const prevLv = getHeroLevel(heroLevels, h.heroId, partyLevel);
          const prevXp = heroXp ? getHeroXp(heroXp, h.heroId) : partyXp;
          const earned = h.curHp > 0 ? b.totalXpEarned : 0;
          const upd = applyHeroXpGain(prevLv, prevXp, earned);
          return {
            heroId: h.heroId,
            name: h.name,
            avatarPath: h.avatarPath,
            ko: h.curHp <= 0,
            earned,
            prevLv,
            nextLv: upd.level,
            leveledUp: upd.leveledUp,
          };
        })
      : [];
  const eg = b.stage.enemyGrid;
  const hz = b.stage.heroZone;

  return (
    <div
      className="fixed inset-0 z-40 bg-[#04060c]/68 backdrop-blur-md flex items-center justify-center p-2 md:p-4"
      onClick={() => setOpenTierPopup(null)}
    >
      <div
        ref={stageRef}
        onClick={(e) => e.stopPropagation()}
        className={`battle-stage-viewport ${stageShaking ? "arena-shake" : ""}`}
      >
        {/* 1. Painted Arena Backdrop */}
        <div className="battle-backdrop-frame">
          <img src={assetUrl(b.stage.imagePath)} alt={b.stage.name} className="battle-stage-backdrop" draggable={false} />
          <div className="battle-stage-vignette" />
        </div>

        {/* 2. Top Round Order Strip & Prompt Banner */}
        <div className="battle-turn-bar">
          <div className="battle-turn-pip round-break">Round {b.turnCounter}</div>
          {roundOrderPips.map((pip, idx) =>
            pip.kind === "round_break" ? (
              <div key={`${pip.id}_${idx}`} className="battle-turn-pip round-break">
                {pip.name}
              </div>
            ) : (
              <div
                key={`${pip.id}_${idx}`}
                className={`battle-turn-pip ${pip.kind === "enemy" ? "foe" : ""} ${pip.isActive ? "active" : ""}`}
              >
                <img src={assetUrl(pip.iconPath)} alt="" draggable={false} />
                <span>{pip.name.split(" ")[0]}</span>
                {pip.isTelegraphed && <span className="text-[#ff9c9c] font-black">!</span>}
              </div>
            )
          )}
        </div>

        <div className="battle-action-banner">{b.bannerText}</div>

        {/* 3. Left Multi-Cell Enemy Grid (Zero Hover Tooltips in Player Battle View) */}
        <div
          className="battle-enemy-layer"
          style={{ left: `${eg.xPct}%`, top: `${eg.yPct}%`, width: `${eg.wPct}%`, height: `${eg.hPct}%` }}
        >
          {packedEnemies.map(({ unit, xPct, yPct, wPct, hPct, zIndex, depthScale }) => {
            const hpPct = Math.max(0, Math.min(100, (unit.curHp / Math.max(1, unit.maxHp)) * 100));
            const isTargetable = Boolean(
              activeHero && armedAction && (armedAction.targetScope === "enemy" || armedAction.targetScope === "all_enemies")
            );
            const hoveredUnit =
              isTargetable && hoveredEnemyId && (armedAction?.splashPct ?? 0) > 0
                ? b.enemies.find((e) => e.instanceId === hoveredEnemyId && e.curHp > 0)
                : undefined;
            const isSplashTarget = Boolean(
              hoveredUnit &&
                getAdjacentEnemies(
                  hoveredUnit,
                  b.enemies.filter((e) => e.curHp > 0)
                ).some((n) => n.instanceId === unit.instanceId)
            );
            return (
              <div
                key={unit.instanceId}
                ref={(el) => {
                  if (el) enemyElRefs.current.set(unit.instanceId, el);
                  else enemyElRefs.current.delete(unit.instanceId);
                }}
                onMouseEnter={() => setHoveredEnemyId(unit.instanceId)}
                onMouseLeave={() => setHoveredEnemyId((cur) => (cur === unit.instanceId ? null : cur))}
                onClick={() => {
                  if (!activeHero) return;
                  const chosenAct =
                    armedAction &&
                    !armedAction.disabledReason &&
                    (armedAction.targetScope === "enemy" || armedAction.targetScope === "all_enemies")
                      ? armedAction
                      : weaponActions.find((a) => !a.disabledReason) ?? weaponActions[0];
                  if (chosenAct && !chosenAct.disabledReason) void executeHeroAction(chosenAct, unit.instanceId);
                }}
                style={{ left: `${xPct}%`, top: `${yPct}%`, width: `${wPct}%`, height: `${hPct}%`, zIndex }}
                className={[
                  "battle-enemy-unit",
                  eg.flipRight || unit.flipX ? "face-right" : "",
                  isTargetable ? "is-targetable" : "",
                  isSplashTarget ? "is-splash-hit" : "",
                  lungingEnemyId === unit.instanceId ? "is-lunging" : "",
                ].join(" ")}
              >
                <div className="battle-enemy-shadow" />
                <img
                  src={assetUrl(unit.iconPath)}
                  alt={unit.name}
                  draggable={false}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "92%",
                    objectFit: "contain",
                    objectPosition: "bottom center",
                    transform: `${eg.flipRight || unit.flipX ? "scaleX(-1) " : ""}scale(${(unit.visualScale || 1) * depthScale})`,
                    filter: "drop-shadow(0 5px 10px rgba(0, 0, 0, 0.65))",
                  }}
                />

                {(unit.guardCur > 0 || unit.staggeredTurns > 0 || unit.telegraphedMove || unit.statuses.length > 0) && (
                  <div className="relative z-[5] flex flex-wrap items-center justify-center gap-1 px-1.5 py-[1px] rounded bg-[#0a0d14]/90 border border-[#ffffff24] text-[9.5px] font-bold text-[#f3e1b6] whitespace-nowrap">
                    {unit.guardCur > 0 && <span className="text-[#9ccbff]" title={`Guard (${unit.guardCur})`}>🛡{unit.guardCur}</span>}
                    {unit.staggeredTurns > 0 && <span className="text-[#ffe066]" title="Staggered — takes 1.5x damage and skips turn">STAGGER</span>}
                    {unit.telegraphedMove && <span className="text-[#ff8080]" title={`Preparing ${unit.telegraphedMove}`}>⚠ CHARGING</span>}
                    {unit.statuses.map((st) => {
                      const meta = STATUS_UI_META[st.kind];
                      return (
                        <span
                          key={st.kind}
                          title={`${meta.label} (${st.turns} ${st.turns === 1 ? "turn" : "turns"}) — ${meta.desc}`}
                          className={`px-1 rounded border leading-tight ${meta.pillCls}`}
                        >
                          {meta.glyph}
                          {st.turns}
                        </span>
                      );
                    })}
                  </div>
                )}
                <div className="battle-enemy-hpbar">
                  <div
                    className="h-full bg-gradient-to-r from-[#c93b3b] to-[#ff6c5c] transition-all duration-200"
                    style={{ width: `${hpPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* 4. Right 4-Row Hero Panels (Compact, Dynamic Discipline Crests Only, No Fake MP Bars) */}
        <div
          className="battle-hero-zone"
          style={{
            right: "4%",
            top: `${hz.yPct}%`,
            width: `${(() => {
              const maxDiscs = Math.max(0, ...b.heroes.map((h) => h.disciplines.length));
              return maxDiscs === 0 ? 25.5 : maxDiscs <= 2 ? 29.0 : maxDiscs <= 4 ? 32.0 : 35.0;
            })()}%`,
            height: `${hz.hPct}%`,
          }}
        >
          {b.heroes.map((hero) => {
            const isActive = Boolean(activeHero && activeHero.heroId === hero.heroId);
            const isKo = hero.curHp <= 0;
            const hpPct = Math.round((hero.curHp / Math.max(1, hero.maxHp)) * 100);
            const mpPct = hero.maxMp > 0 ? Math.round((hero.curMp / hero.maxMp) * 100) : 0;
            const hpTier = hpTierForHero(hero);
            const dmgCls = hpTier === 2 ? "bruised" : hpTier === 3 ? "bloodied" : hpTier === 4 ? "critical" : "";
            const isAllyTarget = Boolean(
              activeHero &&
                armedAction &&
                ((armedAction.targetScope === "ally" && !isKo) ||
                  (armedAction.targetScope === "dead_ally" && isKo) ||
                  armedAction.targetScope === "all_allies")
            );
            const resolve = getHeroResolveState(hero);
            const discCount = hero.disciplines.length;

            return (
              <div
                key={hero.heroId}
                ref={(el) => {
                  if (el) heroElRefs.current.set(hero.heroId, el);
                  else heroElRefs.current.delete(hero.heroId);
                }}
                onClick={() => {
                  if (activeHero && armedAction && isAllyTarget) {
                    void executeHeroAction(armedAction, hero.heroId);
                  }
                }}
                className={[
                  "battle-hero-card",
                  dmgCls,
                  isActive ? "is-active" : "",
                  isKo ? "is-ko" : "",
                  isAllyTarget ? "is-ally-target" : "",
                  lungingHeroId === hero.heroId ? "-translate-x-[30px]" : "",
                ].join(" ")}
              >
                {isActive && <span className="battle-hero-turn-arrow">➤</span>}

                <img
                  src={assetUrl(`assets/portraits/heroes/${hero.heroId}_hp${hpTier}.webp`)}
                  alt={hero.name}
                  className="battle-hero-portrait"
                  draggable={false}
                />

                <div className="flex-1 min-w-0 h-full flex items-center gap-[clamp(6px,2.2cqw,11px)]">
                  <div className="battle-hero-vitals-col">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-[clamp(13px,4.2cqw,16px)] font-extrabold text-[#fae2aa] truncate">
                        {hero.name}
                      </span>
                      <span
                        className={[
                          "text-[clamp(8.5px,2.5cqw,10.5px)] font-bold uppercase tracking-wider shrink-0",
                          isKo
                            ? "text-[#ff8080]"
                            : hero.guarding
                              ? "text-[#ffe399]"
                              : resolve.tier > 0
                                ? "text-[#ff9c7a]"
                                : "text-[#90a7ca]",
                        ].join(" ")}
                      >
                        {isKo ? "Down" : hero.guarding ? "Guarding" : resolve.tier > 0 ? `Resolve T${resolve.tier}` : hero.className}
                      </span>
                    </div>

                    <div className="battle-hero-gauge">
                      <div className="battle-hero-gauge-fill" style={{ width: `${hpPct}%` }} />
                      <span className="relative z-[1] text-[clamp(8.5px,2.4cqw,10.5px)] font-extrabold text-white drop-shadow">HP</span>
                      <span className="relative z-[1] ml-auto text-[clamp(9px,2.6cqw,11px)] font-extrabold text-[#f3f7ff] tabular-nums drop-shadow">
                        {hero.curHp}/{hero.maxHp}
                        {hero.shieldHp > 0 && <span className="text-[#9de6ff] ml-1">(+{hero.shieldHp}🛡)</span>}
                      </span>
                    </div>

                    {hero.hasMp && (
                      <div className="battle-hero-gauge mp-gauge">
                        <div className="battle-hero-gauge-fill" style={{ width: `${mpPct}%` }} />
                        <span className="relative z-[1] text-[clamp(8.5px,2.4cqw,10.5px)] font-extrabold text-white drop-shadow">MP</span>
                        <span className="relative z-[1] ml-auto text-[clamp(9px,2.6cqw,11px)] font-extrabold text-[#f3f7ff] tabular-nums drop-shadow">
                          {hero.curMp}/{hero.maxMp}
                        </span>
                      </div>
                    )}

                    {hero.statuses.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 mt-0.5">
                        {hero.statuses.map((st) => {
                          const meta = STATUS_UI_META[st.kind];
                          return (
                            <span
                              key={st.kind}
                              title={`${meta.label} (${st.turns} ${st.turns === 1 ? "turn" : "turns"}) — ${meta.desc}`}
                              className={`px-1.5 py-[0.5px] rounded border text-[9px] font-bold leading-tight whitespace-nowrap ${meta.pillCls}`}
                            >
                              {meta.glyph} {meta.label} {st.turns}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Dynamic Earned Discipline Crests Only (Zero Empty Placeholder Slots) */}
                  {discCount > 0 && (
                    <div
                      className="battle-hero-perks-tray"
                      style={{
                        gridTemplateColumns: `repeat(${Math.min(5, discCount)}, clamp(22px, 6.2cqw, 34px))`,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {hero.disciplines.map((badge) => (
                        <div
                          key={badge.id}
                          onMouseEnter={(e) => {
                            const stRect = stageRef.current?.getBoundingClientRect();
                            const elRect = e.currentTarget.getBoundingClientRect();
                            if (stRect) {
                              setPerkTip({
                                badge,
                                xPct: Math.max(5, ((elRect.left - stRect.left - 255) / stRect.width) * 100),
                                yPct: Math.min(72, ((elRect.top - stRect.top) / stRect.height) * 100),
                              });
                            }
                          }}
                          onMouseLeave={() => setPerkTip(null)}
                          className={`battle-perk-icon pillar-${badge.pillar}`}
                        >
                          <img src={assetUrl(badge.iconPath)} alt={badge.name} className="w-full h-full object-cover" draggable={false} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 5. VFX & Floating Number Layer */}
        <div ref={vfxLayerRef} className="absolute inset-0 pointer-events-none z-[25] overflow-hidden">
          {activeBursts.map((burst) => (
            <img
              key={burst.id}
              src={burst.src}
              alt=""
              draggable={false}
              style={{
                position: "absolute",
                left: `${burst.xPct}%`,
                top: `${burst.yPct}%`,
                width: `${burst.sizePx}px`,
                height: `${burst.sizePx}px`,
                transform: "translate(-50%, -50%)",
                pointerEvents: "none",
                zIndex: 27,
              }}
            />
          ))}
          {floatingTexts.map((ft) => (
            <div
              key={ft.id}
              style={{ left: `${ft.xPct}%`, top: `${ft.yPct}%` }}
              className={`battle-floating-num ${ft.colorClass}`}
            >
              {ft.text}
            </div>
          ))}
        </div>

        {/* 6. Vertical 1:1 Spell Stack Popup (Opens Directly Above Clicked T1-T8 Tier Button) */}
        {openTierPopup !== null && activeHero && magicTheme && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              left: `${popupAnchorLeft}px`,
              bottom: "calc(clamp(20px, 3.6%, 40px) + 66px)",
            }}
            className="battle-tier-popup"
          >
            {(spellBuckets.get(openTierPopup) ?? []).map((spAct) => {
              const noMp = activeHero.curMp < spAct.mpCost;
              const isArmed = armedAction?.id === spAct.id;
              return (
                <button
                  key={spAct.id}
                  type="button"
                  aria-disabled={noMp}
                  onMouseEnter={(e) =>
                    showActionTip(
                      e.currentTarget,
                      {
                        title: spAct.name,
                        subtitle: spAct.categoryLabel,
                        icon: spAct.iconPath,
                        pills: [
                          { label: `${spAct.mpCost} MP`, tone: "mp" },
                          { label: spAct.damageType },
                          ...(noMp ? [{ label: "Not Enough MP", tone: "warn" as const }] : []),
                        ],
                        effect: spAct.effectText,
                        hint: spAct.targetScope === "all_enemies" || spAct.targetScope === "all_allies" ? "Click to cast immediately" : "Click to arm, then select target",
                      },
                      true
                    )
                  }
                  onMouseLeave={() => setHoverTip(null)}
                  onClick={() => handleHotbarSlotClick(spAct)}
                  className={`battle-hb-slot ${isArmed ? "is-armed" : ""} ${noMp ? "is-disabled" : ""}`}
                >
                  <img src={assetUrl(spAct.iconPath)} alt={spAct.name} className="w-full h-full object-cover" draggable={false} />
                  <span className="absolute bottom-[2px] right-[2px] px-1 py-[1px] rounded bg-[#070a10]/90 border border-[#58a6ff]/45 text-[8.5px] font-extrabold text-[#82c4ff] leading-none">
                    {spAct.mpCost}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* 7. Floating Context-Anchored Hotbar Tooltip */}
        {hoverTip && (
          <div
            style={{ left: `${hoverTip.leftPx}px`, bottom: `${hoverTip.bottomPx}px`, width: `${hoverTip.widthPx}px` }}
            className="absolute rounded-lg border-[1.5px] border-[#c9a356] bg-[#101522]/96 px-3 py-2 pointer-events-none z-40 shadow-2xl flex flex-col gap-1.5"
          >
            <div className="flex items-center gap-2">
              <img src={assetUrl(hoverTip.icon)} alt="" className="w-8 h-8 rounded border border-[#96773f] object-cover shrink-0" />
              <div className="min-w-0">
                <div className="text-[12.5px] font-extrabold text-[#fae2aa] leading-tight">{hoverTip.title}</div>
                <div className="text-[10px] font-semibold text-[#93a7c7]">{hoverTip.subtitle}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {hoverTip.pills.map((p, idx) => (
                <span
                  key={idx}
                  className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded border ${
                    p.tone === "mp"
                      ? "border-[#3a6ca3] bg-[#132236] text-[#92cbff]"
                      : p.tone === "qty"
                        ? "border-[#3b8259] bg-[#12281c] text-[#8af2b6]"
                        : p.tone === "warn"
                          ? "border-[#9e4343] bg-[#311517] text-[#ffb3b3]"
                          : "border-[#354159] bg-[#141a27] text-[#d5e1f5]"
                  }`}
                >
                  {p.label}
                </span>
              ))}
            </div>
            <p className="m-0 text-[11px] leading-snug text-[#dbe4f4]">{hoverTip.effect}</p>
            {hoverTip.hint && <div className="text-[9.5px] text-[#8ea3c4] border-t border-white/10 pt-1">{hoverTip.hint}</div>}
          </div>
        )}

        {/* 8. Floating Discipline Crest Tooltip */}
        {perkTip && (
          <div
            style={{ left: `${perkTip.xPct}%`, top: `${perkTip.yPct}%` }}
            className="absolute w-[250px] rounded-lg border-[1.5px] border-[#c9a356] bg-[#101522]/96 px-3 py-2 pointer-events-none z-[41] shadow-2xl flex flex-col gap-1"
          >
            <div className="flex items-center gap-2">
              <img src={assetUrl(perkTip.badge.iconPath)} alt="" className="w-8 h-8 rounded border border-[#96773f] object-cover shrink-0" />
              <div className="min-w-0">
                <div className="text-[12px] font-extrabold text-[#fae2aa] leading-tight">{perkTip.badge.name}</div>
                <div className="text-[10px] font-bold text-[#93a7c7] uppercase">
                  Lv {perkTip.badge.tier} · {perkTip.badge.pillar} · {perkTip.badge.tag}
                </div>
              </div>
            </div>
            <p className="m-0 text-[11px] leading-snug text-[#dbe4f4]">{perkTip.badge.effect}</p>
          </div>
        )}

        {/* 9. Centered 1:1 Single-Row Action Hotbar (Weapon Modes + T1-T8 Magic Tiers + Potions + Guard + Flee) */}
        {b.phase === "player_turn" && activeHero && (
          <div ref={hotbarRef} className="battle-hotbar" onClick={(e) => e.stopPropagation()}>
            <div className="battle-hotbar-slots">
              {weaponActions.map((act, idx) => (
                <button
                  key={act.id}
                  type="button"
                  aria-disabled={Boolean(act.disabledReason)}
                  onMouseEnter={(e) =>
                    showActionTip(e.currentTarget, {
                      title: act.name,
                      subtitle: act.disabledReason ?? act.categoryLabel,
                      icon: act.iconPath,
                      pills: [{ label: activeHero.weaponSubType }, { label: act.damageType }, { label: act.badge }],
                      effect: act.effectText,
                      hint: act.disabledReason ?? "Click an enemy on the left to strike",
                    })
                  }
                  onMouseLeave={() => setHoverTip(null)}
                  onClick={() => handleHotbarSlotClick(act)}
                  className={`battle-hb-slot border-[#8f6e3f] ${armedAction?.id === act.id && !act.disabledReason ? "is-armed" : ""} ${act.disabledReason ? "is-disabled" : ""}`}
                >
                  <img src={assetUrl(act.iconPath)} alt={act.name} className="w-full h-full object-cover" draggable={false} />
                  <span className="absolute top-[2px] left-[3px] px-1 rounded bg-[#07090f]/86 text-[9px] font-extrabold text-[#cdd8ec]">
                    {idx + 1}
                  </span>
                  <span className={`absolute bottom-[2px] right-[2px] px-1 py-[1px] rounded bg-[#070a10]/90 border text-[8.5px] font-extrabold leading-none ${act.disabledReason ? "border-[#e06a6a]/65 text-[#ffb4b4]" : "border-[#d7a867]/35 text-[#f6cfa0]"}`}>
                    {act.badge}
                  </span>
                </button>
              ))}

              {/* Class-Themed Magic Tier Folders (Only Learned Tiers T1–T8 Appear) */}
              {activeHero.hasMp &&
                magicTheme &&
                (() => {
                  const unlockedMagicTiers = [1, 2, 3, 4, 5, 6, 7, 8].filter(
                    (tierNum) => (spellBuckets.get(tierNum)?.length ?? 0) > 0
                  );
                  if (unlockedMagicTiers.length === 0) return null;
                  return (
                    <>
                      <div className="w-[1px] h-9 bg-[#d7b267]/30 mx-0.5 shrink-0" />
                      {unlockedMagicTiers.map((tierNum) => {
                        const tierSpells = spellBuckets.get(tierNum) ?? [];
                        const tierIcon = `assets/icons/magic_tiers/tier_${activeHero.heroId}_${tierNum}.webp`;
                        const isOpen = openTierPopup === tierNum;
                        const hasArmedSpellInTier = tierSpells.some((s) => s.id === armedAction?.id);
                        return (
                          <button
                            key={tierNum}
                            ref={(el) => {
                              if (el) tierBtnRefs.current.set(tierNum, el);
                              else tierBtnRefs.current.delete(tierNum);
                            }}
                            type="button"
                            style={{ borderColor: magicTheme.accentColor }}
                            onMouseEnter={(e) =>
                              showActionTip(
                                e.currentTarget,
                                {
                                  title: `Tier ${tierNum} · ${magicTheme.tierNames[tierNum - 1] ?? "Spells"}`,
                                  subtitle: `${magicTheme.label} (${tierSpells.length}/2 Learned)`,
                                  icon: tierIcon,
                                  pills: tierSpells.map((s) => ({ label: `${s.name} (${s.mpCost} MP)`, tone: "mp" as const })),
                                  effect: isOpen ? "Click a spell above to cast or arm." : "Click to open this tier's learned spells.",
                                },
                                isOpen
                              )
                            }
                            onMouseLeave={() => setHoverTip(null)}
                            onClick={() => {
                              audioEngine.playUiClick(0.26);
                              setHoverTip(null);
                              if (isOpen) {
                                setOpenTierPopup(null);
                                return;
                              }
                              const stRect = stageRef.current?.getBoundingClientRect();
                              const btnRect = tierBtnRefs.current.get(tierNum)?.getBoundingClientRect();
                              if (stRect && btnRect) {
                                setPopupAnchorLeft(Math.max(8, btnRect.left - stRect.left - 5));
                              }
                              setOpenTierPopup(tierNum);
                            }}
                            className={`battle-hb-slot ${isOpen || hasArmedSpellInTier ? "is-armed" : ""}`}
                          >
                            <img src={assetUrl(tierIcon)} alt={`Tier ${tierNum}`} className="w-full h-full object-cover" draggable={false} />
                            <span className="absolute bottom-[2px] right-[2px] px-1 py-[1px] rounded bg-[#0e182c]/92 border border-[#78b2ff]/55 text-[8.5px] font-extrabold text-[#e2eeff] leading-none">
                              T{tierNum}
                            </span>
                          </button>
                        );
                      })}
                    </>
                  );
                })()}

              {/* Owned Belt Potions (qty > 0) */}
              {potionActions.length > 0 && <div className="w-[1px] h-9 bg-[#d7b267]/30 mx-0.5 shrink-0" />}
              {potionActions.map((pot) => (
                <button
                  key={pot.id}
                  type="button"
                  onMouseEnter={(e) =>
                    showActionTip(e.currentTarget, {
                      title: pot.name,
                      subtitle: pot.categoryLabel,
                      icon: pot.iconPath,
                      pills: [{ label: pot.badge, tone: "qty" }],
                      effect: pot.effectText,
                      hint: pot.targetScope === "all_allies" ? "Click to use for entire party" : "Click to arm, then select companion",
                    })
                  }
                  onMouseLeave={() => setHoverTip(null)}
                  onClick={() => handleHotbarSlotClick(pot)}
                  className={`battle-hb-slot border-[#3d8e63] ${armedAction?.id === pot.id ? "is-armed" : ""}`}
                >
                  <img src={assetUrl(pot.iconPath)} alt={pot.name} className="w-full h-full object-cover p-0.5" draggable={false} />
                  <span className="absolute bottom-[2px] right-[2px] px-1 py-[1px] rounded bg-[#070a10]/90 border border-[#46c680]/50 text-[8.5px] font-extrabold text-[#86f2b3] leading-none">
                    {pot.badge}
                  </span>
                </button>
              ))}

              {/* Guard & Flee */}
              <div className="w-[1px] h-9 bg-[#d7b267]/30 mx-0.5 shrink-0" />
              {[guardAction, fleeAction].map((sysAct) => (
                <button
                  key={sysAct.id}
                  type="button"
                  aria-disabled={Boolean(sysAct.disabledReason)}
                  onMouseEnter={(e) =>
                    showActionTip(e.currentTarget, {
                      title: sysAct.name,
                      subtitle: sysAct.categoryLabel,
                      icon: sysAct.iconPath,
                      pills: [{ label: sysAct.badge }],
                      effect: sysAct.effectText,
                    })
                  }
                  onMouseLeave={() => setHoverTip(null)}
                  onClick={() => handleHotbarSlotClick(sysAct)}
                  className={`battle-hb-slot border-[#6b768f] ${sysAct.disabledReason ? "is-disabled" : ""}`}
                >
                  <img src={assetUrl(sysAct.iconPath)} alt={sysAct.name} className="w-full h-full object-cover" draggable={false} />
                  <span className="absolute bottom-[2px] right-[2px] px-1 py-[1px] rounded bg-[#070a10]/90 border border-[#d7b267]/45 text-[8.5px] font-extrabold text-[#fae2aa] leading-none">
                    {sysAct.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 10. Victory / Defeat Outcome Modal */}
        {(b.phase === "victory" || b.phase === "defeat") && (
          <div className="absolute inset-0 z-50 bg-[#05070d]/82 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="rpg-modal-panel w-full max-w-[460px] rounded-md p-5 flex flex-col gap-3 text-center">
              {b.phase === "victory" ? (
                <>
                  <img
                    src={assetUrl("assets/icons/magic_tiers/tier_res_victory_seal.webp")}
                    alt=""
                    className="w-16 h-16 mx-auto rounded border border-[#d7b267] object-cover"
                    draggable={false}
                  />
                  <h2 className="font-display m-0 text-[24px] font-bold text-[#fae2aa]">
                    {b.isBossBattle ? "Portal Sealed!" : "Victory!"}
                  </h2>
                  <p className="m-0 text-[13px] text-[#cfd8e8]">
                    {b.isBossBattle && b.portalLoc
                      ? `${b.portalLoc.name} has been destroyed! Sea routes and frontier passages open.`
                      : `Defeated ${b.enemies.map((e) => e.name).join(", ")} in ${b.biomeName}.`}
                  </p>

                  <div className="grid grid-cols-1 gap-2 mt-1 text-left">
                    <div className="rounded border border-[#3e4a61] bg-[#121724] px-3 py-2 flex items-center justify-between">
                      <span className="text-[11px] uppercase tracking-wider text-[#90a4c4] font-bold">Silver Spoils</span>
                      <span className="text-[16px] font-extrabold text-[#fae2aa]">+{b.totalSilverEarned.toLocaleString()}s Silver</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {heroVictoryRows.map((row) => (
                        <div
                          key={row.heroId}
                          className={`rounded border px-2.5 py-1.5 flex items-center gap-2 ${
                            row.leveledUp
                              ? "border-[#54a874] bg-[#13241a]"
                              : row.ko
                                ? "border-[#4b3136] bg-[#191114] opacity-75"
                                : "border-[#333c50] bg-[#111622]"
                          }`}
                        >
                          <img src={assetUrl(row.avatarPath)} alt={row.name} className="w-7 h-7 rounded object-cover border border-[#6e5a38] shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1 text-[11.5px] font-bold text-[#f3e1b6]">
                              <span className="truncate">{row.name}</span>
                              <span className="text-[10.5px] text-[#9fb2cf]">Lv {row.nextLv}</span>
                            </div>
                            {row.leveledUp ? (
                              <div className="text-[10.5px] font-extrabold text-[#84f2b8]">
                                ★ Lv {row.prevLv} → {row.nextLv} (+{row.earned} XP)
                              </div>
                            ) : row.ko ? (
                              <div className="text-[10px] text-[#d48b92]">Down (0 XP)</div>
                            ) : (
                              <div className="text-[10.5px] text-[#ffe49e]">+{row.earned.toLocaleString()} XP</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {Object.keys(b.droppedTradeGoods).length > 0 && (
                    <div className="rounded border border-[#3a4a3f] bg-[#111b17] p-2.5 text-left">
                      <div className="text-[10.5px] uppercase tracking-wider text-[#84f2b8] font-bold mb-1.5">
                        Recovered Trade Goods
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(b.droppedTradeGoods).map(([gid, qty]) => {
                          const it = itemsById[gid];
                          return (
                            <div
                              key={gid}
                              className="flex items-center gap-1.5 rounded border border-[#385443] bg-[#0e1512] px-2 py-1 text-[11.5px] text-[#e7f3ec]"
                            >
                              {it && <img src={assetUrl(it.iconPath)} alt="" className="w-5 h-5 object-contain" />}
                              <span>{it?.name ?? gid}</span>
                              <strong className="text-[#84f2b8]">×{qty}</strong>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      audioEngine.playUiClick(0.36);
                      onComplete(buildOutcomePayload("victory"));
                    }}
                    className="mt-2 px-5 py-2.5 rounded border border-[#e6c170] bg-gradient-to-b from-[#b88a38] to-[#845e1e] hover:brightness-110 text-[#fff6dc] font-display text-[14px] font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Collect Spoils &amp; Continue
                  </button>
                </>
              ) : (
                <>
                  <h2 className="font-display m-0 text-[24px] font-bold text-[#ff8e8e]">Defeated in Battle</h2>
                  <p className="m-0 text-[13px] text-[#cfd8e8]">
                    Your companions fell unconscious and were carried back to the nearest Inn to mend their wounds. Your learned spells, gear, Silver, and XP are preserved.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      audioEngine.playUiClick(0.36);
                      onComplete(buildOutcomePayload("defeat"));
                    }}
                    className="mt-2 px-5 py-2.5 rounded border border-[#c95965] bg-gradient-to-b from-[#7a2933] to-[#521a21] hover:brightness-110 text-[#ffecee] font-display text-[14px] font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Wake at Nearest Inn
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
