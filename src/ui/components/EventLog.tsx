import { useMemo, useState } from 'react'
import type { GameState } from '../../core/types'
import { describeEvent, eventTone, isHighlightEvent } from '../eventText'

type LogMode = 'highlights' | 'all'

export function EventLog({ game }: { game: GameState }) {
  const [mode, setMode] = useState<LogMode>('highlights')
  const events = useMemo(() => {
    const filtered = mode === 'highlights' ? game.events.filter(isHighlightEvent) : game.events
    return [...filtered].reverse()
  }, [game.events, mode])

  return <section className="panel log-panel">
    <div className="panel-heading">
      <div><p className="section-kicker">Town chronicle</p><h2>Event Log</h2><p className="section-note">Readable highlights by default. Switch to All events for the full simulation trace.</p></div>
      <div className="segmented" aria-label="Event log filter"><button className={mode==='highlights'?'active':''} onClick={()=>setMode('highlights')}>Highlights</button><button className={mode==='all'?'active':''} onClick={()=>setMode('all')}>All events</button></div>
    </div>
    <div className="event-log" role="log" aria-live="polite">
      {events.map((event,index)=><div className={`event-row tone-${eventTone(event)}`} key={`${game.events.length-index}-${event.type}`}><span className="event-day">D{event.day}</span><span className="event-dot" aria-hidden="true"/><p>{describeEvent(event,game)}</p></div>)}
    </div>
  </section>
}
