import { getLegalActions } from '../core/actions'
import type { GameCommand, GameState } from '../core/types'
import { distanceToTown, zoneControl } from '../core/world'
import type { AgentController } from './AgentController'

function pick<T extends GameCommand['type']>(actions: GameCommand[], type: T): Extract<GameCommand, { type: T }> | null {
  return (actions.find((action) => action.type === type) as Extract<GameCommand, { type: T }> | undefined) ?? null
}

export class BasicBotController implements AgentController {
  readonly kind = 'basic-bot'

  decide(state: Readonly<GameState>, citizenId: string): GameCommand | null {
    const citizen = state.citizens.find((candidate) => candidate.id === citizenId)
    if (!citizen || !citizen.alive) return null

    const actions = getLegalActions(state as GameState, citizenId)
    if (actions.length === 0) return null

    if (citizen.location.type === 'town') {
      const deposit = pick(actions, 'DEPOSIT_ITEM')
      if (deposit) return deposit

      if (citizen.ap <= 1) return pick(actions, 'CLOSE_GATE')

      const open = pick(actions, 'OPEN_GATE')
      if (open) return open

      return pick(actions, 'EXIT_TOWN') ?? pick(actions, 'CLOSE_GATE')
    }

    const { x, y } = citizen.location
    const distance = distanceToTown(x, y)
    const control = zoneControl(state as GameState, x, y)

    const pickup = pick(actions, 'PICK_UP_ITEM')
    if (pickup) return pickup

    const search = pick(actions, 'SEARCH_ZONE')
    if (search) return search

    if (x === 0 && y === 0) {
      if (citizen.ap <= 1 || citizen.inventory.length >= citizen.inventoryCapacity) {
        return pick(actions, 'ENTER_TOWN')
      }
      return actions.find((action) => action.type === 'MOVE') ?? null
    }

    if (control.trapped) return null

    if (citizen.ap <= distance + 2 || citizen.inventory.length >= citizen.inventoryCapacity) {
      if (x > 0) return actions.find((action): action is Extract<GameCommand, { type: 'MOVE' }> => action.type === 'MOVE' && action.direction === 'WEST') ?? null
      if (x < 0) return actions.find((action): action is Extract<GameCommand, { type: 'MOVE' }> => action.type === 'MOVE' && action.direction === 'EAST') ?? null
      if (y > 0) return actions.find((action): action is Extract<GameCommand, { type: 'MOVE' }> => action.type === 'MOVE' && action.direction === 'SOUTH') ?? null
      if (y < 0) return actions.find((action): action is Extract<GameCommand, { type: 'MOVE' }> => action.type === 'MOVE' && action.direction === 'NORTH') ?? null
    }

    const preferredDirection = Number(citizen.id.slice(1)) % 4
    const order = preferredDirection === 0
      ? ['NORTH', 'EAST', 'SOUTH', 'WEST']
      : preferredDirection === 1
        ? ['EAST', 'SOUTH', 'WEST', 'NORTH']
        : preferredDirection === 2
          ? ['SOUTH', 'WEST', 'NORTH', 'EAST']
          : ['WEST', 'NORTH', 'EAST', 'SOUTH']

    for (const direction of order) {
      const move = actions.find((action): action is Extract<GameCommand, { type: 'MOVE' }> => action.type === 'MOVE' && action.direction === direction)
      if (move) return move
    }

    return pick(actions, 'ENTER_TOWN')
  }
}
