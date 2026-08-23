import { randomInt } from './rng'
import type { GameEvent, GameState, WorldZombieChange } from './types'
import { distanceToTown, getZone, isTownGateZone, moveCoordinates, zoneKey } from './world'

const DIRECTIONS = ['NORTH','SOUTH','EAST','WEST'] as const
const MAX_ZONE_ZOMBIES = 18

function evolutionSeed(state:GameState,x:number,y:number):number{
  const coordinateSalt=Math.imul(x+31,0x45d9f3b)^Math.imul(y+37,0x119de1f3)
  const mixed=((state.seed>>>0)^Math.imul(state.day+1,0x9e3779b1)^coordinateSalt^0x57a17e5)>>>0
  return mixed||1
}

function neighborPressure(state:GameState,x:number,y:number):{sum:number;average:number}{
  const neighbors=DIRECTIONS.flatMap((direction)=>{const next=moveCoordinates(x,y,direction);const zone=getZone(state.world,next.x,next.y);return zone?[zone.zombies]:[]})
  const sum=neighbors.reduce((total,value)=>total+value,0)
  return{sum,average:neighbors.length?sum/neighbors.length:0}
}

function evolvedZombieCount(state:GameState,x:number,y:number):number{
  const zone=getZone(state.world,x,y)
  if(!zone||isTownGateZone(x,y))return zone?.zombies??0
  const pressure=neighborPressure(state,x,y)
  const chance=randomInt(evolutionSeed(state,x,y),1,100)
  const magnitude=randomInt(chance.state,1,100)

  if(zone.zombies===0){
    const spreadChance=Math.min(30,Math.floor(pressure.sum*1.8)+state.day)
    if(pressure.sum>0&&chance.value<=spreadChance)return magnitude.value<=12?2:1
    return 0
  }

  const growthChance=Math.min(30,5+state.day+Math.floor(pressure.average)+Math.floor(distanceToTown(x,y)/4))
  if(chance.value<=growthChance){
    const growth=state.day>=5&&magnitude.value<=18?2:1
    return Math.min(MAX_ZONE_ZOMBIES,zone.zombies+growth)
  }

  // Isolated pockets can occasionally thin out. This keeps evolution spatial rather
  // than turning every square into a one-way global counter.
  if(chance.value>=98&&pressure.average<zone.zombies/2)return Math.max(0,zone.zombies-1)
  return zone.zombies
}

export function worldZombieEvolutionChanges(state:GameState):WorldZombieChange[]{
  const changes:WorldZombieChange[]=[]
  for(const zone of Object.values(state.world.zones).sort((a,b)=>a.y-b.y||a.x-b.x)){
    if(isTownGateZone(zone.x,zone.y))continue
    const after=evolvedZombieCount(state,zone.x,zone.y)
    if(after!==zone.zombies)changes.push({zoneKey:zoneKey(zone.x,zone.y),before:zone.zombies,after})
  }
  return changes
}

export function worldZombieEvolutionEvent(state:GameState):GameEvent|null{
  const changes=worldZombieEvolutionChanges(state)
  return changes.length?{type:'WORLD_ZOMBIES_EVOLVED',day:state.day,hour:0,changes}:null
}
