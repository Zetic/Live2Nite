import type { ConstructionId } from './constructionIds'
import type { ItemState, ItemType } from './itemCatalog'
export type { ConstructionId } from './constructionIds'
export type { ItemAssemblyState, ItemCondition, ItemContamination, ItemDisplayCategory, ItemState, ItemType } from './itemCatalog'

export type CitizenControllerKind = 'human' | 'basic-bot'
export type WorkshopRecipeId =
  | 'logs_to_planks'
  | 'quality_log_to_planks'
  | 'scrap_to_iron'
  | 'sheet_metal_bits_to_sheet_metal'
  | 'planks_to_beams'
  | 'beams_to_planks'
  | 'iron_to_supports'
  | 'supports_to_iron'
  | 'dismantle_electronic_device'
  | 'dismantle_mechanism'
  | 'repair_repair_kit'
export type CombinationRecipeId =
  | 'assemble_telescope'
  | 'assemble_guitar'
  | 'assemble_repair_kit'
  | 'assemble_engine'
  | 'assemble_claymore'
  | 'assemble_torch'
  | 'assemble_hacksaw'
  | 'prepare_spicy_noodles'
  | 'mix_concrete'
  | 'fill_water_bomb'
  | 'reload_water_pistol'
  | 'refill_water_cooler'
  | 'reload_battery_launcher'
  | 'repair_human_bone'
  | 'repair_penknife'
  | 'repair_staff'
  | 'repair_serrated_knife'
  | 'repair_machete'
  | 'repair_adjustable_spanner'
  | 'repair_screwdriver'
  | 'repair_swiss_army_knife'
  | 'repair_box_cutter'
  | 'repair_chain'
  | 'repair_can_opener'
  | 'repair_ektorp_gluten_chair'
  | 'repair_pc_base_unit'
  | 'kwik_fix_human_bone'
  | 'kwik_fix_penknife'
  | 'kwik_fix_staff'
  | 'kwik_fix_serrated_knife'
  | 'kwik_fix_machete'
  | 'kwik_fix_adjustable_spanner'
  | 'kwik_fix_screwdriver'
  | 'kwik_fix_swiss_army_knife'
  | 'kwik_fix_box_cutter'
  | 'kwik_fix_chain'
  | 'kwik_fix_can_opener'
  | 'kwik_fix_ektorp_gluten_chair'
  | 'kwik_fix_pc_base_unit'
export type HomeLevel = 'camp_bed' | 'tent' | 'hovel' | 'shack' | 'house' | 'fenced_house' | 'fortified_shelter' | 'bunker' | 'castle'
export type HomeImprovementId = 'reinforcements' | 'fence' | 'storage'
export type ItemStorage = 'inventory' | 'home' | 'ground'
export type PersonalItemStorage = 'inventory' | 'home'
export type ConsumableKind = 'food' | 'water'
export type SearchMode = 'normal' | 'depleted'
export type CombatMethod = 'fists' | ItemType
export type ClockPhase = 'day' | 'attack'
export type SpecialSiteType = 'construction_site' | 'wrecked_cars' | 'pharmacy' | 'supermarket' | 'dark_woods' | 'police_station'
export type SpecialSiteStatus = 'buried' | 'accessible' | 'depleted'
export type BotMissionPurpose = 'explore' | 'gather_construction' | 'gather_food' | 'gather_medical' | 'gather_weapons' | 'rescue'
export type BotMissionRole = 'scout' | 'gatherer' | 'excavator' | 'rescue' | 'combat'
export type BotMissionPhase = 'prepare' | 'outbound' | 'operate' | 'camp' | 'return' | 'unload'
export type ScoutMissionKind = 'frontier' | 'recon'
export type HydrationStatus = 'normal' | 'thirsty' | 'dehydrated'
export type CitizenStatusId = 'exhausted' | 'satisfied_food' | 'satisfied_water' | 'thirsty' | 'dehydrated'
export type CitizenStatusChangeReason = 'desert_travel' | 'drank_water' | 'nightly_progression'
export type CampingOutlook = 'suicidal' | 'very_poor' | 'poor' | 'limited' | 'satisfactory' | 'decent'
export type ZoneIntelFreshness = 'fresh' | 'stale' | 'unknown'
export type ZoneControlState = 'secure' | 'fragile' | 'temporary' | 'trapped'
export type CoordinationCommitmentKind = 'gate_primary' | 'gate_backup' | 'construction'

export interface GameClock { hour: number; phase: ClockPhase }
export interface ItemInstance { id: string; type: ItemType; state?: ItemState }
export type CitizenLocation = { type: 'town' } | { type: 'world'; x: number; y: number }
export interface CitizenHome { level:HomeLevel; defense:number; storage:ItemInstance[]; storageCapacity:number; upgradedDay:number|null; improvements:Record<HomeImprovementId,number> }
export interface CitizenDailyState { ate:boolean; drank:boolean; waterTaken:boolean; bonusWaterTaken?:boolean }
export interface CitizenStatusState { hydration:HydrationStatus; desertStepsToday:number }
export interface CitizenCampingState { hidden:boolean; survivalChance:number|null; hiddenDay:number|null; nightsSurvived:number; lastSurvivedDay:number|null }
export interface TemporaryControlState { zoneKey:string; grantedDay:number; grantedHour:number }
export interface Citizen { id:string; name:string; controller:CitizenControllerKind; alive:boolean; ap:number; maxAp:number; location:CitizenLocation; inventory:ItemInstance[]; inventoryCapacity:number; home:CitizenHome; daily:CitizenDailyState; status:CitizenStatusState; camping:CitizenCampingState; temporaryControl:TemporaryControlState|null }
export interface BotMissionAssignment { missionId:string; role:BotMissionRole; purpose:BotMissionPurpose; target:{x:number;y:number}; targetLabel:string; reason:string; phase:BotMissionPhase; assignedDay:number; assignedHour:number; returnByHour:number; safetyReserve:number; emergency:boolean; allowsCamping?:boolean; overnightPlanned?:boolean; scoutKind?:ScoutMissionKind; searchMode?:SearchMode }
export interface CoordinationCommitment { id:string; citizenId:string; kind:CoordinationCommitmentKind; taskKey:string; label:string; reservedAp:number; day:number; hour:number; expiresHour:number; projectId?:ConstructionId }
export interface TownCoordinationState { commitments:CoordinationCommitment[] }
export interface SpecialSiteState { type:SpecialSiteType; status:SpecialSiteStatus; excavationRequired:number; excavationProgress:number; hiddenLoot:ItemType[]; searchedBy:string[] }
export interface WorldZone { x:number; y:number; discovered:boolean; zombies:number; searchesRemaining:number; searchedBy:string[]; depletedSearchedBy:string[]; hiddenLoot:ItemType[]; groundItems:ItemInstance[]; campImprovements:number; specialSite?:SpecialSiteState }
export interface ZoneIntelState { observedZombies:number|null; lastObservedDay:number|null; lastObservedHour:number|null }
export interface WorldState { minX:number; maxX:number; minY:number; maxY:number; zones:Record<string,WorldZone>; intel:Record<string,ZoneIntelState> }
export interface ConstructionProjectState { id:ConstructionId; apContributed:number; completed:boolean }
export interface TownWellState { water:number }
export interface TownState { gateOpen:boolean; defense:number; bank:ItemInstance[]; construction:Record<ConstructionId,ConstructionProjectState>; well:TownWellState }
export interface HomeAttackOutcome { citizenId:string; zombies:number; defense:number; survived:boolean }
export interface NightReport { day:number; attackStrength:number; defenseBeforeAttack:number; effectiveDefense:number; gateOpen:boolean; breached:boolean; outsideDeaths:number; campingSurvivors?:number; campingDeaths?:number; zombiesInside?:number; homeDeaths?:number; dehydrationDeaths?:number; homeAttacks?:HomeAttackOutcome[] }
export interface WorldZombieChange { zoneKey:string; before:number; after:number }
export interface GameState { schemaVersion:16; gameId:string; seed:number; rngState:number; nextItemId:number; day:number; clock:GameClock; citizens:Citizen[]; botMissions:Record<string,BotMissionAssignment>; coordination:TownCoordinationState; town:TownState; world:WorldState; lastNight:NightReport|null; events:GameEvent[] }

export type Direction='NORTH'|'SOUTH'|'EAST'|'WEST'
export type GameCommand =
  | {type:'OPEN_GATE';citizenId:string}
  | {type:'CLOSE_GATE';citizenId:string}
  | {type:'EXIT_TOWN';citizenId:string}
  | {type:'ENTER_TOWN';citizenId:string}
  | {type:'MOVE';citizenId:string;direction:Direction}
  | {type:'SEARCH_ZONE';citizenId:string}
  | {type:'EXCAVATE_SPECIAL_SITE';citizenId:string}
  | {type:'SEARCH_SPECIAL_SITE';citizenId:string}
  | {type:'PICK_UP_ITEM';citizenId:string;itemId:string}
  | {type:'DROP_ITEM';citizenId:string;itemId:string}
  | {type:'ATTACK_BAREHANDED';citizenId:string}
  | {type:'USE_WEAPON';citizenId:string;itemId:string}
  | {type:'IMPROVE_CAMP';citizenId:string}
  | {type:'HIDE_FOR_NIGHT';citizenId:string}
  | {type:'LEAVE_HIDEOUT';citizenId:string}
  | {type:'DEPOSIT_ITEM';citizenId:string;itemId:string}
  | {type:'WITHDRAW_BANK_ITEM';citizenId:string;itemId:string}
  | {type:'MOVE_ITEM_TO_HOME';citizenId:string;itemId:string}
  | {type:'MOVE_ITEM_TO_RUCKSACK';citizenId:string;itemId:string}
  | {type:'OPEN_CONTAINER';citizenId:string;itemId:string}
  | {type:'TAKE_WATER';citizenId:string}
  | {type:'EAT_ITEM';citizenId:string;itemId:string}
  | {type:'DRINK_ITEM';citizenId:string;itemId:string}
  | {type:'UPGRADE_HOME';citizenId:string}
  | {type:'BUILD_HOME_IMPROVEMENT';citizenId:string;improvementId:HomeImprovementId}
  | {type:'CONTRIBUTE_CONSTRUCTION';citizenId:string;projectId:ConstructionId}
  | {type:'WORKSHOP_CONVERT';citizenId:string;recipeId:WorkshopRecipeId}
  | {type:'COMBINE_ITEMS';citizenId:string;recipeId:CombinationRecipeId;itemIds:string[]}

export interface CombinationEventOutput { item:ItemInstance; storage:PersonalItemStorage }
export type DeathReason='outside_at_night'|'camping_failure'|'home_breach'|'dehydration'
export type GameEvent = (
  | {type:'AP_SPENT';day:number;citizenId:string;amount:number}
  | {type:'GATE_SET';day:number;open:boolean;citizenId:string}
  | {type:'CITIZEN_LOCATION_CHANGED';day:number;citizenId:string;location:CitizenLocation;desertStep?:boolean}
  | {type:'CITIZEN_STATUS_CHANGED';day:number;citizenId:string;status:CitizenStatusState;reason:CitizenStatusChangeReason}
  | {type:'CAMP_IMPROVED';day:number;citizenId:string;zoneKey:string;amount:number}
  | {type:'CAMP_IMPROVEMENTS_DECAYED';day:number;zoneKey:string;amount:number}
  | {type:'CITIZEN_HIDING_SET';day:number;citizenId:string;hidden:boolean;survivalChance:number|null}
  | {type:'CAMPING_RESOLVED';day:number;citizenId:string;survivalChance:number;roll:number;survived:boolean}
  | {type:'ZONE_DISCOVERED';day:number;zoneKey:string}
  | {type:'ZONE_OBSERVED';day:number;zoneKey:string;zombies:number;citizenId?:string}
  | {type:'WORLD_ZOMBIES_EVOLVED';day:number;changes:WorldZombieChange[]}
  | {type:'ZONE_CONTROL_LOST';day:number;zoneKey:string;causedByCitizenId:string;remainingCitizenIds:string[]}
  | {type:'TEMPORARY_CONTROL_GRANTED';day:number;citizenId:string;zoneKey:string}
  | {type:'TEMPORARY_CONTROL_EXPIRED';day:number;citizenId:string;zoneKey:string}
  | {type:'ZONE_CONTROL_RESTORED';day:number;zoneKey:string;reason:'arrival'|'combat'}
  | {type:'ZONE_SEARCHED';day:number;zoneKey:string;citizenId:string;mode:SearchMode;item:ItemInstance|null;automatic?:boolean;rngStateAfter?:number}
  | {type:'ZONE_REPLENISHED';day:number;zoneKey:string;loot:ItemType}
  | {type:'SPECIAL_SITE_EXCAVATED';day:number;zoneKey:string;citizenId:string;amount:number}
  | {type:'SPECIAL_SITE_SEARCHED';day:number;zoneKey:string;citizenId:string;item:ItemInstance|null}
  | {type:'ITEM_PICKED_UP';day:number;citizenId:string;zoneKey:string;item:ItemInstance}
  | {type:'ITEM_DROPPED';day:number;citizenId:string;zoneKey:string;item:ItemInstance}
  | {type:'COMBAT_RESOLVED';day:number;citizenId:string;zoneKey:string;method:CombatMethod;kills:number;item:ItemInstance|null;source?:ItemStorage;consumed:boolean;brokenInto?:ItemType;chargesAfter?:number;rngStateAfter:number}
  | {type:'ITEM_DEPOSITED';day:number;citizenId:string;item:ItemInstance}
  | {type:'ITEM_WITHDRAWN';day:number;citizenId:string;item:ItemInstance}
  | {type:'ITEM_MOVED_TO_HOME';day:number;citizenId:string;item:ItemInstance}
  | {type:'ITEM_MOVED_TO_RUCKSACK';day:number;citizenId:string;item:ItemInstance}
  | {type:'OPENABLE_RESOLVED';day:number;citizenId:string;container:ItemInstance;source:ItemStorage;zoneKey?:string;success:boolean;outputs:ItemInstance[];containerAfter?:ItemInstance;rngStateAfter:number}
  | {type:'CONTAINER_OPENED';day:number;citizenId:string;containerId:string;containerType:ItemType;source:ItemStorage;zoneKey?:string;output:ItemInstance;rngStateAfter:number}
  | {type:'CONSTRUCTION_KIT_OPENED';day:number;citizenId:string;containerId:string;source:ItemStorage;zoneKey?:string;outputs:ItemInstance[];rngStateAfter:number}
  | {type:'WATER_TAKEN';day:number;citizenId:string;item:ItemInstance}
  | {type:'ITEM_CONSUMED';day:number;citizenId:string;item:ItemInstance;source:ItemStorage;zoneKey?:string;kind:ConsumableKind;restoresAp:boolean;chargesAfter?:number}
  | {type:'HOME_UPGRADED';day:number;citizenId:string;from:HomeLevel;to:HomeLevel;defenseAfter:number;consumed:Partial<Record<ItemType,number>>}
  | {type:'HOME_IMPROVEMENT_BUILT';day:number;citizenId:string;improvementId:HomeImprovementId;level:number;consumed:Partial<Record<ItemType,number>>;defenseAfter:number;storageCapacityAfter:number}
  | {type:'CONSTRUCTION_AP_CONTRIBUTED';day:number;citizenId:string;projectId:ConstructionId;amount:number}
  | {type:'CONSTRUCTION_COMPLETED';day:number;citizenId:string;projectId:ConstructionId;consumed:Partial<Record<ItemType,number>>;defenseBonus:number}
  | {type:'CONSTRUCTION_EXPIRED';day:number;projectId:ConstructionId}
  | {type:'CONSTRUCTION_GENERATED_ITEM';day:number;projectId:ConstructionId;itemType:ItemType;amount:number}
  | {type:'WORKSHOP_CONVERTED';day:number;citizenId:string;recipeId:WorkshopRecipeId;input:ItemType;inputCount:number;inputItemIds:string[];output:ItemType;outputCount:number;outputState?:ItemState;preserveInputId?:boolean;rngStateAfter?:number}
  | {type:'ITEMS_COMBINED';day:number;citizenId:string;recipeId:CombinationRecipeId;consumedItemIds:string[];outputs:CombinationEventOutput[];createdCount:number}
  | {type:'COORDINATION_COMMITMENT_POSTED';day:number;commitment:CoordinationCommitment}
  | {type:'COORDINATION_COMMITMENT_CLEARED';day:number;commitmentId:string;reason:'expired'|'fulfilled'|'invalid'|'day_reset'}
  | {type:'BOT_MISSION_ASSIGNED';day:number;citizenId:string;mission:BotMissionAssignment}
  | {type:'BOT_MISSION_PHASE_SET';day:number;citizenId:string;missionId:string;phase:BotMissionPhase}
  | {type:'BOT_MISSION_CLEARED';day:number;citizenId:string;missionId:string;outcome:'completed'|'aborted'}
  | {type:'CITIZEN_DIED';day:number;citizenId:string;reason:DeathReason}
  | {type:'NIGHT_RESOLVED';day:number;report:NightReport}
  | {type:'DAY_STARTED';day:number}
  | {type:'TIME_ADVANCED';day:number;fromHour:number;toHour:number;phase:ClockPhase}
) & {hour?:number}