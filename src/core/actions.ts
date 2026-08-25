import { bankCount } from './bank'
import { CAMP_IMPROVEMENT_AP_COST, canImproveCamp } from './camping'
import { BAREHANDED_AP_COST, isWeapon, weaponDefinition } from './combat'
import { combinationCommandsForCitizen } from './combinations'
import { BUILDABLE_CONSTRUCTION_IDS, CONSTRUCTIONS, constructionUnlocked, gateLockedAtHour, wellDailyWithdrawals } from './construction'
import { HOME_IMPROVEMENTS, canBuildImprovementSource, foreignHomeStorageVisible, hasPersonalMaterials, homeImprovementLevel, homeLevelSourceReady, homePreventsTheft, homeTransferUsedToday, improvementNextLevel, nextHomeDefinition, siestaUsedToday } from './home'
import { itemUseActionAvailable, itemUseActionsForType } from './itemEffects'
import { consumableKind, containerPool, isContainer, itemHasCapability, normalizeItemState } from './items'
import { canToolOpen, openableDefinition } from './openables'
import { RUIN_CATALOG } from './ruinCatalog'
import { canReplenishWithSpade, type ScavengerSearchCommand } from './scavenging'
import { normalizeRuinId } from './specialSites'
import { canContributeConstructionByStatus, canFightBarehandedByStatus, canOperateGateByStatus, canUseWeaponByStatus, hasHandWound } from './status'
import type { Citizen, ConstructionId, GameCommand, GameState, HomeImprovementId, ItemInstance, ItemStorage } from './types'
import { canCitizenMoveFromZone, getZone, isTownGateZone, moveCoordinates, relativeControlActive, temporaryControlActive, zoneControl } from './world'
import { WORKSHOP_RECIPES, WORKSHOP_RECIPE_ORDER, canRunWorkshopRecipe, workshopRecipeApCost } from './workshop'

export const GATE_AP_COST=1
export const MOVE_AP_COST=1
export const CONSTRUCTION_AP_COST=1
export const SPECIAL_EXCAVATION_AP_COST=1

function constructionFrontier(state:GameState):ConstructionId[]{return BUILDABLE_CONSTRUCTION_IDS.filter((id)=>{const project=state.town.construction[id];return Boolean(project?.discovered&&!project.completed&&constructionUnlocked(state,id))})}
function hasProjectMaterials(state:GameState,projectId:ConstructionId):boolean{return Object.entries(CONSTRUCTIONS[projectId].resources).every(([type,required])=>bankCount(state,type as Parameters<typeof bankCount>[1])>=(required??0))}
function availableOpeners(citizen:Citizen):ItemInstance[]{return citizen.location.type==='town'?[...citizen.inventory,...citizen.home.storage]:citizen.inventory}
function terrorBlocksOrdinaryItems(state:GameState,citizen:Citizen):boolean{return citizen.status.terrorized&&citizen.location.type==='world'&&zoneControl(state,citizen.location.x,citizen.location.y).trapped}
function canOpenContainer(state:GameState,citizen:Citizen,item:ItemInstance,source:ItemStorage):boolean{
  if(hasHandWound(citizen)||terrorBlocksOrdinaryItems(state,citizen))return false
  const openable=openableDefinition(item.type)
  if(openable){
    if(openable.openableBy?.length&&!availableOpeners(citizen).some((tool)=>canToolOpen(openable,tool.type)))return false
    if((openable.apCost??0)>citizen.ap)return false
    if(openable.mode==='remaining_contents'&&(normalizeItemState(item.type,item.state).contents??1)>1){
      if(source==='inventory')return citizen.inventory.length<citizen.inventoryCapacity
      if(source==='home')return citizen.home.storage.length<citizen.home.storageCapacity
    }
    return true
  }
  return Boolean(containerPool(item.type)?.length)
}
function hasUsableCharges(item:ItemInstance):boolean{return !itemHasCapability(item.type,'charge_bearing')||(normalizeItemState(item.type,item.state).charges??0)>0}
function addConsumableActions(state:GameState,actions:GameCommand[],citizen:Citizen,items:ItemInstance[],source:ItemStorage):void{
  const terrorBlocked=terrorBlocksOrdinaryItems(state,citizen)
  for(const item of items){
    const kind=consumableKind(item.type)
    if(!terrorBlocked&&kind==='food'&&!citizen.daily.ate)actions.push({type:'EAT_ITEM',citizenId:citizen.id,itemId:item.id})
    if(!terrorBlocked&&kind==='water'&&hasUsableCharges(item)&&(!citizen.daily.drank||citizen.status.hydration!=='normal'))actions.push({type:'DRINK_ITEM',citizenId:citizen.id,itemId:item.id})
    if(isContainer(item.type)&&canOpenContainer(state,citizen,item,source))actions.push({type:'OPEN_CONTAINER',citizenId:citizen.id,itemId:item.id})
    for(const definition of itemUseActionsForType(item.type))if(itemUseActionAvailable(citizen,definition)&&(!terrorBlocked||definition.allowWhenTerrorized))actions.push({type:'USE_ITEM_ACTION',citizenId:citizen.id,itemId:item.id,actionId:definition.id})
  }
}

function addForeignHomeActions(state:GameState,actions:GameCommand[],citizen:Citizen):void{
  const hasRucksackSpace=citizen.inventory.length<citizen.inventoryCapacity
  const transferAvailable=!homeTransferUsedToday(state,citizen.id)
  for(const target of state.citizens){
    if(target.id===citizen.id)continue
    if(target.alive){
      if(target.location.type!=='world'||homePreventsTheft(target))continue
      if(transferAvailable&&target.home.storage.length<target.home.storageCapacity){for(const item of citizen.inventory)actions.push({type:'DEPOSIT_HOME_ITEM',citizenId:citizen.id,targetCitizenId:target.id,itemId:item.id})}
      const visible=foreignHomeStorageVisible(state,citizen.id,target)
      if(!visible){actions.push({type:'INTRUDE_HOME',citizenId:citizen.id,targetCitizenId:target.id});continue}
      if(transferAvailable&&hasRucksackSpace)for(const item of target.home.storage)actions.push({type:'STEAL_HOME_ITEM',citizenId:citizen.id,targetCitizenId:target.id,itemId:item.id})
      continue
    }
    if(transferAvailable&&hasRucksackSpace)for(const item of target.home.storage)actions.push({type:'PILLAGE_HOME_ITEM',citizenId:citizen.id,targetCitizenId:target.id,itemId:item.id})
  }
}

export function getLegalActions(state:GameState,citizenId:string):GameCommand[]{
  const citizen=state.citizens.find((candidate)=>candidate.id===citizenId)
  if(!citizen||!citizen.alive||state.clock.phase!=='day')return[]
  if(citizen.camping.hidden)return[{type:'LEAVE_HIDEOUT',citizenId}]
  const actions:GameCommand[]=[]
  addConsumableActions(state,actions,citizen,citizen.inventory,'inventory')
  if(!terrorBlocksOrdinaryItems(state,citizen)){const combinations=combinationCommandsForCitizen(state,citizen);actions.push(...combinations.filter((action)=>!hasHandWound(citizen)||action.recipeId==='load_ems_battery'))}

  if(citizen.location.type==='town'){
    addConsumableActions(state,actions,citizen,citizen.home.storage,'home')
    for(const item of [...citizen.inventory,...citizen.home.storage])if(itemHasCapability(item.type,'blueprint'))actions.push({type:'READ_BLUEPRINT',citizenId,itemId:item.id})
    for(const item of citizen.inventory){actions.push({type:'DEPOSIT_ITEM',citizenId,itemId:item.id});if(citizen.home.storage.length<citizen.home.storageCapacity)actions.push({type:'MOVE_ITEM_TO_HOME',citizenId,itemId:item.id})}
    if(citizen.inventory.length<citizen.inventoryCapacity){for(const item of citizen.home.storage)actions.push({type:'MOVE_ITEM_TO_RUCKSACK',citizenId,itemId:item.id});for(const item of state.town.bank)actions.push({type:'WITHDRAW_BANK_ITEM',citizenId,itemId:item.id});const waterTaken=Number(citizen.daily.waterTaken)+Number(Boolean(citizen.daily.bonusWaterTaken));if(waterTaken<wellDailyWithdrawals(state)&&state.town.well.water>0)actions.push({type:'TAKE_WATER',citizenId})}
    addForeignHomeActions(state,actions,citizen)
    const corpses=state.citizens.filter((target)=>target.id!==citizen.id&&!target.alive&&target.home.holdsBody)
    for(const corpse of corpses){
      if(citizen.ap>=2)actions.push({type:'DISPOSE_CORPSE_OUTSIDE',citizenId,targetCitizenId:corpse.id})
      if([...citizen.inventory,...citizen.home.storage].some((item)=>item.type==='water_ration'))actions.push({type:'DISPOSE_CORPSE_WATER',citizenId,targetCitizenId:corpse.id})
    }
    const nextHome=nextHomeDefinition(citizen.home.level)
    if(nextHome&&homeLevelSourceReady(nextHome)&&citizen.home.upgradedDay!==state.day&&citizen.ap>=nextHome.apCost&&hasPersonalMaterials(citizen,nextHome.resources))actions.push({type:'UPGRADE_HOME',citizenId})
    if(citizen.home.level!=='camp_bed'){
      for(const improvementId of Object.keys(HOME_IMPROVEMENTS) as HomeImprovementId[]){
        const nextLevel=improvementNextLevel(citizen,improvementId);if(nextLevel===null)continue
        const definition=HOME_IMPROVEMENTS[improvementId]
        if(canBuildImprovementSource(definition,nextLevel)&&citizen.ap>=definition.apCost(nextLevel)&&hasPersonalMaterials(citizen,definition.resources(nextLevel)))actions.push({type:'BUILD_HOME_IMPROVEMENT',citizenId,improvementId})
      }
      if(homeImprovementLevel(citizen,'siesta')>0&&citizen.ap<citizen.maxAp&&!siestaUsedToday(state,citizen.id))actions.push({type:'USE_HOME_SIESTA',citizenId})
    }
    if(citizen.ap>=CONSTRUCTION_AP_COST&&canContributeConstructionByStatus(citizen)){for(const projectId of constructionFrontier(state))if(hasProjectMaterials(state,projectId))actions.push({type:'CONTRIBUTE_CONSTRUCTION',citizenId,projectId})}
    if(state.town.construction.workshop.completed){for(const recipeId of WORKSHOP_RECIPE_ORDER)if((!hasHandWound(citizen)||WORKSHOP_RECIPES[recipeId].category!=='repair')&&citizen.ap>=workshopRecipeApCost(state,recipeId,citizen.id)&&canRunWorkshopRecipe(state,recipeId))actions.push({type:'WORKSHOP_CONVERT',citizenId,recipeId})}
    if(state.town.gateOpen){if(citizen.ap>=GATE_AP_COST&&canOperateGateByStatus(citizen))actions.push({type:'CLOSE_GATE',citizenId});actions.push({type:'EXIT_TOWN',citizenId})}else if(citizen.ap>=GATE_AP_COST&&canOperateGateByStatus(citizen)&&!gateLockedAtHour(state,state.clock.hour))actions.push({type:'OPEN_GATE',citizenId})
    return actions
  }

  const{x,y}=citizen.location;const zone=getZone(state.world,x,y);if(!zone)return actions
  addConsumableActions(state,actions,citizen,zone.groundItems,'ground')
  if(isTownGateZone(x,y)&&state.town.gateOpen)actions.push({type:'ENTER_TOWN',citizenId})
  const control=zoneControl(state,x,y)
  if(!isTownGateZone(x,y)){
    if(!control.trapped){
      if(zone.searchesRemaining>0&&!zone.searchedBy.includes(citizenId))actions.push({type:'SEARCH_ZONE',citizenId})
      else if(zone.searchesRemaining===0&&!(zone.depletedSearchedBy??[]).includes(citizenId))actions.push({type:'SEARCH_ZONE',citizenId})
      if(canReplenishWithSpade(state,citizen,zone))actions.push({type:'SEARCH_ZONE',citizenId,replenishWithSpade:true} as unknown as ScavengerSearchCommand)
    }
    if(citizen.ap>=CAMP_IMPROVEMENT_AP_COST&&canImproveCamp(zone))actions.push({type:'IMPROVE_CAMP',citizenId})
    actions.push({type:'HIDE_FOR_NIGHT',citizenId})
  }
  const site=zone.specialSite
  if(site&&!control.trapped){
    if(site.status==='buried'&&citizen.ap>=SPECIAL_EXCAVATION_AP_COST)actions.push({type:'EXCAVATE_SPECIAL_SITE',citizenId})
    const ruinId=normalizeRuinId(site.type);const explorable=RUIN_CATALOG[ruinId].explorable
    if(!explorable&&site.status==='accessible'&&site.hiddenLoot.length>0&&!site.searchedBy.includes(citizenId))actions.push({type:'SEARCH_SPECIAL_SITE',citizenId})
  }
  if(citizen.inventory.length<citizen.inventoryCapacity)for(const item of zone.groundItems)actions.push({type:'PICK_UP_ITEM',citizenId,itemId:item.id})
  for(const item of citizen.inventory)actions.push({type:'DROP_ITEM',citizenId,itemId:item.id})
  if(zone.zombies>0&&citizen.ap>0){const terrorBlocked=terrorBlocksOrdinaryItems(state,citizen);for(const item of [...citizen.inventory,...zone.groundItems]){const weapon=weaponDefinition(item.type);if(!terrorBlocked&&weapon&&isWeapon(item.type)&&canUseWeaponByStatus(citizen,item.type)&&hasUsableCharges(item)&&(!weapon.requiresPositiveAp||citizen.ap>0))actions.push({type:'USE_WEAPON',citizenId,itemId:item.id})}if(citizen.ap>=BAREHANDED_AP_COST&&canFightBarehandedByStatus(citizen))actions.push({type:'ATTACK_BAREHANDED',citizenId})}
  if(control.trapped&&!temporaryControlActive(state,citizenId)&&!relativeControlActive(state,citizenId)&&!citizen.status.wound&&!citizen.status.terrorized)actions.push({type:'FLEE_ZOMBIES',citizenId})
  if(canCitizenMoveFromZone(state,citizenId)&&citizen.ap>=MOVE_AP_COST&&!(citizen.status.terrorized&&control.trapped)){for(const direction of ['NORTH','SOUTH','EAST','WEST'] as const){const target=moveCoordinates(x,y,direction);if(getZone(state.world,target.x,target.y))actions.push({type:'MOVE',citizenId,direction})}}
  return actions
}