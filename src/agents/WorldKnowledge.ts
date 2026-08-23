import type { GameState, SpecialSiteState, ZoneIntelFreshness } from '../core/types'
import { getZone, zoneKey } from '../core/world'

export interface AgentZoneKnowledge {
  x: number
  y: number
  discovered: boolean
  zombies: number | null
  freshness: ZoneIntelFreshness
  lastObservedDay: number | null
  lastObservedHour: number | null
  searchesRemaining: number | null
  specialSite: SpecialSiteState | undefined
}

export interface AgentWorldKnowledge {
  zone(x: number, y: number): AgentZoneKnowledge | null
}

function freshnessFor(state:GameState,x:number,y:number):ZoneIntelFreshness{
  const intel=state.world.intel?.[zoneKey(x,y)]
  if(intel?.observedZombies===null||intel?.observedZombies===undefined||intel.lastObservedDay===null)return'unknown'
  return intel.lastObservedDay===state.day?'fresh':'stale'
}

export function createAgentWorldKnowledge(state: GameState): AgentWorldKnowledge {
  return {
    zone(x: number, y: number): AgentZoneKnowledge | null {
      const zone = getZone(state.world, x, y)
      if (!zone) return null
      const intel=state.world.intel?.[zoneKey(x,y)]
      if (!zone.discovered) {
        return {
          x: zone.x,
          y: zone.y,
          discovered: false,
          zombies: null,
          freshness:'unknown',
          lastObservedDay:null,
          lastObservedHour:null,
          searchesRemaining: null,
          specialSite: undefined,
        }
      }
      return {
        x: zone.x,
        y: zone.y,
        discovered: true,
        zombies: intel?.observedZombies ?? null,
        freshness:freshnessFor(state,x,y),
        lastObservedDay:intel?.lastObservedDay??null,
        lastObservedHour:intel?.lastObservedHour??null,
        searchesRemaining: zone.searchesRemaining,
        specialSite: zone.specialSite,
      }
    },
  }
}

export function knownZombieCount(state: GameState, x: number, y: number): number | null {
  return createAgentWorldKnowledge(state).zone(x, y)?.zombies ?? null
}

export function freshZombieCount(state:GameState,x:number,y:number):number|null{
  const knowledge=createAgentWorldKnowledge(state).zone(x,y)
  return knowledge?.freshness==='fresh'?knowledge.zombies:null
}

export function zoneIntelFreshness(state:GameState,x:number,y:number):ZoneIntelFreshness{
  return createAgentWorldKnowledge(state).zone(x,y)?.freshness??'unknown'
}

export function hasFreshZoneIntel(state:GameState,x:number,y:number):boolean{
  return zoneIntelFreshness(state,x,y)==='fresh'
}
