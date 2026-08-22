import { CONSTRUCTION_ORDER, missingMaterials } from '../../core/construction'
import type { ConstructionId, GameState, ItemType } from '../../core/types'

export interface TownNeeds {
  livingCitizens: number
  activeProject: ConstructionId | null
  missingConstruction: Partial<Record<ItemType, number>>
  primaryConstructionNeed: ItemType | null
  foodLow: boolean
  weaponsLow: boolean
  waterPerCitizen: number
}

export function evaluateTownNeeds(state: GameState): TownNeeds {
  const livingCitizens = state.citizens.filter((citizen) => citizen.alive).length
  const activeProject = CONSTRUCTION_ORDER.find((id) => !state.town.construction[id].completed) ?? null
  const missingConstruction = activeProject ? missingMaterials(state,activeProject) : {}
  const primaryConstructionNeed = Object.entries(missingConstruction).sort((a,b)=>(b[1]??0)-(a[1]??0))[0]?.[0] as ItemType | undefined ?? null
  return {
    livingCitizens,
    activeProject,
    missingConstruction,
    primaryConstructionNeed,
    foodLow: (state.town.bank.food ?? 0) < Math.max(2,Math.ceil(livingCitizens/8)),
    weaponsLow: (state.town.bank.water_bomb ?? 0) < Math.max(1,Math.ceil(livingCitizens/12)),
    waterPerCitizen: livingCitizens > 0 ? state.town.well.water / livingCitizens : 0,
  }
}
