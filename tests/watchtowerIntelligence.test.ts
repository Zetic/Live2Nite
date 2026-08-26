import { describe, expect, it } from 'vitest'
import { asAgentDecisionContext } from '../src/agents/AgentDecisionContext'
import type { AgentController } from '../src/agents/AgentController'
import { getLegalActions } from '../src/core/actions'
import { CONSTRUCTIONS } from '../src/core/construction'
import { applyEvents } from '../src/core/events'
import { createInitialGame } from '../src/core/game'
import { watchtowerEstimate } from '../src/core/night'
import type { ConstructionId, GameEvent, GameState } from '../src/core/types'
import { watchtowerContributors, canContributeWatchtower, contributeWatchtowerEstimation, watchtowerContributionWeight, watchtowerTodayWeightedContributions, watchtowerTomorrowWeightedContributions } from '../src/core/watchtowerEstimation'
import { distanceToTown } from '../src/core/world'
import { BASE_WORLD_RECOVERY_CHANCE, lastRecordedSearchTowerDirection, nightlyObservationEvents, observationPlatformRadius, searchTowerRecoveryChance, searchTowerReplenishmentEventsForNight, searchTowerWindDirectionForDay, zoneWindDirection } from '../src/core/worldObservation'
import { worldZombieEvolutionEvent } from '../src/core/worldEvolution'
import { advanceOneHour } from '../src/simulation/advanceTime'
import { describeEvent } from '../src/ui/eventText'

function complete(game:GameState,...ids:ConstructionId[]):GameState{
  const construction={...game.town.construction}
  for(const id of ids)construction[id]={...construction[id],discovered:true,completed:true,apContributed:CONSTRUCTIONS[id].apCost}
  return{...game,town:{...game.town,construction}}
}
function upgrade(game:GameState,id:ConstructionId,level:number):GameState{return{...game,town:{...game.town,upgradeProjects:{...game.town.upgradeProjects,levels:{...game.town.upgradeProjects.levels,[id]:level}}}}}
const departureController:AgentController={
  kind:'watchtower-departure-test',
  decide(input,citizenId){const state=asAgentDecisionContext(input,citizenId).state;return getLegalActions(state,citizenId).find((action)=>action.type==='EXIT_TOWN')??null},
}

describe('current MyHordes Watchtower estimation',()=>{
  it('allows one free contribution per living citizen in town',()=>{
    let game=complete(createInitialGame(7001,2),'watchtower')
    const ap=game.citizens[0].ap
    expect(canContributeWatchtower(game,'c01')).toBe(true)
    game=contributeWatchtowerEstimation(game,'c01')
    expect(game.citizens[0].ap).toBe(ap)
    expect(canContributeWatchtower(game,'c01')).toBe(false)
    expect(watchtowerTodayWeightedContributions(game)).toBe(1)
  })

  it('uses one x2 condition for Scanner OR a Telescope in the Bank and never stacks to x4',()=>{
    let game=complete(createInitialGame(7002,4),'watchtower')
    expect(watchtowerContributionWeight(game)).toBe(1)
    game=complete(game,'observation_platform','scanner')
    expect(watchtowerContributionWeight(game)).toBe(2)
    game={...game,town:{...game.town,bank:[...game.town.bank,{id:'scope-1',type:'telescope'}]}}
    expect(watchtowerContributionWeight(game)).toBe(2)
    for(const citizen of game.citizens)game=contributeWatchtowerEstimation(game,citizen.id)
    expect(watchtowerTodayWeightedContributions(game)).toBe(8)
    expect(watchtowerEstimate(game)).not.toBeNull()
  })

  it('keeps an ordinary four-citizen estimate hidden below the 33 percent threshold',()=>{
    let game=complete(createInitialGame(7003,4),'watchtower')
    for(const citizen of game.citizens)game=contributeWatchtowerEstimation(game,citizen.id)
    expect(watchtowerTodayWeightedContributions(game)).toBe(4)
    expect(watchtowerEstimate(game)).toBeNull()
  })

  it('spends weighted contributions beyond todays 24-point target on Planner tomorrow',()=>{
    let game=complete(createInitialGame(7004,40),'watchtower','planner')
    for(const citizen of game.citizens)game=contributeWatchtowerEstimation(game,citizen.id)
    expect(watchtowerTodayWeightedContributions(game)).toBe(24)
    expect(watchtowerTomorrowWeightedContributions(game)).toBe(16)
    const estimate=watchtowerEstimate(game)
    expect(estimate?.tomorrow?.weightedContributions).toBe(16)
    expect(estimate?.tomorrow?.quality).toBeCloseTo(16/24)
  })

  it('records an autonomous 08:00 contribution before that bot departs town',()=>{
    let game=complete(createInitialGame(7005,2),'watchtower')
    game={...game,clock:{hour:8,phase:'day'},town:{...game.town,gateOpen:true}}
    const next=advanceOneHour(game,departureController,'c01')
    expect(watchtowerContributors(next)).toContain('c02')
    expect(next.citizens.find((citizen)=>citizen.id==='c02')?.location.type).toBe('world')
  })
})

describe('Observation Platform and Upgraded Map',()=>{
  it('uses the directly supported 3, 6 and 10 km radius progression',()=>{
    let game=complete(createInitialGame(7101,2),'watchtower','observation_platform')
    expect(observationPlatformRadius(game)).toBe(0)
    game=upgrade(game,'observation_platform',1);expect(observationPlatformRadius(game)).toBe(3)
    game=upgrade(game,'observation_platform',2);expect(observationPlatformRadius(game)).toBe(6)
    game=upgrade(game,'observation_platform',3);expect(observationPlatformRadius(game)).toBe(10)
  })

  it('measures the observation radius in the same Manhattan/AP kilometres used by travel',()=>{
    let game=complete(createInitialGame(7105,2),'watchtower','observation_platform')
    game=upgrade(game,'observation_platform',1)
    const events=nightlyObservationEvents(game)
    expect(events.some((event)=>event.type==='ZONE_OBSERVED'&&event.zoneKey==='2,1')).toBe(true)
    expect(events.some((event)=>event.type==='ZONE_OBSERVED'&&event.zoneKey==='2,2')).toBe(false)
  })

  it('writes next-day coarse map intelligence without Upgraded Map and exact intelligence with it',()=>{
    let game=complete(createInitialGame(7102,2),'watchtower','observation_platform')
    game=upgrade(game,'observation_platform',1)
    const key='1,0';const zone=game.world.zones[key]
    expect(zone).toBeTruthy()
    game={...game,world:{...game.world,zones:{...game.world.zones,[key]:{...zone,zombies:3,discovered:false}}}}
    const coarse=nightlyObservationEvents(game)
    const coarseObservation=coarse.find((event)=>event.type==='ZONE_OBSERVED'&&event.zoneKey===key)
    expect(coarseObservation&&coarseObservation.type==='ZONE_OBSERVED'?coarseObservation.zombies:null).toBe(4)
    expect(coarseObservation?.hour).toBe(-1)
    expect(coarseObservation?.day).toBe(game.day+1)

    game=complete(game,'upgraded_map')
    const exact=nightlyObservationEvents(game).find((event)=>event.type==='ZONE_OBSERVED'&&event.zoneKey===key)
    expect(exact&&exact.type==='ZONE_OBSERVED'?exact.zombies:null).toBe(3)
    expect(exact?.hour).toBe(0)
  })

  it('refreshes an occupied outside zone even before the first Observation Platform radius upgrade',()=>{
    let game=complete(createInitialGame(7103,2),'watchtower','observation_platform')
    const target='4,0';expect(game.world.zones[target]).toBeTruthy()
    game={...game,citizens:game.citizens.map((citizen)=>citizen.id==='c02'?{...citizen,location:{type:'world' as const,x:4,y:0}}:citizen)}
    expect(nightlyObservationEvents(game).some((event)=>event.type==='ZONE_OBSERVED'&&event.zoneKey===target)).toBe(true)
  })
})

describe('Searchtower nightly recovery',()=>{
  it('keeps natural recovery at 25 percent before Searchtower construction, then upgrades from the same level-0 baseline',()=>{
    let game=createInitialGame(7201,2)
    expect(BASE_WORLD_RECOVERY_CHANCE).toBe(25)
    expect(searchTowerRecoveryChance(game)).toBe(25)

    game=complete(game,'watchtower','search_tower')
    expect(searchTowerRecoveryChance(game)).toBe(25)
    const expected=[37,49,61,73,85]
    for(let level=1;level<=5;level+=1){game=upgrade(game,'search_tower',level);expect(searchTowerRecoveryChance(game)).toBe(expected[level-1])}
  })

  it('runs the base 25 percent sector recovery even when Searchtower has not been constructed',()=>{
    let game=createInitialGame(7207,2)
    game={...game,world:{...game.world,zones:Object.fromEntries(Object.entries(game.world.zones).map(([key,zone])=>[key,{...zone,searchesRemaining:0}]))}}
    let recovered:GameEvent[]=[]
    for(let seed=1;seed<=128&&recovered.length===0;seed+=1){
      recovered=searchTowerReplenishmentEventsForNight({...game,seed},['rotten_log'])
    }
    expect(recovered.length).toBeGreaterThan(0)
    expect(lastRecordedSearchTowerDirection(game)).toBeNull()
  })

  it('uses the source grid-sector boundary rather than equal 45-degree octants',()=>{
    expect(zoneWindDirection(0,1)).toBe('N')
    expect(zoneWindDirection(1,2)).toBe('N')
    expect(zoneWindDirection(1,1)).toBe('NE')
    expect(zoneWindDirection(2,1)).toBe('E')
    expect(zoneWindDirection(-1,2)).toBe('N')
    expect(zoneWindDirection(-2,1)).toBe('W')
    expect(zoneWindDirection(1,-2)).toBe('S')
    expect(zoneWindDirection(1,-1)).toBe('SE')
  })

  it('selects one deterministic compass sector and only recovers depleted zones in that sector beyond 2 travel km',()=>{
    let game=complete(createInitialGame(7202,2),'watchtower','search_tower')
    game=upgrade(game,'search_tower',5)
    game={...game,world:{...game.world,zones:Object.fromEntries(Object.entries(game.world.zones).map(([key,zone])=>[key,{...zone,discovered:false,searchesRemaining:0}]))}}
    const wind=searchTowerWindDirectionForDay(game.seed,game.day)
    expect(searchTowerWindDirectionForDay(game.seed,game.day)).toBe(wind)
    const events=searchTowerReplenishmentEventsForNight(game,['rotten_log'])
    expect(events.length).toBeGreaterThan(0)
    for(const event of events){
      expect(event.type).toBe('ZONE_REPLENISHED')
      if(event.type!=='ZONE_REPLENISHED')continue
      const zone=game.world.zones[event.zoneKey]
      expect(distanceToTown(zone.x,zone.y)).toBeGreaterThan(2)
      expect(zoneWindDirection(zone.x,zone.y)).toBe(wind)
    }
    const applied=applyEvents(game,events)
    expect(events.some((event)=>event.type==='ZONE_REPLENISHED'&&!game.world.zones[event.zoneKey].discovered)).toBe(true)
    expect(events.every((event)=>event.type!=='ZONE_REPLENISHED'||applied.world.zones[event.zoneKey].searchesRemaining===1)).toBe(true)
  })

  it('level-0 Searchtower records the selected recovery sector without changing the 25 percent baseline',()=>{
    const game=complete(createInitialGame(7203,2),'watchtower','search_tower')
    expect(searchTowerRecoveryChance(game)).toBe(25)
    const event=worldZombieEvolutionEvent(game)
    expect(event?.type).toBe('WORLD_ZOMBIES_EVOLVED')
    expect(describeEvent(event!,game)).toContain(`Searchtower recorded the recovery sector as ${searchTowerWindDirectionForDay(game.seed,game.day)}.`)
  })

  it('reads the most recent stored Searchtower sector for facility history',()=>{
    const direction=searchTowerWindDirectionForDay(7206,1)
    const event={type:'WORLD_ZOMBIES_EVOLVED',day:1,hour:0,changes:[],searchTowerDirection:direction} as GameEvent&{searchTowerDirection:typeof direction}
    const game={...complete(createInitialGame(7206,2),'watchtower','search_tower'),day:2,events:[event]}
    expect(lastRecordedSearchTowerDirection(game)).toBe(direction)
  })

  it('does not invent previous Searchtower history when the building is completed later',()=>{
    const oldEvent={type:'WORLD_ZOMBIES_EVOLVED',day:1,hour:0,changes:[]} as GameEvent
    const laterGame={...complete(createInitialGame(7204,2),'watchtower','search_tower'),day:2,events:[oldEvent]}
    expect(describeEvent(oldEvent,laterGame)).not.toContain('Searchtower recorded')
    expect(lastRecordedSearchTowerDirection(laterGame)).toBeNull()
  })
})
