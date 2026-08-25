import { createItemInstance, itemName } from './items'
import { rollRuinSourceLoot } from './ruinLoot'
import {
  expireRuinExploration,
  getRuinExplorer,
  getRuinInterior,
  oxygenSecondsRemaining,
  ruinCurrentCell,
  type RuinActionResult,
  type RuinInteriorState,
} from './ruinExploration'
import { ruinKeyName, ruinRoomLootSpecFromSourceRef } from './ruinRoomContent'
import { normalizeRuinId } from './specialSites'
import type { Citizen, GameState, SpecialSiteState } from './types'
import { getZone, zoneKey } from './world'

type SiteWithInterior=SpecialSiteState&{interior?:RuinInteriorState}

function fail(game:GameState,message:string):RuinActionResult{return{state:game,ok:false,message}}
function updateCitizen(game:GameState,citizenId:string,updater:(citizen:Citizen)=>Citizen):GameState{
  return{...game,citizens:game.citizens.map((citizen)=>citizen.id===citizenId?updater(citizen):citizen)}
}
function updateInterior(game:GameState,x:number,y:number,updater:(interior:RuinInteriorState)=>RuinInteriorState):GameState{
  const key=zoneKey(x,y),zone=game.world.zones[key],site=zone?.specialSite as SiteWithInterior|undefined
  if(!zone||!site?.interior)return game
  return{...game,world:{...game.world,zones:{...game.world.zones,[key]:{...zone,specialSite:{...site,interior:updater(site.interior)}}}}}
}
function context(game:GameState,citizenId:string){
  const citizen=game.citizens.find((candidate)=>candidate.id===citizenId)
  const explorer=getRuinExplorer(game,citizenId)
  if(!citizen||!explorer?.active||citizen.location.type!=='world')return null
  const zone=getZone(game.world,citizen.location.x,citizen.location.y),interior=getRuinInterior(zone),cell=ruinCurrentCell(game,citizenId)
  if(!zone||!interior||!cell)return null
  const room=explorer.inRoomId?interior.rooms.find((candidate)=>candidate.id===explorer.inRoomId)??null:null
  return{citizen,explorer,zone,interior,cell,room}
}
function requireOxygen(game:GameState,citizenId:string,nowMs:number):RuinActionResult|null{
  const explorer=getRuinExplorer(game,citizenId)
  if(!explorer?.active)return fail(game,'No active ruin exploration.')
  return oxygenSecondsRemaining(explorer,nowMs)<=0?expireRuinExploration(game,citizenId,nowMs):null
}

export function unlockRuinRoom(game:GameState,citizenId:string,nowMs=Date.now()):RuinActionResult{
  const oxygen=requireOxygen(game,citizenId,nowMs);if(oxygen)return oxygen
  const current=context(game,citizenId);if(!current)return fail(game,'No active ruin exploration.')
  if(current.explorer.inRoomId)return fail(game,'Return to the corridor before unlocking a door.')
  if(current.cell.zombies>0&&!current.explorer.escaping)return fail(game,'Zombies block access to the door. Flee first.')
  const room=current.cell.roomId?current.interior.rooms.find((candidate)=>candidate.id===current.cell.roomId):null
  if(!room)return fail(game,'There is no room door here.')
  if(!room.locked)return fail(game,'This room is already unlocked.')
  if(!room.lockType)return fail(game,'This locked room has no supported key family.')
  const key=current.citizen.inventory.find((item)=>item.type===room.lockType)
  if(!key)return fail(game,`This door requires a ${ruinKeyName(room.lockType)}.`)
  let next=updateCitizen(game,citizenId,(citizen)=>({...citizen,inventory:citizen.inventory.filter((item)=>item.id!==key.id)}))
  next=updateInterior(next,current.zone.x,current.zone.y,(interior)=>({...interior,rooms:interior.rooms.map((candidate)=>candidate.id===room.id?{...candidate,locked:false}:candidate)}))
  return{state:next,ok:true,message:`Unlocked the room with a ${ruinKeyName(room.lockType)}. The key did not survive.`}
}

export function searchRuinRoom(game:GameState,citizenId:string,nowMs=Date.now()):RuinActionResult{
  const oxygen=requireOxygen(game,citizenId,nowMs);if(oxygen)return oxygen
  const current=context(game,citizenId);if(!current?.room)return fail(game,'Enter a room before searching it.')
  if(current.room.searched)return fail(game,'This room has already been searched.')
  let next=updateInterior(game,current.zone.x,current.zone.y,(interior)=>({...interior,rooms:interior.rooms.map((room)=>room.id===current.room!.id?{...room,searched:true}:room)}))
  if(!current.room.stocked)return{state:next,ok:true,message:'You search the room thoroughly but find nothing useful.'}
  const ruinId=normalizeRuinId(current.zone.specialSite?.type??'')
  const outcome=rollRuinSourceLoot(game.rngState,ruinId)
  next={...next,rngState:outcome.rngStateAfter}
  const spec=ruinRoomLootSpecFromSourceRef(outcome.sourceRef,outcome.item)
  if(!spec)return{state:next,ok:true,message:'You search the room, but the source-table find is not yet a usable Live2Nite item.'}
  const item=createItemInstance(`i${String(next.nextItemId).padStart(6,'0')}`,spec.type,spec.state)
  next={...next,nextItemId:next.nextItemId+1}
  const citizenAfter=next.citizens.find((candidate)=>candidate.id===citizenId)!
  if(citizenAfter.inventory.length<citizenAfter.inventoryCapacity){
    next=updateCitizen(next,citizenId,(citizen)=>({...citizen,inventory:[...citizen.inventory,item]}))
    return{state:next,ok:true,message:`Found ${itemName(item.type)} and placed it in the rucksack.`}
  }
  next=updateInterior(next,current.zone.x,current.zone.y,(interior)=>({...interior,cells:interior.cells.map((cell)=>cell.id===current.cell.id?{...cell,floorItems:[...(cell.floorItems??[]),item]}:cell)}))
  return{state:next,ok:true,message:`Found ${itemName(item.type)}, but the rucksack is full. It remains on the interior floor.`}
}

export function takeRuinFloorItem(game:GameState,citizenId:string,itemId:string,nowMs=Date.now()):RuinActionResult{
  const oxygen=requireOxygen(game,citizenId,nowMs);if(oxygen)return oxygen
  const current=context(game,citizenId);if(!current)return fail(game,'No active ruin exploration.')
  if(current.citizen.inventory.length>=current.citizen.inventoryCapacity)return fail(game,'The rucksack is full.')
  const item=(current.cell.floorItems??[]).find((candidate)=>candidate.id===itemId)
  if(!item)return fail(game,'That item is not on this interior floor.')
  let next=updateInterior(game,current.zone.x,current.zone.y,(interior)=>({...interior,cells:interior.cells.map((cell)=>cell.id===current.cell.id?{...cell,floorItems:(cell.floorItems??[]).filter((candidate)=>candidate.id!==itemId)}:cell)}))
  next=updateCitizen(next,citizenId,(citizen)=>({...citizen,inventory:[...citizen.inventory,item]}))
  return{state:next,ok:true,message:`Picked up ${itemName(item.type)}.`}
}

export function dropRuinInventoryItem(game:GameState,citizenId:string,itemId:string,nowMs=Date.now()):RuinActionResult{
  const oxygen=requireOxygen(game,citizenId,nowMs);if(oxygen)return oxygen
  const current=context(game,citizenId);if(!current)return fail(game,'No active ruin exploration.')
  const item=current.citizen.inventory.find((candidate)=>candidate.id===itemId)
  if(!item)return fail(game,'That item is not in the rucksack.')
  let next=updateCitizen(game,citizenId,(citizen)=>({...citizen,inventory:citizen.inventory.filter((candidate)=>candidate.id!==itemId)}))
  next=updateInterior(next,current.zone.x,current.zone.y,(interior)=>({...interior,cells:interior.cells.map((cell)=>cell.id===current.cell.id?{...cell,floorItems:[...(cell.floorItems??[]),item]}:cell)}))
  return{state:next,ok:true,message:`Dropped ${itemName(item.type)} on the interior floor.`}
}
