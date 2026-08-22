import { CONSTRUCTION_ORDER, CONSTRUCTIONS, missingMaterials } from '../../core/construction'
import { ITEMS, ITEM_TYPES, itemName, itemPurpose } from '../../core/items'
import type { ConstructionId, GameCommand, GameState, ItemType, WorkshopRecipeId } from '../../core/types'
import { WORKSHOP_RECIPE_ORDER, WORKSHOP_RECIPES } from '../../core/workshop'
import { findAction } from '../actionHelpers'

function constructionCommand(actions:GameCommand[],projectId:ConstructionId){return actions.find((action):action is Extract<GameCommand,{type:'CONTRIBUTE_CONSTRUCTION'}>=>action.type==='CONTRIBUTE_CONSTRUCTION'&&action.projectId===projectId)}
function workshopCommand(actions:GameCommand[],recipeId:WorkshopRecipeId){return actions.find((action):action is Extract<GameCommand,{type:'WORKSHOP_CONVERT'}>=>action.type==='WORKSHOP_CONVERT'&&action.recipeId===recipeId)}
function resourceEntries(resources:Partial<Record<ItemType,number>>){return Object.entries(resources) as [ItemType,number][]}

export function TownView({game,legalActions,act}:{game:GameState;legalActions:GameCommand[];act:(command:GameCommand|undefined)=>void}){
  const player=game.citizens[0]
  const open=findAction(legalActions,'OPEN_GATE'), close=findAction(legalActions,'CLOSE_GATE'), exit=findAction(legalActions,'EXIT_TOWN')
  const deposits=legalActions.filter((action):action is Extract<GameCommand,{type:'DEPOSIT_ITEM'}>=>action.type==='DEPOSIT_ITEM')
  const workshopBuilt=game.town.construction.workshop.completed
  return <>
    <div className="panel-heading"><div><p className="section-kicker">Inside the walls</p><h2>Town Operations</h2><p className="section-note">Turn scavenged material into shared infrastructure before the next attack.</p></div><span className={`gate-chip ${game.town.gateOpen?'open':''}`}>{game.town.gateOpen?'GATE OPEN':'GATE SEALED'}</span></div>
    <section className="town-section gate-section"><div><h3>Town Gate</h3><p>Opening or closing the gate costs 1 AP. An open gate nullifies town defense during the nightly attack.</p></div><div className="actions inline-actions gate-actions">{open&&<button onClick={()=>act(open)}>Open gate <small>1 AP</small></button>}{close&&<button onClick={()=>act(close)}>Close gate <small>1 AP</small></button>}{exit&&<button className="primary" onClick={()=>act(exit)}>Enter the World Beyond <small>0 AP</small></button>}</div></section>
    <section className="town-section"><div className="section-heading-row"><div><h3>Construction Sites</h3><p>Projects accept 1 AP at a time. Required materials must be in the bank; they are consumed only when the project is completed.</p></div><span className="micro-stat">{CONSTRUCTION_ORDER.filter(id=>game.town.construction[id].completed).length}/{CONSTRUCTION_ORDER.length} built</span></div>
      <div className="project-grid">{CONSTRUCTION_ORDER.map(projectId=>{const definition=CONSTRUCTIONS[projectId],project=game.town.construction[projectId],missing=missingMaterials(game,projectId),command=constructionCommand(legalActions,projectId),progress=project.completed?100:Math.round((project.apContributed/definition.apCost)*100);return <article className={`project-card ${project.completed?'completed':''}`} key={projectId}>
        <div className="project-title-row"><div><span className="project-state">{project.completed?'COMPLETED':'CONSTRUCTION'}</span><h4>{definition.name}</h4></div>{definition.defenseBonus>0&&<span className="defense-badge">+{definition.defenseBonus} DEF</span>}</div><p>{definition.description}</p>
        <div className="progress-label"><span>Town labor</span><strong>{project.apContributed}/{definition.apCost} AP</strong></div><div className="progress-track"><span style={{width:`${progress}%`}}/></div>
        <div className="requirements">{resourceEntries(definition.resources).map(([type,required])=>{const current=game.town.bank[type]??0,enough=current>=required||project.completed;return <span className={enough?'ready':'missing'} key={type}>{itemName(type)} <strong>{project.completed?required:current}/{required}</strong></span>})}</div>
        {!project.completed&&<button className="project-action" disabled={!command} onClick={()=>act(command)}>{command?'Contribute to project':Object.keys(missing).length?'Waiting on materials':'No AP available'}<small>1 AP</small></button>}
      </article>})}</div>
    </section>
    <section className="town-section"><div className="section-heading-row"><div><h3>Workshop</h3><p>{workshopBuilt?'The Workshop can refine common scavenged resources. Each conversion costs 3 AP.':'Build the Workshop to process Rotten Logs and Scrap Metal into construction materials.'}</p></div><span className={`facility-status ${workshopBuilt?'online':''}`}>{workshopBuilt?'ONLINE':'LOCKED'}</span></div>
      <div className="recipe-grid">{WORKSHOP_RECIPE_ORDER.map(recipeId=>{const recipe=WORKSHOP_RECIPES[recipeId],command=workshopCommand(legalActions,recipeId);return <button className="recipe-card" disabled={!command} key={recipeId} onClick={()=>act(command)}><span>{recipe.name}</span><strong>{recipe.inputCount} {itemName(recipe.input)} → {recipe.outputCount} {itemName(recipe.output)}</strong><small>{recipe.apCost} AP · bank has {game.town.bank[recipe.input]??0}</small></button>})}</div>
    </section>
    <section className="town-section split-section"><div><h3>Your Backpack <span className="heading-count">{player.inventory.length}/{player.inventoryCapacity}</span></h3>{player.inventory.length===0?<p className="empty-state">Nothing carried.</p>:<div className="item-list">{player.inventory.map(item=>{const command=deposits.find(candidate=>candidate.itemId===item.id);return <button key={item.id} onClick={()=>act(command)}>Deposit {itemName(item.type)} <small>0 AP</small></button>})}</div>}</div>
      <div><h3>Town Bank</h3><div className="bank-grid">{ITEM_TYPES.map(type=><article className={`bank-item category-${ITEMS[type].category}`} key={type}><div><span>{itemName(type)}</span><strong>×{game.town.bank[type]??0}</strong></div><small>{itemPurpose(type)}</small></article>)}</div></div>
    </section>
  </>
}
