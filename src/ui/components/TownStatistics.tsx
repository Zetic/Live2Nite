import { useMemo } from 'react'
import { CONSTRUCTIONS } from '../../core/construction'
import type { DeathReason, GameState } from '../../core/types'
import { computeTownStats } from '../townStats'

function deathLabel(reason: DeathReason | null): string {
  switch (reason) {
    case 'outside_at_night': return 'Stranded outside'
    case 'camping_failure': return 'Camping failure'
    case 'home_breach': return 'Home breach'
    case 'dehydration': return 'Dehydration'
    default: return 'Dead'
  }
}

export function TownStatistics({ game, terminal = false }: { game: GameState; terminal?: boolean }) {
  const stats = useMemo(() => computeTownStats(game), [game])
  const completed = stats.completedProjectIds.map((id) => CONSTRUCTIONS[id].name)
  const leaders = [
    ['Zombie hunter', stats.leaders.zombieKills, stats.leaders.zombieKills?.zombieKills ?? 0, 'kills'],
    ['Scavenger', stats.leaders.searches, stats.leaders.searches?.searches ?? 0, 'searches'],
    ['Bank contributor', stats.leaders.bankDeposits, stats.leaders.bankDeposits?.bankDeposits ?? 0, 'deposits'],
    ['Builder', stats.leaders.constructionAp, stats.leaders.constructionAp?.constructionAp ?? 0, 'AP'],
    ['Traveler', stats.leaders.travelSteps, stats.leaders.travelSteps?.travelSteps ?? 0, 'steps'],
  ] as const

  return <section className={`panel screen-panel statistics-panel${terminal ? ' terminal-statistics' : ''}`}>
    <div className="panel-heading">
      <div>
        <p className="section-kicker">Town record</p>
        <h2>{terminal ? 'Final town report' : 'Statistics'}</h2>
        <p className="section-note">Derived from the authoritative event history and current town state. These totals do not add new persisted gameplay state.</p>
      </div>
      <span className="panel-count">{stats.nightsResolved} night{stats.nightsResolved === 1 ? '' : 's'} resolved</span>
    </div>

    <div className="stat-card-grid">
      <article className="stat-card"><span>Population</span><strong>{stats.populationAlive}<small> / {stats.populationStart}</small></strong><p>{stats.populationDead} dead</p></article>
      <article className="stat-card"><span>Town defense</span><strong>{stats.townDefense}</strong><p>Current effective base value</p></article>
      <article className="stat-card"><span>Well water</span><strong>{stats.wellWater}</strong><p>Rations remaining</p></article>
      <article className="stat-card"><span>World discovered</span><strong>{stats.zonesDiscovered}</strong><p>{stats.specialSitesDiscovered} special site{stats.specialSitesDiscovered === 1 ? '' : 's'}</p></article>
      <article className="stat-card"><span>Furthest reach</span><strong>{stats.furthestDistance}</strong><p>Tiles from town</p></article>
      <article className="stat-card"><span>Projects built</span><strong>{stats.completedProjectIds.length}</strong><p>{completed.length ? completed.join(', ') : 'None completed'}</p></article>
    </div>

    <div className="records-section-grid">
      <section className="records-section">
        <div className="records-section-heading"><div><p className="section-kicker">Expeditions</p><h3>Scavenging & camping</h3></div></div>
        <dl className="stat-list">
          <div><dt>Total searches</dt><dd>{stats.searches}</dd></div>
          <div><dt>Normal searches</dt><dd>{stats.normalSearches}</dd></div>
          <div><dt>Depleted searches</dt><dd>{stats.depletedSearches}</dd></div>
          <div><dt>Automatic searches</dt><dd>{stats.automaticSearches}</dd></div>
          <div><dt>Special-site searches</dt><dd>{stats.specialSiteSearches}</dd></div>
          <div><dt>Loot uncovered</dt><dd>{stats.lootFound}</dd></div>
          <div><dt>Camping attempts</dt><dd>{stats.campingAttempts}</dd></div>
          <div><dt>Camping survived</dt><dd>{stats.campingSurvivors}</dd></div>
          <div><dt>Camping deaths</dt><dd>{stats.campingDeaths}</dd></div>
        </dl>
      </section>

      <section className="records-section">
        <div className="records-section-heading"><div><p className="section-kicker">Town effort</p><h3>Combat & economy</h3></div></div>
        <dl className="stat-list">
          <div><dt>Zombies killed</dt><dd>{stats.zombiesKilled}</dd></div>
          <div><dt>Combat encounters</dt><dd>{stats.combatEncounters}</dd></div>
          <div><dt>Weapons broken</dt><dd>{stats.weaponsBroken}</dd></div>
          <div><dt>Bank deposits</dt><dd>{stats.bankDeposits}</dd></div>
          <div><dt>Bank withdrawals</dt><dd>{stats.bankWithdrawals}</dd></div>
          <div><dt>Construction AP</dt><dd>{stats.constructionAp}</dd></div>
          <div><dt>Workshop actions</dt><dd>{stats.workshopConversions}</dd></div>
          <div><dt>Stranded deaths</dt><dd>{stats.deathsByReason.outside_at_night}</dd></div>
          <div><dt>Home-breach deaths</dt><dd>{stats.deathsByReason.home_breach}</dd></div>
          <div><dt>Dehydration deaths</dt><dd>{stats.deathsByReason.dehydration}</dd></div>
        </dl>
      </section>
    </div>

    <section className="records-section citizen-records-section">
      <div className="records-section-heading"><div><p className="section-kicker">Notable citizens</p><h3>Town records</h3></div></div>
      <div className="record-leaders">
        {leaders.map(([label, record, value, unit]) => <article key={label} className="leader-card"><span>{label}</span><strong>{record ? record.name : '—'}</strong><small>{record ? `${value} ${unit}` : 'No record yet'}</small></article>)}
      </div>
    </section>

    <section className="records-section citizen-records-section">
      <div className="records-section-heading"><div><p className="section-kicker">Citizen ledger</p><h3>Individual activity</h3><p className="section-note">AP and transaction columns make genuine work distinguishable from zero-AP inventory churn.</p></div><span className="panel-count">{stats.citizens.length} citizens</span></div>
      <div className="citizen-stat-table-wrap">
        <table className="citizen-stat-table">
          <thead><tr><th>Citizen</th><th>Status</th><th>AP spent</th><th>Missions</th><th>Searches</th><th>Loot</th><th>Ground +/-</th><th>Bank D/W</th><th>Build AP</th><th>Workshop</th><th>Home</th><th>Travel</th><th>Camps</th></tr></thead>
          <tbody>{stats.citizens.map((record) => <tr key={record.citizenId} className={record.alive ? '' : 'dead-row'}>
            <td><strong>{record.name}</strong></td>
            <td>{record.alive ? <span className="citizen-state alive-state">Alive</span> : <span className="citizen-state dead-state">D{record.deathDay ?? '?'} · {deathLabel(record.deathReason)}</span>}</td>
            <td>{record.apSpent}</td><td>{record.missions}</td><td>{record.searches}</td><td>{record.lootFound}</td><td>{record.itemsPickedUp}/{record.itemsDropped}</td><td>{record.bankDeposits}/{record.bankWithdrawals}</td><td>{record.constructionAp}</td><td>{record.workshopActions}</td><td>{record.homeActions}</td><td>{record.travelSteps}</td><td>{record.campingSurvivals}/{record.campingAttempts}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>
  </section>
}