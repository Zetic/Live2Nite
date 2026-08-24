import type { ConstructionId } from './constructionIds'

export type ConstructionBlueprintTier = 0 | 1 | 2 | 3 | 4

export interface ConstructionFidelitySnapshot {
  parentId: ConstructionId | null
  blueprintTier: ConstructionBlueprintTier
  defense: number
  temporary: boolean
  playable: boolean
  completionWater?: number
  category?: 'wall' | 'pump' | 'workshop' | 'watchtower' | 'foundations' | 'portal' | 'sanctuary'
}

/**
 * Source-backed construction metadata expressed only in Live2Nite IDs.
 *
 * MyHordes is used to verify behavior and numeric data, but upstream prototype
 * identifiers and implementation code are deliberately not retained here.
 * Tier 0 means a common plan: roots are known at town creation, while a common
 * child becomes known after its parent is completed. Higher tiers remain hidden
 * until Live2Nite's blueprint-discovery pass is implemented.
 */
export const CURRENT_CONSTRUCTION_FIDELITY: Partial<Record<ConstructionId, ConstructionFidelitySnapshot>> = {
  wall_upgrade:{parentId:null,blueprintTier:0,defense:30,temporary:false,playable:true},
  great_pit:{parentId:'wall_upgrade',blueprintTier:0,defense:10,temporary:false,playable:true},
  moat:{parentId:'great_pit',blueprintTier:0,defense:60,temporary:false,playable:true},
  spiked_pit:{parentId:'great_pit',blueprintTier:0,defense:45,temporary:false,playable:true},
  barbed_wire:{parentId:'wall_upgrade',blueprintTier:0,defense:20,temporary:false,playable:true},
  bait:{parentId:'barbed_wire',blueprintTier:0,defense:30,temporary:true,playable:true},
  advanced_ramparts:{parentId:'wall_upgrade',blueprintTier:0,defense:20,temporary:false,playable:true},
  oubliettes:{parentId:'great_pit',blueprintTier:0,defense:35,temporary:false,playable:true},
  barriers:{parentId:'wall_upgrade',blueprintTier:0,defense:40,temporary:false,playable:true},
  plywood:{parentId:'wall_upgrade',blueprintTier:0,defense:15,temporary:false,playable:true},
  timber_armour:{parentId:'wall_upgrade',blueprintTier:0,defense:30,temporary:false,playable:true},
  metal_armour:{parentId:'wall_upgrade',blueprintTier:0,defense:30,temporary:false,playable:true},
  heavy_armour:{parentId:'wall_upgrade',blueprintTier:0,defense:45,temporary:false,playable:true},
  slick_wall:{parentId:'wall_upgrade',blueprintTier:0,defense:60,temporary:false,playable:true},
  emergency_devices:{parentId:'wall_upgrade',blueprintTier:0,defense:0,temporary:false,playable:true,category:'wall'},
  emergency_reinforcements:{parentId:'emergency_devices',blueprintTier:0,defense:40,temporary:true,playable:true,category:'wall'},
  guerrilla:{parentId:'emergency_devices',blueprintTier:0,defense:60,temporary:true,playable:true,category:'wall'},
  rubbish_heap:{parentId:'emergency_devices',blueprintTier:0,defense:5,temporary:true,playable:true,category:'wall'},
  trapped_fields:{parentId:'rubbish_heap',blueprintTier:0,defense:30,temporary:true,playable:true,category:'wall'},
  wolf_trap:{parentId:'rubbish_heap',blueprintTier:0,defense:30,temporary:true,playable:true,category:'wall'},

  pump:{parentId:null,blueprintTier:0,defense:0,temporary:false,playable:true,completionWater:15},
  drilling_rig:{parentId:'pump',blueprintTier:0,defense:0,temporary:false,playable:true,completionWater:50},
  hydraulic_network:{parentId:'pump',blueprintTier:0,defense:0,temporary:false,playable:true,completionWater:5},
  sprayer:{parentId:'pump',blueprintTier:0,defense:0,temporary:false,playable:true,category:'pump'},

  workshop:{parentId:null,blueprintTier:0,defense:0,temporary:false,playable:true},
  factory:{parentId:'workshop',blueprintTier:0,defense:0,temporary:false,playable:true},

  watchtower:{parentId:null,blueprintTier:0,defense:10,temporary:false,playable:true},
  search_tower:{parentId:'watchtower',blueprintTier:0,defense:0,temporary:false,playable:true},
  cannon_mounds:{parentId:'watchtower',blueprintTier:0,defense:30,temporary:false,playable:true,category:'watchtower'},

  foundations:{parentId:null,blueprintTier:0,defense:0,temporary:false,playable:true},
  portal_lock:{parentId:null,blueprintTier:0,defense:5,temporary:false,playable:true},
  reinforced_gates:{parentId:'portal_lock',blueprintTier:0,defense:25,temporary:false,playable:true},
  soul_purifying_source:{parentId:null,blueprintTier:0,defense:20,temporary:false,playable:true},
  sanctuary:{parentId:'soul_purifying_source',blueprintTier:0,defense:0,temporary:false,playable:false},

  reinforcing_beams:{parentId:'advanced_ramparts',blueprintTier:1,defense:35,temporary:false,playable:true},
  spiked_wall:{parentId:'advanced_ramparts',blueprintTier:1,defense:45,temporary:false,playable:true},
  uberwall:{parentId:'advanced_ramparts',blueprintTier:1,defense:80,temporary:false,playable:true},
  second_layer:{parentId:'advanced_ramparts',blueprintTier:2,defense:70,temporary:false,playable:true},
  third_layer:{parentId:'second_layer',blueprintTier:3,defense:100,temporary:false,playable:true},
  upgradeable_wall:{parentId:'advanced_ramparts',blueprintTier:3,defense:55,temporary:false,playable:true},
  concrete_wall:{parentId:'plywood',blueprintTier:2,defense:80,temporary:false,playable:true},
  bastion:{parentId:'wall_upgrade',blueprintTier:1,defense:50,temporary:false,playable:true},
  palisade:{parentId:'barriers',blueprintTier:1,defense:60,temporary:false,playable:true},
  acid_projection:{parentId:'sprayer',blueprintTier:1,defense:40,temporary:true,playable:true},
  neurotoxin:{parentId:'sprayer',blueprintTier:1,defense:140,temporary:false,playable:true},
  eden_project:{parentId:'pump',blueprintTier:2,defense:0,temporary:false,playable:true,completionWater:50},
  water_turrets:{parentId:'pump',blueprintTier:3,defense:70,temporary:false,playable:true},
  outer_world_apple_tree:{parentId:'vegetable_plot',blueprintTier:3,defense:0,temporary:false,playable:false},
  water_detector:{parentId:'pump',blueprintTier:4,defense:0,temporary:false,playable:true,completionWater:100},
  brick_cannon:{parentId:'cannon_mounds',blueprintTier:1,defense:50,temporary:false,playable:true,category:'watchtower'},
  perforator:{parentId:'cannon_mounds',blueprintTier:2,defense:50,temporary:false,playable:true,category:'watchtower'},
  shrapnel_launcher:{parentId:'cannon_mounds',blueprintTier:1,defense:60,temporary:false,playable:true,category:'watchtower'},
  brutal_cannon:{parentId:'cannon_mounds',blueprintTier:1,defense:50,temporary:true,playable:true,category:'watchtower'},
  planner:{parentId:'watchtower',blueprintTier:1,defense:0,temporary:false,playable:true},
  henhouse:{parentId:'workshop',blueprintTier:2,defense:0,temporary:false,playable:false},
  derrick:{parentId:'eden_project',blueprintTier:3,defense:0,temporary:false,playable:true,completionWater:75},
  grand_relocation:{parentId:'foundations',blueprintTier:3,defense:300,temporary:false,playable:true},
  fortified_homes:{parentId:'foundations',blueprintTier:2,defense:0,temporary:false,playable:true},
  false_town:{parentId:'foundations',blueprintTier:3,defense:400,temporary:false,playable:true},
  hammam:{parentId:'sanctuary',blueprintTier:2,defense:20,temporary:false,playable:false},
}
