import { createItemInstance, NORMAL_SCAVENGE_LOOT_POOL } from './items'
import { rollWeightedLoot } from './loot'
import { hasProfession } from './professions'
import { randomInt } from './rng'
import { MYHORDES_DEPLETED_ZONE_LOOT } from './scavengeLoot'
import { scoutSearchBonusPercent } from './scout'
import type { Citizen, GameCommand, GameEvent, GameState, ItemInstance, SearchMode, WorldZone } from './types'

/** MyHordes uses a 2-hour base dig timer; Scavenger repeats at 75% of that interval. */
export const BASE_AUTO_SEARCH_INTERVAL_MINUTES=120
export const SCAVENGER_AUTO_SEARCH_INTERVAL_MULTIPLIER=0.75
export const SCAVENGER_REPEAT_SEARCH_INTERVAL_MINUTES=Math.round(BASE_AUTO_SEARCH_INTERVAL_MINUTES*SCAVENGER_AUTO_SEARCH_INTERVAL_MULTIPLIER)

/** Current MyHordes search-chance settings and the Collector/Scavenger profession modifier. */
export const NORMAL_SEARCH_SUCCESS_PERCENT=60
export const DEPLETED_SEARCH_SUCCESS_PERCENT=35
export const SCAVENGER_SEARCH_BONUS_PERCENTAGE_POINTS=20

export const SCAVENGER_RUIN_OXYGEN_MULTIPLIER=1.5

export type ScavengerSearchCommand=Extract<GameCommand,{type:'SEARCH_ZONE'}>&{replenishWithSpade?:boolean}
export type ReplenishmentSource='search_tower'|'scavenger_spade'|'other'
export type ReplenishmentEvent=Extract<GameEvent,{type:'ZONE_REPLENISHED'}>&{source?:ReplenishmentSource;citizenId?:string;rngStateAfter?:number}

export function isScavenger(citizen:Citizen):boolean{return hasProfession(citizen,'scavenger')}
export function searchSuccessChancePercent(citizen:Citizen,mode:SearchMode,zone?:WorldZone|null):number{
  const base=mode==='depleted'?DEPLETED_SEARCH_SUCCESS_PERCENT:NORMAL_SEARCH_SUCCESS_PERCENT
  return Math.min(100,base+(isScavenger(citizen)?SCAVENGER_SEARCH_BONUS_PERCENTAGE_POINTS:0)+scoutSearchBonusPercent(zone))
}
export function repeatSearchIntervalMinutes(citizen:Citizen):number{return isScavenger(citizen)?SCAVENGER_REPEAT_SEARCH_INTERVAL_MINUTES:BASE_AUTO_SEARCH_INTERVAL_MINUTES}
export function ruinOxygenSecondsForCitizen(citizen:Citizen,baseSeconds:number):number{return Math.round(baseSeconds*(isScavenger(citizen)?SCAVENGER_RUIN_OXYGEN_MULTIPLIER:1))}

export function isSpadeReplenishCommand(command:GameCommand):boolean{return command.type==='SEARCH_ZONE'&&Boolean((command as ScavengerSearchCommand).replenishWithSpade)}
export function spadeReplenishmentUsed(state:GameState,zoneKey:string):boolean{
  return state.events.some((event)=>event.type==='ZONE_REPLENISHED'&&event.zoneKey===zoneKey&&(event as ReplenishmentEvent).source==='scavenger_spade')
}
export function canReplenishWithSpade(state:GameState,citizen:Citizen,zone:WorldZone):boolean{
  if(!citizen.alive||citizen.location.type!=='world'||!isScavenger(citizen)||zone.searchesRemaining>0)return false
  return !spadeReplenishmentUsed(state,`${zone.x},${zone.y}`)
}

export function spadeReplenishmentEvent(state:GameState,citizenId:string,zoneKey:string):ReplenishmentEvent{
  const roll=randomInt(state.rngState,0,NORMAL_SCAVENGE_LOOT_POOL.length-1)
  return{type:'ZONE_REPLENISHED',day:state.day,hour:state.clock.hour,zoneKey,loot:NORMAL_SCAVENGE_LOOT_POOL[roll.value]!,source:'scavenger_spade',citizenId,rngStateAfter:roll.state} as ReplenishmentEvent
}

export function resolveSearchAttempt(state:GameState,event:Extract<GameEvent,{type:'ZONE_SEARCHED'}>):Extract<GameEvent,{type:'ZONE_SEARCHED'}>{
  const citizen=state.citizens.find((candidate)=>candidate.id===event.citizenId)
  if(!citizen)return event
  const zone=state.world.zones[event.zoneKey]
  const chance=randomInt(state.rngState,1,100)
  const success=chance.value<=searchSuccessChancePercent(citizen,event.mode,zone)
  let item:ItemInstance|null=null
  let rngStateAfter=chance.state
  if(success&&event.mode==='normal')item=event.item
  else if(success){
    const loot=rollWeightedLoot(chance.state,MYHORDES_DEPLETED_ZONE_LOOT)
    rngStateAfter=loot.rngStateAfter
    const spec=loot.items[0]
    if(spec)item=createItemInstance(`i${String(state.nextItemId).padStart(6,'0')}`,spec.type,spec.state)
  }
  return{...event,hour:event.hour??state.clock.hour,item,rngStateAfter}
}

export type SearchResourceStatus='depleted'|'almost_depleted'|'low'|'plentiful'|'available'
export function searchResourceStatus(citizen:Citizen,zone:WorldZone):SearchResourceStatus{
  if(zone.searchesRemaining<=0)return'depleted'
  if(!isScavenger(citizen))return'available'
  if(zone.searchesRemaining<=2)return'almost_depleted'
  if(zone.searchesRemaining<=6)return'low'
  return'plentiful'
}
export function searchResourceStatusLabel(status:SearchResourceStatus):string{
  switch(status){case'depleted':return'DEPLETED';case'almost_depleted':return'ALMOST DEPLETED';case'low':return'LOW RESOURCES';case'plentiful':return'PLENTIFUL';case'available':return'RESOURCES AVAILABLE'}
}
