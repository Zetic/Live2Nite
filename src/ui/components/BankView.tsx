import { ITEM_TYPES } from '../../core/items'
import type { GameCommand, GameEvent, GameState } from '../../core/types'
import { ContextRegister } from './ContextRegister'
import { BANK_SECTIONS, ItemButton, ItemStrip } from './InventoryItems'

function bankEvent(event:GameEvent):boolean{return event.type==='ITEM_DEPOSITED'||event.type==='ITEM_WITHDRAWN'}

export function BankView({ game, citizenId, legalActions, act }: {game:GameState;citizenId:string;legalActions:GameCommand[];act:(command:GameCommand|undefined)=>void}) {
  const player=game.citizens.find((citizen)=>citizen.id===citizenId)??game.citizens[0]
  const deposits=legalActions.filter((action):action is Extract<GameCommand,{type:'DEPOSIT_ITEM'}>=>action.type==='DEPOSIT_ITEM')
  const withdrawals=legalActions.filter((action):action is Extract<GameCommand,{type:'WITHDRAW_BANK_ITEM'}>=>action.type==='WITHDRAW_BANK_ITEM')
  const visibleBankTypes=ITEM_TYPES.filter((type)=>(game.town.bank[type]??0)>0)
  const totalItems=visibleBankTypes.reduce((sum,type)=>sum+(game.town.bank[type]??0),0)
  const depositItem=(itemId:string)=>act(deposits.find((candidate)=>candidate.itemId===itemId))
  return <section className="panel screen-panel">
    <div className="panel-heading"><div><p className="section-kicker">Shared town storage</p><h2>The Bank</h2><p className="section-note">Click a carried item to deposit it. Click a Bank item to take one into an open rucksack slot.</p></div><span className="panel-count">{totalItems} items</span></div>
    <section className="town-section compact-inventory-layout">
      <div className="inventory-surface"><div className="inventory-heading"><h3>{player.name} · Rucksack</h3><span className="micro-stat">{player.inventory.length}/{player.inventoryCapacity}</span></div><ItemStrip items={player.inventory} capacity={player.inventoryCapacity} onItemClick={(item)=>depositItem(item.id)} extraTooltip={()=> 'Click to deposit in the Bank.'}/></div>
      <div className="inventory-surface"><div className="inventory-heading"><h3>Shared Inventory</h3><span className="micro-stat">click to withdraw</span></div>{visibleBankTypes.length===0?<span className="compact-empty">The Bank is empty.</span>:BANK_SECTIONS.map((section)=>{const types=visibleBankTypes.filter(section.matches);if(!types.length)return null;return <section className="bank-category" key={section.id}><div className="bank-category-title">{section.label}</div><div className="stacked-item-grid">{types.map((type)=>{const count=game.town.bank[type]??0;const withdraw=withdrawals.find((action)=>action.itemType===type);return <ItemButton key={type} type={type} count={count} disabled={!withdraw} onClick={()=>act(withdraw)} extraTooltip={withdraw?'Click to take one.':'Rucksack is full or this item cannot be taken right now.'}/>})}</div></section>})}</div>
    </section>
    <ContextRegister game={game} title="Bank Register" matches={bankEvent}/>
  </section>
}
