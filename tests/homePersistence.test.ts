import { describe, expect, it } from 'vitest'
import { createInitialGame } from '../src/core/game'
import { migrateStoredGame } from '../src/persistence/IndexedDbGameRepository'
import type { Citizen, GameState } from '../src/core/types'

function updateCitizen(game:GameState,citizenId:string,update:(citizen:Citizen)=>Citizen):GameState{return{...game,citizens:game.citizens.map((citizen)=>citizen.id===citizenId?update(citizen):citizen)}}

describe('home persistence migration',()=>{
  it('preserves all installed home works when reloading current-schema saves',()=>{
    let game=createInitialGame(5301,1)
    game=updateCitizen(game,'c01',(citizen)=>({...citizen,home:{...citizen.home,improvements:{reinforcements:3,fence:1,storage:4,alarm:1,curtain:1,lock:1,siesta:2,kitchen:3,laboratory:4}}}))
    const loaded=migrateStoredGame(game as unknown as Record<string,unknown>)
    expect(loaded?.citizens[0].home.improvements).toEqual({reinforcements:3,fence:1,storage:4,alarm:1,curtain:1,lock:1,siesta:2,kitchen:3,laboratory:4})
  })

  it('defaults newly introduced work levels to zero for older saves',()=>{
    let game=createInitialGame(5302,1)
    game=updateCitizen(game,'c01',(citizen)=>({...citizen,home:{...citizen.home,improvements:{reinforcements:2,fence:1,storage:3}}}))
    const loaded=migrateStoredGame(game as unknown as Record<string,unknown>)
    expect(loaded?.citizens[0].home.improvements).toEqual({reinforcements:2,fence:1,storage:3,alarm:0,curtain:0,lock:0,siesta:0,kitchen:0,laboratory:0})
  })
})
