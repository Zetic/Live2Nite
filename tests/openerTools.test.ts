import { describe, expect, it } from 'vitest'
import { getLegalActions } from '../src/core/actions'
import { executeCommand } from '../src/core/commands'
import { createInitialGame } from '../src/core/game'
import { createItemInstance } from '../src/core/items'
import type { CombinationRecipeId, GameState, ItemType } from '../src/core/types'

function withInventory(items:ReturnType<typeof createItemInstance>[]):GameState{
  const game=createInitialGame(9201,1)
  return{...game,citizens:game.citizens.map((citizen)=>citizen.id==='c01'?{...citizen,inventory:items}:citizen)}
}

function combination(game:GameState,recipeId:CombinationRecipeId){
  const action=getLegalActions(game,'c01').find((candidate)=>candidate.type==='COMBINE_ITEMS'&&candidate.recipeId===recipeId)
  if(!action||action.type!=='COMBINE_ITEMS')throw new Error(`Missing combination ${recipeId}`)
  return action
}

describe('ordinary MyHordes opener tool repair chains',()=>{
  it('exposes Repair Kit recipes for every newly implemented broken opener tool',()=>{
    const cases:Array<[ItemType,ItemType,CombinationRecipeId]>=[
      ['broken_adjustable_spanner','adjustable_spanner','repair_adjustable_spanner'],
      ['broken_screwdriver','screwdriver','repair_screwdriver'],
      ['broken_swiss_army_knife','swiss_army_knife','repair_swiss_army_knife'],
      ['broken_box_cutter','box_cutter','repair_box_cutter'],
      ['broken_chain','chain','repair_chain'],
      ['broken_can_opener','can_opener','repair_can_opener'],
    ]
    for(const [brokenType,repairedType,recipeId] of cases){
      let game=withInventory([createItemInstance('broken-object',brokenType),createItemInstance('kit','repair_kit')])
      const beforeAp=game.citizens[0].ap
      game=executeCommand(game,combination(game,recipeId)).state
      expect(game.citizens[0].inventory.find((item)=>item.id==='broken-object')?.type,recipeId).toBe(repairedType)
      expect(game.citizens[0].inventory.find((item)=>item.id==='kit')?.state?.condition,recipeId).toBe('damaged')
      expect(game.citizens[0].ap,recipeId).toBe(beforeAp-1)
    }
  })

  it('lets Kwik-Fix repair a broken opener in place and consumes the fix',()=>{
    let game=withInventory([createItemInstance('cutter','broken_box_cutter'),createItemInstance('fix','kwik_fix')])
    game=executeCommand(game,combination(game,'kwik_fix_box_cutter')).state
    expect(game.citizens[0].inventory.find((item)=>item.id==='cutter')?.type).toBe('box_cutter')
    expect(game.citizens[0].inventory.some((item)=>item.id==='fix')).toBe(false)
  })
})