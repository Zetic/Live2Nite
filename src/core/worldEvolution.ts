import { randomInt } from './rng'
import type { GameEvent, GameState, WorldState, WorldZombieChange } from './types'
import { distanceToTown, isTownGateZone, zoneKey } from './world'

/** Current default MyHordes rules expose these global respawn tuning values. */
export const SOURCE_MASSIVE_RESPAWN_THRESHOLD=50
export const SOURCE_MASSIVE_RESPAWN_FACTOR=0.5
/** The upstream setting's consuming implementation is not copied here. Live2Nite uses
 * the exposed threshold value as a percentage of its own deterministic Day-1 baseline. */
const LIVE2NITE_MASSIVE_RESPAWN_THRESHOLD_PERCENT=SOURCE_MASSIVE_RESPAWN_THRESHOLD

export interface DayOneZombieRange{min:number;max:number}

/**
 * Current MyHordes configuration exposes map size/margin and respawn tuning, but the
 * public source path inspected for this pass does not expose a stable per-distance
 * Day-1 zombie formula. Live2Nite therefore projects a safer town-adjacent progression
 * onto its much smaller 14x13 test map instead of pretending to copy an upstream
 * generator. Travel distance is Manhattan distance because that is the AP distance
 * citizens actually pay in Live2Nite.
 */
export function dayOneZombieRange(distance:number):DayOneZombieRange{
  const d=Math.max(0,Math.floor(distance))
  if(d<=1)return{min:0,max:0}
  if(d===2)return{min:0,max:1}
  if(d===3)return{min:0,max:2}
  if(d<=5)return{min:0,max:3}
  if(d<=7)return{min:1,max:4}
  if(d<=9)return{min:1,max:5}
  return{min:2,max:6}
}

function coordinateSeed(seed:number,x:number,y:number,label:number):number{
  const mixed=((seed>>>0)^Math.imul(x+41,0x45d9f3b)^Math.imul(y+53,0x119de1f3)^Math.imul(label+1,0x9e3779b1))>>>0
  return mixed||1
}

export function initialWorldZombieCount(seed:number,x:number,y:number):number{
  if(isTownGateZone(x,y))return 0
  const range=dayOneZombieRange(distanceToTown(x,y))
  return randomInt(coordinateSeed(seed,x,y,0x101),range.min,range.max).value
}

export function applyInitialWorldZombiePopulation(world:WorldState,seed:number):WorldState{
  const zones=Object.fromEntries(Object.entries(world.zones).map(([key,zone])=>[key,{...zone,zombies:initialWorldZombieCount(seed,zone.x,zone.y)}]))
  return{...world,zones}
}

function naturalGrowthChance(day:number,distance:number):number{
  if(distance<=1)return day>=4?Math.min(8,day):0
  if(distance===2)return Math.min(10,2+day)
  if(distance<=5)return Math.min(18,4+day*2)
  if(distance<=8)return Math.min(24,7+day*2)
  return Math.min(30,10+day*2)
}

function naturalEvolutionCount(state:GameState,x:number,y:number):number{
  const zone=state.world.zones[zoneKey(x,y)]
  if(!zone||isTownGateZone(x,y))return zone?.zombies??0
  const distance=distanceToTown(x,y)
  const chance=naturalGrowthChance(state.day,distance)
  const roll=randomInt(coordinateSeed(state.seed,x,y,state.day+0x220),1,100)
  if(zone.zombies===0){
    // Cleared starter approaches stay meaningfully clear. Farther empty zones can slowly
    // repopulate, but not with the old neighbor-pressure cascade.
    const repopulateChance=distance<=2?0:Math.max(1,Math.floor(chance*0.45))
    return roll.value<=repopulateChance?1:0
  }
  if(roll.value>chance)return zone.zombies
  const bonusRoll=randomInt(roll.state,1,100)
  const bonus=state.day>=6&&distance>=7&&bonusRoll.value<=12?2:1
  return Math.min(18,zone.zombies+bonus)
}

function baselinePopulation(state:GameState):number{
  return Object.values(state.world.zones).reduce((sum,zone)=>sum+initialWorldZombieCount(state.seed,zone.x,zone.y),0)
}

function applyMassiveRespawn(state:GameState,counts:Map<string,number>):void{
  const baseline=baselinePopulation(state)
  const current=[...counts.values()].reduce((sum,value)=>sum+value,0)
  if(baseline<=0||current*100>=baseline*LIVE2NITE_MASSIVE_RESPAWN_THRESHOLD_PERCENT)return
  let remaining=Math.max(1,Math.ceil((baseline-current)*SOURCE_MASSIVE_RESPAWN_FACTOR))
  const candidates=Object.values(state.world.zones)
    .filter((zone)=>!isTownGateZone(zone.x,zone.y)&&distanceToTown(zone.x,zone.y)>=3)
    .map((zone)=>({zone,rank:coordinateSeed(state.seed,zone.x,zone.y,state.day+0x330),distance:distanceToTown(zone.x,zone.y)}))
    .sort((left,right)=>right.distance-left.distance||left.rank-right.rank)
  if(!candidates.length)return
  let cursor=0
  while(remaining>0){
    const candidate=candidates[cursor%candidates.length]!
    const key=zoneKey(candidate.zone.x,candidate.zone.y)
    counts.set(key,Math.min(18,(counts.get(key)??candidate.zone.zombies)+1))
    remaining-=1;cursor+=1
    if(cursor>candidates.length*18)break
  }
}

export function worldZombieEvolutionChanges(state:GameState):WorldZombieChange[]{
  const counts=new Map<string,number>()
  for(const zone of Object.values(state.world.zones))counts.set(zoneKey(zone.x,zone.y),naturalEvolutionCount(state,zone.x,zone.y))
  applyMassiveRespawn(state,counts)
  const changes:WorldZombieChange[]=[]
  for(const zone of Object.values(state.world.zones).sort((a,b)=>a.y-b.y||a.x-b.x)){
    const after=counts.get(zoneKey(zone.x,zone.y))??zone.zombies
    if(after!==zone.zombies)changes.push({zoneKey:zoneKey(zone.x,zone.y),before:zone.zombies,after})
  }
  return changes
}

export function worldZombieEvolutionEvent(state:GameState):GameEvent|null{
  const changes=worldZombieEvolutionChanges(state)
  return changes.length?{type:'WORLD_ZOMBIES_EVOLVED',day:state.day,hour:0,changes}:null
}
