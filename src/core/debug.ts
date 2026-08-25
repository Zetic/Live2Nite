import type { GameState } from './types'

/** Development-only state repair used by the compact debug controls. */
export function debugRefreshCitizen(game:GameState,citizenId:string):GameState{
  const citizen=game.citizens.find((candidate)=>candidate.id===citizenId)
  if(!citizen?.alive)return game
  return{
    ...game,
    citizens:game.citizens.map((candidate)=>candidate.id===citizenId?{
      ...candidate,
      ap:candidate.maxAp,
      status:{...candidate.status,hydration:'normal' as const,desertStepsToday:0},
    }:candidate),
  }
}
