import { describe, expect, it } from 'vitest'
import { BasicBotController } from '../src/agents/BasicBotController'
import { runBotPhase } from '../src/agents/runBotPhase'
import { executeCommand, InvalidCommandError } from '../src/core/commands'
import { createInitialGame, resolveNight } from '../src/core/game'

const bots = new BasicBotController()

describe('game core', () => {
  it('spends AP through commands instead of direct UI mutation', () => {
    const game = createInitialGame(123, 4)
    const result = executeCommand(game, { type: 'WORK_DEFENSE', citizenId: 'c01' })

    expect(result.state.citizens[0].ap).toBe(10)
    expect(result.state.town.defense).toBe(43)
    expect(result.events.map((event) => event.type)).toEqual(['AP_SPENT', 'DEFENSE_CHANGED'])
  })

  it('rejects actions when a citizen cannot pay the AP cost', () => {
    let game = createInitialGame(123, 2)
    for (let i = 0; i < 6; i += 1) {
      game = executeCommand(game, { type: 'GATHER_WATER', citizenId: 'c01' }).state
    }

    expect(() => executeCommand(game, { type: 'GATHER_WATER', citizenId: 'c01' }))
      .toThrow(InvalidCommandError)
  })

  it('lets bot controllers consume their own AP through normal commands', () => {
    const game = runBotPhase(createInitialGame(123, 4), bots)

    expect(game.citizens[0].ap).toBe(12)
    expect(game.citizens.slice(1).every((citizen) => citizen.ap === 0)).toBe(true)
  })

  it('produces deterministic nightly results for the same seed and commands', () => {
    const first = resolveNight(runBotPhase(createInitialGame(9001, 6), bots))
    const second = resolveNight(runBotPhase(createInitialGame(9001, 6), bots))

    expect(first.lastNight).toEqual(second.lastNight)
    expect(first.rngState).toBe(second.rngState)
    expect(first.day).toBe(2)
    expect(first.citizens.every((citizen) => citizen.ap === citizen.maxAp)).toBe(true)
  })
})
