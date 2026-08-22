import { getLegalActions } from '../core/actions'
import type { Citizen, Direction, GameCommand, GameState } from '../core/types'
import { distanceToTown, getZone, moveCoordinates, zoneControl } from '../core/world'
import type { AgentController } from './AgentController'

function pick<T extends GameCommand['type']>(actions: GameCommand[], type: T): Extract<GameCommand, { type: T }> | null {
  return (actions.find((action) => action.type === type) as Extract<GameCommand, { type: T }> | undefined) ?? null
}

function pickMove(actions: GameCommand[], direction: Direction): Extract<GameCommand, { type: 'MOVE' }> | null {
  return actions.find((action): action is Extract<GameCommand, { type: 'MOVE' }> =>
    action.type === 'MOVE' && action.direction === direction,
  ) ?? null
}

function findRescueTarget(state: GameState, citizenId: string): Citizen | null {
  const trapped = state.citizens.filter((candidate) =>
    candidate.id !== citizenId &&
    candidate.alive &&
    candidate.location.type === 'world' &&
    zoneControl(state, candidate.location.x, candidate.location.y).trapped,
  )

  return trapped.find((candidate) => candidate.controller === 'human') ?? trapped[0] ?? null
}

function isNeededAsAnchor(state: GameState, citizenId: string): boolean {
  const citizen = state.citizens.find((candidate) => candidate.id === citizenId)
  if (!citizen) return false
  const location = citizen.location
  if (location.type !== 'world') return false

  const companion = state.citizens.find((candidate) =>
    candidate.id !== citizenId &&
    candidate.alive &&
    candidate.location.type === 'world' &&
    candidate.location.x === location.x &&
    candidate.location.y === location.y,
  )
  if (!companion) return false

  const control = zoneControl(state, location.x, location.y)
  return control.zombiePoints > Math.max(0, control.humanPoints - 2)
}

function stepToward(actions: GameCommand[], fromX: number, fromY: number, targetX: number, targetY: number): GameCommand | null {
  if (targetX > fromX) return pickMove(actions, 'EAST')
  if (targetX < fromX) return pickMove(actions, 'WEST')
  if (targetY > fromY) return pickMove(actions, 'NORTH')
  if (targetY < fromY) return pickMove(actions, 'SOUTH')
  return null
}

function isSafeKnownMove(state: GameState, citizen: Citizen, action: Extract<GameCommand, { type: 'MOVE' }>): boolean {
  if (citizen.location.type !== 'world') return false
  const target = moveCoordinates(citizen.location.x, citizen.location.y, action.direction)
  const zone = getZone(state.world, target.x, target.y)
  if (!zone) return false
  if (!zone.discovered) return true

  const currentControl = zoneControl(state, target.x, target.y)
  return currentControl.zombiePoints <= currentControl.humanPoints + 2
}

export class BasicBotController implements AgentController {
  readonly kind = 'basic-bot'

  decide(state: Readonly<GameState>, citizenId: string): GameCommand | null {
    const game = state as GameState
    const citizen = game.citizens.find((candidate) => candidate.id === citizenId)
    if (!citizen || !citizen.alive) return null

    const actions = getLegalActions(game, citizenId)
    if (actions.length === 0) return null

    const rescueTarget = findRescueTarget(game, citizenId)

    if (citizen.location.type === 'town') {
      const deposit = pick(actions, 'DEPOSIT_ITEM')
      if (deposit) return deposit

      if (rescueTarget?.location.type === 'world') {
        const rescueDistance = distanceToTown(rescueTarget.location.x, rescueTarget.location.y)
        const gateCost = game.town.gateOpen ? 0 : 1
        if (citizen.ap >= rescueDistance + gateCost) {
          const open = pick(actions, 'OPEN_GATE')
          if (open) return open
          const exit = pick(actions, 'EXIT_TOWN')
          if (exit) return exit
        }
      }

      if (citizen.ap <= 1) return pick(actions, 'CLOSE_GATE')

      const open = pick(actions, 'OPEN_GATE')
      if (open) return open

      return pick(actions, 'EXIT_TOWN') ?? pick(actions, 'CLOSE_GATE')
    }

    const { x, y } = citizen.location
    const distance = distanceToTown(x, y)
    const control = zoneControl(game, x, y)

    if (isNeededAsAnchor(game, citizenId)) return null

    if (rescueTarget?.location.type === 'world') {
      const rescueDistance = Math.abs(rescueTarget.location.x - x) + Math.abs(rescueTarget.location.y - y)
      if (rescueDistance > 0 && citizen.ap >= rescueDistance) {
        const rescueStep = stepToward(actions, x, y, rescueTarget.location.x, rescueTarget.location.y)
        if (rescueStep) return rescueStep
      }
    }

    const pickup = pick(actions, 'PICK_UP_ITEM')
    if (pickup) return pickup

    const search = pick(actions, 'SEARCH_ZONE')
    if (search) return search

    if (x === 0 && y === 0) {
      if (citizen.ap <= 1 || citizen.inventory.length >= citizen.inventoryCapacity) {
        return pick(actions, 'ENTER_TOWN')
      }
      const safeMove = actions.find((action): action is Extract<GameCommand, { type: 'MOVE' }> =>
        action.type === 'MOVE' && isSafeKnownMove(game, citizen, action),
      )
      return safeMove ?? pick(actions, 'ENTER_TOWN')
    }

    if (control.trapped) return null

    if (citizen.ap <= distance + 2 || citizen.inventory.length >= citizen.inventoryCapacity) {
      if (x > 0) return pickMove(actions, 'WEST')
      if (x < 0) return pickMove(actions, 'EAST')
      if (y > 0) return pickMove(actions, 'SOUTH')
      if (y < 0) return pickMove(actions, 'NORTH')
    }

    const preferredDirection = Number(citizen.id.slice(1)) % 4
    const order: Direction[] = preferredDirection === 0
      ? ['NORTH', 'EAST', 'SOUTH', 'WEST']
      : preferredDirection === 1
        ? ['EAST', 'SOUTH', 'WEST', 'NORTH']
        : preferredDirection === 2
          ? ['SOUTH', 'WEST', 'NORTH', 'EAST']
          : ['WEST', 'NORTH', 'EAST', 'SOUTH']

    for (const direction of order) {
      const move = pickMove(actions, direction)
      if (move && isSafeKnownMove(game, citizen, move)) return move
    }

    return pick(actions, 'ENTER_TOWN')
  }
}
