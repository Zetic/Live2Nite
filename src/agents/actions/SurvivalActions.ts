import { campingChancePercent } from '../../core/camping'
import type { Citizen, GameCommand, GameState } from '../../core/types'
import { AI_TUNING } from '../AiTuning'
import { bankAction, pick } from './actionSelectors'

export interface HydrationActionOptions{forceThirstTreatment?:boolean}
export function hydrationAction(state:GameState,citizen:Citizen,actions:GameCommand[],options:HydrationActionOptions={}):GameCommand|null{
  if(citizen.status.hydration==='normal')return null
  const urgent=citizen.status.hydration==='dehydrated'||citizen.ap<=1||Boolean(options.forceThirstTreatment);if(!urgent)return null
  const drink=actions.find((action)=>action.type==='DRINK_ITEM')??null;if(drink)return drink
  if(citizen.location.type==='world')return pick(actions,'SURVIVALIST_SEARCH_WATER')
  const bank=bankAction(state,actions,'water_ration');if(bank)return bank
  const take=pick(actions,'TAKE_WATER');if(take&&state.town.well.water>0)return take
  return null
}
export function conditionTreatmentAction(state:GameState,citizen:Citizen,actions:GameCommand[]):GameCommand|null{
  const uses=actions.filter((action):action is Extract<GameCommand,{type:'USE_ITEM_ACTION'}>=>action.type==='USE_ITEM_ACTION')
  const byId=(actionId:Extract<GameCommand,{type:'USE_ITEM_ACTION'}>['actionId'])=>uses.find((action)=>action.actionId===actionId)??null
  if(citizen.status.wound){const bandage=byId('bandage');if(bandage)return bandage;if(citizen.location.type==='town'){const bank=bankAction(state,actions,'bandage');if(bank)return bank}}
  if(citizen.status.infected){const paracetoid=byId('paracetoid');if(paracetoid)return paracetoid;if(citizen.location.type==='town'){const bank=bankAction(state,actions,'paracetoid');if(bank)return bank}}
  if(citizen.status.terrorized){const valium=byId('valium_shot');if(valium)return valium;if(citizen.location.type==='town'){const bank=bankAction(state,actions,'valium_shot');if(bank)return bank}}
  if(citizen.status.addicted&&!citizen.status.drugged)return byId('anabolic_steroids')??byId('paracetoid')??byId('valium_shot')
  return null
}
export function survivalistRecoveryAction(citizen:Citizen,actions:GameCommand[]):GameCommand|null{
  if(citizen.location.type!=='world'||citizen.ap>1)return null
  // Preserve real carried food/water first; the once-per-day Manual is emergency endurance,
  // not a reason to waste ordinary refills already packed for the return trip.
  if(actions.some((action)=>action.type==='EAT_ITEM'||action.type==='DRINK_ITEM'))return null
  return pick(actions,'SURVIVALIST_SEARCH_FOOD')??pick(actions,'SURVIVALIST_SEARCH_WATER')
}
export function campingAction(state:GameState,citizen:Citizen,actions:GameCommand[]):GameCommand|null{
  if(citizen.camping.hidden)return null
  const chance=campingChancePercent(state,citizen.id)
  const improve=pick(actions,'IMPROVE_CAMP')
  const grave=pick(actions,'DIG_CAMPING_GRAVE')
  const graveChance=grave?campingChancePercent(state,citizen.id,{grave:true}):chance
  if(chance<AI_TUNING.campingImproveTargetPercent){
    if(grave&&graveChance>=AI_TUNING.campingImproveTargetPercent)return grave
    if(citizen.ap>1&&improve)return improve
    if(grave)return grave
  }
  return pick(actions,'HIDE_FOR_NIGHT')
}
