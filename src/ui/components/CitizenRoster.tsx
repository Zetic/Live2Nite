import { useMemo, useState } from 'react'
import type { Citizen, GameState } from '../../core/types'

type RosterFilter = 'all' | 'town' | 'outside' | 'dead'

function matchesFilter(citizen: Citizen, filter: RosterFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'dead') return !citizen.alive
  if (!citizen.alive) return false
  if (filter === 'town') return citizen.location.type === 'town'
  return citizen.location.type === 'world'
}
function locationLabel(citizen: Citizen): string {
  if (!citizen.alive) return 'DEAD'
  return citizen.location.type === 'town' ? 'TOWN' : `[${citizen.location.x},${citizen.location.y}]`
}

export function CitizenRoster({ game }: { game: GameState }) {
  const [filter,setFilter]=useState<RosterFilter>('all')
  const counts=useMemo(()=>({ all:game.citizens.length, town:game.citizens.filter(c=>c.alive&&c.location.type==='town').length, outside:game.citizens.filter(c=>c.alive&&c.location.type==='world').length, dead:game.citizens.filter(c=>!c.alive).length }),[game.citizens])
  const citizens=useMemo(()=>game.citizens.filter(c=>matchesFilter(c,filter)).sort((a,b)=>{ if(a.controller==='human')return -1;if(b.controller==='human')return 1;if(a.alive!==b.alive)return a.alive?-1:1;return a.name.localeCompare(b.name)}),[game.citizens,filter])
  return <section className="panel screen-panel roster-panel">
    <div className="panel-heading compact"><div><p className="section-kicker">Population</p><h2>Citizens</h2><p className="section-note">All forty citizen slots remain visible; private chest contents are summarized rather than exposed.</p></div><span className="panel-count">{counts.all}</span></div>
    <div className="roster-filters" aria-label="Citizen filters">{(['all','town','outside','dead'] as const).map(value=><button key={value} className={filter===value?'active':''} onClick={()=>setFilter(value)}>{value==='all'?'All':value[0].toUpperCase()+value.slice(1)} <span>{counts[value]}</span></button>)}</div>
    <div className="citizen-roster">{citizens.map(citizen=>{const apPercent=citizen.maxAp?Math.round((citizen.ap/citizen.maxAp)*100):0;return <article className={`citizen-card ${!citizen.alive?'dead':''}`} key={citizen.id}>
      <div className="citizen-main"><div><strong>{citizen.name}</strong>{citizen.controller==='human'&&<span className="you-badge">YOU</span>}</div><span className={`location-badge ${citizen.location.type==='world'&&citizen.alive?'outside':''}`}>{locationLabel(citizen)}</span></div>
      <div className="citizen-meta"><span>{citizen.ap}/{citizen.maxAp} AP</span><span>{citizen.inventory.length}/{citizen.inventoryCapacity} carried</span><span>{citizen.home.storage.length}/{citizen.home.storageCapacity} home</span></div>
      <div className="citizen-daily"><span className={citizen.daily.ate?'used':''}>FOOD</span><span className={citizen.daily.drank?'used':''}>WATER</span><span className={citizen.daily.waterTaken?'used':''}>RATION</span></div>
      <div className="ap-track" aria-label={`${citizen.name} action points`}><span style={{width:`${apPercent}%`}}/></div>
    </article>})}</div>
  </section>
}
