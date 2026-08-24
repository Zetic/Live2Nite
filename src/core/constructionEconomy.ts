import type { ConstructionId } from './constructionIds'
import type { ItemType } from './itemCatalog'

export interface ConstructionCostSnapshot {
  apCost:number
  resources:Partial<Record<ItemType,number>>
  /** Current MyHordes building name used to establish the direct-equivalent mapping. */
  referenceName:string
}

const r=(resources:Partial<Record<ItemType,number>>):Partial<Record<ItemType,number>>=>resources

/**
 * Current MyHordes normal-mode construction costs pinned for the construction-economy pass.
 * Numeric data is transcribed from the generated MyHordes 5.1.1 building dataset at
 * Zenoo/zen-hordes@f301c05f2527a341f663eea05e6ebd893f181ed6 and cross-checked against
 * the current Eternaltwin/MyHordes source/release line. Only clear direct equivalents are
 * represented here; intentionally divergent Live2Nite projects keep their existing
 * LIVE2NITE/HORDES source labels in construction.ts.
 */
export const MYHORDES_CURRENT_CONSTRUCTION_COSTS:Partial<Record<ConstructionId,ConstructionCostSnapshot>>={
  wall_upgrade:{referenceName:'Defensive Wall',apCost:25,resources:r({twisted_plank:8,wrought_iron:4})},
  great_pit:{referenceName:'Great Pit',apCost:70,resources:r({})},
  moat:{referenceName:'Great Moat',apCost:60,resources:r({water_ration:20})},
  spiked_pit:{referenceName:'Spiked Pit',apCost:35,resources:r({wrought_iron:2,patchwork_beam:8})},
  barbed_wire:{referenceName:'Barbed Wire',apCost:10,resources:r({wrought_iron:1,wire_reel:2})},
  bait:{referenceName:'Bait',apCost:10,resources:r({meaty_bone:2})},
  advanced_ramparts:{referenceName:'Wall Upgrade V2',apCost:40,resources:r({nuts_and_bolts:2,patchwork_beam:5,metal_support:5})},
  reinforcing_beams:{referenceName:'Metal Patches',apCost:15,resources:r({patchwork_beam:5,metal_support:3})},
  spiked_wall:{referenceName:'Spiked Wall',apCost:35,resources:r({twisted_plank:5,wrought_iron:2,unshaped_concrete_block:1})},
  uberwall:{referenceName:'Überwall',apCost:50,resources:r({twisted_plank:10,wrought_iron:10,unshaped_concrete_block:2,patchwork_beam:10,metal_support:10})},
  second_layer:{referenceName:'Inner Wall',apCost:60,resources:r({twisted_plank:35,metal_support:5})},
  third_layer:{referenceName:'Third Wall',apCost:60,resources:r({wrought_iron:35,sheet_metal:3,metal_support:5})},
  upgradeable_wall:{referenceName:'Evolutive Wall',apCost:65,resources:r({twisted_plank:5,wrought_iron:15,unshaped_concrete_block:2})},
  concrete_wall:{referenceName:'Concrete Reinforcement',apCost:40,resources:r({twisted_plank:5,unshaped_concrete_block:5,metal_support:10})},
  zombie_grater:{referenceName:'Zombie-shredder',apCost:40,resources:r({nuts_and_bolts:3,metal_support:5,wrought_iron:15,sheet_metal:1,wire_reel:1})},
  oubliettes:{referenceName:'Old-school Traps',apCost:25,resources:r({metal_support:1,sheet_metal:2})},
  barriers:{referenceName:'Wooden Fencing',apCost:60,resources:r({twisted_plank:15,patchwork_beam:5})},
  palisade:{referenceName:'Small Fence',apCost:50,resources:r({twisted_plank:10,patchwork_beam:8,metal_support:2,sheet_metal:1})},
  sprayer:{referenceName:'Vaporiser',apCost:50,resources:r({nuts_and_bolts:2,wrought_iron:8,copper_pipe:2,metal_support:2,wire_reel:2,compact_detonator:1})},
  acid_projection:{referenceName:'Acid Spray',apCost:25,resources:r({water_ration:3,pharmaceutical_products:2})},
  neurotoxin:{referenceName:'Gas Gun',apCost:60,resources:r({metal_support:5,water_ration:5,nuts_and_bolts:1,copper_pipe:1,pharmaceutical_products:2,poison_gland:1})},
  plywood:{referenceName:'Plywood',apCost:30,resources:r({twisted_plank:2,wrought_iron:2})},
  timber_armour:{referenceName:'Armour Plating',apCost:30,resources:r({twisted_plank:10})},
  metal_armour:{referenceName:'Armour Plating v2',apCost:30,resources:r({wrought_iron:10})},
  heavy_armour:{referenceName:'Armour Plating v3',apCost:30,resources:r({twisted_plank:8,wrought_iron:8})},
  slick_wall:{referenceName:"Slip 'n' Slide",apCost:35,resources:r({wrought_iron:10,water_ration:10,copper_pipe:1,sheet_metal:2,pharmaceutical_products:2})},
  bastion:{referenceName:'Extrawall',apCost:25,resources:r({twisted_plank:15,wrought_iron:15})},

  pump:{referenceName:'Pump',apCost:25,resources:r({wrought_iron:8,copper_pipe:1})},
  vegetable_plot:{referenceName:'Vegetable Plot',apCost:60,resources:r({water_ration:10,pharmaceutical_products:1,patchwork_beam:10})},
  drilling_rig:{referenceName:'Drilling Rig',apCost:55,resources:r({patchwork_beam:7,metal_support:2})},
  eden_project:{referenceName:'Eden Project',apCost:50,resources:r({twisted_plank:10,semtex:2,compact_detonator:1,metal_support:5})},
  hydraulic_network:{referenceName:'Hydraulic Network',apCost:40,resources:r({nuts_and_bolts:2,wrought_iron:5,copper_pipe:2,metal_support:5,duct_tape:1})},
  vaporizer:{referenceName:'Boiling Fog',apCost:40,resources:r({water_ration:10,copper_pipe:1,twisted_plank:10,metal_support:5,empty_oil_can:1})},
  hydraulic_crusher:{referenceName:'Saniflow Macerator',apCost:55,resources:r({sheet_metal:2,copper_pipe:2,patchwork_beam:4,metal_support:10})},
  automatic_sprinklers:{referenceName:'Sprinkler System',apCost:85,resources:r({water_ration:20,copper_pipe:1,patchwork_beam:7,metal_support:15,laser_diode:1})},
  water_turrets:{referenceName:'Water Turrets',apCost:50,resources:r({water_ration:25,copper_pipe:6,metal_support:10})},
  outer_world_apple_tree:{referenceName:'Apple Tree',apCost:30,resources:r({water_ration:10,human_flesh:2,pharmaceutical_products:3,patchwork_beam:1})},
  water_detector:{referenceName:'Divining Rods',apCost:130,resources:r({electronic_component:5,patchwork_beam:10,metal_support:10,copper_pipe:1,laser_diode:2})},

  workshop:{referenceName:'Workshop',apCost:25,resources:r({twisted_plank:10,wrought_iron:8})},
  defense_mounts:{referenceName:'Defensive Focus',apCost:50,resources:r({nuts_and_bolts:3,patchwork_beam:8,metal_support:8})},
  cannon_mounds:{referenceName:'Cannon Mounds',apCost:60,resources:r({unshaped_concrete_block:1,patchwork_beam:8,metal_support:1,nuts_and_bolts:1})},
  brick_cannon:{referenceName:'Rock Cannon',apCost:40,resources:r({copper_pipe:1,electronic_component:1,unshaped_concrete_block:3,patchwork_beam:3,metal_support:5})},
  perforator:{referenceName:'Railgun',apCost:35,resources:r({patchwork_beam:2,wrought_iron:10,nuts_and_bolts:2,sheet_metal:1,metal_support:2})},
  shrapnel_launcher:{referenceName:'Plate Gun',apCost:50,resources:r({nuts_and_bolts:2,sheet_metal:3,semtex:2,patchwork_beam:5,metal_support:1})},
  brutal_cannon:{referenceName:'Brutal Cannon',apCost:25,resources:r({sheet_metal:1,metal_support:1})},
  turnstile:{referenceName:'War Mill',apCost:25,resources:r({patchwork_beam:4,duct_tape:2})},
  factory:{referenceName:'Factory',apCost:40,resources:r({patchwork_beam:5,metal_support:5,table:1})},
  screaming_saws:{referenceName:'Screaming Saws',apCost:45,resources:r({nuts_and_bolts:1,wrought_iron:10,duct_tape:2,metal_support:5,sheet_metal:2,wire_reel:1})},
  slaughterhouse:{referenceName:'Abattoir',apCost:35,resources:r({patchwork_beam:1,sheet_metal:2,metal_support:8,human_flesh:1})},
  defensive_supports:{referenceName:'Defensive Adjustment',apCost:60,resources:r({patchwork_beam:5,metal_support:10,nuts_and_bolts:2,wire_reel:1})},
  locked_cemetery:{referenceName:'Small Cemetery',apCost:42,resources:r({nuts_and_bolts:1,twisted_plank:10})},
  spring_coffins:{referenceName:'Coffin Catapult',apCost:85,resources:r({belt:1,unshaped_concrete_block:2,wire_reel:2,nuts_and_bolts:3,twisted_plank:5,wrought_iron:15})},
  henhouse:{referenceName:'Henhouse',apCost:25,resources:r({chicken:2,twisted_plank:5,patchwork_beam:5,wire_mesh:2,grain_sack:1})},
  circular_quarters:{referenceName:'Community Involvement',apCost:60,resources:r({nuts_and_bolts:3,patchwork_beam:15,metal_support:15})},

  watchtower:{referenceName:'Watchtower',apCost:15,resources:r({twisted_plank:3,patchwork_beam:1,wrought_iron:1})},
  scanner:{referenceName:'Scanner',apCost:20,resources:r({wrought_iron:5,battery:2,laser_diode:1,electronic_component:1,working_radio:2})},
  planner:{referenceName:'Predictor',apCost:20,resources:r({duct_tape:1,electronic_component:1})},
  search_tower:{referenceName:'Searchtower',apCost:30,resources:r({electronic_component:1,patchwork_beam:3,metal_support:1,table:1,telescope:1,laser_diode:2})},
  emergency_devices:{referenceName:'Emergency Supplies',apCost:40,resources:r({twisted_plank:5,wrought_iron:5})},
  emergency_reinforcements:{referenceName:'Wood Plating',apCost:20,resources:r({twisted_plank:6})},
  trapped_fields:{referenceName:'Spikes',apCost:15,resources:r({twisted_plank:5})},
  guerrilla:{referenceName:'Guerilla Traps',apCost:30,resources:r({patchwork_beam:3,metal_support:3,wrought_iron:5,duct_tape:1,wire_reel:1})},
  rubbish_heap:{referenceName:'Rubbish Heap',apCost:10,resources:r({twisted_plank:2,wrought_iron:2})},
  mount_killamanjaro:{referenceName:'Mount Killaman-Jaro',apCost:40,resources:r({wrought_iron:2})},
  wolf_trap:{referenceName:'Pits',apCost:15,resources:r({wrought_iron:5,human_flesh:1})},
  dynamiting:{referenceName:'Bomb Factory',apCost:30,resources:r({semtex:2})},
  panic:{referenceName:'Abject Panic',apCost:25,resources:r({water_ration:2,twisted_plank:5,wrought_iron:5,nuts_and_bolts:1})},
  la_bamba:{referenceName:'Frat House',apCost:20,resources:r({twisted_plank:3,laser_diode:1,working_radio:3,guitar:1})},

  derrick:{referenceName:'Mechanical Pump',apCost:86,resources:r({twisted_plank:5,patchwork_beam:10,metal_support:15,copper_pipe:1})},
  grand_relocation:{referenceName:'The Big Rebuild',apCost:300,resources:r({twisted_plank:20,wrought_iron:20,unshaped_concrete_block:5,patchwork_beam:10,metal_support:10})},
  scarecrow_fields:{referenceName:'Scarecrows',apCost:40,resources:r({twisted_plank:5,patchwork_beam:3,duct_tape:3})},
  fortified_homes:{referenceName:'Fortifications',apCost:50,resources:r({unshaped_concrete_block:2,patchwork_beam:15,metal_support:10,wrought_iron:5})},
  false_town:{referenceName:'False Town',apCost:400,resources:r({nuts_and_bolts:15,twisted_plank:20,wrought_iron:20,patchwork_beam:20,metal_support:20})},

  foundations:{referenceName:'Foundations',apCost:30,resources:r({twisted_plank:8,wrought_iron:8,unshaped_concrete_block:2})},
  portal_lock:{referenceName:'Portal Lock',apCost:15,resources:r({wrought_iron:2})},
  reinforced_gates:{referenceName:'Reinforced Gates',apCost:35,resources:r({twisted_plank:3})},
  soul_purifying_source:{referenceName:'Soul Purifying Source',apCost:30,resources:r({wrought_iron:1,duct_tape:1,bag_of_damp_grass:2,empty_oil_can:1})},
  sanctuary:{referenceName:'Sanctuary',apCost:20,resources:r({twisted_plank:2,patchwork_beam:3,bag_of_damp_grass:1})},
  hammam:{referenceName:'Hammam',apCost:20,resources:r({twisted_plank:2,sheet_metal:2})},
}
