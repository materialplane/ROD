import { assetUrl } from "./api";
import { getTavernTrackInfo, type TavernTrackInfo } from "./tavernLore";
import type { AudioSettings } from "./types";

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

const MUSIC_HEADROOM = 0.52;
const SFX_HEADROOM = 0.85;
const MOVEMENT_LOOP_GAIN = 0.42;

const MENU_MUSIC = {
  titleStart: "assets/audio/music/menu/menu__quiet_menu_start.ogg",
  titleLoop: "assets/audio/music/menu/menu__quiet_menu_loop.ogg",
  cutscene: "assets/audio/music/menu/menu__between_journeys.ogg",
  worldMap: "assets/audio/music/menu/menu__world_map.ogg",
  town: "assets/audio/music/menu/menu__safe_haven.ogg",
  inn: "assets/audio/music/menu/menu__resting_place.ogg",
} as const;

const EXPLORATION_PLAYLIST = [
  "assets/audio/music/exploration/exploration__quiet_crossing.ogg",
  "assets/audio/music/exploration/exploration__the_far_quiet.ogg",
  "assets/audio/music/exploration/exploration__under_pale_skies.ogg",
  "assets/audio/music/exploration/exploration__fallow_lands.ogg",
  "assets/audio/music/exploration/exploration__lantern_ashes.ogg",
] as const;

const COMBAT_PLAYLIST = [
  "assets/audio/music/action/combat__with_fire_and_sword.ogg",
  "assets/audio/music/action/combat__raised_by_the_storm.ogg",
  "assets/audio/music/action/combat__flameborn.ogg",
  "assets/audio/music/action/combat__beyond_the_starfall.ogg",
] as const;

const BOSS_TRACK = "assets/audio/music/action/combat__clash_of_the_kings.ogg";

/** Option 3: All 11 Season 1 musical chapters divided chronologically across Ethoria's 4 continents. */
const TAVERN_PLAYLISTS: Record<TavernContinentContext, readonly string[]> = {
  tavern_map_01: [
    "assets/audio/music/taverns/chapter_01_the_gladiator_yearning.ogg",
    "assets/audio/music/taverns/chapter_02_the_queen_the_plan.ogg",
    "assets/audio/music/taverns/chapter_03_the_gladiator_the_affair.ogg",
  ],
  tavern_map_02: [
    "assets/audio/music/taverns/chapter_04_the_queen_the_seduction.ogg",
    "assets/audio/music/taverns/chapter_05_the_king_the_iron_heir.ogg",
    "assets/audio/music/taverns/chapter_06_the_prince_the_arrogant_pupil.ogg",
  ],
  tavern_map_03: [
    "assets/audio/music/taverns/chapter_07_the_lead_commander_whispers_and_the_scar.ogg",
    "assets/audio/music/taverns/chapter_08_the_prince_the_humiliation.ogg",
    "assets/audio/music/taverns/chapter_09_the_gladiator_the_sacrifice.ogg",
  ],
  tavern_map_04: [
    "assets/audio/music/taverns/chapter_10_the_prince_the_awakening.ogg",
    "assets/audio/music/taverns/chapter_11_the_king_the_wrath_of_the_crown.ogg",
  ],
};

function isTavernContext(ctx: MusicContext): ctx is TavernContinentContext {
  return ctx.startsWith("tavern_map_");
}

export function getTavernMusicContext(mapId?: string | null): TavernContinentContext {
  if (mapId === "map_02") return "tavern_map_02";
  if (mapId === "map_03") return "tavern_map_03";
  if (mapId === "map_04") return "tavern_map_04";
  return "tavern_map_01";
}

const MOVEMENT_TRACKS: Record<Exclude<MovementLoopMode, "none">, string> = {
  walk: "assets/audio/sfx/walking_loop.ogg",
  boat: "assets/audio/sfx/boat_sailing.ogg",
};

/**
 * Explicit SFX & fallback mapping using the current audio library:
 * - Soft UI clicks / closes / fallback interactions -> `item_drop_04.ogg` (shortest soft tabletop thud, 0.53s)
 * - Opening gates, stepping outside Highcrown, major ledgers -> `mech_door_wood_open_03.ogg`
 * - Manual Save / Silver / Rewards -> `item_coin_pickup_05.ogg`
 * - Discoveries / New Campaign launch / Campfires -> `item_torch_ignite_04.ogg`
 * - Unknown combat melee -> `combat_sword_default_hit.ogg`
 * - Unknown magic -> `spell_cast_1.ogg` / `spell_cast_2.ogg`
 */
const SFX_POOLS: Record<SfxKey, readonly string[]> = {
  ui_click: ["assets/audio/sfx/item_drop_04.ogg"],
  ui_close: ["assets/audio/sfx/item_drop_04.ogg"],
  ui_open: ["assets/audio/sfx/mech_door_wood_open_03.ogg"],
  door_open: ["assets/audio/sfx/mech_door_wood_open_03.ogg"],
  save: ["assets/audio/sfx/item_coin_pickup_05.ogg"],
  coin: ["assets/audio/sfx/item_coin_pickup_05.ogg"],
  discovery: ["assets/audio/sfx/item_torch_ignite_04.ogg"],
  torch: ["assets/audio/sfx/item_torch_ignite_04.ogg"],
  drop: ["assets/audio/sfx/item_drop_04.ogg"],
  sword: ["assets/audio/sfx/combat_sword_default_hit.ogg"],
  arrow: ["assets/audio/sfx/combat_arrow_hit_03.ogg"],
  axe: ["assets/audio/sfx/combat_axe_hit_05.ogg"],
  dagger: ["assets/audio/sfx/combat_dagger_hit_06.ogg"],
  flail: ["assets/audio/sfx/combat_flail_hit_05.ogg"],
  katana: ["assets/audio/sfx/combat_katana_hit_06.ogg"],
  mace: ["assets/audio/sfx/combat_mace_hit_05.ogg"],
  spear: ["assets/audio/sfx/combat_spear_hit_05.ogg"],
  staff: ["assets/audio/sfx/combat_staff_hit_06.ogg"],
  warhammer: ["assets/audio/sfx/combat_warhammer_hit_05.ogg"],
  spell_cast: ["assets/audio/sfx/spell_cast_1.ogg", "assets/audio/sfx/spell_cast_2.ogg"],
  fire_spell: ["assets/audio/sfx/fire_spell_1.ogg", "assets/audio/sfx/fire_spell_2.ogg"],
  water_spell: ["assets/audio/sfx/water_spell_1.ogg", "assets/audio/sfx/water_spell_2.ogg"],
};

const DEFAULT_SFX_GAIN: Partial<Record<SfxKey, number>> = {
  ui_click: 0.34,
  ui_close: 0.28,
  ui_open: 0.45,
  door_open: 0.62,
  save: 0.65,
  discovery: 0.68,
  drop: 0.5,
};

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
    const pool = [...TAVERN_PLAYLISTS[ctx]];
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
    return popped ?? TAVERN_PLAYLISTS[ctx][0];
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
    if (isTavernContext(ctx)) {
      return { rel: this.pickRandomTavernTrack(ctx, this.activeTrackRel), loop: false };
    }
    switch (ctx) {
      case "silent":
        return null;
      case "title":
        if (!this.titleIntroPlayed) {
          return { rel: MENU_MUSIC.titleStart, loop: false };
        }
        return { rel: MENU_MUSIC.titleLoop, loop: true };
      case "cutscene":
        return { rel: MENU_MUSIC.cutscene, loop: true };
      case "world_map":
        return { rel: MENU_MUSIC.worldMap, loop: true };
      case "town":
        return { rel: MENU_MUSIC.town, loop: true };
      case "inn":
        return { rel: MENU_MUSIC.inn, loop: true };
      case "boss":
        return { rel: BOSS_TRACK, loop: true };
      case "exploration": {
        const rel = EXPLORATION_PLAYLIST[this.explorationIdx % EXPLORATION_PLAYLIST.length];
        return { rel, loop: false };
      }
      case "combat": {
        const rel = COMBAT_PLAYLIST[this.combatIdx % COMBAT_PLAYLIST.length];
        return { rel, loop: false };
      }
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
      d.src = "";
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
          oldDeck.src = "";
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

    if (!this.moveAudio || switchingFile) {
      if (this.moveAudio) {
        this.moveAudio.pause();
        this.moveAudio.src = "";
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
    if (norm.includes("bow") || norm.includes("crossbow") || norm.includes("arrow")) return "arrow";
    if (norm.includes("axe") || norm.includes("halberd")) return "axe";
    if (norm.includes("dagger") || norm.includes("knife")) return "dagger";
    if (norm.includes("flail")) return "flail";
    if (norm.includes("katana") || norm.includes("saber") || norm.includes("scimitar")) return "katana";
    if (norm.includes("mace") || norm.includes("club")) return "mace";
    if (norm.includes("spear") || norm.includes("pike") || norm.includes("lance")) return "spear";
    if (norm.includes("staff") || norm.includes("rod")) return "staff";
    if (norm.includes("hammer") || norm.includes("maul")) return "warhammer";
    if (norm.includes("fire") || norm.includes("flame") || norm.includes("ember")) return "fire_spell";
    if (norm.includes("water") || norm.includes("ice") || norm.includes("frost") || norm.includes("heal") || norm.includes("remedy")) {
      return "water_spell";
    }
    if (norm.includes("spell") || norm.includes("magic") || norm.includes("arcane")) return "spell_cast";
    if (norm.includes("sword") || norm.includes("blade") || norm.includes("hit") || norm.includes("attack")) return "sword";
    if (norm.includes("door") || norm.includes("gate") || norm.includes("enter")) return "door_open";
    if (norm.includes("save") || norm.includes("coin") || norm.includes("silver")) return "coin";
    if (norm.includes("torch") || norm.includes("discover") || norm.includes("camp")) return "torch";
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
