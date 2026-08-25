import { isScout, movementPointLabel, scoutCamouflageActive, scoutLevel, scoutPointsAvailable, scoutVisitsUntilNextLevel, scoutZombieEstimate, scoutsLairComplete } from '../../core/scout'
import type { GameCommand, GameState } from '../../core/types'
import { getZone } from '../../core/world'

const ADJACENT=[
  {label:'North',dx:0,dy:1},
  {label:'West',dx:-1,dy:0},
  {label:'East',dx:1,dy:0},
  {label:'South',dx:0,dy:-1},
] as const

export function ScoutPanel({game,citizenId,legalActions,act}:{game:GameState;citizenId:string;legalActions:GameCommand[];act:(command:GameCommand|undefined)=>void}){
  const citizen=game.citizens.find((candidate)=>candidate.id===citizenId)
  if(!citizen)return null
  const scout=isScout(citizen)
  const lair=scoutsLairComplete(game)
  const recamouflage=legalActions.find((action)=>action.type==='RECAMOUFLAGE')
  const mapWasteland=legalActions.find((action)=>action.type==='MAP_WASTELAND')

  if(citizen.location.type==='town'){
    if(!scout&&!lair)return null
    return <section className="town-feature facility-hero-card" aria-label="Scout controls">
      <div className="feature-icon">S</div>
      <div className="feature-copy"><span>{lair?'Scouts Lair':'Scout'}</span><strong>{scout?`${scoutPointsAvailable(citizen)} SP available`:'Map the Wasteland'}</strong><p>{scout?`Camouflage is ${scoutCamouflageActive(citizen)?'active':'inactive'}. Scout Points are used before AP for travel beginning 3 km or farther from town.`:'A completed Scouts Lair lets citizens map routes for extra movement points on the following day.'}</p></div>
      <div className="feature-actions">{recamouflage&&<button onClick={()=>act(recamouflage)}>Camouflage <small>0 AP</small></button>}{mapWasteland&&<button className="primary" onClick={()=>act(mapWasteland)}>Map the Wasteland <small>1 AP</small></button>}</div>
    </section>
  }
  if(!scout)return null

  const current=getZone(game.world,citizen.location.x,citizen.location.y)
  const level=current?scoutLevel(current):0
  const visits=current?.scoutVisits??0
  const remaining=current?scoutVisitsUntilNextLevel(current):0
  const estimates=ADJACENT.flatMap(({label,dx,dy})=>{
    const zone=getZone(game.world,citizen.location.x+dx,citizen.location.y+dy);if(!zone)return[]
    const estimate=scoutZombieEstimate(game,citizen,zone);return estimate===null?[]:[{label,estimate,level:scoutLevel(zone)}]
  })

  return <section className="special-site-card status-accessible" aria-label="Scout reconnaissance">
    <div className="special-site-heading"><div><p className="section-kicker">Scout reconnaissance</p><h3>{scoutCamouflageActive(citizen)?'Camouflaged':'Exposed'} · {scoutPointsAvailable(citizen)} SP</h3><p>Next move: {movementPointLabel(citizen)}. Entering this zone recorded a persistent Scout visit.</p></div><span>LEVEL {level}</span></div>
    <p>{level>=3?`This zone is at maximum Scout Level after ${visits} visits.`:`${visits} Scout visits recorded here · ${remaining} more visit${remaining===1?'':'s'} to the next Scout Level.`}</p>
    <div className="item-action-menu">{estimates.map((entry)=><button type="button" className="static-item" key={entry.label} disabled><span>{entry.label}: ~{entry.estimate} zombie{entry.estimate===1?'':'s'}</span><small>Scout estimate · zone Scout Level {entry.level}</small></button>)}</div>
    {recamouflage&&<div className="feature-actions"><button className="primary" onClick={()=>act(recamouflage)}>Re-camouflage <small>0 AP</small></button></div>}
  </section>
}
