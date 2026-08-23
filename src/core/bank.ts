import { itemStackKey, normalizeItemState } from './items'
import type { GameState, ItemInstance, ItemState, ItemType } from './types'

export function bankItems(state:GameState,type?:ItemType):ItemInstance[]{return type?state.town.bank.filter((item)=>item.type===type):state.town.bank}
export function bankCount(state:GameState,type:ItemType):number{return state.town.bank.reduce((sum,item)=>sum+(item.type===type?1:0),0)}
export function bankHas(state:GameState,type:ItemType,count=1):boolean{return bankCount(state,type)>=count}
export function firstBankItem(state:GameState,type:ItemType,stateMatch?:Partial<ItemState>):ItemInstance|undefined{return state.town.bank.find((item)=>item.type===type&&(!stateMatch||Object.entries(stateMatch).every(([key,value])=>normalizeItemState(item.type,item.state)[key as keyof ItemState]===value)))}
export function countBankTypes(state:GameState):Partial<Record<ItemType,number>>{const counts:Partial<Record<ItemType,number>>={};for(const item of state.town.bank)counts[item.type]=(counts[item.type]??0)+1;return counts}
export function removeBankItems(bank:ItemInstance[],type:ItemType,count:number):ItemInstance[]{let remaining=count;return bank.filter((item)=>{if(item.type===type&&remaining>0){remaining-=1;return false}return true})}
export function removeBankItemById(bank:ItemInstance[],itemId:string):ItemInstance[]{return bank.filter((item)=>item.id!==itemId)}
export interface BankStack{key:string;type:ItemType;state:ItemState;count:number;items:ItemInstance[]}
export function stackBankItems(items:ItemInstance[]):BankStack[]{const stacks=new Map<string,BankStack>();for(const item of items){const key=itemStackKey(item);const existing=stacks.get(key);if(existing){existing.count+=1;existing.items.push(item)}else stacks.set(key,{key,type:item.type,state:normalizeItemState(item.type,item.state),count:1,items:[item]})}return[...stacks.values()]}
