import { CONSTRUCTION_ORDER, hasRequiredMaterials } from './construction'
import { consumableKind, isContainer } from './items'
import type { Citizen, GameCommand, GameState, ItemInstance, ItemType } from './types'
import { getZone, isTownGateZone, moveCoordinates, zoneControl } from './world'
import { WORKSHOP_RECIPE_ORDER, WORKSHOP_RECIPES, canRunWorkshopRecipe } from './workshop'

export const GATE_AP_COST = 1
export const MOVE_AP_COST = 1
export const CONSTRUCTION_AP_COST = 1

function addConsumableActions(actions: GameCommand[], citizen: Citizen, items: ItemInstance[]): void {
  for (const item of items) {
    const kind = consumableKind(item.type)
    if (kind === 'food' && !citizen.daily.ate) actions.push({ type: 'EAT_ITEM', citizenId: citizen.id, itemId: item.id })
    if (kind === 'water' && !citizen.daily.drank) actions.push({ type: 'DRINK_ITEM', citizenId: citizen.id, itemId: item.id })
    if (isContainer(item.type)) actions.push({ type: 'OPEN_CONTAINER', citizenId: citizen.id, itemId: item.id })
  }
}

export function getLegalActions(state: GameState, citizenId: string): GameCommand[] {
  const citizen = state.citizens.find((candidate) => candidate.id === citizenId)
  if (!citizen || !citizen.alive) return []
  const actions: GameCommand[] = []

  addConsumableActions(actions, citizen, citizen.inventory)

  if (citizen.location.type === 'town') {
    addConsumableActions(actions, citizen, citizen.home.storage)

    for (const item of citizen.inventory) {
      actions.push({ type: 'DEPOSIT_ITEM', citizenId, itemId: item.id })
      if (citizen.home.storage.length < citizen.home.storageCapacity) actions.push({ type: 'MOVE_ITEM_TO_HOME', citizenId, itemId: item.id })
    }
    if (citizen.inventory.length < citizen.inventoryCapacity) {
      for (const item of citizen.home.storage) actions.push({ type: 'MOVE_ITEM_TO_RUCKSACK', citizenId, itemId: item.id })
      for (const [itemType, count] of Object.entries(state.town.bank)) {
        if ((count ?? 0) > 0) actions.push({ type: 'WITHDRAW_BANK_ITEM', citizenId, itemType: itemType as ItemType })
      }
      if (!citizen.daily.waterTaken && state.town.well.water > 0) actions.push({ type: 'TAKE_WATER', citizenId })
    }

    if (citizen.ap >= CONSTRUCTION_AP_COST) {
      for (const projectId of CONSTRUCTION_ORDER) {
        const project = state.town.construction[projectId]
        if (!project.completed && hasRequiredMaterials(state, projectId)) actions.push({ type: 'CONTRIBUTE_CONSTRUCTION', citizenId, projectId })
      }
    }
    if (state.town.construction.workshop.completed) {
      for (const recipeId of WORKSHOP_RECIPE_ORDER) {
        const recipe = WORKSHOP_RECIPES[recipeId]
        if (citizen.ap >= recipe.apCost && canRunWorkshopRecipe(state, recipeId)) actions.push({ type: 'WORKSHOP_CONVERT', citizenId, recipeId })
      }
    }
    if (state.town.gateOpen) {
      if (citizen.ap >= GATE_AP_COST) actions.push({ type: 'CLOSE_GATE', citizenId })
      actions.push({ type: 'EXIT_TOWN', citizenId })
    } else if (citizen.ap >= GATE_AP_COST) actions.push({ type: 'OPEN_GATE', citizenId })
    return actions
  }

  const { x, y } = citizen.location
  const zone = getZone(state.world, x, y)
  if (!zone) return actions
  if (isTownGateZone(x, y) && state.town.gateOpen) actions.push({ type: 'ENTER_TOWN', citizenId })
  if (!isTownGateZone(x, y)) {
    if (zone.searchesRemaining > 0 && !zone.searchedBy.includes(citizenId)) {
      actions.push({ type: 'SEARCH_ZONE', citizenId })
    } else if (zone.searchesRemaining === 0 && !(zone.depletedSearchedBy ?? []).includes(citizenId)) {
      actions.push({ type: 'SEARCH_ZONE', citizenId })
    }
  }
  if (citizen.inventory.length < citizen.inventoryCapacity) {
    for (const item of zone.groundItems) actions.push({ type: 'PICK_UP_ITEM', citizenId, itemId: item.id })
  }
  const control = zoneControl(state, x, y)
  if (!control.trapped && citizen.ap >= MOVE_AP_COST) {
    for (const direction of ['NORTH', 'SOUTH', 'EAST', 'WEST'] as const) {
      const target = moveCoordinates(x, y, direction)
      if (getZone(state.world, target.x, target.y)) actions.push({ type: 'MOVE', citizenId, direction })
    }
  }
  return actions
}
