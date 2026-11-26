export interface DungeonThemeDef {
  id: string;
  name: string;
  battleStageId: string;
  fallbackBattleStageId: string;
}

export interface DungeonChestSpriteVariant {
  id: string;
  closed: string;
  open: string;
}

export interface DungeonPropSprites {
  chestVariants?: DungeonChestSpriteVariant[];
  chest_closed?: string;
  chest_open?: string;
}

export interface DungeonQuestConfig {
  questId: string;
  themeId: string;
  encounterPool?: string[];
  chestLoot?: {
    silverMin?: number;
    silverMax?: number;
    potionIds?: string[];
    potionCount?: number;
    tradeGoodIds?: string[];
    tradeGoodCount?: number;
  };
  objectiveLabel?: string;
  completionBanner?: string;
  bossEncounter?: {
    title?: string;
    enemies?: string[];
    bossLeadName?: string;
    bossLeadHpMul?: number;
    bossLeadAtkMul?: number;
  };
}

export interface DungeonCatalogData {
  version: number;
  themes: DungeonThemeDef[];
  propSprites: DungeonPropSprites;
  questDungeons?: Record<string, DungeonQuestConfig>;
}
