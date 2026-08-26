import { randomInt } from './rng'
import type { ConstructionId, GameState, ItemInstance } from './types'

export const WATER_TURRET_DEFENSE_TOTALS=Object.freeze([70,126,182,238,294,350] as const)
export const WATER_TURRET_NIGHTLY_REQUIREMENTS=Object.freeze([0,2,4,6,9,12] as const)
export const WATER_PURIFIER_BASE_MIN=1
export const WATER_PURIFIER_BASE_MAX=3
export const WATER_FILTER_MIN=4
export const WATER_FILTER_MAX=9

export interface WaterConsumerRequest{
  projectId:ConstructionId
  required:number
  priority:number
  defenseBonus:number
  label:string
}
export interface WaterConsumerAllocation extends WaterConsumerRequest{active:boolean}
export interface TownWaterAllocation{available:number;required:number;consumed:number;remaining:number;consumers:WaterConsumerAllocation[]}

function upgradeLevel(state:GameState,projectId:ConstructionId):number{
  const town=state.town as GameState['town']&{upgradeProjects?:{levels?:Partial<Record<ConstructionId,number>>}}
  return Math.max(0,town.upgradeProjects?.levels?.[projectId]??0)
}

export function waterTurretLevel(state:GameState):number{return Math.min(5,upgradeLevel(state,'water_turrets'))}
export function waterTurretNightlyRequirement(state:GameState):number{
  if(!state.town.construction.water_turrets?.completed)return 0
  return WATER_TURRET_NIGHTLY_REQUIREMENTS[waterTurretLevel(state)]??0
}
export function waterTurretTotalDefense(state:GameState):number{
  if(!state.town.construction.water_turrets?.completed)return 0
  return WATER_TURRET_DEFENSE_TOTALS[waterTurretLevel(state)]??70
}

/**
 * MyHordes treats Well consumers as all-or-nothing. Consumers are ordered before water is
 * assigned; a consumer whose complete requirement cannot be paid remains inactive and uses 0.
 * Water Turrets are the directly verified defensive consumer. Pool is retained as a dormant,
 * lower-priority consumer hook because its exact current requirement fixture was not exposed in
 * this source pass; the Pool itself remains WIP and is not activated by this PR.
 */
export function poolNightlyRequirement(state:GameState):number{
  if(!state.town.construction.pool?.completed)return 0
  return Math.min(5,Math.max(1,Math.ceil(state.day/5)))
}

export function waterConsumerRequests(state:GameState):WaterConsumerRequest[]{
  const requests:WaterConsumerRequest[]=[]
  const turretRequired=waterTurretNightlyRequirement(state)
  if(turretRequired>0){
    requests.push({
      projectId:'water_turrets',
      required:turretRequired,
      priority:10,
      defenseBonus:Math.max(0,waterTurretTotalDefense(state)-70),
      label:'Water Turrets',
    })
  }
  const poolRequired=poolNightlyRequirement(state)
  if(poolRequired>0)requests.push({projectId:'pool',required:poolRequired,priority:50,defenseBonus:0,label:'Pool'})
  return requests.sort((left,right)=>left.priority-right.priority||right.defenseBonus-left.defenseBonus||left.required-right.required)
}

export function townWaterAllocation(state:GameState):TownWaterAllocation{
  const available=Math.max(0,state.town.well.water)
  let remaining=available
  const consumers=waterConsumerRequests(state).map((request):WaterConsumerAllocation=>{
    const active=request.required<=remaining
    if(active)remaining-=request.required
    return{...request,active}
  })
  return{
    available,
    required:consumers.reduce((sum,consumer)=>sum+consumer.required,0),
    consumed:available-remaining,
    remaining,
    consumers,
  }
}

export function waterConsumerActive(state:GameState,projectId:ConstructionId):boolean{
  const request=waterConsumerRequests(state).find((consumer)=>consumer.projectId===projectId)
  return request?townWaterAllocation(state).consumers.find((consumer)=>consumer.projectId===projectId)?.active===true:true
}

export function waterTurretUpgradeDefenseBonus(state:GameState):number{
  if(!state.town.construction.water_turrets?.completed)return 0
  const bonus=Math.max(0,waterTurretTotalDefense(state)-70)
  return waterConsumerActive(state,'water_turrets')?bonus:0
}

export function purifierYield(state:GameState):{amount:number;rngStateAfter:number;filtered:boolean}{
  const filtered=state.town.construction.water_filter?.completed===true
  const min=filtered?WATER_FILTER_MIN:WATER_PURIFIER_BASE_MIN
  const max=filtered?WATER_FILTER_MAX:WATER_PURIFIER_BASE_MAX
  const roll=randomInt(state.rngState,min,max)
  return{amount:roll.value,rngStateAfter:roll.state,filtered}
}

export function refillableWaterItem(item:ItemInstance):{maxCharges:number}|null{
  if(item.type==='water_pistol'||item.type==='water_cooler_bottle')return{maxCharges:3}
  return null
}
