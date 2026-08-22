import type { ClockPhase, GameClock } from './types'

export const DAY_START_HOUR = 1
export const ATTACK_HOUR = 0
export const NOON_HOUR = 12
export const LAST_SAFE_HOUR = 23

export function createGameClock(): GameClock {
  return { hour: DAY_START_HOUR, phase: 'day' }
}

export function phaseForHour(hour: number): ClockPhase {
  return hour === ATTACK_HOUR ? 'attack' : 'day'
}

export function nextClockHour(hour: number): number {
  return (hour + 1) % 24
}

export function canAdvanceToHour(clock: GameClock, targetHour: number): boolean {
  if (clock.phase !== 'day') return false
  if (targetHour === ATTACK_HOUR) return clock.hour > ATTACK_HOUR
  return targetHour > clock.hour
}

export function formatGameHour(hour: number): string {
  const normalized = ((hour % 24) + 24) % 24
  if (normalized === 0) return '12:00 AM'
  if (normalized === 12) return '12:00 PM'
  if (normalized < 12) return `${normalized}:00 AM`
  return `${normalized - 12}:00 PM`
}
