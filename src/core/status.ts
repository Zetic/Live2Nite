import type { Citizen, CitizenStatusId, CitizenStatusState, GameEvent, GameState, HydrationStatus, ItemType, WoundLocation } from './types'

export const DESERT_STEPS_PER_HYDRATION_STAGE = 11
export const INFECTION_DEATH_CHANCE_PERCENT = 50
/**
 * MyHordes describes the wounded-leg failure as roughly one attempt in four/five.
 * Until the exact current resolver constant is surfaced, Live2Nite uses 25% and labels it
 * as an explicit approximation in the source audit.
 */
export const LEG_WOUND_MOVE_FAILURE_PERCENT = 25
export const WOUND_LOCATIONS:readonly WoundLocation[]=['head','eye','arms','hands','leg','foot']

export interface CitizenStatusDefinition {
  id: CitizenStatusId
  label: string
  family: 'hydration' | 'energy' | 'daily' | 'injury' | 'disease' | 'mental' | 'drug' | 'alcohol' | 'protection'
  severity: 'neutral' | 'warning' | 'danger'
  effect: string
}

export const CITIZEN_STATUS_DEFINITIONS: Record<CitizenStatusId, CitizenStatusDefinition> = {
  exhausted: { id:'exhausted',label:'Exhausted',family:'energy',severity:'warning',effect:'At 0 AP, contact weapons and ordinary AP actions are unavailable until AP is restored.' },
  satisfied_food: { id:'satisfied_food',label:'Fed',family:'daily',severity:'neutral',effect:'Food has already refreshed AP today.' },
  satisfied_water: { id:'satisfied_water',label:'Refreshed',family:'daily',severity:'neutral',effect:'Water has refreshed AP today. Water used only to treat Dehydrated does not grant Refreshed.' },
  thirsty: { id:'thirsty',label:'Thirsty',family:'hydration',severity:'warning',effect:'Drink before the attack. Another hydration stage worsens this to Dehydrated.' },
  dehydrated: { id:'dehydrated',label:'Dehydrated',family:'hydration',severity:'danger',effect:'Water reduces this to Thirsty without restoring AP. Remaining Dehydrated through the attack is fatal.' },
  wounded: { id:'wounded',label:'Wounded',family:'injury',severity:'warning',effect:'A body-part wound reduces normal AP restoration by 1 and can restrict actions. Untreated wounds can cause Infection at the attack.' },
  infected: { id:'infected',label:'Infected',family:'disease',severity:'danger',effect:'At the attack, Infection has a 50% death risk. Paracetoid cures Infection.' },
  terrorized: { id:'terrorized',label:'Terrorized',family:'mental',severity:'danger',effect:'Outside, Terrorized citizens contribute 0 control points and cannot fight bare-handed. Valium removes Terror.' },
  drugged: { id:'drugged',label:'Drugged',family:'drug',severity:'warning',effect:'A drug has been taken today. Taking another drug while Drugged causes Addiction.' },
  addicted: { id:'addicted',label:'Addicted',family:'drug',severity:'danger',effect:'Addiction persists. Reaching the attack without having taken a drug that day is fatal withdrawal.' },
  drunk: { id:'drunk',label:'Drunk',family:'alcohol',severity:'warning',effect:'Alcohol was consumed today. Drunk becomes Hangover at the attack.' },
  hangover: { id:'hangover',label:'Hangover',family:'alcohol',severity:'warning',effect:'Alcohol cannot be consumed while Hungover. Hangover clears at the following attack.' },
  immune: { id:'immune',label:'Immune',family:'protection',severity:'neutral',effect:'Temporarily protected from Infection. The protection is consumed by the nightly status cycle.' },
}

export function createCitizenStatusState():CitizenStatusState{
  return{hydration:'normal',desertStepsToday:0,wound:null,infected:false,terrorized:false,drugged:false,addicted:false,drunk:false,hangover:false,immune:false}
}
export function normalizeCitizenStatusState(input:Partial<CitizenStatusState>|undefined):CitizenStatusState{
  const base=createCitizenStatusState()
  if(!input)return base
  const hydration:HydrationStatus=input.hydration==='thirsty'||input.hydration==='dehydrated'?input.hydration:'normal'
  const wound=WOUND_LOCATIONS.includes(input.wound as WoundLocation)?input.wound as WoundLocation:null
  return{
    hydration,
    desertStepsToday:typeof input.desertStepsToday==='number'?Math.max(0,Math.trunc(input.desertStepsToday)):0,
    wound,
    infected:Boolean(input.infected),
    terrorized:Boolean(input.terrorized),
    drugged:Boolean(input.drugged),
    addicted:Boolean(input.addicted),
    drunk:Boolean(input.drunk),
    hangover:Boolean(input.hangover),
    immune:Boolean(input.immune),
  }
}
export function hasCitizenStatus(citizen:Citizen,id:CitizenStatusId):boolean{
  switch(id){
    case'thirsty':return citizen.status.hydration==='thirsty'
    case'dehydrated':return citizen.status.hydration==='dehydrated'
    case'exhausted':return citizen.ap===0
    case'satisfied_food':return citizen.daily.ate
    case'satisfied_water':return citizen.daily.drank
    case'wounded':return citizen.status.wound!==null
    case'infected':return citizen.status.infected
    case'terrorized':return citizen.status.terrorized
    case'drugged':return citizen.status.drugged
    case'addicted':return citizen.status.addicted
    case'drunk':return citizen.status.drunk
    case'hangover':return citizen.status.hangover
    case'immune':return citizen.status.immune
  }
}
export function activeCitizenStatuses(citizen:Citizen):CitizenStatusId[]{
  if(!citizen.alive)return[]
  return (Object.keys(CITIZEN_STATUS_DEFINITIONS) as CitizenStatusId[]).filter((id)=>hasCitizenStatus(citizen,id))
}
export function hydrationStatus(citizen:Citizen):HydrationStatus{return citizen.status.hydration}
export function effectiveMaxAp(citizen:Citizen):number{return Math.max(0,citizen.maxAp-(citizen.status.wound?1:0))}
export function woundAdjustedApTarget(status:CitizenStatusState,target:number):number{return Math.max(0,target-(status.wound?1:0))}
export function woundLabel(wound:WoundLocation|null):string{return wound?wound.charAt(0).toUpperCase()+wound.slice(1):''}
export function hasHandWound(citizen:Citizen):boolean{return citizen.status.wound==='hands'}
export function canOperateGateByStatus(citizen:Citizen):boolean{return citizen.status.wound!=='arms'}
export function canContributeConstructionByStatus(citizen:Citizen):boolean{return citizen.status.wound!=='arms'}
export function canFightBarehandedByStatus(citizen:Citizen):boolean{return citizen.status.wound!=='hands'&&!citizen.status.terrorized}
export function citizenControlPoints(citizen:Citizen):number{return citizen.status.terrorized?0:2}
const HAND_WOUND_WEAPON_EXCEPTIONS:readonly ItemType[]=['water_bomb','water_pistol']
export function canUseWeaponByStatus(citizen:Citizen,type:ItemType):boolean{return !hasHandWound(citizen)||HAND_WOUND_WEAPON_EXCEPTIONS.includes(type)}
export function travelHydrationTransition(citizen:Citizen):CitizenStatusState|null{
  const nextSteps=citizen.status.desertStepsToday+1
  if(nextSteps<DESERT_STEPS_PER_HYDRATION_STAGE)return null
  if(citizen.status.hydration==='normal')return{...citizen.status,hydration:'thirsty',desertStepsToday:0}
  if(citizen.status.hydration==='thirsty')return{...citizen.status,hydration:'dehydrated',desertStepsToday:0}
  return null
}
export function waterConsumptionOutcome(citizen:Citizen):{restoresAp:boolean;statusAfter:CitizenStatusState}{
  const restoresAp=!citizen.daily.drank&&citizen.status.hydration!=='dehydrated'
  const hydration:HydrationStatus=citizen.status.hydration==='dehydrated'?'thirsty':'normal'
  return{restoresAp,statusAfter:{...citizen.status,hydration,desertStepsToday:0}}
}
export function nightlyStatusEvents(state:GameState,infectionRoll:(citizenId:string)=>number):GameEvent[]{
  const events:GameEvent[]=[]
  for(const citizen of state.citizens){
    if(!citizen.alive)continue
    if(citizen.status.hydration==='dehydrated'){events.push({type:'CITIZEN_DIED',day:state.day,hour:0,citizenId:citizen.id,reason:'dehydration'});continue}
    if(citizen.status.addicted&&!citizen.status.drugged){events.push({type:'CITIZEN_DIED',day:state.day,hour:0,citizenId:citizen.id,reason:'drug_withdrawal'});continue}
    if(citizen.status.infected&&infectionRoll(citizen.id)<=INFECTION_DEATH_CHANCE_PERCENT){events.push({type:'CITIZEN_DIED',day:state.day,hour:0,citizenId:citizen.id,reason:'infection'});continue}
    let hydration:HydrationStatus=citizen.status.hydration
    if(hydration==='thirsty')hydration='dehydrated'
    else if(!citizen.daily.drank)hydration='thirsty'
    const statusAfter:CitizenStatusState={
      ...citizen.status,
      hydration,
      desertStepsToday:0,
      infected:citizen.status.infected||Boolean(citizen.status.wound&&!citizen.status.immune),
      drugged:false,
      drunk:false,
      hangover:citizen.status.drunk,
      immune:false,
    }
    if(JSON.stringify(statusAfter)!==JSON.stringify(citizen.status))events.push({type:'CITIZEN_STATUS_CHANGED',day:state.day,hour:0,citizenId:citizen.id,status:statusAfter,reason:'nightly_progression'})
  }
  return events
}
