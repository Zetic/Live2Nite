import { applyEvents } from './events'
import { randomInt } from './rng'
import type { Citizen, GameEvent, GameState, NightReport } from './types'

const DEFAULT_AP = 12

const BOT_NAMES = [
  'Mara', 'Grant', 'Erin', 'Lewis', 'Nora', 'Cal', 'June', 'Rook', 'Iris', 'Miles',
  'Tess', 'Owen', 'Vera', 'Ash', 'Drew', 'Mae', 'Gale', 'Rin', 'Cole', 'Ada',
  'Finn', 'Skye', 'Noel', 'Bram', 'Lena', 'Jude', 'Wren', 'Eli', 'Sage', 'Remy',
  'Nell', 'Beck', 'Lane', 'Mika', 'Kit', 'Sol', 'Pax', 'Reed', 'Cleo',
]

function makeCitizens(count: number): Citizen[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `c${String(index + 1).padStart(2, '0')}`,
    name: index === 0 ? 'You' : BOT_NAMES[(index - 1) % BOT_NAMES.length],
    controller: index === 0 ? 'human' : 'basic-bot',
    alive: true,
    ap: DEFAULT_AP,
    maxAp: DEFAULT_AP,
  }))
}

export function createInitialGame(seed: number, citizenCount = 40): GameState {
  const normalizedSeed = seed >>> 0 || 1
  return {
    schemaVersion: 1,
    gameId: `local-${normalizedSeed}`,
    seed: normalizedSeed,
    rngState: normalizedSeed,
    day: 1,
    citizens: makeCitizens(citizenCount),
    town: { water: citizenCount * 2, defense: 40 },
    lastNight: null,
    events: [{ type: 'DAY_STARTED', day: 1 }],
  }
}

export function resolveNight(state: GameState): GameState {
  const aliveCount = state.citizens.filter((citizen) => citizen.alive).length
  const attackRoll = randomInt(state.rngState, 0, 20)
  const attackStrength = 45 + state.day * 5 + attackRoll.value
  const waterConsumed = aliveCount
  const report: NightReport = {
    day: state.day,
    attackStrength,
    defenseBeforeAttack: state.town.defense,
    breached: attackStrength > state.town.defense,
    waterConsumed,
  }

  const events: GameEvent[] = [
    { type: 'WATER_CHANGED', day: state.day, amount: -waterConsumed },
    { type: 'NIGHT_RESOLVED', day: state.day, report },
    { type: 'DAY_STARTED', day: state.day + 1 },
  ]

  return {
    ...applyEvents({ ...state, rngState: attackRoll.state }, events),
    rngState: attackRoll.state,
  }
}
