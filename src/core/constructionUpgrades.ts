import { CONSTRUCTION_CATALOG } from './constructionCatalog'
import type { ConstructionId, GameState } from './types'
import { randomInt } from './rng'

export type ConstructionUpgradeKind='defense_total'|'well_once'
export interface ConstructionUpgradeTrack {
  projectId:ConstructionId
  maxLevel:number
  kind:ConstructionUpgradeKind
  values:readonly number[]
  benefits:readonly string[]
  sourceNote:string
}
export interface UpgradeProjectsState {
  levels:Partial<Record<ConstructionId,number>>
  votes:Record<string,ConstructionId>
  resolvedDay:number|null
  lastWinner:ConstructionId|null
  lastWinnerDay:number|null
  lastWinningVotes:number
}
type UpgradeAwareTown=GameState['town']&{upgradeProjects?:UpgradeProjectsState}

const EMPTY_UPGRADES:UpgradeProjectsState={levels:{},votes:{},resolvedDay:null,lastWinner:null,lastWinnerDay:null,lastWinningVotes:0}
function upgradeState(state:GameState):UpgradeProjectsState{return (state.town as UpgradeAwareTown).upgradeProjects??EMPTY_UPGRADES}
function withUpgradeState(state:GameState,upgrades:UpgradeProjectsState,townPatch:Partial<GameState['town']>={}):GameState{
  return{...state,town:{...state.town,...townPatch,upgradeProjects:upgrades} as GameState['town']}
}

/**
 * Active tracks whose effects are representable by current Live2Nite systems.
 * Other source `hasUpgrade` constructions remain in the complete catalogue but are not made
 * votable until their dependent mechanics can be implemented without placeholder behavior.
 */
export const CONSTRUCTION_UPGRADE_TRACKS:Readonly<Partial<Record<ConstructionId,ConstructionUpgradeTrack>>>={
  great_pit:{
    projectId:'great_pit',maxLevel:5,kind:'defense_total',values:[10,23,44,76,109,160],
    benefits:[
      'Great Pit defense rises from 10 to 23 (+13).',
      'Great Pit defense rises from 23 to 44 (+21).',
      'Great Pit defense rises from 44 to 76 (+32).',
      'Great Pit defense rises from 76 to 109 (+33).',
      'Great Pit defense rises from 109 to 160 (+51).',
    ],sourceNote:'MyHordes daily-upgrade defense track.',
  },
  upgradeable_wall:{
    projectId:'upgradeable_wall',maxLevel:5,kind:'defense_total',values:[55,85,120,170,235,315],
    benefits:[
      'Evolutive Wall defense rises from 55 to 85 (+30).',
      'Evolutive Wall defense rises from 85 to 120 (+35).',
      'Evolutive Wall defense rises from 120 to 170 (+50).',
      'Evolutive Wall defense rises from 170 to 235 (+65).',
      'Evolutive Wall defense rises from 235 to 315 (+80).',
    ],sourceNote:'MyHordes daily-upgrade defense track.',
  },
  pump:{
    projectId:'pump',maxLevel:5,kind:'well_once',values:[0,20,20,30,30,40],
    benefits:[
      'Immediately adds 20 Water Rations to the Well.',
      'Immediately adds another 20 Water Rations to the Well.',
      'Immediately adds 30 Water Rations to the Well.',
      'Immediately adds another 30 Water Rations to the Well.',
      'Immediately adds 40 Water Rations to the Well.',
    ],sourceNote:'MyHordes Pump daily-upgrade one-time water additions.',
  },
}
export const ACTIVE_CONSTRUCTION_UPGRADE_IDS=Object.freeze(Object.keys(CONSTRUCTION_UPGRADE_TRACKS) as ConstructionId[])

export function constructionUpgradeTrack(projectId:ConstructionId):ConstructionUpgradeTrack|null{return CONSTRUCTION_UPGRADE_TRACKS[projectId]??null}
export function constructionUpgradeLevel(state:GameState,projectId:ConstructionId):number{return Math.max(0,upgradeState(state).levels[projectId]??0)}
export function constructionUpgradeNextBenefit(state:GameState,projectId:ConstructionId):string|null{
  const track=constructionUpgradeTrack(projectId);if(!track)return null
  const level=constructionUpgradeLevel(state,projectId)
  return level>=track.maxLevel?null:track.benefits[level]??null
}
export function constructionUpgradeAvailable(state:GameState,projectId:ConstructionId):boolean{
  const project=state.town.construction[projectId];const track=constructionUpgradeTrack(projectId)
  return Boolean(project?.completed&&track&&CONSTRUCTION_CATALOG[projectId]?.hasUpgrade&&constructionUpgradeLevel(state,projectId)<track.maxLevel)
}
export function availableConstructionUpgradeProjects(state:GameState):ConstructionId[]{return ACTIVE_CONSTRUCTION_UPGRADE_IDS.filter((id)=>constructionUpgradeAvailable(state,id))}
export function pendingCompletedUpgradeProjects(state:GameState):ConstructionId[]{return Object.values(CONSTRUCTION_CATALOG).filter((entry)=>entry.hasUpgrade&&state.town.construction[entry.id]?.completed&&!CONSTRUCTION_UPGRADE_TRACKS[entry.id]).map((entry)=>entry.id)}
export function hasUpgradeProjectsFacility(state:GameState):boolean{return availableConstructionUpgradeProjects(state).length>0||pendingCompletedUpgradeProjects(state).length>0}
export function citizenUpgradeVote(state:GameState,citizenId:string):ConstructionId|null{return upgradeState(state).votes[citizenId]??null}
export function upgradeVoteCountsVisible(state:GameState,citizenId:string):boolean{return citizenUpgradeVote(state,citizenId)!==null}
export function constructionUpgradeVoteCounts(state:GameState):Partial<Record<ConstructionId,number>>{
  const counts:Partial<Record<ConstructionId,number>>={}
  for(const projectId of Object.values(upgradeState(state).votes))counts[projectId]=(counts[projectId]??0)+1
  return counts
}
export function lastUpgradeWinner(state:GameState):{projectId:ConstructionId|null;day:number|null;votes:number}{const u=upgradeState(state);return{projectId:u.lastWinner,day:u.lastWinnerDay,votes:u.lastWinningVotes}}

export function canCitizenVoteForUpgrade(state:GameState,citizenId:string,projectId:ConstructionId):boolean{
  const citizen=state.citizens.find((candidate)=>candidate.id===citizenId)
  return Boolean(citizen?.alive&&citizen.location.type==='town'&&state.clock.phase==='day'&&!citizenUpgradeVote(state,citizenId)&&constructionUpgradeAvailable(state,projectId))
}
export function castConstructionUpgradeVote(state:GameState,citizenId:string,projectId:ConstructionId):GameState{
  if(!canCitizenVoteForUpgrade(state,citizenId,projectId))return state
  const current=upgradeState(state)
  return withUpgradeState(state,{...current,votes:{...current.votes,[citizenId]:projectId}})
}

/** Independent bot choice: no vote tally is consulted. */
export function botUpgradeProjectChoice(state:GameState,citizenId:string):ConstructionId|null{
  const candidates=availableConstructionUpgradeProjects(state);if(!candidates.length)return null
  if(candidates.includes('pump')&&state.town.well.water<80)return'pump'
  const defenseCandidates=candidates.filter((id)=>constructionUpgradeTrack(id)?.kind==='defense_total')
  if(defenseCandidates.length&&state.lastNight?.breached)return defenseCandidates[0]
  const hash=[...citizenId].reduce((sum,char)=>sum+char.charCodeAt(0),0)
  return candidates[hash%candidates.length]??candidates[0]
}
export function castAutonomousConstructionUpgradeVotes(state:GameState,controlledCitizenId?:string):GameState{
  if(state.clock.phase!=='day'||state.clock.hour<8)return state
  let next=state
  for(const citizen of state.citizens){
    if(!citizen.alive||citizen.controller!=='basic-bot'||citizen.id===controlledCitizenId||citizen.location.type!=='town'||citizenUpgradeVote(next,citizen.id))continue
    const projectId=botUpgradeProjectChoice(next,citizen.id);if(projectId)next=castConstructionUpgradeVote(next,citizen.id,projectId)
  }
  return next
}

function applyWinningUpgrade(state:GameState,projectId:ConstructionId):GameState{
  const track=constructionUpgradeTrack(projectId);if(!track)return state
  const current=upgradeState(state);const fromLevel=constructionUpgradeLevel(state,projectId);if(fromLevel>=track.maxLevel)return state
  const toLevel=fromLevel+1
  let townPatch:Partial<GameState['town']>={}
  if(track.kind==='defense_total'){
    const before=track.values[fromLevel]??0;const after=track.values[toLevel]??before
    townPatch={defense:state.town.defense+Math.max(0,after-before)}
  }else if(track.kind==='well_once'){
    const amount=track.values[toLevel]??0
    townPatch={well:{water:state.town.well.water+amount}}
  }
  return withUpgradeState(state,{...current,levels:{...current.levels,[projectId]:toLevel}},townPatch)
}
export function resolveConstructionUpgradeVotesAtMidnight(state:GameState):GameState{
  const current=upgradeState(state);if(current.resolvedDay===state.day)return state
  const counts=constructionUpgradeVoteCounts(state)
  const eligible=availableConstructionUpgradeProjects(state).filter((id)=>(counts[id]??0)>0)
  if(!eligible.length)return withUpgradeState(state,{...current,resolvedDay:state.day,lastWinner:null,lastWinnerDay:state.day,lastWinningVotes:0})
  const top=Math.max(...eligible.map((id)=>counts[id]??0));const tied=eligible.filter((id)=>(counts[id]??0)===top)
  const roll=tied.length>1?randomInt(state.rngState,0,tied.length-1):{value:0,state:state.rngState};const projectId=tied[roll.value]!
  const upgraded=applyWinningUpgrade({...state,rngState:roll.state},projectId);const after=upgradeState(upgraded)
  return withUpgradeState(upgraded,{...after,resolvedDay:state.day,lastWinner:projectId,lastWinnerDay:state.day,lastWinningVotes:top})
}
export function resetConstructionUpgradeVotesForNewDay(state:GameState):GameState{
  const current=upgradeState(state)
  if(!Object.keys(current.votes).length)return state
  return withUpgradeState(state,{...current,votes:{}})
}
