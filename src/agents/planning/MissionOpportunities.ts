import { bankCount } from '../../core/bank'
import { specialSiteName } from '../../core/specialSites'
import type { BotMissionPurpose, BotMissionRole, GameState, SearchMode, WorldZone } from '../../core/types'
import { distanceToTown, zoneControl, zoneControlState } from '../../core/world'
import { AI_TUNING } from '../AiTuning'
import { hasFreshZoneIntel, knownZombieCount } from '../WorldKnowledge'
import { evaluateTownNeeds } from './TownNeeds'

export interface MissionOpportunity{missionId:string;role:BotMissionRole;purpose:BotMissionPurpose;target:{x:number;y:number};targetLabel:string;reason:string;desiredCitizens:number;priority:number;safetyReserve:number;emergency:boolean;searchMode?:SearchMode}
const CONSTRUCTION_SITE_TYPES=new Set(['construction_site','wrecked_cars','dark_woods'])
export function missionKey(role:BotMissionRole,purpose:BotMissionPurpose,x:number,y:number):string{return`${role}:${purpose}:${x},${y}`}
export function knownNonTownZones(state:GameState):WorldZone[]{return Object.values(state.world.zones).filter((zone)=>zone.discovered&&distanceToTown(zone.x,zone.y)>0)}
function staffingForZone(state:GameState,zone:WorldZone):number{const zombies=knownZombieCount(state,zone.x,zone.y)??0;return Math.max(2,Math.min(5,Math.ceil((zombies+1)/2)))}
function sitePurpose(zone:WorldZone):BotMissionPurpose|null{const type=zone.specialSite?.type;if(!type)return null;if(CONSTRUCTION_SITE_TYPES.has(type))return'gather_construction';if(type==='supermarket')return'gather_food';if(type==='pharmacy')return'gather_medical';if(type==='police_station')return'gather_weapons';return null}
export function knownOpportunities(state:GameState):MissionOpportunity[]{
  const needs=evaluateTownNeeds(state);const opportunities:MissionOpportunity[]=[];const trapped=state.citizens.filter((citizen)=>citizen.alive&&citizen.location.type==='world'&&zoneControlState(state,citizen.location.x,citizen.location.y,citizen.id)==='trapped')
  const rescueZones=new Set<string>()
  for(const citizen of trapped){if(citizen.location.type!=='world')continue;const key=`${citizen.location.x},${citizen.location.y}`;if(rescueZones.has(key))continue;rescueZones.add(key);const control=zoneControl(state,citizen.location.x,citizen.location.y);const missingPoints=Math.max(1,control.zombiePoints-control.humanPoints);const desired=Math.min(AI_TUNING.maxRescueResponders,Math.max(1,Math.ceil(missingPoints/2)));const id=missionKey('rescue','rescue',citizen.location.x,citizen.location.y);opportunities.push({missionId:id,role:'rescue',purpose:'rescue',target:{x:citizen.location.x,y:citizen.location.y},targetLabel:`Rescue at [${citizen.location.x},${citizen.location.y}]`,reason:`${citizen.name} is trapped; responders must restore control and retain enough range to extract themselves.`,desiredCitizens:desired,priority:300,safetyReserve:AI_TUNING.rescueSafetyReserve,emergency:true})}
  const missingConstruction=Boolean(needs.activeProject&&Object.keys(needs.missingConstruction).length>0)
  for(const zone of knownNonTownZones(state)){
    if(!hasFreshZoneIntel(state,zone.x,zone.y)||!zone.specialSite)continue
    const purpose=sitePurpose(zone)
    const useful=purpose==='gather_construction'?missingConstruction:purpose==='gather_food'?needs.foodLow:purpose==='gather_weapons'?needs.weaponsLow:purpose==='gather_medical'?bankCount(state,'pharmaceutical_products')<2:false
    if(!purpose||!useful||zone.specialSite.status==='depleted')continue
    if(zone.specialSite.status==='buried')opportunities.push({missionId:missionKey('excavator',purpose,zone.x,zone.y),role:'excavator',purpose,target:{x:zone.x,y:zone.y},targetLabel:`${specialSiteName(zone.specialSite.type)} [${zone.x},${zone.y}]`,reason:`Fresh reconnaissance confirms a known ${specialSiteName(zone.specialSite.type)} can address the town's ${purpose.replace('gather_','')} need.`,desiredCitizens:Math.min(4,Math.max(2,Math.ceil((zone.specialSite.excavationRequired-zone.specialSite.excavationProgress)/2))),priority:180,safetyReserve:AI_TUNING.ordinarySafetyReserve,emergency:false})
    else opportunities.push({missionId:missionKey('gatherer',purpose,zone.x,zone.y),role:'gatherer',purpose,target:{x:zone.x,y:zone.y},targetLabel:`${specialSiteName(zone.specialSite.type)} [${zone.x},${zone.y}]`,reason:`Fresh reconnaissance confirms the ${specialSiteName(zone.specialSite.type)} route is usable for the town's ${purpose.replace('gather_','')} need.`,desiredCitizens:staffingForZone(state,zone),priority:170,safetyReserve:AI_TUNING.ordinarySafetyReserve,emergency:false})
  }
  if(missingConstruction){
    const fresh=knownNonTownZones(state).filter((zone)=>hasFreshZoneIntel(state,zone.x,zone.y)&&zone.searchesRemaining>0&&(knownZombieCount(state,zone.x,zone.y)??0)<=8).sort((a,b)=>(knownZombieCount(state,a.x,a.y)??0)-(knownZombieCount(state,b.x,b.y)??0)||distanceToTown(b.x,b.y)-distanceToTown(a.x,a.y)).slice(0,6)
    for(const zone of fresh)opportunities.push({missionId:missionKey('gatherer','gather_construction',zone.x,zone.y),role:'gatherer',purpose:'gather_construction',target:{x:zone.x,y:zone.y},targetLabel:`Fresh zone [${zone.x},${zone.y}]`,reason:`${needs.activeProject} still lacks construction materials; current scouting confirms this productive zone is viable.`,desiredCitizens:staffingForZone(state,zone),priority:140,safetyReserve:AI_TUNING.ordinarySafetyReserve,emergency:false,searchMode:'normal'})
    const depleted=knownNonTownZones(state).filter((zone)=>{if(zone.searchesRemaining!==0||distanceToTown(zone.x,zone.y)>4)return false;const zombies=knownZombieCount(state,zone.x,zone.y);if(zombies===null||zombies>2)return false;return hasFreshZoneIntel(state,zone.x,zone.y)||(distanceToTown(zone.x,zone.y)<=3&&zombies<=1)}).sort((a,b)=>(knownZombieCount(state,a.x,a.y)??0)-(knownZombieCount(state,b.x,b.y)??0)||distanceToTown(a.x,a.y)-distanceToTown(b.x,b.y)).slice(0,4)
    for(const zone of depleted)opportunities.push({missionId:`${missionKey('gatherer','gather_construction',zone.x,zone.y)}:depleted`,role:'gatherer',purpose:'gather_construction',target:{x:zone.x,y:zone.y},targetLabel:`Salvage [${zone.x},${zone.y}]`,reason:'The town lacks construction inputs; this nearby depleted zone can still yield logs or scrap for Workshop conversion.',desiredCitizens:1,priority:95,safetyReserve:AI_TUNING.ordinarySafetyReserve,emergency:false,searchMode:'depleted'})
  }
  return opportunities.sort((a,b)=>b.priority-a.priority)
}
