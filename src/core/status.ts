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

export interface StatusRelationDefinition { label:string; detail:string }
export interface StatusVariantDefinition { id:string; label:string; detail:string; active:boolean }
export interface CitizenStatusDefinition {
  id: CitizenStatusId
  label: string
  family: 'hydration' | 'energy' | 'daily' | 'injury' | 'disease' | 'mental' | 'drug' | 'alcohol' | 'protection'
  severity: 'neutral' | 'warning' | 'danger'
  effect: string
  mechanics?:readonly string[]
  systemSources?:readonly StatusRelationDefinition[]
  systemClears?:readonly StatusRelationDefinition[]
  progression?:readonly StatusRelationDefinition[]
  variants?:readonly StatusVariantDefinition[]
}

export const CITIZEN_STATUS_DEFINITIONS: Record<CitizenStatusId, CitizenStatusDefinition> = {
  exhausted: {
    id:'exhausted',label:'Exhausted',family:'energy',severity:'warning',
    effect:'At 0 AP, contact weapons and ordinary AP actions are unavailable until AP is restored.',
    systemSources:[{label:'Spend all AP',detail:'Reaching 0 AP makes the citizen Exhausted.'}],
    systemClears:[{label:'Restore AP',detail:'Any effect that restores AP above 0 clears Exhausted automatically.'}],
  },
  satisfied_food: {
    id:'satisfied_food',label:'Fed',family:'daily',severity:'neutral',
    effect:'Food has already refreshed AP today.',
    systemSources:[{label:'Eat eligible food',detail:'The first qualifying food refresh of the day applies Fed.'}],
    systemClears:[{label:'Day start',detail:'The daily food-use marker resets when the next day begins.'}],
  },
  satisfied_water: {
    id:'satisfied_water',label:'Refreshed',family:'daily',severity:'neutral',
    effect:'Water has refreshed AP today. Water used only to treat Dehydrated does not grant Refreshed.',
    systemSources:[{label:'Drink eligible water',detail:'Water that qualifies for the daily AP refresh applies Refreshed.'}],
    systemClears:[{label:'Day start',detail:'The daily water-refresh marker resets when the next day begins.'}],
  },
  thirsty: {
    id:'thirsty',label:'Thirsty',family:'hydration',severity:'warning',
    effect:'Drink before the attack. Another hydration stage worsens this to Dehydrated.',
    systemSources:[
      {label:'Desert travel',detail:`Every ${DESERT_STEPS_PER_HYDRATION_STAGE} desert movements advances hydration one stage.`},
      {label:'Nightly progression',detail:'A normally hydrated citizen who did not refresh with water becomes Thirsty at the attack.'},
      {label:'Treat Dehydration',detail:'Drinking while Dehydrated improves the citizen to Thirsty but does not restore AP.'},
    ],
    systemClears:[{label:'Drink water',detail:'Drinking while Thirsty returns hydration to Normal.'}],
    progression:[{label:'Thirsty → Dehydrated',detail:'Another hydration stage from travel or the nightly cycle worsens Thirsty to Dehydrated.'}],
  },
  dehydrated: {
    id:'dehydrated',label:'Dehydrated',family:'hydration',severity:'danger',
    effect:'Water reduces this to Thirsty without restoring AP. Remaining Dehydrated through the attack is fatal.',
    systemSources:[
      {label:'Desert travel',detail:`Another ${DESERT_STEPS_PER_HYDRATION_STAGE} movements while Thirsty causes Dehydrated.`},
      {label:'Nightly progression',detail:'A Thirsty citizen becomes Dehydrated at the attack.'},
    ],
    systemClears:[{label:'Drink water',detail:'Water improves Dehydrated to Thirsty; that ration does not grant the daily AP refresh.'}],
    progression:[{label:'Dehydrated → death',detail:'Reaching the attack while still Dehydrated is fatal.'}],
  },
  wounded: {
    id:'wounded',label:'Wounded',family:'injury',severity:'warning',
    effect:'A body-part wound reduces normal AP restoration by 1 and can restrict actions. Untreated wounds can cause Infection at the attack.',
    mechanics:[
      'Ordinary 6 AP restoration targets become 5 while Wounded; 7 AP food targets become 6.',
      'The wound location persists until treated and can impose an additional action restriction.',
    ],
    progression:[{label:'Wounded → Infected',detail:'At the attack, an unresolved wound causes Infection unless temporary immunity protects the citizen.'}],
    variants:[
      {id:'head',label:'Head',detail:'Location tracked. Source communication distortion is deferred until a communication system consumes it.',active:false},
      {id:'eye',label:'Eye',detail:'Location tracked. The exact source scavenging penalty is deferred until its current resolver value is verified.',active:false},
      {id:'arms',label:'Arms',detail:'Cannot operate the town gate or contribute construction AP.',active:true},
      {id:'hands',label:'Hands',detail:'Blocks container opening, portable combinations/repairs, bare-handed fighting, and ordinary hand-operated weapons.',active:true},
      {id:'leg',label:'Leg',detail:`Movement spends AP normally but can fail with the current documented ${LEG_WOUND_MOVE_FAILURE_PERCENT}% approximation.`,active:true},
      {id:'foot',label:'Foot',detail:'No additional broad restriction beyond the normal Wounded AP penalty.',active:true},
    ],
  },
  infected: {
    id:'infected',label:'Infected',family:'disease',severity:'danger',
    effect:`At the attack, Infection has a ${INFECTION_DEATH_CHANCE_PERCENT}% death risk. Paracetoid cures Infection.`,
    systemSources:[{label:'Untreated wound at the attack',detail:'An unresolved wound produces Infection unless Immune protects that nightly transition.'}],
    progression:[{label:'Infection death check',detail:`Each attack while already Infected has a ${INFECTION_DEATH_CHANCE_PERCENT}% death risk in the current town rules.`}],
  },
  terrorized: {
    id:'terrorized',label:'Terrorized',family:'mental',severity:'danger',
    effect:'Outside, Terrorized citizens contribute 0 control points and cannot fight bare-handed. Valium removes Terror.',
    mechanics:['A Terrorized citizen cannot use Flee from Zombies.'],
  },
  drugged: {
    id:'drugged',label:'Drugged',family:'drug',severity:'warning',
    effect:'A drug has been taken today. Taking another drug while Drugged causes Addiction.',
    systemClears:[{label:'Attack cycle',detail:'Drugged clears during the nightly condition cycle.'}],
    progression:[{label:'Drugged + another drug → Addicted',detail:'Using another drug while already Drugged establishes Addiction.'}],
  },
  addicted: {
    id:'addicted',label:'Addicted',family:'drug',severity:'danger',
    effect:'Addiction persists. Reaching the attack without having taken a drug that day is fatal withdrawal.',
    progression:[{label:'Withdrawal death',detail:'An Addicted citizen who reaches the attack without Drugged dies from withdrawal.'}],
  },
  drunk: {
    id:'drunk',label:'Drunk',family:'alcohol',severity:'warning',
    effect:'Alcohol was consumed today. Drunk becomes Hangover at the attack.',
    progression:[{label:'Drunk → Hangover',detail:'The attack clears Drunk and applies Hangover.'}],
  },
  hangover: {
    id:'hangover',label:'Hangover',family:'alcohol',severity:'warning',
    effect:'Alcohol cannot be consumed while Hungover. Hangover clears at the following attack.',
    systemSources:[{label:'Drunk at the attack',detail:'A citizen who reaches the nightly cycle Drunk becomes Hungover.'}],
    systemClears:[{label:'Following attack',detail:'Hangover clears during the next nightly cycle.'}],
  },
  immune: {
    id:'immune',label:'Immune',family:'protection',severity:'neutral',
    effect:'Temporarily protected from Infection. The protection is consumed by the nightly status cycle.',
    systemClears:[{label:'Attack cycle',detail:'Temporary immunity is consumed by the nightly condition cycle.'}],
    mechanics:['Immune prevents an unresolved wound from creating a new Infection during that attack.'],
  },
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
  return false
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
    const current=normalizeCitizenStatusState(citizen.status)
    if(current.hydration==='dehydrated'){events.push({type:'CITIZEN_DIED',day:state.day,hour:0,citizenId:citizen.id,reason:'dehydration'});continue}
    if(current.addicted&&!current.drugged){events.push({type:'CITIZEN_DIED',day:state.day,hour:0,citizenId:citizen.id,reason:'drug_withdrawal'});continue}
    if(current.infected&&infectionRoll(citizen.id)<=INFECTION_DEATH_CHANCE_PERCENT){events.push({type:'CITIZEN_DIED',day:state.day,hour:0,citizenId:citizen.id,reason:'infection'});continue}
    let hydration:HydrationStatus=current.hydration
    if(hydration==='thirsty')hydration='dehydrated'
    else if(!citizen.daily.drank)hydration='thirsty'
    const statusAfter:CitizenStatusState={
      ...current,
      hydration,
      desertStepsToday:0,
      infected:current.infected||Boolean(current.wound&&!current.immune),
      drugged:false,
      drunk:false,
      hangover:current.drunk,
      immune:false,
    }
    if(JSON.stringify(statusAfter)!==JSON.stringify(current))events.push({type:'CITIZEN_STATUS_CHANGED',day:state.day,hour:0,citizenId:citizen.id,status:statusAfter,reason:'nightly_progression'})
  }
  return events
}
