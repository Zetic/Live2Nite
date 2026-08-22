import { useEffect, useMemo, useState } from 'react'
import { BasicBotController } from '../agents/BasicBotController'
import { runBotPhase } from '../agents/runBotPhase'
import { getLegalActions } from '../core/actions'
import { executeCommand, InvalidCommandError } from '../core/commands'
import { createInitialGame, resolveNight } from '../core/game'
import { itemName, itemPurpose, ITEM_TYPES } from '../core/items'
import type { Direction, GameCommand, GameEvent, GameState } from '../core/types'
import { getZone, zoneControl, zoneKey } from '../core/world'
import { IndexedDbGameRepository } from '../persistence/IndexedDbGameRepository'
import './app.css'

const repository = new IndexedDbGameRepository()
const botController = new BasicBotController()

function newSeed(): number {
  const values = new Uint32Array(1)
  crypto.getRandomValues(values)
  return values[0] || 1
}

function citizenName(game: GameState, citizenId: string): string {
  return game.citizens.find((citizen) => citizen.id === citizenId)?.name ?? citizenId
}

function describeEvent(event: GameEvent, game: GameState): string {
  switch (event.type) {
    case 'AP_SPENT': return `${citizenName(game, event.citizenId)} spent ${event.amount} AP.`
    case 'GATE_SET': return `${citizenName(game, event.citizenId)} ${event.open ? 'opened' : 'closed'} the gate.`
    case 'CITIZEN_LOCATION_CHANGED': return event.location.type === 'town'
      ? `${citizenName(game, event.citizenId)} entered town.`
      : `${citizenName(game, event.citizenId)} moved to [${event.location.x},${event.location.y}].`
    case 'ZONE_DISCOVERED': return `Zone [${event.zoneKey}] was discovered.`
    case 'ZONE_SEARCHED': return event.item
      ? `${citizenName(game, event.citizenId)} searched [${event.zoneKey}] and uncovered ${itemName(event.item.type)}.`
      : `${citizenName(game, event.citizenId)} searched [${event.zoneKey}] and found nothing.`
    case 'ITEM_PICKED_UP': return `${citizenName(game, event.citizenId)} picked up ${itemName(event.item.type)}.`
    case 'ITEM_DEPOSITED': return `${citizenName(game, event.citizenId)} deposited ${itemName(event.item.type)}.`
    case 'CITIZEN_DIED': return `${citizenName(game, event.citizenId)} died outside during the nightly attack.`
    case 'NIGHT_RESOLVED': return `Night ${event.day}: attack ${event.report.attackStrength} vs effective defense ${event.report.effectiveDefense}${event.report.breached ? ' — BREACH' : ' — held'}.`
    case 'DAY_STARTED': return `Day ${event.day} began.`
  }
}

function findAction<T extends GameCommand['type']>(actions: GameCommand[], type: T): Extract<GameCommand, { type: T }> | undefined {
  return actions.find((action) => action.type === type) as Extract<GameCommand, { type: T }> | undefined
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
  const outsideCitizens = useMemo(() => game.citizens.filter((citizen) => citizen.alive && citizen.location.type === 'world'), [game.citizens])
  const legalActions = useMemo(() => player ? getLegalActions(game, player.id) : [], [game, player])
  const currentZone = player?.location.type === 'world' ? getZone(game.world, player.location.x, player.location.y) : null
  const control = player?.location.type === 'world' ? zoneControl(game, player.location.x, player.location.y) : null
  const lastNightDeathNames = useMemo(() => {
    if (!game.lastNight) return []
    return game.events
      .filter((event): event is Extract<GameEvent, { type: 'CITIZEN_DIED' }> =>
        event.type === 'CITIZEN_DIED' && event.day === game.lastNight?.day,
      )
      .map((event) => citizenName(game, event.citizenId))
  }, [game])

  const act = (command: GameCommand | undefined) => {
    if (!command) return
    try {
      setGame((current) => executeCommand(current, command).state)
      setError(null)
    } catch (caught) {
      setError(caught instanceof InvalidCommandError ? caught.message : 'Action failed.')
    }
  }

  const move = (direction: Direction) => {
    const command = legalActions.find((action): action is Extract<GameCommand, { type: 'MOVE' }> =>
      action.type === 'MOVE' && action.direction === direction,
    )
    act(command)
  }

  const runCitizens = () => {
    setGame((current) => runBotPhase(current, botController))
    setError(null)
  }

  const endDay = () => {
    if (!player?.alive) return
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
          <p className="eyebrow">WORLD BEYOND PROTOTYPE</p>
          <h1>Live2Nite</h1>
          <p className="subtitle">Day {game.day} · Seed {game.seed}</p>
        </div>
        <button className="secondary" onClick={() => void reset()}>Reset run</button>
      </header>

      <section className="stats" aria-label="Town status">
        <article><span>Population</span><strong>{alive}/40</strong></article>
        <article><span>Gate</span><strong>{game.town.gateOpen ? 'OPEN' : 'CLOSED'}</strong></article>
        <article><span>Defense</span><strong>{game.town.defense}</strong></article>
        <article><span>Your AP</span><strong>{player.ap}/{player.maxAp}</strong></article>
      </section>

      {game.lastNight && (
        <section className={`night ${game.lastNight.breached ? 'danger' : ''}`}>
          <strong>Last night:</strong> attack {game.lastNight.attackStrength} vs effective defense {game.lastNight.effectiveDefense}.{' '}
          {game.lastNight.breached ? 'The town was breached.' : 'The town held.'}
          {game.lastNight.gateOpen && <span> The gate was left OPEN, so the town's defense did not apply.</span>}
          {lastNightDeathNames.length > 0 && <span> Died outside: {lastNightDeathNames.join(', ')}.</span>}
        </section>
      )}

      {!player.alive && (
        <section className="night danger">
          <strong>You died outside during the nightly attack.</strong> Reset the run to continue the current single-player prototype.
        </section>
      )}

      <div className="game-grid">
        <section className="panel action-panel">
          {player.location.type === 'town' ? (
            <TownView game={game} legalActions={legalActions} act={act} />
          ) : (
            <WorldView
              game={game}
              legalActions={legalActions}
              currentZone={currentZone}
              control={control}
              act={act}
              move={move}
            />
          )}
          {error && <p className="error">{error}</p>}

          {control?.trapped && (
            <div className="rescue-hint">
              <strong>You are trapped.</strong> Searching is still allowed, but you cannot move until citizens regain control of this zone. Run citizen activity to give autonomous citizens a chance to respond and rescue you before ending the day.
            </div>
          )}

          <button className="secondary activity" disabled={!player.alive} onClick={runCitizens}>
            Run citizen activity <small>0 AP · no night attack</small>
          </button>
          <button className="primary end-day" disabled={!player.alive} onClick={endDay}>End day / run remaining citizens / resolve night</button>
        </section>

        <section className="panel map-panel">
          <h2>World Beyond</h2>
          <WorldMap game={game} />
          <p className="muted map-key">? unknown · number = observed zombies · T town gate · @ you</p>
        </section>

        <section className="panel">
          <h2>Citizens</h2>
          <p className={`outside-summary ${outsideCitizens.length ? 'danger-text' : ''}`}>
            Outside now: <strong>{outsideCitizens.length}</strong>
            {outsideCitizens.length > 0 && ` — ${outsideCitizens.map((citizen) => citizen.name).join(', ')}`}
          </p>
          <div className="citizen-list">
            {game.citizens.slice(0, 12).map((citizen) => (
              <div className="citizen" key={citizen.id}>
                <span>{citizen.name}{!citizen.alive ? ' †' : ''}</span>
                <span>{citizen.controller === 'human' ? 'HUMAN' : 'BOT'} · {citizen.ap} AP · {citizen.location.type === 'town' ? 'TOWN' : `${citizen.location.x},${citizen.location.y}`}</span>
              </div>
            ))}
            <p className="muted">+ {Math.max(0, game.citizens.length - 12)} additional citizens</p>
          </div>
        </section>

        <section className="panel log-panel">
          <h2>Event Log</h2>
          <ol className="log">
            {game.events.slice(-40).reverse().map((event, index) => (
              <li key={`${game.events.length - index}-${event.type}`}>{describeEvent(event, game)}</li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  )
}

function TownView({ game, legalActions, act }: {
  game: GameState
  legalActions: GameCommand[]
  act: (command: GameCommand | undefined) => void
}) {
  const player = game.citizens[0]
  const open = findAction(legalActions, 'OPEN_GATE')
  const close = findAction(legalActions, 'CLOSE_GATE')
  const exit = findAction(legalActions, 'EXIT_TOWN')
  const deposits = legalActions.filter((action): action is Extract<GameCommand, { type: 'DEPOSIT_ITEM' }> => action.type === 'DEPOSIT_ITEM')

  return (
    <>
      <h2>Town</h2>
      <p>The town is safe during the day. Open the gate to enter the World Beyond. Gate actions cost 1 AP.</p>

      <h3>Gate</h3>
      <div className="actions inline-actions">
        {open && <button onClick={() => act(open)}>Open gate <small>1 AP</small></button>}
        {close && <button onClick={() => act(close)}>Close gate <small>1 AP</small></button>}
        {exit && <button className="primary" onClick={() => act(exit)}>Enter the World Beyond <small>0 AP</small></button>}
      </div>

      <h3>Backpack {player.inventory.length}/{player.inventoryCapacity}</h3>
      {player.inventory.length === 0 ? <p className="muted">Empty.</p> : (
        <div className="item-list">
          {player.inventory.map((item) => {
            const command = deposits.find((candidate) => candidate.itemId === item.id)
            return <button key={item.id} onClick={() => act(command)}>Deposit {itemName(item.type)} <small>0 AP</small></button>
          })}
        </div>
      )}

      <h3>Town Bank</h3>
      <div className="bank-grid">
        {ITEM_TYPES.map((type) => (
          <span key={type}>
            {itemName(type)} <strong>×{game.town.bank[type] ?? 0}</strong>
            <small>{itemPurpose(type)}</small>
          </span>
        ))}
      </div>
    </>
  )
}

function WorldView({ game, legalActions, currentZone, control, act, move }: {
  game: GameState
  legalActions: GameCommand[]
  currentZone: ReturnType<typeof getZone>
  control: ReturnType<typeof zoneControl> | null
  act: (command: GameCommand | undefined) => void
  move: (direction: Direction) => void
}) {
  const player = game.citizens[0]
  if (player.location.type !== 'world' || !currentZone || !control) return null

  const search = findAction(legalActions, 'SEARCH_ZONE')
  const enter = findAction(legalActions, 'ENTER_TOWN')
  const pickups = legalActions.filter((action): action is Extract<GameCommand, { type: 'PICK_UP_ITEM' }> => action.type === 'PICK_UP_ITEM')

  return (
    <>
      <h2>World Beyond [{player.location.x},{player.location.y}]</h2>
      <div className={`control ${control.trapped ? 'danger' : ''}`}>
        <span>Humans: {control.humans} ({control.humanPoints} CP)</span>
        <span>Zombies: {control.zombies} ({control.zombiePoints} CP)</span>
        <strong>{control.trapped ? 'TRAPPED' : 'ZONE CONTROLLED'}</strong>
      </div>

      <div className="movement" aria-label="Movement controls">
        <button disabled={!legalActions.some((a) => a.type === 'MOVE' && a.direction === 'NORTH')} onClick={() => move('NORTH')}>↑ <small>1 AP</small></button>
        <div>
          <button disabled={!legalActions.some((a) => a.type === 'MOVE' && a.direction === 'WEST')} onClick={() => move('WEST')}>←</button>
          <button disabled={!legalActions.some((a) => a.type === 'MOVE' && a.direction === 'SOUTH')} onClick={() => move('SOUTH')}>↓</button>
          <button disabled={!legalActions.some((a) => a.type === 'MOVE' && a.direction === 'EAST')} onClick={() => move('EAST')}>→</button>
        </div>
      </div>

      {enter && <button className="primary" onClick={() => act(enter)}>Enter town <small>0 AP</small></button>}

      <h3>Search</h3>
      <p>{currentZone.searchesRemaining > 0 ? `${currentZone.searchesRemaining} search opportunity(s) remain in this prototype zone.` : 'This zone is depleted.'}</p>
      <button disabled={!search} onClick={() => act(search)}>Search zone <small>0 AP</small></button>

      <h3>Ground</h3>
      {currentZone.groundItems.length === 0 ? <p className="muted">Nothing visible.</p> : (
        <div className="item-list">
          {currentZone.groundItems.map((item) => {
            const command = pickups.find((candidate) => candidate.itemId === item.id)
            return <button key={item.id} disabled={!command} onClick={() => act(command)}>Pick up {itemName(item.type)} <small>0 AP</small></button>
          })}
        </div>
      )}

      <h3>Backpack {player.inventory.length}/{player.inventoryCapacity}</h3>
      <p>{player.inventory.length ? player.inventory.map((item) => itemName(item.type)).join(' · ') : 'Empty'}</p>
    </>
  )
}

function WorldMap({ game }: { game: GameState }) {
  const player = game.citizens[0]
  const rows = []
  for (let y = game.world.maxY; y >= game.world.minY; y -= 1) {
    const cells = []
    for (let x = game.world.minX; x <= game.world.maxX; x += 1) {
      const zone = game.world.zones[zoneKey(x, y)]
      const isPlayer = player.location.type === 'world' && player.location.x === x && player.location.y === y
      const isTown = x === 0 && y === 0
      let label = '?'
      if (zone.discovered) label = String(zone.zombies)
      if (isTown) label = 'T'
      if (isPlayer) label = '@'
      cells.push(
        <span
          key={zoneKey(x, y)}
          className={`map-cell ${zone.discovered ? 'known' : ''} ${isTown ? 'town' : ''} ${isPlayer ? 'player' : ''}`}
          title={zone.discovered ? `[${x},${y}] · ${zone.zombies} zombies` : `[${x},${y}] · unexplored`}
        >{label}</span>,
      )
    }
    rows.push(<div className="map-row" key={y}>{cells}</div>)
  }
  return <div className="world-map">{rows}</div>
}
