import { enterRuin, type RuinActionResult } from './ruinExploration'
import { scoutCamouflageActive } from './scout'
import type { GameState } from './types'
import { zoneControlState, zoneKey } from './world'

/**
 * Source-backed Scout exception for explorable-ruin entry. Camouflage does not grant real
 * zone control; a synthetic temporary-control window is used only while the existing ruin
 * entry validator runs, then removed from the returned state.
 */
export function enterRuinWithScout(game:GameState,citizenId:string,nowMs=Date.now()):RuinActionResult{
  const citizen=game.citizens.find((candidate)=>candidate.id===citizenId)
  if(!citizen||citizen.location.type!=='world'||!scoutCamouflageActive(citizen)||zoneControlState(game,citizen.location.x,citizen.location.y,citizenId)!=='trapped')return enterRuin(game,citizenId,nowMs)
  const key=zoneKey(citizen.location.x,citizen.location.y)
  const staged:GameState={...game,citizens:game.citizens.map((candidate)=>candidate.id===citizenId?{...candidate,temporaryControl:{zoneKey:key,grantedDay:game.day,grantedHour:game.clock.hour}}:candidate)}
  const result=enterRuin(staged,citizenId,nowMs)
  return{...result,state:{...result.state,citizens:result.state.citizens.map((candidate)=>candidate.id===citizenId?{...candidate,temporaryControl:null}:candidate)}}
}
