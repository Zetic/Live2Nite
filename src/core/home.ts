import { homeDefenseBonus } from './construction'
import { homeDefenseFor } from './items'
import type { Citizen, CitizenDailyState, CitizenHome, GameState, HomeLevel } from './types'

export const BASE_HOME_STORAGE = 4
export const HOME_UPGRADE_AP_COST = 2

export interface HomeLevelDefinition {
  level: HomeLevel
  name: string
  defense: number
}

export const HOME_LEVELS: Record<HomeLevel, HomeLevelDefinition> = {
  camp_bed: { level: 'camp_bed', name: 'Camp Bed', defense: 0 },
  tent: { level: 'tent', name: 'Tent', defense: 1 },
}

export function createDailyState(): CitizenDailyState {
  return { ate: false, drank: false, waterTaken: false }
}

export function createStarterHome(citizenId: string): CitizenHome {
  return {
    level: 'camp_bed',
    defense: HOME_LEVELS.camp_bed.defense,
    storageCapacity: BASE_HOME_STORAGE,
    storage: [
      { id: `starter-${citizenId}-doggy`, type: 'doggy_bag' },
      { id: `starter-${citizenId}-welcome`, type: 'citizen_welcome_pack' },
    ],
  }
}

export function homeName(level: HomeLevel): string { return HOME_LEVELS[level].name }

export function nextHomeLevel(level: HomeLevel): HomeLevel | null {
  return level === 'camp_bed' ? 'tent' : null
}

export function personalDefense(citizen: Citizen, state?: GameState): number {
  return citizen.home.defense
    + (state ? homeDefenseBonus(state) : 0)
    + citizen.home.storage.reduce((sum, item) => sum + homeDefenseFor(item.type), 0)
}
