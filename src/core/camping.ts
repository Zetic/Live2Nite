import { randomInt } from './rng'
import type { Citizen, CitizenCampingState, CampingOutlook, GameState, SpecialSiteType, WorldZone } from './types'
import { distanceToTown, isTownGateZone, zoneKey } from './world'

export const CAMP_IMPROVEMENT_AP_COST = 1
export const CAMP_IMPROVEMENT_CAP = 10
export const ORDINARY_CAMPING_CAP_PERCENT = 90

export function createCitizenCampingState():CitizenCampingState{return{hidden:false,survivalChance:null,hiddenDay:null,nightsSurvived:0,lastSurvivedDay:null}}

const SITE_TOPOLOGY_BONUS: Record<SpecialSiteType, number> = {
  construction_site: 15,
  wrecked_cars: 8,
  pharmacy: 6,
  supermarket: 6,
  dark_woods: 12,
  police_station: 10,
}

/**
 * LIVE2NITE_ADAPTATION.
 *
 * Surviving English references identify the factors that affect camping but do not
 * expose a trustworthy final-English probability formula. Keep the coefficients here
 * isolated so the simulation can preserve the historical inputs without presenting
 * these exact numbers as recovered Motion Twin values.
 */
export function campingChancePercent(state: GameState, citizenId: string): number {
  const citizen = state.citizens.find((candidate) => candidate.id === citizenId)
  if (!citizen || !citizen.alive || citizen.location.type !== 'world' || isTownGateZone(citizen.location.x,citizen.location.y)) return 0
  const key = zoneKey(citizen.location.x,citizen.location.y)
  const zone = state.world.zones[key]
  if (!zone) return 0
  const distanceBonus = Math.min(30, distanceToTown(zone.x,zone.y) * 3)
  const topologyBonus = zone.specialSite ? (zone.specialSite.status === 'buried' ? 10 : SITE_TOPOLOGY_BONUS[zone.specialSite.type]) : 0
  const improvementBonus = Math.min(CAMP_IMPROVEMENT_CAP, zone.campImprovements ?? 0) * 5
  const zombiePenalty = Math.min(45, zone.zombies * 7)
  const alreadyHiddenHere = state.citizens.filter((other) => other.id !== citizenId && other.alive && other.location.type === 'world' && other.location.x === zone.x && other.location.y === zone.y && other.camping.hidden).length
  const crowdPenalty = alreadyHiddenHere * 7
  const repeatPenalty = citizen.camping.nightsSurvived * 12
  return Math.max(1, Math.min(ORDINARY_CAMPING_CAP_PERCENT, 15 + distanceBonus + topologyBonus + improvementBonus - zombiePenalty - crowdPenalty - repeatPenalty))
}

export function campingOutlookFromChance(chance: number): CampingOutlook {
  if (chance <= 10) return 'suicidal'
  if (chance <= 30) return 'very_poor'
  if (chance <= 50) return 'poor'
  if (chance <= 65) return 'limited'
  if (chance <= 80) return 'satisfactory'
  return 'decent'
}

export function campingOutlookText(outlook: CampingOutlook): string {
  switch(outlook) {
    case 'suicidal': return 'Sleeping here looks close to suicidal.'
    case 'very_poor': return 'Your chances here look really poor.'
    case 'poor': return 'Your chances here look poor.'
    case 'limited': return 'Your chances look limited, but tempting.'
    case 'satisfactory': return 'Your chances look largely satisfactory.'
    case 'decent': return 'Your chances look decent, if luck holds.'
  }
}

export function campingOutlook(state: GameState, citizenId: string): { chancePercent:number; outlook:CampingOutlook; text:string } {
  const chancePercent = campingChancePercent(state,citizenId)
  const outlook = campingOutlookFromChance(chancePercent)
  return { chancePercent, outlook, text: campingOutlookText(outlook) }
}

function citizenNumber(citizenId:string):number{return Number(citizenId.replace(/\D/g,''))||1}
function isolatedCampingSeed(seed:number,day:number,citizenId:string):number{
  const mixed=((seed>>>0)^Math.imul(day+1,0x9e3779b1)^Math.imul(citizenNumber(citizenId)+17,0x85ebca6b)^0xc4a9f173)>>>0
  return mixed||1
}

export function resolveCampingRoll(state:GameState,citizen:Citizen):{roll:number;survived:boolean}{
  const chance=Math.max(0,Math.min(100,citizen.camping.survivalChance??0))
  const result=randomInt(isolatedCampingSeed(state.seed,state.day,citizen.id),1,100)
  return{roll:result.value,survived:result.value<=chance}
}

export function canImproveCamp(zone:WorldZone):boolean{return(zone.campImprovements??0)<CAMP_IMPROVEMENT_CAP}
