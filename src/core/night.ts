import { agricultureOutputEvents } from './agriculture'
import { resolveCampingRoll } from './camping'
import { ATTACK_HOUR, DAY_START_HOUR } from './clock'
import { dailyConstructionOutputs, temporaryCompletedProjects } from './construction'
import { totalTownDefense } from './defense'
import { applyEvents } from './events'
import { personalDefense } from './home'
import { NORMAL_SCAVENGE_LOOT_POOL, createItemInstance } from './items'
import { applyNightWatchConditions, enrollAutonomousNightWatch, resetNightWatchEnrollment, resolveNightWatch } from './nightWatch'
import { randomInt } from './rng'
import { advanceExplorableRuinLifecycleForNewDay } from './ruinEvolution'
import { nightlyStatusEvents } from './status'
import type { GameEvent, GameState, HomeAttackOutcome, NightReport } from './types'
import { WATCHTOWER_ESTIMATION_TARGET, watchtowerTodayComplete, watchtowerTodayVisible, watchtowerTodayWeightedContributions, watchtowerTomorrowVisible, watchtowerTomorrowWeightedContributions } from './watchtowerEstimation'
import { townWaterAllocation } from './waterEconomy'
import { zoneKey } from './world'
import { nightlyObservationEvents, searchTowerReplenishmentEventsForNight } from './worldObservation'
import { worldZombieEvolutionEvent } from './worldEvolution'

export interface AttackRange { min:number; max:number; basis:'historical-sample'|'extrapolated' }
export interface WatchtowerForecast { day:number; min:number; max:number; quality:number; weightedContributions:number; basis:AttackRange['basis'] }
export interface WatchtowerEstimate extends WatchtowerForecast { townDefense:number; tomorrow?:WatchtowerForecast }
const HISTORICAL_RANGES:Record<number,readonly[number,number]>={1:[21,29],2:[25,84],3:[57,124],4:[92,227],5:[160,300],6:[217,450],7:[290,493],8:[357,651],9:[468,801],10:[611,901]}
export function attackRangeForDay(day:number):AttackRange{const historical=HISTORICAL_RANGES[Math.max(1,Math.floor(day))];if(historical)return{min:historical[0],max:historical[1],basis:'historical-sample'};const steps=Math.max(1,Math.floor(day)-10);const growth=Math.pow(1.15,steps);return{min:Math.round(611*growth),max:Math.round(901*growth),basis:'extrapolated'}}
function isolatedNightSeed(seed:number,day:number,salt:number):number{const mixed=((seed>>>0)^Math.imul(day+1,0x9e3779b1)^salt)>>>0;return mixed||1}
export function attackStrengthForDay(seed:number,day:number):number{const range=attackRangeForDay(day);return randomInt(isolatedNightSeed(seed,day,0xa511e9b3),range.min,range.max).value}

function estimationDayFactor(day:number):number{return day<=15?1:day<=20?0.75:day<=30?0.5:day<=40?0.25:0.15}
function reduceEstimationOffsets(seed:number,minimum:number,maximum:number,weightedContributions:number):{minimum:number;maximum:number}{
  let minOffset=Math.max(0,minimum);let maxOffset=Math.max(0,maximum);let rng=seed
  const rounds=Math.min(WATCHTOWER_ESTIMATION_TARGET,Math.max(0,Math.floor(weightedContributions)))
  for(let index=0;index<rounds;index+=1){
    const total=minOffset+maxOffset;if(total<=0)break
    const spendable=total/Math.max(1,WATCHTOWER_ESTIMATION_TARGET-index)
    const scale=randomInt(rng,25,100);rng=scale.state
    const reduction=spendable*(scale.value/100)
    const mode=randomInt(rng,1,100);rng=mode.state
    if(mode.value<=25){
      const minShare=minOffset/total;const maxShare=maxOffset/total
      minOffset=Math.max(0,minOffset-reduction*minShare)
      maxOffset=Math.max(0,maxOffset-reduction*maxShare)
      continue
    }
    const side=randomInt(rng,1,100);rng=side.state
    if(side.value<=Math.round((minOffset/total)*100))minOffset=Math.max(0,minOffset-reduction)
    else maxOffset=Math.max(0,maxOffset-reduction)
  }
  return{minimum:minOffset,maximum:maxOffset}
}
function estimateForDay(state:GameState,day:number,weightedContributions:number,blocks=false):WatchtowerForecast{
  const range=attackRangeForDay(day)
  const actual=attackStrengthForDay(state.seed,day)
  const factor=estimationDayFactor(day)
  const targetMargin=Math.max(2,Math.round(actual*.10*factor))
  const targetMin=Math.max(range.min,actual-targetMargin)
  const targetMax=Math.min(range.max,actual+targetMargin)
  let rng=isolatedNightSeed(state.seed,day,blocks?0x39ca21d7:0x4e35a9c1)
  const initialMin=randomInt(rng,5,26);rng=initialMin.state
  const offsetMin=initialMin.value*factor
  const offsetMax=Math.max(0,28*factor-offsetMin)
  const reduced=reduceEstimationOffsets(rng,offsetMin,offsetMax,weightedContributions)
  let min=Math.max(0,Math.floor(targetMin*(1-reduced.minimum/100)))
  let max=Math.max(min,Math.ceil(targetMax*(1+reduced.maximum/100)))
  if(blocks){const block=Math.max(5,Math.ceil(day/5)*5);min=Math.floor(min/block)*block;max=Math.ceil(max/block)*block}
  return{day,min,max,quality:Math.min(1,weightedContributions/WATCHTOWER_ESTIMATION_TARGET),weightedContributions,basis:range.basis}
}
/**
 * Public Watchtower information is derived only after the collaborative visibility threshold
 * is reached. The exact deterministic attack value used to form the estimate is never returned.
 */
export function watchtowerEstimate(state:GameState):WatchtowerEstimate|null{
  if(!state.town.construction.watchtower?.completed||!watchtowerTodayVisible(state))return null
  const weighted=watchtowerTodayWeightedContributions(state)
  const today=estimateForDay(state,state.day,weighted)
  let tomorrow:WatchtowerForecast|undefined
  if(state.town.construction.planner?.completed&&watchtowerTodayComplete(state)&&watchtowerTomorrowVisible(state)){
    const tomorrowWeighted=watchtowerTomorrowWeightedContributions(state)
    tomorrow=estimateForDay(state,state.day+1,tomorrowWeighted,true)
  }
  return{...today,townDefense:totalTownDefense(state),...(tomorrow?{tomorrow}:{})}
}

function distributeBreachedZombies(state:GameState,zombiesInside:number):HomeAttackOutcome[]{const citizens=state.citizens.filter((citizen)=>citizen.alive&&citizen.location.type==='town');if(zombiesInside<=0||citizens.length===0)return[];const assigned=new Map<string,number>();let rngState=isolatedNightSeed(state.seed,state.day,0x63d83595);for(let zombie=0;zombie<zombiesInside;zombie+=1){const roll=randomInt(rngState,0,citizens.length-1);rngState=roll.state;const citizen=citizens[roll.value];assigned.set(citizen.id,(assigned.get(citizen.id)??0)+1)}return citizens.flatMap((citizen)=>{const zombies=assigned.get(citizen.id)??0;if(zombies===0)return[];const defense=personalDefense(citizen,state);return[{citizenId:citizen.id,zombies,defense,survived:zombies<=defense}]})}

export function searchTowerReplenishmentEvents(state:GameState):GameEvent[]{return searchTowerReplenishmentEventsForNight(state,NORMAL_SCAVENGE_LOOT_POOL)}

function campingNightEvents(state:GameState):{events:GameEvent[];survivors:number;deaths:number;strandedDeaths:number}{
  const outside=state.citizens.filter((citizen)=>citizen.alive&&citizen.location.type==='world')
  const events:GameEvent[]=[]
  const claimedBlueprintZones=new Set(Object.entries(state.world.zones).filter(([,zone])=>zone.specialSite?.blueprintFound).map(([key])=>key))
  let nextBlueprintItemId=state.nextItemId
  let survivors=0;let deaths=0;let strandedDeaths=0
  for(const citizen of outside){
    if(citizen.location.type!=='world')continue
    if(!citizen.camping.hidden||citizen.camping.hiddenDay!==state.day){events.push({type:'CITIZEN_DIED',day:state.day,hour:ATTACK_HOUR,citizenId:citizen.id,reason:'outside_at_night'});strandedDeaths+=1;continue}
    const outcome=resolveCampingRoll(state,citizen);const chance=citizen.camping.survivalChance??0
    events.push({type:'CAMPING_RESOLVED',day:state.day,hour:ATTACK_HOUR,citizenId:citizen.id,survivalChance:chance,roll:outcome.roll,survived:outcome.survived})
    if(outcome.survived){
      survivors+=1
      const location=citizen.location
      const key=zoneKey(location.x,location.y)
      const zone=state.world.zones[key]
      if(zone?.specialSite&&zone.specialSite.status!=='buried'&&!claimedBlueprintZones.has(key)){
        const distanceKm=Math.round(Math.sqrt(location.x*location.x+location.y*location.y))
        const type=distanceKm<10?'uncommon_blueprint':'rare_blueprint'
        const item=createItemInstance(`i${String(nextBlueprintItemId).padStart(6,'0')}`,type)
        nextBlueprintItemId+=1
        claimedBlueprintZones.add(key)
        events.push({type:'CAMPING_BLUEPRINT_DROPPED',day:state.day,hour:ATTACK_HOUR,citizenId:citizen.id,zoneKey:key,item,distanceKm})
      }
    }else{deaths+=1;events.push({type:'CITIZEN_DIED',day:state.day,hour:ATTACK_HOUR,citizenId:citizen.id,reason:'camping_failure'})}
  }
  return{events,survivors,deaths,strandedDeaths}
}
function corpseReanimationEvents(state:GameState):{events:GameEvent[];reanimations:number;attackDeaths:number;waterLost:number}{
  const corpses=state.citizens.filter((citizen)=>!citizen.alive&&citizen.home.holdsBody&&!citizen.home.corpseAttacked).sort((a,b)=>a.id.localeCompare(b.id))
  const targets=state.citizens.filter((citizen)=>citizen.alive&&citizen.location.type==='town').map((citizen)=>citizen.id)
  const events:GameEvent[]=[]
  let rng=isolatedNightSeed(state.seed,state.day,0x0c0ff5e)
  let well=state.town.well.water
  let attackDeaths=0
  let waterLost=0
  for(const corpse of corpses){
    const attackPlayer=well>0?66:100
    const choice=randomInt(rng,0,100);rng=choice.state
    if(choice.value>attackPlayer){
      const loss=Math.min(well,20)
      if(loss<=0)continue
      well-=loss;waterLost+=loss
      events.push({type:'CORPSE_REANIMATED',day:state.day,hour:ATTACK_HOUR,corpseCitizenId:corpse.id,outcome:'well',waterLost:loss})
      continue
    }
    if(targets.length===0)continue
    const victimRoll=randomInt(rng,0,targets.length-1);rng=victimRoll.state
    const[victimCitizenId]=targets.splice(victimRoll.value,1)
    events.push({type:'CORPSE_REANIMATED',day:state.day,hour:ATTACK_HOUR,corpseCitizenId:corpse.id,outcome:'citizen',victimCitizenId,waterLost:0})
    events.push({type:'CITIZEN_DIED',day:state.day,hour:ATTACK_HOUR,citizenId:victimCitizenId,reason:'corpse_attack'})
    attackDeaths+=1
  }
  return{events,reanimations:events.filter((event)=>event.type==='CORPSE_REANIMATED').length,attackDeaths,waterLost}
}
function constructionExpiryEvents(state:GameState):GameEvent[]{return temporaryCompletedProjects(state).map((projectId)=>({type:'CONSTRUCTION_EXPIRED',day:state.day,hour:ATTACK_HOUR,projectId}))}
function stableStringSalt(value:string):number{let hash=2166136261;for(let index=0;index<value.length;index+=1){hash^=value.charCodeAt(index);hash=Math.imul(hash,16777619)}return hash>>>0}
function constructionOutputEvents(state:GameState):GameEvent[]{
  return dailyConstructionOutputs(state).map((output)=>{
    const seed=isolatedNightSeed(state.seed,state.day,stableStringSalt(output.projectId))
    const amount=output.min===output.max?output.min:randomInt(seed,output.min,output.max).value
    return{type:'CONSTRUCTION_GENERATED_ITEM',day:state.day,hour:ATTACK_HOUR,projectId:output.projectId,itemType:output.itemType,amount} as GameEvent
  })
}

export function resolveNightAttack(state:GameState):GameState{
  const camping=campingNightEvents(state)
  const afterOutside=applyEvents(state,camping.events)
  const corpseStage=corpseReanimationEvents(afterOutside)
  const afterCorpses=applyEvents(afterOutside,corpseStage.events)

  // Pump upgrade votes have already resolved before this attack phase. The resulting Well water
  // is therefore available to fund the same night's consumers. Allocation is computed before
  // defense is locked and is all-or-nothing per consumer.
  const waterAllocation=townWaterAllocation(afterCorpses)
  const waterConsumers=waterAllocation.consumers.map(({projectId,label,required,active})=>({projectId,label,required,active}))
  const attackStrength=attackStrengthForDay(afterCorpses.seed,afterCorpses.day)
  const defenseBeforeAttack=totalTownDefense(afterCorpses)
  const effectiveDefense=afterCorpses.town.gateOpen?0:defenseBeforeAttack

  // Autonomous citizens receive only the public collaborative estimate. Hidden attack truth
  // is never fed back into Night Watch enrollment.
  const estimate=watchtowerEstimate(afterCorpses)
  const expectedOverflow=Math.max(0,(estimate?.max??effectiveDefense)-effectiveDefense)
  const watchPrepared=enrollAutonomousNightWatch(afterCorpses,expectedOverflow)
  const overflowBeforeWatch=Math.max(0,attackStrength-effectiveDefense)
  const watchStage=resolveNightWatch(watchPrepared,overflowBeforeWatch)
  const zombiesInside=watchStage.report.overflowAfter

  const homeAttacks=distributeBreachedZombies(watchStage.state,zombiesInside)
  const homeDeathEvents:GameEvent[]=homeAttacks.filter((outcome)=>!outcome.survived).map((outcome)=>({type:'CITIZEN_DIED',day:state.day,hour:ATTACK_HOUR,citizenId:outcome.citizenId,reason:'home_breach'}))
  const afterHomeDeaths=applyEvents(watchStage.state,homeDeathEvents)
  const statusEvents=nightlyStatusEvents(afterHomeDeaths,(citizenId)=>randomInt(isolatedNightSeed(afterHomeDeaths.seed,afterHomeDeaths.day,stableStringSalt(`infection:${citizenId}`)),1,100).value)
  const dehydrationDeaths=statusEvents.filter((event)=>event.type==='CITIZEN_DIED'&&event.reason==='dehydration').length
  const infectionDeaths=statusEvents.filter((event)=>event.type==='CITIZEN_DIED'&&event.reason==='infection').length
  const withdrawalDeaths=statusEvents.filter((event)=>event.type==='CITIZEN_DIED'&&event.reason==='drug_withdrawal').length
  const afterStatuses=applyEvents(afterHomeDeaths,statusEvents)
  const afterWatchConditions=applyNightWatchConditions(afterStatuses,watchStage.report)

  const report:NightReport={day:state.day,attackStrength,defenseBeforeAttack,effectiveDefense,gateOpen:state.town.gateOpen,breached:zombiesInside>0,outsideDeaths:camping.strandedDeaths,campingSurvivors:camping.survivors,campingDeaths:camping.deaths,zombiesInside,homeDeaths:homeDeathEvents.length,dehydrationDeaths,infectionDeaths,withdrawalDeaths,corpseReanimations:corpseStage.reanimations,corpseAttackDeaths:corpseStage.attackDeaths,corpseWaterLost:corpseStage.waterLost,waterConsumed:waterAllocation.consumed,waterConsumers,homeAttacks,nightWatch:watchStage.report}
  const outputs=[...constructionOutputEvents(afterWatchConditions),...agricultureOutputEvents(afterWatchConditions)]
  const expiries=constructionExpiryEvents(afterWatchConditions)
  const waterEvent:GameEvent[] = waterConsumers.length?[{type:'WELL_WATER_CONSUMED',day:state.day,hour:ATTACK_HOUR,amount:waterAllocation.consumed,consumers:waterConsumers}]:[]
  // Defense is already locked. Debit the funded consumers now, then publish production/expiry.
  const afterNightEvents=applyEvents(afterWatchConditions,[...waterEvent,{type:'NIGHT_RESOLVED',day:state.day,hour:ATTACK_HOUR,report},...outputs,...expiries])

  // World truth evolves first. Searchtower then recovers depleted zones in one deterministic
  // compass sector, and Observation Platform writes only the permitted shared intelligence.
  const evolution=worldZombieEvolutionEvent(afterNightEvents)
  const afterEvolution=evolution?applyEvents(afterNightEvents,[evolution]):afterNightEvents
  const replenishment=searchTowerReplenishmentEvents(afterEvolution)
  const observations=nightlyObservationEvents(afterEvolution)
  const afterWorldRollover=applyEvents(afterEvolution,[...replenishment,...observations])
  const afterRuinRollover=advanceExplorableRuinLifecycleForNewDay(afterWorldRollover,state.day+1)
  const withFreshWatch=resetNightWatchEnrollment(afterRuinRollover)
  return applyEvents(withFreshWatch,[{type:'DAY_STARTED',day:state.day+1,hour:DAY_START_HOUR}])
}
