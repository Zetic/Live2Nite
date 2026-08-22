import { describe, expect, it } from 'vitest'
import { BasicBotController } from '../src/agents/BasicBotController'
import { getLegalActions } from '../src/core/actions'
import { createInitialGame } from '../src/core/game'
import type { BotMissionAssignment, GameState } from '../src/core/types'
import { zoneKey } from '../src/core/world'
import { advanceOneHour, advanceToHour, InvalidTimeAdvanceError } from '../src/simulation/advanceTime'

const bots = new BasicBotController()

function clearPath(game: GameState, fromX: number, toX = 0): GameState {
  const zones = { ...game.world.zones }
  for (let x = Math.min(fromX,toX); x <= Math.max(fromX,toX); x += 1) {
    const key = zoneKey(x,0)
    zones[key] = { ...zones[key], discovered: true, zombies: 0 }
  }
  return { ...game, world: { ...game.world, zones } }
}

function botOutsideAt(game: GameState, x: number, ap: number): GameState {
  return clearPath({
    ...game,
    town: { ...game.town, gateOpen: true },
    citizens: game.citizens.map((citizen) => citizen.id === 'c02'
      ? { ...citizen, ap, location: { type: 'world' as const, x, y: 0 }, inventory: [] }
      : citizen),
  },x)
}

function scoutMission(): BotMissionAssignment {
  return { missionId:'clock-scout', role:'scout', purpose:'explore', target:{x:1,y:0}, targetLabel:'Scout [1,0]', reason:'clock ordering test', phase:'prepare', assignedDay:1, assignedHour:9, returnByHour:20, safetyReserve:1, emergency:false }
}

describe('game clock', () => {
  it('starts a new town at 1:00 AM in schema v10', () => {
    const game = createInitialGame(123,2)
    expect(game.schemaVersion).toBe(10)
    expect(game.day).toBe(1)
    expect(game.clock).toEqual({ hour: 1, phase: 'day' })
    expect(game.events[0]).toMatchObject({ type: 'DAY_STARTED', day: 1, hour: 1 })
  })

  it('lets autonomous citizens finish the current hour before the clock advances', () => {
    let initial: GameState = { ...createInitialGame(123,2), clock: { hour: 9, phase: 'day' }, botMissions:{ c02:scoutMission() } }
    initial = clearPath(initial,1)
    const beforeEvents = initial.events.length
    const game = advanceOneHour(initial,bots,'c01')
    expect(game.clock).toEqual({ hour: 10, phase: 'day' })
    const newEvents = game.events.slice(beforeEvents)
    const botEventIndex = newEvents.findIndex((event) => 'citizenId' in event && event.citizenId === 'c02')
    const timeEventIndex = newEvents.findIndex((event) => event.type === 'TIME_ADVANCED')
    expect(botEventIndex).toBeGreaterThanOrEqual(0)
    expect(timeEventIndex).toBeGreaterThan(botEventIndex)
    expect(newEvents.filter((event) => 'citizenId' in event && event.citizenId === 'c02').every((event) => event.hour === 9)).toBe(true)
  })

  it('does not impose a one-move-per-hour rule at 23:00', () => {
    let initial = botOutsideAt(createInitialGame(456,2),4,4)
    initial = { ...initial, clock: { hour: 23, phase: 'day' } }
    const beforeEvents = initial.events.length
    const game = advanceOneHour(initial,bots,'c01')
    const bot = game.citizens.find((citizen) => citizen.id === 'c02')!
    const hourEvents = game.events.slice(beforeEvents)
    const moves = hourEvents.filter((event) => event.type === 'CITIZEN_LOCATION_CHANGED' && event.citizenId === 'c02' && event.location.type === 'world')
    expect(moves.length).toBeGreaterThanOrEqual(4)
    expect(moves.every((event) => event.hour === 23)).toBe(true)
    expect(bot.location).toEqual({ type: 'town' })
    expect(bot.ap).toBe(0)
    expect(game.clock).toEqual({ hour: 0, phase: 'attack' })
  })

  it('leaves a bot stranded at midnight when it cannot cover the return distance', () => {
    let initial = botOutsideAt(createInitialGame(789,2),4,3)
    initial = { ...initial, clock: { hour: 23, phase: 'day' } }
    let game = advanceOneHour(initial,bots,'c01')
    const stranded = game.citizens.find((citizen) => citizen.id === 'c02')!
    expect(stranded.location).toEqual({ type: 'world', x: 1, y: 0 })
    expect(stranded.ap).toBe(0)
    expect(game.clock.phase).toBe('attack')

    game = advanceOneHour(game,bots,'c01')
    expect(game.day).toBe(2)
    expect(game.clock).toEqual({ hour: 1, phase: 'day' })
    expect(game.citizens.find((citizen) => citizen.id === 'c02')?.alive).toBe(false)
    expect(game.events.some((event) => event.type === 'CITIZEN_DIED' && event.citizenId === 'c02' && event.reason === 'outside_at_night' && event.hour === 0)).toBe(true)
  })

  it('locks normal actions during the midnight attack and resets daily state at 1 AM', () => {
    let game = createInitialGame(2468,2)
    game = {
      ...game,
      clock: { hour: 0, phase: 'attack' },
      citizens: game.citizens.map((citizen) => citizen.id === 'c01' ? { ...citizen, ap: 0, daily: { ate: true, drank: true, waterTaken: true } } : citizen),
    }
    expect(getLegalActions(game,'c01')).toHaveLength(0)
    game = advanceOneHour(game,bots,'c01')
    expect(game.day).toBe(2)
    expect(game.clock).toEqual({ hour: 1, phase: 'day' })
    expect(game.citizens[0].ap).toBe(6)
    expect(game.citizens[0].daily).toEqual({ ate: false, drank: false, waterTaken: false })
    expect(game.botMissions).toEqual({})
  })

  it('fast-forward simulates every intermediate hour instead of teleporting', () => {
    const initial = { ...createInitialGame(1357,2), clock: { hour: 9, phase: 'day' as const } }
    const beforeEvents = initial.events.length
    const game = advanceToHour(initial,12,bots,'c01')
    expect(game.clock.hour).toBe(12)
    const advances = game.events.slice(beforeEvents).filter((event) => event.type === 'TIME_ADVANCED')
    expect(advances.map((event) => event.type === 'TIME_ADVANCED' ? [event.fromHour,event.toHour] : [])).toEqual([[9,10],[10,11],[11,12]])
  })

  it('never interprets a past shortcut as tomorrow', () => {
    const game = { ...createInitialGame(99,2), clock: { hour: 14, phase: 'day' as const } }
    expect(() => advanceToHour(game,12,bots,'c01')).toThrow(InvalidTimeAdvanceError)
  })

  it('advances the clock while keeping the temporarily controlled bot out of automation', () => {
    const initial = { ...createInitialGame(999,2), clock: { hour: 9, phase: 'day' as const } }
    const before = initial.citizens.find((citizen) => citizen.id === 'c02')!
    const game = advanceOneHour(initial,bots,'c02')
    const after = game.citizens.find((citizen) => citizen.id === 'c02')!
    expect(after.ap).toBe(before.ap)
    expect(after.location).toEqual(before.location)
    expect(after.inventory).toEqual(before.inventory)
    expect(game.clock.hour).toBe(10)
  })
})
