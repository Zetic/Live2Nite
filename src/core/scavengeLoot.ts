import { lootEntry, type WeightedLootTable } from './loot'

/**
 * Current MyHordes depleted-zone item table.
 * Generated-source pin: Zenoo/zen-hordes@f301c05f2527a341f663eea05e6ebd893f181ed6
 *   WOOD_BAD 20 -> Rotting Log
 *   METAL_BAD 12 -> Scrap Metal
 *
 * This table is dependency-complete in Live2Nite, so it can be activated before the much
 * larger normal-zone table without pruning or adapting any source entry.
 */
export const MYHORDES_DEPLETED_ZONE_LOOT:WeightedLootTable={
  id:'myhordes.zone.depleted',
  source:'MYHORDES_CURRENT',
  entries:[
    lootEntry('rotten_log',20),
    lootEntry('scrap_metal',12),
  ],
}
