import type { AgentController } from '../agents/AgentController'
import { canAdvanceToHour, nextClockHour, phaseForHour } from '../core/clock'
import { applyEvents } from '../core/events'
import { resolveNightAttack } from '../core/night'
import { runAutomaticSearches } from '../core/search'
import type { GameEvent, GameState } from '../core/types'
import { runBotHour } from './runBotHour'

export class InvalidTimeAdvanceError extends Error {}

export function advanceOneHour(
  state: GameState,
  controller: AgentController,
  controlledCitizenId?: string,
): GameState {
  if (state.clock.phase === 'attack') return resolveNightAttack(state)
  const currentHour = state.clock.hour
  const afterAutoSearch = runAutomaticSearches(state)
  const afterBots = runBotHour(afterAutoSearch, controller, controlledCitizenId)
  const toHour = nextClockHour(currentHour)
  const event: GameEvent = {
    type: 'TIME_ADVANCED',
    day: afterBots.day,
    hour: currentHour,
    fromHour: currentHour,
    toHour,
    phase: phaseForHour(toHour),
  }
  return applyEvents(afterBots, [event])
}

export function advanceToHour(
  state: GameState,
  targetHour: number,
  controller: AgentController,
  controlledCitizenId?: string,
): GameState {
  if (!canAdvanceToHour(state.clock, targetHour)) {
    throw new InvalidTimeAdvanceError(
      `Cannot move backward or cross into a later day from ${state.clock.hour}:00 to ${targetHour}:00`,
    )
  }
  let nextState = state
  let guard = 0
  while (nextState.clock.hour !== targetHour) {
    if (nextState.clock.phase === 'attack') {
      throw new InvalidTimeAdvanceError('Fast-forward stops at midnight so the attack hour remains visible')
    }
    nextState = advanceOneHour(nextState, controller, controlledCitizenId)
    guard += 1
    if (guard > 24) throw new InvalidTimeAdvanceError('Time advance exceeded one town day')
  }
  return nextState
}
