import { isWeapon, weaponDefinition, workingWeaponTypes } from '../../core/combat'
import type { BotMissionPurpose, Citizen, GameState, ItemType } from '../../core/types'
import { citizenNumber } from '../AgentIdentity'
import { evaluateTownNeeds } from './TownNeeds'

export type WaterPolicy = 'normal' | 'cautious' | 'critical'
export type SupplyDisposition = 'community' | 'balanced' | 'hoarder'
export type ExpeditionPurpose = BotMissionPurpose

export interface ExpeditionLoadout {
  water: boolean
  food: boolean
  weapon: boolean
  weaponType: ItemType | null
  reservedLootSlots: number
  potentialAp: number
  wellWaterAllowed: boolean
}

export interface LoadoutOptions { overnight?: boolean }

export function waterPolicyForState(state: GameState): WaterPolicy {
  const ratio = evaluateTownNeeds(state).waterPerCitizen
  if (ratio > 2) return 'normal'
  if (ratio >= 1) return 'cautious'
  return 'critical'
}

export function supplyDispositionForCitizen(citizenId: string): SupplyDisposition {
  const roll = citizenNumber(citizenId) % 3
  return roll === 0 ? 'community' : roll === 1 ? 'balanced' : 'hoarder'
}

function inventoryHas(citizen: Citizen, type: ItemType): boolean {
  return citizen.inventory.some((item) => item.type === type)
}

function homeHas(citizen: Citizen, type: ItemType): boolean {
  return citizen.home.storage.some((item) => item.type === type)
}

function accessibleHas(citizen: Citizen, type: ItemType): boolean {
  return inventoryHas(citizen, type) || (citizen.location.type === 'town' && homeHas(citizen, type))
}

function hasFoodPotential(citizen: Citizen, state: GameState): boolean {
  return accessibleHas(citizen, 'food')
    || (citizen.location.type === 'town'
      && (citizen.home.storage.some((item) => item.type === 'doggy_bag') || (state.town.bank.food ?? 0) > 0))
}

function hasWaterPotential(citizen: Citizen, state: GameState): boolean {
  return accessibleHas(citizen, 'water_ration')
    || (citizen.location.type === 'town'
      && ((state.town.bank.water_ration ?? 0) > 0 || state.town.well.water > 0))
}

function waterCanRefreshAp(citizen: Citizen): boolean {
  return !citizen.daily.drank && citizen.status.hydration !== 'dehydrated'
}

function availableWeapon(citizen: Citizen, state: GameState, targetZombies: number): ItemType | null {
  const available = workingWeaponTypes().filter((type) =>
    accessibleHas(citizen, type)
    || (citizen.location.type === 'town' && (state.town.bank[type] ?? 0) > 0))
  if (!available.length) return null

  const score = (type: ItemType) => {
    const definition = weaponDefinition(type)!
    const crowd = definition.maxKills * 100
    const reliability = definition.killChancePercent
    const scarcity = type === 'water_bomb' && targetZombies < 5 ? -300 : 0
    return crowd + reliability + scarcity
  }
  return [...available].sort((a, b) => score(b) - score(a))[0] ?? null
}

export function canUseWellForPurpose(state: GameState, citizenId: string, purpose: ExpeditionPurpose): boolean {
  const policy = waterPolicyForState(state)
  if (policy === 'normal') return true
  if (policy === 'critical') return purpose === 'rescue'
  return purpose === 'rescue' || (purpose === 'gather_construction' && citizenNumber(citizenId) % 5 === 0)
}

export function planLoadout(
  state: GameState,
  citizen: Citizen,
  purpose: ExpeditionPurpose,
  requiredAp: number,
  targetZombies: number,
  options: LoadoutOptions = {},
): ExpeditionLoadout {
  let potentialAp = citizen.ap
  let water = false
  let food = false
  const hydrationEmergency = citizen.status.hydration !== 'normal'
  const policy = waterPolicyForState(state)
  const overnight = Boolean(options.overnight)
  const wellWaterAllowed = citizen.location.type === 'town'
    && (hydrationEmergency || canUseWellForPurpose(state, citizen.id, purpose) || (overnight && policy !== 'critical'))
  const waterAccessible = hasWaterPotential(citizen, state)
    && (accessibleHas(citizen, 'water_ration')
      || (citizen.location.type === 'town' && ((state.town.bank.water_ration ?? 0) > 0 || wellWaterAllowed)))

  if ((overnight || hydrationEmergency || requiredAp > potentialAp) && waterAccessible) {
    water = true
    if (waterCanRefreshAp(citizen)) potentialAp += citizen.maxAp
  }
  if (requiredAp > potentialAp && !citizen.daily.ate && hasFoodPotential(citizen, state)) {
    food = true
    potentialAp += citizen.maxAp
  }

  let weaponType = (targetZombies > 2 || purpose === 'rescue')
    ? availableWeapon(citizen, state, targetZombies)
    : null
  let weapon = Boolean(weaponType)
  let supplies = Number(water) + Number(food) + Number(weapon)
  if (citizen.inventoryCapacity - supplies < 2 && weapon && targetZombies <= 4 && purpose !== 'rescue') {
    weapon = false
    weaponType = null
    supplies -= 1
  }
  if (citizen.inventoryCapacity - supplies < 1 && food) {
    food = false
    potentialAp -= citizen.maxAp
    supplies -= 1
  }

  const reservedLootSlots = Math.max(1, citizen.inventoryCapacity - supplies)
  return { water, food, weapon, weaponType, reservedLootSlots, potentialAp, wellWaterAllowed }
}

export function shouldUseRefill(citizen: Citizen, remainingRequiredAp: number, kind: 'food' | 'water'): boolean {
  if (kind === 'water' && citizen.status.hydration !== 'normal') return true
  if (kind === 'food' && citizen.daily.ate) return false
  if (kind === 'water' && citizen.daily.drank) return false
  return citizen.ap <= 1 && remainingRequiredAp > citizen.ap
}

export function townWeaponCount(state: GameState): number {
  return workingWeaponTypes().reduce((sum, type) => sum + (state.town.bank[type] ?? 0), 0)
}

export function usableCarriedWeapon(citizen: Citizen): boolean {
  return citizen.inventory.some((item) => isWeapon(item.type))
}
