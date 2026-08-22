import type { Citizen, GameState, SpecialSiteType, WorldZone } from '../../core/types'
import { specialSiteName } from '../../core/specialSites'
import { distanceToTown, zoneControl } from '../../core/world'
import { evaluateTownNeeds } from './TownNeeds'
import { chooseFrontierTarget, routeBetween, type Coord } from './RoutePlanner'
import { planLoadout, supplyDispositionForCitizen, waterPolicyForState, type ExpeditionLoadout, type ExpeditionPurpose } from './SupplyPolicy'

export interface ExpeditionPlan {
  purpose: ExpeditionPurpose
  target: Coord
  targetLabel: string
  reason: string
  route: ReturnType<typeof routeBetween>
  requiredAp: number
  returnAp: number
  expectedTaskAp: number
  targetZombies: number
  loadout: ExpeditionLoadout
  feasible: boolean
  plannedReturnHour: number
  waterPolicy: ReturnType<typeof waterPolicyForState>
  supplyDisposition: ReturnType<typeof supplyDispositionForCitizen>
}

const SITE_PURPOSE:Partial<Record<ExpeditionPurpose,SpecialSiteType[]>>={
  gather_construction:['construction_site','wrecked_cars','dark_woods'],
  gather_food:['supermarket'],gather_medical:['pharmacy'],gather_weapons:['police_station'],
}
function citizenCoord(citizen:Citizen):Coord{return citizen.location.type==='world'?{x:citizen.location.x,y:citizen.location.y}:{x:0,y:0}}
function trappedTarget(state:GameState,citizenId:string):Citizen|null{return state.citizens.find((candidate)=>candidate.id!==citizenId&&candidate.alive&&candidate.location.type==='world'&&zoneControl(state,candidate.location.x,candidate.location.y).trapped)??null}
function usefulSpecialZones(state:GameState,purpose:ExpeditionPurpose,citizenId:string):WorldZone[]{const preferred=SITE_PURPOSE[purpose];return Object.values(state.world.zones).filter((zone)=>zone.discovered&&zone.specialSite&&zone.specialSite.status!=='depleted'&&!zone.specialSite.searchedBy.includes(citizenId)&&(!preferred||preferred.includes(zone.specialSite.type)))}
function undepletedZones(state:GameState,citizenId:string):WorldZone[]{return Object.values(state.world.zones).filter((zone)=>zone.discovered&&distanceToTown(zone.x,zone.y)>0&&zone.searchesRemaining>0&&!zone.searchedBy.includes(citizenId))}
function pickKnownTarget(state:GameState,citizen:Citizen,purpose:ExpeditionPurpose):WorldZone|null{
  const specials=usefulSpecialZones(state,purpose,citizen.id)
  if(specials.length)return [...specials].sort((a,b)=>distanceToTown(a.x,a.y)-distanceToTown(b.x,b.y))[0]
  const undepleted=undepletedZones(state,citizen.id)
  if(undepleted.length)return [...undepleted].sort((a,b)=>distanceToTown(b.x,b.y)-distanceToTown(a.x,a.y))[0]
  return null
}
function purposeForTown(state:GameState):{purpose:ExpeditionPurpose;reason:string}{const needs=evaluateTownNeeds(state);if(needs.activeProject&&Object.keys(needs.missingConstruction).length)return{purpose:'gather_construction',reason:`${needs.activeProject} is missing ${Object.entries(needs.missingConstruction).map(([type,count])=>`${count} ${type}`).join(', ')}`};if(needs.foodLow)return{purpose:'gather_food',reason:'The shared Bank is low on food.'};if(needs.weaponsLow)return{purpose:'gather_weapons',reason:'The town has few shared weapons.'};return{purpose:'explore',reason:'Push the known frontier and discover new resource sources.'}}

export function planExpedition(state:GameState,citizenId:string):ExpeditionPlan|null{
  const citizen=state.citizens.find((candidate)=>candidate.id===citizenId);if(!citizen||!citizen.alive||state.clock.phase!=='day')return null
  const rescue=trappedTarget(state,citizenId)
  let purpose:ExpeditionPurpose;let reason:string;let targetZone:WorldZone|null=null;let target:Coord
  if(rescue?.location.type==='world'){purpose='rescue';reason=`${rescue.name} is trapped outside.`;target={x:rescue.location.x,y:rescue.location.y}}
  else{const chosen=purposeForTown(state);purpose=chosen.purpose;reason=chosen.reason;targetZone=pickKnownTarget(state,citizen,purpose)
    if(!targetZone&&purpose!=='explore'){targetZone=chooseFrontierTarget(state,citizenId);reason+= ' No known source is ready, so this expedition will push the frontier.'}
    if(!targetZone){const frontier=chooseFrontierTarget(state,citizenId);if(!frontier)return null;targetZone=frontier}
    target={x:targetZone.x,y:targetZone.y}
  }
  const from=citizenCoord(citizen);const route=routeBetween(state,from,target);const zone=state.world.zones[`${target.x},${target.y}`]
  const site=zone?.specialSite;const expectedTaskAp=site?.status==='buried'?Math.min(3,Math.max(1,site.excavationRequired-site.excavationProgress)):0
  const returnAp=distanceToTown(target.x,target.y);const gateCost=citizen.location.type==='town'&&!state.town.gateOpen?1:0;const requiredAp=route.length+returnAp+expectedTaskAp+gateCost
  const targetZombies=zone?.discovered?zone.zombies:2;const loadout=planLoadout(state,citizen,purpose,requiredAp,targetZombies)
  const label=site&&zone.discovered?`${specialSiteName(site.type)} [${target.x},${target.y}]`:`[${target.x},${target.y}]`
  return{purpose,target,targetLabel:label,reason,route,requiredAp,returnAp,expectedTaskAp,targetZombies,loadout,feasible:loadout.potentialAp>=requiredAp,plannedReturnHour:18+((Number(citizenId.slice(1))||0)%4),waterPolicy:waterPolicyForState(state),supplyDisposition:supplyDispositionForCitizen(citizenId)}
}

export function remainingReturnRequirement(state:GameState,citizenId:string):number{const citizen=state.citizens.find((candidate)=>candidate.id===citizenId);if(!citizen||citizen.location.type!=='world')return 0;return distanceToTown(citizen.location.x,citizen.location.y)}
