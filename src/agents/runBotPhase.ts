import { getLegalActions } from '../core/actions'
import { executeCommand } from '../core/commands'
import type { GameState } from '../core/types'
import type { AgentController } from './AgentController'

export function runBotPhase(state: GameState, controller: AgentController): GameState {
  let nextState = state

  for (const citizen of state.citizens) {
    if (citizen.controller !== 'basic-bot' || !citizen.alive) continue

    for (let step = 0; step < 64; step += 1) {
      const before = nextState
      const command = controller.decide(nextState, citizen.id)
      if (!command) break
      nextState = executeCommand(nextState, command).state
      if (nextState === before) break
    }
  }

  if (nextState.town.gateOpen) {
    const closer = nextState.citizens.find((citizen) =>
      citizen.controller === 'basic-bot' &&
      citizen.alive &&
      citizen.location.type === 'town' &&
      getLegalActions(nextState, citizen.id).some((action) => action.type === 'CLOSE_GATE'),
    )
    if (closer) {
      const close = getLegalActions(nextState, closer.id).find((action) => action.type === 'CLOSE_GATE')
      if (close) nextState = executeCommand(nextState, close).state
    }
  }

  return nextState
}
