import { useEffect, useMemo, useState } from 'react'
import { BasicBotController } from '../agents/BasicBotController'
import { runBotPhase } from '../agents/runBotPhase'
import { getLegalActions } from '../core/actions'
import { executeCommand, InvalidCommandError } from '../core/commands'
import { createInitialGame, resolveNight } from '../core/game'
import type { Direction, GameCommand, GameEvent, GameState } from '../core/types'
import { getZone, zoneControl } from '../core/world'
import { IndexedDbGameRepository } from '../persistence/IndexedDbGameRepository'
import { CitizenRoster } from './components/CitizenRoster'
import { EventLog } from './components/EventLog'
import { TownView } from './components/TownView'
import { WorldMap } from './components/WorldMap'
import { WorldView } from './components/WorldView'
import { citizenName } from './eventText'
import './app.css'

const repository = new IndexedDbGameRepository()
const botController = new BasicBotController()

function newSeed(): number { const values = new Uint32Array(1); crypto.getRandomValues(values); return values[0] || 1 }

export function App() {
  const [game, setGame] = useState<GameState>(() => createInitialGame(1))
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { repository.load().then((saved) => setGame(saved ?? createInitialGame(newSeed()))).catch(() => setGame(createInitialGame(newSeed()))).finally(() => setLoaded(true)) }, [])
  useEffect(() => { if (loaded) void repository.save(game) }, [game, loaded])

  const player = game.citizens[0]
  const alive = useMemo(() => game.citizens.filter((citizen) => citizen.alive).length, [game.citizens])
  const outsideCitizens = useMemo(() => game.citizens.filter((citizen) => citizen.alive && citizen.location.type === 'world'), [game.citizens])
  const legalActions = useMemo(() => getLegalActions(game, player.id), [game, player.id])
  const currentZone = player.location.type === 'world' ? getZone(game.world, player.location.x, player.location.y) : null
  const control = player.location.type === 'world' ? zoneControl(game, player.location.x, player.location.y) : null
  const completedProjects = useMemo(() => Object.values(game.town.construction).filter((project) => project.completed).length, [game.town.construction])
  const lastNightDeathNames = useMemo(() => {
    if (!game.lastNight) return []
    return game.events.filter((event): event is Extract<GameEvent,{type:'CITIZEN_DIED'}> => event.type === 'CITIZEN_DIED' && event.day === game.lastNight?.day).map((event) => citizenName(game,event.citizenId))
  }, [game])

  const act = (command: GameCommand | undefined) => {
    if (!command) return
    try { setGame((current) => executeCommand(current, command).state); setError(null) }
    catch (caught) { setError(caught instanceof InvalidCommandError ? caught.message : 'Action failed.') }
  }
  const move = (direction: Direction) => act(legalActions.find((action): action is Extract<GameCommand,{type:'MOVE'}> => action.type === 'MOVE' && action.direction === direction))
  const runCitizens = () => { setGame((current) => runBotPhase(current, botController)); setError(null) }
  const endDay = () => { if (!player.alive) return; setGame((current) => resolveNight(runBotPhase(current, botController))); setError(null) }
  const reset = async () => { await repository.clear(); setGame(createInitialGame(newSeed())); setError(null) }

  if (!loaded) return <main className="shell loading-shell"><p>Opening the town gates…</p></main>

  return <main className="shell">
    <header className="hero">
      <div className="brand-block"><p className="eyebrow">Distant town survival</p><h1>Live<span>2</span>Nite</h1><div className="dayline"><strong>DAY {game.day}</strong><span>Town seed {game.seed}</span></div></div>
      <div className="header-actions"><span className="save-state">● Local save active</span><button className="secondary" onClick={() => void reset()}>Start a new town</button></div>
    </header>

    <section className="status-strip" aria-label="Town status">
      <article><span>Population</span><strong>{alive}<small>/ {game.citizens.length}</small></strong></article>
      <article><span>Outside</span><strong className={outsideCitizens.length ? 'warning-value' : ''}>{outsideCitizens.length}</strong></article>
      <article><span>Town defense</span><strong>{game.town.defense}</strong></article>
      <article><span>Gate</span><strong className={game.town.gateOpen ? 'danger-value' : 'safe-value'}>{game.town.gateOpen ? 'OPEN' : 'SEALED'}</strong></article>
      <article><span>Your AP</span><strong>{player.ap}<small>/ {player.maxAp}</small></strong></article>
      <article><span>Projects</span><strong>{completedProjects}<small>/ {Object.keys(game.town.construction).length}</small></strong></article>
    </section>

    {game.lastNight && <section className={`night-report ${game.lastNight.breached ? 'danger' : 'safe'}`}><div className="night-icon" aria-hidden="true">☾</div><div><span>Night {game.lastNight.day} report</span><strong>{game.lastNight.breached ? 'The defenses were breached.' : 'The town held.'}</strong><p>Attack {game.lastNight.attackStrength} · Effective defense {game.lastNight.effectiveDefense}.{game.lastNight.gateOpen && ' The gate was left open, so town defense did not apply.'}{lastNightDeathNames.length > 0 && ` Died outside: ${lastNightDeathNames.join(', ')}.`}</p></div></section>}
    {!player.alive && <section className="night-report danger"><div className="night-icon">†</div><div><span>Your run has ended</span><strong>You died outside during the nightly attack.</strong><p>Start a new town to continue.</p></div></section>}

    <div className="dashboard-grid">
      <div className="main-column">
        <section className="panel action-panel">
          {player.location.type === 'town' ? <TownView game={game} legalActions={legalActions} act={act}/> : <WorldView game={game} legalActions={legalActions} currentZone={currentZone} control={control} act={act} move={move}/>} 
          {error && <p className="error-banner">{error}</p>}
          {control?.trapped && <div className="rescue-hint"><strong>Rescue required.</strong><span>Searching is still legal, but movement is blocked. Let the town act so another citizen can travel here and restore control before night.</span></div>}
          <div className="turn-controls"><button className="activity-button" disabled={!player.alive} onClick={runCitizens}><span>Run citizen activity</span><small>Bots act now · night does not advance</small></button><button className="primary end-day" disabled={!player.alive} onClick={endDay}><span>End the day</span><small>Remaining citizens act, then the attack resolves</small></button></div>
        </section>
        <section className="panel map-panel"><div className="panel-heading compact"><div><p className="section-kicker">Expedition map</p><h2>World Beyond</h2></div><span className="panel-count">{Object.values(game.world.zones).filter((zone)=>zone.discovered).length} known</span></div><WorldMap game={game}/><p className="map-key"><span>?</span> unknown <span>0–9</span> observed zombies <span>T</span> town <span>@</span> you</p></section>
      </div>
      <CitizenRoster game={game}/>
    </div>
    <EventLog game={game}/>
  </main>
}
