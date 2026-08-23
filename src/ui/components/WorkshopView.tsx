import { bankCount } from '../../core/bank'
import { itemName } from '../../core/items'
import type { GameCommand, GameEvent, GameState, ItemType, WorkshopRecipeId } from '../../core/types'
import { WORKSHOP_RECIPE_ORDER, WORKSHOP_RECIPES, workshopRecipeApCost, workshopRecipeInputs } from '../../core/workshop'
import { ContextRegister } from './ContextRegister'
import '../workshop.css'
function workshopCommand(actions:GameCommand[],recipeId:WorkshopRecipeId){return actions.find((action):action is Extract<GameCommand,{type:'WORKSHOP_CONVERT'}>=>action.type==='WORKSHOP_CONVERT'&&action.recipeId===recipeId)}
function workshopEvent(event:GameEvent):boolean{return event.type==='WORKSHOP_CONVERTED'}
function recipeInputs(recipeId:WorkshopRecipeId):Array<[ItemType,number]>{return Object.entries(workshopRecipeInputs(recipeId)).map(([type,count])=>[type as ItemType,count??0])}
export function WorkshopView({game,legalActions,act}:{game:GameState;legalActions:GameCommand[];act:(command:GameCommand|undefined)=>void}){
  if(!game.town.construction.workshop.completed)return null
  const factoryBuilt=game.town.construction.factory.completed
  const visibleRecipes=WORKSHOP_RECIPE_ORDER.filter((recipeId)=>recipeInputs(recipeId).some(([type])=>bankCount(game,type)>0))
  return <section className="panel screen-panel workshop-screen"><div className="panel-heading"><div><p className="section-kicker">Built facility</p><h2>Workshop</h2><p className="section-note">Transform Bank stock into construction-ready materials, dismantle salvage, assemble components and repair equipment. Outputs return directly to the Bank.</p></div><span className="facility-status online">ONLINE</span></div><div className="workshop-help">{factoryBuilt?'Factory tooling is online: current Workshop actions receive the 1 AP discount.':'Factory tooling is not built yet; current Workshop actions use their full AP cost.'}</div><div className="workshop-table" role="table" aria-label="Workshop transformations"><div className="workshop-row workshop-header" role="row"><span>Stock</span><span>Input</span><span aria-hidden="true">→</span><span>Object obtained</span><span>Stock</span><span>Action</span></div>{visibleRecipes.length===0?<div className="workshop-empty">No transformable items are currently in the Bank.</div>:visibleRecipes.map((recipeId)=>{
    const recipe=WORKSHOP_RECIPES[recipeId]
    const inputs=recipeInputs(recipeId)
    const command=workshopCommand(legalActions,recipeId)
    const apCost=workshopRecipeApCost(game,recipeId)
    const repair=recipeId.startsWith('repair_')
    const dismantle=Boolean(recipe.outcomes?.length)
    const inputStock=inputs.map(([type,count])=>`${bankCount(game,type)}/${count}`).join(' + ')
    const inputLabel=inputs.map(([type,count])=>`${count}× ${itemName(type)}`).join(' + ')
    const outputLabel=recipe.outcomes?.length?[...new Set(recipe.outcomes.map((outcome)=>itemName(outcome.output)))].join(' / '):itemName(recipe.output)
    const outputStock=recipe.outcomes?.length?'varies':String(bankCount(game,recipe.output))
    return <div className="workshop-row" role="row" key={recipeId}><strong className="workshop-stock">{inputStock}</strong><span className="workshop-object" title={inputLabel}>{inputLabel}</span><span className="workshop-arrow" aria-hidden="true">→</span><span className="workshop-object" title={outputLabel}>{outputLabel}</span><strong className="workshop-stock">{outputStock}</strong><button type="button" disabled={!command} onClick={()=>act(command)}><strong>{repair?'Repair':dismantle?'Dismantle':'Transform'}</strong><small>{apCost} AP</small></button></div>
  })}</div><ContextRegister game={game} title="Workshop Register" matches={workshopEvent}/></section>
}
