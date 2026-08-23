import { describe, expect, it } from 'vitest'
import { BasicBotController } from '../src/agents/BasicBotController'
import { normalCandidates } from '../src/agents/planning/AssignmentPolicy'
import { shouldUseRefill } from '../src/agents/planning/SupplyPolicy'
import { planTownMissionAssignments } from '../src/agents/planning/TownMissionPlanner'
import { createInitialGame } from '../src/core/game'
import type { GameState } from '../src/core/types'
import { runBotHour } from '../src/simulation/runBotHour'

const bots=new BasicBotController()

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

  it('spends repeated safe town AP in the late window instead of one AP per hour',()=>{
    const initial=createInitialGame(7105,2)
    const game:GameState={
      ...initial,
      day:2,
      clock:{hour:20,phase:'day'},
      town:{...initial.town,bank:{...initial.town.bank,twisted_plank:10,wrought_iron:8}},
      coordination:{commitments:[{
        id:'late-work',
        citizenId:'c02',
        kind:'construction',
        taskKey:'construction:workshop',
        label:'I will work on the Workshop.',
        reservedAp:0,
        day:2,
        hour:20,
        expiresHour:21,
        projectId:'workshop',
      }]},
    }
    const after=runBotHour(game,bots,'c01')
    const citizen=after.citizens.find((candidate)=>candidate.id==='c02')!
    expect(citizen.ap).toBe(0)
    expect(after.town.construction.workshop.apContributed).toBe(6)
  })
})
