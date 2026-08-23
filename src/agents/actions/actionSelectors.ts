import type { Citizen, GameCommand, ItemInstance, ItemType } from '../../core/types'

export function pick<T extends GameCommand['type']>(actions: GameCommand[], type: T): Extract<GameCommand, { type: T }> | null {
  return (actions.find((action) => action.type === type) as Extract<GameCommand, { type: T }> | undefined) ?? null
}

export function itemAction(actions: GameCommand[], type: GameCommand['type'], itemId: string): GameCommand | null {
  return actions.find((action) => action.type === type && 'itemId' in action && action.itemId === itemId) ?? null
}

export function bankAction(actions: GameCommand[], type: ItemType): GameCommand | null {
  return actions.find((action) => action.type === 'WITHDRAW_BANK_ITEM' && action.itemType === type) ?? null
}

export function carried(citizen: Citizen, type: ItemType): ItemInstance | undefined {
  return citizen.inventory.find((item) => item.type === type)
}

export function atHome(citizen: Citizen, type: ItemType): ItemInstance | undefined {
  return citizen.home.storage.find((item) => item.type === type)
}
