import type { BotMissionAssignment, Citizen, GameState } from '../../core/types'
import { distanceToTown } from '../../core/world'
import { routeBetween, type Coord } from './RoutePlanner'
import { planLoadout, supplyDispositionForCitizen, waterPolicyForState, type ExpeditionLoadout, type ExpeditionPurpose } from './SupplyPolicy'

export interface ExpeditionPlan {
  purpose: ExpeditionPurpose
  target: Coord
  targetLabel: string
  reason: string
  route: ReturnType<typeof routeBetween>
  requiredAp: number
  returnAp: number
  expectedTaskAp: number
  targetZombies: number
  loadout: ExpeditionLoadout
  feasible: boolean
  plannedReturnHour: number
  waterPolicy: ReturnType<typeof waterPolicyForState>
  supplyDisposition: ReturnType<typeof supplyDispositionForCitizen>
}

function citizenCoord(citizen:Citizen):Coord{return citizen.location.type==='world'?{x:citizen.location.x,y:citizen.location.y}:{x:0,y:0}}
function taskCost(state:GameState,mission:BotMissionAssignment):number{const zone=state.world.zones[`${mission.target.x},${mission.target.y}`];if(mission.role==='excavator'&&zone?.specialSite?.status==='buried')return Math.min(3,Math.max(1,zone.specialSite.excavationRequired-zone.specialSite.excavationProgress));return 0}

export function planMission(state:GameState,citizenId:string,mission:BotMissionAssignment):ExpeditionPlan|null{
  const citizen=state.citizens.find((candidate)=>candidate.id===citizenId);if(!citizen||!citizen.alive||state.clock.phase!=='day')return null
  const from=citizenCoord(citizen);const route=routeBetween(state,from,mission.target);const zone=state.world.zones[`${mission.target.x},${mission.target.y}`]
  const expectedTaskAp=taskCost(state,mission);const returnAp=distanceToTown(mission.target.x,mission.target.y);const gateCost=citizen.location.type==='town'&&!state.town.gateOpen?1:0
  const requiredAp=route.length+returnAp+expectedTaskAp+gateCost+mission.safetyReserve
  const targetZombies=zone?.discovered?zone.zombies:2;const loadout=planLoadout(state,citizen,mission.purpose,requiredAp,targetZombies)
  return{purpose:mission.purpose,target:mission.target,targetLabel:mission.targetLabel,reason:mission.reason,route,requiredAp,returnAp,expectedTaskAp,targetZombies,loadout,feasible:loadout.potentialAp>=requiredAp,plannedReturnHour:mission.returnByHour,waterPolicy:waterPolicyForState(state),supplyDisposition:supplyDispositionForCitizen(citizenId)}
}

export function planExpedition(state:GameState,citizenId:string):ExpeditionPlan|null{const mission=state.botMissions[citizenId];return mission?planMission(state,citizenId,mission):null}
export function remainingReturnRequirement(state:GameState,citizenId:string):number{const citizen=state.citizens.find((candidate)=>candidate.id===citizenId);if(!citizen||citizen.location.type!=='world')return 0;return routeBetween(state,{x:citizen.location.x,y:citizen.location.y},{x:0,y:0}).length||distanceToTown(citizen.location.x,citizen.location.y)}
