import { missingMaterials, prioritizedConstruction } from '../core/construction'
import { totalTownDefense } from '../core/defense'
import { watchtowerEstimate } from '../core/night'
import type { Citizen, GameCommand, GameState } from '../core/types'
import { evaluateTownNeeds } from './planning/TownNeeds'

function constructionAction(actions:GameCommand[],projectId:string):GameCommand|null{return actions.find((action)=>action.type==='CONTRIBUTE_CONSTRUCTION'&&action.projectId===projectId)??null}
function recipeAction(actions:GameCommand[],recipeId:'logs_to_planks'|'scrap_to_iron'):GameCommand|null{return actions.find((action)=>action.type==='WORKSHOP_CONVERT'&&action.recipeId===recipeId)??null}
function homeUpgradeAction(actions:GameCommand[]):GameCommand|null{return actions.find((action)=>action.type==='UPGRADE_HOME')??null}

export function chooseTownWork(state:GameState,citizen:Citizen,actions:GameCommand[]):GameCommand|null{
  if(citizen.location.type!=='town')return null

  // The Workshop is the Day-1 bootstrap project. Until it exists, bots do not spend
  // its scarce Planks/Iron on secondary projects simply because those projects happen
  // to become affordable first. Humans can still choose another legal project manually.
  if(!state.town.construction.workshop.completed){
    return constructionAction(actions,'workshop')
  }

  const projects=prioritizedConstruction(state)
  for(const projectId of projects){
    const build=constructionAction(actions,projectId)
    if(build)return build
  }

  // Once Workshop processing exists, raw feedstock can be converted specifically for
  // the highest-priority unfinished projects that are missing refined material.
  for(const projectId of projects){
    const missing=missingMaterials(state,projectId)
    if((missing.twisted_plank??0)>0){const action=recipeAction(actions,'logs_to_planks');if(action)return action}
    if((missing.wrought_iron??0)>0){const action=recipeAction(actions,'scrap_to_iron');if(action)return action}
  }

  const estimate=watchtowerEstimate(state)
  if(estimate&&estimate.min>totalTownDefense(state)){
    const reinforceHome=homeUpgradeAction(actions)
    if(reinforceHome)return reinforceHome
  }

  // If construction is not immediately actionable, keep the citizen available for
  // missions/rescue rather than consuming AP on low-value work.
  void evaluateTownNeeds(state)
  return null
}
