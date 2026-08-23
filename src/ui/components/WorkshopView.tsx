import { itemName } from '../../core/items'
import type { GameCommand, GameState, WorkshopRecipeId } from '../../core/types'
import { WORKSHOP_RECIPE_ORDER, WORKSHOP_RECIPES, workshopRecipeApCost } from '../../core/workshop'

function workshopCommand(actions: GameCommand[], recipeId: WorkshopRecipeId) {
  return actions.find((action): action is Extract<GameCommand,{type:'WORKSHOP_CONVERT'}> => action.type === 'WORKSHOP_CONVERT' && action.recipeId === recipeId)
}

export function WorkshopView({ game, legalActions, act }: {
  game: GameState
  legalActions: GameCommand[]
  act: (command: GameCommand | undefined) => void
}) {
  if (!game.town.construction.workshop.completed) return null
  const factoryBuilt=game.town.construction.factory.completed

  return <section className="panel screen-panel">
    <div className="panel-heading">
      <div><p className="section-kicker">Built facility</p><h2>Workshop</h2><p className="section-note">Turn low-grade materials recovered from depleted zones into construction-ready resources stored directly in the Bank.</p></div>
      <span className="facility-status online">ONLINE</span>
    </div>

    <div className="raw-material-summary">
      <article className="bank-item category-raw"><div><span>{itemName('rotten_log')}</span><strong>×{game.town.bank.rotten_log ?? 0}</strong></div><small>Recovered primarily from depleted-zone scavenging.</small></article>
      <article className="bank-item category-raw"><div><span>{itemName('scrap_metal')}</span><strong>×{game.town.bank.scrap_metal ?? 0}</strong></div><small>Recovered primarily from depleted-zone scavenging.</small></article>
    </div>

    <section className="town-section">
      <div className="section-heading-row"><div><h3>Material Processing</h3><p>{factoryBuilt?'Factory tooling reduces each current Workshop action by 1 AP.':'Build the Factory branch to reduce Workshop AP costs.'}</p></div></div>
      <div className="recipe-grid">{WORKSHOP_RECIPE_ORDER.map((recipeId) => {
        const recipe = WORKSHOP_RECIPES[recipeId]
        const command = workshopCommand(legalActions, recipeId)
        const apCost=workshopRecipeApCost(game,recipeId)
        return <button className="recipe-card" disabled={!command} key={recipeId} onClick={() => act(command)}>
          <span>{recipe.name}</span>
          <strong>{recipe.inputCount} {itemName(recipe.input)} → {recipe.outputCount} {itemName(recipe.output)}</strong>
          <small>{apCost} AP · Bank has {game.town.bank[recipe.input] ?? 0}</small>
        </button>
      })}</div>
    </section>
  </section>
}
