import { createConstructionState } from '../core/construction'
import { createDailyState, createStarterHome } from '../core/home'
import type { Citizen, GameState } from '../core/types'
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

function migrateToV4(result: Record<string, unknown>): GameState | null {
  const schemaVersion = result.schemaVersion as number | undefined
  if (schemaVersion === 4) return result as unknown as GameState
  if ((schemaVersion === 3 || schemaVersion === 2) && Array.isArray(result.citizens) && result.town && typeof result.seed === 'number') {
    const legacy = result as unknown as Omit<GameState, 'schemaVersion' | 'citizens' | 'town'> & {
      schemaVersion: 2 | 3
      citizens: Array<Partial<Citizen> & Pick<Citizen, 'id'>>
      town: Omit<GameState['town'], 'well' | 'construction'> & Partial<Pick<GameState['town'], 'construction'>>
    }
    return {
      ...(legacy as unknown as GameState),
      schemaVersion: 4,
      citizens: legacy.citizens.map(migrateCitizen),
      town: {
        ...legacy.town,
        construction: legacy.town.construction ?? createConstructionState(),
        well: { water: startingWellWater(legacy.seed) },
      },
    }
  }
  return null
}

export class IndexedDbGameRepository implements GameRepository {
  async load(): Promise<GameState | null> {
    const database = await openDatabase()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly')
      const request = transaction.objectStore(STORE_NAME).get(SAVE_KEY)
      request.onsuccess = () => {
        const result = request.result as Record<string, unknown> | undefined
        resolve(result ? migrateToV4(result) : null)
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
