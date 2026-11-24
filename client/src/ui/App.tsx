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
import { ensureCoreCatalogsLoaded, fetchRequiredJson } from "./coreCatalogs";
import { DEFAULT_PARTY_ORDER, getHeroById, getHeroProgression, normalizePartyOrder } from "./heroes";
import {
  applyHeroXpGain,
  computeHeroVitals,
  getAveragePartyLevel,
  getHeroAttributes,
  getHeroLevel,
  getHeroXp,
  type LedgerTabId,
  normalizeHeroLevelsMap,
  normalizeHeroXpMap,
  resolveEquipFromBag,
  resolveSwapHands,
  resolveUnequipSlot,
} from "./party/partyLogic";
import type { BuyConfirmChoice } from "./shops/ShopCounterPanel";
import { countRegionSpellsForHero, itemSlotForHero, MAX_SPELLS_PER_REGION } from "./shops/shopLogic";
import { getGlobalActiveQuestLimit, normalizeOutpostOfferScale, pluralizeMonsterName, rollOutpostHuntOffer, setOutpostHuntsCatalog } from "./quests/outpostHunts";
import type {
  ActiveOutpostHunt,
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
  OutpostHuntsCatalog,
  QuestEntry,
  RunestoneItem,
  SaveSlotData,
  SpellEntry,
  TravelCatalog,
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

export function getStartingCampaignSilver(): number {
  return getHeroProgression().startingSilver ?? 1000;
}

export const App: React.FC = () => {
  const isCombatSandbox =
    typeof window !== "undefined" &&
    !window.rodApi &&
    window.location.protocol.startsWith("http") &&
    new URLSearchParams(window.location.search).get("sandbox") === "combat";

  const [screen, setScreen] = useState<"title" | "game">("title");
  const [restoringSession, setRestoringSession] = useState<boolean>(() => {
    if (isCombatSandbox) return false;
    try {
      return typeof window !== "undefined" && !window.rodApi && sessionStorage.getItem(SESSION_ACTIVE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [sandboxBattle, setSandboxBattle] = useState<BattleState | null>(null);
  const [sandboxViewCfg, setSandboxViewCfg] = useState<{
    partyLevel: number;
    heroLevels: Partial<Record<HeroId, number>>;
    learnedSpellIds: string[];
    bagCounts: Record<string, number>;
  } | null>(null);
  const sandboxSnapshotRef = useRef<BattleState | null>(null);
  const sandboxMetaRef = useRef<{
    zoneCode: number;
    biomeName: string;
    startMs: number;
    enemies: Array<{ name: string; level: number; maxHp: number }>;
  } | null>(null);
  const [fading, setFading] = useState(false);

  const [latestSave, setLatestSave] = useState<SaveSlotData | null>(null);
  const [savesList, setSavesList] = useState<SaveSlotData[]>([]);
  const [confirmNewOpen, setConfirmNewOpen] = useState(false);
  const [charSelectOpen, setCharSelectOpen] = useState(false);
  const [openingCutsceneOpen, setOpeningCutsceneOpen] = useState(false);
  const [partyOpen, setPartyOpen] = useState(false);
  const [partyInitialTab, setPartyInitialTab] = useState<LedgerTabId>("party");
  const [loadOpen, setLoadOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const launchingWorldRef = useRef(false);

  const [partyOrder, setPartyOrder] = useState<HeroId[]>(() => [...DEFAULT_PARTY_ORDER]);
  const [heroLevels, setHeroLevels] = useState<Partial<Record<HeroId, number>>>(() => normalizeHeroLevelsMap(undefined, 1));
  const [heroXp, setHeroXp] = useState<Partial<Record<HeroId, number>>>(() => normalizeHeroXpMap(undefined, 0));
  const partyLevel = useMemo(() => getAveragePartyLevel(heroLevels, partyOrder, 1), [heroLevels, partyOrder]);
  const leaderXp = getHeroXp(heroXp, partyOrder[0] ?? "valen");

  const [audio, setAudio] = useState<AudioSettings>(() => loadAudioSettings());
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [loadErrorMsg, setLoadErrorMsg] = useState<string | null>(null);

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
  const [travelCatalog, setTravelCatalog] = useState<TravelCatalog | null>(null);
  const [silver, setSilver] = useState<number>(() => getStartingCampaignSilver());
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
  const [completedQuestIds, setCompletedQuestIds] = useState<string[]>([]);
  const [activeOutpostHunts, setActiveOutpostHunts] = useState<ActiveOutpostHunt[]>([]);
  const [outpostOffers, setOutpostOffers] = useState<Record<string, ActiveOutpostHunt>>({});
  const [completedOutpostHunts, setCompletedOutpostHunts] = useState<number>(0);
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

  const reportFatalLoadError = useCallback((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[ROD] Required data load failed:", err);
    setLoadErrorMsg(msg);
  }, []);

  const itemsById = useMemo<Record<string, ItemEntry>>(
    () => Object.fromEntries(itemsCatalog.map((it) => [it.id, it])),
    [itemsCatalog]
  );

  const loadWorldAssets = useCallback(
    async (
      targetMapId?: string
    ): Promise<{ meta: MapMeta; locations: WorldLocation[]; items: ItemEntry[]; battleConfig: BattleConfigData }> => {
      const desiredMap = targetMapId || mapMeta?.id || "map_01";
      const bust = Date.now();
      try {
        const meta =
          mapMeta && mapMeta.id === desiredMap
            ? mapMeta
            : await fetchRequiredJson<MapMeta>(`assets/maps/${desiredMap}/meta.json`, bust);
        if (!mapMeta || mapMeta.id !== desiredMap) {
          setMapMeta(meta);
        }

        const [, wParsed, nParsed, qParsed, iParsed, sParsed, pParsed, dParsed, bParsed, ohParsed, trParsed] =
          await Promise.all([
            ensureCoreCatalogsLoaded(),
            fetchRequiredJson<{ locations?: WorldLocation[] }>("assets/data/world-locations.json", bust),
            fetchRequiredJson<{ locations?: NpcLocationGroup[] }>("assets/data/npcs-catalog.json", bust),
            fetchRequiredJson<{ quests?: QuestEntry[] }>("assets/data/quests-catalog.json", bust),
            fetchRequiredJson<{ items?: ItemEntry[] }>("assets/data/items-catalog.json", bust),
            fetchRequiredJson<{ spells?: SpellEntry[] }>("assets/data/spells-catalog.json", bust),
            fetchRequiredJson<unknown>("assets/data/world-paint.json", bust),
            fetchRequiredJson<{ heroes?: HeroDisciplinesEntry[] }>("assets/data/disciplines-catalog.json", bust),
            fetchRequiredJson<BattleConfigData>("assets/data/battle-config.json", bust),
            fetchRequiredJson<OutpostHuntsCatalog>("assets/data/outpost-hunts-catalog.json", bust),
            fetchRequiredJson<TravelCatalog>("assets/data/travel-catalog.json", bust),
          ]);

        setOutpostHuntsCatalog(ohParsed);
        setTravelCatalog(trParsed);

        const dMap: Partial<Record<HeroId, HeroDisciplinesEntry>> = {};
        for (const hEntry of dParsed.heroes ?? []) {
          dMap[hEntry.heroId] = hEntry;
        }
        setDisciplinesByHero(dMap);
        setBattleConfig(bParsed);

        const loadedLocations = wParsed.locations ?? [];
        setWorldLocations(loadedLocations);
        setWorldCollision(buildWorldCollisionIndex(pParsed));

        const nMap: Record<string, NpcLocationGroup> = {};
        for (const entry of nParsed.locations ?? []) {
          nMap[entry.locationId] = entry;
        }
        setNpcsByLocation(nMap);

        const loadedQuests = qParsed.quests ?? [];
        setQuestsCatalog(loadedQuests);
        const qMap: Record<string, QuestEntry> = {};
        for (const q of loadedQuests) {
          qMap[`${q.hubId}::${q.title}`] = q;
          if (!qMap[q.title]) qMap[q.title] = q;
        }
        setQuestsByKey(qMap);

        const loadedItems = iParsed.items ?? [];
        setItemsCatalog(loadedItems);
        setSpellsCatalog(sParsed.spells ?? []);
        setLoadErrorMsg(null);

        return { meta, locations: loadedLocations, items: loadedItems, battleConfig: bParsed };
      } catch (err) {
        reportFatalLoadError(err);
        throw err;
      }
    },
    [mapMeta, reportFatalLoadError]
  );

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
    completedQuestIds: save.completedQuestIds,
    activeOutpostHunts: save.activeOutpostHunts,
    outpostOffers: save.outpostOffers,
    completedOutpostHunts: save.completedOutpostHunts,
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
        completedQuestIds?: string[];
        activeOutpostHunts?: ActiveOutpostHunt[];
        outpostOffers?: Record<string, ActiveOutpostHunt>;
        completedOutpostHunts?: number;
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
        completedQuestIds: override?.completedQuestIds ?? completedQuestIds,
        activeOutpostHunts: override?.activeOutpostHunts ?? activeOutpostHunts,
        outpostOffers: override?.outpostOffers ?? outpostOffers,
        completedOutpostHunts: override?.completedOutpostHunts ?? completedOutpostHunts,
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
      completedQuestIds,
      activeOutpostHunts,
      outpostOffers,
      completedOutpostHunts,
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
        completedQuestIds?: string[];
        activeOutpostHunts?: ActiveOutpostHunt[];
        outpostOffers?: Record<string, ActiveOutpostHunt>;
        completedOutpostHunts?: number;
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
        completedQuestIds?: string[];
        activeOutpostHunts?: ActiveOutpostHunt[];
        outpostOffers?: Record<string, ActiveOutpostHunt>;
        completedOutpostHunts?: number;
        mapId?: string;
        activeBattle?: BattleState | null;
      }
    ) => {
      const applyEnter = async () => {
        const { meta, battleConfig: loadedBattleConfig } = await loadWorldAssets(inventoryOverride?.mapId ?? "map_01");
        const nextOrder = orderOverride ?? partyOrder;
        const initSilver = inventoryOverride?.silver ?? getStartingCampaignSilver();
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
        const initCompletedQuests = inventoryOverride?.completedQuestIds ?? [];
        const initOutpostHuntsList = (inventoryOverride?.activeOutpostHunts ?? []).map((h) =>
          normalizeOutpostOfferScale(h, loadedBattleConfig)
        );
        const initOutpostOffers = Object.fromEntries(
          Object.entries(inventoryOverride?.outpostOffers ?? {}).map(([k, v]) => [
            k,
            normalizeOutpostOfferScale(v, loadedBattleConfig),
          ])
        );
        const initOutpostHunts = inventoryOverride?.completedOutpostHunts ?? 0;

        setPartyOrder(nextOrder);
        setHeroLevels(initLevels);
        setHeroXp(initXpMap);
        setInitialDiscovered(discoveredOverride);
        setAcceptedQuestIds(acceptedQuestsOverride);
        setCompletedQuestIds(initCompletedQuests);
        setActiveOutpostHunts(initOutpostHuntsList);
        setOutpostOffers(initOutpostOffers);
        setCompletedOutpostHunts(initOutpostHunts);
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
            completedQuestIds: initCompletedQuests,
            activeOutpostHunts: initOutpostHuntsList,
            outpostOffers: initOutpostOffers,
            completedOutpostHunts: initOutpostHunts,
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
    if (isCombatSandbox) {
      void (async () => {
        const bust = Date.now();
        try {
          const [, iParsed, sParsed, dParsed, bParsed] = await Promise.all([
            ensureCoreCatalogsLoaded(),
            fetchRequiredJson<{ items?: ItemEntry[] }>("assets/data/items-catalog.json", bust),
            fetchRequiredJson<{ spells?: SpellEntry[] }>("assets/data/spells-catalog.json", bust),
            fetchRequiredJson<{ heroes?: HeroDisciplinesEntry[] }>("assets/data/disciplines-catalog.json", bust),
            fetchRequiredJson<BattleConfigData>("assets/data/battle-config.json", bust),
          ]);
          if (!active) return;
          setPartyOrder((prev) => (prev.length > 0 ? prev : [...DEFAULT_PARTY_ORDER]));
          setHeroLevels((prev) => (Object.keys(prev).length > 0 ? prev : normalizeHeroLevelsMap(undefined, 1)));
          setHeroXp((prev) => (Object.keys(prev).length > 0 ? prev : normalizeHeroXpMap(undefined, 0)));
          setItemsCatalog(iParsed.items ?? []);
          setSpellsCatalog(sParsed.spells ?? []);
          const dMap: Partial<Record<HeroId, HeroDisciplinesEntry>> = {};
          for (const hEntry of dParsed.heroes ?? []) dMap[hEntry.heroId] = hEntry;
          setDisciplinesByHero(dMap);
          setBattleConfig(bParsed);
          window.parent?.postMessage({ type: "rod:combat-sandbox-ready" }, window.location.origin);
        } catch (err) {
          if (active) reportFatalLoadError(err);
        }
      })();
      return () => {
        active = false;
      };
    }

    void (async () => {
      try {
        const [, latest] = await Promise.all([ensureCoreCatalogsLoaded(), refreshLatest()]);
        if (!active) return;
        setPartyOrder((prev) => (prev.length > 0 ? prev : [...DEFAULT_PARTY_ORDER]));
        setHeroLevels((prev) => (Object.keys(prev).length > 0 ? prev : normalizeHeroLevelsMap(undefined, 1)));
        setHeroXp((prev) => (Object.keys(prev).length > 0 ? prev : normalizeHeroXpMap(undefined, 0)));
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
      } catch (err) {
        if (active) reportFatalLoadError(err);
      } finally {
        if (active) setRestoringSession(false);
      }
    })();
    return () => {
      active = false;
    };
    // Run once on startup
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isCombatSandbox || !battleConfig || itemsCatalog.length === 0) return;
    window.parent?.postMessage({ type: "rod:combat-sandbox-ready" }, window.location.origin);
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const msg = event.data as {
        type?: string;
        payload?: {
          zoneCode: number;
          biomeName?: string;
          portalLoc?: WorldLocation | null;
          partyOrder?: HeroId[];
          heroLevels?: Partial<Record<HeroId, number>>;
          heroSpentAttrs?: Partial<Record<HeroId, HeroAttrMap>>;
          equippedByHero?: EquippedGearMap;
          learnedSpellIds?: string[];
          chosenDisciplinesByHero?: ChosenDisciplinesMap;
          bagCounts?: Record<string, number>;
          heroHpPct?: Partial<Record<HeroId, number>>;
          heroMpPct?: Partial<Record<HeroId, number>>;
        };
      };
      if (msg?.type !== "rod:combat-sandbox-start" || !msg.payload) return;
      const p = msg.payload;
      const z = Math.max(1, Math.min(20, Number(p.zoneCode) || 1));
      const zMin = (z - 1) * 5 + 1;
      const zMax = z === 20 ? 99 : z * 5;
      const nextOrder = normalizePartyOrder(p.partyOrder, p.partyOrder?.[0] ?? "valen");
      const nextLevels = normalizeHeroLevelsMap(p.heroLevels, zMin);
      const avgLv = getAveragePartyLevel(nextLevels, nextOrder, zMin);
      const matchingStages = battleConfig.stages.filter(
        (s) => !s.isPortal && s.zoneSpawns && Boolean(s.zoneSpawns[String(z)])
      );
      const pickedStage =
        (p.biomeName
          ? matchingStages.find((s) => s.name === p.biomeName || s.id === p.biomeName) ??
            battleConfig.stages.find((s) => s.name === p.biomeName || s.id === p.biomeName)
          : undefined) ??
        matchingStages[Math.floor(Math.random() * Math.max(1, matchingStages.length))] ??
        battleConfig.stages.find((s) => !s.isPortal);
      const biomeLabel = pickedStage?.name ?? p.biomeName ?? "Meadow";

      const bState = createBattleState({
        config: battleConfig,
        partyOrder: nextOrder,
        level: avgLv,
        heroLevels: nextLevels,
        heroSpentAttrs: p.heroSpentAttrs ?? {},
        equippedByHero: p.equippedByHero ?? {},
        itemsById,
        socketsByHero: {},
        heroHpPct: p.heroHpPct ?? {},
        heroMpPct: p.heroMpPct ?? {},
        disciplinesByHero,
        chosenDisciplinesByHero: p.chosenDisciplinesByHero ?? {},
        mapId: `map_0${Math.ceil(z / 5)}`,
        biomeName: biomeLabel,
        zoneName: `Zone ${z}`,
        zoneCode: z,
        zoneMin: zMin,
        zoneMax: zMax,
        nearWaterKind: null,
        portalLoc: p.portalLoc ?? null,
      });
      sandboxSnapshotRef.current = bState;
      sandboxMetaRef.current = {
        zoneCode: z,
        biomeName: bState.biomeName,
        startMs: Date.now(),
        enemies: bState.enemies.map((e) => ({ name: e.name, level: e.level, maxHp: e.maxHp })),
      };
      setSandboxViewCfg({
        partyLevel: avgLv,
        heroLevels: nextLevels,
        learnedSpellIds: p.learnedSpellIds ?? [],
        bagCounts: p.bagCounts ?? {},
      });
      setSandboxBattle(bState);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [battleConfig, disciplinesByHero, isCombatSandbox, itemsById, itemsCatalog.length]);

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

        let nextOffers: Record<string, ActiveOutpostHunt> | undefined;
        if (locId.startsWith("outpost_") && battleConfig) {
          const existingOffer = outpostOffers[locId];
          if (existingOffer) {
            const normalized = normalizeOutpostOfferScale(existingOffer, battleConfig);
            if (normalized !== existingOffer) {
              nextOffers = { ...outpostOffers, [locId]: normalized };
              setOutpostOffers(nextOffers);
            }
          } else {
            const existingActive = activeOutpostHunts.find((h) => h.outpostId === locId);
            const locMeta = worldLocations.find((l) => l.id === locId);
            const offer = existingActive ?? (locMeta ? rollOutpostHuntOffer(locMeta, battleConfig) : null);
            if (offer) {
              nextOffers = { ...outpostOffers, [locId]: existingActive ? { ...offer, killsProgress: 0 } : offer };
              setOutpostOffers(nextOffers);
            }
          }
        }

        setActiveLocationId(locId);
        if (mapMeta) {
          await persistSave("autosave", "Auto-Save", {
            x: runtimeRef.current.x,
            y: runtimeRef.current.y,
            playtime: runtimeRef.current.playtime,
            meta: mapMeta,
            ...(nextOffers ? { outpostOffers: nextOffers } : {}),
          });
        }
      });
    },
    [activeLocationId, activeOutpostHunts, battleConfig, fadeTransition, mapMeta, outpostOffers, persistSave, worldLocations]
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

  // Global keyboard shortcuts (Esc + Party Menu P + Quest Journal J)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (openingCutsceneOpen || activeBattle) return;
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA" || tgt.tagName === "SELECT" || tgt.isContentEditable)) {
        return;
      }
      if ((e.code === "KeyP" || e.key.toLowerCase() === "p") && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (screen === "game" && !loadOpen && !settingsOpen && !charSelectOpen && !confirmNewOpen) {
          e.preventDefault();
          audioEngine.playUiClick(0.32);
          setPaused(false);
          if (partyOpen && partyInitialTab === "journal") {
            setPartyInitialTab("party");
          } else {
            setPartyInitialTab("party");
            setPartyOpen((prev) => !prev);
          }
        }
        return;
      }
      if ((e.code === "KeyJ" || e.key.toLowerCase() === "j") && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (screen === "game" && !loadOpen && !settingsOpen && !charSelectOpen && !confirmNewOpen) {
          e.preventDefault();
          audioEngine.playUiClick(0.32);
          setPaused(false);
          if (partyOpen && partyInitialTab === "journal") {
            setPartyOpen(false);
          } else {
            setPartyInitialTab("journal");
            setPartyOpen(true);
          }
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
  }, [confirmNewOpen, charSelectOpen, openingCutsceneOpen, partyOpen, partyInitialTab, loadOpen, settingsOpen, screen, activeLocationId, activeBattle, handleLeaveLocation]);

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

  // Ensure an Outpost rolls & saves its locked hunt contract once if visited before battleConfig finished loading
  useEffect(() => {
    if (!activeLocation || !activeLocation.id.startsWith("outpost_") || !battleConfig) return;
    if (outpostOffers[activeLocation.id]) return;
    const existingActive = activeOutpostHunts.find((h) => h.outpostId === activeLocation.id);
    const rolled = existingActive ? { ...existingActive, killsProgress: 0 } : rollOutpostHuntOffer(activeLocation, battleConfig);
    if (!rolled) return;
    const nextOffers = { ...outpostOffers, [activeLocation.id]: rolled };
    setOutpostOffers(nextOffers);
    if (mapMeta) {
      void persistSave("autosave", "Auto-Save", {
        x: runtimeRef.current.x,
        y: runtimeRef.current.y,
        playtime: runtimeRef.current.playtime,
        meta: mapMeta,
        outpostOffers: nextOffers,
      });
    }
  }, [activeLocation, activeOutpostHunts, battleConfig, mapMeta, outpostOffers, persistSave]);

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
    await ensureCoreCatalogsLoaded();
    const existing = latestSave ?? (await gameApi.getLatestSave());
    if (existing) {
      if (!latestSave) setLatestSave(existing);
      setConfirmNewOpen(true);
      return;
    }
    setCharSelectOpen(true);
  }, [latestSave]);

  const handleConfirmWipeNewCampaign = useCallback(async () => {
    await ensureCoreCatalogsLoaded();
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
      if (completedQuestIds.includes(quest.questId)) {
        showToast("Quest already completed");
        return;
      }
      if (acceptedQuestIds.includes(quest.questId)) return;
      const activeLimit = getGlobalActiveQuestLimit();
      if (acceptedQuestIds.length + activeOutpostHunts.length >= activeLimit) {
        showToast(`Journal full (${activeLimit}/${activeLimit} active quests)`);
        return;
      }
      const next = [...acceptedQuestIds, quest.questId];
      setAcceptedQuestIds(next);
      if (mapMeta) {
        void persistSave("autosave", "Auto-Save", {
          x: runtimeRef.current.x,
          y: runtimeRef.current.y,
          playtime: runtimeRef.current.playtime,
          meta: mapMeta,
          acceptedQuests: next,
        });
      }
      audioEngine.playSave();
      showToast(`Quest Accepted: ${quest.title}`);
    },
    [acceptedQuestIds, activeOutpostHunts.length, completedQuestIds, mapMeta, persistSave, showToast]
  );

  const handleAcceptOutpostHunt = useCallback(
    (hunt: ActiveOutpostHunt) => {
      if (activeOutpostHunts.some((h) => h.outpostId === hunt.outpostId)) {
        showToast("Finish or abandon your active hunt at this Outpost first");
        return;
      }
      const activeLimit = getGlobalActiveQuestLimit();
      if (acceptedQuestIds.length + activeOutpostHunts.length >= activeLimit) {
        showToast(`Journal full (${activeLimit}/${activeLimit} active quests)`);
        return;
      }
      const nextHunts = [...activeOutpostHunts, { ...hunt, killsProgress: 0 }];
      setActiveOutpostHunts(nextHunts);
      if (mapMeta) {
        void persistSave("autosave", "Auto-Save", {
          x: runtimeRef.current.x,
          y: runtimeRef.current.y,
          playtime: runtimeRef.current.playtime,
          meta: mapMeta,
          activeOutpostHunts: nextHunts,
        });
      }
      audioEngine.playSave();
      showToast(`Hunt Accepted: Slay ${hunt.killsRequired} ${pluralizeMonsterName(hunt.mobName, hunt.killsRequired)}`);
    },
    [acceptedQuestIds.length, activeOutpostHunts, mapMeta, persistSave, showToast]
  );

  const handleAbandonOutpostHunt = useCallback(
    (outpostId: string) => {
      const nextHunts = activeOutpostHunts.filter((h) => h.outpostId !== outpostId);
      setActiveOutpostHunts(nextHunts);
      showToast("Outpost hunt abandoned");
      if (mapMeta) {
        void persistSave("autosave", "Auto-Save", {
          x: runtimeRef.current.x,
          y: runtimeRef.current.y,
          playtime: runtimeRef.current.playtime,
          meta: mapMeta,
          activeOutpostHunts: nextHunts,
        });
      }
    },
    [activeOutpostHunts, mapMeta, persistSave, showToast]
  );

  const handleCompleteOutpostHunt = useCallback(
    (outpostId: string) => {
      const hunt = activeOutpostHunts.find((h) => h.outpostId === outpostId);
      if (!hunt || hunt.killsProgress < hunt.killsRequired) return;

      const nextHunts = activeOutpostHunts.filter((h) => h.outpostId !== outpostId);
      const nextCompleted = completedOutpostHunts + 1;
      const nextSilver = silver + hunt.rewardSilver;

      const nextLevels: Partial<Record<HeroId, number>> = { ...heroLevels };
      const nextXpMap: Partial<Record<HeroId, number>> = { ...heroXp };
      const leveledNames: string[] = [];
      for (const hid of partyOrder) {
        const prevLv = getHeroLevel(heroLevels, hid, 1);
        const prevXp = getHeroXp(heroXp, hid);
        const res = applyHeroXpGain(prevLv, prevXp, hunt.rewardXp);
        nextLevels[hid] = res.level;
        nextXpMap[hid] = res.xp;
        if (res.leveledUp) leveledNames.push(`${getHeroById(hid).name} Lv ${res.level}`);
      }
      const nextAvgLv = getAveragePartyLevel(nextLevels, partyOrder, 1);

      setActiveOutpostHunts(nextHunts);
      setCompletedOutpostHunts(nextCompleted);
      setSilver(nextSilver);
      setHeroLevels(nextLevels);
      setHeroXp(nextXpMap);

      const outpostLoc = worldLocations.find((l) => l.id === outpostId);
      const nextOffers = { ...outpostOffers };
      if (outpostLoc && battleConfig) {
        const freshOffer = rollOutpostHuntOffer(outpostLoc, battleConfig, hunt.mobId);
        if (freshOffer) nextOffers[outpostId] = freshOffer;
        else delete nextOffers[outpostId];
      } else {
        delete nextOffers[outpostId];
      }
      setOutpostOffers(nextOffers);

      audioEngine.playDiscovery();
      showToast(
        leveledNames.length > 0
          ? `Hunt Complete! ${leveledNames.join(", ")} (+${hunt.rewardSilver.toLocaleString()}s · +${hunt.rewardXp.toLocaleString()} XP per hero)`
          : `Hunt Complete: +${hunt.rewardSilver.toLocaleString()}s · +${hunt.rewardXp.toLocaleString()} XP per hero`
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
          activeOutpostHunts: nextHunts,
          outpostOffers: nextOffers,
          completedOutpostHunts: nextCompleted,
        });
      }
    },
    [
      activeOutpostHunts,
      battleConfig,
      completedOutpostHunts,
      heroLevels,
      heroXp,
      mapMeta,
      outpostOffers,
      partyOrder,
      persistSave,
      showToast,
      silver,
      worldLocations,
    ]
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
          showToast(`${getHeroById(choice.heroId).name} already knows ${MAX_SPELLS_PER_REGION}/${MAX_SPELLS_PER_REGION} Tier ${spellObj.region} spells`);
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

      const heroDef = getHeroById(targetHeroId);
      const heroLv = getHeroLevel(heroLevels, targetHeroId, partyLevel);
      const vitals = computeHeroVitals(
        targetHeroId,
        heroLv,
        heroSpentAttrs,
        equippedByHero,
        itemsById,
        socketsByHero,
        heroHpPct,
        heroMpPct
      );

      const effectTxt = item.effect ?? "";
      const isPureMp = /mana|mp/i.test(item.name) && !/elixir|phoenix/i.test(item.name);
      const isCureOnly = /antidote|cooling|warming|clarity|panacea/i.test(item.name);
      if (isCureOnly) {
        showToast("Status cures are used during combat when afflicted");
        return;
      }

      const curHpPct = heroHpPct[targetHeroId] ?? 100;
      const curMpPctVal = heroMpPct[targetHeroId] ?? 100;

      if (isPureMp) {
        if (!vitals.hasMp) {
          showToast(`${heroDef.name} does not use MP`);
          return;
        }
        if (curMpPctVal >= 100) {
          showToast(`${heroDef.name} is already at full MP`);
          return;
        }
      } else if (curHpPct >= 100) {
        showToast(`${heroDef.name} is already at full HP`);
        return;
      }

      const hpMatch = effectTxt.match(/Restores?\s+([\d,]+)\s*HP/i);
      const mpMatch = effectTxt.match(/Restores?\s+([\d,]+)\s*MP/i);
      const hpGainPct = hpMatch
        ? Math.max(1, Math.round((Number(hpMatch[1].replace(/,/g, "")) / Math.max(1, vitals.maxHp)) * 100))
        : /reviv/i.test(item.name)
          ? 30
          : /phoenix/i.test(item.name)
            ? 75
            : /greater|full|elixir|supreme/i.test(item.name)
              ? 100
              : 40;
      const mpGainPct = mpMatch
        ? Math.max(1, Math.round((Number(mpMatch[1].replace(/,/g, "")) / Math.max(1, vitals.maxMp)) * 100))
        : /greater|full|elixir|supreme/i.test(item.name)
          ? 100
          : 40;

      const nextBag = { ...bagCounts };
      nextBag[sid] = Math.max(0, (nextBag[sid] ?? 1) - 1);
      if (nextBag[sid] <= 0) delete nextBag[sid];

      const nextHp: Partial<Record<HeroId, number>> = isPureMp
        ? heroHpPct
        : { ...heroHpPct, [targetHeroId]: Math.min(100, curHpPct + hpGainPct) };
      const nextMp: Partial<Record<HeroId, number>> =
        isPureMp || /elixir|supreme/i.test(item.name)
          ? { ...heroMpPct, [targetHeroId]: Math.min(100, curMpPctVal + mpGainPct) }
          : heroMpPct;

      setBagCounts(nextBag);
      setHeroHpPct(nextHp);
      setHeroMpPct(nextMp);
      audioEngine.playDiscovery();
      showToast(`Used ${item.name} on ${heroDef.name}`);
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
    [
      bagCounts,
      equippedByHero,
      heroHpPct,
      heroLevels,
      heroMpPct,
      heroSpentAttrs,
      itemsById,
      mapMeta,
      partyLevel,
      persistSave,
      showToast,
      socketsByHero,
    ]
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
      for (const [cid, qty] of Object.entries(outcome.droppedConsumables ?? {})) {
        if (qty > 0) nextBag[cid] = (nextBag[cid] ?? 0) + qty;
      }
      const nextSealed =
        outcome.sealedPortalId && !sealedPortalIds.includes(outcome.sealedPortalId)
          ? [...sealedPortalIds, outcome.sealedPortalId]
          : sealedPortalIds;

      let huntsChanged = false;
      let completedHuntToast: string | null = null;
      const nextHunts = activeOutpostHunts.map((h) => {
        if (h.zoneNum !== outcome.zoneCode || h.killsProgress >= h.killsRequired) return h;
        const slain = outcome.defeatedMonsterIds[h.mobId] ?? 0;
        if (slain <= 0) return h;
        huntsChanged = true;
        const nextKills = Math.min(h.killsRequired, h.killsProgress + slain);
        if (nextKills >= h.killsRequired) {
          completedHuntToast = `Outpost Hunt Complete: ${h.mobName} (${nextKills}/${h.killsRequired}) — Return to ${h.outpostName}!`;
        } else {
          completedHuntToast = `Outpost Hunt: ${h.mobName} (${nextKills}/${h.killsRequired})`;
        }
        return { ...h, killsProgress: nextKills };
      });

      setBagCounts(nextBag);
      setHeroHpPct(outcome.heroHpPct);
      setHeroMpPct(outcome.heroMpPct);
      setHeroLevels(nextLevels);
      setHeroXp(nextXpMap);
      setSilver(nextSilver);
      setTradeGoodCounts(nextTrade);
      setSealedPortalIds(nextSealed);
      if (huntsChanged) setActiveOutpostHunts(nextHunts);
      audioEngine.playSave();
      showToast(
        completedHuntToast
          ? completedHuntToast
          : leveledNames.length > 0
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
          activeOutpostHunts: huntsChanged ? nextHunts : activeOutpostHunts,
          heroHpPct: outcome.heroHpPct,
          heroMpPct: outcome.heroMpPct,
          activeBattle: null,
        });
      }
    },
    [
      activeOutpostHunts,
      bagCounts,
      heroLevels,
      heroXp,
      mapMeta,
      partyOrder,
      persistSave,
      sealedPortalIds,
      showToast,
      silver,
      tradeGoodCounts,
      worldLocations,
    ]
  );

  const activeQuestZones = useMemo(() => {
    const zones = new Set<number>();
    for (const h of activeOutpostHunts) {
      if (h.zoneNum >= 1 && h.zoneNum <= 20) zones.add(h.zoneNum);
    }
    for (const qid of acceptedQuestIds) {
      const q = questsCatalog.find((entry) => entry.questId === qid);
      if (!q) continue;
      const hub = worldLocations.find((loc) => loc.id === q.hubId);
      if (typeof hub?.zoneNum === "number" && hub.zoneNum >= 1 && hub.zoneNum <= 20) {
        zones.add(hub.zoneNum);
      }
    }
    return Array.from(zones);
  }, [acceptedQuestIds, activeOutpostHunts, questsCatalog, worldLocations]);

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

  if (isCombatSandbox) {
    return (
      <div className="fixed inset-0 bg-[#080a0f] text-[#e6edf7] flex items-center justify-center">
        {sandboxBattle && sandboxViewCfg ? (
          <BattleOverlay
            open={true}
            initialBattle={sandboxBattle}
            partyLevel={sandboxViewCfg.partyLevel}
            partyXp={0}
            heroLevels={sandboxViewCfg.heroLevels}
            heroXp={{}}
            spells={spellsCatalog}
            learnedSpellIds={sandboxViewCfg.learnedSpellIds}
            bagCounts={sandboxViewCfg.bagCounts}
            itemsById={itemsById}
            itemsCatalog={itemsCatalog}
            onBattleSnapshot={(snap) => {
              sandboxSnapshotRef.current = snap;
            }}
            onComplete={(outcome) => {
              const meta = sandboxMetaRef.current;
              const elapsedSec = meta ? Math.max(1, Math.round((Date.now() - meta.startMs) / 1000)) : 1;
              const rounds = sandboxSnapshotRef.current?.turnCounter ?? 1;
              let tradeSilverEarned = 0;
              const tradeGoodsDetail = Object.entries(outcome.droppedTradeGoods).map(([gid, qty]) => {
                const it = itemsById[gid];
                const sellEach = it?.sellSilver ?? 0;
                tradeSilverEarned += sellEach * qty;
                return { id: gid, name: it?.name ?? gid, qty, sellEach };
              });
              setSandboxBattle(null);
              window.parent?.postMessage(
                {
                  type: "rod:combat-sandbox-complete",
                  outcome,
                  meta,
                  rounds,
                  elapsedSec,
                  tradeSilverEarned,
                  tradeGoodsDetail,
                },
                window.location.origin
              );
            }}
          />
        ) : (
          <div className="text-center px-6 py-4 rounded border border-[#2c3345] bg-[#10141f]/90">
            <div className="font-display text-[18px] text-[#fae2aa] tracking-wide">
              Real Game Combat Engine Ready
            </div>
            <div className="text-[12.5px] text-[#9eb0c9] mt-1">
              Select a Danger Zone and click Start Battle to load a live procedural encounter.
            </div>
          </div>
        )}
      </div>
    );
  }

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
          travelCatalog={travelCatalog}
          partyOrder={partyOrder}
          level={partyLevel}
          heroLevels={heroLevels}
          heroHpPct={heroHpPct}
          heroMpPct={heroMpPct}
          sealedPortalIds={sealedPortalIds}
          activeQuestZones={activeQuestZones}
          acceptedQuestIds={acceptedQuestIds}
          completedQuestIds={completedQuestIds}
          activeOutpostHunts={activeOutpostHunts}
          questsCatalog={questsCatalog}
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
            setPartyInitialTab("party");
            setPartyOpen(true);
          }}
          onOpenJournal={() => {
            setPaused(false);
            setPartyInitialTab("journal");
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
          travelCatalog={travelCatalog}
          sealedPortalIds={sealedPortalIds}
          npcsByLocation={npcsByLocation}
          questsByKey={questsByKey}
          partyOrder={partyOrder}
          partyLevel={partyLevel}
          heroLevels={heroLevels}
          acceptedQuestIds={acceptedQuestIds}
          completedQuestIds={completedQuestIds}
          activeOutpostHunts={activeOutpostHunts}
          outpostOffer={activeLocation ? outpostOffers[activeLocation.id] ?? null : null}
          battleConfig={battleConfig}
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
          onAcceptOutpostHunt={handleAcceptOutpostHunt}
          onCompleteOutpostHunt={handleCompleteOutpostHunt}
          onAbandonOutpostHunt={handleAbandonOutpostHunt}
          onFreeRest={handleFreeRest}
          onSailToPort={(dest) => void handleSailToPort(dest)}
          onOpenParty={() => {
            setPaused(false);
            setPartyInitialTab("party");
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
        initialTab={partyInitialTab}
        activeTab={partyInitialTab}
        onTabChange={setPartyInitialTab}
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
        completedQuestIds={completedQuestIds}
        activeOutpostHunts={activeOutpostHunts}
        completedOutpostHunts={completedOutpostHunts}
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
        onAbandonOutpostHunt={handleAbandonOutpostHunt}
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

      {loadErrorMsg && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#06070a]/95 p-6">
          <div className="max-w-lg w-full rounded-lg border-2 border-[#c94a4a] bg-[#160b0e] p-5 text-[#ffd9d9] shadow-2xl space-y-2">
            <div className="text-[14px] font-bold uppercase tracking-wider text-[#ff8888]">
              Game Data Load Error
            </div>
            <div className="text-[13px] break-words text-[#ffe7e7]">{loadErrorMsg}</div>
          </div>
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
