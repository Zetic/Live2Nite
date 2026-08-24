import { bankCount } from './bank'
import { CONSTRUCTION_IDS } from './constructionIds'
import { CURRENT_CONSTRUCTION_FIDELITY, type ConstructionBlueprintTier } from './constructionFidelity'
import type { ConstructionId, ConstructionProjectState, GameState, ItemType } from './types'

export type ConstructionCategory = 'wall' | 'pump' | 'workshop' | 'watchtower' | 'foundations' | 'portal' | 'sanctuary'
export type ConstructionSource = 'HORDES_V4_4' | 'MYHORDES_CURRENT' | 'DIE2NITE_ARCHIVE' | 'LIVE2NITE_ADAPTATION'
export type ConstructionConfidence = 'confirmed' | 'adapted'

export type ConstructionEffect =
  | { type: 'town_defense_flat'; amount: number }
  | { type: 'town_defense_multiplier'; multiplier: number }
  | { type: 'bank_defense_multiplier'; multiplier: number }
  | { type: 'home_defense_flat'; amount: number }
  | { type: 'home_contribution_ratio'; ratio: number }
  | { type: 'well_water_on_complete'; amount: number }
  | { type: 'well_daily_withdrawals'; amount: number }
  | { type: 'workshop_ap_discount'; amount: number }
  | { type: 'search_replenishment_chance'; percent: number }
  | { type: 'camping_survival_bonus'; amount: number }
  | { type: 'gate_lock_hour'; hour: number }
  | { type: 'gate_auto_close_hour'; hour: number }
  | { type: 'defense_per_dead_citizen'; amount: number }
  | { type: 'daily_bank_item'; itemType: ItemType; min: number; max: number }
  | { type: 'watchtower_margin_percent'; percent: number }
  | { type: 'watchtower_forecast_days'; days: number }
  | { type: 'reveal_all_terrain_on_complete' }

export interface ConstructionDefinition {
  id: ConstructionId
  name: string
  category: ConstructionCategory
  parentId?: ConstructionId
  description: string
  apCost: number
  resources: Partial<Record<ItemType, number>>
  prerequisites: ConstructionId[]
  effects: ConstructionEffect[]
  effectLabel?: string
  expiresAfterAttack?: boolean
  facilityScreen?: 'workshop' | 'watchtower'
  source: ConstructionSource
  sourceConfidence: ConstructionConfidence
  historicalCostConfidence: ConstructionConfidence
  blueprintTier?: ConstructionBlueprintTier
  maxHp?: number
  breakable?: boolean
  playable?: boolean
}

const H = 'HORDES_V4_4' as const
const M = 'MYHORDES_CURRENT' as const
const A = 'LIVE2NITE_ADAPTATION' as const
const c = (plank = 0, iron = 0, concrete = 0, battery = 0): Partial<Record<ItemType, number>> => ({
  ...(plank ? { twisted_plank: plank } : {}),
  ...(iron ? { wrought_iron: iron } : {}),
  ...(concrete ? { unshaped_concrete_block: concrete } : {}),
  ...(battery ? { battery } : {}),
})
const def = (amount: number): ConstructionEffect[] => [{ type: 'town_defense_flat', amount }]

export const CONSTRUCTION_CATEGORIES: ReadonlyArray<{ id: ConstructionCategory | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'wall', label: 'Defensive Wall' },
  { id: 'pump', label: 'Pump' },
  { id: 'workshop', label: 'Workshop' },
  { id: 'watchtower', label: 'Watchtower' },
  { id: 'foundations', label: 'Foundations' },
  { id: 'portal', label: 'Portal' },
  { id: 'sanctuary', label: 'Sanctuary' },
]

export const CONSTRUCTIONS: Record<ConstructionId, ConstructionDefinition> = {
  wall_upgrade: { id:'wall_upgrade', name:'Defensive Wall', category:'wall', description:'The first serious perimeter reinforcement and root of the wall-defense branch.', apCost:30, resources:c(6,4), prerequisites:[], effects:def(30), effectLabel:'+30 town defense', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  great_pit: { id:'great_pit', name:'Great Pit', category:'wall', parentId:'wall_upgrade', description:'A broad defensive trench dug beyond the walls.', apCost:40, resources:c(4,1), prerequisites:['wall_upgrade'], effects:def(10), effectLabel:'+10 town defense', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  moat: { id:'moat', name:'Great Moat', category:'wall', parentId:'great_pit', description:'Extends the Great Pit into a formidable moat.', apCost:50, resources:c(5,2), prerequisites:['great_pit'], effects:def(65), effectLabel:'+65 town defense', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  spiked_pit: { id:'spiked_pit', name:'Spiked Pit', category:'wall', parentId:'great_pit', description:'Lethal stakes turn the defensive trench into a zombie trap.', apCost:45, resources:c(5,3), prerequisites:['great_pit'], effects:def(40), effectLabel:'+40 town defense', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  barbed_wire: { id:'barbed_wire', name:'Barbed Wire', category:'wall', parentId:'wall_upgrade', description:'A cheap perimeter obstacle that adds dependable passive defense.', apCost:20, resources:c(1,3), prerequisites:['wall_upgrade'], effects:def(10), effectLabel:'+10 town defense', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  bait: { id:'bait', name:'Bait', category:'wall', parentId:'barbed_wire', description:'A disposable lure field that protects the town for one attack.', apCost:30, resources:c(2,2), prerequisites:['barbed_wire'], effects:def(80), effectLabel:'+80 defense for the next attack', expiresAfterAttack:true, source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  advanced_ramparts: { id:'advanced_ramparts', name:'Advanced Ramparts', category:'wall', parentId:'wall_upgrade', description:'Heavy reinforcement layered onto the original wall.', apCost:55, resources:c(7,5), prerequisites:['wall_upgrade'], effects:def(50), effectLabel:'+50 town defense', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  reinforcing_beams: { id:'reinforcing_beams', name:'Reinforcing Beams', category:'wall', parentId:'advanced_ramparts', description:'Internal braces strengthen the rampart structure.', apCost:35, resources:c(4,5), prerequisites:['advanced_ramparts'], effects:def(25), effectLabel:'+25 town defense', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  spiked_wall: { id:'spiked_wall', name:'Spiked Wall', category:'wall', parentId:'advanced_ramparts', description:'The wall is crowned with brutal anti-zombie spikes.', apCost:60, resources:c(7,6), prerequisites:['advanced_ramparts'], effects:def(45), effectLabel:'+45 town defense', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  uberwall: { id:'uberwall', name:'Überwall', category:'wall', parentId:'spiked_wall', description:'An excessive but highly effective late defensive wall.', apCost:80, resources:c(10,9,2), prerequisites:['spiked_wall'], effects:def(80), effectLabel:'+80 town defense', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  second_layer: { id:'second_layer', name:'Second Layer', category:'wall', parentId:'advanced_ramparts', description:'A second independent defensive shell surrounds the town.', apCost:75, resources:c(9,7,1), prerequisites:['advanced_ramparts'], effects:def(75), effectLabel:'+75 town defense', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  third_layer: { id:'third_layer', name:'Third Layer', category:'wall', parentId:'second_layer', description:'A third defensive ring for towns expecting extreme attacks.', apCost:95, resources:c(11,9,2), prerequisites:['second_layer'], effects:def(95), effectLabel:'+95 town defense', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  upgradeable_wall: { id:'upgradeable_wall', name:'Upgradeable Wall', category:'wall', parentId:'wall_upgrade', description:'A modular barrier designed to accept stronger reinforcement.', apCost:55, resources:c(7,5,1), prerequisites:['wall_upgrade'], effects:def(55), effectLabel:'+55 town defense', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  concrete_wall: { id:'concrete_wall', name:'Concrete Wall', category:'wall', parentId:'upgradeable_wall', description:'Concrete sections replace weaker portions of the perimeter.', apCost:70, resources:c(4,5,5), prerequisites:['upgradeable_wall'], effects:def(50), effectLabel:'+50 town defense', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  zombie_grater: { id:'zombie_grater', name:'Zombie Grater', category:'wall', parentId:'upgradeable_wall', description:'A vicious mechanical wall attachment intended to shred attackers.', apCost:65, resources:c(5,8), prerequisites:['upgradeable_wall'], effects:def(55), effectLabel:'+55 town defense', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  oubliettes: { id:'oubliettes', name:'Oubliettes', category:'wall', parentId:'great_pit', description:'Hidden pits swallow attackers approaching the defenses.', apCost:50, resources:c(4,4), prerequisites:['great_pit'], effects:def(35), effectLabel:'+35 town defense', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  barriers: { id:'barriers', name:'Barriers', category:'wall', parentId:'wall_upgrade', description:'Simple barricades fill gaps around the town.', apCost:35, resources:c(5,2), prerequisites:['wall_upgrade'], effects:def(30), effectLabel:'+30 town defense', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  palisade: { id:'palisade', name:'Palisade', category:'wall', parentId:'barriers', description:'A dense wooden palisade strengthens the barrier branch.', apCost:50, resources:c(8,2), prerequisites:['barriers'], effects:def(45), effectLabel:'+45 town defense', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  sprayer: { id:'sprayer', name:'Sprayer', category:'wall', parentId:'wall_upgrade', description:'A projection system preparing the wall for chemical defenses.', apCost:35, resources:c(3,5), prerequisites:['wall_upgrade'], effects:[], effectLabel:'Unlocks chemical wall defenses', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  acid_projection: { id:'acid_projection', name:'Acid Projection', category:'wall', parentId:'sprayer', description:'A one-night chemical projection that burns through the attacking horde.', apCost:40, resources:{...c(2,4), pharmaceutical_products:1}, prerequisites:['sprayer'], effects:def(40), effectLabel:'+40 defense for the next attack', expiresAfterAttack:true, source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  neurotoxin: { id:'neurotoxin', name:'Neurotoxin', category:'wall', parentId:'acid_projection', description:'A powerful disposable chemical defense for an emergency night.', apCost:60, resources:{...c(2,5), pharmaceutical_products:2}, prerequisites:['acid_projection'], effects:def(150), effectLabel:'+150 defense for the next attack', expiresAfterAttack:true, source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  plywood: { id:'plywood', name:'Plywood', category:'wall', parentId:'wall_upgrade', description:'Additional wooden plating covers weak wall sections.', apCost:30, resources:c(7,1), prerequisites:['wall_upgrade'], effects:def(25), effectLabel:'+25 town defense', source:M, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  timber_armour: { id:'timber_armour', name:'Armour Plating', category:'wall', parentId:'wall_upgrade', description:'Simple timber plating reinforces the town perimeter.', apCost:30, resources:{twisted_plank:10}, prerequisites:['wall_upgrade'], effects:def(30), effectLabel:'+30 town defense', source:M, sourceConfidence:'confirmed', historicalCostConfidence:'confirmed' },
  metal_armour: { id:'metal_armour', name:'Armour Plating v2', category:'wall', parentId:'wall_upgrade', description:'A basic metal-plating layer reinforces the perimeter.', apCost:30, resources:{wrought_iron:10}, prerequisites:['wall_upgrade'], effects:def(30), effectLabel:'+30 town defense', source:M, sourceConfidence:'confirmed', historicalCostConfidence:'confirmed' },
  heavy_armour: { id:'heavy_armour', name:'Armour Plating v3', category:'wall', parentId:'wall_upgrade', description:'A thicker mixed-material wall layer adds a larger defensive gain.', apCost:30, resources:{twisted_plank:8,wrought_iron:8}, prerequisites:['wall_upgrade'], effects:def(45), effectLabel:'+45 town defense', source:M, sourceConfidence:'confirmed', historicalCostConfidence:'confirmed' },
  slick_wall: { id:'slick_wall', name:"Slip 'n' Slide", category:'wall', parentId:'wall_upgrade', description:'A treated wall surface makes the perimeter more difficult for the horde to climb.', apCost:35, resources:{wrought_iron:10,water_ration:10,copper_pipe:1,sheet_metal:2,pharmaceutical_products:2}, prerequisites:['wall_upgrade'], effects:def(60), effectLabel:'+60 town defense', source:M, sourceConfidence:'confirmed', historicalCostConfidence:'confirmed' },
  bastion: { id:'bastion', name:'Bastion', category:'wall', parentId:'advanced_ramparts', description:'A reinforced strongpoint anchors the town perimeter.', apCost:55, resources:c(5,6,1), prerequisites:['advanced_ramparts'], effects:def(45), effectLabel:'+45 town defense', source:M, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },

  pump: { id:'pump', name:'Pump', category:'pump', description:'Expands access to the town well and grants a second daily ration withdrawal.', apCost:25, resources:c(8,1), prerequisites:[], effects:[{type:'well_water_on_complete',amount:10},{type:'well_daily_withdrawals',amount:1}], effectLabel:'+10 water and +1 daily Well withdrawal', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  vegetable_plot: { id:'vegetable_plot', name:'Vegetable Plot', category:'pump', parentId:'pump', description:'A small irrigated plot supplies a few food items each morning.', apCost:60, resources:c(6,2), prerequisites:['pump'], effects:[{type:'daily_bank_item',itemType:'food',min:2,max:4}], effectLabel:'Generates 2–4 food each day', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  drilling_rig: { id:'drilling_rig', name:'Drilling Rig', category:'pump', parentId:'pump', description:'A deeper drilling system taps another reserve below the Well.', apCost:55, resources:c(6,5), prerequisites:['pump'], effects:[{type:'well_water_on_complete',amount:40}], effectLabel:'+40 Well water on completion', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  eden_project: { id:'eden_project', name:'Eden Project', category:'pump', parentId:'drilling_rig', description:'An ambitious water project that significantly increases reserves.', apCost:75, resources:c(8,6,2), prerequisites:['drilling_rig'], effects:[{type:'well_water_on_complete',amount:70}], effectLabel:'+70 Well water on completion', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  hydraulic_network: { id:'hydraulic_network', name:'Hydraulic Network', category:'pump', parentId:'pump', description:'A town-wide network improves access to recovered water.', apCost:40, resources:c(4,5), prerequisites:['pump'], effects:[{type:'well_water_on_complete',amount:15}], effectLabel:'+15 Well water on completion', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  vaporizer: { id:'vaporizer', name:'Vaporizer', category:'pump', parentId:'hydraulic_network', description:'Pressurized water equipment doubles as a defensive installation.', apCost:50, resources:c(4,6), prerequisites:['hydraulic_network'], effects:def(50), effectLabel:'+50 town defense', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  hydraulic_crusher: { id:'hydraulic_crusher', name:'Hydraulic Crusher', category:'pump', parentId:'hydraulic_network', description:'A brutal hydraulic obstacle protects the town approach.', apCost:50, resources:c(5,6), prerequisites:['hydraulic_network'], effects:def(50), effectLabel:'+50 town defense', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  automatic_sprinklers: { id:'automatic_sprinklers', name:'Automatic Sprinklers', category:'pump', parentId:'hydraulic_network', description:'A large automatic water-defense network covers the perimeter.', apCost:80, resources:c(8,8,2), prerequisites:['hydraulic_network'], effects:def(150), effectLabel:'+150 town defense', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  water_turrets: { id:'water_turrets', name:'Water Turrets', category:'pump', parentId:'hydraulic_network', description:'Water-fed defensive turrets reinforce the town walls.', apCost:70, resources:c(6,8,1), prerequisites:['hydraulic_network'], effects:def(70), effectLabel:'+70 town defense', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  outer_world_apple_tree: { id:'outer_world_apple_tree', name:'Outer World Apple Tree', category:'pump', parentId:'vegetable_plot', description:'A hardy cultivated tree provides a renewable food trickle.', apCost:65, resources:c(8,2), prerequisites:['vegetable_plot'], effects:[{type:'daily_bank_item',itemType:'food',min:2,max:4}], effectLabel:'Generates 2–4 food each day', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  gutters: { id:'gutters', name:'Gutters', category:'pump', parentId:'pump', description:'Rain-catching gutters contribute both utility and hardened structure.', apCost:60, resources:c(7,4), prerequisites:['pump'], effects:def(60), effectLabel:'+60 town defense', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  water_detector: { id:'water_detector', name:'Water Detector', category:'pump', parentId:'drilling_rig', description:'Survey equipment identifies a substantial hidden reserve.', apCost:75, resources:{...c(5,5), battery:2}, prerequisites:['drilling_rig'], effects:[{type:'well_water_on_complete',amount:100}], effectLabel:'+100 Well water on completion', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },

  workshop: { id:'workshop', name:'Workshop', category:'workshop', description:'Processes raw scavenged materials and repairs damaged field weapons.', apCost:25, resources:c(10,8), prerequisites:[], effects:[], effectLabel:'Unlocks Workshop processing and repairs', facilityScreen:'workshop', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'confirmed' },
  defense_mounts: { id:'defense_mounts', name:'Defense Mounts', category:'workshop', parentId:'workshop', description:'Dedicated mounting points increase the defensive value of Bank objects.', apCost:45, resources:c(4,6), prerequisites:['workshop'], effects:[{type:'bank_defense_multiplier',multiplier:1.5}], effectLabel:'Bank defensive items ×1.5', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  cannon_mounds: { id:'cannon_mounds', name:'Cannon Mounds', category:'workshop', parentId:'workshop', description:'Prepared firing positions add substantial static defense.', apCost:40, resources:c(5,5), prerequisites:['workshop'], effects:def(30), effectLabel:'+30 town defense', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  brick_cannon: { id:'brick_cannon', name:'Brick Cannon', category:'workshop', parentId:'cannon_mounds', description:'A crude but effective improvised artillery emplacement.', apCost:55, resources:c(3,6,3), prerequisites:['cannon_mounds'], effects:def(50), effectLabel:'+50 town defense', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  perforator: { id:'perforator', name:'Perforator', category:'workshop', parentId:'cannon_mounds', description:'A heavy mechanical defense intended to punch through dense hordes.', apCost:55, resources:c(4,7), prerequisites:['cannon_mounds'], effects:def(50), effectLabel:'+50 town defense', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  shrapnel_launcher: { id:'shrapnel_launcher', name:'Shrapnel Launcher', category:'workshop', parentId:'cannon_mounds', description:'An improvised launcher scatters lethal debris across attackers.', apCost:65, resources:c(4,8), prerequisites:['cannon_mounds'], effects:def(60), effectLabel:'+60 town defense', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  brutal_cannon: { id:'brutal_cannon', name:'Brutal Cannon', category:'workshop', parentId:'cannon_mounds', description:'A disposable high-output cannon prepared for the next horde only.', apCost:45, resources:c(3,7), prerequisites:['cannon_mounds'], effects:def(50), effectLabel:'+50 defense for the next attack', expiresAfterAttack:true, source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  turnstile: { id:'turnstile', name:'Turnstile', category:'workshop', parentId:'workshop', description:'A reinforced access obstacle slows anything forcing its way through town approaches.', apCost:30, resources:c(4,3), prerequisites:['workshop'], effects:def(10), effectLabel:'+10 town defense', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  factory: { id:'factory', name:'Factory', category:'workshop', parentId:'workshop', description:'Better tooling reduces the AP cost of Workshop transformations.', apCost:40, resources:c(5,6), prerequisites:['workshop'], effects:[{type:'workshop_ap_discount',amount:1}], effectLabel:'Workshop recipes cost 1 less AP', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  screaming_saws: { id:'screaming_saws', name:'Screaming Saws', category:'workshop', parentId:'factory', description:'Powered saws guard the perimeter with horrifying efficiency.', apCost:55, resources:{...c(4,7), battery:1}, prerequisites:['factory'], effects:def(45), effectLabel:'+45 town defense', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  slaughterhouse: { id:'slaughterhouse', name:'Slaughterhouse', category:'workshop', parentId:'factory', description:'Heavy processing machinery doubles as defensive infrastructure.', apCost:50, resources:c(5,6), prerequisites:['factory'], effects:def(35), effectLabel:'+35 town defense', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  defensive_supports: { id:'defensive_supports', name:'Defensive Supports', category:'workshop', parentId:'workshop', description:'Reinforces the entire defensive network rather than one wall segment.', apCost:45, resources:c(5,6), prerequisites:['workshop'], effects:[{type:'town_defense_flat',amount:8},{type:'town_defense_multiplier',multiplier:1.1}], effectLabel:'+8 defense and ×1.10 total town defense', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  locked_cemetery: { id:'locked_cemetery', name:'Locked Cemetery', category:'workshop', parentId:'workshop', description:'The dead are incorporated into grim defensive planning.', apCost:40, resources:c(4,5), prerequisites:['workshop'], effects:[{type:'defense_per_dead_citizen',amount:10}], effectLabel:'+10 defense per dead citizen', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  spring_coffins: { id:'spring_coffins', name:'Spring Coffins', category:'workshop', parentId:'locked_cemetery', description:'The cemetery is weaponized even further.', apCost:55, resources:c(5,7), prerequisites:['locked_cemetery'], effects:[{type:'defense_per_dead_citizen',amount:20}], effectLabel:'+20 additional defense per dead citizen', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  henhouse: { id:'henhouse', name:'Henhouse', category:'workshop', parentId:'workshop', description:'A small food-producing facility supplements scavenged supplies.', apCost:45, resources:c(7,2), prerequisites:['workshop'], effects:[{type:'daily_bank_item',itemType:'food',min:3,max:3}], effectLabel:'Generates 3 food each day', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  circular_quarters: { id:'circular_quarters', name:'Circular Quarters', category:'workshop', parentId:'workshop', description:'Town housing is arranged so private home fortifications contribute far more to shared defense.', apCost:60, resources:c(8,5), prerequisites:['workshop'], effects:[{type:'home_contribution_ratio',ratio:0.8}], effectLabel:'80% of home structural defense contributes to town defense', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },

  watchtower: { id:'watchtower', name:'Watchtower', category:'watchtower', description:'Provides a useful estimate of the incoming nightly horde.', apCost:12, resources:c(3,2), prerequisites:[], effects:[{type:'town_defense_flat',amount:10},{type:'watchtower_margin_percent',percent:15}], effectLabel:'+10 defense and attack estimate', facilityScreen:'watchtower', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'confirmed' },
  scanner: { id:'scanner', name:'Scanner', category:'watchtower', parentId:'watchtower', description:'Improves the accuracy of Watchtower estimates.', apCost:40, resources:{...c(3,4), battery:1}, prerequisites:['watchtower'], effects:[{type:'watchtower_margin_percent',percent:5}], effectLabel:'Narrows Watchtower estimate uncertainty', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  planner: { id:'planner', name:'Planner', category:'watchtower', parentId:'watchtower', description:'Extends strategic forecasting beyond the current night.', apCost:45, resources:c(4,4), prerequisites:['watchtower'], effects:[{type:'watchtower_forecast_days',days:2}], effectLabel:'Unlocks next-day horde forecast', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  search_tower: { id:'search_tower', name:'Search Tower', category:'watchtower', parentId:'watchtower', description:'Improves the chance that exhausted World Beyond zones become productive again overnight.', apCost:30, resources:{...c(3,1), battery:1}, prerequisites:['watchtower'], effects:[{type:'search_replenishment_chance',percent:25}], effectLabel:'25% nightly chance to replenish each depleted known zone', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  emergency_devices: { id:'emergency_devices', name:'Emergency Devices', category:'watchtower', parentId:'watchtower', description:'Prepares the town to build powerful one-night emergency defenses.', apCost:30, resources:c(3,3), prerequisites:['watchtower'], effects:[], effectLabel:'Unlocks emergency defenses', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  emergency_reinforcements: { id:'emergency_reinforcements', name:'Emergency Reinforcements', category:'watchtower', parentId:'emergency_devices', description:'Temporary reinforcements erected specifically for the next attack.', apCost:40, resources:c(5,4), prerequisites:['emergency_devices'], effects:def(40), effectLabel:'+40 defense for the next attack', expiresAfterAttack:true, source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  trapped_fields: { id:'trapped_fields', name:'Trapped Fields', category:'watchtower', parentId:'emergency_devices', description:'Disposable traps cover the approaches for one night.', apCost:35, resources:c(4,3), prerequisites:['emergency_devices'], effects:def(25), effectLabel:'+25 defense for the next attack', expiresAfterAttack:true, source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  guerrilla: { id:'guerrilla', name:'Guerrilla Traps', category:'watchtower', parentId:'emergency_devices', description:'A dense network of improvised temporary traps.', apCost:50, resources:c(4,5), prerequisites:['emergency_devices'], effects:def(50), effectLabel:'+50 defense for the next attack', expiresAfterAttack:true, source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  rubbish_heap: { id:'rubbish_heap', name:'Rubbish Heap', category:'watchtower', parentId:'emergency_devices', description:'A small disposable obstruction whose main value is enabling a larger heap.', apCost:15, resources:c(2,1), prerequisites:['emergency_devices'], effects:def(5), effectLabel:'+5 defense for the next attack', expiresAfterAttack:true, source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  mount_killamanjaro: { id:'mount_killamanjaro', name:'Mount Killamanjaro', category:'watchtower', parentId:'rubbish_heap', description:'An absurd mountain of refuse forms an emergency barrier.', apCost:60, resources:c(8,4), prerequisites:['rubbish_heap'], effects:def(60), effectLabel:'+60 defense for the next attack', expiresAfterAttack:true, source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  wolf_trap: { id:'wolf_trap', name:'Wolf Trap', category:'watchtower', parentId:'emergency_devices', description:'Oversized temporary traps are placed before the attack.', apCost:40, resources:c(3,5), prerequisites:['emergency_devices'], effects:def(40), effectLabel:'+40 defense for the next attack', expiresAfterAttack:true, source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  dynamiting: { id:'dynamiting', name:'Dynamiting', category:'watchtower', parentId:'emergency_devices', description:'Controlled demolition creates a temporary defensive kill zone.', apCost:35, resources:{...c(2,3), box_of_matches:1}, prerequisites:['emergency_devices'], effects:def(35), effectLabel:'+35 defense for the next attack', expiresAfterAttack:true, source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  panic: { id:'panic', name:'Panic', category:'watchtower', parentId:'emergency_devices', description:'A desperate improvised defense thrown together for one night.', apCost:50, resources:c(5,4), prerequisites:['emergency_devices'], effects:def(50), effectLabel:'+50 defense for the next attack', expiresAfterAttack:true, source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  la_bamba: { id:'la_bamba', name:'La Bamba', category:'watchtower', parentId:'emergency_devices', description:'A large temporary defensive contraption for catastrophic nights.', apCost:75, resources:c(7,7,1), prerequisites:['emergency_devices'], effects:def(75), effectLabel:'+75 defense for the next attack', expiresAfterAttack:true, source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },

  foundations: { id:'foundations', name:'Foundations', category:'foundations', description:'Large-scale foundations unlock ambitious town-wide infrastructure.', apCost:45, resources:c(6,4,2), prerequisites:[], effects:[], effectLabel:'Unlocks major town projects', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  grand_relocation: { id:'grand_relocation', name:'Grand Relocation', category:'foundations', parentId:'foundations', description:'A vast restructuring project produces enormous passive defense.', apCost:120, resources:c(14,12,5), prerequisites:['foundations'], effects:def(300), effectLabel:'+300 town defense', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  derrick: { id:'derrick', name:'Derrick', category:'foundations', parentId:'foundations', description:'A major extraction rig taps another deep water supply.', apCost:70, resources:c(7,8,2), prerequisites:['foundations'], effects:[{type:'well_water_on_complete',amount:50}], effectLabel:'+50 Well water on completion', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  scarecrow_fields: { id:'scarecrow_fields', name:'Scarecrow Fields', category:'foundations', parentId:'foundations', description:'A field of decoys and obstacles absorbs some pressure from the horde.', apCost:50, resources:c(8,2), prerequisites:['foundations'], effects:def(25), effectLabel:'+25 town defense', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  lighthouse: { id:'lighthouse', name:'Lighthouse', category:'foundations', parentId:'foundations', description:'A landmark and signal point helps citizens establish safer overnight routes and camps.', apCost:65, resources:{...c(7,5), battery:1}, prerequisites:['foundations'], effects:[{type:'camping_survival_bonus',amount:10}], effectLabel:'+10 percentage points to camping outlook', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  fortified_homes: { id:'fortified_homes', name:'Fortified Homes', category:'foundations', parentId:'foundations', description:'Every citizen home receives stronger structural reinforcement.', apCost:75, resources:c(10,7,2), prerequisites:['foundations'], effects:[{type:'home_defense_flat',amount:4}], effectLabel:'+4 personal defense to every home', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  improved_drill: { id:'improved_drill', name:'Improved Drill', category:'foundations', parentId:'derrick', description:'A major upgrade to deep-water extraction.', apCost:90, resources:c(8,9,3), prerequisites:['derrick'], effects:[{type:'well_water_on_complete',amount:150}], effectLabel:'+150 Well water on completion', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  hot_air_balloon: { id:'hot_air_balloon', name:'Hot-Air Balloon', category:'foundations', parentId:'foundations', description:'A high-altitude survey reveals the shape of the entire World Beyond without revealing current zombie counts.', apCost:80, resources:{...c(8,6), battery:1}, prerequisites:['foundations'], effects:[{type:'reveal_all_terrain_on_complete'}], effectLabel:'Reveals all terrain; zombie intelligence remains unknown/stale', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  false_town: { id:'false_town', name:'False Town', category:'foundations', parentId:'foundations', description:'An enormous decoy settlement draws pressure away from the real town.', apCost:140, resources:c(15,12,6), prerequisites:['foundations'], effects:def(400), effectLabel:'+400 town defense', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },

  portal_lock: { id:'portal_lock', name:'Portal Lock', category:'portal', description:'Locks the gate during the final pre-attack hour.', apCost:16, resources:c(0,2), prerequisites:[], effects:[{type:'town_defense_flat',amount:5},{type:'gate_lock_hour',hour:23}], effectLabel:'+5 defense; gate cannot be reopened at 23:00', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  automatic_piston_lock: { id:'automatic_piston_lock', name:'Automatic Piston Lock', category:'portal', parentId:'portal_lock', description:'Automatically seals and locks the gate at the final pre-attack hour.', apCost:45, resources:{...c(3,6), battery:1}, prerequisites:['portal_lock'], effects:[{type:'town_defense_flat',amount:30},{type:'gate_auto_close_hour',hour:23},{type:'gate_lock_hour',hour:23}], effectLabel:'+30 defense; automatically closes and locks gate at 23:00', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  reinforced_gates: { id:'reinforced_gates', name:'Reinforced Gates', category:'portal', parentId:'portal_lock', description:'Heavy reinforcement strengthens the town entrance.', apCost:45, resources:c(5,6), prerequisites:['portal_lock'], effects:def(20), effectLabel:'+20 town defense', source:H, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },

  sanctuary: { id:'sanctuary', name:'Sanctuary', category:'sanctuary', description:'A spiritual/community branch retained now for construction depth; later status systems can extend its utility.', apCost:45, resources:c(5,3,1), prerequisites:[], effects:[], effectLabel:'Unlocks Sanctuary projects', source:M, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  soul_purifying_source: { id:'soul_purifying_source', name:'Soul-Purifying Source', category:'sanctuary', parentId:'sanctuary', description:'A fortified communal source that currently contributes defensive structure.', apCost:50, resources:c(4,4,1), prerequisites:['sanctuary'], effects:def(20), effectLabel:'+20 town defense; soul mechanics deferred', source:M, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
  hammam: { id:'hammam', name:'Hammam', category:'sanctuary', parentId:'sanctuary', description:'A substantial communal building whose future status effects are deferred.', apCost:50, resources:c(5,4,1), prerequisites:['sanctuary'], effects:def(20), effectLabel:'+20 town defense; status effects deferred', source:M, sourceConfidence:'confirmed', historicalCostConfidence:'adapted' },
}

function applyCurrentConstructionFidelity():void {
  for(const [id,snapshot] of Object.entries(CURRENT_CONSTRUCTION_FIDELITY) as Array<[ConstructionId,NonNullable<(typeof CURRENT_CONSTRUCTION_FIDELITY)[ConstructionId]>]>) {
    const project=CONSTRUCTIONS[id]
    if(!project||!snapshot)continue
    project.parentId=snapshot.parentId??undefined
    project.prerequisites=snapshot.parentId?[snapshot.parentId]:[]
    if(snapshot.category)project.category=snapshot.category
    project.blueprintTier=snapshot.blueprintTier
    project.maxHp=snapshot.maxHp
    project.breakable=snapshot.breakable
    project.playable=snapshot.playable
    project.expiresAfterAttack=snapshot.temporary
    project.effects=project.effects.filter((effect)=>effect.type!=='town_defense_flat'&&effect.type!=='well_water_on_complete')
    if(snapshot.defense>0)project.effects.unshift({type:'town_defense_flat',amount:snapshot.defense})
    if((snapshot.completionWater??0)>0)project.effects.push({type:'well_water_on_complete',amount:snapshot.completionWater!})
    if(project.effects.length===1&&project.effects[0].type==='town_defense_flat')project.effectLabel=snapshot.temporary?`+${snapshot.defense} defense for the next attack`:`+${snapshot.defense} town defense`
    else if(project.id==='pump')project.effectLabel=`+${snapshot.completionWater??0} water and +1 daily Well withdrawal`
    else if(snapshot.completionWater&&project.effects.every((effect)=>effect.type==='well_water_on_complete'))project.effectLabel=`+${snapshot.completionWater} Well water on completion`
    project.source='MYHORDES_CURRENT'
    project.sourceConfidence='confirmed'
  }
}

applyCurrentConstructionFidelity()

export const CONSTRUCTION_ORDER: ConstructionId[] = [...CONSTRUCTION_IDS]

export function constructionBlueprintTier(projectId:ConstructionId):ConstructionBlueprintTier{return CONSTRUCTIONS[projectId].blueprintTier??4}
export function constructionPlayable(projectId:ConstructionId):boolean{return CONSTRUCTIONS[projectId].playable===true}
export function constructionMaxHp(projectId:ConstructionId):number{return Math.max(0,CONSTRUCTIONS[projectId].maxHp??CONSTRUCTIONS[projectId].apCost)}
function noBlueprintPathFromRoot(projectId:ConstructionId,seen=new Set<ConstructionId>()):boolean{
  if(seen.has(projectId)||!constructionPlayable(projectId)||constructionBlueprintTier(projectId)!==0)return false
  seen.add(projectId)
  const parent=CONSTRUCTIONS[projectId].parentId
  return !parent||noBlueprintPathFromRoot(parent,seen)
}
export function constructionInitiallyDiscovered(projectId:ConstructionId):boolean{return noBlueprintPathFromRoot(projectId)}

export function constructionDiscoveryCascade(projectId:ConstructionId):ConstructionId[]{
  const discovered:ConstructionId[]=[projectId]
  const queue:ConstructionId[]=[projectId]
  while(queue.length){
    const parentId=queue.shift()!
    for(const id of CONSTRUCTION_ORDER){
      if(discovered.includes(id)||!constructionPlayable(id)||constructionBlueprintTier(id)!==0||CONSTRUCTIONS[id].parentId!==parentId)continue
      discovered.push(id);queue.push(id)
    }
  }
  return discovered
}

export function createConstructionState(): Record<ConstructionId, ConstructionProjectState> {
  return Object.fromEntries(CONSTRUCTION_ORDER.map((id) => [id, { id, discovered:constructionInitiallyDiscovered(id), apContributed:0, completed:false, hp:0 }])) as Record<ConstructionId, ConstructionProjectState>
}

export function constructionDiscovered(state:GameState,projectId:ConstructionId):boolean{return state.town.construction[projectId]?.discovered===true}

export function constructionUnlocked(state: GameState, projectId: ConstructionId): boolean {
  return constructionPlayable(projectId)&&constructionDiscovered(state,projectId)&&CONSTRUCTIONS[projectId].prerequisites.every((id) => state.town.construction[id]?.completed)
}

export function blueprintEligibleProjects(state:GameState,tier:ConstructionBlueprintTier):ConstructionId[]{
  return CONSTRUCTION_ORDER.filter((id)=>{
    const definition=CONSTRUCTIONS[id]
    const project=state.town.construction[id]
    if(!constructionPlayable(id)||project?.discovered||constructionBlueprintTier(id)!==tier)return false
    return !definition.parentId||state.town.construction[definition.parentId]?.discovered===true
  })
}

export function hasRequiredMaterials(state: GameState, projectId: ConstructionId): boolean {
  if (!constructionUnlocked(state, projectId)) return false
  const definition = CONSTRUCTIONS[projectId]
  return Object.entries(definition.resources).every(([type, required]) => bankCount(state,type as ItemType) >= (required ?? 0))
}

export function missingMaterials(state: GameState, projectId: ConstructionId): Partial<Record<ItemType, number>> {
  const definition = CONSTRUCTIONS[projectId]
  const missing: Partial<Record<ItemType, number>> = {}
  for (const [type, required] of Object.entries(definition.resources)) {
    const itemType = type as ItemType
    const count = Math.max(0, (required ?? 0) - bankCount(state,itemType))
    if (count > 0) missing[itemType] = count
  }
  return missing
}

export function constructionDepth(projectId: ConstructionId): number {
  let depth = 0
  let current = CONSTRUCTIONS[projectId].parentId
  const seen = new Set<ConstructionId>()
  while (current && !seen.has(current)) {
    seen.add(current)
    depth += 1
    current = CONSTRUCTIONS[current].parentId
  }
  return depth
}

export function completedConstructionEffects(state: GameState): ConstructionEffect[] {
  return CONSTRUCTION_ORDER.flatMap((id) => state.town.construction[id]?.completed ? CONSTRUCTIONS[id].effects : [])
}

function effectsOfType<T extends ConstructionEffect['type']>(state:GameState,type:T):Extract<ConstructionEffect,{type:T}>[]{
  return completedConstructionEffects(state).filter((effect):effect is Extract<ConstructionEffect,{type:T}>=>effect.type===type)
}

export function constructionConditionRatio(state:GameState,projectId:ConstructionId):number{
  const project=state.town.construction[projectId]
  if(!project?.completed)return 0
  const definition=CONSTRUCTIONS[projectId]
  if(definition.breakable===false)return 1
  const maxHp=constructionMaxHp(projectId)
  return maxHp>0?Math.max(0,Math.min(1,project.hp/maxHp)):1
}
export function constructionTownDefense(state:GameState):number{
  const flat=CONSTRUCTION_ORDER.reduce((sum,id)=>{
    if(!state.town.construction[id]?.completed)return sum
    const base=CONSTRUCTIONS[id].effects.filter((effect):effect is Extract<ConstructionEffect,{type:'town_defense_flat'}>=>effect.type==='town_defense_flat').reduce((value,effect)=>value+effect.amount,0)
    return sum+Math.floor(base*constructionConditionRatio(state,id))
  },0)
  const dead=state.citizens.filter((citizen)=>!citizen.alive).length
  const perDead=effectsOfType(state,'defense_per_dead_citizen').reduce((sum,effect)=>sum+effect.amount,0)
  return flat+dead*perDead
}
export function constructionTownDefenseMultiplier(state:GameState):number{return effectsOfType(state,'town_defense_multiplier').reduce((value,effect)=>value*effect.multiplier,1)}
export function bankDefenseMultiplier(state:GameState):number{return effectsOfType(state,'bank_defense_multiplier').reduce((value,effect)=>value*effect.multiplier,1)}
export function homeDefenseBonus(state:GameState):number{return effectsOfType(state,'home_defense_flat').reduce((sum,effect)=>sum+effect.amount,0)}
export function homeContributionRatio(state:GameState):number{return Math.max(0.4,...effectsOfType(state,'home_contribution_ratio').map((effect)=>effect.ratio))}
export function wellDailyWithdrawals(state:GameState):number{return 1+effectsOfType(state,'well_daily_withdrawals').reduce((sum,effect)=>sum+effect.amount,0)}
export function workshopApDiscount(state:GameState):number{return effectsOfType(state,'workshop_ap_discount').reduce((sum,effect)=>sum+effect.amount,0)}
export function searchReplenishmentChance(state:GameState):number{return Math.max(0,...effectsOfType(state,'search_replenishment_chance').map((effect)=>effect.percent))}
export function campingConstructionBonus(state:GameState):number{return effectsOfType(state,'camping_survival_bonus').reduce((sum,effect)=>sum+effect.amount,0)}
export function watchtowerMarginPercent(state:GameState):number|null{
  if(!state.town.construction.watchtower?.completed)return null
  return Math.min(15,...effectsOfType(state,'watchtower_margin_percent').map((effect)=>effect.percent))
}
export function watchtowerForecastDays(state:GameState):number{return Math.max(1,...effectsOfType(state,'watchtower_forecast_days').map((effect)=>effect.days))}
export function gateLockedAtHour(state:GameState,hour:number):boolean{return effectsOfType(state,'gate_lock_hour').some((effect)=>effect.hour===hour)}
export function gateAutoCloseAtHour(state:GameState,hour:number):boolean{return effectsOfType(state,'gate_auto_close_hour').some((effect)=>effect.hour===hour)}
export function completionWaterBonus(projectId:ConstructionId):number{return CONSTRUCTIONS[projectId].effects.filter((effect):effect is Extract<ConstructionEffect,{type:'well_water_on_complete'}>=>effect.type==='well_water_on_complete').reduce((sum,effect)=>sum+effect.amount,0)}
export function revealsAllTerrain(projectId:ConstructionId):boolean{return CONSTRUCTIONS[projectId].effects.some((effect)=>effect.type==='reveal_all_terrain_on_complete')}
export function temporaryCompletedProjects(state:GameState):ConstructionId[]{return CONSTRUCTION_ORDER.filter((id)=>CONSTRUCTIONS[id].expiresAfterAttack&&state.town.construction[id]?.completed)}
export function dailyConstructionOutputs(state:GameState):Array<{projectId:ConstructionId;itemType:ItemType;min:number;max:number}>{
  return CONSTRUCTION_ORDER.flatMap((projectId)=>state.town.construction[projectId]?.completed?CONSTRUCTIONS[projectId].effects.flatMap((effect)=>effect.type==='daily_bank_item'?[{projectId,itemType:effect.itemType,min:effect.min,max:effect.max}]:[]):[])
}
export function constructionFlatDefenseForProject(projectId:ConstructionId):number{return CONSTRUCTIONS[projectId].effects.filter((effect):effect is Extract<ConstructionEffect,{type:'town_defense_flat'}>=>effect.type==='town_defense_flat').reduce((sum,effect)=>sum+effect.amount,0)}

function unlockValue(state:GameState,projectId:ConstructionId):number{return CONSTRUCTION_ORDER.filter((id)=>constructionPlayable(id)&&state.town.construction[id]?.discovered&&!state.town.construction[id]?.completed&&CONSTRUCTIONS[id].parentId===projectId).length}
function missingResourceBurden(state:GameState,projectId:ConstructionId):number{return Object.values(missingMaterials(state,projectId)).reduce((sum,value)=>sum+(value??0),0)}

export function constructionPriority(state: GameState, projectId: ConstructionId): number {
  const project=state.town.construction[projectId]
  if(project?.completed||!constructionUnlocked(state,projectId))return -1
  if(projectId==='workshop')return 1000
  const definition=CONSTRUCTIONS[projectId]
  const living=Math.max(1,state.citizens.filter((citizen)=>citizen.alive).length)
  const waterPerCitizen=state.town.well.water/living
  const previousBreach=state.lastNight?.breached??false
  const previousGap=state.lastNight?Math.max(0,state.lastNight.attackStrength-state.lastNight.effectiveDefense):0
  const defenseFlat=definition.effects.filter((effect):effect is Extract<ConstructionEffect,{type:'town_defense_flat'}>=>effect.type==='town_defense_flat').reduce((sum,effect)=>sum+effect.amount,0)
  const defensiveUtility=definition.effects.some((effect)=>['town_defense_multiplier','bank_defense_multiplier','home_defense_flat','home_contribution_ratio','defense_per_dead_citizen'].includes(effect.type))
  const waterUtility=definition.effects.some((effect)=>effect.type==='well_water_on_complete'||effect.type==='well_daily_withdrawals')
  const infrastructureUtility=definition.effects.some((effect)=>['workshop_ap_discount','search_replenishment_chance','watchtower_margin_percent','watchtower_forecast_days','camping_survival_bonus','daily_bank_item'].includes(effect.type))
  const progress=definition.apCost>0?(project?.apContributed??0)/definition.apCost:0
  let score=20+unlockValue(state,projectId)*8+progress*45
  if(defenseFlat>0||defensiveUtility)score+=Math.min(180,defenseFlat*0.9)+(previousBreach?90:0)+Math.min(90,previousGap*0.8)+Math.max(0,state.day-1)*6
  if(waterUtility)score+=waterPerCitizen<1.5?150:waterPerCitizen<2.5?90:25
  if(infrastructureUtility)score+=45
  if(definition.expiresAfterAttack)score+=previousBreach||previousGap>0?45:-30
  if(definition.category==='foundations'&&state.day<3)score-=25
  score-=missingResourceBurden(state,projectId)*3
  return score
}

export function prioritizedConstruction(state: GameState): ConstructionId[] {
  return CONSTRUCTION_ORDER
    .filter((id)=>!state.town.construction[id]?.completed&&constructionUnlocked(state,id))
    .sort((a,b)=>constructionPriority(state,b)-constructionPriority(state,a)||CONSTRUCTION_ORDER.indexOf(a)-CONSTRUCTION_ORDER.indexOf(b))
}

// Guard against a catalog/type list drifting apart during development.
for(const id of CONSTRUCTION_IDS){if(!CONSTRUCTIONS[id])throw new Error(`Missing construction definition for ${id}`)}
