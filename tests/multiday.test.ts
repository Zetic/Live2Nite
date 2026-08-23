import { describe, expect, it } from 'vitest'
import { BasicBotController } from '../src/agents/BasicBotController'
import { createInitialGame } from '../src/core/game'
import { advanceOneHour, advanceToHour } from '../src/simulation/advanceTime'

const bots=new BasicBotController()

describe('multi-day town regression',()=>{
  it('keeps coordinated towns functioning across three full nights with camping available',()=>{
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
    const townSummaries=[]

    for(const seed of seeds){
      let game=createInitialGame(seed,40)
      for(let night=1;night<=3;night+=1){
        game=advanceToHour(game,0,bots,'c01')
        if(game.town.gateOpen)gateFailures+=1
        maximumOutsideAtMidnight=Math.max(maximumOutsideAtMidnight,game.citizens.filter((citizen)=>citizen.alive&&citizen.location.type==='world').length)
        totalCampingAttempts+=game.citizens.filter((citizen)=>citizen.alive&&citizen.camping.hidden&&citizen.camping.hiddenDay===game.day).length
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
      townSummaries,
    })

    expect(gateFailures).toBe(0)
    expect(botDehydrationDeaths).toBe(0)
    expect(maximumOutsideAtMidnight).toBeLessThanOrEqual(6)
    expect(totalCampingSurvivors+totalCampingDeaths).toBe(totalCampingAttempts)
    expect(minimumLiving).toBeGreaterThanOrEqual(10)
  },30_000)
})
