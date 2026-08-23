import { ITEMS, itemName, itemPurpose } from '../../core/items'
import type { GameCommand, ItemInstance, ItemType } from '../../core/types'
import '../inventory.css'

export interface BankSectionDefinition {
  id: 'resources'|'defense'|'armory'|'containers'|'pharmacy'|'food'|'misc'
  label: string
  matches: (type: ItemType) => boolean
}
export const BANK_SECTIONS: BankSectionDefinition[] = [
  { id:'resources', label:'Resources', matches:(type)=>ITEMS[type].category==='raw'||ITEMS[type].category==='construction' },
  { id:'defense', label:'Defensive Objects', matches:(type)=>ITEMS[type].category==='defense' },
  { id:'armory', label:'Armory', matches:(type)=>ITEMS[type].category==='weapon'||ITEMS[type].category==='broken_weapon' },
  { id:'containers', label:'Containers & Boxes', matches:(type)=>ITEMS[type].category==='container' },
  { id:'pharmacy', label:'Pharmacy', matches:(type)=>type==='pharmaceutical_products' },
  { id:'food', label:'Food & Water', matches:(type)=>ITEMS[type].category==='consumable' },
  { id:'misc', label:'Miscellaneous', matches:(type)=>type!=='pharmaceutical_products'&&ITEMS[type].category==='misc' },
]
export function itemTooltip(type:ItemType,extra?:string):string {const definition=ITEMS[type];const details=[itemPurpose(type)];if(definition.bankDefense)details.push(`Bank defense: +${definition.bankDefense}`);if(definition.homeDefense)details.push(`Home defense: +${definition.homeDefense}`);if(extra)details.push(extra);return details.join('\n')}
export function ItemButton({type,count,disabled,onClick,extraTooltip,className=''}:{type:ItemType;count?:number;disabled?:boolean;onClick?:()=>void;extraTooltip?:string;className?:string}) {const tooltip=itemTooltip(type,extraTooltip);return <button type="button" className={`compact-item-button category-${ITEMS[type].category} ${onClick?'':'static-item'} ${className}`.trim()} disabled={disabled} onClick={onClick} data-tooltip={tooltip} aria-label={`${itemName(type)}${count!==undefined?` quantity ${count}`:''}. ${tooltip}`}><span>{itemName(type)}</span>{count!==undefined&&<strong>[{count}]</strong>}</button>}
export function ItemStrip({items,capacity,onItemClick,disabledForItem,emptyLabel='Empty',extraTooltip}:{items:readonly ItemInstance[];capacity?:number;onItemClick?:(item:ItemInstance)=>void;disabledForItem?:(item:ItemInstance)=>boolean;emptyLabel?:string;extraTooltip?:(item:ItemInstance)=>string|undefined}) {const slots=capacity===undefined?0:Math.max(0,capacity-items.length);return <div className="item-strip">{items.map((item)=><ItemButton key={item.id} type={item.type} disabled={disabledForItem?.(item)} onClick={onItemClick?()=>onItemClick(item):undefined} extraTooltip={extraTooltip?.(item)}/>)}{items.length===0&&capacity===undefined&&<span className="compact-empty">{emptyLabel}</span>}{Array.from({length:slots},(_,index)=><span className="empty-item-slot" aria-hidden="true" key={`slot-${index}`}/>)}</div>}
function commandFor(actions:readonly GameCommand[],type:GameCommand['type'],itemId:string):GameCommand|undefined{return actions.find((action)=>action.type===type&&'itemId'in action&&action.itemId===itemId)}
type ActionEntry={key:string;label:string;detail:string;command:GameCommand}
export function ItemActionMenu({items,actions,act,sourceForItem}:{items:readonly ItemInstance[];actions:readonly GameCommand[];act:(command:GameCommand|undefined)=>void;sourceForItem?:(item:ItemInstance)=>string}) {
  const entries:Array<ActionEntry>=[]
  for(const item of items){
    const source=sourceForItem?.(item)
    const suffix=source?` · ${source}`:'Use item'
    const open=commandFor(actions,'OPEN_CONTAINER',item.id);const eat=commandFor(actions,'EAT_ITEM',item.id);const drink=commandFor(actions,'DRINK_ITEM',item.id);const weapon=commandFor(actions,'USE_WEAPON',item.id)
    if(open)entries.push({key:`open-${item.id}`,label:`Open ${itemName(item.type)}`,detail:suffix,command:open})
    if(eat)entries.push({key:`eat-${item.id}`,label:`Eat ${itemName(item.type)}`,detail:suffix,command:eat})
    if(drink)entries.push({key:`drink-${item.id}`,label:`Drink ${itemName(item.type)}`,detail:suffix,command:drink})
    if(weapon)entries.push({key:`weapon-${item.id}`,label:`Use ${itemName(item.type)}`,detail:`Weapon${source?` · ${source}`:''}`,command:weapon})
  }
  return <div className="item-action-menu">{entries.length===0?<span className="compact-empty">No item actions available.</span>:entries.map((entry)=><button key={entry.key} onClick={()=>act(entry.command)}><span>{entry.label}</span><small>{entry.detail}</small></button>)}</div>
}