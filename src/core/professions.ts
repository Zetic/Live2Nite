import { randomInt } from './rng'
import type { Citizen, GameState } from './types'

export type ProfessionId='scavenger'|'scout'|'guardian'|'survivalist'|'tamer'|'technician'
export type ProfessionItemType='profession_small_shovel'|'profession_camouflage_suit'|'profession_riot_shield'|'profession_survival_manual'|'profession_three_legged_maltese'|'profession_technician_wrench'
export type EquipmentItemType='town_uniform'|ProfessionItemType
export interface EquipmentItemState{camouflaged?:boolean}
export interface EquipmentItemInstance{id:string;type:EquipmentItemType;state?:EquipmentItemState}
export interface CitizenEquipment{townUniform:EquipmentItemInstance;professionItem:EquipmentItemInstance}
export type ProfessionCitizen=Citizen&{equipment?:CitizenEquipment}

export const BASE_CARGO_CAPACITY=5
export const PROFESSION_IDS:readonly ProfessionId[]=['scavenger','scout','guardian','survivalist','tamer','technician']
export const GUARDIAN_CONTROL_POINTS=4
export const ORDINARY_CONTROL_POINTS=2
export const GUARDIAN_PERSONAL_HOME_DEFENSE=1
export const GUARDIAN_TOWN_DEFENSE=5
export const GUARDIAN_TOWER_TOWN_DEFENSE=15

export interface ProfessionDefinition {
  id:ProfessionId
  name:string
  summary:string
  itemType:ProfessionItemType
  itemName:string
  itemPurpose:string
}

export const PROFESSION_DEFINITIONS:Record<ProfessionId,ProfessionDefinition>={
  scavenger:{id:'scavenger',name:'Scavenger',summary:'Resource gathering specialist.',itemType:'profession_small_shovel',itemName:'Small Shovel',itemPurpose:'Scavenger equipment. Improves search success, shortens repeat automatic searches to 75% of the base interval, reveals qualitative resource depletion, adds 50% ruin oxygen, and can replenish each depleted zone with the spade once.'},
  scout:{id:'scout',name:'Scout',summary:'Reconnaissance and dangerous-zone exploration specialist.',itemType:'profession_camouflage_suit',itemName:'Camouflage Suit',itemPurpose:'Scout equipment. Provides 2 daily Scout Points, nearby zombie reconnaissance, persistent Scout visits, and camouflage for dangerous-zone movement, camping, and explorable-ruin entry.'},
  guardian:{id:'guardian',name:'Guardian',summary:'Defense and zombie-control specialist.',itemType:'profession_riot_shield',itemName:'Riot Shield',itemPurpose:'Guardian equipment. Provides 4 World Beyond control points, +1 personal Home defense, and +5 town defense while its citizen is alive in town. A completed Guard Tower raises that town contribution to +15.'},
  survivalist:{id:'survivalist',name:'Survivalist',summary:'Long-range survival and camping specialist.',itemType:'profession_survival_manual',itemName:'Survival Manual',itemPurpose:'Survivalist equipment. Once per day at least 3 km from town, searches for food or water with a town-day success chance. Successful food or qualifying water restores ordinary AP immediately; Dehydrated water use only improves to Thirsty. Survivalists can also use safe camps all the way to a 100% survival ceiling.'},
  tamer:{id:'tamer',name:'Tamer',summary:'Expedition logistics specialist.',itemType:'profession_three_legged_maltese',itemName:'Three-Legged Maltese',itemPurpose:'Tamer equipment. Once per day outside town, returns the whole ordinary rucksack cargo to the Bank or Home Chest. A cumbersome item blocks the trip unless Anabolic Steroids let the dog carry that one cumbersome item with the rest of the shipment. The Maltese also points toward explorable-ruin exits.'},
  technician:{id:'technician',name:'Technician',summary:'Construction and technical-work specialist.',itemType:'profession_technician_wrench',itemName:"Technician's Wrench",itemPurpose:'Technician equipment. Provides 6 daily Construction Points spent before AP on town construction and Workshop work, repairs supported broken equipment for 3 CP, and can form matching key imprints in explorable ruins. A Technicians Workbench adds once-daily controlled Workshop output selection.'},
}

export const TOWN_UNIFORM_DEFINITION={
  type:'town_uniform' as const,
  name:'Town Uniform',
  purpose:'Permanent town-issued equipment. This locked rucksack slot is not ordinary cargo.',
}

const PROFESSION_BY_ITEM:Record<ProfessionItemType,ProfessionId>={
  profession_small_shovel:'scavenger',
  profession_camouflage_suit:'scout',
  profession_riot_shield:'guardian',
  profession_survival_manual:'survivalist',
  profession_three_legged_maltese:'tamer',
  profession_technician_wrench:'technician',
}

export function professionFromItem(type:EquipmentItemType):ProfessionId|null{return type==='town_uniform'?null:PROFESSION_BY_ITEM[type]??null}
export function citizenEquipment(citizen:Citizen):CitizenEquipment|null{const equipment=(citizen as ProfessionCitizen).equipment;return validCitizenEquipment(equipment)?equipment:null}
export function citizenProfession(citizen:Citizen):ProfessionId|null{const equipment=citizenEquipment(citizen);return equipment?professionFromItem(equipment.professionItem.type):null}
export function hasProfession(citizen:Citizen,profession:ProfessionId):boolean{return citizenProfession(citizen)===profession}
export function professionName(citizen:Citizen):string{const profession=citizenProfession(citizen);return profession?PROFESSION_DEFINITIONS[profession].name:'Unassigned'}
export function equipmentItemName(item:EquipmentItemInstance):string{if(item.type==='town_uniform')return TOWN_UNIFORM_DEFINITION.name;const profession=PROFESSION_BY_ITEM[item.type];return PROFESSION_DEFINITIONS[profession].itemName}
export function equipmentItemPurpose(item:EquipmentItemInstance):string{
  if(item.type==='town_uniform')return TOWN_UNIFORM_DEFINITION.purpose
  const profession=PROFESSION_BY_ITEM[item.type]
  const purpose=PROFESSION_DEFINITIONS[profession].itemPurpose
  return item.type==='profession_camouflage_suit'?`${purpose} Camouflage is currently ${item.state?.camouflaged===false?'inactive':'active'}.`:purpose
}

/** Profession items are capability tokens: every Guardian bonus is derived from the Riot Shield slot. */
export function professionControlPoints(citizen:Citizen):number{return citizen.status.terrorized?0:hasProfession(citizen,'guardian')?GUARDIAN_CONTROL_POINTS:ORDINARY_CONTROL_POINTS}
export function guardianPersonalHomeDefenseBonus(citizen:Citizen):number{return hasProfession(citizen,'guardian')?GUARDIAN_PERSONAL_HOME_DEFENSE:0}
export function guardianTownDefensePerCitizen(state:GameState):number{return state.town.construction.guard_tower?.completed?GUARDIAN_TOWER_TOWN_DEFENSE:GUARDIAN_TOWN_DEFENSE}
export function guardianTownDefenseBonus(state:GameState):number{
  const guardians=state.citizens.filter((citizen)=>citizen.alive&&citizen.location.type==='town'&&hasProfession(citizen,'guardian')).length
  return guardians*guardianTownDefensePerCitizen(state)
}

export function createCitizenEquipment(citizenId:string,profession:ProfessionId):CitizenEquipment{
  const professionItem:EquipmentItemInstance={id:`equipment-${citizenId}-profession`,type:PROFESSION_DEFINITIONS[profession].itemType}
  if(profession==='scout')professionItem.state={camouflaged:true}
  return{
    townUniform:{id:`equipment-${citizenId}-uniform`,type:'town_uniform'},
    professionItem,
  }
}
export function equipCitizenProfession(citizen:Citizen,profession:ProfessionId):Citizen{
  const existing=citizenEquipment(citizen)
  const professionItem:EquipmentItemInstance={id:existing?.professionItem.id??`equipment-${citizen.id}-profession`,type:PROFESSION_DEFINITIONS[profession].itemType}
  if(profession==='scout')professionItem.state={camouflaged:true}
  const equipment:CitizenEquipment={
    townUniform:existing?.townUniform??{id:`equipment-${citizen.id}-uniform`,type:'town_uniform'},
    professionItem,
  }
  return{...citizen,equipment} as ProfessionCitizen
}

export function validCitizenEquipment(value:unknown):value is CitizenEquipment{
  if(!value||typeof value!=='object')return false
  const equipment=value as Partial<CitizenEquipment>
  if(!equipment.townUniform||equipment.townUniform.type!=='town_uniform'||typeof equipment.townUniform.id!=='string')return false
  if(!equipment.professionItem||typeof equipment.professionItem.id!=='string'||typeof equipment.professionItem.type!=='string')return false
  return equipment.professionItem.type in PROFESSION_BY_ITEM
}
export function townHasProfessionEquipment(citizens:readonly Citizen[]):boolean{return citizens.length>0&&citizens.every((citizen)=>Boolean(citizenEquipment(citizen)))}

function shuffledProfessionOrder(seed:number):ProfessionId[]{
  const order=[...PROFESSION_IDS]
  let state=((seed>>>0)^0x9e3779b9)>>>0||0x6d2b79f5
  for(let index=order.length-1;index>0;index-=1){const roll=randomInt(state,0,index);state=roll.state;const selected=order[roll.value]??order[index];const current=order[index];order[index]=selected;order[roll.value]=current}
  return order
}

export function assignBotProfessions(seed:number,count:number):ProfessionId[]{
  if(count<=0)return[]
  const order=shuffledProfessionOrder(seed)
  const assignments=Array.from({length:count},(_,index)=>order[index%order.length]??'scavenger')
  let state=(((seed>>>0)^0x85ebca6b)>>>0)||0x6d2b79f5
  for(let index=assignments.length-1;index>0;index-=1){const roll=randomInt(state,0,index);state=roll.state;const selected=assignments[roll.value]??assignments[index];const current=assignments[index];assignments[index]=selected;assignments[roll.value]=current}
  return assignments
}