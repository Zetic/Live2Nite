import { useMemo, useState } from 'react'
import { planExpedition } from '../../agents/planning/ExpeditionPlanner'
import { missionSafety } from '../../agents/planning/MissionLifecycle'
import { minimumTownReserve } from '../../agents/planning/TownMissionPlanner'
import { professionName } from '../../core/professions'
import { CITIZEN_STATUS_DEFINITIONS, DESERT_STEPS_PER_HYDRATION_STAGE, activeCitizenStatuses, effectiveMaxAp, woundLabel } from '../../core/status'
import type { Citizen, GameState } from '../../core/types'
import '../expedition.css'

type RosterFilter='all'|'town'|'outside'|'dead'
type RosterView='overview'|'details'
function matchesFilter(citizen:Citizen,filter:RosterFilter):boolean{if(filter==='all')return true;if(filter==='dead')return!citizen.alive;if(!citizen.alive)return false;if(filter==='town')return citizen.location.type==='town';return citizen.location.type==='world'}
function locationLabel(citizen:Citizen):string{if(!citizen.alive)return citizen.location.type==='town'?'TOWN':'OUTSIDE';return citizen.location.type==='town'?'TOWN':`[${citizen.location.x},${citizen.location.y}]`}
function label(value:string):string{return value.replaceAll('_',' ').toUpperCase()}
const STATUS_PRIORITY=['dehydrated','infected','terrorized','addicted','wounded','thirsty','drugged','drunk','hangover','exhausted','immune'] as const
function overviewStatus(citizen:Citizen):{label:string;tone:'neutral'|'warning'|'danger';title:string}{
  if(!citizen.alive){const body=citizen.home.holdsBody?' · BODY PRESENT':'';return{label:`DEAD${body}`,tone:'danger',title:citizen.home.holdsBody?'Dead in town; the body remains at this citizen\'s home.':'Dead; no body remains at this citizen\'s home.'}}
  const active=activeCitizenStatuses(citizen)
  const primary=STATUS_PRIORITY.find((id)=>active.includes(id))
  if(!primary)return{label:'HEALTHY',tone:'neutral',title:'No significant active condition.'}
  const definition=CITIZEN_STATUS_DEFINITIONS[primary]
  const detail=active.filter((id)=>!['satisfied_food','satisfied_water'].includes(id)).map((id)=>id==='wounded'?`Wounded · ${woundLabel(citizen.status.wound)}`:CITIZEN_STATUS_DEFINITIONS[id].label).join(' · ')
  return{label:primary==='wounded'?`WOUNDED · ${woundLabel(citizen.status.wound).toUpperCase()}`:definition.label.toUpperCase(),tone:definition.severity,title:detail||definition.effect}
}
function assignmentLabel(game:GameState,citizen:Citizen):string{
  if(!citizen.alive)return'—'
  if(citizen.controller==='human')return'PLAYER'
  const mission=game.botMissions[citizen.id]
  return mission?`${label(mission.role)} · ${label(mission.phase)}`:'RESERVE'
}

export function CitizenRoster({game,controlledCitizenId,onControl,onVisit}:{game:GameState;controlledCitizenId:string;onControl:(citizenId:string)=>void;onVisit:(citizenId:string)=>void}){
  const visitor=game.citizens.find((citizen)=>citizen.id===controlledCitizenId);const canVisitHomes=Boolean(visitor?.alive&&visitor.location.type==='town')
  const[view,setView]=useState<RosterView>('overview')
  const[filter,setFilter]=useState<RosterFilter>('all')
  const counts=useMemo(()=>({all:game.citizens.length,town:game.citizens.filter(c=>c.alive&&c.location.type==='town').length,outside:game.citizens.filter(c=>c.alive&&c.location.type==='world').length,dead:game.citizens.filter(c=>!c.alive).length}),[game.citizens])
  const citizens=useMemo(()=>game.citizens.filter(c=>matchesFilter(c,filter)).sort((a,b)=>{if(a.controller==='human')return-1;if(b.controller==='human')return 1;if(a.alive!==b.alive)return a.alive?-1:1;return a.name.localeCompare(b.name)}),[game.citizens,filter])
  const reserve=minimumTownReserve(game)
  return <section className="panel screen-panel roster-panel">
    <div className="panel-heading compact"><div><p className="section-kicker">Population</p><h2>Citizens</h2><p className="section-note">{view==='overview'?'Compact town roster for scanning profession, location, condition, AP, capacity, homes and assignments.':'Detailed testing diagnostics for profession, condition, mission phase, supply budget and return solvency.'}</p></div><span className="panel-count">{counts.all}</span></div>
    <div className="roster-view-tabs" role="tablist" aria-label="Citizen roster view"><button className={view==='overview'?'active':''} aria-selected={view==='overview'} onClick={()=>setView('overview')}><strong>Overview</strong><small>Compact table</small></button><button className={view==='details'?'active':''} aria-selected={view==='details'} onClick={()=>setView('details')}><strong>Details</strong><small>AI diagnostics</small></button></div>
    {view==='details'&&<div className="testing-control-note"><strong>TESTING TOOL</strong><span>Control switching and AI diagnostics are development aids. Current town reserve target: at least {reserve} basic bots uncommitted to field missions.</span></div>}
    <div className="roster-filters">{(['all','town','outside','dead']as const).map(value=><button key={value} className={filter===value?'active':''} onClick={()=>setFilter(value)}>{value==='all'?'All':value[0].toUpperCase()+value.slice(1)} <span>{counts[value]}</span></button>)}</div>

    {view==='overview'?<div className="citizen-overview-wrap"><div className="citizen-overview-table" role="table" aria-label="Citizen overview">
      <div className="citizen-overview-header" role="row"><span>Citizen</span><span>Status</span><span>Location</span><span>AP</span><span>Rucksack</span><span>Home</span><span>Assignment</span><span>Actions</span></div>
      {citizens.map((citizen)=>{const apCap=effectiveMaxAp(citizen);const controlled=citizen.id===controlledCitizenId;const status=overviewStatus(citizen);return <div className={`citizen-overview-row ${!citizen.alive?'dead':''} ${controlled?'controlled-citizen':''}`} role="row" key={citizen.id}>
        <div className="citizen-overview-name" role="cell"><strong>{citizen.name}</strong><small>{professionName(citizen)}</small>{citizen.controller==='human'&&<span className="you-badge">YOU</span>}{controlled&&<span className="control-badge">CONTROLLED</span>}</div>
        <span className={`citizen-overview-status ${status.tone}`} title={status.title} role="cell">{status.label}</span>
        <span className={`location-badge ${citizen.location.type==='world'&&citizen.alive?'outside':''}`} role="cell">{locationLabel(citizen)}</span>
        <span className="citizen-overview-number" role="cell">{citizen.ap}/{apCap}</span>
        <span className="citizen-overview-number" role="cell">{citizen.inventory.length}/{citizen.inventoryCapacity}</span>
        <span className="citizen-overview-home" role="cell">{citizen.home.level.replaceAll('_',' ')}</span>
        <span className="citizen-overview-assignment" role="cell">{assignmentLabel(game,citizen)}</span>
        <div className="citizen-overview-actions" role="cell"><button disabled={!canVisitHomes} onClick={()=>onVisit(citizen.id)}>Home</button><button disabled={!citizen.alive||controlled} onClick={()=>onControl(citizen.id)}>{controlled?'Active':'Control'}</button></div>
      </div>})}
    </div></div>:<div className="citizen-roster">{citizens.map(citizen=>{const apCap=effectiveMaxAp(citizen);const apPercent=apCap?Math.min(100,Math.round(citizen.ap/apCap*100)):0;const controlled=citizen.id===controlledCitizenId;const mission=citizen.alive&&citizen.controller==='basic-bot'?game.botMissions[citizen.id]??null:null;const plan=mission?planExpedition(game,citizen.id):null;const safety=mission&&citizen.location.type==='world'?missionSafety(game,citizen.id):null;const activeStatuses=activeCitizenStatuses(citizen);const hydration=citizen.status.hydration;return <article className={`citizen-card ${!citizen.alive?'dead':''} ${controlled?'controlled-citizen':''}`} key={citizen.id}><div className="citizen-main"><div><strong>{citizen.name}</strong><small>{professionName(citizen)}</small>{citizen.controller==='human'&&<span className="you-badge">YOU</span>}{controlled&&<span className="control-badge">CONTROLLED</span>}</div><div className="citizen-card-actions"><span className={`location-badge ${citizen.location.type==='world'&&citizen.alive?'outside':''}`}>{locationLabel(citizen)}</span><button className="citizen-control-button" disabled={!citizen.alive||controlled} onClick={()=>onControl(citizen.id)}>{controlled?'Active':'Control'}</button><button className="citizen-control-button" disabled={!canVisitHomes} onClick={()=>onVisit(citizen.id)}>Visit home</button></div></div><div className="citizen-meta"><span>{citizen.ap}/{apCap} AP</span><span>{citizen.inventory.length}/{citizen.inventoryCapacity} cargo + 2 equipment</span><span>{citizen.home.storage.length}/{citizen.home.storageCapacity} home</span></div><div className="citizen-daily"><span className={citizen.daily.ate?'used':''}>FOOD</span><span className={citizen.daily.drank?'used':''}>WATER</span><span className={citizen.daily.waterTaken?'used':''}>RATION</span></div>{citizen.alive&&<div className="citizen-condition-detail"><span className={`citizen-condition-chip ${hydration==='dehydrated'?'danger':hydration==='thirsty'?'warning':''}`} title={hydration==='normal'?'No active hydration penalty.':CITIZEN_STATUS_DEFINITIONS[hydration].effect}>💧 {hydration==='normal'?'Hydrated':CITIZEN_STATUS_DEFINITIONS[hydration].label}</span>{activeStatuses.includes('exhausted')&&<span className="citizen-condition-chip warning" title={CITIZEN_STATUS_DEFINITIONS.exhausted.effect}>⚡ Exhausted</span>}{activeStatuses.filter((id)=>!['thirsty','dehydrated','exhausted','satisfied_food','satisfied_water'].includes(id)).map((id)=><span key={id} className={`citizen-condition-chip ${CITIZEN_STATUS_DEFINITIONS[id].severity}`} title={CITIZEN_STATUS_DEFINITIONS[id].effect}>{id==='wounded'?`Wounded · ${woundLabel(citizen.status.wound)}`:CITIZEN_STATUS_DEFINITIONS[id].label}</span>)}<span className="citizen-condition-travel">Desert {citizen.status.desertStepsToday}/{DESERT_STEPS_PER_HYDRATION_STAGE}</span></div>}{mission&&<div className="ai-plan"><div><strong>AI · {label(mission.role)} · {label(mission.phase)}</strong><span>{safety&&!safety.solvent?'RETURN RISK':plan?.feasible?'ASSIGNED':'SUPPLY-LIMITED'}</span></div><p>{mission.reason}</p><dl><div><dt>Target</dt><dd>{mission.targetLabel}</dd></div><div><dt>Mission</dt><dd>{label(mission.purpose)} · return by ~{mission.returnByHour}:00</dd></div>{plan&&<div><dt>AP budget</dt><dd>{plan.requiredAp} required / {plan.loadout.potentialAp} potential</dd></div>}{safety&&<div><dt>Return safety</dt><dd>{safety.usableAp} usable / {safety.requiredAp} reserved for home · margin {safety.margin}</dd></div>}{plan&&<div><dt>Loadout</dt><dd>{[plan.loadout.water&&'water',plan.loadout.food&&'food',plan.loadout.weapon&&'weapon'].filter(Boolean).join(' · ')||'light'} · {plan.loadout.reservedLootSlots} loot slot(s)</dd></div>}{plan&&<div><dt>Policy</dt><dd>{plan.waterPolicy} water · {plan.supplyDisposition} storage</dd></div>}</dl></div>}{!mission&&citizen.alive&&citizen.controller==='basic-bot'&&<div className="ai-plan"><div><strong>AI · RESERVE</strong><span>UNCOMMITTED</span></div><p>No field mission is assigned this hour. This citizen can perform town work, manage supplies, recover hydration, or remain available for rescue and newly discovered opportunities.</p></div>}<div className="ap-track"><span style={{width:`${apPercent}%`}}/></div></article>})}</div>}
  </section>
}
