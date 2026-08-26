import { bankDefenseMultiplier, constructionTownDefense, constructionTownDefenseMultiplier, homeContributionRatio } from './construction'
import { totalConstructionUpgradeDefenseBonus } from './constructionUpgrades'
import { contributableHomeDefense } from './home'
import { bankDefenseFor } from './items'
import { guardianTownDefenseBonus } from './professions'
import type { GameState } from './types'
import { waterTurretUpgradeDefenseBonus } from './waterEconomy'

export function bankTownDefense(state:GameState):number{
  const raw=state.town.bank.reduce((sum,item)=>sum+bankDefenseFor(item.type),0)
  return Math.floor(raw*bankDefenseMultiplier(state))
}
export function homeTownDefense(state:GameState):number{
  const raw=state.citizens.filter((citizen)=>citizen.alive&&citizen.location.type==='town').reduce((total,citizen)=>total+contributableHomeDefense(citizen,state),0)
  return Math.floor(raw*homeContributionRatio(state))
}
export function totalTownDefense(state:GameState):number{
  const beforeMultiplier=state.town.defense+bankTownDefense(state)+homeTownDefense(state)+constructionTownDefense(state)+totalConstructionUpgradeDefenseBonus(state)+waterTurretUpgradeDefenseBonus(state)+guardianTownDefenseBonus(state)
  return Math.floor(beforeMultiplier*constructionTownDefenseMultiplier(state))
}
