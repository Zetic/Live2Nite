import type { Direction, GameState, WorldZone } from '../../core/types'
import { distanceToTown, getZone, moveCoordinates } from '../../core/world'

export interface Coord { x:number; y:number }
interface Node extends Coord { cost:number; path:Direction[] }
const DIRECTIONS:Direction[]=['NORTH','SOUTH','EAST','WEST']
function key(coord:Coord):string{return`${coord.x},${coord.y}`}
function same(a:Coord,b:Coord):boolean{return a.x===b.x&&a.y===b.y}
function stepCost(zone:WorldZone|undefined,isTarget:boolean):number{if(!zone)return 999;if(isTarget)return 1;if(!zone.discovered)return 1.25;if(zone.zombies>=6)return 7;if(zone.zombies>=3)return 3;return 1}

export function routeBetween(state:GameState,from:Coord,target:Coord):Direction[]{
  if(same(from,target))return[]
  const queue:Node[]=[{...from,cost:0,path:[]}]
  const best=new Map<string,number>([[key(from),0]])
  while(queue.length){queue.sort((a,b)=>a.cost-b.cost);const current=queue.shift()!;if(same(current,target))return current.path
    for(const direction of DIRECTIONS){const next=moveCoordinates(current.x,current.y,direction);const zone=getZone(state.world,next.x,next.y);if(!zone)continue;const cost=current.cost+stepCost(zone,same(next,target));const nextKey=key(next);if(cost>=(best.get(nextKey)??Infinity))continue;best.set(nextKey,cost);queue.push({...next,cost,path:[...current.path,direction]})}
  }
  return[]
}

export function nextDirectionToward(state:GameState,from:Coord,target:Coord):Direction|null{return routeBetween(state,from,target)[0]??null}
export function frontierZones(state:GameState):WorldZone[]{return Object.values(state.world.zones).filter((zone)=>!zone.discovered&&DIRECTIONS.some((direction)=>{const adjacent=moveCoordinates(zone.x,zone.y,direction);return getZone(state.world,adjacent.x,adjacent.y)?.discovered}))}

function sectorPenalty(citizenId:string,zone:WorldZone):number{const sector=(Number(citizenId.slice(1))||0)%4;if(sector===0)return zone.y>=0?0:5;if(sector===1)return zone.x>=0?0:5;if(sector===2)return zone.y<=0?0:5;return zone.x<=0?0:5}
export function chooseFrontierTarget(state:GameState,citizenId:string,excluded=new Set<string>()):WorldZone|null{
  const unknown=Object.values(state.world.zones).filter((zone)=>!zone.discovered&&distanceToTown(zone.x,zone.y)>0&&!excluded.has(`${zone.x},${zone.y}`))
  if(!unknown.length)return null
  const preferredRadius=3+((Number(citizenId.slice(1))||0)%4)
  return [...unknown].sort((a,b)=>{
    const crowdA=state.citizens.filter((citizen)=>citizen.alive&&citizen.location.type==='world'&&Math.abs(citizen.location.x-a.x)+Math.abs(citizen.location.y-a.y)<=1).length
    const crowdB=state.citizens.filter((citizen)=>citizen.alive&&citizen.location.type==='world'&&Math.abs(citizen.location.x-b.x)+Math.abs(citizen.location.y-b.y)<=1).length
    const scoreA=Math.abs(distanceToTown(a.x,a.y)-preferredRadius)*4+sectorPenalty(citizenId,a)+crowdA*3
    const scoreB=Math.abs(distanceToTown(b.x,b.y)-preferredRadius)*4+sectorPenalty(citizenId,b)+crowdB*3
    return scoreA-scoreB
  })[0]
}
