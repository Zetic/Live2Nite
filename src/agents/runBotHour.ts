import { getLegalActions } from '../core/actions'
import { executeCommand } from '../core/commands'
import { applyEvents } from '../core/events'
import type { GameEvent, GameState } from '../core/types'
import { zoneControl } from '../core/world'
import type { AgentController } from './AgentController'
import { planExpedition } from './planning/ExpeditionPlanner'
import { missionCompleteAtTown, nextMissionLifecycleEvent } from './planning/MissionLifecycle'
import { isDedicatedRescueReserve, planTownMissionAssignments } from './planning/TownMissionPlanner'
import { chooseTownWork } from './townWork'

export type HourlyObjective='return_home'|'mission'|'town_work'|'fight'|'reserve'|'idle'

export function chooseHourlyObjective(state:GameState,citizenId:string):HourlyObjective{
  const citizen=state.citizens.find((candidate)=>candidate.id===citizenId)
  if(!citizen||!citizen.alive||state.clock.phase!=='day')return'idle'
  if(citizen.location.type==='world'&&zoneControl(state,citizen.location.x,citizen.location.y).trapped)return'fight'
  const mission=state.botMissions[citizenId]
  if(mission){if(mission.phase==='return')return'return_home';return'mission'}
  if(citizen.location.type==='world')return'return_home'
  // Dedicated rescue citizens are a real AP reserve, not merely citizens who happen
  // to stay in town. They remain available for emergency travel and the 1 AP gate close.
  if(isDedicatedRescueReserve(state,citizenId))return'reserve'
  if(chooseTownWork(state,citizen,getLegalActions(state,citizenId)))return'town_work'
  return'reserve'
}

function meaningfulTownWork(event:GameEvent):boolean{return['CONSTRUCTION_AP_CONTRIBUTED','WORKSHOP_CONVERTED','HOME_UPGRADED'].includes(event.type)}

export function runBotHour(state:GameState,controller:AgentController,controlledCitizenId?:string):GameState{
  if(state.clock.phase!=='day')return state
  let nextState=state
  const assignments=planTownMissionAssignments(nextState,controlledCitizenId)
  if(assignments.length)nextState=applyEvents(nextState,assignments)

  for(const startingCitizen of nextState.citizens){
    if(startingCitizen.id===controlledCitizenId||startingCitizen.controller!=='basic-bot'||!startingCitizen.alive)continue
    let reserveSteps=0
    for(let step=0;step<64;step+=1){
      const lifecycle=nextMissionLifecycleEvent(nextState,startingCitizen.id)
      if(lifecycle){nextState=applyEvents(nextState,[lifecycle]);continue}
      const objective=chooseHourlyObjective(nextState,startingCitizen.id)
      if(objective==='idle')break
      // A dedicated reserve with no emergency mission deliberately does nothing that
      // consumes AP. This prevents construction from silently exhausting the citizens
      // intended to rescue others and secure the gate before midnight.
      if(objective==='reserve'&&isDedicatedRescueReserve(nextState,startingCitizen.id))break
      const beforeEvents=nextState.events.length
      const command=controller.decide(nextState,startingCitizen.id)
      if(!command){
        const mission=nextState.botMissions[startingCitizen.id]
        if(mission?.phase==='unload'){
          const complete=missionCompleteAtTown(nextState,startingCitizen.id)
          if(complete)nextState=applyEvents(nextState,[complete])
        }else if(mission?.phase==='prepare'&&!planExpedition(nextState,startingCitizen.id)?.feasible){
          nextState=applyEvents(nextState,[{type:'BOT_MISSION_CLEARED',day:nextState.day,hour:nextState.clock.hour,citizenId:startingCitizen.id,missionId:mission.missionId,outcome:'aborted'}])
        }
        break
      }
      nextState=executeCommand(nextState,command).state
      const emitted=nextState.events.slice(beforeEvents)
      if(objective==='town_work'&&emitted.some(meaningfulTownWork))break
      if(objective==='reserve'){reserveSteps+=1;if(reserveSteps>=4)break}
    }
  }

  if(state.clock.hour===23&&nextState.town.gateOpen){
    const closer=nextState.citizens.find((citizen)=>citizen.id!==controlledCitizenId&&citizen.controller==='basic-bot'&&citizen.alive&&citizen.location.type==='town'&&getLegalActions(nextState,citizen.id).some((action)=>action.type==='CLOSE_GATE'))
    if(closer){
      const close=getLegalActions(nextState,closer.id).find((action)=>action.type==='CLOSE_GATE')
      if(close)nextState=executeCommand(nextState,close).state
    }
  }
  return nextState
}
