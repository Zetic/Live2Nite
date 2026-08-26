import { constructionUpgradeLevel } from '../../core/constructionUpgrades'
import { watchtowerEstimate } from '../../core/night'
import { nightWatchActiveCitizens, nightWatchCapacity, nightWatchDeathChance, nightWatchDefenseForCitizen, nightWatchEnrolled, nightWatchEnrolledCitizenIds, nightWatchEquipment, nightWatchPreviousWatches, nightWatchTotalDefense, nightWatchWeaponsAllowed, setNightWatchEnrollment } from '../../core/nightWatch'
import type { GameState } from '../../core/types'

export function BattlementsView({game,citizenId,onChange}:{game:GameState;citizenId:string;onChange:(next:GameState)=>void}){
  const citizen=game.citizens.find((candidate)=>candidate.id===citizenId)
  if(!citizen)return null
  const enrolled=nightWatchEnrolled(game,citizenId)
  const enrolledIds=nightWatchEnrolledCitizenIds(game)
  const active=nightWatchActiveCitizens(game)
  const capacity=nightWatchCapacity(game)
  const defense=nightWatchTotalDefense(game)
  const personalDefense=nightWatchDefenseForCitizen(game,citizen)
  const deathChance=nightWatchDeathChance(game,citizen)
  const previous=nightWatchPreviousWatches(game,citizenId)
  const equipment=nightWatchEquipment(game,citizen)
  const weaponsAllowed=nightWatchWeaponsAllowed(game)
  const estimate=watchtowerEstimate(game)
  const normalDefense=game.town.gateOpen?0:(estimate?.townDefense??0)
  const possibleOverflow=estimate?Math.max(0,estimate.max-normalDefense):0
  const upgradeLevel=constructionUpgradeLevel(game,'battlements')
  const toggle=()=>{const next=setNightWatchEnrollment(game,citizenId,!enrolled);if(next!==game)onChange(next)}

  return <section className="panel screen-panel watchtower-screen">
    <div className="panel-heading"><div><p className="section-kicker">Built facility</p><h2>Battlements</h2><p className="section-note">Citizens may voluntarily stand the Night Watch. Watch defense intercepts zombies only after ordinary town defense has been exceeded.</p></div><span className="facility-status online">ONLINE</span></div>
    <div className="watchtower-grid">
      <article className="forecast-card"><span>Watch capacity</span><strong>{enrolledIds.length}/{capacity}</strong><small>Battlements upgrade level {upgradeLevel}</small></article>
      <article className="forecast-card"><span>Active in town</span><strong>{active.length}</strong><small>dead or outside volunteers are skipped</small></article>
      <article className="forecast-card"><span>Current Watch defense</span><strong>{defense}</strong><small>applies after normal defense</small></article>
      <article className="forecast-card"><span>Estimated overflow ceiling</span><strong>{possibleOverflow}</strong><small>based on public Watchtower estimate</small></article>
    </div>
    <section className="watchtower-note"><h3>Your Watch</h3><p>Current Watch defense: <strong>{personalDefense}</strong>. Previous Watches: <strong>{previous}</strong>. Current death risk: <strong>{deathChance}%</strong>. The death roll occurs even when normal defenses hold; wound and Terror rolls occur only when zombies reach the Watch.</p><button type="button" disabled={!enrolled&&(enrolledIds.length>=capacity||citizen.location.type!=='town'||!citizen.alive)} onClick={toggle}>{enrolled?'Leave Night Watch':'Join Night Watch'}</button></section>
    <section className="watchtower-note"><h3>Watch equipment</h3><p>{weaponsAllowed?'Miniature Armory is built. Carried Watch equipment contributes its watchpoint value and can be broken, discharged, consumed, or lost.':'Miniature Armory has not been built. Ordinary carried Watch equipment is disabled; permanent profession equipment such as the Guardian Riot Shield still applies.'}</p>{equipment.length>0?<div className="upgrade-project-list">{equipment.map((item)=><article className="upgrade-project" key={item.itemId}><div className="upgrade-project-heading"><div><strong>{item.name}</strong><span>{item.enabled?'Enabled':'Disabled until Miniature Armory'}</span></div><span className="upgrade-vote-count">{item.defense>=0?'+':''}{item.defense} Watch</span></div><p>Source watchpoint {item.baseDefense>=0?'+':''}{item.baseDefense}{item.family?` · ${item.family} equipment`:''}{item.impact?` · survival impact ${item.impact>=0?'+':''}${item.impact}`:''}</p></article>)}</div>:<p>No mapped Watch equipment is currently carried.</p>}</section>
  </section>
}
