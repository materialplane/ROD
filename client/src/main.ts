import { app, BrowserWindow, ipcMain, Menu, IpcMainInvokeEvent } from "electron";
import * as fs from "fs";
import * as path from "path";

export interface RunestoneSaveData {
  id: string;
  name: string;
  tier: string;
  target: "weapon" | "armor";
  affix: string;
  iconPath: string;
  sellSilver?: number;
}

export interface SaveSlotData {
  slotId: string;
  label: string;
  mapId: string;
  regionLabel: string;
  heroId: string;
  heroName: string;
  partyOrder?: string[];
  discoveredLocations?: string[];
  acceptedQuestIds?: string[];
  completedQuestIds?: string[];
  questProgressById?: Record<string, { questId: string; stage: string; acceptedAtPlaytime?: number; clearedSite?: boolean; clearedBoss?: boolean }>;
  trackedQuestKeys?: string[];
  activeOutpostHunts?: unknown[];
  outpostOffers?: Record<string, unknown>;
  completedOutpostHunts?: number;
  sealedPortalIds?: string[];
  silver?: number;
  equippedByHero?: Record<string, Record<string, string>>;
  bagCounts?: Record<string, number>;
  learnedSpellIds?: string[];
  tradeGoodCounts?: Record<string, number>;
  heroSpentAttrs?: Record<string, Record<string, number>>;
  socketsByHero?: Record<string, { weapon?: RunestoneSaveData | null; armor?: RunestoneSaveData | null }>;
  runestonesBag?: RunestoneSaveData[];
  heroHpPct?: Record<string, number>;
  heroMpPct?: Record<string, number>;
  chosenDisciplinesByHero?: Record<string, Record<string, string>>;
  heroLevels?: Record<string, number>;
  heroXp?: Record<string, number>;
  partyXp?: number;
  activeBattle?: unknown | null;
  level: number;
  x: number;
  y: number;
  playtimeSeconds: number;
  savedAt: string;
}

function getSavesDir(): string {
  const dir = path.join(app.getPath("userData"), "saves");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function readAllSaves(): SaveSlotData[] {
  const dir = getSavesDir();
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  const saves: SaveSlotData[] = [];
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(dir, file), "utf-8");
      const parsed = JSON.parse(raw) as SaveSlotData;
      if (parsed && typeof parsed.x === "number" && typeof parsed.y === "number" && parsed.slotId) {
        saves.push(parsed);
      }
    } catch {
      // Skip malformed save files cleanly
    }
  }
  saves.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
  return saves;
}

function createWindow(): void {
  Menu.setApplicationMenu(null);

  const win = new BrowserWindow({
    width: 1440,
    height: 810,
    minWidth: 1280,
    minHeight: 720,
    backgroundColor: "#0b0c10",
    autoHideMenuBar: true,
    title: "ROD — Realms of Dust",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });

  // Lock Chromium zoom strictly to 100% (no Ctrl+wheel or pinch zoom)
  win.webContents.on("did-finish-load", () => {
    void win.webContents.setVisualZoomLevelLimits(1, 1);
    win.webContents.setZoomFactor(1);
  });

  // Block default Chromium zoom hotkeys (Ctrl+Plus, Ctrl+Minus, Ctrl+0)
  win.webContents.on("before-input-event", (event, input) => {
    if ((input.control || input.meta) && ["=", "+", "-", "_", "0"].includes(input.key)) {
      event.preventDefault();
    }
  });

  void win.loadFile(path.join(__dirname, "..", "web", "index.html"));
}

function registerIpc(): void {
  ipcMain.handle("saves:list", () => {
    return readAllSaves();
  });

  ipcMain.handle("saves:latest", () => {
    const all = readAllSaves();
    return all.length > 0 ? all[0] : null;
  });

  ipcMain.handle("saves:write", (_event: IpcMainInvokeEvent, payload: SaveSlotData) => {
    const safeId = payload.slotId.replace(/[^a-zA-Z0-9_-]/g, "");
    if (!safeId) {
      throw new Error("Invalid save slotId");
    }
    const saveObj: SaveSlotData = {
      ...payload,
      slotId: safeId,
      savedAt: new Date().toISOString(),
    };
    const filePath = path.join(getSavesDir(), `${safeId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(saveObj, null, 2), "utf-8");
    return saveObj;
  });

  ipcMain.handle("saves:read", (_event: IpcMainInvokeEvent, slotId: string) => {
    const safeId = slotId.replace(/[^a-zA-Z0-9_-]/g, "");
    const filePath = path.join(getSavesDir(), `${safeId}.json`);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as SaveSlotData;
  });

  ipcMain.handle("saves:clear", () => {
    const dir = getSavesDir();
    for (const file of fs.readdirSync(dir)) {
      if (file.endsWith(".json")) {
        fs.unlinkSync(path.join(dir, file));
      }
    }
  });

  ipcMain.handle("app:quit", () => {
    app.quit();
  });
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
