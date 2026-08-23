import type { ItemType, SpecialSiteType } from './types'
export interface SpecialSiteDefinition { type:SpecialSiteType; name:string; code:string; purpose:string; lootPool:ItemType[] }
export const SPECIAL_SITE_ORDER:SpecialSiteType[]=['construction_site','wrecked_cars','pharmacy','supermarket','dark_woods','police_station']
export const SPECIAL_SITES:Record<SpecialSiteType,SpecialSiteDefinition>={
  construction_site:{type:'construction_site',name:'Abandoned Construction Site',code:'C',purpose:'A concentrated source of construction-ready material and structural supplies.',lootPool:['twisted_plank','twisted_plank','wrought_iron','patchwork_beam','metal_support','sheet_metal','nuts_and_bolts','wire_reel','duct_tape','construction_kit','unshaped_concrete_block','old_door']},
  wrecked_cars:{type:'wrecked_cars',name:'Wrecked Cars',code:'W',purpose:'Vehicle wreckage with metal, hydraulic, mechanical and electrical components.',lootPool:['scrap_metal','scrap_metal','wrought_iron','sheet_metal','battery','belt','copper_pipe','empty_oil_can','electronic_component','broken_electronic_device','mechanism','nuts_and_bolts','pathetic_penknife','old_door']},
  pharmacy:{type:'pharmacy',name:'Destroyed Pharmacy',code:'Rx',purpose:'Medical, chemical and improvised repair supplies.',lootPool:['pharmaceutical_products','pharmaceutical_products','poison_gland','duct_tape','water_ration','box_of_matches']},
  supermarket:{type:'supermarket',name:'Abandoned Supermarket',code:'S',purpose:'Food, agricultural and household supplies.',lootPool:['food','food','food','water_ration','grain_sack','table','bag_of_damp_grass','box_of_matches']},
  dark_woods:{type:'dark_woods',name:'Dark Woods',code:'F',purpose:'Wood-rich terrain with raw timber, organic supplies and improvised weapons.',lootPool:['rotten_log','rotten_log','twisted_plank','twisted_plank','patchwork_beam','staff','broken_staff','human_bone','meaty_bone','chicken']},
  police_station:{type:'police_station',name:'Old Police Station',code:'P',purpose:'A dangerous but valuable source of weapons, communications gear and scarce technical supplies.',lootPool:['water_bomb','machete','serrated_knife','old_door','battery','working_radio','compact_detonator','semtex','laser_diode','convex_lens','telescope','earplugs','wire_mesh','guitar','pathetic_penknife']},
}
export function specialSiteName(type:SpecialSiteType):string{return SPECIAL_SITES[type].name}
export function specialSiteCode(type:SpecialSiteType):string{return SPECIAL_SITES[type].code}
export function specialSitePurpose(type:SpecialSiteType):string{return SPECIAL_SITES[type].purpose}
