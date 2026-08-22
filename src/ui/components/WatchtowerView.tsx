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

  return <section className="panel screen-panel watchtower-screen">
    <div className="panel-heading">
      <div>
        <p className="section-kicker">Built facility</p>
        <h2>Watchtower</h2>
        <p className="section-note">The tower gives the town an advance estimate of tonight's horde so citizens can decide whether to scavenge or reinforce.</p>
      </div>
      <span className="facility-status online">ONLINE</span>
    </div>

    <div className="watchtower-grid">
      <article className="forecast-card">
        <span>Tonight's estimate</span>
        <strong>{estimate.min}–{estimate.max}</strong>
        <small>zombies expected</small>
      </article>
      <article className="forecast-card">
        <span>Town defense</span>
        <strong>{defense}</strong>
        <small>{game.town.gateOpen ? 'gate open · defense will not apply' : 'gate sealed'}</small>
      </article>
      <article className={`forecast-card forecast-state ${safe ? 'safe' : danger ? 'danger' : 'warning'}`}>
        <span>Current outlook</span>
        <strong>{exposed ? 'EXPOSED' : safe ? 'PREPARED' : danger ? 'UNDERDEFENDED' : 'UNCERTAIN'}</strong>
        <small>{exposed ? 'Close the gate before night.' : safe ? 'Defense covers the full current estimate.' : danger ? 'The estimated minimum exceeds current defense.' : 'The horde may or may not breach.'}</small>
      </article>
    </div>

    <section className="watchtower-note">
      <h3>Estimate reliability</h3>
      <p>The original Watchtower estimated the next attack, with later Scanner/Predictor construction improving information. The exact English base-tower error distribution is not preserved in the sources currently available, so Live2Nite uses a clearly isolated rough estimate envelope until that behavior is reconstructed.</p>
    </section>
  </section>
}
