import { normalizeItemState } from './items'
import type { ItemInstance, ItemState, ItemType } from './types'

export type ItemRecipeKind='transform'|'combine'|'assemble'|'repair'|'reload'|'dismantle'|'open'|'purify'|'cook'
export type ItemRecipeLocation='workshop'|'home'|'world'|'town'|'anywhere'

export interface ItemRequirement {
  type:ItemType
  count:number
  /** Optional state constraints, e.g. an empty weapon or damaged tool. */
  state?:Partial<ItemState>
}
export interface ItemOutput {
  type:ItemType
  count:number
  state?:Partial<ItemState>
}
export interface ItemRecipeDefinition {
  id:string
  name:string
  kind:ItemRecipeKind
  location:ItemRecipeLocation
  inputs:ItemRequirement[]
  outputs:ItemOutput[]
  apCost:number
}

export function itemMatchesRequirement(item:ItemInstance,requirement:ItemRequirement):boolean{
  if(item.type!==requirement.type)return false
  if(!requirement.state)return true
  const state=normalizeItemState(item.type,item.state)
  return Object.entries(requirement.state).every(([key,value])=>state[key as keyof ItemState]===value)
}
export function countMatchingItems(items:ItemInstance[],requirement:ItemRequirement):number{return items.reduce((sum,item)=>sum+(itemMatchesRequirement(item,requirement)?1:0),0)}
export function itemRequirementsMet(items:ItemInstance[],requirements:ItemRequirement[]):boolean{return requirements.every((requirement)=>countMatchingItems(items,requirement)>=requirement.count)}
export function selectRequirementItems(items:ItemInstance[],requirement:ItemRequirement):ItemInstance[]{return items.filter((item)=>itemMatchesRequirement(item,requirement)).slice(0,requirement.count)}
