export interface MyHordesRuinDrop {
  sourceItemId:string
  weight:number
}

export interface MyHordesRuinDefinition {
  sourceId:string
  name:string
  icon:string
  camping:{baseValue:number;spots:number}
  spawnChance:number
  emptyChance:number
  km:{min:number;max:number}
  explorable:boolean
  drops:readonly MyHordesRuinDrop[]
}

const drop=(sourceItemId:string,weight:number):MyHordesRuinDrop=>({sourceItemId,weight})
const ruin=(definition:MyHordesRuinDefinition):MyHordesRuinDefinition=>definition

/**
 * Exact MyHordes 5.1.1 generated definitions replacing the six adapted Live2Nite site roles.
 * Drops intentionally remain raw source ids until their item dependency is mechanically closed.
 */
export const MYHORDES_511_INITIAL_RUINS={
  construction_site_shelter:ruin({
    sourceId:'CONSTRUCTION_SITE_SHELTER',name:'Construction Site Shelter',icon:'container',
    camping:{baseValue:10,spots:1},spawnChance:475,emptyChance:0.05,km:{min:6,max:9},explorable:false,
    drops:[
      drop('concrete_#00',7),drop('metal_beam_#00',10),drop('repair_kit_part_raw_#00',4),drop('jerrycan_#00',8),
      drop('chain_#00',10),drop('home_box_#00',8),drop('rsc_pack_2_#00',8),drop('rsc_pack_3_#00',2),
      drop('home_def_#00',7),drop('trestle_#00',10),drop('saw_tool_part_#00',2),drop('meca_parts_#00',8),
      drop('door_#00',5),drop('screw_#00',8),drop('wrench_#00',8),drop('mecanism_#00',8),drop('oilcan_#00',2),drop('lens_#00',5),
    ],
  }),
  wrecked_cars:ruin({
    sourceId:'WRECKED_CARS',name:'Wrecked Cars',icon:'cars',
    camping:{baseValue:10,spots:2},spawnChance:304,emptyChance:0.1,km:{min:3,max:6},explorable:false,
    drops:[
      drop('metal_#00',31),drop('meca_parts_#00',5),drop('repair_one_#00',5),drop('vodka_#00',2),drop('rhum_#00',2),
      drop('jerrycan_#00',2),drop('plate_raw_#00',10),drop('courroie_#00',3),drop('tube_#00',8),drop('chest_#00',9),
      drop('engine_part_#00',1),drop('oilcan_#00',6),drop('chest_citizen_#00',19),
    ],
  }),
  old_field_hospital:ruin({
    sourceId:'OLD_FIELD_HOSPITAL',name:'Old Field Hospital',icon:'hospital',
    camping:{baseValue:10,spots:4},spawnChance:205,emptyChance:0.1,km:{min:16,max:19},explorable:false,
    drops:[
      drop('pharma_#00',20),drop('drug_random_#00',30),drop('vodka_#00',10),drop('drug_water_#00',10),
      drop('beta_drug_bad_#00',15),drop('xanax_#00',5),drop('drug_#00',10),drop('drug_hero_#00',5),
      drop('disinfect_#00',10),drop('cyanure_#00',10),drop('fungus_#00',5),drop('quantum_#00',3),
    ],
  }),
  scottish_smiths_superstore:ruin({
    sourceId:'SCOTTISH_SMITH_S_SUPERSTORE',name:"Scottish Smith's Superstore",icon:'albi',
    camping:{baseValue:10,spots:3},spawnChance:686,emptyChance:0.05,km:{min:6,max:9},explorable:false,
    drops:[
      drop('drug_hero_#00',16),drop('meat_#00',16),drop('food_noodles_hot_#00',16),drop('vegetable_tasty_#00',16),
      drop('electro_box_#00',4),drop('powder_#00',3),drop('food_bag_#00',3),drop('door_carpet_#00',3),
      drop('lights_#00',3),drop('chest_citizen_#00',25),
    ],
  }),
  dark_woods:ruin({
    sourceId:'DARK_WOODS',name:'Dark Woods',icon:'woods',
    camping:{baseValue:10,spots:2},spawnChance:70,emptyChance:0,km:{min:2,max:5},explorable:false,
    drops:[
      drop('wood_bad_#00',62),drop('hmeat_#00',10),drop('vegetable_#00',10),drop('pet_rat_#00',5),
      drop('saw_tool_part_#00',1),drop('pet_chick_#00',5),drop('grenade_empty_#00',5),drop('plate_raw_#00',5),
      drop('ryebag_#00',6),drop('pet_snake2_#00',4),drop('chest_citizen_#00',38),
    ],
  }),
  old_police_station:ruin({
    sourceId:'OLD_POLICE_STATION',name:'Old Police Station',icon:'police',
    camping:{baseValue:30,spots:4},spawnChance:640,emptyChance:0.1,km:{min:6,max:9},explorable:false,
    drops:[
      drop('gun_#00',5),drop('machine_gun_#00',2),drop('taser_empty_#00',7),drop('pilegun_empty_#00',5),
      drop('drug_hero_#00',10),drop('big_pgun_part_#00',7),drop('watergun_empty_#00',7),drop('knife_#00',5),
      drop('bandage_#00',4),drop('bag_#00',5),drop('bagxl_#00',1),drop('cutcut_#00',5),drop('chest_xl_#00',2),
      drop('repair_kit_#00',7),drop('bed_#00',4),drop('tagger_#00',5),drop('watergun_opt_part_#00',5),
      drop('chair_basic_#00',4),drop('deto_#00',5),drop('wire_#00',3),
    ],
  }),
} as const

export type InitialMyHordesRuinKey=keyof typeof MYHORDES_511_INITIAL_RUINS
export const INITIAL_MYHORDES_RUIN_KEYS=Object.keys(MYHORDES_511_INITIAL_RUINS) as InitialMyHordesRuinKey[]
