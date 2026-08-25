import { useEffect, useMemo, useState } from 'react'
import { itemName } from '../../core/items'
import { RUIN_CATALOG } from '../../core/ruinCatalog'
import {
  expireRuinExploration,
  fleeRuinZombies,
  getRuinExplorer,
  getRuinInterior,
  leaveRuin,
  moveInsideRuin,
  oxygenSecondsRemaining,
  ruinCurrentCell,
  shiftRuinRoom,
  useRuinStairs,
  type RuinActionResult,
  type RuinInteriorDirection,
} from '../../core/ruinExploration'
import { dropRuinInventoryItem, searchRuinRoom, takeRuinFloorItem, unlockRuinRoom } from '../../core/ruinRoomActions'
import { ruinKeyName } from '../../core/ruinRoomContent'
import { executeRuinSharedAction, getRuinSharedActions } from '../../core/ruinSharedActions'
import { normalizeRuinId } from '../../core/specialSites'
import type { GameCommand, GameState, WorldZone } from '../../core/types'
import { CombinationActionMenu, ItemActionMenu } from './InventoryItems'
import '../ruin-exploration.css'

const DIRECTIONS:readonly {id:RuinInteriorDirection;label:string;symbol:string;dx:number;dy:number}[]=[
  {id:'NORTH',label:'North',symbol:'↑',dx:0,dy:1},
  {id:'WEST',label:'West',symbol:'←',dx:-1,dy:0},
  {id:'SOUTH',label:'South',symbol:'↓',dx:0,dy:-1},
  {id:'EAST',label:'East',symbol:'→',dx:1,dy:0},
]
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
  const floorCells=useMemo(()=>interior&&cell?interior.cells.filter((candidate)=>candidate.floor===cell.floor):[],[interior,cell])
  const floorRooms=useMemo(()=>interior&&cell?interior.rooms.filter((room)=>room.floor===cell.floor):[],[interior,cell])
  if(!explorer?.active||!interior||!cell||!ruin||!citizen)return null
  const currentRoom=explorer.inRoomId?interior.rooms.find((room)=>room.id===explorer.inRoomId)??null:null
  const visibleCellIds=new Set(explorer.visitedCellIds)
  const visibleRoomIds=new Set(explorer.visitedRoomIds)
  const movementBlocked=cell.zombies>0&&!explorer.escaping
  const canMove=(direction:(typeof DIRECTIONS)[number])=>!currentRoom&&!movementBlocked&&floorCells.some((candidate)=>candidate.x===cell.x+direction.dx&&candidate.y===cell.y+direction.dy)
  const roomAtCell=cell.roomId?interior.rooms.find((room)=>room.id===cell.roomId)??null:null
  const floorLabel=cell.floor===0?'Entrance floor':cell.floor<0?`Basement ${Math.abs(cell.floor)}`:`Upper floor ${cell.floor}`
  const visitedRooms=explorer.visitedRoomIds.length
  const floorItems=cell.floorItems??[]
  const sharedActions=getRuinSharedActions(game,citizenId)
  const action=(result:RuinActionResult)=>onResult(result)
  const sharedAct=(command:GameCommand|undefined)=>{
    if(!command)return
    try{const result=executeRuinSharedAction(game,command);onResult({state:result.state,ok:true,message:'Action completed.'})}
    catch(caught){onResult({state:game,ok:false,message:caught instanceof Error?caught.message:'Action failed.'})}
  }
  const matchingKey=roomAtCell?.lockType?citizen.inventory.some((item)=>item.type===roomAtCell.lockType):false
  return <section className="ruin-interior-shell">
    <div className="ruin-interior-heading">
      <div><p className="section-kicker">Explorable ruin · {interior.family}</p><h2>{ruin.name}</h2><p className="section-note">Navigate corridors, use normal carried-item actions, search rooms, recover loot and return to the entrance before oxygen expires.</p></div>
      <div className="ruin-oxygen"><span>Oxygen</span><strong className={oxygen<=60?'danger-value':''}>{clock(oxygen)}</strong><small>{explorer.graceUntilMs!==null&&now<explorer.graceUntilMs?'ENTRY GRACE':'ACTIVE'}</small></div>
    </div>
    <div className="ruin-summary-strip"><span><strong>{floorLabel}</strong></span><span>{visitedRooms}/{interior.rooms.length} rooms visited</span><span>{interior.rooms.filter((room)=>room.searched).length}/{interior.rooms.length} searched</span><span>{cell.zombies} zombie{cell.zombies===1?'':'s'} here</span><span>{explorer.steps} interior moves</span></div>
    <div className="ruin-interior-layout">
      <section className="ruin-map-card">
        <div className="inventory-heading"><h3>{floorLabel}</h3><span className="micro-stat">13 × 13</span></div>
        <div className="ruin-grid" aria-label={`${floorLabel} explored map`}>
          {Array.from({length:13},(_,row)=>6-row).flatMap((y)=>Array.from({length:13},(_,column)=>column-6).map((x)=>{
            const corridor=floorCells.find((candidate)=>candidate.x===x&&candidate.y===y)
            const room=floorRooms.find((candidate)=>candidate.x===x&&candidate.y===y)
            const isCurrent=currentRoom?currentRoom.x===x&&currentRoom.y===y:cell.x===x&&cell.y===y
            const known=Boolean((corridor&&visibleCellIds.has(corridor.id))||(room&&visibleRoomIds.has(room.id)))
            const kind=room?'room':corridor?.kind??'void'
            const roomState=room?room.locked?' · locked':room.searched?' · searched':'' : ''
            const label=!known?'Unknown':room?`Room ${room.id.replace('room-','')}${roomState}`:corridor?.kind==='entrance'?'Entrance':corridor?.kind==='stairs'?'Stairs':'Corridor'
            return <span key={`${x}:${y}`} className={`ruin-grid-cell ${known?`known ${kind}`:'fog'} ${isCurrent?'current':''}`} title={label}>{isCurrent?'●':known?(room?room.locked?'▣':'□':corridor?.kind==='stairs'?'↕':corridor?.kind==='entrance'?'E':'·'):''}</span>
          }))}
        </div>
        <div className="ruin-map-legend"><span><b>●</b> Explorer</span><span><b>E</b> Entrance</span><span><b>↕</b> Stairs</span><span><b>□</b> Room</span><span><b>▣</b> Locked</span></div>
      </section>
      <section className="ruin-action-card">
        <div className="inventory-heading"><h3>{currentRoom?`Room ${currentRoom.id.replace('room-','')}`:'Corridor controls'}</h3><span className="micro-stat">{cell.x}, {cell.y}, z {cell.floor}</span></div>
        {currentRoom?<>
          <p>{currentRoom.searched?'This room has already been searched.':'Search this room once for a source-weighted ruin find. Searching costs no AP; the real-time oxygen clock continues running.'}</p>
          {!currentRoom.searched&&<button className="primary" onClick={()=>action(searchRuinRoom(game,citizenId,Date.now()))}>Search room</button>}
          <button className="secondary" onClick={()=>action(shiftRuinRoom(game,citizenId,Date.now()))}>Return to corridor</button>
        </>:<>
          {movementBlocked?<div className="ruin-danger-box"><strong>Zombies block the corridor.</strong><p>Use an available carried weapon below to clear this interior cell with the normal action system, or prepare the existing ruin escape action.</p><button className="flee-action" onClick={()=>action(fleeRuinZombies(game,citizenId,Date.now()))}>Flee through zombies <small>−15–24 sec O₂</small></button></div>:cell.zombies>0&&explorer.escaping?<div className="ruin-warning-box"><strong>Escape route prepared.</strong><p>The next corridor movement or room shift clears the escape state.</p></div>:null}
          <div className="ruin-movement" aria-label="Ruin movement controls">{DIRECTIONS.map((direction)=><button type="button" key={direction.id} disabled={!canMove(direction)} onClick={()=>action(moveInsideRuin(game,citizenId,direction.id,Date.now()))} title={direction.label}>{direction.symbol}<small>{direction.label}</small></button>)}</div>
          {roomAtCell&&<>
            {roomAtCell.locked&&roomAtCell.lockType?<div className="ruin-warning-box"><strong>Locked room</strong><p>Requires {ruinKeyName(roomAtCell.lockType)}. Unlocking consumes the matching key.</p><button className="secondary" disabled={movementBlocked||!matchingKey} onClick={()=>action(unlockRuinRoom(game,citizenId,Date.now()))}>Unlock with {ruinKeyName(roomAtCell.lockType)}</button></div>:null}
            <button className="primary ruin-room-button" disabled={movementBlocked||roomAtCell.locked} onClick={()=>action(shiftRuinRoom(game,citizenId,Date.now()))}>Enter room {roomAtCell.id.replace('room-','')} <small>{roomAtCell.locked?'Locked':roomAtCell.searched?'Searched':'Door'}</small></button>
          </>}
          {cell.stairTo&&<button className="ruin-stair-button" disabled={movementBlocked} onClick={()=>action(useRuinStairs(game,citizenId,Date.now()))}>Use stairs <small>−15–24 sec O₂</small></button>}
          {cell.kind==='entrance'&&cell.floor===0&&<button className="secondary ruin-exit-button" onClick={()=>action(leaveRuin(game,citizenId,Date.now()))}>Leave ruin</button>}
        </>}
        <div className="inventory-actions-block">
          <div className="inventory-heading"><h3>Rucksack Actions</h3><span className="micro-stat">shared action system</span></div>
          <p className="section-note">Food, water, containers, supported item effects, combinations and carried weapons use the same Live2Nite action rules as outside. Weapons target only the current corridor cell; bare-handed fighting is not exposed in explorable ruins.</p>
          <ItemActionMenu items={citizen.inventory} actions={sharedActions} act={sharedAct} sourceForItem={()=> 'Rucksack'}/>
          <CombinationActionMenu actions={sharedActions} act={sharedAct}/>
        </div>
        {floorItems.length>0&&<div className="ruin-warning-box"><strong>Items on this floor position</strong>{floorItems.map((item)=><p key={item.id}>{itemName(item.type)} <button type="button" disabled={citizen.inventory.length>=citizen.inventoryCapacity} onClick={()=>action(takeRuinFloorItem(game,citizenId,item.id,Date.now()))}>Take</button></p>)}</div>}
        {citizen.inventory.length>0&&<details><summary>Drop a carried item here</summary>{citizen.inventory.map((item)=><p key={item.id}>{itemName(item.type)} <button type="button" onClick={()=>action(dropRuinInventoryItem(game,citizenId,item.id,Date.now()))}>Drop</button></p>)}</details>}
        <div className="ruin-rule-note"><strong>Source rules active</strong><span>1 AP entry · one active explorer · five-minute oxygen budget · 30-second entry grace · two floors · 15 rooms · keyed deep rooms · seven stocked room searches · shared carried-item actions.</span></div>
      </section>
    </div>
  </section>
}
