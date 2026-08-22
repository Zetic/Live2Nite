import { missingMaterials, prioritizedConstruction } from '../core/construction'
import { totalTownDefense } from '../core/defense'
import { watchtowerEstimate } from '../core/night'
import type { Citizen, GameCommand, GameState, WorkshopRecipeId } from '../core/types'
import { WORKSHOP_RECIPES } from '../core/workshop'
import { evaluateTownNeeds } from './planning/TownNeeds'
function constructionAction(actions:GameCommand[],projectId:string):GameCommand|null{return actions.find((action)=>action.type==='CONTRIBUTE_CONSTRUCTION'&&action.projectId===projectId)??null}
function recipeAction(actions:GameCommand[],recipeId:WorkshopRecipeId):GameCommand|null{return actions.find((action)=>action.type==='WORKSHOP_CONVERT'&&action.recipeId===recipeId)??null}
function homeUpgradeAction(actions:GameCommand[]):GameCommand|null{return actions.find((action)=>action.type==='UPGRADE_HOME')??null}
export function chooseTownWork(state:GameState,citizen:Citizen,actions:GameCommand[]):GameCommand|null{if(citizen.location.type!=='town')return null;const projects=prioritizedConstruction(state);for(const projectId of projects){const build=constructionAction(actions,projectId);if(build)return build}if(state.town.construction.workshop.completed){for(const projectId of projects){const missing=missingMaterials(state,projectId);if((missing.twisted_plank??0)>0){const action=recipeAction(actions,'logs_to_planks');if(action)return action}if((missing.wrought_iron??0)>0){const action=recipeAction(actions,'scrap_to_iron');if(action)return action}}if(evaluateTownNeeds(state).weaponsLow){const repairs=(Object.keys(WORKSHOP_RECIPES) as WorkshopRecipeId[]).filter((id)=>id.startsWith('repair_'));for(const id of repairs){const action=recipeAction(actions,id);if(action)return action}}}const estimate=watchtowerEstimate(state);if(estimate&&estimate.min>totalTownDefense(state)){const reinforceHome=homeUpgradeAction(actions);if(reinforceHome)return reinforceHome}return null}
