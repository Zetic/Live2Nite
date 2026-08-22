import { describe, expect, it } from 'vitest'
import { BasicBotController } from '../src/agents/BasicBotController'
import { runBotPhase } from '../src/agents/runBotPhase'
import { getLegalActions } from '../src/core/actions'
import { executeCommand, InvalidCommandError } from '../src/core/commands'
import { createInitialGame, resolveNight } from '../src/core/game'
import type { GameState } from '../src/core/types'
import { zoneControl, zoneKey } from '../src/core/world'

const bots = new BasicBotController()

function command<T extends ReturnType<typeof getLegalActions>[number]['type']>(
  game: GameState,
  citizenId: string,
  type: T,
) {
  const action = getLegalActions(game, citizenId).find((candidate) => candidate.type === type)
  if (!action) throw new Error(`Missing ${type}`)
  return action
}

describe('World Beyond gameplay', () => {
  it('starts ordinary citizens with the verified 6 AP and 4-slot rucksack', () => {
    const game = createInitialGame(123, 4)
    expect(game.citizens.every((citizen) => citizen.ap === 6 && citizen.maxAp === 6)).toBe(true)
    expect(game.citizens.every((citizen) => citizen.inventoryCapacity === 4)).toBe(true)
    expect(game.town.gateOpen).toBe(false)
    expect(Object.keys(game.world.zones)).toHaveLength(14 * 13)
  })

  it('charges 1 AP to open the gate and 0 AP to exit town', () => {
    let game = createInitialGame(123, 2)
    game = executeCommand(game, command(game, 'c01', 'OPEN_GATE')).state
    expect(game.citizens[0].ap).toBe(5)
    expect(game.town.gateOpen).toBe(true)

    game = executeCommand(game, command(game, 'c01', 'EXIT_TOWN')).state
    expect(game.citizens[0].ap).toBe(5)
    expect(game.citizens[0].location).toEqual({ type: 'world', x: 0, y: 0 })
  })

  it('charges 1 AP for cardinal movement and discovers the destination zone', () => {
    let game = createInitialGame(123, 2)
    game = executeCommand(game, command(game, 'c01', 'OPEN_GATE')).state
    game = executeCommand(game, command(game, 'c01', 'EXIT_TOWN')).state
    const east = getLegalActions(game, 'c01').find((action) => action.type === 'MOVE' && action.direction === 'EAST')
    if (!east) throw new Error('East movement should be legal')
    game = executeCommand(game, east).state

    expect(game.citizens[0].ap).toBe(4)
    expect(game.citizens[0].location).toEqual({ type: 'world', x: 1, y: 0 })
    expect(game.world.zones[zoneKey(1, 0)].discovered).toBe(true)
  })

  it('traps a lone ordinary citizen when zombie control exceeds 2 CP but still allows searching', () => {
    let game = createInitialGame(123, 2)
    game = executeCommand(game, command(game, 'c01', 'OPEN_GATE')).state
    game = executeCommand(game, command(game, 'c01', 'EXIT_TOWN')).state
    const east = getLegalActions(game, 'c01').find((action) => action.type === 'MOVE' && action.direction === 'EAST')!
    game = executeCommand(game, east).state
    const key = zoneKey(1, 0)
    game = {
      ...game,
      world: {
        ...game.world,
        zones: {
          ...game.world.zones,
          [key]: { ...game.world.zones[key], zombies: 3, searchesRemaining: 1, hiddenLoot: ['food'] },
        },
      },
    }

    expect(getLegalActions(game, 'c01').some((action) => action.type === 'MOVE')).toBe(false)
    expect(getLegalActions(game, 'c01').some((action) => action.type === 'SEARCH_ZONE')).toBe(true)
  })

  it('lets autonomous citizens rescue a trapped human during the day', () => {
    let game = createInitialGame(123, 4)
    game = executeCommand(game, command(game, 'c01', 'OPEN_GATE')).state
    game = executeCommand(game, command(game, 'c01', 'EXIT_TOWN')).state
    for (let step = 0; step < 2; step += 1) {
      const east = getLegalActions(game, 'c01').find((action) => action.type === 'MOVE' && action.direction === 'EAST')!
      game = executeCommand(game, east).state
    }

    const key = zoneKey(2, 0)
    game = {
      ...game,
      world: {
        ...game.world,
        zones: { ...game.world.zones, [key]: { ...game.world.zones[key], zombies: 3 } },
      },
    }
    expect(zoneControl(game, 2, 0).trapped).toBe(true)

    game = runBotPhase(game, bots)

    expect(zoneControl(game, 2, 0).trapped).toBe(false)
    expect(game.citizens.some((citizen) =>
      citizen.controller === 'basic-bot' &&
      citizen.location.type === 'world' &&
      citizen.location.x === 2 &&
      citizen.location.y === 0,
    )).toBe(true)
  })

  it('searches for 0 AP, puts loot on the ground, and only allows one manual search per citizen per zone', () => {
    let game = createInitialGame(123, 2)
    game = executeCommand(game, command(game, 'c01', 'OPEN_GATE')).state
    game = executeCommand(game, command(game, 'c01', 'EXIT_TOWN')).state
    const east = getLegalActions(game, 'c01').find((action) => action.type === 'MOVE' && action.direction === 'EAST')!
    game = executeCommand(game, east).state
    const beforeAp = game.citizens[0].ap
    const key = zoneKey(1, 0)
    game = {
      ...game,
      world: {
        ...game.world,
        zones: {
          ...game.world.zones,
          [key]: { ...game.world.zones[key], zombies: 0, searchesRemaining: 2, hiddenLoot: ['rotten_log', 'food'] },
        },
      },
    }

    game = executeCommand(game, command(game, 'c01', 'SEARCH_ZONE')).state
    expect(game.citizens[0].ap).toBe(beforeAp)
    expect(game.world.zones[key].groundItems[0].type).toBe('rotten_log')
    expect(getLegalActions(game, 'c01').some((action) => action.type === 'SEARCH_ZONE')).toBe(false)
  })

  it('picks up loot into the rucksack and deposits it into the shared bank', () => {
    let game = createInitialGame(123, 2)
    game = executeCommand(game, command(game, 'c01', 'OPEN_GATE')).state
    game = executeCommand(game, command(game, 'c01', 'EXIT_TOWN')).state
    const east = getLegalActions(game, 'c01').find((action) => action.type === 'MOVE' && action.direction === 'EAST')!
    game = executeCommand(game, east).state
    const key = zoneKey(1, 0)
    game = {
      ...game,
      world: {
        ...game.world,
        zones: {
          ...game.world.zones,
          [key]: { ...game.world.zones[key], zombies: 0, searchesRemaining: 1, hiddenLoot: ['scrap_metal'] },
        },
      },
    }
    game = executeCommand(game, command(game, 'c01', 'SEARCH_ZONE')).state
    game = executeCommand(game, command(game, 'c01', 'PICK_UP_ITEM')).state
    expect(game.citizens[0].inventory).toHaveLength(1)

    const west = getLegalActions(game, 'c01').find((action) => action.type === 'MOVE' && action.direction === 'WEST')!
    game = executeCommand(game, west).state
    game = executeCommand(game, command(game, 'c01', 'ENTER_TOWN')).state
    game = executeCommand(game, command(game, 'c01', 'DEPOSIT_ITEM')).state

    expect(game.citizens[0].inventory).toHaveLength(0)
    expect(game.town.bank.scrap_metal).toBe(1)
  })

  it('adds the documented defense value when a defensive object is banked', () => {
    let game = createInitialGame(123, 2)
    game = {
      ...game,
      citizens: game.citizens.map((citizen) => citizen.id === 'c01'
        ? { ...citizen, inventory: [{ id: 'test-door', type: 'old_door' }] }
        : citizen),
    }

    game = executeCommand(game, command(game, 'c01', 'DEPOSIT_ITEM')).state

    expect(game.town.bank.old_door).toBe(1)
    expect(game.town.defense).toBe(42)
  })

  it('kills citizens who end the day outside when camping is not implemented', () => {
    let game = createInitialGame(123, 2)
    game = executeCommand(game, command(game, 'c01', 'OPEN_GATE')).state
    game = executeCommand(game, command(game, 'c01', 'EXIT_TOWN')).state
    game = resolveNight(game)

    expect(game.citizens[0].alive).toBe(false)
    expect(game.lastNight?.outsideDeaths).toBe(1)
  })

  it('does not guarantee a day-one breach when the prototype gate is closed', () => {
    const game = resolveNight(createInitialGame(123, 2))
    expect(game.lastNight?.effectiveDefense).toBe(40)
    expect(game.lastNight?.attackStrength).toBeLessThanOrEqual(40)
    expect(game.lastNight?.breached).toBe(false)
  })

  it('keeps deterministic world and night results for the same seed and command sequence', () => {
    const first = resolveNight(runBotPhase(createInitialGame(9001, 6), bots))
    const second = resolveNight(runBotPhase(createInitialGame(9001, 6), bots))

    expect(first.world).toEqual(second.world)
    expect(first.lastNight).toEqual(second.lastNight)
    expect(first.rngState).toBe(second.rngState)
    expect(first.lastNight?.gateOpen).toBe(false)
  })

  it('rejects commands that are not currently legal', () => {
    const game = createInitialGame(123, 2)
    expect(() => executeCommand(game, { type: 'MOVE', citizenId: 'c01', direction: 'EAST' }))
      .toThrow(InvalidCommandError)
  })
})
