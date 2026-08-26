import { hasProfession } from './professions'
import { randomInt } from './rng'
import { RUIN_CATALOG } from './ruinCatalog'
import { campingZombiePenaltyPerZombie } from './scout'
import { normalizeRuinId } from './specialSites'
import type { CampingChanceBreakdown, Citizen, CitizenCampingState, CampingOutlook, GameCommand, GameEvent, GameState, ItemInstance, WorldZone } from './types'
import { distanceToTown, isTownGateZone, zoneKey } from './world'

export const CAMP_IMPROVEMENT_AP_COST = 1
export const CAMP_IMPROVEMENT_POINTS = 5
export const TRESTLE_CAMP_IMPROVEMENT_POINTS = 9
export const CAMP_IMPROVEMENT_MAX_LEVEL = 50
export const CAMPING_GRAVE_AP_COST = 1
export const CAMPING_GRAVE_BONUS = 8
export const ORDINARY_CAMPING_CAP_PERCENT = 90
export const SURVIVALIST_CAMPING_CAP_PERCENT = 100
export const LIGHTHOUSE_CAMPING_BONUS = 25
export const CAMPING_ITEM_BONUS = 5
/** Source-confirmed carry bonuses: Smelly Meat (smelly_meat_#00) and Groundsheet (sheet_#00). */
export const CAMPING_ITEM_TYPES = ['smelly_meat','groundsheet'] as const

/**
 * Schema-19 saves store the original Live2Nite campsite representation as a number of +5
 * improvement actions in campImprovements. Source items such as Trestle add non-multiple-of-five
 * values, so current saves persist the exact source level alongside the legacy field. The fallback
 * keeps every existing schema-19 town compatible without rewriting or reinterpreting its save.
 */
declare module './types' { interface WorldZone { campImprovementLevel?:number } }
export type CampImproveCommand=Extract<GameCommand,{type:'IMPROVE_CAMP'}>&{itemId?:string}
export type CampImprovedEvent=Extract<GameEvent,{type:'CAMP_IMPROVED'}>&{item?:ItemInstance}

const PREVIOUS_CAMPING_POINTS = [80,60,35,15,0,-50,-100,-200,-400,-1000,-2000,-5000] as const
const DISTANCE_POINTS = [-100,-75,-50,-25,-10,0,0,0,0,0,0,0,5,7,10,15,20] as const
const PREVIOUS_CAMPERS_POINTS = [0,0,-10,-30,-50,-70] as const

export function campImprovementLevel(zone:WorldZone):number{
  const exact=zone.campImprovementLevel
  if(typeof exact==='number'&&Number.isFinite(exact))return Math.min(CAMP_IMPROVEMENT_MAX_LEVEL,Math.max(0,Math.trunc(exact)))
  return Math.min(CAMP_IMPROVEMENT_MAX_LEVEL,Math.max(0,Math.trunc(zone.campImprovements??0))*CAMP_IMPROVEMENT_POINTS)
}
export function campImproveCommandItemId(command:GameCommand):string|null{
  if(command.type!=='IMPROVE_CAMP')return null
  const itemId=(command as CampImproveCommand).itemId
  return typeof itemId==='string'&&itemId.length>0?itemId:null
}
export function campImprovedEventItem(event:Extract<GameEvent,{type:'CAMP_IMPROVED'}>):ItemInstance|null{return(event as CampImprovedEvent).item??null}
export function trestleCampImproveCommands(citizen:Citizen,zone:WorldZone):GameCommand[]{
  if(citizen.ap<CAMP_IMPROVEMENT_AP_COST||!canImproveCamp(zone))return[]
  return citizen.inventory.filter((item)=>item.type==='trestle').map((item)=>({type:'IMPROVE_CAMP',citizenId:citizen.id,itemId:item.id} as CampImproveCommand))
}

export function createCitizenCampingState():CitizenCampingState{return{hidden:false,grave:false,survivalChance:null,chanceBreakdown:null,hiddenDay:null,nightsSurvived:0,lastSurvivedDay:null}}

function previousCampingPoints(nights:number):number{return PREVIOUS_CAMPING_POINTS[Math.min(Math.max(0,Math.floor(nights)),PREVIOUS_CAMPING_POINTS.length-1)]}
function distanceCampingPoints(distance:number):number{return DISTANCE_POINTS[Math.min(Math.max(0,Math.floor(distance)),DISTANCE_POINTS.length-1)]}
function crowdCampingPoints(previousCampers:number):number{return PREVIOUS_CAMPERS_POINTS[Math.min(Math.max(0,Math.floor(previousCampers)),PREVIOUS_CAMPERS_POINTS.length-1)]}
function hiddenBeforeCitizen(state:GameState,citizen:Citizen,zone:WorldZone):number{return state.citizens.filter((other)=>other.id!==citizen.id&&other.alive&&other.location.type==='world'&&other.location.x===zone.x&&other.location.y===zone.y&&other.camping.hidden).length}
function campingItemPoints(citizen:Citizen):number{return citizen.inventory.reduce((sum,item)=>sum+(CAMPING_ITEM_TYPES.includes(item.type as typeof CAMPING_ITEM_TYPES[number])?CAMPING_ITEM_BONUS:0),0)}
function ruinCampingPoints(zone:WorldZone,previousCampers:number):number{
  const site=zone.specialSite
  if(!site)return-25
  const id=normalizeRuinId(site.type)
  if(!id)return-25
  const definition=RUIN_CATALOG[id]
  const hasSpace=definition.campingSpots<0||previousCampers<definition.campingSpots
  if(!hasSpace)return-25
  if(site.status==='buried')return 15
  return definition.campingBase
}
export function campingCapPercent(citizen:Citizen):number{return hasProfession(citizen,'survivalist')?SURVIVALIST_CAMPING_CAP_PERCENT:ORDINARY_CAMPING_CAP_PERCENT}

/** Current MyHordes standard-town camping factors. Hero Pro Camper, Panda-town and traversable night-mode modifiers stay outside this standard ruleset. */
export function campingChanceBreakdown(state:GameState,citizenId:string,options:{grave?:boolean}={}):CampingChanceBreakdown{
  const citizen=state.citizens.find((candidate)=>candidate.id===citizenId)
  const empty:CampingChanceBreakdown={previous:0,tomb:0,town:0,zone:0,zoneBuilding:0,lighthouse:0,campitems:0,zombies:0,campers:0,night:0,distance:0,devastated:0,raw:0,cap:ORDINARY_CAMPING_CAP_PERCENT,final:0}
  if(!citizen||!citizen.alive||citizen.location.type!=='world'||isTownGateZone(citizen.location.x,citizen.location.y))return empty
  const zone=state.world.zones[zoneKey(citizen.location.x,citizen.location.y)]
  if(!zone)return empty
  const previousCampers=hiddenBeforeCitizen(state,citizen,zone)
  const grave=options.grave??Boolean(citizen.camping.grave)
  const factors:Omit<CampingChanceBreakdown,'raw'|'cap'|'final'>={
    previous:previousCampingPoints(citizen.camping.nightsSurvived),
    tomb:grave?CAMPING_GRAVE_BONUS:0,
    town:0,
    zone:campImprovementLevel(zone),
    zoneBuilding:ruinCampingPoints(zone,previousCampers),
    lighthouse:state.town.construction.lighthouse?.completed?LIGHTHOUSE_CAMPING_BONUS:0,
    campitems:campingItemPoints(citizen),
    zombies:-zone.zombies*campingZombiePenaltyPerZombie(citizen),
    campers:crowdCampingPoints(previousCampers),
    // Live2Nite currently has no traversable nighttime World Beyond phase; source night-mode +10 is therefore not fabricated.
    night:0,
    distance:distanceCampingPoints(distanceToTown(citizen.location.x,citizen.location.y)),
    devastated:state.town.devastated?-50:0,
  }
  const raw=Object.values(factors).reduce((sum,value)=>sum+value,0)
  const cap=campingCapPercent(citizen)
  const final=Math.max(0,Math.min(cap,raw))
  return{...factors,raw,cap,final}
}

export function campingChancePercent(state:GameState,citizenId:string,options:{grave?:boolean}={}):number{return campingChanceBreakdown(state,citizenId,options).final}

export function campingOutlookFromChance(chance:number):CampingOutlook{
  if(chance<=10)return'suicidal'
  if(chance<=30)return'very_poor'
  if(chance<=50)return'poor'
  if(chance<=65)return'limited'
  if(chance<=80)return'satisfactory'
  return'decent'
}
export function campingOutlookText(outlook:CampingOutlook):string{
  switch(outlook){
    case'suicidal':return'Sleeping here looks close to suicidal.'
    case'very_poor':return'Your chances here look really poor.'
    case'poor':return'Your chances here look poor.'
    case'limited':return'Your chances look limited, but tempting.'
    case'satisfactory':return'Your chances look largely satisfactory.'
    case'decent':return'Your chances look decent, if luck holds.'
  }
}
export function campingOutlook(state:GameState,citizenId:string):{chancePercent:number;outlook:CampingOutlook;text:string;breakdown:CampingChanceBreakdown}{const breakdown=campingChanceBreakdown(state,citizenId);const chancePercent=breakdown.final;const outlook=campingOutlookFromChance(chancePercent);return{chancePercent,outlook,text:campingOutlookText(outlook),breakdown}}

function citizenNumber(citizenId:string):number{return Number(citizenId.replace(/\D/g,''))||1}
function isolatedCampingSeed(seed:number,day:number,citizenId:string):number{const mixed=((seed>>>0)^Math.imul(day+1,0x9e3779b1)^Math.imul(citizenNumber(citizenId)+17,0x85ebca6b)^0xc4a9f173)>>>0;return mixed||1}
export function resolveCampingRoll(state:GameState,citizen:Citizen):{roll:number;survived:boolean}{const chance=Math.max(0,Math.min(100,citizen.camping.survivalChance??0));const result=randomInt(isolatedCampingSeed(state.seed,state.day,citizen.id),1,100);return{roll:result.value,survived:result.value<=chance}}
export function canImproveCamp(zone:WorldZone):boolean{return campImprovementLevel(zone)<CAMP_IMPROVEMENT_MAX_LEVEL}
