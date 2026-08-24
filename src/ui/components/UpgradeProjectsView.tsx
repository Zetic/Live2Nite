import { CONSTRUCTION_CATALOG } from '../../core/constructionCatalog'
import {
  availableConstructionUpgradeProjects,
  canCitizenVoteForUpgrade,
  castConstructionUpgradeVote,
  citizenUpgradeVote,
  constructionUpgradeLevel,
  constructionUpgradeNextBenefit,
  constructionUpgradeTrack,
  constructionUpgradeVoteCounts,
  lastUpgradeWinner,
  pendingCompletedUpgradeProjects,
  upgradeVoteCountsVisible,
} from '../../core/constructionUpgrades'
import type { ConstructionId, GameState } from '../../core/types'
import '../upgradeProjects.css'

export function UpgradeProjectsView({game,citizenId,onVote}:{game:GameState;citizenId:string;onVote:(next:GameState)=>void}){
  const active=availableConstructionUpgradeProjects(game)
  const pending=pendingCompletedUpgradeProjects(game)
  const selected=citizenUpgradeVote(game,citizenId)
  const revealCounts=upgradeVoteCountsVisible(game,citizenId)
  const counts=constructionUpgradeVoteCounts(game)
  const last=lastUpgradeWinner(game)
  const vote=(projectId:ConstructionId)=>{const next=castConstructionUpgradeVote(game,citizenId,projectId);if(next!==game)onVote(next)}
  return <section className="panel upgrade-projects-panel">
    <div className="panel-heading"><div><p className="section-kicker">Town decision</p><h2>Upgrade Projects</h2></div><span className="panel-count">{active.length} available</span></div>
    <p className="upgrade-projects-intro">Every citizen may choose one completed project to improve today. The project with the most votes is upgraded for free at midnight, before the horde attack. Ties are resolved randomly.</p>
    {!selected&&active.length>0&&<div className="upgrade-vote-secrecy"><strong>Vote totals are hidden.</strong><span>Make your choice before seeing how the town voted.</span></div>}
    {selected&&<div className="upgrade-vote-secrecy revealed"><strong>Your vote is locked in.</strong><span>Town vote totals are now visible.</span></div>}
    {last.day!==null&&last.day<game.day&&<div className="upgrade-last-result"><span>Previous result</span><strong>{last.projectId?`${CONSTRUCTION_CATALOG[last.projectId].name} won with ${last.votes} vote${last.votes===1?'':'s'}.`:'No project received a vote.'}</strong></div>}
    <div className="upgrade-project-list">
      {active.map((projectId)=>{
        const entry=CONSTRUCTION_CATALOG[projectId]
        const track=constructionUpgradeTrack(projectId)!
        const level=constructionUpgradeLevel(game,projectId)
        const benefit=constructionUpgradeNextBenefit(game,projectId)
        const chosen=selected===projectId
        return <article className={`upgrade-project ${chosen?'chosen':''}`} key={projectId}>
          <div className="upgrade-project-heading"><div><strong>{entry.name}</strong><span>Level {level} → {level+1} of {track.maxLevel}</span></div>{revealCounts&&<span className="upgrade-vote-count">{counts[projectId]??0} vote{(counts[projectId]??0)===1?'':'s'}</span>}</div>
          <p>{benefit}</p>
          <button type="button" className={chosen?'selected-vote':''} disabled={Boolean(selected)||!canCitizenVoteForUpgrade(game,citizenId,projectId)} onClick={()=>vote(projectId)}>{chosen?'Your vote':'Vote'}</button>
        </article>
      })}
      {!active.length&&<div className="upgrade-empty"><strong>No upgrade is available today.</strong><span>Complete an active upgradeable construction, or wait until a project below receives its required gameplay mechanic.</span></div>}
    </div>
    {pending.length>0&&<details className="upgrade-pending"><summary>Tracked upgrade projects awaiting mechanics ({pending.length})</summary><div>{pending.map((id)=><span key={id}><strong>{CONSTRUCTION_CATALOG[id].name}</strong><small>Source upgrade track catalogued · voting disabled until its effect is implemented faithfully.</small></span>)}</div></details>}
  </section>
}
