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
import { OverworldCanvas, type PlayerRuntimeRef } from "./components/OverworldCanvas";
import { CharacterSelectModal, PartyMenuModal } from "./components/PartyModals";
import { TitleScreen } from "./components/TitleScreen";
import { DEFAULT_PARTY_ORDER, getHeroById, normalizePartyOrder } from "./heroes";
import type { BuyConfirmChoice } from "./shops/ShopCounterPanel";
import { buildStarterEquipment, itemSlotFor } from "./shops/shopLogic";
import type { AudioSettings, EquippedGearMap, HeroId, ItemEntry, MapMeta, NpcLocationGroup, QuestEntry, SaveSlotData, SpellEntry, WorldLocation } from "./types";

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
  const [partyLevel, setPartyLevel] = useState(1);

  const [audio, setAudio] = useState<AudioSettings>(() => loadAudioSettings());
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [mapMeta, setMapMeta] = useState<MapMeta | null>(null);
  const [worldLocations, setWorldLocations] = useState<WorldLocation[]>([]);
  const [npcsByLocation, setNpcsByLocation] = useState<Record<string, NpcLocationGroup>>({});
  const [questsByKey, setQuestsByKey] = useState<Record<string, QuestEntry>>({});
  const [itemsCatalog, setItemsCatalog] = useState<ItemEntry[]>([]);
  const [spellsCatalog, setSpellsCatalog] = useState<SpellEntry[]>([]);
  const [silver, setSilver] = useState<number>(200);
  const [equippedByHero, setEquippedByHero] = useState<EquippedGearMap>({});
  const [bagCounts, setBagCounts] = useState<Record<string, number>>({});
  const [learnedSpellIds, setLearnedSpellIds] = useState<string[]>([]);
  const [tradeGoodCounts, setTradeGoodCounts] = useState<Record<string, number>>({});
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
    regionLabel: "Region 1 · The Crownlands",
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

  const loadWorldAssets = useCallback(async (): Promise<{ meta: MapMeta; locations: WorldLocation[]; items: ItemEntry[] }> => {
    let meta = mapMeta;
    if (!meta) {
      const resp = await fetch(assetUrl("assets/maps/map_01/meta.json"));
      meta = (await resp.json()) as MapMeta;
      setMapMeta(meta);
    }
    const bust = Date.now();
    let loadedLocations: WorldLocation[] = [];
    let loadedItems: ItemEntry[] = itemsCatalog;
    try {
      const [wResp, nResp, qResp, iResp, sResp] = await Promise.all([
        fetch(assetUrl(`assets/data/world-locations.json?t=${bust}`)),
        fetch(assetUrl(`assets/data/npcs-catalog.json?t=${bust}`)),
        fetch(assetUrl(`assets/data/quests-catalog.json?t=${bust}`)),
        fetch(assetUrl(`assets/data/items-catalog.json?t=${bust}`)),
        fetch(assetUrl(`assets/data/spells-catalog.json?t=${bust}`)),
      ]);
      if (wResp.ok) {
        const parsed = (await wResp.json()) as { locations?: WorldLocation[] };
        loadedLocations = parsed.locations ?? [];
        setWorldLocations(loadedLocations);
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
        const qMap: Record<string, QuestEntry> = {};
        for (const q of parsed.quests ?? []) {
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
        silver?: number;
        equippedByHero?: EquippedGearMap;
        bagCounts?: Record<string, number>;
        learnedSpellIds?: string[];
        tradeGoodCounts?: Record<string, number>;
      }
    ): SaveSlotData | null => {
      const meta = override?.meta ?? mapMeta;
      if (!meta) return null;
      const order = override?.order ?? partyOrder;
      const lvl = override?.lvl ?? partyLevel;
      const leader = getHeroById(order[0]);
      const x = override ? override.x : runtimeRef.current.x;
      const y = override ? override.y : runtimeRef.current.y;
      const playtime = override ? override.playtime : runtimeRef.current.playtime;
      const discovered = override?.discovered ?? runtimeRef.current.discoveredLocations;
      const quests = override?.acceptedQuests ?? acceptedQuestIds;
      return {
        slotId,
        label,
        mapId: meta.id,
        regionLabel: meta.regionLabel,
        heroId: leader.id,
        heroName: leader.name,
        partyOrder: order,
        discoveredLocations: discovered,
        acceptedQuestIds: quests,
        silver: override?.silver ?? silver,
        equippedByHero: override?.equippedByHero ?? equippedByHero,
        bagCounts: override?.bagCounts ?? bagCounts,
        learnedSpellIds: override?.learnedSpellIds ?? learnedSpellIds,
        tradeGoodCounts: override?.tradeGoodCounts ?? tradeGoodCounts,
        level: lvl,
        x: Math.round(x),
        y: Math.round(y),
        playtimeSeconds: Math.floor(playtime),
        savedAt: new Date().toISOString(),
      };
    },
    [mapMeta, partyOrder, partyLevel, acceptedQuestIds, silver, equippedByHero, bagCounts, learnedSpellIds, tradeGoodCounts]
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
        silver?: number;
        equippedByHero?: EquippedGearMap;
        bagCounts?: Record<string, number>;
        learnedSpellIds?: string[];
        tradeGoodCounts?: Record<string, number>;
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
      }
    ) => {
      const applyEnter = async () => {
        const { meta, items } = await loadWorldAssets();
        const nextOrder = orderOverride ?? partyOrder;
        const initSilver = inventoryOverride?.silver ?? 200;
        const initEquip = inventoryOverride?.equippedByHero && Object.keys(inventoryOverride.equippedByHero).length > 0
          ? inventoryOverride.equippedByHero
          : buildStarterEquipment(items);
        const initBag = inventoryOverride?.bagCounts ?? { cons_minor_healing_potion: 2 };
        const initSpells = inventoryOverride?.learnedSpellIds ?? [];
        const initTrade = inventoryOverride?.tradeGoodCounts ?? {};

        setPartyOrder(nextOrder);
        setPartyLevel(levelOverride);
        setInitialDiscovered(discoveredOverride);
        setAcceptedQuestIds(acceptedQuestsOverride);
        setSilver(initSilver);
        setEquippedByHero(initEquip);
        setBagCounts(initBag);
        setLearnedSpellIds(initSpells);
        setTradeGoodCounts(initTrade);
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
            lvl: levelOverride,
            discovered: discoveredOverride,
            acceptedQuests: acceptedQuestsOverride,
            silver: initSilver,
            equippedByHero: initEquip,
            bagCounts: initBag,
            learnedSpellIds: initSpells,
            tradeGoodCounts: initTrade,
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
          {
            silver: latest.silver,
            equippedByHero: latest.equippedByHero,
            bagCounts: latest.bagCounts,
            learnedSpellIds: latest.learnedSpellIds,
            tradeGoodCounts: latest.tradeGoodCounts,
          }
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
      if (openingCutsceneOpen) return;
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
  }, [confirmNewOpen, charSelectOpen, openingCutsceneOpen, partyOpen, loadOpen, settingsOpen, screen, activeLocationId, handleLeaveLocation]);

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

    if (screen !== "game" || paused || partyOpen || loadOpen || settingsOpen || openingCutsceneOpen || activeLocationId) {
      audioEngine.setMovementLoop("none");
    }
  }, [restoringSession, charSelectOpen, openingCutsceneOpen, screen, partyOpen, paused, loadOpen, settingsOpen, activeLocationId, activeLocation?.mapId, innResting]);

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
      setInnResting(true);
      audioEngine.playDiscovery();
      showToast(`Rested at ${hubName} — Party Restored`);
      if (mapMeta) {
        void persistSave("autosave", "Auto-Save");
      }
    },
    [mapMeta, persistSave, showToast]
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
        nextSpells = [...learnedSpellIds, choice.entry.id];
        showToast(`${getHeroById(choice.heroId).name} learned ${choice.entry.name}`);
      } else if (choice.mode === "bag") {
        nextBag[choice.entry.id] = (nextBag[choice.entry.id] ?? 0) + 1;
        showToast(`Bought ${choice.entry.name} → Shared Party Bag`);
      } else {
        const slot = itemSlotFor(choice.entry);
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
    (heroId: HeroId, item: ItemEntry) => {
      const slot = itemSlotFor(item);
      if (!slot || (bagCounts[item.id] ?? 0) <= 0) return;
      const nextBag = { ...bagCounts };
      nextBag[item.id] -= 1;
      if (nextBag[item.id] <= 0) delete nextBag[item.id];

      const nextEquip: EquippedGearMap = { ...equippedByHero };
      const heroGear = { ...(nextEquip[heroId] ?? {}) };
      const prevId = heroGear[slot];
      if (prevId) nextBag[prevId] = (nextBag[prevId] ?? 0) + 1;
      if (slot === "right_hand" && item.handed === "2H" && heroGear.left_hand) {
        nextBag[heroGear.left_hand] = (nextBag[heroGear.left_hand] ?? 0) + 1;
        delete heroGear.left_hand;
      } else if (slot === "left_hand" && heroGear.right_hand && itemsById[heroGear.right_hand]?.handed === "2H") {
        nextBag[heroGear.right_hand] = (nextBag[heroGear.right_hand] ?? 0) + 1;
        delete heroGear.right_hand;
      }
      heroGear[slot] = item.id;
      nextEquip[heroId] = heroGear;

      setBagCounts(nextBag);
      setEquippedByHero(nextEquip);
      audioEngine.playUiClick(0.38);
      showToast(`${getHeroById(heroId).name} equipped ${item.name}`);
      if (mapMeta) {
        void persistSave("autosave", "Auto-Save", {
          x: runtimeRef.current.x,
          y: runtimeRef.current.y,
          playtime: runtimeRef.current.playtime,
          meta: mapMeta,
          bagCounts: nextBag,
          equippedByHero: nextEquip,
        });
      }
    },
    [bagCounts, equippedByHero, itemsById, mapMeta, persistSave, showToast]
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
              {
                silver: latestSave.silver,
                equippedByHero: latestSave.equippedByHero,
                bagCounts: latestSave.bagCounts,
                learnedSpellIds: latestSave.learnedSpellIds,
                tradeGoodCounts: latestSave.tradeGoodCounts,
              }
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
          paused={paused || partyOpen || loadOpen || settingsOpen || openingCutsceneOpen || activeLocationId !== null}
          insideLocationId={overworldRootLocationId}
          mapMeta={mapMeta}
          worldLocations={worldLocations}
          partyOrder={partyOrder}
          level={partyLevel}
          startX={spawnState.x}
          startY={spawnState.y}
          startPlaytime={spawnState.playtime}
          initialDiscovered={initialDiscovered}
          runtimeRef={runtimeRef}
          onAutoSaveNeeded={handleAutoSaveNeeded}
          onEnterLocation={(loc) => handleEnterLocationById(loc.id, true)}
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
          npcsByLocation={npcsByLocation}
          questsByKey={questsByKey}
          partyOrder={partyOrder}
          partyLevel={partyLevel}
          acceptedQuestIds={acceptedQuestIds}
          silver={silver}
          items={itemsCatalog}
          itemsById={itemsById}
          spells={spellsCatalog}
          equippedByHero={equippedByHero}
          learnedSpellIds={learnedSpellIds}
          tradeGoodCounts={tradeGoodCounts}
          onBuyShopEntry={handleBuyShopEntry}
          onSellAllTradeGoods={handleSellAllTradeGoods}
          onAcceptQuest={handleAcceptQuest}
          onFreeRest={handleFreeRest}
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
              await enterWorld(startSpawn.x, startSpawn.y, 0, true, partyOrder, 1, []);
            } finally {
              launchingWorldRef.current = false;
            }
          })();
        }}
      />

      <PartyMenuModal
        open={screen === "game" && partyOpen && !loadOpen && !settingsOpen}
        partyOrder={partyOrder}
        level={partyLevel}
        silver={silver}
        equippedByHero={equippedByHero}
        itemsById={itemsById}
        bagCounts={bagCounts}
        learnedSpellIds={learnedSpellIds}
        spells={spellsCatalog}
        onEquipFromBag={handleEquipFromBag}
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
        onClose={() => {
          audioEngine.playUiClick();
          setPartyOpen(false);
        }}
      />

      <PauseMenuModal
        open={screen === "game" && paused && !partyOpen && !loadOpen && !settingsOpen}
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
            {
              silver: slot.silver,
              equippedByHero: slot.equippedByHero,
              bagCounts: slot.bagCounts,
              learnedSpellIds: slot.learnedSpellIds,
              tradeGoodCounts: slot.tradeGoodCounts,
            }
          );
        }}
        onClose={() => setLoadOpen(false)}
      />

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
