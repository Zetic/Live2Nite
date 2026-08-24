import type { ConstructionId } from './constructionIds'

export type ConstructionBlueprintTier = 0 | 1 | 2 | 3 | 4

export interface ConstructionFidelitySnapshot {
  parentId: ConstructionId | null
  blueprintTier: ConstructionBlueprintTier
  defense: number
  maxHp: number
  breakable: boolean
  temporary: boolean
  playable: boolean
  completionWater?: number
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
  wall_upgrade:{parentId:null,blueprintTier:0,defense:30,maxHp:25,breakable:true,temporary:false,playable:true},
  great_pit:{parentId:'wall_upgrade',blueprintTier:0,defense:10,maxHp:70,breakable:true,temporary:false,playable:true},
  moat:{parentId:'great_pit',blueprintTier:0,defense:60,maxHp:60,breakable:true,temporary:false,playable:true},
  spiked_pit:{parentId:'great_pit',blueprintTier:0,defense:45,maxHp:35,breakable:true,temporary:false,playable:true},
  barbed_wire:{parentId:'wall_upgrade',blueprintTier:0,defense:20,maxHp:10,breakable:true,temporary:false,playable:true},
  bait:{parentId:'barbed_wire',blueprintTier:0,defense:30,maxHp:10,breakable:true,temporary:true,playable:true},
  advanced_ramparts:{parentId:'wall_upgrade',blueprintTier:0,defense:20,maxHp:40,breakable:true,temporary:false,playable:true},
  oubliettes:{parentId:'great_pit',blueprintTier:0,defense:35,maxHp:25,breakable:true,temporary:false,playable:true},
  barriers:{parentId:'wall_upgrade',blueprintTier:0,defense:40,maxHp:60,breakable:true,temporary:false,playable:true},
  plywood:{parentId:'wall_upgrade',blueprintTier:0,defense:15,maxHp:30,breakable:true,temporary:false,playable:true},
  timber_armour:{parentId:'wall_upgrade',blueprintTier:0,defense:30,maxHp:30,breakable:true,temporary:false,playable:true},
  metal_armour:{parentId:'wall_upgrade',blueprintTier:0,defense:30,maxHp:30,breakable:true,temporary:false,playable:true},
  heavy_armour:{parentId:'wall_upgrade',blueprintTier:0,defense:45,maxHp:30,breakable:true,temporary:false,playable:true},
  slick_wall:{parentId:'wall_upgrade',blueprintTier:0,defense:60,maxHp:35,breakable:true,temporary:false,playable:true},
  emergency_devices:{parentId:'wall_upgrade',blueprintTier:0,defense:0,maxHp:40,breakable:true,temporary:false,playable:true},
  emergency_reinforcements:{parentId:'emergency_devices',blueprintTier:0,defense:40,maxHp:20,breakable:true,temporary:true,playable:true},
  guerrilla:{parentId:'emergency_devices',blueprintTier:0,defense:60,maxHp:30,breakable:true,temporary:true,playable:true},
  rubbish_heap:{parentId:'emergency_devices',blueprintTier:0,defense:5,maxHp:10,breakable:true,temporary:true,playable:true},
  trapped_fields:{parentId:'rubbish_heap',blueprintTier:0,defense:30,maxHp:15,breakable:true,temporary:true,playable:true},
  wolf_trap:{parentId:'rubbish_heap',blueprintTier:0,defense:30,maxHp:15,breakable:true,temporary:true,playable:true},

  pump:{parentId:null,blueprintTier:0,defense:0,maxHp:25,breakable:false,temporary:false,playable:true,completionWater:15},
  drilling_rig:{parentId:'pump',blueprintTier:0,defense:0,maxHp:55,breakable:false,temporary:false,playable:true,completionWater:50},
  hydraulic_network:{parentId:'pump',blueprintTier:0,defense:0,maxHp:40,breakable:false,temporary:false,playable:true,completionWater:5},
  sprayer:{parentId:'pump',blueprintTier:0,defense:0,maxHp:50,breakable:true,temporary:false,playable:true},

  workshop:{parentId:null,blueprintTier:0,defense:0,maxHp:25,breakable:true,temporary:false,playable:true},
  factory:{parentId:'workshop',blueprintTier:0,defense:0,maxHp:40,breakable:true,temporary:false,playable:true},

  watchtower:{parentId:null,blueprintTier:0,defense:10,maxHp:15,breakable:true,temporary:false,playable:true},
  search_tower:{parentId:'watchtower',blueprintTier:0,defense:0,maxHp:30,breakable:true,temporary:false,playable:true},
  cannon_mounds:{parentId:'watchtower',blueprintTier:0,defense:30,maxHp:60,breakable:true,temporary:false,playable:true},

  foundations:{parentId:null,blueprintTier:0,defense:0,maxHp:30,breakable:true,temporary:false,playable:true},
  portal_lock:{parentId:null,blueprintTier:0,defense:5,maxHp:15,breakable:true,temporary:false,playable:true},
  reinforced_gates:{parentId:'portal_lock',blueprintTier:0,defense:25,maxHp:35,breakable:true,temporary:false,playable:true},
  soul_purifying_source:{parentId:null,blueprintTier:0,defense:20,maxHp:30,breakable:true,temporary:false,playable:true},
  sanctuary:{parentId:'soul_purifying_source',blueprintTier:0,defense:0,maxHp:20,breakable:true,temporary:false,playable:false},

  reinforcing_beams:{parentId:'advanced_ramparts',blueprintTier:1,defense:35,maxHp:15,breakable:true,temporary:false,playable:true},
  spiked_wall:{parentId:'advanced_ramparts',blueprintTier:1,defense:45,maxHp:35,breakable:true,temporary:false,playable:true},
  uberwall:{parentId:'advanced_ramparts',blueprintTier:1,defense:80,maxHp:50,breakable:true,temporary:false,playable:true},
  second_layer:{parentId:'advanced_ramparts',blueprintTier:2,defense:70,maxHp:60,breakable:true,temporary:false,playable:true},
  third_layer:{parentId:'second_layer',blueprintTier:3,defense:100,maxHp:60,breakable:true,temporary:false,playable:true},
  upgradeable_wall:{parentId:'advanced_ramparts',blueprintTier:3,defense:55,maxHp:65,breakable:true,temporary:false,playable:true},
  concrete_wall:{parentId:'plywood',blueprintTier:2,defense:80,maxHp:40,breakable:true,temporary:false,playable:true},
  bastion:{parentId:'wall_upgrade',blueprintTier:1,defense:50,maxHp:25,breakable:true,temporary:false,playable:true},
  palisade:{parentId:'barriers',blueprintTier:1,defense:60,maxHp:50,breakable:true,temporary:false,playable:true},
  acid_projection:{parentId:'sprayer',blueprintTier:1,defense:40,maxHp:25,breakable:true,temporary:true,playable:true},
  neurotoxin:{parentId:'sprayer',blueprintTier:1,defense:140,maxHp:60,breakable:true,temporary:false,playable:true},
  eden_project:{parentId:'pump',blueprintTier:2,defense:0,maxHp:50,breakable:false,temporary:false,playable:true,completionWater:50},
  water_turrets:{parentId:'pump',blueprintTier:3,defense:70,maxHp:50,breakable:true,temporary:false,playable:true},
  outer_world_apple_tree:{parentId:'vegetable_plot',blueprintTier:3,defense:0,maxHp:30,breakable:true,temporary:false,playable:false},
  water_detector:{parentId:'pump',blueprintTier:4,defense:0,maxHp:130,breakable:false,temporary:false,playable:true,completionWater:100},
  brick_cannon:{parentId:'cannon_mounds',blueprintTier:1,defense:50,maxHp:40,breakable:true,temporary:false,playable:true},
  perforator:{parentId:'cannon_mounds',blueprintTier:2,defense:50,maxHp:35,breakable:true,temporary:false,playable:true},
  shrapnel_launcher:{parentId:'cannon_mounds',blueprintTier:1,defense:60,maxHp:50,breakable:true,temporary:false,playable:true},
  brutal_cannon:{parentId:'cannon_mounds',blueprintTier:1,defense:50,maxHp:25,breakable:true,temporary:true,playable:true},
  planner:{parentId:'watchtower',blueprintTier:1,defense:0,maxHp:20,breakable:true,temporary:false,playable:true},
  henhouse:{parentId:'workshop',blueprintTier:2,defense:0,maxHp:25,breakable:true,temporary:false,playable:false},
  derrick:{parentId:'eden_project',blueprintTier:3,defense:0,maxHp:86,breakable:false,temporary:false,playable:true,completionWater:75},
  grand_relocation:{parentId:'foundations',blueprintTier:3,defense:300,maxHp:300,breakable:true,temporary:false,playable:true},
  fortified_homes:{parentId:'foundations',blueprintTier:2,defense:0,maxHp:50,breakable:true,temporary:false,playable:true},
  false_town:{parentId:'foundations',blueprintTier:3,defense:400,maxHp:400,breakable:true,temporary:false,playable:true},
  hammam:{parentId:'sanctuary',blueprintTier:2,defense:20,maxHp:20,breakable:true,temporary:false,playable:false},
}
