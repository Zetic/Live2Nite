import type { GameCommand } from '../core/types'

export function findAction<T extends GameCommand['type']>(actions: GameCommand[], type: T): Extract<GameCommand, { type: T }> | undefined {
  return actions.find((action) => action.type === type) as Extract<GameCommand, { type: T }> | undefined
}
