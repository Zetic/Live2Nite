import { CONSTRUCTION_AP_COST, GATE_AP_COST, MOVE_AP_COST, SPECIAL_EXCAVATION_AP_COST, getLegalActions } from './actions'
import { CAMP_IMPROVEMENT_AP_COST, campingChancePercent } from './camping'
import { BAREHANDED_AP_COST, resolveBarehandedAttack, resolveWeaponAttack } from './combat'
import { CONSTRUCTIONS } from './construction'
import { applyEvents } from './events'
import { HOME_LEVELS, HOME_UPGRADE_AP_COST, nextHomeLevel } from './home'
import { containerPool, DEPLETED_SCAVENGE_LOOT_POOL } from './items'
import { randomInt } from './rng'
import { travelHydrationTransition, waterConsumptionOutcome } from './status'
import type { Citizen, GameCommand, GameEvent, GameState, ItemInstance, ItemStorage, ItemType, SearchMode } from './types'
import { citizensInZone, getZone, moveCoordinates, zoneControl, zoneKey } from './world'
import { WORKSHOP_RECIPES } from './workshop'

export interface CommandResult { state: GameState; events: GameEvent[] }
export class InvalidCommandError extends Error {}

function sameCommand(left: GameCommand, right: GameCommand): boolean {
  if (left.type !== right.type || left.citizenId !== right.citizenId) return false
  if (left.type === 'MOVE' && right.type === 'MOVE') return left.direction === right.direction
  if (left.type === 'PICK_UP_ITEM' && right.type === 'PICK_UP_ITEM') return left.itemId === right.itemId
  if (left.type === 'USE_WEAPON' && right.type === 'USE_WEAPON') return left.itemId === right.itemId
  if (left.type === 'DEPOSIT_ITEM' && right.type === 'DEPOSIT_ITEM') return left.itemId === right.itemId
  if (left.type === 'WITHDRAW_BANK_ITEM' && right.type === 'WITHDRAW_BANK_ITEM') return left.itemType === right.itemType
  if (left.type === 'MOVE_ITEM_TO_HOME' && right.type === 'MOVE_ITEM_TO_HOME') return left.itemId === right.itemId
  if (left.type === 'MOVE_ITEM_TO_RUCKSACK' && right.type === 'MOVE_ITEM_TO_RUCKSACK') return left.itemId === right.itemId
  if (left.type === 'OPEN_CONTAINER' && right.type === 'OPEN_CONTAINER') return left.itemId === right.itemId
  if (left.type === 'EAT_ITEM' && right.type === 'EAT_ITEM') return left.itemId === right.itemId
  if (left.type === 'DRINK_ITEM' && right.type === 'DRINK_ITEM') return left.itemId === right.itemId
  if (left.type === 'CONTRIBUTE_CONSTRUCTION' && right.type === 'CONTRIBUTE_CONSTRUCTION') return left.projectId === right.projectId
  if (left.type === 'WORKSHOP_CONVERT' && right.type === 'WORKSHOP_CONVERT') return left.recipeId === right.recipeId
  return true
}

function requireLegal(state: GameState, command: GameCommand): void { if (!getLegalActions(state, command.citizenId).some((candidate) => sameCommand(candidate, command))) throw new InvalidCommandError(`Illegal ${command.type} action for ${command.citizenId}`) }
function normalSearchItem(state: GameState, x: number, y: number): ItemInstance | null { const type = getZone(state.world,x,y)?.hiddenLoot[0]; return type ? itemAt(state,type,0) : null }
function depletedSearchOutcome(state: GameState): { item: ItemInstance; rngStateAfter: number } { const roll = randomInt(state.rngState,0,DEPLETED_SCAVENGE_LOOT_POOL.length-1); return { item: itemAt(state,DEPLETED_SCAVENGE_LOOT_POOL[roll.value],0), rngStateAfter:roll.state } }
function itemAt(state:GameState,type:ItemType,offset=0):ItemInstance{return{id:`i${String(state.nextItemId+offset).padStart(6,'0')}`,type}}
function locateItem(state: GameState,citizenId:string,itemId:string):{item:ItemInstance;source:ItemStorage}{const citizen=state.citizens.find((candidate)=>candidate.id===citizenId)!;const inventoryItem=citizen.inventory.find((item)=>item.id===itemId);if(inventoryItem)return{item:inventoryItem,source:'inventory'};const homeItem=citizen.home.storage.find((item)=>item.id===itemId);if(homeItem)return{item:homeItem,source:'home'};throw new InvalidCommandError(`Missing item ${itemId}`)}

function movementControlEvents(state:GameState,citizen:Citizen,target:{x:number;y:number}):GameEvent[]{
  if(citizen.location.type!=='world')return[]
  const events:GameEvent[]=[]
  const originKey=zoneKey(citizen.location.x,citizen.location.y)
  const beforeOrigin=zoneControl(state,citizen.location.x,citizen.location.y)
  const remaining=citizensInZone(state,citizen.location.x,citizen.location.y).filter((candidate)=>candidate.id!==citizen.id)
  if(!beforeOrigin.trapped&&remaining.length>0&&beforeOrigin.zombiePoints>remaining.length*2){
    events.push({type:'ZONE_CONTROL_LOST',day:state.day,zoneKey:originKey,causedByCitizenId:citizen.id,remainingCitizenIds:remaining.map((candidate)=>candidate.id)})
    for(const resident of remaining)events.push({type:'TEMPORARY_CONTROL_GRANTED',day:state.day,citizenId:resident.id,zoneKey:originKey})
  }
  const beforeTarget=zoneControl(state,target.x,target.y)
  if(beforeTarget.trapped&&beforeTarget.zombiePoints<=(beforeTarget.humans+1)*2){
    events.push({type:'ZONE_CONTROL_RESTORED',day:state.day,zoneKey:zoneKey(target.x,target.y),reason:'arrival'})
  }
  return events
}

function combatObservationEvents(state:GameState,citizen:Citizen,key:string,kills:number):GameEvent[]{
  if(citizen.location.type!=='world')return[]
  const before=zoneControl(state,citizen.location.x,citizen.location.y)
  const afterZombies=Math.max(0,before.zombies-kills)
  const events:GameEvent[]=[{type:'ZONE_OBSERVED',day:state.day,zoneKey:key,zombies:afterZombies,citizenId:citizen.id}]
  if(before.trapped&&afterZombies<=before.humanPoints)events.push({type:'ZONE_CONTROL_RESTORED',day:state.day,zoneKey:key,reason:'combat'})
  return events
}

export function executeCommand(state: GameState, command: GameCommand): CommandResult {
  requireLegal(state,command)
  const citizen=state.citizens.find((candidate)=>candidate.id===command.citizenId)!
  const events:GameEvent[]=[]
  switch(command.type){
    case 'OPEN_GATE':events.push({type:'AP_SPENT',day:state.day,citizenId:command.citizenId,amount:GATE_AP_COST},{type:'GATE_SET',day:state.day,open:true,citizenId:command.citizenId});break
    case 'CLOSE_GATE':events.push({type:'AP_SPENT',day:state.day,citizenId:command.citizenId,amount:GATE_AP_COST},{type:'GATE_SET',day:state.day,open:false,citizenId:command.citizenId});break
    case 'EXIT_TOWN':events.push({type:'CITIZEN_LOCATION_CHANGED',day:state.day,citizenId:command.citizenId,location:{type:'world',x:0,y:0}},{type:'ZONE_OBSERVED',day:state.day,zoneKey:'0,0',zombies:0,citizenId:command.citizenId});break
    case 'ENTER_TOWN':events.push({type:'CITIZEN_LOCATION_CHANGED',day:state.day,citizenId:command.citizenId,location:{type:'town'}});break
    case 'MOVE':{
      if(citizen.location.type!=='world')throw new InvalidCommandError('Citizen is not outside')
      const target=moveCoordinates(citizen.location.x,citizen.location.y,command.direction)
      const key=zoneKey(target.x,target.y)
      const targetZone=getZone(state.world,target.x,target.y)
      if(!targetZone)throw new InvalidCommandError('Target zone does not exist')
      const controlEvents=movementControlEvents(state,citizen,target)
      events.push(
        {type:'AP_SPENT',day:state.day,citizenId:command.citizenId,amount:MOVE_AP_COST},
        {type:'CITIZEN_LOCATION_CHANGED',day:state.day,citizenId:command.citizenId,location:{type:'world',x:target.x,y:target.y},desertStep:true},
        {type:'ZONE_DISCOVERED',day:state.day,zoneKey:key},
        {type:'ZONE_OBSERVED',day:state.day,zoneKey:key,zombies:targetZone.zombies,citizenId:command.citizenId},
        ...controlEvents,
      )
      const transition=travelHydrationTransition(citizen)
      if(transition)events.push({type:'CITIZEN_STATUS_CHANGED',day:state.day,citizenId:command.citizenId,status:transition,reason:'desert_travel'})
      break
    }
    case 'SEARCH_ZONE':{if(citizen.location.type!=='world')throw new InvalidCommandError('Citizen is not outside');const key=zoneKey(citizen.location.x,citizen.location.y);const zone=state.world.zones[key];const mode:SearchMode=zone.searchesRemaining>0?'normal':'depleted';if(mode==='normal')events.push({type:'ZONE_SEARCHED',day:state.day,zoneKey:key,citizenId:command.citizenId,mode,item:normalSearchItem(state,citizen.location.x,citizen.location.y)});else{const outcome=depletedSearchOutcome(state);events.push({type:'ZONE_SEARCHED',day:state.day,zoneKey:key,citizenId:command.citizenId,mode,item:outcome.item,rngStateAfter:outcome.rngStateAfter})}break}
    case 'EXCAVATE_SPECIAL_SITE':{if(citizen.location.type!=='world')throw new InvalidCommandError('Citizen is not outside');const key=zoneKey(citizen.location.x,citizen.location.y);events.push({type:'AP_SPENT',day:state.day,citizenId:command.citizenId,amount:SPECIAL_EXCAVATION_AP_COST},{type:'SPECIAL_SITE_EXCAVATED',day:state.day,zoneKey:key,citizenId:command.citizenId,amount:SPECIAL_EXCAVATION_AP_COST});break}
    case 'SEARCH_SPECIAL_SITE':{if(citizen.location.type!=='world')throw new InvalidCommandError('Citizen is not outside');const key=zoneKey(citizen.location.x,citizen.location.y);const type=state.world.zones[key].specialSite?.hiddenLoot[0];events.push({type:'SPECIAL_SITE_SEARCHED',day:state.day,zoneKey:key,citizenId:command.citizenId,item:type?itemAt(state,type):null});break}
    case 'PICK_UP_ITEM':{if(citizen.location.type!=='world')throw new InvalidCommandError('Citizen is not outside');const key=zoneKey(citizen.location.x,citizen.location.y);const item=state.world.zones[key].groundItems.find((candidate)=>candidate.id===command.itemId)!;events.push({type:'ITEM_PICKED_UP',day:state.day,citizenId:command.citizenId,zoneKey:key,item});break}
    case 'ATTACK_BAREHANDED':{
      if(citizen.location.type!=='world')throw new InvalidCommandError('Citizen is not outside')
      const key=zoneKey(citizen.location.x,citizen.location.y)
      const outcome=resolveBarehandedAttack(state)
      events.push({type:'AP_SPENT',day:state.day,citizenId:command.citizenId,amount:BAREHANDED_AP_COST},{type:'COMBAT_RESOLVED',day:state.day,citizenId:command.citizenId,zoneKey:key,method:'fists',kills:outcome.kills,item:null,consumed:false,rngStateAfter:outcome.rngStateAfter},...combatObservationEvents(state,citizen,key,outcome.kills))
      break
    }
    case 'USE_WEAPON':{
      if(citizen.location.type!=='world')throw new InvalidCommandError('Citizen is not outside')
      const key=zoneKey(citizen.location.x,citizen.location.y)
      const zone=state.world.zones[key]
      const item=citizen.inventory.find((candidate)=>candidate.id===command.itemId)
      if(!item)throw new InvalidCommandError(`Missing carried weapon ${command.itemId}`)
      const outcome=resolveWeaponAttack(state,item,zone.zombies)
      events.push({type:'COMBAT_RESOLVED',day:state.day,citizenId:command.citizenId,zoneKey:key,method:item.type,kills:outcome.kills,item,consumed:outcome.consumed,brokenInto:outcome.brokenInto,rngStateAfter:outcome.rngStateAfter},...combatObservationEvents(state,citizen,key,outcome.kills))
      break
    }
    case 'IMPROVE_CAMP':{if(citizen.location.type!=='world')throw new InvalidCommandError('Citizen is not outside');const key=zoneKey(citizen.location.x,citizen.location.y);events.push({type:'AP_SPENT',day:state.day,citizenId:command.citizenId,amount:CAMP_IMPROVEMENT_AP_COST},{type:'CAMP_IMPROVED',day:state.day,citizenId:command.citizenId,zoneKey:key,amount:1});break}
    case 'HIDE_FOR_NIGHT':{const chance=campingChancePercent(state,command.citizenId);events.push({type:'CITIZEN_HIDING_SET',day:state.day,citizenId:command.citizenId,hidden:true,survivalChance:chance});break}
    case 'LEAVE_HIDEOUT':events.push({type:'CITIZEN_HIDING_SET',day:state.day,citizenId:command.citizenId,hidden:false,survivalChance:null});break
    case 'DEPOSIT_ITEM':{const item=citizen.inventory.find((candidate)=>candidate.id===command.itemId)!;events.push({type:'ITEM_DEPOSITED',day:state.day,citizenId:command.citizenId,item});break}
    case 'WITHDRAW_BANK_ITEM':events.push({type:'ITEM_WITHDRAWN',day:state.day,citizenId:command.citizenId,item:itemAt(state,command.itemType)});break
    case 'MOVE_ITEM_TO_HOME':{const item=citizen.inventory.find((candidate)=>candidate.id===command.itemId)!;events.push({type:'ITEM_MOVED_TO_HOME',day:state.day,citizenId:command.citizenId,item});break}
    case 'MOVE_ITEM_TO_RUCKSACK':{const item=citizen.home.storage.find((candidate)=>candidate.id===command.itemId)!;events.push({type:'ITEM_MOVED_TO_RUCKSACK',day:state.day,citizenId:command.citizenId,item});break}
    case 'OPEN_CONTAINER':{const located=locateItem(state,command.citizenId,command.itemId);if(located.item.type==='construction_kit'){const pool:ItemType[]=['twisted_plank','wrought_iron'];const first=randomInt(state.rngState,0,pool.length-1);const second=randomInt(first.state,0,pool.length-1);events.push({type:'CONSTRUCTION_KIT_OPENED',day:state.day,citizenId:command.citizenId,containerId:located.item.id,source:located.source,outputs:[itemAt(state,pool[first.value],0),itemAt(state,pool[second.value],1)],rngStateAfter:second.state});break}const pool=containerPool(located.item.type);if(!pool?.length)throw new InvalidCommandError(`${located.item.type} is not an openable container`);const roll=randomInt(state.rngState,0,pool.length-1);events.push({type:'CONTAINER_OPENED',day:state.day,citizenId:command.citizenId,containerId:located.item.id,containerType:located.item.type,source:located.source,output:itemAt(state,pool[roll.value]),rngStateAfter:roll.state});break}
    case 'TAKE_WATER':events.push({type:'WATER_TAKEN',day:state.day,citizenId:command.citizenId,item:itemAt(state,'water_ration')});break
    case 'EAT_ITEM':{const located=locateItem(state,command.citizenId,command.itemId);events.push({type:'ITEM_CONSUMED',day:state.day,citizenId:command.citizenId,item:located.item,source:located.source,kind:'food',restoresAp:true});break}
    case 'DRINK_ITEM':{const located=locateItem(state,command.citizenId,command.itemId);const outcome=waterConsumptionOutcome(citizen);events.push({type:'ITEM_CONSUMED',day:state.day,citizenId:command.citizenId,item:located.item,source:located.source,kind:'water',restoresAp:outcome.restoresAp},{type:'CITIZEN_STATUS_CHANGED',day:state.day,citizenId:command.citizenId,status:outcome.statusAfter,reason:'drank_water'});break}
    case 'UPGRADE_HOME':{const target=nextHomeLevel(citizen.home.level);if(!target)throw new InvalidCommandError('No home upgrade is currently available');events.push({type:'AP_SPENT',day:state.day,citizenId:command.citizenId,amount:HOME_UPGRADE_AP_COST},{type:'HOME_UPGRADED',day:state.day,citizenId:command.citizenId,from:citizen.home.level,to:target,defenseAfter:HOME_LEVELS[target].defense});break}
    case 'CONTRIBUTE_CONSTRUCTION':{const definition=CONSTRUCTIONS[command.projectId];const project=state.town.construction[command.projectId];const amount=Math.min(CONSTRUCTION_AP_COST,definition.apCost-project.apContributed);events.push({type:'AP_SPENT',day:state.day,citizenId:command.citizenId,amount},{type:'CONSTRUCTION_AP_CONTRIBUTED',day:state.day,citizenId:command.citizenId,projectId:command.projectId,amount});if(project.apContributed+amount>=definition.apCost)events.push({type:'CONSTRUCTION_COMPLETED',day:state.day,citizenId:command.citizenId,projectId:command.projectId,consumed:definition.resources,defenseBonus:definition.defenseBonus});break}
    case 'WORKSHOP_CONVERT':{const recipe=WORKSHOP_RECIPES[command.recipeId];events.push({type:'AP_SPENT',day:state.day,citizenId:command.citizenId,amount:recipe.apCost},{type:'WORKSHOP_CONVERTED',day:state.day,citizenId:command.citizenId,recipeId:command.recipeId,input:recipe.input,inputCount:recipe.inputCount,output:recipe.output,outputCount:recipe.outputCount});break}
  }
  const stampedEvents:GameEvent[]=events.map((event)=>({...event,hour:state.clock.hour}))
  return{state:applyEvents(state,stampedEvents),events:stampedEvents}
}
