import type { ItemType } from './types'

export interface ItemDefinition {
  type: ItemType
  name: string
  purpose: string
  category: 'raw' | 'construction' | 'consumable' | 'defense'
  bankDefense?: number
}

export const ITEMS: Record<ItemType, ItemDefinition> = {
  rotten_log: { type: 'rotten_log', name: 'Rotten Log', purpose: 'Raw Workshop material. Two can be processed into one Twisted Plank for 3 AP.', category: 'raw' },
  scrap_metal: { type: 'scrap_metal', name: 'Scrap Metal', purpose: 'Raw Workshop material. Two can be processed into one Wrought Iron for 3 AP.', category: 'raw' },
  twisted_plank: { type: 'twisted_plank', name: 'Twisted Plank', purpose: 'Core construction material used by the Workshop, Watchtower, and later town projects.', category: 'construction' },
  wrought_iron: { type: 'wrought_iron', name: 'Wrought Iron', purpose: 'Core construction material used by the Workshop, Watchtower, and later town projects.', category: 'construction' },
  unshaped_concrete_block: { type: 'unshaped_concrete_block', name: 'Unshaped Concrete Block', purpose: 'Construction material required by the Workshop in the current historical ruleset.', category: 'construction' },
  water_ration: { type: 'water_ration', name: 'Water Ration', purpose: 'Consumable/AP and thirst systems are not implemented yet.', category: 'consumable' },
  food: { type: 'food', name: 'Food', purpose: 'Consumable/AP systems are not implemented yet.', category: 'consumable' },
  old_door: { type: 'old_door', name: 'Old Door', purpose: 'Defensive object: contributes +2 town defense while deposited in the bank.', category: 'defense', bankDefense: 2 },
}

export const ITEM_TYPES: ItemType[] = ['rotten_log','scrap_metal','twisted_plank','wrought_iron','unshaped_concrete_block','water_ration','food','old_door']

// Distribution remains a Live2Nite prototype value. Intact construction materials are rarer than raw material.
export const SCAVENGE_LOOT_POOL: ItemType[] = [
  'rotten_log','rotten_log','rotten_log','rotten_log',
  'scrap_metal','scrap_metal','scrap_metal','scrap_metal',
  'water_ration','water_ration','food','food','twisted_plank','wrought_iron','unshaped_concrete_block','old_door',
]

export function itemName(type: ItemType): string { return ITEMS[type].name }
export function itemPurpose(type: ItemType): string { return ITEMS[type].purpose }
export function bankDefenseFor(type: ItemType): number { return ITEMS[type].bankDefense ?? 0 }
