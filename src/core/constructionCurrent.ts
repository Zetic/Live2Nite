import { BUILDABLE_CONSTRUCTION_IDS, CONSTRUCTIONS } from './construction'
import { CONSTRUCTION_CATALOG, type ConstructionImplementationStatus } from './constructionCatalog'
import { MYHORDES_CURRENT_CONSTRUCTION_COSTS } from './constructionEconomy'
import type { ConstructionId } from './constructionIds'

/**
 * Applies the pinned current-MyHordes cost layer to direct-equivalent Live2Nite projects.
 * Kept separate from the historical construction metadata so version provenance remains
 * inspectable instead of erasing the earlier reconstruction values.
 */
export function applyCurrentConstructionEconomy():void{
  // Source bills verified by the focused Night Watch / Watchtower intelligence passes.
  Object.assign(MYHORDES_CURRENT_CONSTRUCTION_COSTS,{
    battlements:{referenceName:'Battlements',apCost:25,resources:{twisted_plank:6,patchwork_beam:2,metal_support:2,nuts_and_bolts:1}},
    miniature_armory:{referenceName:'Miniature Armory',apCost:40,resources:{nuts_and_bolts:1,twisted_plank:10,wrought_iron:8,sheet_metal:2,duct_tape:2}},
    observation_platform:{referenceName:'Observation platform',apCost:30,resources:{twisted_plank:5,telescope:1,metal_support:1}},
    upgraded_map:{referenceName:'Upgraded Map',apCost:25,resources:{battery:2,wrought_iron:5,sheet_metal:1,laser_diode:1,working_radio:2}},
  } satisfies Partial<Record<ConstructionId,NonNullable<(typeof MYHORDES_CURRENT_CONSTRUCTION_COSTS)[ConstructionId]>>>)

  for(const [id,snapshot] of Object.entries(MYHORDES_CURRENT_CONSTRUCTION_COSTS) as Array<[ConstructionId,NonNullable<(typeof MYHORDES_CURRENT_CONSTRUCTION_COSTS)[ConstructionId]>]>) {
    const project=CONSTRUCTIONS[id]
    if(!project||!snapshot)continue
    project.apCost=snapshot.apCost
    project.resources={...snapshot.resources}
    project.source='MYHORDES_CURRENT'
    project.sourceConfidence='confirmed'
    project.historicalCostConfidence='confirmed'
  }

  const buildable=BUILDABLE_CONSTRUCTION_IDS as ConstructionId[]
  const activate=(id:ConstructionId,effectLabel?:string,status:ConstructionImplementationStatus='implemented'):void=>{
    CONSTRUCTION_CATALOG[id].implementation=status
    CONSTRUCTION_CATALOG[id].wipReason=null
    CONSTRUCTIONS[id].implementationStatus=status
    CONSTRUCTIONS[id].wipReason=undefined
    CONSTRUCTIONS[id].playable=true
    if(effectLabel)CONSTRUCTIONS[id].effectLabel=effectLabel
    if(!buildable.includes(id))buildable.push(id)
  }

  // Scout gameplay now supplies the source-backed daily mapping / next-day SP behavior.
  activate('scouts_lair')

  // Technician gameplay supplies the retained Prime Workbench behavior: one controlled
  // random-Workshop output per citizen/day, with its profession-specific cost surcharge.
  activate('technicians_workbench')

  // Battlements gates voluntary Night Watch. Miniature Armory then enables ordinary
  // carried watchpoint/watchimpact equipment; neither building adds normal town defense.
  activate('battlements','Unlocks voluntary Night Watch (10 Watchmen before upgrades)')
  activate('miniature_armory','Enables ordinary carried Night Watch equipment')

  // Watchtower intelligence is collaborative in current MyHordes. Scanner doubles the
  // contribution weight (the same condition as a Telescope in the Bank), while Predictor
  // spends weighted contributions beyond today's 24-point target on tomorrow's estimate.
  activate('scanner','Doubles Watchtower estimation contribution weight')
  activate('upgraded_map','Nightly Observation Platform intelligence records exact zombie counts')
  activate('search_tower','Reveals the nightly recovery sector; upgrades natural 25% recovery chance')

  // The directly verified Observation Platform radius progression is active. Source levels
  // 4–5 also grant free-return distance; those two effects remain outside this pass, so the
  // construction is intentionally Partial rather than claiming the complete upgrade track.
  activate('observation_platform','Upgradeable nightly map-intelligence radius: 3 / 6 / 10 km','partial')

  // Current MyHordes camping calculation gives a completed Lighthouse +25 camping points.
  const lighthouse=CONSTRUCTIONS.lighthouse
  lighthouse.effects=lighthouse.effects.map((effect)=>effect.type==='camping_survival_bonus'?{...effect,amount:25}:effect)
  lighthouse.effectLabel='+25 camping points'
}

applyCurrentConstructionEconomy()
