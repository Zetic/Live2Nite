import type { BotMissionAssignment, Citizen, GameState } from '../../core/types'
import { distanceToTown } from '../../core/world'
import { knownZombieCount } from '../WorldKnowledge'
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
  const route = routeBetween(state, from, mission.target,citizenId)
  const expectedTaskAp = taskCost(state, mission)
  const returnAp = distanceToTown(mission.target.x, mission.target.y)
  const gateCost = citizen.location.type === 'town' && !state.town.gateOpen ? 1 : 0
  const roundTripRequiredAp = route.length + returnAp + expectedTaskAp + gateCost + mission.safetyReserve

  // Unknown frontier zones are budgeted as a modest four-zombie risk. Known values and
  // Scout estimates both come through the citizen-aware WorldKnowledge projection, never
  // directly from authoritative hidden zombie state.
  const targetZombies = knownZombieCount(state, mission.target.x, mission.target.y,citizenId) ?? 4
  const roundTripLoadout = planLoadout(state, citizen, mission.purpose, roundTripRequiredAp, targetZombies, {
    desertStepsPlanned: route.length + returnAp,
  })
  const roundTripFeasible = roundTripLoadout.potentialAp >= roundTripRequiredAp && roundTripLoadout.hydrationReady
  const overnightRequiredAp = route.length + expectedTaskAp + gateCost + mission.safetyReserve
  const overnightLoadout = mission.allowsCamping
    ? planLoadout(state, citizen, mission.purpose, overnightRequiredAp, targetZombies, { overnight: true, desertStepsPlanned: route.length })
    : roundTripLoadout

  // Water already consumed today still counts as overnight hydration security only when
  // the planned outbound travel does not create a new hydration requirement. Longer
  // routes must actually carry another ration.
  const overnightWaterReady = overnightLoadout.hydrationReady && (overnightLoadout.water || citizen.daily.drank)
  const overnightFeasible = Boolean(
    mission.allowsCamping
    && overnightWaterReady
    && overnightLoadout.potentialAp >= overnightRequiredAp,
  )

  // A provisional mission (overnightPlanned undefined) chooses its intent once. After
  // dispatch, TownMissionPlanner persists that decision so a same-day mission cannot
  // become a camping mission merely because it later overspent or met unexpected risk.
  const campingPlanned = mission.overnightPlanned === true
    ? overnightFeasible
    : mission.overnightPlanned === false
      ? false
      : !roundTripFeasible && overnightFeasible
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
  return routeBetween(state, { x: citizen.location.x, y: citizen.location.y }, { x: 0, y: 0 },citizenId).length
    || distanceToTown(citizen.location.x, citizen.location.y)
}
