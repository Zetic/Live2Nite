import { campingChancePercent } from '../../core/camping'
import type { Citizen, GameCommand, GameState } from '../../core/types'
import { AI_TUNING } from '../AiTuning'
import { bankAction, pick } from './actionSelectors'

export interface HydrationActionOptions{forceThirstTreatment?:boolean}
export function hydrationAction(state:GameState,citizen:Citizen,actions:GameCommand[],options:HydrationActionOptions={}):GameCommand|null{
  if(citizen.status.hydration==='normal')return null
  const urgent=citizen.status.hydration==='dehydrated'||citizen.ap<=1||Boolean(options.forceThirstTreatment);if(!urgent)return null
  const drink=actions.find((action)=>action.type==='DRINK_ITEM')??null;if(drink)return drink
  if(citizen.location.type==='world')return null
  const bank=bankAction(state,actions,'water_ration');if(bank)return bank
  const take=pick(actions,'TAKE_WATER');if(take&&state.town.well.water>0)return take
  return null
}
export function conditionTreatmentAction(citizen:Citizen,actions:GameCommand[]):GameCommand|null{
  const uses=actions.filter((action):action is Extract<GameCommand,{type:'USE_ITEM_ACTION'}>=>action.type==='USE_ITEM_ACTION')
  const byId=(actionId:Extract<GameCommand,{type:'USE_ITEM_ACTION'}>['actionId'])=>uses.find((action)=>action.actionId===actionId)??null
  if(citizen.status.wound){const bandage=byId('bandage');if(bandage)return bandage}
  if(citizen.status.infected){const paracetoid=byId('paracetoid');if(paracetoid)return paracetoid}
  if(citizen.status.terrorized){const valium=byId('valium_shot');if(valium)return valium}
  if(citizen.status.addicted&&!citizen.status.drugged)return byId('anabolic_steroids')??byId('paracetoid')??byId('valium_shot')
  return null
}
export function campingAction(state:GameState,citizen:Citizen,actions:GameCommand[]):GameCommand|null{if(citizen.camping.hidden)return null;const chance=campingChancePercent(state,citizen.id);const improve=pick(actions,'IMPROVE_CAMP');if(chance<AI_TUNING.campingImproveTargetPercent&&citizen.ap>1&&improve)return improve;return pick(actions,'HIDE_FOR_NIGHT')}
