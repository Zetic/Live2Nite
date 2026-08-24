export const ITEM_TYPE_IDS = [
  'rotten_log','scrap_metal','quality_log','sheet_metal_bits','water_ration','food','old_door','twisted_plank','wrought_iron','unshaped_concrete_block','water_bomb','human_bone','broken_human_bone','pathetic_penknife','broken_pathetic_penknife','staff','broken_staff','serrated_knife','broken_serrated_knife','machete','broken_machete',
  // Ordinary MyHordes Armoury tools used as weapons and container openers.
  'adjustable_spanner','broken_adjustable_spanner','screwdriver','broken_screwdriver','swiss_army_knife','broken_swiss_army_knife','box_cutter','broken_box_cutter','chain','broken_chain','can_opener','broken_can_opener','ektorp_gluten_chair','broken_ektorp_gluten_chair','pc_base_unit','broken_pc_base_unit',
  // Source utility opener/tool family. Hacksaw is assembled from the damaged source item.
  'saw_tool_part','saw_tool',
  // Ordinary source food outcomes. food itself maps to food_sandw_#00 (Mouldy Ham Sandwich).
  'mouldy_twinkies','half_eaten_chicken_wings','rancid_shortbread_pack','out_of_date_jaffa_cakes','dried_chewing_gum','stale_tart','soft_crisps','can','open_can','vegetable','tasty_looking_steak','chinese_noodles','spicy_chinese_noodles',
  'doggy_bag','citizen_welcome_pack','battery','box_of_matches','pharmaceutical_products','strong_spices','radio_cassette_player_off',
  // Citizen-condition proof items. Their actions are defined by the shared item-effect engine.
  'bandage','paracetoid','anabolic_steroids','valium_shot','vodka_marinostov','wake_the_dead','ems_system_empty','ems_system_charged',
  // Construction economy: advanced materials, supplies, and unprocessed salvage.
  'metal_support','patchwork_beam','sheet_metal','bag_of_damp_grass','bag_of_cement','belt','compact_detonator','convex_lens','copper_pipe','duct_tape','earplugs','electronic_component','empty_oil_can','nuts_and_bolts','laser_diode','semtex','telescope','wire_reel','broken_electronic_device','mechanism',
  // Additional current-MyHordes construction inputs used by direct equivalents in the town tree.
  'meaty_bone','human_flesh','poison_gland','working_radio','guitar','table','chicken','wire_mesh','grain_sack',
  // Portable-combination inputs and useful outputs implemented in the combination pass.
  'tool_bag','kwik_fix','plastic_bag','engine_incomplete','engine','claymore','torch','battery_launcher',
  // Stateful foundation representatives retained from v16.
  'water_pistol','water_cooler_bottle','repair_kit',
  // Part 2 openables. Source variants such as 2- and 3-use resource packs are represented by state, not duplicate item types.
  'resource_pack','toolbox','metal_chest','xl_chest','food_box','decoration_box','safe',
  // Construction plans use Live2Nite-owned IDs while following current MyHordes read behavior.
  'common_blueprint','uncommon_blueprint','rare_blueprint','very_rare_blueprint',
] as const

export type ItemType = typeof ITEM_TYPE_IDS[number]

export type ItemDisplayCategory =
  | 'resources'
  | 'furniture'
  | 'armoury'
  | 'containers'
  | 'defences'
  | 'pharmacy'
  | 'food'
  | 'miscellaneous'

export type ItemCondition = 'intact' | 'damaged' | 'broken'
export type ItemContamination = 'clean' | 'poisoned' | 'infected'
export type ItemAssemblyState = 'complete' | 'incomplete'

export interface ItemState {
  /** Remaining uses/shots/rations for charge-bearing items. */
  charges?: number
  /** Remaining discrete contents for stateful openables such as Resource Packs. */
  contents?: number
  condition?: ItemCondition
  contamination?: ItemContamination
  powered?: boolean
  assembly?: ItemAssemblyState
}

export type ItemCapability =
  | 'construction_material'
  | 'raw_material'
  | 'component'
  | 'consumable'
  | 'container'
  | 'weapon'
  | 'defense'
  | 'decoration'
  | 'charge_bearing'
  | 'stateful_container'
  | 'repairable'
  | 'medical'
  | 'blueprint'

export interface ItemStateSchema {
  charges?: { min: number; max: number; initial: number }
  contents?: { min: number; max: number; initial: number }
  condition?: { initial: ItemCondition }
  contamination?: { initial: ItemContamination }
  powered?: { initial: boolean }
  assembly?: { initial: ItemAssemblyState }
}
