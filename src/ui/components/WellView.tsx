import type { GameCommand, GameEvent, GameState } from '../../core/types'
import { findAction } from '../actionHelpers'
import { ContextRegister } from './ContextRegister'

function wellEvent(event:GameEvent):boolean{return event.type==='WATER_TAKEN'}

export function WellView({ game, citizenId, legalActions, act }: {game:GameState;citizenId:string;legalActions:GameCommand[];act:(command:GameCommand|undefined)=>void}) {
  const player=game.citizens.find((citizen)=>citizen.id===citizenId)??game.citizens[0]
  const takeWater=findAction(legalActions,'TAKE_WATER')
  return <section className="panel screen-panel">
    <div className="panel-heading compact"><div><p className="section-kicker">Town water supply</p><h2>The Well</h2></div><span className="panel-count">{game.town.well.water} rations</span></div>
    <section className="town-feature well-card facility-hero-card"><div className="feature-icon" aria-hidden="true">W</div><div className="feature-copy"><span>Shared reserve</span><strong>{game.town.well.water} Water Rations</strong></div><button className="feature-action primary" disabled={!takeWater} onClick={()=>act(takeWater)}>Take ration <small>0 AP</small></button></section>
    <ContextRegister game={game} title="Well Register" matches={wellEvent}/>
  </section>
}
