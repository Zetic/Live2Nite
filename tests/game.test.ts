import { describe, expect, it } from 'vitest'
import { BasicBotController } from '../src/agents/BasicBotController'
import { runBotPhase } from '../src/agents/runBotPhase'
import { getLegalActions } from '../src/core/actions'
import { executeCommand, InvalidCommandError } from '../src/core/commands'
import { createInitialGame, resolveNight } from '../src/core/game'
import type { GameState } from '../src/core/types'
import { zoneControl, zoneKey } from '../src/core/world'

const bots = new BasicBotController()

function command(game: GameState, citizenId: string, type: ReturnType<typeof getLegalActions>[number]['type']) {
  const action = getLegalActions(game, citizenId).find((candidate) => candidate.type === type)
  if (!action) throw new Error(`Missing ${type}`)
  return action
}

function withWorkshopResources(game: GameState): GameState {
  return { ...game, town: { ...game.town, bank: { ...game.town.bank, twisted_plank: 10, wrought_iron: 8, unshaped_concrete_block: 1 } } }
}

describe('World Beyond gameplay', () => {
  it('starts citizens with 6 AP, 4 inventory slots, and schema v3 construction state', () => {
    const game = createInitialGame(123, 4)
    expect(game.schemaVersion).toBe(3)
    expect(game.citizens.every((c) => c.ap === 6 && c.inventoryCapacity === 4)).toBe(true)
    expect(game.town.construction.workshop.completed).toBe(false)
    expect(Object.keys(game.world.zones)).toHaveLength(14 * 13)
  })

  it('charges 1 AP to open the gate and 0 AP to exit', () => {
    let game = createInitialGame(123, 2)
    game = executeCommand(game, command(game, 'c01', 'OPEN_GATE')).state
    expect(game.citizens[0].ap).toBe(5)
    game = executeCommand(game, command(game, 'c01', 'EXIT_TOWN')).state
    expect(game.citizens[0].ap).toBe(5)
    expect(game.citizens[0].location).toEqual({ type: 'world', x: 0, y: 0 })
  })

  it('charges 1 AP for cardinal movement and discovers a zone', () => {
    let game = createInitialGame(123, 2)
    game = executeCommand(game, command(game, 'c01', 'OPEN_GATE')).state
    game = executeCommand(game, command(game, 'c01', 'EXIT_TOWN')).state
    const east = getLegalActions(game, 'c01').find((a) => a.type === 'MOVE' && a.direction === 'EAST')!
    game = executeCommand(game, east).state
    expect(game.citizens[0].ap).toBe(4)
    expect(game.world.zones[zoneKey(1, 0)].discovered).toBe(true)
  })

  it('blocks movement while trapped but still permits a manual search', () => {
    let game = createInitialGame(123, 2)
    game = executeCommand(game, command(game, 'c01', 'OPEN_GATE')).state
    game = executeCommand(game, command(game, 'c01', 'EXIT_TOWN')).state
    game = executeCommand(game, getLegalActions(game, 'c01').find((a) => a.type === 'MOVE' && a.direction === 'EAST')!).state
    const key = zoneKey(1, 0)
    game = { ...game, world: { ...game.world, zones: { ...game.world.zones, [key]: { ...game.world.zones[key], zombies: 3, searchesRemaining: 1, hiddenLoot: ['food'] } } } }
    expect(getLegalActions(game, 'c01').some((a) => a.type === 'MOVE')).toBe(false)
    expect(getLegalActions(game, 'c01').some((a) => a.type === 'SEARCH_ZONE')).toBe(true)
  })

  it('lets autonomous citizens rescue a trapped human during the day', () => {
    let game = createInitialGame(123, 4)
    game = executeCommand(game, command(game, 'c01', 'OPEN_GATE')).state
    game = executeCommand(game, command(game, 'c01', 'EXIT_TOWN')).state
    for (let i = 0; i < 2; i += 1) game = executeCommand(game, getLegalActions(game, 'c01').find((a) => a.type === 'MOVE' && a.direction === 'EAST')!).state
    const key = zoneKey(2, 0)
    game = { ...game, world: { ...game.world, zones: { ...game.world.zones, [key]: { ...game.world.zones[key], zombies: 3 } } } }
    expect(zoneControl(game, 2, 0).trapped).toBe(true)
    game = runBotPhase(game, bots)
    expect(zoneControl(game, 2, 0).trapped).toBe(false)
  })

  it('searches for 0 AP and deposits scavenged resources into the bank', () => {
    let game = createInitialGame(123, 2)
    game = executeCommand(game, command(game, 'c01', 'OPEN_GATE')).state
    game = executeCommand(game, command(game, 'c01', 'EXIT_TOWN')).state
    game = executeCommand(game, getLegalActions(game, 'c01').find((a) => a.type === 'MOVE' && a.direction === 'EAST')!).state
    const key = zoneKey(1, 0)
    game = { ...game, world: { ...game.world, zones: { ...game.world.zones, [key]: { ...game.world.zones[key], zombies: 0, searchesRemaining: 1, hiddenLoot: ['scrap_metal'] } } } }
    const before = game.citizens[0].ap
    game = executeCommand(game, command(game, 'c01', 'SEARCH_ZONE')).state
    expect(game.citizens[0].ap).toBe(before)
    game = executeCommand(game, command(game, 'c01', 'PICK_UP_ITEM')).state
    game = executeCommand(game, getLegalActions(game, 'c01').find((a) => a.type === 'MOVE' && a.direction === 'WEST')!).state
    game = executeCommand(game, command(game, 'c01', 'ENTER_TOWN')).state
    game = executeCommand(game, command(game, 'c01', 'DEPOSIT_ITEM')).state
    expect(game.town.bank.scrap_metal).toBe(1)
  })

  it('adds bank defense from a defensive object', () => {
    let game = createInitialGame(123, 2)
    game = { ...game, citizens: game.citizens.map((c) => c.id === 'c01' ? { ...c, inventory: [{ id: 'door', type: 'old_door' }] } : c) }
    game = executeCommand(game, command(game, 'c01', 'DEPOSIT_ITEM')).state
    expect(game.town.defense).toBe(42)
  })
})

describe('Town construction and Workshop', () => {
  it('does not allow project labor without every required material', () => {
    const game = createInitialGame(321, 2)
    expect(getLegalActions(game, 'c01').some((a) => a.type === 'CONTRIBUTE_CONSTRUCTION')).toBe(false)
  })

  it('retains materials while construction is incomplete', () => {
    let game = withWorkshopResources(createInitialGame(321, 2))
    const before = { ...game.town.bank }
    game = executeCommand(game, command(game, 'c01', 'CONTRIBUTE_CONSTRUCTION')).state
    expect(game.town.construction.workshop.apContributed).toBe(1)
    expect(game.town.bank).toEqual(before)
  })

  it('consumes materials only on Workshop completion', () => {
    let game = withWorkshopResources(createInitialGame(321, 2))
    game = { ...game, town: { ...game.town, construction: { ...game.town.construction, workshop: { ...game.town.construction.workshop, apContributed: 24 } } } }
    game = executeCommand(game, command(game, 'c01', 'CONTRIBUTE_CONSTRUCTION')).state
    expect(game.town.construction.workshop.completed).toBe(true)
    expect(game.town.bank.twisted_plank).toBe(0)
    expect(game.town.bank.wrought_iron).toBe(0)
    expect(game.town.bank.unshaped_concrete_block).toBe(0)
  })

  it('converts 2 raw resources into 1 refined resource for 3 AP', () => {
    let game = createInitialGame(321, 2)
    game = { ...game, town: { ...game.town, bank: { rotten_log: 2 }, construction: { ...game.town.construction, workshop: { id: 'workshop', apContributed: 25, completed: true } } } }
    const action = getLegalActions(game, 'c01').find((a) => a.type === 'WORKSHOP_CONVERT' && a.recipeId === 'logs_to_planks')!
    game = executeCommand(game, action).state
    expect(game.citizens[0].ap).toBe(3)
    expect(game.town.bank.rotten_log).toBe(0)
    expect(game.town.bank.twisted_plank).toBe(1)
  })

  it('completing the Watchtower adds +3 town defense', () => {
    let game = createInitialGame(321, 2)
    game = { ...game, town: { ...game.town, bank: { twisted_plank: 3, wrought_iron: 2 }, construction: { ...game.town.construction, watchtower: { id: 'watchtower', apContributed: 11, completed: false } } } }
    const action = getLegalActions(game, 'c01').find((a) => a.type === 'CONTRIBUTE_CONSTRUCTION' && a.projectId === 'watchtower')!
    game = executeCommand(game, action).state
    expect(game.town.construction.watchtower.completed).toBe(true)
    expect(game.town.defense).toBe(43)
  })

  it('lets bots spend their real AP on a ready Workshop project', () => {
    const game = runBotPhase(withWorkshopResources(createInitialGame(321, 8)), bots)
    expect(game.town.construction.workshop.completed).toBe(true)
    expect(game.events.some((e) => e.type === 'CONSTRUCTION_COMPLETED' && e.projectId === 'workshop')).toBe(true)
  })
})

describe('Night resolution', () => {
  it('kills citizens outside at night while camping is deferred', () => {
    let game = createInitialGame(123, 2)
    game = executeCommand(game, command(game, 'c01', 'OPEN_GATE')).state
    game = executeCommand(game, command(game, 'c01', 'EXIT_TOWN')).state
    game = resolveNight(game)
    expect(game.citizens[0].alive).toBe(false)
  })

  it('keeps deterministic world/night output and rejects illegal commands', () => {
    const first = resolveNight(runBotPhase(createInitialGame(9001, 6), bots))
    const second = resolveNight(runBotPhase(createInitialGame(9001, 6), bots))
    expect(first.world).toEqual(second.world)
    expect(first.lastNight).toEqual(second.lastNight)
    expect(() => executeCommand(createInitialGame(1, 2), { type: 'MOVE', citizenId: 'c01', direction: 'EAST' })).toThrow(InvalidCommandError)
  })
})
