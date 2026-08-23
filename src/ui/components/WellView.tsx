import { wellDailyWithdrawals } from '../../core/construction'
import type { GameCommand, GameState } from '../../core/types'
import { findAction } from '../actionHelpers'

export function WellView({ game, citizenId, legalActions, act }: {
  game: GameState
  citizenId: string
  legalActions: GameCommand[]
  act: (command: GameCommand | undefined) => void
}) {
  const player = game.citizens.find((citizen) => citizen.id === citizenId) ?? game.citizens[0]
  const takeWater = findAction(legalActions, 'TAKE_WATER')
  const allowance=wellDailyWithdrawals(game)
  const taken=Number(player.daily.waterTaken)+Number(Boolean(player.daily.bonusWaterTaken))

  let status = `${player.name} can claim ${allowance-taken} more ration${allowance-taken===1?'':'s'} today.`
  if(taken>=allowance)status=`${player.name} used today's Well allowance.`
  else if (game.town.well.water <= 0) status = 'The well is dry.'
  else if (player.inventory.length >= player.inventoryCapacity) status = `${player.name}'s rucksack is full.`

  return <section className="panel screen-panel">
    <div className="panel-heading">
      <div><p className="section-kicker">Town water supply</p><h2>The Well</h2><p className="section-note">Water constructions can expand the reserve and increase each citizen's daily withdrawal allowance.</p></div>
      <span className="panel-count">{game.town.well.water} rations</span>
    </div>

    <section className="town-feature well-card facility-hero-card">
      <div className="feature-icon" aria-hidden="true">W</div>
      <div className="feature-copy"><span>Shared reserve</span><strong>{game.town.well.water} Water Rations</strong><p>{status}</p></div>
      <button className="feature-action primary" disabled={!takeWater} onClick={() => act(takeWater)}>Take ration <small>0 AP</small></button>
    </section>

    <div className="daily-supplies well-status-grid">
      <article className={taken>=allowance ? 'done' : ''}><span>{player.name} · ration</span><strong>{taken}/{allowance}</strong><small>Well withdrawals reset at the beginning of the next day.</small></article>
      <article className={player.daily.drank ? 'done' : ''}><span>Water refresh</span><strong>{player.daily.drank ? 'USED' : 'AVAILABLE'}</strong><small>A carried Water Ration can refresh AP once per day.</small></article>
      <article><span>Rucksack</span><strong>{player.inventory.length}/{player.inventoryCapacity}</strong><small>An empty carried slot is required to take a ration.</small></article>
    </div>
  </section>
}
