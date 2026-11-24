import { assetUrl } from "./api";
import { applyTavernTrackCatalog, getTavernTrackInfo, type TavernTrackInfo } from "./tavernLore";
import type { AudioCatalog, AudioSettings } from "./types";

export type MusicContext =
  | "title"
  | "cutscene"
  | "exploration"
  | "world_map"
  | "town"
  | "inn"
  | "tavern_map_01"
  | "tavern_map_02"
  | "tavern_map_03"
  | "tavern_map_04"
  | "combat"
  | "boss"
  | "silent";

export type TavernContinentContext = "tavern_map_01" | "tavern_map_02" | "tavern_map_03" | "tavern_map_04";

export type MovementLoopMode = "none" | "walk" | "boat";

export type SfxKey =
  | "ui_click"
  | "ui_open"
  | "ui_close"
  | "door_open"
  | "save"
  | "discovery"
  | "coin"
  | "drop"
  | "torch"
  | "sword"
  | "arrow"
  | "axe"
  | "dagger"
  | "flail"
  | "katana"
  | "mace"
  | "spear"
  | "staff"
  | "warhammer"
  | "spell_cast"
  | "fire_spell"
  | "water_spell";

let MUSIC_HEADROOM = 0.52;
let SFX_HEADROOM = 0.85;
let MOVEMENT_LOOP_GAIN = 0.42;

const MENU_MUSIC: Record<string, string> = {};
const EXPLORATION_PLAYLIST: string[] = [];
const COMBAT_PLAYLIST: string[] = [];
let BOSS_TRACK = "";
const TAVERN_MAP_CONTEXT_BY_ID: Record<string, TavernContinentContext> = {};
const TAVERN_PLAYLISTS: Record<string, string[]> = {};
const MOVEMENT_TRACKS: Record<string, string> = {};
const SFX_POOLS: Record<string, string[]> = {};
const DEFAULT_SFX_GAIN: Record<string, number> = {};
const SFX_KEYWORD_RULES: Array<{ keywords: string[]; key: string }> = [];
let audioCatalogLoaded = false;

function isTavernContext(ctx: MusicContext): ctx is TavernContinentContext {
  return ctx.startsWith("tavern_map_");
}

export function getTavernMusicContext(mapId?: string | null): TavernContinentContext {
  if (mapId && TAVERN_MAP_CONTEXT_BY_ID[mapId]) {
    return TAVERN_MAP_CONTEXT_BY_ID[mapId];
  }
  if (mapId === "map_02") return "tavern_map_02";
  if (mapId === "map_03") return "tavern_map_03";
  if (mapId === "map_04") return "tavern_map_04";
  return "tavern_map_01";
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

class RodAudioEngine {
  private settings: AudioSettings = { master: 80, music: 75, sfx: 85, muteOnUnfocus: false };
  private windowFocused = typeof document !== "undefined" ? !document.hidden : true;

  private musicContext: MusicContext = "silent";
  private activeTrackRel: string | null = null;
  private activeDeck: HTMLAudioElement | null = null;
  private fadingOutDecks = new Set<HTMLAudioElement>();
  private titleIntroPlayed = false;
  private explorationIdx = 0;
  private combatIdx = 0;
  private fadeTimer: number | null = null;
  private crossfadeProgress = 1;

  private moveMode: MovementLoopMode = "none";
  private moveAudio: HTMLAudioElement | null = null;
  private moveStopTimer: number | null = null;

  private unlocked = false;
  private pendingMusicResume = false;
  private lastUiClickAt = 0;
  private variantCounter = 0;
  private activeOneShots = new Set<HTMLAudioElement>();
  private trackListeners = new Set<(track: TavernTrackInfo | null) => void>();
  private tavernDecks: Partial<Record<TavernContinentContext, string[]>> = {};

  constructor() {
    if (typeof window === "undefined") return;

    const unlock = () => {
      this.unlocked = true;
      if (this.pendingMusicResume && this.activeDeck && this.activeDeck.paused && this.musicContext !== "silent") {
        void this.tryPlay(this.activeDeck, true);
      }
      if (this.moveMode !== "none" && this.moveAudio && this.moveAudio.paused) {
        void this.tryPlay(this.moveAudio, false);
      }
    };
    window.addEventListener("pointerdown", unlock, { capture: true, passive: true });
    window.addEventListener("keydown", unlock, { capture: true, passive: true });

    const onFocus = () => {
      this.windowFocused = !document.hidden;
      this.syncAllVolumes();
    };
    const onBlur = () => {
      this.windowFocused = false;
      this.syncAllVolumes();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onFocus);
  }

  private get focusScale(): number {
    return this.settings.muteOnUnfocus && !this.windowFocused ? 0 : 1;
  }

  private get targetMusicVol(): number {
    return clamp01((this.settings.master / 100) * (this.settings.music / 100) * MUSIC_HEADROOM * this.focusScale);
  }

  private get targetSfxVol(): number {
    return clamp01((this.settings.master / 100) * (this.settings.sfx / 100) * SFX_HEADROOM * this.focusScale);
  }

  public applySettings(next: AudioSettings): void {
    this.settings = { ...next };
    this.syncAllVolumes();
  }

  private syncAllVolumes(): void {
    const musicVol = this.targetMusicVol;
    if (this.activeDeck) {
      this.activeDeck.volume = clamp01(musicVol * this.crossfadeProgress);
    }
    if (this.moveAudio && this.moveMode !== "none") {
      this.moveAudio.volume = clamp01(this.targetSfxVol * MOVEMENT_LOOP_GAIN);
    }
  }

  private async tryPlay(audio: HTMLAudioElement, isMusic: boolean): Promise<void> {
    try {
      await audio.play();
      this.unlocked = true;
      if (isMusic) this.pendingMusicResume = false;
    } catch {
      if (isMusic) this.pendingMusicResume = true;
    }
  }

  private pickRandomTavernTrack(ctx: TavernContinentContext, excludeRel?: string | null): string {
    const rawPool = TAVERN_PLAYLISTS[ctx] ?? [];
    if (rawPool.length === 0) return "";
    const pool = [...rawPool];
    let deck = this.tavernDecks[ctx];
    if (!deck || deck.length === 0) {
      // Fisher-Yates shuffle every ballad in this continent's subset so random play visits all before repeating
      for (let i = pool.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      if (pool.length > 1 && excludeRel && pool[pool.length - 1] === excludeRel) {
        [pool[0], pool[pool.length - 1]] = [pool[pool.length - 1], pool[0]];
      }
      deck = pool;
      this.tavernDecks[ctx] = deck;
    }
    const popped = deck.pop();
    if (popped && popped === excludeRel && deck.length > 0) {
      const alt = deck.pop()!;
      deck.unshift(popped);
      return alt;
    }
    return popped ?? rawPool[0];
  }

  private notifyTrackChange(): void {
    const track = this.getCurrentTavernTrack();
    for (const cb of this.trackListeners) {
      cb(track);
    }
  }

  public getCurrentTavernTrack(): TavernTrackInfo | null {
    return getTavernTrackInfo(this.activeTrackRel);
  }

  public subscribeTrackChange(cb: (track: TavernTrackInfo | null) => void): () => void {
    this.trackListeners.add(cb);
    cb(this.getCurrentTavernTrack());
    return () => {
      this.trackListeners.delete(cb);
    };
  }

  public playNextTavernBallad(): void {
    if (!isTavernContext(this.musicContext)) return;
    const nextRel = this.pickRandomTavernTrack(this.musicContext, this.activeTrackRel);
    this.switchTrack(nextRel, false, this.musicContext);
  }

  private pickNextTrack(ctx: MusicContext): { rel: string; loop: boolean } | null {
    if (!audioCatalogLoaded) return null;
    if (isTavernContext(ctx)) {
      const rel = this.pickRandomTavernTrack(ctx, this.activeTrackRel);
      return rel ? { rel, loop: false } : null;
    }
    switch (ctx) {
      case "silent":
        return null;
      case "title":
        if (!this.titleIntroPlayed && MENU_MUSIC.titleStart) {
          return { rel: MENU_MUSIC.titleStart, loop: false };
        }
        return MENU_MUSIC.titleLoop ? { rel: MENU_MUSIC.titleLoop, loop: true } : null;
      case "cutscene":
        return MENU_MUSIC.cutscene ? { rel: MENU_MUSIC.cutscene, loop: true } : null;
      case "world_map":
        return MENU_MUSIC.worldMap ? { rel: MENU_MUSIC.worldMap, loop: true } : null;
      case "town":
        return MENU_MUSIC.town ? { rel: MENU_MUSIC.town, loop: true } : null;
      case "inn":
        return MENU_MUSIC.inn ? { rel: MENU_MUSIC.inn, loop: true } : null;
      case "boss":
        return BOSS_TRACK ? { rel: BOSS_TRACK, loop: true } : null;
      case "exploration": {
        if (EXPLORATION_PLAYLIST.length === 0) return null;
        const rel = EXPLORATION_PLAYLIST[this.explorationIdx % EXPLORATION_PLAYLIST.length];
        return { rel, loop: false };
      }
      case "combat": {
        if (COMBAT_PLAYLIST.length === 0) return null;
        const rel = COMBAT_PLAYLIST[this.combatIdx % COMBAT_PLAYLIST.length];
        return { rel, loop: false };
      }
    }
  }

  public syncPendingPlaybackAfterCatalogLoad(): void {
    this.notifyTrackChange();
    if (this.musicContext !== "silent" && !this.activeDeck) {
      const picked = this.pickNextTrack(this.musicContext);
      if (picked) {
        this.switchTrack(picked.rel, picked.loop, this.musicContext);
      }
    }
    if (this.moveMode !== "none" && !this.moveAudio) {
      const prevMode = this.moveMode;
      this.moveMode = "none";
      this.setMovementLoop(prevMode);
    }
  }

  public setMusicContext(next: MusicContext): void {
    if (next === this.musicContext && this.activeDeck) return;
    if (this.musicContext !== "title" && next === "title") {
      // Returning to title plays the calm seamless loop after the initial boot fanfare
      this.titleIntroPlayed = true;
    }
    this.musicContext = next;

    if (next === "silent") {
      this.fadeOutAllDecks();
      this.activeTrackRel = null;
      this.activeDeck = null;
      this.notifyTrackChange();
      return;
    }

    const picked = this.pickNextTrack(next);
    if (!picked) return;
    this.switchTrack(picked.rel, picked.loop, next);
  }

  private fadeOutAllDecks(): void {
    if (this.fadeTimer !== null) {
      window.clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }
    const candidates = new Set<HTMLAudioElement>(this.fadingOutDecks);
    if (this.activeDeck) candidates.add(this.activeDeck);
    for (const d of candidates) {
      d.pause();
      d.removeAttribute("src");
    }
    this.fadingOutDecks.clear();
  }

  private switchTrack(relPath: string, shouldLoop: boolean, ownedContext: MusicContext): void {
    if (this.activeTrackRel === relPath && this.activeDeck) {
      this.activeDeck.loop = shouldLoop;
      return;
    }

    const prevDeck = this.activeDeck;
    if (prevDeck) {
      this.fadingOutDecks.add(prevDeck);
    }

    const nextDeck = new Audio(assetUrl(relPath));
    nextDeck.preload = "auto";
    nextDeck.loop = shouldLoop;
    nextDeck.volume = 0;

    nextDeck.addEventListener("ended", () => {
      if (this.activeDeck !== nextDeck || this.musicContext !== ownedContext) return;
      if (ownedContext === "title") {
        this.titleIntroPlayed = true;
        this.switchTrack(MENU_MUSIC.titleLoop, true, "title");
      } else if (isTavernContext(ownedContext)) {
        const nextRel = this.pickRandomTavernTrack(ownedContext, this.activeTrackRel);
        this.switchTrack(nextRel, false, ownedContext);
      } else if (ownedContext === "exploration") {
        this.explorationIdx = (this.explorationIdx + 1) % EXPLORATION_PLAYLIST.length;
        this.switchTrack(EXPLORATION_PLAYLIST[this.explorationIdx], false, "exploration");
      } else if (ownedContext === "combat") {
        this.combatIdx = (this.combatIdx + 1) % COMBAT_PLAYLIST.length;
        this.switchTrack(COMBAT_PLAYLIST[this.combatIdx], false, "combat");
      }
    });

    this.activeDeck = nextDeck;
    this.activeTrackRel = relPath;
    this.crossfadeProgress = prevDeck ? 0 : 1;
    this.notifyTrackChange();

    if (!prevDeck) {
      nextDeck.volume = this.targetMusicVol;
    }
    void this.tryPlay(nextDeck, true);

    if (this.fadeTimer !== null) {
      window.clearInterval(this.fadeTimer);
    }

    if (!prevDeck) {
      this.fadeTimer = null;
      return;
    }

    const fadeStartVol = new Map<HTMLAudioElement, number>();
    for (const d of this.fadingOutDecks) {
      fadeStartVol.set(d, d.volume);
    }
    const steps = 18;
    let step = 0;
    this.fadeTimer = window.setInterval(() => {
      step += 1;
      const t = Math.min(1, step / steps);
      this.crossfadeProgress = t;
      if (this.activeDeck === nextDeck) {
        nextDeck.volume = clamp01(this.targetMusicVol * t);
      }
      for (const oldDeck of [...this.fadingOutDecks]) {
        const startVol = fadeStartVol.get(oldDeck) ?? 0;
        oldDeck.volume = clamp01(startVol * (1 - t));
        if (t >= 1) {
          oldDeck.pause();
          oldDeck.removeAttribute("src");
          this.fadingOutDecks.delete(oldDeck);
        }
      }
      if (t >= 1 && this.fadeTimer !== null) {
        window.clearInterval(this.fadeTimer);
        this.fadeTimer = null;
      }
    }, 45);
  }

  public setMovementLoop(mode: MovementLoopMode): void {
    if (this.moveStopTimer !== null && mode !== "none") {
      window.clearTimeout(this.moveStopTimer);
      this.moveStopTimer = null;
    }

    if (mode === "none") {
      if (this.moveMode === "none" || this.moveStopTimer !== null) return;
      this.moveStopTimer = window.setTimeout(() => {
        this.moveStopTimer = null;
        this.moveMode = "none";
        if (this.moveAudio) {
          this.moveAudio.pause();
        }
      }, 110);
      return;
    }

    const targetRel = MOVEMENT_TRACKS[mode];
    const switchingFile = this.moveMode !== mode;
    this.moveMode = mode;
    if (!targetRel) return;

    if (!this.moveAudio || switchingFile) {
      if (this.moveAudio) {
        this.moveAudio.pause();
        this.moveAudio.removeAttribute("src");
      }
      const el = new Audio(assetUrl(targetRel));
      el.loop = true;
      el.preload = "auto";
      this.moveAudio = el;
    }

    this.moveAudio.volume = clamp01(this.targetSfxVol * MOVEMENT_LOOP_GAIN);
    if (this.moveAudio.paused) {
      void this.tryPlay(this.moveAudio, false);
    }
  }

  public playSfx(key: SfxKey | string, volumeMultiplier?: number): void {
    const resolvedKey = this.resolveSfxKey(key);
    const pool = SFX_POOLS[resolvedKey];
    if (!pool || pool.length === 0) return;
    const rel = pool[this.variantCounter % pool.length];
    this.variantCounter = (this.variantCounter + 1) % 10000;

    if (this.activeOneShots.size >= 8) {
      const oldest = this.activeOneShots.values().next().value;
      if (oldest) {
        oldest.pause();
        this.activeOneShots.delete(oldest);
      }
    }

    const el = new Audio(assetUrl(rel));
    const gain = volumeMultiplier ?? DEFAULT_SFX_GAIN[resolvedKey] ?? 0.72;
    el.volume = clamp01(this.targetSfxVol * gain);
    this.activeOneShots.add(el);

    const cleanup = () => {
      this.activeOneShots.delete(el);
    };
    el.addEventListener("ended", cleanup, { once: true });
    el.addEventListener("error", cleanup, { once: true });
    void this.tryPlay(el, false);
  }

  private resolveSfxKey(raw: string): SfxKey {
    if (raw in SFX_POOLS) return raw as SfxKey;
    const norm = raw.trim().toLowerCase();
    for (const rule of SFX_KEYWORD_RULES) {
      if (rule.keywords.some((kw) => norm.includes(kw))) {
        return rule.key as SfxKey;
      }
    }
    return "ui_click";
  }

  public playUiClick(gain = 0.34): void {
    const now = performance.now();
    if (now - this.lastUiClickAt < 70) return;
    this.lastUiClickAt = now;
    this.playSfx("ui_click", gain);
  }

  public playUiOpen(): void {
    this.playSfx("ui_open", 0.45);
  }

  public playDoorOpen(): void {
    this.playSfx("door_open", 0.62);
  }

  public playSave(): void {
    this.playSfx("save", 0.65);
  }

  public playDiscovery(): void {
    this.playSfx("discovery", 0.68);
  }
}

export const audioEngine = new RodAudioEngine();

/** Populate music playlists, tavern ballads, headroom, and SFX pools from data/audio-catalog.json. */
export function applyAudioCatalog(catalog: AudioCatalog | null | undefined): void {
  if (!catalog) return;
  if (catalog.headroom) {
    if (typeof catalog.headroom.music === "number") MUSIC_HEADROOM = catalog.headroom.music;
    if (typeof catalog.headroom.sfx === "number") SFX_HEADROOM = catalog.headroom.sfx;
    if (typeof catalog.headroom.movementLoopGain === "number") MOVEMENT_LOOP_GAIN = catalog.headroom.movementLoopGain;
  }
  if (catalog.menuMusic) {
    Object.assign(MENU_MUSIC, catalog.menuMusic);
  }
  if (Array.isArray(catalog.explorationPlaylist)) {
    EXPLORATION_PLAYLIST.splice(0, EXPLORATION_PLAYLIST.length, ...catalog.explorationPlaylist);
  }
  if (Array.isArray(catalog.combatPlaylist)) {
    COMBAT_PLAYLIST.splice(0, COMBAT_PLAYLIST.length, ...catalog.combatPlaylist);
  }
  if (catalog.bossTrack) {
    BOSS_TRACK = catalog.bossTrack;
  }
  if (catalog.tavernMapContextByMapId) {
    for (const [k, v] of Object.entries(catalog.tavernMapContextByMapId)) {
      TAVERN_MAP_CONTEXT_BY_ID[k] = v as TavernContinentContext;
    }
  }
  if (catalog.tavernPlaylists) {
    for (const k of Object.keys(TAVERN_PLAYLISTS)) delete TAVERN_PLAYLISTS[k];
    Object.assign(TAVERN_PLAYLISTS, catalog.tavernPlaylists);
  }
  if (catalog.movementTracks) {
    Object.assign(MOVEMENT_TRACKS, catalog.movementTracks);
  }
  if (catalog.sfxPools) {
    for (const k of Object.keys(SFX_POOLS)) delete SFX_POOLS[k];
    Object.assign(SFX_POOLS, catalog.sfxPools);
  }
  if (catalog.defaultSfxGain) {
    for (const k of Object.keys(DEFAULT_SFX_GAIN)) delete DEFAULT_SFX_GAIN[k];
    Object.assign(DEFAULT_SFX_GAIN, catalog.defaultSfxGain);
  }
  if (Array.isArray(catalog.sfxKeywordRules)) {
    SFX_KEYWORD_RULES.splice(0, SFX_KEYWORD_RULES.length, ...catalog.sfxKeywordRules);
  }
  if (catalog.tavernTracks) {
    applyTavernTrackCatalog(catalog.tavernTracks);
  }
  audioCatalogLoaded = true;
  audioEngine.syncPendingPlaybackAfterCatalogLoad();
}
