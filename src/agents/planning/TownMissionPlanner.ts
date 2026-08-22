import { getLegalActions } from '../../core/actions'
import { specialSiteName } from '../../core/specialSites'
import type { BotMissionAssignment, BotMissionPurpose, BotMissionRole, Citizen, GameEvent, GameState, WorldZone } from '../../core/types'
import { distanceToTown, zoneControl } from '../../core/world'
import { chooseTownWork } from '../townWork'
import { evaluateTownNeeds } from './TownNeeds'
import { planMission } from './ExpeditionPlanner'
import { chooseFrontierTarget } from './RoutePlanner'

interface MissionOpportunity{missionId:string;role:BotMissionRole;purpose:BotMissionPurpose;target:{x:number;y:number};targetLabel:string;reason:string;desiredCitizens:number;priority:number;safetyReserve:number;emergency:boolean}
const MINIMUM_RESERVE_FRACTION=0.15
export const DEDICATED_RESCUE_RESERVE=3
const NEW_ASSIGNMENT_FRACTION_PER_HOUR=0.20
const CONSTRUCTION_SITE_TYPES=new Set(['construction_site','wrecked_cars','dark_woods'])
function citizenNumber(citizenId:string):number{return Number(citizenId.slice(1))||0}
function missionKey(role:BotMissionRole,purpose:BotMissionPurpose,x:number,y:number):string{return`${role}:${purpose}:${x},${y}`}
function staffingForZone(zone:WorldZone):number{return Math.max(2,Math.min(5,Math.ceil((zone.zombies+1)/2)))}
function knownNonTownZones(state:GameState):WorldZone[]{return Object.values(state.world.zones).filter((zone)=>zone.discovered&&distanceToTown(zone.x,zone.y)>0)}
function activeMissionCount(state:GameState):number{return Object.values(state.botMissions).filter((mission)=>mission.phase!=='unload').length}
function existingForMission(state:GameState,missionId:string):number{return Object.values(state.botMissions).filter((mission)=>mission.missionId===missionId).length}
function returnByHour(citizenId:string):number{return 18+(citizenNumber(citizenId)%4)}

export function dedicatedRescueCitizenIds(state:GameState):string[]{
  return state.citizens
    .filter((citizen)=>citizen.alive&&citizen.controller==='basic-bot')
    .sort((a,b)=>citizenNumber(b.id)-citizenNumber(a.id))
    .slice(0,DEDICATED_RESCUE_RESERVE)
    .map((citizen)=>citizen.id)
}
export function isDedicatedRescueReserve(state:GameState,citizenId:string):boolean{return dedicatedRescueCitizenIds(state).includes(citizenId)}
export function minimumTownReserve(state:GameState):number{const livingBots=state.citizens.filter((citizen)=>citizen.alive&&citizen.controller==='basic-bot').length;return Math.max(DEDICATED_RESCUE_RESERVE,Math.ceil(livingBots*MINIMUM_RESERVE_FRACTION))}

function makeAssignment(state:GameState,citizen:Citizen,opportunity:MissionOpportunity):BotMissionAssignment{return{missionId:opportunity.missionId,role:opportunity.role,purpose:opportunity.purpose,target:opportunity.target,targetLabel:opportunity.targetLabel,reason:opportunity.reason,phase:'prepare',assignedDay:state.day,assignedHour:state.clock.hour,returnByHour:returnByHour(citizen.id),safetyReserve:opportunity.safetyReserve,emergency:opportunity.emergency}}
function sitePurpose(zone:WorldZone):BotMissionPurpose|null{const type=zone.specialSite?.type;if(!type)return null;if(CONSTRUCTION_SITE_TYPES.has(type))return'gather_construction';if(type==='supermarket')return'gather_food';if(type==='pharmacy')return'gather_medical';if(type==='police_station')return'gather_weapons';return null}

function knownOpportunities(state:GameState):MissionOpportunity[]{
  const needs=evaluateTownNeeds(state);const opportunities:MissionOpportunity[]=[]
  const trapped=state.citizens.filter((citizen)=>citizen.alive&&citizen.location.type==='world'&&zoneControl(state,citizen.location.x,citizen.location.y).trapped)
  for(const citizen of trapped){
    if(citizen.location.type!=='world')continue
    const control=zoneControl(state,citizen.location.x,citizen.location.y)
    const missingPoints=Math.max(1,control.zombiePoints-control.humanPoints)
    const desired=Math.min(5,Math.max(1,Math.ceil(missingPoints/2)))
    const id=missionKey('rescue','rescue',citizen.location.x,citizen.location.y)
    opportunities.push({missionId:id,role:'rescue',purpose:'rescue',target:{x:citizen.location.x,y:citizen.location.y},targetLabel:`Rescue at [${citizen.location.x},${citizen.location.y}]`,reason:`${citizen.name} is trapped; send enough control points and field weapons to restore movement.`,desiredCitizens:desired,priority:300,safetyReserve:0,emergency:true})
  }
  const missingConstruction=Boolean(needs.activeProject&&Object.keys(needs.missingConstruction).length>0)
  for(const zone of knownNonTownZones(state)){
    if(zone.specialSite){
      const purpose=sitePurpose(zone)
      const useful=purpose==='gather_construction'?missingConstruction:purpose==='gather_food'?needs.foodLow:purpose==='gather_weapons'?needs.weaponsLow:purpose==='gather_medical'?(state.town.bank.pharmaceutical_products??0)<2:false
      if(!purpose||!useful||zone.specialSite.status==='depleted')continue
      if(zone.specialSite.status==='buried'){
        const id=missionKey('excavator',purpose,zone.x,zone.y)
        opportunities.push({missionId:id,role:'excavator',purpose,target:{x:zone.x,y:zone.y},targetLabel:`${specialSiteName(zone.specialSite.type)} [${zone.x},${zone.y}]`,reason:`A known ${specialSiteName(zone.specialSite.type)} can address the town's ${purpose.replace('gather_','')} need once uncovered.`,desiredCitizens:Math.min(4,Math.max(2,Math.ceil((zone.specialSite.excavationRequired-zone.specialSite.excavationProgress)/2))),priority:180,safetyReserve:1,emergency:false})
      }else{
        const id=missionKey('gatherer',purpose,zone.x,zone.y)
        opportunities.push({missionId:id,role:'gatherer',purpose,target:{x:zone.x,y:zone.y},targetLabel:`${specialSiteName(zone.specialSite.type)} [${zone.x},${zone.y}]`,reason:`The town has a known ${specialSiteName(zone.specialSite.type)} matching its ${purpose.replace('gather_','')} need.`,desiredCitizens:staffingForZone(zone),priority:170,safetyReserve:1,emergency:false})
      }
    }
  }
  if(missingConstruction){
    const fresh=knownNonTownZones(state).filter((zone)=>zone.searchesRemaining>0&&zone.zombies<=8).sort((a,b)=>a.zombies-b.zombies||distanceToTown(b.x,b.y)-distanceToTown(a.x,a.y)).slice(0,6)
    for(const zone of fresh){
      const id=missionKey('gatherer','gather_construction',zone.x,zone.y)
      opportunities.push({missionId:id,role:'gatherer',purpose:'gather_construction',target:{x:zone.x,y:zone.y},targetLabel:`Fresh zone [${zone.x},${zone.y}]`,reason:`${needs.activeProject} still lacks construction materials; keep a party on this productive zone long enough to exploit repeated searches.`,desiredCitizens:staffingForZone(zone),priority:140,safetyReserve:1,emergency:false})
    }
  }
  return opportunities.sort((a,b)=>b.priority-a.priority)
}

function scoutDesired(state:GameState):number{if(state.clock.hour>=18)return 0;const discovered=knownNonTownZones(state).length;if(discovered<25)return 4;return 2}
function hasImmediateTownWork(state:GameState,citizen:Citizen):boolean{return Boolean(chooseTownWork(state,citizen,getLegalActions(state,citizen.id)))}
function allTownCandidates(state:GameState,controlledCitizenId?:string):Citizen[]{const offset=state.day*7+state.clock.hour*3;return state.citizens.filter((citizen)=>citizen.alive&&citizen.controller==='basic-bot'&&citizen.location.type==='town'&&citizen.id!==controlledCitizenId&&!state.botMissions[citizen.id]).sort((a,b)=>((citizenNumber(a.id)+offset)%100)-((citizenNumber(b.id)+offset)%100))}
function normalCandidates(state:GameState,controlledCitizenId?:string):Citizen[]{const dedicated=new Set(dedicatedRescueCitizenIds(state));return allTownCandidates(state,controlledCitizenId).filter((citizen)=>!dedicated.has(citizen.id)&&!hasImmediateTownWork(state,citizen))}
function assignmentEvent(state:GameState,citizen:Citizen,mission:BotMissionAssignment):GameEvent{return{type:'BOT_MISSION_ASSIGNED',day:state.day,hour:state.clock.hour,citizenId:citizen.id,mission}}
function canAcceptMission(state:GameState,citizen:Citizen,mission:BotMissionAssignment,opportunity:MissionOpportunity):boolean{const plan=planMission(state,citizen.id,mission);if(!plan)return false;if(!opportunity.emergency)return plan.feasible;return plan.route.length<=plan.loadout.potentialAp}

export function planTownMissionAssignments(state:GameState,controlledCitizenId?:string):GameEvent[]{
  if(state.clock.phase!=='day'||state.clock.hour>=22)return[]
  const opportunities=knownOpportunities(state);const events:GameEvent[]=[];const used=new Set<string>()
  const dedicated=new Set(dedicatedRescueCitizenIds(state))
  const rescueCandidates=allTownCandidates(state,controlledCitizenId).sort((a,b)=>Number(dedicated.has(b.id))-Number(dedicated.has(a.id)))
  let rescueBudget=Math.min(DEDICATED_RESCUE_RESERVE,rescueCandidates.length)
  for(const opportunity of opportunities.filter((item)=>item.emergency)){
    let remaining=Math.max(0,opportunity.desiredCitizens-existingForMission(state,opportunity.missionId))
    while(remaining>0&&rescueBudget>0){const citizen=rescueCandidates.find((candidate)=>!used.has(candidate.id));if(!citizen)break;used.add(citizen.id);const mission=makeAssignment(state,citizen,opportunity);if(canAcceptMission(state,citizen,mission,opportunity)){events.push(assignmentEvent(state,citizen,mission));remaining-=1;rescueBudget-=1}}
  }

  const livingBots=state.citizens.filter((citizen)=>citizen.alive&&citizen.controller==='basic-bot').length
  const reserve=minimumTownReserve(state)
  const existingActive=activeMissionCount(state)
  const fieldCapacity=Math.max(0,livingBots-reserve-existingActive-events.length)
  let newBudget=Math.min(fieldCapacity,Math.max(2,Math.ceil(livingBots*NEW_ASSIGNMENT_FRACTION_PER_HOUR)))
  const candidates=normalCandidates(state,controlledCitizenId)
  const assignedTargets=new Set(Object.values(state.botMissions).map((mission)=>`${mission.target.x},${mission.target.y}`))
  const assignOpportunity=(opportunity:MissionOpportunity)=>{
    let remaining=Math.max(0,opportunity.desiredCitizens-existingForMission(state,opportunity.missionId)-events.filter((event)=>event.type==='BOT_MISSION_ASSIGNED'&&event.mission.missionId===opportunity.missionId).length)
    while(remaining>0&&newBudget>0){const citizen=candidates.find((candidate)=>!used.has(candidate.id));if(!citizen)break;used.add(citizen.id);const mission=makeAssignment(state,citizen,opportunity);if(canAcceptMission(state,citizen,mission,opportunity)){events.push(assignmentEvent(state,citizen,mission));newBudget-=1;remaining-=1}}
  }
  for(const opportunity of opportunities.filter((item)=>!item.emergency)){if(newBudget<=0)break;assignOpportunity(opportunity)}

  const existingScouts=Object.values(state.botMissions).filter((mission)=>mission.role==='scout'&&mission.phase!=='unload').length+events.filter((event)=>event.type==='BOT_MISSION_ASSIGNED'&&event.mission.role==='scout').length
  let scoutsNeeded=Math.max(0,scoutDesired(state)-existingScouts)
  while(scoutsNeeded>0&&newBudget>0){
    const citizen=candidates.find((candidate)=>!used.has(candidate.id));if(!citizen)break
    const target=chooseFrontierTarget(state,citizen.id,assignedTargets);if(!target)break
    const missionId=missionKey('scout','explore',target.x,target.y)
    const teamSize=Math.min(2,scoutsNeeded,newBudget)
    const opportunity:MissionOpportunity={missionId,role:'scout',purpose:'explore',target:{x:target.x,y:target.y},targetLabel:`Scout [${target.x},${target.y}]`,reason:'A two-citizen scout team expands route and zombie knowledge before larger resource parties mobilize.',desiredCitizens:teamSize,priority:80,safetyReserve:2,emergency:false}
    const before=events.length;assignOpportunity(opportunity);const added=events.length-before;if(added===0)break
    assignedTargets.add(`${target.x},${target.y}`);scoutsNeeded-=added
  }
  return events
}
