import type { GameEvent, GameState } from '../../core/types'
import { AI_TUNING } from '../AiTuning'
import { isGateVolunteer } from '../coordination/TownCoordination'
import { chooseFrontierTarget, chooseScoutTarget } from './RoutePlanner'
import {
  acceptedAssignment,
  activeMissionCount,
  allTownCandidates,
  assignmentEvent,
  dedicatedRescueCitizenIds,
  existingForMission,
  makeAssignment,
  minimumTownReserve,
  nightGateReserveCitizenId,
  normalCandidates,
} from './AssignmentPolicy'
import { knownNonTownZones, knownOpportunities, missionKey, type MissionOpportunity } from './MissionOpportunities'
import { evaluateTownNeeds } from './TownNeeds'

export {
  DEDICATED_RESCUE_RESERVE,
  dedicatedRescueCitizenIds,
  isDedicatedRescueReserve,
  minimumTownReserve,
  nightGateReserveCitizenId,
} from './AssignmentPolicy'

function resourceStarved(state: GameState): boolean {
  const needs=evaluateTownNeeds(state)
  return Boolean(needs.activeProject && Object.keys(needs.missingConstruction).length>0)
}

function scoutDesired(state: GameState): number {
  if (state.clock.hour >= AI_TUNING.scoutCutoffHour) return 0
  const discovered = knownNonTownZones(state).length
  const base=discovered < AI_TUNING.earlyMapKnownZoneThreshold
    ? AI_TUNING.earlyScoutTarget
    : AI_TUNING.matureScoutTarget
  // Day 1 deliberately keeps the staged opening. Later towns increase reconnaissance when
  // public construction needs show that the external economy is starving.
  return state.day>1&&resourceStarved(state)?base+AI_TUNING.resourceStarvationScoutBoost:base
}

function currentFieldClaims(state:GameState,pending:GameEvent[]):number{
  return activeMissionCount(state)+pending.filter((event)=>event.type==='BOT_MISSION_ASSIGNED').length
}

function volunteerFieldFraction(state:GameState,starved:boolean):number{
  if(starved)return AI_TUNING.resourceStarvedFieldPresenceFraction
  // This is not a hidden workforce allocation. It is a saturation cue any citizen can
  // infer from the public citizen list: when few people are outside, high personal AP is
  // a stronger reason to volunteer rather than wait for someone else to do it.
  if(state.clock.hour>=10)return AI_TUNING.idleApFieldPresenceFraction
  return AI_TUNING.minimumFieldPresenceFraction
}

export function planTownMissionAssignments(state: GameState, controlledCitizenId?: string): GameEvent[] {
  if (state.clock.phase !== 'day' || state.clock.hour >= AI_TUNING.assignmentCutoffHour) return []

  // Opportunities are intentionally captured before this hour's scouts execute. That
  // means reconnaissance can unlock a larger party on a later hourly planning pass,
  // not instantaneously in the same dispatch batch.
  const opportunities = knownOpportunities(state)
  const events: GameEvent[] = []
  const used = new Set<string>()
  const rescueCandidates = allTownCandidates(state, controlledCitizenId)
    .filter((citizen) => !isGateVolunteer(state,citizen.id))

  let rescueBudget = Math.min(AI_TUNING.maxRescueResponders, rescueCandidates.length)
  for (const opportunity of opportunities.filter((item) => item.emergency)) {
    let remaining = Math.max(0, opportunity.desiredCitizens - existingForMission(state, opportunity.missionId))
    while (remaining > 0 && rescueBudget > 0) {
      const citizen = rescueCandidates.find((candidate) => !used.has(candidate.id))
      if (!citizen) break
      used.add(citizen.id)
      const proposed = makeAssignment(state, citizen, opportunity)
      const mission = acceptedAssignment(state, citizen, proposed, opportunity)
      if (mission) {
        events.push(assignmentEvent(state, citizen, mission))
        remaining -= 1
        rescueBudget -= 1
      }
    }
  }

  const livingBots = state.citizens.filter((citizen) => citizen.alive && citizen.controller === 'basic-bot').length
  const reserve = minimumTownReserve(state)
  const existingActive = activeMissionCount(state)
  const fieldCapacity = Math.max(0, livingBots - reserve - existingActive - events.length)
  let newBudget = Math.min(
    fieldCapacity,
    Math.max(2, Math.ceil(livingBots * AI_TUNING.newAssignmentFractionPerHour)),
  )
  const candidates = normalCandidates(state, controlledCitizenId)
  const assignedTargets = new Set(Object.values(state.botMissions).map((mission) => `${mission.target.x},${mission.target.y}`))

  const assignOpportunity = (opportunity: MissionOpportunity) => {
    let remaining = Math.max(
      0,
      opportunity.desiredCitizens
        - existingForMission(state, opportunity.missionId)
        - events.filter((event) =>
          event.type === 'BOT_MISSION_ASSIGNED' && event.mission.missionId === opportunity.missionId).length,
    )
    while (remaining > 0 && newBudget > 0) {
      const citizen = candidates.find((candidate) => !used.has(candidate.id))
      if (!citizen) break
      used.add(citizen.id)
      const proposed = makeAssignment(state, citizen, opportunity)
      const mission = acceptedAssignment(state, citizen, proposed, opportunity)
      if (mission) {
        events.push(assignmentEvent(state, citizen, mission))
        newBudget -= 1
        remaining -= 1
      }
    }
  }

  const existingScouts = Object.values(state.botMissions)
    .filter((mission) => mission.role === 'scout' && mission.phase !== 'unload').length
    + events.filter((event) => event.type === 'BOT_MISSION_ASSIGNED' && event.mission.role === 'scout').length
  let scoutsNeeded = Math.max(0, scoutDesired(state) - existingScouts)

  while (scoutsNeeded > 0 && newBudget > 0) {
    const citizen = candidates.find((candidate) => !used.has(candidate.id))
    if (!citizen) break
    const targetChoice = chooseScoutTarget(state, citizen.id, assignedTargets)
    if (!targetChoice) break
    const target=targetChoice.zone
    const missionId = missionKey('scout', 'explore', target.x, target.y)
    const teamSize = Math.min(AI_TUNING.scoutTeamSize, scoutsNeeded, newBudget)
    const opportunity: MissionOpportunity = {
      missionId,
      role: 'scout',
      purpose: 'explore',
      target: { x: target.x, y: target.y },
      targetLabel: `${targetChoice.kind==='recon'?'Recon':'Scout'} [${target.x},${target.y}]`,
      reason: targetChoice.kind==='recon'
        ? 'Refresh stale zombie intelligence along a useful route before larger parties mobilize.'
        : 'Expand route and zombie knowledge into an unknown frontier sector.',
      desiredCitizens: teamSize,
      priority: targetChoice.kind==='recon'?110:80,
      safetyReserve: AI_TUNING.scoutSafetyReserve,
      emergency: false,
    }
    const before = events.length
    assignOpportunity(opportunity)
    const added = events.length - before
    if (added === 0) break
    assignedTargets.add(`${target.x},${target.y}`)
    scoutsNeeded -= added
  }

  for (const opportunity of opportunities.filter((item) => !item.emergency)) {
    if (newBudget <= 0) break
    assignOpportunity(opportunity)
  }

  // Later-day citizens with substantial personal AP independently volunteer when public
  // field coverage is thin. Frontier expansion is preferred while unknown territory
  // remains; stale recon is the fallback. Same-day expedition feasibility still decides
  // whether each proposed trip is actually accepted, so this does not waive return safety.
  if(state.day>1&&state.clock.hour<AI_TUNING.fallbackExplorationCutoffHour){
    const starved=resourceStarved(state)
    const desiredPresence=Math.ceil(livingBots*volunteerFieldFraction(state,starved))
    while(newBudget>0&&currentFieldClaims(state,events)<desiredPresence){
      const citizen=candidates.find((candidate)=>!used.has(candidate.id)&&candidate.ap>=AI_TUNING.explorationVolunteerMinAp)
      if(!citizen)break
      const frontier=chooseFrontierTarget(state,citizen.id,assignedTargets)
      const choice=frontier?{zone:frontier,kind:'frontier' as const}:chooseScoutTarget(state,citizen.id,assignedTargets)
      if(!choice)break
      const target=choice.zone
      const opportunity:MissionOpportunity={
        missionId:`${missionKey('scout','explore',target.x,target.y)}:volunteer:${citizen.id}`,
        role:'scout',
        purpose:'explore',
        target:{x:target.x,y:target.y},
        targetLabel:`Volunteer ${choice.kind==='frontier'?'exploration':'recon'} [${target.x},${target.y}]`,
        reason:starved
          ? 'Construction is blocked by missing resources, few citizens are outside, and I still have usable AP; I volunteered to push the search farther.'
          : 'Field coverage is thin and I still have usable AP; spending it on safe exploration is better than losing it at midnight.',
        desiredCitizens:1,
        priority:75,
        safetyReserve:AI_TUNING.scoutSafetyReserve,
        emergency:false,
      }
      const before=events.length
      assignOpportunity(opportunity)
      if(events.length===before)break
      assignedTargets.add(`${target.x},${target.y}`)
    }
  }

  return events
}
