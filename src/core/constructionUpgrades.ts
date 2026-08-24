import { CONSTRUCTION_CATALOG } from './constructionCatalog'
import type { ConstructionId, GameEvent, GameState } from './types'
import { randomInt } from './rng'

export type ConstructionUpgradeKind='defense_total'|'well_once'|'construction_discount'
export interface ConstructionUpgradeTrack {
  projectId:ConstructionId
  maxLevel:number
  kind:ConstructionUpgradeKind
  values:readonly number[]
  benefits:readonly string[]
  sourceNote:string
}

/**
 * Active daily-upgrade tracks whose effects are representable by current Live2Nite systems.
 *
 * Great Pit / Evolutive Wall / Pump values follow the MyHordes upgrade table. Workshop uses
 * the current MyHordes behavior verified by the live issue tracker: the first vote removes
 * 18 AP from a 300 AP construction (6%). We keep the same linear 6%-per-level rule through
 * the ordinary five-level track rather than the older 5% wiki text.
 *
 * Other source `hasUpgrade` constructions remain catalogued but are deliberately not made
 * votable until their dependent mechanics (water-turret nightly consumption, night-search
 * lighting, blueprint production, special dump behavior, etc.) are implemented faithfully.
 */
export const CONSTRUCTION_UPGRADE_TRACKS:Readonly<Partial<Record<ConstructionId,ConstructionUpgradeTrack>>>={
  great_pit:{
    projectId:'great_pit',maxLevel:5,kind:'defense_total',
    values:[10,23,44,76,109,160],
    benefits:[
      'Great Pit defense rises from 10 to 23 (+13).',
      'Great Pit defense rises from 23 to 44 (+21).',
      'Great Pit defense rises from 44 to 76 (+32).',
      'Great Pit defense rises from 76 to 109 (+33).',
      'Great Pit defense rises from 109 to 160 (+51).',
    ],
    sourceNote:'MyHordes daily-upgrade defense track.',
  },
  upgradeable_wall:{
    projectId:'upgradeable_wall',maxLevel:5,kind:'defense_total',
    values:[55,85,120,170,235,315],
    benefits:[
      'Evolutive Wall defense rises from 55 to 85 (+30).',
      'Evolutive Wall defense rises from 85 to 120 (+35).',
      'Evolutive Wall defense rises from 120 to 170 (+50).',
      'Evolutive Wall defense rises from 170 to 235 (+65).',
      'Evolutive Wall defense rises from 235 to 315 (+80).',
    ],
    sourceNote:'MyHordes daily-upgrade defense track.',
  },
  pump:{
    projectId:'pump',maxLevel:5,kind:'well_once',
    values:[0,20,20,30,30,40],
    benefits:[
      'Immediately adds 20 Water Rations to the Well.',
      'Immediately adds another 20 Water Rations to the Well.',
      'Immediately adds 30 Water Rations to the Well.',
      'Immediately adds another 30 Water Rations to the Well.',
      'Immediately adds 40 Water Rations to the Well.',
    ],
    sourceNote:'MyHordes Pump daily-upgrade one-time water additions.',
  },
  workshop:{
    projectId:'workshop',maxLevel:5,kind:'construction_discount',
    values:[0,6,12,18,24,30],
    benefits:[
      'Reduces construction AP requirements by 6% of their base cost.',
      'Total construction AP reduction becomes 12%.',
      'Total construction AP reduction becomes 18%.',
      'Total construction AP reduction becomes 24%.',
      'Total construction AP reduction becomes 30%.',
    ],
    sourceNote:'Current MyHordes Workshop behavior; level 1 is verified as a 6% real AP reduction.',
  },
}

export const ACTIVE_CONSTRUCTION_UPGRADE_IDS=Object.freeze(Object.keys(CONSTRUCTION_UPGRADE_TRACKS) as ConstructionId[])

export function constructionUpgradeTrack(projectId:ConstructionId):ConstructionUpgradeTrack|null{return CONSTRUCTION_UPGRADE_TRACKS[projectId]??null}
export function constructionUpgradeLevel(state:GameState,projectId:ConstructionId):number{return Math.max(0,state.town.construction[projectId]?.upgradeLevel??0)}
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
export function hasUpgradeProjectsFacility(state:GameState):boolean{return availableConstructionUpgradeProjects(state).length>0}
export function citizenUpgradeVote(state:GameState,citizenId:string):ConstructionId|null{return state.town.upgrades.votes[citizenId]??null}
export function upgradeVoteCountsVisible(state:GameState,citizenId:string):boolean{return citizenUpgradeVote(state,citizenId)!==null}
export function constructionUpgradeVoteCounts(state:GameState):Partial<Record<ConstructionId,number>>{
  const counts:Partial<Record<ConstructionId,number>>={}
  for(const projectId of Object.values(state.town.upgrades.votes))counts[projectId]=(counts[projectId]??0)+1
  return counts
}
export function workshopConstructionDiscountPercent(state:GameState):number{
  const track=CONSTRUCTION_UPGRADE_TRACKS.workshop!
  return track.values[Math.min(constructionUpgradeLevel(state,'workshop'),track.maxLevel)]??0
}
export function upgradedConstructionRequiredAp(state:GameState,projectId:ConstructionId,baseAp:number):number{
  if(projectId==='workshop')return baseAp
  const discount=workshopConstructionDiscountPercent(state)
  return Math.max(1,Math.ceil(baseAp*(100-discount)/100))
}
export function upgradedConstructionDefense(state:GameState,projectId:ConstructionId,baseDefense:number):number{
  const track=constructionUpgradeTrack(projectId)
  if(track?.kind!=='defense_total')return baseDefense
  return track.values[Math.min(constructionUpgradeLevel(state,projectId),track.maxLevel)]??baseDefense
}

/** Independent bot choice: no vote tally is consulted. */
export function botUpgradeProjectChoice(state:GameState,citizenId:string):ConstructionId|null{
  const candidates=availableConstructionUpgradeProjects(state);if(!candidates.length)return null
  if(candidates.includes('pump')&&state.town.well.water<80)return'pump'
  if(candidates.includes('workshop')){
    const unfinished=Object.values(state.town.construction).filter((project)=>project.discovered&&!project.completed).length
    if(unfinished>=6)return'workshop'
  }
  const defenseCandidates=candidates.filter((id)=>constructionUpgradeTrack(id)?.kind==='defense_total')
  if(defenseCandidates.length&&state.lastNight?.breached)return defenseCandidates[0]
  const hash=[...citizenId].reduce((sum,char)=>sum+char.charCodeAt(0),0)
  return candidates[hash%candidates.length]??candidates[0]
}

export function autonomousConstructionUpgradeVoteEvents(state:GameState,controlledCitizenId?:string):GameEvent[]{
  if(state.clock.phase!=='day'||state.clock.hour<8)return[]
  const events:GameEvent[]=[]
  for(const citizen of state.citizens){
    if(!citizen.alive||citizen.controller!=='basic-bot'||citizen.id===controlledCitizenId||citizen.location.type!=='town'||citizenUpgradeVote(state,citizen.id))continue
    const projectId=botUpgradeProjectChoice(state,citizen.id);if(projectId)events.push({type:'CONSTRUCTION_UPGRADE_VOTE_CAST',day:state.day,hour:state.clock.hour,citizenId:citizen.id,projectId})
  }
  return events
}

export function resolveConstructionUpgradeVoteEvents(state:GameState):GameEvent[]{
  if(state.town.upgrades.resolvedDay===state.day)return[]
  const counts=constructionUpgradeVoteCounts(state)
  const eligible=availableConstructionUpgradeProjects(state).filter((id)=>(counts[id]??0)>0)
  if(!eligible.length)return[{type:'CONSTRUCTION_UPGRADE_VOTE_RESOLVED',day:state.day,hour:0,projectId:null,votes:0,rngStateAfter:state.rngState}]
  const top=Math.max(...eligible.map((id)=>counts[id]??0))
  const tied=eligible.filter((id)=>(counts[id]??0)===top)
  const roll=tied.length>1?randomInt(state.rngState,0,tied.length-1):{value:0,state:state.rngState}
  const projectId=tied[roll.value]!
  const fromLevel=constructionUpgradeLevel(state,projectId)
  return[
    {type:'CONSTRUCTION_UPGRADE_VOTE_RESOLVED',day:state.day,hour:0,projectId,votes:top,rngStateAfter:roll.state},
    {type:'CONSTRUCTION_UPGRADED',day:state.day,hour:0,projectId,fromLevel,toLevel:fromLevel+1,benefit:constructionUpgradeNextBenefit(state,projectId)??'',rngStateAfter:roll.state},
  ]
}
