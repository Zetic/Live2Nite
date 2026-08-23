import type { GameState } from '../core/types'
import { createAgentWorldKnowledge, type AgentWorldKnowledge } from './WorldKnowledge'

export interface AgentDecisionContext {
  state: GameState
  world: AgentWorldKnowledge
}

export type AgentDecisionInput = GameState | AgentDecisionContext

export function createAgentDecisionContext(state: GameState): AgentDecisionContext {
  return {
    state,
    world: createAgentWorldKnowledge(state),
  }
}

export function asAgentDecisionContext(input: AgentDecisionInput): AgentDecisionContext {
  return 'world' in input && 'state' in input ? input : createAgentDecisionContext(input)
}
