export const ITEM_TYPE_IDS = [
  'rotten_log','scrap_metal','water_ration','food','old_door','twisted_plank','wrought_iron','unshaped_concrete_block','construction_kit','water_bomb','human_bone','broken_human_bone','pathetic_penknife','broken_pathetic_penknife','staff','broken_staff','serrated_knife','broken_serrated_knife','machete','broken_machete','doggy_bag','citizen_welcome_pack','battery','box_of_matches','pharmaceutical_products',
  // Construction economy: advanced materials, supplies, and unprocessed salvage.
  'metal_support','patchwork_beam','sheet_metal','bag_of_damp_grass','belt','compact_detonator','convex_lens','copper_pipe','duct_tape','earplugs','electronic_component','empty_oil_can','nuts_and_bolts','laser_diode','semtex','telescope','wire_reel','broken_electronic_device','mechanism',
  // Additional current-MyHordes construction inputs used by direct equivalents in the town tree.
  'meaty_bone','human_flesh','poison_gland','working_radio','guitar','table','chicken','wire_mesh','grain_sack',
  // Stateful foundation representatives retained from v16.
  'water_pistol','water_cooler_bottle','repair_kit',
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
  | 'repairable'
  | 'medical'

export interface ItemStateSchema {
  charges?: { min: number; max: number; initial: number }
  condition?: { initial: ItemCondition }
  contamination?: { initial: ItemContamination }
  powered?: { initial: boolean }
  assembly?: { initial: ItemAssemblyState }
}
