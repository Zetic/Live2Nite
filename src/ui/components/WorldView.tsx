import { ITEMS, itemName, itemPurpose } from '../../core/items'
import type { Direction, GameCommand, GameState, ItemInstance } from '../../core/types'
import { getZone, zoneControl } from '../../core/world'
import { findAction } from '../actionHelpers'

function itemAction(actions: GameCommand[], type: GameCommand['type'], itemId: string): GameCommand | undefined {
  return actions.find((action) => action.type === type && 'itemId' in action && action.itemId === itemId)
}

function SupplyCard({ item, actions, act }: { item: ItemInstance; actions: GameCommand[]; act: (command: GameCommand|undefined)=>void }) {
  const open=itemAction(actions,'OPEN_CONTAINER',item.id)
  const eat=itemAction(actions,'EAT_ITEM',item.id)
  const drink=itemAction(actions,'DRINK_ITEM',item.id)
  const definition=ITEMS[item.type]
  return <article className={`field-supply category-${definition.category}`}>
    <div><strong>{itemName(item.type)}</strong><small>{itemPurpose(item.type)}</small></div>
    <div>{open&&<button onClick={()=>act(open)}>Open</button>}{eat&&<button className="supply-action" onClick={()=>act(eat)}>Eat · refill AP</button>}{drink&&<button className="supply-action" onClick={()=>act(drink)}>Drink · refill AP</button>}</div>
  </article>
}

export function WorldView({game,legalActions,currentZone,control,act,move,onReturnTown}:{game:GameState;legalActions:GameCommand[];currentZone:ReturnType<typeof getZone>;control:ReturnType<typeof zoneControl>|null;act:(command:GameCommand|undefined)=>void;move:(direction:Direction)=>void;onReturnTown:(command:GameCommand)=>void}){
  const player=game.citizens[0]
  if(player.location.type!=='world'||!currentZone||!control) return <section className="panel screen-panel world-staging"><div className="panel-heading"><div><p className="section-kicker">Expedition planning</p><h2>World Beyond</h2><p className="section-note">You are currently inside town. Open the gate from the Town screen, then leave to begin an expedition.</p></div></div></section>
  const search=findAction(legalActions,'SEARCH_ZONE')
  const enter=findAction(legalActions,'ENTER_TOWN')
  const pickups=legalActions.filter((action):action is Extract<GameCommand,{type:'PICK_UP_ITEM'}>=>action.type==='PICK_UP_ITEM')
  return <section className="panel screen-panel">
    <div className="panel-heading"><div><p className="section-kicker">World Beyond</p><h2>Zone [{player.location.x},{player.location.y}]</h2><p className="section-note">Every cardinal move costs 1 AP. Food and water carried in your rucksack can restore AP in the field.</p></div><span className={`zone-chip ${control.trapped?'danger':''}`}>{control.trapped?'TRAPPED':'CONTROLLED'}</span></div>
    <div className={`control ${control.trapped?'danger':''}`}><div><span>Citizens here</span><strong>{control.humans}</strong><small>{control.humanPoints} control points</small></div><div><span>Zombies</span><strong>{control.zombies}</strong><small>{control.zombiePoints} control points</small></div><p>{control.trapped?'Zombie control exceeds human control. You may still search or use supplies, but movement is blocked until help arrives.':'Human control is sufficient to leave this zone.'}</p></div>
    <section className="world-actions-grid"><div className="movement-card"><h3>Travel</h3><div className="movement" aria-label="Movement controls"><button disabled={!legalActions.some(a=>a.type==='MOVE'&&a.direction==='NORTH')} onClick={()=>move('NORTH')}>↑ <small>1 AP</small></button><div><button disabled={!legalActions.some(a=>a.type==='MOVE'&&a.direction==='WEST')} onClick={()=>move('WEST')}>←</button><button disabled={!legalActions.some(a=>a.type==='MOVE'&&a.direction==='SOUTH')} onClick={()=>move('SOUTH')}>↓</button><button disabled={!legalActions.some(a=>a.type==='MOVE'&&a.direction==='EAST')} onClick={()=>move('EAST')}>→</button></div></div>{enter&&<button className="primary return-button" onClick={()=>onReturnTown(enter)}>Enter town <small>0 AP</small></button>}</div>
      <div className="search-card"><h3>Scavenge</h3><p>{currentZone.searchesRemaining>0?`${currentZone.searchesRemaining} search opportunity(s) remain in this zone.`:'This zone is depleted.'}</p><button disabled={!search} onClick={()=>act(search)}>Search the zone <small>0 AP</small></button><div className="ground-list"><h4>Visible on the ground</h4>{currentZone.groundItems.length===0?<p className="empty-state">Nothing visible.</p>:currentZone.groundItems.map((item)=>{const command=pickups.find((candidate)=>candidate.itemId===item.id);return <button key={item.id} disabled={!command} onClick={()=>act(command)}>Pick up {itemName(item.type)} <small>0 AP</small></button>})}</div></div>
    </section>
    <section className="field-kit"><div className="section-heading-row"><div><h3>Field Rucksack</h3><p>Use carried food or water before moving if you need another AP pool.</p></div><span className="micro-stat">{player.inventory.length}/{player.inventoryCapacity}</span></div>{player.inventory.length===0?<p className="empty-state">Nothing carried.</p>:<div className="field-supplies">{player.inventory.map((item)=><SupplyCard key={item.id} item={item} actions={legalActions} act={act}/>)}</div>}</section>
  </section>
}
