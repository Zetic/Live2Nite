import { homeImprovementLevel } from './home'
import { createItemInstance } from './items'
import { randomInt } from './rng'
import type { Citizen, GameEvent, GameState, ItemInstance, ItemType, PersonalItemStorage } from './types'

export const HOME_LAB_PHARMA_COST=2
export const CENTRAL_LAB_DAILY_USE_BONUS=5
export const HOME_LAB_FAILURE_OUTPUTS:readonly ItemType[]=[
  'anabolic_steroids','valium_shot','unlabelled_drug','hydratone_100mg','water_purifying_tablets',
]

type PersonalItemRef={item:ItemInstance;storage:PersonalItemStorage}

export function homeLabSuccessChance(citizen:Citizen):number{return Math.max(0,Math.min(100,homeImprovementLevel(citizen,'laboratory')*25))}
export function homeLabBaseDailyUses(citizen:Citizen):number{const level=homeImprovementLevel(citizen,'laboratory');return level<=0?0:level>=4?4:1}
export function centralLaboratoryCompleted(state:GameState):boolean{return state.town.construction.central_laboratory?.completed===true}
export function homeLabDailyUseLimit(state:GameState,citizen:Citizen):number{return homeLabBaseDailyUses(citizen)+(centralLaboratoryCompleted(state)?CENTRAL_LAB_DAILY_USE_BONUS:0)}
export function homeLabUsesToday(state:GameState,citizenId:string):number{return state.events.filter((event)=>event.type==='HOME_LAB_USED'&&event.day===state.day&&event.citizenId===citizenId).length}

function personalPharmaRefs(citizen:Citizen):PersonalItemRef[]{return[
  ...citizen.inventory.filter((item)=>item.type==='pharmaceutical_products').map((item)=>({item,storage:'inventory' as const})),
  ...citizen.home.storage.filter((item)=>item.type==='pharmaceutical_products').map((item)=>({item,storage:'home' as const})),
]}
export function homeLabCanUse(state:GameState,citizen:Citizen):boolean{
  if(!citizen.alive||citizen.location.type!=='town'||homeImprovementLevel(citizen,'laboratory')<=0)return false
  if(homeLabUsesToday(state,citizen.id)>=homeLabDailyUseLimit(state,citizen))return false
  return personalPharmaRefs(citizen).length>=HOME_LAB_PHARMA_COST
}

export function resolveHomeLabUse(state:GameState,citizen:Citizen):Extract<GameEvent,{type:'HOME_LAB_USED'}>{
  const level=homeImprovementLevel(citizen,'laboratory')
  const successChance=homeLabSuccessChance(citizen)
  const inputs=personalPharmaRefs(citizen).slice(0,HOME_LAB_PHARMA_COST)
  if(level<=0||inputs.length<HOME_LAB_PHARMA_COST)throw new Error('Home Laboratory requirements are not satisfied')

  const successRoll=randomInt(state.rngState,1,100)
  const success=successRoll.value<=successChance
  let outputType:ItemType='twinoid_500mg'
  let rngStateAfter=successRoll.state
  if(!success){
    const outputRoll=randomInt(successRoll.state,0,HOME_LAB_FAILURE_OUTPUTS.length-1)
    outputType=HOME_LAB_FAILURE_OUTPUTS[outputRoll.value]
    rngStateAfter=outputRoll.state
  }
  const outputStorage:PersonalItemStorage=inputs.some((entry)=>entry.storage==='home')?'home':'inventory'
  return{
    type:'HOME_LAB_USED',day:state.day,citizenId:citizen.id,labLevel:level,successChance,success,
    consumedItemIds:inputs.map((entry)=>entry.item.id),
    output:createItemInstance(`i${String(state.nextItemId).padStart(6,'0')}`,outputType),
    outputStorage,rngStateAfter,
  }
}
