export type CitizenControllerKind = 'human' | 'basic-bot'

export type ItemType =
  | 'rotten_log'
  | 'scrap_metal'
  | 'water_ration'
  | 'food'
  | 'old_door'
  | 'twisted_plank'
  | 'wrought_iron'
  | 'unshaped_concrete_block'

export type ConstructionId = 'workshop' | 'watchtower'
export type WorkshopRecipeId = 'logs_to_planks' | 'scrap_to_iron'

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

export interface ConstructionProjectState {
  id: ConstructionId
  apContributed: number
  completed: boolean
}

export interface TownState {
  gateOpen: boolean
  defense: number
  bank: Partial<Record<ItemType, number>>
  construction: Record<ConstructionId, ConstructionProjectState>
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
  schemaVersion: 3
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
  | { type: 'CONTRIBUTE_CONSTRUCTION'; citizenId: string; projectId: ConstructionId }
  | { type: 'WORKSHOP_CONVERT'; citizenId: string; recipeId: WorkshopRecipeId }

export type DeathReason = 'outside_at_night'

export type GameEvent =
  | { type: 'AP_SPENT'; day: number; citizenId: string; amount: number }
  | { type: 'GATE_SET'; day: number; open: boolean; citizenId: string }
  | { type: 'CITIZEN_LOCATION_CHANGED'; day: number; citizenId: string; location: CitizenLocation }
  | { type: 'ZONE_DISCOVERED'; day: number; zoneKey: string }
  | { type: 'ZONE_SEARCHED'; day: number; zoneKey: string; citizenId: string; item: ItemInstance | null }
  | { type: 'ITEM_PICKED_UP'; day: number; citizenId: string; zoneKey: string; item: ItemInstance }
  | { type: 'ITEM_DEPOSITED'; day: number; citizenId: string; item: ItemInstance }
  | { type: 'CONSTRUCTION_AP_CONTRIBUTED'; day: number; citizenId: string; projectId: ConstructionId; amount: number }
  | {
      type: 'CONSTRUCTION_COMPLETED'
      day: number
      citizenId: string
      projectId: ConstructionId
      consumed: Partial<Record<ItemType, number>>
      defenseBonus: number
    }
  | {
      type: 'WORKSHOP_CONVERTED'
      day: number
      citizenId: string
      recipeId: WorkshopRecipeId
      input: ItemType
      inputCount: number
      output: ItemType
      outputCount: number
    }
  | { type: 'CITIZEN_DIED'; day: number; citizenId: string; reason: DeathReason }
  | { type: 'NIGHT_RESOLVED'; day: number; report: NightReport }
  | { type: 'DAY_STARTED'; day: number }
