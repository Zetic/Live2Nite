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
  // Keep both catalogue presentation metadata and runtime build-gating metadata aligned.
  CONSTRUCTION_CATALOG.scouts_lair.implementation='implemented'
  CONSTRUCTION_CATALOG.scouts_lair.wipReason=null
  CONSTRUCTIONS.scouts_lair.implementationStatus='implemented'
  CONSTRUCTIONS.scouts_lair.wipReason=undefined
  CONSTRUCTIONS.scouts_lair.playable=true

  // Technician gameplay supplies the retained Prime Workbench behavior: one controlled
  // random-Workshop output per citizen/day, with its profession-specific cost surcharge.
  CONSTRUCTION_CATALOG.technicians_workbench.implementation='implemented'
  CONSTRUCTION_CATALOG.technicians_workbench.wipReason=null
  CONSTRUCTIONS.technicians_workbench.implementationStatus='implemented'
  CONSTRUCTIONS.technicians_workbench.wipReason=undefined
  CONSTRUCTIONS.technicians_workbench.playable=true

  // Current MyHordes camping calculation gives a completed Lighthouse +25 camping points.
  const lighthouse=CONSTRUCTIONS.lighthouse
  lighthouse.effects=lighthouse.effects.map((effect)=>effect.type==='camping_survival_bonus'?{...effect,amount:25}:effect)
  lighthouse.effectLabel='+25 camping points'
}

applyCurrentConstructionEconomy()
