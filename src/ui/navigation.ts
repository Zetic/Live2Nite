import { hasUpgradeProjectsFacility } from '../core/constructionUpgrades'
import type { ConstructionId, GameState } from '../core/types'

export type GameScreen = 'home' | 'well' | 'bank' | 'construction' | 'workshop' | 'watchtower' | 'upgrade_projects' | 'world' | 'citizens' | 'chronicle' | 'codex'

export interface ScreenDefinition {
  id: GameScreen
  label: string
  short: string
  townOnly?: boolean
}

export type FacilitySlotId='upgrade_projects'|'watchtower'|'workshop'|'battlements'|'garbage_dump'|'catapult'|'tamer_s_trap_system'
export interface FacilityScreenDefinition extends ScreenDefinition { slot:FacilitySlotId; projectId?:ConstructionId; available?:(game:GameState)=>boolean }

export const PRIMARY_SCREENS: readonly ScreenDefinition[] = [
  { id: 'chronicle', label: 'Town Records', short: 'Bulletin, history & statistics' },
  { id: 'citizens', label: 'Citizens', short: 'Population' },
  { id: 'home', label: 'Home', short: 'Private storage', townOnly: true },
  { id: 'well', label: 'The Well', short: 'Daily water', townOnly: true },
  { id: 'bank', label: 'The Bank', short: 'Shared inventory', townOnly: true },
  { id: 'construction', label: 'Construction Sites', short: 'Town projects', townOnly: true },
  { id: 'world', label: 'World Beyond', short: 'Gate & expeditions' },
  { id: 'codex', label: 'Codex', short: 'Items, conditions & constructions' },
]

/**
 * Permanent second-row priority. Facilities without dedicated screens yet reserve their
 * future position here; unavailable entries are compacted left and blank slots trail them.
 */
export const FACILITY_SLOT_ORDER:readonly FacilitySlotId[]=[
  'upgrade_projects',
  'watchtower',
  'workshop',
  'battlements',
  'garbage_dump',
  'catapult',
  'tamer_s_trap_system',
]

const FACILITY_DEFINITIONS: readonly FacilityScreenDefinition[] = [
  { id: 'upgrade_projects', slot:'upgrade_projects', label: 'Upgrade Projects', short: 'Daily project vote', townOnly: true, available:hasUpgradeProjectsFacility },
  { id: 'watchtower', slot:'watchtower', projectId: 'watchtower', label: 'Watchtower', short: 'Horde estimates', townOnly: true },
  { id: 'workshop', slot:'workshop', projectId: 'workshop', label: 'Workshop', short: 'Material processing', townOnly: true },
]
function facilityAvailable(game:GameState,entry:FacilityScreenDefinition):boolean{return entry.available?.(game)??Boolean(entry.projectId&&game.town.construction[entry.projectId]?.completed)}
function facilityOrder(entry:FacilityScreenDefinition):number{return FACILITY_SLOT_ORDER.indexOf(entry.slot)}

export const FACILITY_SLOT_COUNT=FACILITY_SLOT_ORDER.length

export function facilitySlots(game:GameState):Array<FacilityScreenDefinition|null>{
  const available=FACILITY_DEFINITIONS.filter((entry)=>facilityAvailable(game,entry)).sort((a,b)=>facilityOrder(a)-facilityOrder(b))
  return [...available,...Array.from({length:Math.max(0,FACILITY_SLOT_COUNT-available.length)},()=>null)]
}

export function availableScreens(game: GameState): ScreenDefinition[] {
  return [...PRIMARY_SCREENS,...FACILITY_DEFINITIONS.filter((entry)=>facilityAvailable(game,entry)).sort((a,b)=>facilityOrder(a)-facilityOrder(b))]
}

export function isTownOnlyScreen(screen: GameScreen): boolean {
  return ['home', 'well', 'bank', 'construction', 'workshop', 'watchtower','upgrade_projects'].includes(screen)
}
