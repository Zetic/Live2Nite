import type { ItemType } from './types'

/**
 * Source food actions restore to a named AP target rather than changing a citizen's normal
 * daily max. Keep the mapping explicit so higher-value foods can temporarily exceed 6 AP.
 */
const SOURCE_FOOD_AP_TARGET:Partial<Record<ItemType,number>>={
  food:6,
  mouldy_twinkies:6,
  half_eaten_chicken_wings:6,
  rancid_shortbread_pack:6,
  out_of_date_jaffa_cakes:6,
  dried_chewing_gum:6,
  stale_tart:6,
  soft_crisps:6,
  open_can:6,
  vegetable:6,
  tasty_looking_steak:7,
}

export function foodApTarget(type:ItemType,fallbackMaxAp:number):number{
  return SOURCE_FOOD_AP_TARGET[type]??fallbackMaxAp
}
