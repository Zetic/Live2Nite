import { getLegalActions } from '../core/actions'
import { executeCommand } from '../core/commands'
import type { Citizen, GameEvent, GameState } from '../core/types'
import { distanceToTown, zoneControl } from '../core/world'
import type { AgentController } from './AgentController'

export type HourlyObjective = 'return_home' | 'rescue' | 'scavenge' | 'town_work' | 'fight' | 'idle'

function returnHourFor(citizenId: string): number {
  const numeric = Number(citizenId.slice(1)) || 0
  return 18 + (numeric % 4)
}

function trappedCitizens(state: GameState, citizenId: string): Citizen[] {
  return state.citizens.filter((candidate) => candidate.id !== citizenId && candidate.alive && candidate.location.type === 'world' && zoneControl(state, candidate.location.x, candidate.location.y).trapped)
}

function canReachTarget(citizen: Citizen, target: Citizen): boolean {
  if (target.location.type !== 'world') return false
  const distance = citizen.location.type === 'town'
    ? distanceToTown(target.location.x, target.location.y)
    : Math.abs(target.location.x - citizen.location.x) + Math.abs(target.location.y - citizen.location.y)
  return citizen.ap >= distance
}

function hasTownWork(actions: ReturnType<typeof getLegalActions>): boolean {
  return actions.some((action) => ['DEPOSIT_ITEM','CONTRIBUTE_CONSTRUCTION','WORKSHOP_CONVERT','UPGRADE_HOME'].includes(action.type))
}

export function chooseHourlyObjective(state: GameState, citizenId: string): HourlyObjective {
  const citizen = state.citizens.find((candidate) => candidate.id === citizenId)
  if (!citizen || !citizen.alive || state.clock.phase !== 'day') return 'idle'
  const hour = state.clock.hour
  const returnHour = returnHourFor(citizenId)
  const rescues = trappedCitizens(state,citizenId)
  const reachableRescue = rescues.find((target) => canReachTarget(citizen,target))

  if (citizen.location.type === 'world') {
    const control = zoneControl(state,citizen.location.x,citizen.location.y)
    if (control.trapped) return 'fight'
    if (hour >= returnHour || citizen.inventory.length >= citizen.inventoryCapacity || citizen.ap <= distanceToTown(citizen.location.x,citizen.location.y) + 2) return 'return_home'
    if (reachableRescue) return 'rescue'
    return 'scavenge'
  }

  const actions = getLegalActions(state,citizenId)
  if (citizen.inventory.length > 0 || hasTownWork(actions)) return 'town_work'
  if (reachableRescue && hour < 23) return 'rescue'
  if (hour >= returnHour) return 'idle'
  return 'scavenge'
}

function newEventsForCitizen(state: GameState, citizenId: string, startIndex: number): GameEvent[] {
  return state.events.slice(startIndex).filter((event) => 'citizenId' in event && event.citizenId === citizenId)
}

function objectiveComplete(state: GameState, citizenId: string, objective: HourlyObjective, startIndex: number, rescueTargetId: string | null): boolean {
  const citizen = state.citizens.find((candidate) => candidate.id === citizenId)
  if (!citizen || !citizen.alive) return true
  const events = newEventsForCitizen(state,citizenId,startIndex)

  if (objective === 'idle') return true
  if (objective === 'fight') {
    if (citizen.location.type !== 'world') return true
    const control = zoneControl(state,citizen.location.x,citizen.location.y)
    return !control.trapped || !getLegalActions(state,citizenId).some((action) => action.type === 'USE_WEAPON')
  }
  if (objective === 'return_home') {
    return citizen.location.type === 'town' && citizen.inventory.length === 0
  }
  if (objective === 'town_work') {
    const completedWork = events.some((event) => ['CONSTRUCTION_AP_CONTRIBUTED','WORKSHOP_CONVERTED','HOME_UPGRADED'].includes(event.type))
    const finishedDeposits = citizen.inventory.length === 0 && events.some((event) => event.type === 'ITEM_DEPOSITED')
    return completedWork || finishedDeposits
  }
  if (objective === 'scavenge') {
    const searched = events.some((event) => event.type === 'ZONE_SEARCHED')
    const canPickUp = getLegalActions(state,citizenId).some((action) => action.type === 'PICK_UP_ITEM')
    return searched && !canPickUp
  }
  if (objective === 'rescue') {
    const target = rescueTargetId ? state.citizens.find((candidate) => candidate.id === rescueTargetId) : null
    const rescued = !target || target.location.type !== 'world' || !zoneControl(state,target.location.x,target.location.y).trapped
    if (!rescued) return false
    return state.clock.hour < returnHourFor(citizenId) || citizen.location.type === 'town'
  }
  return true
}

export function runBotHour(state: GameState, controller: AgentController, controlledCitizenId?: string): GameState {
  if (state.clock.phase !== 'day') return state
  let nextState = state

  for (const startingCitizen of state.citizens) {
    if (startingCitizen.id === controlledCitizenId || startingCitizen.controller !== 'basic-bot' || !startingCitizen.alive) continue
    const objective = chooseHourlyObjective(nextState,startingCitizen.id)
    if (objective === 'idle') continue
    const startIndex = nextState.events.length
    const initialRescue = objective === 'rescue' ? trappedCitizens(nextState,startingCitizen.id).find((target) => canReachTarget(nextState.citizens.find((citizen) => citizen.id === startingCitizen.id)!,target)) ?? null : null

    // Safety cap protects the simulation from controller loops. It is not a gameplay action limit:
    // a citizen may legally spend several AP and traverse several zones within this one hour.
    for (let step = 0; step < 32; step += 1) {
      if (objectiveComplete(nextState,startingCitizen.id,objective,startIndex,initialRescue?.id ?? null)) break
      const command = controller.decide(nextState,startingCitizen.id)
      if (!command) break
      nextState = executeCommand(nextState,command).state
    }
  }

  // 23:00 is the final autonomous window. After every bot has had a chance to return,
  // the town makes one last attempt to seal the gate before midnight.
  if (state.clock.hour === 23 && nextState.town.gateOpen) {
    const closer = nextState.citizens.find((citizen) => citizen.id !== controlledCitizenId && citizen.controller === 'basic-bot' && citizen.alive && citizen.location.type === 'town' && getLegalActions(nextState,citizen.id).some((action) => action.type === 'CLOSE_GATE'))
    if (closer) {
      const close = getLegalActions(nextState,closer.id).find((action) => action.type === 'CLOSE_GATE')
      if (close) nextState = executeCommand(nextState,close).state
    }
  }

  return nextState
}
