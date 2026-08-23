import { bankCount } from '../../core/bank'
import { workingWeaponTypes } from '../../core/combat'
import type { ConstructionId, GameState, ItemType } from '../../core/types'
import { publicDefenseAssessment, strategicConstructionNeed, type PublicDefenseAssessment } from './TownDefenseStrategy'

export interface TownNeeds {
  livingCitizens:number
  activeProject:ConstructionId|null
  missingConstruction:Partial<Record<ItemType,number>>
  primaryConstructionNeed:ItemType|null
  foodLow:boolean
  weaponsLow:boolean
  waterPerCitizen:number
  defense:PublicDefenseAssessment
}
function townWeaponCount(state:GameState):number{return workingWeaponTypes().reduce((sum,type)=>sum+bankCount(state,type),0)}
export function evaluateTownNeeds(state:GameState):TownNeeds{
  const livingCitizens=state.citizens.filter((citizen)=>citizen.alive).length
  const strategic=strategicConstructionNeed(state);const activeProject=strategic.projectId;const missingConstruction=strategic.missing
  const primaryConstructionNeed=(Object.entries(missingConstruction).sort((a,b)=>(b[1]??0)-(a[1]??0))[0]?.[0] as ItemType|undefined)??null
  return{livingCitizens,activeProject,missingConstruction,primaryConstructionNeed,foodLow:bankCount(state,'food')<Math.max(2,Math.ceil(livingCitizens/8)),weaponsLow:townWeaponCount(state)<Math.max(3,Math.ceil(livingCitizens/8)),waterPerCitizen:livingCitizens>0?state.town.well.water/livingCitizens:0,defense:publicDefenseAssessment(state)}
}
