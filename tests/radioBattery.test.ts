import { describe, expect, it } from 'vitest'
import { getLegalActions } from '../src/core/actions'
import { executeCommand } from '../src/core/commands'
import { createInitialGame } from '../src/core/game'
import { createItemInstance } from '../src/core/items'
import type { GameState } from '../src/core/types'

function withInventory():GameState{
  const game=createInitialGame(9301,1)
  return{...game,citizens:[{...game.citizens[0],inventory:[
    createItemInstance('radio','radio_cassette_player_off'),
    createItemInstance('battery','battery'),
  ]}]}
}

describe('MyHordes Radio Cassette Player battery action',()=>{
  it('consumes one Battery and morphs the same physical radio into a Working Radio for 0 AP',()=>{
    let game=withInventory()
    const beforeAp=game.citizens[0].ap
    const action=getLegalActions(game,'c01').find((candidate)=>candidate.type==='COMBINE_ITEMS'&&candidate.recipeId==='load_radio_battery')
    expect(action).toBeDefined()
    if(!action||action.type!=='COMBINE_ITEMS')throw new Error('Missing radio battery action')
    game=executeCommand(game,action).state
    expect(game.citizens[0].ap).toBe(beforeAp)
    expect(game.citizens[0].inventory.find((item)=>item.id==='radio')?.type).toBe('working_radio')
    expect(game.citizens[0].inventory.some((item)=>item.id==='battery')).toBe(false)
    expect(game.nextItemId).toBe(withInventory().nextItemId)
  })

  it('does not offer the action without a Battery',()=>{
    const game=createInitialGame(9301,1)
    const state:GameState={...game,citizens:[{...game.citizens[0],inventory:[createItemInstance('radio','radio_cassette_player_off')]}]}
    expect(getLegalActions(state,'c01').some((candidate)=>candidate.type==='COMBINE_ITEMS'&&candidate.recipeId==='load_radio_battery')).toBe(false)
  })
})
