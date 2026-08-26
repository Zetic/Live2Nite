import { citizenEquipment, hasProfession, type ProfessionCitizen, type ProfessionId } from './professions'
import { randomInt } from './rng'
import { citizenControlPoints } from './status'
import type { Citizen, GameCommand, GameEvent, GameState, WorldZone } from './types'
import { zoneControlState, zoneKey } from './world'

export const SCOUT_BASE_POINTS=2
export const SCOUTS_LAIR_SCOUT_BONUS=4
export const SCOUTS_LAIR_ORDINARY_BONUS=2
export const SCOUT_LEVEL_VISITS=5
export const SCOUT_LEVEL_MAX=3
export const SCOUT_SEARCH_BONUS_PER_LEVEL=2.5
export const SCOUT_CAMPING_ZOMBIE_PENALTY=3
export const ORDINARY_CAMPING_ZOMBIE_PENALTY=7

export type ScoutMovementPointSource='sp'|'ap'
export type ScoutCamouflageReason='recamouflaged'|'detected'|'action'

export function isScout(citizen:Citizen):boolean{return hasProfession(citizen,'scout')}
export function startingScoutPoints(profession:ProfessionId):number{return profession==='scout'?SCOUT_BASE_POINTS:0}
export function scoutBasePoints(citizen:Citizen):number{return isScout(citizen)?SCOUT_BASE_POINTS:0}
export function scoutPointsAvailable(citizen:Citizen):number{return Math.max(0,citizen.scoutPoints??scoutBasePoints(citizen))}

/** Legacy Scout equipment without an explicit state is treated as the source starting state: camouflaged. */
export function scoutCamouflageActive(citizen:Citizen):boolean{
  const equipment=citizenEquipment(citizen)
  return equipment?.professionItem.type==='profession_camouflage_suit'&&equipment.professionItem.state?.camouflaged!==false
}

export function sourceScoutDistance(x:number,y:number):number{return Math.round(Math.hypot(x,y))}
export function scoutMovementPointSource(citizen:Citizen):ScoutMovementPointSource{
  if(citizen.location.type==='world'&&sourceScoutDistance(citizen.location.x,citizen.location.y)>=3&&scoutPointsAvailable(citizen)>0)return'sp'
  return'ap'
}
export function canPayMovementPoint(citizen:Citizen):boolean{return scoutMovementPointSource(citizen)==='sp'||citizen.ap>=1}
export function movementPointLabel(citizen:Citizen):string{return scoutMovementPointSource(citizen)==='sp'?'1 SP':'1 AP'}
export function movementPointEvent(state:GameState,citizen:Citizen):GameEvent{
  return scoutMovementPointSource(citizen)==='sp'
    ?{type:'SCOUT_POINTS_SPENT',day:state.day,hour:state.clock.hour,citizenId:citizen.id,amount:1}
    :{type:'AP_SPENT',day:state.day,hour:state.clock.hour,citizenId:citizen.id,amount:1}
}

export function scoutLevel(zone:WorldZone):number{
  if(zone.x===0&&zone.y===0)return 0
  return Math.min(SCOUT_LEVEL_MAX,Math.max(0,Math.floor((zone.scoutVisits??0)/SCOUT_LEVEL_VISITS)+(zone.scoutMarkers??0)))
}
export function scoutLevelAfterVisit(zone:WorldZone):number{
  if(zone.x===0&&zone.y===0)return 0
  return Math.min(SCOUT_LEVEL_MAX,Math.max(0,Math.floor(((zone.scoutVisits??0)+1)/SCOUT_LEVEL_VISITS)+(zone.scoutMarkers??0)))
}
export function scoutVisitsUntilNextLevel(zone:WorldZone):number{
  if(scoutLevel(zone)>=SCOUT_LEVEL_MAX)return 0
  const visits=zone.scoutVisits??0
  return SCOUT_LEVEL_VISITS-(visits%SCOUT_LEVEL_VISITS||0)
}
export function scoutSearchBonusPercent(zone:WorldZone|undefined|null):number{return zone?scoutLevel(zone)*SCOUT_SEARCH_BONUS_PER_LEVEL:0}

function citizenHash(id:string):number{let hash=2166136261>>>0;for(let index=0;index<id.length;index+=1)hash=Math.imul(hash^id.charCodeAt(index),16777619)>>>0;return hash}
function estimateOffset(state:GameState,citizen:Citizen,zone:WorldZone,range:number):number{
  if(range<=0)return 0
  let hash=(state.seed^citizenHash(citizen.id)^Math.imul(zone.x+31,0x9e3779b1)^Math.imul(zone.y+47,0x85ebca6b))>>>0
  hash=Math.imul(hash^(hash>>>16),0x7feb352d)>>>0
  hash=Math.imul(hash^(hash>>>15),0x846ca68b)>>>0
  hash=(hash^(hash>>>16))>>>0
  return(hash%(range*2+1))-range
}
export function scoutZombieEstimate(state:GameState,citizen:Citizen,zone:WorldZone):number|null{
  if(!isScout(citizen)||citizen.location.type!=='world')return null
  const adjacent=Math.abs(citizen.location.x-zone.x)+Math.abs(citizen.location.y-zone.y)===1
  if(!adjacent||zone.x===0&&zone.y===0)return null
  if(zone.zombies===0)return 0
  const range=Math.max(2-scoutLevel(zone),0)
  return Math.max(0,zone.zombies+estimateOffset(state,citizen,zone,range))
}

export function scoutsLairComplete(state:GameState):boolean{return Boolean(state.town.construction.scouts_lair?.completed)}
export function mappedWastelandToday(state:GameState,citizenId:string):boolean{
  return state.events.some((event)=>event.type==='SCOUT_MAPPING_COMPLETED'&&event.citizenId===citizenId&&event.day===state.day)
}
export function canMapWasteland(state:GameState,citizen:Citizen):boolean{
  return citizen.alive&&citizen.location.type==='town'&&citizen.ap>=1&&scoutsLairComplete(state)&&!mappedWastelandToday(state,citizen.id)
}
export function mappingBonusForCitizen(citizen:Citizen):number{return isScout(citizen)?SCOUTS_LAIR_SCOUT_BONUS:SCOUTS_LAIR_ORDINARY_BONUS}
export function mappingEvents(state:GameState,citizen:Citizen):GameEvent[]{
  const bonus=mappingBonusForCitizen(citizen)
  return[
    {type:'AP_SPENT',day:state.day,hour:state.clock.hour,citizenId:citizen.id,amount:1},
    {type:'SCOUT_MAPPING_COMPLETED',day:state.day,hour:state.clock.hour,citizenId:citizen.id,nextDayBonus:bonus},
  ]
}

export function canRecamouflage(state:GameState,citizen:Citizen):boolean{
  if(!isScout(citizen)||scoutCamouflageActive(citizen)||!citizen.alive)return false
  if(citizen.location.type==='town')return true
  const control=zoneControlState(state,citizen.location.x,citizen.location.y,citizen.id)
  return control==='secure'||control==='fragile'||control==='temporary'
}

export function scoutCanIgnoreZombieControl(citizen:Citizen):boolean{return scoutCamouflageActive(citizen)}

const COVER_BREAKING_COMMANDS=new Set<GameCommand['type']>([
  'SEARCH_ZONE','EXCAVATE_SPECIAL_SITE','SEARCH_SPECIAL_SITE','PICK_UP_ITEM','DROP_ITEM','ATTACK_BAREHANDED','USE_WEAPON','IMPROVE_CAMP','DIG_CAMPING_GRAVE','SURVIVALIST_SEARCH_FOOD','SURVIVALIST_SEARCH_WATER',
])
export function scoutExposureEvent(state:GameState,citizen:Citizen,command:GameCommand):GameEvent|null{
  if(!scoutCamouflageActive(citizen)||citizen.location.type!=='world'||!COVER_BREAKING_COMMANDS.has(command.type))return null
  if(zoneControlState(state,citizen.location.x,citizen.location.y,citizen.id)!=='trapped')return null
  return{type:'SCOUT_CAMOUFLAGE_SET',day:state.day,hour:state.clock.hour,citizenId:citizen.id,active:false,reason:'action'}
}

function arrivalControlPoints(state:GameState,citizen:Citizen,target:WorldZone):number{
  const residents=state.citizens.filter((candidate)=>candidate.alive&&candidate.id!==citizen.id&&candidate.location.type==='world'&&candidate.location.x===target.x&&candidate.location.y===target.y)
  return citizenControlPoints(citizen)+residents.reduce((sum,resident)=>sum+citizenControlPoints(resident),0)
}
export function scoutDetectionChancePercent(state:GameState,citizen:Citizen,target:WorldZone):number{
  if(!scoutCamouflageActive(citizen))return 0
  const excess=target.zombies-arrivalControlPoints(state,citizen,target)
  if(excess<=0)return 0
  let delta=Math.floor(excess*1.3)
  // MyHordes applies an additional night modifier. Live2Nite currently has no traversable
  // night-time World Beyond phase, so that modifier has no equivalent until such a phase exists.
  if(delta<=6)delta*=0.5
  // Source order is detection first, ScoutVisit second. A milestone visit therefore improves
  // future entries, not the same entry that earns the new Scout Level.
  return Math.max(0,delta-(3*scoutLevel(target)))
}
export function scoutArrivalEvents(state:GameState,citizen:Citizen,target:WorldZone):GameEvent[]{
  if(!isScout(citizen))return[]
  const key=zoneKey(target.x,target.y)
  const visit:GameEvent={type:'SCOUT_VISIT_RECORDED',day:state.day,hour:state.clock.hour,citizenId:citizen.id,zoneKey:key}
  if(!scoutCamouflageActive(citizen))return[visit]
  const chance=scoutDetectionChancePercent(state,citizen,target)
  if(chance<=0)return[visit]
  const roll=randomInt(state.rngState,1,1000)
  const spotted=roll.value<=Math.round(chance*10)
  const events:GameEvent[]=[{type:'SCOUT_DETECTION_RESOLVED',day:state.day,hour:state.clock.hour,citizenId:citizen.id,zoneKey:key,chancePercent:chance,spotted,rngStateAfter:roll.state}]
  if(spotted)events.push({type:'SCOUT_CAMOUFLAGE_SET',day:state.day,hour:state.clock.hour,citizenId:citizen.id,active:false,reason:'detected'})
  events.push(visit)
  return events
}

export function campingZombiePenaltyPerZombie(citizen:Citizen):number{return scoutCamouflageActive(citizen)?SCOUT_CAMPING_ZOMBIE_PENALTY:ORDINARY_CAMPING_ZOMBIE_PENALTY}

function withCamouflage(citizen:Citizen,active:boolean):Citizen{
  const equipment=citizenEquipment(citizen)
  if(!equipment||equipment.professionItem.type!=='profession_camouflage_suit')return citizen
  return{...citizen,equipment:{...equipment,professionItem:{...equipment.professionItem,state:{...equipment.professionItem.state,camouflaged:active}}}} as ProfessionCitizen
}
export function resetScoutForNewDay(citizen:Citizen):Citizen{
  const bonus=Math.max(0,citizen.scoutPointBonusNextDay??0)
  return{...citizen,scoutPoints:scoutBasePoints(citizen)+bonus,scoutPointBonusNextDay:0}
}

/** Returns null when the event belongs to another domain. */
export function reduceScoutEvent(state:GameState,event:GameEvent):GameState|null{
  switch(event.type){
    case'SCOUT_POINTS_SPENT':return{...state,citizens:state.citizens.map((citizen)=>citizen.id===event.citizenId?{...citizen,scoutPoints:Math.max(0,scoutPointsAvailable(citizen)-event.amount)}:citizen)}
    case'SCOUT_MAPPING_COMPLETED':return{...state,citizens:state.citizens.map((citizen)=>citizen.id===event.citizenId?{...citizen,scoutPointBonusNextDay:Math.max(citizen.scoutPointBonusNextDay??0,event.nextDayBonus)}:citizen)}
    case'SCOUT_CAMOUFLAGE_SET':return{...state,citizens:state.citizens.map((citizen)=>citizen.id===event.citizenId?withCamouflage(citizen,event.active):citizen)}
    case'SCOUT_VISIT_RECORDED':{
      const zone=state.world.zones[event.zoneKey];if(!zone)return state
      return{...state,world:{...state.world,zones:{...state.world.zones,[event.zoneKey]:{...zone,scoutVisits:(zone.scoutVisits??0)+1}}}}
    }
    case'SCOUT_DETECTION_RESOLVED':return{...state,rngState:event.rngStateAfter}
    default:return null
  }
}
