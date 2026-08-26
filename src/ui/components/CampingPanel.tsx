import { campImproveCommandItemId, campImprovementLevel, campingOutlook, campingOutlookFromChance, campingOutlookText } from '../../core/camping'
import { isSurvivalist, survivalistForageChancePercent, survivalManualUsed } from '../../core/survivalist'
import type { CampingChanceBreakdown, Citizen, GameCommand, GameState, WorldZone } from '../../core/types'
import { distanceToTown } from '../../core/world'

function action<T extends GameCommand['type']>(actions:GameCommand[],type:T):Extract<GameCommand,{type:T}>|undefined{return actions.find((candidate)=>candidate.type===type) as Extract<GameCommand,{type:T}>|undefined}
function signed(value:number):string{return value>0?`+${value}`:`${value}`}
function factorRows(breakdown:CampingChanceBreakdown):Array<[string,number]>{return[
  ['Camping history',breakdown.previous],['Grave',breakdown.tomb],['Site improvements',breakdown.zone],['Shelter',breakdown.zoneBuilding],['Lighthouse',breakdown.lighthouse],['Camping gear',breakdown.campitems],['Zombies',breakdown.zombies],['Earlier campers',breakdown.campers],['Distance',breakdown.distance],['Devastation',breakdown.devastated],
].filter(([,value])=>value!==0) as Array<[string,number]>}

export function CampingPanel({game,citizen,zone,legalActions,act}:{game:GameState;citizen:Citizen;zone:WorldZone;legalActions:GameCommand[];act:(command:GameCommand|undefined)=>void}){
  if(citizen.location.type!=='world'||(citizen.location.x===0&&citizen.location.y===0))return null
  const current=campingOutlook(game,citizen.id)
  const frozen=citizen.camping.hidden&&citizen.camping.survivalChance!==null?citizen.camping.survivalChance:null
  const breakdown=citizen.camping.hidden&&citizen.camping.chanceBreakdown?citizen.camping.chanceBreakdown:current.breakdown
  const displayedChance=frozen??current.chancePercent
  const displayedOutlook=frozen===null?current.outlook:campingOutlookFromChance(frozen)
  const improve=legalActions.find((candidate)=>candidate.type==='IMPROVE_CAMP'&&!campImproveCommandItemId(candidate))
  const trestleImprove=legalActions.find((candidate)=>candidate.type==='IMPROVE_CAMP'&&Boolean(campImproveCommandItemId(candidate)))
  const grave=action(legalActions,'DIG_CAMPING_GRAVE')
  const hide=action(legalActions,'HIDE_FOR_NIGHT')
  const leave=action(legalActions,'LEAVE_HIDEOUT')
  const forageFood=action(legalActions,'SURVIVALIST_SEARCH_FOOD')
  const forageWater=action(legalActions,'SURVIVALIST_SEARCH_WATER')
  const survivalist=isSurvivalist(citizen)
  return <section className={`camping-panel outlook-${displayedOutlook} ${citizen.camping.hidden?'is-hidden':''}`}>
    <div className="camping-heading">
      <div><p className="section-kicker">Overnight survival</p><h3>{citizen.camping.hidden?(citizen.camping.grave?'Hidden in a grave':'Hidden for the night'):'Camping outlook'}</h3></div>
      <span className="camping-state">{citizen.camping.hidden?'HIDDEN':displayedOutlook.replace('_',' ').toUpperCase()}</span>
    </div>
    <strong className="camping-outlook-copy">{campingOutlookText(displayedOutlook)}</strong>
    <p>{citizen.camping.hidden?'Your source-backed survival chance is locked for tonight. Leaving the campsite unlocks actions, but you must hide again before the attack.':'Improve the zone or dig a temporary grave, then hide when ready. Citizens left outside without hiding still die at the attack.'}</p>
    <dl className="camping-facts">
      <div><dt>Survival chance</dt><dd>{displayedChance}%{frozen!==null?' · locked':''}</dd></div>
      <div><dt>Raw total</dt><dd>{breakdown.raw}</dd></div>
      <div><dt>Profession cap</dt><dd>{breakdown.cap}%</dd></div>
      <div><dt>Permanent site improvement</dt><dd>{campImprovementLevel(zone)}/50</dd></div>
      <div><dt>Distance</dt><dd>{distanceToTown(zone.x,zone.y)} km</dd></div>
      <div><dt>Successful camp nights</dt><dd>{citizen.camping.nightsSurvived}</dd></div>
      {factorRows(breakdown).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{signed(value)}</dd></div>)}
    </dl>
    {survivalist&&!citizen.camping.hidden&&<div className="camping-survivalist">
      <p className="section-kicker">Survival Manual</p>
      <strong>{survivalManualUsed(citizen)?'Used today':`${survivalistForageChancePercent(game)}% forage chance today`}</strong>
      <p>At least 3 km from town, choose one daily attempt to find food or water. A failed search still uses the Manual for the day.</p>
      <div className="camping-actions">
        <button className="secondary" disabled={!forageFood} onClick={()=>act(forageFood)}>Search for food <small>0 AP</small></button>
        <button className="secondary" disabled={!forageWater} onClick={()=>act(forageWater)}>Search for water <small>0 AP</small></button>
      </div>
    </div>}
    <div className="camping-actions">
      {citizen.camping.hidden?<button className="secondary" disabled={!leave} onClick={()=>act(leave)}>Leave hiding place <small>0 AP</small></button>:<>
        <button disabled={!improve} onClick={()=>act(improve)}>Improve site <small>1 AP · +5 permanent</small></button>
        {trestleImprove&&<button className="secondary" onClick={()=>act(trestleImprove)}>Install Trestle <small>1 AP · consumes Trestle · +9 permanent</small></button>}
        <button className="secondary" disabled={!grave} onClick={()=>act(grave)}>Dig grave &amp; camp <small>1 AP · +8 tonight</small></button>
        <button className="primary" disabled={!hide} onClick={()=>act(hide)}>Hide for the night <small>0 AP</small></button>
      </>}
    </div>
  </section>
}
