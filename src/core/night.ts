import { resolveCampingRoll } from './camping'
import { ATTACK_HOUR, DAY_START_HOUR } from './clock'
import { dailyConstructionOutputs, searchReplenishmentChance, temporaryCompletedProjects, watchtowerForecastDays, watchtowerMarginPercent } from './construction'
import { totalTownDefense } from './defense'
import { applyEvents } from './events'
import { personalDefense } from './home'
import { NORMAL_SCAVENGE_LOOT_POOL, createItemInstance } from './items'
import { applyNightWatchConditions, enrollAutonomousNightWatch, resetNightWatchEnrollment, resolveNightWatch } from './nightWatch'
import { randomInt } from './rng'
import { advanceExplorableRuinLifecycleForNewDay } from './ruinEvolution'
import { nightlyStatusEvents } from './status'
import type { GameEvent, GameState, HomeAttackOutcome, NightReport } from './types'
import { isTownGateZone, zoneKey } from './world'
import { worldZombieEvolutionEvent } from './worldEvolution'

export interface AttackRange { min:number; max:number; basis:'historical-sample'|'extrapolated' }
export interface WatchtowerForecast { day:number; min:number; max:number; basis:AttackRange['basis'] }
export interface WatchtowerEstimate { min:number; max:number; townDefense:number; basis:AttackRange['basis']; tomorrow?:WatchtowerForecast }
const HISTORICAL_RANGES:Record<number,readonly[number,number]>={1:[21,29],2:[25,84],3:[57,124],4:[92,227],5:[160,300],6:[217,450],7:[290,493],8:[357,651],9:[468,801],10:[611,901]}
export function attackRangeForDay(day:number):AttackRange{const historical=HISTORICAL_RANGES[Math.max(1,Math.floor(day))];if(historical)return{min:historical[0],max:historical[1],basis:'historical-sample'};const steps=Math.max(1,Math.floor(day)-10);const growth=Math.pow(1.15,steps);return{min:Math.round(611*growth),max:Math.round(901*growth),basis:'extrapolated'}}
function isolatedNightSeed(seed:number,day:number,salt:number):number{const mixed=((seed>>>0)^Math.imul(day+1,0x9e3779b1)^salt)>>>0;return mixed||1}
export function attackStrengthForDay(seed:number,day:number):number{const range=attackRangeForDay(day);return randomInt(isolatedNightSeed(seed,day,0xa511e9b3),range.min,range.max).value}

function estimateForDay(state:GameState,day:number,marginPercent:number):WatchtowerForecast&{actual:number}{
  const range=attackRangeForDay(day)
  const actual=attackStrengthForDay(state.seed,day)
  const margin=Math.max(3,Math.round(actual*(marginPercent/100)))
  return{day,min:Math.max(range.min,actual-margin),max:Math.min(range.max,actual+margin),actual,basis:range.basis}
}
/**
 * Public Watchtower information deliberately omits the deterministic attack value used to
 * construct the estimate envelope. UI and autonomous citizens receive the same min/max range.
 */
export function watchtowerEstimate(state:GameState):WatchtowerEstimate|null{
  const margin=watchtowerMarginPercent(state)
  if(margin===null)return null
  const today=estimateForDay(state,state.day,margin)
  const tomorrow=watchtowerForecastDays(state)>=2?estimateForDay(state,state.day+1,margin):null
  return{min:today.min,max:today.max,townDefense:totalTownDefense(state),basis:today.basis,...(tomorrow?{tomorrow:{day:tomorrow.day,min:tomorrow.min,max:tomorrow.max,basis:tomorrow.basis}}:{})}
}

function distributeBreachedZombies(state:GameState,zombiesInside:number):HomeAttackOutcome[]{const citizens=state.citizens.filter((citizen)=>citizen.alive&&citizen.location.type==='town');if(zombiesInside<=0||citizens.length===0)return[];const assigned=new Map<string,number>();let rngState=isolatedNightSeed(state.seed,state.day,0x63d83595);for(let zombie=0;zombie<zombiesInside;zombie+=1){const roll=randomInt(rngState,0,citizens.length-1);rngState=roll.state;const citizen=citizens[roll.value];assigned.set(citizen.id,(assigned.get(citizen.id)??0)+1)}return citizens.flatMap((citizen)=>{const zombies=assigned.get(citizen.id)??0;if(zombies===0)return[];const defense=personalDefense(citizen,state);return[{citizenId:citizen.id,zombies,defense,survived:zombies<=defense}]})}

export function searchTowerReplenishmentEvents(state:GameState):GameEvent[]{
  const percent=searchReplenishmentChance(state)
  if(percent<=0)return[]
  const candidates=Object.values(state.world.zones).filter((zone)=>zone.discovered&&!isTownGateZone(zone.x,zone.y)&&zone.searchesRemaining===0).sort((a,b)=>a.y-b.y||a.x-b.x)
  let rng=isolatedNightSeed(state.seed,state.day,0x5ea2c4a1)
  const events:GameEvent[]=[]
  for(const zone of candidates){const chance=randomInt(rng,1,100);rng=chance.state;if(chance.value>percent)continue;const loot=randomInt(rng,0,NORMAL_SCAVENGE_LOOT_POOL.length-1);rng=loot.state;events.push({type:'ZONE_REPLENISHED',day:state.day,hour:ATTACK_HOUR,zoneKey:zoneKey(zone.x,zone.y),loot:NORMAL_SCAVENGE_LOOT_POOL[loot.value]})}
  return events
}

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
  const attackStrength=attackStrengthForDay(afterCorpses.seed,afterCorpses.day)
  const defenseBeforeAttack=totalTownDefense(afterCorpses)
  const effectiveDefense=afterCorpses.town.gateOpen?0:defenseBeforeAttack

  // Autonomous citizens only use the public Watchtower envelope when deciding whether to
  // volunteer. The hidden deterministic attack value is never fed into the planning step.
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
  // A wound acquired during this Watch is source-exempt from the infection pass above.
  const afterWatchConditions=applyNightWatchConditions(afterStatuses,watchStage.report)

  const report:NightReport={day:state.day,attackStrength,defenseBeforeAttack,effectiveDefense,gateOpen:state.town.gateOpen,breached:zombiesInside>0,outsideDeaths:camping.strandedDeaths,campingSurvivors:camping.survivors,campingDeaths:camping.deaths,zombiesInside,homeDeaths:homeDeathEvents.length,dehydrationDeaths,infectionDeaths,withdrawalDeaths,corpseReanimations:corpseStage.reanimations,corpseAttackDeaths:corpseStage.attackDeaths,corpseWaterLost:corpseStage.waterLost,homeAttacks,nightWatch:watchStage.report}
  const replenishment=searchTowerReplenishmentEvents(afterWatchConditions)
  const outputs=constructionOutputEvents(afterWatchConditions)
  const expiries=constructionExpiryEvents(afterWatchConditions)
  const evolution=worldZombieEvolutionEvent(afterWatchConditions)
  const rollover:GameEvent[]=[{type:'NIGHT_RESOLVED',day:state.day,hour:ATTACK_HOUR,report},...replenishment,...outputs,...expiries]
  if(evolution)rollover.push(evolution)
  const afterWorldRollover=applyEvents(afterWatchConditions,rollover)
  const afterRuinRollover=advanceExplorableRuinLifecycleForNewDay(afterWorldRollover,state.day+1)
  const withFreshWatch=resetNightWatchEnrollment(afterRuinRollover)
  return applyEvents(withFreshWatch,[{type:'DAY_STARTED',day:state.day+1,hour:DAY_START_HOUR}])
}
