import { describe, expect, it } from 'vitest'
import { getLegalActions } from '../src/core/actions'
import { executeCommand } from '../src/core/commands'
import { createInitialGame } from '../src/core/game'
import { createItemInstance } from '../src/core/items'
import type { GameState, ItemType } from '../src/core/types'

function withCan(opener?:ItemType):GameState{
  const game=createInitialGame(4101,1)
  const inventory=[createItemInstance('source-can','can')]
  if(opener)inventory.push(createItemInstance('source-opener',opener))
  return{...game,citizens:[{...game.citizens[0],ap:0,inventory}]}
}

function openCan(game:GameState){
  return getLegalActions(game,'c01').find((action)=>action.type==='OPEN_CONTAINER'&&action.itemId==='source-can')
}

describe('source Can opening chain',()=>{
  it('requires one of the implemented MyHordes main opener tools',()=>{
    expect(openCan(withCan())).toBeUndefined()
    expect(openCan(withCan('human_bone'))).toBeUndefined()
    for(const opener of ['can_opener','screwdriver','swiss_army_knife'] as const){
      expect(openCan(withCan(opener)),`${opener} should open a Can`).toBeDefined()
    }
  })

  it('morphs Can into Open Can without consuming the opener, changing identity, spending AP, or advancing RNG',()=>{
    let game=withCan('can_opener')
    const beforeRng=game.rngState
    const beforeNext=game.nextItemId
    const action=openCan(game)
    expect(action).toBeDefined()
    game=executeCommand(game,action!).state
    const opened=game.citizens[0].inventory.find((item)=>item.id==='source-can')
    expect(opened?.type).toBe('open_can')
    expect(game.citizens[0].inventory.some((item)=>item.id==='source-opener'&&item.type==='can_opener')).toBe(true)
    expect(game.citizens[0].ap).toBe(0)
    expect(game.rngState).toBe(beforeRng)
    expect(game.nextItemId).toBe(beforeNext)
  })

  it('makes the Open Can ordinary 6 AP food and consumes it when eaten',()=>{
    let game=withCan('screwdriver')
    game=executeCommand(game,openCan(game)!).state
    const eat=getLegalActions(game,'c01').find((action)=>action.type==='EAT_ITEM'&&action.itemId==='source-can')
    expect(eat).toBeDefined()
    game=executeCommand(game,eat!).state
    const citizen=game.citizens[0]
    expect(citizen.inventory.some((item)=>item.id==='source-can')).toBe(false)
    expect(citizen.inventory.some((item)=>item.id==='source-opener')).toBe(true)
    expect(citizen.ap).toBe(citizen.maxAp)
    expect(citizen.daily.ate).toBe(true)
  })
})
