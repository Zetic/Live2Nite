import { ACTION_COST } from '../core/commands'
import type { GameCommand, GameState } from '../core/types'
import type { AgentController } from './AgentController'

export class BasicBotController implements AgentController {
  readonly kind = 'basic-bot'

  decide(state: Readonly<GameState>, citizenId: string): GameCommand | null {
    const citizen = state.citizens.find((candidate) => candidate.id === citizenId)
    if (!citizen || !citizen.alive || citizen.ap < ACTION_COST) return null

    const aliveCount = state.citizens.filter((candidate) => candidate.alive).length
    const waterTarget = aliveCount * 2

    return state.town.water < waterTarget
      ? { type: 'GATHER_WATER', citizenId }
      : { type: 'WORK_DEFENSE', citizenId }
  }
}
