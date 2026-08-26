import { describe, expect, it } from 'vitest'
import { BasicBotController } from '../src/agents/BasicBotController'
import { getLegalActions } from '../src/core/actions'
import { executeCommand } from '../src/core/commands'
import { createInitialGame } from '../src/core/game'
import { equipCitizenProfession, hasProfession } from '../src/core/professions'
import { randomInt } from '../src/core/rng'
import { canSurvivalistForage, survivalistForageChancePercent } from '../src/core/survivalist'
import type { GameState } from '../src/core/types'
import { zoneKey } from '../src/core/world'

const bots=new BasicBotController()
function survivalistOutside(seed=201,x=3,y=0):GameState{
  const base=createInitialGame(seed,1)
  const key=zoneKey(x,y)
  return{
    ...base,
    town:{...base.town,gateOpen:true},
    world:{...base.world,zones:{...base.world.zones,[key]:{...base.world.zones[key],discovered:true,zombies:0}}},
    citizens:base.citizens.map((citizen)=>({...equipCitizenProfession(citizen,'survivalist'),location:{type:'world' as const,x,y}})),
  }
}
function withAp(game:GameState,ap:number):GameState{return{...game,citizens:game.citizens.map((citizen)=>({...citizen,ap}))}}
function rngStateForRollAbove(percent:number):number{for(let state=1;state<10000;state+=1)if(randomInt(state,1,100).value>percent)return state;throw new Error('No deterministic failure seed found')}

describe('Survivalist profession',()=>{
  it('derives profession identity from the locked Survival Manual equipment token',()=>{
    const game=survivalistOutside()
    expect(hasProfession(game.citizens[0],'survivalist')).toBe(true)
  })

  it('uses the exact source town-day forage probability table and devastated modifier',()=>{
    const cases:[[number,number],[number,number],[number,number],[number,number],[number,number],[number,number]]=[[1,100],[5,85],[10,80],[13,70],[15,60],[20,50]]
    for(const[day,expected]of cases){const game={...survivalistOutside(210+day),day};expect(survivalistForageChancePercent(game)).toBe(expected)}
    expect(survivalistForageChancePercent({...survivalistOutside(250),day:20,town:{...survivalistOutside(250).town,devastated:true}})).toBe(30)
  })

  it('requires radial distance 3 and shares one daily Manual use between food and water',()=>{
    const near=withAp(survivalistOutside(220,2,0),2)
    expect(canSurvivalistForage(near,near.citizens[0],'food')).toBe(false)
    let game=withAp(survivalistOutside(221,3,0),2)
    const types=getLegalActions(game,'c01').map((action)=>action.type)
    expect(types).toContain('SURVIVALIST_SEARCH_FOOD')
    expect(types).toContain('SURVIVALIST_SEARCH_WATER')
    const food=getLegalActions(game,'c01').find((action)=>action.type==='SURVIVALIST_SEARCH_FOOD')!
    game=executeCommand(game,food).state
    expect(game.citizens[0].daily.survivalManualUsed).toBe(true)
    expect(getLegalActions(game,'c01').some((action)=>action.type==='SURVIVALIST_SEARCH_WATER')).toBe(false)
  })

  it('consumes the Manual use even when the forage roll fails',()=>{
    let game={...withAp(survivalistOutside(230),2),day:20,rngState:rngStateForRollAbove(50)}
    const food=getLegalActions(game,'c01').find((action)=>action.type==='SURVIVALIST_SEARCH_FOOD')!
    const result=executeCommand(game,food)
    const event=result.events.find((candidate)=>candidate.type==='SURVIVALIST_FORAGE_RESOLVED')!
    expect(event.success).toBe(false)
    expect(result.state.citizens[0].daily.survivalManualUsed).toBe(true)
    expect(result.state.citizens[0].daily.ate).toBe(false)
  })

  it('successful food forage restores ordinary AP directly without creating an inventory item',()=>{
    let game=survivalistOutside(240)
    game={...game,citizens:game.citizens.map((citizen)=>({...citizen,ap:1,inventory:[]}))}
    const beforeNextItem=game.nextItemId
    const food=getLegalActions(game,'c01').find((action)=>action.type==='SURVIVALIST_SEARCH_FOOD')!
    game=executeCommand(game,food).state
    expect(game.citizens[0].ap).toBe(6)
    expect(game.citizens[0].daily.ate).toBe(true)
    expect(game.citizens[0].inventory).toEqual([])
    expect(game.nextItemId).toBe(beforeNextItem)
  })

  it('successful water forage restores AP when normal or thirsty and unused for the day',()=>{
    let game=survivalistOutside(241)
    game={...game,citizens:game.citizens.map((citizen)=>({...citizen,ap:1,status:{...citizen.status,hydration:'thirsty' as const,desertStepsToday:5}}))}
    const water=getLegalActions(game,'c01').find((action)=>action.type==='SURVIVALIST_SEARCH_WATER')!
    game=executeCommand(game,water).state
    const citizen=game.citizens[0]
    expect(citizen.status.hydration).toBe('normal')
    expect(citizen.status.desertStepsToday).toBe(0)
    expect(citizen.daily.drank).toBe(true)
    expect(citizen.ap).toBe(6)
  })

  it('successful water forage only eases Dehydrated to Thirsty and gives no AP',()=>{
    let game=survivalistOutside(242)
    game={...game,citizens:game.citizens.map((citizen)=>({...citizen,ap:1,status:{...citizen.status,hydration:'dehydrated' as const,desertStepsToday:8}}))}
    const water=getLegalActions(game,'c01').find((action)=>action.type==='SURVIVALIST_SEARCH_WATER')!
    game=executeCommand(game,water).state
    const citizen=game.citizens[0]
    expect(citizen.status.hydration).toBe('thirsty')
    expect(citizen.status.desertStepsToday).toBe(0)
    expect(citizen.daily.drank).toBe(false)
    expect(citizen.ap).toBe(1)
  })

  it('does not offer food forage at full AP or after the daily food refresh',()=>{
    let game=survivalistOutside(243)
    expect(getLegalActions(game,'c01').some((action)=>action.type==='SURVIVALIST_SEARCH_FOOD')).toBe(false)
    game={...game,citizens:game.citizens.map((citizen)=>({...citizen,ap:2,daily:{...citizen.daily,ate:true}}))}
    expect(getLegalActions(game,'c01').some((action)=>action.type==='SURVIVALIST_SEARCH_FOOD')).toBe(false)
  })

  it('lets an autonomous Survivalist use the Manual as emergency field endurance',()=>{
    let game=survivalistOutside(244)
    game={...game,citizens:game.citizens.map((citizen)=>({...citizen,ap:1}))}
    const command=bots.decide(game,'c01')
    expect(command?.type).toBe('SURVIVALIST_SEARCH_FOOD')
  })
})
