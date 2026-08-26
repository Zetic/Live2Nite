import { garbageDumpActionCost, garbageDumpItems, garbageDumpTemporaryDefense } from '../../core/garbageDump'
import { itemName } from '../../core/items'
import type { DumpCategory, GameCommand, GameEvent, GameState } from '../../core/types'
import { ContextRegister } from './ContextRegister'

const LABELS:Readonly<Record<DumpCategory,string>>={defense:'Defensive objects',weapon:'Weapons',food:'Food',wood:'Wood',metal:'Metal',animal:'Animals'}
function dumpEvent(event:GameEvent):boolean{return event.type==='BANK_ITEM_DUMPED'}

export function GarbageDumpView({game,citizenId,legalActions,act}:{game:GameState;citizenId:string;legalActions:GameCommand[];act:(command:GameCommand|undefined)=>void}){
  const citizen=game.citizens.find((candidate)=>candidate.id===citizenId)
  if(!citizen)return null
  const commands=legalActions.filter((action):action is Extract<GameCommand,{type:'DUMP_BANK_ITEM'}>=>action.type==='DUMP_BANK_ITEM')
  const entries=garbageDumpItems(game)
  const cost=garbageDumpActionCost(game)
  const today=garbageDumpTemporaryDefense(game)
  const categories=(['defense','weapon','food','wood','metal','animal'] as DumpCategory[]).map((category)=>({category,items:entries.filter((entry)=>entry.category===category)})).filter((group)=>group.items.length>0)
  return <section className="panel screen-panel">
    <div className="panel-heading"><div><p className="section-kicker">Built facility</p><h2>Garbage Dump</h2><p className="section-note">Destroy eligible Bank items for defense that lasts through tonight's attack only. This cannot be undone.</p></div><span className="facility-status online">ONLINE</span></div>
    <div className="watchtower-grid">
      <article className="forecast-card"><span>Defense prepared today</span><strong>+{today}</strong><small>expires after tonight</small></article>
      <article className="forecast-card"><span>Cost per item</span><strong>{cost} AP</strong><small>{cost===0?'Organized Dump active':'paid by the citizen using the Dump'}</small></article>
      <article className="forecast-card"><span>Eligible Bank items</span><strong>{entries.length}</strong><small>defense, weapons, food, wood, metal, animals</small></article>
    </div>
    <section className="watchtower-note"><h3>Destroy Bank items</h3><p>Base yield is 4 defense for defensive objects and 1 for every other supported category. Completed Dump improvements are already included in each value below.</p>{categories.length===0?<p>No eligible items are currently stored in the Bank.</p>:<div className="upgrade-project-list">{categories.map((group)=><article className="upgrade-project" key={group.category}><div className="upgrade-project-heading"><div><strong>{LABELS[group.category]}</strong><span>{group.items.length} available</span></div></div><div className="construction-actions">{group.items.map(({item,defense})=>{const command=commands.find((candidate)=>candidate.itemId===item.id);return <button type="button" key={item.id} disabled={!command} onClick={()=>act(command)}>Destroy {itemName(item.type)} · +{defense} defense</button>})}</div></article>)}</div>}</section>
    <ContextRegister game={game} title="Garbage Dump Register" matches={dumpEvent}/>
  </section>
}
