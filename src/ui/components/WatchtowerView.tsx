import { watchtowerMarginPercent } from '../../core/construction'
import { totalTownDefense } from '../../core/defense'
import { watchtowerEstimate } from '../../core/night'
import type { GameState } from '../../core/types'

export function WatchtowerView({ game }: { game: GameState }) {
  const estimate = watchtowerEstimate(game)
  if (!estimate) return null

  const defense = totalTownDefense(game)
  const safe = defense >= estimate.max && !game.town.gateOpen
  const exposed = game.town.gateOpen
  const danger = defense < estimate.min || exposed
  const margin=watchtowerMarginPercent(game)

  return <section className="panel screen-panel watchtower-screen">
    <div className="panel-heading">
      <div>
        <p className="section-kicker">Built facility</p>
        <h2>Watchtower</h2>
        <p className="section-note">The tower gives the town an advance horde estimate. Scanner and Planner construction upgrades improve its strategic information.</p>
      </div>
      <span className="facility-status online">ONLINE</span>
    </div>

    <div className="watchtower-grid">
      <article className="forecast-card"><span>Tonight's estimate</span><strong>{estimate.min}–{estimate.max}</strong><small>zombies expected · ±{margin}% model</small></article>
      <article className="forecast-card"><span>Town defense</span><strong>{defense}</strong><small>{game.town.gateOpen ? 'gate open · defense will not apply' : 'gate sealed'}</small></article>
      <article className={`forecast-card forecast-state ${safe ? 'safe' : danger ? 'danger' : 'warning'}`}><span>Current outlook</span><strong>{exposed ? 'EXPOSED' : safe ? 'PREPARED' : danger ? 'UNDERDEFENDED' : 'UNCERTAIN'}</strong><small>{exposed ? 'Close the gate before night.' : safe ? 'Defense covers the full current estimate.' : danger ? 'The estimated minimum exceeds current defense.' : 'The horde may or may not breach.'}</small></article>
      {estimate.tomorrow&&<article className="forecast-card"><span>Day {estimate.tomorrow.day} planning</span><strong>{estimate.tomorrow.min}–{estimate.tomorrow.max}</strong><small>Planner forecast for the following attack</small></article>}
    </div>

    <section className="watchtower-note">
      <h3>Estimate reliability</h3>
      <p>The exact historical English error distribution is incomplete. Live2Nite keeps the estimate envelope isolated as an adaptation: the base Watchtower uses a broad margin and the Scanner narrows it. Planner extends forecasting into the following day.</p>
    </section>
  </section>
}
