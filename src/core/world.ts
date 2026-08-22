import { NORMAL_SCAVENGE_LOOT_POOL } from './items'
import { randomInt } from './rng'
import type { Direction, GameState, ItemType, WorldState, WorldZone } from './types'

export const WORLD_MIN_X = -7
export const WORLD_MAX_X = 6
export const WORLD_MIN_Y = -6
export const WORLD_MAX_Y = 6

export function zoneKey(x: number, y: number): string { return `${x},${y}` }
export function isTownGateZone(x: number, y: number): boolean { return x === 0 && y === 0 }

export function createWorld(seed: number): { world: WorldState; rngState: number } {
  const zones: Record<string, WorldZone> = {}
  let rngState = seed >>> 0 || 1
  for (let y = WORLD_MIN_Y; y <= WORLD_MAX_Y; y += 1) {
    for (let x = WORLD_MIN_X; x <= WORLD_MAX_X; x += 1) {
      const key = zoneKey(x, y)
      if (isTownGateZone(x, y)) {
        zones[key] = { x, y, discovered: true, zombies: 0, searchesRemaining: 0, searchedBy: [], depletedSearchedBy: [], hiddenLoot: [], groundItems: [] }
        continue
      }
      const distance = Math.abs(x) + Math.abs(y)
      const zombieRoll = randomInt(rngState, 0, Math.min(12, 2 + Math.floor(distance / 2)))
      rngState = zombieRoll.state
      const searchRoll = randomInt(rngState, 1, 3)
      rngState = searchRoll.state
      const hiddenLoot: ItemType[] = []
      for (let i = 0; i < searchRoll.value; i += 1) {
        const lootRoll = randomInt(rngState, 0, NORMAL_SCAVENGE_LOOT_POOL.length - 1)
        rngState = lootRoll.state
        hiddenLoot.push(NORMAL_SCAVENGE_LOOT_POOL[lootRoll.value])
      }
      zones[key] = {
        x,
        y,
        discovered: false,
        zombies: zombieRoll.value,
        searchesRemaining: searchRoll.value,
        searchedBy: [],
        depletedSearchedBy: [],
        hiddenLoot,
        groundItems: [],
      }
    }
  }
  return { world: { minX: WORLD_MIN_X, maxX: WORLD_MAX_X, minY: WORLD_MIN_Y, maxY: WORLD_MAX_Y, zones }, rngState }
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

export function distanceToTown(x: number, y: number): number { return Math.abs(x) + Math.abs(y) }

export function zoneControl(state: GameState, x: number, y: number): { humans: number; humanPoints: number; zombies: number; zombiePoints: number; trapped: boolean } {
  const humans = state.citizens.filter((citizen) => citizen.alive && citizen.location.type === 'world' && citizen.location.x === x && citizen.location.y === y).length
  const zombies = getZone(state.world, x, y)?.zombies ?? 0
  const humanPoints = humans * 2
  const zombiePoints = zombies
  return { humans, humanPoints, zombies, zombiePoints, trapped: zombiePoints > humanPoints }
}
