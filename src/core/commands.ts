import { applyEvents } from './events'
import type { Citizen, GameCommand, GameEvent, GameState } from './types'

export const ACTION_COST = 2

export interface CommandResult {
  state: GameState
  events: GameEvent[]
}

export class InvalidCommandError extends Error {}

function requireCitizen(state: GameState, citizenId: string): Citizen {
  const citizen = state.citizens.find((candidate) => candidate.id === citizenId)
  if (!citizen) throw new InvalidCommandError(`Unknown citizen: ${citizenId}`)
  if (!citizen.alive) throw new InvalidCommandError(`${citizenId} is not alive`)
  if (citizen.ap < ACTION_COST) throw new InvalidCommandError(`${citizenId} does not have enough AP`)
  return citizen
}

export function executeCommand(state: GameState, command: GameCommand): CommandResult {
  requireCitizen(state, command.citizenId)

  const events: GameEvent[] = [
    { type: 'AP_SPENT', day: state.day, citizenId: command.citizenId, amount: ACTION_COST },
  ]

  if (command.type === 'WORK_DEFENSE') {
    events.push({
      type: 'DEFENSE_CHANGED',
      day: state.day,
      amount: 3,
      sourceCitizenId: command.citizenId,
    })
  } else {
    events.push({
      type: 'WATER_CHANGED',
      day: state.day,
      amount: 4,
      sourceCitizenId: command.citizenId,
    })
  }

  return { state: applyEvents(state, events), events }
}
