import { randomInt } from './rng'
import type { ItemType } from './types'

export interface TamerTrapTier {
  minScore:number
  count:number
  pool:readonly TamerTrapAnimal[]
}
export type TamerTrapAnimal=
  | 'giant_rat'
  | 'chicken'
  | 'stinking_pig'
  | 'fat_cat'
  | 'huge_snake'
  | 'furious_kitten_partially_digested'
  | 'mangy_dachshund'
  | 'guard_dog'
export type TamerTrapLureGroup=keyof typeof TAMER_TRAP_BAIT_SCORES
export interface TamerTrapBaitSelection {
  /** Live2Nite item instance consumed from the Town Bank. */
  itemId:string
  /** Source prototype identity; MyHordes requires three distinct prototypes, not merely three instances. */
  prototype:string
  lureGroups:readonly TamerTrapLureGroup[]
  poisoned:boolean
}
export interface TamerTrapResolution {
  score:number
  failed:boolean
  failureRate:number
  outputType:TamerTrapAnimal|typeof TAMER_TRAP_FAILURE_ITEM
  outputCount:number
  rngStateAfter:number
}

export const TAMER_TRAP_PROFESSION_BONUS=5
export const TAMER_TRAP_POISON_PENALTY=-1
export const TAMER_TRAP_BAIT_SCORES={lure1:0,lure2:1,lure3:3,lure4:5,lure5:7} as const
export const TAMER_TRAP_FAILURE_ITEM:ItemType='fistful_of_insects'

const ALL_ANIMALS:readonly TamerTrapAnimal[]=[
  'giant_rat','chicken','stinking_pig','fat_cat','huge_snake','furious_kitten_partially_digested','mangy_dachshund','guard_dog',
]
const SMALL_ANIMALS:readonly TamerTrapAnimal[]=['giant_rat','chicken','stinking_pig','fat_cat']
const LARGE_ANIMALS:readonly TamerTrapAnimal[]=['huge_snake','furious_kitten_partially_digested','mangy_dachshund','guard_dog']

/** Current MyHordes v5.1.2 Tamer's Trap score tiers, represented with Live2Nite item identities. */
export const TAMER_TRAP_TIERS:readonly TamerTrapTier[]=[
  {minScore:0,count:1,pool:ALL_ANIMALS},
  {minScore:6,count:2,pool:ALL_ANIMALS},
  {minScore:10,count:3,pool:SMALL_ANIMALS},
  {minScore:15,count:3,pool:LARGE_ANIMALS},
  {minScore:20,count:4,pool:ALL_ANIMALS},
]

export function tamerTrapTier(score:number):TamerTrapTier{
  const normalized=Number.isFinite(score)?score:0
  let tier=TAMER_TRAP_TIERS[0]
  for(const candidate of TAMER_TRAP_TIERS){if(normalized>=candidate.minScore)tier=candidate;else break}
  return tier
}

/** Failure scales with the town's count of prior successful lure actions. */
export function tamerTrapFailureRate(successfulLures:number):number{
  const successes=Math.max(0,Math.trunc(successfulLures))
  if(successes<=100)return 0
  if(successes<=200)return 13
  if(successes<=300)return 26
  return 39
}

/** Source action accepts exactly three distinct bait prototypes from the Bank. */
export function tamerTrapBaitsValid(baits:readonly TamerTrapBaitSelection[]):boolean{
  return baits.length===3&&new Set(baits.map((bait)=>bait.prototype)).size===3&&new Set(baits.map((bait)=>bait.itemId)).size===3
}

/** Score the selected bait exactly as the current controller does: Tamer +5, poison -1, then each lure-group value. */
export function tamerTrapScore(baits:readonly TamerTrapBaitSelection[],isTamer:boolean):number{
  let score=isTamer?TAMER_TRAP_PROFESSION_BONUS:0
  for(const bait of baits){
    if(bait.poisoned)score+=TAMER_TRAP_POISON_PENALTY
    for(const group of bait.lureGroups)score+=TAMER_TRAP_BAIT_SCORES[group]
  }
  return score
}

export function rollTamerTrapFailure(rngState:number,successfulLures:number):{failed:boolean;rngStateAfter:number;rate:number}{
  const rate=tamerTrapFailureRate(successfulLures)
  if(rate<=0)return{failed:false,rngStateAfter:rngState,rate}
  const roll=randomInt(rngState,1,100)
  return{failed:roll.value<=rate,rngStateAfter:roll.state,rate}
}

export function rollTamerTrapAnimal(rngState:number,score:number):{animal:TamerTrapAnimal;count:number;tier:TamerTrapTier;rngStateAfter:number}{
  const tier=tamerTrapTier(score)
  const roll=randomInt(rngState,0,tier.pool.length-1)
  return{animal:tier.pool[roll.value],count:tier.count,tier,rngStateAfter:roll.state}
}

/** Pure deterministic resolution used by the eventual command/event integration. Bait removal and Bank insertion stay outside this function. */
export function resolveTamerTrap(rngState:number,successfulLures:number,baits:readonly TamerTrapBaitSelection[],isTamer:boolean):TamerTrapResolution{
  if(!tamerTrapBaitsValid(baits))throw new Error("Tamer's Trap requires exactly three distinct bait prototypes")
  const score=tamerTrapScore(baits,isTamer)
  const failure=rollTamerTrapFailure(rngState,successfulLures)
  if(failure.failed)return{score,failed:true,failureRate:failure.rate,outputType:TAMER_TRAP_FAILURE_ITEM,outputCount:1,rngStateAfter:failure.rngStateAfter}
  const animal=rollTamerTrapAnimal(failure.rngStateAfter,score)
  return{score,failed:false,failureRate:failure.rate,outputType:animal.animal,outputCount:animal.count,rngStateAfter:animal.rngStateAfter}
}
