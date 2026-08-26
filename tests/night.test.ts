import { describe, expect, it } from 'vitest'
import { getLegalActions } from '../src/core/actions'
import { executeCommand } from '../src/core/commands'
import { homeTownDefense, totalTownDefense } from '../src/core/defense'
import { personalDefense } from '../src/core/home'
import { createInitialGame, resolveNight } from '../src/core/game'
import { attackRangeForDay, attackStrengthForDay, watchtowerEstimate } from '../src/core/night'
import { equipCitizenProfession } from '../src/core/professions'
import type { GameEvent, GameState } from '../src/core/types'
import { contributeWatchtowerEstimation } from '../src/core/watchtowerEstimation'

function withWatchtower(game: GameState): GameState {
  return {
    ...game,
    town: {
      ...game.town,
      construction: {
        ...game.town.construction,
        watchtower: { id: 'watchtower', discovered: true, apContributed: 15, completed: true },
      },
    },
  }
}
function withoutGuardianProfessions(game:GameState):GameState{
  return{...game,citizens:game.citizens.map((citizen)=>equipCitizenProfession(citizen,'scout'))}
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
    expect(personalDefense(game.citizens[0])).toBe(3)
    expect(getLegalActions(game, 'c01').some((candidate) => candidate.type === 'UPGRADE_HOME')).toBe(false)
  })

  it('keeps loose home-defense objects personal rather than contributing them to town defense', () => {
    let game = createInitialGame(101, 1)
    game = {
      ...game,
      citizens: game.citizens.map((citizen) => citizen.id === 'c01'
        ? { ...citizen, home: { ...citizen.home, storage: [
          { id: 'door-1', type: 'old_door' },
          { id: 'door-2', type: 'old_door' },
          { id: 'door-3', type: 'old_door' },
        ] } }
        : citizen),
    }
    expect(personalDefense(game.citizens[0])).toBe(5)
    expect(homeTownDefense(game)).toBe(0)
    expect(totalTownDefense(game)).toBe(40)
  })

  it('contributes 40% of eligible structural home defense and 80% with Circular Quarters', () => {
    let game = createInitialGame(102, 1)
    game = {
      ...game,
      citizens: game.citizens.map((citizen) => ({ ...citizen, home: { ...citizen.home, level: 'house', defense: 16 } })),
    }
    expect(homeTownDefense(game)).toBe(6)
    expect(totalTownDefense(game)).toBe(46)

    game = {
      ...game,
      town: {
        ...game.town,
        construction: {
          ...game.town.construction,
          workshop: { ...game.town.construction.workshop, completed: true, apContributed: 25 },
          circular_quarters: { ...game.town.construction.circular_quarters, completed: true, apContributed: 60 },
        },
      },
    }
    expect(homeTownDefense(game)).toBe(12)
    expect(totalTownDefense(game)).toBe(52)
  })
})

describe('Watchtower and horde strength', () => {
  it('uses the surviving English sample range for day 1', () => {
    expect(attackRangeForDay(1)).toEqual({ min: 21, max: 29, basis: 'historical-sample' })
    const strength = attackStrengthForDay(555, 1)
    expect(strength).toBeGreaterThanOrEqual(21)
    expect(strength).toBeLessThanOrEqual(29)
  })

  it('requires collaborative threshold progress and never exposes the hidden exact attack', () => {
    const initial = createInitialGame(222, 8)
    expect(watchtowerEstimate(initial)).toBeNull()
    let game = withWatchtower(initial)
    expect(watchtowerEstimate(game)).toBeNull()
    for(const citizen of game.citizens)game=contributeWatchtowerEstimation(game,citizen.id)
    const estimate = watchtowerEstimate(game)!
    const actual = attackStrengthForDay(game.seed, game.day)
    expect('actual' in estimate).toBe(false)
    expect(estimate.quality).toBeGreaterThanOrEqual(.33)
    expect(estimate.min).toBeLessThanOrEqual(actual)
    expect(estimate.max).toBeGreaterThanOrEqual(actual)
  })
})

describe('Night breach resolution', () => {
  it('lets the current 40-point bootstrap defense hold every historically sampled day-1 attack', () => {
    const game = resolveNight(withoutGuardianProfessions(createInitialGame(9876, 6)))
    expect(game.lastNight?.attackStrength).toBeLessThanOrEqual(29)
    expect(game.lastNight?.effectiveDefense).toBe(40)
    expect(game.lastNight?.breached).toBe(false)
    expect(game.lastNight?.homeDeaths).toBe(0)
  })

  it('distributes every zombie that breaches across surviving citizens and applies home defense', () => {
    let game = withoutGuardianProfessions(createInitialGame(345, 8))
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

  it('a Tent survives three zombies at the door while a Camp Bed does not', () => {
    const seed = 777
    const strength = attackStrengthForDay(seed, 1)

    let camp = createInitialGame(seed, 1)
    camp = { ...camp, town: { ...camp.town, defense: strength - 3 } }
    camp = resolveNight(camp)
    expect(camp.lastNight?.zombiesInside).toBe(3)
    expect(camp.citizens[0].alive).toBe(false)

    let tent = createInitialGame(seed, 1)
    tent = {
      ...tent,
      town: { ...tent.town, defense: strength - 3 },
      citizens: tent.citizens.map((citizen) => ({ ...citizen, home: { ...citizen.home, level: 'tent', defense: 1 } })),
    }
    tent = resolveNight(tent)
    expect(tent.lastNight?.zombiesInside).toBe(3)
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