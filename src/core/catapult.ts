import { createItemInstance, itemName, normalizeItemState } from './items'
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

/** Current MyHordes payload classes mapped only where Live2Nite has the corresponding runtime identity. */
const SAFE_PAYLOADS:ReadonlySet<ItemType>=new Set([
  'water_ration','rotten_log','scrap_metal','twisted_plank','wrought_iron','battery','bandage','anabolic_steroids','pharmaceutical_products','water_purifying_tablets','duct_tape','copper_pipe','wire_reel','electronic_component','nuts_and_bolts','empty_oil_can','groundsheet','smelly_meat','repair_kit','semtex','belt','compact_detonator','laser_diode','full_jerrycan','battery_launcher','water_pistol','chinese_noodles',
])
const MOLDY_PAYLOADS:ReadonlySet<ItemType>=new Set([
  'food','vegetable','blue_apple','meaty_bone','tasty_looking_steak','spicy_chinese_noodles','good_home_made_meal','dubious_home_made_meal','human_flesh',
])
const IMPACT_PAYLOADS:Readonly<Partial<Record<ItemType,CatapultPayloadProfile>>>={
  // Resource/furniture impact transformations without zombie damage.
  mechanism:{landing:'scrap'},
  radio_cassette_player_off:{landing:'scrap'},
  telescope:{landing:'scrap'},
  convex_lens:{landing:'debris'},
  working_radio:{landing:'debris'},
  staff:{landing:'broken',brokenInto:'broken_staff'},

  // Single-zone impact weapons.
  quality_log:{landing:'destroyed',damage:'low',shape:'zone'},
  unshaped_concrete_block:{landing:'destroyed',damage:'ridiculous',shape:'zone'},
  patchwork_beam:{landing:'debris',damage:'ridiculous',shape:'zone'},
  metal_support:{landing:'debris',damage:'ridiculous',shape:'zone'},
  human_bone:{landing:'broken',brokenInto:'broken_human_bone',damage:'ridiculous',shape:'zone'},
  pathetic_penknife:{landing:'broken',brokenInto:'broken_pathetic_penknife',damage:'ridiculous',shape:'zone'},
  serrated_knife:{landing:'broken',brokenInto:'broken_serrated_knife',damage:'ridiculous',shape:'zone'},
  machete:{landing:'broken',brokenInto:'broken_machete',damage:'low',shape:'zone'},
  adjustable_spanner:{landing:'broken',brokenInto:'broken_adjustable_spanner',damage:'ridiculous',shape:'zone'},
  screwdriver:{landing:'broken',brokenInto:'broken_screwdriver',damage:'ridiculous',shape:'zone'},
  swiss_army_knife:{landing:'broken',brokenInto:'broken_swiss_army_knife',damage:'ridiculous',shape:'zone'},
  box_cutter:{landing:'broken',brokenInto:'broken_box_cutter',damage:'ridiculous',shape:'zone'},
  can_opener:{landing:'broken',brokenInto:'broken_can_opener',damage:'ridiculous',shape:'zone'},
  ektorp_gluten_chair:{landing:'destroyed',damage:'ridiculous',shape:'zone'},
  torch:{landing:'debris',damage:'ridiculous',shape:'zone'},
  chicken:{landing:'destroyed',damage:'ridiculous',shape:'zone',requiresSmallTrebuchet:true},

  // Cross-area impact weapons.
  old_door:{landing:'debris',damage:'low',shape:'cross'},
  table:{landing:'debris',damage:'low',shape:'cross'},
  trestle:{landing:'debris',damage:'low',shape:'cross'},
  sheet_metal:{landing:'debris',damage:'low',shape:'cross'},
  engine:{landing:'scrap',damage:'low',shape:'cross'},
  pc_base_unit:{landing:'broken',brokenInto:'broken_pc_base_unit',damage:'low',shape:'cross'},
  water_bomb:{landing:'destroyed',damage:'low',shape:'cross'},

  // Wide-area impact weapons.
  sheet_metal_bits:{landing:'destroyed',damage:'low',shape:'square3x3'},
  exploding_grapefruit:{landing:'destroyed',damage:'high',shape:'square3x3'},
  claymore:{landing:'destroyed',damage:'important',shape:'square3x3'},
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
function itemIsBroken(item:ItemInstance):boolean{return normalizeItemState(item.type,item.state).condition==='broken'}
export function catapultEligibleItems(citizen:Citizen):ItemInstance[]{return citizen.inventory.filter((item)=>!itemIsBroken(item)&&catapultProfile(item.type)!==null)}
export function catapultActionCost(state:GameState):number{return state.town.construction.upgraded_catapult?.completed?2:4}
export function catapultMissChancePercent(state:GameState):number{return state.town.construction.upgraded_catapult?.completed?5:25}
export function provisionalCatapultOperator(state:GameState):Citizen|null{
  // Current MyHordes elects the Catapultist. Live2Nite does not yet have town-role voting, so the
  // sole ordinary human citizen is the explicit provisional operator until that governance system lands.
  return state.citizens.find((citizen)=>citizen.controller==='human'&&citizen.alive)??null
}
export function canUseCatapult(state:GameState,citizenId:string):boolean{
  const citizen=state.citizens.find((candidate)=>candidate.id===citizenId)
  const operator=provisionalCatapultOperator(state)
  return Boolean(citizen&&operator?.id===citizen.id&&citizen.alive&&citizen.location.type==='town'&&state.clock.phase==='day'&&state.town.construction.catapult?.completed&&citizen.ap>=catapultActionCost(state))
}
function sourceZoneOrder(zones:WorldZone[]):WorldZone[]{return zones.sort((a,b)=>(a.x+a.y)-(b.x+b.y))}
function adjacentCardinalZones(state:GameState,x:number,y:number):WorldZone[]{
  return sourceZoneOrder([[x,y+1],[x+1,y],[x,y-1],[x-1,y]].map(([cx,cy])=>state.world.zones[zoneKey(cx,cy)]).filter((zone):zone is WorldZone=>Boolean(zone)))
}
function blastZones(state:GameState,x:number,y:number,shape:CatapultBlastShape):WorldZone[]{
  if(shape==='zone'){const zone=state.world.zones[zoneKey(x,y)];return zone?[zone]:[]}
  if(shape==='cross')return sourceZoneOrder([[x,y],[x,y+1],[x+1,y],[x,y-1],[x-1,y]].map(([cx,cy])=>state.world.zones[zoneKey(cx,cy)]).filter((zone):zone is WorldZone=>Boolean(zone)))
  const zones:WorldZone[]=[]
  for(let dy=-1;dy<=1;dy+=1)for(let dx=-1;dx<=1;dx+=1){const zone=state.world.zones[zoneKey(x+dx,y+dy)];if(zone)zones.push(zone)}
  return sourceZoneOrder(zones)
}
function resolveKillTotal(state:GameState,profile:CatapultPayloadProfile,x:number,y:number,rngState:number):{zones:WorldZone[];kills:number;rngState:number}{
  if(!profile.damage)return{zones:[],kills:0,rngState}
  const zones=blastZones(state,x,y,profile.shape??'zone')
  const [min,max]=DAMAGE_RANGES[profile.damage]
  const roll=randomInt(rngState,min,max)
  const total=Math.min(roll.value,zones.reduce((sum,zone)=>sum+zone.zombies,0))
  return{zones,kills:total,rngState:roll.state}
}
/** Mirrors the source processor's repeated random allocation across still-populated blast zones. */
function distributeKills(zones:WorldZone[],kills:number,rngState:number):{killed:Map<string,number>;rngState:number}{
  const killed=new Map<string,number>();let left=kills;let state=rngState
  const initialCount=zones.length
  const remaining=new Map(zones.map((zone)=>[zoneKey(zone.x,zone.y),zone.zombies]))
  let active=zones.filter((zone)=>zone.zombies>0)
  while(left>0&&active.length>0){
    for(const zone of active){
      if(left<=0)break
      const key=zoneKey(zone.x,zone.y);const available=remaining.get(key)??0;if(available<=0)continue
      let amount:number
      if(active.length===1)amount=Math.min(left,available)
      else{const cap=Math.max(1,Math.min(Math.ceil(kills/Math.max(1,initialCount)),left,available));const roll=randomInt(state,1,cap);state=roll.state;amount=roll.value}
      killed.set(key,(killed.get(key)??0)+amount);remaining.set(key,available-amount);left-=amount
    }
    active=active.filter((zone)=>(remaining.get(zoneKey(zone.x,zone.y))??0)>0)
  }
  return{killed,rngState:state}
}
function landingItem(item:ItemInstance,profile:CatapultPayloadProfile):ItemInstance|null{
  // Generic source debris and mouldy-remains outputs do not yet have canonical Live2Nite runtime
  // identities. Fail closed rather than silently substituting a different item/resource.
  if(profile.landing==='destroyed'||profile.landing==='debris'||profile.landing==='moldy')return null
  if(profile.landing==='intact')return item
  if(profile.landing==='broken'&&profile.brokenInto)return createItemInstance(item.id,profile.brokenInto)
  if(profile.landing==='scrap')return createItemInstance(item.id,'scrap_metal')
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
  if(itemIsBroken(item))throw new Error('Broken items cannot be launched by the Catapult')
  const profile=catapultProfile(item.type)
  if(!profile)throw new Error(`${itemName(item.type)} is not a verified Catapult payload`)
  if(profile.requiresSmallTrebuchet&&!state.town.construction.small_trebuchet?.completed)throw new Error('Small Trebuchet is required to launch animals')

  const cost=catapultActionCost(state)
  const missRoll=randomInt(state.rngState,1,100)
  let rngState=missRoll.state
  let landed=intended
  const missed=missRoll.value<=catapultMissChancePercent(state)
  if(missed){const alternatives=adjacentCardinalZones(state,targetX,targetY);if(alternatives.length){const pick=randomInt(rngState,0,alternatives.length-1);rngState=pick.state;landed=alternatives[pick.value]}}

  const killResult=resolveKillTotal(state,profile,landed.x,landed.y,rngState);rngState=killResult.rngState
  const allocation=distributeKills(killResult.zones,killResult.kills,rngState);rngState=allocation.rngState
  const output=landingItem(item,profile)
  const landingKey=zoneKey(landed.x,landed.y)
  const zones={...state.world.zones}
  for(const [key,kills] of allocation.killed){const zone=zones[key];zones[key]={...zone,zombies:Math.max(0,zone.zombies-kills)}}
  const landingZone=zones[landingKey]
  zones[landingKey]={...landingZone,groundItems:output?[...landingZone.groundItems,output]:landingZone.groundItems}
  const log:CatapultLogEntry={day:state.day,hour:state.clock.hour,citizenId,itemType:item.type,intended:{x:targetX,y:targetY},landed:{x:landed.x,y:landed.y},missed,kills:killResult.kills,landing:profile.landing}
  return{state:{...state,rngState,citizens:state.citizens.map((candidate)=>candidate.id===citizen.id?{...candidate,ap:candidate.ap-cost,inventory:candidate.inventory.filter((carried)=>carried.id!==item.id)}:candidate),town:{...state.town,catapultLog:[...(state.town.catapultLog??[]),log]},world:{...state.world,zones}},log}
}
