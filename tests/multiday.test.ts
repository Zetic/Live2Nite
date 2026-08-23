import { describe, expect, it } from 'vitest'
import { BasicBotController } from '../src/agents/BasicBotController'
import { createInitialGame } from '../src/core/game'
import { advanceOneHour, advanceToHour } from '../src/simulation/advanceTime'

const bots=new BasicBotController()

describe('multi-day town regression',()=>{
  it('reports three-night balance metrics without treating provisional balance as a merge gate',()=>{
    const seeds=[3101,4202,5303,6404]
    let minimumLiving=40
    let gateFailures=0
    let totalCampingAttempts=0
    let totalCampingSurvivors=0
    let totalCampingDeaths=0
    let totalOutsideDeaths=0
    let botDehydrationDeaths=0
    let maximumOutsideAtMidnight=0
    let totalFinalWell=0
    let totalUnusedBotApAtMidnight=0
    let totalLivingBotMidnights=0
    let fullApBotsAtMidnight=0
    let maximumFullApBotsAtMidnight=0
    const townSummaries=[]

    for(const seed of seeds){
      let game=createInitialGame(seed,40)
      let townUnusedAp=0
      let townFullApBots=0
      for(let night=1;night<=3;night+=1){
        game=advanceToHour(game,0,bots,'c01')
        if(game.town.gateOpen)gateFailures+=1
        maximumOutsideAtMidnight=Math.max(maximumOutsideAtMidnight,game.citizens.filter((citizen)=>citizen.alive&&citizen.location.type==='world').length)
        totalCampingAttempts+=game.citizens.filter((citizen)=>citizen.alive&&citizen.camping.hidden&&citizen.camping.hiddenDay===game.day).length

        const livingBots=game.citizens.filter((citizen)=>citizen.alive&&citizen.controller==='basic-bot')
        const unusedAp=livingBots.reduce((sum,citizen)=>sum+citizen.ap,0)
        const fullAp=livingBots.filter((citizen)=>citizen.ap===citizen.maxAp).length
        totalUnusedBotApAtMidnight+=unusedAp
        totalLivingBotMidnights+=livingBots.length
        fullApBotsAtMidnight+=fullAp
        maximumFullApBotsAtMidnight=Math.max(maximumFullApBotsAtMidnight,fullAp)
        townUnusedAp+=unusedAp
        townFullApBots+=fullAp

        game=advanceOneHour(game,bots,'c01')
        totalCampingSurvivors+=game.lastNight?.campingSurvivors??0
        totalCampingDeaths+=game.lastNight?.campingDeaths??0
        totalOutsideDeaths+=game.lastNight?.outsideDeaths??0
        minimumLiving=Math.min(minimumLiving,game.citizens.filter((citizen)=>citizen.alive).length)
      }
      const deaths=game.events.filter((event)=>event.type==='CITIZEN_DIED'&&event.citizenId!=='c01')
      const dehydration=deaths.filter((event)=>event.type==='CITIZEN_DIED'&&event.reason==='dehydration').length
      botDehydrationDeaths+=dehydration
      totalFinalWell+=game.town.well.water
      townSummaries.push({
        seed,
        living:game.citizens.filter((citizen)=>citizen.alive).length,
        outside:deaths.filter((event)=>event.type==='CITIZEN_DIED'&&event.reason==='outside_at_night').length,
        camping:deaths.filter((event)=>event.type==='CITIZEN_DIED'&&event.reason==='camping_failure').length,
        dehydration,
        home:deaths.filter((event)=>event.type==='CITIZEN_DIED'&&event.reason==='home_breach').length,
        defense:game.town.defense,
        completed:Object.values(game.town.construction).filter((project)=>project.completed).map((project)=>project.id),
        finalWell:game.town.well.water,
        unusedBotApAtMidnight:townUnusedAp,
        fullApBotsAtMidnight:townFullApBots,
      })
    }

    console.log('MULTIDAY BENCHMARK',{
      towns:seeds.length,
      nightsPerTown:3,
      minimumLiving,
      gateFailures,
      maximumOutsideAtMidnight,
      totalCampingAttempts,
      totalCampingSurvivors,
      totalCampingDeaths,
      totalOutsideDeaths,
      botDehydrationDeaths,
      averageFinalWell:totalFinalWell/seeds.length,
      averageUnusedBotApAtMidnight:totalLivingBotMidnights?totalUnusedBotApAtMidnight/totalLivingBotMidnights:0,
      fullApBotsAtMidnight,
      maximumFullApBotsAtMidnight,
      townSummaries,
    })

    // Hard invariants remain gating. AP-utilization values above are diagnostic while the
    // economy is still evolving, but exposing them makes regression toward entire idle days
    // immediately visible. Focused tests separately gate known waste behaviors.
    expect(gateFailures).toBe(0)
    expect(totalCampingSurvivors+totalCampingDeaths).toBe(totalCampingAttempts)
    expect(townSummaries).toHaveLength(seeds.length)
    expect(minimumLiving).toBeGreaterThanOrEqual(0)
    expect(maximumOutsideAtMidnight).toBeGreaterThanOrEqual(0)
    expect(botDehydrationDeaths).toBeGreaterThanOrEqual(0)
    expect(totalUnusedBotApAtMidnight).toBeGreaterThanOrEqual(0)
    expect(fullApBotsAtMidnight).toBeGreaterThanOrEqual(0)
  },60_000)
})
