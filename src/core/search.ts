import { applyEvents } from './events'
import { BASE_AUTO_SEARCH_INTERVAL_MINUTES, repeatSearchIntervalMinutes } from './scavenging'
import type { GameEvent, GameState, ItemInstance } from './types'
import { isTownGateZone, zoneKey } from './world'

/** Kept as the public base-rate constant; profession behavior is a multiplier on this value. */
export const AUTO_SEARCH_INTERVAL_HOURS=BASE_AUTO_SEARCH_INTERVAL_MINUTES/60

function absoluteMinute(day:number,hour:number):number{return((day-1)*24+hour)*60}
function eventMinute(event:GameEvent):number{return absoluteMinute(event.day,event.hour??1)}

interface SearchSession {manual:Extract<GameEvent,{type:'ZONE_SEARCHED'}>;automaticCount:number}

/**
 * A manual search starts a session. Movement cancels it. Automatic attempts do not round
 * their theoretical due time to the current hour: a Scavenger therefore carries the 30-minute
 * offset from one hourly simulation tick to the next.
 */
function activeSearchSession(state:GameState,citizenId:string,key:string):SearchSession|null{
  let movementIndex=-1
  for(let index=state.events.length-1;index>=0;index-=1){
    const event=state.events[index]
    if(event.type==='CITIZEN_LOCATION_CHANGED'&&event.citizenId===citizenId){movementIndex=index;break}
  }
  let manualIndex=-1
  for(let index=state.events.length-1;index>movementIndex;index-=1){
    const event=state.events[index]
    if(event.type==='ZONE_SEARCHED'&&event.citizenId===citizenId&&event.zoneKey===key&&!event.automatic&&event.day===state.day){manualIndex=index;break}
  }
  if(manualIndex<0)return null
  const manual=state.events[manualIndex] as Extract<GameEvent,{type:'ZONE_SEARCHED'}>
  const automaticCount=state.events.slice(manualIndex+1).filter((event)=>event.type==='ZONE_SEARCHED'&&event.citizenId===citizenId&&event.zoneKey===key&&event.automatic).length
  return{manual,automaticCount}
}

function autoSearchEvent(state:GameState,citizenId:string):Extract<GameEvent,{type:'ZONE_SEARCHED'}>|null{
  const citizen=state.citizens.find((candidate)=>candidate.id===citizenId)
  if(!citizen||!citizen.alive||citizen.camping.hidden||citizen.location.type!=='world'||isTownGateZone(citizen.location.x,citizen.location.y))return null
  const key=zoneKey(citizen.location.x,citizen.location.y)
  const zone=state.world.zones[key]
  if(!zone)return null
  const session=activeSearchSession(state,citizenId,key)
  if(!session)return null
  const dueMinute=eventMinute(session.manual)+BASE_AUTO_SEARCH_INTERVAL_MINUTES+session.automaticCount*repeatSearchIntervalMinutes(citizen)
  if(absoluteMinute(state.day,state.clock.hour)<dueMinute)return null
  const mode=zone.searchesRemaining>0?'normal':'depleted'
  const type=mode==='normal'?zone.hiddenLoot[0]:undefined
  const item:ItemInstance|null=type?{id:`i${String(state.nextItemId).padStart(6,'0')}`,type}:null
  return{type:'ZONE_SEARCHED',day:state.day,hour:state.clock.hour,zoneKey:key,citizenId,mode,automatic:true,item}
}

export function runAutomaticSearches(state:GameState):GameState{
  let next=state
  for(const citizen of state.citizens){const event=autoSearchEvent(next,citizen.id);if(event)next=applyEvents(next,[event])}
  return next
}
