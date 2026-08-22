import { useMemo, useState } from 'react'
import type { GameState } from '../../core/types'
import { computeTownStats } from '../townStats'
import { EventLog } from './EventLog'
import { TownStatistics } from './TownStatistics'

type EndView = 'report' | 'chronicle'

export function TownEndScreen({ game, onRestart }: { game: GameState; onRestart: () => void }) {
  const [view, setView] = useState<EndView>('report')
  const stats = useMemo(() => computeTownStats(game), [game])
  const fallLabel = stats.terminalNight === null ? 'The town has no surviving citizens.' : `The town fell during Night ${stats.terminalNight}.`

  return <section className="town-end-screen">
    <div className="town-end-hero">
      <p className="section-kicker">Final record</p>
      <h2>The town has fallen.</h2>
      <p>{fallLabel} Its complete simulation history remains available for review.</p>
      <div className="end-summary-row">
        <article><span>Nights resolved</span><strong>{stats.nightsResolved}</strong></article>
        <article><span>Citizens lost</span><strong>{stats.populationDead}</strong></article>
        <article><span>Zombies killed</span><strong>{stats.zombiesKilled}</strong></article>
        <article><span>Zones discovered</span><strong>{stats.zonesDiscovered}</strong></article>
        <article><span>Projects built</span><strong>{stats.completedProjectIds.length}</strong></article>
      </div>
      <div className="end-actions">
        <div className="records-tabs end-tabs" role="tablist" aria-label="Final town records view">
          <button role="tab" aria-selected={view === 'report'} className={view === 'report' ? 'active' : ''} onClick={() => setView('report')}><strong>Final report</strong><small>Town statistics</small></button>
          <button role="tab" aria-selected={view === 'chronicle'} className={view === 'chronicle' ? 'active' : ''} onClick={() => setView('chronicle')}><strong>Chronicle</strong><small>Review what happened</small></button>
        </div>
        <button className="primary end-restart" onClick={onRestart}>Start a new town</button>
      </div>
    </div>
    {view === 'report' ? <TownStatistics game={game} terminal/> : <EventLog game={game}/>} 
  </section>
}
