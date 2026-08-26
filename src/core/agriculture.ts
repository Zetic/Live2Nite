import { randomInt } from './rng'
import type { GameEvent, GameState, ItemType } from './types'

export interface AgricultureProduction{projectId:'vegetable_plot'|'grapeboom'|'outer_world_apple_tree';itemType:ItemType;amount:number}

/**
 * Source-documented V4/MyHordes agriculture ranges used by the current construction family:
 * Vegetable Plot: 4–7 ordinary foods + 0–2 higher-value foods/day.
 * Fertilizer: 6–8 ordinary + 3–5 higher-value foods/day.
 * Grapeboom: 3–7 explosive grapefruits/day.
 * Apple Tree: 3–5 high-value blue apples after each attack.
 *
 * The source notes Fertilizer also improves grapefruit production but does not expose a separate
 * numeric grapefruit range in the documentation used for this pass; Grapeboom therefore keeps its
 * verified 3–7 output rather than inventing an additional multiplier.
 */
export function agricultureProduction(state:GameState):{outputs:AgricultureProduction[];rngStateAfter:number}{
  const outputs:AgricultureProduction[]=[]
  let rng=state.rngState
  if(state.town.construction.vegetable_plot?.completed){
    const fertilized=state.town.construction.fertilizer?.completed===true
    const ordinary=randomInt(rng,fertilized?6:4,fertilized?8:7);rng=ordinary.state
    const rich=randomInt(rng,fertilized?3:0,fertilized?5:2);rng=rich.state
    outputs.push({projectId:'vegetable_plot',itemType:'vegetable',amount:ordinary.value})
    if(rich.value>0)outputs.push({projectId:'vegetable_plot',itemType:'blue_apple',amount:rich.value})
  }
  if(state.town.construction.grapeboom?.completed){const roll=randomInt(rng,3,7);rng=roll.state;outputs.push({projectId:'grapeboom',itemType:'exploding_grapefruit',amount:roll.value})}
  if(state.town.construction.outer_world_apple_tree?.completed){const roll=randomInt(rng,3,5);rng=roll.state;outputs.push({projectId:'outer_world_apple_tree',itemType:'blue_apple',amount:roll.value})}
  return{outputs,rngStateAfter:rng}
}

export function agricultureOutputEvents(state:GameState):GameEvent[]{
  return agricultureProduction(state).outputs.map((output)=>({type:'CONSTRUCTION_GENERATED_ITEM',day:state.day,hour:0,projectId:output.projectId,itemType:output.itemType,amount:output.amount}))
}
