import { campingChancePercent } from '../../core/camping'
import type { BotMissionAssignment, BotMissionPhase, Citizen, GameEvent, GameState } from '../../core/types'
import { distanceToTown, isTownGateZone, zoneControl } from '../../core/world'
import { AI_TUNING } from '../AiTuning'
import { planMission } from './ExpeditionPlanner'
import { routeBetween } from './RoutePlanner'

export interface MissionSafety {
  usableAp: number
  returnAp: number
  requiredAp: number
  reserve: number
  margin: number
  solvent: boolean
}

function carriedRefillPotential(citizen: Citizen): number {
  let potential = 0
  if (!citizen.daily.drank
    && citizen.inventory.some((item) => item.type === 'water_ration')
    && citizen.status.hydration !== 'dehydrated') potential += citizen.maxAp
  if (!citizen.daily.ate && citizen.inventory.some((item) => item.type === 'food')) potential += citizen.maxAp
  return potential
}

export function missionForCitizen(state: GameState, citizenId: string): BotMissionAssignment | null {
  return state.botMissions[citizenId] ?? null
}

export function missionSafety(state: GameState, citizenId: string): MissionSafety {
  const citizen = state.citizens.find((candidate) => candidate.id === citizenId)
  const mission = missionForCitizen(state, citizenId)
  if (!citizen || citizen.location.type !== 'world') {
    return {
      usableAp: citizen?.ap ?? 0,
      returnAp: 0,
      requiredAp: 0,
      reserve: mission?.safetyReserve ?? 0,
      margin: citizen?.ap ?? 0,
      solvent: true,
    }
  }

  const route = routeBetween(state, { x: citizen.location.x, y: citizen.location.y }, { x: 0, y: 0 })
  const returnAp = route.length || distanceToTown(citizen.location.x, citizen.location.y)
  const reserve = mission?.safetyReserve ?? AI_TUNING.ordinarySafetyReserve
  const usableAp = citizen.ap + carriedRefillPotential(citizen)
  const requiredAp = returnAp + reserve
  return { usableAp, returnAp, requiredAp, reserve, margin: usableAp - requiredAp, solvent: usableAp >= requiredAp }
}

function atMissionTarget(citizen: Citizen, mission: BotMissionAssignment): boolean {
  return citizen.location.type === 'world'
    && citizen.location.x === mission.target.x
    && citizen.location.y === mission.target.y
}

function rescueComplete(state: GameState, rescuer: Citizen, mission: BotMissionAssignment): boolean {
  const protectedCitizen = state.citizens.find((candidate) =>
    candidate.id !== rescuer.id
    && candidate.alive
    && candidate.location.type === 'world'
    && candidate.location.x === mission.target.x
    && candidate.location.y === mission.target.y
    && state.botMissions[candidate.id]?.missionId !== mission.missionId)
  return !protectedCitizen
}

function operationComplete(state: GameState, citizen: Citizen, mission: BotMissionAssignment): boolean {
  const zone = state.world.zones[`${mission.target.x},${mission.target.y}`]
  if (!zone) return true
  if (mission.role === 'rescue') return rescueComplete(state, citizen, mission)
  if (mission.role === 'excavator') return !zone.specialSite || zone.specialSite.status !== 'buried'
  if (mission.role === 'combat') return zone.zombies <= zoneControl(state, mission.target.x, mission.target.y).humanPoints
  if (mission.role === 'scout') return zone.discovered && (zone.searchedBy.includes(citizen.id) || zone.searchesRemaining === 0)
  if (zone.specialSite && zone.specialSite.status !== 'buried') {
    return zone.specialSite.searchedBy.includes(citizen.id) || zone.specialSite.status === 'depleted'
  }
  return zone.searchesRemaining === 0
}

function phaseEvent(
  state: GameState,
  citizenId: string,
  mission: BotMissionAssignment,
  phase: BotMissionPhase,
): GameEvent {
  return {
    type: 'BOT_MISSION_PHASE_SET',
    day: state.day,
    hour: state.clock.hour,
    citizenId,
    missionId: mission.missionId,
    phase,
  }
}

function canPrepareCamp(state: GameState, citizen: Citizen, mission: BotMissionAssignment): boolean {
  if (!mission.allowsCamping
    || mission.overnightPlanned !== true
    || citizen.location.type !== 'world'
    || isTownGateZone(citizen.location.x, citizen.location.y)) return false

  // A ration that was already consumed this day still supplied the intended overnight
  // hydration. Requiring the physical item to remain carried would invalidate plans as
  // soon as a bot used that same ration to extend the outbound AP budget.
  if (!citizen.daily.drank && !citizen.inventory.some((item) => item.type === 'water_ration')) return false
  const current = campingChancePercent(state, citizen.id)
  const possibleWithPlannedImprovements = current
    + Math.min(AI_TUNING.campingPlanningImprovementBudget, citizen.ap) * 5
  return possibleWithPlannedImprovements >= AI_TUNING.campingViabilityTargetPercent
}

export function nextMissionLifecycleEvent(state: GameState, citizenId: string): GameEvent | null {
  const citizen = state.citizens.find((candidate) => candidate.id === citizenId)
  const mission = missionForCitizen(state, citizenId)
  if (!citizen || !mission) return null
  if (!citizen.alive) {
    return {
      type: 'BOT_MISSION_CLEARED',
      day: state.day,
      hour: state.clock.hour,
      citizenId,
      missionId: mission.missionId,
      outcome: 'aborted',
    }
  }
  if (mission.phase === 'camp') return null

  if (mission.phase === 'prepare') {
    if (citizen.location.type === 'world') return phaseEvent(state, citizenId, mission, 'outbound')
    if (state.clock.hour >= mission.returnByHour) {
      return {
        type: 'BOT_MISSION_CLEARED',
        day: state.day,
        hour: state.clock.hour,
        citizenId,
        missionId: mission.missionId,
        outcome: 'aborted',
      }
    }
    return null
  }

  const plan = planMission(state, citizenId, mission)
  const plannedCamp = Boolean(
    mission.overnightPlanned === true
    && plan?.campingPlanned
    && canPrepareCamp(state, citizen, mission),
  )

  if (citizen.location.type === 'world' && mission.phase !== 'return') {
    const safety = missionSafety(state, citizenId)
    if (state.clock.hour >= mission.returnByHour) {
      if (plannedCamp) return phaseEvent(state, citizenId, mission, 'camp')
      return phaseEvent(state, citizenId, mission, 'return')
    }
    if (citizen.inventory.length >= citizen.inventoryCapacity && !plannedCamp) {
      return phaseEvent(state, citizenId, mission, 'return')
    }
    if (!mission.emergency && safety.usableAp <= safety.requiredAp && !plannedCamp) {
      return phaseEvent(state, citizenId, mission, 'return')
    }
  }

  if (mission.phase === 'outbound' && atMissionTarget(citizen, mission)) {
    return phaseEvent(state, citizenId, mission, 'operate')
  }
  if (mission.phase === 'operate' && operationComplete(state, citizen, mission)) {
    if (plannedCamp) {
      if (state.clock.hour >= 18) return phaseEvent(state, citizenId, mission, 'camp')
      return null
    }
    return phaseEvent(state, citizenId, mission, 'return')
  }
  if (mission.phase === 'return' && citizen.location.type === 'town') {
    return phaseEvent(state, citizenId, mission, 'unload')
  }
  return null
}

export function missionCompleteAtTown(state: GameState, citizenId: string): GameEvent | null {
  const citizen = state.citizens.find((candidate) => candidate.id === citizenId)
  const mission = missionForCitizen(state, citizenId)
  if (!citizen || !mission || mission.phase !== 'unload' || citizen.location.type !== 'town') return null
  return {
    type: 'BOT_MISSION_CLEARED',
    day: state.day,
    hour: state.clock.hour,
    citizenId,
    missionId: mission.missionId,
    outcome: 'completed',
  }
}
