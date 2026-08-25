import { randomInt } from './rng'
import type { Citizen } from './types'

export type ProfessionId='scavenger'|'scout'|'guardian'|'hermit'|'tamer'|'technician'
export type ProfessionItemType='profession_small_shovel'|'profession_camouflage_suit'|'profession_riot_shield'|'profession_survival_manual'|'profession_three_legged_maltese'|'profession_technician_wrench'
export type EquipmentItemType='town_uniform'|ProfessionItemType
export interface EquipmentItemInstance{id:string;type:EquipmentItemType}
export interface CitizenEquipment{townUniform:EquipmentItemInstance;professionItem:EquipmentItemInstance}
export type ProfessionCitizen=Citizen&{equipment?:CitizenEquipment}

export const BASE_CARGO_CAPACITY=5
export const PROFESSION_IDS:readonly ProfessionId[]=['scavenger','scout','guardian','hermit','tamer','technician']

export interface ProfessionDefinition {
  id:ProfessionId
  name:string
  summary:string
  itemType:ProfessionItemType
  itemName:string
  itemPurpose:string
}

export const PROFESSION_DEFINITIONS:Record<ProfessionId,ProfessionDefinition>={
  scavenger:{id:'scavenger',name:'Scavenger',summary:'Resource gathering specialist.',itemType:'profession_small_shovel',itemName:'Small Shovel',itemPurpose:'Locked profession equipment. Enables Scavenger mechanics as they are implemented.'},
  scout:{id:'scout',name:'Scout',summary:'Reconnaissance and dangerous-zone exploration specialist.',itemType:'profession_camouflage_suit',itemName:'Camouflage Suit',itemPurpose:'Locked profession equipment. Enables Scout mechanics as they are implemented.'},
  guardian:{id:'guardian',name:'Guardian',summary:'Defense and zombie-control specialist.',itemType:'profession_riot_shield',itemName:'Riot Shield',itemPurpose:'Locked profession equipment. Enables Guardian mechanics as they are implemented.'},
  hermit:{id:'hermit',name:'Hermit',summary:'Long-range survival and camping specialist.',itemType:'profession_survival_manual',itemName:'Survival Manual',itemPurpose:'Locked profession equipment. Enables Hermit mechanics as they are implemented.'},
  tamer:{id:'tamer',name:'Tamer',summary:'Expedition logistics specialist.',itemType:'profession_three_legged_maltese',itemName:'Three-Legged Maltese',itemPurpose:'Locked profession equipment. Enables Tamer mechanics as they are implemented.'},
  technician:{id:'technician',name:'Technician',summary:'Construction and technical-work specialist.',itemType:'profession_technician_wrench',itemName:"Technician's Wrench",itemPurpose:'Locked profession equipment. Enables Technician mechanics as they are implemented.'},
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
  profession_survival_manual:'hermit',
  profession_three_legged_maltese:'tamer',
  profession_technician_wrench:'technician',
}

export function professionFromItem(type:EquipmentItemType):ProfessionId|null{return type==='town_uniform'?null:PROFESSION_BY_ITEM[type]??null}
export function citizenEquipment(citizen:Citizen):CitizenEquipment|null{const equipment=(citizen as ProfessionCitizen).equipment;return validCitizenEquipment(equipment)?equipment:null}
export function citizenProfession(citizen:Citizen):ProfessionId|null{const equipment=citizenEquipment(citizen);return equipment?professionFromItem(equipment.professionItem.type):null}
export function professionName(citizen:Citizen):string{const profession=citizenProfession(citizen);return profession?PROFESSION_DEFINITIONS[profession].name:'Unassigned'}
export function equipmentItemName(item:EquipmentItemInstance):string{if(item.type==='town_uniform')return TOWN_UNIFORM_DEFINITION.name;const profession=PROFESSION_BY_ITEM[item.type];return PROFESSION_DEFINITIONS[profession].itemName}
export function equipmentItemPurpose(item:EquipmentItemInstance):string{if(item.type==='town_uniform')return TOWN_UNIFORM_DEFINITION.purpose;const profession=PROFESSION_BY_ITEM[item.type];return PROFESSION_DEFINITIONS[profession].itemPurpose}

export function createCitizenEquipment(citizenId:string,profession:ProfessionId):CitizenEquipment{
  return{
    townUniform:{id:`equipment-${citizenId}-uniform`,type:'town_uniform'},
    professionItem:{id:`equipment-${citizenId}-profession`,type:PROFESSION_DEFINITIONS[profession].itemType},
  }
}
export function equipCitizenProfession(citizen:Citizen,profession:ProfessionId):Citizen{
  const existing=citizenEquipment(citizen)
  const equipment:CitizenEquipment={
    townUniform:existing?.townUniform??{id:`equipment-${citizen.id}-uniform`,type:'town_uniform'},
    professionItem:{id:existing?.professionItem.id??`equipment-${citizen.id}-profession`,type:PROFESSION_DEFINITIONS[profession].itemType},
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
