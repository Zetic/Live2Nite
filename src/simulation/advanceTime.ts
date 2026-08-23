import type { AgentController } from '../agents/AgentController'
import { canAdvanceToHour, nextClockHour, phaseForHour } from '../core/clock'
import { gateAutoCloseAtHour } from '../core/construction'
import { applyEvents } from '../core/events'
import { resolveNightAttack } from '../core/night'
import { runAutomaticSearches } from '../core/search'
import type { GameEvent, GameState } from '../core/types'
import { runBotHour } from './runBotHour'

export class InvalidTimeAdvanceError extends Error {}

function temporaryControlExpiryEvents(state:GameState):GameEvent[]{
  return state.citizens.flatMap((citizen)=>citizen.temporaryControl&&citizen.temporaryControl.grantedDay===state.day&&citizen.temporaryControl.grantedHour===state.clock.hour?[{type:'TEMPORARY_CONTROL_EXPIRED',day:state.day,hour:state.clock.hour,citizenId:citizen.id,zoneKey:citizen.temporaryControl.zoneKey} as GameEvent]:[])
}
function automaticGateEvents(state:GameState):GameEvent[]{
  return state.town.gateOpen&&gateAutoCloseAtHour(state,state.clock.hour)
    ? [{type:'GATE_SET',day:state.day,hour:state.clock.hour,open:false,citizenId:'system'}]
    : []
}

export function advanceOneHour(
  state: GameState,
  controller: AgentController,
  controlledCitizenId?: string,
): GameState {
  if (state.clock.phase === 'attack') return resolveNightAttack(state)
  const currentHour = state.clock.hour
  const afterAutomaticGate=applyEvents(state,automaticGateEvents(state))
  const afterAutoSearch = runAutomaticSearches(afterAutomaticGate)
  const afterBots = runBotHour(afterAutoSearch, controller, controlledCitizenId)
  const afterGraceExpiry=applyEvents(afterBots,temporaryControlExpiryEvents(afterBots))
  const toHour = nextClockHour(currentHour)
  const event: GameEvent = {
    type: 'TIME_ADVANCED',
    day: afterGraceExpiry.day,
    hour: currentHour,
    fromHour: currentHour,
    toHour,
    phase: phaseForHour(toHour),
  }
  return applyEvents(afterGraceExpiry, [event])
}

export function advanceToHour(
  state: GameState,
  targetHour: number,
  controller: AgentController,
  controlledCitizenId?: string,
): GameState {
  if (!canAdvanceToHour(state.clock, targetHour)) {
    throw new InvalidTimeAdvanceError(`Cannot move backward or cross into a later day from ${state.clock.hour}:00 to ${targetHour}:00`)
  }
  let nextState = state
  let guard = 0
  while (nextState.clock.hour !== targetHour) {
    if (nextState.clock.phase === 'attack') throw new InvalidTimeAdvanceError('Fast-forward stops at midnight so the attack hour remains visible')
    nextState = advanceOneHour(nextState, controller, controlledCitizenId)
    guard += 1
    if (guard > 24) throw new InvalidTimeAdvanceError('Time advance exceeded one town day')
  }
  return nextState
}
