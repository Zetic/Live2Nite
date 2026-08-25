import { RUIN_CATALOG } from './ruinCatalog'
import { prepareRuinInteriorContent } from './ruinRoomContent'
import type { RuinKeyType } from './ruinRoomContent'
import { normalizeRuinId } from './specialSites'
import type { Citizen, GameState, ItemInstance, SpecialSiteState, WorldZone, WoundLocation } from './types'
import { getZone, zoneControlState, zoneKey } from './world'

export const RUIN_ROOM_COUNT=15
export const RUIN_FLOOR_COUNT=2
export const RUIN_GRID_SIZE=13
export const RUIN_MIN_ROOMS_PER_FLOOR=5
export const RUIN_OXYGEN_SECONDS=300
export const RUIN_ENTRY_GRACE_SECONDS=30
export const RUIN_TIME_PENALTY_MIN_SECONDS=15
export const RUIN_TIME_PENALTY_MAX_SECONDS=24
export const RUIN_INITIAL_ZOMBIES=10

export type RuinInteriorCellKind='entrance'|'corridor'|'stairs'
export type RuinInteriorDirection='NORTH'|'SOUTH'|'EAST'|'WEST'
export interface RuinInteriorCell{id:string;floor:number;x:number;y:number;kind:RuinInteriorCellKind;roomId:string|null;stairTo:string|null;zombies:number;floorItems?:ItemInstance[]}
export interface RuinInteriorRoom{id:string;floor:number;x:number;y:number;corridorCellId:string;locked:boolean;searched:boolean;lockType?:RuinKeyType|null;stocked?:boolean}
export interface RuinInteriorState{
  version:1
  family:'hotel'|'hospital'|'bunker'
  cells:RuinInteriorCell[]
  rooms:RuinInteriorRoom[]
  activeExplorerCitizenId:string|null
}
export interface RuinExplorerState{
  active:boolean
  zoneKey:string
  ruinId:string
  exploredDay:number
  cellId:string
  inRoomId:string|null
  oxygenDeadlineMs:number
  graceUntilMs:number|null
  escaping:boolean
  steps:number
  visitedCellIds:string[]
  visitedRoomIds:string[]
}
export interface RuinActionResult{state:GameState;ok:boolean;message:string}

type CitizenWithRuin=Citizen&{ruinExplorer?:RuinExplorerState}
type SiteWithInterior=SpecialSiteState&{interior?:RuinInteriorState}

const WOUNDS:readonly WoundLocation[]=['head','eye','arms','hands','leg','foot']
const DIRECTIONS:Readonly<Record<RuinInteriorDirection,{dx:number;dy:number}>>={
  NORTH:{dx:0,dy:1},SOUTH:{dx:0,dy:-1},EAST:{dx:1,dy:0},WEST:{dx:-1,dy:0},
}

function mixSeed(seed:number,x:number,y:number,label:string):number{
  let state=(seed^Math.imul(x+101,0x9e3779b1)^Math.imul(y+211,0x85ebca6b))>>>0
  for(let i=0;i<label.length;i+=1){state=Math.imul(state^label.charCodeAt(i),16777619)>>>0}
  return state||0x6d2b79f5
}
function next(state:number):{state:number;value:number}{
  let x=state|0;x^=x<<13;x^=x>>>17;x^=x<<5
  const nextState=x>>>0||0x6d2b79f5
  return{state:nextState,value:nextState/0x100000000}
}
function int(state:number,min:number,max:number):{state:number;value:number}{const n=next(state);return{state:n.state,value:Math.floor(n.value*(max-min+1))+min}}
function cellId(floor:number,x:number,y:number):string{return`${floor}:${x}:${y}`}

function corridorCells(floor:number):RuinInteriorCell[]{
  const cells:RuinInteriorCell[]=[]
  for(let x=-5;x<=5;x+=1)cells.push({id:cellId(floor,x,0),floor,x,y:0,kind:floor===0&&x===0?'entrance':'corridor',roomId:null,stairTo:null,zombies:0})
  for(let y=-5;y<=5;y+=1)if(y!==0)cells.push({id:cellId(floor,0,y),floor,x:0,y,kind:'corridor',roomId:null,stairTo:null,zombies:0})
  return cells
}

function roomCandidates(floor:number,cells:RuinInteriorCell[],state:number):{state:number;entries:Array<{cell:RuinInteriorCell;roomX:number;roomY:number}>}{
  const candidates=cells.filter((cell)=>cell.kind!=='entrance'&&!(cell.x===0&&cell.y===5)&&((cell.y===0&&Math.abs(cell.x)>=2)||(cell.x===0&&Math.abs(cell.y)>=2)))
  let rng=state
  const entries=candidates.map((cell)=>{
    const signRoll=int(rng,0,1);rng=signRoll.state;const sign=signRoll.value===0?-1:1
    return cell.y===0?{cell,roomX:cell.x,roomY:sign}:{cell,roomX:sign,roomY:cell.y}
  })
  for(let i=entries.length-1;i>0;i-=1){const draw=int(rng,0,i);rng=draw.state;[entries[i],entries[draw.value]]=[entries[draw.value],entries[i]]}
  return{state:rng,entries}
}

export function generateRuinInterior(seed:number,x:number,y:number,ruinType:SpecialSiteState['type']):RuinInteriorState{
  const ruinId=normalizeRuinId(ruinType)
  const definition=ruinId?RUIN_CATALOG[ruinId]:null
  if(!definition?.explorable||!definition.family)throw new Error('This special site is not an explorable ruin.')
  let rng=mixSeed(seed,x,y,ruinId)
  const countDraw=int(rng,RUIN_MIN_ROOMS_PER_FLOOR,RUIN_ROOM_COUNT-RUIN_MIN_ROOMS_PER_FLOOR);rng=countDraw.state
  const floorZeroRooms=countDraw.value
  const upperFloor=definition.family==='bunker'?-1:1
  const floors=[0,upperFloor]
  const cells=floors.flatMap(corridorCells)
  const stairA=cells.find((cell)=>cell.floor===0&&cell.x===0&&cell.y===5)!
  const stairB=cells.find((cell)=>cell.floor===upperFloor&&cell.x===0&&cell.y===5)!
  stairA.kind='stairs';stairB.kind='stairs';stairA.stairTo=stairB.id;stairB.stairTo=stairA.id
  const rooms:RuinInteriorRoom[]=[]
  for(const [index,floor] of floors.entries()){
    const floorCells=cells.filter((cell)=>cell.floor===floor)
    const generated=roomCandidates(floor,floorCells,rng);rng=generated.state
    const count=index===0?floorZeroRooms:RUIN_ROOM_COUNT-floorZeroRooms
    for(const candidate of generated.entries.slice(0,count)){
      const room:RuinInteriorRoom={id:`room-${rooms.length+1}`,floor,x:candidate.roomX,y:candidate.roomY,corridorCellId:candidate.cell.id,locked:false,searched:false}
      rooms.push(room);candidate.cell.roomId=room.id
    }
  }
  const zombieCells=cells.filter((cell)=>cell.kind!=='entrance')
  for(let i=0;i<RUIN_INITIAL_ZOMBIES;i+=1){const draw=int(rng,0,zombieCells.length-1);rng=draw.state;zombieCells[draw.value].zombies+=1}
  return prepareRuinInteriorContent(seed,x,y,{version:1,family:definition.family,cells,rooms,activeExplorerCitizenId:null})
}

export function getRuinExplorer(game:GameState,citizenId:string):RuinExplorerState|null{
  return((game.citizens.find((citizen)=>citizen.id===citizenId) as CitizenWithRuin|undefined)?.ruinExplorer)??null
}
export function getRuinInterior(zone:WorldZone|null|undefined):RuinInteriorState|null{return((zone?.specialSite as SiteWithInterior|undefined)?.interior)??null}
export function oxygenSecondsRemaining(explorer:RuinExplorerState,nowMs=Date.now()):number{
  const graceRemaining=explorer.graceUntilMs===null?0:Math.max(0,explorer.graceUntilMs-nowMs)
  return Math.max(0,Math.ceil((explorer.oxygenDeadlineMs-nowMs-graceRemaining)/1000))
}
export function ruinCurrentCell(game:GameState,citizenId:string):RuinInteriorCell|null{
  const explorer=getRuinExplorer(game,citizenId);if(!explorer?.active)return null
  const citizen=game.citizens.find((candidate)=>candidate.id===citizenId);if(!citizen||citizen.location.type!=='world')return null
  return getRuinInterior(getZone(game.world,citizen.location.x,citizen.location.y))?.cells.find((cell)=>cell.id===explorer.cellId)??null
}

function updateSite(game:GameState,x:number,y:number,updater:(site:SiteWithInterior)=>SiteWithInterior):GameState{
  const key=zoneKey(x,y),zone=game.world.zones[key];if(!zone?.specialSite)return game
  return{...game,world:{...game.world,zones:{...game.world.zones,[key]:{...zone,specialSite:updater(zone.specialSite as SiteWithInterior)}}}}
}
function updateCitizen(game:GameState,citizenId:string,updater:(citizen:CitizenWithRuin)=>CitizenWithRuin):GameState{
  return{...game,citizens:game.citizens.map((citizen)=>citizen.id===citizenId?updater(citizen as CitizenWithRuin):citizen)}
}
function setExplorer(game:GameState,citizenId:string,explorer:RuinExplorerState):GameState{return updateCitizen(game,citizenId,(citizen)=>({...citizen,ruinExplorer:explorer}))}
function cancelGrace(explorer:RuinExplorerState,nowMs:number):RuinExplorerState{
  if(explorer.graceUntilMs===null)return explorer
  const unused=Math.max(0,explorer.graceUntilMs-nowMs)
  return{...explorer,oxygenDeadlineMs:explorer.oxygenDeadlineMs-unused,graceUntilMs:null}
}
function penaltySeconds(game:GameState,explorer:RuinExplorerState,label:string):number{
  const state=mixSeed(game.seed,explorer.steps,explorer.exploredDay,`${explorer.zoneKey}:${label}:${explorer.cellId}`)
  return int(state,RUIN_TIME_PENALTY_MIN_SECONDS,RUIN_TIME_PENALTY_MAX_SECONDS).value
}
function currentContext(game:GameState,citizenId:string):{citizen:CitizenWithRuin;zone:WorldZone;site:SiteWithInterior;interior:RuinInteriorState;explorer:RuinExplorerState;cell:RuinInteriorCell}|null{
  const citizen=game.citizens.find((candidate)=>candidate.id===citizenId) as CitizenWithRuin|undefined
  const explorer=citizen?.ruinExplorer
  if(!citizen||!explorer?.active||citizen.location.type!=='world')return null
  const zone=getZone(game.world,citizen.location.x,citizen.location.y);const site=zone?.specialSite as SiteWithInterior|undefined;const interior=site?.interior
  const cell=interior?.cells.find((candidate)=>candidate.id===explorer.cellId)
  return zone&&site&&interior&&cell?{citizen,zone,site,interior,explorer,cell}:null
}
function fail(game:GameState,message:string):RuinActionResult{return{state:game,ok:false,message}}

export function expireRuinExploration(game:GameState,citizenId:string,nowMs=Date.now()):RuinActionResult{
  const context=currentContext(game,citizenId);if(!context)return fail(game,'No active ruin exploration.')
  if(oxygenSecondsRemaining(context.explorer,nowMs)>0)return{state:game,ok:true,message:'Oxygen remains.'}
  const wound=WOUNDS[mixSeed(game.seed,context.explorer.steps,game.day,context.explorer.cellId)%WOUNDS.length]
  const dropped=[...context.citizen.inventory]
  let next=setExplorer(game,citizenId,{...context.explorer,active:false,escaping:false,graceUntilMs:null})
  next=updateCitizen(next,citizenId,(citizen)=>({...citizen,inventory:[],status:{...citizen.status,wound:citizen.status.wound??wound}}))
  next=updateSite(next,context.zone.x,context.zone.y,(site)=>({...site,interior:{...context.interior,cells:context.interior.cells.map((cell)=>cell.id===context.cell.id?{...cell,floorItems:[...(cell.floorItems??[]),...dropped]}:cell),activeExplorerCitizenId:null}}))
  const dropMessage=dropped.length>0?` ${dropped.length} carried item${dropped.length===1?' was':'s were'} left on the interior floor.`:''
  return{state:next,ok:false,message:`Oxygen depleted. The explorer was forced out of the ruin and wounded during the escape.${dropMessage}`}
}
function requireOxygen(game:GameState,citizenId:string,nowMs:number):RuinActionResult|null{
  const explorer=getRuinExplorer(game,citizenId);if(!explorer?.active)return fail(game,'No active ruin exploration.')
  return oxygenSecondsRemaining(explorer,nowMs)<=0?expireRuinExploration(game,citizenId,nowMs):null
}

export function enterRuin(game:GameState,citizenId:string,nowMs=Date.now()):RuinActionResult{
  const citizen=game.citizens.find((candidate)=>candidate.id===citizenId) as CitizenWithRuin|undefined
  if(!citizen?.alive||citizen.location.type!=='world')return fail(game,'The citizen must be alive and standing at the ruin.')
  const zone=getZone(game.world,citizen.location.x,citizen.location.y);const site=zone?.specialSite as SiteWithInterior|undefined
  const ruinId=site?normalizeRuinId(site.type):null;const definition=ruinId?RUIN_CATALOG[ruinId]:null
  if(!zone||!site||!ruinId||!definition?.explorable||!definition.family||site.status==='buried')return fail(game,'This location is not an accessible explorable ruin.')
  if(citizen.status.wound||citizen.status.terrorized)return fail(game,'Wounded or terrorized citizens cannot enter an explorable ruin.')
  if(citizen.camping.hidden)return fail(game,'Leave the hiding place before entering the ruin.')
  if(citizen.ap<1)return fail(game,'Entering an explorable ruin costs 1 AP.')
  if(zoneControlState(game,zone.x,zone.y,citizenId)==='trapped')return fail(game,'Zombie control prevents entry into the ruin.')
  if(citizen.ruinExplorer?.active)return fail(game,'This citizen is already exploring a ruin.')
  if(citizen.ruinExplorer?.zoneKey===zoneKey(zone.x,zone.y)&&citizen.ruinExplorer.exploredDay===game.day)return fail(game,'This citizen cannot re-enter this ruin again today.')
  const interior=prepareRuinInteriorContent(game.seed,zone.x,zone.y,site.interior??generateRuinInterior(game.seed,zone.x,zone.y,site.type))
  if(interior.activeExplorerCitizenId&&interior.activeExplorerCitizenId!==citizenId)return fail(game,'Another citizen is already exploring this ruin.')
  const entrance=interior.cells.find((cell)=>cell.kind==='entrance'&&cell.floor===0)!
  const explorer:RuinExplorerState={
    active:true,zoneKey:zoneKey(zone.x,zone.y),ruinId,exploredDay:game.day,cellId:entrance.id,inRoomId:null,
    oxygenDeadlineMs:nowMs+(RUIN_OXYGEN_SECONDS+RUIN_ENTRY_GRACE_SECONDS)*1000,graceUntilMs:nowMs+RUIN_ENTRY_GRACE_SECONDS*1000,
    escaping:false,steps:0,visitedCellIds:[entrance.id],visitedRoomIds:[],
  }
  let next=updateCitizen(game,citizenId,(current)=>({...current,ap:current.ap-1,ruinExplorer:explorer}))
  next=updateSite(next,zone.x,zone.y,(current)=>({...current,interior:{...interior,activeExplorerCitizenId:citizenId}}))
  return{state:next,ok:true,message:`Entered ${definition.name}. The 30-second grace window is active until the first movement.`}
}

export function moveInsideRuin(game:GameState,citizenId:string,direction:RuinInteriorDirection,nowMs=Date.now()):RuinActionResult{
  const oxygen=requireOxygen(game,citizenId,nowMs);if(oxygen)return oxygen
  const context=currentContext(game,citizenId);if(!context)return fail(game,'No active ruin exploration.')
  if(context.explorer.inRoomId)return fail(game,'Return to the corridor before moving through the ruin.')
  if(context.cell.zombies>0&&!context.explorer.escaping)return fail(game,'Zombies block movement from this position. Flee first.')
  const delta=DIRECTIONS[direction]
  const destination=context.interior.cells.find((cell)=>cell.floor===context.cell.floor&&cell.x===context.cell.x+delta.dx&&cell.y===context.cell.y+delta.dy)
  if(!destination)return fail(game,'There is no corridor in that direction.')
  let explorer=cancelGrace(context.explorer,nowMs)
  explorer={...explorer,cellId:destination.id,escaping:false,steps:explorer.steps+1,visitedCellIds:explorer.visitedCellIds.includes(destination.id)?explorer.visitedCellIds:[...explorer.visitedCellIds,destination.id]}
  return{state:setExplorer(game,citizenId,explorer),ok:true,message:`Moved ${direction.toLowerCase()} through the ruin.`}
}

export function shiftRuinRoom(game:GameState,citizenId:string,nowMs=Date.now()):RuinActionResult{
  const oxygen=requireOxygen(game,citizenId,nowMs);if(oxygen)return oxygen
  const context=currentContext(game,citizenId);if(!context)return fail(game,'No active ruin exploration.')
  let explorer=cancelGrace(context.explorer,nowMs)
  if(explorer.inRoomId){explorer={...explorer,inRoomId:null,escaping:false,steps:explorer.steps+1};return{state:setExplorer(game,citizenId,explorer),ok:true,message:'Returned to the corridor.'}}
  if(context.cell.zombies>0&&!explorer.escaping)return fail(game,'Zombies block access to the room. Flee first.')
  if(!context.cell.roomId)return fail(game,'There is no room entrance at this corridor position.')
  const room=context.interior.rooms.find((candidate)=>candidate.id===context.cell.roomId);if(!room)return fail(game,'The room is unavailable.')
  if(room.locked)return fail(game,'This room is locked. Use its matching ruin key first.')
  explorer={...explorer,inRoomId:room.id,escaping:false,steps:explorer.steps+1,visitedRoomIds:explorer.visitedRoomIds.includes(room.id)?explorer.visitedRoomIds:[...explorer.visitedRoomIds,room.id]}
  return{state:setExplorer(game,citizenId,explorer),ok:true,message:'Entered the room.'}
}

export function useRuinStairs(game:GameState,citizenId:string,nowMs=Date.now()):RuinActionResult{
  const oxygen=requireOxygen(game,citizenId,nowMs);if(oxygen)return oxygen
  const context=currentContext(game,citizenId);if(!context)return fail(game,'No active ruin exploration.')
  if(context.explorer.inRoomId)return fail(game,'Return to the corridor before using the stairs.')
  if(context.cell.zombies>0&&!context.explorer.escaping)return fail(game,'Zombies block access to the stairs. Flee first.')
  if(!context.cell.stairTo)return fail(game,'There are no stairs here.')
  const destination=context.interior.cells.find((cell)=>cell.id===context.cell.stairTo);if(!destination)return fail(game,'The stair destination is unavailable.')
  let explorer=cancelGrace(context.explorer,nowMs);const penalty=penaltySeconds(game,explorer,'stairs')
  explorer={...explorer,cellId:destination.id,escaping:false,steps:explorer.steps+1,oxygenDeadlineMs:explorer.oxygenDeadlineMs-penalty*1000,visitedCellIds:explorer.visitedCellIds.includes(destination.id)?explorer.visitedCellIds:[...explorer.visitedCellIds,destination.id]}
  let next=setExplorer(game,citizenId,explorer)
  if(oxygenSecondsRemaining(explorer,nowMs)<=0)next=expireRuinExploration(next,citizenId,nowMs).state
  return{state:next,ok:true,message:`Used the stairs. ${penalty} seconds of oxygen were lost.`}
}

export function fleeRuinZombies(game:GameState,citizenId:string,nowMs=Date.now()):RuinActionResult{
  const oxygen=requireOxygen(game,citizenId,nowMs);if(oxygen)return oxygen
  const context=currentContext(game,citizenId);if(!context)return fail(game,'No active ruin exploration.')
  if(context.explorer.inRoomId)return fail(game,'Return to the corridor before fleeing.')
  if(context.cell.zombies<=0)return fail(game,'There are no zombies to flee from here.')
  if(context.explorer.escaping)return fail(game,'An escape route is already prepared.')
  const penalty=penaltySeconds(game,context.explorer,'flee')
  const explorer={...context.explorer,escaping:true,steps:context.explorer.steps+1,oxygenDeadlineMs:context.explorer.oxygenDeadlineMs-penalty*1000}
  let next=setExplorer(game,citizenId,explorer)
  if(oxygenSecondsRemaining(explorer,nowMs)<=0)next=expireRuinExploration(next,citizenId,nowMs).state
  return{state:next,ok:true,message:`Prepared an escape through the zombies. ${penalty} seconds of oxygen were lost.`}
}

export function leaveRuin(game:GameState,citizenId:string,nowMs=Date.now()):RuinActionResult{
  const oxygen=requireOxygen(game,citizenId,nowMs);if(oxygen)return oxygen
  const context=currentContext(game,citizenId);if(!context)return fail(game,'No active ruin exploration.')
  if(context.explorer.inRoomId||context.cell.kind!=='entrance'||context.cell.floor!==0)return fail(game,'The ruin can only be left from the entrance.')
  let next=setExplorer(game,citizenId,{...context.explorer,active:false,escaping:false,graceUntilMs:null})
  next=updateSite(next,context.zone.x,context.zone.y,(site)=>({...site,interior:{...context.interior,activeExplorerCitizenId:null}}))
  return{state:next,ok:true,message:'Left the explorable ruin.'}
}
