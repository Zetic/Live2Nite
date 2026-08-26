import { canCarryItem } from './inventory'
import { createItemInstance } from './items'
import { hasProfession } from './professions'
import {
  expireRuinExploration,
  getRuinExplorer,
  getRuinInterior,
  oxygenSecondsRemaining,
  ruinCurrentCell,
  type RuinActionResult,
  type RuinInteriorState,
} from './ruinExploration'
import type { CombinationRecipeId, Citizen, GameCommand, GameEvent, GameState, ItemInstance, ItemType, PersonalItemStorage, WorldZone } from './types'
import { getZone, zoneKey } from './world'

/** Current MyHordes Technician profession starts each day with six Construction Points. */
export const TECHNICIAN_MAX_CP=6
/** The Technician's Wrench repair action consumes three CP and no AP, but requires the citizen not to be exhausted. */
export const TECHNICIAN_REPAIR_CP_COST=3
/** Prime Technician Workbench cost: Technicians pay 4 work points; other professions pay 6. */
export const TECHNICIAN_WORKBENCH_TECH_COST=4
export const TECHNICIAN_WORKBENCH_OTHER_COST=6

/**
 * Technician state is intentionally optional for save compatibility. Old saves containing
 * a Technician receive the profession's normal daily pool the first time it is queried;
 * once any CP are spent, the explicit remaining value is persisted.
 */
declare module './types' {
  interface Citizen { technicianPoints?:number }
  interface CitizenDailyState { technicianWorkbenchUsed?:boolean }
}

export type TechnicianEventMeta={
  technicianPointsSpent?:number
  technicianWorkbenchUsed?:boolean
}
export type TechnicianConstructionEvent=Extract<GameEvent,{type:'CONSTRUCTION_AP_CONTRIBUTED'}>&TechnicianEventMeta
export type TechnicianWorkshopEvent=Extract<GameEvent,{type:'WORKSHOP_CONVERTED'}>&TechnicianEventMeta&{workbenchOutput?:ItemType}
export type TechnicianCombinationEvent=Extract<GameEvent,{type:'ITEMS_COMBINED'}>&TechnicianEventMeta&{technicianWrenchRepair?:boolean}
export type TechnicianWorkbenchCommand=Extract<GameCommand,{type:'WORKSHOP_CONVERT'}>&{workbenchOutput:ItemType}

const REPAIR_RECIPES:Readonly<Record<string,{recipeId:CombinationRecipeId;repaired:ItemType}>>={
  broken_human_bone:{recipeId:'repair_human_bone',repaired:'human_bone'},
  broken_pathetic_penknife:{recipeId:'repair_penknife',repaired:'pathetic_penknife'},
  broken_staff:{recipeId:'repair_staff',repaired:'staff'},
  broken_serrated_knife:{recipeId:'repair_serrated_knife',repaired:'serrated_knife'},
  broken_machete:{recipeId:'repair_machete',repaired:'machete'},
  broken_adjustable_spanner:{recipeId:'repair_adjustable_spanner',repaired:'adjustable_spanner'},
  broken_screwdriver:{recipeId:'repair_screwdriver',repaired:'screwdriver'},
  broken_swiss_army_knife:{recipeId:'repair_swiss_army_knife',repaired:'swiss_army_knife'},
  broken_box_cutter:{recipeId:'repair_box_cutter',repaired:'box_cutter'},
  broken_chain:{recipeId:'repair_chain',repaired:'chain'},
  broken_can_opener:{recipeId:'repair_can_opener',repaired:'can_opener'},
  broken_ektorp_gluten_chair:{recipeId:'repair_ektorp_gluten_chair',repaired:'ektorp_gluten_chair'},
  broken_pc_base_unit:{recipeId:'repair_pc_base_unit',repaired:'pc_base_unit'},
}

export function technicianPoints(citizen:Citizen):number{
  if(!hasProfession(citizen,'technician'))return 0
  return Math.max(0,Math.min(TECHNICIAN_MAX_CP,citizen.technicianPoints??TECHNICIAN_MAX_CP))
}
export function technicianPayment(citizen:Citizen,cost:number):{cp:number;ap:number}{
  const normalized=Math.max(0,Math.floor(cost))
  const cp=Math.min(normalized,technicianPoints(citizen))
  return{cp,ap:normalized-cp}
}
export function canPayTechnicalWork(citizen:Citizen,cost:number):boolean{
  const payment=technicianPayment(citizen,cost)
  return citizen.ap>=payment.ap
}
export function resetTechnicianForNewDay(citizen:Citizen):Citizen{
  return{...citizen,technicianPoints:hasProfession(citizen,'technician')?TECHNICIAN_MAX_CP:0}
}
export function applyTechnicianEventMeta(state:GameState,event:GameEvent):GameState{
  const meta=event as GameEvent&TechnicianEventMeta&{citizenId?:string}
  const citizenId=meta.citizenId
  if(!citizenId||(!meta.technicianPointsSpent&&!meta.technicianWorkbenchUsed))return state
  return{...state,citizens:state.citizens.map((citizen)=>citizen.id!==citizenId?citizen:{
    ...citizen,
    technicianPoints:meta.technicianPointsSpent?Math.max(0,technicianPoints(citizen)-meta.technicianPointsSpent):citizen.technicianPoints,
    daily:meta.technicianWorkbenchUsed?{...citizen.daily,technicianWorkbenchUsed:true}:citizen.daily,
  })}
}

function personalItems(citizen:Citizen):Array<{item:ItemInstance;storage:PersonalItemStorage}>{
  const inventory=citizen.inventory.map((item)=>({item,storage:'inventory' as const}))
  if(citizen.location.type==='world')return inventory
  return[...inventory,...citizen.home.storage.map((item)=>({item,storage:'home' as const}))]
}
export function technicianRepairSpec(type:ItemType):{recipeId:CombinationRecipeId;repaired:ItemType}|null{return REPAIR_RECIPES[type]??null}
export function canTechnicianRepair(citizen:Citizen,item:ItemInstance):boolean{
  return hasProfession(citizen,'technician')&&citizen.ap>0&&citizen.status.wound!=='hands'&&technicianPoints(citizen)>=TECHNICIAN_REPAIR_CP_COST&&Boolean(technicianRepairSpec(item.type))
}
export function technicianRepairCommands(citizen:Citizen):Array<Extract<GameCommand,{type:'COMBINE_ITEMS'}>>{
  if(!hasProfession(citizen,'technician')||citizen.ap<=0||citizen.status.wound==='hands'||technicianPoints(citizen)<TECHNICIAN_REPAIR_CP_COST)return[]
  const commands:Array<Extract<GameCommand,{type:'COMBINE_ITEMS'}>>=[]
  for(const{item}of personalItems(citizen)){
    const spec=technicianRepairSpec(item.type)
    if(spec)commands.push({type:'COMBINE_ITEMS',citizenId:citizen.id,recipeId:spec.recipeId,itemIds:[item.id]})
  }
  return commands
}
export function isTechnicianRepairCommand(citizen:Citizen,command:Extract<GameCommand,{type:'COMBINE_ITEMS'}>):boolean{
  if(command.itemIds.length!==1)return false
  const ref=personalItems(citizen).find((entry)=>entry.item.id===command.itemIds[0])
  const spec=ref?technicianRepairSpec(ref.item.type):null
  return Boolean(ref&&spec&&spec.recipeId===command.recipeId&&canTechnicianRepair(citizen,ref.item))
}
export function resolveTechnicianRepair(citizen:Citizen,command:Extract<GameCommand,{type:'COMBINE_ITEMS'}>):{consumedItemIds:string[];outputs:{item:ItemInstance;storage:PersonalItemStorage}[];createdCount:number}{
  const ref=personalItems(citizen).find((entry)=>entry.item.id===command.itemIds[0])
  const spec=ref?technicianRepairSpec(ref.item.type):null
  if(!ref||!spec||spec.recipeId!==command.recipeId)throw new Error('Invalid Technician repair target')
  return{consumedItemIds:[ref.item.id],outputs:[{item:createItemInstance(ref.item.id,spec.repaired),storage:ref.storage}],createdCount:0}
}

export function technicianWorkbenchCost(citizen:Citizen):number{return hasProfession(citizen,'technician')?TECHNICIAN_WORKBENCH_TECH_COST:TECHNICIAN_WORKBENCH_OTHER_COST}
export function technicianWorkbenchAvailable(state:GameState,citizen:Citizen):boolean{
  return Boolean(state.town.construction.technicians_workbench?.completed)&&citizen.alive&&citizen.location.type==='town'&&!citizen.daily.technicianWorkbenchUsed&&canPayTechnicalWork(citizen,technicianWorkbenchCost(citizen))
}
export function workbenchOutput(command:GameCommand):ItemType|null{return command.type==='WORKSHOP_CONVERT'&&'workbenchOutput'in command?(command as TechnicianWorkbenchCommand).workbenchOutput:null}
export function workbenchCommand(citizenId:string,recipeId:Extract<GameCommand,{type:'WORKSHOP_CONVERT'}>['recipeId'],output:ItemType):TechnicianWorkbenchCommand{return{type:'WORKSHOP_CONVERT',citizenId,recipeId,workbenchOutput:output}}

function updateRuinInterior(state:GameState,zone:WorldZone,interior:RuinInteriorState):GameState{
  const key=zoneKey(zone.x,zone.y)
  return{...state,world:{...state.world,zones:{...state.world.zones,[key]:{...zone,specialSite:{...zone.specialSite!,interior} as WorldZone['specialSite']}}}}
}
/**
 * Current MyHordes gives Technicians an empty-input key-imprint route inside explorable ruins.
 * Live2Nite preserves the two-step interaction: this creates the matching semantic key; the
 * existing unlock action still consumes that key and opens the room.
 */
export function takeTechnicianRuinImprint(state:GameState,citizenId:string,nowMs=Date.now()):RuinActionResult{
  const citizen=state.citizens.find((candidate)=>candidate.id===citizenId)
  if(!citizen||!hasProfession(citizen,'technician'))return{state,ok:false,message:'Only a Technician can take a key imprint without materials.'}
  const explorer=getRuinExplorer(state,citizenId)
  if(!explorer?.active)return{state,ok:false,message:'No active ruin exploration.'}
  if(oxygenSecondsRemaining(explorer,nowMs)<=0)return expireRuinExploration(state,citizenId,nowMs)
  if(citizen.location.type!=='world')return{state,ok:false,message:'The Technician must be inside the ruin.'}
  const zone=getZone(state.world,citizen.location.x,citizen.location.y)
  const interior=getRuinInterior(zone)
  const cell=ruinCurrentCell(state,citizenId)
  if(!zone||!interior||!cell)return{state,ok:false,message:'Ruin context is unavailable.'}
  if(explorer.inRoomId)return{state,ok:false,message:'Return to the corridor before taking a key imprint.'}
  if(cell.zombies>0&&!explorer.escaping)return{state,ok:false,message:'Zombies block access to the door. Flee first.'}
  const room=cell.roomId?interior.rooms.find((candidate)=>candidate.id===cell.roomId):null
  if(!room?.locked||!room.lockType)return{state,ok:false,message:'There is no supported locked room here.'}
  const key=createItemInstance(`i${String(state.nextItemId).padStart(6,'0')}`,room.lockType)
  if(!canCarryItem(citizen,key))return{state,ok:false,message:'The rucksack needs a free slot for the key imprint.'}
  const nextCitizens=state.citizens.map((candidate)=>candidate.id===citizenId?{...candidate,inventory:[...candidate.inventory,key]}:candidate)
  const next=updateRuinInterior({...state,nextItemId:state.nextItemId+1,citizens:nextCitizens},zone,interior)
  return{state:next,ok:true,message:`The Technician's Wrench forms a matching ${room.lockType.replaceAll('_',' ')} imprint. Unlocking the door will consume it.`}
}
