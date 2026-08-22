import { describe, expect, it } from 'vitest'
import { getLegalActions } from '../src/core/actions'
import { executeCommand } from '../src/core/commands'
import { totalTownDefense } from '../src/core/defense'
import { personalDefense } from '../src/core/home'
import { createInitialGame, resolveNight } from '../src/core/game'
import { attackRangeForDay, attackStrengthForDay, watchtowerEstimate } from '../src/core/night'
import type { GameEvent, GameState } from '../src/core/types'

function withWatchtower(game: GameState): GameState {
  return {
    ...game,
    town: {
      ...game.town,
      construction: {
        ...game.town.construction,
        watchtower: { id: 'watchtower', apContributed: 12, completed: true },
      },
    },
  }
}

describe('Home defense', () => {
  it('upgrades a Camp Bed to a Tent for 2 AP and gives 1 structural defense', () => {
    let game = createInitialGame(101, 1)
    const action = getLegalActions(game, 'c01').find((candidate) => candidate.type === 'UPGRADE_HOME')
    expect(action).toBeTruthy()
    game = executeCommand(game, action!).state
    expect(game.citizens[0].ap).toBe(4)
    expect(game.citizens[0].home.level).toBe('tent')
    expect(game.citizens[0].home.defense).toBe(1)
    expect(personalDefense(game.citizens[0])).toBe(1)
    expect(getLegalActions(game, 'c01').some((candidate) => candidate.type === 'UPGRADE_HOME')).toBe(false)
  })

  it('makes an Old Door at home worth 1 personal defense and 1 shared town defense', () => {
    let game = createInitialGame(101, 1)
    game = {
      ...game,
      citizens: game.citizens.map((citizen) => citizen.id === 'c01'
        ? { ...citizen, inventory: [{ id: 'door', type: 'old_door' }] }
        : citizen),
    }
    const store = getLegalActions(game, 'c01').find((candidate) => candidate.type === 'MOVE_ITEM_TO_HOME' && candidate.itemId === 'door')
    game = executeCommand(game, store!).state
    expect(personalDefense(game.citizens[0])).toBe(1)
    expect(totalTownDefense(game)).toBe(41)
  })
})

describe('Watchtower and horde strength', () => {
  it('uses the surviving English sample range for day 1', () => {
    expect(attackRangeForDay(1)).toEqual({ min: 21, max: 29, basis: 'historical-sample' })
    const strength = attackStrengthForDay(555, 1)
    expect(strength).toBeGreaterThanOrEqual(21)
    expect(strength).toBeLessThanOrEqual(29)
  })

  it('only exposes an estimate after the Watchtower is built and the range contains the deterministic attack', () => {
    const initial = createInitialGame(222, 4)
    expect(watchtowerEstimate(initial)).toBeNull()
    const game = withWatchtower(initial)
    const estimate = watchtowerEstimate(game)!
    expect(estimate.actual).toBe(attackStrengthForDay(game.seed, game.day))
    expect(estimate.min).toBeLessThanOrEqual(estimate.actual)
    expect(estimate.max).toBeGreaterThanOrEqual(estimate.actual)
  })
})

describe('Night breach resolution', () => {
  it('lets the current 40-point bootstrap defense hold every historically sampled day-1 attack', () => {
    const game = resolveNight(createInitialGame(9876, 6))
    expect(game.lastNight?.attackStrength).toBeLessThanOrEqual(29)
    expect(game.lastNight?.effectiveDefense).toBe(40)
    expect(game.lastNight?.breached).toBe(false)
    expect(game.lastNight?.homeDeaths).toBe(0)
  })

  it('distributes every zombie that breaches across surviving citizens and applies home defense', () => {
    let game = createInitialGame(345, 8)
    game = { ...game, town: { ...game.town, defense: 0 } }
    game = resolveNight(game)
    const report = game.lastNight!
    const attacks = report.homeAttacks ?? []
    expect(report.zombiesInside).toBe(report.attackStrength)
    expect(attacks.reduce((sum, attack) => sum + attack.zombies, 0)).toBe(report.attackStrength)
    expect(attacks.every((attack) => attack.survived === (attack.zombies <= attack.defense))).toBe(true)
    const homeDeaths = game.events.filter((event): event is Extract<GameEvent,{type:'CITIZEN_DIED'}> => event.type === 'CITIZEN_DIED' && event.day === 1 && event.reason === 'home_breach')
    expect(report.homeDeaths).toBe(homeDeaths.length)
  })

  it('a Tent survives one zombie at the door while a Camp Bed does not', () => {
    const seed = 777
    const strength = attackStrengthForDay(seed, 1)

    let camp = createInitialGame(seed, 1)
    camp = { ...camp, town: { ...camp.town, defense: strength - 1 } }
    camp = resolveNight(camp)
    expect(camp.lastNight?.zombiesInside).toBe(1)
    expect(camp.citizens[0].alive).toBe(false)

    let tent = createInitialGame(seed, 1)
    tent = {
      ...tent,
      town: { ...tent.town, defense: strength - 1 },
      citizens: tent.citizens.map((citizen) => ({ ...citizen, home: { ...citizen.home, level: 'tent', defense: 1 } })),
    }
    tent = resolveNight(tent)
    expect(tent.lastNight?.zombiesInside).toBe(1)
    expect(tent.citizens[0].alive).toBe(true)
    expect(tent.lastNight?.homeDeaths).toBe(0)
  })

  it('kills outside citizens before the home attack and never assigns breached zombies to them', () => {
    let game = createInitialGame(4321, 3)
    game = {
      ...game,
      town: { ...game.town, defense: 0 },
      citizens: game.citizens.map((citizen) => citizen.id === 'c02' ? { ...citizen, location: { type: 'world', x: 1, y: 0 } } : citizen),
    }
    game = resolveNight(game)
    expect(game.citizens.find((citizen) => citizen.id === 'c02')?.alive).toBe(false)
    expect(game.lastNight?.outsideDeaths).toBe(1)
    expect((game.lastNight?.homeAttacks ?? []).some((attack) => attack.citizenId === 'c02')).toBe(false)
  })
})
