import { hasUpgradeProjectsFacility } from '../core/constructionUpgrades'
import type { ConstructionId, GameState } from '../core/types'

export type GameScreen = 'home' | 'well' | 'bank' | 'construction' | 'workshop' | 'watchtower' | 'upgrade_projects' | 'world' | 'citizens' | 'chronicle' | 'codex'

export interface ScreenDefinition {
  id: GameScreen
  label: string
  short: string
  townOnly?: boolean
}
export interface FacilityScreenDefinition extends ScreenDefinition { projectId?:ConstructionId; available?:(game:GameState)=>boolean }

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

const FACILITY_DEFINITIONS: readonly FacilityScreenDefinition[] = [
  { id: 'workshop', projectId: 'workshop', label: 'Workshop', short: 'Material processing', townOnly: true },
  { id: 'watchtower', projectId: 'watchtower', label: 'Watchtower', short: 'Horde estimates', townOnly: true },
  { id: 'upgrade_projects', label: 'Upgrade Projects', short: 'Daily project vote', townOnly: true, available:hasUpgradeProjectsFacility },
]
function facilityAvailable(game:GameState,entry:FacilityScreenDefinition):boolean{return entry.available?.(game)??Boolean(entry.projectId&&game.town.construction[entry.projectId]?.completed)}

export const FACILITY_SLOT_COUNT=6

export function facilitySlots(game:GameState):Array<FacilityScreenDefinition|null>{
  const available=FACILITY_DEFINITIONS.map((entry)=>facilityAvailable(game,entry)?entry:null)
  return Array.from({length:FACILITY_SLOT_COUNT},(_,index)=>available[index]??null)
}

export function availableScreens(game: GameState): ScreenDefinition[] {
  return [...PRIMARY_SCREENS,...FACILITY_DEFINITIONS.filter((entry)=>facilityAvailable(game,entry))]
}

export function isTownOnlyScreen(screen: GameScreen): boolean {
  return ['home', 'well', 'bank', 'construction', 'workshop', 'watchtower','upgrade_projects'].includes(screen)
}
