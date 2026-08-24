import { createCitizenCampingState } from '../core/camping'
import { createGameClock } from '../core/clock'
import { CONSTRUCTION_ORDER, CONSTRUCTIONS, constructionBlueprintTier, constructionPlayable, createConstructionState } from '../core/construction'
import { HOME_LEVELS, createDailyState, createStarterHome } from '../core/home'
import { ITEM_TYPE_IDS } from '../core/itemCatalog'
import { createItemInstance } from '../core/items'
import { normalizeCitizenStatusState } from '../core/status'
import type { Citizen, CitizenHome, ConstructionId, GameClock, GameEvent, GameState, HomeLevel, ItemInstance, ItemType, TownCoordinationState, WorldState, WorldZone, ZoneIntelState } from '../core/types'
import { normalizeUpgradeProjectsState } from '../core/upgradeProjectsState'
import { startingWellWater } from '../core/well'
import { addSpecialSites, emptyZoneIntel, isTownGateZone } from '../core/world'
import type { GameRepository } from './GameRepository'

const DB_NAME='live2nite';const STORE_NAME='game';const SAVE_KEY='active'
type LegacyBank=Partial<Record<ItemType,number>>
function openDatabase():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const request=indexedDB.open(DB_NAME,1);request.onupgradeneeded=()=>{const database=request.result;if(!database.objectStoreNames.contains(STORE_NAME))database.createObjectStore(STORE_NAME)};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
function validHomeLevel(value:unknown):value is HomeLevel{return typeof value==='string'&&value in HOME_LEVELS}
function normalizeItems(items:unknown):ItemInstance[]{if(!Array.isArray(items))return[];return items.flatMap((candidate)=>{const item=candidate as Partial<ItemInstance>;if(typeof item.id!=='string'||typeof item.type!=='string'||!ITEM_TYPE_IDS.includes(item.type as ItemType))return[];return[createItemInstance(item.id,item.type as ItemType,item.state)]})}
function normalizeHome(existing:Partial<CitizenHome>|undefined,citizenId:string):CitizenHome{
  if(!existing)return createStarterHome(citizenId)
  const level=validHomeLevel(existing.level)?existing.level:'camp_bed'
  return{level,defense:HOME_LEVELS[level].defense,storage:normalizeItems(existing.storage),storageCapacity:typeof existing.storageCapacity==='number'?existing.storageCapacity:4,upgradedDay:typeof existing.upgradedDay==='number'?existing.upgradedDay:null,improvements:{reinforcements:existing.improvements?.reinforcements??0,fence:existing.improvements?.fence??0,storage:existing.improvements?.storage??0},holdsBody:existing.holdsBody??false,corpseAttacked:existing.corpseAttacked??false}
}
function migrateCitizen(candidate:Partial<Citizen>&Pick<Citizen,'id'>):Citizen{return{...(candidate as Citizen),inventory:normalizeItems(candidate.inventory),home:normalizeHome(candidate.home,candidate.id),corpseDisposition:candidate.corpseDisposition??null,daily:{...createDailyState(),...(candidate.daily??{})},status:normalizeCitizenStatusState(candidate.status),camping:candidate.camping??createCitizenCampingState(),temporaryControl:candidate.temporaryControl??null,relativeControl:candidate.relativeControl??null}}
function normalizeLegacyNormalLoot(type:ItemType):ItemType{if(type==='rotten_log')return'twisted_plank';if(type==='scrap_metal')return'wrought_iron';return type}
function migrateWorld(world:WorldState,seed:number,day:number):WorldState{
  const zones:Record<string,WorldZone>={};const legacyWorld=world as WorldState&{intel?:Record<string,ZoneIntelState>};const intel:Record<string,ZoneIntelState>={}
  for(const[key,zone]of Object.entries(world.zones)){
    const legacy=zone as WorldZone&{depletedSearchedBy?:string[];campImprovements?:number;groundItems?:ItemInstance[]}
    zones[key]={...zone,depletedSearchedBy:legacy.depletedSearchedBy??[],hiddenLoot:zone.hiddenLoot.map(normalizeLegacyNormalLoot),groundItems:normalizeItems(legacy.groundItems),campImprovements:legacy.campImprovements??0,specialSite:zone.specialSite?{...zone.specialSite,blueprintFound:zone.specialSite.blueprintFound??false}:undefined}
    const existing=legacyWorld.intel?.[key]
    if(existing)intel[key]={observedZombies:existing.observedZombies??null,lastObservedDay:existing.lastObservedDay??null,lastObservedHour:existing.lastObservedHour??null}
    else if(zone.discovered)intel[key]={observedZombies:zone.zombies,lastObservedDay:day,lastObservedHour:null}
    else intel[key]=emptyZoneIntel()
    if(isTownGateZone(zone.x,zone.y))intel[key]={observedZombies:0,lastObservedDay:day,lastObservedHour:null}
  }
  return addSpecialSites({...world,zones,intel},seed)
}
function normalizeEventItem(value:unknown):unknown{if(!value||typeof value!=='object')return value;const item=value as Partial<ItemInstance>;return typeof item.id==='string'&&typeof item.type==='string'&&ITEM_TYPE_IDS.includes(item.type as ItemType)?createItemInstance(item.id,item.type as ItemType,item.state):value}
function migrateEvents(events:unknown):GameEvent[]{if(!Array.isArray(events))return[];return events.map((candidate)=>{let event={...(candidate as Record<string,unknown>)};if(event.type==='ZONE_SEARCHED'&&!event.mode)event={...event,mode:'normal'};if(event.type==='ITEM_CONSUMED'&&event.restoresAp===undefined)event={...event,restoresAp:true};if(event.type==='HOME_UPGRADED'&&event.consumed===undefined)event={...event,consumed:{}};if('item'in event)event={...event,item:normalizeEventItem(event.item)};if('output'in event)event={...event,output:normalizeEventItem(event.output)};if(Array.isArray(event.outputs))event={...event,outputs:event.outputs.map(normalizeEventItem)};return event as unknown as GameEvent})}
function normalizeConstruction(existing:Partial<GameState['town']['construction']>|undefined,legacyDiscoveryModel=false):GameState['town']['construction']{
  const base=createConstructionState()
  if(existing)for(const[id,project]of Object.entries(existing)){
    if(!(id in base)||!project)continue
    const projectId=id as ConstructionId
    const legacy=project as Partial<GameState['town']['construction'][ConstructionId]>
    const completed=legacy.completed??false
    const discovered=legacyDiscoveryModel
      ? base[projectId].discovered||legacy.discovered===true||completed
      : legacy.discovered??(completed||base[projectId].discovered)
    base[projectId]={
      id:projectId,
      discovered,
      apContributed:typeof legacy.apContributed==='number'?legacy.apContributed:0,
      completed,
    }
  }
  return base
}
function normalizeMissions(existing:GameState['botMissions']|undefined):GameState['botMissions']{const next:GameState['botMissions']={};for(const[citizenId,mission]of Object.entries(existing??{}))next[citizenId]={...mission,allowsCamping:mission.allowsCamping??false,overnightPlanned:mission.overnightPlanned??false};return next}
function normalizeCoordination(existing:TownCoordinationState|undefined):TownCoordinationState{return{commitments:Array.isArray(existing?.commitments)?existing.commitments:[]}}
function nextSafeGeneratedId(root:unknown,requested:number):number{let highest=Math.max(0,requested-1);const visit=(value:unknown):void=>{if(!value||typeof value!=='object')return;if(Array.isArray(value)){for(const entry of value)visit(entry);return}const record=value as Record<string,unknown>;if(typeof record.id==='string'){const match=/^i(\d+)$/.exec(record.id);if(match)highest=Math.max(highest,Number(match[1]))}for(const nested of Object.values(record))visit(nested)};visit(root);return highest+1}
function materializeLegacyBank(bank:LegacyBank|undefined,startId:number):{bank:ItemInstance[];nextItemId:number}{const items:ItemInstance[]=[];let nextItemId=startId;for(const type of ITEM_TYPE_IDS){const count=Math.max(0,Math.trunc(bank?.[type]??0));for(let index=0;index<count;index+=1){items.push(createItemInstance(`i${String(nextItemId).padStart(6,'0')}`,type));nextItemId+=1}}return{bank:items,nextItemId}}

export function migrateStoredGame(result:Record<string,unknown>):GameState|null{
  const schemaVersion=result.schemaVersion as number|undefined
  if(schemaVersion===19||schemaVersion===18||schemaVersion===17||schemaVersion===16){
    const current=result as unknown as GameState
    const resetPrototypeCommonDiscovery=schemaVersion<=18
    return{...current,schemaVersion:19,citizens:current.citizens.map(migrateCitizen),botMissions:normalizeMissions(current.botMissions),coordination:normalizeCoordination(current.coordination),town:{...current.town,bank:normalizeItems(current.town.bank),construction:normalizeConstruction(current.town.construction,resetPrototypeCommonDiscovery),upgradeProjects:normalizeUpgradeProjectsState((current.town as Partial<GameState['town']>).upgradeProjects)},world:migrateWorld(current.world,current.seed,current.day),events:migrateEvents(current.events)}
  }
  if(![2,3,4,5,6,7,8,9,10,11,12,13,14,15].includes(schemaVersion??-1)||!Array.isArray(result.citizens)||!result.town||!result.world||typeof result.seed!=='number')return null
  const legacy=result as unknown as Omit<GameState,'schemaVersion'|'clock'|'citizens'|'botMissions'|'coordination'|'town'|'world'|'events'>&{schemaVersion:number;clock?:GameClock;citizens:Array<Partial<Citizen>&Pick<Citizen,'id'>>;botMissions?:GameState['botMissions'];coordination?:TownCoordinationState;town:Omit<GameState['town'],'bank'|'well'|'construction'|'defense'|'upgradeProjects'>&{bank?:LegacyBank;well?:GameState['town']['well'];construction?:GameState['town']['construction'];defense?:number;upgradeProjects?:GameState['town']['upgradeProjects']};world:WorldState;events?:unknown}
  const bankMigration=materializeLegacyBank(legacy.town.bank,nextSafeGeneratedId(result,legacy.nextItemId??1))
  return{...(legacy as unknown as GameState),schemaVersion:19,nextItemId:bankMigration.nextItemId,clock:legacy.clock??createGameClock(),citizens:legacy.citizens.map(migrateCitizen),botMissions:normalizeMissions(legacy.botMissions),coordination:normalizeCoordination(legacy.coordination),town:{...legacy.town,bank:bankMigration.bank,defense:40,construction:normalizeConstruction(legacy.town.construction,true),well:legacy.town.well??{water:startingWellWater(legacy.seed)},upgradeProjects:normalizeUpgradeProjectsState(legacy.town.upgradeProjects)},world:migrateWorld(legacy.world,legacy.seed,legacy.day),events:migrateEvents(legacy.events)}
}
export class IndexedDbGameRepository implements GameRepository{async load():Promise<GameState|null>{const database=await openDatabase();return new Promise((resolve,reject)=>{const transaction=database.transaction(STORE_NAME,'readonly');const request=transaction.objectStore(STORE_NAME).get(SAVE_KEY);request.onsuccess=()=>{const result=request.result as Record<string,unknown>|undefined;resolve(result?migrateStoredGame(result):null)};request.onerror=()=>reject(request.error);transaction.oncomplete=()=>database.close()})}async save(state:GameState):Promise<void>{const database=await openDatabase();return new Promise((resolve,reject)=>{const transaction=database.transaction(STORE_NAME,'readwrite');transaction.objectStore(STORE_NAME).put(state,SAVE_KEY);transaction.oncomplete=()=>{database.close();resolve()};transaction.onerror=()=>reject(transaction.error)})}async clear():Promise<void>{const database=await openDatabase();return new Promise((resolve,reject)=>{const transaction=database.transaction(STORE_NAME,'readwrite');transaction.objectStore(STORE_NAME).delete(SAVE_KEY);transaction.oncomplete=()=>{database.close();resolve()};transaction.onerror=()=>reject(transaction.error)})}}