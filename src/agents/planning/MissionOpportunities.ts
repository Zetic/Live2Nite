import { specialSiteName } from '../../core/specialSites'
import type { BotMissionPurpose, BotMissionRole, GameState, WorldZone } from '../../core/types'
import { distanceToTown, zoneControl } from '../../core/world'
import { AI_TUNING } from '../AiTuning'
import { knownZombieCount } from '../WorldKnowledge'
import { evaluateTownNeeds } from './TownNeeds'

export interface MissionOpportunity {
  missionId: string
  role: BotMissionRole
  purpose: BotMissionPurpose
  target: { x: number; y: number }
  targetLabel: string
  reason: string
  desiredCitizens: number
  priority: number
  safetyReserve: number
  emergency: boolean
}

const CONSTRUCTION_SITE_TYPES = new Set(['construction_site', 'wrecked_cars', 'dark_woods'])

export function missionKey(role: BotMissionRole, purpose: BotMissionPurpose, x: number, y: number): string {
  return `${role}:${purpose}:${x},${y}`
}

export function knownNonTownZones(state: GameState): WorldZone[] {
  return Object.values(state.world.zones)
    .filter((zone) => zone.discovered && distanceToTown(zone.x, zone.y) > 0)
}

function staffingForZone(state: GameState, zone: WorldZone): number {
  const zombies = knownZombieCount(state, zone.x, zone.y) ?? 0
  return Math.max(2, Math.min(5, Math.ceil((zombies + 1) / 2)))
}

function sitePurpose(zone: WorldZone): BotMissionPurpose | null {
  const type = zone.specialSite?.type
  if (!type) return null
  if (CONSTRUCTION_SITE_TYPES.has(type)) return 'gather_construction'
  if (type === 'supermarket') return 'gather_food'
  if (type === 'pharmacy') return 'gather_medical'
  if (type === 'police_station') return 'gather_weapons'
  return null
}

export function knownOpportunities(state: GameState): MissionOpportunity[] {
  const needs = evaluateTownNeeds(state)
  const opportunities: MissionOpportunity[] = []
  const trapped = state.citizens.filter((citizen) =>
    citizen.alive
    && citizen.location.type === 'world'
    && zoneControl(state, citizen.location.x, citizen.location.y).trapped)

  for (const citizen of trapped) {
    if (citizen.location.type !== 'world') continue
    const control = zoneControl(state, citizen.location.x, citizen.location.y)
    const missingPoints = Math.max(1, control.zombiePoints - control.humanPoints)
    const desired = Math.min(5, Math.max(1, Math.ceil(missingPoints / 2)))
    const id = missionKey('rescue', 'rescue', citizen.location.x, citizen.location.y)
    opportunities.push({
      missionId: id,
      role: 'rescue',
      purpose: 'rescue',
      target: { x: citizen.location.x, y: citizen.location.y },
      targetLabel: `Rescue at [${citizen.location.x},${citizen.location.y}]`,
      reason: `${citizen.name} is trapped; send enough control points and field weapons to restore movement.`,
      desiredCitizens: desired,
      priority: 300,
      safetyReserve: 0,
      emergency: true,
    })
  }

  const missingConstruction = Boolean(needs.activeProject && Object.keys(needs.missingConstruction).length > 0)
  for (const zone of knownNonTownZones(state)) {
    if (!zone.specialSite) continue
    const purpose = sitePurpose(zone)
    const useful = purpose === 'gather_construction'
      ? missingConstruction
      : purpose === 'gather_food'
        ? needs.foodLow
        : purpose === 'gather_weapons'
          ? needs.weaponsLow
          : purpose === 'gather_medical'
            ? (state.town.bank.pharmaceutical_products ?? 0) < 2
            : false
    if (!purpose || !useful || zone.specialSite.status === 'depleted') continue

    if (zone.specialSite.status === 'buried') {
      const id = missionKey('excavator', purpose, zone.x, zone.y)
      opportunities.push({
        missionId: id,
        role: 'excavator',
        purpose,
        target: { x: zone.x, y: zone.y },
        targetLabel: `${specialSiteName(zone.specialSite.type)} [${zone.x},${zone.y}]`,
        reason: `A known ${specialSiteName(zone.specialSite.type)} can address the town's ${purpose.replace('gather_', '')} need once uncovered.`,
        desiredCitizens: Math.min(4, Math.max(2, Math.ceil((zone.specialSite.excavationRequired - zone.specialSite.excavationProgress) / 2))),
        priority: 180,
        safetyReserve: AI_TUNING.ordinarySafetyReserve,
        emergency: false,
      })
    } else {
      const id = missionKey('gatherer', purpose, zone.x, zone.y)
      opportunities.push({
        missionId: id,
        role: 'gatherer',
        purpose,
        target: { x: zone.x, y: zone.y },
        targetLabel: `${specialSiteName(zone.specialSite.type)} [${zone.x},${zone.y}]`,
        reason: `The town has a known ${specialSiteName(zone.specialSite.type)} matching its ${purpose.replace('gather_', '')} need.`,
        desiredCitizens: staffingForZone(state, zone),
        priority: 170,
        safetyReserve: AI_TUNING.ordinarySafetyReserve,
        emergency: false,
      })
    }
  }

  if (missingConstruction) {
    const fresh = knownNonTownZones(state)
      .filter((zone) => zone.searchesRemaining > 0 && (knownZombieCount(state, zone.x, zone.y) ?? 0) <= 8)
      .sort((a, b) =>
        (knownZombieCount(state, a.x, a.y) ?? 0) - (knownZombieCount(state, b.x, b.y) ?? 0)
        || distanceToTown(b.x, b.y) - distanceToTown(a.x, a.y))
      .slice(0, 6)

    for (const zone of fresh) {
      const id = missionKey('gatherer', 'gather_construction', zone.x, zone.y)
      opportunities.push({
        missionId: id,
        role: 'gatherer',
        purpose: 'gather_construction',
        target: { x: zone.x, y: zone.y },
        targetLabel: `Fresh zone [${zone.x},${zone.y}]`,
        reason: `${needs.activeProject} still lacks construction materials; keep a party on this productive zone long enough to exploit repeated searches.`,
        desiredCitizens: staffingForZone(state, zone),
        priority: 140,
        safetyReserve: AI_TUNING.ordinarySafetyReserve,
        emergency: false,
      })
    }
  }

  return opportunities.sort((a, b) => b.priority - a.priority)
}
