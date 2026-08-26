import { itemName, normalizeItemState } from '../../core/items'
import type { GameCommand, GameEvent, GameState } from '../../core/types'
import { townWaterAllocation } from '../../core/waterEconomy'
import { findAction } from '../actionHelpers'
import { ContextRegister } from './ContextRegister'

function wellEvent(event:GameEvent):boolean{return['WATER_TAKEN','WATER_RETURNED','WATER_PURIFIED','WATER_ITEM_REFILLED','WELL_WATER_CONSUMED'].includes(event.type)}
function itemForPlayer(game:GameState,citizenId:string,itemId:string){const citizen=game.citizens.find((candidate)=>candidate.id===citizenId);return citizen?[...citizen.inventory,...citizen.home.storage].find((item)=>item.id===itemId):undefined}

export function WellView({ game, citizenId, legalActions, act }: {game:GameState;citizenId:string;legalActions:GameCommand[];act:(command:GameCommand|undefined)=>void}) {
  const player=game.citizens.find((citizen)=>citizen.id===citizenId)??game.citizens[0]
  const takeWater=findAction(legalActions,'TAKE_WATER')
  const returnWater=legalActions.filter((action):action is Extract<GameCommand,{type:'RETURN_WATER_TO_WELL'}>=>action.type==='RETURN_WATER_TO_WELL')
  const purify=legalActions.filter((action):action is Extract<GameCommand,{type:'PURIFY_JERRYCAN'}>=>action.type==='PURIFY_JERRYCAN')
  const refills=legalActions.filter((action):action is Extract<GameCommand,{type:'REFILL_WATER_ITEM'}>=>action.type==='REFILL_WATER_ITEM')
  const allocation=townWaterAllocation(game)
  const taken=Number(player.daily.waterTaken)+Number(Boolean(player.daily.bonusWaterTaken))
  return <section className="panel screen-panel">
    <div className="panel-heading compact"><div><p className="section-kicker">Town water supply</p><h2>The Well</h2></div><span className="micro-stat">{taken} ration{taken===1?'':'s'} taken today</span></div>
    <section className="town-feature well-card facility-hero-card"><div className="feature-icon" aria-hidden="true">W</div><div className="feature-copy"><span>Shared reserve</span><strong>{game.town.well.water} Water Rations</strong></div><button className="feature-action primary" disabled={!takeWater} onClick={()=>act(takeWater)}>Take ration <small>0 AP</small></button></section>

    {(returnWater.length>0||purify.length>0||refills.length>0)&&<section className="facility-card compact-card">
      <div className="panel-heading compact"><div><p className="section-kicker">Water handling</p><h3>Available actions</h3></div></div>
      <div className="facility-action-row">
        {returnWater.map((action)=>{const item=itemForPlayer(game,citizenId,action.itemId);return <button className="feature-action" key={`return-${action.itemId}`} onClick={()=>act(action)}>Return {item?itemName(item.type):'Water Ration'} <small>+1 Well</small></button>})}
        {purify.map((action)=><button className="feature-action primary" key={`purify-${action.itemId}`} onClick={()=>act(action)}>Purify Full Jerrycan <small>{game.town.construction.water_filter?.completed?'4–9':'1–3'} water</small></button>)}
        {refills.map((action)=>{const item=itemForPlayer(game,citizenId,action.itemId);const charges=item?(normalizeItemState(item.type,item.state).charges??0):0;return <button className="feature-action" key={`refill-${action.itemId}`} onClick={()=>act(action)}>Refill {item?itemName(item.type):'water item'} <small>{charges} → full · 0 Well</small></button>})}
      </div>
    </section>}

    {allocation.consumers.length>0&&<section className="facility-card compact-card">
      <div className="panel-heading compact"><div><p className="section-kicker">Next attack</p><h3>Well consumers</h3></div><span className="micro-stat">{allocation.consumed}/{allocation.required} water funded</span></div>
      <div className="compact-stat-grid">
        {allocation.consumers.map((consumer)=><div className="compact-stat" key={consumer.projectId}><span>{consumer.label}</span><strong>{consumer.active?'Funded':'Inactive'}</strong><small>{consumer.required} Water Ration{consumer.required===1?'':'s'} required</small></div>)}
      </div>
      <p className="muted-copy">Consumers are funded all-or-nothing in priority order. Unfunded consumers spend no Well water.</p>
    </section>}

    <ContextRegister game={game} title="Well Register" matches={wellEvent}/>
  </section>
}
