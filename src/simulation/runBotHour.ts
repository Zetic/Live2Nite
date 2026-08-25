import { createAgentDecisionContext } from '../agents/AgentDecisionContext'
import type { AgentController } from '../agents/AgentController'
import { AI_TUNING } from '../agents/AiTuning'
import { commitmentForCitizen, gateBackupCitizenId, gatePrimaryCitizenId, planTownCoordination, reservedApForCitizen } from '../agents/coordination/TownCoordination'
import { planExpedition } from '../agents/planning/ExpeditionPlanner'
import { missionCompleteAtTown, nextMissionLifecycleEvent } from '../agents/planning/MissionLifecycle'
import { planTownMissionAssignments } from '../agents/planning/TownMissionPlanner'
import { chooseTownWork } from '../agents/townWork'
import { getLegalActions } from '../core/actions'
import { executeCommand } from '../core/commands'
import { gateAutoCloseAtHour } from '../core/construction'
import { applyEvents } from '../core/events'
import type { GameEvent, GameState } from '../core/types'
import { relativeControlActive, temporaryControlActive, zoneControl } from '../core/world'

export type HourlyObjective = 'return_home' | 'mission' | 'town_work' | 'fight' | 'reserve' | 'idle'
export const DEDICATED_RESCUE_AP_FLOOR = AI_TUNING.dedicatedRescueApFloor

export function chooseHourlyObjective(state: GameState, citizenId: string): HourlyObjective {
  const citizen = state.citizens.find((candidate) => candidate.id === citizenId)
  if (!citizen || !citizen.alive || state.clock.phase !== 'day') return 'idle'
  if (citizen.location.type === 'world' && zoneControl(state, citizen.location.x, citizen.location.y).trapped) {
    return temporaryControlActive(state,citizenId)||relativeControlActive(state,citizenId)?'return_home':'fight'
  }
  const mission = state.botMissions[citizenId]
  if (mission) {
    if (mission.phase === 'return') return 'return_home'
    return 'mission'
  }
  if (citizen.location.type === 'world') return 'return_home'

  const commitment=commitmentForCitizen(state,citizenId)
  const reserved=reservedApForCitizen(state,citizenId)
  const townWork=chooseTownWork(state,citizen,getLegalActions(state,citizenId))
  const gateVolunteer=commitment?.kind==='gate_primary'||commitment?.kind==='gate_backup'
  if(gateVolunteer&&citizen.ap<=reserved)return'reserve'
  if(commitment?.kind==='construction'&&townWork)return'town_work'
  if(gateVolunteer&&citizen.ap>reserved&&townWork)return'town_work'
  if(state.clock.hour>=AI_TUNING.townApDumpHour&&townWork)return'town_work'
  return 'reserve'
}

function meaningfulTownWork(event: GameEvent): boolean {
  return ['CONSTRUCTION_AP_CONTRIBUTED','WORKSHOP_CONVERTED','ITEMS_COMBINED','HOME_UPGRADED','HOME_IMPROVEMENT_BUILT','ITEM_WITHDRAWN'].includes(event.type)
}

function runTemporaryExtractionPass(state:GameState,controller:AgentController,controlledCitizenId?:string):GameState{
  let nextState=state
  for(const startingCitizen of nextState.citizens){
    if(startingCitizen.id===controlledCitizenId||startingCitizen.controller!=='basic-bot'||!startingCitizen.alive)continue
    if(!temporaryControlActive(nextState,startingCitizen.id))continue
    for(let step=0;step<16;step+=1){
      const citizen=nextState.citizens.find((candidate)=>candidate.id===startingCitizen.id)
      if(!citizen?.alive||citizen.location.type!=='world'||!temporaryControlActive(nextState,citizen.id))break
      const lifecycle=nextMissionLifecycleEvent(nextState,citizen.id)
      if(lifecycle){nextState=applyEvents(nextState,[lifecycle]);continue}
      const command=controller.decide(createAgentDecisionContext(nextState),citizen.id)
      if(!command)break
      nextState=executeCommand(nextState,command).state
    }
  }
  return nextState
}

function gateCloser(state:GameState,controlledCitizenId?:string){
  const preferred=[gatePrimaryCitizenId(state),gateBackupCitizenId(state)].filter((id):id is string=>Boolean(id))
  const eligible=(citizenId:string)=>{
    const citizen=state.citizens.find((candidate)=>candidate.id===citizenId)
    return Boolean(citizen
      && citizen.id!==controlledCitizenId
      && citizen.controller==='basic-bot'
      && citizen.alive
      && citizen.location.type==='town'
      && getLegalActions(state,citizen.id).some((action)=>action.type==='CLOSE_GATE'))
  }
  for(const citizenId of preferred)if(eligible(citizenId))return state.citizens.find((citizen)=>citizen.id===citizenId)??null
  return state.citizens.find((citizen)=>eligible(citizen.id))??null
}

export function runBotHour(state: GameState, controller: AgentController, controlledCitizenId?: string): GameState {
  if (state.clock.phase !== 'day') return state
  let nextState = state

  // Forum-like public commitments are posted first. Mission planning then sees which
  // citizens already volunteered for gate/construction duties instead of relying on a
  // hidden fixed reserve or treating all possible town work as mandatory.
  const coordination=planTownCoordination(nextState,controlledCitizenId)
  if(coordination.length)nextState=applyEvents(nextState,coordination)

  const assignments = planTownMissionAssignments(nextState, controlledCitizenId)
  if (assignments.length) nextState = applyEvents(nextState, assignments)

  for (const startingCitizen of nextState.citizens) {
    if (startingCitizen.id === controlledCitizenId
      || startingCitizen.controller !== 'basic-bot'
      || !startingCitizen.alive) continue

    let reserveSteps = 0
    for (let step = 0; step < AI_TUNING.maxBotDecisionStepsPerHour; step += 1) {
      const lifecycle = nextMissionLifecycleEvent(nextState, startingCitizen.id)
      if (lifecycle) {
        nextState = applyEvents(nextState, [lifecycle])
        continue
      }

      const objective = chooseHourlyObjective(nextState, startingCitizen.id)
      if (objective === 'idle') break

      // A reserved AP floor limits AP-consuming work; it must not terminate the citizen's
      // turn before zero-AP survival/inventory actions such as drinking water can run.
      const beforeEvents = nextState.events.length
      const command = controller.decide(createAgentDecisionContext(nextState), startingCitizen.id)
      if (!command) {
        const mission = nextState.botMissions[startingCitizen.id]
        if (mission?.phase === 'unload') {
          const complete = missionCompleteAtTown(nextState, startingCitizen.id)
          if (complete) nextState = applyEvents(nextState, [complete])
        } else if (mission?.phase === 'prepare' && !planExpedition(nextState, startingCitizen.id)?.feasible && !mission.emergency) {
          nextState = applyEvents(nextState, [{
            type: 'BOT_MISSION_CLEARED',
            day: nextState.day,
            hour: nextState.clock.hour,
            citizenId: startingCitizen.id,
            missionId: mission.missionId,
            outcome: 'aborted',
          }])
        }
        break
      }

      nextState = executeCommand(nextState, command).state
      const emitted = nextState.events.slice(beforeEvents)
      if (objective === 'town_work' && emitted.some(meaningfulTownWork)) {
        const citizen=nextState.citizens.find((candidate)=>candidate.id===startingCitizen.id)
        const reserved=reservedApForCitizen(nextState,startingCitizen.id)
        const aggressive=nextState.clock.hour>=AI_TUNING.aggressiveTownApDumpHour
        // Before the late window, one meaningful town action per hour preserves flexibility
        // for later rescues/scouting. Once field dispatch is winding down, keep spending safe
        // AP until the citizen reaches a real reserve instead of carrying it into midnight.
        if(!aggressive||!citizen||citizen.ap<=reserved)break
        continue
      }
      if (objective === 'reserve') {
        reserveSteps += 1
        if (reserveSteps >= AI_TUNING.maxReserveTownWorkStepsPerHour) break
      }
    }
  }

  // A departure late in the sequential bot order can grant grace to a citizen who
  // already took its ordinary turn. Revisit those citizens before the hour closes so
  // temporary control functions as a real coordinated extraction window.
  nextState=runTemporaryExtractionPass(nextState,controller,controlledCitizenId)

  if (state.clock.hour === 23 && nextState.town.gateOpen) {
    // Automatic Piston Lock closes at the start of 23:00 in advanceTime. A late return or
    // other bot action can reopen the gate later in the same simulated hour, so reassert
    // the automatic effect after all bot movement before falling back to a human closer.
    if(gateAutoCloseAtHour(nextState,23)){
      nextState=applyEvents(nextState,[{type:'GATE_SET',day:nextState.day,hour:23,open:false,citizenId:'system'}])
    }else{
      const closer=gateCloser(nextState,controlledCitizenId)
      if (closer) {
        const close = getLegalActions(nextState, closer.id).find((action) => action.type==='CLOSE_GATE')
        if (close) nextState = executeCommand(nextState, close).state
      }
    }
  }
  return nextState
}