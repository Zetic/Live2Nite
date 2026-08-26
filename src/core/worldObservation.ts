import { constructionUpgradeLevel } from './constructionUpgrades'
import { randomInt } from './rng'
import type { GameEvent, GameState } from './types'
import { isTownGateZone, zoneKey } from './world'

export type NightWindDirection='NW'|'N'|'NE'|'W'|'E'|'SW'|'S'|'SE'
const WIND_DIRECTIONS:readonly NightWindDirection[]=['NW','N','NE','W','E','SW','S','SE']
const OBSERVATION_RADIUS_BY_LEVEL:readonly number[]=[0,3,6,10]
const SEARCH_RECOVERY_BY_LEVEL:readonly number[]=[25,37,49,61,73,85]
export const SEARCHTOWER_MINIMUM_DISTANCE=2

function isolatedWorldSeed(seed:number,day:number,salt:number):number{const mixed=((seed>>>0)^Math.imul(day+1,0x85ebca6b)^salt)>>>0;return mixed||1}
export function observationPlatformRadius(state:GameState):number{
  if(!state.town.construction.observation_platform?.completed)return 0
  const level=Math.min(3,constructionUpgradeLevel(state,'observation_platform'))
  return OBSERVATION_RADIUS_BY_LEVEL[level]??0
}
export function upgradedMapExact(state:GameState):boolean{return state.town.construction.upgraded_map?.completed===true}
export function searchTowerRecoveryChance(state:GameState):number{
  if(!state.town.construction.search_tower?.completed)return 0
  const level=Math.min(5,constructionUpgradeLevel(state,'search_tower'))
  return SEARCH_RECOVERY_BY_LEVEL[level]??SEARCH_RECOVERY_BY_LEVEL[0]
}
export function searchTowerWindDirectionForDay(seed:number,day:number):NightWindDirection{
  const roll=randomInt(isolatedWorldSeed(seed,day,0x51ea7e11),0,WIND_DIRECTIONS.length-1)
  return WIND_DIRECTIONS[roll.value]!
}
export function zoneWindDirection(x:number,y:number):NightWindDirection|null{
  if(x===0&&y===0)return null
  const angle=Math.atan2(y,x)*180/Math.PI
  if(angle>=-22.5&&angle<22.5)return'E'
  if(angle>=22.5&&angle<67.5)return'NE'
  if(angle>=67.5&&angle<112.5)return'N'
  if(angle>=112.5&&angle<157.5)return'NW'
  if(angle>=157.5||angle<-157.5)return'W'
  if(angle>=-157.5&&angle<-112.5)return'SW'
  if(angle>=-112.5&&angle<-67.5)return'S'
  return'SE'
}
function zoneDistance(x:number,y:number):number{return Math.sqrt(x*x+y*y)}
function estimatedZombieBand(zombies:number):number{
  if(zombies<=0)return 0
  if(zombies<=2)return 2
  if(zombies<=4)return 4
  return 5
}

/**
 * Nightly world observation updates shared town intelligence after zombie evolution.
 * Occupied zones always refresh. Observation Platform adds the voted radius around town.
 * Without Upgraded Map the observation records only Live2Nite's existing map band using
 * hour=-1 as an internal precision marker; Upgraded Map records the exact evolved count.
 */
export function nightlyObservationEvents(state:GameState):GameEvent[]{
  const radius=observationPlatformRadius(state)
  const exact=upgradedMapExact(state)
  const occupied=new Set(state.citizens.filter((citizen)=>citizen.alive&&citizen.location.type==='world').map((citizen)=>zoneKey(citizen.location.x,citizen.location.y)))
  const events:GameEvent[]=[]
  const nextDay=state.day+1
  for(const [key,zone] of Object.entries(state.world.zones)){
    if(isTownGateZone(zone.x,zone.y))continue
    if(zoneDistance(zone.x,zone.y)>radius&&!occupied.has(key))continue
    if(!zone.discovered)events.push({type:'ZONE_DISCOVERED',day:nextDay,hour:0,zoneKey:key})
    events.push({type:'ZONE_OBSERVED',day:nextDay,hour:exact?0:-1,zoneKey:key,zombies:exact?zone.zombies:estimatedZombieBand(zone.zombies)})
  }
  return events
}

export function searchTowerReplenishmentEventsForNight(state:GameState,lootPool:readonly import('./types').ItemType[]):GameEvent[]{
  const percent=searchTowerRecoveryChance(state)
  if(percent<=0||lootPool.length===0)return[]
  const wind=searchTowerWindDirectionForDay(state.seed,state.day)
  const candidates=Object.values(state.world.zones)
    .filter((zone)=>!isTownGateZone(zone.x,zone.y)&&zone.searchesRemaining===0&&zoneDistance(zone.x,zone.y)>SEARCHTOWER_MINIMUM_DISTANCE&&zoneWindDirection(zone.x,zone.y)===wind)
    .sort((a,b)=>a.y-b.y||a.x-b.x)
  let rng=isolatedWorldSeed(state.seed,state.day,0x5ea2c4a1)
  const events:GameEvent[]=[]
  for(const zone of candidates){
    const chance=randomInt(rng,1,100);rng=chance.state
    if(chance.value>percent)continue
    const loot=randomInt(rng,0,lootPool.length-1);rng=loot.state
    events.push({type:'ZONE_REPLENISHED',day:state.day,hour:0,zoneKey:zoneKey(zone.x,zone.y),loot:lootPool[loot.value]!})
  }
  return events
}
