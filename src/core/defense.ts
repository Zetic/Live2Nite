import { bankDefenseMultiplier, constructionTownDefense, constructionTownDefenseMultiplier, homeContributionRatio } from './construction'
import { contributableHomeDefense } from './home'
import { bankDefenseFor } from './items'
import type { GameState, ItemType } from './types'

export function bankTownDefense(state:GameState):number{
  const raw=Object.entries(state.town.bank).reduce((sum,[type,count])=>sum+bankDefenseFor(type as ItemType)*(count??0),0)
  return Math.floor(raw*bankDefenseMultiplier(state))
}

/**
 * Historical Hordes-style home contribution: only structural/installed eligible home defense
 * contributes to the town. Loose defensive objects kept in private chests protect that citizen
 * during a breach but do not enter this pool. Circular Quarters can raise 40% to 80%.
 */
export function homeTownDefense(state:GameState):number{
  const raw=state.citizens
    .filter((citizen)=>citizen.alive&&citizen.location.type==='town')
    .reduce((total,citizen)=>total+contributableHomeDefense(citizen,state),0)
  return Math.floor(raw*homeContributionRatio(state))
}

/**
 * Shared defense is derived so construction effects and Bank objects are never counted twice.
 * `town.defense` is the small bootstrap/static base retained from the prototype.
 */
export function totalTownDefense(state: GameState): number {
  const beforeMultiplier=state.town.defense+bankTownDefense(state)+homeTownDefense(state)+constructionTownDefense(state)
  return Math.floor(beforeMultiplier*constructionTownDefenseMultiplier(state))
}
