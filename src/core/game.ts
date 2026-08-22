import { applyEvents } from './events'
import { randomInt } from './rng'
import type { Citizen, GameEvent, GameState, NightReport } from './types'
import { createWorld } from './world'

const DEFAULT_AP = 6
const DEFAULT_INVENTORY_CAPACITY = 4

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
    location: { type: 'town' },
    inventory: [],
    inventoryCapacity: DEFAULT_INVENTORY_CAPACITY,
  }))
}

export function createInitialGame(seed: number, citizenCount = 40): GameState {
  const normalizedSeed = seed >>> 0 || 1
  const generated = createWorld(normalizedSeed)
  return {
    schemaVersion: 2,
    gameId: `local-${normalizedSeed}`,
    seed: normalizedSeed,
    rngState: generated.rngState,
    nextItemId: 1,
    day: 1,
    citizens: makeCitizens(citizenCount),
    town: { gateOpen: false, defense: 40, bank: {} },
    world: generated.world,
    lastNight: null,
    events: [{ type: 'DAY_STARTED', day: 1 }],
  }
}

export function resolveNight(state: GameState): GameState {
  const outside = state.citizens.filter((citizen) => citizen.alive && citizen.location.type === 'world')
  const deathEvents: GameEvent[] = outside.map((citizen) => ({
    type: 'CITIZEN_DIED',
    day: state.day,
    citizenId: citizen.id,
    reason: 'outside_at_night',
  }))

  const afterDeaths = applyEvents(state, deathEvents)
  const attackRoll = randomInt(afterDeaths.rngState, 0, 16)
  // Temporary progression curve until the historical attack-strength model is implemented.
  // Day 1 is now survivable with the prototype's 40 base defense when the gate is closed.
  const attackStrength = 20 + afterDeaths.day * 4 + attackRoll.value
  const effectiveDefense = afterDeaths.town.gateOpen ? 0 : afterDeaths.town.defense
  const report: NightReport = {
    day: afterDeaths.day,
    attackStrength,
    defenseBeforeAttack: afterDeaths.town.defense,
    effectiveDefense,
    gateOpen: afterDeaths.town.gateOpen,
    breached: attackStrength > effectiveDefense,
    outsideDeaths: outside.length,
  }

  const events: GameEvent[] = [
    { type: 'NIGHT_RESOLVED', day: afterDeaths.day, report },
    { type: 'DAY_STARTED', day: afterDeaths.day + 1 },
  ]

  return {
    ...applyEvents({ ...afterDeaths, rngState: attackRoll.state }, events),
    rngState: attackRoll.state,
  }
}
