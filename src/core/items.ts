import type { ItemType } from './types'

export interface ItemDefinition {
  type: ItemType
  name: string
}

export const ITEMS: Record<ItemType, ItemDefinition> = {
  rotten_log: { type: 'rotten_log', name: 'Rotten Log' },
  scrap_metal: { type: 'scrap_metal', name: 'Scrap Metal' },
  water_ration: { type: 'water_ration', name: 'Water Ration' },
  food: { type: 'food', name: 'Food' },
}

export const ITEM_TYPES: ItemType[] = ['rotten_log', 'scrap_metal', 'water_ration', 'food']

export function itemName(type: ItemType): string {
  return ITEMS[type].name
}
