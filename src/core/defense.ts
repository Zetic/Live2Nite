import { bankDefenseMultiplier, constructionTownDefense, constructionTownDefenseMultiplier, homeContributionRatio, homeDefenseBonus } from './construction'
import { homeDefenseFor, bankDefenseFor } from './items'
import type { GameState } from './types'

export function bankTownDefense(state:GameState):number{
  const raw=Object.entries(state.town.bank).reduce((sum,[type,count])=>sum+bankDefenseFor(type as keyof GameState['town']['bank'])*(count??0),0)
  return Math.floor(raw*bankDefenseMultiplier(state))
}

export function homeTownDefense(state:GameState):number{
  const bonus=homeDefenseBonus(state)
  const raw=state.citizens
    .filter((citizen)=>citizen.alive&&citizen.location.type==='town')
    .reduce((total,citizen)=>total+citizen.home.defense+bonus+citizen.home.storage.reduce((sum,item)=>sum+homeDefenseFor(item.type),0),0)
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
