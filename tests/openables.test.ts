import { describe, expect, it } from 'vitest'
import { getLegalActions } from '../src/core/actions'
import { executeCommand } from '../src/core/commands'
import { createInitialGame } from '../src/core/game'
import { createItemInstance, normalizeItemState } from '../src/core/items'
import { OPENABLES } from '../src/core/openables'
import type { GameCommand, GameState, ItemInstance, ItemType } from '../src/core/types'

function withInventory(items:ItemInstance[],seed=9101):GameState{
  const game=createInitialGame(seed,1)
  return{...game,nextItemId:100,citizens:[{...game.citizens[0],inventory:items}]}
}

function openAction(game:GameState,itemId:string):Extract<GameCommand,{type:'OPEN_CONTAINER'}>|undefined{
  return getLegalActions(game,'c01').find((action):action is Extract<GameCommand,{type:'OPEN_CONTAINER'}>=>action.type==='OPEN_CONTAINER'&&action.itemId===itemId)
}

describe('source-backed openables',()=>{
  it('counts a three-use Resource Pack down on the same physical item before consuming it',()=>{
    let game=withInventory([createItemInstance('pack','resource_pack',{contents:3})])
    const originalRng=game.rngState

    let action=openAction(game,'pack')
    expect(action).toBeDefined()
    game=executeCommand(game,action!).state
    let pack=game.citizens[0].inventory.find((item)=>item.id==='pack')
    expect(pack?.type).toBe('resource_pack')
    expect(normalizeItemState('resource_pack',pack?.state).contents).toBe(2)
    expect(game.citizens[0].inventory).toHaveLength(2)
    expect(game.rngState).not.toBe(originalRng)

    action=openAction(game,'pack')
    expect(action).toBeDefined()
    game=executeCommand(game,action!).state
    pack=game.citizens[0].inventory.find((item)=>item.id==='pack')
    expect(normalizeItemState('resource_pack',pack?.state).contents).toBe(1)
    expect(game.citizens[0].inventory).toHaveLength(3)

    action=openAction(game,'pack')
    expect(action).toBeDefined()
    game=executeCommand(game,action!).state
    expect(game.citizens[0].inventory.some((item)=>item.id==='pack')).toBe(false)
    expect(game.citizens[0].inventory).toHaveLength(3)
    expect(game.citizens[0].inventory.every((item)=>['twisted_plank','wrought_iron'].includes(item.type))).toBe(true)
    expect(new Set(game.citizens[0].inventory.map((item)=>item.id)).size).toBe(3)
  })

  it('requires a free slot while a Resource Pack remains, but final opening can reuse its slot',()=>{
    const fillers=[createItemInstance('f1','twisted_plank'),createItemInstance('f2','wrought_iron'),createItemInstance('f3','battery')]
    const retained=withInventory([createItemInstance('pack','resource_pack',{contents:2}),...fillers])
    expect(retained.citizens[0].inventory).toHaveLength(retained.citizens[0].inventoryCapacity)
    expect(openAction(retained,'pack')).toBeUndefined()

    const final=withInventory([createItemInstance('pack','resource_pack',{contents:1}),...fillers])
    expect(openAction(final,'pack')).toBeDefined()
    const resolved=executeCommand(final,openAction(final,'pack')!).state
    expect(resolved.citizens[0].inventory).toHaveLength(final.citizens[0].inventoryCapacity)
    expect(resolved.citizens[0].inventory.some((item)=>item.id==='pack')).toBe(false)
  })

  it('requires a source-valid reusable opener for Toolbox and does not consume it',()=>{
    const toolbox=createItemInstance('toolbox','toolbox')
    expect(openAction(withInventory([toolbox]),'toolbox')).toBeUndefined()

    const implementedSourceOpeners:ItemType[]=[
      'ektorp_gluten_chair','pc_base_unit','adjustable_spanner','box_cutter','human_bone','machete','pathetic_penknife','chain',
      'serrated_knife','staff','can_opener','screwdriver','swiss_army_knife',
    ]
    expect(OPENABLES.toolbox?.openableBy).toEqual(implementedSourceOpeners)
    for(const openerType of implementedSourceOpeners){
      let game=withInventory([toolbox,createItemInstance('opener',openerType)],9102)
      const action=openAction(game,'toolbox')
      expect(action,`${openerType} should open Toolbox`).toBeDefined()
      game=executeCommand(game,action!).state
      expect(game.citizens[0].inventory.some((item)=>item.id==='toolbox')).toBe(false)
      expect(game.citizens[0].inventory.some((item)=>item.id==='opener'&&item.type===openerType)).toBe(true)
      expect(game.citizens[0].inventory).toHaveLength(2)
      expect(['pharmaceutical_products','semtex','nuts_and_bolts','kwik_fix','copper_pipe','battery']).toContain(game.citizens[0].inventory.find((item)=>item.id!=='opener')?.type)
    }
  })

  it('opens a Worn Leather Bag into exactly one weighted blueprint',()=>{
    const table=OPENABLES.worn_leather_bag?.outputTable
    expect(table?.source).toBe('MYHORDES_CURRENT')
    expect(table?.entries.map((entry)=>[entry.items[0]?.type,entry.weight])).toEqual([
      ['common_blueprint',50],
      ['uncommon_blueprint',35],
      ['rare_blueprint',10],
      ['very_rare_blueprint',5],
    ])
    let game=withInventory([createItemInstance('bag','worn_leather_bag')],9109)
    const action=openAction(game,'bag')
    expect(action).toBeDefined()
    game=executeCommand(game,action!).state
    expect(game.citizens[0].inventory).toHaveLength(1)
    expect(['common_blueprint','uncommon_blueprint','rare_blueprint','very_rare_blueprint']).toContain(game.citizens[0].inventory[0].type)
  })

  it('keeps the exact MyHordes Toolbox weights in the source table',()=>{
    const table=OPENABLES.toolbox?.outputTable
    expect(table?.source).toBe('MYHORDES_CURRENT')
    expect(table?.entries.map((entry)=>[entry.items[0]?.type,entry.weight])).toEqual([
      ['pharmaceutical_products',25],
      ['semtex',19],
      ['nuts_and_bolts',17],
      ['kwik_fix',13],
      ['copper_pipe',13],
      ['battery',12],
    ])
  })
})