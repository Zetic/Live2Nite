import type { ItemInstance, ItemType } from './types'

export type FoodQuality='ordinary'|'good'
export interface FoodDefinition { quality:FoodQuality; cookable:boolean }

const ordinary=(cookable=true):FoodDefinition=>({quality:'ordinary',cookable})
const good=(cookable=false):FoodDefinition=>({quality:'good',cookable})

/**
 * Food behavior is metadata-driven. Ordinary food restores toward the citizen's current
 * normal AP maximum; good food restores toward that maximum +1. Kitchen eligibility is
 * independent from ordinary manual recipes and is limited to basic cookable food.
 */
export const FOOD_DEFINITIONS:Partial<Record<ItemType,FoodDefinition>>={
  food:ordinary(),
  mouldy_twinkies:ordinary(),
  half_eaten_chicken_wings:ordinary(),
  rancid_shortbread_pack:ordinary(),
  out_of_date_jaffa_cakes:ordinary(),
  dried_chewing_gum:ordinary(),
  stale_tart:ordinary(),
  soft_crisps:ordinary(),
  open_can:ordinary(),
  vegetable:ordinary(),
  chinese_noodles:ordinary(),
  dried_marshmallows:ordinary(),
  meaty_bone:ordinary(),
  dubious_home_made_meal:ordinary(false),
  tasty_looking_steak:good(),
  spicy_chinese_noodles:good(),
  blue_apple:good(),
  burnt_marshmallows:good(),
  good_home_made_meal:good(),
}

export function foodDefinition(type:ItemType):FoodDefinition|null{return FOOD_DEFINITIONS[type]??null}
export function foodQuality(type:ItemType):FoodQuality{return foodDefinition(type)?.quality??'ordinary'}
export function foodApBonus(type:ItemType):number{return foodQuality(type)==='good'?1:0}
export function foodApTarget(type:ItemType,normalMaxAp:number):number{return normalMaxAp+foodApBonus(type)}
export function isKitchenCookable(item:ItemInstance):boolean{
  const definition=foodDefinition(item.type)
  return Boolean(definition?.cookable)&&item.state?.contamination!=='poisoned'
}
