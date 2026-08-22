import { useEffect, useMemo, useState } from 'react'
import { BasicBotController } from '../agents/BasicBotController'
import { runBotPhase } from '../agents/runBotPhase'
import { executeCommand, InvalidCommandError } from '../core/commands'
import { createInitialGame, resolveNight } from '../core/game'
import type { GameEvent, GameState } from '../core/types'
import { IndexedDbGameRepository } from '../persistence/IndexedDbGameRepository'
import './app.css'

const repository = new IndexedDbGameRepository()
const botController = new BasicBotController()

function newSeed(): number {
  const values = new Uint32Array(1)
  crypto.getRandomValues(values)
  return values[0] || 1
}

function describeEvent(event: GameEvent): string {
  switch (event.type) {
    case 'AP_SPENT': return `${event.citizenId} spent ${event.amount} AP.`
    case 'DEFENSE_CHANGED': return `Defense ${event.amount >= 0 ? '+' : ''}${event.amount}.`
    case 'WATER_CHANGED': return `Water ${event.amount >= 0 ? '+' : ''}${event.amount}.`
    case 'NIGHT_RESOLVED': return `Night ${event.day}: attack ${event.report.attackStrength} vs defense ${event.report.defenseBeforeAttack}${event.report.breached ? ' — BREACH' : ' — held'}.`
    case 'DAY_STARTED': return `Day ${event.day} began.`
  }
}

export function App() {
  const [game, setGame] = useState<GameState>(() => createInitialGame(1))
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    repository.load()
      .then((saved) => setGame(saved ?? createInitialGame(newSeed())))
      .catch(() => setGame(createInitialGame(newSeed())))
      .finally(() => setLoaded(true))
  }, [])

  useEffect(() => {
    if (loaded) void repository.save(game)
  }, [game, loaded])

  const player = game.citizens[0]
  const alive = useMemo(() => game.citizens.filter((citizen) => citizen.alive).length, [game.citizens])

  const act = (type: 'WORK_DEFENSE' | 'GATHER_WATER') => {
    try {
      setGame((current) => executeCommand(current, { type, citizenId: current.citizens[0].id }).state)
      setError(null)
    } catch (caught) {
      setError(caught instanceof InvalidCommandError ? caught.message : 'Action failed.')
    }
  }

  const endDay = () => {
    setGame((current) => resolveNight(runBotPhase(current, botController)))
    setError(null)
  }

  const reset = async () => {
    await repository.clear()
    setGame(createInitialGame(newSeed()))
    setError(null)
  }

  if (!loaded) return <main className="shell"><p>Loading town…</p></main>

  return (
    <main className="shell">
      <header className="hero">
        <div>
          <p className="eyebrow">LOCAL PROTOTYPE</p>
          <h1>Live2Nite</h1>
          <p className="subtitle">Day {game.day} · Seed {game.seed}</p>
        </div>
        <button className="secondary" onClick={() => void reset()}>Reset run</button>
      </header>

      <section className="stats" aria-label="Town status">
        <article><span>Population</span><strong>{alive}</strong></article>
        <article><span>Water</span><strong>{game.town.water}</strong></article>
        <article><span>Defense</span><strong>{game.town.defense}</strong></article>
        <article><span>Your AP</span><strong>{player.ap}/{player.maxAp}</strong></article>
      </section>

      {game.lastNight && (
        <section className={`night ${game.lastNight.breached ? 'danger' : ''}`}>
          <strong>Last night:</strong> attack {game.lastNight.attackStrength} vs defense {game.lastNight.defenseBeforeAttack}.{' '}
          {game.lastNight.breached ? 'The defenses were breached.' : 'The town held.'}
        </section>
      )}

      <div className="grid">
        <section className="panel">
          <h2>Town</h2>
          <p>Spend the human citizen's AP. Basic bots act automatically when the day ends.</p>
          <div className="actions">
            <button disabled={player.ap < 2} onClick={() => act('WORK_DEFENSE')}>Reinforce defenses <small>2 AP</small></button>
            <button disabled={player.ap < 2} onClick={() => act('GATHER_WATER')}>Gather water <small>2 AP</small></button>
            <button className="primary" onClick={endDay}>End day</button>
          </div>
          {error && <p className="error">{error}</p>}
        </section>

        <section className="panel">
          <h2>Citizens</h2>
          <div className="citizen-list">
            {game.citizens.slice(0, 12).map((citizen) => (
              <div className="citizen" key={citizen.id}>
                <span>{citizen.name}</span>
                <span>{citizen.controller === 'human' ? 'HUMAN' : 'BOT'} · {citizen.ap} AP</span>
              </div>
            ))}
            <p className="muted">+ {Math.max(0, game.citizens.length - 12)} additional citizens</p>
          </div>
        </section>

        <section className="panel log-panel">
          <h2>Event Log</h2>
          <ol className="log">
            {game.events.slice(-24).reverse().map((event, index) => (
              <li key={`${game.events.length - index}-${event.type}`}>{describeEvent(event)}</li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  )
}
