import type { GameState, ItemType, WorkshopRecipeId } from './types'

export interface WorkshopRecipe {
  id: WorkshopRecipeId
  name: string
  input: ItemType
  inputCount: number
  output: ItemType
  outputCount: number
  apCost: number
}

export const WORKSHOP_RECIPES: Record<WorkshopRecipeId, WorkshopRecipe> = {
  logs_to_planks: { id: 'logs_to_planks', name: 'Cut Rotten Logs into a Twisted Plank', input: 'rotten_log', inputCount: 2, output: 'twisted_plank', outputCount: 1, apCost: 3 },
  scrap_to_iron: { id: 'scrap_to_iron', name: 'Work Scrap Metal into Wrought Iron', input: 'scrap_metal', inputCount: 2, output: 'wrought_iron', outputCount: 1, apCost: 3 },
}

export const WORKSHOP_RECIPE_ORDER: WorkshopRecipeId[] = ['logs_to_planks', 'scrap_to_iron']

export function canRunWorkshopRecipe(state: GameState, recipeId: WorkshopRecipeId): boolean {
  if (!state.town.construction.workshop.completed) return false
  const recipe = WORKSHOP_RECIPES[recipeId]
  return (state.town.bank[recipe.input] ?? 0) >= recipe.inputCount
}
