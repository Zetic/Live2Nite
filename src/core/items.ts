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
const resource = (type:ItemType,name:string,purpose:string,capabilities:ItemCapability[]=['component']):ItemDefinition => def({type,name,purpose,category:'misc',displayCategory:'resources',capabilities,source:'MYHORDES_CURRENT'})

export const ITEMS: Record<ItemType, ItemDefinition> = {
  rotten_log: def({ type:'rotten_log', name:'Rotting Log', purpose:'Low-quality resource found abundantly in depleted zones. The Workshop converts it into a Twisted Plank.', category:'raw', displayCategory:'resources', capabilities:['raw_material'], source:'MYHORDES_CURRENT' }),
  scrap_metal: def({ type:'scrap_metal', name:'Scrap Metal', purpose:'Low-quality resource found abundantly in depleted zones. The Workshop converts it into Wrought Iron.', category:'raw', displayCategory:'resources', capabilities:['raw_material'], source:'MYHORDES_CURRENT' }),
  twisted_plank: def({ type:'twisted_plank', name:'Twisted Plank', purpose:'Basic wooden construction material. The Workshop can process it into a Patchwork Beam.', category:'construction', displayCategory:'resources', capabilities:['construction_material'], source:'MYHORDES_CURRENT' }),
  wrought_iron: def({ type:'wrought_iron', name:'Wrought Iron', purpose:'Basic metal construction material. The Workshop can process it into a Metal Support.', category:'construction', displayCategory:'resources', capabilities:['construction_material'], source:'MYHORDES_CURRENT' }),
  patchwork_beam: def({ type:'patchwork_beam', name:'Patchwork Beam', purpose:'Advanced wooden construction material produced from a Twisted Plank or recovered while scavenging.', category:'construction', displayCategory:'resources', capabilities:['construction_material'], source:'MYHORDES_CURRENT' }),
  metal_support: def({ type:'metal_support', name:'Metal Support', purpose:'Advanced metal construction material produced from Wrought Iron or recovered while scavenging.', category:'construction', displayCategory:'resources', capabilities:['construction_material'], source:'MYHORDES_CURRENT' }),
  sheet_metal: def({ type:'sheet_metal', name:'Sheet Metal', purpose:'Scarce construction supply used by defensive and mechanical projects.', category:'construction', displayCategory:'resources', capabilities:['construction_material','component','defense'], source:'MYHORDES_CURRENT' }),
  unshaped_concrete_block: def({ type:'unshaped_concrete_block', name:'Unshaped Concrete Block', purpose:'Heavy construction material used by advanced fortifications.', category:'construction', displayCategory:'resources', capabilities:['construction_material','defense'], source:'MYHORDES_CURRENT' }),

  bag_of_damp_grass: resource('bag_of_damp_grass','Bag of Damp Grass','Scarce supply used by combinations and specialist projects.'),
  battery: resource('battery','Battery','Electrical supply used by electronic construction and equipment.'),
  belt: resource('belt','Belt','Mechanical supply used by tensioned and launching mechanisms.'),
  compact_detonator: resource('compact_detonator','Compact Detonator','Scarce explosive component used by demolition and hydraulic projects.'),
  convex_lens: resource('convex_lens','Convex Lens','Optical component used by observation and precision equipment.'),
  copper_pipe: resource('copper_pipe','Copper Pipe','Hydraulic supply used throughout the Pump and water-defense branches.'),
  duct_tape: resource('duct_tape','Duct Tape','General repair and fastening supply used by mechanical constructions.'),
  earplugs: resource('earplugs','Earplugs','Scarce utility supply retained for combinations and later status mechanics.'),
  electronic_component: resource('electronic_component','Electronic Component','Electronic supply used by scanners, detectors and advanced mechanisms.'),
  empty_oil_can: resource('empty_oil_can','Empty Oil Can','Mechanical container used by hydraulic and improvised-device constructions.'),
  nuts_and_bolts: resource('nuts_and_bolts','Handful of Nuts and Bolts','High-value mechanical fasteners used by many advanced constructions.'),
  laser_diode: resource('laser_diode','Laser Diode','Rare electronic/optical component used by advanced detection and water-defense systems.'),
  semtex: resource('semtex','Semtex','Rare explosive supply used by demolition and high-end construction.', ['component','construction_material']),
  telescope: resource('telescope','Telescope','Combination-only optical instrument used by advanced observation structures.'),
  wire_reel: resource('wire_reel','Wire Reel','Electrical/mechanical supply used by traps, defenses and machinery.'),
  broken_electronic_device: def({ type:'broken_electronic_device', name:'Broken Electronic Device', purpose:'Unprocessed salvage. The Workshop dismantles it into a useful electronic or mechanical supply.', category:'raw', displayCategory:'resources', capabilities:['raw_material'], source:'MYHORDES_CURRENT' }),
  mechanism: def({ type:'mechanism', name:'Mechanism', purpose:'Unprocessed mechanical salvage. The Workshop dismantles it into metal, fasteners or pipe.', category:'raw', displayCategory:'resources', capabilities:['raw_material'], source:'MYHORDES_CURRENT' }),

  meaty_bone: resource('meaty_bone','Meaty Bone','Organic construction supply used as bait in current MyHordes construction costs.'),
  human_flesh: resource('human_flesh','Human Flesh','Organic supply used by a small number of current construction projects.'),
  poison_gland: resource('poison_gland','Poison Gland','Toxic component used by the neurotoxin construction.'),
  working_radio: resource('working_radio','Working Radio','Electronic equipment consumed by several observation and emergency projects.'),
  guitar: resource('guitar','Guitar','Improvised equipment used by the Frat House / La Bamba emergency construction.'),
  table: def({ type:'table', name:'Table', purpose:'Furniture used as a structural/work surface by Factory and observation constructions.', category:'misc', displayCategory:'furniture', capabilities:['component','decoration'], source:'MYHORDES_CURRENT' }),
  chicken: resource('chicken','Chicken','Living supply required by the Henhouse construction.'),
  wire_mesh: resource('wire_mesh','Wire Mesh','Fencing supply required by livestock and filtration constructions.'),
  grain_sack: resource('grain_sack','Grain Sack','Agricultural supply used by food-production constructions.'),

  construction_kit: def({ type:'construction_kit', name:'Construction Kit', purpose:'Open it to recover two basic construction-ready materials.', category:'container', displayCategory:'containers', capabilities:['container'], source:'DIE2NITE_ARCHIVE' }),
  water_ration: def({ type:'water_ration', name:'Water Ration', purpose:'Drinking treats hydration and can refresh AP once per day when AP is missing. Some current constructions also consume banked water rations.', category:'consumable', displayCategory:'food', capabilities:['consumable'], state:{contamination:{initial:'clean'}}, source:'DIE2NITE_ARCHIVE', consumableKind:'water' }),
  food: def({ type:'food', name:'Mouldy Ham Sandwich', purpose:'Ordinary food. Eating can refresh AP once per day when AP is missing.', category:'consumable', displayCategory:'food', capabilities:['consumable'], state:{contamination:{initial:'clean'}}, source:'DIE2NITE_ARCHIVE', consumableKind:'food' }),
  old_door: def({ type:'old_door', name:'Old Door', purpose:'Defensive object: +2 town defense in the Bank, or +1 personal defense when stored at Home.', category:'defense', displayCategory:'defences', capabilities:['defense'], source:'DIE2NITE_ARCHIVE', bankDefense:2, homeDefense:1 }),
  water_bomb: def({ type:'water_bomb', name:'Water Bomb', purpose:'Single-use weapon. While outside and not exhausted, it kills 1–5 zombies without spending AP.', category:'weapon', displayCategory:'armoury', capabilities:['weapon'], source:'DIE2NITE_ARCHIVE' }),
  human_bone: def({ type:'human_bone', name:'Human Bone', purpose:'Improvised low-chance breakable weapon.', category:'weapon', displayCategory:'armoury', capabilities:['weapon','repairable'], source:'DIE2NITE_ARCHIVE' }),
  broken_human_bone: def({ type:'broken_human_bone', name:'Broken Human Bone', purpose:'A broken improvised weapon that can be repaired at the Workshop.', category:'broken_weapon', displayCategory:'armoury', capabilities:['repairable'], state:{condition:{initial:'broken'}}, source:'DIE2NITE_ARCHIVE' }),
  pathetic_penknife: def({ type:'pathetic_penknife', name:'Pathetic Penknife', purpose:'Low-chance breakable melee weapon.', category:'weapon', displayCategory:'armoury', capabilities:['weapon','repairable'], source:'DIE2NITE_ARCHIVE' }),
  broken_pathetic_penknife: def({ type:'broken_pathetic_penknife', name:'Broken Pathetic Penknife', purpose:'A broken weapon that can be repaired at the Workshop.', category:'broken_weapon', displayCategory:'armoury', capabilities:['repairable'], state:{condition:{initial:'broken'}}, source:'DIE2NITE_ARCHIVE' }),
  staff: def({ type:'staff', name:'Staff', purpose:'Medium-chance breakable melee weapon.', category:'weapon', displayCategory:'armoury', capabilities:['weapon','repairable'], source:'DIE2NITE_ARCHIVE' }),
  broken_staff: def({ type:'broken_staff', name:'Broken Staff', purpose:'A broken weapon that can be repaired at the Workshop and also serves as a supply in some combinations.', category:'broken_weapon', displayCategory:'armoury', capabilities:['repairable','component'], state:{condition:{initial:'broken'}}, source:'MYHORDES_CURRENT' }),
  serrated_knife: def({ type:'serrated_knife', name:'Serrated Knife', purpose:'Medium-chance breakable melee weapon.', category:'weapon', displayCategory:'armoury', capabilities:['weapon','repairable'], source:'DIE2NITE_ARCHIVE' }),
  broken_serrated_knife: def({ type:'broken_serrated_knife', name:'Broken Serrated Knife', purpose:'A broken weapon that can be repaired at the Workshop.', category:'broken_weapon', displayCategory:'armoury', capabilities:['repairable'], state:{condition:{initial:'broken'}}, source:'DIE2NITE_ARCHIVE' }),
  machete: def({ type:'machete', name:'Machete', purpose:'Reliable breakable weapon that kills two zombies on a successful strike.', category:'weapon', displayCategory:'armoury', capabilities:['weapon','repairable'], source:'DIE2NITE_ARCHIVE' }),
  broken_machete: def({ type:'broken_machete', name:'Broken Machete', purpose:'A broken weapon that can be repaired at the Workshop.', category:'broken_weapon', displayCategory:'armoury', capabilities:['repairable'], state:{condition:{initial:'broken'}}, source:'DIE2NITE_ARCHIVE' }),
  doggy_bag: def({ type:'doggy_bag', name:'Doggy Bag', purpose:'Starter food package. Open it to reveal one ordinary food item.', category:'container', displayCategory:'food', capabilities:['container'], source:'DIE2NITE_ARCHIVE', containerPool:['food'] }),
  citizen_welcome_pack: def({ type:'citizen_welcome_pack', name:"Citizen's Welcome Pack", purpose:'Starter package using a small verified pool of common welcome-pack contents.', category:'container', displayCategory:'containers', capabilities:['container'], source:'DIE2NITE_ARCHIVE', containerPool:['battery','box_of_matches','pharmaceutical_products'] }),
  box_of_matches: def({ type:'box_of_matches', name:'Box of Matches', purpose:'A utility component found in the desert and Welcome Packs.', category:'misc', displayCategory:'miscellaneous', capabilities:['component'], source:'DIE2NITE_ARCHIVE' }),
  pharmaceutical_products: def({ type:'pharmaceutical_products', name:'Pharmaceutical Products', purpose:'Medical/chemical supply also consumed by several current constructions.', category:'misc', displayCategory:'pharmacy', capabilities:['component','medical'], source:'MYHORDES_CURRENT' }),

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
  // Construction supplies are intentionally rarer than the basic resource stream. Human Flesh is source-backed by the current MyHordes normal-zone drop table.
  'duct_tape','wire_reel','copper_pipe','nuts_and_bolts','broken_electronic_device','mechanism','empty_oil_can','belt','bag_of_damp_grass','human_flesh',
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