import { CONSTRUCTION_IDS, type ConstructionId } from './constructionIds'

export interface UpgradeProjectsState {
  levels:Partial<Record<ConstructionId,number>>
  votes:Record<string,ConstructionId>
  resolvedDay:number|null
  lastWinner:ConstructionId|null
  lastWinnerDay:number|null
  lastWinningVotes:number
}

declare module './types' {
  interface TownState {
    upgradeProjects:UpgradeProjectsState
  }
}

export function createUpgradeProjectsState():UpgradeProjectsState{return{levels:{},votes:{},resolvedDay:null,lastWinner:null,lastWinnerDay:null,lastWinningVotes:0}}
function constructionId(value:unknown):value is ConstructionId{return typeof value==='string'&&CONSTRUCTION_IDS.includes(value as ConstructionId)}
function dayOrNull(value:unknown):number|null{return typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.trunc(value)):null}

/** Normalize additive persisted state so pre-upgrade towns continue from a clean vote slate. */
export function normalizeUpgradeProjectsState(value:unknown):UpgradeProjectsState{
  if(!value||typeof value!=='object')return createUpgradeProjectsState()
  const existing=value as Partial<UpgradeProjectsState>
  const levels:Partial<Record<ConstructionId,number>>={}
  if(existing.levels&&typeof existing.levels==='object')for(const[id,level]of Object.entries(existing.levels))if(constructionId(id)&&typeof level==='number'&&Number.isFinite(level))levels[id]=Math.max(0,Math.min(5,Math.trunc(level)))
  const votes:Record<string,ConstructionId>={}
  if(existing.votes&&typeof existing.votes==='object')for(const[citizenId,projectId]of Object.entries(existing.votes))if(citizenId&&constructionId(projectId))votes[citizenId]=projectId
  return{
    levels,
    votes,
    resolvedDay:dayOrNull(existing.resolvedDay),
    lastWinner:constructionId(existing.lastWinner)?existing.lastWinner:null,
    lastWinnerDay:dayOrNull(existing.lastWinnerDay),
    lastWinningVotes:typeof existing.lastWinningVotes==='number'&&Number.isFinite(existing.lastWinningVotes)?Math.max(0,Math.trunc(existing.lastWinningVotes)):0,
  }
}
