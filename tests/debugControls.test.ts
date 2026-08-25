import { describe, expect, it } from 'vitest'
import { debugRefreshCitizen } from '../src/core/debug'
import { createInitialGame } from '../src/core/game'

describe('debug citizen refresh',()=>{
  it('restores maximum AP and Hydrated without clearing unrelated status',()=>{
    const game=createInitialGame(801,1)
    const damaged={
      ...game,
      citizens:game.citizens.map((citizen)=>citizen.id==='c01'?{
        ...citizen,
        ap:0,
        status:{...citizen.status,hydration:'dehydrated' as const,desertStepsToday:9,infected:true},
      }:citizen),
    }
    const refreshed=debugRefreshCitizen(damaged,'c01')
    const citizen=refreshed.citizens.find((candidate)=>candidate.id==='c01')!
    expect(citizen.ap).toBe(citizen.maxAp)
    expect(citizen.status.hydration).toBe('normal')
    expect(citizen.status.desertStepsToday).toBe(0)
    expect(citizen.status.infected).toBe(true)
  })

  it('does not revive or modify a dead citizen',()=>{
    const game=createInitialGame(802,1)
    const dead={...game,citizens:game.citizens.map((citizen)=>citizen.id==='c01'?{...citizen,alive:false,ap:0}:citizen)}
    expect(debugRefreshCitizen(dead,'c01')).toBe(dead)
  })
})
