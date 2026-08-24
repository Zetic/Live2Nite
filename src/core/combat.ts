import { normalizeItemState } from './items'
import { randomInt } from './rng'
import type { GameState, ItemInstance, ItemType } from './types'

export const BAREHANDED_AP_COST=1
export const BAREHANDED_KILL_CHANCE_PERCENT=10

export interface WeaponDefinition {
  itemType:ItemType
  minKills:number
  maxKills:number
  killChancePercent:number
  consumesOnUse:boolean
  usesCharges?:boolean
  breakChancePercent?:number
  brokenType?:ItemType
  apCost:number
  requiresPositiveAp:boolean
  confidence:'confirmed'|'approximate'
}

export const WEAPONS:Partial<Record<ItemType,WeaponDefinition>>={
  water_bomb:{itemType:'water_bomb',minKills:1,maxKills:5,killChancePercent:100,consumesOnUse:true,apCost:0,requiresPositiveAp:true,confidence:'confirmed'},
  water_pistol:{itemType:'water_pistol',minKills:1,maxKills:1,killChancePercent:100,consumesOnUse:false,usesCharges:true,apCost:0,requiresPositiveAp:true,confidence:'approximate'},
  battery_launcher:{itemType:'battery_launcher',minKills:1,maxKills:1,killChancePercent:100,consumesOnUse:false,usesCharges:true,apCost:0,requiresPositiveAp:true,confidence:'approximate'},
  claymore:{itemType:'claymore',minKills:2,maxKills:5,killChancePercent:100,consumesOnUse:true,apCost:0,requiresPositiveAp:true,confidence:'approximate'},

  // Current MyHordes throw_b_* actions. Source break/kill groups are exact where unambiguous.
  human_bone:{itemType:'human_bone',minKills:1,maxKills:1,killChancePercent:100,consumesOnUse:false,breakChancePercent:80,brokenType:'broken_human_bone',apCost:0,requiresPositiveAp:true,confidence:'confirmed'},
  pathetic_penknife:{itemType:'pathetic_penknife',minKills:1,maxKills:1,killChancePercent:15,consumesOnUse:false,breakChancePercent:45,brokenType:'broken_pathetic_penknife',apCost:0,requiresPositiveAp:true,confidence:'confirmed'},
  // The generated 5.1.1 staff break group has inconsistent weights (60/60), so retain the adapted break value pending current-source audit.
  staff:{itemType:'staff',minKills:1,maxKills:1,killChancePercent:40,consumesOnUse:false,breakChancePercent:40,brokenType:'broken_staff',apCost:0,requiresPositiveAp:true,confidence:'approximate'},
  serrated_knife:{itemType:'serrated_knife',minKills:1,maxKills:1,killChancePercent:100,consumesOnUse:false,breakChancePercent:33,brokenType:'broken_serrated_knife',apCost:0,requiresPositiveAp:true,confidence:'confirmed'},
  machete:{itemType:'machete',minKills:2,maxKills:2,killChancePercent:100,consumesOnUse:false,breakChancePercent:25,brokenType:'broken_machete',apCost:0,requiresPositiveAp:true,confidence:'confirmed'},
  adjustable_spanner:{itemType:'adjustable_spanner',minKills:1,maxKills:1,killChancePercent:33,consumesOnUse:false,breakChancePercent:20,brokenType:'broken_adjustable_spanner',apCost:0,requiresPositiveAp:true,confidence:'confirmed'},
  screwdriver:{itemType:'screwdriver',minKills:1,maxKills:1,killChancePercent:20,consumesOnUse:false,breakChancePercent:40,brokenType:'broken_screwdriver',apCost:0,requiresPositiveAp:true,confidence:'confirmed'},
  swiss_army_knife:{itemType:'swiss_army_knife',minKills:1,maxKills:1,killChancePercent:15,consumesOnUse:false,breakChancePercent:50,brokenType:'broken_swiss_army_knife',apCost:0,requiresPositiveAp:true,confidence:'confirmed'},
  box_cutter:{itemType:'box_cutter',minKills:1,maxKills:1,killChancePercent:60,consumesOnUse:false,breakChancePercent:70,brokenType:'broken_box_cutter',apCost:0,requiresPositiveAp:true,confidence:'confirmed'},
  chain:{itemType:'chain',minKills:1,maxKills:1,killChancePercent:50,consumesOnUse:false,breakChancePercent:25,brokenType:'broken_chain',apCost:0,requiresPositiveAp:true,confidence:'confirmed'},
  can_opener:{itemType:'can_opener',minKills:1,maxKills:1,killChancePercent:50,consumesOnUse:false,breakChancePercent:100,brokenType:'broken_can_opener',apCost:0,requiresPositiveAp:true,confidence:'confirmed'},
  ektorp_gluten_chair:{itemType:'ektorp_gluten_chair',minKills:1,maxKills:1,killChancePercent:50,consumesOnUse:false,breakChancePercent:50,brokenType:'broken_ektorp_gluten_chair',apCost:0,requiresPositiveAp:true,confidence:'confirmed'},
  pc_base_unit:{itemType:'pc_base_unit',minKills:1,maxKills:1,killChancePercent:100,consumesOnUse:false,breakChancePercent:50,brokenType:'broken_pc_base_unit',apCost:0,requiresPositiveAp:true,confidence:'confirmed'},
}

export function weaponDefinition(type:ItemType):WeaponDefinition|null{return WEAPONS[type]??null}
export function isWeapon(type:ItemType):boolean{return Boolean(weaponDefinition(type))}
export function workingWeaponTypes():ItemType[]{return Object.keys(WEAPONS) as ItemType[]}

export function resolveBarehandedAttack(state:Pick<GameState,'rngState'>):{kills:number;rngStateAfter:number}{const roll=randomInt(state.rngState,1,100);return{kills:roll.value<=BAREHANDED_KILL_CHANCE_PERCENT?1:0,rngStateAfter:roll.state}}

export function resolveWeaponAttack(state:Pick<GameState,'rngState'>,item:ItemInstance,zombiesPresent:number):{kills:number;consumed:boolean;brokenInto?:ItemType;chargesAfter?:number;rngStateAfter:number}{
  const definition=weaponDefinition(item.type)
  if(!definition)throw new Error(`${item.type} is not a weapon`)
  const currentCharges=definition.usesCharges?(normalizeItemState(item.type,item.state).charges??0):undefined
  if(definition.usesCharges&&(!currentCharges||currentCharges<=0))throw new Error(`${item.type} is empty`)
  let next=state.rngState
  const killRoll=randomInt(next,1,100);next=killRoll.state;let kills=0
  if(killRoll.value<=definition.killChancePercent){const amount=randomInt(next,definition.minKills,definition.maxKills);next=amount.state;kills=Math.min(zombiesPresent,amount.value)}
  let brokenInto:ItemType|undefined
  if(!definition.consumesOnUse&&definition.breakChancePercent&&definition.brokenType){const breakRoll=randomInt(next,1,100);next=breakRoll.state;if(breakRoll.value<=definition.breakChancePercent)brokenInto=definition.brokenType}
  return{kills,consumed:definition.consumesOnUse,brokenInto,chargesAfter:currentCharges===undefined?undefined:Math.max(0,currentCharges-1),rngStateAfter:next}
}