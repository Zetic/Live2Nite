import { useEffect, useMemo, useState } from 'react'
import { BasicBotController } from '../agents/BasicBotController'
import { getLegalActions } from '../core/actions'
import { formatGameHour } from '../core/clock'
import { executeCommand, InvalidCommandError } from '../core/commands'
import { totalTownDefense } from '../core/defense'
import { createInitialGame } from '../core/game'
import type { Direction, GameCommand, GameEvent, GameState } from '../core/types'
import { getZone, zoneControl } from '../core/world'
import { IndexedDbGameRepository } from '../persistence/IndexedDbGameRepository'
import { advanceOneHour, advanceToHour, InvalidTimeAdvanceError } from '../simulation/advanceTime'
import { BankView } from './components/BankView'
import { CampingPanel } from './components/CampingPanel'
import { CitizenRoster } from './components/CitizenRoster'
import { CitizenStatusBar } from './components/CitizenStatusBar'
import { CodexView } from './components/CodexView'
import { ConstructionView } from './components/ConstructionView'
import { GameNavigation } from './components/GameNavigation'
import { HomeView } from './components/HomeView'
import { TimeControls } from './components/TimeControls'
import { TownEndScreen } from './components/TownEndScreen'
import { TownRecords } from './components/TownRecords'
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
import './clock.css'
import './status.css'
import './records.css'

const repository = new IndexedDbGameRepository()
const botController = new BasicBotController()
function newSeed(): number { const values = new Uint32Array(1); crypto.getRandomValues(values); return values[0] || 1 }

export function App() {
  const [game, setGame] = useState<GameState>(() => createInitialGame(1))
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [screen, setScreen] = useState<GameScreen>('chronicle')
  const [controlledCitizenId, setControlledCitizenId] = useState('c01')
  useEffect(() => { repository.load().then((saved) => setGame(saved ?? createInitialGame(newSeed()))).catch(() => setGame(createInitialGame(newSeed()))).finally(() => setLoaded(true)) }, [])
  useEffect(() => { if (loaded) void repository.save(game) }, [game, loaded])

  const player = game.citizens.find((citizen) => citizen.id === controlledCitizenId) ?? game.citizens[0]
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
  const campingDeathNames = useMemo(() => lastNightDeaths.filter((event) => event.reason === 'camping_failure').map((event) => citizenName(game,event.citizenId)), [lastNightDeaths, game])
  const homeDeathNames = useMemo(() => lastNightDeaths.filter((event) => event.reason === 'home_breach').map((event) => citizenName(game,event.citizenId)), [lastNightDeaths, game])
  const dehydrationDeathNames = useMemo(() => lastNightDeaths.filter((event) => event.reason === 'dehydration').map((event) => citizenName(game,event.citizenId)), [lastNightDeaths, game])
  const controlledDeathReason = useMemo(() => [...game.events].reverse().find((event): event is Extract<GameEvent,{type:'CITIZEN_DIED'}> => event.type === 'CITIZEN_DIED' && event.citizenId === player.id)?.reason ?? null, [game.events, player.id])

  useEffect(() => {
    if (!game.citizens.some((citizen) => citizen.id === controlledCitizenId)) setControlledCitizenId(game.citizens[0]?.id ?? 'c01')
  }, [game.citizens, controlledCitizenId])
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
  const advanceHour = () => {
    try { setGame(advanceOneHour(game,botController,controlledCitizenId)); setError(null) }
    catch (caught) { setError(caught instanceof InvalidTimeAdvanceError ? caught.message : 'Time advance failed.') }
  }
  const advanceTarget = (hour: number) => {
    try { setGame(advanceToHour(game,hour,botController,controlledCitizenId)); setError(null) }
    catch (caught) { setError(caught instanceof InvalidTimeAdvanceError ? caught.message : 'Time advance failed.') }
  }
  const reset = async () => { await repository.clear(); setGame(createInitialGame(newSeed())); setControlledCitizenId('c01'); setScreen('chronicle'); setError(null) }
  const controlCitizen = (citizenId: string) => { setControlledCitizenId(citizenId); setError(null) }

  if (!loaded) return <main className="shell loading-shell"><p>Opening the town gates…</p></main>

  const zombiesInside = game.lastNight?.zombiesInside ?? (game.lastNight ? Math.max(0, game.lastNight.attackStrength - game.lastNight.effectiveDefense) : 0)
  const attackPhase = game.clock.phase === 'attack'
  const townEnded = alive === 0

  return <main className="shell">
    <header className="hero">
      <div className="brand-block"><p className="eyebrow">Distant town survival</p><h1>Live<span>2</span>Nite</h1><div className="dayline"><strong>DAY {game.day}</strong><span className="clock-value">{formatGameHour(game.clock.hour)}</span><span>Town seed {game.seed}</span>{!townEnded && <span className="test-control-chip">TEST CONTROL · {player.name}</span>}</div></div>
      <div className="header-actions"><span className="save-state">● Local save active</span><button className="secondary" onClick={() => void reset()}>Start a new town</button></div>
    </header>

    {townEnded ? <TownEndScreen game={game} onRestart={() => void reset()}/> : <>
      <CitizenStatusBar citizen={player}/>

      <section className="status-strip" aria-label="Town status">
        <article><span>Population</span><strong>{alive}<small>/ {game.citizens.length}</small></strong></article>
        <article><span>Outside</span><strong className={outsideCitizens.length ? 'warning-value' : ''}>{outsideCitizens.length}</strong></article>
        <article><span>Well water</span><strong>{game.town.well.water}</strong></article>
        <article><span>Town defense</span><strong>{townDefense}</strong></article>
        <article><span>Gate</span><strong className={game.town.gateOpen ? 'danger-value' : 'safe-value'}>{game.town.gateOpen ? 'OPEN' : 'SEALED'}</strong></article>
      </section>

      {attackPhase && <section className="night-report danger attack-hour-banner">
        <div className="night-icon" aria-hidden="true">☾</div>
        <div className="night-report-copy"><span>00:00–01:00 · attack hour</span><strong>The horde is attacking.</strong><p>Normal actions are locked. Advance one hour to resolve the town attack, camping attempts, casualties, status progression, and the start of Day {game.day + 1} at 1:00 AM.</p></div>
      </section>}

      {!attackPhase && game.lastNight && <section className={`night-report ${game.lastNight.breached ? 'danger' : 'safe'}`}>
        <div className="night-icon" aria-hidden="true">☾</div>
        <div className="night-report-copy">
          <span>Night {game.lastNight.day} report</span>
          <strong>{game.lastNight.breached ? `${zombiesInside} zombie${zombiesInside === 1 ? '' : 's'} got inside.` : 'The town held.'}</strong>
          <p>Attack {game.lastNight.attackStrength} · Effective defense {game.lastNight.effectiveDefense}.{game.lastNight.gateOpen && ' The gate was left open, so town defense did not apply.'}{(game.lastNight.campingSurvivors??0)>0&&` ${game.lastNight.campingSurvivors} citizen(s) survived camping outside.`}</p>
          {(outsideDeathNames.length > 0 || campingDeathNames.length > 0 || homeDeathNames.length > 0 || dehydrationDeathNames.length > 0) && <div className="night-casualties">
            {outsideDeathNames.length > 0 && <span>Outside without shelter: {outsideDeathNames.join(', ')}</span>}
            {campingDeathNames.length > 0 && <span>Camping failed: {campingDeathNames.join(', ')}</span>}
            {homeDeathNames.length > 0 && <span>Homes breached: {homeDeathNames.join(', ')}</span>}
            {dehydrationDeathNames.length > 0 && <span>Dehydration: {dehydrationDeathNames.join(', ')}</span>}
          </div>}
        </div>
      </section>}
      {!player.alive && <section className="night-report danger"><div className="night-icon">†</div><div><span>Controlled citizen is dead</span><strong>{controlledDeathReason === 'home_breach' ? `${player.name}'s home was overwhelmed.` : controlledDeathReason === 'dehydration' ? `${player.name} died of dehydration.` : controlledDeathReason === 'camping_failure' ? `${player.name}'s hiding place failed during the night.` : `${player.name} died outside without a prepared hiding place.`}</strong><p>Open Citizens and take control of another living citizen to continue testing this town.</p></div></section>}

      <GameNavigation game={game} screen={screen} outside={player.location.type === 'world'} onChange={setScreen}/>

      <div className="screen-stage">
        {screen === 'codex' && <CodexView/>}
        {screen === 'home' && <HomeView game={game} citizenId={player.id} legalActions={legalActions} act={act}/>} 
        {screen === 'well' && <WellView game={game} citizenId={player.id} legalActions={legalActions} act={act}/>} 
        {screen === 'bank' && <BankView game={game} citizenId={player.id} legalActions={legalActions} act={act}/>} 
        {screen === 'construction' && <ConstructionView game={game} legalActions={legalActions} act={act}/>} 
        {screen === 'workshop' && <WorkshopView game={game} legalActions={legalActions} act={act}/>} 
        {screen === 'watchtower' && <WatchtowerView game={game}/>} 
        {screen === 'world' && <div className="world-screen-layout"><div className="world-primary-column"><WorldView game={game} citizenId={player.id} legalActions={legalActions} currentZone={currentZone} control={control} act={act} move={move}/>{currentZone&&<CampingPanel game={game} citizen={player} zone={currentZone} legalActions={legalActions} act={act}/>}</div><section className="panel map-panel"><div className="panel-heading compact"><div><p className="section-kicker">Expedition map</p><h2>World Beyond</h2></div><span className="panel-count">{Object.values(game.world.zones).filter((zone)=>zone.discovered).length} known</span></div><WorldMap game={game} citizenId={player.id}/><p className="map-key"><span>?</span> unknown <span>0–9</span> observed zombies <span>T</span> town <span>@</span> controlled citizen</p></section></div>}
        {screen === 'citizens' && <CitizenRoster game={game} controlledCitizenId={player.id} onControl={controlCitizen}/>} 
        {screen === 'chronicle' && <TownRecords game={game}/>} 
      </div>

      {error && <p className="error-banner global-error">{error}</p>}
      {control?.trapped && !attackPhase && <div className="rescue-hint global-rescue"><strong>Zone control lost.</strong><span>Search, fight, use a carried weapon, prepare to hide, or advance time so autonomous citizens can react during the current hour.</span></div>}

      <div className="controlled-clock-context"><span>Controlling {player.name}</span><strong>{player.alive ? (player.location.type === 'town' ? 'Inside town' : player.camping.hidden ? `Hidden outside [${player.location.x},${player.location.y}]` : `Outside [${player.location.x},${player.location.y}]`) : 'DEAD · switch citizens to continue testing'}</strong></div>
      <TimeControls game={game} onAdvanceOne={advanceHour} onAdvanceTarget={advanceTarget}/>
    </>}
  </main>
}
