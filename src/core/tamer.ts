import { isCumbersomeItem } from './inventory'
import { hasProfession } from './professions'
import type { RuinInteriorCell, RuinInteriorDirection, RuinInteriorState } from './ruinExploration'
import type { Citizen, GameState, ItemInstance, TamerDogDestination } from './types'

export const TAMER_DOG_HEAVY_LIMIT=1

export function hasTamerDog(citizen:Citizen):boolean{return hasProfession(citizen,'tamer')}
export function tamerDogUsedToday(state:GameState,citizenId:string):boolean{return state.events.some((event)=>event.type==='TAMER_DOG_SENT'&&event.day===state.day&&event.citizenId===citizenId)}
export function tamerDogDruggedToday(state:GameState,citizenId:string):boolean{return state.events.some((event)=>event.type==='TAMER_DOG_DRUGGED'&&event.day===state.day&&event.citizenId===citizenId)}
export function tamerDogBlockedByCumbersome(state:GameState,citizen:Citizen):boolean{return !tamerDogDruggedToday(state,citizen.id)&&citizen.inventory.some(isCumbersomeItem)}

/**
 * The Maltese returns the rucksack as one shipment. A cumbersome cargo item blocks
 * the whole trip unless the dog has been steroid-boosted; the generic inventory
 * rule already limits a citizen to one cumbersome item at a time.
 */
export function tamerDogTransportableItems(state:GameState,citizen:Citizen):ItemInstance[]{
  if(tamerDogBlockedByCumbersome(state,citizen))return[]
  return [...citizen.inventory]
}

export function tamerDogSteroid(citizen:Citizen):ItemInstance|null{return citizen.inventory.find((item)=>item.type==='anabolic_steroids')??null}
export function canDrugTamerDog(state:GameState,citizen:Citizen):boolean{
  return citizen.alive&&citizen.location.type==='world'&&hasTamerDog(citizen)&&!tamerDogUsedToday(state,citizen.id)&&!tamerDogDruggedToday(state,citizen.id)&&Boolean(tamerDogSteroid(citizen))
}
export function canSendTamerDog(state:GameState,citizen:Citizen,destination:TamerDogDestination):boolean{
  if(!citizen.alive||citizen.location.type!=='world'||!hasTamerDog(citizen)||citizen.status.terrorized||tamerDogUsedToday(state,citizen.id))return false
  const items=tamerDogTransportableItems(state,citizen)
  if(items.length===0)return false
  return destination==='bank'||citizen.home.storage.length+items.length<=citizen.home.storageCapacity
}

export type TamerRuinExitGuidance=
  | {kind:'exit'}
  | {kind:'stairs'}
  | {kind:'direction';direction:RuinInteriorDirection}

const DIRECTIONS:readonly [RuinInteriorDirection,number,number][]=[['NORTH',0,1],['SOUTH',0,-1],['EAST',1,0],['WEST',-1,0]]
function sameCell(left:RuinInteriorCell,right:RuinInteriorCell):boolean{return left.id===right.id}

/** Returns the first source-valid interior step the Maltese would indicate toward the ruin exit. */
export function tamerRuinExitGuidance(citizen:Citizen,interior:RuinInteriorState,current:RuinInteriorCell):TamerRuinExitGuidance|null{
  if(!hasTamerDog(citizen))return null
  const entrance=interior.cells.find((cell)=>cell.kind==='entrance'&&cell.floor===0)
  if(!entrance)return null
  if(sameCell(current,entrance))return{kind:'exit'}
  const queue:Array<{cell:RuinInteriorCell;first:TamerRuinExitGuidance|null}>=[{cell:current,first:null}]
  const seen=new Set<string>([current.id])
  while(queue.length){
    const node=queue.shift()!
    const neighbours:Array<{cell:RuinInteriorCell;step:TamerRuinExitGuidance}>=[]
    for(const[direction,dx,dy]of DIRECTIONS){const cell=interior.cells.find((candidate)=>candidate.floor===node.cell.floor&&candidate.x===node.cell.x+dx&&candidate.y===node.cell.y+dy);if(cell)neighbours.push({cell,step:{kind:'direction',direction}})}
    if(node.cell.stairTo){const stair=interior.cells.find((candidate)=>candidate.id===node.cell.stairTo);if(stair)neighbours.push({cell:stair,step:{kind:'stairs'}})}
    for(const neighbour of neighbours){
      if(seen.has(neighbour.cell.id))continue
      seen.add(neighbour.cell.id)
      const first=node.first??neighbour.step
      if(sameCell(neighbour.cell,entrance))return first
      queue.push({cell:neighbour.cell,first})
    }
  }
  return null
}
