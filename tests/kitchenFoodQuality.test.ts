import { describe, expect, it } from 'vitest'
import { getLegalActions } from '../src/core/actions'
import { executeCommand } from '../src/core/commands'
import { createInitialGame } from '../src/core/game'
import { createItemInstance } from '../src/core/items'
import type { GameState, ItemType } from '../src/core/types'

function withFood(type:ItemType,ap:number,wounded=false):GameState{
  const game=createInitialGame(9420,1)
  return{...game,citizens:[{...game.citizens[0],ap,status:{...game.citizens[0].status,wound:wounded?'foot':null},inventory:[createItemInstance('meal',type)]}]}
}
function eat(game:GameState):GameState{
  const action=getLegalActions(game,'c01').find((candidate)=>candidate.type==='EAT_ITEM'&&candidate.itemId==='meal')
  expect(action).toBeTruthy()
  return executeCommand(game,action!).state
}

describe('food AP quality targets',()=>{
  it('restores ordinary food to the normal maximum rather than adding six AP',()=>{
    const game=eat(withFood('vegetable',5))
    expect(game.citizens[0].ap).toBe(6)
    expect(game.citizens[0].maxAp).toBe(6)
  })

  it('restores good food to normal maximum +1 rather than adding seven AP',()=>{
    const game=eat(withFood('good_home_made_meal',5))
    expect(game.citizens[0].ap).toBe(7)
    expect(game.citizens[0].maxAp).toBe(6)
  })

  it('applies the wound penalty before the good-food +1 surplus',()=>{
    const game=eat(withFood('good_home_made_meal',0,true))
    expect(game.citizens[0].ap).toBe(6)
    expect(game.citizens[0].maxAp).toBe(6)
    expect(game.citizens[0].status.wound).toBe('foot')
  })

  it('keeps a citizen already above the ordinary target at the higher current AP',()=>{
    const game=eat(withFood('vegetable',7))
    expect(game.citizens[0].ap).toBe(7)
  })
})

describe('Burnt Marshmallows manual recipe',()=>{
  it('consumes Dried Marshmallows, retains the Torch, and creates good-quality Burnt Marshmallows for zero AP',()=>{
    let game=createInitialGame(9421,1)
    game={...game,citizens:[{...game.citizens[0],ap:4,inventory:[createItemInstance('marsh','dried_marshmallows'),createItemInstance('torch','torch')]}]}
    const action=getLegalActions(game,'c01').find((candidate)=>candidate.type==='COMBINE_ITEMS'&&candidate.recipeId==='toast_marshmallows')
    expect(action).toEqual({type:'COMBINE_ITEMS',citizenId:'c01',recipeId:'toast_marshmallows',itemIds:['marsh','torch']})
    game=executeCommand(game,action!).state
    expect(game.citizens[0].ap).toBe(4)
    expect(game.citizens[0].inventory.some((candidate)=>candidate.id==='marsh')).toBe(false)
    expect(game.citizens[0].inventory.some((candidate)=>candidate.id==='torch'&&candidate.type==='torch')).toBe(true)
    const burnt=game.citizens[0].inventory.find((candidate)=>candidate.type==='burnt_marshmallows')
    expect(burnt).toBeTruthy()

    game={...game,citizens:[{...game.citizens[0],ap:0,daily:{...game.citizens[0].daily,ate:false}}]}
    const eatBurnt=getLegalActions(game,'c01').find((candidate)=>candidate.type==='EAT_ITEM'&&candidate.itemId===burnt?.id)
    expect(eatBurnt).toBeTruthy()
    game=executeCommand(game,eatBurnt!).state
    expect(game.citizens[0].ap).toBe(7)
  })
})
