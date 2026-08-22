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
  roundTripRequiredAp: number
  returnAp: number
  expectedTaskAp: number
  targetZombies: number
  loadout: ExpeditionLoadout
  feasible: boolean
  campingPlanned: boolean
  plannedReturnHour: number
  waterPolicy: ReturnType<typeof waterPolicyForState>
  supplyDisposition: ReturnType<typeof supplyDispositionForCitizen>
}

function citizenCoord(citizen: Citizen): Coord {
  return citizen.location.type === 'world' ? { x: citizen.location.x, y: citizen.location.y } : { x: 0, y: 0 }
}

function taskCost(state: GameState, mission: BotMissionAssignment): number {
  const zone = state.world.zones[`${mission.target.x},${mission.target.y}`]
  if (mission.role === 'excavator' && zone?.specialSite?.status === 'buried') {
    return Math.min(3, Math.max(1, zone.specialSite.excavationRequired - zone.specialSite.excavationProgress))
  }
  return 0
}

export function planMission(state: GameState, citizenId: string, mission: BotMissionAssignment): ExpeditionPlan | null {
  const citizen = state.citizens.find((candidate) => candidate.id === citizenId)
  if (!citizen || !citizen.alive || state.clock.phase !== 'day') return null
  const from = citizenCoord(citizen)
  const route = routeBetween(state, from, mission.target)
  const zone = state.world.zones[`${mission.target.x},${mission.target.y}`]
  const expectedTaskAp = taskCost(state, mission)
  const returnAp = distanceToTown(mission.target.x, mission.target.y)
  const gateCost = citizen.location.type === 'town' && !state.town.gateOpen ? 1 : 0
  const roundTripRequiredAp = route.length + returnAp + expectedTaskAp + gateCost + mission.safetyReserve
  // Unknown frontier zones are budgeted as a modest four-zombie risk. The bot still
  // learns the real count only after discovery, but scout teams can justify a cheap
  // field weapon instead of pretending an unknown destination is automatically safe.
  const targetZombies = zone?.discovered ? zone.zombies : 4
  const roundTripLoadout = planLoadout(state, citizen, mission.purpose, roundTripRequiredAp, targetZombies)
  const roundTripFeasible = roundTripLoadout.potentialAp >= roundTripRequiredAp
  const overnightRequiredAp = route.length + expectedTaskAp + gateCost + mission.safetyReserve
  const overnightLoadout = mission.allowsCamping ? planLoadout(state,citizen,mission.purpose,overnightRequiredAp,targetZombies,{overnight:true}) : roundTripLoadout
  // Deliberate camping is only selected when a same-day round trip is not feasible.
  // Bots must also be able to provision water before committing to an overnight trip;
  // camping is never used as an excuse for an already-broken return plan.
  const overnightFeasible = Boolean(mission.allowsCamping && overnightLoadout.water && overnightLoadout.potentialAp >= overnightRequiredAp)
  const campingPlanned = !roundTripFeasible && overnightFeasible
  const loadout = campingPlanned ? overnightLoadout : roundTripLoadout
  const requiredAp = campingPlanned ? overnightRequiredAp : roundTripRequiredAp
  return {
    purpose: mission.purpose,
    target: mission.target,
    targetLabel: mission.targetLabel,
    reason: mission.reason,
    route,
    requiredAp,
    roundTripRequiredAp,
    returnAp,
    expectedTaskAp,
    targetZombies,
    loadout,
    feasible: campingPlanned ? overnightFeasible : roundTripFeasible,
    campingPlanned,
    plannedReturnHour: mission.returnByHour,
    waterPolicy: waterPolicyForState(state),
    supplyDisposition: supplyDispositionForCitizen(citizenId),
  }
}

export function planExpedition(state: GameState, citizenId: string): ExpeditionPlan | null {
  const mission = state.botMissions[citizenId]
  return mission ? planMission(state, citizenId, mission) : null
}

export function remainingReturnRequirement(state: GameState, citizenId: string): number {
  const citizen = state.citizens.find((candidate) => candidate.id === citizenId)
  if (!citizen || citizen.location.type !== 'world') return 0
  return routeBetween(state, { x: citizen.location.x, y: citizen.location.y }, { x: 0, y: 0 }).length || distanceToTown(citizen.location.x,citizen.location.y)
}
