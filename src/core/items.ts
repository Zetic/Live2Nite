import type { ConsumableKind, ItemType } from './types'

export type ItemCategory = 'raw' | 'construction' | 'consumable' | 'defense' | 'container' | 'misc'

export interface ItemDefinition {
  type: ItemType
  name: string
  purpose: string
  category: ItemCategory
  bankDefense?: number
  consumableKind?: ConsumableKind
  containerPool?: ItemType[]
}

export const ITEMS: Record<ItemType, ItemDefinition> = {
  rotten_log: { type: 'rotten_log', name: 'Rotten Log', purpose: 'Raw Workshop material. Two can be processed into one Twisted Plank for 3 AP.', category: 'raw' },
  scrap_metal: { type: 'scrap_metal', name: 'Scrap Metal', purpose: 'Raw Workshop material. Two can be processed into one Wrought Iron for 3 AP.', category: 'raw' },
  twisted_plank: { type: 'twisted_plank', name: 'Twisted Plank', purpose: 'Core construction material used by the Workshop, Watchtower, and later town projects.', category: 'construction' },
  wrought_iron: { type: 'wrought_iron', name: 'Wrought Iron', purpose: 'Core construction material used by the Workshop, Watchtower, and later town projects.', category: 'construction' },
  unshaped_concrete_block: { type: 'unshaped_concrete_block', name: 'Unshaped Concrete Block', purpose: 'Construction material required by the Workshop in the current historical ruleset.', category: 'construction' },
  water_ration: { type: 'water_ration', name: 'Water Ration', purpose: 'Drinking refreshes AP to 6/6 once per day. Thirst and dehydration consequences are deferred.', category: 'consumable', consumableKind: 'water' },
  food: { type: 'food', name: 'Moldy Ham Sandwich', purpose: 'Ordinary food. Eating refreshes AP to 6/6 once per day.', category: 'consumable', consumableKind: 'food' },
  old_door: { type: 'old_door', name: 'Old Door', purpose: 'Defensive object: contributes +2 town defense while deposited in the bank.', category: 'defense', bankDefense: 2 },
  doggy_bag: { type: 'doggy_bag', name: 'Doggy Bag', purpose: 'Starter food package. Open it to reveal one ordinary food item.', category: 'container', containerPool: ['food'] },
  citizen_welcome_pack: { type: 'citizen_welcome_pack', name: "Citizen's Welcome Pack", purpose: 'Starter package. This pass uses a small verified pool of common welcome-pack contents.', category: 'container', containerPool: ['battery', 'box_of_matches', 'pharmaceutical_products'] },
  battery: { type: 'battery', name: 'Battery', purpose: "A common component that can be found in a Citizen's Welcome Pack. Its recipes are deferred.", category: 'misc' },
  box_of_matches: { type: 'box_of_matches', name: 'Box of Matches', purpose: "A common utility item that can be found in a Citizen's Welcome Pack. Torch crafting is deferred.", category: 'misc' },
  pharmaceutical_products: { type: 'pharmaceutical_products', name: 'Pharmaceutical Products', purpose: "A pharmacy component that can be found in a Citizen's Welcome Pack. Drug crafting is deferred.", category: 'misc' },
}

export const ITEM_TYPES: ItemType[] = [
  'rotten_log', 'scrap_metal', 'twisted_plank', 'wrought_iron', 'unshaped_concrete_block',
  'water_ration', 'food', 'old_door', 'doggy_bag', 'citizen_welcome_pack', 'battery', 'box_of_matches', 'pharmaceutical_products',
]

// Distribution remains a Live2Nite prototype value. Starter packages are intentionally
// excluded from this generic pool until their World Beyond frequency is researched separately.
export const SCAVENGE_LOOT_POOL: ItemType[] = [
  'rotten_log', 'rotten_log', 'rotten_log', 'rotten_log',
  'scrap_metal', 'scrap_metal', 'scrap_metal', 'scrap_metal',
  'water_ration', 'water_ration', 'food', 'food', 'twisted_plank', 'wrought_iron', 'unshaped_concrete_block', 'old_door',
]

export function itemName(type: ItemType): string { return ITEMS[type].name }
export function itemPurpose(type: ItemType): string { return ITEMS[type].purpose }
export function bankDefenseFor(type: ItemType): number { return ITEMS[type].bankDefense ?? 0 }
export function consumableKind(type: ItemType): ConsumableKind | null { return ITEMS[type].consumableKind ?? null }
export function containerPool(type: ItemType): ItemType[] | null { return ITEMS[type].containerPool ?? null }
export function isContainer(type: ItemType): boolean { return Boolean(ITEMS[type].containerPool) }
