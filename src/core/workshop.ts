import { bankCount } from './bank'
import { workshopApDiscount } from './construction'
import { randomInt } from './rng'
import type { GameState, ItemType, WorkshopRecipeId } from './types'

export interface WorkshopRecipeOutcome { output:ItemType; outputCount:number; weight:number }
export interface WorkshopRecipe {
  id:WorkshopRecipeId
  name:string
  /** Primary input/output retained for compact UI/event compatibility. */
  input:ItemType
  inputCount:number
  output:ItemType
  outputCount:number
  /** Multi-input recipes override the primary input requirement. */
  inputs?:Partial<Record<ItemType,number>>
  /** Weighted outcomes make unprocessed salvage deterministic from GameState RNG. */
  outcomes?:WorkshopRecipeOutcome[]
  apCost:number
}

export const WORKSHOP_RECIPES:Record<WorkshopRecipeId,WorkshopRecipe>={
  logs_to_planks:{id:'logs_to_planks',name:'Cut Rotting Log into a Twisted Plank',input:'rotten_log',inputCount:1,output:'twisted_plank',outputCount:1,apCost:3},
  scrap_to_iron:{id:'scrap_to_iron',name:'Work Scrap Metal into Wrought Iron',input:'scrap_metal',inputCount:1,output:'wrought_iron',outputCount:1,apCost:3},
  planks_to_beams:{id:'planks_to_beams',name:'Reinforce Twisted Plank into a Patchwork Beam',input:'twisted_plank',inputCount:1,output:'patchwork_beam',outputCount:1,apCost:3},
  beams_to_planks:{id:'beams_to_planks',name:'Break Patchwork Beam down into a Twisted Plank',input:'patchwork_beam',inputCount:1,output:'twisted_plank',outputCount:1,apCost:3},
  iron_to_supports:{id:'iron_to_supports',name:'Reinforce Wrought Iron into a Metal Support',input:'wrought_iron',inputCount:1,output:'metal_support',outputCount:1,apCost:3},
  supports_to_iron:{id:'supports_to_iron',name:'Break Metal Support down into Wrought Iron',input:'metal_support',inputCount:1,output:'wrought_iron',outputCount:1,apCost:3},
  dismantle_electronic_device:{
    id:'dismantle_electronic_device',name:'Dismantle Broken Electronic Device',input:'broken_electronic_device',inputCount:1,output:'electronic_component',outputCount:1,apCost:3,
    // Current MyHordes also has two weapon/equipment outcomes not yet in Live2Nite.
    // The construction-relevant outcomes retain their relative source weights here.
    outcomes:[
      {output:'electronic_component',outputCount:1,weight:23},
      {output:'nuts_and_bolts',outputCount:1,weight:18},
      {output:'battery',outputCount:1,weight:15},
      {output:'compact_detonator',outputCount:1,weight:14},
    ],
  },
  dismantle_mechanism:{
    id:'dismantle_mechanism',name:'Dismantle Mechanism',input:'mechanism',inputCount:1,output:'wrought_iron',outputCount:1,apCost:3,
    outcomes:[
      {output:'wrought_iron',outputCount:1,weight:51},
      {output:'nuts_and_bolts',outputCount:1,weight:32},
      {output:'copper_pipe',outputCount:1,weight:9},
      {output:'scrap_metal',outputCount:1,weight:8},
    ],
  },
  assemble_telescope:{id:'assemble_telescope',name:'Assemble Telescope',input:'convex_lens',inputCount:1,inputs:{convex_lens:1,copper_pipe:1},output:'telescope',outputCount:1,apCost:3},
  repair_human_bone:{id:'repair_human_bone',name:'Repair Human Bone',input:'broken_human_bone',inputCount:1,output:'human_bone',outputCount:1,apCost:3},
  repair_penknife:{id:'repair_penknife',name:'Repair Pathetic Penknife',input:'broken_pathetic_penknife',inputCount:1,output:'pathetic_penknife',outputCount:1,apCost:3},
  repair_staff:{id:'repair_staff',name:'Repair Staff',input:'broken_staff',inputCount:1,output:'staff',outputCount:1,apCost:3},
  repair_serrated_knife:{id:'repair_serrated_knife',name:'Repair Serrated Knife',input:'broken_serrated_knife',inputCount:1,output:'serrated_knife',outputCount:1,apCost:3},
  repair_machete:{id:'repair_machete',name:'Repair Machete',input:'broken_machete',inputCount:1,output:'machete',outputCount:1,apCost:3},
}
export const WORKSHOP_RECIPE_ORDER:WorkshopRecipeId[]=[
  'logs_to_planks','scrap_to_iron','planks_to_beams','beams_to_planks','iron_to_supports','supports_to_iron',
  'dismantle_electronic_device','dismantle_mechanism','assemble_telescope',
  'repair_human_bone','repair_penknife','repair_staff','repair_serrated_knife','repair_machete',
]
export function workshopRecipeInputs(recipeId:WorkshopRecipeId):Partial<Record<ItemType,number>>{const recipe=WORKSHOP_RECIPES[recipeId];return recipe.inputs??{[recipe.input]:recipe.inputCount}}
export function workshopRecipeApCost(state:GameState,recipeId:WorkshopRecipeId):number{return Math.max(1,WORKSHOP_RECIPES[recipeId].apCost-workshopApDiscount(state))}
export function canRunWorkshopRecipe(state:GameState,recipeId:WorkshopRecipeId):boolean{return state.town.construction.workshop.completed&&Object.entries(workshopRecipeInputs(recipeId)).every(([type,count])=>bankCount(state,type as ItemType)>=(count??0))}
export function resolveWorkshopRecipeOutput(rngState:number,recipeId:WorkshopRecipeId):{output:ItemType;outputCount:number;rngStateAfter?:number}{
  const recipe=WORKSHOP_RECIPES[recipeId]
  if(!recipe.outcomes?.length)return{output:recipe.output,outputCount:recipe.outputCount}
  const total=recipe.outcomes.reduce((sum,outcome)=>sum+outcome.weight,0)
  const roll=randomInt(rngState,1,total)
  let cursor=roll.value
  for(const outcome of recipe.outcomes){cursor-=outcome.weight;if(cursor<=0)return{output:outcome.output,outputCount:outcome.outputCount,rngStateAfter:roll.state}}
  const fallback=recipe.outcomes[recipe.outcomes.length-1]
  return{output:fallback.output,outputCount:fallback.outputCount,rngStateAfter:roll.state}
}
