import { totalTownDefense } from './defense'
import { applyEvents } from './events'
import { personalDefense } from './home'
import { randomInt } from './rng'
import type { GameEvent, GameState, HomeAttackOutcome, NightReport } from './types'

export interface AttackRange {
  min: number
  max: number
  basis: 'historical-sample' | 'extrapolated'
}

export interface WatchtowerEstimate {
  min: number
  max: number
  actual: number
  townDefense: number
  basis: AttackRange['basis']
}

// These first ten ranges are anchored to the surviving English Die2Nite attack-strength
// sample table. They are not claimed to reconstruct the original server RNG distribution.
const HISTORICAL_RANGES: Record<number, readonly [number, number]> = {
  1: [21, 29],
  2: [25, 84],
  3: [57, 124],
  4: [92, 227],
  5: [160, 300],
  6: [217, 450],
  7: [290, 493],
  8: [357, 651],
  9: [468, 801],
  10: [611, 901],
}

export function attackRangeForDay(day: number): AttackRange {
  const historical = HISTORICAL_RANGES[Math.max(1, Math.floor(day))]
  if (historical) return { min: historical[0], max: historical[1], basis: 'historical-sample' }

  // The exact later-day curve is still under reconstruction. Keep it isolated here so a
  // future historically verified curve can replace this without touching night resolution.
  const steps = Math.max(1, Math.floor(day) - 10)
  const growth = Math.pow(1.15, steps)
  return {
    min: Math.round(611 * growth),
    max: Math.round(901 * growth),
    basis: 'extrapolated',
  }
}

function isolatedNightSeed(seed: number, day: number, salt: number): number {
  const mixed = ((seed >>> 0) ^ Math.imul(day + 1, 0x9e3779b1) ^ salt) >>> 0
  return mixed || 1
}

export function attackStrengthForDay(seed: number, day: number): number {
  const range = attackRangeForDay(day)
  return randomInt(isolatedNightSeed(seed, day, 0xa511e9b3), range.min, range.max).value
}

export function watchtowerEstimate(state: GameState): WatchtowerEstimate | null {
  if (!state.town.construction.watchtower.completed) return null
  const range = attackRangeForDay(state.day)
  const actual = attackStrengthForDay(state.seed, state.day)

  // The original Watchtower provides an estimate, while Scanner/Predictor improve its
  // usefulness. The exact base-tower error distribution is not preserved in our sources,
  // so this deliberately uses a rough ±15% envelope and is documented as an adaptation.
  const margin = Math.max(3, Math.round(actual * 0.15))
  return {
    min: Math.max(range.min, actual - margin),
    max: Math.min(range.max, actual + margin),
    actual,
    townDefense: totalTownDefense(state),
    basis: range.basis,
  }
}

function distributeBreachedZombies(state: GameState, zombiesInside: number): HomeAttackOutcome[] {
  const citizens = state.citizens.filter((citizen) => citizen.alive && citizen.location.type === 'town')
  if (zombiesInside <= 0 || citizens.length === 0) return []

  const assigned = new Map<string, number>()
  let rngState = isolatedNightSeed(state.seed, state.day, 0x63d83595)
  for (let zombie = 0; zombie < zombiesInside; zombie += 1) {
    const roll = randomInt(rngState, 0, citizens.length - 1)
    rngState = roll.state
    const citizen = citizens[roll.value]
    assigned.set(citizen.id, (assigned.get(citizen.id) ?? 0) + 1)
  }

  return citizens.flatMap((citizen) => {
    const zombies = assigned.get(citizen.id) ?? 0
    if (zombies === 0) return []
    const defense = personalDefense(citizen)
    return [{ citizenId: citizen.id, zombies, defense, survived: zombies <= defense }]
  })
}

export function resolveNightAttack(state: GameState): GameState {
  const outside = state.citizens.filter((citizen) => citizen.alive && citizen.location.type === 'world')
  const outsideDeathEvents: GameEvent[] = outside.map((citizen) => ({
    type: 'CITIZEN_DIED',
    day: state.day,
    citizenId: citizen.id,
    reason: 'outside_at_night',
  }))
  const afterOutsideDeaths = applyEvents(state, outsideDeathEvents)

  const attackStrength = attackStrengthForDay(afterOutsideDeaths.seed, afterOutsideDeaths.day)
  const defenseBeforeAttack = totalTownDefense(afterOutsideDeaths)
  const effectiveDefense = afterOutsideDeaths.town.gateOpen ? 0 : defenseBeforeAttack
  const zombiesInside = Math.max(0, attackStrength - effectiveDefense)
  const homeAttacks = distributeBreachedZombies(afterOutsideDeaths, zombiesInside)
  const homeDeathEvents: GameEvent[] = homeAttacks
    .filter((outcome) => !outcome.survived)
    .map((outcome) => ({ type: 'CITIZEN_DIED', day: state.day, citizenId: outcome.citizenId, reason: 'home_breach' }))
  const afterHomeDeaths = applyEvents(afterOutsideDeaths, homeDeathEvents)

  const report: NightReport = {
    day: state.day,
    attackStrength,
    defenseBeforeAttack,
    effectiveDefense,
    gateOpen: state.town.gateOpen,
    breached: zombiesInside > 0,
    outsideDeaths: outside.length,
    zombiesInside,
    homeDeaths: homeDeathEvents.length,
    homeAttacks,
  }

  return applyEvents(afterHomeDeaths, [
    { type: 'NIGHT_RESOLVED', day: state.day, report },
    { type: 'DAY_STARTED', day: state.day + 1 },
  ])
}
