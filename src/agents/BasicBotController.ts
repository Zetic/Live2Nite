import { getLegalActions } from '../core/actions'
import { isScout, scoutCamouflageActive } from '../core/scout'
import type { GameCommand } from '../core/types'
import { relativeControlActive, temporaryControlActive, zoneControl, zoneControlState } from '../core/world'
import { asAgentDecisionContext, type AgentDecisionInput } from './AgentDecisionContext'
import type { AgentController } from './AgentController'
import { AI_TUNING } from './AiTuning'
import { bestWeaponAction, controlAwareMove, controlAwareStepTowardTown } from './actions/FieldActions'
import { packageSharingAction, prepareLoadout, refillAction, unloadAction } from './actions/InventoryActions'
import { campingAction, conditionTreatmentAction, hydrationAction } from './actions/SurvivalActions'
import { carried, pick } from './actions/actionSelectors'
import { commitmentForCitizen, committedConstructionProject, reservedApForCitizen } from './coordination/TownCoordination'
import { publicDefenseAssessment } from './planning/TownDefenseStrategy'
import { planExpedition } from './planning/ExpeditionPlanner'
import { opportunisticFieldAction } from './planning/LootPolicy'
import { missionSafety } from './planning/MissionLifecycle'
import { nextDirectionToward } from './planning/RoutePlanner'
import { chooseTownWork, townWorkApCost } from './townWork'

export class BasicBotController implements AgentController {
  readonly kind='basic-bot'
  decide(input:AgentDecisionInput,citizenId:string):GameCommand|null{
    const{state:game}=asAgentDecisionContext(input);const citizen=game.citizens.find((candidate)=>candidate.id===citizenId);if(!citizen||!citizen.alive||game.clock.phase!=='day')return null
    const actions=getLegalActions(game,citizenId);if(!actions.length)return null;const mission=game.botMissions[citizenId]??null;if(citizen.camping.hidden)return null
    const hydration=hydrationAction(game,citizen,actions);if(hydration)return hydration
    const treatment=conditionTreatmentAction(game,citizen,actions);if(treatment)return treatment
    const recamouflage=pick(actions,'RECAMOUFLAGE');if(recamouflage)return recamouflage
    if(citizen.location.type==='town'){
      const blueprint=actions.find((action)=>action.type==='READ_BLUEPRINT')??null;if(blueprint)return blueprint
      const plan=planExpedition(game,citizenId);const unload=unloadAction(citizen,actions,plan,mission?.phase==='unload');if(unload)return unload;if(mission?.phase==='unload')return null
      const commitment=commitmentForCitizen(game,citizenId);const reservedAp=reservedApForCitizen(game,citizenId)
      if(!mission&&isScout(citizen)){const mapping=pick(actions,'MAP_WASTELAND');if(mapping&&citizen.ap-1>=reservedAp)return mapping}
      if(!mission&&reservedAp>=citizen.ap){const packages=packageSharingAction(citizen,actions,null,game.clock.hour);if(packages)return packages;const reservedHydration=hydrationAction(game,citizen,actions,{forceThirstTreatment:game.clock.hour>=AI_TUNING.lateHydrationTreatmentHour});if(reservedHydration)return reservedHydration;return null}
      if(!mission){
        const committedProject=committedConstructionProject(game,citizenId)
        if(committedProject){const contribution=actions.find((action)=>action.type==='CONTRIBUTE_CONSTRUCTION'&&action.projectId===committedProject);if(contribution)return contribution}
        const townWork=chooseTownWork(game,citizen,actions)
        const workPreservesReserve=townWork?citizen.ap-townWorkApCost(game,citizen,townWork)>=reservedAp:false
        const urgentCorpse=townWork?.type==='DISPOSE_CORPSE_OUTSIDE'||townWork?.type==='DISPOSE_CORPSE_WATER'
        const gateVolunteer=commitment?.kind==='gate_primary'||commitment?.kind==='gate_backup'
        const pressure=publicDefenseAssessment(game).pressure
        const urgentDefense=pressure==='critical'||pressure==='shortfall'
        if(townWork&&workPreservesReserve&&(urgentCorpse||commitment?.kind==='construction'||(gateVolunteer&&citizen.ap>reservedAp)||urgentDefense||game.clock.hour>=AI_TUNING.townApDumpHour))return townWork
      }
      if(!mission){const packages=packageSharingAction(citizen,actions,null,game.clock.hour);if(packages)return packages;const lateHydration=hydrationAction(game,citizen,actions,{forceThirstTreatment:game.clock.hour>=AI_TUNING.lateHydrationTreatmentHour});if(lateHydration)return lateHydration;return null}
      if(mission.phase!=='prepare')return null
      if(plan){const prep=prepareLoadout(game,citizen,actions,plan);if(prep)return prep;if(!plan.feasible&&!mission.emergency)return null}
      const open=pick(actions,'OPEN_GATE');if(open)return open;return pick(actions,'EXIT_TOWN')
    }
    const control=zoneControl(game,citizen.location.x,citizen.location.y)
    if(control.trapped&&scoutCamouflageActive(citizen)){
      if(mission?.phase==='camp')return campingAction(game,citizen,actions)
      if(mission?.phase==='outbound'){
        const direction=nextDirectionToward(game,{x:citizen.location.x,y:citizen.location.y},mission.target)
        if(direction){const move=controlAwareMove(game,citizen,actions,direction,false);if(move)return move}
      }
      return controlAwareStepTowardTown(game,citizen,actions)
    }
    if(control.trapped){if(temporaryControlActive(game,citizen.id)||relativeControlActive(game,citizen.id)){const safety=missionSafety(game,citizenId);const refill=refillAction(citizen,actions,safety.returnAp);if(refill)return refill;return controlAwareStepTowardTown(game,citizen,actions)}const weapon=bestWeaponAction(citizen,actions);if(weapon)return weapon;const flee=pick(actions,'FLEE_ZOMBIES');if(flee&&(mission?.phase==='return'||game.clock.hour>=AI_TUNING.fleeZombieTrapHour))return flee;if(game.clock.hour>=AI_TUNING.lateBarehandedFightHour){const fists=pick(actions,'ATTACK_BAREHANDED');if(fists)return fists}if(mission?.phase==='camp')return campingAction(game,citizen,actions);return null}
    if(mission?.role==='rescue'&&zoneControlState(game,citizen.location.x,citizen.location.y)==='fragile'){const weapon=bestWeaponAction(citizen,actions);if(weapon)return weapon}
    const opportunistic=opportunisticFieldAction(game,citizen,actions,mission);if(opportunistic)return opportunistic
    if(citizen.status.hydration!=='normal'&&!carried(citizen,'water_ration'))return controlAwareStepTowardTown(game,citizen,actions)
    if(!mission)return controlAwareStepTowardTown(game,citizen,actions)
    if(mission.phase==='camp')return campingAction(game,citizen,actions)
    if(mission.phase==='return'){const safety=missionSafety(game,citizenId);const refill=refillAction(citizen,actions,safety.returnAp);if(refill)return refill;return controlAwareStepTowardTown(game,citizen,actions)}
    const plan=planExpedition(game,citizenId);if(!plan)return controlAwareStepTowardTown(game,citizen,actions);const refill=refillAction(citizen,actions,plan.route.length+plan.expectedTaskAp+mission.safetyReserve+(plan.campingPlanned?0:plan.returnAp));if(refill)return refill
    if(mission.phase==='operate'){if(mission.role==='rescue')return null;if(mission.role==='excavator'){const excavate=pick(actions,'EXCAVATE_SPECIAL_SITE');if(excavate)return excavate}return null}
    const direction=nextDirectionToward(game,{x:citizen.location.x,y:citizen.location.y},mission.target);if(direction){const action=controlAwareMove(game,citizen,actions,direction,false);if(action)return action}return controlAwareStepTowardTown(game,citizen,actions)
  }
}
