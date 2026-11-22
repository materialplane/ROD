import type { AudioSettings, RodApi, SaveSlotData } from "./types";

const LOCAL_AUTOSAVE_KEY = "rod_autosave_snapshot";

function readLocalAutosave(): SaveSlotData | null {
  try {
    const raw = localStorage.getItem(LOCAL_AUTOSAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SaveSlotData;
    return parsed && typeof parsed.x === "number" && typeof parsed.y === "number" && parsed.slotId ? parsed : null;
  } catch {
    return null;
  }
}

function writeLocalAutosave(data: SaveSlotData): void {
  try {
    localStorage.setItem(LOCAL_AUTOSAVE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota issues
  }
}

const restFallback: RodApi = {
  async listSaves(): Promise<SaveSlotData[]> {
    const r = await fetch("/api/saves/list");
    return r.ok ? ((await r.json()) as SaveSlotData[]) : [];
  },
  async getLatestSave(): Promise<SaveSlotData | null> {
    const r = await fetch("/api/saves/latest");
    const serverLatest = r.ok ? ((await r.json()) as SaveSlotData | null) : null;
    const localLatest = readLocalAutosave();
    if (!serverLatest) return localLatest;
    if (!localLatest) return serverLatest;
    const serverTs = new Date(serverLatest.savedAt).getTime();
    const localTs = new Date(localLatest.savedAt).getTime();
    return localTs > serverTs ? localLatest : serverLatest;
  },
  async writeSave(data: SaveSlotData): Promise<SaveSlotData> {
    if (data.slotId === "autosave") {
      writeLocalAutosave(data);
    }
    const r = await fetch("/api/saves/write", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const saved = (await r.json()) as SaveSlotData;
    if (saved.slotId === "autosave") {
      writeLocalAutosave(saved);
    }
    return saved;
  },
  async readSave(slotId: string): Promise<SaveSlotData | null> {
    const all = await restFallback.listSaves();
    return all.find((s) => s.slotId === slotId) ?? null;
  },
  async clearSaves(): Promise<void> {
    try {
      localStorage.removeItem(LOCAL_AUTOSAVE_KEY);
    } catch {
      // Ignore
    }
    await fetch("/api/saves/clear", { method: "POST" });
  },
  async quitGame(): Promise<void> {
    window.close();
  },
};

export const gameApi: RodApi = window.rodApi ?? restFallback;

/** Synchronously flush active campaign position/party state before page refresh or tab close. */
export function flushAutosaveOnUnload(data: SaveSlotData): void {
  const stamped: SaveSlotData = { ...data, savedAt: new Date().toISOString() };
  writeLocalAutosave(stamped);
  if (window.rodApi) {
    void window.rodApi.writeSave(stamped);
    return;
  }
  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([JSON.stringify(stamped)], { type: "application/json" });
      navigator.sendBeacon("/api/saves/write", blob);
      return;
    }
  } catch {
    // Fall back to keepalive fetch below
  }
  void fetch("/api/saves/write", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(stamped),
    keepalive: true,
  });
}

const BROWSER_ASSET_VER = Date.now();

/** Resolve assets cleanly in both browser (/client/assets/...) and packaged Electron (../../assets/...) */
export function assetUrl(relPath: string): string {
  const clean = relPath.replace(/^\/+/, "");
  if (window.rodApi) return `../../${clean}`;
  return clean.includes("?") ? clean : `${clean}?v=${BROWSER_ASSET_VER}`;
}

export function formatSaveTime(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function loadAudioSettings(): AudioSettings {
  return {
    master: Number(localStorage.getItem("rod_volMaster") ?? "80"),
    music: Number(localStorage.getItem("rod_volMusic") ?? "75"),
    sfx: Number(localStorage.getItem("rod_volSfx") ?? "85"),
    muteOnUnfocus: localStorage.getItem("rod_muteUnfocus") === "1",
  };
}

export function saveAudioSetting<K extends keyof AudioSettings>(key: K, value: AudioSettings[K]): void {
  const map: Record<keyof AudioSettings, string> = {
    master: "rod_volMaster",
    music: "rod_volMusic",
    sfx: "rod_volSfx",
    muteOnUnfocus: "rod_muteUnfocus",
  };
  if (key === "muteOnUnfocus") {
    localStorage.setItem(map[key], value ? "1" : "0");
    return;
  }
  localStorage.setItem(map[key], String(value));
}
