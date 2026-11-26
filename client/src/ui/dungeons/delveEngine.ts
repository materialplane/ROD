import type { DungeonQuestConfig } from "./dungeonTypes";

export type DelveNodeKind = "entry" | "hub" | "skirmish" | "secret" | "mechanism" | "vault" | "boss";
export type DelveDirection = "N" | "S" | "E" | "W";
export type DelveChestVariant = "oak" | "bronze" | "bandit" | "sea";

export interface DelveChestReward {
  id: string;
  title: string;
  variant: DelveChestVariant;
  silverMin: number;
  silverMax: number;
  potionIds: string[];
  tradeGoodIds: string[];
  opened: boolean;
  requiresFlag?: "secretBreached" | "combat";
  earnedSilver?: number;
  earnedPotionId?: string;
  earnedPotionName?: string;
  earnedTradeGoodId?: string;
  earnedTradeGoodName?: string;
}

export interface DelveInteractAction {
  id: string;
  kind: "drain_channel" | "break_rubble" | "claim_key" | "seal_grate";
  label: string;
  doneLabel: string;
  done: boolean;
  bannerTitle: string;
  bannerText: string;
  requiresCombatCleared?: boolean;
  setsFlag?: "channelDrained" | "hasVaultKey" | "secretBreached" | "grateSealed";
  bonusSilver?: number;
  bonusPotionId?: string;
}

export interface DelveExitEdge {
  dir: DelveDirection;
  targetNodeId: string;
  requiresFlag?: "channelDrained" | "hasVaultKey";
  lockedHint?: string;
}

export interface DelveNode {
  nodeId: string;
  title: string;
  subtitle: string;
  kind: DelveNodeKind;
  col: number;
  row: number;
  backdropPath: string;
  altBackdropPath?: string; // Shown after room-specific dramatic state switch (e.g. Sealed Grate)
  description: string;
  clearedText?: string;
  altText?: string; // Narrative once dramatic alternate state triggers
  exits: DelveExitEdge[];
  hasCombat: boolean;
  combatCleared: boolean;
  isBoss?: boolean;
  combatTitle?: string;
  enemyIds?: string[];
  bossLeadName?: string;
  chest?: DelveChestReward | null;
  interact?: DelveInteractAction | null;
}

export interface DelveFlags {
  channelDrained: boolean;
  hasVaultKey: boolean;
  secretBreached: boolean;
  grateSealed: boolean;
}

export interface DelveRunState {
  questId: string;
  questTitle: string;
  locationTitle: string;
  locationSubtitle: string;
  battleStageId: string;
  questConfig: DungeonQuestConfig;
  gridCols: number;
  gridRows: number;
  nodesById: Record<string, DelveNode>;
  nodeOrder: string[];
  currentNodeId: string;
  visitedNodeIds: string[];
  flags: DelveFlags;
  bossDefeated: boolean;
}

const DEFAULT_POTIONS = ["cons_minor_healing_potion", "cons_stout_healing_potion", "cons_minor_mana_potion"];
const DEFAULT_TRADE_GOODS = ["tg_native_wolf_gray_wolf_pelt", "tg_r1_bandit_rusty_coin_purse"];

/** Roll silver cleanly within a chest's configured bounds. */
export function rollDelveChestSilver(silverMin: number, silverMax: number): number {
  const min = Math.max(25, Math.floor(silverMin));
  const max = Math.max(min, Math.floor(silverMax));
  return min + Math.floor(Math.random() * (max - min + 1));
}

export const CHEST_ART_BY_VARIANT: Record<DelveChestVariant, { closed: string; open: string }> = {
  oak: {
    closed: "assets/tokens/dungeon_props/prop_chest_closed_01_oak.webp",
    open: "assets/tokens/dungeon_props/prop_chest_open_01_oak.webp",
  },
  bronze: {
    closed: "assets/tokens/dungeon_props/prop_chest_closed_02_bronze.webp",
    open: "assets/tokens/dungeon_props/prop_chest_open_02_bronze.webp",
  },
  bandit: {
    closed: "assets/tokens/dungeon_props/prop_chest_closed_03_bandit.webp",
    open: "assets/tokens/dungeon_props/prop_chest_open_03_bandit.webp",
  },
  sea: {
    closed: "assets/tokens/dungeon_props/prop_chest_closed_04_sea.webp",
    open: "assets/tokens/dungeon_props/prop_chest_open_04_sea.webp",
  },
};

/**
 * Create a non-linear 11-chamber 4x3 branching delve for Dry Aqueducts (q001),
 * complete with Floodgate Water Switching, Iron Vault Key & Locked Treasury,
 * Dead-End Secret Alcove, Dramatic Chest Loot Reveals, and Sealed-Grate Finale.
 */
export function createAqueductDelveRun(
  questConfig: DungeonQuestConfig | null | undefined,
  questId: string,
  questTitle: string,
  battleStageId = "dungeon_01_stone_aqueduct"
): DelveRunState {
  const cfg: DungeonQuestConfig = questConfig ?? {
    questId,
    themeId: "aqueduct_sewer_crypt",
    encounterPool: ["mob_wolf", "mob_bandit"],
    chestLoot: {
      silverMin: 110,
      silverMax: 155,
      potionIds: DEFAULT_POTIONS,
      tradeGoodIds: DEFAULT_TRADE_GOODS,
    },
    bossEncounter: {
      title: "Garrick Houndmaster & Wolves",
      enemies: ["mob_bandit", "mob_wolf", "mob_wolf"],
      bossLeadName: "Garrick Houndmaster",
      bossLeadHpMul: 2.35,
      bossLeadAtkMul: 1.35,
    },
  };

  const potions = cfg.chestLoot?.potionIds?.length ? cfg.chestLoot.potionIds : DEFAULT_POTIONS;
  const tradeGoods = cfg.chestLoot?.tradeGoodIds?.length ? cfg.chestLoot.tradeGoodIds : DEFAULT_TRADE_GOODS;
  const silverMin = cfg.chestLoot?.silverMin ?? 110;
  const silverMax = cfg.chestLoot?.silverMax ?? 155;
  const bossTitle = cfg.bossEncounter?.title ?? "Garrick Houndmaster & Wolves";
  const bossEnemies = cfg.bossEncounter?.enemies?.length
    ? cfg.bossEncounter.enemies
    : ["mob_bandit", "mob_wolf", "mob_wolf"];

  const nodes: DelveNode[] = [
    {
      nodeId: "broken_grate",
      title: "Cistern Descent",
      subtitle: "Threshold",
      kind: "entry",
      col: 1,
      row: 2,
      backdropPath: "assets/maps/interiors/loc_13_hollowstone_keep.webp",
      description:
        "Narrow stone steps spiral down beneath Highcrown's drainage quarter. Fresh timber-wolf tracks cut across damp silt toward the central cistern junction.",
      exits: [{ dir: "N", targetNodeId: "south_basin" }],
      hasCombat: false,
      combatCleared: true,
    },
    {
      nodeId: "south_basin",
      title: "Central Cistern Basin",
      subtitle: "3-Way Junction",
      kind: "hub",
      col: 1,
      row: 1,
      backdropPath: "assets/maps/interiors/hub_tidewater_keep.webp",
      description:
        "Torchlight dances across moss-slick stonework where three aqueduct wings converge. Floodwater blocks the north underpass; distant growls echo west while brass mechanisms gleam east.",
      exits: [
        { dir: "W", targetNodeId: "west_kennel" },
        {
          dir: "N",
          targetNodeId: "flooded_underpass",
          requiresFlag: "channelDrained",
          lockedHint: "Submerged — Drain East Waterworks",
        },
        { dir: "E", targetNodeId: "sluice_control" },
        { dir: "S", targetNodeId: "broken_grate" },
      ],
      hasCombat: false,
      combatCleared: true,
    },
    {
      nodeId: "west_kennel",
      title: "West Kennel Drain",
      subtitle: "Outlaw Picket",
      kind: "skirmish",
      col: 0,
      row: 1,
      backdropPath: "assets/maps/interiors/hub_blightwatch_keep.webp",
      description:
        "Iron chains rattle along the narrow archway. One of Garrick's outlaw pickets blows a sharp signal, loosing a scarred pack wolf across the flagstones.",
      clearedText:
        "The sentry and hound lie defeated! Their drop chest rests near the embers, flanked by a crumbled southern wall and a narrow northern catwalk.",
      exits: [
        { dir: "N", targetNodeId: "north_walk" },
        { dir: "E", targetNodeId: "south_basin" },
        { dir: "S", targetNodeId: "collapsed_niche" },
      ],
      hasCombat: true,
      combatCleared: false,
      combatTitle: "Outlaw Sentry & Wolf",
      enemyIds: ["mob_bandit", "mob_wolf"],
      chest: {
        id: "kennel_bandit_chest",
        title: "Sentry's Banded Chest",
        variant: "bandit",
        silverMin,
        silverMax,
        potionIds: potions,
        tradeGoodIds: tradeGoods,
        opened: false,
        requiresFlag: "combat",
      },
    },
    {
      nodeId: "collapsed_niche",
      title: "Collapsed Masonry Niche",
      subtitle: "Secret Alcove",
      kind: "secret",
      col: 0,
      row: 2,
      backdropPath: "assets/maps/interiors/hub_cragwatch_fort.webp",
      description:
        "Caved-in arch stones choke this forgotten side cul-de-sac. Behind cracked mortar glints a seam of hammered bronze left behind by Highcrown builders.",
      altText:
        "With the loose rubble hauled clear, an old Highcrown engineer's coffer sits untouched inside the hollow!",
      exits: [{ dir: "N", targetNodeId: "west_kennel" }],
      hasCombat: false,
      combatCleared: true,
      interact: {
        id: "pry_rubble",
        kind: "break_rubble",
        label: "Clear Loose Masonry",
        doneLabel: "Secret Niche Opened",
        done: false,
        bannerTitle: "Hidden Alcove Uncovered!",
        bannerText: "You lever the cracked masonry free, exposing an untouched Bronze Engineer's Coffer hidden since the First Masonry.",
        setsFlag: "secretBreached",
      },
      chest: {
        id: "niche_bronze_chest",
        title: "Engineer's Bronze Coffer",
        variant: "bronze",
        silverMin: silverMin + 25,
        silverMax: silverMax + 40,
        potionIds: ["cons_stout_healing_potion", "cons_minor_mana_potion"],
        tradeGoodIds: tradeGoods,
        opened: false,
        requiresFlag: "secretBreached",
      },
    },
    {
      nodeId: "north_walk",
      title: "Upper Drain Catwalk",
      subtitle: "Flank Corridor",
      kind: "hub",
      col: 0,
      row: 0,
      backdropPath: "assets/maps/interiors/hub_stormhold_citadel.webp",
      description:
        "A soot-stained inspection ledge overlooks the central drainage trough. To the east lies the sunken underpass channel leading straight toward the Great Sluice Bridge.",
      exits: [
        {
          dir: "E",
          targetNodeId: "flooded_underpass",
          requiresFlag: "channelDrained",
          lockedHint: "Submerged — Drain East Waterworks",
        },
        { dir: "S", targetNodeId: "west_kennel" },
      ],
      hasCombat: false,
      combatCleared: true,
    },
    {
      nodeId: "flooded_underpass",
      title: "Drained Lower Channel",
      subtitle: "Flank Shortcut",
      kind: "hub",
      col: 1,
      row: 0,
      backdropPath: "assets/maps/interiors/hub_brinecliff_watch_fort.webp",
      description:
        "Stale floodwater has swept cleanly down the relief grates, leaving slick cobbles across the central shortcut and exposing a washed-ashore supply chest!",
      exits: [
        { dir: "W", targetNodeId: "north_walk" },
        { dir: "E", targetNodeId: "service_bridge" },
        { dir: "S", targetNodeId: "south_basin" },
      ],
      hasCombat: false,
      combatCleared: true,
      chest: {
        id: "channel_satchel_chest",
        title: "Washed-Up Ironbound Chest",
        variant: "oak",
        silverMin: 95,
        silverMax: 135,
        potionIds: potions,
        tradeGoodIds: tradeGoods,
        opened: false,
      },
    },
    {
      nodeId: "sluice_control",
      title: "Floodgate Wheel Chamber",
      subtitle: "Mechanism Room",
      kind: "mechanism",
      col: 2,
      row: 1,
      backdropPath: "assets/maps/interiors/hub_cinderwatch_bastion.webp",
      description:
        "Massive rusted cogwheels tower above the eastern cistern wall. Turning the primary bronze floodgate wheel should flush standing water out of the submerged central channel.",
      altText:
        "With the bronze wheel cranked open, thunderous runoff rushes deep into the storm drains — drying out the central underpass!",
      exits: [
        { dir: "N", targetNodeId: "service_bridge" },
        { dir: "W", targetNodeId: "south_basin" },
        { dir: "S", targetNodeId: "warden_post" },
      ],
      hasCombat: false,
      combatCleared: true,
      interact: {
        id: "turn_floodgate",
        kind: "drain_channel",
        label: "Crank Bronze Floodgate Wheel",
        doneLabel: "Lower Channel Drained",
        done: false,
        bannerTitle: "Aqueduct Channel Drained!",
        bannerText: "Water plunges through the lower relief grates! The Submerged Central Underpass is now dry and passable from three wings.",
        setsFlag: "channelDrained",
      },
    },
    {
      nodeId: "warden_post",
      title: "Watchman's Barracks",
      subtitle: "Guard Post",
      kind: "skirmish",
      col: 2,
      row: 2,
      backdropPath: "assets/maps/interiors/hub_crownlands_hill_fort.webp",
      description:
        "Garrick's poachers bivouac beside stolen Highcrown guard lockers. A scarred cutthroat spots your lantern beside two snarling hounds — something heavy glints on his belt.",
      clearedText:
        "The poacher patrol is down! Hanging from their captain's belt is the tarnished Iron Vault Key for the Sealed Treasury to the east.",
      exits: [
        { dir: "N", targetNodeId: "sluice_control" },
        {
          dir: "E",
          targetNodeId: "sunken_armory",
          requiresFlag: "hasVaultKey",
          lockedHint: "Locked — Requires Iron Vault Key",
        },
      ],
      hasCombat: true,
      combatCleared: false,
      combatTitle: "Cutthroat Patrol & Hounds",
      enemyIds: ["mob_bandit", "mob_wolf", "mob_wolf"],
      interact: {
        id: "loot_vault_key",
        kind: "claim_key",
        label: "Take Iron Vault Key",
        doneLabel: "Iron Vault Key Claimed",
        done: false,
        requiresCombatCleared: true,
        bannerTitle: "Acquired: Iron Vault Key",
        bannerText: "The heavy warded key fits Highcrown's Sealed Watch Treasury directly east of the barracks.",
        setsFlag: "hasVaultKey",
      },
    },
    {
      nodeId: "sunken_armory",
      title: "Sealed Watch Treasury",
      subtitle: "Key-Locked Vault",
      kind: "vault",
      col: 3,
      row: 2,
      backdropPath: "assets/maps/interiors/loc_11_redmarch_bastion.webp",
      description:
        "Your Iron Vault Key turns cleanly inside the heavy lock. Inside gleams Highcrown's emergency reserve treasury — completely untouched by Garrick's pack.",
      exits: [{ dir: "W", targetNodeId: "warden_post" }],
      hasCombat: false,
      combatCleared: true,
      chest: {
        id: "armory_treasury_chest",
        title: "Highcrown Reserve Vault",
        variant: "bronze",
        silverMin: silverMin + 45,
        silverMax: silverMax + 65,
        potionIds: ["cons_stout_healing_potion", "cons_minor_mana_potion"],
        tradeGoodIds: tradeGoods,
        opened: false,
      },
    },
    {
      nodeId: "service_bridge",
      title: "Great Sluice Bridge",
      subtitle: "Boss Threshold",
      kind: "hub",
      col: 2,
      row: 0,
      backdropPath: "assets/maps/interiors/hub_sandwall_citadel.webp",
      description:
        "Iron sconces flare along the wide archway ahead. Heavy shouting and wolf barks rumble out of the Great Sluice Chamber just to the east.",
      exits: [
        { dir: "E", targetNodeId: "sluice_boss" },
        {
          dir: "W",
          targetNodeId: "flooded_underpass",
          requiresFlag: "channelDrained",
          lockedHint: "Submerged — Drain East Waterworks",
        },
        { dir: "S", targetNodeId: "sluice_control" },
      ],
      hasCombat: false,
      combatCleared: true,
    },
    {
      nodeId: "sluice_boss",
      title: "Great Sluice Chamber",
      subtitle: "Boss Sanctum",
      kind: "boss",
      col: 3,
      row: 0,
      backdropPath: "assets/maps/battle_scenes/dungeon_01_stone_aqueduct.webp",
      altBackdropPath: "assets/maps/interiors/tr_pass_map04_closed.webp",
      description:
        "Lanterns blaze beneath the towering breach where Garrick Houndmaster commands his feral wolves before the pried-open city grate.",
      clearedText:
        "Garrick Houndmaster and his pack lie defeated! The pried-open aqueduct grate stands unguarded — slam the iron lockbar shut to secure Highcrown!",
      altText:
        "Massive iron bars crash down across the breach and snap locked! Highcrown's aqueduct stands sealed tight against further infiltration.",
      exits: [{ dir: "W", targetNodeId: "service_bridge" }],
      hasCombat: true,
      combatCleared: false,
      isBoss: true,
      combatTitle: bossTitle,
      enemyIds: bossEnemies,
      bossLeadName: cfg.bossEncounter?.bossLeadName ?? "Garrick Houndmaster",
      interact: {
        id: "seal_main_grate",
        kind: "seal_grate",
        label: "Slam & Bolt the Aqueduct Grate",
        doneLabel: "Aqueduct Breach Sealed",
        done: false,
        requiresCombatCleared: true,
        bannerTitle: "Aqueduct Grate Sealed!",
        bannerText: "Heavy iron lockbars bolt fast across the storm breach. Return to Sgt. Locke in Highcrown to claim your reward.",
        setsFlag: "grateSealed",
      },
    },
  ];

  const nodesById: Record<string, DelveNode> = {};
  const nodeOrder: string[] = [];
  for (const n of nodes) {
    nodesById[n.nodeId] = n;
    nodeOrder.push(n.nodeId);
  }

  return {
    questId,
    questTitle,
    locationTitle: "Dry Aqueducts",
    locationSubtitle: "Beneath Highcrown · Undercroft Delve",
    battleStageId,
    questConfig: cfg,
    gridCols: 4,
    gridRows: 3,
    nodesById,
    nodeOrder,
    currentNodeId: "broken_grate",
    visitedNodeIds: ["broken_grate"],
    flags: {
      channelDrained: false,
      hasVaultKey: false,
      secretBreached: false,
      grateSealed: false,
    },
    bossDefeated: false,
  };
}

/** Check whether an exit edge from the current node is currently unlocked. */
export function isExitUnlocked(run: DelveRunState, edge: DelveExitEdge): boolean {
  if (!edge.requiresFlag) return true;
  return Boolean(run.flags[edge.requiresFlag]);
}

/** Check whether a player can navigate to a target node either by direct edge or visited fast-travel. */
export function canTravelToDelveNode(run: DelveRunState, targetNodeId: string): boolean {
  if (targetNodeId === run.currentNodeId) return false;
  const cur = run.nodesById[run.currentNodeId];
  const target = run.nodesById[targetNodeId];
  if (!cur || !target) return false;

  const direct = cur.exits.find((e) => e.targetNodeId === targetNodeId);
  if (direct) {
    if (!isExitUnlocked(run, direct)) return false;
    // Allow stepping back to an already-visited chamber even if combat blocks forward progress
    if (run.visitedNodeIds.includes(targetNodeId)) return true;
    return !cur.hasCombat || cur.combatCleared;
  }

  // Fast-travel to any previously visited chamber from Cartographer Map when not pinned in an active boss ambush
  if (run.visitedNodeIds.includes(targetNodeId)) {
    return !cur.hasCombat || cur.combatCleared;
  }

  return false;
}
