import type { ActiveOutpostHunt, OutpostRegionProfile } from "../types";
import { getOutpostHuntsCatalog, pluralizeMonsterName } from "./outpostHunts";

const FALLBACK_PROFILE: OutpostRegionProfile = {
  key: "crownlands",
  titlePrefix: "Frontier",
  settingPhrase: "nearby frontier roads and wildlands",
  roadPhrase: "local trade wagons and patrols",
};

export function getRegionProfileForZone(zoneNum: number): OutpostRegionProfile {
  const cat = getOutpostHuntsCatalog();
  const regionKey = cat?.zones?.[String(zoneNum)]?.regionKey;
  if (regionKey && cat?.regionProfiles?.[regionKey]) {
    return cat.regionProfiles[regionKey];
  }
  return FALLBACK_PROFILE;
}

export function resolveOutpostHuntLore(
  mobId: string,
  mobName: string,
  outpostName: string,
  zoneNum = 1,
  _biomeHints: string[] = []
): { contractTitle: string; threatSummary: string; regionName: string } {
  const region = getRegionProfileForZone(zoneNum);
  const pluralName = pluralizeMonsterName(mobName);
  const entry = getOutpostHuntsCatalog()?.loreByMobId?.[mobId];
  const rawSummary =
    entry?.byRegion?.[region.key] ??
    entry?.threatSummary ??
    `Outriders stationed around ${outpostName} report growing ${pluralName.toLowerCase()} trouble nearby, threatening ${region.roadPhrase}.`;

  return {
    contractTitle: `${region.titlePrefix} ${pluralName}`,
    threatSummary: rawSummary,
    regionName: region.titlePrefix,
  };
}

export function buildQuartermasterHuntDialogue(
  hunt: ActiveOutpostHunt,
  isAccepted: boolean,
  isReadyToClaim: boolean
): string {
  const pluralName = pluralizeMonsterName(hunt.mobName, hunt.killsRequired);
  const lore = resolveOutpostHuntLore(hunt.mobId, hunt.mobName, hunt.outpostName, hunt.zoneNum, hunt.biomeHints);
  const region = getRegionProfileForZone(hunt.zoneNum);

  if (isReadyToClaim) {
    return `Scouts near ${hunt.outpostName} already spotted your company marching back—clean work thinning those ${pluralName}. Step up and claim your Silver bounty and patrol pay.`;
  }
  if (isAccepted) {
    const remaining = Math.max(0, hunt.killsRequired - hunt.killsProgress);
    return `${lore.threatSummary} Bring down ${remaining} more ${pluralizeMonsterName(hunt.mobName, remaining)} in the wilds around ${hunt.outpostName} and report back to collect your bounty.`;
  }
  return `${lore.threatSummary} Clear out ${hunt.killsRequired} ${pluralName} around ${hunt.outpostName} so our ${region.roadPhrase} stay open.`;
}
