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
  | 'construction_kit'
  | 'water_bomb'
  | 'human_bone'
  | 'broken_human_bone'
  | 'pathetic_penknife'
  | 'broken_pathetic_penknife'
  | 'staff'
  | 'broken_staff'
  | 'serrated_knife'
  | 'broken_serrated_knife'
  | 'machete'
  | 'broken_machete'
  | 'doggy_bag'
  | 'citizen_welcome_pack'
  | 'battery'
  | 'box_of_matches'
  | 'pharmaceutical_products'

export type ConstructionId = 'workshop' | 'watchtower' | 'pump' | 'wall_upgrade' | 'portal_lock' | 'search_tower'
export type WorkshopRecipeId =
  | 'logs_to_planks'
  | 'scrap_to_iron'
  | 'repair_human_bone'
  | 'repair_penknife'
  | 'repair_staff'
  | 'repair_serrated_knife'
  | 'repair_machete'
export type HomeLevel = 'camp_bed' | 'tent'
export type ItemStorage = 'inventory' | 'home'
export type ConsumableKind = 'food' | 'water'
export type SearchMode = 'normal' | 'depleted'
export type CombatMethod = 'fists' | ItemType
export type ClockPhase = 'day' | 'attack'
export type SpecialSiteType = 'construction_site' | 'wrecked_cars' | 'pharmacy' | 'supermarket' | 'dark_woods' | 'police_station'
export type SpecialSiteStatus = 'buried' | 'accessible' | 'depleted'
export type BotMissionPurpose = 'explore' | 'gather_construction' | 'gather_food' | 'gather_medical' | 'gather_weapons' | 'rescue'
export type BotMissionRole = 'scout' | 'gatherer' | 'excavator' | 'rescue' | 'combat'
export type BotMissionPhase = 'prepare' | 'outbound' | 'operate' | 'camp' | 'return' | 'unload'
export type HydrationStatus = 'normal' | 'thirsty' | 'dehydrated'
export type CitizenStatusId = 'exhausted' | 'satisfied_food' | 'satisfied_water' | 'thirsty' | 'dehydrated'
export type CitizenStatusChangeReason = 'desert_travel' | 'drank_water' | 'nightly_progression'
export type CampingOutlook = 'suicidal' | 'very_poor' | 'poor' | 'limited' | 'satisfactory' | 'decent'

export interface GameClock { hour: number; phase: ClockPhase }
export interface ItemInstance { id: string; type: ItemType }
export type CitizenLocation = { type: 'town' } | { type: 'world'; x: number; y: number }
export interface CitizenHome { level: HomeLevel; defense: number; storage: ItemInstance[]; storageCapacity: number }
export interface CitizenDailyState { ate: boolean; drank: boolean; waterTaken: boolean; bonusWaterTaken?: boolean }
export interface CitizenStatusState { hydration: HydrationStatus; desertStepsToday: number }
export interface CitizenCampingState { hidden:boolean; survivalChance:number|null; hiddenDay:number|null; nightsSurvived:number; lastSurvivedDay:number|null }
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
  status: CitizenStatusState
  camping: CitizenCampingState
}

export interface BotMissionAssignment {
  missionId: string
  role: BotMissionRole
  purpose: BotMissionPurpose
  target: { x: number; y: number }
  targetLabel: string
  reason: string
  phase: BotMissionPhase
  assignedDay: number
  assignedHour: number
  returnByHour: number
  safetyReserve: number
  emergency: boolean
  allowsCamping?: boolean
  overnightPlanned?: boolean
}

export interface SpecialSiteState {
  type: SpecialSiteType
  status: SpecialSiteStatus
  excavationRequired: number
  excavationProgress: number
  hiddenLoot: ItemType[]
  searchedBy: string[]
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
  campImprovements: number
  specialSite?: SpecialSiteState
}

export interface WorldState { minX: number; maxX: number; minY: number; maxY: number; zones: Record<string, WorldZone> }
export interface ConstructionProjectState { id: ConstructionId; apContributed: number; completed: boolean }
export interface TownWellState { water: number }
export interface TownState {
  gateOpen: boolean
  defense: number
  bank: Partial<Record<ItemType, number>>
  construction: Record<ConstructionId, ConstructionProjectState>
  well: TownWellState
}
export interface HomeAttackOutcome { citizenId: string; zombies: number; defense: number; survived: boolean }
export interface NightReport {
  day: number
  attackStrength: number
  defenseBeforeAttack: number
  effectiveDefense: number
  gateOpen: boolean
  breached: boolean
  outsideDeaths: number
  campingSurvivors?: number
  campingDeaths?: number
  zombiesInside?: number
  homeDeaths?: number
  dehydrationDeaths?: number
  homeAttacks?: HomeAttackOutcome[]
}

export interface GameState {
  schemaVersion: 11
  gameId: string
  seed: number
  rngState: number
  nextItemId: number
  day: number
  clock: GameClock
  citizens: Citizen[]
  botMissions: Record<string, BotMissionAssignment>
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
  | { type: 'EXCAVATE_SPECIAL_SITE'; citizenId: string }
  | { type: 'SEARCH_SPECIAL_SITE'; citizenId: string }
  | { type: 'PICK_UP_ITEM'; citizenId: string; itemId: string }
  | { type: 'ATTACK_BAREHANDED'; citizenId: string }
  | { type: 'USE_WEAPON'; citizenId: string; itemId: string }
  | { type: 'IMPROVE_CAMP'; citizenId: string }
  | { type: 'HIDE_FOR_NIGHT'; citizenId: string }
  | { type: 'LEAVE_HIDEOUT'; citizenId: string }
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

export type DeathReason = 'outside_at_night' | 'camping_failure' | 'home_breach' | 'dehydration'

export type GameEvent = (
  | { type: 'AP_SPENT'; day: number; citizenId: string; amount: number }
  | { type: 'GATE_SET'; day: number; open: boolean; citizenId: string }
  | { type: 'CITIZEN_LOCATION_CHANGED'; day: number; citizenId: string; location: CitizenLocation; desertStep?: boolean }
  | { type: 'CITIZEN_STATUS_CHANGED'; day: number; citizenId: string; status: CitizenStatusState; reason: CitizenStatusChangeReason }
  | { type: 'CAMP_IMPROVED'; day:number; citizenId:string; zoneKey:string; amount:number }
  | { type: 'CAMP_IMPROVEMENTS_DECAYED'; day:number; zoneKey:string; amount:number }
  | { type: 'CITIZEN_HIDING_SET'; day:number; citizenId:string; hidden:boolean; survivalChance:number|null }
  | { type: 'CAMPING_RESOLVED'; day:number; citizenId:string; survivalChance:number; roll:number; survived:boolean }
  | { type: 'ZONE_DISCOVERED'; day: number; zoneKey: string }
  | { type: 'ZONE_SEARCHED'; day: number; zoneKey: string; citizenId: string; mode: SearchMode; item: ItemInstance | null; automatic?: boolean; rngStateAfter?: number }
  | { type: 'ZONE_REPLENISHED'; day: number; zoneKey: string; loot: ItemType }
  | { type: 'SPECIAL_SITE_EXCAVATED'; day: number; zoneKey: string; citizenId: string; amount: number }
  | { type: 'SPECIAL_SITE_SEARCHED'; day: number; zoneKey: string; citizenId: string; item: ItemInstance | null }
  | { type: 'ITEM_PICKED_UP'; day: number; citizenId: string; zoneKey: string; item: ItemInstance }
  | { type: 'COMBAT_RESOLVED'; day: number; citizenId: string; zoneKey: string; method: CombatMethod; kills: number; item: ItemInstance | null; consumed: boolean; brokenInto?: ItemType; rngStateAfter: number }
  | { type: 'ITEM_DEPOSITED'; day: number; citizenId: string; item: ItemInstance }
  | { type: 'ITEM_WITHDRAWN'; day: number; citizenId: string; item: ItemInstance }
  | { type: 'ITEM_MOVED_TO_HOME'; day: number; citizenId: string; item: ItemInstance }
  | { type: 'ITEM_MOVED_TO_RUCKSACK'; day: number; citizenId: string; item: ItemInstance }
  | { type: 'CONTAINER_OPENED'; day: number; citizenId: string; containerId: string; containerType: ItemType; source: ItemStorage; output: ItemInstance; rngStateAfter: number }
  | { type: 'CONSTRUCTION_KIT_OPENED'; day: number; citizenId: string; containerId: string; source: ItemStorage; outputs: ItemInstance[]; rngStateAfter: number }
  | { type: 'WATER_TAKEN'; day: number; citizenId: string; item: ItemInstance }
  | { type: 'ITEM_CONSUMED'; day: number; citizenId: string; item: ItemInstance; source: ItemStorage; kind: ConsumableKind; restoresAp: boolean }
  | { type: 'HOME_UPGRADED'; day: number; citizenId: string; from: HomeLevel; to: HomeLevel; defenseAfter: number }
  | { type: 'CONSTRUCTION_AP_CONTRIBUTED'; day: number; citizenId: string; projectId: ConstructionId; amount: number }
  | { type: 'CONSTRUCTION_COMPLETED'; day: number; citizenId: string; projectId: ConstructionId; consumed: Partial<Record<ItemType, number>>; defenseBonus: number }
  | { type: 'WORKSHOP_CONVERTED'; day: number; citizenId: string; recipeId: WorkshopRecipeId; input: ItemType; inputCount: number; output: ItemType; outputCount: number }
  | { type: 'BOT_MISSION_ASSIGNED'; day: number; citizenId: string; mission: BotMissionAssignment }
  | { type: 'BOT_MISSION_PHASE_SET'; day: number; citizenId: string; missionId: string; phase: BotMissionPhase }
  | { type: 'BOT_MISSION_CLEARED'; day: number; citizenId: string; missionId: string; outcome: 'completed' | 'aborted' }
  | { type: 'CITIZEN_DIED'; day: number; citizenId: string; reason: DeathReason }
  | { type: 'NIGHT_RESOLVED'; day: number; report: NightReport }
  | { type: 'DAY_STARTED'; day: number }
  | { type: 'TIME_ADVANCED'; day: number; fromHour: number; toHour: number; phase: ClockPhase }
) & { hour?: number }
