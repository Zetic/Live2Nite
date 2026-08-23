import { createItemInstance } from '../src/core/items'
import type { ItemInstance, ItemType } from '../src/core/types'

export function bankFromCounts(counts:Partial<Record<ItemType,number>>,prefix='fixture-bank'):ItemInstance[]{
  const items:ItemInstance[]=[]
  let index=0
  for(const[type,count]of Object.entries(counts) as Array<[ItemType,number|undefined]>){
    for(let i=0;i<(count??0);i+=1){items.push(createItemInstance(`${prefix}-${index++}`,type))}
  }
  return items
}

export function bankCount(bank:readonly ItemInstance[],type:ItemType):number{return bank.reduce((sum,item)=>sum+(item.type===type?1:0),0)}
