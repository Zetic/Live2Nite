import { randomInt } from './rng'
import type { GameEvent, GameState, ItemType } from './types'

export interface AgricultureProduction{projectId:'vegetable_plot'|'grapeboom'|'outer_world_apple_tree';itemType:ItemType;amount:number}

function agricultureSeed(state:GameState):number{
  const mixed=((state.seed>>>0)^Math.imul(state.day+1,0x9e3779b1)^0x64a7c35d)>>>0
  return mixed||1
}

/**
 * Source-documented V4/MyHordes agriculture ranges used by the current construction family:
 * Vegetable Plot: 4–7 ordinary foods + 0–2 higher-value foods/day.
 * Fertilizer: 6–8 ordinary + 3–5 higher-value foods/day.
 * Grapeboom: 3–7 explosive grapefruits/day.
 * Apple Tree: 3–5 high-value blue apples after each attack.
 *
 * Production uses an isolated seed based on game seed + day so adding agriculture does not
 * perturb combat, camping, scavenging, or any other global RNG sequence.
 * The source notes Fertilizer also improves grapefruit production but does not expose a separate
 * numeric grapefruit range in the documentation used for this pass; Grapeboom therefore keeps its
 * verified 3–7 output rather than inventing an additional multiplier.
 */
export function agricultureProduction(state:GameState):AgricultureProduction[]{
  const outputs:AgricultureProduction[]=[]
  let rng=agricultureSeed(state)
  if(state.town.construction.vegetable_plot?.completed){
    const fertilized=state.town.construction.fertilizer?.completed===true
    const ordinary=randomInt(rng,fertilized?6:4,fertilized?8:7);rng=ordinary.state
    const rich=randomInt(rng,fertilized?3:0,fertilized?5:2);rng=rich.state
    outputs.push({projectId:'vegetable_plot',itemType:'vegetable',amount:ordinary.value})
    if(rich.value>0)outputs.push({projectId:'vegetable_plot',itemType:'blue_apple',amount:rich.value})
  }
  if(state.town.construction.grapeboom?.completed){const roll=randomInt(rng,3,7);rng=roll.state;outputs.push({projectId:'grapeboom',itemType:'exploding_grapefruit',amount:roll.value})}
  if(state.town.construction.outer_world_apple_tree?.completed){const roll=randomInt(rng,3,5);outputs.push({projectId:'outer_world_apple_tree',itemType:'blue_apple',amount:roll.value})}
  return outputs
}

export function agricultureOutputEvents(state:GameState):GameEvent[]{
  return agricultureProduction(state).map((output)=>({type:'CONSTRUCTION_GENERATED_ITEM',day:state.day,hour:0,projectId:output.projectId,itemType:output.itemType,amount:output.amount}))
}
