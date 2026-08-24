import { bankCount } from '../../core/bank'
import { itemName } from '../../core/items'
import type { GameCommand, GameEvent, GameState, WorkshopRecipeId } from '../../core/types'
import { WORKSHOP_RECIPE_ORDER, WORKSHOP_RECIPES, carriedHacksawDiscount, type WorkshopCategory, workshopRecipeApCost, workshopRecipeStock } from '../../core/workshop'
import { ContextRegister } from './ContextRegister'
import '../workshop.css'

function workshopCommand(actions:GameCommand[],recipeId:WorkshopRecipeId){return actions.find((action):action is Extract<GameCommand,{type:'WORKSHOP_CONVERT'}>=>action.type==='WORKSHOP_CONVERT'&&action.recipeId===recipeId)}
function workshopEvent(event:GameEvent):boolean{return event.type==='WORKSHOP_CONVERTED'}
const GROUPS:Array<{id:WorkshopCategory;label:string;note:string}>=[
  {id:'transform',label:'Transform',note:'Process raw and structural materials into another form.'},
  {id:'repair',label:'Repair',note:'Restore equipment that specifically requires Workshop tooling.'},
  {id:'dismantle',label:'Dismantle',note:'Break salvage apart for useful components.'},
]

export function WorkshopView({game,legalActions,act}:{game:GameState;legalActions:GameCommand[];act:(command:GameCommand|undefined)=>void}){
  if(!game.town.construction.workshop.completed)return null
  const factoryBuilt=game.town.construction.factory.completed
  const actorId=legalActions[0]?.citizenId
  const hacksawCarried=carriedHacksawDiscount(game,actorId)>0
  const discounts=[factoryBuilt?'Factory −1 AP':null,hacksawCarried?'Carried Hacksaw −1 AP':null].filter(Boolean).join(' · ')
  return <section className="panel screen-panel workshop-screen">
    <div className="panel-heading"><div><p className="section-kicker">Built facility</p><h2>Workshop</h2><p className="section-note">Transform materials, repair Workshop-specific equipment, and dismantle salvage. Portable assembling, reloading and ordinary repairs belong to personal item actions.</p></div><span className="facility-status online">ONLINE</span></div>
    <div className="workshop-help">{discounts||'No Workshop AP discounts are currently active.'}</div>
    <div className="workshop-table" role="table" aria-label="Workshop actions">
      <div className="workshop-row workshop-header" role="row"><span>Stock</span><span>Input</span><span aria-hidden="true">→</span><span>Object obtained</span><span>Stock</span><span>Action</span></div>
      {GROUPS.map((group)=>{const recipes=WORKSHOP_RECIPE_ORDER.filter((recipeId)=>WORKSHOP_RECIPES[recipeId].category===group.id&&workshopRecipeStock(game,recipeId)>0);if(!recipes.length)return null;return <div className="workshop-group" key={group.id}>
        <div className="workshop-group-heading"><strong>{group.label}</strong><span>{group.note}</span></div>
        {recipes.map((recipeId)=>{const recipe=WORKSHOP_RECIPES[recipeId];const command=workshopCommand(legalActions,recipeId);const apCost=workshopRecipeApCost(game,recipeId,actorId);const inputStock=workshopRecipeStock(game,recipeId);const inputLabel=`${recipe.inputCount}× ${itemName(recipe.input)}`;const outputLabel=recipe.outcomes?.length?[...new Set(recipe.outcomes.map((outcome)=>itemName(outcome.output)))].join(' / '):itemName(recipe.output);const outputStock=recipe.outcomes?.length?'—':String(bankCount(game,recipe.output));const actionLabel=group.id==='repair'?'Repair':group.id==='dismantle'?'Dismantle':'Transform';return <div className="workshop-row" role="row" key={recipeId}><strong className="workshop-stock">{inputStock}</strong><span className="workshop-object" title={inputLabel}>{inputLabel}</span><span className="workshop-arrow" aria-hidden="true">→</span><span className="workshop-object" title={outputLabel}>{outputLabel}</span><strong className="workshop-stock">{outputStock}</strong><button type="button" disabled={!command} onClick={()=>act(command)}><strong>{actionLabel}</strong><small>{apCost} AP</small></button></div>})}
      </div>})}
      {!WORKSHOP_RECIPE_ORDER.some((recipeId)=>workshopRecipeStock(game,recipeId)>0)&&<div className="workshop-empty">No Workshop-processable items are currently in the Bank.</div>}
    </div>
    <ContextRegister game={game} title="Workshop Register" matches={workshopEvent}/>
  </section>
}
