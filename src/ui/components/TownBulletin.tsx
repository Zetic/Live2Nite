import { evaluateTownNeeds } from '../../agents/planning/TownNeeds'
import { CONSTRUCTIONS } from '../../core/construction'
import { itemName } from '../../core/items'
import type { GameState, ItemType } from '../../core/types'
import { TownCoordinationPanel } from './TownCoordinationPanel'

function pressureLabel(pressure:ReturnType<typeof evaluateTownNeeds>['defense']['pressure']):string{
  if(pressure==='comfortable')return'PREPARED'
  if(pressure==='critical')return'CRITICAL'
  if(pressure==='shortfall')return'UNDERDEFENDED'
  return'UNCERTAIN'
}

export function TownBulletin({game}:{game:GameState}){
  const needs=evaluateTownNeeds(game)
  const assessment=needs.defense
  const project=needs.activeProject?CONSTRUCTIONS[needs.activeProject]:null
  const missing=Object.entries(needs.missingConstruction) as Array<[ItemType,number|undefined]>

  return <div className="town-bulletin">
    <section className={`panel bulletin-threat pressure-${assessment.pressure}`}>
      <div className="panel-heading compact">
        <div><p className="section-kicker">Public town assessment</p><h2>Tonight's defense outlook</h2></div>
        <span className="facility-status">{pressureLabel(assessment.pressure)}</span>
      </div>
      <div className="bulletin-threat-grid">
        <article><span>Town defense</span><strong>{assessment.townDefense}</strong></article>
        <article><span>Threat information</span><strong>{assessment.source==='watchtower'?'Watchtower':assessment.source==='history'?'Last-night estimate':'Unknown'}</strong><small>{assessment.expectedMin!==null&&assessment.expectedMax!==null?`${assessment.expectedMin}–${assessment.expectedMax} planning range`:'No current horde range is known'}</small></article>
        <article><span>Strategic project</span><strong>{project?.name??'No project'}</strong><small>{project?.effectLabel??'No current construction priority.'}</small></article>
      </div>
      <p className="section-note">{assessment.reason}</p>
      {assessment.source==='history'&&<p className="adaptation-note">Without a Watchtower this is a conservative Live2Nite planning heuristic based only on the previous public Night Report, not hidden attack truth.</p>}
      {missing.length>0&&<div className="bulletin-needs"><strong>Materials being discussed</strong><div>{missing.map(([type,count])=><span key={type}>{itemName(type)} × {count??0}</span>)}</div></div>}
    </section>
    <TownCoordinationPanel game={game}/>
  </div>
}
