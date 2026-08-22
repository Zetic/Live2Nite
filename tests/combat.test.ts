import { describe, expect, it } from 'vitest'
import { BasicBotController } from '../src/agents/BasicBotController'
import { runBotPhase } from '../src/agents/runBotPhase'
import { getLegalActions } from '../src/core/actions'
import { executeCommand } from '../src/core/commands'
import { createInitialGame } from '../src/core/game'
import { NORMAL_SCAVENGE_LOOT_POOL } from '../src/core/items'
import type { GameCommand, GameState, ItemType } from '../src/core/types'
import { zoneControl, zoneKey } from '../src/core/world'

const bots = new BasicBotController()

function combatState(citizenId: string, zombies: number, items: ItemType[] = [], ap = 6): GameState {
  const game = createInitialGame(12345, 4)
  const key = zoneKey(1, 0)
  return {
    ...game,
    citizens: game.citizens.map((citizen) => citizen.id === citizenId
      ? {
          ...citizen,
          ap,
          location: { type: 'world', x: 1, y: 0 },
          inventory: items.map((type, index) => ({ id: `combat-${index}`, type })),
        }
      : citizen),
    world: {
      ...game.world,
      zones: {
        ...game.world.zones,
        [key]: { ...game.world.zones[key], discovered: true, zombies },
      },
    },
  }
}

function action<T extends GameCommand['type']>(game: GameState, citizenId: string, type: T): Extract<GameCommand,{type:T}> {
  const found = getLegalActions(game, citizenId).find((candidate) => candidate.type === type)
  if (!found) throw new Error(`Missing ${type}`)
  return found as Extract<GameCommand,{type:T}>
}

describe('World Beyond combat', () => {
  it('makes a Water Bomb a rare normal-zone weapon find', () => {
    expect(NORMAL_SCAVENGE_LOOT_POOL).toContain('water_bomb')
  })

  it('uses a Water Bomb for 0 AP, consumes it, and kills between 1 and 5 zombies', () => {
    let game = combatState('c01', 5, ['water_bomb'])
    const beforeAp = game.citizens[0].ap
    game = executeCommand(game, action(game, 'c01', 'USE_WEAPON')).state
    const remaining = game.world.zones[zoneKey(1,0)].zombies
    expect(game.citizens[0].ap).toBe(beforeAp)
    expect(game.citizens[0].inventory).toHaveLength(0)
    expect(remaining).toBeGreaterThanOrEqual(0)
    expect(remaining).toBeLessThanOrEqual(4)
    expect(game.events.some((event) => event.type === 'COMBAT_RESOLVED' && event.method === 'water_bomb' && event.kills >= 1 && event.kills <= 5)).toBe(true)
  })

  it('does not allow ordinary weapon use while exhausted', () => {
    const game = combatState('c01', 3, ['water_bomb'], 0)
    const legal = getLegalActions(game, 'c01')
    expect(legal.some((candidate) => candidate.type === 'USE_WEAPON')).toBe(false)
    expect(legal.some((candidate) => candidate.type === 'ATTACK_BAREHANDED')).toBe(false)
  })

  it('charges 1 AP for bare-handed combat and records a deterministic 0-or-1 kill result', () => {
    const initial = combatState('c01', 3)
    const first = executeCommand(initial, action(initial, 'c01', 'ATTACK_BAREHANDED')).state
    const second = executeCommand(combatState('c01', 3), action(combatState('c01', 3), 'c01', 'ATTACK_BAREHANDED')).state
    const firstRemaining = first.world.zones[zoneKey(1,0)].zombies
    const secondRemaining = second.world.zones[zoneKey(1,0)].zombies
    expect(first.citizens[0].ap).toBe(5)
    expect([2,3]).toContain(firstRemaining)
    expect(secondRemaining).toBe(firstRemaining)
  })

  it('immediately restores movement when combat removes enough zombie control', () => {
    let game = combatState('c01', 3, ['water_bomb'])
    expect(zoneControl(game,1,0).trapped).toBe(true)
    game = executeCommand(game, action(game, 'c01', 'USE_WEAPON')).state
    expect(zoneControl(game,1,0).trapped).toBe(false)
    expect(getLegalActions(game,'c01').some((candidate) => candidate.type === 'MOVE')).toBe(true)
  })

  it('lets a trapped basic bot use a carried weapon instead of waiting helplessly', () => {
    const game = combatState('c02', 3, ['water_bomb'])
    const decision = bots.decide(game,'c02')
    expect(decision?.type).toBe('USE_WEAPON')
  })
})

describe('Temporary citizen control testing hook', () => {
  it('excludes the controlled basic-bot citizen from autonomous activity', () => {
    const initial = createInitialGame(789,4)
    const controlledBefore = initial.citizens.find((citizen)=>citizen.id==='c02')!
    const game = runBotPhase(initial,bots,'c02')
    const controlledAfter = game.citizens.find((citizen)=>citizen.id==='c02')!
    expect(controlledAfter.ap).toBe(controlledBefore.ap)
    expect(controlledAfter.location).toEqual(controlledBefore.location)
    expect(controlledAfter.inventory).toEqual(controlledBefore.inventory)
    expect(controlledAfter.home).toEqual(controlledBefore.home)
  })
})
