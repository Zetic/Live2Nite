import type { BotMissionPurpose, Citizen, GameState, ItemType } from '../../core/types'
import { evaluateTownNeeds } from './TownNeeds'

export type WaterPolicy = 'normal' | 'cautious' | 'critical'
export type SupplyDisposition = 'community' | 'balanced' | 'hoarder'
export type ExpeditionPurpose = BotMissionPurpose

export interface ExpeditionLoadout {
  water: boolean
  food: boolean
  weapon: boolean
  reservedLootSlots: number
  potentialAp: number
  wellWaterAllowed: boolean
}

function citizenNumber(citizenId:string):number{return Number(citizenId.slice(1))||0}
export function waterPolicyForState(state:GameState):WaterPolicy{const ratio=evaluateTownNeeds(state).waterPerCitizen;if(ratio>2)return'normal';if(ratio>=1)return'cautious';return'critical'}
export function supplyDispositionForCitizen(citizenId:string):SupplyDisposition{const roll=citizenNumber(citizenId)%3;return roll===0?'community':roll===1?'balanced':'hoarder'}
function inventoryHas(citizen:Citizen,type:ItemType):boolean{return citizen.inventory.some((item)=>item.type===type)}
function homeHas(citizen:Citizen,type:ItemType):boolean{return citizen.home.storage.some((item)=>item.type===type)}
function accessibleHas(citizen:Citizen,type:ItemType):boolean{return inventoryHas(citizen,type)||(citizen.location.type==='town'&&homeHas(citizen,type))}
function hasFoodPotential(citizen:Citizen,state:GameState):boolean{return accessibleHas(citizen,'food')||(citizen.location.type==='town'&&(citizen.home.storage.some((item)=>item.type==='doggy_bag')||(state.town.bank.food??0)>0))}
function hasWaterPotential(citizen:Citizen,state:GameState):boolean{return accessibleHas(citizen,'water_ration')||(citizen.location.type==='town'&&((state.town.bank.water_ration??0)>0||state.town.well.water>0))}
function hasWeaponPotential(citizen:Citizen,state:GameState):boolean{return accessibleHas(citizen,'water_bomb')||(citizen.location.type==='town'&&(state.town.bank.water_bomb??0)>0)}

export function canUseWellForPurpose(state:GameState,citizenId:string,purpose:ExpeditionPurpose):boolean{
  const policy=waterPolicyForState(state)
  if(policy==='normal')return true
  if(policy==='critical')return purpose==='rescue'
  return purpose==='rescue'||(purpose==='gather_construction'&&citizenNumber(citizenId)%5===0)
}

export function planLoadout(state:GameState,citizen:Citizen,purpose:ExpeditionPurpose,requiredAp:number,targetZombies:number):ExpeditionLoadout{
  let potentialAp=citizen.ap
  let water=false
  let food=false
  const wellWaterAllowed=citizen.location.type==='town'&&canUseWellForPurpose(state,citizen.id,purpose)
  if(requiredAp>potentialAp&&!citizen.daily.drank&&hasWaterPotential(citizen,state)&&(accessibleHas(citizen,'water_ration')||(citizen.location.type==='town'&&((state.town.bank.water_ration??0)>0||wellWaterAllowed)))){water=true;potentialAp+=citizen.maxAp}
  if(requiredAp>potentialAp&&!citizen.daily.ate&&hasFoodPotential(citizen,state)){food=true;potentialAp+=citizen.maxAp}
  let weapon=targetZombies>2&&hasWeaponPotential(citizen,state)
  let supplies=Number(water)+Number(food)+Number(weapon)
  if(citizen.inventoryCapacity-supplies<2&&weapon&&targetZombies<=4){weapon=false;supplies-=1}
  if(citizen.inventoryCapacity-supplies<1&&food){food=false;potentialAp-=citizen.maxAp;supplies-=1}
  const reservedLootSlots=Math.max(1,citizen.inventoryCapacity-supplies)
  return{water,food,weapon,reservedLootSlots,potentialAp,wellWaterAllowed}
}

export function shouldUseRefill(citizen:Citizen,remainingRequiredAp:number,kind:'food'|'water'):boolean{
  if(kind==='food'&&citizen.daily.ate)return false
  if(kind==='water'&&citizen.daily.drank)return false
  return citizen.ap<=1&&remainingRequiredAp>citizen.ap
}
