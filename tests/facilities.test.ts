import { describe, expect, it } from 'vitest'
import { getLegalActions } from '../src/core/actions'
import { executeCommand } from '../src/core/commands'
import { createInitialGame } from '../src/core/game'
import { DEPLETED_SCAVENGE_LOOT_POOL, NORMAL_SCAVENGE_LOOT_POOL } from '../src/core/items'
import type { GameState } from '../src/core/types'
import { zoneKey } from '../src/core/world'
import { availableScreens, FACILITY_SLOT_COUNT, facilitySlots, PRIMARY_SCREENS } from '../src/ui/navigation'

function command(game: GameState, citizenId: string, type: ReturnType<typeof getLegalActions>[number]['type']) {
  const action = getLegalActions(game, citizenId).find((candidate) => candidate.type === type)
  if (!action) throw new Error(`Missing ${type}`)
  return action
}
function outsideAt(game: GameState, x: number, y: number): GameState {return { ...game, citizens: game.citizens.map((citizen) => citizen.id === 'c01' ? { ...citizen, location: { type: 'world' as const, x, y } } : citizen) }}

describe('facility navigation', () => {
  it('keeps Town Records first in the primary navigation row', () => {
    const game=createInitialGame(123,2)
    const primary=PRIMARY_SCREENS.map((entry)=>entry.id)
    expect(primary).toEqual(['chronicle','home','well','bank','construction','world','citizens'])
    expect(availableScreens(game).map((entry)=>entry.id)).toEqual(primary)
    expect(primary).not.toContain('town')
  })

  it('keeps six stable facility slots and fills them without shifting primary screens', () => {
    const before=createInitialGame(123,2)
    expect(facilitySlots(before)).toHaveLength(FACILITY_SLOT_COUNT)
    expect(facilitySlots(before).every((entry)=>entry===null)).toBe(true)
    const after:GameState={...before,town:{...before.town,construction:{...before.town.construction,workshop:{...before.town.construction.workshop,completed:true,apContributed:25}}}}
    const slots=facilitySlots(after)
    expect(slots).toHaveLength(FACILITY_SLOT_COUNT)
    expect(slots[0]?.id).toBe('workshop')
    expect(slots[1]).toBeNull()
    expect(availableScreens(after).slice(0,PRIMARY_SCREENS.length).map((entry)=>entry.id)).toEqual(PRIMARY_SCREENS.map((entry)=>entry.id))
  })
})

describe('undepleted and depleted scavenging', () => {
  it('starts schema v15 and keeps low-grade Workshop feedstock out of the normal loot pool', () => {
    const game = createInitialGame(123, 2)
    expect(game.schemaVersion).toBe(15)
    expect(game.botMissions).toEqual({})
    expect(game.coordination.commitments).toEqual([])
    expect(game.clock).toEqual({ hour: 1, phase: 'day' })
    expect(NORMAL_SCAVENGE_LOOT_POOL).toContain('twisted_plank')
    expect(NORMAL_SCAVENGE_LOOT_POOL).toContain('wrought_iron')
    expect(NORMAL_SCAVENGE_LOOT_POOL).toContain('construction_kit')
    expect(NORMAL_SCAVENGE_LOOT_POOL).toContain('unshaped_concrete_block')
    expect(NORMAL_SCAVENGE_LOOT_POOL).not.toContain('rotten_log')
    expect(NORMAL_SCAVENGE_LOOT_POOL).not.toContain('scrap_metal')
    expect(DEPLETED_SCAVENGE_LOOT_POOL.every((type) => type === 'rotten_log' || type === 'scrap_metal')).toBe(true)
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

  it('lets a citizen comb a depleted zone once for Workshop feedstock', () => {
    let game = outsideAt(createInitialGame(456, 2), 1, 0)
    const key = zoneKey(1, 0)
    game = { ...game, world: { ...game.world, zones: { ...game.world.zones, [key]: { ...game.world.zones[key], zombies: 0, searchesRemaining: 0, hiddenLoot: [], searchedBy: ['c01'], depletedSearchedBy: [] } } } }
    expect(getLegalActions(game, 'c01').some((action) => action.type === 'SEARCH_ZONE')).toBe(true)
    const result = executeCommand(game, command(game, 'c01', 'SEARCH_ZONE'))
    const searched = result.events.find((event) => event.type === 'ZONE_SEARCHED')
    expect(searched?.type).toBe('ZONE_SEARCHED')
    if (searched?.type === 'ZONE_SEARCHED') {
      expect(searched.mode).toBe('depleted')
      expect(['rotten_log', 'scrap_metal']).toContain(searched.item?.type)
    }
    expect(result.state.world.zones[key].depletedSearchedBy).toContain('c01')
    expect(getLegalActions(result.state, 'c01').some((action) => action.type === 'SEARCH_ZONE')).toBe(false)
  })
})

describe('Workshop gating', () => {
  it('does not expose Workshop conversion commands before construction is complete', () => {
    let game = createInitialGame(321, 2)
    game = { ...game, town: { ...game.town, bank: { rotten_log: 2, scrap_metal: 2 } } }
    expect(getLegalActions(game, 'c01').some((action) => action.type === 'WORKSHOP_CONVERT')).toBe(false)
    game = { ...game, town: { ...game.town, construction: { ...game.town.construction, workshop: { id: 'workshop', completed: true, apContributed: 25 } } } }
    expect(getLegalActions(game, 'c01').some((action) => action.type === 'WORKSHOP_CONVERT')).toBe(true)
  })
})
