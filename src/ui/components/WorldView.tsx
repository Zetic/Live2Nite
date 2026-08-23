import { BAREHANDED_KILL_CHANCE_PERCENT } from '../../core/combat'
import { specialSiteName, specialSitePurpose } from '../../core/specialSites'
import type { Direction, GameCommand, GameState } from '../../core/types'
import { getZone, zoneControl, zoneControlState } from '../../core/world'
import { findAction } from '../actionHelpers'
import '../expedition.css'
import { ItemActionMenu, ItemStrip } from './InventoryItems'

export function WorldView({game,citizenId,legalActions,currentZone,control,act,move}:{game:GameState;citizenId:string;legalActions:GameCommand[];currentZone:ReturnType<typeof getZone>;control:ReturnType<typeof zoneControl>|null;act:(command:GameCommand|undefined)=>void;move:(direction:Direction)=>void}){
  const player=game.citizens.find((citizen)=>citizen.id===citizenId)??game.citizens[0]
  if(player.location.type==='town'){
    const open=findAction(legalActions,'OPEN_GATE');const close=findAction(legalActions,'CLOSE_GATE');const exit=findAction(legalActions,'EXIT_TOWN')
    return <section className="panel screen-panel world-staging">
      <div className="panel-heading"><div><p className="section-kicker">Expedition planning · {player.name}</p><h2>World Beyond</h2><p className="section-note">Prepare your rucksack, open the gate, and leave town. Zombie reports age, so useful routes need repeated observation.</p></div><span className={`gate-chip ${game.town.gateOpen?'open':''}`}>{game.town.gateOpen?'GATE OPEN':'GATE SEALED'}</span></div>
      <section className="inventory-surface"><div className="inventory-heading"><h3>Rucksack</h3><span className="micro-stat">{player.inventory.length}/{player.inventoryCapacity}</span></div><ItemStrip items={player.inventory} capacity={player.inventoryCapacity}/><div className="inventory-actions-block"><div className="inventory-heading"><h3>Item Actions</h3><span className="micro-stat">carried items</span></div><ItemActionMenu items={player.inventory} actions={legalActions} act={act}/></div></section>
      <section className="town-feature gate-card facility-hero-card"><div className="feature-icon">G</div><div className="feature-copy"><span>Town Gate</span><strong>{game.town.gateOpen?'Open':'Sealed'}</strong><p>An open gate nullifies town defense during the nightly attack.</p></div><div className="feature-actions">{open&&<button onClick={()=>act(open)}>Open <small>1 AP</small></button>}{close&&<button onClick={()=>act(close)}>Close <small>1 AP</small></button>}{exit&&<button className="primary" onClick={()=>act(exit)}>Go outside <small>0 AP</small></button>}</div></section>
    </section>
  }
  if(!currentZone||!control)return null
  const state=zoneControlState(game,player.location.x,player.location.y,player.id)
  const stateLabel=state==='secure'?'SECURE':state==='fragile'?'FRAGILE':state==='temporary'?'TEMPORARY CONTROL':'TRAPPED'
  const controlMessage=state==='secure'
    ?'Human control is sufficient to leave or work this zone.'
    :state==='fragile'
      ?'The zone is controlled, but a citizen departure would hand control to the zombies. Coordinate the exit or reduce the threat first.'
      :state==='temporary'
        ?'Actual control has been lost, but this citizen still has an extraction window. Travel and emergency actions remain available; productive scavenging and excavation are suspended.'
        :'Zombie control exceeds human control. Fight or wait for rescue before attempting to leave.'
  const search=findAction(legalActions,'SEARCH_ZONE');const enter=findAction(legalActions,'ENTER_TOWN');const fists=findAction(legalActions,'ATTACK_BAREHANDED');const excavate=findAction(legalActions,'EXCAVATE_SPECIAL_SITE');const siteSearch=findAction(legalActions,'SEARCH_SPECIAL_SITE')
  const pickups=legalActions.filter((action):action is Extract<GameCommand,{type:'PICK_UP_ITEM'}>=>action.type==='PICK_UP_ITEM')
  const drops=legalActions.filter((action):action is Extract<GameCommand,{type:'DROP_ITEM'}>=>action.type==='DROP_ITEM')
  const depleted=currentZone.searchesRemaining===0;const alreadyDepletedSearched=(currentZone.depletedSearchedBy??[]).includes(player.id);const site=currentZone.specialSite
  const pickGround=(itemId:string)=>act(pickups.find((candidate)=>candidate.itemId===itemId))
  const dropCarried=(itemId:string)=>act(drops.find((candidate)=>candidate.itemId===itemId))

  return <section className="panel screen-panel">
    <div className="panel-heading"><div><p className="section-kicker">World Beyond · {player.name}</p><h2>Zone [{player.location.x},{player.location.y}]</h2><p className="section-note">Click ground items to pick them up. Click rucksack items to drop them in this zone.</p></div><div className="world-heading-chips"><span className={`zone-chip ${state==='trapped'?'danger':''}`}>{stateLabel}</span><span className={`zone-chip ${depleted?'depleted-chip':''}`}>{depleted?'DEPLETED':'UNDEPLETED'}</span></div></div>

    <div className={`control ${state==='trapped'?'danger':''}`}><div><span>Citizens here</span><strong>{control.humans}</strong><small>{control.humanPoints} control points</small></div><div><span>Zombies</span><strong>{control.zombies}</strong><small>{control.zombiePoints} control points</small></div><p><strong>{stateLabel}</strong><br/>{controlMessage}</p></div>

    <div className="world-inventory-grid">
      <section className="inventory-surface"><div className="inventory-heading"><h3>On the Ground</h3><span className="micro-stat">{currentZone.groundItems.length}</span></div><ItemStrip items={currentZone.groundItems} onItemClick={(item)=>pickGround(item.id)} emptyLabel="Nothing visible." extraTooltip={(item)=>pickups.some((command)=>command.itemId===item.id)?'Click to pick up.':'Your rucksack is full or pickup is unavailable.'}/></section>
      <section className="inventory-surface"><div className="inventory-heading"><h3>Rucksack</h3><span className="micro-stat">{player.inventory.length}/{player.inventoryCapacity}</span></div><ItemStrip items={player.inventory} capacity={player.inventoryCapacity} onItemClick={(item)=>dropCarried(item.id)} extraTooltip={()=> 'Click to drop on the ground.'}/></section>
    </div>
    <section className="inventory-actions-block"><div className="inventory-heading"><h3>Item Actions</h3><span className="micro-stat">rucksack + ground</span></div><ItemActionMenu items={player.inventory} actions={legalActions} act={act} includePickup groundItems={currentZone.groundItems}/></section>

    {site&&<section className={`special-site-card status-${site.status}`}><div className="special-site-heading"><div><p className="section-kicker">Discovered ruin</p><h3>{specialSiteName(site.type)}</h3><p>{specialSitePurpose(site.type)}</p></div><span>{site.status.toUpperCase()}</span></div>{site.status==='buried'?<><div className="site-progress"><span style={{width:`${Math.round(site.excavationProgress/site.excavationRequired*100)}%`}}/></div><p>{site.excavationProgress}/{site.excavationRequired} excavation AP contributed. Multiple citizens can help clear the same entrance.</p><button disabled={!excavate} onClick={()=>act(excavate)}>Clear debris <small>1 AP</small></button></>:site.status==='accessible'?<><p>{site.hiddenLoot.length} site find(s) remain. This does not consume the zone's ordinary searches.</p><button disabled={!siteSearch} onClick={()=>act(siteSearch)}>Search the structure <small>0 AP</small></button></>:<p className="empty-state">This structure has been stripped of its special finds.</p>}</section>}

    <section className={`combat-panel ${state==='trapped'?'combat-urgent':''}`}><div className="section-heading-row"><div><p className="section-kicker">Zone combat</p><h3>{currentZone.zombies>0?`${currentZone.zombies} zombie${currentZone.zombies===1?'':'s'} present`:'Zone clear'}</h3></div>{currentZone.zombies>0&&<span className="micro-stat">{player.ap}/{player.maxAp} AP</span>}</div>{currentZone.zombies===0?<p className="empty-state">There are no zombies here to attack.</p>:<><p className="combat-rule">Usable carried weapons appear in Item Actions above. Bare-handed attacks remain available here.</p><div className="combat-actions"><button className="fist-action" disabled={!fists} onClick={()=>act(fists)}><strong>Fight bare-handed</strong><small>{BAREHANDED_KILL_CHANCE_PERCENT}% kill chance · 1 AP</small></button></div></>}</section>

    <section className="world-actions-grid"><div className="movement-card"><h3>Travel</h3><div className="movement"><button disabled={!legalActions.some(a=>a.type==='MOVE'&&a.direction==='NORTH')} onClick={()=>move('NORTH')}>↑ <small>1 AP</small></button><div><button disabled={!legalActions.some(a=>a.type==='MOVE'&&a.direction==='WEST')} onClick={()=>move('WEST')}>←</button><button disabled={!legalActions.some(a=>a.type==='MOVE'&&a.direction==='SOUTH')} onClick={()=>move('SOUTH')}>↓</button><button disabled={!legalActions.some(a=>a.type==='MOVE'&&a.direction==='EAST')} onClick={()=>move('EAST')}>→</button></div></div>{enter&&<button className="primary return-button" onClick={()=>act(enter)}>Enter town <small>0 AP</small></button>}</div><div className={`search-card ${depleted?'depleted-search':''}`}><h3>{depleted?'Scavenge Depleted Zone':'Search Undepleted Zone'}</h3><p>{state==='temporary'?'Productive scavenging is suspended during temporary control.':depleted?(alreadyDepletedSearched?'This citizen has already combed the depleted ground here.':'Low-grade Rotting Logs and Scrap Metal remain after the useful finds are gone.'):`${currentZone.searchesRemaining} normal search opportunity(s) remain.`}</p><button disabled={!search} onClick={()=>act(search)}>{depleted?'Comb the depleted ground':'Search the zone'} <small>0 AP</small></button></div></section>
  </section>
}
