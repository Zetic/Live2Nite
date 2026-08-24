import { workshopApDiscount } from './construction'
import { normalizeItemState } from './items'
import { randomInt } from './rng'
import type { GameState, ItemInstance, ItemState, ItemType, WorkshopRecipeId } from './types'

export type WorkshopCategory='transform'|'dismantle'|'repair'
export interface WorkshopRecipeOutcome { output:ItemType; outputCount:number; weight:number }
export interface WorkshopRecipe {
  id:WorkshopRecipeId
  name:string
  category:WorkshopCategory
  input:ItemType
  inputCount:number
  inputState?:Partial<ItemState>
  output:ItemType
  outputCount:number
  outputState?:ItemState
  preserveInputId?:boolean
  outcomes?:WorkshopRecipeOutcome[]
  apCost:number
}

export const WORKSHOP_RECIPES:Record<WorkshopRecipeId,WorkshopRecipe>={
  logs_to_planks:{id:'logs_to_planks',name:'Cut Rotting Log into a Twisted Plank',category:'transform',input:'rotten_log',inputCount:1,output:'twisted_plank',outputCount:1,apCost:3},
  quality_log_to_planks:{id:'quality_log_to_planks',name:'Cut Quality Log into a Twisted Plank',category:'transform',input:'quality_log',inputCount:1,output:'twisted_plank',outputCount:1,apCost:3},
  scrap_to_iron:{id:'scrap_to_iron',name:'Work Scrap Metal into Wrought Iron',category:'transform',input:'scrap_metal',inputCount:1,output:'wrought_iron',outputCount:1,apCost:3},
  sheet_metal_bits_to_sheet_metal:{id:'sheet_metal_bits_to_sheet_metal',name:'Process Sheet Metal (bits) into Sheet Metal',category:'transform',input:'sheet_metal_bits',inputCount:1,output:'sheet_metal',outputCount:1,apCost:3},
  planks_to_beams:{id:'planks_to_beams',name:'Reinforce Twisted Plank into a Patchwork Beam',category:'transform',input:'twisted_plank',inputCount:1,output:'patchwork_beam',outputCount:1,apCost:3},
  beams_to_planks:{id:'beams_to_planks',name:'Break Patchwork Beam down into a Twisted Plank',category:'transform',input:'patchwork_beam',inputCount:1,output:'twisted_plank',outputCount:1,apCost:3},
  iron_to_supports:{id:'iron_to_supports',name:'Reinforce Wrought Iron into a Metal Support',category:'transform',input:'wrought_iron',inputCount:1,output:'metal_support',outputCount:1,apCost:3},
  supports_to_iron:{id:'supports_to_iron',name:'Break Metal Support down into Wrought Iron',category:'transform',input:'metal_support',inputCount:1,output:'wrought_iron',outputCount:1,apCost:3},
  dismantle_electronic_device:{
    id:'dismantle_electronic_device',name:'Dismantle Broken Electronic Device',category:'dismantle',input:'broken_electronic_device',inputCount:1,output:'electronic_component',outputCount:1,apCost:3,
    // Current MyHordes includes Battery Launcher and Tagger outcomes. Battery Launcher is now active; Tagger remains deferred.
    outcomes:[
      {output:'electronic_component',outputCount:1,weight:23},
      {output:'nuts_and_bolts',outputCount:1,weight:18},
      {output:'battery_launcher',outputCount:1,weight:16},
      {output:'battery',outputCount:1,weight:15},
      {output:'compact_detonator',outputCount:1,weight:14},
    ],
  },
  dismantle_mechanism:{
    id:'dismantle_mechanism',name:'Dismantle Mechanism',category:'dismantle',input:'mechanism',inputCount:1,output:'wrought_iron',outputCount:1,apCost:3,
    outcomes:[
      {output:'wrought_iron',outputCount:1,weight:51},
      {output:'nuts_and_bolts',outputCount:1,weight:32},
      {output:'copper_pipe',outputCount:1,weight:9},
      {output:'scrap_metal',outputCount:1,weight:8},
    ],
  },
  repair_repair_kit:{id:'repair_repair_kit',name:'Restore Damaged Repair Kit',category:'repair',input:'repair_kit',inputCount:1,inputState:{condition:'damaged'},output:'repair_kit',outputCount:1,outputState:{condition:'intact'},preserveInputId:true,apCost:3},
}

export const WORKSHOP_RECIPE_ORDER:WorkshopRecipeId[]=[
  'logs_to_planks','quality_log_to_planks','scrap_to_iron','sheet_metal_bits_to_sheet_metal','planks_to_beams','beams_to_planks','iron_to_supports','supports_to_iron',
  'dismantle_electronic_device','dismantle_mechanism','repair_repair_kit',
]

function matchesState(item:ItemInstance,required:Partial<ItemState>|undefined):boolean{
  if(!required)return true
  const state=normalizeItemState(item.type,item.state)
  return Object.entries(required).every(([key,value])=>state[key as keyof ItemState]===value)
}
export function workshopInputItems(state:GameState,recipeId:WorkshopRecipeId):ItemInstance[]{const recipe=WORKSHOP_RECIPES[recipeId];return state.town.bank.filter((item)=>item.type===recipe.input&&matchesState(item,recipe.inputState))}
export function workshopRecipeStock(state:GameState,recipeId:WorkshopRecipeId):number{return workshopInputItems(state,recipeId).length}
export function workshopRecipeInputItemIds(state:GameState,recipeId:WorkshopRecipeId):string[]{const recipe=WORKSHOP_RECIPES[recipeId];return workshopInputItems(state,recipeId).slice(0,recipe.inputCount).map((item)=>item.id)}
export function carriedHacksawDiscount(state:GameState,citizenId:string|undefined):number{
  if(!citizenId)return 0
  return state.citizens.find((citizen)=>citizen.id===citizenId)?.inventory.some((item)=>item.type==='saw_tool')?1:0
}
export function workshopRecipeApCost(state:GameState,recipeId:WorkshopRecipeId,citizenId?:string):number{return Math.max(1,WORKSHOP_RECIPES[recipeId].apCost-workshopApDiscount(state)-carriedHacksawDiscount(state,citizenId))}
export function canRunWorkshopRecipe(state:GameState,recipeId:WorkshopRecipeId):boolean{const recipe=WORKSHOP_RECIPES[recipeId];return state.town.construction.workshop.completed&&workshopRecipeStock(state,recipeId)>=recipe.inputCount}
export function resolveWorkshopRecipeOutput(rngState:number,recipeId:WorkshopRecipeId):{output:ItemType;outputCount:number;outputState?:ItemState;preserveInputId?:boolean;rngStateAfter?:number}{
  const recipe=WORKSHOP_RECIPES[recipeId]
  if(!recipe.outcomes?.length)return{output:recipe.output,outputCount:recipe.outputCount,outputState:recipe.outputState,preserveInputId:recipe.preserveInputId}
  const total=recipe.outcomes.reduce((sum,outcome)=>sum+outcome.weight,0)
  const roll=randomInt(rngState,1,total)
  let cursor=roll.value
  for(const outcome of recipe.outcomes){cursor-=outcome.weight;if(cursor<=0)return{output:outcome.output,outputCount:outcome.outputCount,rngStateAfter:roll.state}}
  const fallback=recipe.outcomes[recipe.outcomes.length-1]
  return{output:fallback.output,outputCount:fallback.outputCount,rngStateAfter:roll.state}
}
