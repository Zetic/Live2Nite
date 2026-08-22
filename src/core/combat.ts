import { randomInt } from './rng'
import type { GameState, ItemInstance, ItemType } from './types'

export const BAREHANDED_AP_COST = 1
export const BAREHANDED_KILL_CHANCE_PERCENT = 10

export interface WeaponDefinition {
  itemType: ItemType
  minKills: number
  maxKills: number
  killChancePercent: number
  consumesOnUse: boolean
  breakChancePercent?: number
  brokenType?: ItemType
  apCost: number
  requiresPositiveAp: boolean
  confidence: 'confirmed' | 'approximate'
}

export const WEAPONS: Partial<Record<ItemType, WeaponDefinition>> = {
  water_bomb: { itemType: 'water_bomb', minKills: 1, maxKills: 5, killChancePercent: 100, consumesOnUse: true, apCost: 0, requiresPositiveAp: true, confidence: 'confirmed' },
  human_bone: { itemType: 'human_bone', minKills: 1, maxKills: 1, killChancePercent: 30, consumesOnUse: false, breakChancePercent: 50, brokenType: 'broken_human_bone', apCost: 0, requiresPositiveAp: true, confidence: 'approximate' },
  pathetic_penknife: { itemType: 'pathetic_penknife', minKills: 1, maxKills: 1, killChancePercent: 30, consumesOnUse: false, breakChancePercent: 50, brokenType: 'broken_pathetic_penknife', apCost: 0, requiresPositiveAp: true, confidence: 'approximate' },
  staff: { itemType: 'staff', minKills: 1, maxKills: 1, killChancePercent: 50, consumesOnUse: false, breakChancePercent: 40, brokenType: 'broken_staff', apCost: 0, requiresPositiveAp: true, confidence: 'approximate' },
  serrated_knife: { itemType: 'serrated_knife', minKills: 1, maxKills: 1, killChancePercent: 50, consumesOnUse: false, breakChancePercent: 33, brokenType: 'broken_serrated_knife', apCost: 0, requiresPositiveAp: true, confidence: 'approximate' },
  machete: { itemType: 'machete', minKills: 2, maxKills: 2, killChancePercent: 100, consumesOnUse: false, breakChancePercent: 20, brokenType: 'broken_machete', apCost: 0, requiresPositiveAp: true, confidence: 'approximate' },
}

export function weaponDefinition(type: ItemType): WeaponDefinition | null { return WEAPONS[type] ?? null }
export function isWeapon(type: ItemType): boolean { return Boolean(weaponDefinition(type)) }
export function workingWeaponTypes(): ItemType[] { return Object.keys(WEAPONS) as ItemType[] }

export function resolveBarehandedAttack(state: Pick<GameState, 'rngState'>): { kills: number; rngStateAfter: number } {
  const roll = randomInt(state.rngState, 1, 100)
  return { kills: roll.value <= BAREHANDED_KILL_CHANCE_PERCENT ? 1 : 0, rngStateAfter: roll.state }
}

export function resolveWeaponAttack(
  state: Pick<GameState, 'rngState'>,
  item: ItemInstance,
  zombiesPresent: number,
): { kills: number; consumed: boolean; brokenInto?: ItemType; rngStateAfter: number } {
  const definition = weaponDefinition(item.type)
  if (!definition) throw new Error(`${item.type} is not a weapon`)
  let next = state.rngState
  const killRoll = randomInt(next, 1, 100)
  next = killRoll.state
  let kills = 0
  if (killRoll.value <= definition.killChancePercent) {
    const amount = randomInt(next, definition.minKills, definition.maxKills)
    next = amount.state
    kills = Math.min(zombiesPresent, amount.value)
  }
  let brokenInto: ItemType | undefined
  if (!definition.consumesOnUse && definition.breakChancePercent && definition.brokenType) {
    const breakRoll = randomInt(next, 1, 100)
    next = breakRoll.state
    if (breakRoll.value <= definition.breakChancePercent) brokenInto = definition.brokenType
  }
  return { kills, consumed: definition.consumesOnUse, brokenInto, rngStateAfter: next }
}
