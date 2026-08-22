import { useMemo, useState } from 'react'
import { formatGameHour } from '../../core/clock'
import type { GameEvent, GameState } from '../../core/types'
import { describeEvent, eventTone, isHighlightEvent } from '../eventText'

type LogMode = 'highlights' | 'all'

function eventStamp(event: GameEvent): string {
  return event.hour === undefined ? `D${event.day}` : `D${event.day} · ${formatGameHour(event.hour)}`
}

export function EventLog({ game }: { game: GameState }) {
  const [mode, setMode] = useState<LogMode>('highlights')
  const events = useMemo(() => {
    const filtered = mode === 'highlights' ? game.events.filter(isHighlightEvent) : game.events
    return [...filtered].reverse()
  }, [game.events, mode])

  return <section className="panel screen-panel log-panel">
    <div className="panel-heading">
      <div><p className="section-kicker">Town chronicle</p><h2>Chronicle</h2><p className="section-note">Highlights suppress repetitive travel, clock ticks, and AP bookkeeping. All events exposes the complete timestamped simulation trace.</p></div>
      <div className="segmented" aria-label="Event log filter"><button className={mode==='highlights'?'active':''} onClick={()=>setMode('highlights')}>Highlights</button><button className={mode==='all'?'active':''} onClick={()=>setMode('all')}>All events</button></div>
    </div>
    <div className="event-log" role="log" aria-live="polite">
      {events.map((event,index)=><div className={`event-row tone-${eventTone(event)}`} key={`${game.events.length-index}-${event.type}`}><span className="event-day event-time">{eventStamp(event)}</span><span className="event-dot" aria-hidden="true"/><p>{describeEvent(event,game)}</p></div>)}
    </div>
  </section>
}
