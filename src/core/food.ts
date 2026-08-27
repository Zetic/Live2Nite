import { itemHasCapability, normalizeItemState } from './items'
import type { ItemInstance, ItemType } from './types'

export type FoodQuality='ordinary'|'good'
export interface FoodDefinition { quality:FoodQuality }

const ordinary:FoodDefinition={quality:'ordinary'}
const good:FoodDefinition={quality:'good'}

/**
 * Food quality controls AP restoration only. Kitchen eligibility is an item capability,
 * so new ordinary foods can opt into cooking without adding Kitchen-specific recipes.
 */
export const FOOD_DEFINITIONS:Partial<Record<ItemType,FoodDefinition>>={
  food:ordinary,
  mouldy_twinkies:ordinary,
  half_eaten_chicken_wings:ordinary,
  rancid_shortbread_pack:ordinary,
  out_of_date_jaffa_cakes:ordinary,
  dried_chewing_gum:ordinary,
  stale_tart:ordinary,
  soft_crisps:ordinary,
  open_can:ordinary,
  vegetable:ordinary,
  chinese_noodles:ordinary,
  dried_marshmallows:ordinary,
  meaty_bone:ordinary,
  unspecified_meat:ordinary,
  dubious_home_made_meal:ordinary,
  tasty_looking_steak:good,
  spicy_chinese_noodles:good,
  blue_apple:good,
  burnt_marshmallows:good,
  good_home_made_meal:good,
}

export function foodDefinition(type:ItemType):FoodDefinition|null{return FOOD_DEFINITIONS[type]??null}
export function foodQuality(type:ItemType):FoodQuality{return foodDefinition(type)?.quality??'ordinary'}
export function foodApBonus(type:ItemType):number{return foodQuality(type)==='good'?1:0}
export function foodApTarget(type:ItemType,normalMaxAp:number):number{return normalMaxAp+foodApBonus(type)}
export function isKitchenCookable(item:ItemInstance):boolean{
  return itemHasCapability(item.type,'cookable')&&normalizeItemState(item.type,item.state).contamination!=='poisoned'
}
