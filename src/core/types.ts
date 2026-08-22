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
  | 'water_bomb'
  | 'doggy_bag'
  | 'citizen_welcome_pack'
  | 'battery'
  | 'box_of_matches'
  | 'pharmaceutical_products'

export type ConstructionId = 'workshop' | 'watchtower'
export type WorkshopRecipeId = 'logs_to_planks' | 'scrap_to_iron'
export type HomeLevel = 'camp_bed' | 'tent'
export type ItemStorage = 'inventory' | 'home'
export type ConsumableKind = 'food' | 'water'
export type SearchMode = 'normal' | 'depleted'
export type CombatMethod = 'fists' | ItemType

export interface ItemInstance {
  id: string
  type: ItemType
}

export type CitizenLocation =
  | { type: 'town' }
  | { type: 'world'; x: number; y: number }

export interface CitizenHome {
  level: HomeLevel
  defense: number
  storage: ItemInstance[]
  storageCapacity: number
}

export interface CitizenDailyState {
  ate: boolean
  drank: boolean
  waterTaken: boolean
}

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
  home: CitizenHome
  daily: CitizenDailyState
}

export interface WorldZone {
  x: number
  y: number
  discovered: boolean
  zombies: number
  searchesRemaining: number
  searchedBy: string[]
  depletedSearchedBy: string[]
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

export interface TownWellState {
  water: number
}

export interface TownState {
  gateOpen: boolean
  defense: number
  bank: Partial<Record<ItemType, number>>
  construction: Record<ConstructionId, ConstructionProjectState>
  well: TownWellState
}

export interface HomeAttackOutcome {
  citizenId: string
  zombies: number
  defense: number
  survived: boolean
}

export interface NightReport {
  day: number
  attackStrength: number
  defenseBeforeAttack: number
  effectiveDefense: number
  gateOpen: boolean
  breached: boolean
  outsideDeaths: number
  zombiesInside?: number
  homeDeaths?: number
  homeAttacks?: HomeAttackOutcome[]
}

export interface GameState {
  schemaVersion: 5
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
  | { type: 'ATTACK_BAREHANDED'; citizenId: string }
  | { type: 'USE_WEAPON'; citizenId: string; itemId: string }
  | { type: 'DEPOSIT_ITEM'; citizenId: string; itemId: string }
  | { type: 'WITHDRAW_BANK_ITEM'; citizenId: string; itemType: ItemType }
  | { type: 'MOVE_ITEM_TO_HOME'; citizenId: string; itemId: string }
  | { type: 'MOVE_ITEM_TO_RUCKSACK'; citizenId: string; itemId: string }
  | { type: 'OPEN_CONTAINER'; citizenId: string; itemId: string }
  | { type: 'TAKE_WATER'; citizenId: string }
  | { type: 'EAT_ITEM'; citizenId: string; itemId: string }
  | { type: 'DRINK_ITEM'; citizenId: string; itemId: string }
  | { type: 'UPGRADE_HOME'; citizenId: string }
  | { type: 'CONTRIBUTE_CONSTRUCTION'; citizenId: string; projectId: ConstructionId }
  | { type: 'WORKSHOP_CONVERT'; citizenId: string; recipeId: WorkshopRecipeId }

export type DeathReason = 'outside_at_night' | 'home_breach'

export type GameEvent =
  | { type: 'AP_SPENT'; day: number; citizenId: string; amount: number }
  | { type: 'GATE_SET'; day: number; open: boolean; citizenId: string }
  | { type: 'CITIZEN_LOCATION_CHANGED'; day: number; citizenId: string; location: CitizenLocation }
  | { type: 'ZONE_DISCOVERED'; day: number; zoneKey: string }
  | {
      type: 'ZONE_SEARCHED'
      day: number
      zoneKey: string
      citizenId: string
      mode: SearchMode
      item: ItemInstance | null
      rngStateAfter?: number
    }
  | { type: 'ITEM_PICKED_UP'; day: number; citizenId: string; zoneKey: string; item: ItemInstance }
  | {
      type: 'COMBAT_RESOLVED'
      day: number
      citizenId: string
      zoneKey: string
      method: CombatMethod
      kills: number
      item: ItemInstance | null
      consumed: boolean
      rngStateAfter: number
    }
  | { type: 'ITEM_DEPOSITED'; day: number; citizenId: string; item: ItemInstance }
  | { type: 'ITEM_WITHDRAWN'; day: number; citizenId: string; item: ItemInstance }
  | { type: 'ITEM_MOVED_TO_HOME'; day: number; citizenId: string; item: ItemInstance }
  | { type: 'ITEM_MOVED_TO_RUCKSACK'; day: number; citizenId: string; item: ItemInstance }
  | {
      type: 'CONTAINER_OPENED'
      day: number
      citizenId: string
      containerId: string
      containerType: ItemType
      source: ItemStorage
      output: ItemInstance
      rngStateAfter: number
    }
  | { type: 'WATER_TAKEN'; day: number; citizenId: string; item: ItemInstance }
  | {
      type: 'ITEM_CONSUMED'
      day: number
      citizenId: string
      item: ItemInstance
      source: ItemStorage
      kind: ConsumableKind
    }
  | { type: 'HOME_UPGRADED'; day: number; citizenId: string; from: HomeLevel; to: HomeLevel; defenseAfter: number }
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
