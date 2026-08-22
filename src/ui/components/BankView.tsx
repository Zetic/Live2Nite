import { ITEMS, ITEM_TYPES, itemName, itemPurpose } from '../../core/items'
import type { GameCommand, GameState, ItemType } from '../../core/types'

const STANDARD_BANK_TYPES = new Set<ItemType>([
  'rotten_log','scrap_metal','twisted_plank','wrought_iron','unshaped_concrete_block','water_ration','food','old_door','water_bomb',
])

export function BankView({ game, citizenId, legalActions, act }: {
  game: GameState
  citizenId: string
  legalActions: GameCommand[]
  act: (command: GameCommand | undefined) => void
}) {
  const player = game.citizens.find((citizen) => citizen.id === citizenId) ?? game.citizens[0]
  const deposits = legalActions.filter((action): action is Extract<GameCommand,{type:'DEPOSIT_ITEM'}> => action.type === 'DEPOSIT_ITEM')
  const withdrawals = legalActions.filter((action): action is Extract<GameCommand,{type:'WITHDRAW_BANK_ITEM'}> => action.type === 'WITHDRAW_BANK_ITEM')
  const visibleBankTypes = ITEM_TYPES.filter((type) => STANDARD_BANK_TYPES.has(type) || (game.town.bank[type] ?? 0) > 0)
  const totalItems = ITEM_TYPES.reduce((sum, type) => sum + (game.town.bank[type] ?? 0), 0)

  return <section className="panel screen-panel">
    <div className="panel-heading">
      <div><p className="section-kicker">Shared town storage</p><h2>The Bank</h2><p className="section-note">Construction draws from the bank. The controlled citizen may deposit carried finds or withdraw shared items into an open rucksack slot.</p></div>
      <span className="panel-count">{totalItems} items</span>
    </div>

    <section className="town-section split-section bank-screen-grid">
      <div>
        <h3>{player.name} · Rucksack <span className="heading-count">{player.inventory.length}/{player.inventoryCapacity}</span></h3>
        <p className="section-note">Deposit expedition finds here to make them available to the entire town.</p>
        {player.inventory.length === 0
          ? <p className="empty-state">Nothing carried.</p>
          : <div className="item-list">{player.inventory.map((item) => {
              const command = deposits.find((candidate) => candidate.itemId === item.id)
              return <button key={item.id} onClick={() => act(command)}>Deposit {itemName(item.type)} <small>0 AP</small></button>
            })}</div>}
      </div>
      <div>
        <h3>Shared Inventory</h3>
        <div className="bank-grid">{visibleBankTypes.map((type) => {
          const count = game.town.bank[type] ?? 0
          const withdraw = withdrawals.find((action) => action.itemType === type)
          return <article className={`bank-item category-${ITEMS[type].category}`} key={type}>
            <div><span>{itemName(type)}</span><strong>×{count}</strong></div>
            <small>{itemPurpose(type)}</small>
            {count > 0 && <button className="bank-take" disabled={!withdraw} onClick={() => act(withdraw)}>Take one</button>}
          </article>
        })}</div>
      </div>
    </section>
  </section>
}
