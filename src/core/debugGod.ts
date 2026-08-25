import type { Citizen, CitizenStatusState, GameState } from './types'

/** Debug-only AP sentinel used to model effectively infinite action points. */
export const DEBUG_GOD_AP=Number.MAX_SAFE_INTEGER

export type DebugGodCitizen=Citizen&{
  debugGod?:boolean
  debugGodBaseMaxAp?:number
}

export function isGodCitizen(citizen:Citizen):boolean{return Boolean((citizen as DebugGodCitizen).debugGod)}

export function clearGodProtectedStatus(status:CitizenStatusState):CitizenStatusState{
  return{
    ...status,
    hydration:'normal',
    desertStepsToday:0,
    wound:null,
    infected:false,
    terrorized:false,
    drugged:false,
    addicted:false,
    drunk:false,
    hangover:false,
    immune:false,
  }
}

export function enforceGodCitizen(citizen:Citizen):Citizen{
  if(!citizen.alive||!isGodCitizen(citizen))return citizen
  return{
    ...citizen,
    ap:DEBUG_GOD_AP,
    maxAp:DEBUG_GOD_AP,
    status:clearGodProtectedStatus(citizen.status),
  } as Citizen
}

/** Re-applies God-mode invariants after normal gameplay reducers have run. */
export function enforceGodMode(game:GameState):GameState{
  if(!game.citizens.some(isGodCitizen))return game
  return{...game,citizens:game.citizens.map(enforceGodCitizen)}
}
