import { GATE_AP_COST, MOVE_AP_COST, getLegalActions } from './actions'
import { applyEvents } from './events'
import type { GameCommand, GameEvent, GameState, ItemInstance } from './types'
import { getZone, moveCoordinates, zoneKey } from './world'

export interface CommandResult {
  state: GameState
  events: GameEvent[]
}

export class InvalidCommandError extends Error {}

function sameCommand(left: GameCommand, right: GameCommand): boolean {
  if (left.type !== right.type || left.citizenId !== right.citizenId) return false
  if (left.type === 'MOVE' && right.type === 'MOVE') return left.direction === right.direction
  if (left.type === 'PICK_UP_ITEM' && right.type === 'PICK_UP_ITEM') return left.itemId === right.itemId
  if (left.type === 'DEPOSIT_ITEM' && right.type === 'DEPOSIT_ITEM') return left.itemId === right.itemId
  return true
}

function requireLegal(state: GameState, command: GameCommand): void {
  const legal = getLegalActions(state, command.citizenId)
  if (!legal.some((candidate) => sameCommand(candidate, command))) {
    throw new InvalidCommandError(`Illegal ${command.type} action for ${command.citizenId}`)
  }
}

function itemForSearch(state: GameState, zoneX: number, zoneY: number): ItemInstance | null {
  const zone = getZone(state.world, zoneX, zoneY)
  const type = zone?.hiddenLoot[0]
  return type ? { id: `i${String(state.nextItemId).padStart(6, '0')}`, type } : null
}

export function executeCommand(state: GameState, command: GameCommand): CommandResult {
  requireLegal(state, command)
  const citizen = state.citizens.find((candidate) => candidate.id === command.citizenId)!
  const events: GameEvent[] = []

  switch (command.type) {
    case 'OPEN_GATE':
      events.push(
        { type: 'AP_SPENT', day: state.day, citizenId: command.citizenId, amount: GATE_AP_COST },
        { type: 'GATE_SET', day: state.day, open: true, citizenId: command.citizenId },
      )
      break

    case 'CLOSE_GATE':
      events.push(
        { type: 'AP_SPENT', day: state.day, citizenId: command.citizenId, amount: GATE_AP_COST },
        { type: 'GATE_SET', day: state.day, open: false, citizenId: command.citizenId },
      )
      break

    case 'EXIT_TOWN':
      events.push({
        type: 'CITIZEN_LOCATION_CHANGED',
        day: state.day,
        citizenId: command.citizenId,
        location: { type: 'world', x: 0, y: 0 },
      })
      break

    case 'ENTER_TOWN':
      events.push({ type: 'CITIZEN_LOCATION_CHANGED', day: state.day, citizenId: command.citizenId, location: { type: 'town' } })
      break

    case 'MOVE': {
      if (citizen.location.type !== 'world') throw new InvalidCommandError('Citizen is not outside')
      const target = moveCoordinates(citizen.location.x, citizen.location.y, command.direction)
      const key = zoneKey(target.x, target.y)
      events.push(
        { type: 'AP_SPENT', day: state.day, citizenId: command.citizenId, amount: MOVE_AP_COST },
        {
          type: 'CITIZEN_LOCATION_CHANGED',
          day: state.day,
          citizenId: command.citizenId,
          location: { type: 'world', x: target.x, y: target.y },
        },
        { type: 'ZONE_DISCOVERED', day: state.day, zoneKey: key },
      )
      break
    }

    case 'SEARCH_ZONE': {
      if (citizen.location.type !== 'world') throw new InvalidCommandError('Citizen is not outside')
      const key = zoneKey(citizen.location.x, citizen.location.y)
      events.push({
        type: 'ZONE_SEARCHED',
        day: state.day,
        zoneKey: key,
        citizenId: command.citizenId,
        item: itemForSearch(state, citizen.location.x, citizen.location.y),
      })
      break
    }

    case 'PICK_UP_ITEM': {
      if (citizen.location.type !== 'world') throw new InvalidCommandError('Citizen is not outside')
      const key = zoneKey(citizen.location.x, citizen.location.y)
      const item = state.world.zones[key].groundItems.find((candidate) => candidate.id === command.itemId)!
      events.push({ type: 'ITEM_PICKED_UP', day: state.day, citizenId: command.citizenId, zoneKey: key, item })
      break
    }

    case 'DEPOSIT_ITEM': {
      const item = citizen.inventory.find((candidate) => candidate.id === command.itemId)!
      events.push({ type: 'ITEM_DEPOSITED', day: state.day, citizenId: command.citizenId, item })
      break
    }
  }

  return { state: applyEvents(state, events), events }
}
