import { getLegalActions } from '../../core/actions'
import { CONSTRUCTIONS, gateAutoCloseAtHour } from '../../core/construction'
import type { Citizen, ConstructionId, CoordinationCommitment, GameEvent, GameState } from '../../core/types'
import { citizenNumber } from '../AgentIdentity'
import { publicDefenseAssessment, rankStrategicConstruction, type DefensePressure } from '../planning/TownDefenseStrategy'

export const GATE_PRIMARY_TASK = 'gate:primary'
export const GATE_BACKUP_TASK = 'gate:backup'

function aliveTownBot(state: GameState, citizenId: string): Citizen | null {
  const citizen = state.citizens.find((candidate) => candidate.id === citizenId)
  return citizen?.alive && citizen.controller === 'basic-bot' && citizen.location.type === 'town' ? citizen : null
}

export function activeCoordinationCommitments(state: GameState): CoordinationCommitment[] {
  return state.coordination.commitments.filter((commitment) =>
    commitment.day === state.day
    && commitment.expiresHour >= state.clock.hour
    && Boolean(aliveTownBot(state, commitment.citizenId)))
}

export function commitmentForCitizen(state: GameState, citizenId: string): CoordinationCommitment | null {
  return activeCoordinationCommitments(state).find((commitment) => commitment.citizenId === citizenId) ?? null
}

export function gatePrimaryCitizenId(state: GameState): string | null {
  return activeCoordinationCommitments(state).find((commitment) => commitment.kind === 'gate_primary')?.citizenId ?? null
}

export function gateBackupCitizenId(state: GameState): string | null {
  return activeCoordinationCommitments(state).find((commitment) => commitment.kind === 'gate_backup')?.citizenId ?? null
}

export function isGateVolunteer(state: GameState, citizenId: string): boolean {
  const commitment = commitmentForCitizen(state, citizenId)
  return commitment?.kind === 'gate_primary' || commitment?.kind === 'gate_backup'
}

export function reservedApForCitizen(state: GameState, citizenId: string): number {
  return commitmentForCitizen(state, citizenId)?.reservedAp ?? 0
}

export function committedConstructionProject(state: GameState, citizenId: string): ConstructionId | null {
  const commitment = commitmentForCitizen(state, citizenId)
  if (commitment?.kind !== 'construction' || !commitment.projectId) return null
  return commitment.projectId
}

export function constructionVolunteerCount(state: GameState, projectId: ConstructionId): number {
  return activeCoordinationCommitments(state)
    .filter((commitment) => commitment.kind === 'construction' && commitment.projectId === projectId)
    .length
}

function automaticGateCoverage(state: GameState): boolean {
  return gateAutoCloseAtHour(state, 23)
}

function commitmentId(state: GameState, citizenId: string, taskKey: string): string {
  return `d${state.day}:h${state.clock.hour}:${citizenId}:${taskKey}`
}

function post(
  state: GameState,
  citizen: Citizen,
  kind: CoordinationCommitment['kind'],
  taskKey: string,
  label: string,
  reservedAp: number,
  expiresHour: number,
  projectId?: ConstructionId,
): GameEvent {
  return {
    type: 'COORDINATION_COMMITMENT_POSTED',
    day: state.day,
    hour: state.clock.hour,
    commitment: {
      id: commitmentId(state, citizen.id, taskKey),
      citizenId: citizen.id,
      kind,
      taskKey,
      label,
      reservedAp,
      day: state.day,
      hour: state.clock.hour,
      expiresHour,
      projectId,
    },
  }
}

function constructionProjectsAvailableTo(state: GameState, citizenId: string): ConstructionId[] {
  return getLegalActions(state, citizenId)
    .filter((action): action is Extract<ReturnType<typeof getLegalActions>[number], { type: 'CONTRIBUTE_CONSTRUCTION' }> => action.type === 'CONTRIBUTE_CONSTRUCTION')
    .map((action) => action.projectId)
}

function desiredConstructionVolunteers(state: GameState, projectId: ConstructionId, pressure: DefensePressure): number {
  const definition = CONSTRUCTIONS[projectId]
  const project = state.town.construction[projectId]
  const remainingLabor = Math.max(0, definition.apCost - (project?.apContributed ?? 0))
  const base = pressure === 'critical' ? 10 : pressure === 'shortfall' ? 8 : state.clock.hour >= 18 ? 6 : 4
  return Math.max(1, Math.min(base, remainingLabor))
}

function volunteerOrder(state: GameState, controlledCitizenId?: string): Citizen[] {
  const offset = state.day * 11 + state.clock.hour * 5
  return state.citizens
    .filter((citizen) => citizen.alive
      && citizen.controller === 'basic-bot'
      && citizen.location.type === 'town'
      && citizen.id !== controlledCitizenId
      && !state.botMissions[citizen.id])
    .sort((a, b) => ((citizenNumber(a.id) + offset) % 97) - ((citizenNumber(b.id) + offset) % 97))
}

/**
 * Deterministic forum-like communication pass. There is deliberately no master AP pool:
 * each citizen sees public town state plus commitments already posted by earlier citizens
 * in the pass and independently volunteers while a public need remains uncovered.
 */
export function planTownCoordination(state: GameState, controlledCitizenId?: string): GameEvent[] {
  if (state.clock.phase !== 'day') return []
  const events: GameEvent[] = []
  const active = activeCoordinationCommitments(state)
  const retained = new Set(active.map((commitment) => commitment.id))

  for (const commitment of state.coordination.commitments) {
    if (!retained.has(commitment.id)) {
      events.push({ type: 'COORDINATION_COMMITMENT_CLEARED', day: state.day, hour: state.clock.hour, commitmentId: commitment.id, reason: 'expired' })
    }
  }

  const working = [...active]
  const candidates = volunteerOrder(state, controlledCitizenId)
  const hasCommitment = (citizenId: string) => working.some((commitment) => commitment.citizenId === citizenId)
  const assessment = publicDefenseAssessment(state)

  // Construction legality is public town state and is identical for ordinary town citizens
  // with AP remaining. Rank the current frontier once instead of rescoring it for every bot.
  const constructionCandidate = candidates.find((citizen) => citizen.ap > 0)
  const rankedProjects = constructionCandidate
    ? rankStrategicConstruction(state, constructionProjectsAvailableTo(state, constructionCandidate.id), assessment)
    : []
  const projectId = rankedProjects[0] ?? null

  if (!automaticGateCoverage(state)) {
    if (!working.some((commitment) => commitment.kind === 'gate_primary')) {
      const citizen = candidates.find((candidate) => !hasCommitment(candidate.id) && candidate.ap >= 1)
      if (citizen) {
        const event = post(state, citizen, 'gate_primary', GATE_PRIMARY_TASK, 'I will keep 1 AP to close the gate tonight.', 1, 23)
        events.push(event)
        if (event.type === 'COORDINATION_COMMITMENT_POSTED') working.push(event.commitment)
      }
    }
    if (!working.some((commitment) => commitment.kind === 'gate_backup')) {
      const citizen = candidates.find((candidate) => !hasCommitment(candidate.id) && candidate.ap >= 1)
      if (citizen) {
        const event = post(state, citizen, 'gate_backup', GATE_BACKUP_TASK, 'I will keep 1 AP as backup for the gate.', 1, 23)
        events.push(event)
        if (event.type === 'COORDINATION_COMMITMENT_POSTED') working.push(event.commitment)
      }
    }
  }

  if (!projectId) return events
  const desired = desiredConstructionVolunteers(state, projectId, assessment.pressure)
  for (const citizen of candidates) {
    if (hasCommitment(citizen.id) || citizen.ap <= 0 || citizen.status.hydration !== 'normal') continue
    const current = working.filter((commitment) => commitment.kind === 'construction' && commitment.projectId === projectId).length
    if (current >= desired) break
    const event = post(
      state,
      citizen,
      'construction',
      `construction:${projectId}`,
      `I will put an AP into ${CONSTRUCTIONS[projectId].name} this hour.`,
      0,
      Math.min(23, state.clock.hour + 1),
      projectId,
    )
    events.push(event)
    if (event.type === 'COORDINATION_COMMITMENT_POSTED') working.push(event.commitment)
  }

  return events
}
