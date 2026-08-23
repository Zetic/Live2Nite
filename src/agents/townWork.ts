import { CONSTRUCTIONS, missingMaterials } from '../core/construction'
import { nextHomeDefinition, personalMaterialCount } from '../core/home'
import type { Citizen, ConstructionId, GameCommand, GameState, HomeImprovementId, ItemType } from '../core/types'
import { publicDefenseAssessment, strategicConstructionNeed, strategicConstructionScore } from './planning/TownDefenseStrategy'

function constructionActions(actions:GameCommand[]):Array<Extract<GameCommand,{type:'CONTRIBUTE_CONSTRUCTION'}>>{
  return actions.filter((action):action is Extract<GameCommand,{type:'CONTRIBUTE_CONSTRUCTION'}>=>action.type==='CONTRIBUTE_CONSTRUCTION')
}
function recipeAction(actions: GameCommand[], recipeId: 'logs_to_planks' | 'scrap_to_iron'): GameCommand | null {return actions.find((action)=>action.type==='WORKSHOP_CONVERT'&&action.recipeId===recipeId)??null}
function homeUpgradeAction(actions: GameCommand[]): GameCommand | null {return actions.find((action)=>action.type==='UPGRADE_HOME')??null}
function improvementAction(actions:GameCommand[],id:HomeImprovementId):GameCommand|null{return actions.find((action)=>action.type==='BUILD_HOME_IMPROVEMENT'&&action.improvementId===id)??null}
function withdrawAction(actions:GameCommand[],type:ItemType):GameCommand|null{return actions.find((action)=>action.type==='WITHDRAW_BANK_ITEM'&&action.itemType===type)??null}

function communalReserve(state:GameState,type:ItemType):number{
  const {projectId}=strategicConstructionNeed(state)
  if(!projectId||state.town.construction[projectId]?.completed)return 0
  return CONSTRUCTIONS[projectId].resources[type]??0
}

function homeMaterialWithdrawal(state:GameState,citizen:Citizen,actions:GameCommand[]):GameCommand|null{
  const target=nextHomeDefinition(citizen.home.level)
  if(!target||citizen.home.upgradedDay===state.day||target.apCost>citizen.maxAp)return null
  for(const[type,required]of Object.entries(target.resources)){
    const itemType=type as ItemType
    const missing=Math.max(0,(required??0)-personalMaterialCount(citizen,itemType))
    if(missing<=0)continue
    const bank=state.town.bank[itemType]??0
    if(bank<=communalReserve(state,itemType))continue
    const action=withdrawAction(actions,itemType)
    if(action)return action
  }
  return null
}

export function chooseTownWork(state: GameState, citizen: Citizen, actions: GameCommand[]): GameCommand | null {
  if (citizen.location.type !== 'town') return null
  const assessment=publicDefenseAssessment(state)

  // Construction remains communal work, but the choice now responds to public defense risk.
  const builds=constructionActions(actions)
    .sort((left,right)=>strategicConstructionScore(state,right.projectId)-strategicConstructionScore(state,left.projectId))
  if(builds[0])return builds[0]

  // Refine feedstock for projects citizens have already begun rather than abandoning invested AP.
  const inProgress=(Object.entries(state.town.construction) as Array<[ConstructionId,GameState['town']['construction'][ConstructionId]]>)
    .filter(([,project])=>!project.completed&&project.apContributed>0)
    .sort(([leftId,left],[rightId,right])=>strategicConstructionScore(state,rightId)-strategicConstructionScore(state,leftId)||right.apContributed-left.apContributed)
  for(const[projectId]of inProgress){
    const missing=missingMaterials(state,projectId)
    if((missing.twisted_plank??0)>0){const action=recipeAction(actions,'logs_to_planks');if(action)return action}
    if((missing.wrought_iron??0)>0){const action=recipeAction(actions,'scrap_to_iron');if(action)return action}
  }

  const defenseUrgent=assessment.pressure==='critical'||assessment.pressure==='shortfall'
  const personalUpgrade=homeUpgradeAction(actions)
  if(personalUpgrade&&(defenseUrgent||state.clock.hour>=20))return personalUpgrade

  // If personal defense is urgently needed, a citizen may take a material from the shared
  // Bank only when it is surplus to the current communal strategic project. This is an
  // individual decision using public inventory information, not a hidden town allocation.
  if(defenseUrgent){const withdraw=homeMaterialWithdrawal(state,citizen,actions);if(withdraw)return withdraw}

  if(defenseUrgent||state.clock.hour>=20){
    const fence=improvementAction(actions,'fence');if(fence)return fence
    const reinforcement=improvementAction(actions,'reinforcements');if(reinforcement)return reinforcement
  }
  if(state.clock.hour>=20&&citizen.home.storage.length>=citizen.home.storageCapacity-1){const storage=improvementAction(actions,'storage');if(storage)return storage}
  return null
}
