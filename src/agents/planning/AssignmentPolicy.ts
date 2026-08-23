import type { BotMissionAssignment, Citizen, GameEvent, GameState } from '../../core/types'
import { distanceToTown } from '../../core/world'
import { citizenNumber } from '../AgentIdentity'
import { AI_TUNING } from '../AiTuning'
import { commitmentForCitizen, gatePrimaryCitizenId } from '../coordination/TownCoordination'
import { planMission } from './ExpeditionPlanner'
import type { MissionOpportunity } from './MissionOpportunities'

// Retained as a compatibility export for diagnostics/tests. Fixed rescue citizens are no
// longer selected; emergency responders volunteer from currently available town citizens.
export const DEDICATED_RESCUE_RESERVE = 0

export function dedicatedRescueCitizenIds(_state: GameState): string[] {
  return []
}

export function nightGateReserveCitizenId(state: GameState): string | null {
  return gatePrimaryCitizenId(state)
}

export function isDedicatedRescueReserve(_state: GameState, _citizenId: string): boolean {
  return false
}

function preferredReturnByHour(citizenId: string): number {
  return AI_TUNING.returnHourBase + (citizenNumber(citizenId) % AI_TUNING.returnHourSpread)
}

function assignmentReturnByHour(state:GameState,citizenId:string):number{
  // A citizen who independently volunteers late cannot obey a personal 18:00 preference
  // that has already passed. Give the proposed mission at least one hour, but never plan an
  // ordinary return later than 22:00 so the gate/attack window still has a full buffer.
  return Math.min(22,Math.max(preferredReturnByHour(citizenId),state.clock.hour+1))
}

export function minimumTownReserve(state: GameState): number {
  const livingBots = state.citizens.filter((citizen) => citizen.alive && citizen.controller === 'basic-bot').length
  return Math.max(2, Math.ceil(livingBots * AI_TUNING.minimumTownReserveFraction))
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
    returnByHour: assignmentReturnByHour(state,citizen.id),
    safetyReserve: opportunity.safetyReserve,
    emergency: opportunity.emergency,
    searchMode: opportunity.searchMode,
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
    const extractionRequired=plan.route.length+plan.returnAp+mission.safetyReserve
    return plan.loadout.potentialAp>=extractionRequired
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

export function normalCandidates(state: GameState, controlledCitizenId?: string): Citizen[] {
  return allTownCandidates(state, controlledCitizenId)
    // Thirsty is a treatable expedition condition, not a reason to lose the whole day.
    // The expedition planner can reserve/carry water and the citizen consumes it after
    // spending current AP. Dehydrated remains excluded until immediate treatment occurs.
    .filter((citizen) => !commitmentForCitizen(state, citizen.id) && citizen.status.hydration !== 'dehydrated')
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
