import type { ConstructionId, GameState } from '../core/types'

export type GameScreen = 'home' | 'well' | 'bank' | 'construction' | 'workshop' | 'world' | 'citizens' | 'chronicle'

export interface ScreenDefinition {
  id: GameScreen
  label: string
  short: string
  townOnly?: boolean
}

const PRIMARY_SCREENS: ScreenDefinition[] = [
  { id: 'home', label: 'Home', short: 'Private storage', townOnly: true },
  { id: 'well', label: 'The Well', short: 'Daily water', townOnly: true },
  { id: 'bank', label: 'The Bank', short: 'Shared inventory', townOnly: true },
  { id: 'construction', label: 'Construction Sites', short: 'Town projects', townOnly: true },
]

const FACILITY_SCREENS: Array<ScreenDefinition & { projectId: ConstructionId }> = [
  { id: 'workshop', projectId: 'workshop', label: 'Workshop', short: 'Material processing', townOnly: true },
]

const GLOBAL_SCREENS: ScreenDefinition[] = [
  { id: 'world', label: 'World Beyond', short: 'Gate & expeditions' },
  { id: 'citizens', label: 'Citizens', short: 'Population' },
  { id: 'chronicle', label: 'Chronicle', short: 'Town history' },
]

export function availableScreens(game: GameState): ScreenDefinition[] {
  const facilities = FACILITY_SCREENS.filter((entry) => game.town.construction[entry.projectId].completed)
  return [...PRIMARY_SCREENS, ...facilities, ...GLOBAL_SCREENS]
}

export function isTownOnlyScreen(screen: GameScreen): boolean {
  return ['home', 'well', 'bank', 'construction', 'workshop'].includes(screen)
}
