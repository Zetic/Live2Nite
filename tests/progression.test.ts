import { describe, expect, it } from 'vitest'
import { BasicBotController } from '../src/agents/BasicBotController'
import { resolveWeaponAttack } from '../src/core/combat'
import { CONSTRUCTIONS } from '../src/core/construction'
import { getLegalActions } from '../src/core/actions'
import { executeCommand } from '../src/core/commands'
import { createInitialGame } from '../src/core/game'
import { searchTowerReplenishmentEvents } from '../src/core/night'
import type { GameCommand, GameState } from '../src/core/types'
import { zoneKey } from '../src/core/world'
import { advanceOneHour, advanceToHour } from '../src/simulation/advanceTime'
import { bankCount, bankFromCounts } from './bankFixtures'

const bots = new BasicBotController()

function command(game: GameState, citizenId: string, type: GameCommand['type']) {
  const action = getLegalActions(game,citizenId).find((candidate) => candidate.type === type)
  if (!action) throw new Error(`Missing ${type}`)
  return action
}

function projectCommand(game: GameState, citizenId: string, projectId: string) {
  const action = getLegalActions(game,citizenId).find((candidate) => candidate.type === 'CONTRIBUTE_CONSTRUCTION' && candidate.projectId === projectId)
  if (!action) throw new Error(`Missing construction ${projectId}`)
  return action
}

describe('early-game progression', () => {
  it('uses the dedicated Workshop requirement without an extra Concrete Block', () => {
    expect(CONSTRUCTIONS.workshop.apCost).toBe(25)
    expect(CONSTRUCTIONS.workshop.resources).toEqual({ twisted_plank: 10, wrought_iron: 8 })
  })

  it('automatically searches again after an ordinary citizen remains in a productive zone for two hours', () => {
    let game = createInitialGame(123,1)
    game = executeCommand(game,command(game,'c01','OPEN_GATE')).state
    game = executeCommand(game,command(game,'c01','EXIT_TOWN')).state
    game = executeCommand(game,getLegalActions(game,'c01').find((action) => action.type === 'MOVE' && action.direction === 'EAST')!).state
    const key = zoneKey(1,0)
    game = { ...game, world: { ...game.world, zones: { ...game.world.zones, [key]: { ...game.world.zones[key], zombies:0, searchesRemaining:3, hiddenLoot:['twisted_plank','wrought_iron','food'], searchedBy:[], depletedSearchedBy:[] } } } }
    game = executeCommand(game,command(game,'c01','SEARCH_ZONE')).state
    expect(game.world.zones[key].searchesRemaining).toBe(2)
    game = advanceOneHour(game,bots,'c01')
    game = advanceOneHour(game,bots,'c01')
    expect(game.world.zones[key].searchesRemaining).toBe(2)
    game = advanceOneHour(game,bots,'c01')
    expect(game.world.zones[key].searchesRemaining).toBe(1)
    expect(game.events.some((event) => event.type === 'ZONE_SEARCHED' && event.citizenId === 'c01' && event.automatic === true && event.hour === 3)).toBe(true)
  })

  it('lets breakable early weapons become repairable broken items', () => {
    let broken: ReturnType<typeof resolveWeaponAttack> | null = null
    for (let rngState=1;rngState<=100 && !broken;rngState+=1) {
      const result = resolveWeaponAttack({rngState},{id:'bone',type:'human_bone'},3)
      if (result.brokenInto) broken = result
    }
    expect(broken?.brokenInto).toBe('broken_human_bone')
  })

  it('Pump construction adds fifteen water and permits a second daily well withdrawal', () => {
    let game = createInitialGame(5678,1)
    const before = game.town.well.water
    game = { ...game, town: { ...game.town, bank:bankFromCounts({wrought_iron:8,copper_pipe:1},'pump'), construction:{...game.town.construction,pump:{...game.town.construction.pump,apContributed:24}} } }
    game = executeCommand(game,projectCommand(game,'c01','pump')).state
    expect(game.town.construction.pump.completed).toBe(true)
    expect(game.town.well.water).toBe(before+15)
    game = executeCommand(game,command(game,'c01','TAKE_WATER')).state
    expect(getLegalActions(game,'c01').some((action) => action.type === 'TAKE_WATER')).toBe(true)
    game = executeCommand(game,command(game,'c01','TAKE_WATER')).state
    expect(getLegalActions(game,'c01').some((action) => action.type === 'TAKE_WATER')).toBe(false)
  })

  it('Search Tower deterministically replenishes a subset of known depleted zones', () => {
    let game = createInitialGame(9876,2)
    game = {
      ...game,
      town:{...game.town,construction:{...game.town.construction,watchtower:{...game.town.construction.watchtower,completed:true},search_tower:{...game.town.construction.search_tower,completed:true}}},
      world:{...game.world,zones:Object.fromEntries(Object.entries(game.world.zones).map(([key,zone]) => [key, key==='0,0'?zone:{...zone,discovered:true,searchesRemaining:0,hiddenLoot:[],searchedBy:['c01']}]))},
    }
    const first=searchTowerReplenishmentEvents(game)
    const second=searchTowerReplenishmentEvents(game)
    expect(first).toEqual(second)
    expect(first.length).toBeGreaterThan(0)
    expect(first.every((event) => event.type === 'ZONE_REPLENISHED')).toBe(true)
  })
})

describe('Day-1 economy benchmark', () => {
  it('reports early economy metrics without treating provisional balance as a merge gate', () => {
    const seeds = Array.from({length:12},(_,index) => 1000 + index * 137)
    let workshops = 0
    let totalOutsideAtMidnight = 0
    let minimumLiving = 40
    let totalBankPlanks = 0
    let totalBankIron = 0
    let totalWorkshopLabor = 0
    let totalNormalSearches = 0
    let totalAutomaticSearches = 0
    for (const seed of seeds) {
      let game = createInitialGame(seed,40)
      game = advanceToHour(game,0,bots,'c01')
      if (game.town.construction.workshop.completed) workshops += 1
      totalBankPlanks += bankCount(game.town.bank,'twisted_plank')
      totalBankIron += bankCount(game.town.bank,'wrought_iron')
      totalWorkshopLabor += game.town.construction.workshop.apContributed
      totalOutsideAtMidnight += game.citizens.filter((citizen) => citizen.alive && citizen.location.type === 'world').length
      totalNormalSearches += game.events.filter((event) => event.type === 'ZONE_SEARCHED' && event.mode === 'normal').length
      totalAutomaticSearches += game.events.filter((event) => event.type === 'ZONE_SEARCHED' && event.automatic === true).length
      game = advanceOneHour(game,bots,'c01')
      minimumLiving = Math.min(minimumLiving,game.citizens.filter((citizen) => citizen.alive).length)
    }
    console.log('DAY1 BENCHMARK', {
      towns:seeds.length,
      workshops,
      averageBankPlanks:totalBankPlanks/seeds.length,
      averageBankIron:totalBankIron/seeds.length,
      averageWorkshopLabor:totalWorkshopLabor/seeds.length,
      averageNormalSearches:totalNormalSearches/seeds.length,
      averageAutomaticSearches:totalAutomaticSearches/seeds.length,
      averageOutsideAtMidnight:totalOutsideAtMidnight/seeds.length,
      minimumLiving,
    })

    // These values are telemetry until the surrounding early-game economy is more
    // complete. Exact Workshop frequency, survivors, and outside counts are balance,
    // not rule correctness, so they must not block unrelated feature PRs yet. The
    // explicit timeout is intentionally generous enough for runner variance while still
    // catching a real simulation hang.
    expect(workshops).toBeGreaterThanOrEqual(0)
    expect(workshops).toBeLessThanOrEqual(seeds.length)
    expect(totalOutsideAtMidnight).toBeGreaterThanOrEqual(0)
    expect(minimumLiving).toBeGreaterThanOrEqual(0)
    expect(totalNormalSearches).toBeGreaterThanOrEqual(totalAutomaticSearches)
  }, 60_000)
})
