import { CONSTRUCTION_AP_COST, GATE_AP_COST, SPECIAL_EXCAVATION_AP_COST, getLegalActions } from './actions'
import { CAMPING_GRAVE_AP_COST, CAMP_IMPROVEMENT_AP_COST, campingChanceBreakdown } from './camping'
import { BAREHANDED_AP_COST, resolveBarehandedAttack, resolveWeaponAttack } from './combat'
import { COMBINATION_RECIPES, resolveCombination } from './combinations'
import { CONSTRUCTIONS, blueprintEligibleProjects } from './construction'
import { resolveHomeLabUse } from './drugLab'
import { applyEvents } from './events'
import { explorableBlueprintEligibleProjects, explorableBlueprintTierFromType } from './explorableBlueprints'
import { garbageDumpActionCost, resolveGarbageDump } from './garbageDump'
import { HOME_IMPROVEMENTS, homeHasAlarm, homeImprovementDefense, homePreventsTheft, improvementNextLevel, nextHomeDefinition, siestaChancePercent } from './home'
import { itemUseActionDefinition, resolveCitizenEffects, resolveFoodItemAction, resolveItemUseAction, resolveWaterItemAction } from './itemEffects'
import { containerPool, createItemInstance, normalizeItemState } from './items'
import { resolveKitchenUse } from './kitchen'
import { openableDefinition, resolveOpenable } from './openables'
import { randomInt } from './rng'
import { RUIN_CATALOG } from './ruinCatalog'
import { isSpadeReplenishCommand, spadeReplenishmentEvent, type ScavengerSearchCommand } from './scavenging'
import { mappingEvents, movementPointEvent, scoutArrivalEvents, scoutExposureEvent } from './scout'
import { normalizeRuinId } from './specialSites'
import { LEG_WOUND_MOVE_FAILURE_PERCENT, citizenControlPoints, travelHydrationTransition } from './status'
import { WORLD_STATUS_ACTIONS } from './statusSources'
import { survivalistForageEvent } from './survivalist'
import { tamerDogTransportableItems } from './tamer'
import type { Citizen, GameCommand, GameEvent, GameState, ItemInstance, ItemStorage, ItemType, SearchMode } from './types'
import { purifierYield, refillableWaterItem } from './waterEconomy'
import { citizensInZone, getZone, moveCoordinates, zoneControl, zoneKey } from './world'
import { WORKSHOP_RECIPES, resolveWorkshopRecipeOutput, workshopRecipeApCost, workshopRecipeInputItemIds } from './workshop'

export interface CommandResult { state:GameState; events:GameEvent[] }
export class InvalidCommandError extends Error {}

function sameCommand(left:GameCommand,right:GameCommand):boolean{
  if(left.type!==right.type||left.citizenId!==right.citizenId)return false
  if(left.type==='SEARCH_ZONE'&&right.type==='SEARCH_ZONE')return Boolean((left as ScavengerSearchCommand).replenishWithSpade)===Boolean((right as ScavengerSearchCommand).replenishWithSpade)
  if(left.type==='MOVE'&&right.type==='MOVE')return left.direction===right.direction
  if(left.type==='PICK_UP_ITEM'&&right.type==='PICK_UP_ITEM')return left.itemId===right.itemId
  if(left.type==='DROP_ITEM'&&right.type==='DROP_ITEM')return left.itemId===right.itemId
  if(left.type==='DRUG_TAMER_DOG'&&right.type==='DRUG_TAMER_DOG')return left.itemId===right.itemId
  if(left.type==='SEND_TAMER_DOG'&&right.type==='SEND_TAMER_DOG')return left.destination===right.destination
  if(left.type==='USE_WEAPON'&&right.type==='USE_WEAPON')return left.itemId===right.itemId
  if(left.type==='DEPOSIT_ITEM'&&right.type==='DEPOSIT_ITEM')return left.itemId===right.itemId
  if(left.type==='WITHDRAW_BANK_ITEM'&&right.type==='WITHDRAW_BANK_ITEM')return left.itemId===right.itemId
  if(left.type==='DUMP_BANK_ITEM'&&right.type==='DUMP_BANK_ITEM')return left.itemId===right.itemId
  if(left.type==='MOVE_ITEM_TO_HOME'&&right.type==='MOVE_ITEM_TO_HOME')return left.itemId===right.itemId
  if(left.type==='MOVE_ITEM_TO_RUCKSACK'&&right.type==='MOVE_ITEM_TO_RUCKSACK')return left.itemId===right.itemId
  if(left.type==='RETURN_WATER_TO_WELL'&&right.type==='RETURN_WATER_TO_WELL')return left.itemId===right.itemId
  if(left.type==='PURIFY_JERRYCAN'&&right.type==='PURIFY_JERRYCAN')return left.itemId===right.itemId
  if(left.type==='REFILL_WATER_ITEM'&&right.type==='REFILL_WATER_ITEM')return left.itemId===right.itemId
  if(left.type==='DEPOSIT_HOME_ITEM'&&right.type==='DEPOSIT_HOME_ITEM')return left.targetCitizenId===right.targetCitizenId&&left.itemId===right.itemId
  if(left.type==='INTRUDE_HOME'&&right.type==='INTRUDE_HOME')return left.targetCitizenId===right.targetCitizenId
  if(left.type==='STEAL_HOME_ITEM'&&right.type==='STEAL_HOME_ITEM')return left.targetCitizenId===right.targetCitizenId&&left.itemId===right.itemId
  if(left.type==='PILLAGE_HOME_ITEM'&&right.type==='PILLAGE_HOME_ITEM')return left.targetCitizenId===right.targetCitizenId&&left.itemId===right.itemId
  if(left.type==='OPEN_CONTAINER'&&right.type==='OPEN_CONTAINER')return left.itemId===right.itemId
  if(left.type==='READ_BLUEPRINT'&&right.type==='READ_BLUEPRINT')return left.itemId===right.itemId
  if(left.type==='EAT_ITEM'&&right.type==='EAT_ITEM')return left.itemId===right.itemId
  if(left.type==='DRINK_ITEM'&&right.type==='DRINK_ITEM')return left.itemId===right.itemId
  if(left.type==='USE_ITEM_ACTION'&&right.type==='USE_ITEM_ACTION')return left.itemId===right.itemId&&left.actionId===right.actionId
  if(left.type==='BUILD_HOME_IMPROVEMENT'&&right.type==='BUILD_HOME_IMPROVEMENT')return left.improvementId===right.improvementId
  if(left.type==='USE_HOME_KITCHEN'&&right.type==='USE_HOME_KITCHEN')return left.itemId===right.itemId
  if(left.type==='DISPOSE_CORPSE_OUTSIDE'&&right.type==='DISPOSE_CORPSE_OUTSIDE')return left.targetCitizenId===right.targetCitizenId
  if(left.type==='DISPOSE_CORPSE_WATER'&&right.type==='DISPOSE_CORPSE_WATER')return left.targetCitizenId===right.targetCitizenId
  if(left.type==='CONTRIBUTE_CONSTRUCTION'&&right.type==='CONTRIBUTE_CONSTRUCTION')return left.projectId===right.projectId
  if(left.type==='WORKSHOP_CONVERT'&&right.type==='WORKSHOP_CONVERT')return left.recipeId===right.recipeId
  if(left.type==='COMBINE_ITEMS'&&right.type==='COMBINE_ITEMS')return left.recipeId===right.recipeId&&left.itemIds.length===right.itemIds.length&&left.itemIds.every((id,index)=>id===right.itemIds[index])
  return true
}
function requireLegal(state:GameState,command:GameCommand):void{if(!getLegalActions(state,command.citizenId).some((candidate)=>sameCommand(candidate,command)))throw new InvalidCommandError(`Illegal ${command.type} action for ${command.citizenId}`)}
function itemAt(state:GameState,type:ItemType,offset=0):ItemInstance{return createItemInstance(`i${String(state.nextItemId+offset).padStart(6,'0')}`,type)}
function normalSearchItem(state:GameState,x:number,y:number):ItemInstance|null{const type=getZone(state.world,x,y)?.hiddenLoot[0];return type?itemAt(state,type):null}
function detectionOutcome(state:GameState,chancePercent:number):{spotted:boolean;rngStateAfter:number}{if(chancePercent>=100)return{spotted:true,rngStateAfter:state.rngState};const roll=randomInt(state.rngState,1,100);return{spotted:roll.value<=chancePercent,rngStateAfter:roll.state}}
function locateItem(state:GameState,citizenId:string,itemId:string):{item:ItemInstance;source:ItemStorage;zoneKey?:string}{const citizen=state.citizens.find((candidate)=>candidate.id===citizenId)!;const inventoryItem=citizen.inventory.find((item)=>item.id===itemId);if(inventoryItem)return{item:inventoryItem,source:'inventory'};const homeItem=citizen.home.storage.find((item)=>item.id===itemId);if(homeItem)return{item:homeItem,source:'home'};if(citizen.location.type==='world'){const key=zoneKey(citizen.location.x,citizen.location.y);const groundItem=state.world.zones[key]?.groundItems.find((item)=>item.id===itemId);if(groundItem)return{item:groundItem,source:'ground',zoneKey:key}}throw new InvalidCommandError(`Missing item ${itemId}`)}
function personalItem(state:GameState,citizenId:string,itemId:string):{item:ItemInstance;source:'inventory'|'home'}{const located=locateItem(state,citizenId,itemId);if(located.source==='ground')throw new InvalidCommandError('Town Well actions require a carried or home-stored item');return{item:located.item,source:located.source}}
function targetCitizen(state:GameState,citizenId:string):Citizen{const target=state.citizens.find((candidate)=>candidate.id===citizenId);if(!target)throw new InvalidCommandError(`Missing citizen ${citizenId}`);return target}
function targetHomeItem(state:GameState,citizenId:string,itemId:string):ItemInstance{const target=targetCitizen(state,citizenId);const item=target.home.storage.find((candidate)=>candidate.id===itemId);if(!item)throw new InvalidCommandError(`Missing home item ${itemId}`);return item}
function movementControlEvents(state:GameState,citizen:Citizen,target:{x:number;y:number}):GameEvent[]{if(citizen.location.type!=='world')return[];const events:GameEvent[]=[];const originKey=zoneKey(citizen.location.x,citizen.location.y);const beforeOrigin=zoneControl(state,citizen.location.x,citizen.location.y);const remaining=citizensInZone(state,citizen.location.x,citizen.location.y).filter((candidate)=>candidate.id!==citizen.id);const remainingControl=remaining.reduce((sum,candidate)=>sum+citizenControlPoints(candidate),0);if(!beforeOrigin.trapped&&remaining.length>0&&beforeOrigin.zombiePoints>remainingControl){events.push({type:'ZONE_CONTROL_LOST',day:state.day,zoneKey:originKey,causedByCitizenId:citizen.id,remainingCitizenIds:remaining.map((candidate)=>candidate.id)});for(const resident of remaining)events.push({type:'TEMPORARY_CONTROL_GRANTED',day:state.day,citizenId:resident.id,zoneKey:originKey})}const beforeTarget=zoneControl(state,target.x,target.y);if(beforeTarget.trapped&&beforeTarget.zombiePoints<=beforeTarget.humanPoints+citizenControlPoints(citizen))events.push({type:'ZONE_CONTROL_RESTORED',day:state.day,zoneKey:zoneKey(target.x,target.y),reason:'arrival'});return events}
function combatObservationEvents(state:GameState,citizen:Citizen,key:string,kills:number):GameEvent[]{if(citizen.location.type!=='world')return[];const before=zoneControl(state,citizen.location.x,citizen.location.y);const afterZombies=Math.max(0,before.zombies-kills);const events:GameEvent[]=[{type:'ZONE_OBSERVED',day:state.day,zoneKey:key,zombies:afterZombies,citizenId:citizen.id}];if(before.trapped&&afterZombies<=before.humanPoints)events.push({type:'ZONE_CONTROL_RESTORED',day:state.day,zoneKey:key,reason:'combat'});return events}

export function executeCommand(state:GameState,command:GameCommand):CommandResult{
  requireLegal(state,command)
  const citizen=state.citizens.find((candidate)=>candidate.id===command.citizenId)!
  const events:GameEvent[]=[]
  const exposure=scoutExposureEvent(state,citizen,command);if(exposure)events.push(exposure)
  switch(command.type){
    case 'OPEN_GATE':events.push({type:'AP_SPENT',day:state.day,citizenId:command.citizenId,amount:GATE_AP_COST},{type:'GATE_SET',day:state.day,open:true,citizenId:command.citizenId});break
    case 'CLOSE_GATE':events.push({type:'AP_SPENT',day:state.day,citizenId:command.citizenId,amount:GATE_AP_COST},{type:'GATE_SET',day:state.day,open:false,citizenId:command.citizenId});break
    case 'EXIT_TOWN':events.push({type:'CITIZEN_LOCATION_CHANGED',day:state.day,citizenId:command.citizenId,location:{type:'world',x:0,y:0}},{type:'ZONE_OBSERVED',day:state.day,zoneKey:'0,0',zombies:0,citizenId:command.citizenId});break
    case 'ENTER_TOWN':events.push({type:'CITIZEN_LOCATION_CHANGED',day:state.day,citizenId:command.citizenId,location:{type:'town'}});break
    case 'RECAMOUFLAGE':events.push({type:'SCOUT_CAMOUFLAGE_SET',day:state.day,citizenId:command.citizenId,active:true,reason:'recamouflaged'});break
    case 'MAP_WASTELAND':events.push(...mappingEvents(state,citizen));break
    case 'SURVIVALIST_SEARCH_FOOD':events.push(survivalistForageEvent(state,citizen,'food'));break
    case 'SURVIVALIST_SEARCH_WATER':events.push(survivalistForageEvent(state,citizen,'water'));break
    case 'MOVE':{
      if(citizen.location.type!=='world')throw new InvalidCommandError('Citizen is not outside')
      const target=moveCoordinates(citizen.location.x,citizen.location.y,command.direction);const key=zoneKey(target.x,target.y);const targetZone=getZone(state.world,target.x,target.y);if(!targetZone)throw new InvalidCommandError('Target zone does not exist')
      events.push(movementPointEvent(state,citizen))
      let arrivalRngState=state.rngState
      if(citizen.status.wound==='leg'){
        const roll=randomInt(state.rngState,1,100);arrivalRngState=roll.state;const failed=roll.value<=LEG_WOUND_MOVE_FAILURE_PERCENT
        events.push({type:'WOUNDED_MOVEMENT_RESOLVED',day:state.day,citizenId:command.citizenId,failed,rngStateAfter:roll.state})
        if(failed)break
      }
      events.push({type:'CITIZEN_LOCATION_CHANGED',day:state.day,citizenId:command.citizenId,location:{type:'world',x:target.x,y:target.y},desertStep:true},{type:'ZONE_DISCOVERED',day:state.day,zoneKey:key},{type:'ZONE_OBSERVED',day:state.day,zoneKey:key,zombies:targetZone.zombies,citizenId:command.citizenId},...movementControlEvents(state,citizen,target),...scoutArrivalEvents({...state,rngState:arrivalRngState},citizen,targetZone))
      const transition=travelHydrationTransition(citizen);if(transition)events.push({type:'CITIZEN_STATUS_CHANGED',day:state.day,citizenId:command.citizenId,status:transition,reason:'desert_travel'});break
    }
    case 'SEARCH_ZONE':{
      if(citizen.location.type!=='world')throw new InvalidCommandError('Citizen is not outside')
      const key=zoneKey(citizen.location.x,citizen.location.y)
      if(isSpadeReplenishCommand(command)){events.push(spadeReplenishmentEvent(state,command.citizenId,key));break}
      const zone=state.world.zones[key];const mode:SearchMode=zone.searchesRemaining>0?'normal':'depleted'
      events.push({type:'ZONE_SEARCHED',day:state.day,zoneKey:key,citizenId:command.citizenId,mode,item:mode==='normal'?normalSearchItem(state,citizen.location.x,citizen.location.y):null});break
    }
    case 'EXCAVATE_SPECIAL_SITE':{if(citizen.location.type!=='world')throw new InvalidCommandError('Citizen is not outside');const key=zoneKey(citizen.location.x,citizen.location.y);events.push({type:'AP_SPENT',day:state.day,citizenId:command.citizenId,amount:SPECIAL_EXCAVATION_AP_COST},{type:'SPECIAL_SITE_EXCAVATED',day:state.day,zoneKey:key,citizenId:command.citizenId,amount:SPECIAL_EXCAVATION_AP_COST});break}
    case 'SEARCH_SPECIAL_SITE':{
      if(citizen.location.type!=='world')throw new InvalidCommandError('Citizen is not outside')
      const key=zoneKey(citizen.location.x,citizen.location.y);const site=state.world.zones[key].specialSite;const type=site?.hiddenLoot[0]
      let item=type?itemAt(state,type):null
      const ruinId=site?normalizeRuinId(site.type):null;const family=ruinId?RUIN_CATALOG[ruinId].family:null;const tier=type?explorableBlueprintTierFromType(type):null
      if(item&&family&&tier)item={...item,state:{...item.state,blueprintFamily:family,blueprintTier:tier}}
      events.push({type:'SPECIAL_SITE_SEARCHED',day:state.day,zoneKey:key,citizenId:command.citizenId,item});break
    }
    case 'PICK_UP_ITEM':{if(citizen.location.type!=='world')throw new InvalidCommandError('Citizen is not outside');const key=zoneKey(citizen.location.x,citizen.location.y);const item=state.world.zones[key].groundItems.find((candidate)=>candidate.id===command.itemId)!;events.push({type:'ITEM_PICKED_UP',day:state.day,citizenId:command.citizenId,zoneKey:key,item});break}
    case 'DROP_ITEM':{if(citizen.location.type!=='world')throw new InvalidCommandError('Citizen is not outside');const key=zoneKey(citizen.location.x,citizen.location.y);const item=citizen.inventory.find((candidate)=>candidate.id===command.itemId);if(!item)throw new InvalidCommandError(`Missing carried item ${command.itemId}`);events.push({type:'ITEM_DROPPED',day:state.day,citizenId:command.citizenId,zoneKey:key,item});break}
    case 'DRUG_TAMER_DOG':{const item=citizen.inventory.find((candidate)=>candidate.id===command.itemId&&candidate.type==='anabolic_steroids');if(!item)throw new InvalidCommandError('Anabolic Steroids are required for the Three-Legged Maltese');events.push({type:'TAMER_DOG_DRUGGED',day:state.day,citizenId:command.citizenId,item});break}
    case 'SEND_TAMER_DOG':{const items=tamerDogTransportableItems(state,citizen);events.push({type:'TAMER_DOG_SENT',day:state.day,citizenId:command.citizenId,destination:command.destination,items});break}
    case 'ATTACK_BAREHANDED':{if(citizen.location.type!=='world')throw new InvalidCommandError('Citizen is not outside');const key=zoneKey(citizen.location.x,citizen.location.y);const outcome=resolveBarehandedAttack(state);events.push({type:'AP_SPENT',day:state.day,citizenId:command.citizenId,amount:BAREHANDED_AP_COST},{type:'COMBAT_RESOLVED',day:state.day,citizenId:command.citizenId,zoneKey:key,method:'fists',kills:outcome.kills,item:null,consumed:false,rngStateAfter:outcome.rngStateAfter},...combatObservationEvents(state,citizen,key,outcome.kills));break}
    case 'USE_WEAPON':{if(citizen.location.type!=='world')throw new InvalidCommandError('Citizen is not outside');const key=zoneKey(citizen.location.x,citizen.location.y);const zone=state.world.zones[key];const located=locateItem(state,command.citizenId,command.itemId);const outcome=resolveWeaponAttack(state,located.item,zone.zombies);events.push({type:'COMBAT_RESOLVED',day:state.day,citizenId:command.citizenId,zoneKey:key,method:located.item.type,item:located.item,source:located.source,kills:outcome.kills,consumed:outcome.consumed,brokenInto:outcome.brokenInto,chargesAfter:outcome.chargesAfter,rngStateAfter:outcome.rngStateAfter},...combatObservationEvents(state,citizen,key,outcome.kills));break}
    case 'FLEE_ZOMBIES':{if(citizen.location.type!=='world')throw new InvalidCommandError('Citizen is not outside');const key=zoneKey(citizen.location.x,citizen.location.y);const outcome=resolveCitizenEffects(citizen,WORLD_STATUS_ACTIONS.flee_zombies.effects,state.rngState);events.push({type:'FLEE_ZOMBIES_RESOLVED',day:state.day,citizenId:command.citizenId,zoneKey:key,statusAfter:outcome.status,rngStateAfter:outcome.rng});break}
    case 'IMPROVE_CAMP':{if(citizen.location.type!=='world')throw new InvalidCommandError('Citizen is not outside');const key=zoneKey(citizen.location.x,citizen.location.y);events.push({type:'AP_SPENT',day:state.day,citizenId:command.citizenId,amount:CAMP_IMPROVEMENT_AP_COST},{type:'CAMP_IMPROVED',day:state.day,citizenId:command.citizenId,zoneKey:key,amount:1});break}
    case 'DIG_CAMPING_GRAVE':{const breakdown=campingChanceBreakdown(state,command.citizenId,{grave:true});events.push({type:'AP_SPENT',day:state.day,citizenId:command.citizenId,amount:CAMPING_GRAVE_AP_COST},{type:'CITIZEN_HIDING_SET',day:state.day,citizenId:command.citizenId,hidden:true,grave:true,survivalChance:breakdown.final,breakdown});break}
    case 'HIDE_FOR_NIGHT':{const breakdown=campingChanceBreakdown(state,command.citizenId,{grave:false});events.push({type:'CITIZEN_HIDING_SET',day:state.day,citizenId:command.citizenId,hidden:true,grave:false,survivalChance:breakdown.final,breakdown});break}
    case 'LEAVE_HIDEOUT':events.push({type:'CITIZEN_HIDING_SET',day:state.day,citizenId:command.citizenId,hidden:false,grave:false,survivalChance:null,breakdown:null});break
    case 'DEPOSIT_ITEM':{const item=citizen.inventory.find((candidate)=>candidate.id===command.itemId)!;events.push({type:'ITEM_DEPOSITED',day:state.day,citizenId:command.citizenId,item});break}
    case 'WITHDRAW_BANK_ITEM':{const item=state.town.bank.find((candidate)=>candidate.id===command.itemId);if(!item)throw new InvalidCommandError(`Missing Bank item ${command.itemId}`);events.push({type:'ITEM_WITHDRAWN',day:state.day,citizenId:command.citizenId,item});break}
    case 'DUMP_BANK_ITEM':{const cost=garbageDumpActionCost(state);if(cost>0)events.push({type:'AP_SPENT',day:state.day,citizenId:command.citizenId,amount:cost});events.push(resolveGarbageDump(state,citizen,command.itemId));break}
    case 'MOVE_ITEM_TO_HOME':{const item=citizen.inventory.find((candidate)=>candidate.id===command.itemId)!;events.push({type:'ITEM_MOVED_TO_HOME',day:state.day,citizenId:command.citizenId,item});break}
    case 'MOVE_ITEM_TO_RUCKSACK':{const item=citizen.home.storage.find((candidate)=>candidate.id===command.itemId)!;events.push({type:'ITEM_MOVED_TO_RUCKSACK',day:state.day,citizenId:command.citizenId,item});break}
    case 'DEPOSIT_HOME_ITEM':{const item=citizen.inventory.find((candidate)=>candidate.id===command.itemId);if(!item)throw new InvalidCommandError(`Missing carried item ${command.itemId}`);targetCitizen(state,command.targetCitizenId);const detected=detectionOutcome(state,10);events.push({type:'HOME_ITEM_DEPOSITED',day:state.day,citizenId:command.citizenId,targetCitizenId:command.targetCitizenId,item,spotted:detected.spotted,rngStateAfter:detected.rngStateAfter});break}
    case 'INTRUDE_HOME':{const target=targetCitizen(state,command.targetCitizenId);const success=!homePreventsTheft(target);events.push({type:'HOME_INTRUSION_ATTEMPTED',day:state.day,citizenId:command.citizenId,targetCitizenId:command.targetCitizenId,success,alarmed:homeHasAlarm(target)});break}
    case 'STEAL_HOME_ITEM':{const target=targetCitizen(state,command.targetCitizenId);const item=targetHomeItem(state,command.targetCitizenId,command.itemId);const detected=detectionOutcome(state,homeHasAlarm(target)?100:50);events.push({type:'HOME_ITEM_STOLEN',day:state.day,citizenId:command.citizenId,targetCitizenId:command.targetCitizenId,item,spotted:detected.spotted,rngStateAfter:detected.rngStateAfter});break}
    case 'PILLAGE_HOME_ITEM':{const item=targetHomeItem(state,command.targetCitizenId,command.itemId);events.push({type:'HOME_ITEM_PILLAGED',day:state.day,citizenId:command.citizenId,targetCitizenId:command.targetCitizenId,item,spotted:true});break}
    case 'OPEN_CONTAINER':{
      const located=locateItem(state,command.citizenId,command.itemId)
      const openable=openableDefinition(located.item.type)
      if(openable){
        const resolution=resolveOpenable(state,located.item)
        if((openable.apCost??0)>0)events.push({type:'AP_SPENT',day:state.day,citizenId:command.citizenId,amount:openable.apCost??0})
        events.push({type:'OPENABLE_RESOLVED',day:state.day,citizenId:command.citizenId,container:located.item,source:located.source,zoneKey:located.zoneKey,success:resolution.success,outputs:resolution.outputs,containerAfter:resolution.containerAfter,rngStateAfter:resolution.rngStateAfter})
        break
      }
      const pool=containerPool(located.item.type);if(!pool?.length)throw new InvalidCommandError(`${located.item.type} is not an openable container`);const roll=randomInt(state.rngState,0,pool.length-1);events.push({type:'CONTAINER_OPENED',day:state.day,citizenId:command.citizenId,containerId:located.item.id,containerType:located.item.type,source:located.source,zoneKey:located.zoneKey,output:itemAt(state,pool[roll.value]),rngStateAfter:roll.state});break
    }
    case 'READ_BLUEPRINT':{
      const located=locateItem(state,command.citizenId,command.itemId)
      if(located.source==='ground')throw new InvalidCommandError('Blueprints must be carried into town before they can be read')
      const tier=located.item.type==='common_blueprint'?1:located.item.type==='uncommon_blueprint'?2:located.item.type==='rare_blueprint'?3:located.item.type==='very_rare_blueprint'?4:null
      if(tier===null)throw new InvalidCommandError(`${located.item.type} is not a construction blueprint`)
      const family=located.item.state?.blueprintFamily;const specializedTier=located.item.state?.blueprintTier
      const candidates=family&&specializedTier?explorableBlueprintEligibleProjects(state,family,specializedTier):blueprintEligibleProjects(state,tier)
      const roll=candidates.length>0?randomInt(state.rngState,0,candidates.length-1):null
      const projectId=roll?candidates[roll.value]:null
      const rngStateAfter=roll?.state??state.rngState
      events.push({type:'BLUEPRINT_READ',day:state.day,citizenId:command.citizenId,item:located.item,source:located.source,projectId,rngStateAfter})
      if(projectId)events.push({type:'CONSTRUCTION_DISCOVERED',day:state.day,projectId,reason:'blueprint'})
      break
    }
    case 'TAKE_WATER':events.push({type:'WATER_TAKEN',day:state.day,citizenId:command.citizenId,item:itemAt(state,'water_ration'),extra:citizen.daily.waterTaken});break
    case 'RETURN_WATER_TO_WELL':{const located=personalItem(state,command.citizenId,command.itemId);events.push({type:'WATER_RETURNED',day:state.day,citizenId:command.citizenId,item:located.item,source:located.source});break}
    case 'PURIFY_JERRYCAN':{const located=personalItem(state,command.citizenId,command.itemId);if(located.item.type!=='full_jerrycan')throw new InvalidCommandError('A Full Jerrycan is required');const yieldResult=purifierYield(state);events.push({type:'WATER_PURIFIED',day:state.day,citizenId:command.citizenId,item:located.item,source:located.source,amount:yieldResult.amount,filtered:yieldResult.filtered,rngStateAfter:yieldResult.rngStateAfter});break}
    case 'REFILL_WATER_ITEM':{const located=personalItem(state,command.citizenId,command.itemId);const refill=refillableWaterItem(located.item);if(!refill)throw new InvalidCommandError('This item cannot be refilled at the Faucet');events.push({type:'WATER_ITEM_REFILLED',day:state.day,citizenId:command.citizenId,item:located.item,source:located.source,chargesAfter:refill.maxCharges});break}
    case 'EAT_ITEM':{const located=locateItem(state,command.citizenId,command.itemId);const outcome=resolveFoodItemAction(citizen,located.item,state.rngState);events.push({type:'ITEM_CONSUMED',day:state.day,citizenId:command.citizenId,item:located.item,source:located.source,zoneKey:located.zoneKey,kind:'food',restoresAp:outcome.restoresAp,apAfter:outcome.apAfter,statusAfter:outcome.statusAfter,dailyAfter:outcome.dailyAfter,rngStateAfter:outcome.rngStateAfter});break}
    case 'DRINK_ITEM':{const located=locateItem(state,command.citizenId,command.itemId);const outcome=resolveWaterItemAction(citizen,located.item,state.rngState);const charges=located.item.type==='water_cooler_bottle'?(normalizeItemState(located.item.type,located.item.state).charges??0):undefined;events.push({type:'ITEM_CONSUMED',day:state.day,citizenId:command.citizenId,item:located.item,source:located.source,zoneKey:located.zoneKey,kind:'water',restoresAp:outcome.restoresAp,chargesAfter:charges===undefined?undefined:Math.max(0,charges-1),apAfter:outcome.apAfter,statusAfter:outcome.statusAfter,dailyAfter:outcome.dailyAfter,rngStateAfter:outcome.rngStateAfter});break}
    case 'USE_ITEM_ACTION':{const located=locateItem(state,command.citizenId,command.itemId);const definition=itemUseActionDefinition(located.item.type,command.actionId);if(!definition)throw new InvalidCommandError(`${located.item.type} has no ${command.actionId} action`);const outcome=resolveItemUseAction(citizen,definition,state.rngState);events.push({type:'ITEM_ACTION_RESOLVED',day:state.day,citizenId:command.citizenId,actionId:definition.id,item:located.item,source:located.source,zoneKey:located.zoneKey,consumed:outcome.consumed,morphTo:outcome.morphTo,apAfter:outcome.apAfter,statusAfter:outcome.statusAfter,dailyAfter:outcome.dailyAfter,rngStateAfter:outcome.rngStateAfter});break}
    case 'DISPOSE_CORPSE_OUTSIDE':events.push({type:'AP_SPENT',day:state.day,citizenId:command.citizenId,amount:2},{type:'CORPSE_DISPOSED',day:state.day,citizenId:command.citizenId,targetCitizenId:command.targetCitizenId,method:'dragged_out'});break
    case 'DISPOSE_CORPSE_WATER':{const water=[...citizen.inventory,...citizen.home.storage].find((item)=>item.type==='water_ration');if(!water)throw new InvalidCommandError('A Water Ration is required to dispose of the corpse');events.push({type:'CORPSE_DISPOSED',day:state.day,citizenId:command.citizenId,targetCitizenId:command.targetCitizenId,method:'watered',waterItemId:water.id});break}
    case 'UPGRADE_HOME':{const target=nextHomeDefinition(citizen.home.level);if(!target)throw new InvalidCommandError('No home upgrade is currently available');events.push({type:'AP_SPENT',day:state.day,citizenId:command.citizenId,amount:target.apCost},{type:'HOME_UPGRADED',day:state.day,citizenId:command.citizenId,from:citizen.home.level,to:target.level,defenseAfter:target.defense,consumed:target.resources});break}
    case 'BUILD_HOME_IMPROVEMENT':{const nextLevel=improvementNextLevel(citizen,command.improvementId);if(nextLevel===null)throw new InvalidCommandError('Home improvement is already complete');const definition=HOME_IMPROVEMENTS[command.improvementId];const defenseAfter=citizen.home.defense+homeImprovementDefense(citizen)+definition.defensePerLevel;const storageCapacityAfter=citizen.home.storageCapacity+definition.storagePerLevel;events.push({type:'AP_SPENT',day:state.day,citizenId:command.citizenId,amount:definition.apCost(nextLevel)},{type:'HOME_IMPROVEMENT_BUILT',day:state.day,citizenId:command.citizenId,improvementId:command.improvementId,level:nextLevel,consumed:definition.resources(nextLevel),defenseAfter,storageCapacityAfter});break}
    case 'USE_HOME_SIESTA':{const chance=siestaChancePercent(citizen);const roll=randomInt(state.rngState,1,100);const success=roll.value<=chance;events.push({type:'HOME_SIESTA_USED',day:state.day,citizenId:command.citizenId,chance,roll:roll.value,success,apAfter:success?citizen.ap+2:citizen.ap,rngStateAfter:roll.state});break}
    case 'USE_HOME_KITCHEN':events.push(resolveKitchenUse(state,citizen,command.itemId));break
    case 'USE_HOME_LAB':events.push(resolveHomeLabUse(state,citizen));break
    case 'CONTRIBUTE_CONSTRUCTION':{const definition=CONSTRUCTIONS[command.projectId];const project=state.town.construction[command.projectId];const amount=Math.min(CONSTRUCTION_AP_COST,definition.apCost-project.apContributed);events.push({type:'AP_SPENT',day:state.day,citizenId:command.citizenId,amount},{type:'CONSTRUCTION_AP_CONTRIBUTED',day:state.day,citizenId:command.citizenId,projectId:command.projectId,amount});if(project.apContributed+amount>=definition.apCost)events.push({type:'CONSTRUCTION_COMPLETED',day:state.day,citizenId:command.citizenId,projectId:command.projectId,consumed:definition.resources,defenseBonus:0});break}
    case 'WORKSHOP_CONVERT':{const recipe=WORKSHOP_RECIPES[command.recipeId];const inputItemIds=workshopRecipeInputItemIds(state,command.recipeId);const outcome=resolveWorkshopRecipeOutput(state.rngState,command.recipeId);events.push({type:'AP_SPENT',day:state.day,citizenId:command.citizenId,amount:workshopRecipeApCost(state,command.recipeId,command.citizenId)},{type:'WORKSHOP_CONVERTED',day:state.day,citizenId:command.citizenId,recipeId:command.recipeId,input:recipe.input,inputCount:recipe.inputCount,inputItemIds,output:outcome.output,outputCount:outcome.outputCount,outputState:outcome.outputState,preserveInputId:outcome.preserveInputId,rngStateAfter:outcome.rngStateAfter});break}
    case 'COMBINE_ITEMS':{const recipe=COMBINATION_RECIPES[command.recipeId];const resolved=resolveCombination(state,citizen,command.recipeId,command.itemIds);if(recipe.apCost>0)events.push({type:'AP_SPENT',day:state.day,citizenId:command.citizenId,amount:recipe.apCost});events.push({type:'ITEMS_COMBINED',day:state.day,citizenId:command.citizenId,recipeId:command.recipeId,consumedItemIds:resolved.consumedItemIds,outputs:resolved.outputs,createdCount:resolved.createdCount});break}
  }
  const stampedEvents:GameEvent[]=events.map((event)=>({...event,hour:state.clock.hour}))
  return{state:applyEvents(state,stampedEvents),events:stampedEvents}
}