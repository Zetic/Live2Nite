import { describe, expect, it } from 'vitest'
import { BasicBotController } from '../src/agents/BasicBotController'
import { createAgentDecisionContext } from '../src/agents/AgentDecisionContext'
import { createAgentWorldKnowledge } from '../src/agents/WorldKnowledge'
import { createInitialGame } from '../src/core/game'
import { zoneKey } from '../src/core/world'

describe('agent architecture boundaries', () => {
  it('hides authoritative zone details until the town has actually observed the zone', () => {
    const game = createInitialGame(9191, 4)
    const zone = Object.values(game.world.zones).find((candidate) => candidate.x !== 0 || candidate.y !== 0)!
    expect(zone.discovered).toBe(false)

    const unknown = createAgentWorldKnowledge(game).zone(zone.x, zone.y)!
    expect(unknown.discovered).toBe(false)
    expect(unknown.zombies).toBeNull()
    expect(unknown.searchesRemaining).toBeNull()
    expect(unknown.specialSite).toBeUndefined()

    const key = zoneKey(zone.x, zone.y)
    const discoveredOnly = {
      ...game,
      world: {
        ...game.world,
        zones: {
          ...game.world.zones,
          [key]: { ...zone, discovered: true },
        },
      },
    }
    const unobserved = createAgentWorldKnowledge(discoveredOnly).zone(zone.x, zone.y)!
    expect(unobserved.discovered).toBe(true)
    expect(unobserved.zombies).toBeNull()
    expect(unobserved.freshness).toBe('unknown')
    expect(unobserved.searchesRemaining).toBe(zone.searchesRemaining)
    expect(unobserved.specialSite).toEqual(zone.specialSite)

    const observed = {
      ...discoveredOnly,
      world: {
        ...discoveredOnly.world,
        intel: {
          ...discoveredOnly.world.intel,
          [key]: { observedZombies: zone.zombies, lastObservedDay: 1, lastObservedHour: 5 },
        },
      },
    }
    const known = createAgentWorldKnowledge(observed).zone(zone.x, zone.y)!
    expect(known.zombies).toBe(zone.zombies)
    expect(known.freshness).toBe('fresh')
  })

  it('keeps direct controller calls compatible with the simulation decision context', () => {
    const game = createInitialGame(2241014753, 40)
    const controller = new BasicBotController()
    const direct = controller.decide(game, 'c02')
    const contextual = controller.decide(createAgentDecisionContext(game), 'c02')
    expect(contextual).toEqual(direct)
  })
})
