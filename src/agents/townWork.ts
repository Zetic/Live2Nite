import { constructionPriority, missingMaterials } from '../core/construction'
import { totalTownDefense } from '../core/defense'
import { watchtowerEstimate } from '../core/night'
import type { Citizen, ConstructionId, GameCommand, GameState } from '../core/types'

function constructionActions(actions:GameCommand[]):Array<Extract<GameCommand,{type:'CONTRIBUTE_CONSTRUCTION'}>>{
  return actions.filter((action):action is Extract<GameCommand,{type:'CONTRIBUTE_CONSTRUCTION'}>=>action.type==='CONTRIBUTE_CONSTRUCTION')
}
function constructionAction(actions: GameCommand[], projectId: string): GameCommand | null {return actions.find((action)=>action.type==='CONTRIBUTE_CONSTRUCTION'&&action.projectId===projectId)??null}
function recipeAction(actions: GameCommand[], recipeId: 'logs_to_planks' | 'scrap_to_iron'): GameCommand | null {return actions.find((action)=>action.type==='WORKSHOP_CONVERT'&&action.recipeId===recipeId)??null}
function homeUpgradeAction(actions: GameCommand[]): GameCommand | null {return actions.find((action)=>action.type==='UPGRADE_HOME')??null}

export function chooseTownWork(state: GameState, citizen: Citizen, actions: GameCommand[]): GameCommand | null {
  if (citizen.location.type !== 'town') return null

  // Preserve the Workshop as the Day-1 bootstrap. Humans can still choose any legal project.
  if (!state.town.construction.workshop.completed) return constructionAction(actions,'workshop')

  // `getLegalActions` has already filtered construction actions down to projects that are
  // unlocked, incomplete, affordable, and actionable. Score only that small set instead
  // of rescoring the entire 80-project catalog on every bot decision step.
  const builds=constructionActions(actions)
    .sort((left,right)=>constructionPriority(state,right.projectId)-constructionPriority(state,left.projectId))
  if(builds[0])return builds[0]

  // Refine raw material for the most promising currently unlocked project that is already
  // receiving labor. This avoids a second full-catalog priority pass while still letting
  // bots finish projects whose material supply temporarily fell behind.
  const inProgress=(Object.entries(state.town.construction) as Array<[ConstructionId,GameState['town']['construction'][ConstructionId]]>)
    .filter(([,project])=>!project.completed&&project.apContributed>0)
    .sort(([,left],[,right])=>right.apContributed-left.apContributed)
  for(const[projectId]of inProgress){
    const missing=missingMaterials(state,projectId)
    if((missing.twisted_plank??0)>0){const action=recipeAction(actions,'logs_to_planks');if(action)return action}
    if((missing.wrought_iron??0)>0){const action=recipeAction(actions,'scrap_to_iron');if(action)return action}
  }

  const estimate=watchtowerEstimate(state)
  if(estimate&&estimate.min>totalTownDefense(state)){
    const reinforceHome=homeUpgradeAction(actions)
    if(reinforceHome)return reinforceHome
  }
  return null
}
