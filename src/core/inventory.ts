import { CURRENT_ITEM_SOURCE_CATALOG } from './itemSourceCurrent'
import type { Citizen, ItemInstance, ItemType } from './types'

/**
 * MyHordes cumbersome/heavy metadata is already mirrored in the source catalogue.
 * Runtime inventory rules derive from that metadata rather than maintaining a second list.
 */
const CUMBERSOME_RUNTIME_TYPES=new Set<ItemType>(
  CURRENT_ITEM_SOURCE_CATALOG.flatMap((entry)=>entry.heavy&&entry.runtimeType?[entry.runtimeType]:[]),
)

export function isCumbersomeItemType(type:ItemType):boolean{return CUMBERSOME_RUNTIME_TYPES.has(type)}
export function isCumbersomeItem(item:ItemInstance):boolean{return isCumbersomeItemType(item.type)}
export function cumbersomeItemCount(citizen:Citizen):number{return citizen.inventory.filter(isCumbersomeItem).length}

/** A citizen can carry at most one cumbersome item and still uses ordinary cargo slots. */
export function canCarryItem(citizen:Citizen,item:ItemInstance):boolean{
  if(citizen.inventory.length>=citizen.inventoryCapacity)return false
  return !isCumbersomeItem(item)||cumbersomeItemCount(citizen)===0
}
