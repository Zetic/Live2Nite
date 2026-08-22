import type { ConsumableKind, ItemType } from './types'

export type ItemCategory = 'raw' | 'construction' | 'consumable' | 'defense' | 'container' | 'weapon' | 'broken_weapon' | 'misc'

export interface ItemDefinition {
  type: ItemType
  name: string
  purpose: string
  category: ItemCategory
  bankDefense?: number
  homeDefense?: number
  consumableKind?: ConsumableKind
  containerPool?: ItemType[]
}

export const ITEMS: Record<ItemType, ItemDefinition> = {
  rotten_log: { type: 'rotten_log', name: 'Rotting Log', purpose: 'Low-grade resource from depleted zones. It can be processed into a Twisted Plank at the Workshop.', category: 'raw' },
  scrap_metal: { type: 'scrap_metal', name: 'Scrap Metal', purpose: 'Low-grade resource from depleted zones. It can be processed into Wrought Iron at the Workshop.', category: 'raw' },
  twisted_plank: { type: 'twisted_plank', name: 'Twisted Plank', purpose: 'Construction-ready wood used by town projects.', category: 'construction' },
  wrought_iron: { type: 'wrought_iron', name: 'Wrought Iron', purpose: 'Construction-ready metal used by town projects.', category: 'construction' },
  unshaped_concrete_block: { type: 'unshaped_concrete_block', name: 'Unshaped Concrete Block', purpose: 'Heavy construction material used by later projects; no longer required for the base Workshop.', category: 'construction' },
  construction_kit: { type: 'construction_kit', name: 'Construction Kit', purpose: 'Open in town to recover two construction-ready materials: Twisted Planks and/or Wrought Iron.', category: 'container' },
  water_ration: { type: 'water_ration', name: 'Water Ration', purpose: 'Drinking refreshes AP to 6/6 once per day. Thirst and dehydration consequences are deferred.', category: 'consumable', consumableKind: 'water' },
  food: { type: 'food', name: 'Moldy Ham Sandwich', purpose: 'Ordinary food. Eating refreshes AP to 6/6 once per day.', category: 'consumable', consumableKind: 'food' },
  old_door: { type: 'old_door', name: 'Old Door', purpose: 'Defensive object: +2 town defense in the Bank, or +1 personal defense when stored at Home.', category: 'defense', bankDefense: 2, homeDefense: 1 },
  water_bomb: { type: 'water_bomb', name: 'Water Bomb', purpose: 'Single-use weapon. While outside and not exhausted, it kills 1–5 zombies without spending AP.', category: 'weapon' },
  human_bone: { type: 'human_bone', name: 'Human Bone', purpose: 'Improvised low-chance breakable weapon.', category: 'weapon' },
  broken_human_bone: { type: 'broken_human_bone', name: 'Broken Human Bone', purpose: 'A broken improvised weapon that can be repaired at the Workshop.', category: 'broken_weapon' },
  pathetic_penknife: { type: 'pathetic_penknife', name: 'Pathetic Penknife', purpose: 'Low-chance breakable melee weapon.', category: 'weapon' },
  broken_pathetic_penknife: { type: 'broken_pathetic_penknife', name: 'Broken Pathetic Penknife', purpose: 'A broken weapon that can be repaired at the Workshop.', category: 'broken_weapon' },
  staff: { type: 'staff', name: 'Staff', purpose: 'Medium-chance breakable melee weapon.', category: 'weapon' },
  broken_staff: { type: 'broken_staff', name: 'Broken Staff', purpose: 'A broken weapon that can be repaired at the Workshop.', category: 'broken_weapon' },
  serrated_knife: { type: 'serrated_knife', name: 'Serrated Knife', purpose: 'Medium-chance breakable melee weapon.', category: 'weapon' },
  broken_serrated_knife: { type: 'broken_serrated_knife', name: 'Broken Serrated Knife', purpose: 'A broken weapon that can be repaired at the Workshop.', category: 'broken_weapon' },
  machete: { type: 'machete', name: 'Machete', purpose: 'Reliable breakable weapon that kills two zombies on a successful strike.', category: 'weapon' },
  broken_machete: { type: 'broken_machete', name: 'Broken Machete', purpose: 'A broken weapon that can be repaired at the Workshop.', category: 'broken_weapon' },
  doggy_bag: { type: 'doggy_bag', name: 'Doggy Bag', purpose: 'Starter food package. Open it to reveal one ordinary food item.', category: 'container', containerPool: ['food'] },
  citizen_welcome_pack: { type: 'citizen_welcome_pack', name: "Citizen's Welcome Pack", purpose: 'Starter package using a small verified pool of common welcome-pack contents.', category: 'container', containerPool: ['battery', 'box_of_matches', 'pharmaceutical_products'] },
  battery: { type: 'battery', name: 'Battery', purpose: "A common component that can be found in a Citizen's Welcome Pack.", category: 'misc' },
  box_of_matches: { type: 'box_of_matches', name: 'Box of Matches', purpose: 'A utility item found in the desert and Welcome Packs.', category: 'misc' },
  pharmaceutical_products: { type: 'pharmaceutical_products', name: 'Pharmaceutical Products', purpose: 'A pharmacy component. Drug crafting is deferred.', category: 'misc' },
}

export const ITEM_TYPES: ItemType[] = Object.keys(ITEMS) as ItemType[]

// Exact frequencies remain a Live2Nite tuning layer. PR #12 broadens ordinary Day-1
// finds with historically grounded construction kits and low-tier improvised weapons;
// depleted zones remain the main source of raw Workshop feedstock.
export const NORMAL_SCAVENGE_LOOT_POOL: ItemType[] = [
  'twisted_plank', 'twisted_plank', 'twisted_plank', 'twisted_plank', 'twisted_plank',
  'wrought_iron', 'wrought_iron', 'wrought_iron', 'wrought_iron', 'wrought_iron',
  'construction_kit', 'construction_kit',
  'unshaped_concrete_block',
  'water_ration', 'water_ration',
  'food', 'food',
  'old_door',
  'human_bone', 'human_bone',
  'pathetic_penknife',
  'staff',
  'serrated_knife',
  'water_bomb',
  'battery', 'box_of_matches', 'pharmaceutical_products',
]

export const DEPLETED_SCAVENGE_LOOT_POOL: ItemType[] = [
  'rotten_log', 'rotten_log', 'rotten_log',
  'scrap_metal', 'scrap_metal', 'scrap_metal',
]

export function itemName(type: ItemType): string { return ITEMS[type].name }
export function itemPurpose(type: ItemType): string { return ITEMS[type].purpose }
export function bankDefenseFor(type: ItemType): number { return ITEMS[type].bankDefense ?? 0 }
export function homeDefenseFor(type: ItemType): number { return ITEMS[type].homeDefense ?? 0 }
export function consumableKind(type: ItemType): ConsumableKind | null { return ITEMS[type].consumableKind ?? null }
export function containerPool(type: ItemType): ItemType[] | null { return ITEMS[type].containerPool ?? null }
export function isContainer(type: ItemType): boolean { return type === 'construction_kit' || Boolean(ITEMS[type].containerPool) }
