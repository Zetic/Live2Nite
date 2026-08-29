import type { ItemState, ItemType } from './types'
import { ordinaryNormalSourceLoot, type MyHordesSourceLootEntry } from './myhordesLootManifest'

export interface MyHordesLootMapping {
  type:ItemType
  state?:ItemState
}

const mapped=(type:ItemType,state?:ItemState):MyHordesLootMapping=>({type,...(state?{state}:{})})

/**
 * High-confidence source-id -> Live2Nite identity mappings. This is intentionally distinct from
 * "mechanics ready": some mapped containers/items still have downstream dependencies to close
 * before the full normal-zone table can be activated.
 */
export const MYHORDES_NORMAL_LOOT_MAPPING:Readonly<Partial<Record<string,MyHordesLootMapping>>>={
  'wood2_#00':mapped('twisted_plank'),
  'metal_#00':mapped('wrought_iron'),
  'wood_beam_#00':mapped('patchwork_beam'),
  'metal_beam_#00':mapped('metal_support'),
  'wood_log_#00':mapped('quality_log'),
  'plate_raw_#00':mapped('sheet_metal_bits'),
  'pile_#00':mapped('battery'),
  'pharma_#00':mapped('pharmaceutical_products'),
  'meca_parts_#00':mapped('nuts_and_bolts'),
  'rustine_#00':mapped('duct_tape'),
  'jerrycan_#00':mapped('full_jerrycan'),
  'explo_#00':mapped('semtex'),
  'tube_#00':mapped('copper_pipe'),
  'electro_#00':mapped('electronic_component'),
  'engine_part_#00':mapped('engine_incomplete'),
  'engine_#00':mapped('engine'),
  'courroie_#00':mapped('belt'),
  'deto_#00':mapped('compact_detonator'),
  'fence_#00':mapped('wire_mesh'),
  'rsc_pack_2_#00':mapped('resource_pack',{contents:2}),
  'rsc_pack_3_#00':mapped('resource_pack',{contents:3}),
  'staff_#00':mapped('staff'),
  'watergun_empty_#00':mapped('water_pistol',{charges:0}),
  'watergun_1_#00':mapped('water_pistol',{charges:1}),
  'watergun_2_#00':mapped('water_pistol',{charges:2}),
  'cutter_#00':mapped('box_cutter'),
  'can_opener_#00':mapped('can_opener'),
  'pilegun_empty_#00':mapped('battery_launcher',{charges:0}),
  'knife_#00':mapped('serrated_knife'),
  'screw_#00':mapped('screwdriver'),
  'small_knife_#00':mapped('pathetic_penknife'),
  'chain_#00':mapped('chain'),
  'food_bag_#00':mapped('doggy_bag'),
  'food_noodles_#00':mapped('chinese_noodles'),
  'spices_#00':mapped('strong_spices'),
  'can_#00':mapped('can'),
  'meat_#00':mapped('tasty_looking_steak'),
  'hmeat_#00':mapped('human_flesh'),
  'pet_chick_#00':mapped('chicken'),
  'pet_pig_#00':mapped('stinking_pig'),
  'pet_rat_#00':mapped('giant_rat'),
  'pet_cat_#00':mapped('fat_cat'),
  'pet_snake_#00':mapped('huge_snake'),
  'poison_part_#00':mapped('poison_gland'),
  'water_can_empty_#00':mapped('water_cooler_bottle',{charges:0}),
  'water_can_1_#00':mapped('water_cooler_bottle',{charges:1}),
  'water_can_2_#00':mapped('water_cooler_bottle',{charges:2}),
  'water_can_3_#00':mapped('water_cooler_bottle',{charges:3}),
  'chest_#00':mapped('metal_chest'),
  'chest_tools_#00':mapped('toolbox'),
  'chest_citizen_#00':mapped('citizen_welcome_pack'),
  'chest_xl_#00':mapped('xl_chest'),
  'chest_food_#00':mapped('food_box'),
  'electro_box_#00':mapped('broken_electronic_device'),
  'deco_box_#00':mapped('decoration_box'),
  'mecanism_#00':mapped('mechanism'),
  'safe_#00':mapped('safe'),
  'bplan_drop_#00':mapped('worn_leather_bag'),
  'plate_#00':mapped('sheet_metal'),
  'door_#00':mapped('old_door'),
  'concrete_#00':mapped('bag_of_cement'),
  'trestle_#00':mapped('trestle'),
  'sheet_#00':mapped('groundsheet'),
  'smelly_meat_#00':mapped('smelly_meat'),
  // Source grenade_empty_#00 is the fillable Plastic Bag. bag_#00 is a distinct Manbag
  // and remains unmapped until its carry-slot mechanic is represented.
  'grenade_empty_#00':mapped('plastic_bag'),
  'repair_kit_part_raw_#00':mapped('tool_bag'),
  'repair_kit_#00':mapped('repair_kit'),
  'repair_one_#00':mapped('kwik_fix'),
  'saw_tool_part_#00':mapped('saw_tool_part'),
  'sport_elec_empty_#00':mapped('ems_system_empty'),
  'chair_basic_#00':mapped('ektorp_gluten_chair'),
  'pc_#00':mapped('pc_base_unit'),
  'lights_#00':mapped('box_of_matches'),
  'wire_#00':mapped('wire_reel'),
  'oilcan_#00':mapped('empty_oil_can'),
  'lens_#00':mapped('convex_lens'),
  'diode_#00':mapped('laser_diode'),
  'ryebag_#00':mapped('bag_of_damp_grass'),
  'bquies_#00':mapped('earplugs'),
}

export function mappedOrdinaryNormalSourceLoot():Array<{source:MyHordesSourceLootEntry;mapping:MyHordesLootMapping}>{
  const result:Array<{source:MyHordesSourceLootEntry;mapping:MyHordesLootMapping}>=[]
  for(const source of ordinaryNormalSourceLoot()){
    const mapping=MYHORDES_NORMAL_LOOT_MAPPING[source.sourceId]
    if(mapping)result.push({source,mapping})
  }
  return result
}

export function unmappedOrdinarySourceLootIds():string[]{
  return ordinaryNormalSourceLoot().filter((source)=>!MYHORDES_NORMAL_LOOT_MAPPING[source.sourceId]).map((source)=>source.sourceId)
}
