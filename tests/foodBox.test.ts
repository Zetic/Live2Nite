import { describe, expect, it } from 'vitest'
import { getLegalActions } from '../src/core/actions'
import { executeCommand } from '../src/core/commands'
import { createInitialGame } from '../src/core/game'
import { createItemInstance, NORMAL_SCAVENGE_LOOT_POOL } from '../src/core/items'
import { OPENABLES } from '../src/core/openables'
import type { GameCommand, GameState, ItemInstance } from '../src/core/types'

function withInventory(items:ItemInstance[],seed=9301):GameState{
  const game=createInitialGame(seed,1)
  return{...game,nextItemId:100,citizens:[{...game.citizens[0],inventory:items}]}
}

function openAction(game:GameState,itemId:string):Extract<GameCommand,{type:'OPEN_CONTAINER'}>|undefined{
  return getLegalActions(game,'c01').find((action):action is Extract<GameCommand,{type:'OPEN_CONTAINER'}>=>action.type==='OPEN_CONTAINER'&&action.itemId===itemId)
}

describe('MyHordes Food Box',()=>{
  it('keeps the exact ws016 output weights',()=>{
    const table=OPENABLES.food_box?.outputTable
    expect(table?.source).toBe('MYHORDES_CURRENT')
    expect(table?.entries.map((entry)=>[entry.items[0]?.type,entry.weight])).toEqual([
      ['doggy_bag',8],
      ['can',11],
      ['tasty_looking_steak',7],
      ['human_flesh',13],
      ['vegetable',8],
    ])
  })

  it('uses the reusable melee opener family and consumes only the Food Box',()=>{
    const box=createItemInstance('food-box','food_box')
    expect(openAction(withInventory([box]),'food-box')).toBeUndefined()

    let game=withInventory([box,createItemInstance('opener','staff')])
    const action=openAction(game,'food-box')
    expect(action).toBeDefined()
    game=executeCommand(game,action!).state

    expect(game.citizens[0].inventory.some((item)=>item.id==='food-box')).toBe(false)
    expect(game.citizens[0].inventory.some((item)=>item.id==='opener'&&item.type==='staff')).toBe(true)
    const output=game.citizens[0].inventory.find((item)=>item.id!=='opener')
    expect(['doggy_bag','can','tasty_looking_steak','human_flesh','vegetable']).toContain(output?.type)
  })

  it('does not activate Food Box in the transitional normal scavenging pool before Human Flesh ghoul mechanics close',()=>{
    expect(NORMAL_SCAVENGE_LOOT_POOL).not.toContain('food_box')
  })
})
