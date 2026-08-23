import { workshopApDiscount } from './construction'
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
  logs_to_planks: { id: 'logs_to_planks', name: 'Cut Rotting Log into a Twisted Plank', input: 'rotten_log', inputCount: 1, output: 'twisted_plank', outputCount: 1, apCost: 3 },
  scrap_to_iron: { id: 'scrap_to_iron', name: 'Work Scrap Metal into Wrought Iron', input: 'scrap_metal', inputCount: 1, output: 'wrought_iron', outputCount: 1, apCost: 3 },
  repair_human_bone: { id: 'repair_human_bone', name: 'Repair Human Bone', input: 'broken_human_bone', inputCount: 1, output: 'human_bone', outputCount: 1, apCost: 3 },
  repair_penknife: { id: 'repair_penknife', name: 'Repair Pathetic Penknife', input: 'broken_pathetic_penknife', inputCount: 1, output: 'pathetic_penknife', outputCount: 1, apCost: 3 },
  repair_staff: { id: 'repair_staff', name: 'Repair Staff', input: 'broken_staff', inputCount: 1, output: 'staff', outputCount: 1, apCost: 3 },
  repair_serrated_knife: { id: 'repair_serrated_knife', name: 'Repair Serrated Knife', input: 'broken_serrated_knife', inputCount: 1, output: 'serrated_knife', outputCount: 1, apCost: 3 },
  repair_machete: { id: 'repair_machete', name: 'Repair Machete', input: 'broken_machete', inputCount: 1, output: 'machete', outputCount: 1, apCost: 3 },
}

export const WORKSHOP_RECIPE_ORDER: WorkshopRecipeId[] = ['logs_to_planks', 'scrap_to_iron', 'repair_human_bone', 'repair_penknife', 'repair_staff', 'repair_serrated_knife', 'repair_machete']

export function workshopRecipeApCost(state:GameState,recipeId:WorkshopRecipeId):number{
  return Math.max(1,WORKSHOP_RECIPES[recipeId].apCost-workshopApDiscount(state))
}

export function canRunWorkshopRecipe(state: GameState, recipeId: WorkshopRecipeId): boolean {
  if (!state.town.construction.workshop.completed) return false
  const recipe = WORKSHOP_RECIPES[recipeId]
  return (state.town.bank[recipe.input] ?? 0) >= recipe.inputCount
}
