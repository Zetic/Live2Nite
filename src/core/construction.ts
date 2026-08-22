import type { ConstructionId, ConstructionProjectState, GameState, ItemType } from './types'

export interface ConstructionDefinition {
  id: ConstructionId
  name: string
  description: string
  apCost: number
  resources: Partial<Record<ItemType, number>>
  prerequisites: ConstructionId[]
  defenseBonus: number
  effectLabel?: string
  historicalCostConfidence: 'confirmed' | 'adapted'
}

export const CONSTRUCTIONS: Record<ConstructionId, ConstructionDefinition> = {
  workshop: { id: 'workshop', name: 'Workshop', description: 'Processes common scavenged material into construction-ready resources and repairs broken field weapons.', apCost: 25, resources: { twisted_plank: 10, wrought_iron: 8 }, prerequisites: [], defenseBonus: 0, effectLabel: 'Unlocks Workshop processing and repairs', historicalCostConfidence: 'confirmed' },
  watchtower: { id: 'watchtower', name: 'Watchtower', description: 'Estimates the incoming nightly horde so the town can judge how much defense it needs.', apCost: 12, resources: { twisted_plank: 3, wrought_iron: 2 }, prerequisites: [], defenseBonus: 3, effectLabel: 'Unlocks horde estimates and Search Tower', historicalCostConfidence: 'confirmed' },
  pump: { id: 'pump', name: 'Pump', description: 'Expands access to the town well and immediately adds ten rations.', apCost: 25, resources: { twisted_plank: 8, wrought_iron: 1 }, prerequisites: [], defenseBonus: 0, effectLabel: '+10 well water and a second daily ration withdrawal', historicalCostConfidence: 'adapted' },
  wall_upgrade: { id: 'wall_upgrade', name: 'Wall Upgrade V1', description: 'Reinforces the town perimeter and opens a defensive progression branch.', apCost: 30, resources: { twisted_plank: 6, wrought_iron: 4 }, prerequisites: [], defenseBonus: 7, effectLabel: '+7 shared town defense', historicalCostConfidence: 'adapted' },
  portal_lock: { id: 'portal_lock', name: 'Portal Lock', description: 'Secures the gate during the final pre-attack hour.', apCost: 16, resources: { wrought_iron: 2 }, prerequisites: [], defenseBonus: 2, effectLabel: 'Gate cannot be reopened at 23:00 once closed', historicalCostConfidence: 'adapted' },
  search_tower: { id: 'search_tower', name: 'Search Tower', description: 'Improves the chance that exhausted World Beyond zones become productive again after the nightly attack.', apCost: 30, resources: { twisted_plank: 3, wrought_iron: 1, battery: 1 }, prerequisites: ['watchtower'], defenseBonus: 0, effectLabel: '25% nightly chance to replenish each depleted zone', historicalCostConfidence: 'adapted' },
}

export const CONSTRUCTION_ORDER: ConstructionId[] = ['workshop', 'watchtower', 'pump', 'wall_upgrade', 'portal_lock', 'search_tower']

export function createConstructionState(): Record<ConstructionId, ConstructionProjectState> {
  return Object.fromEntries(CONSTRUCTION_ORDER.map((id) => [id, { id, apContributed: 0, completed: false }])) as Record<ConstructionId, ConstructionProjectState>
}

export function constructionUnlocked(state: GameState, projectId: ConstructionId): boolean {
  return CONSTRUCTIONS[projectId].prerequisites.every((id) => state.town.construction[id]?.completed)
}

export function hasRequiredMaterials(state: GameState, projectId: ConstructionId): boolean {
  if (!constructionUnlocked(state, projectId)) return false
  const definition = CONSTRUCTIONS[projectId]
  return Object.entries(definition.resources).every(([type, required]) => (state.town.bank[type as ItemType] ?? 0) >= (required ?? 0))
}

export function missingMaterials(state: GameState, projectId: ConstructionId): Partial<Record<ItemType, number>> {
  const definition = CONSTRUCTIONS[projectId]
  const missing: Partial<Record<ItemType, number>> = {}
  for (const [type, required] of Object.entries(definition.resources)) {
    const itemType = type as ItemType
    const count = Math.max(0, (required ?? 0) - (state.town.bank[itemType] ?? 0))
    if (count > 0) missing[itemType] = count
  }
  return missing
}

export function constructionPriority(state: GameState, projectId: ConstructionId): number {
  if (state.town.construction[projectId]?.completed || !constructionUnlocked(state, projectId)) return -1
  const living = Math.max(1, state.citizens.filter((citizen) => citizen.alive).length)
  const waterPerCitizen = state.town.well.water / living
  const depleted = Object.values(state.world.zones).filter((zone) => zone.discovered && zone.searchesRemaining === 0).length
  switch (projectId) {
    case 'workshop': return 100
    case 'pump': return waterPerCitizen < 1.5 ? 96 : waterPerCitizen < 2.5 ? 82 : 48
    case 'watchtower': return 78
    case 'wall_upgrade': return state.town.defense < 60 ? 84 : 58
    case 'portal_lock': return 64
    case 'search_tower': return 55 + Math.min(30, depleted * 2)
  }
}

export function prioritizedConstruction(state: GameState): ConstructionId[] {
  return CONSTRUCTION_ORDER.filter((id) => !state.town.construction[id]?.completed && constructionUnlocked(state, id)).sort((a,b) => constructionPriority(state,b) - constructionPriority(state,a))
}
