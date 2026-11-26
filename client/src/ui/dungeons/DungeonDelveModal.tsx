import React, { useEffect, useMemo, useState } from "react";
import { assetUrl } from "../api";
import { audioEngine } from "../audio";
import { CornerFiligree } from "../components/LocationInteriorModal";
import { getHeroById } from "../heroes";
import type { HeroId, ItemEntry } from "../types";
import {
  canTravelToDelveNode,
  CHEST_ART_BY_VARIANT,
  isExitUnlocked,
  rollDelveChestSilver,
  type DelveChestReward,
  type DelveNode,
  type DelveRunState,
} from "./delveEngine";

interface ActiveLootReveal {
  nodeId: string;
  chest: DelveChestReward;
  silverAmount: number;
  potionId: string;
  potionName: string;
  potionIcon: string;
  tradeGoodId: string;
  tradeGoodName: string;
  tradeGoodIcon: string;
  tradeGoodSell: number;
}

interface ActiveEventShowcase {
  title: string;
  body: string;
  backdropPath: string;
  badgeText: string;
  iconPath?: string;
}

interface DungeonDelveModalProps {
  open: boolean;
  run: DelveRunState | null;
  silver: number;
  partyLevel: number;
  partyOrder: HeroId[];
  heroHpPct: Partial<Record<HeroId, number>>;
  heroLevels: Partial<Record<HeroId, number>>;
  itemsById: Record<string, ItemEntry>;
  onUpdateRun: React.Dispatch<React.SetStateAction<DelveRunState | null>>;
  onOpenParty: () => void;
  onGrantDelveRewards: (rewards: {
    silver?: number;
    potionId?: string;
    tradeGoodId?: string;
    quietToast?: boolean;
  }) => void;
  onCompleteBossObjective: (questId: string) => void;
  onTriggerDelveBattle: (opts: {
    node: DelveNode;
    stageId: string;
    enemies: string[];
    isBoss: boolean;
    bossLeadName?: string;
  }) => void;
  onExitDungeon: () => void;
}

const ENTRY_CREST_ART = "assets/tokens/dungeon_props/prop_stairs_down_01_stone.webp";
const KEY_ICON_ART = "assets/icons/ui/ui_19_key_relic_glyph.webp";
const COIN_ICON_ART = "assets/icons/ui/ui_20_trade_goods_glyph.webp";
const MAP_ICON_ART = "assets/icons/ui/ui_25_world_atlas_glyph.webp";

function mapCellPct(col: number, row: number): { x: number; y: number } {
  return {
    x: 13 + col * 24.5,
    y: 19 + row * 31,
  };
}

export const DungeonDelveModal: React.FC<DungeonDelveModalProps> = ({
  open,
  run,
  silver,
  partyLevel,
  partyOrder,
  heroHpPct,
  itemsById,
  onUpdateRun,
  onOpenParty,
  onGrantDelveRewards,
  onCompleteBossObjective,
  onTriggerDelveBattle,
  onExitDungeon,
}) => {
  const [mapOpen, setMapOpen] = useState(false);
  const [lootReveal, setLootReveal] = useState<ActiveLootReveal | null>(null);
  const [eventShowcase, setEventShowcase] = useState<ActiveEventShowcase | null>(null);

  const currentNode = run ? run.nodesById[run.currentNodeId] ?? null : null;

  const chestCountSummary = useMemo(() => {
    if (!run) return { opened: 0, total: 0 };
    let total = 0;
    let opened = 0;
    for (const id of run.nodeOrder) {
      const c = run.nodesById[id]?.chest;
      if (c) {
        total += 1;
        if (c.opened) opened += 1;
      }
    }
    return { opened, total };
  }, [run]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        if (lootReveal) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return;
        }
        if (eventShowcase) {
          e.preventDefault();
          e.stopImmediatePropagation();
          setEventShowcase(null);
          return;
        }
        if (mapOpen) {
          e.preventDefault();
          e.stopImmediatePropagation();
          setMapOpen(false);
          return;
        }
      }
      if ((e.code === "KeyM" || e.key.toLowerCase() === "m") && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (!lootReveal && !eventShowcase) {
          e.preventDefault();
          audioEngine.playUiClick(0.32);
          setMapOpen((v) => !v);
        }
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, mapOpen, lootReveal, eventShowcase]);

  if (!open || !run || !currentNode) return null;

  const isSealedBossState = currentNode.nodeId === "sluice_boss" && run.flags.grateSealed;
  const activeBackdropPath =
    isSealedBossState && currentNode.altBackdropPath
      ? currentNode.altBackdropPath
      : currentNode.backdropPath;

  const narrativeText = (() => {
    if (currentNode.interact?.done && currentNode.altText) return currentNode.altText;
    if (currentNode.hasCombat && currentNode.combatCleared && currentNode.clearedText) {
      return currentNode.clearedText;
    }
    return currentNode.description;
  })();

  const moveToNode = (targetId: string) => {
    if (!canTravelToDelveNode(run, targetId)) return;
    audioEngine.playDoorOpen();
    setMapOpen(false);
    onUpdateRun((prev) => {
      if (!prev) return prev;
      const visited = prev.visitedNodeIds.includes(targetId)
        ? prev.visitedNodeIds
        : [...prev.visitedNodeIds, targetId];
      return {
        ...prev,
        currentNodeId: targetId,
        visitedNodeIds: visited,
      };
    });
  };

  const handleOpenChestModal = () => {
    const chest = currentNode.chest;
    if (!chest || chest.opened) return;
    const earnedSilver = rollDelveChestSilver(chest.silverMin, chest.silverMax);
    const potPool = chest.potionIds.length ? chest.potionIds : ["cons_minor_healing_potion"];
    const potId = potPool[Math.floor(Math.random() * potPool.length)] ?? "cons_minor_healing_potion";
    const tgPool = chest.tradeGoodIds.length ? chest.tradeGoodIds : ["tg_r1_bandit_rusty_coin_purse"];
    const tgId = tgPool[Math.floor(Math.random() * tgPool.length)] ?? "tg_r1_bandit_rusty_coin_purse";

    const potItem = itemsById[potId];
    const tgItem = itemsById[tgId];

    audioEngine.playDoorOpen();
    setLootReveal({
      nodeId: currentNode.nodeId,
      chest,
      silverAmount: earnedSilver,
      potionId: potId,
      potionName: potItem?.name ?? "Healing Potion",
      potionIcon: potItem?.iconPath ?? "assets/icons/items/cons_minor_healing_potion.webp",
      tradeGoodId: tgId,
      tradeGoodName: tgItem?.name ?? "Salvaged Pouch",
      tradeGoodIcon: tgItem?.iconPath ?? COIN_ICON_ART,
      tradeGoodSell: tgItem?.sellSilver ?? 18,
    });
  };

  const handleClaimLootReveal = () => {
    if (!lootReveal) return;
    const { nodeId, silverAmount, potionId, potionName, tradeGoodId, tradeGoodName } = lootReveal;
    onGrantDelveRewards({
      silver: silverAmount,
      potionId,
      tradeGoodId,
      quietToast: true,
    });
    audioEngine.playDiscovery();
    onUpdateRun((prev) => {
      if (!prev) return prev;
      const node = prev.nodesById[nodeId];
      if (!node || !node.chest) return prev;
      return {
        ...prev,
        nodesById: {
          ...prev.nodesById,
          [nodeId]: {
            ...node,
            chest: {
              ...node.chest,
              opened: true,
              earnedSilver: silverAmount,
              earnedPotionId: potionId,
              earnedPotionName: potionName,
              earnedTradeGoodId: tradeGoodId,
              earnedTradeGoodName: tradeGoodName,
            },
          },
        },
      };
    });
    setLootReveal(null);
  };

  const handleRoomInteract = () => {
    const act = currentNode.interact;
    if (!act || act.done) return;
    if (act.requiresCombatCleared && !currentNode.combatCleared) return;

    audioEngine.playDiscovery();
    onUpdateRun((prev) => {
      if (!prev) return prev;
      const nextFlags = { ...prev.flags };
      if (act.setsFlag) nextFlags[act.setsFlag] = true;
      const node = prev.nodesById[currentNode.nodeId];
      return {
        ...prev,
        flags: nextFlags,
        nodesById: node
          ? {
              ...prev.nodesById,
              [node.nodeId]: {
                ...node,
                interact: node.interact ? { ...node.interact, done: true } : null,
              },
            }
          : prev.nodesById,
      };
    });

    if (act.kind === "seal_grate") {
      onCompleteBossObjective(run.questId);
    }

    const showcaseBackdrop =
      act.kind === "seal_grate" && currentNode.altBackdropPath
        ? currentNode.altBackdropPath
        : currentNode.backdropPath;

    setEventShowcase({
      title: act.bannerTitle,
      body: act.bannerText,
      backdropPath: showcaseBackdrop,
      badgeText:
        act.kind === "seal_grate"
          ? "Quest Objective Secured"
          : act.kind === "claim_key"
            ? "Key Acquired"
            : "Passage Altered",
      iconPath: act.kind === "claim_key" ? KEY_ICON_ART : ENTRY_CREST_ART,
    });
  };

  const startCombat = () => {
    const enemies = currentNode.enemyIds?.length ? currentNode.enemyIds : ["mob_bandit", "mob_wolf"];
    audioEngine.playUiClick(0.45);
    onTriggerDelveBattle({
      node: currentNode,
      stageId: run.battleStageId,
      enemies,
      isBoss: Boolean(currentNode.isBoss),
      bossLeadName: currentNode.bossLeadName,
    });
  };

  const isChestAvailable = Boolean(
    currentNode.chest &&
      (!currentNode.chest.requiresFlag ||
        (currentNode.chest.requiresFlag === "combat"
          ? currentNode.combatCleared
          : run.flags[currentNode.chest.requiresFlag]))
  );

  const isInteractAvailable = Boolean(
    currentNode.interact &&
      (!currentNode.interact.requiresCombatCleared || currentNode.combatCleared)
  );

  const canStepForward = !currentNode.hasCombat || currentNode.combatCleared;

  // Compute all fog-of-war nodes visible in Cartographer Map: visited + direct neighbors of visited
  const visibleMapNodeIds = new Set<string>(run.visitedNodeIds);
  for (const vid of run.visitedNodeIds) {
    const vn = run.nodesById[vid];
    if (!vn) continue;
    for (const ex of vn.exits) visibleMapNodeIds.add(ex.targetNodeId);
  }

  return (
    <div
      className="fixed inset-0 z-[25] overflow-hidden bg-[#06090f] flex flex-col justify-between select-none animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label={`${run.locationTitle} — ${currentNode.title}`}
    >
      {/* Full-bleed 16:9 Chamber Illustration Backdrop */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <img
          key={activeBackdropPath}
          src={assetUrl(activeBackdropPath)}
          alt={currentNode.title}
          className="w-full h-full object-cover object-center animate-fadeIn"
        />
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#05080d]/84 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#05080d]/92 via-[#05080d]/42 to-transparent" />
      </div>

      {/* Slim Single-Row Header */}
      <header className="relative z-10 flex items-center justify-between gap-3 px-4 md:px-6 pt-3 pb-1">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src={assetUrl(ENTRY_CREST_ART)}
            alt=""
            className="w-9 h-9 object-contain shrink-0 drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)]"
            draggable={false}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display m-0 text-[18px] md:text-[22px] font-bold tracking-[0.04em] text-[#fae4b0] leading-none truncate">
                {run.locationTitle}
              </h1>
              <span className="px-2 py-0.5 rounded-sm border border-[#d7b267]/35 bg-[#121722]/85 text-[10px] font-bold tracking-wider uppercase text-[#e6c77f] shrink-0">
                {run.visitedNodeIds.length}/{run.nodeOrder.length} Explored · {chestCountSummary.opened}/{chestCountSummary.total} Chests
              </span>
              {run.flags.grateSealed && (
                <span className="px-2 py-0.5 rounded-sm border border-[#67c785]/65 bg-[#133120]/90 text-[10px] font-bold tracking-wider uppercase text-[#b5f4ca] shrink-0">
                  ✓ Breach Sealed
                </span>
              )}
            </div>
            <div className="text-[11px] uppercase tracking-[0.12em] text-[#c2cde0] mt-0.5 truncate">
              {run.questTitle}
            </div>
          </div>
        </div>

        {/* Right Controls: Keyring Badges + Map (M) + Party (P) + Exit */}
        <div className="flex items-center gap-2 shrink-0">
          {run.flags.hasVaultKey && (
            <div
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-[#d7b267]/75 bg-[#20190d]/92 text-[11px] font-bold text-[#fae2aa] shadow"
              title="Unlocks the Sealed Watch Treasury east of the Barracks"
            >
              <img src={assetUrl(KEY_ICON_ART)} alt="" className="w-4 h-4 object-contain" />
              <span>Vault Key</span>
            </div>
          )}
          {run.flags.channelDrained && (
            <div
              className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded border border-[#5694c4]/65 bg-[#102030]/90 text-[11px] font-semibold text-[#b8e0ff] shadow"
              title="Central underpass drained dry"
            >
              <span>Water Drained</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              audioEngine.playUiClick(0.35);
              setMapOpen((v) => !v);
            }}
            className={[
              "flex items-center gap-1.5 px-3 py-1.5 rounded border text-[11.5px] font-bold transition cursor-pointer shadow backdrop-blur-sm",
              mapOpen
                ? "border-[#f3d184] bg-[#2a2112]/95 text-[#fff4d6]"
                : "border-[#6e5936]/90 hover:border-[#d7b267] bg-[#0e121b]/88 hover:bg-[#171e2d] text-[#f0dab0]",
            ].join(" ")}
            title="View Aqueduct Dungeon Map (M)"
          >
            <img src={assetUrl(MAP_ICON_ART)} alt="" className="w-4 h-4 object-contain" />
            <span>Map (M)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audioEngine.playUiClick();
              onOpenParty();
            }}
            className="flex items-center gap-2 rounded border border-[#4a5266]/90 hover:border-[#c8a35a] bg-[#0e121b]/88 hover:bg-[#171d2b]/95 backdrop-blur-sm px-2.5 py-1 cursor-pointer transition-colors shadow"
            title="Open Party, Potions & Equipment (P)"
          >
            <div className="flex items-center -space-x-1">
              {partyOrder.slice(0, 4).map((hid) => {
                const hero = getHeroById(hid);
                const hp = Math.max(0, Math.min(100, Math.round((heroHpPct[hid] ?? 1) * 100)));
                const barCls = hp > 55 ? "bg-[#43a668]" : hp > 25 ? "bg-[#d49635]" : "bg-[#c84646]";
                return (
                  <div key={hid} className="flex flex-col items-center">
                    <img
                      src={assetUrl(hero.avatarPath)}
                      alt={hero.name}
                      draggable={false}
                      className="w-[24px] h-[24px] rounded-full object-cover border border-[#8e7445]"
                    />
                    <span className="w-[20px] h-[2px] bg-[#1a202d] rounded-full overflow-hidden mt-[1px]">
                      <span className={`block h-full ${barCls}`} style={{ width: `${hp}%` }} />
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="text-left">
              <div className="text-[11px] font-bold text-[#f2dba6] leading-tight">
                {silver.toLocaleString()}s
              </div>
              <div className="text-[9.5px] text-[#9aa8be] leading-tight">
                Party Lv {partyLevel}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              audioEngine.playSfx("ui_close", 0.28);
              onExitDungeon();
            }}
            className={[
              "px-3.5 py-2 rounded border text-[11.5px] font-semibold tracking-wider uppercase cursor-pointer transition-colors shadow backdrop-blur-sm",
              run.flags.grateSealed
                ? "border-[#71d691] bg-[#1b462c]/95 hover:bg-[#235a39] text-[#ecfff2]"
                : "border-[#7c653e] hover:border-[#e5c174] bg-[#10141e]/88 hover:bg-[#1b2232] text-[#efe0bc] hover:text-[#fff4d2]",
            ].join(" ")}
          >
            {run.flags.grateSealed ? "Return (Esc)" : "Climb Out (Esc)"}
          </button>
        </div>
      </header>

      {/* Slim Single-Row Chamber Narrative + Named Directional Exits */}
      <div className="relative z-10 w-full max-w-[1100px] mx-auto px-4 md:px-6 pb-3.5 md:pb-5">
        <section className="ledger-panel relative w-full rounded-[4px] px-4 py-3 md:px-5 md:py-3.5">
          <CornerFiligree size="sm" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Chamber Title & Description */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span
                  className={[
                    "px-1.5 py-0.5 rounded-sm border text-[9.5px] font-bold uppercase tracking-wider shrink-0",
                    currentNode.isBoss
                      ? run.flags.grateSealed
                        ? "bg-[#143322] border-[#66c785]/60 text-[#b5f2c8]"
                        : "bg-[#38161a] border-[#d96a6a]/70 text-[#ffd5d5]"
                      : currentNode.kind === "secret" || currentNode.kind === "vault"
                        ? "bg-[#241f10] border-[#e0ba6c]/60 text-[#f5dc99]"
                        : "bg-[#1d222e] border-[#6f7e99]/55 text-[#c8d5ea]",
                  ].join(" ")}
                >
                  {currentNode.subtitle}
                </span>
                <h2 className="font-display m-0 text-[16px] md:text-[18px] tracking-[0.04em] text-[#f8e7be] truncate">
                  {currentNode.title}
                </h2>
                {currentNode.hasCombat && currentNode.combatCleared && (
                  <span className="text-[11px] font-bold text-[#95ebb0] shrink-0">✓ Area Secured</span>
                )}
              </div>
              <p className="m-0 text-[12.5px] leading-[1.42] text-[#d6dfee] max-w-[600px]">
                {narrativeText}
              </p>
            </div>

            {/* Interactive Actions + Directional Passages */}
            <div className="flex flex-wrap items-center justify-start lg:justify-end gap-2 shrink-0 lg:max-w-[520px]">
              {/* Active Combat Threat */}
              {currentNode.hasCombat && !currentNode.combatCleared && (
                <button
                  type="button"
                  onClick={startCombat}
                  className={[
                    "px-3.5 py-1.5 rounded border text-[12.5px] font-bold tracking-wide transition cursor-pointer shadow-md flex items-center gap-1.5",
                    currentNode.isBoss
                      ? "border-[#ef7e6b] bg-gradient-to-b from-[#6e2121] to-[#461313] hover:from-[#862828] hover:to-[#561818] text-[#fff0ea]"
                      : "border-[#e3a858] bg-gradient-to-b from-[#633c18] to-[#3f250e] hover:from-[#7a4b1f] hover:to-[#4f2f12] text-[#fff2d9]",
                  ].join(" ")}
                >
                  <span>{currentNode.isBoss ? "☠" : "⚔"}</span>
                  <span>Fight {currentNode.combatTitle ?? "Ambush"}</span>
                </button>
              )}

              {/* Room Mechanism / Key / Seal Grate Climax */}
              {isInteractAvailable && currentNode.interact && (
                currentNode.interact.done ? (
                  <span className="px-2.5 py-1.5 rounded border border-[#4c7d5c]/65 bg-[#102619]/90 text-[11.5px] font-semibold text-[#a9f0be]">
                    ✓ {currentNode.interact.doneLabel}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleRoomInteract}
                    className={[
                      "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded border text-[12.5px] font-bold transition cursor-pointer shadow-lg",
                      currentNode.interact.kind === "seal_grate"
                        ? "border-[#7ee69e] bg-gradient-to-b from-[#23613c] to-[#143d25] hover:from-[#2d794b] hover:to-[#1a4e30] text-[#effff4] animate-pulse"
                        : currentNode.interact.kind === "claim_key"
                          ? "border-[#f0ca75] bg-gradient-to-b from-[#493716] to-[#2c200b] hover:from-[#5e471c] hover:to-[#3b2b10] text-[#fff4d6]"
                          : "border-[#7fa8d4] bg-gradient-to-b from-[#1d344e] to-[#112031] hover:from-[#274567] hover:to-[#172b42] text-[#dff0ff]",
                    ].join(" ")}
                  >
                    {currentNode.interact.kind === "claim_key" && (
                      <img src={assetUrl(KEY_ICON_ART)} alt="" className="w-4 h-4 object-contain" />
                    )}
                    <span>{currentNode.interact.label}</span>
                  </button>
                )
              )}

              {/* Chest Trigger (Opens Full Treasure Loot Reveal Modal!) */}
              {isChestAvailable && currentNode.chest && (
                currentNode.chest.opened ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-[#4c7d5c]/60 bg-[#102619]/90 text-[11.5px] font-semibold text-[#a9f0be]">
                    <img
                      src={assetUrl(CHEST_ART_BY_VARIANT[currentNode.chest.variant].open)}
                      alt=""
                      className="w-5 h-5 object-contain"
                    />
                    {currentNode.chest.title} Claimed
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleOpenChestModal}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded border border-[#f2cc74] bg-gradient-to-b from-[#4a3614] to-[#2e200a] hover:from-[#62481b] hover:to-[#3e2b0d] text-[12.5px] font-bold text-[#fff4d4] transition cursor-pointer shadow-lg"
                  >
                    <img
                      src={assetUrl(CHEST_ART_BY_VARIANT[currentNode.chest.variant].closed)}
                      alt=""
                      className="w-5 h-5 object-contain"
                    />
                    <span>Open {currentNode.chest.title}</span>
                  </button>
                )
              )}

              {/* Boss Finale Return to Highcrown */}
              {currentNode.isBoss && run.flags.grateSealed && (
                <button
                  type="button"
                  onClick={() => {
                    audioEngine.playDoorOpen();
                    onExitDungeon();
                  }}
                  className="px-3.5 py-1.5 rounded border border-[#72d692] bg-gradient-to-b from-[#235d39] to-[#153c24] hover:from-[#2c7246] hover:to-[#1a4b2d] text-[12.5px] font-bold text-[#edfff3] transition cursor-pointer shadow-lg"
                >
                  Return to Highcrown →
                </button>
              )}

              {/* Directional Passage Exits */}
              {currentNode.exits.map((edge) => {
                const target = run.nodesById[edge.targetNodeId];
                if (!target) return null;
                const unlocked = isExitUnlocked(run, edge);
                const visited = run.visitedNodeIds.includes(target.nodeId);
                const blockedByActiveFight = !canStepForward && !visited;
                const disabled = !unlocked || blockedByActiveFight;

                return (
                  <button
                    key={edge.targetNodeId}
                    type="button"
                    disabled={disabled}
                    onClick={() => moveToNode(target.nodeId)}
                    title={
                      !unlocked
                        ? edge.lockedHint ?? "Locked Passage"
                        : blockedByActiveFight
                          ? "Defeat the current threat before pushing forward"
                          : `Enter ${target.title}`
                    }
                    className={[
                      "px-2.5 py-1.5 rounded border text-[11.5px] font-semibold transition flex items-center gap-1.5",
                      disabled
                        ? "border-[#384052]/75 bg-[#0f131c]/80 text-[#728098] cursor-not-allowed"
                        : visited
                          ? "border-[#54627d] hover:border-[#c9a35a] bg-[#141a25]/92 hover:bg-[#1e2636] text-[#cad5e8] hover:text-[#f8e7bc] cursor-pointer"
                          : "border-[#d7b267]/85 bg-gradient-to-b from-[#332714] to-[#20180c] hover:from-[#47371d] hover:to-[#2b2011] text-[#f9e7bc] cursor-pointer shadow",
                    ].join(" ")}
                  >
                    <span className="text-[10px] font-bold px-1 rounded bg-black/30 text-[#d7b267]">
                      {edge.dir}
                    </span>
                    <span>
                      {unlocked
                        ? target.title
                        : edge.requiresFlag === "channelDrained"
                          ? `${target.title} (Flooded)`
                          : `${target.title} (Locked)`}
                    </span>
                    {unlocked && !blockedByActiveFight && <span>→</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* Interactive Toggleable Cartographer Blueprint Map Overlay (M) */}
      {mapOpen && (
        <div
          className="fixed inset-0 z-[32] bg-[#04060b]/76 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setMapOpen(false)}
        >
          <div
            className="rpg-modal-panel relative w-full max-w-[780px] rounded-[6px] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <CornerFiligree />
            <div className="flex items-center justify-between border-b border-[#403828] pb-2.5 mb-3">
              <div>
                <h3 className="font-display m-0 text-[18px] tracking-[0.08em] uppercase text-[#f6e0b1]">
                  Dry Aqueducts — Passage Map
                </h3>
                <p className="m-0 text-[11.5px] text-[#9eb0c9]">
                  Click any discovered chamber along clear passages to backtrack or reposition
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMapOpen(false)}
                className="px-3 py-1 rounded border border-[#6e5936] hover:border-[#e0ba6c] bg-[#161a24] text-[12px] font-bold text-[#edd8aa] cursor-pointer"
              >
                Close (M)
              </button>
            </div>

            <div className="relative w-full h-[310px] rounded border border-[#3a362b] bg-[#090c13]/95 overflow-hidden">
              {/* Grid Corridors */}
              <svg viewBox="0 0 700 310" className="absolute inset-0 w-full h-full pointer-events-none">
                {run.nodeOrder.map((fromId) => {
                  const fromNode = run.nodesById[fromId];
                  if (!fromNode || !visibleMapNodeIds.has(fromId)) return null;
                  const p1 = mapCellPct(fromNode.col, fromNode.row);
                  return fromNode.exits.map((ex) => {
                    if (fromId > ex.targetNodeId) return null; // draw each undirected edge once
                    const toNode = run.nodesById[ex.targetNodeId];
                    if (!toNode || !visibleMapNodeIds.has(toNode.nodeId)) return null;
                    const p2 = mapCellPct(toNode.col, toNode.row);
                    const unlocked = isExitUnlocked(run, ex);
                    const bothVisited =
                      run.visitedNodeIds.includes(fromId) &&
                      run.visitedNodeIds.includes(toNode.nodeId);

                    return (
                      <line
                        key={`${fromId}--${ex.targetNodeId}`}
                        x1={(p1.x / 100) * 700}
                        y1={(p1.y / 100) * 310}
                        x2={(p2.x / 100) * 700}
                        y2={(p2.y / 100) * 310}
                        stroke={
                          !unlocked
                            ? "rgba(216, 102, 102, 0.55)"
                            : bothVisited
                              ? "rgba(224, 186, 108, 0.85)"
                              : "rgba(155, 175, 205, 0.38)"
                        }
                        strokeWidth={bothVisited ? 4 : 2.5}
                        strokeDasharray={!unlocked || !bothVisited ? "6 5" : undefined}
                      />
                    );
                  });
                })}
              </svg>

              {/* Chamber Nodes */}
              {run.nodeOrder.map((nid) => {
                const n = run.nodesById[nid];
                if (!n || !visibleMapNodeIds.has(nid)) return null;
                const pos = mapCellPct(n.col, n.row);
                const isCurrent = nid === run.currentNodeId;
                const isVisited = run.visitedNodeIds.includes(nid);
                const canClick = canTravelToDelveNode(run, nid);

                let tag = "";
                if (n.isBoss) tag = run.flags.grateSealed ? "✓ Sealed" : "☠ Boss";
                else if (n.hasCombat && !n.combatCleared) tag = "⚔ Threat";
                else if (n.chest && !n.chest.opened) tag = "◆ Loot";
                else if (n.interact && !n.interact.done) tag = "⚙ Event";
                else if (isVisited) tag = "✓";

                return (
                  <button
                    key={nid}
                    type="button"
                    disabled={!canClick}
                    onClick={() => moveToNode(nid)}
                    style={{
                      left: `${pos.x}%`,
                      top: `${pos.y}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                    className={[
                      "absolute w-[142px] px-2.5 py-1.5 rounded border text-left transition shadow-md",
                      isCurrent
                        ? "border-[#f3d184] bg-[#2f2411] text-[#fff6db] shadow-[0_0_18px_rgba(232,188,100,0.5)] z-10 cursor-default"
                        : canClick
                          ? "border-[#c79f52]/80 bg-[#151c29] hover:bg-[#1f283b] text-[#f0dab0] cursor-pointer"
                          : isVisited
                            ? "border-[#4b6755] bg-[#101816] text-[#b4d9c0]"
                            : "border-[#3c4659] bg-[#101520]/90 text-[#8695ae] cursor-not-allowed",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-1 text-[10px] font-bold uppercase tracking-wider">
                      <span className="truncate text-[#cdb276]">
                        {isVisited ? n.subtitle : "Adjacent"}
                      </span>
                      {tag && <span>{tag}</span>}
                    </div>
                    <div className="text-[11.5px] font-semibold truncate mt-0.5">
                      {isVisited || canClick ? n.title : "Unexplored Wing"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Dramatic Treasure Chest Loot Reveal Screen */}
      {lootReveal && (
        <div className="fixed inset-0 z-[36] bg-[#04060b]/82 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="rpg-modal-panel relative w-full max-w-[540px] rounded-[6px] p-6 text-center shadow-[0_30px_90px_rgba(0,0,0,0.92)]">
            <CornerFiligree />

            {/* Glowing Open Chest Artwork */}
            <div className="relative mx-auto w-[112px] h-[112px] mb-2 flex items-center justify-center">
              <div
                className="absolute inset-0 rounded-full blur-xl opacity-65"
                style={{
                  background: "radial-gradient(circle, rgba(242,196,95,0.6) 0%, transparent 72%)",
                }}
              />
              <img
                src={assetUrl(CHEST_ART_BY_VARIANT[lootReveal.chest.variant].open)}
                alt={lootReveal.chest.title}
                className="relative w-full h-full object-contain drop-shadow-[0_12px_22px_rgba(0,0,0,0.9)]"
              />
            </div>

            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#d9b66b]">
              Treasure Unlocked
            </div>
            <h3 className="font-display m-0 mt-1 text-[22px] tracking-[0.06em] text-[#fff0c6]">
              {lootReveal.chest.title}
            </h3>

            {/* Itemized Spoils Cards */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-left">
              {/* Silver Spoils */}
              <div className="rounded border border-[#8e7442]/80 bg-[#171b24]/95 p-3 flex flex-col items-center text-center">
                <img
                  src={assetUrl(COIN_ICON_ART)}
                  alt=""
                  className="w-11 h-11 object-contain mb-1.5 drop-shadow"
                />
                <div className="text-[13px] font-bold text-[#ffe29a]">
                  +{lootReveal.silverAmount} Silver
                </div>
                <div className="text-[10.5px] text-[#9eb0c9]">Currency Pouch</div>
              </div>

              {/* Potion Card */}
              <div className="rounded border border-[#4a6f92]/80 bg-[#141a25]/95 p-3 flex flex-col items-center text-center">
                <img
                  src={assetUrl(lootReveal.potionIcon)}
                  alt=""
                  className="w-11 h-11 object-contain mb-1.5 drop-shadow"
                />
                <div className="text-[12.5px] font-bold text-[#d7ebff] leading-tight">
                  +1 {lootReveal.potionName}
                </div>
                <div className="text-[10.5px] text-[#9eb0c9] mt-0.5">Consumable</div>
              </div>

              {/* Bonus Trade Good / Relic Card */}
              <div className="rounded border border-[#725b38]/80 bg-[#171b24]/95 p-3 flex flex-col items-center text-center">
                <img
                  src={assetUrl(lootReveal.tradeGoodIcon)}
                  alt=""
                  className="w-11 h-11 object-contain mb-1.5 drop-shadow"
                />
                <div className="text-[12.5px] font-bold text-[#f3dfb1] leading-tight">
                  +1 {lootReveal.tradeGoodName}
                </div>
                <div className="text-[10.5px] text-[#9eb0c9] mt-0.5">
                  Value: {lootReveal.tradeGoodSell}s
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClaimLootReveal}
              className="mt-5 w-full py-2.5 rounded border border-[#f2cf7c] bg-gradient-to-b from-[#664b1c] to-[#3f2d0f] hover:from-[#7d5c22] hover:to-[#4f3913] text-[14px] font-bold tracking-wider uppercase text-[#fff6dc] transition cursor-pointer shadow-lg"
            >
              Claim All Spoils
            </button>
          </div>
        </div>
      )}

      {/* Dramatic World State Change / Grate Sealed Celebration Showcase */}
      {eventShowcase && (
        <div className="fixed inset-0 z-[35] bg-[#04060b]/82 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="rpg-modal-panel relative w-full max-w-[620px] rounded-[6px] overflow-hidden shadow-[0_30px_90px_rgba(0,0,0,0.92)]">
            <CornerFiligree />

            <div className="relative h-[220px] w-full overflow-hidden border-b border-[#5b492c]">
              <img
                src={assetUrl(eventShowcase.backdropPath)}
                alt={eventShowcase.title}
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#10131a] via-transparent to-[#06090f]/60" />
              {eventShowcase.iconPath && (
                <div className="absolute bottom-3 left-5 w-12 h-12 rounded border border-[#e0ba6c]/80 bg-[#0d111a]/92 p-1.5 shadow-xl flex items-center justify-center">
                  <img
                    src={assetUrl(eventShowcase.iconPath)}
                    alt=""
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded border border-[#e0ba6c]/60 bg-[#0d111a]/88 text-[10.5px] font-bold uppercase tracking-wider text-[#f3d48c]">
                {eventShowcase.badgeText}
              </span>
            </div>

            <div className="p-5">
              <h3 className="font-display m-0 text-[21px] tracking-[0.06em] text-[#fae4b0]">
                {eventShowcase.title}
              </h3>
              <p className="m-0 mt-2 text-[13.5px] leading-[1.52] text-[#dce4f2]">
                {eventShowcase.body}
              </p>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    audioEngine.playUiClick(0.38);
                    setEventShowcase(null);
                  }}
                  className="px-5 py-2 rounded border border-[#e0ba6c] bg-gradient-to-b from-[#543e18] to-[#34250d] hover:from-[#694d1e] hover:to-[#443111] text-[13px] font-bold uppercase tracking-wider text-[#fff4d6] transition cursor-pointer shadow"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
