import { workingWeaponTypes } from '../../core/combat'
import { missingMaterials, prioritizedConstruction } from '../../core/construction'
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

function townWeaponCount(state: GameState): number {
  return workingWeaponTypes().reduce((sum, type) => sum + (state.town.bank[type] ?? 0), 0)
}

export function evaluateTownNeeds(state: GameState): TownNeeds {
  const livingCitizens = state.citizens.filter((citizen) => citizen.alive).length
  const activeProject = prioritizedConstruction(state)[0] ?? null
  const missingConstruction = activeProject ? missingMaterials(state, activeProject) : {}
  const primaryConstructionNeed = (Object.entries(missingConstruction)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0]?.[0] as ItemType | undefined) ?? null
  return {
    livingCitizens,
    activeProject,
    missingConstruction,
    primaryConstructionNeed,
    foodLow: (state.town.bank.food ?? 0) < Math.max(2, Math.ceil(livingCitizens / 8)),
    weaponsLow: townWeaponCount(state) < Math.max(3, Math.ceil(livingCitizens / 8)),
    waterPerCitizen: livingCitizens > 0 ? state.town.well.water / livingCitizens : 0,
  }
}
