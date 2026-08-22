import type { GameState } from '../core/types'

export interface GameRepository {
  load(): Promise<GameState | null>
  save(state: GameState): Promise<void>
  clear(): Promise<void>
}
