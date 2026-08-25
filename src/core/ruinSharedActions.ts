import { getLegalActions } from './actions'
import { executeCommand, InvalidCommandError, type CommandResult } from './commands'
import { getRuinExplorer, getRuinInterior, ruinCurrentCell, type RuinInteriorState } from './ruinExploration'
import type { GameCommand, GameEvent, GameState, SpecialSiteState } from './types'
import { getZone, zoneKey } from './world'

type SiteWithInterior=SpecialSiteState&{interior?:RuinInteriorState}
type SharedItemCommand=Extract<GameCommand,{type:'OPEN_CONTAINER'|'EAT_ITEM'|'DRINK_ITEM'|'USE_ITEM_ACTION'|'USE_WEAPON'}>
type SharedCommand=SharedItemCommand|Extract<GameCommand,{type:'COMBINE_ITEMS'}>

function isSharedType(command:GameCommand):command is SharedCommand{return command.type==='OPEN_CONTAINER'||command.type==='EAT_ITEM'||command.type==='DRINK_ITEM'||command.type==='USE_ITEM_ACTION'||command.type==='USE_WEAPON'||command.type==='COMBINE_ITEMS'}
function sameSharedCommand(left:GameCommand,right:GameCommand):boolean{
  if(left.type!==right.type||left.citizenId!==right.citizenId)return false
  if(left.type==='COMBINE_ITEMS'&&right.type==='COMBINE_ITEMS')return left.recipeId===right.recipeId&&left.itemIds.length===right.itemIds.length&&left.itemIds.every((id,index)=>id===right.itemIds[index])
  if(left.type==='USE_ITEM_ACTION'&&right.type==='USE_ITEM_ACTION')return left.itemId===right.itemId&&left.actionId===right.actionId
  if('itemId'in left&&'itemId'in right)return left.itemId===right.itemId
  return true
}
function context(state:GameState,citizenId:string){
  const citizen=state.citizens.find((candidate)=>candidate.id===citizenId),explorer=getRuinExplorer(state,citizenId)
  if(!citizen||!explorer?.active||citizen.location.type!=='world')return null
  const zone=getZone(state.world,citizen.location.x,citizen.location.y),interior=getRuinInterior(zone),cell=ruinCurrentCell(state,citizenId)
  if(!zone||!zone.specialSite||!interior||!cell)return null
  return{citizen,explorer,zone,interior,cell,key:zoneKey(citizen.location.x,citizen.location.y)}
}
function projectedState(state:GameState,citizenId:string):GameState|null{
  const current=context(state,citizenId);if(!current)return null
  return{...state,world:{...state.world,zones:{...state.world.zones,[current.key]:{...current.zone,zombies:current.cell.zombies}}}}
}
function inventoryCommand(command:GameCommand,inventoryIds:Set<string>):boolean{return command.type==='COMBINE_ITEMS'?command.itemIds.every((id)=>inventoryIds.has(id)):('itemId'in command&&inventoryIds.has(command.itemId))}

export function getRuinSharedActions(state:GameState,citizenId:string):GameCommand[]{
  const current=context(state,citizenId);if(!current)return[]
  const inventoryIds=new Set(current.citizen.inventory.map((item)=>item.id))
  const ordinary=getLegalActions(state,citizenId).filter((command)=>isSharedType(command)&&command.type!=='USE_WEAPON'&&inventoryCommand(command,inventoryIds))
  if(current.explorer.inRoomId||current.cell.zombies<=0)return ordinary
  const projected=projectedState(state,citizenId);if(!projected)return ordinary
  const localActions=getLegalActions(projected,citizenId).filter((command):command is Extract<GameCommand,{type:'USE_WEAPON'}>=>command.type==='USE_WEAPON'&&inventoryIds.has(command.itemId))
  return[...ordinary,...localActions]
}

function updateLocalZombies(state:GameState,citizenId:string,kills:number):GameState{
  const current=context(state,citizenId);if(!current||kills<=0)return state
  const site=current.zone.specialSite as SiteWithInterior,interior=site.interior;if(!interior)return state
  const nextInterior:RuinInteriorState={...interior,cells:interior.cells.map((cell)=>cell.id===current.cell.id?{...cell,zombies:Math.max(0,cell.zombies-kills)}:cell)}
  return{...state,world:{...state.world,zones:{...state.world.zones,[current.key]:{...current.zone,specialSite:{...site,interior:nextInterior}}}}}
}

export function executeRuinSharedAction(state:GameState,command:GameCommand):CommandResult{
  const legal=getRuinSharedActions(state,command.citizenId)
  if(!legal.some((candidate)=>sameSharedCommand(candidate,command)))throw new InvalidCommandError(`Illegal ${command.type} action for ${command.citizenId} inside explorable ruin`)
  if(command.type!=='USE_WEAPON')return executeCommand(state,command)
  const projected=projectedState(state,command.citizenId);if(!projected)throw new InvalidCommandError('No active explorable ruin action context.')
  const resolved=executeCommand(projected,command)
  const combat=resolved.events.find((event):event is Extract<GameEvent,{type:'COMBAT_RESOLVED'}>=>event.type==='COMBAT_RESOLVED')
  if(!combat)throw new InvalidCommandError('Shared action did not produce a combat result.')
  const projectedCitizen=resolved.state.citizens.find((citizen)=>citizen.id===command.citizenId);if(!projectedCitizen)throw new InvalidCommandError(`Missing citizen ${command.citizenId} after shared action.`)
  const retainedEvents=resolved.events.filter((event)=>event.type==='COMBAT_RESOLVED'||event.type==='AP_SPENT')
  let next:GameState={...state,rngState:resolved.state.rngState,citizens:state.citizens.map((citizen)=>citizen.id===command.citizenId?{...citizen,ap:projectedCitizen.ap,inventory:projectedCitizen.inventory}:citizen),events:[...state.events,...retainedEvents]}
  next=updateLocalZombies(next,command.citizenId,combat.kills)
  return{state:next,events:retainedEvents}
}
