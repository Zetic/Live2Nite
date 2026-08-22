import { campingOutlook, campingOutlookFromChance, campingOutlookText } from '../../core/camping'
import type { Citizen, GameCommand, GameState, WorldZone } from '../../core/types'
import { distanceToTown } from '../../core/world'

function action<T extends GameCommand['type']>(actions:GameCommand[],type:T):Extract<GameCommand,{type:T}>|undefined{return actions.find((candidate)=>candidate.type===type) as Extract<GameCommand,{type:T}>|undefined}

export function CampingPanel({game,citizen,zone,legalActions,act}:{game:GameState;citizen:Citizen;zone:WorldZone;legalActions:GameCommand[];act:(command:GameCommand|undefined)=>void}){
  if(citizen.location.type!=='world'||(citizen.location.x===0&&citizen.location.y===0))return null
  const current=campingOutlook(game,citizen.id)
  const frozen=citizen.camping.hidden&&citizen.camping.survivalChance!==null?citizen.camping.survivalChance:null
  const displayedChance=frozen??current.chancePercent
  const displayedOutlook=frozen===null?current.outlook:campingOutlookFromChance(frozen)
  const improve=action(legalActions,'IMPROVE_CAMP')
  const hide=action(legalActions,'HIDE_FOR_NIGHT')
  const leave=action(legalActions,'LEAVE_HIDEOUT')
  return <section className={`camping-panel outlook-${displayedOutlook} ${citizen.camping.hidden?'is-hidden':''}`}>
    <div className="camping-heading">
      <div><p className="section-kicker">Overnight survival</p><h3>{citizen.camping.hidden?'Hidden for the night':'Camping outlook'}</h3></div>
      <span className="camping-state">{citizen.camping.hidden?'HIDDEN':displayedOutlook.replace('_',' ').toUpperCase()}</span>
    </div>
    <strong className="camping-outlook-copy">{campingOutlookText(displayedOutlook)}</strong>
    <p>{citizen.camping.hidden?'Your survival roll is locked. Leave hiding to act again, but you will need to hide again before midnight.':'Prepare the zone, then hide when you are ready. Citizens who remain outside without hiding still die at night.'}</p>
    <dl className="camping-facts">
      <div><dt>Simulation estimate</dt><dd>{displayedChance}%{frozen!==null?' · locked':''}</dd></div>
      <div><dt>Site improvements</dt><dd>{zone.campImprovements}/10</dd></div>
      <div><dt>Distance</dt><dd>{distanceToTown(zone.x,zone.y)} km</dd></div>
      <div><dt>Prior camp nights</dt><dd>{citizen.camping.nightsSurvived}</dd></div>
    </dl>
    <small className="camping-adaptation-note">Exact percentage is a Live2Nite reconstruction; the qualitative risk factors are historically grounded.</small>
    <div className="camping-actions">
      {citizen.camping.hidden?<button className="secondary" disabled={!leave} onClick={()=>act(leave)}>Leave hiding place <small>0 AP</small></button>:<><button disabled={!improve} onClick={()=>act(improve)}>Improve site <small>1 AP</small></button><button className="primary" disabled={!hide} onClick={()=>act(hide)}>Hide for the night <small>0 AP</small></button></>}
    </div>
  </section>
}
