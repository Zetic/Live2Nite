import { lootEntry, type WeightedLootTable } from './loot'
import { mappedOrdinaryNormalSourceLoot, unmappedOrdinarySourceLootIds } from './myhordesLootMapping'

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

/** Raw ordinary source ids that still prevent activation of the normal-zone table. */
export function unresolvedMyHordesNormalLootIds():string[]{return unmappedOrdinarySourceLootIds()}
export function myHordesNormalLootReady():boolean{return unresolvedMyHordesNormalLootIds().length===0}

/**
 * Build the normal-zone table only when every ordinary source entry has a mechanical identity.
 * This deliberately fails closed: source entries are never silently dropped merely because a
 * downstream Live2Nite dependency has not landed yet.
 */
export function buildMyHordesNormalZoneLoot():WeightedLootTable{
  const unresolved=unresolvedMyHordesNormalLootIds()
  if(unresolved.length)throw new Error(`MyHordes normal-zone loot is not dependency-complete: ${unresolved.join(', ')}`)
  return{
    id:'myhordes.zone.normal',
    source:'MYHORDES_CURRENT',
    entries:mappedOrdinaryNormalSourceLoot().map(({source,mapping})=>lootEntry(mapping.type,source.weight,mapping.state)),
  }
}
