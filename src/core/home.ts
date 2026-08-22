import type { CitizenDailyState, CitizenHome } from './types'

export const BASE_HOME_STORAGE = 4

export function createDailyState(): CitizenDailyState {
  return { ate: false, drank: false, waterTaken: false }
}

export function createStarterHome(citizenId: string): CitizenHome {
  return {
    level: 'camp_bed',
    defense: 0,
    storageCapacity: BASE_HOME_STORAGE,
    storage: [
      { id: `starter-${citizenId}-doggy`, type: 'doggy_bag' },
      { id: `starter-${citizenId}-welcome`, type: 'citizen_welcome_pack' },
    ],
  }
}
