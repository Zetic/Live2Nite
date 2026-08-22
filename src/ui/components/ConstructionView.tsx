import { CONSTRUCTION_ORDER, CONSTRUCTIONS, constructionUnlocked, missingMaterials } from '../../core/construction'
import { itemName } from '../../core/items'
import type { ConstructionId, GameCommand, GameState, ItemType } from '../../core/types'

function constructionCommand(actions: GameCommand[], projectId: ConstructionId) {
  return actions.find((action): action is Extract<GameCommand,{type:'CONTRIBUTE_CONSTRUCTION'}> => action.type === 'CONTRIBUTE_CONSTRUCTION' && action.projectId === projectId)
}
function resourceEntries(resources: Partial<Record<ItemType,number>>) { return Object.entries(resources) as [ItemType,number][] }

export function ConstructionView({ game, legalActions, act }: {
  game: GameState
  legalActions: GameCommand[]
  act: (command: GameCommand | undefined) => void
}) {
  const active = CONSTRUCTION_ORDER.filter((id) => !game.town.construction[id].completed)
  const completed = CONSTRUCTION_ORDER.filter((id) => game.town.construction[id].completed)

  return <section className="panel screen-panel">
    <div className="panel-heading">
      <div>
        <p className="section-kicker">Shared town projects</p>
        <h2>Construction Sites</h2>
        <p className="section-note">Projects now compete for shared materials. Build what the town needs; prerequisite projects unlock later branches.</p>
      </div>
      <span className="panel-count">{completed.length}/{CONSTRUCTION_ORDER.length} built</span>
    </div>

    {active.length === 0 ? <p className="empty-state">Every currently available construction project is complete.</p> : <div className="project-grid">{active.map((projectId) => {
      const definition = CONSTRUCTIONS[projectId]
      const project = game.town.construction[projectId]
      const unlocked = constructionUnlocked(game, projectId)
      const missing = missingMaterials(game, projectId)
      const command = constructionCommand(legalActions, projectId)
      const progress = Math.round((project.apContributed / definition.apCost) * 100)
      const prerequisites = definition.prerequisites.map((id) => CONSTRUCTIONS[id].name)
      const blockedReason = !unlocked
        ? `Requires ${prerequisites.join(' + ')}`
        : Object.keys(missing).length
          ? 'Waiting on Bank materials'
          : 'No AP available'
      return <article className="project-card" key={projectId}>
        <div className="project-title-row">
          <div><span className="project-state">{unlocked ? 'CONSTRUCTION' : 'LOCKED'}</span><h4>{definition.name}</h4></div>
          {definition.defenseBonus > 0 && <span className="defense-badge">+{definition.defenseBonus} DEF</span>}
        </div>
        <p>{definition.description}</p>
        {definition.effectLabel && <p className="section-note"><strong>Effect:</strong> {definition.effectLabel}</p>}
        {definition.historicalCostConfidence === 'adapted' && <p className="section-note">Current material mix is a Live2Nite reconstruction pending exact final-English component verification.</p>}
        {!unlocked && <div className="requirements"><span className="missing">Prerequisite <strong>{prerequisites.join(' + ')}</strong></span></div>}
        <div className="progress-label"><span>Town labor</span><strong>{project.apContributed}/{definition.apCost} AP</strong></div>
        <div className="progress-track"><span style={{width:`${progress}%`}}/></div>
        <div className="requirements">{resourceEntries(definition.resources).map(([type,required]) => {
          const current = game.town.bank[type] ?? 0
          return <span className={current >= required ? 'ready' : 'missing'} key={type}>{itemName(type)} <strong>{current}/{required}</strong></span>
        })}</div>
        <button className="project-action" disabled={!command} onClick={() => act(command)}>{command ? 'Contribute to project' : blockedReason}<small>1 AP</small></button>
      </article>
    })}</div>}

    {completed.length > 0 && <section className="town-section completed-facilities">
      <div><h3>Completed Sites</h3><p>Completed projects remain active as town-wide effects or operational facilities.</p></div>
      <div className="requirements">{completed.map((id) => <span className="ready" key={id}>{CONSTRUCTIONS[id].name} <strong>BUILT</strong></span>)}</div>
    </section>}
  </section>
}
