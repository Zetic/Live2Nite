import { ITEMS, itemName, itemPurpose } from '../../core/items'
import type { Direction, GameCommand, GameState, ItemInstance } from '../../core/types'
import { getZone, zoneControl } from '../../core/world'
import { findAction } from '../actionHelpers'

function itemAction(actions: GameCommand[], type: GameCommand['type'], itemId: string): GameCommand | undefined {
  return actions.find((action) => action.type === type && 'itemId' in action && action.itemId === itemId)
}

function SupplyCard({ item, actions, act }: { item: ItemInstance; actions: GameCommand[]; act: (command: GameCommand|undefined)=>void }) {
  const open = itemAction(actions, 'OPEN_CONTAINER', item.id)
  const eat = itemAction(actions, 'EAT_ITEM', item.id)
  const drink = itemAction(actions, 'DRINK_ITEM', item.id)
  const definition = ITEMS[item.type]
  return <article className={`field-supply category-${definition.category}`}>
    <div><strong>{itemName(item.type)}</strong><small>{itemPurpose(item.type)}</small></div>
    <div>{open&&<button onClick={()=>act(open)}>Open</button>}{eat&&<button className="supply-action" onClick={()=>act(eat)}>Eat · refill AP</button>}{drink&&<button className="supply-action" onClick={()=>act(drink)}>Drink · refill AP</button>}</div>
  </article>
}

export function WorldView({game,legalActions,currentZone,control,act,move}:{game:GameState;legalActions:GameCommand[];currentZone:ReturnType<typeof getZone>;control:ReturnType<typeof zoneControl>|null;act:(command:GameCommand|undefined)=>void;move:(direction:Direction)=>void}){
  const player = game.citizens[0]

  if (player.location.type === 'town') {
    const open = findAction(legalActions, 'OPEN_GATE')
    const close = findAction(legalActions, 'CLOSE_GATE')
    const exit = findAction(legalActions, 'EXIT_TOWN')
    return <section className="panel screen-panel world-staging">
      <div className="panel-heading"><div><p className="section-kicker">Expedition planning</p><h2>World Beyond</h2><p className="section-note">The town gate and every expedition action live here. Open the gate, leave town, scavenge, then return here to seal it before night.</p></div><span className={`gate-chip ${game.town.gateOpen?'open':''}`}>{game.town.gateOpen?'GATE OPEN':'GATE SEALED'}</span></div>
      <section className="town-feature gate-card facility-hero-card">
        <div className="feature-icon" aria-hidden="true">G</div>
        <div className="feature-copy"><span>Town Gate</span><strong>{game.town.gateOpen ? 'Open' : 'Sealed'}</strong><p>An open gate nullifies town defense during the nightly attack.</p></div>
        <div className="feature-actions">
          {open && <button onClick={() => act(open)}>Open <small>1 AP</small></button>}
          {close && <button onClick={() => act(close)}>Close <small>1 AP</small></button>}
          {exit && <button className="primary" onClick={() => act(exit)}>Go outside <small>0 AP</small></button>}
        </div>
      </section>
      <div className="expedition-primer"><strong>Scavenging model</strong><span>Undepleted zones can yield useful and construction-ready finds. Once a zone is depleted, a citizen may comb the leftovers for low-grade Workshop feedstock such as Rotting Logs or Scrap Metal.</span></div>
    </section>
  }

  if (!currentZone || !control) return null
  const search = findAction(legalActions, 'SEARCH_ZONE')
  const enter = findAction(legalActions, 'ENTER_TOWN')
  const pickups = legalActions.filter((action):action is Extract<GameCommand,{type:'PICK_UP_ITEM'}> => action.type === 'PICK_UP_ITEM')
  const depleted = currentZone.searchesRemaining === 0
  const alreadyDepletedSearched = (currentZone.depletedSearchedBy ?? []).includes(player.id)

  return <section className="panel screen-panel">
    <div className="panel-heading"><div><p className="section-kicker">World Beyond</p><h2>Zone [{player.location.x},{player.location.y}]</h2><p className="section-note">Every cardinal move costs 1 AP. Food and water carried in your rucksack can restore AP in the field.</p></div><div className="world-heading-chips"><span className={`zone-chip ${control.trapped?'danger':''}`}>{control.trapped?'TRAPPED':'CONTROLLED'}</span><span className={`zone-chip ${depleted?'depleted-chip':''}`}>{depleted?'DEPLETED':'UNDEPLETED'}</span></div></div>
    <div className={`control ${control.trapped?'danger':''}`}><div><span>Citizens here</span><strong>{control.humans}</strong><small>{control.humanPoints} control points</small></div><div><span>Zombies</span><strong>{control.zombies}</strong><small>{control.zombiePoints} control points</small></div><p>{control.trapped?'Zombie control exceeds human control. You may still search or use supplies, but movement is blocked until help arrives.':'Human control is sufficient to leave this zone.'}</p></div>
    <section className="world-actions-grid"><div className="movement-card"><h3>Travel</h3><div className="movement" aria-label="Movement controls"><button disabled={!legalActions.some(a=>a.type==='MOVE'&&a.direction==='NORTH')} onClick={()=>move('NORTH')}>↑ <small>1 AP</small></button><div><button disabled={!legalActions.some(a=>a.type==='MOVE'&&a.direction==='WEST')} onClick={()=>move('WEST')}>←</button><button disabled={!legalActions.some(a=>a.type==='MOVE'&&a.direction==='SOUTH')} onClick={()=>move('SOUTH')}>↓</button><button disabled={!legalActions.some(a=>a.type==='MOVE'&&a.direction==='EAST')} onClick={()=>move('EAST')}>→</button></div></div>{enter&&<button className="primary return-button" onClick={()=>act(enter)}>Enter town <small>0 AP</small></button>}</div>
      <div className={`search-card ${depleted?'depleted-search':''}`}><h3>{depleted ? 'Scavenge Depleted Zone' : 'Search Undepleted Zone'}</h3><p>{depleted ? (alreadyDepletedSearched ? 'You have already combed the depleted ground here.' : 'The main finds are gone. A depleted search yields low-grade material that only becomes broadly useful once the Workshop is built.') : `${currentZone.searchesRemaining} normal search opportunity(s) remain in this zone.`}</p><button disabled={!search} onClick={()=>act(search)}>{depleted ? 'Comb the depleted ground' : 'Search the zone'} <small>0 AP</small></button><div className="ground-list"><h4>Visible on the ground</h4>{currentZone.groundItems.length===0?<p className="empty-state">Nothing visible.</p>:currentZone.groundItems.map((item)=>{const command=pickups.find((candidate)=>candidate.itemId===item.id);return <button key={item.id} disabled={!command} onClick={()=>act(command)}>Pick up {itemName(item.type)} <small>0 AP</small></button>})}</div></div>
    </section>
    <section className="field-kit"><div className="section-heading-row"><div><h3>Field Rucksack</h3><p>Use carried food or water before moving if you need another AP pool.</p></div><span className="micro-stat">{player.inventory.length}/{player.inventoryCapacity}</span></div>{player.inventory.length===0?<p className="empty-state">Nothing carried.</p>:<div className="field-supplies">{player.inventory.map((item)=><SupplyCard key={item.id} item={item} actions={legalActions} act={act}/>)}</div>}</section>
  </section>
}
