import { bankCount } from '../core/bank'
import { COMBINATION_RECIPES, combinationRecipeForOutput } from '../core/combinations'
import { CONSTRUCTIONS, missingMaterials } from '../core/construction'
import { nextHomeDefinition, personalMaterialCount } from '../core/home'
import type { Citizen, CombinationRecipeId, ConstructionId, GameCommand, GameState, HomeImprovementId, ItemType, WorkshopRecipeId } from '../core/types'
import { publicDefenseAssessment, rankStrategicConstruction, strategicConstructionNeed } from './planning/TownDefenseStrategy'

function constructionActions(actions:GameCommand[]):Array<Extract<GameCommand,{type:'CONTRIBUTE_CONSTRUCTION'}>>{return actions.filter((action):action is Extract<GameCommand,{type:'CONTRIBUTE_CONSTRUCTION'}>=>action.type==='CONTRIBUTE_CONSTRUCTION')}
function recipeAction(actions:GameCommand[],recipeId:WorkshopRecipeId):GameCommand|null{return actions.find((action)=>action.type==='WORKSHOP_CONVERT'&&action.recipeId===recipeId)??null}
function combinationAction(actions:GameCommand[],recipeId:CombinationRecipeId):GameCommand|null{return actions.find((action)=>action.type==='COMBINE_ITEMS'&&action.recipeId===recipeId)??null}
function homeUpgradeAction(actions:GameCommand[]):GameCommand|null{return actions.find((action)=>action.type==='UPGRADE_HOME')??null}
function improvementAction(actions:GameCommand[],id:HomeImprovementId):GameCommand|null{return actions.find((action)=>action.type==='BUILD_HOME_IMPROVEMENT'&&action.improvementId===id)??null}
function withdrawAction(state:GameState,actions:GameCommand[],type:ItemType):GameCommand|null{return actions.find((action)=>action.type==='WITHDRAW_BANK_ITEM'&&state.town.bank.some((item)=>item.id===action.itemId&&item.type===type))??null}
function communalReserve(state:GameState,type:ItemType,projectId:ConstructionId|null):number{if(!projectId||state.town.construction[projectId]?.completed)return 0;return CONSTRUCTIONS[projectId].resources[type]??0}
function homeMaterialWithdrawal(state:GameState,citizen:Citizen,actions:GameCommand[],communalProjectId:ConstructionId|null):GameCommand|null{const target=nextHomeDefinition(citizen.home.level);if(!target||citizen.home.upgradedDay===state.day||target.apCost>citizen.maxAp)return null;for(const[type,required]of Object.entries(target.resources)){const itemType=type as ItemType;const missing=Math.max(0,(required??0)-personalMaterialCount(citizen,itemType));if(missing<=0)continue;if(bankCount(state,itemType)<=communalReserve(state,itemType,communalProjectId))continue;const action=withdrawAction(state,actions,itemType);if(action)return action}return null}
function personalCount(citizen:Citizen,type:ItemType):number{return [...citizen.inventory,...citizen.home.storage].filter((item)=>item.type===type).length}
function prepareCombination(state:GameState,citizen:Citizen,actions:GameCommand[],recipeId:CombinationRecipeId):GameCommand|null{
  const ready=combinationAction(actions,recipeId);if(ready)return ready
  if(citizen.inventory.length>=citizen.inventoryCapacity)return null
  const recipe=COMBINATION_RECIPES[recipeId]
  for(const input of recipe.inputs){const required=input.count??1;if(personalCount(citizen,input.type)>=required)continue;if(bankCount(state,input.type)<=0)continue;const withdraw=withdrawAction(state,actions,input.type);if(withdraw)return withdraw}
  return null
}
function materialRecipe(state:GameState,citizen:Citizen,actions:GameCommand[],missing:Partial<Record<ItemType,number>>):GameCommand|null{
  for(const[type,amount]of Object.entries(missing) as Array<[ItemType,number|undefined]>){if((amount??0)<=0)continue;const combinationId=combinationRecipeForOutput(type);if(combinationId){const action=prepareCombination(state,citizen,actions,combinationId);if(action)return action}}
  const direct:Array<[ItemType,WorkshopRecipeId]>=[['twisted_plank','logs_to_planks'],['wrought_iron','scrap_to_iron'],['patchwork_beam','planks_to_beams'],['metal_support','iron_to_supports']]
  for(const[type,recipeId]of direct)if((missing[type]??0)>0){const action=recipeAction(actions,recipeId);if(action)return action}
  const technicalMissing=['electronic_component','nuts_and_bolts','compact_detonator'] as ItemType[]
  if(technicalMissing.some((type)=>(missing[type]??0)>0)){const electronic=recipeAction(actions,'dismantle_electronic_device');if(electronic)return electronic}
  if(['wrought_iron','nuts_and_bolts','copper_pipe'].some((type)=>(missing[type as ItemType]??0)>0)){const mechanism=recipeAction(actions,'dismantle_mechanism');if(mechanism)return mechanism}
  return null
}
export function chooseTownWork(state:GameState,citizen:Citizen,actions:GameCommand[]):GameCommand|null{
  if(citizen.location.type!=='town')return null
  const assessment=publicDefenseAssessment(state);const builds=constructionActions(actions);const rankedBuildIds=rankStrategicConstruction(state,builds.map((action)=>action.projectId),assessment)
  if(rankedBuildIds[0]){const build=builds.find((action)=>action.projectId===rankedBuildIds[0]);if(build)return build}
  const inProgress=(Object.entries(state.town.construction) as Array<[ConstructionId,GameState['town']['construction'][ConstructionId]]>).filter(([,project])=>!project.completed&&project.apContributed>0)
  const rankedInProgress=rankStrategicConstruction(state,inProgress.map(([projectId])=>projectId),assessment)
  for(const projectId of rankedInProgress){const action=materialRecipe(state,citizen,actions,missingMaterials(state,projectId));if(action)return action}
  const strategic=strategicConstructionNeed(state).projectId
  if(strategic){const action=materialRecipe(state,citizen,actions,missingMaterials(state,strategic));if(action)return action}
  const defenseUrgent=assessment.pressure==='critical'||assessment.pressure==='shortfall';const personalUpgrade=homeUpgradeAction(actions);if(personalUpgrade&&(defenseUrgent||state.clock.hour>=20))return personalUpgrade
  if(defenseUrgent){const withdraw=homeMaterialWithdrawal(state,citizen,actions,strategic);if(withdraw)return withdraw}
  if(defenseUrgent||state.clock.hour>=20){const fence=improvementAction(actions,'fence');if(fence)return fence;const reinforcement=improvementAction(actions,'reinforcements');if(reinforcement)return reinforcement}
  if(state.clock.hour>=20&&citizen.home.storage.length>=citizen.home.storageCapacity-1){const storage=improvementAction(actions,'storage');if(storage)return storage}
  return null
}
