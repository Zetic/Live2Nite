import { resolveCampingRoll } from './camping'
import { ATTACK_HOUR, DAY_START_HOUR } from './clock'
import { totalTownDefense } from './defense'
import { applyEvents } from './events'
import { personalDefense } from './home'
import { NORMAL_SCAVENGE_LOOT_POOL } from './items'
import { randomInt } from './rng'
import { nightlyHydrationEvents } from './status'
import type { GameEvent, GameState, HomeAttackOutcome, NightReport } from './types'
import { isTownGateZone, zoneKey } from './world'
import { worldZombieEvolutionEvent } from './worldEvolution'

export interface AttackRange { min:number; max:number; basis:'historical-sample'|'extrapolated' }
export interface WatchtowerEstimate { min:number; max:number; actual:number; townDefense:number; basis:AttackRange['basis'] }
const HISTORICAL_RANGES:Record<number,readonly[number,number]>={1:[21,29],2:[25,84],3:[57,124],4:[92,227],5:[160,300],6:[217,450],7:[290,493],8:[357,651],9:[468,801],10:[611,901]}
export function attackRangeForDay(day:number):AttackRange{const historical=HISTORICAL_RANGES[Math.max(1,Math.floor(day))];if(historical)return{min:historical[0],max:historical[1],basis:'historical-sample'};const steps=Math.max(1,Math.floor(day)-10);const growth=Math.pow(1.15,steps);return{min:Math.round(611*growth),max:Math.round(901*growth),basis:'extrapolated'}}
function isolatedNightSeed(seed:number,day:number,salt:number):number{const mixed=((seed>>>0)^Math.imul(day+1,0x9e3779b1)^salt)>>>0;return mixed||1}
export function attackStrengthForDay(seed:number,day:number):number{const range=attackRangeForDay(day);return randomInt(isolatedNightSeed(seed,day,0xa511e9b3),range.min,range.max).value}
export function watchtowerEstimate(state:GameState):WatchtowerEstimate|null{if(!state.town.construction.watchtower.completed)return null;const range=attackRangeForDay(state.day);const actual=attackStrengthForDay(state.seed,state.day);const margin=Math.max(3,Math.round(actual*0.15));return{min:Math.max(range.min,actual-margin),max:Math.min(range.max,actual+margin),actual,townDefense:totalTownDefense(state),basis:range.basis}}
function distributeBreachedZombies(state:GameState,zombiesInside:number):HomeAttackOutcome[]{const citizens=state.citizens.filter((citizen)=>citizen.alive&&citizen.location.type==='town');if(zombiesInside<=0||citizens.length===0)return[];const assigned=new Map<string,number>();let rngState=isolatedNightSeed(state.seed,state.day,0x63d83595);for(let zombie=0;zombie<zombiesInside;zombie+=1){const roll=randomInt(rngState,0,citizens.length-1);rngState=roll.state;const citizen=citizens[roll.value];assigned.set(citizen.id,(assigned.get(citizen.id)??0)+1)}return citizens.flatMap((citizen)=>{const zombies=assigned.get(citizen.id)??0;if(zombies===0)return[];const defense=personalDefense(citizen);return[{citizenId:citizen.id,zombies,defense,survived:zombies<=defense}]})}
export function searchTowerReplenishmentEvents(state:GameState):GameEvent[]{if(!state.town.construction.search_tower?.completed)return[];const candidates=Object.values(state.world.zones).filter((zone)=>zone.discovered&&!isTownGateZone(zone.x,zone.y)&&zone.searchesRemaining===0).sort((a,b)=>a.y-b.y||a.x-b.x);let rng=isolatedNightSeed(state.seed,state.day,0x5ea2c4a1);const events:GameEvent[]=[];for(const zone of candidates){const chance=randomInt(rng,1,100);rng=chance.state;if(chance.value>25)continue;const loot=randomInt(rng,0,NORMAL_SCAVENGE_LOOT_POOL.length-1);rng=loot.state;events.push({type:'ZONE_REPLENISHED',day:state.day,hour:ATTACK_HOUR,zoneKey:zoneKey(zone.x,zone.y),loot:NORMAL_SCAVENGE_LOOT_POOL[loot.value]})}return events}
function campingNightEvents(state:GameState):{events:GameEvent[];survivors:number;deaths:number;strandedDeaths:number}{
  const outside=state.citizens.filter((citizen)=>citizen.alive&&citizen.location.type==='world')
  const events:GameEvent[]=[]
  let survivors=0;let deaths=0;let strandedDeaths=0
  for(const citizen of outside){
    if(!citizen.camping.hidden||citizen.camping.hiddenDay!==state.day){events.push({type:'CITIZEN_DIED',day:state.day,hour:ATTACK_HOUR,citizenId:citizen.id,reason:'outside_at_night'});strandedDeaths+=1;continue}
    const outcome=resolveCampingRoll(state,citizen);const chance=citizen.camping.survivalChance??0
    events.push({type:'CAMPING_RESOLVED',day:state.day,hour:ATTACK_HOUR,citizenId:citizen.id,survivalChance:chance,roll:outcome.roll,survived:outcome.survived})
    if(outcome.survived)survivors+=1
    else{deaths+=1;events.push({type:'CITIZEN_DIED',day:state.day,hour:ATTACK_HOUR,citizenId:citizen.id,reason:'camping_failure'})}
  }
  return{events,survivors,deaths,strandedDeaths}
}
function campDecayEvents(state:GameState):GameEvent[]{return Object.entries(state.world.zones).flatMap(([key,zone])=>(zone.campImprovements??0)>0?[{type:'CAMP_IMPROVEMENTS_DECAYED',day:state.day,hour:ATTACK_HOUR,zoneKey:key,amount:1} as GameEvent]:[])}
export function resolveNightAttack(state:GameState):GameState{
  const camping=campingNightEvents(state)
  const afterOutside=applyEvents(state,camping.events)
  const attackStrength=attackStrengthForDay(afterOutside.seed,afterOutside.day)
  const defenseBeforeAttack=totalTownDefense(afterOutside)
  const effectiveDefense=afterOutside.town.gateOpen?0:defenseBeforeAttack
  const zombiesInside=Math.max(0,attackStrength-effectiveDefense)
  const homeAttacks=distributeBreachedZombies(afterOutside,zombiesInside)
  const homeDeathEvents:GameEvent[]=homeAttacks.filter((outcome)=>!outcome.survived).map((outcome)=>({type:'CITIZEN_DIED',day:state.day,hour:ATTACK_HOUR,citizenId:outcome.citizenId,reason:'home_breach'}))
  const afterHomeDeaths=applyEvents(afterOutside,homeDeathEvents)
  const hydrationEvents=nightlyHydrationEvents(afterHomeDeaths)
  const dehydrationDeaths=hydrationEvents.filter((event)=>event.type==='CITIZEN_DIED'&&event.reason==='dehydration').length
  const afterHydration=applyEvents(afterHomeDeaths,hydrationEvents)
  const report:NightReport={day:state.day,attackStrength,defenseBeforeAttack,effectiveDefense,gateOpen:state.town.gateOpen,breached:zombiesInside>0,outsideDeaths:camping.strandedDeaths,campingSurvivors:camping.survivors,campingDeaths:camping.deaths,zombiesInside,homeDeaths:homeDeathEvents.length,dehydrationDeaths,homeAttacks}
  const replenishment=searchTowerReplenishmentEvents(afterHydration)
  const decay=campDecayEvents(afterHydration)
  const evolution=worldZombieEvolutionEvent(afterHydration)
  const rollover:GameEvent[]=[{type:'NIGHT_RESOLVED',day:state.day,hour:ATTACK_HOUR,report},...replenishment,...decay]
  if(evolution)rollover.push(evolution)
  rollover.push({type:'DAY_STARTED',day:state.day+1,hour:DAY_START_HOUR})
  return applyEvents(afterHydration,rollover)
}
