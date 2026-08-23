import { weaponDefinition } from '../../core/combat'
import type { Citizen, GameCommand, GameState } from '../../core/types'
import { nextDirectionToward } from '../planning/RoutePlanner'
import { itemAction, pick } from './actionSelectors'

export function stepTowardTown(state: GameState, citizen: Citizen, actions: GameCommand[]): GameCommand | null {
  if (citizen.location.type !== 'world') return null
  if (citizen.location.x === 0 && citizen.location.y === 0) return pick(actions, 'ENTER_TOWN')
  const direction = nextDirectionToward(state, { x: citizen.location.x, y: citizen.location.y }, { x: 0, y: 0 })
  return direction
    ? actions.find((action) => action.type === 'MOVE' && action.direction === direction) ?? null
    : null
}

export function bestWeaponAction(citizen: Citizen, actions: GameCommand[]): GameCommand | null {
  const options = citizen.inventory
    .map((item) => ({ item, definition: weaponDefinition(item.type) }))
    .filter((candidate) => candidate.definition)
    .sort((a, b) =>
      (b.definition!.killChancePercent * b.definition!.maxKills)
      - (a.definition!.killChancePercent * a.definition!.maxKills))

  for (const option of options) {
    const action = itemAction(actions, 'USE_WEAPON', option.item.id)
    if (action) return action
  }
  return null
}
