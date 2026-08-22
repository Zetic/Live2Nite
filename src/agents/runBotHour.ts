import { getLegalActions } from '../core/actions'
import { executeCommand } from '../core/commands'
import type { Citizen, GameEvent, GameState } from '../core/types'
import { zoneControl } from '../core/world'
import type { AgentController } from './AgentController'
import { planExpedition } from './planning/ExpeditionPlanner'
import { chooseTownWork } from './townWork'

export type HourlyObjective='return_home'|'rescue'|'expedition'|'town_work'|'fight'|'idle'
function returnHourFor(citizenId:string):number{return 18+((Number(citizenId.slice(1))||0)%4)}
function trappedCitizens(state:GameState,citizenId:string):Citizen[]{return state.citizens.filter((candidate)=>candidate.id!==citizenId&&candidate.alive&&candidate.location.type==='world'&&zoneControl(state,candidate.location.x,candidate.location.y).trapped)}
export function chooseHourlyObjective(state:GameState,citizenId:string):HourlyObjective{
  const citizen=state.citizens.find((candidate)=>candidate.id===citizenId);if(!citizen||!citizen.alive||state.clock.phase!=='day')return'idle'
  if(citizen.location.type==='world'&&zoneControl(state,citizen.location.x,citizen.location.y).trapped)return'fight'
  if(citizen.location.type==='world'&&state.clock.hour>=returnHourFor(citizenId))return'return_home'
  if(trappedCitizens(state,citizenId).length)return'rescue'
  if(citizen.location.type==='town'&&chooseTownWork(state,citizen,getLegalActions(state,citizenId)))return'town_work'
  if(planExpedition(state,citizenId))return'expedition'
  return'idle'
}
function newEvents(state:GameState,citizenId:string,startIndex:number):GameEvent[]{return state.events.slice(startIndex).filter((event)=>'citizenId'in event&&event.citizenId===citizenId)}
function objectiveComplete(state:GameState,citizenId:string,objective:HourlyObjective,startIndex:number):boolean{
  const citizen=state.citizens.find((candidate)=>candidate.id===citizenId);if(!citizen||!citizen.alive)return true
  const events=newEvents(state,citizenId,startIndex)
  if(objective==='idle')return true
  if(objective==='fight'){if(citizen.location.type!=='world')return true;return!zoneControl(state,citizen.location.x,citizen.location.y).trapped||!getLegalActions(state,citizenId).some((action)=>action.type==='USE_WEAPON'||action.type==='ATTACK_BAREHANDED')}
  if(objective==='return_home')return citizen.location.type==='town'
  if(objective==='town_work')return events.some((event)=>['CONSTRUCTION_AP_CONTRIBUTED','WORKSHOP_CONVERTED','HOME_UPGRADED'].includes(event.type))||citizen.ap===0
  if(objective==='rescue'){return trappedCitizens(state,citizenId).length===0}
  if(objective==='expedition'){
    if(events.some((event)=>event.type==='SPECIAL_SITE_EXCAVATED'))return true
    const searched=events.some((event)=>event.type==='ZONE_SEARCHED'||event.type==='SPECIAL_SITE_SEARCHED')
    if(searched&&!getLegalActions(state,citizenId).some((action)=>action.type==='PICK_UP_ITEM'))return true
    if(citizen.location.type==='town'&&events.some((event)=>event.type==='CITIZEN_LOCATION_CHANGED'))return true
    return !planExpedition(state,citizenId)&&events.length>0
  }
  return true
}
export function runBotHour(state:GameState,controller:AgentController,controlledCitizenId?:string):GameState{
  if(state.clock.phase!=='day')return state;let nextState=state
  for(const startingCitizen of state.citizens){if(startingCitizen.id===controlledCitizenId||startingCitizen.controller!=='basic-bot'||!startingCitizen.alive)continue;const objective=chooseHourlyObjective(nextState,startingCitizen.id);if(objective==='idle')continue;const startIndex=nextState.events.length
    for(let step=0;step<48;step+=1){if(objectiveComplete(nextState,startingCitizen.id,objective,startIndex))break;const command=controller.decide(nextState,startingCitizen.id);if(!command)break;nextState=executeCommand(nextState,command).state}
  }
  if(state.clock.hour===23&&nextState.town.gateOpen){const closer=nextState.citizens.find((citizen)=>citizen.id!==controlledCitizenId&&citizen.controller==='basic-bot'&&citizen.alive&&citizen.location.type==='town'&&getLegalActions(nextState,citizen.id).some((action)=>action.type==='CLOSE_GATE'));if(closer){const close=getLegalActions(nextState,closer.id).find((action)=>action.type==='CLOSE_GATE');if(close)nextState=executeCommand(nextState,close).state}}
  return nextState
}
