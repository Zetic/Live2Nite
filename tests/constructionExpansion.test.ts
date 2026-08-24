import { describe, expect, it } from 'vitest'
import {
  CONSTRUCTION_ORDER,
  CONSTRUCTIONS,
  constructionUnlocked,
  homeContributionRatio,
  temporaryCompletedProjects,
  watchtowerForecastDays,
  watchtowerMarginPercent,
  wellDailyWithdrawals,
} from '../src/core/construction'
import { totalTownDefense } from '../src/core/defense'
import { createInitialGame, resolveNight } from '../src/core/game'
import { watchtowerEstimate } from '../src/core/night'
import type { ConstructionId, GameState } from '../src/core/types'
import { workshopRecipeApCost } from '../src/core/workshop'
import { FACILITY_SLOT_COUNT, PRIMARY_SCREENS, facilitySlots } from '../src/ui/navigation'
import { bankCount } from './bankFixtures'

function complete(game: GameState, ...projectIds: ConstructionId[]): GameState {
  const construction = { ...game.town.construction }
  for (const projectId of projectIds) {
    construction[projectId] = {
      ...construction[projectId],
      apContributed: CONSTRUCTIONS[projectId].apCost,
      completed: true,
    }
  }
  return { ...game, town: { ...game.town, construction } }
}

describe('expanded construction catalog', () => {
  it('keeps a broad, internally valid seven-branch catalog', () => {
    expect(CONSTRUCTION_ORDER.length).toBeGreaterThanOrEqual(75)
    expect(new Set(CONSTRUCTION_ORDER).size).toBe(CONSTRUCTION_ORDER.length)

    const ids = new Set(CONSTRUCTION_ORDER)
    const categories = new Set<string>()
    for (const projectId of CONSTRUCTION_ORDER) {
      const definition = CONSTRUCTIONS[projectId]
      expect(definition.id).toBe(projectId)
      categories.add(definition.category)
      for (const prerequisite of definition.prerequisites) expect(ids.has(prerequisite)).toBe(true)
      if (definition.parentId) expect(ids.has(definition.parentId)).toBe(true)
    }

    expect([...categories].sort()).toEqual([
      'foundations',
      'portal',
      'pump',
      'sanctuary',
      'wall',
      'watchtower',
      'workshop',
    ])
  })

  it('exposes descendants only as their prerequisite frontier is completed', () => {
    let game = createInitialGame(1901, 2)
    expect(constructionUnlocked(game, 'workshop')).toBe(true)
    expect(constructionUnlocked(game, 'great_pit')).toBe(false)
    expect(constructionUnlocked(game, 'moat')).toBe(false)

    game = complete(game, 'wall_upgrade')
    expect(constructionUnlocked(game, 'great_pit')).toBe(true)
    expect(constructionUnlocked(game, 'moat')).toBe(false)

    game = complete(game, 'great_pit')
    expect(constructionUnlocked(game, 'moat')).toBe(true)
  })
})

describe('construction effects', () => {
  it('derives shared defense from completed projects and multipliers without mutating the bootstrap base', () => {
    let game = createInitialGame(1902, 2)
    expect(game.town.defense).toBe(40)
    expect(totalTownDefense(game)).toBe(40)

    game = complete(game, 'wall_upgrade')
    expect(game.town.defense).toBe(40)
    expect(totalTownDefense(game)).toBe(70)

    game = complete(game, 'workshop', 'defensive_supports')
    expect(game.town.defense).toBe(40)
    expect(totalTownDefense(game)).toBe(Math.floor((40 + 30 + 8) * 1.1))
  })

  it('applies infrastructure upgrades through the generic effect layer', () => {
    let game = createInitialGame(1903, 2)
    expect(wellDailyWithdrawals(game)).toBe(1)
    expect(workshopRecipeApCost(game, 'logs_to_planks')).toBe(3)
    expect(homeContributionRatio(game)).toBe(0.4)

    game = complete(game, 'pump', 'workshop', 'factory', 'circular_quarters')
    expect(wellDailyWithdrawals(game)).toBe(2)
    expect(workshopRecipeApCost(game, 'logs_to_planks')).toBe(2)
    expect(homeContributionRatio(game)).toBe(0.8)
  })

  it('improves Watchtower accuracy and unlocks tomorrow forecasting through Scanner and Planner', () => {
    let game = complete(createInitialGame(1904, 2), 'watchtower')
    expect(watchtowerMarginPercent(game)).toBe(15)
    expect(watchtowerForecastDays(game)).toBe(1)
    expect(watchtowerEstimate(game)?.tomorrow).toBeUndefined()

    game = complete(game, 'scanner', 'planner')
    expect(watchtowerMarginPercent(game)).toBe(5)
    expect(watchtowerForecastDays(game)).toBe(2)
    expect(watchtowerEstimate(game)?.tomorrow?.day).toBe(game.day + 1)
  })

  it('expires one-night emergency constructions after the attack while preserving permanent prerequisites', () => {
    let game = complete(createInitialGame(1905, 3), 'watchtower', 'emergency_devices', 'emergency_reinforcements')
    expect(temporaryCompletedProjects(game)).toContain('emergency_reinforcements')
    expect(totalTownDefense(game)).toBe(90)

    game = resolveNight(game)
    expect(game.town.construction.emergency_reinforcements.completed).toBe(false)
    expect(game.town.construction.emergency_reinforcements.apContributed).toBe(0)
    expect(game.town.construction.watchtower.completed).toBe(true)
    expect(game.town.construction.emergency_devices.completed).toBe(true)
    expect(game.events.some((event) => event.type === 'CONSTRUCTION_EXPIRED' && event.projectId === 'emergency_reinforcements')).toBe(true)
  })

  it('generates deterministic daily construction output at rollover', () => {
    let game = complete(createInitialGame(1906, 2), 'workshop', 'henhouse')
    const before = bankCount(game.town.bank,'food')
    game = resolveNight(game)
    expect(bankCount(game.town.bank,'food')).toBe(before + 3)
    expect(game.events.some((event) => event.type === 'CONSTRUCTION_GENERATED_ITEM' && event.projectId === 'henhouse' && event.itemType === 'food' && event.amount === 3)).toBe(true)
  })
})

describe('stable facility navigation', () => {
  it('keeps Town Records first while reserving six facility slots', () => {
    const initial = createInitialGame(1907, 2)
    expect(PRIMARY_SCREENS.map((screen) => screen.id)).toEqual([
      'chronicle',
      'codex',
      'home',
      'well',
      'bank',
      'construction',
      'world',
      'citizens',
    ])
    expect(facilitySlots(initial)).toEqual(Array(FACILITY_SLOT_COUNT).fill(null))

    const built = complete(initial, 'workshop', 'watchtower')
    const slots = facilitySlots(built)
    expect(slots).toHaveLength(FACILITY_SLOT_COUNT)
    expect(slots[0]?.id).toBe('workshop')
    expect(slots[1]?.id).toBe('watchtower')
    expect(slots.slice(2)).toEqual(Array(FACILITY_SLOT_COUNT - 2).fill(null))
  })
})
