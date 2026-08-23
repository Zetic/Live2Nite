import type { Direction, GameState, WorldZone } from '../../core/types'
import { distanceToTown, getZone, moveCoordinates } from '../../core/world'
import { citizenNumber } from '../AgentIdentity'
import { AI_TUNING } from '../AiTuning'
import { createAgentWorldKnowledge, type AgentWorldKnowledge } from '../WorldKnowledge'

export interface Coord { x: number; y: number }
interface Node extends Coord { cost: number; path: Direction[] }
const DIRECTIONS: Direction[] = ['NORTH', 'SOUTH', 'EAST', 'WEST']

function key(coord: Coord): string { return `${coord.x},${coord.y}` }
function same(a: Coord, b: Coord): boolean { return a.x === b.x && a.y === b.y }

function stepCost(knowledge: AgentWorldKnowledge, zone: WorldZone | undefined, isTarget: boolean): number {
  if (!zone) return 999
  if (isTarget) return 1
  const known = knowledge.zone(zone.x, zone.y)
  if (!known?.discovered) return 1.25
  let cost=(known.zombies ?? 0)>=6?7:(known.zombies??0)>=3?3:1
  if(known.freshness==='stale')cost+=AI_TUNING.staleIntelRoutePenalty
  return cost
}

export function routeBetween(state: GameState, from: Coord, target: Coord): Direction[] {
  if (same(from, target)) return []
  const knowledge = createAgentWorldKnowledge(state)
  const queue: Node[] = [{ ...from, cost: 0, path: [] }]
  const best = new Map<string, number>([[key(from), 0]])

  while (queue.length) {
    queue.sort((a, b) => a.cost - b.cost)
    const current = queue.shift()!
    if (same(current, target)) return current.path

    for (const direction of DIRECTIONS) {
      const next = moveCoordinates(current.x, current.y, direction)
      const zone = getZone(state.world, next.x, next.y)
      if (!zone) continue
      const cost = current.cost + stepCost(knowledge, zone, same(next, target))
      const nextKey = key(next)
      if (cost >= (best.get(nextKey) ?? Infinity)) continue
      best.set(nextKey, cost)
      queue.push({ ...next, cost, path: [...current.path, direction] })
    }
  }
  return []
}

export function nextDirectionToward(state: GameState, from: Coord, target: Coord): Direction | null {
  return routeBetween(state, from, target)[0] ?? null
}

export function frontierZones(state: GameState): WorldZone[] {
  return Object.values(state.world.zones).filter((zone) =>
    !zone.discovered
    && DIRECTIONS.some((direction) => {
      const adjacent = moveCoordinates(zone.x, zone.y, direction)
      return getZone(state.world, adjacent.x, adjacent.y)?.discovered
    }))
}

function sectorPenalty(citizenId: string, zone: WorldZone): number {
  const sector = citizenNumber(citizenId) % 4
  if (sector === 0) return zone.y >= 0 ? 0 : 5
  if (sector === 1) return zone.x >= 0 ? 0 : 5
  if (sector === 2) return zone.y <= 0 ? 0 : 5
  return zone.x <= 0 ? 0 : 5
}

function nearbyCrowd(state:GameState,zone:WorldZone):number{return state.citizens.filter((citizen)=>citizen.alive&&citizen.location.type==='world'&&Math.abs(citizen.location.x-zone.x)+Math.abs(citizen.location.y-zone.y)<=1).length}

export function chooseReconTarget(state:GameState,citizenId:string,excluded=new Set<string>()):WorldZone|null{
  const knowledge=createAgentWorldKnowledge(state)
  const missionTargets=new Set(Object.values(state.botMissions).map((mission)=>`${mission.target.x},${mission.target.y}`))
  const candidates=Object.values(state.world.zones).filter((zone)=>{
    if(!zone.discovered||distanceToTown(zone.x,zone.y)===0||excluded.has(`${zone.x},${zone.y}`))return false
    return knowledge.zone(zone.x,zone.y)?.freshness!=='fresh'
  })
  if(!candidates.length)return null
  const preferredRadius=3+(citizenNumber(citizenId)%5)
  return [...candidates].sort((a,b)=>{
    const score=(zone:WorldZone)=>{
      const known=knowledge.zone(zone.x,zone.y)
      const siteValue=known?.specialSite&&known.specialSite.status!=='depleted'?-18:0
      const productive=(known?.searchesRemaining??0)>0?-10:0
      const missionValue=missionTargets.has(`${zone.x},${zone.y}`)?-15:0
      const age=known?.lastObservedDay===null?10:Math.max(0,state.day-(known?.lastObservedDay??state.day))
      return Math.abs(distanceToTown(zone.x,zone.y)-preferredRadius)*3+sectorPenalty(citizenId,zone)+nearbyCrowd(state,zone)*3+siteValue+productive+missionValue-Math.min(12,age*2)
    }
    return score(a)-score(b)
  })[0]??null
}

export function chooseFrontierTarget(
  state: GameState,
  citizenId: string,
  excluded = new Set<string>(),
): WorldZone | null {
  const unknown = Object.values(state.world.zones).filter((zone) =>
    !zone.discovered
    && distanceToTown(zone.x, zone.y) > 0
    && !excluded.has(`${zone.x},${zone.y}`))
  if (!unknown.length) return null

  const preferredRadius = 3 + (citizenNumber(citizenId) % 4)
  return [...unknown].sort((a, b) => {
    const scoreA = Math.abs(distanceToTown(a.x, a.y) - preferredRadius) * 4 + sectorPenalty(citizenId, a) + nearbyCrowd(state,a) * 3
    const scoreB = Math.abs(distanceToTown(b.x, b.y) - preferredRadius) * 4 + sectorPenalty(citizenId, b) + nearbyCrowd(state,b) * 3
    return scoreA - scoreB
  })[0]
}

export function chooseScoutTarget(state:GameState,citizenId:string,excluded=new Set<string>()):{zone:WorldZone;kind:'recon'|'frontier'}|null{
  const recon=chooseReconTarget(state,citizenId,excluded)
  if(recon)return{zone:recon,kind:'recon'}
  const frontier=chooseFrontierTarget(state,citizenId,excluded)
  return frontier?{zone:frontier,kind:'frontier'}:null
}
