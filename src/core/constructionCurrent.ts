import { CONSTRUCTIONS } from './construction'
import { CONSTRUCTION_CATALOG } from './constructionCatalog'
import { MYHORDES_CURRENT_CONSTRUCTION_COSTS } from './constructionEconomy'
import type { ConstructionId } from './constructionIds'

/**
 * Applies the pinned current-MyHordes cost layer to direct-equivalent Live2Nite projects.
 * Kept separate from the historical construction metadata so version provenance remains
 * inspectable instead of erasing the earlier reconstruction values.
 */
export function applyCurrentConstructionEconomy():void{
  for(const [id,snapshot] of Object.entries(MYHORDES_CURRENT_CONSTRUCTION_COSTS) as Array<[ConstructionId,NonNullable<(typeof MYHORDES_CURRENT_CONSTRUCTION_COSTS)[ConstructionId]>]>) {
    const project=CONSTRUCTIONS[id]
    if(!project||!snapshot)continue
    project.apCost=snapshot.apCost
    project.resources={...snapshot.resources}
    project.source='MYHORDES_CURRENT'
    project.sourceConfidence='confirmed'
    project.historicalCostConfidence='confirmed'
  }

  // Scout gameplay now supplies the source-backed daily mapping / next-day SP behavior.
  CONSTRUCTION_CATALOG.scouts_lair.implementation='implemented'
  CONSTRUCTION_CATALOG.scouts_lair.wipReason=null
  CONSTRUCTIONS.scouts_lair.playable=true
}

applyCurrentConstructionEconomy()
