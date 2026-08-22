import { randomInt } from './rng'
import type { GameState, ItemInstance, ItemType } from './types'

export const BAREHANDED_AP_COST = 1
export const BAREHANDED_KILL_CHANCE_PERCENT = 10

export interface WeaponDefinition {
  itemType: ItemType
  minKills: number
  maxKills: number
  consumesOnUse: boolean
  apCost: number
  requiresPositiveAp: boolean
  confidence: 'confirmed' | 'approximate'
}

export const WEAPONS: Partial<Record<ItemType, WeaponDefinition>> = {
  water_bomb: {
    itemType: 'water_bomb',
    minKills: 1,
    maxKills: 5,
    consumesOnUse: true,
    apCost: 0,
    requiresPositiveAp: true,
    confidence: 'confirmed',
  },
}

export function weaponDefinition(type: ItemType): WeaponDefinition | null {
  return WEAPONS[type] ?? null
}

export function isWeapon(type: ItemType): boolean {
  return Boolean(weaponDefinition(type))
}

export function resolveBarehandedAttack(state: Pick<GameState, 'rngState'>): { kills: number; rngStateAfter: number } {
  const roll = randomInt(state.rngState, 1, 100)
  return {
    kills: roll.value <= BAREHANDED_KILL_CHANCE_PERCENT ? 1 : 0,
    rngStateAfter: roll.state,
  }
}

export function resolveWeaponAttack(
  state: Pick<GameState, 'rngState'>,
  item: ItemInstance,
  zombiesPresent: number,
): { kills: number; consumed: boolean; rngStateAfter: number } {
  const definition = weaponDefinition(item.type)
  if (!definition) throw new Error(`${item.type} is not a weapon`)
  const roll = randomInt(state.rngState, definition.minKills, definition.maxKills)
  return {
    kills: Math.min(zombiesPresent, roll.value),
    consumed: definition.consumesOnUse,
    rngStateAfter: roll.state,
  }
}
