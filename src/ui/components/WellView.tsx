import type { GameCommand, GameState } from '../../core/types'
import { findAction } from '../actionHelpers'

export function WellView({ game, legalActions, act }: {
  game: GameState
  legalActions: GameCommand[]
  act: (command: GameCommand | undefined) => void
}) {
  const player = game.citizens[0]
  const takeWater = findAction(legalActions, 'TAKE_WATER')

  let status = 'Your daily ration is available.'
  if (player.daily.waterTaken) status = 'You already claimed today’s ration.'
  else if (game.town.well.water <= 0) status = 'The well is dry.'
  else if (player.inventory.length >= player.inventoryCapacity) status = 'Your rucksack is full.'

  return <section className="panel screen-panel">
    <div className="panel-heading">
      <div><p className="section-kicker">Town water supply</p><h2>The Well</h2><p className="section-note">Every citizen may claim one Water Ration per day while the shared supply lasts.</p></div>
      <span className="panel-count">{game.town.well.water} rations</span>
    </div>

    <section className="town-feature well-card facility-hero-card">
      <div className="feature-icon" aria-hidden="true">W</div>
      <div className="feature-copy"><span>Shared reserve</span><strong>{game.town.well.water} Water Rations</strong><p>{status}</p></div>
      <button className="feature-action primary" disabled={!takeWater} onClick={() => act(takeWater)}>Take ration <small>0 AP</small></button>
    </section>

    <div className="daily-supplies well-status-grid">
      <article className={player.daily.waterTaken ? 'done' : ''}><span>Your ration</span><strong>{player.daily.waterTaken ? 'CLAIMED' : 'AVAILABLE'}</strong><small>Well withdrawals reset at the beginning of the next day.</small></article>
      <article className={player.daily.drank ? 'done' : ''}><span>Water refresh</span><strong>{player.daily.drank ? 'USED' : 'AVAILABLE'}</strong><small>A carried Water Ration can refresh your AP once per day.</small></article>
      <article><span>Rucksack</span><strong>{player.inventory.length}/{player.inventoryCapacity}</strong><small>You need an empty carried slot to take a ration.</small></article>
    </div>
  </section>
}
