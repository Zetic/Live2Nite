import { itemName } from '../../core/items'
import type { GameCommand, GameEvent, GameState, WorkshopRecipeId } from '../../core/types'
import { WORKSHOP_RECIPE_ORDER, WORKSHOP_RECIPES, workshopRecipeApCost } from '../../core/workshop'
import { ContextRegister } from './ContextRegister'
import '../workshop.css'

function workshopCommand(actions: GameCommand[], recipeId: WorkshopRecipeId) {return actions.find((action): action is Extract<GameCommand,{type:'WORKSHOP_CONVERT'}> => action.type === 'WORKSHOP_CONVERT' && action.recipeId === recipeId)}
function workshopEvent(event:GameEvent):boolean{return event.type==='WORKSHOP_CONVERTED'}

export function WorkshopView({ game, legalActions, act }: {game:GameState;legalActions:GameCommand[];act:(command:GameCommand|undefined)=>void}) {
  if (!game.town.construction.workshop.completed) return null
  const factoryBuilt=game.town.construction.factory.completed
  const visibleRecipes=WORKSHOP_RECIPE_ORDER.filter((recipeId)=>(game.town.bank[WORKSHOP_RECIPES[recipeId].input]??0)>0)

  return <section className="panel screen-panel workshop-screen">
    <div className="panel-heading"><div><p className="section-kicker">Built facility</p><h2>Workshop</h2><p className="section-note">Transform Bank stock into construction-ready materials and repaired equipment. Outputs return directly to the Bank.</p></div><span className="facility-status online">ONLINE</span></div>
    <div className="workshop-help">{factoryBuilt?'Factory tooling is online: current Workshop actions receive the 1 AP discount.':'Factory tooling is not built yet; current Workshop actions use their full AP cost.'}</div>
    <div className="workshop-table" role="table" aria-label="Workshop transformations">
      <div className="workshop-row workshop-header" role="row"><span>Stock</span><span>Input</span><span aria-hidden="true">→</span><span>Object obtained</span><span>Stock</span><span>Action</span></div>
      {visibleRecipes.length===0?<div className="workshop-empty">No transformable items are currently in the Bank.</div>:visibleRecipes.map((recipeId)=>{
        const recipe=WORKSHOP_RECIPES[recipeId];const command=workshopCommand(legalActions,recipeId);const apCost=workshopRecipeApCost(game,recipeId);const repair=recipeId.startsWith('repair_')
        return <div className="workshop-row" role="row" key={recipeId}>
          <strong className="workshop-stock">{game.town.bank[recipe.input]??0}</strong>
          <span className="workshop-object" title={`${recipe.inputCount} required per action`}>{itemName(recipe.input)}</span>
          <span className="workshop-arrow" aria-hidden="true">→</span>
          <span className="workshop-object" title={`${recipe.outputCount} produced per action`}>{itemName(recipe.output)}</span>
          <strong className="workshop-stock">{game.town.bank[recipe.output]??0}</strong>
          <button type="button" disabled={!command} onClick={()=>act(command)}><strong>{repair?'Repair':'Transform'}</strong><small>{apCost} AP</small></button>
        </div>
      })}
    </div>
    <ContextRegister game={game} title="Workshop Register" matches={workshopEvent}/>
  </section>
}
