import { describe, expect, it } from 'vitest'
import { BasicBotController } from '../src/agents/BasicBotController'
import { runBotPhase } from '../src/agents/runBotPhase'
import { getLegalActions } from '../src/core/actions'
import { executeCommand, InvalidCommandError } from '../src/core/commands'
import { createInitialGame, resolveNight } from '../src/core/game'
import type { GameCommand, GameState, ItemType } from '../src/core/types'
import { STARTING_WELL_MAX, STARTING_WELL_MIN } from '../src/core/well'
import { zoneControl, zoneKey } from '../src/core/world'

const bots = new BasicBotController()

function command(game: GameState, citizenId: string, type: GameCommand['type']) {
  const action = getLegalActions(game, citizenId).find((candidate) => candidate.type === type)
  if (!action) throw new Error(`Missing ${type}`)
  return action
}

function itemCommand(game: GameState, citizenId: string, type: 'OPEN_CONTAINER'|'EAT_ITEM'|'DRINK_ITEM'|'MOVE_ITEM_TO_HOME'|'MOVE_ITEM_TO_RUCKSACK', itemId: string) {
  const action = getLegalActions(game, citizenId).find((candidate) => candidate.type === type && 'itemId' in candidate && candidate.itemId === itemId)
  if (!action) throw new Error(`Missing ${type} for ${itemId}`)
  return action
}

function withWorkshopResources(game: GameState): GameState {
  return { ...game, town: { ...game.town, bank: { ...game.town.bank, twisted_plank: 10, wrought_iron: 8, unshaped_concrete_block: 1 } } }
}

function withInventory(game: GameState, types: ItemType[]): GameState {
  return {
    ...game,
    citizens: game.citizens.map((citizen) => citizen.id === 'c01'
      ? { ...citizen, inventory: types.map((type,index) => ({ id:`test-${index}`, type })) }
      : citizen),
  }
}

describe('Citizen homes, starter supplies, and well', () => {
  it('starts schema v5 citizens with a Camp Bed, four chest slots, and both starter packages', () => {
    const game = createInitialGame(123, 4)
    expect(game.schemaVersion).toBe(5)
    expect(game.citizens.every((citizen) => citizen.ap === 6 && citizen.inventoryCapacity === 4)).toBe(true)
    expect(game.citizens.every((citizen) => citizen.home.level === 'camp_bed' && citizen.home.defense === 0 && citizen.home.storageCapacity === 4)).toBe(true)
    expect(game.citizens.every((citizen) => citizen.home.storage.map((item) => item.type).sort().join(',') === 'citizen_welcome_pack,doggy_bag')).toBe(true)
  })

  it('creates deterministic starting well water in the verified 80–140 range', () => {
    const first = createInitialGame(123, 4)
    const second = createInitialGame(123, 4)
    expect(first.town.well.water).toBeGreaterThanOrEqual(STARTING_WELL_MIN)
    expect(first.town.well.water).toBeLessThanOrEqual(STARTING_WELL_MAX)
    expect(second.town.well.water).toBe(first.town.well.water)
  })

  it('moves personal items between the home chest and rucksack for zero AP', () => {
    let game = createInitialGame(123, 2)
    const bag = game.citizens[0].home.storage.find((item) => item.type === 'doggy_bag')!
    game = executeCommand(game, itemCommand(game,'c01','MOVE_ITEM_TO_RUCKSACK',bag.id)).state
    expect(game.citizens[0].ap).toBe(6)
    expect(game.citizens[0].inventory.some((item) => item.id === bag.id)).toBe(true)
    game = executeCommand(game, itemCommand(game,'c01','MOVE_ITEM_TO_HOME',bag.id)).state
    expect(game.citizens[0].ap).toBe(6)
    expect(game.citizens[0].home.storage.some((item) => item.id === bag.id)).toBe(true)
  })

  it('opens the Doggy Bag into ordinary food without consuming a storage slot', () => {
    let game = createInitialGame(123, 2)
    const bag = game.citizens[0].home.storage.find((item) => item.type === 'doggy_bag')!
    const beforeLength = game.citizens[0].home.storage.length
    game = executeCommand(game, itemCommand(game,'c01','OPEN_CONTAINER',bag.id)).state
    expect(game.citizens[0].home.storage).toHaveLength(beforeLength)
    expect(game.citizens[0].home.storage.some((item) => item.type === 'food')).toBe(true)
    expect(game.citizens[0].home.storage.some((item) => item.type === 'doggy_bag')).toBe(false)
  })

  it('opens the Welcome Pack into the small verified starter-content pool deterministically', () => {
    const open = (seed: number) => {
      let game = createInitialGame(seed, 2)
      const pack = game.citizens[0].home.storage.find((item) => item.type === 'citizen_welcome_pack')!
      game = executeCommand(game, itemCommand(game,'c01','OPEN_CONTAINER',pack.id)).state
      return game.citizens[0].home.storage.find((item) => item.id.startsWith('i'))?.type
    }
    const first = open(9988)
    expect(['battery','box_of_matches','pharmaceutical_products']).toContain(first)
    expect(open(9988)).toBe(first)
  })

  it('allows one water-ration withdrawal per citizen each day and decrements the well', () => {
    let game = createInitialGame(123, 2)
    const before = game.town.well.water
    game = executeCommand(game, command(game,'c01','TAKE_WATER')).state
    expect(game.town.well.water).toBe(before - 1)
    expect(game.citizens[0].daily.waterTaken).toBe(true)
    expect(game.citizens[0].inventory.some((item) => item.type === 'water_ration')).toBe(true)
    expect(getLegalActions(game,'c01').some((action) => action.type === 'TAKE_WATER')).toBe(false)
  })

  it('blocks well withdrawal when the rucksack is full', () => {
    let game = withInventory(createInitialGame(123, 1), ['food','food','food','food'])
    expect(getLegalActions(game,'c01').some((action) => action.type === 'TAKE_WATER')).toBe(false)
    game = { ...game, citizens: game.citizens.map((citizen) => ({ ...citizen, inventory: citizen.inventory.slice(0,3) })) }
    expect(getLegalActions(game,'c01').some((action) => action.type === 'TAKE_WATER')).toBe(true)
  })

  it('treats food and water as separate once-per-day AP refreshes and resets them next day', () => {
    let game = withInventory(createInitialGame(123, 1), ['food','water_ration'])
    game = { ...game, citizens: game.citizens.map((citizen) => ({ ...citizen, ap: 0 })) }
    game = executeCommand(game, itemCommand(game,'c01','EAT_ITEM','test-0')).state
    expect(game.citizens[0].ap).toBe(6)
    expect(game.citizens[0].daily.ate).toBe(true)
    game = { ...game, citizens: game.citizens.map((citizen) => ({ ...citizen, ap: 0 })) }
    game = executeCommand(game, itemCommand(game,'c01','DRINK_ITEM','test-1')).state
    expect(game.citizens[0].ap).toBe(6)
    expect(game.citizens[0].daily.drank).toBe(true)
    expect(getLegalActions(game,'c01').some((action) => action.type === 'EAT_ITEM' || action.type === 'DRINK_ITEM')).toBe(false)
    game = resolveNight(game)
    expect(game.citizens[0].daily).toEqual({ ate:false, drank:false, waterTaken:false })
  })

  it('allows carried food and water to be used outside', () => {
    let game = withInventory(createInitialGame(123, 1), ['food','water_ration'])
    game = executeCommand(game, command(game,'c01','OPEN_GATE')).state
    game = executeCommand(game, command(game,'c01','EXIT_TOWN')).state
    const legal = getLegalActions(game,'c01')
    expect(legal.some((action) => action.type === 'EAT_ITEM')).toBe(true)
    expect(legal.some((action) => action.type === 'DRINK_ITEM')).toBe(true)
  })
})

describe('World Beyond gameplay', () => {
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

  it('can withdraw a shared bank item and removes its bank-defense value', () => {
    let game = withInventory(createInitialGame(123, 1), ['old_door'])
    game = executeCommand(game, command(game,'c01','DEPOSIT_ITEM')).state
    expect(game.town.defense).toBe(42)
    game = executeCommand(game, command(game,'c01','WITHDRAW_BANK_ITEM')).state
    expect(game.town.bank.old_door).toBe(0)
    expect(game.town.defense).toBe(40)
    expect(game.citizens[0].inventory.some((item) => item.type === 'old_door')).toBe(true)
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

  it('lets bots spend their real AP on a ready Workshop project without draining the well or starter supplies', () => {
    const initial = withWorkshopResources(createInitialGame(321, 8))
    const waterBefore = initial.town.well.water
    const game = runBotPhase(initial, bots)
    expect(game.town.construction.workshop.completed).toBe(true)
    expect(game.events.some((e) => e.type === 'CONSTRUCTION_COMPLETED' && e.projectId === 'workshop')).toBe(true)
    expect(game.town.well.water).toBe(waterBefore)
    expect(game.citizens.slice(1).every((citizen) => citizen.home.storage.length === 2)).toBe(true)
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
    expect(first.town.well).toEqual(second.town.well)
    expect(first.lastNight).toEqual(second.lastNight)
    expect(() => executeCommand(createInitialGame(1, 2), { type: 'MOVE', citizenId: 'c01', direction: 'EAST' })).toThrow(InvalidCommandError)
  })
})
