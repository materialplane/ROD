import { contextBridge, ipcRenderer } from "electron";

export interface SaveSlotData {
  slotId: string;
  label: string;
  mapId: string;
  regionLabel: string;
  heroId: string;
  heroName: string;
  activeBattle?: unknown | null;
  level: number;
  x: number;
  y: number;
  playtimeSeconds: number;
  savedAt: string;
}

contextBridge.exposeInMainWorld("rodApi", {
  listSaves: (): Promise<SaveSlotData[]> => ipcRenderer.invoke("saves:list"),
  getLatestSave: (): Promise<SaveSlotData | null> => ipcRenderer.invoke("saves:latest"),
  writeSave: (data: SaveSlotData): Promise<SaveSlotData> => ipcRenderer.invoke("saves:write", data),
  readSave: (slotId: string): Promise<SaveSlotData | null> => ipcRenderer.invoke("saves:read", slotId),
  clearSaves: (): Promise<void> => ipcRenderer.invoke("saves:clear"),
  quitGame: (): Promise<void> => ipcRenderer.invoke("app:quit"),
});
