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
  Object.assign(MYHORDES_CURRENT_CONSTRUCTION_COSTS,{
    battlements:{referenceName:'Battlements',apCost:25,resources:{twisted_plank:6,patchwork_beam:2,metal_support:2,nuts_and_bolts:1}},
    miniature_armory:{referenceName:'Miniature Armory',apCost:40,resources:{nuts_and_bolts:1,twisted_plank:10,wrought_iron:8,sheet_metal:2,duct_tape:2}},
    observation_platform:{referenceName:'Observation platform',apCost:30,resources:{twisted_plank:5,telescope:1,metal_support:1}},
    upgraded_map:{referenceName:'Upgraded Map',apCost:25,resources:{battery:2,wrought_iron:5,sheet_metal:1,laser_diode:1,working_radio:2}},
    water_purifier:{referenceName:'Water Purifier',apCost:75,resources:{nuts_and_bolts:1,twisted_plank:5,wrought_iron:5,copper_pipe:2,empty_oil_can:2}},
    water_filter:{referenceName:'Water Filter',apCost:50,resources:{wrought_iron:10,electronic_component:2,wire_reel:1,empty_oil_can:1,wire_mesh:1}},
    faucet:{referenceName:'Faucet',apCost:130,resources:{engine:1,nuts_and_bolts:4,wrought_iron:10,patchwork_beam:6,metal_support:3,empty_oil_can:3}},
    water_catcher:{referenceName:'Water Catcher',apCost:10,resources:{twisted_plank:2,wrought_iron:2}},
    divining_rocket:{referenceName:'Divining Rocket',apCost:80,resources:{semtex:1,copper_pipe:1,compact_detonator:1,nuts_and_bolts:1,patchwork_beam:5,metal_support:5}},
    fertilizer:{referenceName:'Fertilizer',apCost:30,resources:{water_ration:10,anabolic_steroids:2,wrought_iron:5,pharmaceutical_products:8,bag_of_damp_grass:3}},
    grapeboom:{referenceName:'Grapeboom',apCost:40,resources:{water_ration:10,twisted_plank:5,semtex:5,empty_oil_can:1}},
    central_cafeteria:{referenceName:'Central Cafeteria',apCost:20,resources:{pharmaceutical_products:1,patchwork_beam:5,metal_support:1,table:1,bag_of_damp_grass:1,carcinogenic_oven:1}},
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

  activate('scouts_lair')
  activate('technicians_workbench')
  activate('battlements','Unlocks voluntary Night Watch (10 Watchmen before upgrades)')
  activate('miniature_armory','Enables ordinary carried Night Watch equipment')
  activate('scanner','Doubles Watchtower estimation contribution weight')
  activate('upgraded_map','Nightly Observation Platform intelligence records exact zombie counts')
  activate('search_tower','Reveals the nightly recovery sector; upgrades natural 25% recovery chance')
  activate('observation_platform','Upgradeable nightly map-intelligence radius: 3 / 6 / 10 km','partial')
  activate('central_cafeteria','Doubles personal Kitchen daily cooking attempts')

  // Well / Pump economy. Existing current-source fidelity snapshots retain their verified
  // completion-water values for Pump, Drilling Rig, Hydraulic Network, Eden, Derrick and
  // Water Detector. These activations fill the missing interactive/simple-addition mechanics.
  activate('water_purifier','Converts a Full Jerrycan into 1–3 Well rations')
  activate('water_filter','Raises Water Purifier output to 4–9 Well rations')
  activate('faucet','Refills supported water weapons/containers for free without using Well water')
  activate('water_turrets','70 base defense; voted bonus requires the full nightly Well-water allocation')
  activate('water_catcher','Rebuildable +2 Well water')
  activate('divining_rocket','+60 Well water on completion')
  activate('drilling_rig')
  activate('eden_project')
  activate('hydraulic_network')
  activate('water_detector')
  activate('derrick')

  CONSTRUCTIONS.water_catcher.effects=[{type:'well_water_on_complete',amount:2}]
  CONSTRUCTIONS.water_catcher.effectLabel='+2 Well water; rebuildable after each attack'
  CONSTRUCTIONS.divining_rocket.effects=[{type:'well_water_on_complete',amount:60}]
  CONSTRUCTIONS.divining_rocket.effectLabel='+60 Well water on completion'

  // Agriculture uses the randomized nightly production resolver instead of the legacy generic
  // daily-bank-item shortcut, preventing duplicate output and preserving the documented ranges.
  activate('vegetable_plot','Produces 4–7 vegetables + 0–2 high-value fruit after each attack')
  activate('fertilizer','Raises Vegetable Plot output to 6–8 vegetables + 3–5 high-value fruit')
  activate('grapeboom','Produces 3–7 Exploding Grapefruits after each attack','partial')
  activate('outer_world_apple_tree','Produces 3–5 Blue Apples after each attack')
  CONSTRUCTIONS.vegetable_plot.effects=[]
  CONSTRUCTIONS.fertilizer.effects=[]
  CONSTRUCTIONS.grapeboom.effects=[]
  CONSTRUCTIONS.outer_world_apple_tree.effects=[]

  const lighthouse=CONSTRUCTIONS.lighthouse
  lighthouse.effects=lighthouse.effects.map((effect)=>effect.type==='camping_survival_bonus'?{...effect,amount:25}:effect)
  lighthouse.effectLabel='+25 camping points'
}

applyCurrentConstructionEconomy()
