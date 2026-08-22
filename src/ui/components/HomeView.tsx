import { ITEMS, itemName, itemPurpose } from '../../core/items'
import type { GameCommand, GameState, ItemInstance } from '../../core/types'

function commandFor(actions: GameCommand[], type: GameCommand['type'], itemId: string): GameCommand | undefined {
  return actions.find((action) => {
    if (action.type !== type) return false
    return 'itemId' in action && action.itemId === itemId
  })
}

function ItemCard({ item, location, actions, act }: {
  item: ItemInstance
  location: 'home' | 'inventory'
  actions: GameCommand[]
  act: (command: GameCommand | undefined) => void
}) {
  const open = commandFor(actions, 'OPEN_CONTAINER', item.id)
  const eat = commandFor(actions, 'EAT_ITEM', item.id)
  const drink = commandFor(actions, 'DRINK_ITEM', item.id)
  const transfer = commandFor(actions, location === 'home' ? 'MOVE_ITEM_TO_RUCKSACK' : 'MOVE_ITEM_TO_HOME', item.id)
  const definition = ITEMS[item.type]

  return <article className={`storage-item category-${definition.category}`}>
    <div className="storage-item-copy">
      <strong>{itemName(item.type)}</strong>
      <small>{itemPurpose(item.type)}</small>
    </div>
    <div className="storage-item-actions">
      {open && <button onClick={() => act(open)}>Open</button>}
      {eat && <button className="supply-action" onClick={() => act(eat)}>Eat · refill AP</button>}
      {drink && <button className="supply-action" onClick={() => act(drink)}>Drink · refill AP</button>}
      <button disabled={!transfer} onClick={() => act(transfer)}>{location === 'home' ? 'Pack' : 'Store'}</button>
    </div>
  </article>
}

export function HomeView({ game, legalActions, act }: {
  game: GameState
  legalActions: GameCommand[]
  act: (command: GameCommand | undefined) => void
}) {
  const player = game.citizens[0]

  return <section className="panel screen-panel home-screen">
    <div className="panel-heading">
      <div>
        <p className="section-kicker">Your private space</p>
        <h2>Camp Bed</h2>
        <p className="section-note">Your home chest is private storage. Later home upgrades will add defense, security, and more capacity.</p>
      </div>
      <div className="home-summary">
        <span>Personal defense <strong>{player.home.defense}</strong></span>
        <span>Chest <strong>{player.home.storage.length}/{player.home.storageCapacity}</strong></span>
      </div>
    </div>

    <div className="daily-supplies">
      <article className={player.daily.ate ? 'done' : ''}>
        <span>Food refresh</span>
        <strong>{player.daily.ate ? 'USED' : 'AVAILABLE'}</strong>
        <small>Food can refill your AP to {player.maxAp} once each day.</small>
      </article>
      <article className={player.daily.drank ? 'done' : ''}>
        <span>Water refresh</span>
        <strong>{player.daily.drank ? 'USED' : 'AVAILABLE'}</strong>
        <small>Water can independently refill your AP to {player.maxAp} once each day.</small>
      </article>
      <article className={player.daily.waterTaken ? 'done' : ''}>
        <span>Well ration</span>
        <strong>{player.daily.waterTaken ? 'CLAIMED' : 'UNCLAIMED'}</strong>
        <small>You may take one Water Ration from the town well per day.</small>
      </article>
    </div>

    <div className="storage-columns">
      <section className="storage-zone">
        <div className="section-heading-row">
          <div><h3>Home Chest</h3><p>Starter supplies begin here. Opening a package replaces it with the item inside.</p></div>
          <span className="micro-stat">{player.home.storage.length}/{player.home.storageCapacity}</span>
        </div>
        <div className="storage-list">
          {player.home.storage.length === 0
            ? <p className="empty-state">Your chest is empty.</p>
            : player.home.storage.map((item) => <ItemCard key={item.id} item={item} location="home" actions={legalActions} act={act}/>)}
        </div>
      </section>

      <section className="storage-zone">
        <div className="section-heading-row">
          <div><h3>Rucksack</h3><p>Only carried items travel with you into the World Beyond.</p></div>
          <span className="micro-stat">{player.inventory.length}/{player.inventoryCapacity}</span>
        </div>
        <div className="storage-list">
          {player.inventory.length === 0
            ? <p className="empty-state">Nothing carried.</p>
            : player.inventory.map((item) => <ItemCard key={item.id} item={item} location="inventory" actions={legalActions} act={act}/>)}
        </div>
      </section>
    </div>
  </section>
}
