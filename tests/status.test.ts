import { describe, expect, it } from 'vitest'
import { BasicBotController } from '../src/agents/BasicBotController'
import { getLegalActions } from '../src/core/actions'
import { executeCommand } from '../src/core/commands'
import { createInitialGame, resolveNight } from '../src/core/game'
import { DESERT_STEPS_PER_HYDRATION_STAGE, travelHydrationTransition, waterConsumptionOutcome } from '../src/core/status'
import type { GameState } from '../src/core/types'

const bots = new BasicBotController()

function withCitizen(game:GameState,id:string,patch:Partial<GameState['citizens'][number]>):GameState{
  return {...game,citizens:game.citizens.map((citizen)=>citizen.id===id?{...citizen,...patch}:citizen)}
}

describe('citizen hydration status',()=>{
  it('starts schema v14 citizens hydrated with no desert travel debt',()=>{
    const game=createInitialGame(123,2)
    expect(game.schemaVersion).toBe(14)
    expect(game.citizens.every((citizen)=>citizen.status.hydration==='normal'&&citizen.status.desertStepsToday===0)).toBe(true)
  })

  it('becomes Thirsty on the eleventh desert movement and Dehydrated after another eleven',()=>{
    const game=createInitialGame(123,1)
    const citizen={...game.citizens[0],status:{hydration:'normal' as const,desertStepsToday:DESERT_STEPS_PER_HYDRATION_STAGE-1}}
    expect(travelHydrationTransition(citizen)).toEqual({hydration:'thirsty',desertStepsToday:0})
    const thirsty={...citizen,status:{hydration:'thirsty' as const,desertStepsToday:DESERT_STEPS_PER_HYDRATION_STAGE-1}}
    expect(travelHydrationTransition(thirsty)).toEqual({hydration:'dehydrated',desertStepsToday:0})
  })

  it('makes a citizen Thirsty after a day without water',()=>{
    let game=createInitialGame(500,1)
    game=resolveNight(game)
    expect(game.citizens[0].alive).toBe(true)
    expect(game.citizens[0].status.hydration).toBe('thirsty')
  })

  it('worsens a Thirsty citizen to Dehydrated at midnight even if water was used earlier that day',()=>{
    let game=createInitialGame(501,1)
    game=withCitizen(game,'c01',{daily:{ate:false,drank:true,waterTaken:true},status:{hydration:'thirsty',desertStepsToday:3}})
    game=resolveNight(game)
    expect(game.citizens[0].alive).toBe(true)
    expect(game.citizens[0].status).toEqual({hydration:'dehydrated',desertStepsToday:0})
  })

  it('kills an untreated Dehydrated citizen at midnight',()=>{
    let game=createInitialGame(502,1)
    game=withCitizen(game,'c01',{status:{hydration:'dehydrated',desertStepsToday:0}})
    game=resolveNight(game)
    expect(game.citizens[0].alive).toBe(false)
    expect(game.lastNight?.dehydrationDeaths).toBe(1)
    expect(game.events.some((event)=>event.type==='CITIZEN_DIED'&&event.citizenId==='c01'&&event.reason==='dehydration')).toBe(true)
  })

  it('uses water to reduce Dehydrated to Thirsty without restoring AP',()=>{
    let game=createInitialGame(503,1)
    game=withCitizen(game,'c01',{ap:0,status:{hydration:'dehydrated',desertStepsToday:4},inventory:[{id:'water',type:'water_ration'}]})
    const outcome=waterConsumptionOutcome(game.citizens[0])
    expect(outcome.restoresAp).toBe(false)
    const drink=getLegalActions(game,'c01').find((action)=>action.type==='DRINK_ITEM')!
    game=executeCommand(game,drink).state
    expect(game.citizens[0].ap).toBe(0)
    expect(game.citizens[0].status).toEqual({hydration:'thirsty',desertStepsToday:0})
  })

  it('allows another water ration to treat later thirst after the daily AP refresh has already been used',()=>{
    let game=createInitialGame(504,1)
    game=withCitizen(game,'c01',{ap:2,daily:{ate:false,drank:true,waterTaken:true},status:{hydration:'thirsty',desertStepsToday:0},inventory:[{id:'water',type:'water_ration'}]})
    const drink=getLegalActions(game,'c01').find((action)=>action.type==='DRINK_ITEM')
    expect(drink).toBeTruthy()
    game=executeCommand(game,drink!).state
    expect(game.citizens[0].ap).toBe(2)
    expect(game.citizens[0].status.hydration).toBe('normal')
  })

  it('makes a thirsty town bot seek and drink water before ordinary work',()=>{
    let game=createInitialGame(505,2)
    game=withCitizen(game,'c02',{status:{hydration:'thirsty',desertStepsToday:0}})
    const first=bots.decide(game,'c02')
    expect(first?.type).toBe('TAKE_WATER')
    game=executeCommand(game,first!).state
    const second=bots.decide(game,'c02')
    expect(second?.type).toBe('DRINK_ITEM')
    game=executeCommand(game,second!).state
    expect(game.citizens[1].status.hydration).toBe('normal')
  })
})
