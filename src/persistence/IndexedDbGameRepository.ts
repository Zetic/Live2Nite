import type { GameState } from '../core/types'
import type { GameRepository } from './GameRepository'

const DB_NAME = 'live2nite'
const STORE_NAME = 'game'
const SAVE_KEY = 'active'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export class IndexedDbGameRepository implements GameRepository {
  async load(): Promise<GameState | null> {
    const database = await openDatabase()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly')
      const request = transaction.objectStore(STORE_NAME).get(SAVE_KEY)
      request.onsuccess = () => {
        const result = request.result as Partial<GameState> | undefined
        resolve(result?.schemaVersion === 2 ? result as GameState : null)
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
      transaction.oncomplete = () => {
        database.close()
        resolve()
      }
      transaction.onerror = () => reject(transaction.error)
    })
  }

  async clear(): Promise<void> {
    const database = await openDatabase()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).delete(SAVE_KEY)
      transaction.oncomplete = () => {
        database.close()
        resolve()
      }
      transaction.onerror = () => reject(transaction.error)
    })
  }
}
