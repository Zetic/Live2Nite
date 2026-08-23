import { getLegalActions } from '../../core/actions'
import type { BotMissionAssignment, Citizen, GameEvent, GameState } from '../../core/types'
import { distanceToTown } from '../../core/world'
import { AI_TUNING } from '../AiTuning'
import { chooseTownWork } from '../townWork'
import { planMission } from './ExpeditionPlanner'
import type { MissionOpportunity } from './MissionOpportunities'

export const DEDICATED_RESCUE_RESERVE = AI_TUNING.dedicatedRescueReserve

function citizenNumber(citizenId: string): number {
  return Number(citizenId.slice(1)) || 0
}

function returnByHour(citizenId: string): number {
  return AI_TUNING.returnHourBase + (citizenNumber(citizenId) % AI_TUNING.returnHourSpread)
}

export function dedicatedRescueCitizenIds(state: GameState): string[] {
  return state.citizens
    .filter((citizen) => citizen.alive && citizen.controller === 'basic-bot')
    .sort((a, b) => citizenNumber(b.id) - citizenNumber(a.id))
    .slice(0, DEDICATED_RESCUE_RESERVE)
    .map((citizen) => citizen.id)
}

export function nightGateReserveCitizenId(state: GameState): string | null {
  return dedicatedRescueCitizenIds(state)[0] ?? null
}

export function isDedicatedRescueReserve(state: GameState, citizenId: string): boolean {
  return dedicatedRescueCitizenIds(state).includes(citizenId)
}

export function minimumTownReserve(state: GameState): number {
  const livingBots = state.citizens.filter((citizen) => citizen.alive && citizen.controller === 'basic-bot').length
  return Math.max(DEDICATED_RESCUE_RESERVE, Math.ceil(livingBots * AI_TUNING.minimumTownReserveFraction))
}

export function activeMissionCount(state: GameState): number {
  return Object.values(state.botMissions).filter((mission) => mission.phase !== 'unload').length
}

export function existingForMission(state: GameState, missionId: string): number {
  return Object.values(state.botMissions).filter((mission) => mission.missionId === missionId).length
}

export function makeAssignment(
  state: GameState,
  citizen: Citizen,
  opportunity: MissionOpportunity,
): BotMissionAssignment {
  return {
    missionId: opportunity.missionId,
    role: opportunity.role,
    purpose: opportunity.purpose,
    target: opportunity.target,
    targetLabel: opportunity.targetLabel,
    reason: opportunity.reason,
    phase: 'prepare',
    assignedDay: state.day,
    assignedHour: state.clock.hour,
    returnByHour: returnByHour(citizen.id),
    safetyReserve: opportunity.safetyReserve,
    emergency: opportunity.emergency,
    allowsCamping: !opportunity.emergency
      && distanceToTown(opportunity.target.x, opportunity.target.y) >= AI_TUNING.campingEligibilityDistance,
  }
}

export function acceptedAssignment(
  state: GameState,
  citizen: Citizen,
  mission: BotMissionAssignment,
  opportunity: MissionOpportunity,
): BotMissionAssignment | null {
  const plan = planMission(state, citizen.id, mission)
  if (!plan) return null
  if (opportunity.emergency) {
    return plan.route.length <= plan.loadout.potentialAp
      ? { ...mission, overnightPlanned: false }
      : null
  }
  if (!plan.feasible) return null
  return { ...mission, overnightPlanned: plan.campingPlanned }
}

export function allTownCandidates(state: GameState, controlledCitizenId?: string): Citizen[] {
  const offset = state.day * 7 + state.clock.hour * 3
  return state.citizens
    .filter((citizen) =>
      citizen.alive
      && citizen.controller === 'basic-bot'
      && citizen.location.type === 'town'
      && citizen.id !== controlledCitizenId
      && !state.botMissions[citizen.id])
    .sort((a, b) => ((citizenNumber(a.id) + offset) % 100) - ((citizenNumber(b.id) + offset) % 100))
}

function hasImmediateTownWork(state: GameState, citizen: Citizen): boolean {
  return Boolean(chooseTownWork(state, citizen, getLegalActions(state, citizen.id)))
}

export function normalCandidates(state: GameState, controlledCitizenId?: string): Citizen[] {
  const dedicated = new Set(dedicatedRescueCitizenIds(state))
  return allTownCandidates(state, controlledCitizenId)
    .filter((citizen) => !dedicated.has(citizen.id) && !hasImmediateTownWork(state, citizen))
}

export function assignmentEvent(state: GameState, citizen: Citizen, mission: BotMissionAssignment): GameEvent {
  return {
    type: 'BOT_MISSION_ASSIGNED',
    day: state.day,
    hour: state.clock.hour,
    citizenId: citizen.id,
    mission,
  }
}
