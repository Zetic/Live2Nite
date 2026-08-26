import { useEffect, useMemo, useState } from 'react'
import { BasicBotController } from '../agents/BasicBotController'
import { getLegalActions } from '../core/actions'
import { formatGameHour } from '../core/clock'
import { InvalidCommandError } from '../core/commands'
import { hasUpgradeProjectsFacility } from '../core/constructionUpgrades'
import { debugGodMove, debugInstantBuild, debugRefreshCitizen, debugSummonItem, debugToggleGod } from '../core/debug'
import { enforceGodMode, isGodCitizen } from '../core/debugGod'
import { createInitialGame } from '../core/game'
import { townHasProfessionEquipment, type ProfessionId } from '../core/professions'
import { getRuinExplorer, ruinCurrentCell, type RuinActionResult } from '../core/ruinExploration'
import { specialSiteName } from '../core/specialSites'
import { executeCommandWithTechnician } from '../core/technicianCommandExecutor'
import type { ConstructionId, Direction, GameCommand, GameEvent, GameState, ItemType } from '../core/types'
import { getZone, moveCoordinates, zoneControl } from '../core/world'
import { IndexedDbGameRepository } from '../persistence/IndexedDbGameRepository'
import { advanceOneHour, advanceToHour, InvalidTimeAdvanceError } from '../simulation/advanceTime'
import { BankView } from './components/BankView'
import { BattlementsView } from './components/BattlementsView'
import { CampingPanel } from './components/CampingPanel'
import { CitizenRoster } from './components/CitizenRoster'
import { CitizenStatusBar } from './components/CitizenStatusBar'
import { CodexView } from './components/CodexView'
import { ConstructionView } from './components/ConstructionView'
import { GameNavigation } from './components/GameNavigation'
import { HomeView } from './components/HomeView'
import { LandingScreen } from './components/LandingScreen'
import { RuinInteriorMap, RuinInteriorTravelControls, ruinFloorLabel } from './components/RuinInteriorMap'
import { TimeControls } from './components/TimeControls'
import { TownEndScreen } from './components/TownEndScreen'
import { TownRecords } from './components/TownRecords'
import { UpgradeProjectsView } from './components/UpgradeProjectsView'
import { WatchtowerView } from './components/WatchtowerView'
import { WellView } from './components/WellView'
import { WorkshopView } from './components/WorkshopView'
import { WorldMap } from './components/WorldMap'
import { WorldTownReturn, WorldTravelControls } from './components/WorldTravelControls'
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
  const [atLanding,setAtLanding]=useState(true)
  const [selectedProfession,setSelectedProfession]=useState<ProfessionId|null>(null)
  const [error, setError] = useState<string | null>(null)
  const [screen, setScreen] = useState<GameScreen>('chronicle')
  const [controlledCitizenId, setControlledCitizenId] = useState('c01')
  const [visitedCitizenId, setVisitedCitizenId] = useState<string | null>(null)
  useEffect(() => { repository.load().then((saved) => {if(saved&&townHasProfessionEquipment(saved.citizens)){setGame(enforceGodMode(saved));setAtLanding(false)}else{setAtLanding(true);if(saved)void repository.clear()}}).catch(() => setAtLanding(true)).finally(() => setLoaded(true)) }, [])
  useEffect(() => { if (loaded&&!atLanding) void repository.save(game) }, [game, loaded, atLanding])

  const player = game.citizens.find((citizen) => citizen.id === controlledCitizenId) ?? game.citizens[0]
  const godActive=isGodCitizen(player)
  const ruinExploring = Boolean(getRuinExplorer(game,player.id)?.active)
  const ruinCell = ruinExploring ? ruinCurrentCell(game,player.id) : null
  const alive = useMemo(() => game.citizens.filter((citizen) => citizen.alive).length, [game.citizens])
  const legalActions = useMemo(() => {
    const actions=getLegalActions(game,player.id)
    if(!isGodCitizen(player)||player.location.type!=='world'||player.camping.hidden||game.clock.phase!=='day')return actions
    for(const direction of ['NORTH','SOUTH','EAST','WEST'] as const){
      const target=moveCoordinates(player.location.x,player.location.y,direction)
      if(getZone(game.world,target.x,target.y)&&!actions.some((action)=>action.type==='MOVE'&&action.direction===direction))actions.push({type:'MOVE',citizenId:player.id,direction})
    }
    return actions
  }, [game, player])
  const enterTownAction=legalActions.find((action):action is Extract<GameCommand,{type:'ENTER_TOWN'}>=>action.type==='ENTER_TOWN')
  const currentZone = player.location.type === 'world' ? getZone(game.world, player.location.x, player.location.y) : null
  const control = player.location.type === 'world' ? zoneControl(game, player.location.x, player.location.y) : null
  const lastNightDeaths = useMemo(() => {
    if (!game.lastNight) return []
    return game.events.filter((event): event is Extract<GameEvent,{type:'CITIZEN_DIED'}> => event.type === 'CITIZEN_DIED' && event.day === game.lastNight?.day)
  }, [game])
  const outsideDeathNames = useMemo(() => lastNightDeaths.filter((event) => event.reason === 'outside_at_night').map((event) => citizenName(game,event.citizenId)), [lastNightDeaths, game])
  const campingDeathNames = useMemo(() => lastNightDeaths.filter((event) => event.reason === 'camping_failure').map((event) => citizenName(game,event.citizenId)), [lastNightDeaths, game])
  const homeDeathNames = useMemo(() => lastNightDeaths.filter((event) => event.reason === 'home_breach').map((event) => citizenName(game,event.citizenId)), [lastNightDeaths, game])
  const corpseDeathNames = useMemo(() => lastNightDeaths.filter((event) => event.reason === 'corpse_attack').map((event) => citizenName(game,event.citizenId)), [lastNightDeaths, game])
  const dehydrationDeathNames = useMemo(() => lastNightDeaths.filter((event) => event.reason === 'dehydration').map((event) => citizenName(game,event.citizenId)), [lastNightDeaths, game])
  const watchDeathNames = useMemo(() => (game.lastNight?.nightWatch?.outcomes??[]).filter((outcome)=>outcome.result==='dead').map((outcome)=>citizenName(game,outcome.citizenId)), [game])
  const controlledWatchDeath=useMemo(()=>Boolean(game.lastNight?.nightWatch?.outcomes.some((outcome)=>outcome.citizenId===player.id&&outcome.result==='dead')),[game.lastNight,player.id])
  const controlledDeathReason = useMemo(() => [...game.events].reverse().find((event): event is Extract<GameEvent,{type:'CITIZEN_DIED'}> => event.type === 'CITIZEN_DIED' && event.citizenId === player.id)?.reason ?? null, [game.events, player.id])

  useEffect(() => {
    if (!game.citizens.some((citizen) => citizen.id === controlledCitizenId)) setControlledCitizenId(game.citizens[0]?.id ?? 'c01')
  }, [game.citizens, controlledCitizenId])
  useEffect(() => {
    if (player.location.type === 'world' && isTownOnlyScreen(screen)) setScreen('world')
    if (screen === 'workshop' && !game.town.construction.workshop.completed) setScreen('construction')
    if (screen === 'watchtower' && !game.town.construction.watchtower.completed) setScreen('construction')
    if (screen === 'battlements' && !game.town.construction.battlements.completed) setScreen('construction')
    if (screen === 'upgrade_projects' && !hasUpgradeProjectsFacility(game)) setScreen('construction')
  }, [player.location.type, screen, game])

  const act = (command: GameCommand | undefined) => {
    if (!command) return
    try { setGame((current) => enforceGodMode(executeCommandWithTechnician(current, command).state)); setError(null) }
    catch (caught) { setError(caught instanceof InvalidCommandError ? caught.message : 'Action failed.') }
  }
  const move = (direction: Direction) => {
    const command=legalActions.find((action): action is Extract<GameCommand,{type:'MOVE'}> => action.type === 'MOVE' && action.direction === direction)
    if(!command)return
    const ordinary=getLegalActions(game,player.id).some((action)=>action.type==='MOVE'&&action.direction===direction)
    if(godActive&&!ordinary){setGame((current)=>debugGodMove(current,controlledCitizenId,direction));setError(null);return}
    act(command)
  }
  const advanceHour = () => {
    try { setGame(enforceGodMode(advanceOneHour(game,botController,controlledCitizenId))); setError(null) }
    catch (caught) { setError(caught instanceof InvalidTimeAdvanceError ? caught.message : 'Time advance failed.') }
  }
  const advanceTarget = (hour: number) => {
    try { setGame(enforceGodMode(advanceToHour(game,hour,botController,controlledCitizenId))); setError(null) }
    catch (caught) { setError(caught instanceof InvalidTimeAdvanceError ? caught.message : 'Time advance failed.') }
  }
  const startNewTown=()=>{if(!selectedProfession)return;setGame(createInitialGame(newSeed(),40,selectedProfession));setControlledCitizenId('c01');setVisitedCitizenId(null);setScreen('chronicle');setError(null);setAtLanding(false)}
  const reset = async () => { await repository.clear(); setSelectedProfession(null); setControlledCitizenId('c01'); setVisitedCitizenId(null); setScreen('chronicle'); setError(null); setAtLanding(true) }
  const refresh = () => { setGame((current)=>debugRefreshCitizen(current,controlledCitizenId)); setError(null) }
  const toggleGod = () => { setGame((current)=>debugToggleGod(current,controlledCitizenId)); setError(null) }
  const summonItem = (type:ItemType) => { setGame((current)=>debugSummonItem(current,controlledCitizenId,type)); setError(null) }
  const instantBuild = (projectId:ConstructionId) => { setGame((current)=>debugInstantBuild(current,projectId)); setError(null) }
  const applyRuinResult = (result:RuinActionResult) => { setGame(enforceGodMode(result.state)); setError(result.ok?null:result.message) }
  const controlCitizen = (citizenId: string) => { setControlledCitizenId(citizenId); setVisitedCitizenId(null); setError(null) }
  const changeScreen = (next: GameScreen) => { if(next==='home')setVisitedCitizenId(null);setScreen(next) }
  const visitHome = (citizenId:string) => { if(!player.alive||player.location.type!=='town')return;setVisitedCitizenId(citizenId);setScreen('home');setError(null) }

  if (!loaded) return <main className="shell loading-shell"><p>Opening the town gates…</p></main>
  if(atLanding)return <LandingScreen selected={selectedProfession} onSelect={setSelectedProfession} onStart={startNewTown}/>

  const zombiesInside = game.lastNight?.zombiesInside ?? (game.lastNight ? Math.max(0, game.lastNight.attackStrength - game.lastNight.effectiveDefense) : 0)
  const nightHadCorpseAttack = (game.lastNight?.corpseReanimations ?? 0) > 0
  const attackPhase = game.clock.phase === 'attack'
  const townEnded = alive === 0

  return <main className="shell">
    <header className="hero">
      <div className="brand-block"><p className="eyebrow">Distant town survival</p><h1>Live<span>2</span>Nite</h1><div className="dayline"><strong>DAY {game.day}</strong><span className="clock-value">{formatGameHour(game.clock.hour)}</span><span>Town seed {game.seed}</span>{!townEnded && <span className="test-control-chip">TEST CONTROL · {player.name}</span>}</div></div>
      <div className="header-actions"><span className="save-state">● Local save active</span></div>
    </header>

    {townEnded ? <TownEndScreen game={game} onRestart={() => void reset()}/> : <>
      <CitizenStatusBar citizen={player}/>

      <TimeControls game={game} onAdvanceOne={advanceHour} onAdvanceTarget={advanceTarget} onRefresh={refresh} onToggleGod={toggleGod} godActive={godActive} onNewTown={()=>void reset()} refreshDisabled={!player.alive}/>

      {attackPhase && <section className="night-report danger attack-hour-banner">
        <div className="night-icon" aria-hidden="true">☾</div>
        <div className="night-report-copy"><span>00:00–01:00 · attack hour</span><strong>The horde is attacking.</strong><p>Normal actions are locked. Advance one hour to resolve the town attack, camping attempts, casualties, status progression, and the start of Day {game.day + 1} at 1:00 AM.</p></div>
      </section>}

      {!attackPhase && game.lastNight && <section className={`night-report ${game.lastNight.breached || nightHadCorpseAttack ? 'danger' : 'safe'}`}>
        <div className="night-icon" aria-hidden="true">☾</div>
        <div className="night-report-copy">
          <span>Night {game.lastNight.day} report</span>
          <strong>{game.lastNight.breached ? `${zombiesInside} zombie${zombiesInside === 1 ? '' : 's'} got inside.` : nightHadCorpseAttack ? 'Undisposed corpses struck inside town.' : 'The town held.'}</strong>
          <p>Attack {game.lastNight.attackStrength} · Effective defense {game.lastNight.effectiveDefense}.{game.lastNight.nightWatch&&` Night Watch ${game.lastNight.nightWatch.defense} (${game.lastNight.nightWatch.overflowBefore} overflow → ${game.lastNight.nightWatch.overflowAfter}).`}{game.lastNight.gateOpen && ' The gate was left open, so town defense did not apply.'}{(game.lastNight.campingSurvivors??0)>0&&` ${game.lastNight.campingSurvivors} citizen(s) survived camping outside.`}{(game.lastNight.corpseReanimations??0)>0&&` ${game.lastNight.corpseReanimations} undisposed corpse(s) reanimated; ${game.lastNight.corpseAttackDeaths??0} citizen(s) were killed and ${game.lastNight.corpseWaterLost??0} Well water was lost.`}</p>
          {(outsideDeathNames.length > 0 || campingDeathNames.length > 0 || watchDeathNames.length > 0 || homeDeathNames.length > 0 || corpseDeathNames.length > 0 || dehydrationDeathNames.length > 0) && <div className="night-casualties">
            {outsideDeathNames.length > 0 && <span>Outside without shelter: {outsideDeathNames.join(', ')}</span>}
            {campingDeathNames.length > 0 && <span>Camping failed: {campingDeathNames.join(', ')}</span>}
            {watchDeathNames.length > 0 && <span>Night Watch: {watchDeathNames.join(', ')}</span>}
            {homeDeathNames.length > 0 && <span>Homes breached: {homeDeathNames.join(', ')}</span>}{corpseDeathNames.length > 0 && <span>Reanimated corpses: {corpseDeathNames.join(', ')}</span>}
            {dehydrationDeathNames.length > 0 && <span>Dehydration: {dehydrationDeathNames.join(', ')}</span>}
          </div>}
        </div>
      </section>}
      {!player.alive && <section className="night-report danger"><div className="night-icon">†</div><div><span>Controlled citizen is dead</span><strong>{controlledWatchDeath?`${player.name} died while standing the Night Watch.`:controlledDeathReason === 'home_breach' ? `${player.name}'s home was overwhelmed.` : controlledDeathReason === 'dehydration' ? `${player.name} died of dehydration.` : controlledDeathReason === 'camping_failure' ? `${player.name}'s hiding place failed during the night.` : controlledDeathReason === 'corpse_attack' ? `${player.name} was killed by a reanimated corpse inside town.` : `${player.name} died outside without a prepared hiding place.`}</strong><p>Open Citizens and take control of another living citizen to continue testing this town.</p></div></section>}

      <GameNavigation game={game} screen={screen} outside={player.location.type === 'world'} onChange={changeScreen}/>

      <div className="screen-stage">
        {screen === 'codex' && <CodexView onSummonItem={summonItem} onInstantBuild={instantBuild}/>} 
        {screen === 'home' && <HomeView game={game} citizenId={player.id} ownerCitizenId={visitedCitizenId??player.id} legalActions={legalActions} act={act} onReturnHome={()=>setVisitedCitizenId(null)}/>} 
        {screen === 'well' && <WellView game={game} citizenId={player.id} legalActions={legalActions} act={act}/>} 
        {screen === 'bank' && <BankView game={game} citizenId={player.id} legalActions={legalActions} act={act}/>} 
        {screen === 'construction' && <ConstructionView game={game} legalActions={legalActions} act={act}/>} 
        {screen === 'workshop' && <WorkshopView game={game} legalActions={legalActions} act={act}/>} 
        {screen === 'watchtower' && <WatchtowerView game={game} citizenId={player.id} onContribute={(next)=>{setGame(enforceGodMode(next));setError(null)}}/>} 
        {screen === 'battlements' && <BattlementsView game={game} citizenId={player.id} onChange={(next)=>{setGame(enforceGodMode(next));setError(null)}}/>}
        {screen === 'upgrade_projects' && <UpgradeProjectsView game={game} citizenId={player.id} onVote={(next)=>{setGame(enforceGodMode(next));setError(null)}}/>}
        {screen === 'world' && <div className="world-screen-layout">
          <div className="world-primary-column">
            {player.location.type==='world'&&!ruinExploring&&<WorldTownReturn action={enterTownAction} act={act}/>} 
            <WorldView game={game} citizenId={player.id} legalActions={legalActions} currentZone={currentZone} control={control} act={act} move={move} onRuinResult={applyRuinResult}/>
            {currentZone&&!ruinExploring&&<CampingPanel game={game} citizen={player} zone={currentZone} legalActions={legalActions} act={act}/>} 
          </div>
          <section className="panel map-panel">
            <div className="panel-heading compact"><div><p className="section-kicker">{ruinExploring?'Ruin map':'Expedition map'}</p><h2>{ruinExploring&&currentZone?.specialSite?specialSiteName(currentZone.specialSite.type):'World Beyond'}</h2></div><span className="panel-count">{ruinExploring&&ruinCell?ruinFloorLabel(ruinCell.floor):`${Object.values(game.world.zones).filter((zone)=>zone.discovered).length} known`}</span></div>
            {ruinExploring&&currentZone?<RuinInteriorMap game={game} citizenId={player.id} zone={currentZone}/>:<WorldMap game={game} citizenId={player.id}/>} 
            {player.location.type==='world'&&(ruinExploring?<RuinInteriorTravelControls game={game} citizenId={player.id} onResult={applyRuinResult}/>:<WorldTravelControls legalActions={legalActions} move={move}/>)} 
          </section>
        </div>}
        {screen === 'citizens' && <CitizenRoster game={game} controlledCitizenId={player.id} onControl={controlCitizen} onVisit={visitHome}/>} 
        {screen === 'chronicle' && <TownRecords game={game}/>} 
      </div>

      {error && <p className="error-banner global-error">{error}</p>}
      {control?.trapped && !attackPhase && !ruinExploring && <div className="rescue-hint global-rescue"><strong>Zone control lost.</strong><span>Search, fight, use a carried weapon, prepare to hide, or advance time so autonomous citizens can react during the current hour.</span></div>}

      <div className="controlled-clock-context"><span>Controlling {player.name}</span><strong>{player.alive ? (player.location.type === 'town' ? 'Inside town' : ruinExploring ? `Inside explorable ruin [${player.location.x},${player.location.y}]` : player.camping.hidden ? `Hidden outside [${player.location.x},${player.location.y}]` : `Outside [${player.location.x},${player.location.y}]`) : 'DEAD · switch citizens to continue testing'}</strong></div>
    </>}
  </main>
}