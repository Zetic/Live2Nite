import { useEffect, useState } from 'react'
import { RUIN_CATALOG } from '../../core/ruinCatalog'
import {
  expireRuinExploration,
  fleeRuinZombies,
  getRuinExplorer,
  getRuinInterior,
  leaveRuin,
  oxygenSecondsRemaining,
  ruinCurrentCell,
  shiftRuinRoom,
  useRuinStairs,
  type RuinActionResult,
} from '../../core/ruinExploration'
import { dropRuinInventoryItem, searchRuinRoom, takeRuinFloorItem, unlockRuinRoom } from '../../core/ruinRoomActions'
import { ruinKeyName } from '../../core/ruinRoomContent'
import { executeRuinSharedAction, getRuinSharedActions } from '../../core/ruinSharedActions'
import { normalizeRuinId } from '../../core/specialSites'
import type { GameCommand, GameState, WorldZone } from '../../core/types'
import { CombinationActionMenu, ItemActionMenu, ItemStrip, RucksackStrip } from './InventoryItems'
import { ruinFloorLabel } from './RuinInteriorMap'
import '../ruin-exploration.css'

function clock(seconds:number):string{const value=Math.max(0,seconds);return`${Math.floor(value/60)}:${String(value%60).padStart(2,'0')}`}

export function RuinInteriorPanel({game,citizenId,zone,onResult}:{game:GameState;citizenId:string;zone:WorldZone;onResult:(result:RuinActionResult)=>void}){
  const explorer=getRuinExplorer(game,citizenId)
  const interior=getRuinInterior(zone)
  const cell=ruinCurrentCell(game,citizenId)
  const citizen=game.citizens.find((candidate)=>candidate.id===citizenId)??null
  const [now,setNow]=useState(()=>Date.now())
  useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer)},[])
  const oxygen=explorer?.active?oxygenSecondsRemaining(explorer,now):0
  useEffect(()=>{if(explorer?.active&&oxygen<=0)onResult(expireRuinExploration(game,citizenId,now))},[citizenId,explorer?.active,game,now,onResult,oxygen])
  const ruinId=normalizeRuinId(zone.specialSite?.type??'')
  const ruin=ruinId?RUIN_CATALOG[ruinId]:null
  if(!explorer?.active||!interior||!cell||!ruin||!citizen)return null

  const currentRoom=explorer.inRoomId?interior.rooms.find((room)=>room.id===explorer.inRoomId)??null:null
  const roomAtCell=cell.roomId?interior.rooms.find((room)=>room.id===cell.roomId)??null:null
  const movementBlocked=cell.zombies>0&&!explorer.escaping
  const floorItems=cell.floorItems??[]
  const sharedActions=getRuinSharedActions(game,citizenId)
  const action=(result:RuinActionResult)=>onResult(result)
  const sharedAct=(command:GameCommand|undefined)=>{
    if(!command)return
    try{const result=executeRuinSharedAction(game,command);onResult({state:result.state,ok:true,message:'Action completed.'})}
    catch(caught){onResult({state:game,ok:false,message:caught instanceof Error?caught.message:'Action failed.'})}
  }
  const matchingKey=roomAtCell?.lockType?citizen.inventory.some((item)=>item.type===roomAtCell.lockType):false
  const floorLabel=ruinFloorLabel(cell.floor)

  return <div className="ruin-world-context">
    <div className="panel-heading">
      <div><p className="section-kicker">World Beyond · inside ruin · {citizen.name}</p><h2>{ruin.name}</h2><p className="section-note">{floorLabel} · position {cell.x}, {cell.y}. The first two rucksack slots remain locked Town Uniform and Profession Item equipment while exploring.</p></div>
      <div className="ruin-oxygen"><span>Oxygen</span><strong className={oxygen<=60?'danger-value':''}>{clock(oxygen)}</strong><small>{explorer.graceUntilMs!==null&&now<explorer.graceUntilMs?'ENTRY GRACE':'ACTIVE'}</small></div>
    </div>

    <div className="ruin-summary-strip"><span><strong>{floorLabel}</strong></span><span>{explorer.visitedRoomIds.length}/{interior.rooms.length} rooms visited</span><span>{interior.rooms.filter((room)=>room.searched).length}/{interior.rooms.length} searched</span><span>{cell.zombies} zombie{cell.zombies===1?'':'s'} here</span></div>

    <div className="world-inventory-grid">
      <section className="inventory-surface">
        <div className="inventory-heading"><h3>On the Ground</h3><span className="micro-stat">{floorItems.length}</span></div>
        <ItemStrip items={floorItems} disabledForItem={()=>citizen.inventory.length>=citizen.inventoryCapacity} onItemClick={(item)=>action(takeRuinFloorItem(game,citizenId,item.id,Date.now()))} emptyLabel="Nothing visible." extraTooltip={()=>citizen.inventory.length<citizen.inventoryCapacity?'Click to pick up.':'Your rucksack is full.'}/>
      </section>
      <section className="inventory-surface">
        <div className="inventory-heading"><h3>Rucksack</h3><span className="micro-stat">{citizen.inventory.length}/{citizen.inventoryCapacity} cargo · +2 equipment</span></div>
        <RucksackStrip citizen={citizen} onItemClick={(item)=>action(dropRuinInventoryItem(game,citizenId,item.id,Date.now()))} extraTooltip={()=> 'Click to drop this cargo item on the interior floor.'}/>
      </section>
    </div>

    <section className="inventory-actions-block">
      <div className="inventory-heading"><h3>Rucksack Actions</h3><span className="micro-stat">use or combine carried cargo</span></div>
      <ItemActionMenu items={citizen.inventory} actions={sharedActions} act={sharedAct} sourceForItem={()=> 'Rucksack'}/>
      <CombinationActionMenu actions={sharedActions} act={sharedAct}/>
    </section>

    <section className={`combat-panel ${movementBlocked?'combat-urgent':''}`}>
      <div className="section-heading-row"><div><p className="section-kicker">Interior combat</p><h3>{cell.zombies>0?`${cell.zombies} zombie${cell.zombies===1?'':'s'} present`:'Cell clear'}</h3></div></div>
      {cell.zombies===0?<p className="empty-state">There are no zombies in this corridor cell.</p>:<>
        <p className="combat-rule">Usable carried weapons appear in Rucksack Actions above.</p>
        {movementBlocked&&<div className="combat-actions"><button className="flee-action" onClick={()=>action(fleeRuinZombies(game,citizenId,Date.now()))}><strong>Flee through zombies</strong><small>−15–24 sec O₂</small></button></div>}
        {cell.zombies>0&&explorer.escaping&&<p className="ruin-inline-state">Escape route prepared. The next corridor movement can pass this threat.</p>}
      </>}
    </section>

    {currentRoom?<section className={`special-site-card ${currentRoom.searched?'status-depleted':'status-accessible'}`}>
      <div className="special-site-heading"><div><p className="section-kicker">Interior room</p><h3>Room {currentRoom.id.replace('room-','')}</h3></div><span>{currentRoom.searched?'SEARCHED':'UNSEARCHED'}</span></div>
      {currentRoom.searched?<p>This room has already been searched.</p>:<p>Search once for a source-weighted ruin find. If the rucksack has space, the find goes directly into it; otherwise it remains on this floor position.</p>}
      {!currentRoom.searched&&<button className="primary" onClick={()=>action(searchRuinRoom(game,citizenId,Date.now()))}>Search room <small>0 AP</small></button>}
      <button className="secondary ruin-context-button" onClick={()=>action(shiftRuinRoom(game,citizenId,Date.now()))}>Return to corridor</button>
    </section>:<>
      {roomAtCell&&<section className={`special-site-card ${roomAtCell.locked?'':'status-accessible'}`}>
        <div className="special-site-heading"><div><p className="section-kicker">Interior room</p><h3>Room {roomAtCell.id.replace('room-','')}</h3></div><span>{roomAtCell.locked?'LOCKED':roomAtCell.searched?'SEARCHED':'OPEN'}</span></div>
        {roomAtCell.locked&&roomAtCell.lockType?<><p>Requires {ruinKeyName(roomAtCell.lockType)}. Unlocking consumes the matching key.</p><button className="secondary" disabled={movementBlocked||!matchingKey} onClick={()=>action(unlockRuinRoom(game,citizenId,Date.now()))}>Unlock with {ruinKeyName(roomAtCell.lockType)}</button></>:<button className="primary" disabled={movementBlocked} onClick={()=>action(shiftRuinRoom(game,citizenId,Date.now()))}>Enter room</button>}
      </section>}
      {cell.stairTo&&<section className="special-site-card status-accessible"><div className="special-site-heading"><div><p className="section-kicker">Interior transition</p><h3>Stairs</h3></div><span>−15–24 SEC O₂</span></div><button disabled={movementBlocked} onClick={()=>action(useRuinStairs(game,citizenId,Date.now()))}>Use stairs</button></section>}
      {cell.kind==='entrance'&&cell.floor===0&&<section className="world-town-return ruin-exit-strip"><div><p className="section-kicker">Ruin entrance</p><strong>The exterior is within reach.</strong><span>Leaving restores the World Beyond map and travel controls.</span></div><button type="button" className="primary" onClick={()=>action(leaveRuin(game,citizenId,Date.now()))}>Leave ruin</button></section>}
    </>}
  </div>
}
