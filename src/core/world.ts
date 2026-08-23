import { NORMAL_SCAVENGE_LOOT_POOL } from './items'
import { randomInt } from './rng'
import { SPECIAL_SITES, SPECIAL_SITE_ORDER } from './specialSites'
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
export const SPECIAL_SITE_COUNT = 12
export const NORMAL_ZONE_SEARCH_MIN = 5
export const NORMAL_ZONE_SEARCH_MAX = 7

export function zoneKey(x: number, y: number): string { return `${x},${y}` }
export function isTownGateZone(x: number, y: number): boolean { return x === 0 && y === 0 }
export function distanceToTown(x: number, y: number): number { return Math.abs(x) + Math.abs(y) }
export function emptyZoneIntel():ZoneIntelState{return{observedZombies:null,lastObservedDay:null,lastObservedHour:null}}

function generateSpecialSite(type: SpecialSiteState['type'], rngState: number): { site: SpecialSiteState; rngState: number } {
  const excavation = randomInt(rngState, 3, 7)
  let next = excavation.state
  const lootCount = randomInt(next, 2, 4)
  next = lootCount.state
  const pool = SPECIAL_SITES[type].lootPool
  const hiddenLoot: ItemType[] = []
  for (let index = 0; index < lootCount.value; index += 1) {
    const loot = randomInt(next, 0, pool.length - 1)
    next = loot.state
    hiddenLoot.push(pool[loot.value])
  }
  return {
    site: { type, status: 'buried', excavationRequired: excavation.value, excavationProgress: 0, hiddenLoot, searchedBy: [] },
    rngState: next,
  }
}

export function addSpecialSites(world: WorldState, seed: number): WorldState {
  if (Object.values(world.zones).some((zone) => zone.specialSite)) return world
  const zones = { ...world.zones }
  const candidates = Object.values(zones).filter((zone) => !isTownGateZone(zone.x, zone.y) && distanceToTown(zone.x, zone.y) >= 3)
  const used = new Set<number>()
  let specialRng = ((seed >>> 0) ^ 0x51f15e7d) >>> 0 || 1
  const count = Math.min(SPECIAL_SITE_COUNT, candidates.length)
  for (let index = 0; index < count; index += 1) {
    let candidateIndex = 0
    for (let attempts = 0; attempts < candidates.length * 2; attempts += 1) {
      const roll = randomInt(specialRng, 0, candidates.length - 1)
      specialRng = roll.state
      candidateIndex = roll.value
      if (!used.has(candidateIndex)) break
    }
    if (used.has(candidateIndex)) candidateIndex = candidates.findIndex((_, position) => !used.has(position))
    if (candidateIndex < 0) break
    used.add(candidateIndex)
    const candidate = candidates[candidateIndex]
    const type = SPECIAL_SITE_ORDER[index % SPECIAL_SITE_ORDER.length]
    const generated = generateSpecialSite(type, specialRng)
    specialRng = generated.rngState
    zones[zoneKey(candidate.x,candidate.y)] = { ...candidate, specialSite: generated.site }
  }
  return { ...world, zones }
}

export function createWorld(seed: number): { world: WorldState; rngState: number } {
  const zones: Record<string, WorldZone> = {}
  const intel:Record<string,ZoneIntelState>={}
  let rngState = seed >>> 0 || 1
  for (let y = WORLD_MIN_Y; y <= WORLD_MAX_Y; y += 1) {
    for (let x = WORLD_MIN_X; x <= WORLD_MAX_X; x += 1) {
      const key = zoneKey(x, y)
      if (isTownGateZone(x, y)) {
        zones[key] = { x, y, discovered: true, zombies: 0, searchesRemaining: 0, searchedBy: [], depletedSearchedBy: [], hiddenLoot: [], groundItems: [], campImprovements: 0 }
        intel[key]={observedZombies:0,lastObservedDay:1,lastObservedHour:1}
        continue
      }
      const distance = Math.abs(x) + Math.abs(y)
      const zombieRoll = randomInt(rngState, 0, Math.min(12, 2 + Math.floor(distance / 2)))
      rngState = zombieRoll.state
      const searchRoll = randomInt(rngState, NORMAL_ZONE_SEARCH_MIN, NORMAL_ZONE_SEARCH_MAX)
      rngState = searchRoll.state
      const hiddenLoot: ItemType[] = []
      for (let i = 0; i < searchRoll.value; i += 1) {
        const lootRoll = randomInt(rngState, 0, NORMAL_SCAVENGE_LOOT_POOL.length - 1)
        rngState = lootRoll.state
        hiddenLoot.push(NORMAL_SCAVENGE_LOOT_POOL[lootRoll.value])
      }
      zones[key] = { x, y, discovered: false, zombies: zombieRoll.value, searchesRemaining: searchRoll.value, searchedBy: [], depletedSearchedBy: [], hiddenLoot, groundItems: [], campImprovements: 0 }
      intel[key]=emptyZoneIntel()
    }
  }
  const base: WorldState = { minX: WORLD_MIN_X, maxX: WORLD_MAX_X, minY: WORLD_MIN_Y, maxY: WORLD_MAX_Y, zones, intel }
  return { world: addSpecialSites(base, seed), rngState }
}

export function getZone(world: WorldState, x: number, y: number): WorldZone | null { return world.zones[zoneKey(x, y)] ?? null }
export function moveCoordinates(x: number, y: number, direction: Direction): { x: number; y: number } {
  switch (direction) {
    case 'NORTH': return { x, y: y + 1 }
    case 'SOUTH': return { x, y: y - 1 }
    case 'EAST': return { x: x + 1, y }
    case 'WEST': return { x: x - 1, y }
  }
}

export function citizensInZone(state:GameState,x:number,y:number):Citizen[]{return state.citizens.filter((citizen)=>citizen.alive&&citizen.location.type==='world'&&citizen.location.x===x&&citizen.location.y===y)}

export function zoneControl(state: GameState, x: number, y: number): { humans: number; humanPoints: number; zombies: number; zombiePoints: number; trapped: boolean } {
  const humans = citizensInZone(state,x,y).length
  const zombies = getZone(state.world, x, y)?.zombies ?? 0
  const humanPoints = humans * 2
  const zombiePoints = zombies
  return { humans, humanPoints, zombies, zombiePoints, trapped: zombiePoints > humanPoints }
}

export function temporaryControlActive(state:GameState,citizenId:string):boolean{
  const citizen=state.citizens.find((candidate)=>candidate.id===citizenId)
  if(!citizen?.alive||citizen.location.type!=='world'||!citizen.temporaryControl)return false
  return citizen.temporaryControl.zoneKey===zoneKey(citizen.location.x,citizen.location.y)
    && citizen.temporaryControl.grantedDay===state.day
    && citizen.temporaryControl.grantedHour===state.clock.hour
}

export function departureWouldLoseControl(state:GameState,citizenId:string):boolean{
  const citizen=state.citizens.find((candidate)=>candidate.id===citizenId)
  if(!citizen?.alive||citizen.location.type!=='world')return false
  const control=zoneControl(state,citizen.location.x,citizen.location.y)
  if(control.trapped)return false
  const remaining=Math.max(0,control.humans-1)
  return remaining>0&&control.zombiePoints>remaining*2
}

export function zoneControlState(state:GameState,x:number,y:number,citizenId?:string):ZoneControlState{
  const control=zoneControl(state,x,y)
  if(!control.trapped){
    const fragile=control.humans>1&&control.zombiePoints>(control.humans-1)*2
    return fragile?'fragile':'secure'
  }
  if(citizenId&&temporaryControlActive(state,citizenId))return'temporary'
  const residents=citizensInZone(state,x,y)
  if(residents.some((citizen)=>temporaryControlActive(state,citizen.id)))return'temporary'
  return'trapped'
}

export function canCitizenMoveFromZone(state:GameState,citizenId:string):boolean{
  const citizen=state.citizens.find((candidate)=>candidate.id===citizenId)
  if(!citizen||citizen.location.type!=='world')return false
  const control=zoneControl(state,citizen.location.x,citizen.location.y)
  return !control.trapped||temporaryControlActive(state,citizenId)
}
