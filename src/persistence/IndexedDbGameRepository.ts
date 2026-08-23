import { createCitizenCampingState } from '../core/camping'
import { createGameClock } from '../core/clock'
import { createConstructionState } from '../core/construction'
import { HOME_LEVELS, createDailyState, createStarterHome } from '../core/home'
import { createCitizenStatusState } from '../core/status'
import type { Citizen, CitizenHome, ConstructionId, GameClock, GameEvent, GameState, HomeLevel, ItemType, TownCoordinationState, WorldState, WorldZone, ZoneIntelState } from '../core/types'
import { startingWellWater } from '../core/well'
import { addSpecialSites, emptyZoneIntel, isTownGateZone } from '../core/world'
import type { GameRepository } from './GameRepository'

const DB_NAME='live2nite';const STORE_NAME='game';const SAVE_KEY='active'
function openDatabase():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const request=indexedDB.open(DB_NAME,1);request.onupgradeneeded=()=>{const database=request.result;if(!database.objectStoreNames.contains(STORE_NAME))database.createObjectStore(STORE_NAME)};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
function validHomeLevel(value:unknown):value is HomeLevel{return typeof value==='string'&&value in HOME_LEVELS}
function normalizeHome(existing:Partial<CitizenHome>|undefined,citizenId:string):CitizenHome{
  if(!existing)return createStarterHome(citizenId)
  const level=validHomeLevel(existing.level)?existing.level:'camp_bed'
  return{
    level,
    defense:HOME_LEVELS[level].defense,
    storage:Array.isArray(existing.storage)?existing.storage:[],
    storageCapacity:typeof existing.storageCapacity==='number'?existing.storageCapacity:4,
    upgradedDay:typeof existing.upgradedDay==='number'?existing.upgradedDay:null,
    improvements:{
      reinforcements:existing.improvements?.reinforcements??0,
      fence:existing.improvements?.fence??0,
      storage:existing.improvements?.storage??0,
    },
  }
}
function migrateCitizen(candidate:Partial<Citizen>&Pick<Citizen,'id'>):Citizen{return{...(candidate as Citizen),home:normalizeHome(candidate.home,candidate.id),daily:candidate.daily??createDailyState(),status:candidate.status??createCitizenStatusState(),camping:candidate.camping??createCitizenCampingState(),temporaryControl:candidate.temporaryControl??null}}
function normalizeLegacyNormalLoot(type:ItemType):ItemType{if(type==='rotten_log')return'twisted_plank';if(type==='scrap_metal')return'wrought_iron';return type}
function migrateWorld(world:WorldState,seed:number,day:number):WorldState{
  const zones:Record<string,WorldZone>={}
  const legacyWorld=world as WorldState&{intel?:Record<string,ZoneIntelState>}
  const intel:Record<string,ZoneIntelState>={}
  for(const[key,zone]of Object.entries(world.zones)){
    const legacy=zone as WorldZone&{depletedSearchedBy?:string[];campImprovements?:number}
    zones[key]={...zone,depletedSearchedBy:legacy.depletedSearchedBy??[],hiddenLoot:zone.hiddenLoot.map(normalizeLegacyNormalLoot),campImprovements:legacy.campImprovements??0}
    const existing=legacyWorld.intel?.[key]
    if(existing)intel[key]={observedZombies:existing.observedZombies??null,lastObservedDay:existing.lastObservedDay??null,lastObservedHour:existing.lastObservedHour??null}
    else if(zone.discovered)intel[key]={observedZombies:zone.zombies,lastObservedDay:day,lastObservedHour:null}
    else intel[key]=emptyZoneIntel()
    if(isTownGateZone(zone.x,zone.y))intel[key]={observedZombies:0,lastObservedDay:day,lastObservedHour:null}
  }
  return addSpecialSites({...world,zones,intel},seed)
}
function migrateEvents(events:unknown):GameEvent[]{if(!Array.isArray(events))return[];return events.map((candidate)=>{const event=candidate as Record<string,unknown>;if(event.type==='ZONE_SEARCHED'&&!event.mode)return{...event,mode:'normal'} as unknown as GameEvent;if(event.type==='ITEM_CONSUMED'&&event.restoresAp===undefined)return{...event,restoresAp:true} as unknown as GameEvent;if(event.type==='HOME_UPGRADED'&&event.consumed===undefined)return{...event,consumed:{}} as unknown as GameEvent;return candidate as GameEvent})}
function normalizeConstruction(existing:Partial<GameState['town']['construction']>|undefined):GameState['town']['construction']{const base=createConstructionState();if(!existing)return base;for(const [id,project] of Object.entries(existing))if(id in base&&project)base[id as ConstructionId]={...base[id as ConstructionId],...project,id:id as ConstructionId};return base}
function normalizeMissions(existing:GameState['botMissions']|undefined):GameState['botMissions']{const next:GameState['botMissions']={};for(const[citizenId,mission]of Object.entries(existing??{}))next[citizenId]={...mission,allowsCamping:mission.allowsCamping??false,overnightPlanned:mission.overnightPlanned??false};return next}
function normalizeCoordination(existing:TownCoordinationState|undefined):TownCoordinationState{return{commitments:Array.isArray(existing?.commitments)?existing.commitments:[]}}
function migrateToV15(result:Record<string,unknown>):GameState|null{
  const schemaVersion=result.schemaVersion as number|undefined
  if(schemaVersion===15){const current=result as unknown as GameState;return{...current,citizens:current.citizens.map(migrateCitizen),botMissions:normalizeMissions(current.botMissions),coordination:normalizeCoordination(current.coordination),town:{...current.town,construction:normalizeConstruction(current.town.construction)},world:migrateWorld(current.world,current.seed,current.day),events:migrateEvents(current.events)}}
  if(![2,3,4,5,6,7,8,9,10,11,12,13,14].includes(schemaVersion??-1)||!Array.isArray(result.citizens)||!result.town||!result.world||typeof result.seed!=='number')return null
  const legacy=result as unknown as Omit<GameState,'schemaVersion'|'clock'|'citizens'|'botMissions'|'coordination'|'town'|'world'|'events'>&{schemaVersion:number;clock?:GameClock;citizens:Array<Partial<Citizen>&Pick<Citizen,'id'>>;botMissions?:GameState['botMissions'];coordination?:TownCoordinationState;town:Omit<GameState['town'],'well'|'construction'|'defense'>&Partial<Pick<GameState['town'],'well'|'construction'|'defense'>>;world:WorldState;events?:unknown}
  return{...(legacy as unknown as GameState),schemaVersion:15,clock:legacy.clock??createGameClock(),citizens:legacy.citizens.map(migrateCitizen),botMissions:normalizeMissions(legacy.botMissions),coordination:normalizeCoordination(legacy.coordination),town:{...legacy.town,defense:40,construction:normalizeConstruction(legacy.town.construction),well:legacy.town.well??{water:startingWellWater(legacy.seed)}},world:migrateWorld(legacy.world,legacy.seed,legacy.day),events:migrateEvents(legacy.events)}
}
export class IndexedDbGameRepository implements GameRepository{async load():Promise<GameState|null>{const database=await openDatabase();return new Promise((resolve,reject)=>{const transaction=database.transaction(STORE_NAME,'readonly');const request=transaction.objectStore(STORE_NAME).get(SAVE_KEY);request.onsuccess=()=>{const result=request.result as Record<string,unknown>|undefined;resolve(result?migrateToV15(result):null)};request.onerror=()=>reject(request.error);transaction.oncomplete=()=>database.close()})}async save(state:GameState):Promise<void>{const database=await openDatabase();return new Promise((resolve,reject)=>{const transaction=database.transaction(STORE_NAME,'readwrite');transaction.objectStore(STORE_NAME).put(state,SAVE_KEY);transaction.oncomplete=()=>{database.close();resolve()};transaction.onerror=()=>reject(transaction.error)})}async clear():Promise<void>{const database=await openDatabase();return new Promise((resolve,reject)=>{const transaction=database.transaction(STORE_NAME,'readwrite');transaction.objectStore(STORE_NAME).delete(SAVE_KEY);transaction.oncomplete=()=>{database.close();resolve()};transaction.onerror=()=>reject(transaction.error)})}}
