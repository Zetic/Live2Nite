import { CONSTRUCTIONS, constructionFlatDefenseForProject, constructionPriority, prioritizedConstruction } from '../../core/construction'
import { totalTownDefense } from '../../core/defense'
import { watchtowerEstimate } from '../../core/night'
import type { ConstructionId, GameState, ItemType } from '../../core/types'

export type DefensePressure = 'comfortable' | 'uncertain' | 'shortfall' | 'critical'
export type DefenseKnowledgeSource = 'watchtower' | 'history' | 'none'

export interface PublicDefenseAssessment {
  source: DefenseKnowledgeSource
  expectedMin: number | null
  expectedMax: number | null
  townDefense: number
  marginLow: number | null
  marginHigh: number | null
  pressure: DefensePressure
  reason: string
}

function pressureFor(defense:number,min:number|null,max:number|null,gateOpen:boolean):DefensePressure{
  if(gateOpen)return'critical'
  if(min===null||max===null)return'uncertain'
  if(defense>=max)return'comfortable'
  if(defense<min){const gap=min-defense;return gap>=25||defense<min*0.8?'critical':'shortfall'}
  return'uncertain'
}

/**
 * Public town threat model. It intentionally never calls attackStrengthForDay and therefore
 * cannot know tonight's deterministic horde value. Watchtower ranges are used when available;
 * otherwise citizens extrapolate conservatively from the previous public Night Report.
 */
export function publicDefenseAssessment(state:GameState):PublicDefenseAssessment{
  const townDefense=totalTownDefense(state)
  const tower=watchtowerEstimate(state)
  if(tower){
    const pressure=pressureFor(townDefense,tower.min,tower.max,state.town.gateOpen)
    return{
      source:'watchtower',expectedMin:tower.min,expectedMax:tower.max,townDefense,
      marginLow:townDefense-tower.min,marginHigh:townDefense-tower.max,pressure,
      reason:state.town.gateOpen?'The gate is open, so shared defense will not apply.':pressure==='comfortable'?'Current defense covers the full Watchtower estimate.':pressure==='critical'?'Current defense is below the Watchtower minimum by a dangerous margin.':pressure==='shortfall'?'Current defense is below the Watchtower minimum.':'Current defense covers part, but not all, of the Watchtower estimate.',
    }
  }
  if(state.lastNight){
    // LIVE2NITE_ADAPTATION: without a Watchtower, bots use the public previous attack as a
    // conservative planning anchor rather than reading the current hidden attack roll.
    const expectedMin=Math.max(1,state.lastNight.attackStrength)
    const expectedMax=Math.max(expectedMin,Math.ceil(expectedMin*1.35))
    const pressure=pressureFor(townDefense,expectedMin,expectedMax,state.town.gateOpen)
    return{
      source:'history',expectedMin,expectedMax,townDefense,
      marginLow:townDefense-expectedMin,marginHigh:townDefense-expectedMax,pressure,
      reason:state.town.gateOpen?'The gate is open, so shared defense will not apply.':pressure==='comfortable'?'Defense exceeds the conservative range inferred from last night.':pressure==='critical'?'Defense is dangerously below the previous attack level.':pressure==='shortfall'?'Defense is below the previous attack level.':'Without a Watchtower, citizens are planning from last night and cannot be sure the town is safe.',
    }
  }
  return{source:'none',expectedMin:null,expectedMax:null,townDefense,marginLow:null,marginHigh:null,pressure:state.town.gateOpen?'critical':'uncertain',reason:state.town.gateOpen?'The gate is open, so shared defense will not apply.':'No Watchtower estimate or previous attack exists yet; tonight remains uncertain.'}
}

function defensiveUtility(projectId:ConstructionId):boolean{
  return CONSTRUCTIONS[projectId].effects.some((effect)=>['town_defense_flat','town_defense_multiplier','bank_defense_multiplier','home_defense_flat','home_contribution_ratio','defense_per_dead_citizen','gate_lock_hour','gate_auto_close_hour'].includes(effect.type))
}

export function strategicConstructionScore(state:GameState,projectId:ConstructionId):number{
  let score=constructionPriority(state,projectId)
  if(score<0)return score
  const assessment=publicDefenseAssessment(state)
  const definition=CONSTRUCTIONS[projectId]
  const flat=constructionFlatDefenseForProject(projectId)
  const defensive=defensiveUtility(projectId)

  if(projectId==='watchtower'&&assessment.source!=='watchtower')score+=assessment.source==='none'?240:150
  if(defensive){
    if(assessment.pressure==='critical')score+=flat*2.3+150
    else if(assessment.pressure==='shortfall')score+=flat*1.6+100
    else if(assessment.pressure==='uncertain')score+=flat*0.7+35
    else score+=flat*0.2
  }
  if(definition.expiresAfterAttack){
    if((assessment.pressure==='critical'||assessment.pressure==='shortfall')&&state.clock.hour>=14)score+=140
    else if(assessment.pressure==='comfortable')score-=60
  }
  if(definition.effects.some((effect)=>effect.type==='gate_auto_close_hour'||effect.type==='gate_lock_hour')&&assessment.pressure!=='comfortable')score+=60
  return score
}

export function strategicConstructionProjects(state:GameState):ConstructionId[]{
  return [...prioritizedConstruction(state)].sort((left,right)=>strategicConstructionScore(state,right)-strategicConstructionScore(state,left))
}

export function strategicConstructionNeed(state:GameState):{projectId:ConstructionId|null;missing:Partial<Record<ItemType,number>>}{
  const projectId=strategicConstructionProjects(state)[0]??null
  if(!projectId)return{projectId:null,missing:{}}
  const missing:Partial<Record<ItemType,number>>={}
  for(const[type,required]of Object.entries(CONSTRUCTIONS[projectId].resources)){
    const itemType=type as ItemType
    const amount=Math.max(0,(required??0)-(state.town.bank[itemType]??0))
    if(amount>0)missing[itemType]=amount
  }
  return{projectId,missing}
}
