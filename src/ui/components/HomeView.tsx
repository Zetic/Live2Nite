import { homeDefenseBonus } from '../../core/construction'
import { HOME_LEVELS, HOME_UPGRADE_AP_COST, homeName, personalDefense } from '../../core/home'
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
      <div className="item-title-row"><strong>{itemName(item.type)}</strong>{location === 'home' && definition.homeDefense ? <span className="home-defense-chip">+{definition.homeDefense} HOME DEF</span> : null}</div>
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

export function HomeView({ game, citizenId, legalActions, act }: {
  game: GameState
  citizenId: string
  legalActions: GameCommand[]
  act: (command: GameCommand | undefined) => void
}) {
  const player = game.citizens.find((citizen) => citizen.id === citizenId) ?? game.citizens[0]
  const upgrade = legalActions.find((action) => action.type === 'UPGRADE_HOME')
  const currentDefense = personalDefense(player,game)
  const structuralDefense = HOME_LEVELS[player.home.level].defense
  const townReinforcement=homeDefenseBonus(game)
  const objectDefense=currentDefense-structuralDefense-townReinforcement

  return <section className="panel screen-panel home-screen">
    <div className="panel-heading">
      <div>
        <p className="section-kicker">{player.controller === 'human' ? 'Your private space' : `${player.name} · controlled citizen`}</p>
        <h2>{homeName(player.home.level)}</h2>
        <p className="section-note">This home is the citizen's last line of defense if zombies get through the town walls.</p>
      </div>
      <div className="home-summary">
        <span>Personal defense <strong>{currentDefense}</strong></span>
        <span>Chest <strong>{player.home.storage.length}/{player.home.storageCapacity}</strong></span>
      </div>
    </div>

    <section className="home-defense-panel">
      <div>
        <p className="section-kicker">Night protection</p>
        <h3>{player.home.level === 'camp_bed' ? 'Upgrade to a Tent' : 'Tent established'}</h3>
        <p>{player.home.level === 'camp_bed'
          ? 'The first documented home upgrade costs 2 AP and raises structural personal defense from 0 to 1.'
          : 'This Tent provides 1 structural defense. Town constructions can reinforce every home further.'}</p>
      </div>
      <div className="home-defense-breakdown">
        <span>Structure <strong>{structuralDefense}</strong></span>
        <span>Town reinforcement <strong>{townReinforcement}</strong></span>
        <span>Defense objects <strong>{objectDefense}</strong></span>
        <span>Total <strong>{currentDefense}</strong></span>
      </div>
      {player.home.level === 'camp_bed' && <button className="primary" disabled={!upgrade} onClick={() => act(upgrade)}>
        Upgrade to Tent <small>{HOME_UPGRADE_AP_COST} AP</small>
      </button>}
    </section>

    <div className="daily-supplies">
      <article className={player.daily.ate ? 'done' : ''}>
        <span>Food refresh</span><strong>{player.daily.ate ? 'USED' : 'AVAILABLE'}</strong><small>Food can refill AP to {player.maxAp} once each day.</small>
      </article>
      <article className={player.daily.drank ? 'done' : ''}>
        <span>Water refresh</span><strong>{player.daily.drank ? 'USED' : 'AVAILABLE'}</strong><small>Water can independently refill AP to {player.maxAp} once each day.</small>
      </article>
      <article className={player.daily.waterTaken ? 'done' : ''}>
        <span>Well ration</span><strong>{player.daily.waterTaken ? 'CLAIMED' : 'UNCLAIMED'}</strong><small>Completed water infrastructure can increase this citizen's daily Well withdrawals.</small>
      </article>
    </div>

    <div className="storage-columns">
      <section className="storage-zone">
        <div className="section-heading-row"><div><h3>Home Chest</h3><p>Defensive objects stored here protect this home and partly contribute to shared town defense.</p></div><span className="micro-stat">{player.home.storage.length}/{player.home.storageCapacity}</span></div>
        <div className="storage-list">{player.home.storage.length === 0 ? <p className="empty-state">This chest is empty.</p> : player.home.storage.map((item) => <ItemCard key={item.id} item={item} location="home" actions={legalActions} act={act}/>)}</div>
      </section>

      <section className="storage-zone">
        <div className="section-heading-row"><div><h3>Rucksack</h3><p>Only carried items travel with this citizen into the World Beyond.</p></div><span className="micro-stat">{player.inventory.length}/{player.inventoryCapacity}</span></div>
        <div className="storage-list">{player.inventory.length === 0 ? <p className="empty-state">Nothing carried.</p> : player.inventory.map((item) => <ItemCard key={item.id} item={item} location="inventory" actions={legalActions} act={act}/>)}</div>
      </section>
    </div>
  </section>
}
