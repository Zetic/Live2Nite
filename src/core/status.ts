import type { Citizen, CitizenStatusId, CitizenStatusState, GameEvent, GameState, HydrationStatus } from './types'

export const DESERT_STEPS_PER_HYDRATION_STAGE = 11

export interface CitizenStatusDefinition {
  id: CitizenStatusId
  label: string
  family: 'hydration' | 'energy' | 'daily'
  severity: 'neutral' | 'warning' | 'danger'
  effect: string
}

export const CITIZEN_STATUS_DEFINITIONS: Record<CitizenStatusId, CitizenStatusDefinition> = {
  exhausted: { id: 'exhausted', label: 'Exhausted', family: 'energy', severity: 'warning', effect: 'At 0 AP, contact weapons and ordinary AP actions are unavailable until AP is restored.' },
  satisfied_food: { id: 'satisfied_food', label: 'Fed', family: 'daily', severity: 'neutral', effect: 'Food has already refreshed AP today.' },
  satisfied_water: { id: 'satisfied_water', label: 'Refreshed', family: 'daily', severity: 'neutral', effect: 'Water has already refreshed AP today; extra water can still treat hydration status.' },
  thirsty: { id: 'thirsty', label: 'Thirsty', family: 'hydration', severity: 'warning', effect: 'Drink water before midnight. Another 11 desert movements or surviving the night while Thirsty worsens this to Dehydrated.' },
  dehydrated: { id: 'dehydrated', label: 'Dehydrated', family: 'hydration', severity: 'danger', effect: 'Water reduces this to Thirsty but does not refresh AP. Remaining Dehydrated through midnight is fatal.' },
}

export function createCitizenStatusState(): CitizenStatusState {
  return { hydration: 'normal', desertStepsToday: 0 }
}

export function activeCitizenStatuses(citizen: Citizen): CitizenStatusId[] {
  if (!citizen.alive) return []
  const statuses: CitizenStatusId[] = []
  if (citizen.status.hydration === 'thirsty') statuses.push('thirsty')
  if (citizen.status.hydration === 'dehydrated') statuses.push('dehydrated')
  if (citizen.ap === 0) statuses.push('exhausted')
  if (citizen.daily.ate) statuses.push('satisfied_food')
  if (citizen.daily.drank) statuses.push('satisfied_water')
  return statuses
}

export function hydrationStatus(citizen: Citizen): HydrationStatus {
  return citizen.status.hydration
}

export function travelHydrationTransition(citizen: Citizen): CitizenStatusState | null {
  const nextSteps = citizen.status.desertStepsToday + 1
  if (nextSteps < DESERT_STEPS_PER_HYDRATION_STAGE) return null
  if (citizen.status.hydration === 'normal') return { hydration: 'thirsty', desertStepsToday: 0 }
  if (citizen.status.hydration === 'thirsty') return { hydration: 'dehydrated', desertStepsToday: 0 }
  return null
}

export function waterConsumptionOutcome(citizen: Citizen): { restoresAp: boolean; statusAfter: CitizenStatusState } {
  const restoresAp = !citizen.daily.drank && citizen.status.hydration !== 'dehydrated'
  const hydration: HydrationStatus = citizen.status.hydration === 'dehydrated' ? 'thirsty' : 'normal'
  return { restoresAp, statusAfter: { hydration, desertStepsToday: 0 } }
}

export function nightlyHydrationEvents(state: GameState): GameEvent[] {
  const events: GameEvent[] = []
  for (const citizen of state.citizens) {
    if (!citizen.alive) continue
    if (citizen.status.hydration === 'dehydrated') {
      events.push({ type: 'CITIZEN_DIED', day: state.day, hour: 0, citizenId: citizen.id, reason: 'dehydration' })
      continue
    }
    let hydration: HydrationStatus = citizen.status.hydration
    // Surviving midnight while already Thirsty worsens the condition regardless of
    // whether water was consumed earlier in the day; a later desert-induced thirst
    // must be treated again before the attack. A normally hydrated citizen becomes
    // Thirsty only when they did not drink at all during the day.
    if (citizen.status.hydration === 'thirsty') hydration = 'dehydrated'
    else if (!citizen.daily.drank) hydration = 'thirsty'
    const nextStatus: CitizenStatusState = { hydration, desertStepsToday: 0 }
    if (nextStatus.hydration !== citizen.status.hydration || citizen.status.desertStepsToday !== 0) {
      events.push({ type: 'CITIZEN_STATUS_CHANGED', day: state.day, hour: 0, citizenId: citizen.id, status: nextStatus, reason: 'nightly_progression' })
    }
  }
  return events
}
