import type { GameState, SpecialSiteState } from '../core/types'
import { getZone } from '../core/world'

export interface AgentZoneKnowledge {
  x: number
  y: number
  discovered: boolean
  zombies: number | null
  searchesRemaining: number | null
  specialSite: SpecialSiteState | undefined
}

export interface AgentWorldKnowledge {
  zone(x: number, y: number): AgentZoneKnowledge | null
}

export function createAgentWorldKnowledge(state: GameState): AgentWorldKnowledge {
  return {
    zone(x: number, y: number): AgentZoneKnowledge | null {
      const zone = getZone(state.world, x, y)
      if (!zone) return null
      if (!zone.discovered) {
        return {
          x: zone.x,
          y: zone.y,
          discovered: false,
          zombies: null,
          searchesRemaining: null,
          specialSite: undefined,
        }
      }
      return {
        x: zone.x,
        y: zone.y,
        discovered: true,
        zombies: zone.zombies,
        searchesRemaining: zone.searchesRemaining,
        specialSite: zone.specialSite,
      }
    },
  }
}

export function knownZombieCount(state: GameState, x: number, y: number): number | null {
  return createAgentWorldKnowledge(state).zone(x, y)?.zombies ?? null
}
