import type { GameState } from '../core/types'
import { createAgentWorldKnowledge, type AgentWorldKnowledge } from './WorldKnowledge'

export interface AgentDecisionContext {
  state: GameState
  world: AgentWorldKnowledge
  viewerCitizenId:string|null
}

export type AgentDecisionInput = GameState | AgentDecisionContext

export function createAgentDecisionContext(state: GameState,viewerCitizenId?:string): AgentDecisionContext {
  const world=createAgentWorldKnowledge(state,viewerCitizenId)
  return {
    state,
    world,
    viewerCitizenId:world.viewerCitizenId,
  }
}

export function asAgentDecisionContext(input: AgentDecisionInput,viewerCitizenId?:string): AgentDecisionContext {
  if('world' in input&&'state' in input){
    const requested=viewerCitizenId??null
    return input.viewerCitizenId===requested?input:createAgentDecisionContext(input.state,viewerCitizenId)
  }
  return createAgentDecisionContext(input,viewerCitizenId)
}
