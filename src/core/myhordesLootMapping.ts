import type { ItemState, ItemType } from './types'
import { ordinaryNormalSourceLoot, type MyHordesSourceLootEntry } from './myhordesLootManifest'

export interface MyHordesLootMapping {
  type:ItemType
  state?:ItemState
}

const mapped=(type:ItemType,state?:ItemState):MyHordesLootMapping=>({type,...(state?{state}:{})})

/**
 * High-confidence source-id mappings whose Live2Nite item already has a meaningful gameplay
 * path. Missing ids are deliberately left missing: they are the Part 2 dependency backlog, not
 * candidates to silently prune from the final normal-zone table.
 */
export const MYHORDES_NORMAL_LOOT_MAPPING:Readonly<Partial<Record<string,MyHordesLootMapping>>>={
  'wood2_#00':mapped('twisted_plank'),
  'metal_#00':mapped('wrought_iron'),
  'wood_beam_#00':mapped('patchwork_beam'),
  'metal_beam_#00':mapped('metal_support'),
  'pile_#00':mapped('battery'),
  'pharma_#00':mapped('pharmaceutical_products'),
  'meca_parts_#00':mapped('nuts_and_bolts'),
  'rustine_#00':mapped('kwik_fix'),
  'explo_#00':mapped('semtex'),
  'tube_#00':mapped('copper_pipe'),
  'electro_#00':mapped('electronic_component'),
  'engine_part_#00':mapped('engine_incomplete'),
  'courroie_#00':mapped('belt'),
  'deto_#00':mapped('compact_detonator'),
  'rsc_pack_2_#00':mapped('resource_pack',{contents:2}),
  'rsc_pack_3_#00':mapped('resource_pack',{contents:3}),
  'staff_#00':mapped('staff'),
  'watergun_empty_#00':mapped('water_pistol',{charges:0}),
  'cutter_#00':mapped('box_cutter'),
  'can_opener_#00':mapped('can_opener'),
  'pilegun_empty_#00':mapped('battery_launcher',{charges:0}),
  'knife_#00':mapped('serrated_knife'),
  'screw_#00':mapped('screwdriver'),
  'small_knife_#00':mapped('pathetic_penknife'),
  'chain_#00':mapped('chain'),
  'food_bag_#00':mapped('doggy_bag'),
  'can_#00':mapped('can'),
  'meat_#00':mapped('tasty_looking_steak'),
  'hmeat_#00':mapped('human_flesh'),
  'poison_part_#00':mapped('poison_gland'),
  'water_can_empty_#00':mapped('water_cooler_bottle',{charges:0}),
  'chest_#00':mapped('metal_chest'),
  'chest_tools_#00':mapped('toolbox'),
  'chest_citizen_#00':mapped('citizen_welcome_pack'),
  'chest_xl_#00':mapped('xl_chest'),
  'chest_food_#00':mapped('food_box'),
  'electro_box_#00':mapped('broken_electronic_device'),
  'deco_box_#00':mapped('decoration_box'),
  'mecanism_#00':mapped('mechanism'),
  'safe_#00':mapped('safe'),
  'plate_#00':mapped('sheet_metal'),
  'door_#00':mapped('old_door'),
  'concrete_#00':mapped('bag_of_cement'),
  'bag_#00':mapped('plastic_bag'),
  'repair_kit_part_raw_#00':mapped('tool_bag'),
  'repair_one_#00':mapped('kwik_fix'),
  'lights_#00':mapped('box_of_matches'),
  'wire_#00':mapped('wire_reel'),
  'oilcan_#00':mapped('empty_oil_can'),
  'lens_#00':mapped('convex_lens'),
  'diode_#00':mapped('laser_diode'),
  'ryebag_#00':mapped('grain_sack'),
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

export function pendingOrdinarySourceLootIds():string[]{
  return ordinaryNormalSourceLoot().filter((source)=>!MYHORDES_NORMAL_LOOT_MAPPING[source.sourceId]).map((source)=>source.sourceId)
}
