export type CitizenControllerKind = 'human' | 'basic-bot'

export type ItemType = 'rotten_log' | 'scrap_metal' | 'water_ration' | 'food' | 'old_door'

export interface ItemInstance {
  id: string
  type: ItemType
}

export type CitizenLocation =
  | { type: 'town' }
  | { type: 'world'; x: number; y: number }

export interface Citizen {
  id: string
  name: string
  controller: CitizenControllerKind
  alive: boolean
  ap: number
  maxAp: number
  location: CitizenLocation
  inventory: ItemInstance[]
  inventoryCapacity: number
}

export interface WorldZone {
  x: number
  y: number
  discovered: boolean
  zombies: number
  searchesRemaining: number
  searchedBy: string[]
  hiddenLoot: ItemType[]
  groundItems: ItemInstance[]
}

export interface WorldState {
  minX: number
  maxX: number
  minY: number
  maxY: number
  zones: Record<string, WorldZone>
}

export interface TownState {
  gateOpen: boolean
  defense: number
  bank: Partial<Record<ItemType, number>>
}

export interface NightReport {
  day: number
  attackStrength: number
  defenseBeforeAttack: number
  effectiveDefense: number
  gateOpen: boolean
  breached: boolean
  outsideDeaths: number
}

export interface GameState {
  schemaVersion: 2
  gameId: string
  seed: number
  rngState: number
  nextItemId: number
  day: number
  citizens: Citizen[]
  town: TownState
  world: WorldState
  lastNight: NightReport | null
  events: GameEvent[]
}

export type Direction = 'NORTH' | 'SOUTH' | 'EAST' | 'WEST'

export type GameCommand =
  | { type: 'OPEN_GATE'; citizenId: string }
  | { type: 'CLOSE_GATE'; citizenId: string }
  | { type: 'EXIT_TOWN'; citizenId: string }
  | { type: 'ENTER_TOWN'; citizenId: string }
  | { type: 'MOVE'; citizenId: string; direction: Direction }
  | { type: 'SEARCH_ZONE'; citizenId: string }
  | { type: 'PICK_UP_ITEM'; citizenId: string; itemId: string }
  | { type: 'DEPOSIT_ITEM'; citizenId: string; itemId: string }

export type DeathReason = 'outside_at_night'

export type GameEvent =
  | { type: 'AP_SPENT'; day: number; citizenId: string; amount: number }
  | { type: 'GATE_SET'; day: number; open: boolean; citizenId: string }
  | { type: 'CITIZEN_LOCATION_CHANGED'; day: number; citizenId: string; location: CitizenLocation }
  | { type: 'ZONE_DISCOVERED'; day: number; zoneKey: string }
  | { type: 'ZONE_SEARCHED'; day: number; zoneKey: string; citizenId: string; item: ItemInstance | null }
  | { type: 'ITEM_PICKED_UP'; day: number; citizenId: string; zoneKey: string; item: ItemInstance }
  | { type: 'ITEM_DEPOSITED'; day: number; citizenId: string; item: ItemInstance }
  | { type: 'CITIZEN_DIED'; day: number; citizenId: string; reason: DeathReason }
  | { type: 'NIGHT_RESOLVED'; day: number; report: NightReport }
  | { type: 'DAY_STARTED'; day: number }
