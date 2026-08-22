import { useMemo, useState } from 'react'
import { formatGameHour } from '../../core/clock'
import type { GameEvent, GameState } from '../../core/types'
import { availableChronicleDays, CHRONICLE_CATEGORIES, chronicleCategory, filterChronicleEvents, type ChronicleCategory, type ChronicleMode } from '../chronicle'
import { describeEvent, eventTone } from '../eventText'

function eventStamp(event: GameEvent): string {
  return event.hour === undefined ? `D${event.day}` : `D${event.day} · ${formatGameHour(event.hour)}`
}

export function EventLog({ game }: { game: GameState }) {
  const [mode, setMode] = useState<ChronicleMode>('highlights')
  const [day, setDay] = useState<number | null>(null)
  const [citizenId, setCitizenId] = useState<string | null>(null)
  const [categories, setCategories] = useState<ChronicleCategory[]>([])
  const days = useMemo(() => availableChronicleDays(game.events), [game.events])
  const events = useMemo(() => [...filterChronicleEvents(game.events, { mode, day, citizenId, categories })].reverse(), [game.events, mode, day, citizenId, categories])

  const toggleCategory = (category: ChronicleCategory) => {
    setCategories((current) => current.includes(category) ? current.filter((entry) => entry !== category) : [...current, category])
  }
  const clearFilters = () => {
    setDay(null)
    setCitizenId(null)
    setCategories([])
  }
  const hasFilters = day !== null || citizenId !== null || categories.length > 0

  return <section className="panel screen-panel log-panel">
    <div className="panel-heading chronicle-heading">
      <div><p className="section-kicker">Town chronicle</p><h2>Chronicle</h2><p className="section-note">Filter the authoritative event history by day, citizen, and activity. Highlights suppress repetitive travel, clock ticks, and AP bookkeeping.</p></div>
      <div className="segmented" aria-label="Event log detail"><button className={mode==='highlights'?'active':''} onClick={()=>setMode('highlights')}>Highlights</button><button className={mode==='all'?'active':''} onClick={()=>setMode('all')}>All events</button></div>
    </div>

    <div className="chronicle-filters">
      <label><span>Day</span><select value={day ?? ''} onChange={(event) => setDay(event.target.value === '' ? null : Number(event.target.value))}><option value="">All days</option>{days.map((value) => <option value={value} key={value}>Day {value}</option>)}</select></label>
      <label><span>Citizen</span><select value={citizenId ?? ''} onChange={(event) => setCitizenId(event.target.value || null)}><option value="">All citizens</option>{game.citizens.map((citizen) => <option value={citizen.id} key={citizen.id}>{citizen.name}{citizen.alive ? '' : ' · dead'}</option>)}</select></label>
      <div className="chronicle-filter-summary"><span>Visible events</span><strong>{events.length}<small> / {game.events.length}</small></strong>{hasFilters && <button className="secondary compact-button" onClick={clearFilters}>Clear filters</button>}</div>
    </div>

    <div className="chronicle-category-filter" aria-label="Chronicle category filters">
      <button className={categories.length === 0 ? 'active' : ''} onClick={() => setCategories([])}>All categories</button>
      {CHRONICLE_CATEGORIES.map((category) => <button key={category.id} className={categories.includes(category.id) ? 'active' : ''} aria-pressed={categories.includes(category.id)} onClick={() => toggleCategory(category.id)}>{category.label}</button>)}
    </div>

    <div className="event-log" role="log" aria-live="polite">
      {events.length === 0 && <p className="chronicle-empty">No Chronicle events match these filters.</p>}
      {events.map((event,index) => {
        const category = chronicleCategory(event)
        const categoryLabel = CHRONICLE_CATEGORIES.find((entry) => entry.id === category)?.label ?? category
        return <div className={`event-row tone-${eventTone(event)} category-${category}`} key={`${game.events.length-index}-${event.type}-${event.day}-${event.hour ?? 'day'}`}><span className="event-day event-time">{eventStamp(event)}</span><span className="event-dot" aria-hidden="true"/><span className="event-category">{categoryLabel}</span><p>{describeEvent(event,game)}</p></div>
      })}
    </div>
  </section>
}
