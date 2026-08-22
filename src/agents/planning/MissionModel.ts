import type { BotMissionAssignment, BotMissionPurpose, BotMissionRole, GameState } from '../../core/types'

export function missionLabel(role: BotMissionRole): string {
  return role.replaceAll('_',' ').toUpperCase()
}

export function missionPurposeLabel(purpose: BotMissionPurpose): string {
  return purpose.replaceAll('_',' ').toUpperCase()
}

export function missionAssignment(state: GameState, citizenId: string): BotMissionAssignment | null {
  return state.botMissions[citizenId] ?? null
}
