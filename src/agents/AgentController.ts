import type { GameCommand } from '../core/types'
import type { AgentDecisionInput } from './AgentDecisionContext'

export interface AgentController {
  readonly kind: string
  decide(input: AgentDecisionInput, citizenId: string): GameCommand | null
}
