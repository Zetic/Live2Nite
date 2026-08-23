import type { GameState } from '../../core/types'
import { activeCoordinationCommitments } from '../../agents/coordination/TownCoordination'
import '../coordination.css'

function citizenName(game:GameState,citizenId:string):string{return game.citizens.find((citizen)=>citizen.id===citizenId)?.name??citizenId}

export function TownCoordinationPanel({game}:{game:GameState}){
  const commitments=activeCoordinationCommitments(game)
  const gate=commitments.filter((commitment)=>commitment.kind==='gate_primary'||commitment.kind==='gate_backup')
  const construction=commitments.filter((commitment)=>commitment.kind==='construction')
  const missions=Object.entries(game.botMissions)
    .filter(([,mission])=>mission.phase!=='unload')
    .slice(0,8)

  return <section className="coordination-board">
    <div className="section-heading-row">
      <div><h3>Town Coordination Board</h3><p>Public intentions shared between citizens. These are commitments, not hidden assignments: citizens still make their own decisions from town information.</p></div>
      <span className="micro-stat">{commitments.length+missions.length} active</span>
    </div>
    <div className="coordination-columns">
      <article>
        <strong>Gate</strong>
        {gate.length?gate.map((commitment)=><p key={commitment.id}><b>{citizenName(game,commitment.citizenId)}</b> · {commitment.kind==='gate_primary'?'primary':'backup'}<small>{commitment.label}</small></p>):<p className="empty-state">No manual gate volunteer posted.</p>}
      </article>
      <article>
        <strong>Town work</strong>
        {construction.length?construction.map((commitment)=><p key={commitment.id}><b>{citizenName(game,commitment.citizenId)}</b><small>{commitment.label}</small></p>):<p className="empty-state">No construction volunteers this hour.</p>}
      </article>
      <article>
        <strong>Field claims</strong>
        {missions.length?missions.map(([citizenId,mission])=><p key={citizenId}><b>{citizenName(game,citizenId)}</b> · {mission.role}<small>{mission.targetLabel}</small></p>):<p className="empty-state">No active field claims.</p>}
      </article>
    </div>
  </section>
}
