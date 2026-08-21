export type CitizenControllerKind = 'human' | 'basic-bot'

export interface Citizen {
  id: string
  name: string
  controller: CitizenControllerKind
  alive: boolean
  ap: number
  maxAp: number
}

export interface TownState {
  water: number
  defense: number
}

export interface NightReport {
  day: number
  attackStrength: number
  defenseBeforeAttack: number
  breached: boolean
  waterConsumed: number
}

export interface GameState {
  schemaVersion: 1
  gameId: string
  seed: number
  rngState: number
  day: number
  citizens: Citizen[]
  town: TownState
  lastNight: NightReport | null
  events: GameEvent[]
}

export type GameCommand =
  | { type: 'WORK_DEFENSE'; citizenId: string }
  | { type: 'GATHER_WATER'; citizenId: string }

export type GameEvent =
  | { type: 'AP_SPENT'; day: number; citizenId: string; amount: number }
  | { type: 'DEFENSE_CHANGED'; day: number; amount: number; sourceCitizenId?: string }
  | { type: 'WATER_CHANGED'; day: number; amount: number; sourceCitizenId?: string }
  | { type: 'NIGHT_RESOLVED'; day: number; report: NightReport }
  | { type: 'DAY_STARTED'; day: number }
