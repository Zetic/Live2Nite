import { useEffect, useMemo, useState } from 'react'
import { BasicBotController } from '../agents/BasicBotController'
import { runBotPhase } from '../agents/runBotPhase'
import { getLegalActions } from '../core/actions'
import { executeCommand, InvalidCommandError } from '../core/commands'
import { totalTownDefense } from '../core/defense'
import { createInitialGame, resolveNight } from '../core/game'
import type { Direction, GameCommand, GameEvent, GameState } from '../core/types'
import { getZone, zoneControl } from '../core/world'
import { IndexedDbGameRepository } from '../persistence/IndexedDbGameRepository'
import { BankView } from './components/BankView'
import { CitizenRoster } from './components/CitizenRoster'
import { ConstructionView } from './components/ConstructionView'
import { EventLog } from './components/EventLog'
import { GameNavigation } from './components/GameNavigation'
import { HomeView } from './components/HomeView'
import { WatchtowerView } from './components/WatchtowerView'
import { WellView } from './components/WellView'
import { WorkshopView } from './components/WorkshopView'
import { WorldMap } from './components/WorldMap'
import { WorldView } from './components/WorldView'
import { citizenName } from './eventText'
import { isTownOnlyScreen, type GameScreen } from './navigation'
import './app.css'
import './facility.css'
import './night.css'

const repository = new IndexedDbGameRepository()
const botController = new BasicBotController()
function newSeed(): number { const values = new Uint32Array(1); crypto.getRandomValues(values); return values[0] || 1 }

export function App() {
  const [game, setGame] = useState<GameState>(() => createInitialGame(1))
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [screen, setScreen] = useState<GameScreen>('home')
  useEffect(() => { repository.load().then((saved) => setGame(saved ?? createInitialGame(newSeed()))).catch(() => setGame(createInitialGame(newSeed()))).finally(() => setLoaded(true)) }, [])
  useEffect(() => { if (loaded) void repository.save(game) }, [game, loaded])

  const player = game.citizens[0]
  const alive = useMemo(() => game.citizens.filter((citizen) => citizen.alive).length, [game.citizens])
  const outsideCitizens = useMemo(() => game.citizens.filter((citizen) => citizen.alive && citizen.location.type === 'world'), [game.citizens])
  const townDefense = useMemo(() => totalTownDefense(game), [game])
  const legalActions = useMemo(() => getLegalActions(game, player.id), [game, player.id])
  const currentZone = player.location.type === 'world' ? getZone(game.world, player.location.x, player.location.y) : null
  const control = player.location.type === 'world' ? zoneControl(game, player.location.x, player.location.y) : null
  const lastNightDeaths = useMemo(() => {
    if (!game.lastNight) return []
    return game.events.filter((event): event is Extract<GameEvent,{type:'CITIZEN_DIED'}> => event.type === 'CITIZEN_DIED' && event.day === game.lastNight?.day)
  }, [game])
  const outsideDeathNames = useMemo(() => lastNightDeaths.filter((event) => event.reason === 'outside_at_night').map((event) => citizenName(game,event.citizenId)), [lastNightDeaths, game])
  const homeDeathNames = useMemo(() => lastNightDeaths.filter((event) => event.reason === 'home_breach').map((event) => citizenName(game,event.citizenId)), [lastNightDeaths, game])
  const playerDeathReason = useMemo(() => [...game.events].reverse().find((event): event is Extract<GameEvent,{type:'CITIZEN_DIED'}> => event.type === 'CITIZEN_DIED' && event.citizenId === player.id)?.reason ?? null, [game.events, player.id])

  useEffect(() => {
    if (player.location.type === 'world' && isTownOnlyScreen(screen)) setScreen('world')
    if (screen === 'workshop' && !game.town.construction.workshop.completed) setScreen('construction')
    if (screen === 'watchtower' && !game.town.construction.watchtower.completed) setScreen('construction')
  }, [player.location.type, screen, game.town.construction.workshop.completed, game.town.construction.watchtower.completed])

  const act = (command: GameCommand | undefined) => {
    if (!command) return
    try { setGame((current) => executeCommand(current, command).state); setError(null) }
    catch (caught) { setError(caught instanceof InvalidCommandError ? caught.message : 'Action failed.') }
  }
  const move = (direction: Direction) => act(legalActions.find((action): action is Extract<GameCommand,{type:'MOVE'}> => action.type === 'MOVE' && action.direction === direction))
  const runCitizens = () => { setGame((current) => runBotPhase(current, botController)); setError(null) }
  const endDay = () => { if (!player.alive) return; setGame((current) => resolveNight(runBotPhase(current, botController))); setError(null) }
  const reset = async () => { await repository.clear(); setGame(createInitialGame(newSeed())); setScreen('home'); setError(null) }

  if (!loaded) return <main className="shell loading-shell"><p>Opening the town gates…</p></main>

  const zombiesInside = game.lastNight?.zombiesInside ?? (game.lastNight ? Math.max(0, game.lastNight.attackStrength - game.lastNight.effectiveDefense) : 0)

  return <main className="shell">
    <header className="hero">
      <div className="brand-block"><p className="eyebrow">Distant town survival</p><h1>Live<span>2</span>Nite</h1><div className="dayline"><strong>DAY {game.day}</strong><span>Town seed {game.seed}</span></div></div>
      <div className="header-actions"><span className="save-state">● Local save active</span><button className="secondary" onClick={() => void reset()}>Start a new town</button></div>
    </header>

    <section className="status-strip" aria-label="Town status">
      <article><span>Population</span><strong>{alive}<small>/ {game.citizens.length}</small></strong></article>
      <article><span>Outside</span><strong className={outsideCitizens.length ? 'warning-value' : ''}>{outsideCitizens.length}</strong></article>
      <article><span>Well water</span><strong>{game.town.well.water}</strong></article>
      <article><span>Town defense</span><strong>{townDefense}</strong></article>
      <article><span>Gate</span><strong className={game.town.gateOpen ? 'danger-value' : 'safe-value'}>{game.town.gateOpen ? 'OPEN' : 'SEALED'}</strong></article>
      <article><span>Your AP</span><strong>{player.ap}<small>/ {player.maxAp}</small></strong></article>
    </section>

    {game.lastNight && <section className={`night-report ${game.lastNight.breached ? 'danger' : 'safe'}`}>
      <div className="night-icon" aria-hidden="true">☾</div>
      <div className="night-report-copy">
        <span>Night {game.lastNight.day} report</span>
        <strong>{game.lastNight.breached ? `${zombiesInside} zombie${zombiesInside === 1 ? '' : 's'} got inside.` : 'The town held.'}</strong>
        <p>Attack {game.lastNight.attackStrength} · Effective defense {game.lastNight.effectiveDefense}.{game.lastNight.gateOpen && ' The gate was left open, so town defense did not apply.'}</p>
        {(outsideDeathNames.length > 0 || homeDeathNames.length > 0) && <div className="night-casualties">
          {outsideDeathNames.length > 0 && <span>Outside: {outsideDeathNames.join(', ')}</span>}
          {homeDeathNames.length > 0 && <span>Homes breached: {homeDeathNames.join(', ')}</span>}
        </div>}
      </div>
    </section>}
    {!player.alive && <section className="night-report danger"><div className="night-icon">†</div><div><span>Your run has ended</span><strong>{playerDeathReason === 'home_breach' ? 'Zombies overwhelmed your home.' : 'You died outside during the nightly attack.'}</strong><p>Start a new town to continue.</p></div></section>}

    <GameNavigation game={game} screen={screen} outside={player.location.type === 'world'} onChange={setScreen}/>

    <div className="screen-stage">
      {screen === 'home' && <HomeView game={game} legalActions={legalActions} act={act}/>} 
      {screen === 'well' && <WellView game={game} legalActions={legalActions} act={act}/>} 
      {screen === 'bank' && <BankView game={game} legalActions={legalActions} act={act}/>} 
      {screen === 'construction' && <ConstructionView game={game} legalActions={legalActions} act={act}/>} 
      {screen === 'workshop' && <WorkshopView game={game} legalActions={legalActions} act={act}/>} 
      {screen === 'watchtower' && <WatchtowerView game={game}/>} 
      {screen === 'world' && <div className="world-screen-layout"><WorldView game={game} legalActions={legalActions} currentZone={currentZone} control={control} act={act} move={move}/><section className="panel map-panel"><div className="panel-heading compact"><div><p className="section-kicker">Expedition map</p><h2>World Beyond</h2></div><span className="panel-count">{Object.values(game.world.zones).filter((zone)=>zone.discovered).length} known</span></div><WorldMap game={game}/><p className="map-key"><span>?</span> unknown <span>0–9</span> observed zombies <span>T</span> town <span>@</span> you</p></section></div>}
      {screen === 'citizens' && <CitizenRoster game={game}/>} 
      {screen === 'chronicle' && <EventLog game={game}/>} 
    </div>

    {error && <p className="error-banner global-error">{error}</p>}
    {control?.trapped && <div className="rescue-hint global-rescue"><strong>Rescue required.</strong><span>Searching and carried supplies remain usable, but movement is blocked. Run citizen activity to give another citizen a chance to reach your zone.</span></div>}

    <footer className="turn-bar">
      <div><span>Day {game.day}</span><strong>{player.location.type === 'town' ? 'Inside town' : `Outside [${player.location.x},${player.location.y}]`}</strong></div>
      <button className="activity-button" disabled={!player.alive} onClick={runCitizens}><span>Run citizen activity</span><small>Bots act now · night does not advance</small></button>
      <button className="primary end-day" disabled={!player.alive} onClick={endDay}><span>End the day</span><small>Remaining citizens act, then the attack resolves</small></button>
    </footer>
  </main>
}
