import { explorableBlueprintSpecFromSourceRef } from './explorableBlueprints'
import type { ItemState, ItemType } from './itemCatalog'
import { normalizeInitialRuinZombieProfile } from './ruinEvolution'
import type { RuinInteriorRoom, RuinInteriorState } from './ruinExploration'

export const RUIN_LOCK_DISTANCE=10
export const RUIN_ITEM_FILLRATE=7

export type RuinKeyType='magnetic_key'|'bump_key'|'bottle_opener'

export const RUIN_KEY_TYPES:readonly RuinKeyType[]=['magnetic_key','bump_key','bottle_opener']
export const RUIN_KEY_SOURCE_REFS:Readonly<Record<string,RuinKeyType>>={
  'magneticKey_#00':'magnetic_key',
  'bumpKey_#00':'bump_key',
  'classicKey_#00':'bottle_opener',
}

const RUIN_KEY_NAMES:Readonly<Record<RuinKeyType,string>>={
  magnetic_key:'Magnetic Key',
  bump_key:'Bump Key',
  bottle_opener:'Bottle Opener',
}

export interface RuinRoomLootSpec{type:ItemType;state?:ItemState}

function stableHash(seed:number,x:number,y:number,label:string):number{
  let value=(seed^Math.imul(x+101,0x9e3779b1)^Math.imul(y+211,0x85ebca6b))>>>0
  for(let i=0;i<label.length;i+=1)value=Math.imul(value^label.charCodeAt(i),16777619)>>>0
  return value>>>0
}

function adjacentCellIds(interior:RuinInteriorState,cellId:string):string[]{
  const cell=interior.cells.find((candidate)=>candidate.id===cellId)
  if(!cell)return[]
  const adjacent=interior.cells.filter((candidate)=>candidate.floor===cell.floor&&Math.abs(candidate.x-cell.x)+Math.abs(candidate.y-cell.y)===1).map((candidate)=>candidate.id)
  if(cell.stairTo)adjacent.push(cell.stairTo)
  return adjacent
}

function distancesFromEntrance(interior:RuinInteriorState):Map<string,number>{
  const entrance=interior.cells.find((cell)=>cell.floor===0&&cell.kind==='entrance')
  const distances=new Map<string,number>()
  if(!entrance)return distances
  const queue=[entrance.id]
  distances.set(entrance.id,0)
  while(queue.length){
    const current=queue.shift()!
    const distance=distances.get(current)!
    for(const neighbor of adjacentCellIds(interior,current))if(!distances.has(neighbor)){distances.set(neighbor,distance+1);queue.push(neighbor)}
  }
  return distances
}

export function ruinRoomDistanceFromEntrance(interior:RuinInteriorState,room:RuinInteriorRoom):number{
  return distancesFromEntrance(interior).get(room.corridorCellId)??Number.POSITIVE_INFINITY
}

/**
 * Applies current source configuration to Live2Nite's own deterministic topology.
 * MyHordes' room lock setting is a distance threshold of 10. The exact upstream
 * room-prototype/maze identities are intentionally not copied, so matching key
 * families and the seven stocked rooms are selected deterministically from the
 * Live2Nite town seed and semantic room identities.
 */
export function prepareRuinInteriorContent(seed:number,x:number,y:number,interior:RuinInteriorState):RuinInteriorState{
  const normalized=normalizeInitialRuinZombieProfile(seed,x,y,interior)
  const distances=distancesFromEntrance(normalized)
  const stockedIds=new Set(normalized.rooms
    .map((room)=>({id:room.id,rank:stableHash(seed,x,y,`${normalized.family}:stock:${room.id}`)}))
    .sort((left,right)=>left.rank-right.rank||left.id.localeCompare(right.id))
    .slice(0,Math.min(RUIN_ITEM_FILLRATE,normalized.rooms.length))
    .map((entry)=>entry.id))
  const rooms=normalized.rooms.map((room)=>{
    if(room.lockType!==undefined)return{...room,stocked:room.stocked??stockedIds.has(room.id)}
    const distance=distances.get(room.corridorCellId)??Number.POSITIVE_INFINITY
    if(distance<RUIN_LOCK_DISTANCE)return{...room,locked:false,lockType:null,stocked:room.stocked??stockedIds.has(room.id)}
    const key=RUIN_KEY_TYPES[stableHash(seed,x,y,`${normalized.family}:lock:${room.id}`)%RUIN_KEY_TYPES.length]!
    return{...room,locked:true,lockType:key,stocked:room.stocked??stockedIds.has(room.id)}
  })
  return{...normalized,cells:normalized.cells.map((cell)=>({...cell,floorItems:cell.floorItems??[]})),rooms}
}

export function ruinKeyName(type:RuinKeyType):string{return RUIN_KEY_NAMES[type]}

/** Resolve one source-table result without redistributing unsupported outcomes. */
export function ruinRoomLootSpecFromSourceRef(sourceRef:string,runtimeType:ItemType|null):RuinRoomLootSpec|null{
  const keyType=RUIN_KEY_SOURCE_REFS[sourceRef]
  if(keyType)return{type:keyType}
  const plan=explorableBlueprintSpecFromSourceRef(sourceRef)
  if(plan)return{type:plan.type,state:plan.state}
  return runtimeType?{type:runtimeType}:null
}
