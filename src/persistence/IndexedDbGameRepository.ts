import { createConstructionState } from '../core/construction'
import { createDailyState, createStarterHome } from '../core/home'
import type { Citizen, GameEvent, GameState, ItemType, WorldState, WorldZone } from '../core/types'
import { startingWellWater } from '../core/well'
import type { GameRepository } from './GameRepository'

const DB_NAME = 'live2nite'
const STORE_NAME = 'game'
const SAVE_KEY = 'active'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => { const database = request.result; if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME) }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function migrateCitizen(candidate: Partial<Citizen> & Pick<Citizen, 'id'>): Citizen {
  return {
    ...(candidate as Citizen),
    home: candidate.home ?? createStarterHome(candidate.id),
    daily: candidate.daily ?? createDailyState(),
  }
}

function normalizeLegacyNormalLoot(type: ItemType): ItemType {
  if (type === 'rotten_log') return 'twisted_plank'
  if (type === 'scrap_metal') return 'wrought_iron'
  return type
}

function migrateWorld(world: WorldState): WorldState {
  const zones: Record<string, WorldZone> = {}
  for (const [key, zone] of Object.entries(world.zones)) {
    const legacy = zone as WorldZone & { depletedSearchedBy?: string[] }
    zones[key] = {
      ...zone,
      depletedSearchedBy: legacy.depletedSearchedBy ?? [],
      hiddenLoot: zone.hiddenLoot.map(normalizeLegacyNormalLoot),
    }
  }
  return { ...world, zones }
}

function migrateEvents(events: unknown): GameEvent[] {
  if (!Array.isArray(events)) return []
  return events.map((candidate) => {
    const event = candidate as Record<string, unknown>
    if (event.type === 'ZONE_SEARCHED' && !event.mode) return { ...event, mode: 'normal' } as unknown as GameEvent
    return candidate as GameEvent
  })
}

function migrateToV5(result: Record<string, unknown>): GameState | null {
  const schemaVersion = result.schemaVersion as number | undefined
  if (schemaVersion === 5) return result as unknown as GameState
  if (![2, 3, 4].includes(schemaVersion ?? -1) || !Array.isArray(result.citizens) || !result.town || !result.world || typeof result.seed !== 'number') return null

  const legacy = result as unknown as Omit<GameState, 'schemaVersion' | 'citizens' | 'town' | 'world' | 'events'> & {
    schemaVersion: 2 | 3 | 4
    citizens: Array<Partial<Citizen> & Pick<Citizen, 'id'>>
    town: Omit<GameState['town'], 'well' | 'construction'> & Partial<Pick<GameState['town'], 'well' | 'construction'>>
    world: WorldState
    events?: unknown
  }

  return {
    ...(legacy as unknown as GameState),
    schemaVersion: 5,
    citizens: legacy.citizens.map(migrateCitizen),
    town: {
      ...legacy.town,
      construction: legacy.town.construction ?? createConstructionState(),
      well: legacy.town.well ?? { water: startingWellWater(legacy.seed) },
    },
    world: migrateWorld(legacy.world),
    events: migrateEvents(legacy.events),
  }
}

export class IndexedDbGameRepository implements GameRepository {
  async load(): Promise<GameState | null> {
    const database = await openDatabase()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly')
      const request = transaction.objectStore(STORE_NAME).get(SAVE_KEY)
      request.onsuccess = () => {
        const result = request.result as Record<string, unknown> | undefined
        resolve(result ? migrateToV5(result) : null)
      }
      request.onerror = () => reject(request.error)
      transaction.oncomplete = () => database.close()
    })
  }
  async save(state: GameState): Promise<void> {
    const database = await openDatabase()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).put(state, SAVE_KEY)
      transaction.oncomplete = () => { database.close(); resolve() }
      transaction.onerror = () => reject(transaction.error)
    })
  }
  async clear(): Promise<void> {
    const database = await openDatabase()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).delete(SAVE_KEY)
      transaction.oncomplete = () => { database.close(); resolve() }
      transaction.onerror = () => reject(transaction.error)
    })
  }
}
