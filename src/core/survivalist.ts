import { hasProfession } from './professions'
import { randomInt } from './rng'
import { effectiveMaxAp } from './status'
import type { Citizen, GameEvent, GameState, SurvivalistForageKind } from './types'

export const SURVIVALIST_MIN_DISTANCE = 3

export function isSurvivalist(citizen:Citizen):boolean{return hasProfession(citizen,'survivalist')}
export function survivalistForageChancePercent(state:GameState):number{
  const day=state.day
  const base=day>=20?50:day>=15?60:day>=13?70:day>=10?80:day>=5?85:100
  return state.town.devastated?Math.max(10,base-20):base
}
function radialDistance(citizen:Citizen):number{return citizen.location.type==='world'?Math.round(Math.hypot(citizen.location.x,citizen.location.y)):0}
export function survivalManualUsed(citizen:Citizen):boolean{return Boolean(citizen.daily.survivalManualUsed)}
export function canSurvivalistForage(state:GameState,citizen:Citizen,kind:SurvivalistForageKind):boolean{
  if(!citizen.alive||!isSurvivalist(citizen)||citizen.location.type!=='world'||radialDistance(citizen)<SURVIVALIST_MIN_DISTANCE||survivalManualUsed(citizen))return false
  if(kind==='food'&&(citizen.daily.ate||citizen.ap>=effectiveMaxAp(citizen)))return false
  return true
}

export function survivalistForageEvent(state:GameState,citizen:Citizen,kind:SurvivalistForageKind):Extract<GameEvent,{type:'SURVIVALIST_FORAGE_RESOLVED'}>{
  const chancePercent=survivalistForageChancePercent(state)
  const roll=randomInt(state.rngState,1,100)
  const success=roll.value<=chancePercent
  let apAfter=citizen.ap
  let statusAfter={...citizen.status}
  let dailyAfter={...citizen.daily,survivalManualUsed:true}
  if(success&&kind==='food'){
    dailyAfter={...dailyAfter,ate:true}
    apAfter=Math.max(apAfter,effectiveMaxAp(citizen))
  }else if(success&&kind==='water'){
    statusAfter={...statusAfter,desertStepsToday:0}
    if(citizen.status.hydration==='dehydrated')statusAfter.hydration='thirsty'
    else{
      statusAfter.hydration='normal'
      if(!citizen.daily.drank){dailyAfter={...dailyAfter,drank:true};apAfter=Math.max(apAfter,effectiveMaxAp(citizen))}
    }
  }
  return{type:'SURVIVALIST_FORAGE_RESOLVED',day:state.day,citizenId:citizen.id,kind,chancePercent,success,apAfter,statusAfter,dailyAfter,rngStateAfter:roll.state}
}
