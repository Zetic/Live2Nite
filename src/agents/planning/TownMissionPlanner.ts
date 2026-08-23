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
  return resourceStarved(state)?base+AI_TUNING.resourceStarvationScoutBoost:base
}

function currentFieldClaims(state:GameState,pending:GameEvent[]):number{
  return activeMissionCount(state)+pending.filter((event)=>event.type==='BOT_MISSION_ASSIGNED').length
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

  // Scouting receives the first ordinary field budget. Public construction commitments
  // already removed the citizens who volunteered to build this hour, so town work no
  // longer acts as a blanket veto against everyone else leaving.
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

  // Distributed fallback: a citizen with usable AP can see that few people are outside,
  // the Bank/construction is starving, and no public field claim covers the need. Those
  // citizens volunteer for individual exploration instead of treating "no perfect mission"
  // as a reason to sit in town. Resource starvation prefers new frontier information.
  if(state.clock.hour<AI_TUNING.fallbackExplorationCutoffHour){
    const starved=resourceStarved(state)
    const desiredPresence=Math.ceil(livingBots*(starved?Math.max(0.30,AI_TUNING.minimumFieldPresenceFraction):AI_TUNING.minimumFieldPresenceFraction))
    while(newBudget>0&&currentFieldClaims(state,events)<desiredPresence){
      const citizen=candidates.find((candidate)=>!used.has(candidate.id)&&candidate.ap>=4)
      if(!citizen)break
      const frontier=starved?chooseFrontierTarget(state,citizen.id,assignedTargets):null
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
          ? 'Construction is blocked by missing resources and field coverage is thin; I have usable AP, so exploring is better than waiting in town.'
          : 'Few citizens are currently outside and I have safe usable AP, so I volunteered to improve the town map.',
        desiredCitizens:1,
        priority:70,
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
