import { NORMAL_SCAVENGE_LOOT_POOL } from './items'
import { randomInt } from './rng'
import { EXPLORABLE_RUIN_IDS, type RuinId } from './ruinIds'
import { ORDINARY_RUIN_IDS, RUIN_CATALOG } from './ruinCatalog'
import { specialSiteLootPool } from './specialSites'
import { citizenControlPoints } from './status'
import type {
  Citizen,
  Direction,
  GameState,
  ItemType,
  SpecialSiteState,
  WorldState,
  WorldZone,
  ZoneControlState,
  ZoneIntelState,
} from './types'

export const WORLD_MIN_X = -7
export const WORLD_MAX_X = 6
export const WORLD_MIN_Y = -6
export const WORLD_MAX_Y = 6
/** Existing Live2Nite map-density choice. Ruin identity/placement within those slots is source-driven. */
export const SPECIAL_SITE_COUNT = 12
export const EXPLORABLE_RUIN_COUNT = 1
export const NORMAL_ZONE_SEARCH_MIN = 5
export const NORMAL_ZONE_SEARCH_MAX = 7

export function zoneKey(x: number, y: number): string { return `${x},${y}` }
export function isTownGateZone(x: number, y: number): boolean { return x === 0 && y === 0 }
export function distanceToTown(x: number, y: number): number { return Math.abs(x) + Math.abs(y) }
export function emptyZoneIntel():ZoneIntelState{return{observedZombies:null,lastObservedDay:null,lastObservedHour:null}}

const MAX_WORLD_RADIUS=Math.hypot(Math.max(Math.abs(WORLD_MIN_X),Math.abs(WORLD_MAX_X)),Math.max(Math.abs(WORLD_MIN_Y),Math.abs(WORLD_MAX_Y)))
/**
 * MyHordes ruin bands extend to 28 km while Live2Nite currently uses a much smaller test map.
 * Preserve the source near/mid/far relationships by projecting map radius onto the 1..28 km source scale.
 */
export function sourceEquivalentRuinKm(x:number,y:number):number{return Math.max(1,Math.min(28,Math.round((Math.hypot(x,y)/MAX_WORLD_RADIUS)*28)))}

function chooseWeightedRuin(rngState:number,x:number,y:number,excluded:Set<RuinId>):{id:RuinId;rngState:number}{
  const km=sourceEquivalentRuinKm(x,y)
  let candidates=ORDINARY_RUIN_IDS.filter((id)=>{
    const ruin=RUIN_CATALOG[id]
    return !excluded.has(id)&&ruin.spawnChance>0&&km>=ruin.sourceKm.min&&km<=ruin.sourceKm.max
  })
  if(!candidates.length)candidates=ORDINARY_RUIN_IDS.filter((id)=>!excluded.has(id)&&RUIN_CATALOG[id].spawnChance>0)
  if(!candidates.length)candidates=ORDINARY_RUIN_IDS.filter((id)=>RUIN_CATALOG[id].spawnChance>0)
  const total=candidates.reduce((sum,id)=>sum+RUIN_CATALOG[id].spawnChance,0)
  const roll=randomInt(rngState,1,Math.max(1,total));let remaining=roll.value
  for(const id of candidates){remaining-=RUIN_CATALOG[id].spawnChance;if(remaining<=0)return{id,rngState:roll.state}}
  return{id:candidates[candidates.length-1]!,rngState:roll.state}
}

function generateSpecialSite(type:RuinId,rngState:number):{site:SpecialSiteState;rngState:number}{
  const ruin=RUIN_CATALOG[type]
  let next=rngState
  let excavationRequired=0
  if(!ruin.explorable){const excavation=randomInt(next,3,7);next=excavation.state;excavationRequired=excavation.value}
  const emptyRoll=randomInt(next,1,10000);next=emptyRoll.state
  const empty=emptyRoll.value<=Math.round(ruin.emptyChance*10000)
  const hiddenLoot:ItemType[]=[]
  const pool=specialSiteLootPool(type)
  if(!empty&&pool.length){
    const lootCount=randomInt(next,2,4);next=lootCount.state
    for(let index=0;index<lootCount.value;index+=1){const loot=randomInt(next,0,pool.length-1);next=loot.state;hiddenLoot.push(pool[loot.value]!)}
  }
  return{
    site:{type:type as unknown as SpecialSiteState['type'],status:ruin.explorable?'accessible':'buried',excavationRequired,excavationProgress:0,hiddenLoot,searchedBy:[],blueprintFound:false},
    rngState:next,
  }
}

function takeUnusedCandidate(candidates:WorldZone[],used:Set<number>,rngState:number,predicate:(zone:WorldZone)=>boolean=()=>true):{index:number;rngState:number}{
  const eligible=candidates.map((zone,index)=>({zone,index})).filter(({zone,index})=>!used.has(index)&&predicate(zone))
  if(!eligible.length)return{index:-1,rngState}
  const roll=randomInt(rngState,0,eligible.length-1)
  return{index:eligible[roll.value]!.index,rngState:roll.state}
}

export function addSpecialSites(world:WorldState,seed:number):WorldState{
  if(Object.values(world.zones).some((zone)=>zone.specialSite))return world
  const zones={...world.zones}
  const candidates=Object.values(zones).filter((zone)=>!isTownGateZone(zone.x,zone.y))
  const used=new Set<number>();const usedRuinIds=new Set<RuinId>()
  let specialRng=((seed>>>0)^0x51f15e7d)>>>0||1
  const ordinaryCount=Math.min(SPECIAL_SITE_COUNT,candidates.length)
  for(let index=0;index<ordinaryCount;index+=1){
    const candidateRoll=takeUnusedCandidate(candidates,used,specialRng);specialRng=candidateRoll.rngState
    if(candidateRoll.index<0)break
    used.add(candidateRoll.index)
    const candidate=candidates[candidateRoll.index]!
    const ruinRoll=chooseWeightedRuin(specialRng,candidate.x,candidate.y,usedRuinIds);specialRng=ruinRoll.rngState;usedRuinIds.add(ruinRoll.id)
    const generated=generateSpecialSite(ruinRoll.id,specialRng);specialRng=generated.rngState
    zones[zoneKey(candidate.x,candidate.y)]={...candidate,specialSite:generated.site}
  }

  // MyHordes treats Hotel/Hospital/Bunker as a separate explorable-ruin map slot rather than ordinary spawnChance entries.
  for(let index=0;index<EXPLORABLE_RUIN_COUNT;index+=1){
    const familyRoll=randomInt(specialRng,0,EXPLORABLE_RUIN_IDS.length-1);specialRng=familyRoll.state
    const ruinId=EXPLORABLE_RUIN_IDS[familyRoll.value]!
    const candidateRoll=takeUnusedCandidate(candidates,used,specialRng,(zone)=>sourceEquivalentRuinKm(zone.x,zone.y)>=5);specialRng=candidateRoll.rngState
    if(candidateRoll.index<0)break
    used.add(candidateRoll.index)
    const candidate=candidates[candidateRoll.index]!
    const generated=generateSpecialSite(ruinId,specialRng);specialRng=generated.rngState
    zones[zoneKey(candidate.x,candidate.y)]={...candidate,specialSite:generated.site}
  }
  return{...world,zones}
}

export function createWorld(seed:number):{world:WorldState;rngState:number}{
  const zones:Record<string,WorldZone>={}
  const intel:Record<string,ZoneIntelState>={}
  let rngState=seed>>>0||1
  for(let y=WORLD_MIN_Y;y<=WORLD_MAX_Y;y+=1){
    for(let x=WORLD_MIN_X;x<=WORLD_MAX_X;x+=1){
      const key=zoneKey(x,y)
      if(isTownGateZone(x,y)){
        zones[key]={x,y,discovered:true,zombies:0,searchesRemaining:0,searchedBy:[],depletedSearchedBy:[],hiddenLoot:[],groundItems:[],campImprovements:0}
        intel[key]={observedZombies:0,lastObservedDay:1,lastObservedHour:1}
        continue
      }
      const distance=Math.abs(x)+Math.abs(y)
      const zombieRoll=randomInt(rngState,0,Math.min(12,2+Math.floor(distance/2)));rngState=zombieRoll.state
      const searchRoll=randomInt(rngState,NORMAL_ZONE_SEARCH_MIN,NORMAL_ZONE_SEARCH_MAX);rngState=searchRoll.state
      const hiddenLoot:ItemType[]=[]
      for(let i=0;i<searchRoll.value;i+=1){const lootRoll=randomInt(rngState,0,NORMAL_SCAVENGE_LOOT_POOL.length-1);rngState=lootRoll.state;hiddenLoot.push(NORMAL_SCAVENGE_LOOT_POOL[lootRoll.value]!)}
      zones[key]={x,y,discovered:false,zombies:zombieRoll.value,searchesRemaining:searchRoll.value,searchedBy:[],depletedSearchedBy:[],hiddenLoot,groundItems:[],campImprovements:0}
      intel[key]=emptyZoneIntel()
    }
  }
  const base:WorldState={minX:WORLD_MIN_X,maxX:WORLD_MAX_X,minY:WORLD_MIN_Y,maxY:WORLD_MAX_Y,zones,intel}
  return{world:addSpecialSites(base,seed),rngState}
}

export function getZone(world:WorldState,x:number,y:number):WorldZone|null{return world.zones[zoneKey(x,y)]??null}
export function moveCoordinates(x:number,y:number,direction:Direction):{x:number;y:number}{
  switch(direction){case'NORTH':return{x,y:y+1};case'SOUTH':return{x,y:y-1};case'EAST':return{x:x+1,y};case'WEST':return{x:x-1,y}}
}

export function citizensInZone(state:GameState,x:number,y:number):Citizen[]{return state.citizens.filter((citizen)=>citizen.alive&&citizen.location.type==='world'&&citizen.location.x===x&&citizen.location.y===y)}

export function zoneControl(state:GameState,x:number,y:number):{humans:number;humanPoints:number;zombies:number;zombiePoints:number;trapped:boolean}{
  const residents=citizensInZone(state,x,y);const humans=residents.length;const zombies=getZone(state.world,x,y)?.zombies??0
  const humanPoints=residents.reduce((sum,citizen)=>sum+citizenControlPoints(citizen),0);const zombiePoints=zombies
  return{humans,humanPoints,zombies,zombiePoints,trapped:zombiePoints>humanPoints}
}

export function temporaryControlActive(state:GameState,citizenId:string):boolean{
  const citizen=state.citizens.find((candidate)=>candidate.id===citizenId)
  if(!citizen?.alive||citizen.location.type!=='world'||!citizen.temporaryControl)return false
  return citizen.temporaryControl.zoneKey===zoneKey(citizen.location.x,citizen.location.y)&&citizen.temporaryControl.grantedDay===state.day&&citizen.temporaryControl.grantedHour===state.clock.hour
}

export function relativeControlActive(state:GameState,citizenId:string):boolean{
  const citizen=state.citizens.find((candidate)=>candidate.id===citizenId)
  if(!citizen?.alive||citizen.location.type!=='world'||!citizen.relativeControl)return false
  return citizen.relativeControl.zoneKey===zoneKey(citizen.location.x,citizen.location.y)
}

export function departureWouldLoseControl(state:GameState,citizenId:string):boolean{
  const citizen=state.citizens.find((candidate)=>candidate.id===citizenId)
  if(!citizen?.alive||citizen.location.type!=='world')return false
  const control=zoneControl(state,citizen.location.x,citizen.location.y);if(control.trapped)return false
  const remaining=citizensInZone(state,citizen.location.x,citizen.location.y).filter((candidate)=>candidate.id!==citizenId)
  const remainingPoints=remaining.reduce((sum,candidate)=>sum+citizenControlPoints(candidate),0)
  return remaining.length>0&&control.zombiePoints>remainingPoints
}

export function zoneControlState(state:GameState,x:number,y:number,citizenId?:string):ZoneControlState{
  const control=zoneControl(state,x,y)
  if(!control.trapped){const residents=citizensInZone(state,x,y);const weakestDeparturePoints=Math.max(0,control.humanPoints-Math.max(...residents.map(citizenControlPoints),0));const fragile=control.humans>1&&control.zombiePoints>weakestDeparturePoints;return fragile?'fragile':'secure'}
  if(citizenId&&temporaryControlActive(state,citizenId))return'temporary'
  if(citizenId&&relativeControlActive(state,citizenId))return'relative'
  const residents=citizensInZone(state,x,y);if(residents.some((citizen)=>temporaryControlActive(state,citizen.id)))return'temporary'
  return'trapped'
}

export function canCitizenMoveFromZone(state:GameState,citizenId:string):boolean{
  const citizen=state.citizens.find((candidate)=>candidate.id===citizenId)
  if(!citizen||citizen.location.type!=='world')return false
  const control=zoneControl(state,citizen.location.x,citizen.location.y)
  return!control.trapped||temporaryControlActive(state,citizenId)||relativeControlActive(state,citizenId)
}
