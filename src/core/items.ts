import type { ItemType } from './types'

export interface ItemDefinition {
  type: ItemType
  name: string
  purpose: string
  bankDefense?: number
}

export const ITEMS: Record<ItemType, ItemDefinition> = {
  rotten_log: {
    type: 'rotten_log',
    name: 'Rotten Log',
    purpose: 'Workshop material: converts to a Twisted Plank once the Workshop exists.',
  },
  scrap_metal: {
    type: 'scrap_metal',
    name: 'Scrap Metal',
    purpose: 'Workshop material: converts to Wrought Iron once the Workshop exists.',
  },
  water_ration: {
    type: 'water_ration',
    name: 'Water Ration',
    purpose: 'Consumable/AP and thirst systems are not implemented yet.',
  },
  food: {
    type: 'food',
    name: 'Food',
    purpose: 'Consumable/AP systems are not implemented yet.',
  },
  old_door: {
    type: 'old_door',
    name: 'Old Door',
    purpose: 'Defensive object: contributes +2 town defense while deposited in the bank.',
    bankDefense: 2,
  },
}

export const ITEM_TYPES: ItemType[] = ['rotten_log', 'scrap_metal', 'water_ration', 'food', 'old_door']

export function itemName(type: ItemType): string {
  return ITEMS[type].name
}

export function itemPurpose(type: ItemType): string {
  return ITEMS[type].purpose
}

export function bankDefenseFor(type: ItemType): number {
  return ITEMS[type].bankDefense ?? 0
}
