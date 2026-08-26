import { scoutZombieEstimate } from '../core/scout'
import type { GameState, SpecialSiteState, ZoneIntelFreshness } from '../core/types'
import { getZone, zoneKey } from '../core/world'

export type AgentZombieIntelKind='none'|'observed'|'map_estimate'|'scout_estimate'
export interface AgentZoneKnowledge {
  x: number
  y: number
  discovered: boolean
  zombies: number | null
  zombieIntel:AgentZombieIntelKind
  freshness: ZoneIntelFreshness
  lastObservedDay: number | null
  lastObservedHour: number | null
  searchesRemaining: number | null
  specialSite: SpecialSiteState | undefined
}

export interface AgentWorldKnowledge {
  viewerCitizenId:string|null
  zone(x: number, y: number): AgentZoneKnowledge | null
}

function freshnessFor(state:GameState,x:number,y:number):ZoneIntelFreshness{
  const intel=state.world.intel?.[zoneKey(x,y)]
  if(intel?.observedZombies===null||intel?.observedZombies===undefined||intel.lastObservedDay===null)return'unknown'
  return intel.lastObservedDay===state.day?'fresh':'stale'
}

/**
 * Citizen-aware world knowledge remains a projection of legal information, never raw world state.
 * A Scout viewer may receive the current bounded adjacent-zone estimate supplied by Scout sense;
 * Observation Platform can also supply a coarse nightly map estimate until Upgraded Map exists.
 */
export function createAgentWorldKnowledge(state: GameState,viewerCitizenId?:string): AgentWorldKnowledge {
  const viewer=viewerCitizenId?state.citizens.find((citizen)=>citizen.id===viewerCitizenId)??null:null
  return {
    viewerCitizenId:viewer?.id??null,
    zone(x: number, y: number): AgentZoneKnowledge | null {
      const zone = getZone(state.world, x, y)
      if (!zone) return null
      const intel=state.world.intel?.[zoneKey(x,y)]
      const freshness=freshnessFor(state,x,y)
      const estimate=viewer?scoutZombieEstimate(state,viewer,zone):null
      const currentObservation=freshness==='fresh'&&intel?.observedZombies!==null&&intel?.observedZombies!==undefined
      const mapEstimate=currentObservation&&intel?.lastObservedHour===-1
      const zombies=currentObservation?intel!.observedZombies:estimate!==null?estimate:intel?.observedZombies??null
      const zombieIntel:AgentZombieIntelKind=currentObservation?(mapEstimate?'map_estimate':'observed'):estimate!==null?'scout_estimate':zombies!==null?(intel?.lastObservedHour===-1?'map_estimate':'observed'):'none'
      const effectiveFreshness:ZoneIntelFreshness=estimate!==null&&!currentObservation?'fresh':freshness
      const lastObservedDay=zombieIntel==='scout_estimate'?null:intel?.lastObservedDay??null
      const lastObservedHour=zombieIntel==='scout_estimate'?null:intel?.lastObservedHour??null
      if (!zone.discovered) {
        return {
          x: zone.x,
          y: zone.y,
          discovered: false,
          zombies: estimate,
          zombieIntel:estimate===null?'none':'scout_estimate',
          freshness:estimate===null?'unknown':'fresh',
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
        zombies,
        zombieIntel,
        freshness:effectiveFreshness,
        lastObservedDay,
        lastObservedHour,
        searchesRemaining: zone.searchesRemaining,
        specialSite: zone.specialSite,
      }
    },
  }
}

export function knownZombieCount(state: GameState, x: number, y: number,viewerCitizenId?:string): number | null {
  return createAgentWorldKnowledge(state,viewerCitizenId).zone(x, y)?.zombies ?? null
}

export function freshZombieCount(state:GameState,x:number,y:number,viewerCitizenId?:string):number|null{
  const knowledge=createAgentWorldKnowledge(state,viewerCitizenId).zone(x,y)
  return knowledge?.freshness==='fresh'?knowledge.zombies:null
}

export function zoneIntelFreshness(state:GameState,x:number,y:number,viewerCitizenId?:string):ZoneIntelFreshness{
  return createAgentWorldKnowledge(state,viewerCitizenId).zone(x,y)?.freshness??'unknown'
}

export function hasFreshZoneIntel(state:GameState,x:number,y:number,viewerCitizenId?:string):boolean{
  return zoneIntelFreshness(state,x,y,viewerCitizenId)==='fresh'
}
