import { totalTownDefense } from '../../core/defense'
import { watchtowerEstimate } from '../../core/night'
import type { GameState } from '../../core/types'
import { canContributeWatchtower, contributeWatchtowerEstimation, watchtowerContributionWeight, watchtowerContributors, watchtowerTodayQuality, watchtowerTodayWeightedContributions, watchtowerTomorrowQuality, watchtowerTomorrowWeightedContributions } from '../../core/watchtowerEstimation'
import { lastRecordedSearchTowerDirection, observationPlatformRadius, searchTowerRecoveryChance, upgradedMapExact } from '../../core/worldObservation'

export function WatchtowerView({game,citizenId,onContribute}:{game:GameState;citizenId:string;onContribute:(next:GameState)=>void}) {
  const estimate=watchtowerEstimate(game)
  const defense=totalTownDefense(game)
  const contributors=watchtowerContributors(game)
  const weight=watchtowerContributionWeight(game)
  const todayWeighted=watchtowerTodayWeightedContributions(game)
  const todayQuality=Math.round(watchtowerTodayQuality(game)*100)
  const tomorrowWeighted=watchtowerTomorrowWeightedContributions(game)
  const tomorrowQuality=Math.round(watchtowerTomorrowQuality(game)*100)
  const scanner=game.town.construction.scanner?.completed===true
  const telescope=game.town.bank.some((item)=>item.type==='telescope')
  const planner=game.town.construction.planner?.completed===true
  const radius=observationPlatformRadius(game)
  const exactMap=upgradedMapExact(game)
  const searchtower=game.town.construction.search_tower?.completed===true
  const recovery=searchTowerRecoveryChance(game)
  const previousWind=searchtower?lastRecordedSearchTowerDirection(game):null
  const exposed=game.town.gateOpen
  const safe=Boolean(estimate)&&defense>=estimate!.max&&!exposed
  const danger=Boolean(estimate)&&(defense<estimate!.min||exposed)
  const canContribute=canContributeWatchtower(game,citizenId)
  const contribute=()=>{const next=contributeWatchtowerEstimation(game,citizenId);if(next!==game)onContribute(next)}

  return <section className="panel screen-panel watchtower-screen">
    <div className="panel-heading">
      <div>
        <p className="section-kicker">Built facility</p>
        <h2>Watchtower</h2>
        <p className="section-note">Citizens collaboratively estimate the attack once per day. The estimate becomes public at 33% quality and continues narrowing toward the 24-weight target.</p>
      </div>
      <span className="facility-status online">ONLINE</span>
    </div>

    <div className="watchtower-grid">
      <article className="forecast-card"><span>Today's estimation</span><strong>{todayQuality}%</strong><small>{todayWeighted}/24 weighted contributions · {contributors.length} citizen{contributors.length===1?'':'s'}</small></article>
      <article className="forecast-card"><span>Contribution weight</span><strong>×{weight}</strong><small>{scanner||telescope?`${scanner?'Scanner':''}${scanner&&telescope?' + ':''}${telescope?'Telescope in Bank':''} · current source uses one ×2 condition`:'No Scanner or Bank Telescope'}</small></article>
      <article className="forecast-card"><span>Tonight's estimate</span><strong>{estimate?`${estimate.min}–${estimate.max}`:'HIDDEN'}</strong><small>{estimate?`${Math.round(estimate.quality*100)}% quality`:'Requires at least 33% estimation quality'}</small></article>
      <article className="forecast-card"><span>Town defense</span><strong>{defense}</strong><small>{game.town.gateOpen?'gate open · defense will not apply':'gate sealed'}</small></article>
      {estimate&&<article className={`forecast-card forecast-state ${safe?'safe':danger?'danger':'warning'}`}><span>Current outlook</span><strong>{exposed?'EXPOSED':safe?'PREPARED':danger?'UNDERDEFENDED':'UNCERTAIN'}</strong><small>{exposed?'Close the gate before night.':safe?'Defense covers the full current estimate.':danger?'The estimated minimum exceeds current defense.':'The horde may or may not breach.'}</small></article>}
      {planner&&<article className="forecast-card"><span>Planner · Day {game.day+1}</span><strong>{estimate?.tomorrow?`${estimate.tomorrow.min}–${estimate.tomorrow.max}`:`${tomorrowQuality}%`}</strong><small>{todayWeighted<24?'Tomorrow starts only after today reaches 24 weighted contributions.':`${tomorrowWeighted}/24 weighted overflow contributions`}</small></article>}
    </div>

    <section className="watchtower-note">
      <h3>Contribute to the estimate</h3>
      <p>Each living citizen in town may contribute once per day at no AP cost. Scanner or a Telescope in the Bank makes each citizen worth two weighted contributions; having both still gives ×2, not ×4.</p>
      <button type="button" disabled={!canContribute} onClick={contribute}>{canContribute?'Contribute estimation':'Already contributed or unavailable'}</button>
    </section>

    {(game.town.construction.observation_platform?.completed||searchtower)&&<section className="watchtower-note">
      <h3>World Beyond intelligence</h3>
      {game.town.construction.observation_platform?.completed&&<p><strong>Observation Platform:</strong> nightly refresh radius {radius} km. {radius===0?'Vote for the first platform upgrade to activate the 3 km radius.':exactMap?'Upgraded Map records exact zombie counts in refreshed zones.':'Without Upgraded Map, refreshed zones expose only zombie-count bands.'}</p>}
      {searchtower&&<p><strong>Searchtower:</strong> depleted zones beyond 2 km in one nightly compass sector recover at {recovery}% chance. {previousWind?`Previous recovery sector: ${previousWind}.`:'The first recovery sector will be recorded after the nightly cycle.'}</p>}
    </section>}
  </section>
}
