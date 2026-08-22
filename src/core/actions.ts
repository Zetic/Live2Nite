import type { GameCommand, GameState } from './types'
import { getZone, isTownGateZone, moveCoordinates, zoneControl } from './world'

export const GATE_AP_COST = 1
export const MOVE_AP_COST = 1

export function getLegalActions(state: GameState, citizenId: string): GameCommand[] {
  const citizen = state.citizens.find((candidate) => candidate.id === citizenId)
  if (!citizen || !citizen.alive) return []

  const actions: GameCommand[] = []

  if (citizen.location.type === 'town') {
    for (const item of citizen.inventory) {
      actions.push({ type: 'DEPOSIT_ITEM', citizenId, itemId: item.id })
    }

    if (state.town.gateOpen) {
      if (citizen.ap >= GATE_AP_COST) actions.push({ type: 'CLOSE_GATE', citizenId })
      actions.push({ type: 'EXIT_TOWN', citizenId })
    } else if (citizen.ap >= GATE_AP_COST) {
      actions.push({ type: 'OPEN_GATE', citizenId })
    }

    return actions
  }

  const { x, y } = citizen.location
  const zone = getZone(state.world, x, y)
  if (!zone) return actions

  if (isTownGateZone(x, y) && state.town.gateOpen) {
    actions.push({ type: 'ENTER_TOWN', citizenId })
  }

  if (!zone.searchedBy.includes(citizenId) && zone.searchesRemaining > 0 && !isTownGateZone(x, y)) {
    actions.push({ type: 'SEARCH_ZONE', citizenId })
  }

  if (citizen.inventory.length < citizen.inventoryCapacity) {
    for (const item of zone.groundItems) {
      actions.push({ type: 'PICK_UP_ITEM', citizenId, itemId: item.id })
    }
  }

  const control = zoneControl(state, x, y)
  if (!control.trapped && citizen.ap >= MOVE_AP_COST) {
    for (const direction of ['NORTH', 'SOUTH', 'EAST', 'WEST'] as const) {
      const target = moveCoordinates(x, y, direction)
      if (getZone(state.world, target.x, target.y)) {
        actions.push({ type: 'MOVE', citizenId, direction })
      }
    }
  }

  return actions
}
