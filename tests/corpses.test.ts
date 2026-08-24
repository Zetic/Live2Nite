import { describe, expect, it } from 'vitest'
import { getLegalActions } from '../src/core/actions'
import { executeCommand } from '../src/core/commands'
import { applyEvents } from '../src/core/events'
import { createInitialGame, resolveNight } from '../src/core/game'
import { createItemInstance } from '../src/core/items'
import type { GameState } from '../src/core/types'

function killInTown(game:GameState,citizenId:string):GameState {
  return applyEvents(game,[{type:'CITIZEN_DIED',day:game.day,hour:game.clock.hour,citizenId,reason:'infection'}])
}

describe('Citizen corpses and home visits',()=>{
  it('keeps an in-town death as a body at the dead citizen home',()=>{
    let game=createInitialGame(101,3)
    game={...game,citizens:game.citizens.map((citizen)=>citizen.id==='c02'?{...citizen,inventory:[createItemInstance('carried-food','food')]}:citizen)}
    game=killInTown(game,'c02')
    const dead=game.citizens.find((citizen)=>citizen.id==='c02')!
    expect(dead.alive).toBe(false)
    expect(dead.home.holdsBody).toBe(true)
    expect(dead.home.corpseAttacked).toBe(false)
    expect(dead.corpseDisposition).toBeNull()
    expect(dead.inventory).toHaveLength(0)
    expect(dead.home.storage.some((item)=>item.id==='carried-food')).toBe(true)
  })

  it('does not create a home corpse for a citizen who dies outside',()=>{
    let game=createInitialGame(102,2)
    game={...game,citizens:game.citizens.map((citizen)=>citizen.id==='c02'?{...citizen,location:{type:'world',x:1,y:0}}:citizen)}
    game=applyEvents(game,[{type:'CITIZEN_DIED',day:game.day,hour:game.clock.hour,citizenId:'c02',reason:'outside_at_night'}])
    expect(game.citizens.find((citizen)=>citizen.id==='c02')?.home.holdsBody).toBe(false)
  })

  it('allows another in-town citizen to drag a corpse outside for 2 AP',()=>{
    let game=killInTown(createInitialGame(103,3),'c02')
    const action=getLegalActions(game,'c01').find((candidate)=>candidate.type==='DISPOSE_CORPSE_OUTSIDE'&&candidate.targetCitizenId==='c02')
    expect(action).toBeTruthy()
    game=executeCommand(game,action!).state
    const dead=game.citizens.find((citizen)=>citizen.id==='c02')!
    expect(game.citizens.find((citizen)=>citizen.id==='c01')?.ap).toBe(4)
    expect(dead.home.holdsBody).toBe(false)
    expect(dead.corpseDisposition).toBe('dragged_out')
  })

  it('allows corpse destruction with one personal Water Ration',()=>{
    let game=killInTown(createInitialGame(104,3),'c02')
    game={...game,citizens:game.citizens.map((citizen)=>citizen.id==='c01'?{...citizen,inventory:[createItemInstance('corpse-water','water_ration')]}:citizen)}
    const action=getLegalActions(game,'c01').find((candidate)=>candidate.type==='DISPOSE_CORPSE_WATER'&&candidate.targetCitizenId==='c02')
    expect(action).toBeTruthy()
    game=executeCommand(game,action!).state
    const actor=game.citizens.find((citizen)=>citizen.id==='c01')!
    const dead=game.citizens.find((citizen)=>citizen.id==='c02')!
    expect(actor.inventory.some((item)=>item.id==='corpse-water')).toBe(false)
    expect(dead.home.holdsBody).toBe(false)
    expect(dead.corpseDisposition).toBe('watered')
  })

  it('makes an undisposed corpse attack a living citizen when the Well is empty',()=>{
    let game=killInTown(createInitialGame(105,3),'c02')
    game={...game,town:{...game.town,well:{water:0}}}
    game=resolveNight(game)
    const corpse=game.citizens.find((citizen)=>citizen.id==='c02')!
    const corpseDeaths=game.events.filter((event)=>event.type==='CITIZEN_DIED'&&event.day===1&&event.reason==='corpse_attack')
    expect(corpse.home.corpseAttacked).toBe(true)
    expect(game.lastNight?.corpseReanimations).toBe(1)
    expect(game.lastNight?.corpseAttackDeaths).toBe(1)
    expect(game.lastNight?.corpseWaterLost).toBe(0)
    expect(corpseDeaths).toHaveLength(1)
  })

  it('can lose up to 20 Well water to an undisposed corpse',()=>{
    let found:GameState|null=null
    for(let seed=1;seed<=100&&!found;seed+=1){
      let candidate=killInTown(createInitialGame(seed,3),'c02')
      candidate={...candidate,town:{...candidate.town,well:{water:100}}}
      candidate=resolveNight(candidate)
      if((candidate.lastNight?.corpseWaterLost??0)>0)found=candidate
    }
    expect(found).not.toBeNull()
    expect(found?.lastNight?.corpseReanimations).toBe(1)
    expect(found?.lastNight?.corpseWaterLost).toBe(20)
    expect(found?.town.well.water).toBe(80)
  })

  it('disposal removes the corpse from the next internal attack stage',()=>{
    let game=killInTown(createInitialGame(106,3),'c02')
    const action=getLegalActions(game,'c01').find((candidate)=>candidate.type==='DISPOSE_CORPSE_OUTSIDE'&&candidate.targetCitizenId==='c02')!
    game=executeCommand(game,action).state
    game={...game,town:{...game.town,well:{water:0}}}
    game=resolveNight(game)
    expect(game.lastNight?.corpseReanimations).toBe(0)
    expect(game.lastNight?.corpseAttackDeaths).toBe(0)
  })
})
