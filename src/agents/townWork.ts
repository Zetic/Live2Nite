import { CONSTRUCTIONS } from '../core/construction'
import type { Citizen, GameCommand, GameState } from '../core/types'

function constructionAction(actions: GameCommand[], projectId: 'workshop' | 'watchtower'): GameCommand | null {
  return actions.find((action) => action.type === 'CONTRIBUTE_CONSTRUCTION' && action.projectId === projectId) ?? null
}
function recipeAction(actions: GameCommand[], recipeId: 'logs_to_planks' | 'scrap_to_iron'): GameCommand | null {
  return actions.find((action) => action.type === 'WORKSHOP_CONVERT' && action.recipeId === recipeId) ?? null
}

export function chooseTownWork(state: GameState, citizen: Citizen, actions: GameCommand[]): GameCommand | null {
  if (citizen.location.type !== 'town') return null
  const workshop = state.town.construction.workshop
  const watchtower = state.town.construction.watchtower
  if (!workshop.completed) {
    const buildWorkshop = constructionAction(actions, 'workshop')
    if (buildWorkshop) return buildWorkshop
    const buildWatchtower = constructionAction(actions, 'watchtower')
    if (buildWatchtower) return buildWatchtower
    return null
  }
  if (!watchtower.completed) {
    const buildWatchtower = constructionAction(actions, 'watchtower')
    if (buildWatchtower) return buildWatchtower
    const target = CONSTRUCTIONS.watchtower.resources
    const plankNeed = Math.max(0, (target.twisted_plank ?? 0) - (state.town.bank.twisted_plank ?? 0))
    const ironNeed = Math.max(0, (target.wrought_iron ?? 0) - (state.town.bank.wrought_iron ?? 0))
    if (plankNeed > 0) { const action = recipeAction(actions, 'logs_to_planks'); if (action) return action }
    if (ironNeed > 0) { const action = recipeAction(actions, 'scrap_to_iron'); if (action) return action }
  }
  return null
}
