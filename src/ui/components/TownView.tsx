import { CONSTRUCTION_ORDER, CONSTRUCTIONS, missingMaterials } from '../../core/construction'
import { ITEMS, ITEM_TYPES, itemName, itemPurpose } from '../../core/items'
import type { ConstructionId, GameCommand, GameState, ItemType, WorkshopRecipeId } from '../../core/types'
import { WORKSHOP_RECIPE_ORDER, WORKSHOP_RECIPES } from '../../core/workshop'
import { findAction } from '../actionHelpers'

function constructionCommand(actions: GameCommand[], projectId: ConstructionId) {
  return actions.find((action): action is Extract<GameCommand,{type:'CONTRIBUTE_CONSTRUCTION'}> => action.type === 'CONTRIBUTE_CONSTRUCTION' && action.projectId === projectId)
}
function workshopCommand(actions: GameCommand[], recipeId: WorkshopRecipeId) {
  return actions.find((action): action is Extract<GameCommand,{type:'WORKSHOP_CONVERT'}> => action.type === 'WORKSHOP_CONVERT' && action.recipeId === recipeId)
}
function resourceEntries(resources: Partial<Record<ItemType,number>>) { return Object.entries(resources) as [ItemType,number][] }

const STANDARD_BANK_TYPES = new Set<ItemType>(['rotten_log','scrap_metal','twisted_plank','wrought_iron','unshaped_concrete_block','water_ration','food','old_door'])

export function TownView({ game, legalActions, act, onEnterWorld }: {
  game: GameState
  legalActions: GameCommand[]
  act: (command: GameCommand | undefined) => void
  onEnterWorld: (command: GameCommand) => void
}) {
  const player = game.citizens[0]
  const open = findAction(legalActions,'OPEN_GATE')
  const close = findAction(legalActions,'CLOSE_GATE')
  const exit = findAction(legalActions,'EXIT_TOWN')
  const takeWater = findAction(legalActions,'TAKE_WATER')
  const deposits = legalActions.filter((action): action is Extract<GameCommand,{type:'DEPOSIT_ITEM'}> => action.type === 'DEPOSIT_ITEM')
  const withdrawals = legalActions.filter((action): action is Extract<GameCommand,{type:'WITHDRAW_BANK_ITEM'}> => action.type === 'WITHDRAW_BANK_ITEM')
  const workshopBuilt = game.town.construction.workshop.completed
  const visibleBankTypes = ITEM_TYPES.filter((type) => STANDARD_BANK_TYPES.has(type) || (game.town.bank[type] ?? 0) > 0)
  const completed = CONSTRUCTION_ORDER.filter((id) => game.town.construction[id].completed).length

  let wellReason = 'Take today’s Water Ration.'
  if (player.daily.waterTaken) wellReason = 'You already claimed today’s ration.'
  else if (game.town.well.water <= 0) wellReason = 'The well is dry.'
  else if (player.inventory.length >= player.inventoryCapacity) wellReason = 'Your rucksack is full.'

  return <section className="panel screen-panel">
    <div className="panel-heading">
      <div><p className="section-kicker">Inside the walls</p><h2>Town</h2><p className="section-note">Coordinate water, construction, material processing, and the gate before nightfall.</p></div>
      <span className={`gate-chip ${game.town.gateOpen?'open':''}`}>{game.town.gateOpen?'GATE OPEN':'GATE SEALED'}</span>
    </div>

    <div className="town-overview-grid">
      <section className="town-feature well-card">
        <div className="feature-icon" aria-hidden="true">W</div>
        <div className="feature-copy"><span>Town Well</span><strong>{game.town.well.water} rations</strong><p>{wellReason}</p></div>
        <button className="feature-action" disabled={!takeWater} onClick={() => act(takeWater)}>Take water <small>0 AP</small></button>
      </section>

      <section className="town-feature gate-card">
        <div className="feature-icon" aria-hidden="true">G</div>
        <div className="feature-copy"><span>Town Gate</span><strong>{game.town.gateOpen ? 'Open' : 'Sealed'}</strong><p>An open gate nullifies town defense during the nightly attack.</p></div>
        <div className="feature-actions">
          {open && <button onClick={() => act(open)}>Open <small>1 AP</small></button>}
          {close && <button onClick={() => act(close)}>Close <small>1 AP</small></button>}
          {exit && <button className="primary" onClick={() => onEnterWorld(exit)}>Go outside <small>0 AP</small></button>}
        </div>
      </section>
    </div>

    <section className="town-section">
      <div className="section-heading-row"><div><h3>Construction Sites</h3><p>Projects accept 1 AP at a time once all required materials are available in the bank.</p></div><span className="micro-stat">{completed}/{CONSTRUCTION_ORDER.length} built</span></div>
      <div className="project-grid">{CONSTRUCTION_ORDER.map((projectId) => {
        const definition = CONSTRUCTIONS[projectId]
        const project = game.town.construction[projectId]
        const missing = missingMaterials(game,projectId)
        const command = constructionCommand(legalActions,projectId)
        const progress = project.completed ? 100 : Math.round((project.apContributed/definition.apCost)*100)
        return <article className={`project-card ${project.completed?'completed':''}`} key={projectId}>
          <div className="project-title-row"><div><span className="project-state">{project.completed?'COMPLETED':'CONSTRUCTION'}</span><h4>{definition.name}</h4></div>{definition.defenseBonus>0&&<span className="defense-badge">+{definition.defenseBonus} DEF</span>}</div>
          <p>{definition.description}</p>
          <div className="progress-label"><span>Town labor</span><strong>{project.apContributed}/{definition.apCost} AP</strong></div><div className="progress-track"><span style={{width:`${progress}%`}}/></div>
          <div className="requirements">{resourceEntries(definition.resources).map(([type,required]) => { const current=game.town.bank[type]??0; const enough=current>=required||project.completed; return <span className={enough?'ready':'missing'} key={type}>{itemName(type)} <strong>{project.completed?required:current}/{required}</strong></span> })}</div>
          {!project.completed && <button className="project-action" disabled={!command} onClick={() => act(command)}>{command?'Contribute to project':Object.keys(missing).length?'Waiting on materials':'No AP available'}<small>1 AP</small></button>}
        </article>
      })}</div>
    </section>

    <section className="town-section">
      <div className="section-heading-row"><div><h3>Workshop</h3><p>{workshopBuilt?'Refine common scavenged resources into construction materials.':'Complete the Workshop before raw resources can be refined.'}</p></div><span className={`facility-status ${workshopBuilt?'online':''}`}>{workshopBuilt?'ONLINE':'LOCKED'}</span></div>
      <div className="recipe-grid">{WORKSHOP_RECIPE_ORDER.map((recipeId) => { const recipe=WORKSHOP_RECIPES[recipeId]; const command=workshopCommand(legalActions,recipeId); return <button className="recipe-card" disabled={!command} key={recipeId} onClick={() => act(command)}><span>{recipe.name}</span><strong>{recipe.inputCount} {itemName(recipe.input)} → {recipe.outputCount} {itemName(recipe.output)}</strong><small>{recipe.apCost} AP · bank has {game.town.bank[recipe.input]??0}</small></button> })}</div>
    </section>

    <section className="town-section split-section">
      <div>
        <h3>Carried to the Bank <span className="heading-count">{player.inventory.length}/{player.inventoryCapacity}</span></h3>
        <p className="section-note">Personal storage and starter supplies are managed from Home.</p>
        {player.inventory.length===0 ? <p className="empty-state">Nothing carried.</p> : <div className="item-list">{player.inventory.map((item) => { const command=deposits.find((candidate)=>candidate.itemId===item.id); return <button key={item.id} onClick={() => act(command)}>Deposit {itemName(item.type)} <small>0 AP</small></button> })}</div>}
      </div>
      <div>
        <h3>Town Bank</h3>
        <div className="bank-grid">{visibleBankTypes.map((type) => { const withdraw=withdrawals.find((action)=>action.itemType===type); return <article className={`bank-item category-${ITEMS[type].category}`} key={type}><div><span>{itemName(type)}</span><strong>×{game.town.bank[type]??0}</strong></div><small>{itemPurpose(type)}</small>{(game.town.bank[type]??0)>0&&<button className="bank-take" disabled={!withdraw} onClick={()=>act(withdraw)}>Take one</button>}</article> })}</div>
      </div>
    </section>
  </section>
}
