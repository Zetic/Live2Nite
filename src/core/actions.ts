import { CAMP_IMPROVEMENT_AP_COST, canImproveCamp } from './camping'
import { BAREHANDED_AP_COST, isWeapon, weaponDefinition } from './combat'
import { CONSTRUCTION_ORDER, CONSTRUCTIONS, gateLockedAtHour, wellDailyWithdrawals } from './construction'
import { HOME_IMPROVEMENTS, hasPersonalMaterials, improvementNextLevel, nextHomeDefinition } from './home'
import { consumableKind, isContainer } from './items'
import type { Citizen, ConstructionId, GameCommand, GameState, HomeImprovementId, ItemInstance, ItemStorage, ItemType } from './types'
import { canCitizenMoveFromZone, getZone, isTownGateZone, moveCoordinates, zoneControl } from './world'
import { WORKSHOP_RECIPE_ORDER, canRunWorkshopRecipe, workshopRecipeApCost } from './workshop'

export const GATE_AP_COST = 1
export const MOVE_AP_COST = 1
export const CONSTRUCTION_AP_COST = 1
export const SPECIAL_EXCAVATION_AP_COST = 1

const ROOT_CONSTRUCTIONS=CONSTRUCTION_ORDER.filter((id)=>CONSTRUCTIONS[id].prerequisites.length===0)
const CONSTRUCTION_CHILDREN=new Map<ConstructionId,ConstructionId[]>()
for(const id of CONSTRUCTION_ORDER){for(const prerequisite of CONSTRUCTIONS[id].prerequisites){const children=CONSTRUCTION_CHILDREN.get(prerequisite)??[];children.push(id);CONSTRUCTION_CHILDREN.set(prerequisite,children)}}

function constructionFrontier(state:GameState):ConstructionId[]{
  const frontier:ConstructionId[]=[]
  const queue=[...ROOT_CONSTRUCTIONS]
  const seen=new Set<ConstructionId>()
  while(queue.length){
    const id=queue.shift()!
    if(seen.has(id))continue
    seen.add(id)
    const project=state.town.construction[id]
    if(!project)continue
    if(!project.completed){frontier.push(id);continue}
    for(const child of CONSTRUCTION_CHILDREN.get(id)??[]){if(CONSTRUCTIONS[child].prerequisites.every((required)=>state.town.construction[required]?.completed))queue.push(child)}
  }
  return frontier
}
function hasProjectMaterials(state:GameState,projectId:ConstructionId):boolean{return Object.entries(CONSTRUCTIONS[projectId].resources).every(([type,required])=>(state.town.bank[type as ItemType]??0)>=(required??0))}
function canOpenContainer(citizen:Citizen,item:ItemInstance,source:ItemStorage):boolean{
  if(item.type!=='construction_kit')return true
  return source==='inventory'?citizen.inventory.length<citizen.inventoryCapacity:citizen.home.storage.length<citizen.home.storageCapacity
}
function addConsumableActions(actions: GameCommand[], citizen: Citizen, items: ItemInstance[],source:ItemStorage): void {
  for (const item of items) {
    const kind = consumableKind(item.type)
    if (kind === 'food' && !citizen.daily.ate) actions.push({ type: 'EAT_ITEM', citizenId: citizen.id, itemId: item.id })
    if (kind === 'water' && (!citizen.daily.drank || citizen.status.hydration !== 'normal')) actions.push({ type: 'DRINK_ITEM', citizenId: citizen.id, itemId: item.id })
    if (isContainer(item.type)&&canOpenContainer(citizen,item,source)) actions.push({ type: 'OPEN_CONTAINER', citizenId: citizen.id, itemId: item.id })
  }
}

export function getLegalActions(state: GameState, citizenId: string): GameCommand[] {
  const citizen = state.citizens.find((candidate) => candidate.id === citizenId)
  if (!citizen || !citizen.alive || state.clock.phase !== 'day') return []
  if (citizen.camping.hidden) return [{ type:'LEAVE_HIDEOUT', citizenId }]
  const actions: GameCommand[] = []
  addConsumableActions(actions, citizen, citizen.inventory,'inventory')

  if (citizen.location.type === 'town') {
    addConsumableActions(actions, citizen, citizen.home.storage,'home')
    for (const item of citizen.inventory) {
      actions.push({ type: 'DEPOSIT_ITEM', citizenId, itemId: item.id })
      if (citizen.home.storage.length < citizen.home.storageCapacity) actions.push({ type: 'MOVE_ITEM_TO_HOME', citizenId, itemId: item.id })
    }
    if (citizen.inventory.length < citizen.inventoryCapacity) {
      for (const item of citizen.home.storage) actions.push({ type: 'MOVE_ITEM_TO_RUCKSACK', citizenId, itemId: item.id })
      for (const [itemType, count] of Object.entries(state.town.bank)) if ((count ?? 0) > 0) actions.push({ type: 'WITHDRAW_BANK_ITEM', citizenId, itemType: itemType as ItemType })
      const waterTaken=Number(citizen.daily.waterTaken)+Number(Boolean(citizen.daily.bonusWaterTaken))
      if (waterTaken<wellDailyWithdrawals(state) && state.town.well.water > 0) actions.push({ type: 'TAKE_WATER', citizenId })
    }

    const nextHome=nextHomeDefinition(citizen.home.level)
    if(nextHome&&citizen.home.upgradedDay!==state.day&&citizen.ap>=nextHome.apCost&&hasPersonalMaterials(citizen,nextHome.resources))actions.push({type:'UPGRADE_HOME',citizenId})
    if(citizen.home.level!=='camp_bed'){
      for(const improvementId of Object.keys(HOME_IMPROVEMENTS) as HomeImprovementId[]){
        const nextLevel=improvementNextLevel(citizen,improvementId)
        if(nextLevel===null)continue
        const definition=HOME_IMPROVEMENTS[improvementId]
        if(citizen.ap>=definition.apCost(nextLevel)&&hasPersonalMaterials(citizen,definition.resources(nextLevel)))actions.push({type:'BUILD_HOME_IMPROVEMENT',citizenId,improvementId})
      }
    }

    if (citizen.ap >= CONSTRUCTION_AP_COST) {
      for (const projectId of constructionFrontier(state)) if(hasProjectMaterials(state,projectId))actions.push({ type: 'CONTRIBUTE_CONSTRUCTION', citizenId, projectId })
    }
    if (state.town.construction.workshop.completed) {
      for (const recipeId of WORKSHOP_RECIPE_ORDER) {
        if (citizen.ap >= workshopRecipeApCost(state,recipeId) && canRunWorkshopRecipe(state, recipeId)) actions.push({ type: 'WORKSHOP_CONVERT', citizenId, recipeId })
      }
    }
    if (state.town.gateOpen) {
      if (citizen.ap >= GATE_AP_COST) actions.push({ type: 'CLOSE_GATE', citizenId })
      actions.push({ type: 'EXIT_TOWN', citizenId })
    } else if (citizen.ap >= GATE_AP_COST && !gateLockedAtHour(state,state.clock.hour)) actions.push({ type: 'OPEN_GATE', citizenId })
    return actions
  }

  const { x, y } = citizen.location
  const zone = getZone(state.world, x, y)
  if (!zone) return actions
  if (isTownGateZone(x, y) && state.town.gateOpen) actions.push({ type: 'ENTER_TOWN', citizenId })

  const control = zoneControl(state, x, y)
  if (!isTownGateZone(x, y)) {
    if (!control.trapped) {
      if (zone.searchesRemaining > 0 && !zone.searchedBy.includes(citizenId)) actions.push({ type: 'SEARCH_ZONE', citizenId })
      else if (zone.searchesRemaining === 0 && !(zone.depletedSearchedBy ?? []).includes(citizenId)) actions.push({ type: 'SEARCH_ZONE', citizenId })
    }
    if(citizen.ap>=CAMP_IMPROVEMENT_AP_COST&&canImproveCamp(zone))actions.push({type:'IMPROVE_CAMP',citizenId})
    actions.push({type:'HIDE_FOR_NIGHT',citizenId})
  }

  const site = zone.specialSite
  if (site && !control.trapped) {
    if (site.status === 'buried' && citizen.ap >= SPECIAL_EXCAVATION_AP_COST) actions.push({ type: 'EXCAVATE_SPECIAL_SITE', citizenId })
    if (site.status === 'accessible' && site.hiddenLoot.length > 0 && !site.searchedBy.includes(citizenId)) actions.push({ type: 'SEARCH_SPECIAL_SITE', citizenId })
  }

  if (citizen.inventory.length < citizen.inventoryCapacity) for (const item of zone.groundItems) actions.push({ type: 'PICK_UP_ITEM', citizenId, itemId: item.id })
  for (const item of citizen.inventory) actions.push({ type: 'DROP_ITEM', citizenId, itemId: item.id })
  if (zone.zombies > 0 && citizen.ap > 0) {
    for (const item of citizen.inventory) {
      const weapon = weaponDefinition(item.type)
      if (weapon && isWeapon(item.type) && (!weapon.requiresPositiveAp || citizen.ap > 0)) actions.push({ type: 'USE_WEAPON', citizenId, itemId: item.id })
    }
    if (citizen.ap >= BAREHANDED_AP_COST) actions.push({ type: 'ATTACK_BAREHANDED', citizenId })
  }
  if (canCitizenMoveFromZone(state,citizenId) && citizen.ap >= MOVE_AP_COST) {
    for (const direction of ['NORTH', 'SOUTH', 'EAST', 'WEST'] as const) {
      const target = moveCoordinates(x, y, direction)
      if (getZone(state.world, target.x, target.y)) actions.push({ type: 'MOVE', citizenId, direction })
    }
  }
  return actions
}