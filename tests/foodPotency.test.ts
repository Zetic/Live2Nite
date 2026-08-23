import { describe, expect, it } from 'vitest'
import { getLegalActions } from '../src/core/actions'
import { executeCommand } from '../src/core/commands'
import { applyEvents } from '../src/core/events'
import { createInitialGame } from '../src/core/game'
import { createItemInstance } from '../src/core/items'
import type { GameState, ItemType } from '../src/core/types'

function withFood(type:ItemType,ap=0):GameState{
  const game=createInitialGame(4201,1)
  return{...game,citizens:[{...game.citizens[0],ap,inventory:[createItemInstance('meal',type)]}]}
}

function eat(game:GameState):GameState{
  const action=getLegalActions(game,'c01').find((candidate)=>candidate.type==='EAT_ITEM'&&candidate.itemId==='meal')
  if(!action)throw new Error('Expected EAT_ITEM')
  return executeCommand(game,action).state
}

describe('source food AP targets',()=>{
  it('keeps ordinary Vegetable on the 6 AP food target',()=>{
    const game=eat(withFood('vegetable'))
    expect(game.citizens[0].ap).toBe(6)
    expect(game.citizens[0].maxAp).toBe(6)
    expect(game.citizens[0].daily.ate).toBe(true)
    expect(game.citizens[0].inventory).toHaveLength(0)
  })

  it('lets Tasty-looking Steak use its source 7 AP food action without changing max AP',()=>{
    const game=eat(withFood('tasty_looking_steak'))
    expect(game.citizens[0].ap).toBe(7)
    expect(game.citizens[0].maxAp).toBe(6)
    expect(game.citizens[0].daily.ate).toBe(true)
    expect(game.citizens[0].inventory).toHaveLength(0)
  })

  it('resets a temporary 7 AP food surplus to the normal daily max on the next day',()=>{
    let game=eat(withFood('tasty_looking_steak'))
    expect(game.citizens[0].ap).toBe(7)
    game=applyEvents(game,[{type:'DAY_STARTED',day:2,hour:1}])
    expect(game.citizens[0].ap).toBe(6)
    expect(game.citizens[0].daily.ate).toBe(false)
  })
})
