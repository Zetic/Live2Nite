import { describe, expect, it } from 'vitest'
import { normalCandidates } from '../src/agents/planning/AssignmentPolicy'
import { shouldUseRefill } from '../src/agents/planning/SupplyPolicy'
import { planTownMissionAssignments } from '../src/agents/planning/TownMissionPlanner'
import { createInitialGame } from '../src/core/game'
import type { GameState } from '../src/core/types'

function patchCitizen(game:GameState,id:string,patch:Partial<GameState['citizens'][number]>):GameState{
  return {...game,citizens:game.citizens.map((citizen)=>citizen.id===id?{...citizen,...patch}:citizen)}
}

describe('bot AP utilization discipline',()=>{
  it('keeps Thirsty citizens eligible for ordinary field volunteering but excludes Dehydrated citizens',()=>{
    let game=createInitialGame(7101,8)
    game=patchCitizen(game,'c02',{status:{hydration:'thirsty',desertStepsToday:0}})
    expect(normalCandidates(game,'c01').some((citizen)=>citizen.id==='c02')).toBe(true)

    game=patchCitizen(game,'c02',{status:{hydration:'dehydrated',desertStepsToday:0}})
    expect(normalCandidates(game,'c01').some((citizen)=>citizen.id==='c02')).toBe(false)
  })

  it('does not consume a water AP refill for ordinary Thirst while current AP remains plentiful',()=>{
    let game=createInitialGame(7102,2)
    game=patchCitizen(game,'c02',{
      status:{hydration:'thirsty',desertStepsToday:0},
      inventory:[{id:'water',type:'water_ration'}],
    })
    const full=game.citizens.find((citizen)=>citizen.id==='c02')!
    expect(full.ap).toBe(full.maxAp)
    expect(shouldUseRefill(full,8,'water')).toBe(false)

    game=patchCitizen(game,'c02',{ap:1,status:{hydration:'thirsty',desertStepsToday:0}})
    const low=game.citizens.find((citizen)=>citizen.id==='c02')!
    expect(shouldUseRefill(low,8,'water')).toBe(true)
  })

  it('still treats Dehydration immediately even when AP is full',()=>{
    let game=createInitialGame(7103,2)
    game=patchCitizen(game,'c02',{
      status:{hydration:'dehydrated',desertStepsToday:0},
      inventory:[{id:'water',type:'water_ration'}],
    })
    const citizen=game.citizens.find((candidate)=>candidate.id==='c02')!
    expect(citizen.ap).toBe(citizen.maxAp)
    expect(shouldUseRefill(citizen,1,'water')).toBe(true)
  })

  it('mobilizes multiple high-AP volunteers on a later day instead of settling at the mature scout minimum',()=>{
    const initial=createInitialGame(7104,40)
    const game:GameState={...initial,day:3,clock:{hour:10,phase:'day'}}
    const assignments=planTownMissionAssignments(game,'c01')
      .filter((event)=>event.type==='BOT_MISSION_ASSIGNED')
    expect(assignments.length).toBeGreaterThanOrEqual(4)
  })
})
