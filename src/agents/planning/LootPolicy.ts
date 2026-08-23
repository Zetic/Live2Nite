import { isWeapon } from '../../core/combat'
import { ITEMS } from '../../core/items'
import type { BotMissionAssignment, Citizen, GameCommand, GameState, ItemInstance, ItemType } from '../../core/types'
import { distanceToTown, zoneKey } from '../../core/world'
import { evaluateTownNeeds } from './TownNeeds'
import { publicDefenseAssessment } from './TownDefenseStrategy'

const BASE_LOOT_VALUE: Record<ItemType, number> = {
  construction_kit: 105,
  twisted_plank: 72,
  wrought_iron: 72,
  unshaped_concrete_block: 58,
  water_ration: 62,
  food: 52,
  old_door: 58,
  rotten_log: 38,
  scrap_metal: 38,
  water_bomb: 70,
  machete: 68,
  serrated_knife: 58,
  staff: 50,
  pathetic_penknife: 43,
  human_bone: 36,
  doggy_bag: 48,
  citizen_welcome_pack: 42,
  pharmaceutical_products: 30,
  battery: 24,
  box_of_matches: 22,
  broken_machete: 20,
  broken_serrated_knife: 18,
  broken_staff: 16,
  broken_pathetic_penknife: 14,
  broken_human_bone: 12,
}

function missionBonus(mission: BotMissionAssignment | null, type: ItemType): number {
  if (!mission) return 0
  if (mission.purpose === 'gather_construction' && ['construction_kit','twisted_plank','wrought_iron','unshaped_concrete_block','rotten_log','scrap_metal'].includes(type)) return 24
  if (mission.purpose === 'gather_food' && type === 'food') return 35
  if (mission.purpose === 'gather_medical' && type === 'pharmaceutical_products') return 35
  if ((mission.purpose === 'gather_weapons' || mission.purpose === 'rescue') && isWeapon(type)) return 28
  return 0
}

export function lootScore(state: GameState, citizen: Citizen, type: ItemType, mission: BotMissionAssignment | null = null): number {
  const needs = evaluateTownNeeds(state)
  let score = BASE_LOOT_VALUE[type] + missionBonus(mission, type)

  const directlyMissing = needs.missingConstruction[type] ?? 0
  if (directlyMissing > 0) score += 70 + Math.min(20, directlyMissing * 4)
  if (type === 'rotten_log' && (needs.missingConstruction.twisted_plank ?? 0) > 0) score += 36
  if (type === 'scrap_metal' && (needs.missingConstruction.wrought_iron ?? 0) > 0) score += 36
  if (type === 'construction_kit' && Object.keys(needs.missingConstruction).length > 0) score += 28

  if (type === 'food' && needs.foodLow) score += 45
  if (isWeapon(type) && needs.weaponsLow) score += 35
  if (type === 'water_ration') {
    if (citizen.status.hydration !== 'normal') score += 90
    else if (!citizen.daily.drank && citizen.status.desertStepsToday >= 6) score += 45
    if (needs.waterPerCitizen < 1) score += 55
    else if (needs.waterPerCitizen < 2) score += 24
  }

  if (type === 'old_door') {
    const pressure = publicDefenseAssessment(state).pressure
    if (pressure === 'critical' || pressure === 'shortfall') score += 45
  }
  return score
}

function isProtectedCarry(state: GameState, citizen: Citizen, item: ItemInstance, mission: BotMissionAssignment | null): boolean {
  if (item.type === 'water_ration') {
    return citizen.status.hydration !== 'normal'
      || (!citizen.daily.drank && (citizen.status.desertStepsToday >= 6 || (citizen.location.type === 'world' && distanceToTown(citizen.location.x,citizen.location.y) >= 4)))
  }
  if (item.type === 'food' && !citizen.daily.ate && citizen.location.type === 'world' && distanceToTown(citizen.location.x,citizen.location.y) >= 4) return true
  if (isWeapon(item.type)) {
    const workingWeapons = citizen.inventory.filter((candidate) => isWeapon(candidate.type))
    return workingWeapons.length <= 1 && (mission?.purpose === 'rescue' || mission?.purpose === 'gather_weapons')
  }
  return false
}

function pickupAction(actions: GameCommand[], itemId: string): GameCommand | null {
  return actions.find((action) => action.type === 'PICK_UP_ITEM' && action.itemId === itemId) ?? null
}

function dropAction(actions: GameCommand[], itemId: string): GameCommand | null {
  return actions.find((action) => action.type === 'DROP_ITEM' && action.itemId === itemId) ?? null
}

function bestGroundItem(state: GameState, citizen: Citizen, mission: BotMissionAssignment | null): ItemInstance | null {
  if (citizen.location.type !== 'world') return null
  const zone = state.world.zones[zoneKey(citizen.location.x,citizen.location.y)]
  if (!zone?.groundItems.length) return null
  return [...zone.groundItems].sort((a,b) => lootScore(state,citizen,b.type,mission) - lootScore(state,citizen,a.type,mission))[0] ?? null
}

function lowestDroppableCarry(state: GameState, citizen: Citizen, mission: BotMissionAssignment | null): ItemInstance | null {
  const candidates = citizen.inventory.filter((item) => !isProtectedCarry(state,citizen,item,mission))
  return [...candidates].sort((a,b) => lootScore(state,citizen,a.type,mission) - lootScore(state,citizen,b.type,mission))[0] ?? null
}

function relayCacheCandidate(state: GameState, citizen: Citizen, mission: BotMissionAssignment | null): ItemInstance | null {
  if (!mission || mission.phase !== 'outbound' || citizen.location.type !== 'world') return null
  const distance = distanceToTown(citizen.location.x,citizen.location.y)
  const targetDistance = distanceToTown(mission.target.x,mission.target.y)
  if (distance < 1 || distance > 3 || targetDistance <= distance + 1) return null
  if (citizen.inventory.length < citizen.inventoryCapacity - 1) return null

  const cacheable = citizen.inventory.filter((item) => {
    if (isProtectedCarry(state,citizen,item,mission)) return false
    const category = ITEMS[item.type].category
    if (!['raw','construction','defense','misc','broken_weapon'].includes(category)) return false
    const value = lootScore(state,citizen,item.type,mission)
    return value >= 18 && value < 90
  })
  return [...cacheable].sort((a,b) => lootScore(state,citizen,a.type,mission) - lootScore(state,citizen,b.type,mission))[0] ?? null
}

/**
 * Free field actions happen before another movement AP is spent. This is deliberately
 * mission-agnostic: the mission is the primary reason for the trip, not permission to
 * ignore obvious zero-AP value on the route.
 */
export function opportunisticFieldAction(
  state: GameState,
  citizen: Citizen,
  actions: GameCommand[],
  mission: BotMissionAssignment | null,
): GameCommand | null {
  if (citizen.location.type !== 'world') return null

  const ground = bestGroundItem(state,citizen,mission)
  if (ground) {
    const groundValue = lootScore(state,citizen,ground.type,mission)
    if (citizen.inventory.length < citizen.inventoryCapacity) {
      const preserveTargetSlot = mission?.phase === 'outbound' && citizen.inventory.length >= citizen.inventoryCapacity - 1
      if (!preserveTargetSlot || groundValue >= 88 || mission?.phase === 'return') {
        const pickup = pickupAction(actions,ground.id)
        if (pickup) return pickup
      }
    } else {
      const lowest = lowestDroppableCarry(state,citizen,mission)
      if (lowest && groundValue >= lootScore(state,citizen,lowest.type,mission) + 15) {
        const drop = dropAction(actions,lowest.id)
        if (drop) return drop
      }
    }
  }

  // Search every safe eligible tile, including depleted tiles. Searches cost 0 AP and
  // place their result on the ground, where the next decision can evaluate it against
  // the current rucksack instead of blindly forcing a pickup.
  const specialSearch = actions.find((action) => action.type === 'SEARCH_SPECIAL_SITE') ?? null
  if (specialSearch) return specialSearch
  const search = actions.find((action) => action.type === 'SEARCH_ZONE') ?? null
  if (search) return search

  // Outbound citizens may leave middling town-useful materials in a safe near-town cell
  // to preserve capacity for deeper finds. Returning citizens naturally collect these
  // caches because the ground-pickup pass above also runs on the return route.
  const cache = relayCacheCandidate(state,citizen,mission)
  if (cache) return dropAction(actions,cache.id)
  return null
}

export function shouldReturnWithHaul(state: GameState, citizen: Citizen, mission: BotMissionAssignment): boolean {
  if (citizen.location.type !== 'world' || mission.emergency || mission.phase === 'return' || mission.phase === 'camp') return false
  const valuable = citizen.inventory
    .filter((item) => !['consumable','weapon'].includes(ITEMS[item.type].category))
    .map((item) => lootScore(state,citizen,item.type,mission))
    .sort((a,b) => b-a)
  if (!valuable.length) return false
  if (valuable[0] >= 130 && distanceToTown(citizen.location.x,citizen.location.y) >= 2) return true
  return valuable.length >= 2 && valuable[0] + valuable[1] >= 210
}
