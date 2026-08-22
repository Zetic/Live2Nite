import { itemName } from '../../core/items'
import type { Direction, GameCommand, GameState } from '../../core/types'
import { getZone, zoneControl } from '../../core/world'
import { findAction } from '../actionHelpers'

export function WorldView({game,legalActions,currentZone,control,act,move}:{game:GameState;legalActions:GameCommand[];currentZone:ReturnType<typeof getZone>;control:ReturnType<typeof zoneControl>|null;act:(command:GameCommand|undefined)=>void;move:(direction:Direction)=>void}){
  const player=game.citizens[0]
  if(player.location.type!=='world'||!currentZone||!control)return null
  const search=findAction(legalActions,'SEARCH_ZONE'),enter=findAction(legalActions,'ENTER_TOWN')
  const pickups=legalActions.filter((action):action is Extract<GameCommand,{type:'PICK_UP_ITEM'}>=>action.type==='PICK_UP_ITEM')
  return <>
    <div className="panel-heading"><div><p className="section-kicker">World Beyond</p><h2>Zone [{player.location.x},{player.location.y}]</h2><p className="section-note">Every cardinal move costs 1 AP. Keep enough AP in reserve to make it home.</p></div><span className={`zone-chip ${control.trapped?'danger':''}`}>{control.trapped?'TRAPPED':'CONTROLLED'}</span></div>
    <div className={`control ${control.trapped?'danger':''}`}><div><span>Citizens here</span><strong>{control.humans}</strong><small>{control.humanPoints} control points</small></div><div><span>Zombies</span><strong>{control.zombies}</strong><small>{control.zombiePoints} control points</small></div><p>{control.trapped?'Zombie control exceeds human control. You can search, but movement is blocked until help arrives or zombies are removed.':'Human control is sufficient to leave this zone.'}</p></div>
    <section className="world-actions-grid"><div className="movement-card"><h3>Travel</h3><div className="movement" aria-label="Movement controls"><button disabled={!legalActions.some(a=>a.type==='MOVE'&&a.direction==='NORTH')} onClick={()=>move('NORTH')}>↑ <small>1 AP</small></button><div><button disabled={!legalActions.some(a=>a.type==='MOVE'&&a.direction==='WEST')} onClick={()=>move('WEST')}>←</button><button disabled={!legalActions.some(a=>a.type==='MOVE'&&a.direction==='SOUTH')} onClick={()=>move('SOUTH')}>↓</button><button disabled={!legalActions.some(a=>a.type==='MOVE'&&a.direction==='EAST')} onClick={()=>move('EAST')}>→</button></div></div>{enter&&<button className="primary return-button" onClick={()=>act(enter)}>Enter town <small>0 AP</small></button>}</div>
      <div className="search-card"><h3>Scavenge</h3><p>{currentZone.searchesRemaining>0?`${currentZone.searchesRemaining} search opportunity(s) remain in this zone.`:'This zone is depleted.'}</p><button disabled={!search} onClick={()=>act(search)}>Search the zone <small>0 AP</small></button><div className="ground-list"><h4>Visible on the ground</h4>{currentZone.groundItems.length===0?<p className="empty-state">Nothing visible.</p>:currentZone.groundItems.map(item=>{const command=pickups.find(candidate=>candidate.itemId===item.id);return <button key={item.id} disabled={!command} onClick={()=>act(command)}>Pick up {itemName(item.type)} <small>0 AP</small></button>})}</div></div>
    </section>
    <section className="carry-strip"><div><span>Backpack</span><strong>{player.inventory.length}/{player.inventoryCapacity}</strong></div><p>{player.inventory.length?player.inventory.map(item=>itemName(item.type)).join(' · '):'Nothing carried'}</p></section>
  </>
}
