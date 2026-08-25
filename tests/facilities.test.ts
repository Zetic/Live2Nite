import { describe, expect, it } from 'vitest'
import { getLegalActions } from '../src/core/actions'
import { executeCommand } from '../src/core/commands'
import { createInitialGame } from '../src/core/game'
import { DEPLETED_SCAVENGE_LOOT_POOL, NORMAL_SCAVENGE_LOOT_POOL } from '../src/core/items'
import { isSpadeReplenishCommand } from '../src/core/scavenging'
import { MYHORDES_DEPLETED_ZONE_LOOT } from '../src/core/scavengeLoot'
import type { GameState } from '../src/core/types'
import { zoneKey } from '../src/core/world'
import { availableScreens, FACILITY_SLOT_COUNT, FACILITY_SLOT_ORDER, facilitySlots, PRIMARY_SCREENS } from '../src/ui/navigation'
import { bankFromCounts } from './bankFixtures'

function command(game: GameState, citizenId: string, type: ReturnType<typeof getLegalActions>[number]['type']) {
  const action = getLegalActions(game, citizenId).find((candidate) => candidate.type === type&&!isSpadeReplenishCommand(candidate))
  if (!action) throw new Error(`Missing ${type}`)
  return action
}
function outsideAt(game: GameState, x: number, y: number): GameState {return { ...game, citizens: game.citizens.map((citizen) => citizen.id === 'c01' ? { ...citizen, location: { type: 'world' as const, x, y } } : citizen) }}

describe('facility navigation', () => {
  it('keeps Town Records first, Citizens second, and Codex last in the primary navigation row', () => {
    const game=createInitialGame(123,2)
    const primary=PRIMARY_SCREENS.map((entry)=>entry.id)
    expect(primary).toEqual(['chronicle','citizens','home','well','bank','construction','world','codex'])
    expect(availableScreens(game).map((entry)=>entry.id)).toEqual(primary)
    expect(primary).not.toContain('town')
  })

  it('keeps seven fixed facility priorities while compacting built buttons left without gaps', () => {
    const before=createInitialGame(123,2)
    expect(FACILITY_SLOT_ORDER).toEqual(['upgrade_projects','watchtower','workshop','battlements','garbage_dump','catapult','tamer_s_trap_system'])
    expect(FACILITY_SLOT_COUNT).toBe(7)
    expect(facilitySlots(before)).toHaveLength(FACILITY_SLOT_COUNT)
    expect(facilitySlots(before).every((entry)=>entry===null)).toBe(true)
    const after:GameState={...before,town:{...before.town,construction:{
      ...before.town.construction,
      workshop:{...before.town.construction.workshop,completed:true,apContributed:25},
      watchtower:{...before.town.construction.watchtower,completed:true,apContributed:15},
    }}}
    const slots=facilitySlots(after)
    expect(slots).toHaveLength(FACILITY_SLOT_COUNT)
    expect(slots.slice(0,3).map((entry)=>entry?.id)).toEqual(['upgrade_projects','watchtower','workshop'])
    expect(slots.slice(3).every((entry)=>entry===null)).toBe(true)
    expect(availableScreens(after).slice(0,PRIMARY_SCREENS.length).map((entry)=>entry.id)).toEqual(PRIMARY_SCREENS.map((entry)=>entry.id))
  })
})

describe('undepleted and depleted scavenging', () => {
  it('starts the current schema and keeps low-grade Workshop feedstock out of the normal loot pool', () => {
    const game = createInitialGame(123, 2)
    expect(game.schemaVersion).toBe(19)
    expect(game.botMissions).toEqual({})
    expect(game.coordination.commitments).toEqual([])
    expect(game.clock).toEqual({ hour: 1, phase: 'day' })
    expect(NORMAL_SCAVENGE_LOOT_POOL).toContain('twisted_plank')
    expect(NORMAL_SCAVENGE_LOOT_POOL).toContain('wrought_iron')
    expect(NORMAL_SCAVENGE_LOOT_POOL).toContain('resource_pack')
    expect(NORMAL_SCAVENGE_LOOT_POOL).not.toContain('construction_kit')
    expect(NORMAL_SCAVENGE_LOOT_POOL).toContain('unshaped_concrete_block')
    expect(NORMAL_SCAVENGE_LOOT_POOL).not.toContain('rotten_log')
    expect(NORMAL_SCAVENGE_LOOT_POOL).not.toContain('scrap_metal')
    expect(DEPLETED_SCAVENGE_LOOT_POOL.every((type) => type === 'rotten_log' || type === 'scrap_metal')).toBe(true)
    expect(MYHORDES_DEPLETED_ZONE_LOOT.entries.map((entry)=>[entry.items[0]?.type,entry.weight])).toEqual([
      ['rotten_log',20],
      ['scrap_metal',12],
    ])
    expect(Object.values(game.world.zones).every((zone) => zone.hiddenLoot.every((type) => type !== 'rotten_log' && type !== 'scrap_metal'))).toBe(true)
  })

  it('uses normal loot while a zone is undepleted', () => {
    let game = outsideAt(createInitialGame(123, 2), 1, 0)
    const key = zoneKey(1, 0)
    game = { ...game, world: { ...game.world, zones: { ...game.world.zones, [key]: { ...game.world.zones[key], zombies: 0, searchesRemaining: 1, hiddenLoot: ['twisted_plank'], searchedBy: [], depletedSearchedBy: [] } } } }
    const result = executeCommand(game, command(game, 'c01', 'SEARCH_ZONE'))
    expect(result.events.some((event) => event.type === 'ZONE_SEARCHED' && event.mode === 'normal' && event.item?.type === 'twisted_plank')).toBe(true)
    expect(result.state.world.zones[key].searchesRemaining).toBe(0)
  })

  it('treats depleted scavenging as a probabilistic attempt without consuming a finite pool', () => {
    let game = outsideAt(createInitialGame(456, 2), 1, 0)
    const key = zoneKey(1, 0)
    game = { ...game, world: { ...game.world, zones: { ...game.world.zones, [key]: { ...game.world.zones[key], zombies: 0, searchesRemaining: 0, hiddenLoot: [], searchedBy: [], depletedSearchedBy: [] } } } }
    expect(getLegalActions(game, 'c01').some((action) => action.type === 'SEARCH_ZONE'&&!isSpadeReplenishCommand(action))).toBe(true)
    const originalRng=game.rngState
    const result = executeCommand(game, command(game, 'c01', 'SEARCH_ZONE'))
    const searched = result.events.find((event) => event.type === 'ZONE_SEARCHED')
    expect(searched?.type).toBe('ZONE_SEARCHED')
    if (searched?.type === 'ZONE_SEARCHED') {
      expect(searched.mode).toBe('depleted')
      if(searched.item)expect(['rotten_log', 'scrap_metal']).toContain(searched.item.type)
      expect(searched.rngStateAfter).not.toBe(originalRng)
    }
    expect(result.state.world.zones[key].searchesRemaining).toBe(0)
    expect(result.state.world.zones[key].hiddenLoot).toEqual([])
    expect(result.state.world.zones[key].depletedSearchedBy).toContain('c01')
    expect(getLegalActions(result.state, 'c01').some((action) => action.type === 'SEARCH_ZONE'&&!isSpadeReplenishCommand(action))).toBe(false)
  })
})

describe('Workshop gating', () => {
  it('does not expose Workshop conversion commands before construction is complete', () => {
    let game = createInitialGame(321, 2)
    game = { ...game, town: { ...game.town, bank: bankFromCounts({ rotten_log: 2, scrap_metal: 2 },'facility-workshop') } }
    expect(getLegalActions(game, 'c01').some((action) => action.type === 'WORKSHOP_CONVERT')).toBe(false)
    game = { ...game, town: { ...game.town, construction: { ...game.town.construction, workshop: { id: 'workshop', discovered: true, completed: true, apContributed: 25 } } } }
    expect(getLegalActions(game, 'c01').some((action) => action.type === 'WORKSHOP_CONVERT')).toBe(true)
  })
})
