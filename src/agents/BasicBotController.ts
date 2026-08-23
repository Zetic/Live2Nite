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
import { publicDefenseAssessment } from './planning/TownDefenseStrategy'
import { planExpedition } from './planning/ExpeditionPlanner'
import { opportunisticFieldAction } from './planning/LootPolicy'
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

    if (citizen.camping.hidden) return null

    // Dehydration and low-AP Thirst are urgent. Ordinary Thirst at high AP is deliberately
    // deferred so the citizen spends perishable current AP before consuming stored AP.
    const hydration = hydrationAction(game, citizen, actions)
    if (hydration) return hydration

    if (citizen.location.type === 'town') {
      // Expedition planning is only needed in town for unload/loadout decisions. Avoid
      // computing it on every zero-AP field-search step later in the controller.
      const plan = planExpedition(game, citizenId)
      const unload = unloadAction(citizen, actions, plan, mission?.phase === 'unload')
      if (unload) return unload
      if (mission?.phase === 'unload') return null

      const commitment=commitmentForCitizen(game,citizenId)
      const reservedAp=reservedApForCitizen(game,citizenId)
      if(!mission&&reservedAp>=citizen.ap){
        const packages = packageSharingAction(citizen, actions, null, game.clock.hour)
        if (packages) return packages
        const reservedHydration=hydrationAction(game,citizen,actions,{
          forceThirstTreatment:game.clock.hour>=AI_TUNING.lateHydrationTreatmentHour,
        })
        if(reservedHydration)return reservedHydration
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
        const pressure=publicDefenseAssessment(game).pressure
        const urgentDefense=pressure==='critical'||pressure==='shortfall'
        if (townWork && (commitment?.kind==='construction'||(gateVolunteer&&citizen.ap>reservedAp)||urgentDefense||game.clock.hour>=AI_TUNING.townApDumpHour)) return townWork
      }

      if (!mission) {
        const packages = packageSharingAction(citizen, actions, null, game.clock.hour)
        if (packages) return packages
        // Only after field volunteering and town AP sinks have had the day to act do we
        // force ordinary Thirst treatment. This avoids the 6/6-AP water-ration waste case
        // while still treating before the attack when a citizen truly has nothing else.
        const lateHydration=hydrationAction(game,citizen,actions,{
          forceThirstTreatment:game.clock.hour>=AI_TUNING.lateHydrationTreatmentHour,
        })
        if(lateHydration)return lateHydration
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

    // Rescue control is a genuine emergency. Free scavenging must never delay the weapon
    // action that turns fragile control into a safe extraction window.
    if(mission?.role==='rescue'&&zoneControlState(game,citizen.location.x,citizen.location.y)==='fragile'){
      const weapon=bestWeaponAction(citizen,actions)
      if(weapon)return weapon
    }

    // Every controlled field tile gets a free-action pass before another movement AP is
    // spent. Scouts, gatherers, rescuers and returning citizens all inspect the ground,
    // search normal/depleted zones, and make contextual pickup/swap/cache decisions.
    const opportunistic=opportunisticFieldAction(game,citizen,actions,mission)
    if(opportunistic)return opportunistic

    if (citizen.status.hydration !== 'normal' && !carried(citizen, 'water_ration')) return controlAwareStepTowardTown(game, citizen, actions)
    if (!mission) return controlAwareStepTowardTown(game, citizen, actions)
    if (mission.phase === 'camp') return campingAction(game, citizen, actions)

    if (mission.phase === 'return') {
      const safety = missionSafety(game, citizenId)
      const refill = refillAction(citizen, actions, safety.returnAp)
      if (refill) return refill
      return controlAwareStepTowardTown(game, citizen, actions)
    }

    // The expensive route/loadout plan is deferred until all zero-AP opportunities on
    // this tile are exhausted. Route scavenging can therefore add several useful events
    // without recalculating the entire expedition for each one.
    const plan = planExpedition(game, citizenId)
    if (!plan) return controlAwareStepTowardTown(game, citizen, actions)
    const refill = refillAction(citizen,actions,plan.route.length+plan.expectedTaskAp+mission.safetyReserve+(plan.campingPlanned?0:plan.returnAp))
    if (refill) return refill

    if (mission.phase === 'operate') {
      if (mission.role === 'rescue') return null
      if (mission.role === 'excavator') {
        const excavate = pick(actions, 'EXCAVATE_SPECIAL_SITE')
        if (excavate) return excavate
      }
      return null
    }

    if (citizen.ap <= 0) return null
    const direction = nextDirectionToward(game,{ x: citizen.location.x, y: citizen.location.y },mission.target)
    if (direction) {
      const action=controlAwareMove(game,citizen,actions,direction,false)
      if(action)return action
    }
    return controlAwareStepTowardTown(game, citizen, actions)
  }
}