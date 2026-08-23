import type { ConsumableKind, ItemInstance } from './types'
import type { ItemCapability, ItemDisplayCategory, ItemState, ItemStateSchema, ItemType } from './itemCatalog'

export type ItemCategory = 'raw' | 'construction' | 'consumable' | 'defense' | 'container' | 'weapon' | 'broken_weapon' | 'misc'
export type ItemSource = 'DIE2NITE_ARCHIVE' | 'HORDES_V4_4' | 'MYHORDES_CURRENT' | 'LIVE2NITE_ADAPTATION'

export interface ItemDefinition {
  type: ItemType
  name: string
  purpose: string
  /** Legacy mechanical grouping retained while callers migrate to capabilities. */
  category: ItemCategory
  displayCategory: ItemDisplayCategory
  capabilities: ItemCapability[]
  state?: ItemStateSchema
  source: ItemSource
  bankDefense?: number
  homeDefense?: number
  consumableKind?: ConsumableKind
  containerPool?: ItemType[]
}

const def = (value: ItemDefinition): ItemDefinition => value

export const ITEMS: Record<ItemType, ItemDefinition> = {
  rotten_log: def({ type:'rotten_log', name:'Rotting Log', purpose:'Low-grade resource from depleted zones. It can be processed into a Twisted Plank at the Workshop.', category:'raw', displayCategory:'resources', capabilities:['raw_material'], source:'DIE2NITE_ARCHIVE' }),
  scrap_metal: def({ type:'scrap_metal', name:'Scrap Metal', purpose:'Low-grade resource from depleted zones. It can be processed into Wrought Iron at the Workshop.', category:'raw', displayCategory:'resources', capabilities:['raw_material'], source:'DIE2NITE_ARCHIVE' }),
  twisted_plank: def({ type:'twisted_plank', name:'Twisted Plank', purpose:'Construction-ready wood used by town projects.', category:'construction', displayCategory:'resources', capabilities:['construction_material'], source:'DIE2NITE_ARCHIVE' }),
  wrought_iron: def({ type:'wrought_iron', name:'Wrought Iron', purpose:'Construction-ready metal used by town projects.', category:'construction', displayCategory:'resources', capabilities:['construction_material'], source:'DIE2NITE_ARCHIVE' }),
  unshaped_concrete_block: def({ type:'unshaped_concrete_block', name:'Unshaped Concrete Block', purpose:'Heavy construction material used by later projects.', category:'construction', displayCategory:'defences', capabilities:['construction_material','defense'], source:'MYHORDES_CURRENT' }),
  construction_kit: def({ type:'construction_kit', name:'Construction Kit', purpose:'Open it to recover two construction-ready materials.', category:'container', displayCategory:'containers', capabilities:['container'], source:'DIE2NITE_ARCHIVE' }),
  water_ration: def({ type:'water_ration', name:'Water Ration', purpose:'Drinking treats hydration and can refresh AP once per day when AP is missing.', category:'consumable', displayCategory:'food', capabilities:['consumable'], state:{contamination:{initial:'clean'}}, source:'DIE2NITE_ARCHIVE', consumableKind:'water' }),
  food: def({ type:'food', name:'Mouldy Ham Sandwich', purpose:'Ordinary food. Eating can refresh AP once per day when AP is missing.', category:'consumable', displayCategory:'food', capabilities:['consumable'], state:{contamination:{initial:'clean'}}, source:'DIE2NITE_ARCHIVE', consumableKind:'food' }),
  old_door: def({ type:'old_door', name:'Old Door', purpose:'Defensive object: +2 town defense in the Bank, or +1 personal defense when stored at Home.', category:'defense', displayCategory:'defences', capabilities:['defense'], source:'DIE2NITE_ARCHIVE', bankDefense:2, homeDefense:1 }),
  water_bomb: def({ type:'water_bomb', name:'Water Bomb', purpose:'Single-use weapon. While outside and not exhausted, it kills 1–5 zombies without spending AP.', category:'weapon', displayCategory:'armoury', capabilities:['weapon'], source:'DIE2NITE_ARCHIVE' }),
  human_bone: def({ type:'human_bone', name:'Human Bone', purpose:'Improvised low-chance breakable weapon.', category:'weapon', displayCategory:'armoury', capabilities:['weapon','repairable'], source:'DIE2NITE_ARCHIVE' }),
  broken_human_bone: def({ type:'broken_human_bone', name:'Broken Human Bone', purpose:'A broken improvised weapon that can be repaired at the Workshop.', category:'broken_weapon', displayCategory:'armoury', capabilities:['repairable'], state:{condition:{initial:'broken'}}, source:'DIE2NITE_ARCHIVE' }),
  pathetic_penknife: def({ type:'pathetic_penknife', name:'Pathetic Penknife', purpose:'Low-chance breakable melee weapon.', category:'weapon', displayCategory:'armoury', capabilities:['weapon','repairable'], source:'DIE2NITE_ARCHIVE' }),
  broken_pathetic_penknife: def({ type:'broken_pathetic_penknife', name:'Broken Pathetic Penknife', purpose:'A broken weapon that can be repaired at the Workshop.', category:'broken_weapon', displayCategory:'armoury', capabilities:['repairable'], state:{condition:{initial:'broken'}}, source:'DIE2NITE_ARCHIVE' }),
  staff: def({ type:'staff', name:'Staff', purpose:'Medium-chance breakable melee weapon.', category:'weapon', displayCategory:'armoury', capabilities:['weapon','repairable'], source:'DIE2NITE_ARCHIVE' }),
  broken_staff: def({ type:'broken_staff', name:'Broken Staff', purpose:'A broken weapon that can be repaired at the Workshop.', category:'broken_weapon', displayCategory:'armoury', capabilities:['repairable'], state:{condition:{initial:'broken'}}, source:'DIE2NITE_ARCHIVE' }),
  serrated_knife: def({ type:'serrated_knife', name:'Serrated Knife', purpose:'Medium-chance breakable melee weapon.', category:'weapon', displayCategory:'armoury', capabilities:['weapon','repairable'], source:'DIE2NITE_ARCHIVE' }),
  broken_serrated_knife: def({ type:'broken_serrated_knife', name:'Broken Serrated Knife', purpose:'A broken weapon that can be repaired at the Workshop.', category:'broken_weapon', displayCategory:'armoury', capabilities:['repairable'], state:{condition:{initial:'broken'}}, source:'DIE2NITE_ARCHIVE' }),
  machete: def({ type:'machete', name:'Machete', purpose:'Reliable breakable weapon that kills two zombies on a successful strike.', category:'weapon', displayCategory:'armoury', capabilities:['weapon','repairable'], source:'DIE2NITE_ARCHIVE' }),
  broken_machete: def({ type:'broken_machete', name:'Broken Machete', purpose:'A broken weapon that can be repaired at the Workshop.', category:'broken_weapon', displayCategory:'armoury', capabilities:['repairable'], state:{condition:{initial:'broken'}}, source:'DIE2NITE_ARCHIVE' }),
  doggy_bag: def({ type:'doggy_bag', name:'Doggy Bag', purpose:'Starter food package. Open it to reveal one ordinary food item.', category:'container', displayCategory:'food', capabilities:['container'], source:'DIE2NITE_ARCHIVE', containerPool:['food'] }),
  citizen_welcome_pack: def({ type:'citizen_welcome_pack', name:"Citizen's Welcome Pack", purpose:'Starter package using a small verified pool of common welcome-pack contents.', category:'container', displayCategory:'containers', capabilities:['container'], source:'DIE2NITE_ARCHIVE', containerPool:['battery','box_of_matches','pharmaceutical_products'] }),
  battery: def({ type:'battery', name:'Battery', purpose:'Electrical component used by many future powered and reloadable items.', category:'misc', displayCategory:'resources', capabilities:['component'], source:'DIE2NITE_ARCHIVE' }),
  box_of_matches: def({ type:'box_of_matches', name:'Box of Matches', purpose:'A utility component found in the desert and Welcome Packs.', category:'misc', displayCategory:'miscellaneous', capabilities:['component'], source:'DIE2NITE_ARCHIVE' }),
  pharmaceutical_products: def({ type:'pharmaceutical_products', name:'Pharmaceutical Products', purpose:'A pharmacy component reserved for the future medical/drug crafting system.', category:'misc', displayCategory:'pharmacy', capabilities:['component','medical'], source:'DIE2NITE_ARCHIVE' }),

  // Foundation representatives from the broader item catalog. These prove that the catalog
  // can express static resources, defense objects, charge-bearing items and repairable tools
  // before later content PRs add their acquisition/crafting gameplay.
  metal_support: def({ type:'metal_support', name:'Metal Support', purpose:'Advanced metal construction resource. Acquisition and recipes are deferred.', category:'construction', displayCategory:'resources', capabilities:['construction_material'], source:'MYHORDES_CURRENT' }),
  patchwork_beam: def({ type:'patchwork_beam', name:'Patchwork Beam', purpose:'Advanced wooden construction resource. Acquisition and recipes are deferred.', category:'construction', displayCategory:'resources', capabilities:['construction_material'], source:'MYHORDES_CURRENT' }),
  sheet_metal: def({ type:'sheet_metal', name:'Sheet Metal', purpose:'Defensive sheet material used by later construction and home content.', category:'defense', displayCategory:'defences', capabilities:['construction_material','defense'], source:'MYHORDES_CURRENT' }),
  water_pistol: def({ type:'water_pistol', name:'Water Pistol', purpose:'Stateful armoury item with up to three shots. Combat/refill behavior is deferred to the stateful-weapons pass.', category:'weapon', displayCategory:'armoury', capabilities:['weapon','charge_bearing'], state:{charges:{min:0,max:3,initial:3}}, source:'MYHORDES_CURRENT' }),
  water_cooler_bottle: def({ type:'water_cooler_bottle', name:'Water Cooler Bottle', purpose:'Multi-ration water container represented by item charges. Drinking/refill behavior is deferred.', category:'consumable', displayCategory:'food', capabilities:['consumable','charge_bearing'], state:{charges:{min:0,max:3,initial:3},contamination:{initial:'clean'}}, source:'MYHORDES_CURRENT' }),
  repair_kit: def({ type:'repair_kit', name:'Repair Kit', purpose:'Repair tool whose intact/damaged condition can persist through storage and saves.', category:'misc', displayCategory:'miscellaneous', capabilities:['repairable'], state:{condition:{initial:'intact'}}, source:'MYHORDES_CURRENT' }),
}

export const ITEM_TYPES: ItemType[] = Object.keys(ITEMS) as ItemType[]

export const NORMAL_SCAVENGE_LOOT_POOL: ItemType[] = [
  'twisted_plank','twisted_plank','twisted_plank','twisted_plank','twisted_plank',
  'wrought_iron','wrought_iron','wrought_iron','wrought_iron','wrought_iron',
  'construction_kit','construction_kit','unshaped_concrete_block','water_ration','water_ration','food','food','old_door',
  'human_bone','human_bone','pathetic_penknife','staff','serrated_knife','water_bomb','battery','box_of_matches','pharmaceutical_products',
]
export const DEPLETED_SCAVENGE_LOOT_POOL: ItemType[] = ['rotten_log','rotten_log','rotten_log','scrap_metal','scrap_metal','scrap_metal']

export function defaultItemState(type:ItemType):ItemState{
  const schema=ITEMS[type].state
  if(!schema)return{}
  const state:ItemState={}
  if(schema.charges)state.charges=schema.charges.initial
  if(schema.condition)state.condition=schema.condition.initial
  if(schema.contamination)state.contamination=schema.contamination.initial
  if(schema.powered)state.powered=schema.powered.initial
  if(schema.assembly)state.assembly=schema.assembly.initial
  return state
}
export function normalizeItemState(type:ItemType,input:ItemState|undefined):ItemState{
  const schema=ITEMS[type].state
  if(!schema)return{}
  const base=defaultItemState(type)
  const next:ItemState={...base,...input}
  if(schema.charges){const value=typeof next.charges==='number'?next.charges:schema.charges.initial;next.charges=Math.min(schema.charges.max,Math.max(schema.charges.min,Math.trunc(value)))}else delete next.charges
  if(!schema.condition)delete next.condition
  if(!schema.contamination)delete next.contamination
  if(!schema.powered)delete next.powered
  if(!schema.assembly)delete next.assembly
  return next
}
export function createItemInstance(id:string,type:ItemType,state?:ItemState):ItemInstance{return{id,type,state:normalizeItemState(type,state)}}
export function itemStackKey(item:ItemInstance):string{return`${item.type}:${JSON.stringify(normalizeItemState(item.type,item.state))}`}
export function itemStateLabel(item:ItemInstance):string{
  const state=normalizeItemState(item.type,item.state);const parts:string[]=[]
  if(state.charges!==undefined)parts.push(`${state.charges} ${state.charges===1?'charge':'charges'}`)
  if(state.condition&&state.condition!=='intact')parts.push(state.condition)
  if(state.contamination&&state.contamination!=='clean')parts.push(state.contamination)
  if(state.assembly&&state.assembly!=='complete')parts.push(state.assembly)
  if(state.powered!==undefined)parts.push(state.powered?'on':'off')
  return parts.join(', ')
}
export function itemName(type:ItemType):string{return ITEMS[type].name}
export function itemPurpose(type:ItemType):string{return ITEMS[type].purpose}
export function itemHasCapability(type:ItemType,capability:ItemCapability):boolean{return ITEMS[type].capabilities.includes(capability)}
export function bankDefenseFor(type:ItemType):number{return ITEMS[type].bankDefense??0}
export function homeDefenseFor(type:ItemType):number{return ITEMS[type].homeDefense??0}
export function consumableKind(type:ItemType):ConsumableKind|null{return ITEMS[type].consumableKind??null}
export function containerPool(type:ItemType):ItemType[]|null{return ITEMS[type].containerPool??null}
export function isContainer(type:ItemType):boolean{return ITEMS[type].capabilities.includes('container')}
