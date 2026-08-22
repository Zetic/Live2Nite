import type { ConstructionId, ConstructionProjectState, GameState, ItemType } from './types'

export interface ConstructionDefinition {
  id: ConstructionId
  name: string
  description: string
  apCost: number
  resources: Partial<Record<ItemType, number>>
  defenseBonus: number
}

export const CONSTRUCTIONS: Record<ConstructionId, ConstructionDefinition> = {
  workshop: { id: 'workshop', name: 'Workshop', description: 'Processes common scavenged material into the basic resources needed for advanced construction.', apCost: 25, resources: { twisted_plank: 10, wrought_iron: 8, unshaped_concrete_block: 1 }, defenseBonus: 0 },
  watchtower: { id: 'watchtower', name: 'Watchtower', description: 'Estimates the incoming nightly horde so the town can judge how much defense it needs.', apCost: 12, resources: { twisted_plank: 3, wrought_iron: 2 }, defenseBonus: 3 },
}

export const CONSTRUCTION_ORDER: ConstructionId[] = ['workshop', 'watchtower']

export function createConstructionState(): Record<ConstructionId, ConstructionProjectState> {
  return { workshop: { id: 'workshop', apContributed: 0, completed: false }, watchtower: { id: 'watchtower', apContributed: 0, completed: false } }
}

export function hasRequiredMaterials(state: GameState, projectId: ConstructionId): boolean {
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
