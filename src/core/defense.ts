import { homeDefenseFor } from './items'
import type { GameState } from './types'

// The existing 40-point starting defense remains a Live2Nite bootstrap value until the
// broader original construction tree is implemented. This module separates that shared
// defense from the historically documented contribution of defensive objects kept at home.
export function homeObjectTownDefense(state: GameState): number {
  return state.citizens
    .filter((citizen) => citizen.alive && citizen.location.type === 'town')
    .reduce((total, citizen) => total + citizen.home.storage.reduce((sum, item) => sum + homeDefenseFor(item.type), 0), 0)
}

export function totalTownDefense(state: GameState): number {
  return state.town.defense + homeObjectTownDefense(state)
}
