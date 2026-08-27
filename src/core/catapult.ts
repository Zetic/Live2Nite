import { itemName, createItemInstance } from './items'
import { randomInt } from './rng'
import type { Citizen, GameState, ItemInstance, ItemType, WorldZone } from './types'
import { zoneKey } from './world'

export type CatapultLandingResult='intact'|'broken'|'debris'|'scrap'|'moldy'|'destroyed'
export type CatapultBlastShape='zone'|'cross'|'square3x3'
export type CatapultDamageTier='ridiculous'|'low'|'high'|'important'

export interface CatapultPayloadProfile {
  landing:CatapultLandingResult
  brokenInto?:ItemType
  damage?:CatapultDamageTier
  shape?:CatapultBlastShape
  requiresSmallTrebuchet?:boolean
}
export interface CatapultLogEntry {
  day:number
  hour:number
  citizenId:string
  itemType:ItemType
  intended:{x:number;y:number}
  landed:{x:number;y:number}
  missed:boolean
  kills:number
  landing:CatapultLandingResult
}
export interface CatapultFireResult { state:GameState; log:CatapultLogEntry }

declare module './types' { interface TownState { catapultLog?:CatapultLogEntry[] } }

const SAFE_PAYLOADS:ReadonlySet<ItemType>=new Set([
  'water_ration','rotten_log','scrap_metal','twisted_plank','wrought_iron','battery','bandage','anabolic_steroids','pharmaceutical_products','water_purifying_tablets','duct_tape','copper_pipe','wire_reel','electronic_component','nuts_and_bolts','empty_oil_can','groundsheet','smelly_meat','telescope','repair_kit','semtex',
])
const MOLDY_PAYLOADS:ReadonlySet<ItemType>=new Set([
  'food','vegetable','blue_apple','meaty_bone','tasty_looking_steak','spicy_chinese_noodles','good_home_made_meal','dubious_home_made_meal',
])
const IMPACT_PAYLOADS:Readonly<Partial<Record<ItemType,CatapultPayloadProfile>>>={
  old_door:{landing:'debris',damage:'low',shape:'cross'},
  table:{landing:'debris',damage:'low',shape:'cross'},
  trestle:{landing:'debris',damage:'low',shape:'cross'},
  engine:{landing:'scrap',damage:'low',shape:'cross'},
  patchwork_beam:{landing:'debris',damage:'ridiculous',shape:'zone'},
  metal_support:{landing:'debris',damage:'ridiculous',shape:'zone'},
  unshaped_concrete_block:{landing:'destroyed',damage:'ridiculous',shape:'zone'},
  human_bone:{landing:'broken',brokenInto:'broken_human_bone',damage:'ridiculous',shape:'zone'},
  machete:{landing:'broken',brokenInto:'broken_machete',damage:'low',shape:'zone'},
  adjustable_spanner:{landing:'broken',brokenInto:'broken_adjustable_spanner',damage:'ridiculous',shape:'zone'},
  swiss_army_knife:{landing:'broken',brokenInto:'broken_swiss_army_knife',damage:'ridiculous',shape:'zone'},
  box_cutter:{landing:'broken',brokenInto:'broken_box_cutter',damage:'ridiculous',shape:'zone'},
  can_opener:{landing:'broken',brokenInto:'broken_can_opener',damage:'ridiculous',shape:'zone'},
  pc_base_unit:{landing:'broken',brokenInto:'broken_pc_base_unit',damage:'low',shape:'cross'},
  ektorp_gluten_chair:{landing:'destroyed',damage:'ridiculous',shape:'zone'},
  exploding_grapefruit:{landing:'destroyed',damage:'high',shape:'square3x3'},
  claymore:{landing:'destroyed',damage:'important',shape:'square3x3'},
  chicken:{landing:'destroyed',damage:'ridiculous',shape:'zone',requiresSmallTrebuchet:true},
}
const DAMAGE_RANGES:Readonly<Record<CatapultDamageTier,readonly [number,number]>>={
  ridiculous:[0,3],low:[4,10],high:[11,20],important:[21,30],
}

export function catapultProfile(type:ItemType):CatapultPayloadProfile|null{
  const impact=IMPACT_PAYLOADS[type]
  if(impact)return impact
  if(SAFE_PAYLOADS.has(type))return{landing:'intact'}
  if(MOLDY_PAYLOADS.has(type))return{landing:'moldy'}
  return null
}
export function catapultEligibleItems(citizen:Citizen):ItemInstance[]{return citizen.inventory.filter((item)=>catapultProfile(item.type)!==null)}
export function catapultActionCost(state:GameState):number{return state.town.construction.upgraded_catapult?.completed?2:4}
export function catapultMissChancePercent(state:GameState):number{return state.town.construction.upgraded_catapult?.completed?5:25}
export function provisionalCatapultOperator(state:GameState):Citizen|null{
  // Current MyHordes elects the Catapultist. Live2Nite does not yet have town-role voting, so the
  // human-controlled citizen is the explicit provisional operator until that governance system lands.
  return state.citizens.find((citizen)=>citizen.controller==='human'&&citizen.alive)??null
}
export function canUseCatapult(state:GameState,citizenId:string):boolean{
  const citizen=state.citizens.find((candidate)=>candidate.id===citizenId)
  const operator=provisionalCatapultOperator(state)
  return Boolean(citizen&&operator?.id===citizen.id&&citizen.alive&&citizen.location.type==='town'&&state.clock.phase==='day'&&state.town.construction.catapult?.completed&&citizen.ap>=catapultActionCost(state))
}
function adjacentCardinalZones(state:GameState,x:number,y:number):WorldZone[]{
  return [[x,y+1],[x+1,y],[x,y-1],[x-1,y]].map(([cx,cy])=>state.world.zones[zoneKey(cx,cy)]).filter((zone):zone is WorldZone=>Boolean(zone))
}
function blastZones(state:GameState,x:number,y:number,shape:CatapultBlastShape):WorldZone[]{
  if(shape==='zone'){const zone=state.world.zones[zoneKey(x,y)];return zone?[zone]:[]}
  if(shape==='cross')return [[x,y],[x,y+1],[x+1,y],[x,y-1],[x-1,y]].map(([cx,cy])=>state.world.zones[zoneKey(cx,cy)]).filter((zone):zone is WorldZone=>Boolean(zone))
  const zones:WorldZone[]=[]
  for(let dy=-1;dy<=1;dy+=1)for(let dx=-1;dx<=1;dx+=1){const zone=state.world.zones[zoneKey(x+dx,y+dy)];if(zone)zones.push(zone)}
  return zones
}
function resolveKills(state:GameState,profile:CatapultPayloadProfile,x:number,y:number,rngState:number):{zones:WorldZone[];kills:number;rngState:number}{
  if(!profile.damage)return{zones:[],kills:0,rngState}
  const zones=blastZones(state,x,y,profile.shape??'zone')
  const [min,max]=DAMAGE_RANGES[profile.damage]
  const roll=randomInt(rngState,min,max)
  const total=Math.min(roll.value,zones.reduce((sum,zone)=>sum+zone.zombies,0))
  return{zones,kills:total,rngState:roll.state}
}
function distributeKills(zones:WorldZone[],kills:number):Map<string,number>{
  const result=new Map<string,number>();let left=kills
  for(const zone of zones){if(left<=0)break;const amount=Math.min(zone.zombies,left);if(amount>0){result.set(zoneKey(zone.x,zone.y),amount);left-=amount}}
  return result
}
function landingItem(item:ItemInstance,profile:CatapultPayloadProfile):ItemInstance|null{
  if(profile.landing==='destroyed')return null
  if(profile.landing==='intact')return item
  if(profile.landing==='broken'&&profile.brokenInto)return createItemInstance(item.id,profile.brokenInto)
  if(profile.landing==='scrap')return createItemInstance(item.id,'scrap_metal')
  if(profile.landing==='moldy')return createItemInstance(item.id,'food')
  if(profile.landing==='debris')return createItemInstance(item.id,'scrap_metal')
  return null
}
export function fireCatapult(state:GameState,citizenId:string,itemId:string,targetX:number,targetY:number):CatapultFireResult{
  const citizen=state.citizens.find((candidate)=>candidate.id===citizenId)
  if(!citizen||!canUseCatapult(state,citizenId))throw new Error('Catapult requirements are not satisfied')
  if(targetX===0&&targetY===0)throw new Error('The Catapult cannot target the town')
  const intended=state.world.zones[zoneKey(targetX,targetY)]
  if(!intended)throw new Error('Target zone does not exist')
  const item=citizen.inventory.find((candidate)=>candidate.id===itemId)
  if(!item)throw new Error('The Catapult payload must be carried by the operator')
  const profile=catapultProfile(item.type)
  if(!profile)throw new Error(`${itemName(item.type)} is not a verified Catapult payload`)
  if(profile.requiresSmallTrebuchet&&!state.town.construction.small_trebuchet?.completed)throw new Error('Small Trebuchet is required to launch animals')

  const cost=catapultActionCost(state)
  const missRoll=randomInt(state.rngState,1,100)
  let rngState=missRoll.state
  let landed=intended
  const missed=missRoll.value<=catapultMissChancePercent(state)
  if(missed){const alternatives=adjacentCardinalZones(state,targetX,targetY);if(alternatives.length){const pick=randomInt(rngState,0,alternatives.length-1);rngState=pick.state;landed=alternatives[pick.value]}}

  const killResult=resolveKills(state,profile,landed.x,landed.y,rngState);rngState=killResult.rngState
  const killedByZone=distributeKills(killResult.zones,killResult.kills)
  const output=landingItem(item,profile)
  const landingKey=zoneKey(landed.x,landed.y)
  const zones={...state.world.zones}
  for(const [key,kills] of killedByZone){const zone=zones[key];zones[key]={...zone,zombies:Math.max(0,zone.zombies-kills)}}
  const landingZone=zones[landingKey]
  zones[landingKey]={...landingZone,groundItems:output?[...landingZone.groundItems,output]:landingZone.groundItems}
  const log:CatapultLogEntry={day:state.day,hour:state.clock.hour,citizenId,itemType:item.type,intended:{x:targetX,y:targetY},landed:{x:landed.x,y:landed.y},missed,kills:killResult.kills,landing:profile.landing}
  return{state:{...state,rngState,citizens:state.citizens.map((candidate)=>candidate.id===citizen.id?{...candidate,ap:candidate.ap-cost,inventory:candidate.inventory.filter((carried)=>carried.id!==item.id)}:candidate),town:{...state.town,catapultLog:[...(state.town.catapultLog??[]),log]},world:{...state.world,zones}},log}
}
