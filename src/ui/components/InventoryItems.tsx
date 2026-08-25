import { COMBINATION_RECIPES, type CombinationCategory } from '../../core/combinations'
import { itemInstanceName, itemInstancePurpose } from '../../core/itemDisplay'
import { itemUseActionDefinition, itemUseActionSummary } from '../../core/itemEffects'
import { ITEMS, itemStateLabel } from '../../core/items'
import type { GameCommand, ItemInstance, ItemType } from '../../core/types'
import '../inventory.css'

export interface BankSectionDefinition{id:'resources'|'defense'|'armory'|'containers'|'pharmacy'|'food'|'misc';label:string;matches:(type:ItemType)=>boolean}
export const BANK_SECTIONS:BankSectionDefinition[]=[
  {id:'resources',label:'Resources',matches:(type)=>ITEMS[type].displayCategory==='resources'},
  {id:'defense',label:'Defensive Objects',matches:(type)=>ITEMS[type].displayCategory==='defences'},
  {id:'armory',label:'Armory',matches:(type)=>ITEMS[type].displayCategory==='armoury'},
  {id:'containers',label:'Containers & Boxes',matches:(type)=>ITEMS[type].displayCategory==='containers'},
  {id:'pharmacy',label:'Pharmacy',matches:(type)=>ITEMS[type].displayCategory==='pharmacy'},
  {id:'food',label:'Food & Water',matches:(type)=>ITEMS[type].displayCategory==='food'},
  {id:'misc',label:'Miscellaneous',matches:(type)=>['miscellaneous','furniture'].includes(ITEMS[type].displayCategory)},
]
export function itemTooltip(type:ItemType,extra?:string,state?:ItemInstance['state']):string{const definition=ITEMS[type];const details=[itemInstancePurpose({type,state})];const stateText=itemStateLabel({id:'tooltip',type,state});if(stateText)details.push(`State: ${stateText}`);if(definition.bankDefense)details.push(`Bank defense: +${definition.bankDefense}`);if(definition.homeDefense)details.push(`Home defense: +${definition.homeDefense}`);if(extra)details.push(extra);return details.join('\n')}
export function ItemButton({type,count,state,disabled,onClick,extraTooltip,className=''}:{type:ItemType;count?:number;state?:ItemInstance['state'];disabled?:boolean;onClick?:()=>void;extraTooltip?:string;className?:string}){const tooltip=itemTooltip(type,extraTooltip,state);const stateText=itemStateLabel({id:'display',type,state});const displayName=itemInstanceName({type,state});return <button type="button" className={`compact-item-button category-${ITEMS[type].category} ${onClick?'':'static-item'} ${className}`.trim()} disabled={disabled} onClick={onClick} data-tooltip={tooltip} aria-label={`${displayName}${stateText?` ${stateText}`:''}${count!==undefined?` quantity ${count}`:''}. ${tooltip}`}><span>{displayName}{stateText&&<small> · {stateText}</small>}</span>{count!==undefined&&<strong>[{count}]</strong>}</button>}
export function ItemStrip({items,capacity,onItemClick,disabledForItem,emptyLabel='Empty',extraTooltip}:{items:readonly ItemInstance[];capacity?:number;onItemClick?:(item:ItemInstance)=>void;disabledForItem?:(item:ItemInstance)=>boolean;emptyLabel?:string;extraTooltip?:(item:ItemInstance)=>string|undefined}){const slots=capacity===undefined?0:Math.max(0,capacity-items.length);return <div className="item-strip">{items.map((item)=><ItemButton key={item.id} type={item.type} state={item.state} disabled={disabledForItem?.(item)} onClick={onItemClick?()=>onItemClick(item):undefined} extraTooltip={extraTooltip?.(item)}/>)}{items.length===0&&capacity===undefined&&<span className="compact-empty">{emptyLabel}</span>}{Array.from({length:slots},(_,index)=><span className="empty-item-slot" aria-hidden="true" key={`slot-${index}`}/>)}</div>}
function commandFor(actions:readonly GameCommand[],type:GameCommand['type'],itemId:string):GameCommand|undefined{return actions.find((action)=>action.type===type&&'itemId'in action&&action.itemId===itemId)}
type ActionEntry={key:string;label:string;detail:string;command:GameCommand}
export function ItemActionMenu({items,actions,act,sourceForItem}:{items:readonly ItemInstance[];actions:readonly GameCommand[];act:(command:GameCommand|undefined)=>void;sourceForItem?:(item:ItemInstance)=>string}){
  const entries:Array<ActionEntry>=[]
  for(const item of items){
    const source=sourceForItem?.(item);const suffix=source?` · ${source}`:'Use item';const displayName=itemInstanceName(item)
    const open=commandFor(actions,'OPEN_CONTAINER',item.id);const blueprint=commandFor(actions,'READ_BLUEPRINT',item.id);const eat=commandFor(actions,'EAT_ITEM',item.id);const drink=commandFor(actions,'DRINK_ITEM',item.id);const weapon=commandFor(actions,'USE_WEAPON',item.id)
    if(open)entries.push({key:`open-${item.id}`,label:`Open ${displayName}`,detail:suffix,command:open})
    if(blueprint)entries.push({key:`blueprint-${item.id}`,label:`Read ${displayName}`,detail:`Study construction plan${source?` · ${source}`:''}`,command:blueprint})
    if(eat)entries.push({key:`eat-${item.id}`,label:`Eat ${displayName}`,detail:suffix,command:eat})
    if(drink)entries.push({key:`drink-${item.id}`,label:`Drink ${displayName}`,detail:suffix,command:drink})
    for(const command of actions.filter((candidate):candidate is Extract<GameCommand,{type:'USE_ITEM_ACTION'}>=>candidate.type==='USE_ITEM_ACTION'&&candidate.itemId===item.id)){
      const definition=itemUseActionDefinition(item.type,command.actionId)
      if(definition)entries.push({key:`effect-${item.id}-${command.actionId}`,label:definition.label,detail:`${itemUseActionSummary(definition)}${source?` · ${source}`:''}`,command})
    }
    if(weapon)entries.push({key:`weapon-${item.id}`,label:`Use ${displayName}`,detail:`Weapon${source?` · ${source}`:''}`,command:weapon})
  }
  return <div className="item-action-menu">{entries.length===0?<span className="compact-empty">No direct item actions available.</span>:entries.map((entry)=><button key={entry.key} onClick={()=>act(entry.command)}><span>{entry.label}</span><small>{entry.detail}</small></button>)}</div>
}

const COMBINATION_GROUPS:Array<{id:CombinationCategory;label:string}>=[{id:'assemble',label:'Combine / Assemble'},{id:'reload',label:'Reload / Refill'},{id:'repair',label:'Repair'}]
export function CombinationActionMenu({actions,act}:{actions:readonly GameCommand[];act:(command:GameCommand|undefined)=>void}){
  const combinations=actions.filter((action):action is Extract<GameCommand,{type:'COMBINE_ITEMS'}>=>action.type==='COMBINE_ITEMS')
  if(!combinations.length)return <span className="compact-empty">No combinations available from the items you have here.</span>
  return <div className="combination-action-groups">{COMBINATION_GROUPS.map((group)=>{const groupActions=combinations.filter((action)=>COMBINATION_RECIPES[action.recipeId].category===group.id);if(!groupActions.length)return null;return <section key={group.id}><div className="item-action-label">{group.label}</div><div className="item-action-menu combination-action-menu">{groupActions.map((command)=>{const recipe=COMBINATION_RECIPES[command.recipeId];return <button key={`${command.recipeId}:${command.itemIds.join(':')}`} onClick={()=>act(command)}><span>{recipe.name}</span><small>{recipe.summary}{recipe.apCost?` · ${recipe.apCost} AP`:' · 0 AP'}</small></button>})}</div></section>})}</div>
}
