import type { GameState } from './types'

export const WATCHTOWER_ESTIMATION_TARGET=24
export const WATCHTOWER_VISIBILITY_THRESHOLD_PERCENT=33

export interface WatchtowerEstimationProgress { day:number; contributors:string[] }

declare module './types' {
  interface TownState {
    watchtowerEstimation?:WatchtowerEstimationProgress
  }
}

function currentProgress(state:GameState):WatchtowerEstimationProgress{
  const existing=state.town.watchtowerEstimation
  return existing?.day===state.day?{day:state.day,contributors:[...existing.contributors]}:{day:state.day,contributors:[]}
}

export function watchtowerContributors(state:GameState):string[]{return currentProgress(state).contributors}
export function watchtowerContributionWeight(state:GameState):number{
  if(!state.town.construction.watchtower?.completed)return 0
  const scanner=state.town.construction.scanner?.completed===true
  const telescope=state.town.bank.some((item)=>item.type==='telescope')
  return scanner||telescope?2:1
}
export function watchtowerWeightedContributions(state:GameState):number{return watchtowerContributors(state).length*watchtowerContributionWeight(state)}
export function watchtowerTodayWeightedContributions(state:GameState):number{return Math.min(WATCHTOWER_ESTIMATION_TARGET,watchtowerWeightedContributions(state))}
export function watchtowerTodayQuality(state:GameState):number{return Math.min(1,watchtowerTodayWeightedContributions(state)/WATCHTOWER_ESTIMATION_TARGET)}
export function watchtowerTodayVisible(state:GameState):boolean{return Math.round(watchtowerTodayQuality(state)*100)>=WATCHTOWER_VISIBILITY_THRESHOLD_PERCENT}
export function watchtowerTodayComplete(state:GameState):boolean{return watchtowerTodayWeightedContributions(state)>=WATCHTOWER_ESTIMATION_TARGET}
export function watchtowerTomorrowWeightedContributions(state:GameState):number{
  if(!state.town.construction.planner?.completed||!watchtowerTodayComplete(state))return 0
  return Math.min(WATCHTOWER_ESTIMATION_TARGET,Math.max(0,watchtowerWeightedContributions(state)-WATCHTOWER_ESTIMATION_TARGET))
}
export function watchtowerTomorrowQuality(state:GameState):number{return Math.min(1,watchtowerTomorrowWeightedContributions(state)/WATCHTOWER_ESTIMATION_TARGET)}
export function watchtowerTomorrowVisible(state:GameState):boolean{return Math.round(watchtowerTomorrowQuality(state)*100)>=WATCHTOWER_VISIBILITY_THRESHOLD_PERCENT}
export function citizenContributedWatchtower(state:GameState,citizenId:string):boolean{return watchtowerContributors(state).includes(citizenId)}
export function canContributeWatchtower(state:GameState,citizenId:string):boolean{
  const citizen=state.citizens.find((candidate)=>candidate.id===citizenId)
  return Boolean(state.town.construction.watchtower?.completed&&state.clock.phase==='day'&&citizen?.alive&&citizen.location.type==='town'&&!citizenContributedWatchtower(state,citizenId))
}
export function contributeWatchtowerEstimation(state:GameState,citizenId:string):GameState{
  if(!canContributeWatchtower(state,citizenId))return state
  const progress=currentProgress(state)
  return{...state,town:{...state.town,watchtowerEstimation:{day:state.day,contributors:[...progress.contributors,citizenId]}}}
}

/**
 * Autonomous estimation uses the same public town action as a player. It is free, once per
 * citizen/day, and never reads the hidden attack value. Bots contribute after the morning
 * planning window so normal 40-citizen towns can collaboratively improve the estimate.
 */
export function contributeAutonomousWatchtowerEstimation(state:GameState,controlledCitizenId?:string):GameState{
  if(state.clock.phase!=='day'||state.clock.hour<8||!state.town.construction.watchtower?.completed)return state
  let next=state
  for(const citizen of state.citizens){
    if(citizen.controller!=='basic-bot'||citizen.id===controlledCitizenId)continue
    if(canContributeWatchtower(next,citizen.id))next=contributeWatchtowerEstimation(next,citizen.id)
  }
  return next
}
