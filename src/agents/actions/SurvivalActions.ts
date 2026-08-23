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
export function campingAction(state:GameState,citizen:Citizen,actions:GameCommand[]):GameCommand|null{if(citizen.camping.hidden)return null;const chance=campingChancePercent(state,citizen.id);const improve=pick(actions,'IMPROVE_CAMP');if(chance<AI_TUNING.campingImproveTargetPercent&&citizen.ap>1&&improve)return improve;return pick(actions,'HIDE_FOR_NIGHT')}
