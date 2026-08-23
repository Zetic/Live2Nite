import { describe, expect, it } from 'vitest'
import { stackBankItems } from '../src/core/bank'
import { getLegalActions } from '../src/core/actions'
import { executeCommand } from '../src/core/commands'
import { createInitialGame } from '../src/core/game'
import { createItemInstance, normalizeItemState } from '../src/core/items'
import { itemMatchesRequirement, itemRequirementsMet } from '../src/core/itemRecipes'

describe('schema v16 stateful item economy',()=>{
  it('creates canonical default state and clamps charge-bearing item state',()=>{
    expect(createItemInstance('pistol-default','water_pistol').state).toEqual({charges:3})
    expect(createItemInstance('pistol-over','water_pistol',{charges:99}).state).toEqual({charges:3})
    expect(createItemInstance('pistol-under','water_pistol',{charges:-4}).state).toEqual({charges:0})
    expect(createItemInstance('water','water_ration').state).toEqual({contamination:'clean'})
    expect(normalizeItemState('repair_kit',undefined)).toEqual({condition:'intact'})
  })

  it('stacks Bank objects only when both item type and persistent state match',()=>{
    const stacks=stackBankItems([
      createItemInstance('full-a','water_pistol',{charges:3}),
      createItemInstance('full-b','water_pistol',{charges:3}),
      createItemInstance('partial','water_pistol',{charges:1}),
      createItemInstance('empty','water_pistol',{charges:0}),
    ])
    expect(stacks).toHaveLength(3)
    expect(stacks.find((stack)=>stack.state.charges===3)?.count).toBe(2)
    expect(stacks.find((stack)=>stack.state.charges===1)?.count).toBe(1)
    expect(stacks.find((stack)=>stack.state.charges===0)?.count).toBe(1)
  })

  it('preserves exact object identity and state through Bank deposit and withdrawal',()=>{
    const object=createItemInstance('persistent-pistol','water_pistol',{charges:1})
    let game=createInitialGame(2601,1)
    game={...game,citizens:game.citizens.map((citizen)=>({...citizen,inventory:[object]}))}
    const nextItemIdBefore=game.nextItemId
    const deposit=getLegalActions(game,'c01').find((action)=>action.type==='DEPOSIT_ITEM'&&action.itemId===object.id)
    expect(deposit).toBeTruthy()
    game=executeCommand(game,deposit!).state
    expect(game.town.bank).toContainEqual(object)
    expect(game.citizens[0].inventory).toHaveLength(0)
    expect(game.nextItemId).toBe(nextItemIdBefore)

    const withdraw=getLegalActions(game,'c01').find((action)=>action.type==='WITHDRAW_BANK_ITEM'&&action.itemId===object.id)
    expect(withdraw).toBeTruthy()
    game=executeCommand(game,withdraw!).state
    expect(game.town.bank).toHaveLength(0)
    expect(game.citizens[0].inventory).toContainEqual(object)
    expect(game.citizens[0].inventory[0].id).toBe('persistent-pistol')
    expect(game.citizens[0].inventory[0].state).toEqual({charges:1})
    expect(game.nextItemId).toBe(nextItemIdBefore)
  })

  it('supports state-constrained recipe requirements without confusing similar objects',()=>{
    const empty=createItemInstance('empty','water_pistol',{charges:0})
    const loaded=createItemInstance('loaded','water_pistol',{charges:2})
    const emptyRequirement={type:'water_pistol' as const,count:1,state:{charges:0}}
    expect(itemMatchesRequirement(empty,emptyRequirement)).toBe(true)
    expect(itemMatchesRequirement(loaded,emptyRequirement)).toBe(false)
    expect(itemRequirementsMet([loaded],[emptyRequirement])).toBe(false)
    expect(itemRequirementsMet([loaded,empty],[emptyRequirement])).toBe(true)
  })

  it('initializes new-game starter objects through canonical item normalization',()=>{
    const game=createInitialGame(2602,2)
    expect(game.schemaVersion).toBe(16)
    expect(game.citizens.flatMap((citizen)=>citizen.home.storage).every((item)=>item.state!==undefined)).toBe(true)
  })
})
