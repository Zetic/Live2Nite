import { bankCount } from '../core/bank'
import { CONSTRUCTIONS, missingMaterials } from '../core/construction'
import { nextHomeDefinition, personalMaterialCount } from '../core/home'
import type { Citizen, ConstructionId, GameCommand, GameState, HomeImprovementId, ItemType } from '../core/types'
import { publicDefenseAssessment, rankStrategicConstruction, strategicConstructionNeed } from './planning/TownDefenseStrategy'

function constructionActions(actions:GameCommand[]):Array<Extract<GameCommand,{type:'CONTRIBUTE_CONSTRUCTION'}>>{return actions.filter((action):action is Extract<GameCommand,{type:'CONTRIBUTE_CONSTRUCTION'}>=>action.type==='CONTRIBUTE_CONSTRUCTION')}
function recipeAction(actions:GameCommand[],recipeId:'logs_to_planks'|'scrap_to_iron'):GameCommand|null{return actions.find((action)=>action.type==='WORKSHOP_CONVERT'&&action.recipeId===recipeId)??null}
function homeUpgradeAction(actions:GameCommand[]):GameCommand|null{return actions.find((action)=>action.type==='UPGRADE_HOME')??null}
function improvementAction(actions:GameCommand[],id:HomeImprovementId):GameCommand|null{return actions.find((action)=>action.type==='BUILD_HOME_IMPROVEMENT'&&action.improvementId===id)??null}
function withdrawAction(state:GameState,actions:GameCommand[],type:ItemType):GameCommand|null{return actions.find((action)=>action.type==='WITHDRAW_BANK_ITEM'&&state.town.bank.some((item)=>item.id===action.itemId&&item.type===type))??null}
function communalReserve(state:GameState,type:ItemType,projectId:ConstructionId|null):number{if(!projectId||state.town.construction[projectId]?.completed)return 0;return CONSTRUCTIONS[projectId].resources[type]??0}
function homeMaterialWithdrawal(state:GameState,citizen:Citizen,actions:GameCommand[],communalProjectId:ConstructionId|null):GameCommand|null{
  const target=nextHomeDefinition(citizen.home.level);if(!target||citizen.home.upgradedDay===state.day||target.apCost>citizen.maxAp)return null
  for(const[type,required]of Object.entries(target.resources)){const itemType=type as ItemType;const missing=Math.max(0,(required??0)-personalMaterialCount(citizen,itemType));if(missing<=0)continue;if(bankCount(state,itemType)<=communalReserve(state,itemType,communalProjectId))continue;const action=withdrawAction(state,actions,itemType);if(action)return action}
  return null
}
export function chooseTownWork(state:GameState,citizen:Citizen,actions:GameCommand[]):GameCommand|null{
  if(citizen.location.type!=='town')return null
  const assessment=publicDefenseAssessment(state);const builds=constructionActions(actions);const rankedBuildIds=rankStrategicConstruction(state,builds.map((action)=>action.projectId),assessment)
  if(rankedBuildIds[0]){const build=builds.find((action)=>action.projectId===rankedBuildIds[0]);if(build)return build}
  const inProgress=(Object.entries(state.town.construction) as Array<[ConstructionId,GameState['town']['construction'][ConstructionId]]>).filter(([,project])=>!project.completed&&project.apContributed>0)
  const rankedInProgress=rankStrategicConstruction(state,inProgress.map(([projectId])=>projectId),assessment)
  for(const projectId of rankedInProgress){const missing=missingMaterials(state,projectId);if((missing.twisted_plank??0)>0){const action=recipeAction(actions,'logs_to_planks');if(action)return action}if((missing.wrought_iron??0)>0){const action=recipeAction(actions,'scrap_to_iron');if(action)return action}}
  const defenseUrgent=assessment.pressure==='critical'||assessment.pressure==='shortfall';const personalUpgrade=homeUpgradeAction(actions);if(personalUpgrade&&(defenseUrgent||state.clock.hour>=20))return personalUpgrade
  if(defenseUrgent){const communalProjectId=strategicConstructionNeed(state).projectId;const withdraw=homeMaterialWithdrawal(state,citizen,actions,communalProjectId);if(withdraw)return withdraw}
  if(defenseUrgent||state.clock.hour>=20){const fence=improvementAction(actions,'fence');if(fence)return fence;const reinforcement=improvementAction(actions,'reinforcements');if(reinforcement)return reinforcement}
  if(state.clock.hour>=20&&citizen.home.storage.length>=citizen.home.storageCapacity-1){const storage=improvementAction(actions,'storage');if(storage)return storage}
  return null
}
