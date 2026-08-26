import { isKitchenCookable } from './food'
import { homeImprovementLevel } from './home'
import { createItemInstance } from './items'
import { randomInt } from './rng'
import type { Citizen, GameCommand, GameEvent, GameState, ItemInstance, PersonalItemStorage } from './types'

type KitchenInput={item:ItemInstance;storage:PersonalItemStorage}

export function kitchenGoodChance(citizen:Citizen):number{
  const level=homeImprovementLevel(citizen,'kitchen')
  if(level<=0)return 0
  if(level===1)return 33
  if(level===2)return 66
  return 99
}

export function kitchenBaseDailyUses(citizen:Citizen):number{
  const level=homeImprovementLevel(citizen,'kitchen')
  if(level<=0)return 0
  if(level<=2)return 1
  return level===3?2:3
}

export function centralCafeteriaCompleted(state:GameState):boolean{return state.town.construction.central_cafeteria?.completed===true}
export function kitchenDailyUseLimit(state:GameState,citizen:Citizen):number{return kitchenBaseDailyUses(citizen)*(centralCafeteriaCompleted(state)?2:1)}
export function kitchenUsesToday(state:GameState,citizenId:string):number{return state.events.filter((event)=>event.type==='HOME_KITCHEN_USED'&&event.day===state.day&&event.citizenId===citizenId).length}

export function kitchenInputs(citizen:Citizen):KitchenInput[]{return[
  ...citizen.inventory.filter(isKitchenCookable).map((item)=>({item,storage:'inventory' as const})),
  ...citizen.home.storage.filter(isKitchenCookable).map((item)=>({item,storage:'home' as const})),
]}

export function kitchenCanUse(state:GameState,citizen:Citizen):boolean{
  if(!citizen.alive||citizen.location.type!=='town'||homeImprovementLevel(citizen,'kitchen')<=0)return false
  if(kitchenUsesToday(state,citizen.id)>=kitchenDailyUseLimit(state,citizen))return false
  return kitchenInputs(citizen).length>0
}

export function kitchenCommandsForCitizen(state:GameState,citizen:Citizen):Extract<GameCommand,{type:'USE_HOME_KITCHEN'}>[] {
  if(!kitchenCanUse(state,citizen))return[]
  return kitchenInputs(citizen).map(({item})=>({type:'USE_HOME_KITCHEN',citizenId:citizen.id,itemId:item.id}))
}

export function resolveKitchenUse(state:GameState,citizen:Citizen,itemId:string):Extract<GameEvent,{type:'HOME_KITCHEN_USED'}>{
  if(!kitchenCanUse(state,citizen))throw new Error('Home Kitchen requirements are not satisfied')
  const input=kitchenInputs(citizen).find((entry)=>entry.item.id===itemId)
  if(!input)throw new Error(`Item ${itemId} is not an eligible Kitchen food`)
  const level=homeImprovementLevel(citizen,'kitchen')
  const successChance=kitchenGoodChance(citizen)
  const roll=randomInt(state.rngState,1,100)
  const success=roll.value<=successChance
  return{
    type:'HOME_KITCHEN_USED',day:state.day,citizenId:citizen.id,kitchenLevel:level,successChance,success,
    input:input.item,inputStorage:input.storage,
    output:createItemInstance(`i${String(state.nextItemId).padStart(6,'0')}`,success?'good_home_made_meal':'dubious_home_made_meal'),
    rngStateAfter:roll.state,
  }
}
