import type { GameCommand, GameState } from '../core/types'

export interface AgentController {
  readonly kind: string
  decide(state: Readonly<GameState>, citizenId: string): GameCommand | null
}
