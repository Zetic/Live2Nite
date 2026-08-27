import { ATTACK_HOUR } from './clock'
import { CONSTRUCTION_CATALOG } from './constructionCatalog'
import { constructionUpgradeLevel } from './constructionUpgrades'
import { applyEvents } from './events'
import { ITEMS, createItemInstance, normalizeItemState } from './items'
import { hasProfession } from './professions'
import { randomInt } from './rng'
import { WOUND_LOCATIONS } from './status'
import type { Citizen, GameEvent, GameState, ItemInstance, ItemType, WoundLocation } from './types'

export const NIGHT_WATCH_BASE_DEFENSE=10
export const NIGHT_WATCH_BASE_DEATH_CHANCE=8
export const NIGHT_WATCH_WOUND_CHANCE=20
export const NIGHT_WATCH_TERROR_CHANCE=10
export const NIGHT_WATCH_FATIGUE:readonly number[]=[0,1,4,9,20,30,42,56,72,90]

export type NightWatchResult='skipped'|'fine'|'wounded'|'terrorized'|'dead'
export type NightWatchEquipmentFamily='ikea'|'shooting'|'armory'|'trebuchet'
type NightWatchItemUse='none'|'destroy'|'break'|'decrement_charge'

export interface NightWatchState {
  enrolledCitizenIds:string[]
  previousWatches:Record<string,number>
}
export interface NightWatchCitizenOutcome {
  citizenId:string
  active:boolean
  defense:number
  deathChance:number
  previousWatches:number
  result:NightWatchResult
  woundLocation?:WoundLocation
  usedItemIds:string[]
  lostItemIds:string[]
}
export interface NightWatchReport {
  capacity:number
  enrolled:number
  active:number
  weaponsAllowed:boolean
  defense:number
  overflowBefore:number
  overflowAfter:number
  outcomes:NightWatchCitizenOutcome[]
}
export interface NightWatchEquipmentPreview {
  itemId:string
  type:ItemType
  name:string
  baseDefense:number
  defense:number
  impact:number
  enabled:boolean
  family?:NightWatchEquipmentFamily
}

interface NightWatchItemDefinition {
  watchpoint:number|((item:ItemInstance)=>number)
  watchimpact?:number
  family?:NightWatchEquipmentFamily
  use:NightWatchItemUse
  breaksInto?:ItemType
}

declare module './types' {
  interface TownState { nightWatch?:NightWatchState }
  interface NightReport { nightWatch?:NightWatchReport }
}

/**
 * Only Live2Nite items whose source Watch values are established by the Battlements audit
 * are mapped here. Items whose source Night-Watch action remains unresolved keep their
 * known defense value without inventing a consumption rule.
 */
const WATCH_ITEMS:Readonly<Partial<Record<ItemType,NightWatchItemDefinition>>>={
  claymore:{watchpoint:40,use:'destroy'},
  engine:{watchpoint:30,use:'none'},
  machete:{watchpoint:15,family:'armory',use:'break',breaksInto:'broken_machete'},
  old_door:{watchpoint:15,use:'destroy'},
  human_flesh:{watchpoint:15,family:'trebuchet',use:'destroy'},
  ektorp_gluten_chair:{watchpoint:15,family:'ikea',use:'destroy'},
  trestle:{watchpoint:15,family:'ikea',use:'destroy'},
  pc_base_unit:{watchpoint:15,family:'ikea',use:'break',breaksInto:'broken_pc_base_unit'},
  meaty_bone:{watchpoint:10,family:'trebuchet',use:'destroy'},
  groundsheet:{watchpoint:10,use:'destroy'},
  water_bomb:{watchpoint:8,family:'shooting',use:'destroy'},
  water_cooler_bottle:{watchpoint:(item)=>Math.max(0,normalizeItemState(item.type,item.state).charges??0)*8,family:'shooting',use:'decrement_charge'},
  chicken:{watchpoint:8,family:'trebuchet',use:'destroy'},
  stinking_pig:{watchpoint:25,family:'trebuchet',use:'destroy'},
  giant_rat:{watchpoint:12,family:'trebuchet',use:'destroy'},
  guard_dog:{watchpoint:25,family:'trebuchet',use:'destroy'},
  fat_cat:{watchpoint:12,family:'trebuchet',use:'destroy'},
  huge_snake:{watchpoint:25,family:'trebuchet',use:'destroy'},
  chain:{watchpoint:7,family:'armory',use:'break',breaksInto:'broken_chain'},
  screwdriver:{watchpoint:5,family:'armory',use:'break',breaksInto:'broken_screwdriver'},
  can_opener:{watchpoint:5,family:'armory',use:'break',breaksInto:'broken_can_opener'},
  working_radio:{watchpoint:-15,use:'none'},
}

function normalizedNightWatchState(state:GameState):NightWatchState{
  const current=state.town.nightWatch
  if(!current)return{enrolledCitizenIds:[],previousWatches:{}}
  return{
    enrolledCitizenIds:[...new Set((current.enrolledCitizenIds??[]).filter((id):id is string=>typeof id==='string'&&id.length>0))],
    previousWatches:Object.fromEntries(Object.entries(current.previousWatches??{}).filter(([,count])=>typeof count==='number'&&Number.isFinite(count)).map(([id,count])=>[id,Math.max(0,Math.trunc(count))])),
  }
}
function withNightWatchState(state:GameState,nightWatch:NightWatchState):GameState{return{...state,town:{...state.town,nightWatch}}}
function itemDefinition(item:ItemInstance):NightWatchItemDefinition|null{return WATCH_ITEMS[item.type]??null}
function rawItemWatchpoint(item:ItemInstance):number{const definition=itemDefinition(item);if(!definition)return 0;return typeof definition.watchpoint==='function'?definition.watchpoint(item):definition.watchpoint}
function completedConstructionNamed(state:GameState,name:string):boolean{
  const sourceId=name==='Swedish Carpentry'?'swedish_workshop':name==='Filtering Gutters'?'gutters':name==='Hand Grinder'?'manual_grinder':name==='Animal Shop'?'pet_shop':name==='Guardroom'?'guardroom':null
  return Boolean((sourceId&&state.town.construction[sourceId]?.completed===true)||Object.values(CONSTRUCTION_CATALOG).some((entry)=>entry.name===name&&state.town.construction[entry.id]?.completed===true))
}
function specialistMultiplier(state:GameState,family:NightWatchEquipmentFamily|undefined):number{
  if(family==='ikea'&&completedConstructionNamed(state,'Swedish Carpentry'))return 1.3
  if(family==='shooting'&&completedConstructionNamed(state,'Filtering Gutters'))return 1.3
  if(family==='armory'&&completedConstructionNamed(state,'Hand Grinder'))return 1.2
  if(family==='trebuchet'&&completedConstructionNamed(state,'Animal Shop'))return 1.3
  return 1
}
function adjustedItemDefense(state:GameState,item:ItemInstance):number{
  if(!nightWatchWeaponsAllowed(state))return 0
  const definition=itemDefinition(item);if(!definition)return 0
  return Math.floor(rawItemWatchpoint(item)*specialistMultiplier(state,definition.family))
}
function itemImpact(state:GameState,item:ItemInstance):number{return nightWatchWeaponsAllowed(state)?(itemDefinition(item)?.watchimpact??0):0}
function stableStringSalt(value:string):number{let hash=2166136261;for(let index=0;index<value.length;index+=1){hash^=value.charCodeAt(index);hash=Math.imul(hash,16777619)}return hash>>>0}
function isolatedWatchSeed(state:GameState,citizenId:string):number{const mixed=((state.seed>>>0)^Math.imul(state.day+1,0x9e3779b1)^stableStringSalt(`watch:${citizenId}`))>>>0;return mixed||1}

export function nightWatchEnabled(state:GameState):boolean{return state.town.construction.battlements?.completed===true}
export function nightWatchWeaponsAllowed(state:GameState):boolean{return state.town.construction.miniature_armory?.completed===true}
export function nightWatchCapacity(state:GameState):number{const level=constructionUpgradeLevel(state,'battlements');return level<=0?10:level===1?20:40}
export function nightWatchPreviousWatches(state:GameState,citizenId:string):number{return normalizedNightWatchState(state).previousWatches[citizenId]??0}
export function nightWatchFatigueChance(previousWatches:number):number{return NIGHT_WATCH_FATIGUE[Math.min(Math.max(0,Math.trunc(previousWatches)),NIGHT_WATCH_FATIGUE.length-1)]??90}
export function nightWatchEnrolled(state:GameState,citizenId:string):boolean{return normalizedNightWatchState(state).enrolledCitizenIds.includes(citizenId)}
export function nightWatchEnrolledCitizenIds(state:GameState):string[]{return normalizedNightWatchState(state).enrolledCitizenIds}
export function nightWatchActiveCitizens(state:GameState):Citizen[]{const enrolled=new Set(nightWatchEnrolledCitizenIds(state));return state.citizens.filter((citizen)=>enrolled.has(citizen.id)&&citizen.alive&&citizen.location.type==='town')}

export function canJoinNightWatch(state:GameState,citizenId:string):boolean{
  if(!nightWatchEnabled(state)||state.clock.phase!=='day'||nightWatchEnrolled(state,citizenId))return false
  const citizen=state.citizens.find((candidate)=>candidate.id===citizenId)
  return Boolean(citizen?.alive&&citizen.location.type==='town'&&nightWatchEnrolledCitizenIds(state).length<nightWatchCapacity(state))
}
export function setNightWatchEnrollment(state:GameState,citizenId:string,enrolled:boolean):GameState{
  const current=normalizedNightWatchState(state)
  const already=current.enrolledCitizenIds.includes(citizenId)
  if(enrolled===already)return state
  if(enrolled&&!canJoinNightWatch(state,citizenId))return state
  if(!enrolled&&state.clock.phase!=='day')return state
  return withNightWatchState(state,{...current,enrolledCitizenIds:enrolled?[...current.enrolledCitizenIds,citizenId]:current.enrolledCitizenIds.filter((id)=>id!==citizenId)})
}
export function resetNightWatchEnrollment(state:GameState):GameState{
  const current=normalizedNightWatchState(state)
  if(current.enrolledCitizenIds.length===0&&state.town.nightWatch)return state
  return withNightWatchState(state,{...current,enrolledCitizenIds:[]})
}

export function nightWatchEquipment(state:GameState,citizen:Citizen):NightWatchEquipmentPreview[]{
  const enabled=nightWatchWeaponsAllowed(state)
  return citizen.inventory.flatMap((item)=>{
    const definition=itemDefinition(item);if(!definition)return[]
    return[{itemId:item.id,type:item.type,name:ITEMS[item.type].name,baseDefense:rawItemWatchpoint(item),defense:adjustedItemDefense(state,item),impact:itemImpact(state,item),enabled,family:definition.family}]
  })
}
export function nightWatchDefenseForCitizen(state:GameState,citizen:Citizen):number{
  const shieldDefense=hasProfession(citizen,'guardian')?15:0
  const itemDefense=citizen.inventory.reduce((sum,item)=>sum+adjustedItemDefense(state,item),0)
  return Math.max(0,NIGHT_WATCH_BASE_DEFENSE+shieldDefense+itemDefense)
}
export function nightWatchDeathChance(state:GameState,citizen:Citizen):number{
  const previous=nightWatchPreviousWatches(state,citizen.id)
  const battlementsSafety=constructionUpgradeLevel(state,'battlements')>=3?1:0
  const guardroomSafety=completedConstructionNamed(state,'Guardroom')?5:0
  const shieldImpact=hasProfession(citizen,'guardian')?5:0
  const equipmentImpact=citizen.inventory.reduce((sum,item)=>sum+itemImpact(state,item),0)
  return Math.max(0,Math.min(100,NIGHT_WATCH_BASE_DEATH_CHANCE+nightWatchFatigueChance(previous)-battlementsSafety-guardroomSafety-shieldImpact-equipmentImpact))
}
export function nightWatchTotalDefense(state:GameState):number{return nightWatchActiveCitizens(state).reduce((sum,citizen)=>sum+nightWatchDefenseForCitizen(state,citizen),0)}

/** Bots rotate toward low-fatigue volunteers and stop once the public Watchtower envelope is covered. */
export function enrollAutonomousNightWatch(state:GameState,targetDefense:number):GameState{
  if(!nightWatchEnabled(state)||targetDefense<=0)return state
  let next=state
  let defense=nightWatchTotalDefense(next)
  const candidates=state.citizens.filter((citizen)=>citizen.controller==='basic-bot'&&citizen.alive&&citizen.location.type==='town'&&!nightWatchEnrolled(state,citizen.id)).sort((left,right)=>
    nightWatchPreviousWatches(state,left.id)-nightWatchPreviousWatches(state,right.id)
      ||nightWatchDeathChance(state,left)-nightWatchDeathChance(state,right)
      ||nightWatchDefenseForCitizen(state,right)-nightWatchDefenseForCitizen(state,left)
      ||left.id.localeCompare(right.id))
  for(const citizen of candidates){
    const current=normalizedNightWatchState(next)
    if(current.enrolledCitizenIds.length>=nightWatchCapacity(next)||defense>=targetDefense)break
    next=withNightWatchState(next,{...current,enrolledCitizenIds:[...current.enrolledCitizenIds,citizen.id]})
    defense+=nightWatchDefenseForCitizen(next,citizen)
  }
  return next
}

function applyWatchItemUse(state:GameState,citizen:Citizen,overflowBefore:number):{inventory:ItemInstance[];usedItemIds:string[]}{
  if(overflowBefore<=0||!nightWatchWeaponsAllowed(state))return{inventory:citizen.inventory,usedItemIds:[]}
  const usedItemIds:string[]=[]
  const inventory:ItemInstance[]=[]
  for(const item of citizen.inventory){
    const definition=itemDefinition(item)
    if(!definition||rawItemWatchpoint(item)===0||definition.use==='none'){inventory.push(item);continue}
    usedItemIds.push(item.id)
    if(definition.use==='destroy')continue
    if(definition.use==='break'&&definition.breaksInto){inventory.push(createItemInstance(item.id,definition.breaksInto));continue}
    if(definition.use==='decrement_charge'){
      const stateBefore=normalizeItemState(item.type,item.state)
      inventory.push(createItemInstance(item.id,item.type,{...stateBefore,charges:Math.max(0,(stateBefore.charges??0)-1)}))
      continue
    }
    inventory.push(item)
  }
  return{inventory,usedItemIds}
}
function removePositiveWatchGear(inventory:ItemInstance[]):{inventory:ItemInstance[];lostItemIds:string[]}{
  const lostItemIds=inventory.filter((item)=>rawItemWatchpoint(item)>0).map((item)=>item.id)
  const lost=new Set(lostItemIds)
  return{inventory:inventory.filter((item)=>!lost.has(item.id)),lostItemIds}
}

/**
 * Resolves Watch defense and personal Watch risk before home breach allocation. Watch wounds
 * and Terror are deliberately applied later, after ordinary nightly infection progression.
 */
export function resolveNightWatch(state:GameState,overflowBefore:number):{state:GameState;report:NightWatchReport}{
  const nightWatch=normalizedNightWatchState(state)
  const enrolled=new Set(nightWatch.enrolledCitizenIds)
  const active=state.citizens.filter((citizen)=>enrolled.has(citizen.id)&&citizen.alive&&citizen.location.type==='town')
  const activeIds=new Set(active.map((citizen)=>citizen.id))
  const outcomes:NightWatchCitizenOutcome[]=[]
  const nextPrevious={...nightWatch.previousWatches}
  const inventoryByCitizen=new Map<string,ItemInstance[]>()
  const deathEvents:GameEvent[]=[]
  let defense=0

  for(const citizenId of nightWatch.enrolledCitizenIds){
    const citizen=state.citizens.find((candidate)=>candidate.id===citizenId)
    if(!citizen||!activeIds.has(citizenId))outcomes.push({citizenId,active:false,defense:0,deathChance:0,previousWatches:nightWatch.previousWatches[citizenId]??0,result:'skipped',usedItemIds:[],lostItemIds:[]})
  }

  for(const citizen of active){
    const previousWatches=nightWatch.previousWatches[citizen.id]??0
    const citizenDefense=nightWatchDefenseForCitizen(state,citizen)
    const deathChance=nightWatchDeathChance(state,citizen)
    defense+=citizenDefense
    nextPrevious[citizen.id]=previousWatches+1

    let rng=isolatedWatchSeed(state,citizen.id)
    const deathRoll=randomInt(rng,1,100);rng=deathRoll.state
    let result:NightWatchResult=deathRoll.value<=deathChance?'dead':'fine'
    let woundLocation:WoundLocation|undefined
    if(result!=='dead'&&overflowBefore>0){
      const conditionRoll=randomInt(rng,1,100);rng=conditionRoll.state
      if(conditionRoll.value<=NIGHT_WATCH_WOUND_CHANCE){
        result='wounded'
        if(!citizen.status.wound){const woundRoll=randomInt(rng,0,WOUND_LOCATIONS.length-1);woundLocation=WOUND_LOCATIONS[woundRoll.value]}
      }else if(conditionRoll.value<=NIGHT_WATCH_WOUND_CHANCE+NIGHT_WATCH_TERROR_CHANCE)result='terrorized'
    }

    const used=applyWatchItemUse(state,citizen,overflowBefore)
    let inventory=used.inventory
    let lostItemIds:string[]=[]
    if(result==='dead'){
      const lost=removePositiveWatchGear(inventory);inventory=lost.inventory;lostItemIds=lost.lostItemIds
      deathEvents.push({type:'CITIZEN_DIED',day:state.day,hour:ATTACK_HOUR,citizenId:citizen.id,reason:'night_watch'} as unknown as GameEvent)
    }
    inventoryByCitizen.set(citizen.id,inventory)
    outcomes.push({citizenId:citizen.id,active:true,defense:citizenDefense,deathChance,previousWatches,result,...(woundLocation?{woundLocation}:{}),usedItemIds:used.usedItemIds,lostItemIds})
  }

  const withInventories:GameState={...state,town:{...state.town,nightWatch:{enrolledCitizenIds:[...nightWatch.enrolledCitizenIds],previousWatches:nextPrevious}},citizens:state.citizens.map((citizen)=>inventoryByCitizen.has(citizen.id)?{...citizen,inventory:inventoryByCitizen.get(citizen.id)!}:citizen)}
  const afterDeaths=applyEvents(withInventories,deathEvents)
  return{state:afterDeaths,report:{capacity:nightWatchCapacity(state),enrolled:nightWatch.enrolledCitizenIds.length,active:active.length,weaponsAllowed:nightWatchWeaponsAllowed(state),defense,overflowBefore,overflowAfter:Math.max(0,overflowBefore-defense),outcomes}}
}

/** Apply Watch wounds/Terror after the ordinary nightly infection pass. */
export function applyNightWatchConditions(state:GameState,report:NightWatchReport):GameState{
  const outcomes=new Map(report.outcomes.map((outcome)=>[outcome.citizenId,outcome]))
  return{...state,citizens:state.citizens.map((citizen)=>{
    if(!citizen.alive)return citizen
    const outcome=outcomes.get(citizen.id)
    if(outcome?.result==='wounded')return{...citizen,status:{...citizen.status,wound:citizen.status.wound??outcome.woundLocation??WOUND_LOCATIONS[0]}}
    if(outcome?.result==='terrorized')return{...citizen,status:{...citizen.status,terrorized:true}}
    return citizen
  })}
}
