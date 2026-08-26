import { bankDefenseFor, consumableKind, itemHasCapability } from './items'
import type { Citizen, DumpCategory, GameCommand, GameEvent, GameState, ItemInstance, ItemType } from './types'

const WOOD_DUMP_ITEMS:ReadonlySet<ItemType>=new Set(['rotten_log','twisted_plank'])
const METAL_DUMP_ITEMS:ReadonlySet<ItemType>=new Set(['scrap_metal','wrought_iron'])
// Current runtime animal coverage is intentionally narrow. New animal identities should be
// added here only when they become real Live2Nite creature items rather than source-only Codex rows.
const ANIMAL_DUMP_ITEMS:ReadonlySet<ItemType>=new Set(['chicken'])

const CATEGORY_BONUS:Readonly<Record<DumpCategory,{projectId:'defence_dump'|'weapons_dump'|'food_dump'|'wood_dump'|'metal_dump'|'animal_dump';bonus:number}>>={
  defense:{projectId:'defence_dump',bonus:2},
  weapon:{projectId:'weapons_dump',bonus:5},
  food:{projectId:'food_dump',bonus:3},
  wood:{projectId:'wood_dump',bonus:1},
  metal:{projectId:'metal_dump',bonus:1},
  animal:{projectId:'animal_dump',bonus:6},
}

export function garbageDumpCategory(item:ItemInstance):DumpCategory|null{
  if(itemHasCapability(item.type,'defense')&&bankDefenseFor(item.type)>0)return'defense'
  if(itemHasCapability(item.type,'weapon'))return'weapon'
  if(consumableKind(item.type)==='food')return'food'
  if(WOOD_DUMP_ITEMS.has(item.type))return'wood'
  if(METAL_DUMP_ITEMS.has(item.type))return'metal'
  if(ANIMAL_DUMP_ITEMS.has(item.type))return'animal'
  return null
}

export function garbageDumpCompleted(state:GameState):boolean{return state.town.construction.garbage_dump?.completed===true}
export function garbageDumpActionCost(state:GameState):number{return state.town.construction.organized_dump?.completed?0:1}
export function garbageDumpBaseDefense(category:DumpCategory):number{return category==='defense'?4:1}
export function garbageDumpDefenseForCategory(state:GameState,category:DumpCategory):number{
  const specialization=CATEGORY_BONUS[category]
  const categoryBonus=state.town.construction[specialization.projectId]?.completed?specialization.bonus:0
  const wetBonus=state.town.construction.dump_upgrade?.completed?1:0
  return garbageDumpBaseDefense(category)+categoryBonus+wetBonus
}
export function garbageDumpDefenseForItem(state:GameState,item:ItemInstance):number{
  const category=garbageDumpCategory(item)
  return category?garbageDumpDefenseForCategory(state,category):0
}
export function garbageDumpTemporaryDefense(state:GameState):number{
  return state.events.reduce((sum,event)=>sum+(event.type==='BANK_ITEM_DUMPED'&&event.day===state.day?event.defenseGained:0),0)
}
export function garbageDumpItems(state:GameState):Array<{item:ItemInstance;category:DumpCategory;defense:number}>{
  if(!garbageDumpCompleted(state))return[]
  return state.town.bank.flatMap((item)=>{const category=garbageDumpCategory(item);return category?[{item,category,defense:garbageDumpDefenseForCategory(state,category)}]:[]})
}
export function garbageDumpCommandsForCitizen(state:GameState,citizen:Citizen):Extract<GameCommand,{type:'DUMP_BANK_ITEM'}>[] {
  if(!citizen.alive||citizen.location.type!=='town'||state.clock.phase!=='day'||!garbageDumpCompleted(state))return[]
  if(citizen.ap<garbageDumpActionCost(state))return[]
  return garbageDumpItems(state).map(({item})=>({type:'DUMP_BANK_ITEM',citizenId:citizen.id,itemId:item.id}))
}
export function resolveGarbageDump(state:GameState,citizen:Citizen,itemId:string):Extract<GameEvent,{type:'BANK_ITEM_DUMPED'}>{
  if(!citizen.alive||citizen.location.type!=='town'||state.clock.phase!=='day'||!garbageDumpCompleted(state))throw new Error('Garbage Dump requirements are not satisfied')
  const item=state.town.bank.find((candidate)=>candidate.id===itemId)
  if(!item)throw new Error(`Bank item ${itemId} is not available`)
  const category=garbageDumpCategory(item)
  if(!category)throw new Error(`${item.type} cannot be destroyed in the Garbage Dump`)
  const cost=garbageDumpActionCost(state)
  if(citizen.ap<cost)throw new Error('Not enough AP to use the Garbage Dump')
  return{type:'BANK_ITEM_DUMPED',day:state.day,citizenId:citizen.id,item,category,defenseGained:garbageDumpDefenseForCategory(state,category)}
}
