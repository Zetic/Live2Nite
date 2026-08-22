import { applyEvents } from './events'
import type { GameEvent, GameState, ItemInstance } from './types'
import { isTownGateZone, zoneKey } from './world'

export const AUTO_SEARCH_INTERVAL_HOURS = 2

function absoluteHour(day:number,hour:number):number{return (day-1)*24+hour}
function eventHour(event:GameEvent):number{return absoluteHour(event.day,event.hour??1)}

function lastSearchAnchor(state:GameState,citizenId:string,key:string):number|null{
  for(let index=state.events.length-1;index>=0;index-=1){
    const event=state.events[index]
    if(event.type==='ZONE_SEARCHED'&&event.citizenId===citizenId&&event.zoneKey===key&&event.mode==='normal')return eventHour(event)
    if(event.type==='CITIZEN_LOCATION_CHANGED'&&event.citizenId===citizenId){
      if(event.location.type==='world'&&zoneKey(event.location.x,event.location.y)===key)return eventHour(event)
      return null
    }
  }
  return null
}

function autoSearchEvent(state:GameState,citizenId:string):GameEvent|null{
  const citizen=state.citizens.find((candidate)=>candidate.id===citizenId)
  if(!citizen||!citizen.alive||citizen.location.type!=='world'||isTownGateZone(citizen.location.x,citizen.location.y))return null
  const key=zoneKey(citizen.location.x,citizen.location.y)
  const zone=state.world.zones[key]
  if(!zone||zone.searchesRemaining<=0)return null
  const anchor=lastSearchAnchor(state,citizenId,key)
  if(anchor===null||absoluteHour(state.day,state.clock.hour)-anchor<AUTO_SEARCH_INTERVAL_HOURS)return null
  const type=zone.hiddenLoot[0]
  const item:ItemInstance|null=type?{id:`i${String(state.nextItemId).padStart(6,'0')}`,type}:null
  return{type:'ZONE_SEARCHED',day:state.day,hour:state.clock.hour,zoneKey:key,citizenId,mode:'normal',automatic:true,item}
}

export function runAutomaticSearches(state:GameState):GameState{
  let next=state
  for(const citizen of state.citizens){const event=autoSearchEvent(next,citizen.id);if(event)next=applyEvents(next,[event])}
  return next
}
