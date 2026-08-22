import { useState } from 'react'
import type { GameState } from '../../core/types'
import { EventLog } from './EventLog'
import { TownStatistics } from './TownStatistics'

type RecordsView = 'chronicle' | 'statistics'

export function TownRecords({ game }: { game: GameState }) {
  const [view, setView] = useState<RecordsView>('chronicle')

  return <div className="town-records">
    <div className="records-tabs" role="tablist" aria-label="Town records view">
      <button role="tab" aria-selected={view === 'chronicle'} className={view === 'chronicle' ? 'active' : ''} onClick={() => setView('chronicle')}>
        <strong>Chronicle</strong><small>Filter the town event history</small>
      </button>
      <button role="tab" aria-selected={view === 'statistics'} className={view === 'statistics' ? 'active' : ''} onClick={() => setView('statistics')}>
        <strong>Statistics</strong><small>Town and citizen totals</small>
      </button>
    </div>
    {view === 'chronicle' ? <EventLog game={game}/> : <TownStatistics game={game}/>} 
  </div>
}
