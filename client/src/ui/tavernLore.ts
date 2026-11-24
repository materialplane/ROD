import type { AudioTavernTrackEntry } from "./types";

export type TavernTrackInfo = AudioTavernTrackEntry;

export const TAVERN_TRACK_CATALOG: Record<string, TavernTrackInfo> = {};

/** Populate tavern ballad track descriptions and history from data/audio-catalog.json. */
export function applyTavernTrackCatalog(tracks: Record<string, TavernTrackInfo> | null | undefined): void {
  if (!tracks) return;
  for (const k of Object.keys(TAVERN_TRACK_CATALOG)) delete TAVERN_TRACK_CATALOG[k];
  Object.assign(TAVERN_TRACK_CATALOG, tracks);
}

export function getTavernTrackInfo(relPath: string | null | undefined): TavernTrackInfo | null {
  if (!relPath) return null;
  return TAVERN_TRACK_CATALOG[relPath] ?? null;
}
