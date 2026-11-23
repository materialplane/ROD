import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { assetUrl, flushAutosaveOnUnload, gameApi, loadAudioSettings, saveAudioSetting } from "./api";
import { audioEngine, getTavernMusicContext } from "./audio";
import {
  buildKeepMeta,
  buildTavernMeta,
  getTavernParentId,
  HIGHCROWN_ID,
  HIGHCROWN_KEEP_ID,
  INTERNAL_LOCATION_PARENTS,
  isTavernLocationId,
  LocationInteriorModal,
} from "./components/LocationInteriorModal";
import { ConfirmNewCampaignModal, LoadCampaignModal, PauseMenuModal, SettingsModal } from "./components/Modals";
import { OpeningCutsceneModal } from "./components/OpeningCutsceneModal";
import { OverworldCanvas, type OverworldEncounterTrigger, type PlayerRuntimeRef } from "./components/OverworldCanvas";
import { CharacterSelectModal, PartyMenuModal } from "./components/PartyModals";
import { TitleScreen } from "./components/TitleScreen";
import { BattleOverlay, type BattleOutcomeResult } from "./battle/BattleOverlay";
import { createBattleState } from "./battle/battleLogic";
import type { BattleState } from "./battle/battleTypes";
import { DEFAULT_PARTY_ORDER, getHeroById, normalizePartyOrder } from "./heroes";
import {
  applyHeroXpGain,
  getAveragePartyLevel,
  getHeroAttributes,
  getHeroLevel,
  getHeroXp,
  normalizeHeroLevelsMap,
  normalizeHeroXpMap,
  resolveEquipFromBag,
  resolveSwapHands,
  resolveUnequipSlot,
} from "./party/partyLogic";
import type { BuyConfirmChoice } from "./shops/ShopCounterPanel";
import { countRegionSpellsForHero, itemSlotForHero, MAX_SPELLS_PER_REGION } from "./shops/shopLogic";
import type {
  AudioSettings,
  BattleConfigData,
  ChosenDisciplinesMap,
  DisciplineOption,
  EquippedGearMap,
  GearSlot,
  HeroAttrKey,
  HeroAttrMap,
  HeroDisciplinesEntry,
  HeroId,
  HeroSocketsMap,
  ItemEntry,
  MapMeta,
  NpcLocationGroup,
  QuestEntry,
  RunestoneItem,
  SaveSlotData,
  SpellEntry,
  WorldLocation,
} from "./types";
import { buildWorldCollisionIndex, type WorldCollisionIndex } from "./worldCollision";

const SESSION_ACTIVE_KEY = "rod_active_game";

/** Places a fresh campaign party directly outside Highcrown's current coordinates. */
function computeHighcrownSpawn(
  locations: WorldLocation[],
  fallbackSpawn: { x: number; y: number },
  mapWidth: number,
  mapHeight: number
): { x: number; y: number } {
  const highcrown = locations.find(
    (l) => l.id === HIGHCROWN_ID && l.placed && l.x !== null && l.y !== null
  );
  if (!highcrown || highcrown.x === null || highcrown.y === null) {
    return fallbackSpawn;
  }
  const scale = highcrown.scale ?? 1.0;
  const walkRadius = Math.max(46, Math.min(82, 148 * scale * 0.36));
  const entryRadius = Math.max(highcrown.triggerRadius ?? 104, 148 * scale * 0.72);
  const targetDist = Math.max(walkRadius + 32, Math.min(entryRadius - 12, Math.max(148 * scale * 0.5 + 36, walkRadius + 32)));
  const offset = Math.round(targetDist * 0.707);
  return {
    x: Math.max(96, Math.min(mapWidth - 96, Math.round(highcrown.x - offset))),
    y: Math.max(96, Math.min(mapHeight - 96, Math.round(highcrown.y + offset))),
  };
}

export const STARTING_CAMPAIGN_SILVER = 250;

export const App: React.FC = () => {
  const [screen, setScreen] = useState<"title" | "game">("title");
  const [restoringSession, setRestoringSession] = useState<boolean>(() => {
    try {
      return typeof window !== "undefined" && !window.rodApi && sessionStorage.getItem(SESSION_ACTIVE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [fading, setFading] = useState(false);

  const [latestSave, setLatestSave] = useState<SaveSlotData | null>(null);
  const [savesList, setSavesList] = useState<SaveSlotData[]>([]);
  const [confirmNewOpen, setConfirmNewOpen] = useState(false);
  const [charSelectOpen, setCharSelectOpen] = useState(false);
  const [openingCutsceneOpen, setOpeningCutsceneOpen] = useState(false);
  const [partyOpen, setPartyOpen] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const launchingWorldRef = useRef(false);

  const [partyOrder, setPartyOrder] = useState<HeroId[]>(DEFAULT_PARTY_ORDER);
  const [heroLevels, setHeroLevels] = useState<Partial<Record<HeroId, number>>>(() => normalizeHeroLevelsMap(undefined, 1));
  const [heroXp, setHeroXp] = useState<Partial<Record<HeroId, number>>>(() => normalizeHeroXpMap(undefined, 0));
  const partyLevel = useMemo(() => getAveragePartyLevel(heroLevels, partyOrder, 1), [heroLevels, partyOrder]);
  const leaderXp = getHeroXp(heroXp, partyOrder[0] ?? "valen");

  const [audio, setAudio] = useState<AudioSettings>(() => loadAudioSettings());
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [mapMeta, setMapMeta] = useState<MapMeta | null>(null);
  const [worldLocations, setWorldLocations] = useState<WorldLocation[]>([]);
  const [worldCollision, setWorldCollision] = useState<WorldCollisionIndex | null>(null);
  const [npcsByLocation, setNpcsByLocation] = useState<Record<string, NpcLocationGroup>>({});
  const [questsCatalog, setQuestsCatalog] = useState<QuestEntry[]>([]);
  const [questsByKey, setQuestsByKey] = useState<Record<string, QuestEntry>>({});
  const [itemsCatalog, setItemsCatalog] = useState<ItemEntry[]>([]);
  const [spellsCatalog, setSpellsCatalog] = useState<SpellEntry[]>([]);
  const [disciplinesByHero, setDisciplinesByHero] = useState<Partial<Record<HeroId, HeroDisciplinesEntry>>>({});
  const [battleConfig, setBattleConfig] = useState<BattleConfigData | null>(null);
  const [silver, setSilver] = useState<number>(STARTING_CAMPAIGN_SILVER);
  const [equippedByHero, setEquippedByHero] = useState<EquippedGearMap>({});
  const [bagCounts, setBagCounts] = useState<Record<string, number>>({});
  const [learnedSpellIds, setLearnedSpellIds] = useState<string[]>([]);
  const [chosenDisciplinesByHero, setChosenDisciplinesByHero] = useState<ChosenDisciplinesMap>({});
  const [tradeGoodCounts, setTradeGoodCounts] = useState<Record<string, number>>({});
  const [heroSpentAttrs, setHeroSpentAttrs] = useState<Partial<Record<HeroId, HeroAttrMap>>>({});
  const [socketsByHero, setSocketsByHero] = useState<HeroSocketsMap>({});
  const [runestonesBag, setRunestonesBag] = useState<RunestoneItem[]>([]);
  const [heroHpPct, setHeroHpPct] = useState<Partial<Record<HeroId, number>>>({});
  const [heroMpPct, setHeroMpPct] = useState<Partial<Record<HeroId, number>>>({});
  const [sealedPortalIds, setSealedPortalIds] = useState<string[]>([]);
  const [activeBattle, setActiveBattle] = useState<BattleState | null>(null);
  const liveBattleRef = useRef<BattleState | null>(null);
  const [activeLocationId, setActiveLocationId] = useState<string | null>(null);
  const [interiorTrail, setInteriorTrail] = useState<string[]>([]);
  const [innResting, setInnResting] = useState(false);
  const [acceptedQuestIds, setAcceptedQuestIds] = useState<string[]>([]);
  const [initialDiscovered, setInitialDiscovered] = useState<string[]>([]);
  const [spawnState, setSpawnState] = useState<{ x: number; y: number; playtime: number }>({
    x: 5429,
    y: 5730,
    playtime: 0,
  });

  const runtimeRef = useRef<PlayerRuntimeRef>({
    x: 5429,
    y: 5730,
    playtime: 0,
    mapId: "map_01",
    regionLabel: "The Crownlands",
    discoveredLocations: [],
  });

  // Disable default right-click menu & browser Ctrl/pinch zoom (keep normal wheel scroll working)
  useEffect(() => {
    const noMenu = (e: MouseEvent) => e.preventDefault();
    const noWheelZoom = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) e.preventDefault();
    };
    window.addEventListener("contextmenu", noMenu);
    window.addEventListener("wheel", noWheelZoom, { passive: false });
    return () => {
      window.removeEventListener("contextmenu", noMenu);
      window.removeEventListener("wheel", noWheelZoom);
    };
  }, []);

  const refreshLatest = useCallback(async () => {
    const latest = await gameApi.getLatestSave();
    setLatestSave(latest);
    return latest;
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => {
      setToastMsg((cur) => (cur === msg ? null : cur));
    }, 2000);
  }, []);

  const itemsById = useMemo<Record<string, ItemEntry>>(
    () => Object.fromEntries(itemsCatalog.map((it) => [it.id, it])),
    [itemsCatalog]
  );

  const loadWorldAssets = useCallback(
    async (targetMapId?: string): Promise<{ meta: MapMeta; locations: WorldLocation[]; items: ItemEntry[] }> => {
      const desiredMap = targetMapId || mapMeta?.id || "map_01";
      let meta = mapMeta && mapMeta.id === desiredMap ? mapMeta : null;
      if (!meta) {
        const resp = await fetch(assetUrl(`assets/maps/${desiredMap}/meta.json?t=${Date.now()}`));
        meta = (await resp.json()) as MapMeta;
        setMapMeta(meta);
      }
    const bust = Date.now();
    let loadedLocations: WorldLocation[] = [];
    let loadedItems: ItemEntry[] = itemsCatalog;
    try {
      const [wResp, nResp, qResp, iResp, sResp, pResp, dResp, bResp] = await Promise.all([
        fetch(assetUrl(`assets/data/world-locations.json?t=${bust}`)),
        fetch(assetUrl(`assets/data/npcs-catalog.json?t=${bust}`)),
        fetch(assetUrl(`assets/data/quests-catalog.json?t=${bust}`)),
        fetch(assetUrl(`assets/data/items-catalog.json?t=${bust}`)),
        fetch(assetUrl(`assets/data/spells-catalog.json?t=${bust}`)),
        fetch(assetUrl(`assets/data/world-paint.json?t=${bust}`)),
        fetch(assetUrl(`assets/data/disciplines-catalog.json?t=${bust}`)),
        fetch(assetUrl(`assets/data/battle-config.json?t=${bust}`)),
      ]);
      if (dResp.ok) {
        const parsed = (await dResp.json()) as { heroes?: HeroDisciplinesEntry[] };
        const dMap: Partial<Record<HeroId, HeroDisciplinesEntry>> = {};
        for (const hEntry of parsed.heroes ?? []) {
          dMap[hEntry.heroId] = hEntry;
        }
        setDisciplinesByHero(dMap);
      }
      if (bResp.ok) {
        const parsed = (await bResp.json()) as BattleConfigData;
        setBattleConfig(parsed);
      }
      if (wResp.ok) {
        const parsed = (await wResp.json()) as { locations?: WorldLocation[] };
        loadedLocations = parsed.locations ?? [];
        setWorldLocations(loadedLocations);
      }
      if (pResp.ok) {
        const parsedPaint = (await pResp.json()) as unknown;
        setWorldCollision(buildWorldCollisionIndex(parsedPaint));
      }
      if (nResp.ok) {
        const parsed = (await nResp.json()) as { locations?: NpcLocationGroup[] };
        const map: Record<string, NpcLocationGroup> = {};
        for (const entry of parsed.locations ?? []) {
          map[entry.locationId] = entry;
        }
        setNpcsByLocation(map);
      }
      if (qResp.ok) {
        const parsed = (await qResp.json()) as { quests?: QuestEntry[] };
        const loadedQuests = parsed.quests ?? [];
        setQuestsCatalog(loadedQuests);
        const qMap: Record<string, QuestEntry> = {};
        for (const q of loadedQuests) {
          qMap[`${q.hubId}::${q.title}`] = q;
          if (!qMap[q.title]) qMap[q.title] = q;
        }
        setQuestsByKey(qMap);
      }
      if (iResp.ok) {
        const parsed = (await iResp.json()) as { items?: ItemEntry[] };
        loadedItems = parsed.items ?? [];
        setItemsCatalog(loadedItems);
      }
      if (sResp.ok) {
        const parsed = (await sResp.json()) as { spells?: SpellEntry[] };
        setSpellsCatalog(parsed.spells ?? []);
      }
    } catch {
      setWorldLocations([]);
    }
    return { meta, locations: loadedLocations, items: loadedItems };
  }, [mapMeta, itemsCatalog]);

  const fadeTransition = useCallback(async (work: () => Promise<void> | void) => {
    setFading(true);
    try {
      await new Promise((r) => window.setTimeout(r, 280));
      await work();
    } finally {
      setFading(false);
    }
  }, []);

  const saveToEnterInventoryOverride = (save: SaveSlotData) => ({
    silver: save.silver,
    equippedByHero: save.equippedByHero,
    bagCounts: save.bagCounts,
    learnedSpellIds: save.learnedSpellIds,
    tradeGoodCounts: save.tradeGoodCounts,
    heroSpentAttrs: save.heroSpentAttrs,
    socketsByHero: save.socketsByHero,
    runestonesBag: save.runestonesBag,
    heroHpPct: save.heroHpPct,
    heroMpPct: save.heroMpPct,
    chosenDisciplinesByHero: save.chosenDisciplinesByHero,
    heroLevels: save.heroLevels,
    heroXp: save.heroXp,
    partyXp: save.partyXp,
    sealedPortalIds: save.sealedPortalIds,
    mapId: save.mapId,
    activeBattle: save.activeBattle ?? null,
  });

  const buildSavePayload = useCallback(
    (
      slotId: string,
      label: string,
      override?: {
        x: number;
        y: number;
        playtime: number;
        meta: MapMeta;
        order?: HeroId[];
        lvl?: number;
        discovered?: string[];
        acceptedQuests?: string[];
        sealedPortalIds?: string[];
        silver?: number;
        equippedByHero?: EquippedGearMap;
        bagCounts?: Record<string, number>;
        learnedSpellIds?: string[];
        tradeGoodCounts?: Record<string, number>;
        heroSpentAttrs?: Partial<Record<HeroId, HeroAttrMap>>;
        socketsByHero?: HeroSocketsMap;
        runestonesBag?: RunestoneItem[];
        heroHpPct?: Partial<Record<HeroId, number>>;
        heroMpPct?: Partial<Record<HeroId, number>>;
        chosenDisciplinesByHero?: ChosenDisciplinesMap;
        heroLevels?: Partial<Record<HeroId, number>>;
        heroXp?: Partial<Record<HeroId, number>>;
        partyXp?: number;
        activeBattle?: BattleState | null;
      }
    ): SaveSlotData | null => {
      const meta = override?.meta ?? mapMeta;
      if (!meta) return null;
      const order = override?.order ?? partyOrder;
      const nextLevels = override?.heroLevels ?? heroLevels;
      const nextXp = override?.heroXp ?? heroXp;
      const lvl = override?.lvl ?? getAveragePartyLevel(nextLevels, order, partyLevel);
      const leader = getHeroById(order[0]);
      const x = override ? override.x : runtimeRef.current.x;
      const y = override ? override.y : runtimeRef.current.y;
      const playtime = override ? override.playtime : runtimeRef.current.playtime;
      const discovered = override?.discovered ?? runtimeRef.current.discoveredLocations;
      const quests = override?.acceptedQuests ?? acceptedQuestIds;
      const savedBattle =
        override && "activeBattle" in override
          ? override.activeBattle ?? null
          : slotId === "autosave"
            ? liveBattleRef.current
            : null;
      return {
        slotId,
        label,
        mapId: meta.id,
        regionLabel: runtimeRef.current.regionLabel || meta.regionLabel,
        heroId: leader.id,
        heroName: leader.name,
        partyOrder: order,
        discoveredLocations: discovered,
        acceptedQuestIds: quests,
        sealedPortalIds: override?.sealedPortalIds ?? sealedPortalIds,
        silver: override?.silver ?? silver,
        equippedByHero: override?.equippedByHero ?? equippedByHero,
        bagCounts: override?.bagCounts ?? bagCounts,
        learnedSpellIds: override?.learnedSpellIds ?? learnedSpellIds,
        chosenDisciplinesByHero: override?.chosenDisciplinesByHero ?? chosenDisciplinesByHero,
        heroLevels: nextLevels,
        heroXp: nextXp,
        partyXp: override?.partyXp ?? getHeroXp(nextXp, leader.id),
        tradeGoodCounts: override?.tradeGoodCounts ?? tradeGoodCounts,
        heroSpentAttrs: override?.heroSpentAttrs ?? heroSpentAttrs,
        socketsByHero: override?.socketsByHero ?? socketsByHero,
        runestonesBag: override?.runestonesBag ?? runestonesBag,
        heroHpPct: override?.heroHpPct ?? heroHpPct,
        heroMpPct: override?.heroMpPct ?? heroMpPct,
        activeBattle: savedBattle,
        level: lvl,
        x: Math.round(x),
        y: Math.round(y),
        playtimeSeconds: Math.floor(playtime),
        savedAt: new Date().toISOString(),
      };
    },
    [
      mapMeta,
      partyOrder,
      partyLevel,
      heroLevels,
      heroXp,
      acceptedQuestIds,
      sealedPortalIds,
      silver,
      equippedByHero,
      bagCounts,
      learnedSpellIds,
      chosenDisciplinesByHero,
      tradeGoodCounts,
      heroSpentAttrs,
      socketsByHero,
      runestonesBag,
      heroHpPct,
      heroMpPct,
    ]
  );

  const persistSave = useCallback(
    async (
      slotId: string,
      label: string,
      override?: {
        x: number;
        y: number;
        playtime: number;
        meta: MapMeta;
        order?: HeroId[];
        lvl?: number;
        discovered?: string[];
        acceptedQuests?: string[];
        sealedPortalIds?: string[];
        silver?: number;
        equippedByHero?: EquippedGearMap;
        bagCounts?: Record<string, number>;
        learnedSpellIds?: string[];
        chosenDisciplinesByHero?: ChosenDisciplinesMap;
        heroLevels?: Partial<Record<HeroId, number>>;
        heroXp?: Partial<Record<HeroId, number>>;
        partyXp?: number;
        tradeGoodCounts?: Record<string, number>;
        heroSpentAttrs?: Partial<Record<HeroId, HeroAttrMap>>;
        socketsByHero?: HeroSocketsMap;
        runestonesBag?: RunestoneItem[];
        heroHpPct?: Partial<Record<HeroId, number>>;
        heroMpPct?: Partial<Record<HeroId, number>>;
        activeBattle?: BattleState | null;
      }
    ) => {
      const payload = buildSavePayload(slotId, label, override);
      if (!payload) return;
      const saved = await gameApi.writeSave(payload);
      setLatestSave(saved);
    },
    [buildSavePayload]
  );

  const enterWorld = useCallback(
    async (
      x: number,
      y: number,
      playtime: number,
      createAutosave: boolean,
      orderOverride?: HeroId[],
      levelOverride = 1,
      discoveredOverride: string[] = [],
      skipFade = false,
      acceptedQuestsOverride: string[] = [],
      inventoryOverride?: {
        silver?: number;
        equippedByHero?: EquippedGearMap;
        bagCounts?: Record<string, number>;
        learnedSpellIds?: string[];
        tradeGoodCounts?: Record<string, number>;
        heroSpentAttrs?: Partial<Record<HeroId, HeroAttrMap>>;
        socketsByHero?: HeroSocketsMap;
        runestonesBag?: RunestoneItem[];
        heroHpPct?: Partial<Record<HeroId, number>>;
        heroMpPct?: Partial<Record<HeroId, number>>;
        chosenDisciplinesByHero?: ChosenDisciplinesMap;
        heroLevels?: Partial<Record<HeroId, number>>;
        heroXp?: Partial<Record<HeroId, number>>;
        partyXp?: number;
        sealedPortalIds?: string[];
        mapId?: string;
        activeBattle?: BattleState | null;
      }
    ) => {
      const applyEnter = async () => {
        const { meta } = await loadWorldAssets(inventoryOverride?.mapId ?? "map_01");
        const nextOrder = orderOverride ?? partyOrder;
        const initSilver = inventoryOverride?.silver ?? STARTING_CAMPAIGN_SILVER;
        const initEquip = inventoryOverride?.equippedByHero ?? {};
        const initBag = inventoryOverride?.bagCounts ?? {};
        const initSpells = inventoryOverride?.learnedSpellIds ?? [];
        const initChosenDiscs = inventoryOverride?.chosenDisciplinesByHero ?? {};
        const initLevels = normalizeHeroLevelsMap(inventoryOverride?.heroLevels, levelOverride || 1);
        const initXpMap = normalizeHeroXpMap(inventoryOverride?.heroXp, inventoryOverride?.partyXp ?? 0);
        const initTrade = inventoryOverride?.tradeGoodCounts ?? {};
        const initSpent = inventoryOverride?.heroSpentAttrs ?? {};
        const initSockets = inventoryOverride?.socketsByHero ?? {};
        const initRunestonesBag = inventoryOverride?.runestonesBag ?? [];
        const initHpPct = inventoryOverride?.heroHpPct ?? {};
        const initMpPct = inventoryOverride?.heroMpPct ?? {};
        const initSealedPortals = inventoryOverride?.sealedPortalIds ?? [];

        setPartyOrder(nextOrder);
        setHeroLevels(initLevels);
        setHeroXp(initXpMap);
        setInitialDiscovered(discoveredOverride);
        setAcceptedQuestIds(acceptedQuestsOverride);
        setSealedPortalIds(initSealedPortals);
        setSilver(initSilver);
        setEquippedByHero(initEquip);
        setBagCounts(initBag);
        setLearnedSpellIds(initSpells);
        setChosenDisciplinesByHero(initChosenDiscs);
        setTradeGoodCounts(initTrade);
        setHeroSpentAttrs(initSpent);
        setSocketsByHero(initSockets);
        setRunestonesBag(initRunestonesBag);
        setHeroHpPct(initHpPct);
        setHeroMpPct(initMpPct);
        const nextBattle = inventoryOverride?.activeBattle ?? null;
        liveBattleRef.current = nextBattle;
        setActiveBattle(nextBattle);
        setActiveLocationId(null);
        setInnResting(false);
        setSpawnState({ x, y, playtime });
        setCharSelectOpen(false);
        setOpeningCutsceneOpen(false);
        setPartyOpen(false);
        setLoadOpen(false);
        setSettingsOpen(false);
        setPaused(false);
        setScreen("game");
        try {
          sessionStorage.setItem(SESSION_ACTIVE_KEY, "1");
        } catch {
          // Ignore storage restrictions
        }
        if (createAutosave) {
          await persistSave("autosave", "Auto-Save", {
            x,
            y,
            playtime,
            meta,
            order: nextOrder,
            lvl: getAveragePartyLevel(initLevels, nextOrder, levelOverride || 1),
            heroLevels: initLevels,
            heroXp: initXpMap,
            discovered: discoveredOverride,
            acceptedQuests: acceptedQuestsOverride,
            sealedPortalIds: initSealedPortals,
            silver: initSilver,
            equippedByHero: initEquip,
            bagCounts: initBag,
            learnedSpellIds: initSpells,
            chosenDisciplinesByHero: initChosenDiscs,
            tradeGoodCounts: initTrade,
            heroSpentAttrs: initSpent,
            socketsByHero: initSockets,
            runestonesBag: initRunestonesBag,
            heroHpPct: initHpPct,
            heroMpPct: initMpPct,
          });
        }
      };
      if (skipFade) {
        await applyEnter();
      } else {
        await fadeTransition(applyEnter);
      }
    },
    [fadeTransition, loadWorldAssets, partyOrder, persistSave]
  );

  // Restore active browser play session cleanly on F5 refresh, otherwise check latest save for Title Screen
  useEffect(() => {
    let active = true;
    void (async () => {
      const latest = await refreshLatest();
      if (!active) return;
      let shouldRestore = false;
      try {
        shouldRestore = !window.rodApi && sessionStorage.getItem(SESSION_ACTIVE_KEY) === "1";
      } catch {
        shouldRestore = false;
      }
      if (shouldRestore && latest) {
        const restored = normalizePartyOrder(latest.partyOrder, latest.heroId);
        await enterWorld(
          latest.x,
          latest.y,
          latest.playtimeSeconds,
          false,
          restored,
          latest.level || 1,
          latest.discoveredLocations ?? [],
          true,
          latest.acceptedQuestIds ?? [],
          saveToEnterInventoryOverride(latest)
        );
      } else if (shouldRestore) {
        try {
          sessionStorage.removeItem(SESSION_ACTIVE_KEY);
        } catch {
          // Ignore
        }
      }
      if (active) setRestoringSession(false);
    })();
    return () => {
      active = false;
    };
    // Run once on startup
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Flush exact position & party state on browser refresh / tab close / backgrounding
  useEffect(() => {
    if (screen !== "game") return;
    const flushNow = () => {
      const payload = buildSavePayload("autosave", "Auto-Save");
      if (payload) flushAutosaveOnUnload(payload);
    };
    const onVisChange = () => {
      if (document.visibilityState === "hidden") flushNow();
    };
    window.addEventListener("pagehide", flushNow);
    window.addEventListener("beforeunload", flushNow);
    document.addEventListener("visibilitychange", onVisChange);
    return () => {
      window.removeEventListener("pagehide", flushNow);
      window.removeEventListener("beforeunload", flushNow);
      document.removeEventListener("visibilitychange", onVisChange);
    };
  }, [screen, buildSavePayload]);

  const openLoad = useCallback(async () => {
    const all = await gameApi.listSaves();
    setSavesList(all);
    setLoadOpen(true);
  }, []);

  const handleReturnTitle = useCallback(async () => {
    await persistSave("autosave", "Auto-Save");
    try {
      sessionStorage.removeItem(SESSION_ACTIVE_KEY);
    } catch {
      // Ignore
    }
    await fadeTransition(async () => {
      setPaused(false);
      setPartyOpen(false);
      setCharSelectOpen(false);
      setOpeningCutsceneOpen(false);
      setActiveLocationId(null);
      setInteriorTrail([]);
      setInnResting(false);
      setLoadOpen(false);
      setSettingsOpen(false);
      setScreen("title");
      await refreshLatest();
    });
  }, [fadeTransition, persistSave, refreshLatest]);

  const handleLeaveLocation = useCallback(() => {
    void fadeTransition(() => {
      setActiveLocationId(null);
      setInteriorTrail([]);
      setInnResting(false);
    });
  }, [fadeTransition]);

  const handleEnterLocationById = useCallback(
    (locId: string, fromOverworld = false) => {
      audioEngine.playDoorOpen();
      void fadeTransition(async () => {
        setInnResting(false);
        if (fromOverworld || !activeLocationId) {
          setInteriorTrail([]);
        } else if (locId !== activeLocationId) {
          setInteriorTrail((prev) => {
            const backIdx = prev.lastIndexOf(locId);
            return backIdx >= 0 ? prev.slice(0, backIdx) : [...prev, activeLocationId];
          });
        }
        setActiveLocationId(locId);
        if (mapMeta) {
          await persistSave("autosave", "Auto-Save");
        }
      });
    },
    [activeLocationId, fadeTransition, mapMeta, persistSave]
  );

  const handleReturnToParentLocation = useCallback(() => {
    if (!activeLocationId) return;
    const parentId =
      interiorTrail[interiorTrail.length - 1] ??
      (isTavernLocationId(activeLocationId)
        ? getTavernParentId(activeLocationId)
        : INTERNAL_LOCATION_PARENTS[activeLocationId] ?? null);
    if (!parentId) return;
    audioEngine.playDoorOpen();
    void fadeTransition(async () => {
      setInnResting(false);
      setInteriorTrail((prev) => prev.slice(0, -1));
      setActiveLocationId(parentId);
      if (mapMeta) {
        await persistSave("autosave", "Auto-Save");
      }
    });
  }, [activeLocationId, interiorTrail, fadeTransition, mapMeta, persistSave]);

  // Global keyboard shortcuts (Esc + Party Menu P)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (openingCutsceneOpen || activeBattle) return;
      if (e.code === "KeyP" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (screen === "game" && !loadOpen && !settingsOpen && !charSelectOpen && !confirmNewOpen) {
          e.preventDefault();
          setPaused(false);
          setPartyOpen((prev) => !prev);
        }
        return;
      }
      if (e.code !== "Escape") return;
      if (confirmNewOpen) {
        setConfirmNewOpen(false);
        return;
      }
      if (charSelectOpen) {
        setCharSelectOpen(false);
        return;
      }
      if (partyOpen) {
        setPartyOpen(false);
        return;
      }
      if (loadOpen) {
        setLoadOpen(false);
        return;
      }
      if (settingsOpen) {
        setSettingsOpen(false);
        return;
      }
      if (screen === "game" && activeLocationId) {
        audioEngine.playSfx("ui_close", 0.28);
        handleLeaveLocation();
        return;
      }
      if (screen === "game") {
        setPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirmNewOpen, charSelectOpen, openingCutsceneOpen, partyOpen, loadOpen, settingsOpen, screen, activeLocationId, activeBattle, handleLeaveLocation]);

  useEffect(() => {
    audioEngine.applySettings(audio);
  }, [audio]);

  const resolveLocationMeta = useCallback(
    (locId: string | null): WorldLocation | null => {
      if (!locId) return null;
      if (locId === HIGHCROWN_KEEP_ID) {
        const highcrown = worldLocations.find((l) => l.id === INTERNAL_LOCATION_PARENTS[HIGHCROWN_KEEP_ID]) ?? null;
        return buildKeepMeta(highcrown);
      }
      if (isTavernLocationId(locId)) {
        const parent = worldLocations.find((l) => l.id === getTavernParentId(locId)) ?? null;
        return parent && parent.tavernAssetPath ? buildTavernMeta(parent) : null;
      }
      return worldLocations.find((l) => l.id === locId) ?? null;
    },
    [worldLocations]
  );

  const activeLocation = useMemo<WorldLocation | null>(
    () => resolveLocationMeta(activeLocationId),
    [activeLocationId, resolveLocationMeta]
  );

  const parentLocationId = useMemo(() => {
    if (!activeLocationId) return null;
    if (interiorTrail.length > 0) return interiorTrail[interiorTrail.length - 1];
    return isTavernLocationId(activeLocationId)
      ? getTavernParentId(activeLocationId)
      : INTERNAL_LOCATION_PARENTS[activeLocationId] ?? null;
  }, [activeLocationId, interiorTrail]);

  const parentLocation = useMemo<WorldLocation | null>(
    () => resolveLocationMeta(parentLocationId),
    [parentLocationId, resolveLocationMeta]
  );

  const overworldRootLocationId = useMemo(() => {
    if (!activeLocationId) return null;
    if (interiorTrail.length > 0) return interiorTrail[0];
    return isTavernLocationId(activeLocationId)
      ? getTavernParentId(activeLocationId)
      : INTERNAL_LOCATION_PARENTS[activeLocationId] ?? activeLocationId;
  }, [activeLocationId, interiorTrail]);

  useEffect(() => {
    if (restoringSession) {
      audioEngine.setMusicContext("silent");
    } else if (charSelectOpen || openingCutsceneOpen) {
      audioEngine.setMusicContext("cutscene");
    } else if (screen === "title") {
      audioEngine.setMusicContext("title");
    } else if (activeBattle) {
      audioEngine.setMusicContext(activeBattle.isBossBattle ? "boss" : "combat");
    } else if (partyOpen || paused) {
      audioEngine.setMusicContext("world_map");
    } else if (activeLocationId) {
      if (isTavernLocationId(activeLocationId)) {
        audioEngine.setMusicContext(getTavernMusicContext(activeLocation?.mapId));
      } else {
        audioEngine.setMusicContext(innResting ? "inn" : "town");
      }
    } else {
      audioEngine.setMusicContext("exploration");
    }

    if (screen !== "game" || paused || partyOpen || loadOpen || settingsOpen || openingCutsceneOpen || activeLocationId || activeBattle) {
      audioEngine.setMovementLoop("none");
    }
  }, [restoringSession, charSelectOpen, openingCutsceneOpen, screen, partyOpen, paused, loadOpen, settingsOpen, activeLocationId, activeLocation?.mapId, innResting, activeBattle]);

  const handleAudioChange = useCallback(<K extends keyof AudioSettings>(key: K, val: AudioSettings[K]) => {
    setAudio((prev) => ({ ...prev, [key]: val }));
    saveAudioSetting(key, val);
  }, []);

  const handleAutoSaveNeeded = useCallback(() => {
    void persistSave("autosave", "Auto-Save");
  }, [persistSave]);

  const handleRequestNewCampaign = useCallback(async () => {
    const existing = latestSave ?? (await gameApi.getLatestSave());
    if (existing) {
      if (!latestSave) setLatestSave(existing);
      setConfirmNewOpen(true);
      return;
    }
    setCharSelectOpen(true);
  }, [latestSave]);

  const handleConfirmWipeNewCampaign = useCallback(async () => {
    await gameApi.clearSaves();
    try {
      sessionStorage.removeItem(SESSION_ACTIVE_KEY);
    } catch {
      // Ignore storage restrictions
    }
    setLatestSave(null);
    setSavesList([]);
    setInitialDiscovered([]);
    setAcceptedQuestIds([]);
    setActiveLocationId(null);
    setConfirmNewOpen(false);
    setCharSelectOpen(true);
  }, []);

  const handleSailToPort = useCallback(
    async (destPort: WorldLocation) => {
      if (destPort.x === null || destPort.y === null) return;
      await fadeTransition(async () => {
        const { meta } = await loadWorldAssets(destPort.mapId);
        const mergedDiscovered = Array.from(
          new Set([...initialDiscovered, ...runtimeRef.current.discoveredLocations, destPort.id])
        );
        const nextPlaytime = runtimeRef.current.playtime;
        setActiveLocationId(null);
        setInteriorTrail([]);
        setInnResting(false);
        setInitialDiscovered(mergedDiscovered);
        setSpawnState({ x: destPort.x!, y: destPort.y!, playtime: nextPlaytime });
        await persistSave("autosave", "Auto-Save", {
          x: destPort.x!,
          y: destPort.y!,
          playtime: nextPlaytime,
          meta,
          discovered: mergedDiscovered,
        });
      });
      audioEngine.playDiscovery();
      showToast(`Arrived at ${destPort.name}`);
    },
    [fadeTransition, initialDiscovered, loadWorldAssets, persistSave, showToast]
  );

  const handleAcceptQuest = useCallback(
    (quest: QuestEntry) => {
      setAcceptedQuestIds((prev) => {
        if (prev.includes(quest.questId)) return prev;
        const next = [...prev, quest.questId];
        if (mapMeta) {
          void persistSave("autosave", "Auto-Save", {
            x: runtimeRef.current.x,
            y: runtimeRef.current.y,
            playtime: runtimeRef.current.playtime,
            meta: mapMeta,
            acceptedQuests: next,
          });
        }
        return next;
      });
      audioEngine.playSave();
      showToast(`Quest Accepted: ${quest.title}`);
    },
    [mapMeta, persistSave, showToast]
  );

  const handleFreeRest = useCallback(
    (hubName: string) => {
      const fullPct: Partial<Record<HeroId, number>> = {};
      setHeroHpPct(fullPct);
      setHeroMpPct(fullPct);
      setInnResting(true);
      audioEngine.playDiscovery();
      showToast(`Rested at ${hubName} — Party Restored`);
      if (mapMeta) {
        void persistSave("autosave", "Auto-Save", {
          x: runtimeRef.current.x,
          y: runtimeRef.current.y,
          playtime: runtimeRef.current.playtime,
          meta: mapMeta,
          heroHpPct: fullPct,
          heroMpPct: fullPct,
        });
      }
    },
    [mapMeta, persistSave, showToast]
  );

  const handleSelectDiscipline = useCallback(
    (heroId: HeroId, tierLevel: number, opt: DisciplineOption, silverCost: number) => {
      const existing = chosenDisciplinesByHero[heroId] ?? {};
      if (existing[String(tierLevel)]) return;
      const hLvl = getHeroLevel(heroLevels, heroId, 1);
      if (hLvl < tierLevel) {
        showToast(`${getHeroById(heroId).name} must reach Level ${tierLevel}`);
        return;
      }
      if (silver < silverCost) {
        showToast(`Need ${silverCost.toLocaleString()}s Silver`);
        return;
      }

      const nextSilver = silver - silverCost;
      const nextChosen: ChosenDisciplinesMap = {
        ...chosenDisciplinesByHero,
        [heroId]: {
          ...existing,
          [String(tierLevel)]: opt.id,
        },
      };
      setSilver(nextSilver);
      setChosenDisciplinesByHero(nextChosen);
      audioEngine.playSave();
      showToast(`${getHeroById(heroId).name} bound Discipline: ${opt.name}`);
      if (mapMeta) {
        void persistSave("autosave", "Auto-Save", {
          x: runtimeRef.current.x,
          y: runtimeRef.current.y,
          playtime: runtimeRef.current.playtime,
          meta: mapMeta,
          silver: nextSilver,
          chosenDisciplinesByHero: nextChosen,
        });
      }
    },
    [chosenDisciplinesByHero, heroLevels, mapMeta, persistSave, showToast, silver]
  );

  const handleBuyShopEntry = useCallback(
    (choice: BuyConfirmChoice) => {
      const price = choice.entry.priceSilver ?? 0;
      if (silver < price) {
        showToast(`Need ${price.toLocaleString()}s Silver`);
        return;
      }

      let nextSilver = silver - price;
      const nextEquip: EquippedGearMap = { ...equippedByHero };
      const nextBag: Record<string, number> = { ...bagCounts };
      let nextSpells = learnedSpellIds;

      if (choice.mode === "spell") {
        if (learnedSpellIds.includes(choice.entry.id)) return;
        const spellObj = choice.entry as SpellEntry;
        const capUsed = countRegionSpellsForHero(learnedSpellIds, spellsCatalog, choice.heroId, spellObj.region);
        if (capUsed >= MAX_SPELLS_PER_REGION) {
          showToast(`${getHeroById(choice.heroId).name} already knows ${MAX_SPELLS_PER_REGION}/3 Tier ${spellObj.region} spells`);
          return;
        }
        nextSpells = [...learnedSpellIds, choice.entry.id];
        showToast(`${getHeroById(choice.heroId).name} learned ${choice.entry.name}`);
      } else if (choice.mode === "bag") {
        nextBag[choice.entry.id] = (nextBag[choice.entry.id] ?? 0) + 1;
        showToast(`Bought ${choice.entry.name} → Shared Party Bag`);
      } else {
        const slot = itemSlotForHero(choice.entry, choice.heroId, choice.targetSlot);
        const heroGear = { ...(nextEquip[choice.heroId] ?? {}) };
        if (slot) {
          if (choice.mode === "equip_sell_old" && choice.oldItem) {
            nextSilver += choice.oldItem.sellSilver || 0;
          } else if (choice.mode === "equip" && choice.oldItem) {
            nextBag[choice.oldItem.id] = (nextBag[choice.oldItem.id] ?? 0) + 1;
          }
          // Enforce 1H vs 2H Left-Hand shield conflict safely (store displaced item into Party Bag)
          if (slot === "right_hand" && "handed" in choice.entry && choice.entry.handed === "2H" && heroGear.left_hand) {
            nextBag[heroGear.left_hand] = (nextBag[heroGear.left_hand] ?? 0) + 1;
            delete heroGear.left_hand;
          } else if (slot === "left_hand" && heroGear.right_hand && itemsById[heroGear.right_hand]?.handed === "2H") {
            nextBag[heroGear.right_hand] = (nextBag[heroGear.right_hand] ?? 0) + 1;
            delete heroGear.right_hand;
          }
          heroGear[slot] = choice.entry.id;
          nextEquip[choice.heroId] = heroGear;
        }
        showToast(`Equipped ${choice.entry.name} on ${getHeroById(choice.heroId).name}`);
      }

      setSilver(nextSilver);
      setEquippedByHero(nextEquip);
      setBagCounts(nextBag);
      setLearnedSpellIds(nextSpells);
      audioEngine.playSave();
      if (mapMeta) {
        void persistSave("autosave", "Auto-Save", {
          x: runtimeRef.current.x,
          y: runtimeRef.current.y,
          playtime: runtimeRef.current.playtime,
          meta: mapMeta,
          silver: nextSilver,
          equippedByHero: nextEquip,
          bagCounts: nextBag,
          learnedSpellIds: nextSpells,
        });
      }
    },
    [silver, equippedByHero, bagCounts, learnedSpellIds, itemsById, mapMeta, persistSave, showToast]
  );

  const handleSellAllTradeGoods = useCallback(() => {
    const total = Object.entries(tradeGoodCounts).reduce(
      (sum, [id, qty]) => sum + (itemsById[id]?.sellSilver || 0) * qty,
      0
    );
    if (total <= 0) return;
    const nextSilver = silver + total;
    const emptyTrade: Record<string, number> = {};
    setSilver(nextSilver);
    setTradeGoodCounts(emptyTrade);
    audioEngine.playSave();
    showToast(`Sold all Trade Goods (+${total.toLocaleString()}s)`);
    if (mapMeta) {
      void persistSave("autosave", "Auto-Save", {
        x: runtimeRef.current.x,
        y: runtimeRef.current.y,
        playtime: runtimeRef.current.playtime,
        meta: mapMeta,
        silver: nextSilver,
        tradeGoodCounts: emptyTrade,
      });
    }
  }, [tradeGoodCounts, itemsById, silver, mapMeta, persistSave, showToast]);

  const handleEquipFromBag = useCallback(
    (heroId: HeroId, itemId: string, targetSlot?: GearSlot) => {
      const item = itemsById[itemId];
      if (!item) return;
      const res = resolveEquipFromBag(heroId, item, equippedByHero, bagCounts, itemsById, targetSlot);
      if (!res.changed) return;

      setBagCounts(res.bagCounts);
      setEquippedByHero(res.equippedByHero);
      audioEngine.playUiClick(0.38);
      showToast(`${getHeroById(heroId).name} equipped ${item.name}`);
      if (mapMeta) {
        void persistSave("autosave", "Auto-Save", {
          x: runtimeRef.current.x,
          y: runtimeRef.current.y,
          playtime: runtimeRef.current.playtime,
          meta: mapMeta,
          bagCounts: res.bagCounts,
          equippedByHero: res.equippedByHero,
        });
      }
    },
    [bagCounts, equippedByHero, itemsById, mapMeta, persistSave, showToast]
  );

  const handleUnequipSlot = useCallback(
    (heroId: HeroId, slot: GearSlot) => {
      const res = resolveUnequipSlot(heroId, slot, equippedByHero, bagCounts);
      if (!res.removedItemId) return;
      setBagCounts(res.bagCounts);
      setEquippedByHero(res.equippedByHero);
      audioEngine.playUiClick(0.34);
      const removed = itemsById[res.removedItemId];
      if (removed) {
        showToast(`${getHeroById(heroId).name} removed ${removed.name}`);
      }
      if (mapMeta) {
        void persistSave("autosave", "Auto-Save", {
          x: runtimeRef.current.x,
          y: runtimeRef.current.y,
          playtime: runtimeRef.current.playtime,
          meta: mapMeta,
          bagCounts: res.bagCounts,
          equippedByHero: res.equippedByHero,
        });
      }
    },
    [bagCounts, equippedByHero, itemsById, mapMeta, persistSave, showToast]
  );

  const handleAdjustHeroStat = useCallback(
    (heroId: HeroId, stat: HeroAttrKey, delta: number) => {
      const attrs = getHeroAttributes(heroId, getHeroLevel(heroLevels, heroId, 1), heroSpentAttrs);
      if (delta > 0 && attrs.unspent < delta) return;
      if (delta < 0 && attrs.spent[stat] < Math.abs(delta)) return;
      const nextHeroSpent: HeroAttrMap = {
        ...attrs.spent,
        [stat]: Math.max(0, attrs.spent[stat] + delta),
      };
      const nextAll: Partial<Record<HeroId, HeroAttrMap>> = {
        ...heroSpentAttrs,
        [heroId]: nextHeroSpent,
      };
      setHeroSpentAttrs(nextAll);
      if (mapMeta) {
        void persistSave("autosave", "Auto-Save", {
          x: runtimeRef.current.x,
          y: runtimeRef.current.y,
          playtime: runtimeRef.current.playtime,
          meta: mapMeta,
          heroSpentAttrs: nextAll,
        });
      }
    },
    [heroLevels, heroSpentAttrs, mapMeta, persistSave]
  );

  const handleResetHeroStats = useCallback(
    (heroId: HeroId) => {
      const nextAll: Partial<Record<HeroId, HeroAttrMap>> = {
        ...heroSpentAttrs,
        [heroId]: { force: 0, finesse: 0, grit: 0, arcana: 0, presence: 0 },
      };
      setHeroSpentAttrs(nextAll);
      showToast(`Reset attribute points for ${getHeroById(heroId).name}`);
      if (mapMeta) {
        void persistSave("autosave", "Auto-Save", {
          x: runtimeRef.current.x,
          y: runtimeRef.current.y,
          playtime: runtimeRef.current.playtime,
          meta: mapMeta,
          heroSpentAttrs: nextAll,
        });
      }
    },
    [heroSpentAttrs, mapMeta, persistSave, showToast]
  );

  const handleSocketRunestone = useCallback(
    (heroId: HeroId, stone: RunestoneItem) => {
      const nextSockets: HeroSocketsMap = {
        ...socketsByHero,
        [heroId]: {
          weapon: socketsByHero[heroId]?.weapon ?? null,
          armor: socketsByHero[heroId]?.armor ?? null,
          [stone.target]: stone,
        },
      };
      const nextRunestones = runestonesBag.filter((r) => r.id !== stone.id);
      setSocketsByHero(nextSockets);
      setRunestonesBag(nextRunestones);
      audioEngine.playSave();
      showToast(
        `Socketed ${stone.name} into ${getHeroById(heroId).name}'s ${
          stone.target === "weapon" ? "Weapon" : "Body Armor"
        }`
      );
      if (mapMeta) {
        void persistSave("autosave", "Auto-Save", {
          x: runtimeRef.current.x,
          y: runtimeRef.current.y,
          playtime: runtimeRef.current.playtime,
          meta: mapMeta,
          socketsByHero: nextSockets,
          runestonesBag: nextRunestones,
        });
      }
    },
    [mapMeta, persistSave, runestonesBag, showToast, socketsByHero]
  );

  const handleUseConsumable = useCallback(
    (sourceIds: string[], targetHeroId: HeroId, item: ItemEntry) => {
      const sid = sourceIds.find((id) => (bagCounts[id] ?? 0) > 0) ?? item.id;
      if ((bagCounts[sid] ?? 0) <= 0) return;

      const nextBag = { ...bagCounts };
      nextBag[sid] = Math.max(0, (nextBag[sid] ?? 1) - 1);
      if (nextBag[sid] <= 0) delete nextBag[sid];

      const curPct = heroHpPct[targetHeroId] ?? 100;
      const curMp = heroMpPct[targetHeroId] ?? 100;
      const isMpPotion = /mana|mp/i.test(item.name) && !/elixir|phoenix/i.test(item.name);
      const healPct = /greater|full|elixir|supreme/i.test(item.name) ? 100 : 40;
      const nextHp: Partial<Record<HeroId, number>> = isMpPotion
        ? heroHpPct
        : {
            ...heroHpPct,
            [targetHeroId]: Math.min(100, curPct + healPct),
          };
      const nextMp: Partial<Record<HeroId, number>> =
        isMpPotion || /elixir|supreme/i.test(item.name)
          ? {
              ...heroMpPct,
              [targetHeroId]: Math.min(100, curMp + healPct),
            }
          : heroMpPct;

      setBagCounts(nextBag);
      setHeroHpPct(nextHp);
      setHeroMpPct(nextMp);
      audioEngine.playDiscovery();
      showToast(`Used ${item.name} on ${getHeroById(targetHeroId).name}`);
      if (mapMeta) {
        void persistSave("autosave", "Auto-Save", {
          x: runtimeRef.current.x,
          y: runtimeRef.current.y,
          playtime: runtimeRef.current.playtime,
          meta: mapMeta,
          bagCounts: nextBag,
          heroHpPct: nextHp,
          heroMpPct: nextMp,
        });
      }
    },
    [bagCounts, heroHpPct, heroMpPct, mapMeta, persistSave, showToast]
  );

  const handleTriggerEncounter = useCallback(
    (trigger: OverworldEncounterTrigger) => {
      if (!battleConfig || activeBattle || activeLocationId) return;
      const bState = createBattleState({
        config: battleConfig,
        partyOrder,
        level: partyLevel,
        heroLevels,
        heroSpentAttrs,
        equippedByHero,
        itemsById,
        socketsByHero,
        heroHpPct,
        heroMpPct,
        disciplinesByHero,
        chosenDisciplinesByHero,
        mapId: trigger.mapId,
        biomeName: trigger.biomeName,
        zoneName: trigger.zoneName,
        zoneCode: trigger.zoneCode,
        zoneMin: trigger.zoneMin,
        zoneMax: trigger.zoneMax,
        nearWaterKind: trigger.nearWaterKind,
        portalLoc: trigger.portalLoc,
      });
      liveBattleRef.current = bState;
      setActiveBattle(bState);
      if (mapMeta) {
        void persistSave("autosave", "Auto-Save", {
          x: runtimeRef.current.x,
          y: runtimeRef.current.y,
          playtime: runtimeRef.current.playtime,
          meta: mapMeta,
          activeBattle: bState,
        });
      }
    },
    [
      activeBattle,
      activeLocationId,
      battleConfig,
      chosenDisciplinesByHero,
      disciplinesByHero,
      equippedByHero,
      heroHpPct,
      heroLevels,
      heroMpPct,
      heroSpentAttrs,
      itemsById,
      mapMeta,
      partyLevel,
      partyOrder,
      persistSave,
      socketsByHero,
    ]
  );

  const handleBattleSnapshot = useCallback(
    (snapshot: BattleState) => {
      liveBattleRef.current = snapshot;
      if (!mapMeta) return;
      const payload = buildSavePayload("autosave", "Auto-Save", {
        x: runtimeRef.current.x,
        y: runtimeRef.current.y,
        playtime: runtimeRef.current.playtime,
        meta: mapMeta,
        activeBattle: snapshot,
      });
      if (payload) {
        void gameApi.writeSave(payload);
      }
    },
    [buildSavePayload, mapMeta]
  );

  const handleBattleComplete = useCallback(
    (outcome: BattleOutcomeResult) => {
      liveBattleRef.current = null;
      setActiveBattle(null);

      // Consume any potions spent during battle
      const nextBag = { ...bagCounts };
      for (const [pid, qtyUsed] of Object.entries(outcome.consumedPotions)) {
        const rem = Math.max(0, (nextBag[pid] ?? 0) - qtyUsed);
        if (rem <= 0) delete nextBag[pid];
        else nextBag[pid] = rem;
      }

      if (outcome.result === "fled") {
        setBagCounts(nextBag);
        setHeroHpPct(outcome.heroHpPct);
        setHeroMpPct(outcome.heroMpPct);
        if (mapMeta) {
          void persistSave("autosave", "Auto-Save", {
            x: runtimeRef.current.x,
            y: runtimeRef.current.y,
            playtime: runtimeRef.current.playtime,
            meta: mapMeta,
            bagCounts: nextBag,
            heroHpPct: outcome.heroHpPct,
            heroMpPct: outcome.heroMpPct,
            activeBattle: null,
          });
        }
        showToast("Escaped back to Ethoria");
        return;
      }

      if (outcome.result === "defeat") {
        const fullPct: Partial<Record<HeroId, number>> = {};
        setBagCounts(nextBag);
        setHeroHpPct(fullPct);
        setHeroMpPct(fullPct);
        if (mapMeta) {
          const fallbackHub =
            worldLocations.find(
              (l) => l.placed && l.mapId === mapMeta.id && l.x !== null && l.y !== null && l.category !== "portal" && l.category !== "quest_field" && l.interiorAssetPath
            ) ?? null;
          if (fallbackHub && fallbackHub.x !== null && fallbackHub.y !== null) {
            runtimeRef.current.x = fallbackHub.x;
            runtimeRef.current.y = fallbackHub.y;
            setSpawnState((prev) => ({ ...prev, x: fallbackHub.x as number, y: fallbackHub.y as number }));
          }
          void persistSave("autosave", "Auto-Save", {
            x: runtimeRef.current.x,
            y: runtimeRef.current.y,
            playtime: runtimeRef.current.playtime,
            meta: mapMeta,
            bagCounts: nextBag,
            heroHpPct: fullPct,
            heroMpPct: fullPct,
            activeBattle: null,
          });
        }
        showToast("Recovered at nearest Town Inn");
        return;
      }

      // Victory: apply individual Hero XP/Level-Ups, HP/MP, Silver, Trade Goods drops, and Portal seal
      const nextLevels: Partial<Record<HeroId, number>> = { ...heroLevels };
      const nextXpMap: Partial<Record<HeroId, number>> = { ...heroXp };
      const leveledNames: string[] = [];
      for (const hid of partyOrder) {
        const prevLv = getHeroLevel(heroLevels, hid, 1);
        const prevXp = getHeroXp(heroXp, hid);
        const gained = outcome.heroXpEarned[hid] ?? 0;
        const res = applyHeroXpGain(prevLv, prevXp, gained);
        nextLevels[hid] = res.level;
        nextXpMap[hid] = res.xp;
        if (res.leveledUp) leveledNames.push(`${getHeroById(hid).name} Lv ${res.level}`);
      }
      const nextAvgLv = getAveragePartyLevel(nextLevels, partyOrder, 1);
      const nextSilver = silver + outcome.silverEarned;
      const nextTrade = { ...tradeGoodCounts };
      for (const [gid, qty] of Object.entries(outcome.droppedTradeGoods)) {
        nextTrade[gid] = (nextTrade[gid] ?? 0) + qty;
      }
      const nextSealed =
        outcome.sealedPortalId && !sealedPortalIds.includes(outcome.sealedPortalId)
          ? [...sealedPortalIds, outcome.sealedPortalId]
          : sealedPortalIds;

      setBagCounts(nextBag);
      setHeroHpPct(outcome.heroHpPct);
      setHeroMpPct(outcome.heroMpPct);
      setHeroLevels(nextLevels);
      setHeroXp(nextXpMap);
      setSilver(nextSilver);
      setTradeGoodCounts(nextTrade);
      setSealedPortalIds(nextSealed);
      audioEngine.playSave();
      showToast(
        leveledNames.length > 0
          ? `Level Up: ${leveledNames.join(", ")}! (+${outcome.silverEarned}s)`
          : `Victory! +${outcome.xpEarned} XP · +${outcome.silverEarned}s`
      );
      if (mapMeta) {
        void persistSave("autosave", "Auto-Save", {
          x: runtimeRef.current.x,
          y: runtimeRef.current.y,
          playtime: runtimeRef.current.playtime,
          meta: mapMeta,
          lvl: nextAvgLv,
          heroLevels: nextLevels,
          heroXp: nextXpMap,
          silver: nextSilver,
          bagCounts: nextBag,
          tradeGoodCounts: nextTrade,
          sealedPortalIds: nextSealed,
          heroHpPct: outcome.heroHpPct,
          heroMpPct: outcome.heroMpPct,
          activeBattle: null,
        });
      }
    },
    [bagCounts, heroLevels, heroXp, mapMeta, partyOrder, persistSave, sealedPortalIds, showToast, silver, tradeGoodCounts, worldLocations]
  );

  const handleAbandonQuest = useCallback(
    (questId: string) => {
      const nextQuests = acceptedQuestIds.filter((q) => q !== questId);
      setAcceptedQuestIds(nextQuests);
      showToast("Quest removed from journal");
      if (mapMeta) {
        void persistSave("autosave", "Auto-Save", {
          x: runtimeRef.current.x,
          y: runtimeRef.current.y,
          playtime: runtimeRef.current.playtime,
          meta: mapMeta,
          acceptedQuests: nextQuests,
        });
      }
    },
    [acceptedQuestIds, mapMeta, persistSave, showToast]
  );

  return (
    <>
      <TitleScreen
        active={screen === "title" && !restoringSession}
        latestSave={latestSave}
        modalOpen={confirmNewOpen || charSelectOpen || openingCutsceneOpen || loadOpen || settingsOpen}
        onContinue={() => {
          if (latestSave) {
            const restored = normalizePartyOrder(latestSave.partyOrder, latestSave.heroId);
            void enterWorld(
              latestSave.x,
              latestSave.y,
              latestSave.playtimeSeconds,
              false,
              restored,
              latestSave.level || 1,
              latestSave.discoveredLocations ?? [],
              false,
              latestSave.acceptedQuestIds ?? [],
              saveToEnterInventoryOverride(latestSave)
            );
          }
        }}
        onNewCampaign={() => void handleRequestNewCampaign()}
        onOpenLoad={() => void openLoad()}
        onOpenSettings={() => setSettingsOpen(true)}
        onQuit={() => void gameApi.quitGame()}
      />

      {mapMeta && (
        <OverworldCanvas
          active={screen === "game"}
          paused={paused || partyOpen || loadOpen || settingsOpen || openingCutsceneOpen || activeLocationId !== null || activeBattle !== null}
          insideLocationId={overworldRootLocationId}
          mapMeta={mapMeta}
          worldLocations={worldLocations}
          worldCollision={worldCollision}
          partyOrder={partyOrder}
          level={partyLevel}
          heroLevels={heroLevels}
          heroHpPct={heroHpPct}
          heroMpPct={heroMpPct}
          sealedPortalIds={sealedPortalIds}
          startX={spawnState.x}
          startY={spawnState.y}
          startPlaytime={spawnState.playtime}
          initialDiscovered={initialDiscovered}
          runtimeRef={runtimeRef}
          onAutoSaveNeeded={handleAutoSaveNeeded}
          onEnterLocation={(loc) => handleEnterLocationById(loc.id, true)}
          onTriggerEncounter={handleTriggerEncounter}
          onOpenParty={() => {
            setPaused(false);
            setPartyOpen(true);
          }}
          onOpenPause={() => setPaused(true)}
          onToast={showToast}
        />
      )}

      {screen === "game" && (
        <LocationInteriorModal
          location={activeLocation}
          parentLocation={parentLocation}
          worldLocations={worldLocations}
          sealedPortalIds={sealedPortalIds}
          npcsByLocation={npcsByLocation}
          questsByKey={questsByKey}
          partyOrder={partyOrder}
          partyLevel={partyLevel}
          heroLevels={heroLevels}
          acceptedQuestIds={acceptedQuestIds}
          silver={silver}
          items={itemsCatalog}
          itemsById={itemsById}
          spells={spellsCatalog}
          equippedByHero={equippedByHero}
          learnedSpellIds={learnedSpellIds}
          tradeGoodCounts={tradeGoodCounts}
          disciplinesByHero={disciplinesByHero}
          chosenDisciplinesByHero={chosenDisciplinesByHero}
          onSelectDiscipline={handleSelectDiscipline}
          onBuyShopEntry={handleBuyShopEntry}
          onSellAllTradeGoods={handleSellAllTradeGoods}
          onAcceptQuest={handleAcceptQuest}
          onFreeRest={handleFreeRest}
          onSailToPort={(dest) => void handleSailToPort(dest)}
          onOpenParty={() => {
            setPaused(false);
            setPartyOpen(true);
          }}
          onEnterLocationById={(locId) => handleEnterLocationById(locId, false)}
          onReturnToParent={handleReturnToParentLocation}
          onClose={handleLeaveLocation}
        />
      )}

      <CharacterSelectModal
        open={charSelectOpen}
        onConfirm={(chosenOrder) => {
          launchingWorldRef.current = false;
          void fadeTransition(() => {
            setPartyOrder(chosenOrder);
            setCharSelectOpen(false);
            setOpeningCutsceneOpen(true);
          });
        }}
        onClose={() => setCharSelectOpen(false)}
      />

      <OpeningCutsceneModal
        open={openingCutsceneOpen}
        partyOrder={partyOrder}
        onComplete={() => {
          if (launchingWorldRef.current) return;
          launchingWorldRef.current = true;
          audioEngine.playDoorOpen();
          void (async () => {
            try {
              const { meta, locations } = await loadWorldAssets();
              const startSpawn = computeHighcrownSpawn(locations, meta.spawn, meta.width, meta.height);
              await enterWorld(startSpawn.x, startSpawn.y, 0, true, partyOrder, 1, [HIGHCROWN_ID]);
            } finally {
              launchingWorldRef.current = false;
            }
          })();
        }}
      />

      <PartyMenuModal
        open={screen === "game" && partyOpen && !loadOpen && !settingsOpen && !activeBattle}
        partyOrder={partyOrder}
        level={partyLevel}
        partyXp={leaderXp}
        heroLevels={heroLevels}
        heroXp={heroXp}
        silver={silver}
        currentMapId={mapMeta?.id ?? "map_01"}
        playerX={runtimeRef.current.x}
        playerY={runtimeRef.current.y}
        equippedByHero={equippedByHero}
        itemsById={itemsById}
        bagCounts={bagCounts}
        tradeGoodCounts={tradeGoodCounts}
        learnedSpellIds={learnedSpellIds}
        spells={spellsCatalog}
        heroSpentAttrs={heroSpentAttrs}
        socketsByHero={socketsByHero}
        runestonesBag={runestonesBag}
        heroHpPct={heroHpPct}
        heroMpPct={heroMpPct}
        disciplinesByHero={disciplinesByHero}
        chosenDisciplinesByHero={chosenDisciplinesByHero}
        acceptedQuestIds={acceptedQuestIds}
        questsCatalog={questsCatalog}
        worldLocations={worldLocations}
        discoveredLocations={Array.from(new Set([...initialDiscovered, ...runtimeRef.current.discoveredLocations]))}
        sealedPortalIds={sealedPortalIds}
        onEquipFromBag={handleEquipFromBag}
        onUnequipSlot={handleUnequipSlot}
        onSwapHands={(heroId) => {
          const res = resolveSwapHands(heroId, equippedByHero, itemsById);
          if (!res.swapped) return;
          setEquippedByHero(res.equippedByHero);
          audioEngine.playUiClick(0.36);
          showToast(`${getHeroById(heroId).name} swapped Main & Off-Hand blades`);
          if (mapMeta) {
            void persistSave("autosave", "Auto-Save", {
              x: runtimeRef.current.x,
              y: runtimeRef.current.y,
              playtime: runtimeRef.current.playtime,
              meta: mapMeta,
              equippedByHero: res.equippedByHero,
            });
          }
        }}
        onSocketRunestone={handleSocketRunestone}
        onUseConsumable={handleUseConsumable}
        onAdjustHeroStat={handleAdjustHeroStat}
        onResetHeroStats={handleResetHeroStats}
        onChangeOrder={(nextOrder) => {
          audioEngine.playUiClick(0.42);
          setPartyOrder(nextOrder);
          if (mapMeta) {
            void persistSave("autosave", "Auto-Save", {
              x: runtimeRef.current.x,
              y: runtimeRef.current.y,
              playtime: runtimeRef.current.playtime,
              meta: mapMeta,
              order: nextOrder,
            });
          }
        }}
        onAbandonQuest={handleAbandonQuest}
        onSaveGame={async () => {
          await persistSave("manual_1", "Manual Save");
          audioEngine.playSave();
          showToast("Game Saved");
        }}
        onOpenSettings={() => setSettingsOpen(true)}
        onClose={() => {
          audioEngine.playUiClick();
          setPartyOpen(false);
        }}
      />

      <PauseMenuModal
        open={screen === "game" && paused && !partyOpen && !loadOpen && !settingsOpen && !activeBattle}
        onResume={() => setPaused(false)}
        onOpenParty={() => {
          setPaused(false);
          setPartyOpen(true);
        }}
        onSave={async () => {
          await persistSave("manual_1", "Manual Save");
          audioEngine.playSave();
          showToast("Game Saved");
        }}
        onOpenLoad={() => void openLoad()}
        onOpenSettings={() => setSettingsOpen(true)}
        onReturnTitle={() => void handleReturnTitle()}
        onQuit={async () => {
          await persistSave("autosave", "Auto-Save");
          void gameApi.quitGame();
        }}
      />

      <LoadCampaignModal
        open={loadOpen}
        saves={savesList}
        onSelect={(slot) => {
          const restored = normalizePartyOrder(slot.partyOrder, slot.heroId);
          void enterWorld(
            slot.x,
            slot.y,
            slot.playtimeSeconds,
            false,
            restored,
            slot.level || 1,
            slot.discoveredLocations ?? [],
            false,
            slot.acceptedQuestIds ?? [],
            saveToEnterInventoryOverride(slot)
          );
        }}
        onClose={() => setLoadOpen(false)}
      />

      {screen === "game" && activeBattle && (
        <BattleOverlay
          open={true}
          initialBattle={activeBattle}
          partyLevel={partyLevel}
          partyXp={leaderXp}
          heroLevels={heroLevels}
          heroXp={heroXp}
          spells={spellsCatalog}
          learnedSpellIds={learnedSpellIds}
          bagCounts={bagCounts}
          itemsById={itemsById}
          itemsCatalog={itemsCatalog}
          onBattleSnapshot={handleBattleSnapshot}
          onComplete={handleBattleComplete}
        />
      )}

      <SettingsModal
        open={settingsOpen}
        audio={audio}
        onChangeAudio={handleAudioChange}
        onClose={() => setSettingsOpen(false)}
      />

      <ConfirmNewCampaignModal
        open={confirmNewOpen}
        existingSave={latestSave}
        onConfirm={() => void handleConfirmWipeNewCampaign()}
        onCancel={() => setConfirmNewOpen(false)}
      />

      {toastMsg && (
        <div
          className={[
            "fixed left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded bg-[#141720]/95 border border-[#a88950] text-[#f4d799] text-[13px] font-semibold tracking-wider uppercase shadow-2xl",
            activeLocationId ? "top-5" : "bottom-7",
          ].join(" ")}
        >
          {toastMsg}
        </div>
      )}

      <div
        className={[
          "fixed inset-0 z-50 bg-[#06070a] transition-opacity duration-300",
          fading ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        ].join(" ")}
      />
    </>
  );
};
