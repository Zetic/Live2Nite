import { useMemo, useState } from 'react'
import { RUIN_CATALOG, type RuinAvailability } from '../../core/ruinCatalog'
import type { RuinId } from '../../core/ruinIds'

type RuinFilter='all'|RuinAvailability
const ENTRIES=Object.values(RUIN_CATALOG).sort((a,b)=>a.name.localeCompare(b.name))
const FILTERS:readonly {id:RuinFilter;label:string}[]=[
  {id:'all',label:'All ruins'},
  {id:'ordinary',label:'Ordinary'},
  {id:'explorable',label:'Explorable'},
  {id:'conditional',label:'Conditional'},
]

function availabilityLabel(value:RuinAvailability):string{return value==='ordinary'?'Ordinary ruin':value==='explorable'?'Explorable ruin':'Conditional ruin'}
function percentage(value:number):string{return`${Math.round(value*100)}%`}

export function RuinsCodexView(){
  const [filter,setFilter]=useState<RuinFilter>('all')
  const [query,setQuery]=useState('')
  const [selected,setSelected]=useState<RuinId>(ENTRIES[0].id)
  const visible=useMemo(()=>ENTRIES.filter((entry)=>(filter==='all'||entry.availability===filter)&&`${entry.name} ${entry.id} ${entry.lootProfile} ${entry.family??''}`.toLowerCase().includes(query.trim().toLowerCase())),[filter,query])
  const entry=visible.find((candidate)=>candidate.id===selected)??visible[0]??null
  return <>
    <div className="codex-category-tabs" role="tablist" aria-label="Ruin categories">
      {FILTERS.map((item)=><button type="button" key={item.id} className={filter===item.id?'active':''} aria-selected={filter===item.id} onClick={()=>setFilter(item.id)}><span>{item.label}</span><small>{item.id==='all'?ENTRIES.length:ENTRIES.filter((ruin)=>ruin.availability===item.id).length}</small></button>)}
    </div>
    <div className="codex-toolbar"><label><span>Search ruins</span><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Name, family, loot profile…"/></label><strong>{visible.length} shown</strong></div>
    <div className="codex-layout">
      <section className="codex-list-panel" aria-label="Ruin catalogue"><div className="codex-item-list">
        {visible.map((ruin)=><button type="button" key={ruin.id} className={`codex-item-row ${entry?.id===ruin.id?'active':''}`} onClick={()=>setSelected(ruin.id)}><span><strong>{ruin.name}</strong><small>{availabilityLabel(ruin.availability)} · {ruin.lootProfile}</small></span><span className="codex-row-arrow" aria-hidden="true">›</span></button>)}
        {visible.length===0&&<p className="empty-state">No ruins match this search.</p>}
      </div></section>
      {entry?<article className="codex-detail" aria-live="polite">
        <div className="codex-detail-heading"><div><p className="section-kicker">{availabilityLabel(entry.availability)}</p><h2>{entry.name}</h2></div><span className="codex-source-chip">{entry.id}</span></div>
        <p className="codex-purpose">{entry.explorable?`A fully explorable ${entry.family} ruin with a persistent two-floor interior.`:entry.availability==='conditional'?'Catalogued from the source data, but excluded from ordinary map generation until its reveal condition is implemented.':'A buried World Beyond ruin selected through the source-backed weighted ruin catalogue.'}</p>
        <section className="codex-detail-section"><h3>Source data</h3><dl className="codex-facts">
          <div><dt>Spawn weight</dt><dd>{entry.spawnChance}</dd></div>
          <div><dt>Source distance band</dt><dd>{entry.sourceKm.min}–{entry.sourceKm.max} km</dd></div>
          <div><dt>Empty chance</dt><dd>{percentage(entry.emptyChance)}</dd></div>
          <div><dt>Camping modifier</dt><dd>{entry.campingBase>=0?'+':''}{entry.campingBase}</dd></div>
          <div><dt>Camping spots</dt><dd>{entry.campingSpots}</dd></div>
          <div><dt>Loot profile</dt><dd>{entry.lootProfile}</dd></div>
          {entry.family&&<div><dt>Explorable family</dt><dd>{entry.family}</dd></div>}
        </dl></section>
        {entry.explorable&&<section className="codex-detail-section"><h3>Interior rules</h3><div className="codex-mechanics-list"><p>15 rooms distributed across two floors with at least five rooms on each floor.</p><p>Normal explorers receive five minutes of oxygen plus a 30-second entry grace window. Stair use and fleeing consume an additional 15–24 seconds.</p><p>The Bunker descends to a basement floor; Hotel and Hospital interiors extend upward.</p><p>Entry costs 1 AP and only one citizen may actively explore a ruin at a time.</p></div></section>}
      </article>:<article className="codex-detail"><p className="empty-state">No ruin is available for the current filter.</p></article>}
    </div>
  </>
}
