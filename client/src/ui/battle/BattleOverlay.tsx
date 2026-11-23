import React, { useEffect, useMemo, useRef, useState } from "react";
import { assetUrl } from "../api";
import { audioEngine } from "../audio";
import { applyHeroXpGain, getHeroLevel, getHeroXp } from "../party/partyLogic";
import type { HeroId, ItemEntry, SpellEntry } from "../types";
import {
  advanceTimelineToNextLivingUnit,
  applyLootAndDropsForDefeatedEnemy,
  applyTurnStartAilments,
  buildCombatPotionActions,
  buildHeroSpellTierBuckets,
  buildHeroWeaponActions,
  computeDamageOnEnemy,
  getEffectiveSpeed,
  getHeroResolveState,
  getTimeAdvanceForDelay,
  HERO_MAGIC_THEMES,
  packEncounterIntoGrid,
  pickEnemyCombatMove,
  pickVfxKey,
  previewTurnTimeline,
  STATUS_UI_META,
  upsertStatusEffect,
  VFX_MAP,
} from "./battleLogic";
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
  onComplete: (outcome: BattleOutcomeResult) => void;
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
  onComplete,
}) => {
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
    battleRef.current = initialBattle;
    busyRef.current = false;
    enemyTurnLockRef.current = false;
    setOpenTierPopup(null);
    setHoverTip(null);
    setPerkTip(null);
    setFloatingTexts([]);
    setActiveBursts([]);

    // Pre-arm Hero's default Weapon Attack 1 if Hero starts immediately
    if (initialBattle.activeActor.kind === "hero") {
      const actorId = initialBattle.activeActor.heroId;
      const hero = initialBattle.heroes.find((h) => h.heroId === actorId);
      setArmedAction(hero ? buildHeroWeaponActions(hero)[0] ?? null : null);
    } else {
      setArmedAction(null);
    }
    setRenderTick((t) => t + 1);
  }, [open, initialBattle]);

  const forceRefresh = () => {
    if (mountedRef.current) setRenderTick((t) => t + 1);
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
    advanceTimelineToNextLivingUnit(b);
    if (b.phase === "victory" || b.phase === "defeat") {
      setArmedAction(null);
      busyRef.current = false;
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
      if (hero.statuses.length > 0) {
        const hadBurn = hero.statuses.some((s) => s.kind === "burn");
        const hadCurse = hero.statuses.some((s) => s.kind === "curse");
        const tick = applyTurnStartAilments(hero.statuses, hero.maxHp, hero.statusResistPct);
        hero.statuses = tick.remaining;
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
          if (hero.curHp - tick.dotDamage <= 0 && hero.statuses.some((s) => s.kind === "undying")) {
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
            hero.curHp = Math.max(0, hero.curHp - tick.dotDamage);
            await playVfxAtElement(
              heroElRefs.current.get(hero.heroId),
              tick.label === "Burn" ? "fire_single" : tick.label === "Bleed" ? "slashing_bleed" : "poison_acid",
              `-${tick.dotDamage}`,
              "text-[#ff8e6e]",
              false
            );
          }
          if (hero.curHp <= 0) {
            hero.statuses = [];
            hero.timelinePos += getTimeAdvanceForDelay(getEffectiveSpeed(hero.speed, hero.statuses), 1.0);
            await advanceNextTurn(b);
            return;
          }
        }
        if (tick.stunned) {
          b.bannerText = `${hero.name} is stunned and skips this turn!`;
          forceRefresh();
          await waitMs(600);
          hero.timelinePos += getTimeAdvanceForDelay(getEffectiveSpeed(hero.speed, hero.statuses), 0.9);
          await advanceNextTurn(b);
          return;
        }
      }

      b.phase = "player_turn";
      b.bannerText = `${hero.name}'s turn — choose an action`;
      const defaultAtk = buildHeroWeaponActions(hero)[0] ?? null;
      setArmedAction(defaultAtk);
      setOpenTierPopup(null);
      busyRef.current = false;
      forceRefresh();
    } else {
      setArmedAction(null);
      setOpenTierPopup(null);
      b.phase = "animating";
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
        enemy.timelinePos += getTimeAdvanceForDelay(enemy.speed, 1.0);
        enemyTurnLockRef.current = false;
        await advanceNextTurn(b);
        return;
      }

      // Tick Enemy Buffs & Ailments
      if (enemy.statuses.length > 0) {
        const hadBurn = enemy.statuses.some((s) => s.kind === "burn");
        const tick = applyTurnStartAilments(enemy.statuses, enemy.maxHp, enemy.isBoss ? 40 : 15);
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
            enemyTurnLockRef.current = false;
            await advanceNextTurn(b);
            return;
          }
        }
        if (tick.stunned) {
          b.bannerText = `${enemy.name} is Stunned!`;
          forceRefresh();
          await waitMs(650);
          enemy.timelinePos += getTimeAdvanceForDelay(getEffectiveSpeed(enemy.speed, enemy.statuses), 0.9);
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
        enemy.timelinePos += getTimeAdvanceForDelay(getEffectiveSpeed(enemy.speed, enemy.statuses), 0.95);
        enemyTurnLockRef.current = false;
        await advanceNextTurn(b);
        return;
      }

      const pickedAction = pickEnemyCombatMove(enemy, enemy.telegraphedMove);
      const isTelegraphRelease = Boolean(enemy.telegraphedMove);
      enemy.telegraphedMove = null;
      const isAoe = pickedAction.target === "All Allies" || isTelegraphRelease;
      const targets = isAoe ? livingHeroes : [livingHeroes[Math.floor(Math.random() * livingHeroes.length)]];

      b.bannerText = `${enemy.name} unleashes ${pickedAction.name}!`;
      audioEngine.playSfx(pickedAction.damageType ?? "sword", 0.52);
      setLungingEnemyId(enemy.instanceId);
      forceRefresh();
      await waitMs(220);

      const isMagicMove =
        enemy.mag > enemy.atk * 0.8 ||
        /fire|frost|lightning|shadow|radiant|poison/i.test(pickedAction.damageType ?? "");
      const atkWeaken = enemy.statuses.some((s) => s.kind === "atk_down") ? 0.78 : 1.0;
      const curseMul = enemy.statuses.some((s) => s.kind === "curse") ? 0.8 : 1.0;
      const hasteMul = enemy.statuses.some((s) => s.kind === "haste") ? 1.2 : 1.0;
      const isBlinded = enemy.statuses.some((s) => s.kind === "blind");
      const baseOffense = Math.max(8, (isMagicMove ? Math.max(enemy.atk, enemy.mag) : enemy.atk) * pickedAction.power * atkWeaken * curseMul * hasteMul);
      const vfxKey = pickVfxKey(pickedAction.damageType ?? "Slashing", pickedAction.target, pickedAction.name, isAoe);

      const wasAliveBeforeReflect = enemy.curHp > 0;
      await Promise.all(
        targets.map(async (target) => {
          const hEl = heroElRefs.current.get(target.heroId);
          const missedBlind = isBlinded && Math.random() < 0.22;
          const dodged = Math.random() * 100 < target.dodgePct;
          if (missedBlind || dodged) {
            await playVfxAtElement(hEl, "wind", missedBlind ? "MISS" : "DODGE", "text-[#8be9ff]", false);
            return;
          }
          const rawDef = isMagicMove ? target.mDef : target.pDef;
          const defVal = target.statuses.some((s) => s.kind === "def_down") ? Math.round(rawDef * 0.75) : rawDef;
          let dmg = Math.max(2, Math.round(baseOffense * 1.45 - defVal * 0.52));
          if (target.guarding) {
            const mit = 0.5 - Math.min(0.2, target.mods.guardMitigationPct / 100);
            dmg = Math.max(1, Math.round(dmg * mit));
          }
          if (target.statuses.some((s) => s.kind === "ward")) {
            dmg = Math.max(1, Math.round(dmg * 0.75));
          }
          dmg = Math.max(1, Math.round(dmg * (0.92 + Math.random() * 0.16)));

          if (target.curHp - dmg <= 0 && target.statuses.some((s) => s.kind === "undying")) {
            target.statuses = target.statuses.filter((s) => s.kind !== "undying");
            target.curHp = Math.max(1, Math.round(target.maxHp * 0.2));
            await playVfxAtElement(hEl, "revive", "UNDYING!", "text-[#fff0ad]", false);
          } else {
            target.curHp = Math.max(0, target.curHp - dmg);
            if (target.curHp <= 0) target.statuses = [];
            await playVfxAtElement(hEl, vfxKey, `-${dmg}`, target.guarding ? "text-[#ffd878]" : "text-[#ff8e6e]", false);
          }

          if (target.statuses.some((s) => s.kind === "reflect") && enemy.curHp > 0) {
            const reflectDmg = Math.max(1, Math.round(dmg * 0.25));
            enemy.curHp = Math.max(0, enemy.curHp - reflectDmg);
            await playVfxAtElement(enemyElRefs.current.get(enemy.instanceId), "radiant", `${reflectDmg} REFLECT`, "text-[#c2c9ff]", true);
          }

          if (
            target.curHp > 0 &&
            pickedAction.inflictStatus &&
            Math.random() < (pickedAction.inflictChance ?? 0.55)
          ) {
            target.statuses = upsertStatusEffect(target.statuses, pickedAction.inflictStatus, pickedAction.inflictTurns ?? 2);
          }
        })
      );

      if (wasAliveBeforeReflect && enemy.curHp <= 0) {
        applyLootAndDropsForDefeatedEnemy(b, enemy, itemsCatalog);
      }

      setLungingEnemyId(null);
      enemy.timelinePos += getTimeAdvanceForDelay(getEffectiveSpeed(enemy.speed, enemy.statuses), 1.0);
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
    if (action.mpCost > hero.curMp) return;

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
      b.phase = "fled";
      b.bannerText = "Party slipped away safely into the wilds.";
      busyRef.current = false;
      forceRefresh();
      setTimeout(() => {
        if (mountedRef.current) onComplete(buildOutcomePayload("fled"));
      }, 450);
      return;
    }

    if (action.kind === "guard") {
      hero.guarding = true;
      hero.momentum = true;
      b.bannerText = `${hero.name} braces behind Guard (+25% next strike Momentum)!`;
      forceRefresh();
      await playVfxAtElement(heroElRefs.current.get(hero.heroId), "guard", "GUARD", "text-[#b8d4ff]", false);
      hero.timelinePos += getTimeAdvanceForDelay(getEffectiveSpeed(hero.speed, hero.statuses), 0.72);
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
      const targets =
        action.targetScope === "all_allies"
          ? b.heroes.filter((h) => h.curHp > 0)
          : action.targetScope === "self"
            ? [hero]
            : action.targetScope === "dead_ally"
              ? [b.heroes.find((h) => h.heroId === targetId && h.curHp <= 0) ?? b.heroes.find((h) => h.curHp <= 0)].filter(
                  (x): x is BattleHeroUnit => Boolean(x)
                )
              : [b.heroes.find((h) => h.heroId === targetId && h.curHp > 0) ?? hero];

      const resolve = getHeroResolveState(hero);
      await Promise.all(
        targets.map(async (ally) => {
          const hEl = heroElRefs.current.get(ally.heroId);
          if (action.revive && ally.curHp <= 0) {
            ally.curHp = Math.max(1, Math.round(ally.maxHp * 0.45));
            ally.statuses = [];
            if (action.grantStatus) {
              ally.statuses = upsertStatusEffect(ally.statuses, action.grantStatus.kind, action.grantStatus.turns);
            }
            await playVfxAtElement(hEl, action.vfxKey, `REVIVED`, "text-[#ffe066]", false);
            return;
          }
          let playedFx = false;
          if (action.cleanse) {
            ally.statuses = ally.statuses.filter((s) => STATUS_UI_META[s.kind].isBuff);
          }
          if (action.grantStatus) {
            ally.statuses = upsertStatusEffect(ally.statuses, action.grantStatus.kind, action.grantStatus.turns);
          }
          if (action.grantMomentum) {
            ally.momentum = true;
          }
          if (action.restoreMp && ally.hasMp) {
            const mpGain = Math.max(8, Math.round(ally.maxMp * (action.restoreMp / 100)));
            ally.curMp = Math.min(ally.maxMp, ally.curMp + mpGain);
            await playVfxAtElement(hEl, "mana", `+${mpGain} MP`, "text-[#7fc4ff]", false);
            playedFx = true;
          }
          if (action.healPower !== undefined) {
            const burned = ally.statuses.some((s) => s.kind === "burn");
            const cursedHeal = ally.statuses.some((s) => s.kind === "curse") ? 0.8 : 1.0;
            const rawHeal =
              action.kind === "item"
                ? Math.max(15, Math.round(ally.maxHp * action.healPower))
                : Math.max(18, Math.round((12 + hero.heal) * 1.45 * action.healPower * resolve.healMul));
            const finalHeal = Math.max(1, Math.round(rawHeal * (burned ? 0.75 : 1.0) * cursedHeal));
            ally.curHp = Math.min(ally.maxHp, ally.curHp + finalHeal);
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

      if (!action.grantMomentum || (action.targetScope !== "self" && !targets.some((t) => t.heroId === hero.heroId))) {
        hero.momentum = false;
      }
      setLungingHeroId(null);
      hero.timelinePos += getTimeAdvanceForDelay(getEffectiveSpeed(hero.speed, hero.statuses), action.delayPct);
      await waitMs(180);
      await advanceNextTurn(b);
      return;
    }

    // Offensive Attack / Spell against Enemy / All Enemies
    const livingEnemies = b.enemies.filter((e) => e.curHp > 0);
    const enemyTargets =
      action.targetScope === "all_enemies"
        ? livingEnemies
        : [livingEnemies.find((e) => e.instanceId === targetId) ?? livingEnemies[0]].filter(
            (x): x is BattleEnemyUnit => Boolean(x)
          );

    const isHeroBlinded = action.kind === "attack" && hero.statuses.some((s) => s.kind === "blind");
    await Promise.all(
      enemyTargets.map(async (enemy) => {
        if (isHeroBlinded && Math.random() < 0.22) {
          await playVfxAtElement(enemyElRefs.current.get(enemy.instanceId), "wind", "MISS", "text-[#8be9ff]", false);
          return;
        }
        const res = computeDamageOnEnemy(hero, action, enemy);
        enemy.curHp = Math.max(0, enemy.curHp - res.damage);

        if (action.targetDelayPush) {
          enemy.timelinePos += action.targetDelayPush * 0.45;
        }
        if (action.stripEnemyBuffs && enemy.curHp > 0) {
          enemy.statuses = enemy.statuses.filter((s) => !STATUS_UI_META[s.kind].isBuff);
        }
        if (action.inflictStatus && enemy.curHp > 0 && Math.random() < (action.inflictChance ?? 0.75)) {
          enemy.statuses = upsertStatusEffect(enemy.statuses, action.inflictStatus, action.inflictTurns ?? 2);
          if (action.inflictStatus === "shock" && enemy.telegraphedMove) {
            enemy.telegraphedMove = null;
          }
        }
        if (hero.mods.lifestealPct > 0 && hero.curHp > 0) {
          const healAmt = Math.max(1, Math.round((res.damage * hero.mods.lifestealPct) / 100));
          hero.curHp = Math.min(hero.maxHp, hero.curHp + healAmt);
        }
        if (action.restoreMp && hero.hasMp) {
          hero.curMp = Math.min(hero.maxMp, hero.curMp + action.restoreMp);
        }

        const label = res.triggeredStagger
          ? `${res.damage}! STAGGER`
          : res.isCrit
            ? `${res.damage}!`
            : res.isWeak
              ? `${res.damage} WEAK`
              : `${res.damage}`;
        const cls = res.isCrit ? "text-[#ffe066] text-[22px]" : res.isWeak ? "text-[#ffa65c]" : res.isResist ? "text-[#9cb0cc]" : "text-[#ff8e6e]";
        await playVfxAtElement(enemyElRefs.current.get(enemy.instanceId), action.vfxKey, label, cls, true);

        if (enemy.curHp <= 0) {
          applyLootAndDropsForDefeatedEnemy(b, enemy, itemsCatalog);
        }
      })
    );

    hero.momentum = false;
    setLungingHeroId(null);
    hero.timelinePos += getTimeAdvanceForDelay(getEffectiveSpeed(hero.speed, hero.statuses), action.delayPct);
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

  const timelinePips = previewTurnTimeline(b, 8);
  const weaponActions = activeHero ? buildHeroWeaponActions(activeHero) : [];
  const spellBuckets = activeHero ? buildHeroSpellTierBuckets(activeHero, spells, learnedSpellIds) : new Map<number, BattleActionSpec[]>();
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
    delayPct: 0.72,
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
    delayPct: 1,
    vfxKey: "wind",
    effectText: b.isBossBattle
      ? "Cannot retreat from a Dimensional Portal Guardian."
      : "Withdraw safely back onto Ethoria's map without losing items.",
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
        heroHpPct[h.heroId] = h.curHp <= 0 ? 1 : Math.max(1, Math.min(100, Math.round((h.curHp / Math.max(1, h.maxHp)) * 100)));
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

        {/* 2. Top Turn Timeline & Prompt Banner */}
        <div className="battle-turn-bar">
          {timelinePips.map((pip, idx) => (
            <div
              key={`${pip.id}_${idx}`}
              className={`battle-turn-pip ${pip.kind === "enemy" ? "foe" : ""} ${pip.isActive ? "active" : ""}`}
            >
              <img src={assetUrl(pip.iconPath)} alt="" draggable={false} />
              <span>{pip.name.split(" ")[0]}</span>
              {pip.isTelegraphed && <span className="text-[#ff9c9c] font-black">!</span>}
            </div>
          ))}
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
            return (
              <div
                key={unit.instanceId}
                ref={(el) => {
                  if (el) enemyElRefs.current.set(unit.instanceId, el);
                  else enemyElRefs.current.delete(unit.instanceId);
                }}
                onClick={() => {
                  if (!activeHero) return;
                  const chosenAct =
                    armedAction && (armedAction.targetScope === "enemy" || armedAction.targetScope === "all_enemies")
                      ? armedAction
                      : weaponActions[0];
                  if (chosenAct) void executeHeroAction(chosenAct, unit.instanceId);
                }}
                style={{ left: `${xPct}%`, top: `${yPct}%`, width: `${wPct}%`, height: `${hPct}%`, zIndex }}
                className={[
                  "battle-enemy-unit",
                  eg.flipRight || unit.flipX ? "face-right" : "",
                  isTargetable ? "is-targetable" : "",
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
                  disabled={noMp}
                  onMouseEnter={() =>
                    setHoverTip({
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
                    })
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

        {/* 7. Floating Hotbar Tooltip */}
        {hoverTip && (
          <div
            style={{ bottom: "calc(clamp(20px, 3.6%, 40px) + 74px)" }}
            className="absolute left-1/2 -translate-x-1/2 w-[min(300px,calc(100%-24px))] rounded-lg border-[1.5px] border-[#c9a356] bg-[#101522]/96 px-3 py-2 pointer-events-none z-40 shadow-2xl flex flex-col gap-1.5"
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
                  onMouseEnter={() =>
                    setHoverTip({
                      title: act.name,
                      subtitle: act.categoryLabel,
                      icon: act.iconPath,
                      pills: [{ label: activeHero.weaponSubType }, { label: act.damageType }, { label: act.badge }],
                      effect: act.effectText,
                      hint: "Click an enemy on the left to strike",
                    })
                  }
                  onMouseLeave={() => setHoverTip(null)}
                  onClick={() => handleHotbarSlotClick(act)}
                  className={`battle-hb-slot border-[#8f6e3f] ${armedAction?.id === act.id ? "is-armed" : ""}`}
                >
                  <img src={assetUrl(act.iconPath)} alt={act.name} className="w-full h-full object-cover" draggable={false} />
                  <span className="absolute top-[2px] left-[3px] px-1 rounded bg-[#07090f]/86 text-[9px] font-extrabold text-[#cdd8ec]">
                    {idx + 1}
                  </span>
                  <span className="absolute bottom-[2px] right-[2px] px-1 py-[1px] rounded bg-[#070a10]/90 border border-[#d7a867]/35 text-[8.5px] font-extrabold text-[#f6cfa0] leading-none">
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
                            onMouseEnter={() =>
                              setHoverTip({
                                title: `Tier ${tierNum} · ${magicTheme.tierNames[tierNum - 1] ?? "Spells"}`,
                                subtitle: `${magicTheme.label} (${tierSpells.length}/2 Learned)`,
                                icon: tierIcon,
                                pills: tierSpells.map((s) => ({ label: `${s.name} (${s.mpCost} MP)`, tone: "mp" as const })),
                                effect: "Click to open this tier's learned spells.",
                              })
                            }
                            onMouseLeave={() => setHoverTip(null)}
                            onClick={() => {
                              audioEngine.playUiClick(0.26);
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
                  onMouseEnter={() =>
                    setHoverTip({
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
                  disabled={Boolean(sysAct.disabledReason)}
                  onMouseEnter={() =>
                    setHoverTip({
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
