import { CONSTRUCTION_CATALOG } from './constructionCatalog'
import { randomInt } from './rng'
import type { ConstructionId, GameState } from './types'
import type { UpgradeProjectsState } from './upgradeProjectsState'

export type ConstructionUpgradeKind='defense_total'|'well_once'|'construction_discount'|'night_watch'|'observation_radius'|'search_recovery'
export interface ConstructionUpgradeTrack {
  projectId:ConstructionId
  maxLevel:number
  kind:ConstructionUpgradeKind
  values:readonly number[]
  benefits:readonly string[]
  sourceNote:string
}

function upgradeState(state:GameState):UpgradeProjectsState{return state.town.upgradeProjects}
function withUpgradeState(state:GameState,upgrades:UpgradeProjectsState,townPatch:Partial<GameState['town']>={}):GameState{return{...state,town:{...state.town,...townPatch,upgradeProjects:upgrades}}}

/** Active tracks whose effects can be represented faithfully by current Live2Nite systems. */
export const CONSTRUCTION_UPGRADE_TRACKS:Readonly<Partial<Record<ConstructionId,ConstructionUpgradeTrack>>>={
  great_pit:{projectId:'great_pit',maxLevel:5,kind:'defense_total',values:[10,23,44,76,109,160],benefits:['Great Pit defense rises from 10 to 23 (+13).','Great Pit defense rises from 23 to 44 (+21).','Great Pit defense rises from 44 to 76 (+32).','Great Pit defense rises from 76 to 109 (+33).','Great Pit defense rises from 109 to 160 (+51).'],sourceNote:'MyHordes daily-upgrade defense track.'},
  upgradeable_wall:{projectId:'upgradeable_wall',maxLevel:5,kind:'defense_total',values:[55,85,120,170,235,315],benefits:['Evolutive Wall defense rises from 55 to 85 (+30).','Evolutive Wall defense rises from 85 to 120 (+35).','Evolutive Wall defense rises from 120 to 170 (+50).','Evolutive Wall defense rises from 170 to 235 (+65).','Evolutive Wall defense rises from 235 to 315 (+80).'],sourceNote:'MyHordes daily-upgrade defense track.'},
  pump:{projectId:'pump',maxLevel:5,kind:'well_once',values:[0,20,20,30,30,40],benefits:['Immediately adds 20 Water Rations to the Well.','Immediately adds another 20 Water Rations to the Well.','Immediately adds 30 Water Rations to the Well.','Immediately adds another 30 Water Rations to the Well.','Immediately adds 40 Water Rations to the Well.'],sourceNote:'MyHordes Pump daily-upgrade one-time water additions.'},
  workshop:{projectId:'workshop',maxLevel:5,kind:'construction_discount',values:[0,6,12,18,24,30],benefits:['Reduces every unfinished construction AP requirement by 6% of its base cost.','Total construction AP reduction becomes 12% of base cost.','Total construction AP reduction becomes 18% of base cost.','Total construction AP reduction becomes 24% of base cost.','Total construction AP reduction becomes 30% of base cost.'],sourceNote:'Current MyHordes behavior: one Workshop upgrade removes 18 AP from a 300 AP project (6%).'},
  battlements:{projectId:'battlements',maxLevel:3,kind:'night_watch',values:[10,20,40,40],benefits:['Night Watch capacity rises from 10 to 20 citizens.','Night Watch capacity rises from 20 to 40 citizens.','Capacity remains 40 and every Watchman receives −1 percentage point death chance.'],sourceNote:'Current MyHordes Battlements daily-upgrade track: 10 → 20 → 40 Watchmen, then −1pp Watch death risk at level 3.'},
  observation_platform:{projectId:'observation_platform',maxLevel:3,kind:'observation_radius',values:[0,3,6,10],benefits:['Nightly World Beyond intelligence refresh expands to 3 km from town.','Nightly intelligence refresh expands to 6 km from town.','Nightly intelligence refresh expands to 10 km from town.'],sourceNote:'Current Observation Platform radius behavior. Source levels 4–5 additionally grant free-return distance and remain deferred until that listener path is verified.'},
  search_tower:{projectId:'search_tower',maxLevel:5,kind:'search_recovery',values:[25,37,49,61,73,85],benefits:['Affected-direction depleted-zone recovery chance rises from 25% to 37%.','Recovery chance rises from 37% to 49%.','Recovery chance rises from 49% to 61%.','Recovery chance rises from 61% to 73%.','Recovery chance rises from 73% to 85%.'],sourceNote:'Current Searchtower recovery progression: 25 / 37 / 49 / 61 / 73 / 85 percent.'},
}
export const ACTIVE_CONSTRUCTION_UPGRADE_IDS=Object.freeze(Object.keys(CONSTRUCTION_UPGRADE_TRACKS) as ConstructionId[])

export function constructionUpgradeTrack(projectId:ConstructionId):ConstructionUpgradeTrack|null{return CONSTRUCTION_UPGRADE_TRACKS[projectId]??null}
export function constructionUpgradeLevel(state:GameState,projectId:ConstructionId):number{return Math.max(0,upgradeState(state).levels[projectId]??0)}
export function constructionUpgradeNextBenefit(state:GameState,projectId:ConstructionId):string|null{const track=constructionUpgradeTrack(projectId);if(!track)return null;const level=constructionUpgradeLevel(state,projectId);return level>=track.maxLevel?null:track.benefits[level]??null}
export function constructionUpgradeAvailable(state:GameState,projectId:ConstructionId):boolean{const project=state.town.construction[projectId];const track=constructionUpgradeTrack(projectId);return Boolean(project?.completed&&track&&CONSTRUCTION_CATALOG[projectId]?.hasUpgrade&&constructionUpgradeLevel(state,projectId)<track.maxLevel)}
export function availableConstructionUpgradeProjects(state:GameState):ConstructionId[]{return ACTIVE_CONSTRUCTION_UPGRADE_IDS.filter((id)=>constructionUpgradeAvailable(state,id))}
export function pendingCompletedUpgradeProjects(state:GameState):ConstructionId[]{return Object.values(CONSTRUCTION_CATALOG).filter((entry)=>entry.hasUpgrade&&state.town.construction[entry.id]?.completed&&!CONSTRUCTION_UPGRADE_TRACKS[entry.id]).map((entry)=>entry.id)}
export function hasUpgradeProjectsFacility(state:GameState):boolean{return availableConstructionUpgradeProjects(state).length>0||pendingCompletedUpgradeProjects(state).length>0}
export function citizenUpgradeVote(state:GameState,citizenId:string):ConstructionId|null{return upgradeState(state).votes[citizenId]??null}
export function upgradeVoteCountsVisible(state:GameState,citizenId:string):boolean{return citizenUpgradeVote(state,citizenId)!==null}
export function constructionUpgradeVoteCounts(state:GameState):Partial<Record<ConstructionId,number>>{const counts:Partial<Record<ConstructionId,number>>={};for(const projectId of Object.values(upgradeState(state).votes))counts[projectId]=(counts[projectId]??0)+1;return counts}
export function lastUpgradeWinner(state:GameState):{projectId:ConstructionId|null;day:number|null;votes:number}{const u=upgradeState(state);return{projectId:u.lastWinner,day:u.lastWinnerDay,votes:u.lastWinningVotes}}
export function workshopConstructionDiscountPercent(state:GameState):number{return Math.min(30,constructionUpgradeLevel(state,'workshop')*6)}
export function workshopCreditedLabor(baseAp:number,level:number):number{return Math.max(0,baseAp-Math.ceil(baseAp*(100-Math.min(30,level*6))/100))}
export function constructionUpgradeDefenseBonus(state:GameState,projectId:ConstructionId):number{
  const track=constructionUpgradeTrack(projectId)
  if(track?.kind!=='defense_total'||!state.town.construction[projectId]?.completed)return 0
  const level=Math.min(constructionUpgradeLevel(state,projectId),track.maxLevel)
  const base=track.values[0]??0
  return Math.max(0,(track.values[level]??base)-base)
}
export function totalConstructionUpgradeDefenseBonus(state:GameState):number{return ACTIVE_CONSTRUCTION_UPGRADE_IDS.reduce((sum,id)=>sum+constructionUpgradeDefenseBonus(state,id),0)}

export function canCitizenVoteForUpgrade(state:GameState,citizenId:string,projectId:ConstructionId):boolean{const citizen=state.citizens.find((candidate)=>candidate.id===citizenId);return Boolean(citizen?.alive&&citizen.location.type==='town'&&state.clock.phase==='day'&&!citizenUpgradeVote(state,citizenId)&&constructionUpgradeAvailable(state,projectId))}
export function castConstructionUpgradeVote(state:GameState,citizenId:string,projectId:ConstructionId):GameState{if(!canCitizenVoteForUpgrade(state,citizenId,projectId))return state;const current=upgradeState(state);return withUpgradeState(state,{...current,votes:{...current.votes,[citizenId]:projectId}})}

/** Independent bot choice: no vote tally is consulted. */
export function botUpgradeProjectChoice(state:GameState,citizenId:string):ConstructionId|null{
  const candidates=availableConstructionUpgradeProjects(state);if(!candidates.length)return null
  if(candidates.includes('pump')&&state.town.well.water<80)return'pump'
  if(candidates.includes('battlements')&&(state.lastNight?.breached||state.day>=3))return'battlements'
  if(candidates.includes('observation_platform')&&state.day>=2)return'observation_platform'
  if(candidates.includes('search_tower')&&state.day>=3)return'search_tower'
  if(candidates.includes('workshop')){const unfinished=Object.values(state.town.construction).filter((project)=>project.discovered&&!project.completed).length;if(unfinished>=6)return'workshop'}
  const defenseCandidates=candidates.filter((id)=>constructionUpgradeTrack(id)?.kind==='defense_total');if(defenseCandidates.length&&state.lastNight?.breached)return defenseCandidates[0]
  const hash=[...citizenId].reduce((sum,char)=>sum+char.charCodeAt(0),0);return candidates[hash%candidates.length]??candidates[0]
}
export function castAutonomousConstructionUpgradeVotes(state:GameState,controlledCitizenId?:string):GameState{
  if(state.clock.phase!=='day'||state.clock.hour<8)return state
  let next=state
  for(const citizen of state.citizens){if(!citizen.alive||citizen.controller!=='basic-bot'||citizen.id===controlledCitizenId||citizen.location.type!=='town'||citizenUpgradeVote(next,citizen.id))continue;const projectId=botUpgradeProjectChoice(next,citizen.id);if(projectId)next=castConstructionUpgradeVote(next,citizen.id,projectId)}
  return next
}

function applyWorkshopUpgradeLabor(state:GameState,fromLevel:number,toLevel:number):GameState['town']['construction']{
  const construction={...state.town.construction}
  for(const [id,project] of Object.entries(state.town.construction) as Array<[ConstructionId,GameState['town']['construction'][ConstructionId]]>){
    if(project.completed||id==='workshop')continue
    const baseAp=CONSTRUCTION_CATALOG[id].apCost
    const delta=workshopCreditedLabor(baseAp,toLevel)-workshopCreditedLabor(baseAp,fromLevel)
    if(delta>0)construction[id]={...project,apContributed:Math.min(baseAp,project.apContributed+delta)}
  }
  return construction
}
function ensureWorkshopBaseline(state:GameState):GameState{
  const level=constructionUpgradeLevel(state,'workshop')
  if(level<=0)return state
  const construction={...state.town.construction};let changed=false
  for(const [id,project] of Object.entries(state.town.construction) as Array<[ConstructionId,GameState['town']['construction'][ConstructionId]]>){
    if(project.completed||id==='workshop')continue
    const baseAp=CONSTRUCTION_CATALOG[id].apCost
    const baseline=workshopCreditedLabor(baseAp,level)
    if(project.apContributed<baseline){construction[id]={...project,apContributed:baseline};changed=true}
  }
  return changed?{...state,town:{...state.town,construction}}:state
}
function applyWinningUpgrade(state:GameState,projectId:ConstructionId):GameState{
  const track=constructionUpgradeTrack(projectId);if(!track)return state
  const current=upgradeState(state);const fromLevel=constructionUpgradeLevel(state,projectId);if(fromLevel>=track.maxLevel)return state
  const toLevel=fromLevel+1;let townPatch:Partial<GameState['town']>={}
  if(track.kind==='well_once'){const amount=track.values[toLevel]??0;townPatch={well:{water:state.town.well.water+amount}}}
  else if(track.kind==='construction_discount')townPatch={construction:applyWorkshopUpgradeLabor(state,fromLevel,toLevel)}
  return withUpgradeState(state,{...current,levels:{...current.levels,[projectId]:toLevel}},townPatch)
}
export function resolveConstructionUpgradeVotesAtMidnight(state:GameState):GameState{
  const current=upgradeState(state);if(current.resolvedDay===state.day)return state
  const counts=constructionUpgradeVoteCounts(state);const eligible=availableConstructionUpgradeProjects(state).filter((id)=>(counts[id]??0)>0)
  if(!eligible.length)return withUpgradeState(state,{...current,resolvedDay:state.day,lastWinner:null,lastWinnerDay:state.day,lastWinningVotes:0})
  const top=Math.max(...eligible.map((id)=>counts[id]??0));const tied=eligible.filter((id)=>(counts[id]??0)===top);const roll=tied.length>1?randomInt(state.rngState,0,tied.length-1):{value:0,state:state.rngState};const projectId=tied[roll.value]!
  const upgraded=applyWinningUpgrade({...state,rngState:roll.state},projectId);const after=upgradeState(upgraded)
  return withUpgradeState(upgraded,{...after,resolvedDay:state.day,lastWinner:projectId,lastWinnerDay:state.day,lastWinningVotes:top})
}
export function resetConstructionUpgradeVotesForNewDay(state:GameState):GameState{
  const withBaseline=ensureWorkshopBaseline(state)
  const current=upgradeState(withBaseline)
  if(!Object.keys(current.votes).length)return withBaseline
  return withUpgradeState(withBaseline,{...current,votes:{}})
}
