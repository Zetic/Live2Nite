import { getRuinExplorer, getRuinInterior, moveInsideRuin, ruinCurrentCell, type RuinActionResult, type RuinInteriorDirection } from '../../core/ruinExploration'
import { tamerRuinExitGuidance } from '../../core/tamer'
import type { GameState, WorldZone } from '../../core/types'
import '../ruin-exploration.css'

const DIRECTIONS:readonly {direction:RuinInteriorDirection;arrow:string;label:string;className:string;dx:number;dy:number}[]=[
  {direction:'NORTH',arrow:'↑',label:'North',className:'north',dx:0,dy:1},
  {direction:'WEST',arrow:'←',label:'West',className:'west',dx:-1,dy:0},
  {direction:'EAST',arrow:'→',label:'East',className:'east',dx:1,dy:0},
  {direction:'SOUTH',arrow:'↓',label:'South',className:'south',dx:0,dy:-1},
]

export function ruinFloorLabel(floor:number):string{return floor===0?'Entrance floor':floor<0?`Basement ${Math.abs(floor)}`:`Upper floor ${floor}`}

export function RuinInteriorMap({game,citizenId,zone}:{game:GameState;citizenId:string;zone:WorldZone}){
  const explorer=getRuinExplorer(game,citizenId),interior=getRuinInterior(zone),cell=ruinCurrentCell(game,citizenId)
  if(!explorer?.active||!interior||!cell)return <div className="world-map ruin-world-map" aria-label="Ruin map unavailable"/>
  const currentRoom=explorer.inRoomId?interior.rooms.find((room)=>room.id===explorer.inRoomId)??null:null
  const visibleCells=new Set(explorer.visitedCellIds),visibleRooms=new Set(explorer.visitedRoomIds)
  const floorCells=interior.cells.filter((candidate)=>candidate.floor===cell.floor),floorRooms=interior.rooms.filter((room)=>room.floor===cell.floor)
  const rows=[]
  for(let y=6;y>=-6;y-=1){
    const cells=[]
    for(let x=-6;x<=6;x+=1){
      const corridor=floorCells.find((candidate)=>candidate.x===x&&candidate.y===y)
      const room=floorRooms.find((candidate)=>candidate.x===x&&candidate.y===y)
      const current=Boolean(currentRoom?currentRoom.x===x&&currentRoom.y===y:cell.x===x&&cell.y===y)
      const known=Boolean((corridor&&visibleCells.has(corridor.id))||(room&&visibleRooms.has(room.id)))
      const roomState=room?room.locked?'locked':room.searched?'searched':'room':null
      const label=!known?'Unknown interior space':room?`Room ${room.id.replace('room-','')} · ${roomState}`:corridor?.kind==='entrance'?'Entrance':corridor?.kind==='stairs'?'Stairs':'Corridor'
      const marker=current?'●':known?(room?room.locked?'L':'R':corridor?.kind==='stairs'?'↕':corridor?.kind==='entrance'?'E':'·'):''
      cells.push(<span key={`${x}:${y}`} className={`map-cell ruin-map-cell ${known?'ruin-known':'intel-unknown'} ${room?'ruin-room':''} ${corridor?.kind==='stairs'?'ruin-stairs':''} ${corridor?.kind==='entrance'?'ruin-entrance':''} ${current?'player':''}`} title={label}><span className="ruin-map-marker">{marker}</span></span>)
    }
    rows.push(<div className="map-row" key={y}>{cells}</div>)
  }
  return <>
    <div className="world-map ruin-world-map" aria-label={`${ruinFloorLabel(cell.floor)} explored ruin map`}>{rows}</div>
    <div className="map-key" aria-label="Ruin map legend"><span><b>●</b> explorer</span><span><b>E</b> entrance</span><span><b>↕</b> stairs</span><span><b>R</b> room</span><span><b>L</b> locked</span><span><i className="map-key-swatch intel-unknown"/>unknown</span></div>
  </>
}

export function RuinInteriorTravelControls({game,citizenId,onResult}:{game:GameState;citizenId:string;onResult:(result:RuinActionResult)=>void}){
  const explorer=getRuinExplorer(game,citizenId),cell=ruinCurrentCell(game,citizenId)
  const citizen=game.citizens.find((candidate)=>candidate.id===citizenId)
  const zone=citizen?.location.type==='world'?game.world.zones[`${citizen.location.x},${citizen.location.y}`]:null
  const interior=getRuinInterior(zone)
  if(!explorer?.active||!cell||!interior||!citizen)return null
  const currentRoom=explorer.inRoomId?interior.rooms.find((room)=>room.id===explorer.inRoomId)??null:null
  const movementBlocked=cell.zombies>0&&!explorer.escaping
  const guidance=tamerRuinExitGuidance(citizen,interior,cell)
  const guidanceText=guidance?.kind==='direction'?`Three-Legged Maltese points toward the exit: ${guidance.direction.charAt(0)+guidance.direction.slice(1).toLowerCase()}.`:guidance?.kind==='stairs'?'Three-Legged Maltese points to the stairs as the route toward the exit.':guidance?.kind==='exit'?'Three-Legged Maltese indicates that the ruin exit is here.':null
  const canMove=(direction:(typeof DIRECTIONS)[number])=>!currentRoom&&!movementBlocked&&interior.cells.some((candidate)=>candidate.floor===cell.floor&&candidate.x===cell.x+direction.dx&&candidate.y===cell.y+direction.dy)
  return <section className="map-travel-controls" aria-label="Ruin interior travel controls">
    <div className="map-travel-heading"><div><p className="section-kicker">Navigation</p><h3>Interior</h3></div><span>0 AP / move</span></div>
    {guidanceText&&<div className="ruin-inline-state tamer-exit-guidance">{guidanceText}</div>}
    <div className="direction-pad">
      {DIRECTIONS.map((direction)=>{const suggested=guidance?.kind==='direction'&&guidance.direction===direction.direction;return <button type="button" key={direction.direction} className={`direction-button ${direction.className} ${suggested?'tamer-exit-direction':''}`} disabled={!canMove(direction)} onClick={()=>onResult(moveInsideRuin(game,citizenId,direction.direction,Date.now()))} aria-label={`Move ${direction.label.toLowerCase()} inside ruin${suggested?' toward exit':''}`} title={suggested?`${direction.label} · Three-Legged Maltese points toward the exit`:`Move ${direction.label.toLowerCase()} inside ruin`}><strong>{direction.arrow}</strong><small>{suggested?'EXIT':direction.label}</small></button>})}
      <div className="direction-pad-center" aria-hidden="true"><strong>0 AP</strong><small>corridor</small></div>
    </div>
  </section>
}
