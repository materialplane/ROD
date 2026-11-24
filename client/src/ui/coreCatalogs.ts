import { assetUrl } from "./api";
import { applyAudioCatalog } from "./audio";
import { applyVfxEffectsCatalog } from "./battle/battleLogic";
import { applyRunestoneAffixesCatalog } from "./battle/combatEffects";
import { applyHeroesCatalog } from "./heroes";
import { applyPartyProgressionCatalog, applyRunestoneTiersToParty } from "./party/partyLogic";
import { applyAtlasTravelCatalog } from "./party/QuestAtlasTabs";
import { applyGearRulesCatalog } from "./shops/shopLogic";
import type {
  AudioCatalog,
  GearRulesCatalog,
  HeroesCatalog,
  RunestoneAffixesCatalog,
  TravelCatalog,
  VfxEffectsCatalog,
} from "./types";

let bootLoadPromise: Promise<void> | null = null;
let loaded = false;

/** Fetches a required JSON data file and throws an explicit error naming the file if missing or malformed. */
export async function fetchRequiredJson<T>(relPath: string, bust = Date.now()): Promise<T> {
  const resp = await fetch(assetUrl(`${relPath}?t=${bust}`));
  if (!resp.ok) {
    throw new Error(`Failed to load ${relPath} (HTTP ${resp.status})`);
  }
  try {
    return (await resp.json()) as T;
  } catch (err) {
    throw new Error(`Invalid JSON in ${relPath}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Loads shared static game-rule, audio, and presentation catalogs once per session before
 * title music, opening cutscenes, campaign modals, shops, or combat initialize.
 */
export function ensureCoreCatalogsLoaded(): Promise<void> {
  if (loaded) return Promise.resolve();
  if (bootLoadPromise) return bootLoadPromise;

  const bust = Date.now();
  bootLoadPromise = (async () => {
    const [heroesCatalog, gearCatalog, runesCatalog, audioCatalog, vfxCatalog, travelCatalog] = await Promise.all([
      fetchRequiredJson<HeroesCatalog>("assets/data/heroes-catalog.json", bust),
      fetchRequiredJson<GearRulesCatalog>("assets/data/gear-rules-catalog.json", bust),
      fetchRequiredJson<RunestoneAffixesCatalog>("assets/data/runestone-affixes.json", bust),
      fetchRequiredJson<AudioCatalog>("assets/data/audio-catalog.json", bust),
      fetchRequiredJson<VfxEffectsCatalog>("assets/data/vfx-effects.json", bust),
      fetchRequiredJson<TravelCatalog>("assets/data/travel-catalog.json", bust),
    ]);

    applyHeroesCatalog(heroesCatalog);
    applyPartyProgressionCatalog(heroesCatalog.progression);
    applyGearRulesCatalog(gearCatalog);
    applyRunestoneAffixesCatalog(runesCatalog);
    applyRunestoneTiersToParty(runesCatalog);
    applyAudioCatalog(audioCatalog);
    applyVfxEffectsCatalog(vfxCatalog);
    applyAtlasTravelCatalog(travelCatalog);
    loaded = true;
  })().finally(() => {
    if (!loaded) {
      bootLoadPromise = null;
    }
  });

  return bootLoadPromise;
}
