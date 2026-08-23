import { createItemInstance } from '../src/core/items'
import type { GameState, ItemInstance, ItemState, ItemType } from '../src/core/types'

export function bankFixture(counts:Partial<Record<ItemType,number>>,states:Partial<Record<ItemType,ItemState[]>>={}):ItemInstance[]{
  const items:ItemInstance[]=[]
  for(const[type,count]of Object.entries(counts) as Array<[ItemType,number|undefined]>){
    for(let index=0;index<(count??0);index+=1){items.push(createItemInstance(`test-bank-${type}-${index+1}`,type,states[type]?.[index]))}
  }
  return items
}
export function withBank(state:GameState,counts:Partial<Record<ItemType,number>>):GameState{return{...state,town:{...state.town,bank:bankFixture(counts)}}}
export function bankCountFor(state:GameState,type:ItemType):number{return state.town.bank.filter((item)=>item.type===type).length}
