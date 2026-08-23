import { getLegalActions } from '../core/actions'
import type { GameCommand } from '../core/types'
import { temporaryControlActive, zoneControl, zoneControlState } from '../core/world'
import { asAgentDecisionContext, type AgentDecisionInput } from './AgentDecisionContext'
import type { AgentController } from './AgentController'
import { AI_TUNING } from './AiTuning'
import { bestWeaponAction, controlAwareMove, controlAwareStepTowardTown } from './actions/FieldActions'
import { packageSharingAction, prepareLoadout, refillAction, unloadAction } from './actions/InventoryActions'
import { campingAction, hydrationAction } from './actions/SurvivalActions'
import { carried, pick } from './actions/actionSelectors'
import { commitmentForCitizen, committedConstructionProject, reservedApForCitizen } from './coordination/TownCoordination'
import { planExpedition } from './planning/ExpeditionPlanner'
import { missionSafety } from './planning/MissionLifecycle'
import { nextDirectionToward } from './planning/RoutePlanner'
import { chooseTownWork } from './townWork'

export class BasicBotController implements AgentController {
  readonly kind = 'basic-bot'

  decide(input: AgentDecisionInput, citizenId: string): GameCommand | null {
    const { state: game } = asAgentDecisionContext(input)
    const citizen = game.citizens.find((candidate) => candidate.id === citizenId)
    if (!citizen || !citizen.alive || game.clock.phase !== 'day') return null

    const actions = getLegalActions(game, citizenId)
    if (!actions.length) return null
    const mission = game.botMissions[citizenId] ?? null
    const plan = planExpedition(game, citizenId)

    if (citizen.camping.hidden) return null

    const hydration = hydrationAction(game, citizen, actions)
    if (hydration) return hydration

    if (citizen.location.type === 'town') {
      const unload = unloadAction(citizen, actions, plan, mission?.phase === 'unload')
      if (unload) return unload
      if (mission?.phase === 'unload') return null

      const commitment=commitmentForCitizen(game,citizenId)
      const reservedAp=reservedApForCitizen(game,citizenId)
      if(!mission&&reservedAp>=citizen.ap){
        const packages = packageSharingAction(citizen, actions, null, game.clock.hour)
        if (packages) return packages
        return null
      }

      if(!mission){
        const committedProject=committedConstructionProject(game,citizenId)
        if(committedProject){
          const contribution=actions.find((action)=>action.type==='CONTRIBUTE_CONSTRUCTION'&&action.projectId===committedProject)
          if(contribution)return contribution
        }
        const townWork = chooseTownWork(game, citizen, actions)
        const gateVolunteer=commitment?.kind==='gate_primary'||commitment?.kind==='gate_backup'
        if (townWork && (commitment?.kind==='construction'||(gateVolunteer&&citizen.ap>reservedAp)||game.clock.hour>=AI_TUNING.townApDumpHour)) return townWork
      }

      if (!mission) {
        const packages = packageSharingAction(citizen, actions, null, game.clock.hour)
        if (packages) return packages
        return null
      }

      if (mission.phase !== 'prepare') return null
      if (plan) {
        const prep = prepareLoadout(citizen, actions, plan)
        if (prep) return prep
        if (!plan.feasible && !mission.emergency) return null
      }

      const open = pick(actions, 'OPEN_GATE')
      if (open) return open
      return pick(actions, 'EXIT_TOWN')
    }

    const control = zoneControl(game, citizen.location.x, citizen.location.y)
    if (control.trapped) {
      // Temporary control is an extraction window. Do not waste it fighting unless
      // movement is impossible; consume an available refill and get out immediately.
      if(temporaryControlActive(game,citizen.id)){
        const safety=missionSafety(game,citizenId)
        const refill=refillAction(citizen,actions,safety.returnAp)
        if(refill)return refill
        return controlAwareStepTowardTown(game,citizen,actions)
      }
      const weapon = bestWeaponAction(citizen, actions)
      if (weapon) return weapon
      if (game.clock.hour >= AI_TUNING.lateBarehandedFightHour) {
        const fists = pick(actions, 'ATTACK_BAREHANDED')
        if (fists) return fists
      }
      if (mission?.phase === 'camp') return campingAction(game, citizen, actions)
      return null
    }

    if (citizen.status.hydration !== 'normal' && !carried(citizen, 'water_ration')) {
      return controlAwareStepTowardTown(game, citizen, actions)
    }
    if (!mission) return controlAwareStepTowardTown(game, citizen, actions)
    if (mission.phase === 'camp') return campingAction(game, citizen, actions)

    if (mission.phase === 'return') {
      const safety = missionSafety(game, citizenId)
      const refill = refillAction(citizen, actions, safety.returnAp)
      if (refill) return refill
      return controlAwareStepTowardTown(game, citizen, actions)
    }

    if (!plan) return controlAwareStepTowardTown(game, citizen, actions)
    const refill = refillAction(
      citizen,
      actions,
      plan.route.length
        + plan.expectedTaskAp
        + mission.safetyReserve
        + (plan.campingPlanned ? 0 : plan.returnAp),
    )
    if (refill) return refill

    if (mission.phase === 'operate') {
      if (mission.role === 'rescue') {
        // If the rescue team only barely controls the zone, reduce the threat until a
        // protected citizen can leave without immediately trapping the responders.
        if(zoneControlState(game,citizen.location.x,citizen.location.y)==='fragile'){
          const weapon=bestWeaponAction(citizen,actions)
          if(weapon)return weapon
        }
        return null
      }
      const pickup = pick(actions, 'PICK_UP_ITEM')
      if (pickup) return pickup
      if (mission.role === 'excavator') {
        const excavate = pick(actions, 'EXCAVATE_SPECIAL_SITE')
        if (excavate) return excavate
      }
      const siteSearch = pick(actions, 'SEARCH_SPECIAL_SITE')
      if (siteSearch) return siteSearch
      const search = pick(actions, 'SEARCH_ZONE')
      if (search) return search
      return null
    }

    if (citizen.ap <= 0) return null
    const direction = nextDirectionToward(
      game,
      { x: citizen.location.x, y: citizen.location.y },
      mission.target,
    )
    if (direction) {
      const action=controlAwareMove(game,citizen,actions,direction,false)
      if(action)return action
    }
    return controlAwareStepTowardTown(game, citizen, actions)
  }
}
